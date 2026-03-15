import { useState } from 'react'
import { runBenchmark, exportResults, exportHTMLReport, logResults, type BenchmarkSuite } from '../ml/benchmark'

export default function BenchmarkPage() {
    const [running, setRunning] = useState(false)
    const [results, setResults] = useState<BenchmarkSuite | null>(null)
    const [iterations, setIterations] = useState(10)

    const handleRunBenchmark = async () => {
        setRunning(true)
        setResults(null)

        try {
            const suite = await runBenchmark(iterations)
            setResults(suite)
            logResults(suite)
        } catch (error) {
            console.error('[Benchmark] Error:', error)
            alert(`Benchmark failed: ${error}`)
        } finally {
            setRunning(false)
        }
    }

    const handleExportJSON = () => {
        if (results) {
            exportResults(results)
        }
    }

    const handleExportHTML = () => {
        if (results) {
            exportHTMLReport(results)
        }
    }

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>⚡ Performance Benchmark</h1>
            <p>Test ML inference performance across WebGPU, WebGL, and WASM backends.</p>

            <div style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                <label style={{ display: 'block', marginBottom: '10px' }}>
                    <strong>Iterations:</strong>
                    <input
                        type="number"
                        value={iterations}
                        onChange={(e) => setIterations(parseInt(e.target.value) || 10)}
                        min="1"
                        max="50"
                        style={{ marginLeft: '10px', padding: '5px', width: '80px' }}
                        disabled={running}
                    />
                </label>

                <button
                    onClick={handleRunBenchmark}
                    disabled={running}
                    style={{
                        padding: '10px 20px',
                        background: running ? '#ccc' : '#0ea5e9',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: running ? 'not-allowed' : 'pointer',
                        fontSize: '16px'
                    }}
                >
                    {running ? '⏳ Running Benchmark...' : '🚀 Run Benchmark'}
                </button>

                {running && (
                    <p style={{ marginTop: '10px', color: '#666' }}>
                        This may take {iterations * 3} - {iterations * 5} seconds. Check console for progress.
                    </p>
                )}
            </div>

            {results && (
                <div>
                    <h2>Results</h2>

                    <div style={{ marginBottom: '20px', padding: '15px', background: '#e0f2fe', borderRadius: '8px' }}>
                        <h3 style={{ marginTop: 0 }}>Summary</h3>
                        <p><strong>Fastest Backend:</strong> {results.summary.fastestBackend.toUpperCase()}</p>
                        <p><strong>Recommended Backend:</strong> {results.summary.recommendedBackend.toUpperCase()}</p>
                        <p><strong>Total Time:</strong> {results.summary.totalTime.toFixed(2)}s</p>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                        <thead>
                            <tr style={{ background: '#f8f9fa' }}>
                                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Backend</th>
                                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Supported</th>
                                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Avg Latency</th>
                                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Min/Max</th>
                                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>P95</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.results.map((r) => (
                                <tr key={r.backend}>
                                    <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                                        <strong>{r.backend.toUpperCase()}</strong>
                                    </td>
                                    <td style={{ padding: '10px', borderBottom: '1px solid #ddd', color: r.supported ? '#10b981' : '#ef4444' }}>
                                        {r.supported ? '✓ Yes' : '✗ No'}
                                    </td>
                                    <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                                        {r.avgLatency > 0 ? `${r.avgLatency.toFixed(2)}ms` : 'N/A'}
                                    </td>
                                    <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                                        {r.minLatency < Infinity ? `${r.minLatency.toFixed(2)} / ${r.maxLatency.toFixed(2)}ms` : 'N/A'}
                                    </td>
                                    <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                                        {r.p95 > 0 ? `${r.p95.toFixed(2)}ms` : 'N/A'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={handleExportJSON}
                            style={{
                                padding: '10px 20px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            📥 Export JSON
                        </button>
                        <button
                            onClick={handleExportHTML}
                            style={{
                                padding: '10px 20px',
                                background: '#8b5cf6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            📊 Export HTML Report
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
