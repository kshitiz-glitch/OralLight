// web/src/ml/benchmark.ts
/**
 * Performance Benchmarking Utility for OralLight
 * 
 * Measures ML inference latency across different backends:
 * - WebGPU
 * - WebGL
 * - WASM
 * 
 * Usage:
 * import { runBenchmark, exportResults } from './ml/benchmark'
 * const results = await runBenchmark()
 * exportResults(results, 'benchmark_results.json')
 */

import * as ort from 'onnxruntime-web'
import { inferWithUncertainty } from './infer'

export interface BenchmarkResult {
    backend: 'webgpu' | 'webgl' | 'wasm'
    supported: boolean
    avgLatency: number      // milliseconds
    minLatency: number
    maxLatency: number
    stdDev: number
    p50: number            // median
    p95: number            // 95th percentile
    p99: number            // 99th percentile
    memoryUsage: number    // MB (if available)
    iterations: number
    timestamp: string
    browserInfo: {
        userAgent: string
        platform: string
        vendor: string
    }
    hardwareInfo: {
        cores: number
        memory: number       // GB (if available)
    }
    errors: string[]
}

export interface BenchmarkSuite {
    results: BenchmarkResult[]
    summary: {
        fastestBackend: string
        recommendedBackend: string
        totalTime: number    // seconds
    }
}

/**
 * Run benchmark for a specific backend
 */
export async function benchmarkBackend(
    backend: 'webgpu' | 'webgl' | 'wasm',
    iterations: number = 10,
    testImage?: Blob
): Promise<BenchmarkResult> {
    console.log(`[Benchmark] Testing ${backend} backend (${iterations} iterations)...`)

    const result: BenchmarkResult = {
        backend,
        supported: false,
        avgLatency: 0,
        minLatency: Infinity,
        maxLatency: 0,
        stdDev: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        memoryUsage: 0,
        iterations,
        timestamp: new Date().toISOString(),
        browserInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            vendor: navigator.vendor
        },
        hardwareInfo: {
            cores: navigator.hardwareConcurrency || 0,
            memory: (navigator as any).deviceMemory || 0
        },
        errors: []
    }

    try {
        // Check if backend is supported
        const availableBackends = (ort.env.wasm.numThreads ?? 0) > 0
            ? ['webgpu', 'webgl', 'wasm']
            : ['webgl', 'wasm']

        if (backend === 'webgpu' && !availableBackends.includes('webgpu')) {
            result.errors.push('WebGPU not supported in this browser')
            return result
        }

        // Set backend
        ort.env.wasm.proxy = false
        if (backend === 'webgpu') {
            ort.env.webgpu.powerPreference = 'high-performance'
        }

        // Create or use test image
        let blob: Blob
        if (testImage) {
            blob = testImage
        } else {
            // Create a test image (black square)
            const canvas = document.createElement('canvas')
            canvas.width = 640
            canvas.height = 480
            const ctx = canvas.getContext('2d')!
            ctx.fillStyle = 'black'
            ctx.fillRect(0, 0, 640, 480)
            blob = await new Promise<Blob>((resolve) => {
                canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95)
            })
        }

        result.supported = true
        const latencies: number[] = []

        // Warm-up run (not counted)
        console.log(`[Benchmark] Warm-up run for ${backend}...`)
        try {
            await inferWithUncertainty(blob, 5) // 5 MC-Dropout passes
        } catch (error) {
            result.errors.push(`Warm-up failed: ${error}`)
            result.supported = false
            return result
        }

        // Measure memory before (if available)
        const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0

        // Benchmark iterations
        for (let i = 0; i < iterations; i++) {
            const start = performance.now()

            try {
                await inferWithUncertainty(blob, 5)
                const end = performance.now()
                const latency = end - start

                latencies.push(latency)
                result.minLatency = Math.min(result.minLatency, latency)
                result.maxLatency = Math.max(result.maxLatency, latency)

                console.log(`[Benchmark] ${backend} iteration ${i + 1}/${iterations}: ${latency.toFixed(2)}ms`)
            } catch (error) {
                result.errors.push(`Iteration ${i + 1} failed: ${error}`)
            }
        }

        // Measure memory after (if available)
        const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0
        result.memoryUsage = (memoryAfter - memoryBefore) / (1024 * 1024) // Convert to MB

        // Calculate statistics
        if (latencies.length > 0) {
            result.avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length

            // Standard deviation
            const variance = latencies.reduce((sum, val) => {
                return sum + Math.pow(val - result.avgLatency, 2)
            }, 0) / latencies.length
            result.stdDev = Math.sqrt(variance)

            // Percentiles
            const sorted = latencies.slice().sort((a, b) => a - b)
            result.p50 = sorted[Math.floor(sorted.length * 0.5)]
            result.p95 = sorted[Math.floor(sorted.length * 0.95)]
            result.p99 = sorted[Math.floor(sorted.length * 0.99)]
        }

        console.log(`[Benchmark] ${backend} complete: avg=${result.avgLatency.toFixed(2)}ms, min=${result.minLatency.toFixed(2)}ms, max=${result.maxLatency.toFixed(2)}ms`)

    } catch (error) {
        result.errors.push(`Benchmark failed: ${error}`)
        result.supported = false
    }

    return result
}

/**
 * Run full benchmark suite across all backends
 */
export async function runBenchmark(
    iterations: number = 10,
    testImage?: Blob
): Promise<BenchmarkSuite> {
    console.log('[Benchmark] Starting full benchmark suite...')
    const startTime = performance.now()

    const backends: Array<'webgpu' | 'webgl' | 'wasm'> = ['webgpu', 'webgl', 'wasm']
    const results: BenchmarkResult[] = []

    for (const backend of backends) {
        const result = await benchmarkBackend(backend, iterations, testImage)
        results.push(result)

        // Wait a bit between backends to let things cool down
        await new Promise(resolve => setTimeout(resolve, 1000))
    }

    const endTime = performance.now()
    const totalTime = (endTime - startTime) / 1000 // Convert to seconds

    // Determine fastest and recommended backend
    const supportedResults = results.filter(r => r.supported && r.avgLatency > 0)
    const fastestBackend = supportedResults.reduce((fastest, current) => {
        return current.avgLatency < fastest.avgLatency ? current : fastest
    }, supportedResults[0])

    // Recommended backend considers both speed and reliability
    const recommendedBackend = supportedResults.reduce((best, current) => {
        // Prefer WebGPU if it's within 20% of fastest and has low error rate
        if (current.backend === 'webgpu' &&
            current.avgLatency < best.avgLatency * 1.2 &&
            current.errors.length === 0) {
            return current
        }
        return current.avgLatency < best.avgLatency ? current : best
    }, supportedResults[0])

    const suite: BenchmarkSuite = {
        results,
        summary: {
            fastestBackend: fastestBackend?.backend || 'unknown',
            recommendedBackend: recommendedBackend?.backend || 'unknown',
            totalTime
        }
    }

    console.log('[Benchmark] Suite complete!')
    console.log(`[Benchmark] Fastest: ${suite.summary.fastestBackend}`)
    console.log(`[Benchmark] Recommended: ${suite.summary.recommendedBackend}`)
    console.log(`[Benchmark] Total time: ${suite.summary.totalTime.toFixed(2)}s`)

    return suite
}

/**
 * Export benchmark results to JSON
 */
export function exportResults(suite: BenchmarkSuite, filename: string = 'benchmark_results.json') {
    const json = JSON.stringify(suite, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()

    URL.revokeObjectURL(url)
    console.log(`[Benchmark] Results exported to ${filename}`)
}

/**
 * Generate HTML report from benchmark results
 */
export function generateHTMLReport(suite: BenchmarkSuite): string {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OralLight Performance Benchmark Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1, h2 { color: #333; }
    .summary {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    .summary-item {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 4px;
      border-left: 4px solid #0ea5e9;
    }
    .summary-item h3 {
      margin: 0 0 5px 0;
      font-size: 14px;
      color: #666;
    }
    .summary-item p {
      margin: 0;
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }
    .results {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
    }
    .supported { color: #10b981; font-weight: bold; }
    .not-supported { color: #ef4444; font-weight: bold; }
    .chart-container {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    canvas {
      max-height: 400px;
    }
    .error {
      color: #ef4444;
      font-size: 12px;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <h1>🚀 OralLight Performance Benchmark Report</h1>
  
  <div class="summary">
    <h2>Summary</h2>
    <div class="summary-grid">
      <div class="summary-item">
        <h3>Fastest Backend</h3>
        <p>${suite.summary.fastestBackend.toUpperCase()}</p>
      </div>
      <div class="summary-item">
        <h3>Recommended Backend</h3>
        <p>${suite.summary.recommendedBackend.toUpperCase()}</p>
      </div>
      <div class="summary-item">
        <h3>Total Test Time</h3>
        <p>${suite.summary.totalTime.toFixed(1)}s</p>
      </div>
      <div class="summary-item">
        <h3>Browser</h3>
        <p>${suite.results[0]?.browserInfo.vendor || 'Unknown'}</p>
      </div>
    </div>
  </div>

  <div class="chart-container">
    <h2>Latency Comparison</h2>
    <canvas id="latencyChart"></canvas>
  </div>

  <div class="chart-container">
    <h2>Latency Distribution</h2>
    <canvas id="distributionChart"></canvas>
  </div>

  <div class="results">
    <h2>Detailed Results</h2>
    <table>
      <thead>
        <tr>
          <th>Backend</th>
          <th>Supported</th>
          <th>Avg Latency</th>
          <th>Min</th>
          <th>Max</th>
          <th>Std Dev</th>
          <th>P50</th>
          <th>P95</th>
          <th>P99</th>
          <th>Memory (MB)</th>
        </tr>
      </thead>
      <tbody>
        ${suite.results.map(r => `
          <tr>
            <td><strong>${r.backend.toUpperCase()}</strong></td>
            <td class="${r.supported ? 'supported' : 'not-supported'}">
              ${r.supported ? '✓ Yes' : '✗ No'}
            </td>
            <td>${r.avgLatency > 0 ? r.avgLatency.toFixed(2) + 'ms' : 'N/A'}</td>
            <td>${r.minLatency < Infinity ? r.minLatency.toFixed(2) + 'ms' : 'N/A'}</td>
            <td>${r.maxLatency > 0 ? r.maxLatency.toFixed(2) + 'ms' : 'N/A'}</td>
            <td>${r.stdDev > 0 ? r.stdDev.toFixed(2) + 'ms' : 'N/A'}</td>
            <td>${r.p50 > 0 ? r.p50.toFixed(2) + 'ms' : 'N/A'}</td>
            <td>${r.p95 > 0 ? r.p95.toFixed(2) + 'ms' : 'N/A'}</td>
            <td>${r.p99 > 0 ? r.p99.toFixed(2) + 'ms' : 'N/A'}</td>
            <td>${r.memoryUsage > 0 ? r.memoryUsage.toFixed(2) : 'N/A'}</td>
          </tr>
          ${r.errors.length > 0 ? `
            <tr>
              <td colspan="10" class="error">
                Errors: ${r.errors.join('; ')}
              </td>
            </tr>
          ` : ''}
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="results">
    <h2>System Information</h2>
    <table>
      <tr>
        <th>Property</th>
        <th>Value</th>
      </tr>
      <tr>
        <td>User Agent</td>
        <td>${suite.results[0]?.browserInfo.userAgent || 'Unknown'}</td>
      </tr>
      <tr>
        <td>Platform</td>
        <td>${suite.results[0]?.browserInfo.platform || 'Unknown'}</td>
      </tr>
      <tr>
        <td>CPU Cores</td>
        <td>${suite.results[0]?.hardwareInfo.cores || 'Unknown'}</td>
      </tr>
      <tr>
        <td>Device Memory</td>
        <td>${suite.results[0]?.hardwareInfo.memory || 'Unknown'} GB</td>
      </tr>
      <tr>
        <td>Test Date</td>
        <td>${new Date(suite.results[0]?.timestamp).toLocaleString()}</td>
      </tr>
    </table>
  </div>

  <script>
    // Latency comparison chart
    const latencyCtx = document.getElementById('latencyChart').getContext('2d');
    new Chart(latencyCtx, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(suite.results.map(r => r.backend.toUpperCase()))},
        datasets: [{
          label: 'Average Latency (ms)',
          data: ${JSON.stringify(suite.results.map(r => r.avgLatency || 0))},
          backgroundColor: ['#8b5cf6', '#0ea5e9', '#10b981']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Latency (ms)' }
          }
        }
      }
    });

    // Distribution chart
    const distCtx = document.getElementById('distributionChart').getContext('2d');
    new Chart(distCtx, {
      type: 'line',
      data: {
        labels: ['Min', 'P50', 'P95', 'P99', 'Max'],
        datasets: ${JSON.stringify(suite.results.filter(r => r.supported).map(r => ({
        label: r.backend.toUpperCase(),
        data: [r.minLatency, r.p50, r.p95, r.p99, r.maxLatency],
        borderColor: r.backend === 'webgpu' ? '#8b5cf6' : r.backend === 'webgl' ? '#0ea5e9' : '#10b981',
        tension: 0.1
    })))}
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: 'Latency Distribution' }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Latency (ms)' }
          }
        }
      }
    });
  </script>
</body>
</html>
  `
    return html
}

/**
 * Export HTML report
 */
export function exportHTMLReport(suite: BenchmarkSuite, filename: string = 'benchmark_report.html') {
    const html = generateHTMLReport(suite)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()

    URL.revokeObjectURL(url)
    console.log(`[Benchmark] HTML report exported to ${filename}`)
}

/**
 * Display results in console (formatted)
 */
export function logResults(suite: BenchmarkSuite) {
    console.log('\n' + '='.repeat(80))
    console.log('ORALIGHT PERFORMANCE BENCHMARK RESULTS')
    console.log('='.repeat(80))

    console.log('\nSUMMARY:')
    console.log(`  Fastest Backend:      ${suite.summary.fastestBackend.toUpperCase()}`)
    console.log(`  Recommended Backend:  ${suite.summary.recommendedBackend.toUpperCase()}`)
    console.log(`  Total Test Time:      ${suite.summary.totalTime.toFixed(2)}s`)

    console.log('\nDETAILED RESULTS:')
    suite.results.forEach(r => {
        console.log(`\n  ${r.backend.toUpperCase()}:`)
        console.log(`    Supported:     ${r.supported ? '✓' : '✗'}`)
        if (r.supported && r.avgLatency > 0) {
            console.log(`    Avg Latency:   ${r.avgLatency.toFixed(2)}ms`)
            console.log(`    Min Latency:   ${r.minLatency.toFixed(2)}ms`)
            console.log(`    Max Latency:   ${r.maxLatency.toFixed(2)}ms`)
            console.log(`    Std Dev:       ${r.stdDev.toFixed(2)}ms`)
            console.log(`    P50 (median):  ${r.p50.toFixed(2)}ms`)
            console.log(`    P95:           ${r.p95.toFixed(2)}ms`)
            console.log(`    P99:           ${r.p99.toFixed(2)}ms`)
            if (r.memoryUsage > 0) {
                console.log(`    Memory Usage:  ${r.memoryUsage.toFixed(2)}MB`)
            }
        }
        if (r.errors.length > 0) {
            console.log(`    Errors:        ${r.errors.join('; ')}`)
        }
    })

    console.log('\n' + '='.repeat(80) + '\n')
}
