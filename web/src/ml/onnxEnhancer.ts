// src/ml/onnxEnhancer.ts
import * as ort from 'onnxruntime-web'

let session: ort.InferenceSession | null = null
let initializationFailed = false
let initializationAttempted = false

export async function loadZeroDCE(modelUrl = '/models/zero-dce-tiny.onnx') {
  // If we've already failed to initialize, don't try again
  if (initializationFailed) {
    console.warn('[Zero-DCE] Skipping load - previous initialization failed')
    throw new Error('Zero-DCE initialization previously failed')
  }

  // Return existing session if available
  if (session) {
    console.log('[Zero-DCE] Using existing session')
    return session
  }

  // Mark that we're attempting initialization
  initializationAttempted = true

  try {
    console.log('[Zero-DCE] Attempting to load model from:', modelUrl)
    session = await ort.InferenceSession.create(modelUrl, {
      executionProviders: ['webgpu', 'wasm'],
      graphOptimizationLevel: 'all',
    })
    console.log('[Zero-DCE] Model loaded successfully')
    return session
  } catch (error) {
    console.error('[Zero-DCE] Failed to load model:', error)
    initializationFailed = true
    session = null
    throw error
  }
}

// Convert canvas frame (ImageData) -> Float32 NCHW (1,3,H,W), range [0,1]
export function imageDataToNchwFloat(img: ImageData): { data: Float32Array; dims: [number, number, number, number] } {
  const { data, width, height } = img
  const out = new Float32Array(3 * width * height)
  let r = 0, g = width * height, b = 2 * width * height
  for (let i = 0; i < data.length; i += 4) {
    out[r++] = data[i] / 255
    out[g++] = data[i + 1] / 255
    out[b++] = data[i + 2] / 255
  }
  return { data: out, dims: [1, 3, height, width] }
}

// Float32 NCHW [0,1] -> ImageData
export function nchwFloatToImageData(t: Float32Array, w: number, h: number): ImageData {
  const out = new Uint8ClampedArray(w * h * 4)
  let r = 0, g = w * h, b = 2 * w * h
  for (let i = 0, p = 0; i < w * h; i++) {
    out[p++] = Math.max(0, Math.min(255, Math.round(t[r++] * 255)))
    out[p++] = Math.max(0, Math.min(255, Math.round(t[g++] * 255)))
    out[p++] = Math.max(0, Math.min(255, Math.round(t[b++] * 255)))
    out[p++] = 255
  }
  return new ImageData(out, w, h)
}

/**
 * Run Zero-DCE ONNX.
 * Many Zero-DCE variants output the enhanced image directly (same size).
 * If your model returns a residual/curve instead, adjust postprocessing accordingly.
 */
export async function runZeroDCEOnImageData(img: ImageData): Promise<ImageData> {
  try {
    console.log('[Zero-DCE] Starting image enhancement...')
    await loadZeroDCE()

    const { data, dims } = imageDataToNchwFloat(img)
    console.log('[Zero-DCE] Image converted to tensor, dims:', dims)

    const input = new ort.Tensor('float32', data, dims)
    const feeds: Record<string, ort.Tensor> = {}

    // Try common input name guesses
    const inputName = session!.inputNames[0]
    console.log('[Zero-DCE] Using input name:', inputName)
    feeds[inputName] = input

    const results = await session!.run(feeds)
    const outputName = session!.outputNames[0]
    const outTensor = results[outputName] as ort.Tensor

    // Expect same H,W,3
    const [n, c, h, w] = outTensor.dims as number[]
    if (n !== 1 || c !== 3) {
      throw new Error(`Unexpected Zero-DCE output dims: ${outTensor.dims}`)
    }

    console.log('[Zero-DCE] Enhancement complete')
    return nchwFloatToImageData(outTensor.data as Float32Array, w, h)
  } catch (error) {
    console.error('[Zero-DCE] Enhancement failed:', error)
    throw error
  }
}
