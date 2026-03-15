// src/ml/enhance.ts
import { runZeroDCEOnImageData } from './onnxEnhancer'

// --- Types ---
type Gains = [number, number, number]
export type EnhanceMeta = { wb_gains: Gains; gamma: number; used_zero_dce: boolean }

// --- WB/γ helpers ---
function grayWorldGains(img: ImageData): Gains {
  const { data } = img
  let rSum = 0, gSum = 0, bSum = 0, n = data.length / 4
  for (let i = 0; i < data.length; i += 4) { rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2] }
  const rMean = rSum / n, gMean = gSum / n, bMean = bSum / n
  const avg = (rMean + gMean + bMean) / 3 || 1
  const clamp = (x: number) => Math.max(0.5, Math.min(2.5, x))
  return [clamp(avg / (rMean || 1)), clamp(avg / (gMean || 1)), clamp(avg / (bMean || 1))]
}

function estimateGamma(img: ImageData, target = 0.5): number {
  const { data } = img
  let ySum = 0, n = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.2126 * (data[i] / 255) + 0.7152 * (data[i + 1] / 255) + 0.0722 * (data[i + 2] / 255)
    ySum += y
  }
  const mean = Math.max(1e-3, Math.min(0.999, ySum / n))
  const g = Math.log(target) / Math.log(mean)
  return Number.isFinite(g) ? Math.max(0.5, Math.min(2.5, g)) : 1.0
}

function applyWBAndGamma(img: ImageData, gains: Gains, gamma: number) {
  const { data } = img
  const [gr, gg, gb] = gains
  for (let i = 0; i < data.length; i += 4) {
    let r = Math.min(1, (data[i] / 255) * gr)
    let g = Math.min(1, (data[i + 1] / 255) * gg)
    let b = Math.min(1, (data[i + 2] / 255) * gb)
    r = Math.pow(r, gamma); g = Math.pow(g, gamma); b = Math.pow(b, gamma)
    data[i] = (r * 255) | 0; data[i + 1] = (g * 255) | 0; data[i + 2] = (b * 255) | 0
  }
}

// Enhance current canvas; try Zero-DCE, else WB/γ. Always returns meta.used_zero_dce.
export async function enhanceCanvasToUrl(
  c: HTMLCanvasElement,
  quality = 0.9
): Promise<{ url: string; meta: EnhanceMeta; blob: Blob }> {
  const ctx = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
  let frame = ctx.getImageData(0, 0, c.width, c.height)

  let usedZeroDCE = false
  let gains: Gains = [1, 1, 1]
  let gamma = 1.0

  try {
    console.log('[Enhance] Attempting Zero-DCE enhancement...')
    const dceOut = await runZeroDCEOnImageData(frame)
    frame = dceOut
    usedZeroDCE = true
    console.log('[Enhance] ✓ Zero-DCE enhancement successful')
  } catch (error) {
    console.warn('[Enhance] Zero-DCE failed, falling back to WB/gamma:', error instanceof Error ? error.message : error)
    // Fallback to traditional WB/gamma enhancement
    try {
      gains = grayWorldGains(frame)
      gamma = estimateGamma(frame, 0.5)
      applyWBAndGamma(frame, gains, gamma)
      console.log('[Enhance] ✓ WB/gamma fallback successful')
    } catch (fallbackError) {
      console.error('[Enhance] WB/gamma fallback also failed:', fallbackError)
      // Continue anyway with the original frame
      console.warn('[Enhance] Using original frame without enhancement')
    }
  }

  ctx.putImageData(frame, 0, 0)
  const blob: Blob = await new Promise((res, rej) =>
    c.toBlob(b => (b ? res(b) : rej(new Error('toBlob null'))), 'image/jpeg', quality)
  )
  const url = URL.createObjectURL(blob)

  const meta: EnhanceMeta = {
    wb_gains: usedZeroDCE ? [1, 1, 1] : gains,
    gamma: usedZeroDCE ? 1 : gamma,
    used_zero_dce: usedZeroDCE,
  }

  console.log('[Enhance] Enhancement complete. Method:', usedZeroDCE ? 'Zero-DCE' : 'WB/gamma')
  return { url, meta, blob }
}
