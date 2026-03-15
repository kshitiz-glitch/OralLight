// ONNX Runtime Web inference wrapper for the classifier.
// Model file will be placed at /public/models/mobilenetv3_small_opmd.onnx
import * as ort from 'onnxruntime-web';
import { DEFAULT_SPEC, canvasToCHWFloat32 } from './preprocess';

let session: ort.InferenceSession | null = null;
let loadAttempts = 0;
const MAX_LOAD_ATTEMPTS = 3;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function loadClassifier(modelPath = '/models/mobilenetv3_small_opmd.onnx') {
  if (session) {
    console.log('[Classifier] Using existing session');
    return session;
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_LOAD_ATTEMPTS; attempt++) {
    try {
      console.log(`[Classifier] Loading model (attempt ${attempt}/${MAX_LOAD_ATTEMPTS})...`);

      // Web-friendly defaults; ORT will pick WASM/WebGL based on build
      session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });

      console.log('[Classifier] ✓ Model loaded successfully');
      loadAttempts = attempt;
      return session;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[Classifier] Load attempt ${attempt} failed:`, lastError.message);

      if (attempt < MAX_LOAD_ATTEMPTS) {
        // Exponential backoff: 500ms, 1000ms, 2000ms
        const delay = 500 * Math.pow(2, attempt - 1);
        console.log(`[Classifier] Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  // All attempts failed
  const errorMsg = `Failed to load classifier after ${MAX_LOAD_ATTEMPTS} attempts. Last error: ${lastError?.message || 'Unknown error'}`;
  console.error('[Classifier]', errorMsg);
  throw new Error(errorMsg);
}

export type InferResult = {
  logits: number[];        // raw model outputs (2 classes)
  pSuspicious: number;     // softmax prob for class index 1
};

export async function inferFromCanvas(canvas: HTMLCanvasElement): Promise<InferResult> {
  try {
    console.log('[Classifier] Starting inference...');
    const sess = await loadClassifier();
    const { width, height } = DEFAULT_SPEC;

    const input = canvasToCHWFloat32(canvas, DEFAULT_SPEC);
    const tensor = new ort.Tensor('float32', input, [1, 3, height, width]);

    const feeds: Record<string, ort.Tensor> = { input: tensor }; // 'input' must match export
    const output = await sess.run(feeds);
    const logits = Array.from(output['logits'].data as Float32Array);

    // Softmax → p(suspicious)
    const m = Math.max(...logits);
    const exps = logits.map(v => Math.exp(v - m));
    const sum = exps.reduce((a, b) => a + b, 0);
    const probs = exps.map(v => v / sum);
    const pSuspicious = probs[1] ?? probs[0] ?? 0;

    console.log('[Classifier] ✓ Inference complete. p(suspicious):', pSuspicious.toFixed(3));
    return { logits, pSuspicious };
  } catch (error) {
    console.error('[Classifier] Inference failed:', error);
    throw error;
  }
}
// MC‑Dropout style uncertainty estimation (multiple stochastic forward passes)
export async function inferWithUncertainty(
  canvas: HTMLCanvasElement,
  passes: number = 20
): Promise<{ mean: number; std: number }> {
  const results: number[] = []
  for (let i = 0; i < passes; i++) {
    // Simple stochastic augmentation: add small Gaussian noise to the image data
    const noisyCanvas = document.createElement('canvas')
    noisyCanvas.width = canvas.width
    noisyCanvas.height = canvas.height
    const ctx = noisyCanvas.getContext('2d')!
    ctx.drawImage(canvas, 0, 0)
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imgData.data
    // Add Gaussian noise (σ = 5) to each channel
    for (let j = 0; j < data.length; j += 4) {
      const noise = (Math.random() - 0.5) * 10 // approx N(0,5^2)
      data[j] = Math.min(255, Math.max(0, data[j] + noise))
      data[j + 1] = Math.min(255, Math.max(0, data[j + 1] + noise))
      data[j + 2] = Math.min(255, Math.max(0, data[j + 2] + noise))
    }
    ctx.putImageData(imgData, 0, 0)
    const { pSuspicious } = await inferFromCanvas(noisyCanvas)
    results.push(pSuspicious)
  }
  const mean = results.reduce((a, b) => a + b, 0) / results.length
  const variance = results.reduce((a, b) => a + (b - mean) ** 2, 0) / results.length
  const std = Math.sqrt(variance)
  return { mean, std }
}
