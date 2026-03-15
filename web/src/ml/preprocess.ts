// Resize/normalize helpers used before ONNX inference.
// Keep values aligned with your training pipeline.
export type TensorSpec = {
  width: number;  // e.g., 224
  height: number; // e.g., 224
  mean?: [number, number, number];   // ImageNet defaults
  std?: [number, number, number];
};

export const DEFAULT_SPEC: TensorSpec = {
  width: 224,
  height: 224,
  mean: [0.485, 0.456, 0.406],
  std:  [0.229, 0.224, 0.225],
};

// Accepts an HTMLCanvasElement (already enhanced via WB/Gamma/Zero-DCE).
// Returns Float32Array in CHW order for onnxruntime-web.
export function canvasToCHWFloat32(
  canvas: HTMLCanvasElement,
  spec: TensorSpec = DEFAULT_SPEC
): Float32Array {
  const { width, height } = spec;
  const tmp = document.createElement('canvas');
  tmp.width = width; tmp.height = height;
  const ctx = tmp.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(canvas, 0, 0, width, height);

  const { data } = ctx.getImageData(0, 0, width, height);
  const floatData = new Float32Array(3 * width * height);

  const m = spec.mean ?? [0, 0, 0];
  const s = spec.std ?? [1, 1, 1];

  // HWC uint8 → CHW float normalized
  let p = 0, r = 0, g = width * height, b = 2 * width * height;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++, p += 4) {
      floatData[r++] = (data[p]   / 255 - m[0]) / s[0]; // R
      floatData[g++] = (data[p+1] / 255 - m[1]) / s[1]; // G
      floatData[b++] = (data[p+2] / 255 - m[2]) / s[2]; // B
    }
  }
  return floatData;
}
