// Laplacian variance (focus) + glare % (luma >= 240)
export function laplacianVariance(img: ImageData): number {
  const { width: w, height: h, data } = img
  // grayscale
  const gray = new Float32Array(w * h)
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    gray[j] = 0.299 * r + 0.587 * g + 0.114 * b
  }
  // 3x3 Laplacian kernel
  const k = [0, 1, 0, 1, -4, 1, 0, 1, 0]
  const out = new Float32Array(w * h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sum = 0, idx = 0
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const gx = gray[(y + ky) * w + (x + kx)]
          sum += gx * k[idx++]
        }
      }
      out[y * w + x] = sum
    }
  }
  // variance
  let mean = 0, n = 0
  for (let i = 0; i < out.length; i++) { const v = out[i]; if (!Number.isFinite(v)) continue; mean += v; n++ }
  mean /= Math.max(1, n)
  let varsum = 0
  for (let i = 0; i < out.length; i++) { const v = out[i]; if (!Number.isFinite(v)) continue; const d = v - mean; varsum += d * d }
  return varsum / Math.max(1, n - 1)
}

export function glarePercent(img: ImageData): number {
  const { data, width, height } = img
  let glare = 0
  const total = width * height
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
    if (y >= 240) glare++
  }
  return (glare / total) * 100
}
