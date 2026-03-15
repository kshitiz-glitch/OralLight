import { useState, useEffect } from 'react'

export interface AnalysisResult {
    caseId: string
    decision: 'green' | 'amber' | 'red'
    probability: number
    uncertainty: number
    captureTimestamp: string
    images: { view: string; url: string }[]
    qcSummary: { blurVar: number; glarePct: number }
    enhancementMethod: 'Zero-DCE' | 'WB/gamma' | 'None'
    participantId?: string
}

interface ResultsPageProps {
    result: AnalysisResult
    onCaptureAnother: () => void
    onViewAllCases: () => void
}

export function ResultsPage({ result, onCaptureAnother, onViewAllCases }: ResultsPageProps) {
    const [showDetails, setShowDetails] = useState(false)
    const [scanning, setScanning] = useState(true)
    const [progress, setProgress] = useState(0)

    // Scanning animation effect
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval)
                    setTimeout(() => setScanning(false), 300)
                    return 100
                }
                return prev + 2
            })
        }, 30)
        return () => clearInterval(interval)
    }, [])

    const getRiskColor = (decision: string) => {
        switch (decision) {
            case 'green': return 'var(--color-green-500)'
            case 'amber': return 'var(--color-amber-500)'
            case 'red': return 'var(--color-red-500)'
            default: return 'var(--color-gray-500)'
        }
    }

    const getRiskLabel = (decision: string) => {
        switch (decision) {
            case 'green': return 'Low Risk'
            case 'amber': return 'Medium Risk'
            case 'red': return 'High Risk'
            default: return 'Unknown'
        }
    }

    const getRiskIcon = (decision: string) => {
        switch (decision) {
            case 'green': return '✓'
            case 'amber': return '⚠'
            case 'red': return '⚠'
            default: return '?'
        }
    }

    const confidencePercent = Math.max(0, Math.min(100, (1 - result.uncertainty) * 100))

    return (
        <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-6)', position: 'relative' }}>
            {/* Scanning Overlay */}
            {scanning && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.95)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 'var(--space-6)'
                }}>
                    <div style={{
                        fontSize: '24px',
                        fontWeight: 600,
                        color: 'var(--color-teal-400)',
                        textTransform: 'uppercase',
                        letterSpacing: '3px',
                        animation: 'pulse 1.5s ease-in-out infinite'
                    }}>
                        ANALYZING IMAGES
                    </div>
                    <div style={{
                        width: '400px',
                        maxWidth: '80%',
                        height: '4px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-full)',
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        <div style={{
                            width: `${progress}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, var(--color-teal-600), var(--color-teal-400))',
                            borderRadius: 'var(--radius-full)',
                            transition: 'width 0.3s ease',
                            boxShadow: '0 0 20px var(--color-teal-500)'
                        }} />
                    </div>
                    <div style={{
                        fontSize: '48px',
                        fontWeight: 700,
                        color: 'var(--color-teal-500)',
                        fontFamily: 'var(--font-mono)'
                    }}>
                        {progress}%
                    </div>
                </div>
            )}

            {/* Medical Header with Scan Lines */}
            <div className="glass-card" style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
                borderLeft: `4px solid ${getRiskColor(result.decision)}`,
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Animated scan line */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: `linear-gradient(90deg, transparent, ${getRiskColor(result.decision)}, transparent)`,
                    animation: 'scan 2s linear infinite'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                    <div>
                        <div style={{ fontSize: '12px', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
                            DIAGNOSTIC REPORT
                        </div>
                        <h1 style={{ fontSize: '32px', marginBottom: '8px', fontWeight: 700 }}>
                            AI Analysis Complete
                        </h1>
                        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-teal-400)' }}>
                                CASE #{result.caseId.slice(0, 8).toUpperCase()}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>
                                {new Date(result.captureTimestamp).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* Risk Badge - Compact */}
                    <div style={{
                        padding: 'var(--space-3) var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        background: `rgba(${result.decision === 'green' ? '16, 185, 129' : result.decision === 'amber' ? '245, 158, 11' : '239, 68, 68'}, 0.15)`,
                        border: `2px solid ${getRiskColor(result.decision)}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        boxShadow: `0 0 20px rgba(${result.decision === 'green' ? '16, 185, 129' : result.decision === 'amber' ? '245, 158, 11' : '239, 68, 68'}, 0.3)`
                    }}>
                        <div style={{ fontSize: '24px', color: getRiskColor(result.decision) }}>
                            {getRiskIcon(result.decision)}
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Risk Level
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: getRiskColor(result.decision), textTransform: 'uppercase' }}>
                                {getRiskLabel(result.decision)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Diagnostic Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
                {/* Probability Analysis */}
                <div className="glass-card" style={{
                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(15, 23, 42, 0.8) 100%)',
                    borderTop: '2px solid var(--color-teal-500)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                        <h3 style={{ fontSize: '14px', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                            Suspicion Probability
                        </h3>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--color-teal-500)',
                            boxShadow: '0 0 10px var(--color-teal-500)',
                            animation: 'pulse 2s ease-in-out infinite'
                        }} />
                    </div>

                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <div style={{
                            fontSize: '56px',
                            fontWeight: 700,
                            color: getRiskColor(result.decision),
                            fontFamily: 'var(--font-mono)',
                            lineHeight: 1,
                            textShadow: `0 0 20px ${getRiskColor(result.decision)}`
                        }}>
                            {(result.probability * 100).toFixed(1)}%
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--color-gray-400)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                            ± {(result.uncertainty * 100).toFixed(1)}% uncertainty
                        </div>
                    </div>

                    {/* Probability Bar with gradient */}
                    <div style={{
                        width: '100%',
                        height: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 'var(--radius-full)',
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        <div style={{
                            width: `${result.probability * 100}%`,
                            height: '100%',
                            background: `linear-gradient(90deg, ${getRiskColor(result.decision)}, ${getRiskColor(result.decision)}aa)`,
                            borderRadius: 'var(--radius-full)',
                            transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: `0 0 10px ${getRiskColor(result.decision)}`
                        }} />
                    </div>
                </div>

                {/* Model Confidence */}
                <div className="glass-card" style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(15, 23, 42, 0.8) 100%)',
                    borderTop: '2px solid var(--color-green-500)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                        <h3 style={{ fontSize: '14px', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                            Model Confidence
                        </h3>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--color-green-500)',
                            boxShadow: '0 0 10px var(--color-green-500)',
                            animation: 'pulse 2s ease-in-out infinite'
                        }} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                        {/* Circular Progress */}
                        <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
                            <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="none"
                                    stroke="rgba(255, 255, 255, 0.05)"
                                    strokeWidth="6"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="none"
                                    stroke="var(--color-teal-500)"
                                    strokeWidth="6"
                                    strokeDasharray={`${2 * Math.PI * 40}`}
                                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - confidencePercent / 100)}`}
                                    strokeLinecap="round"
                                    style={{
                                        transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                        filter: 'drop-shadow(0 0 8px var(--color-teal-500))'
                                    }}
                                />
                            </svg>
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                fontSize: '24px',
                                fontWeight: 700,
                                color: 'var(--color-teal-400)',
                                fontFamily: 'var(--font-mono)'
                            }}>
                                {confidencePercent.toFixed(0)}%
                            </div>
                        </div>

                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginBottom: '4px' }}>
                                Enhancement Method
                            </div>
                            <div style={{
                                fontSize: '16px',
                                fontWeight: 600,
                                color: 'var(--color-white)',
                                fontFamily: 'var(--font-mono)',
                                padding: '4px 8px',
                                background: 'rgba(6, 182, 212, 0.1)',
                                borderRadius: 'var(--radius-sm)',
                                display: 'inline-block'
                            }}>
                                {result.enhancementMethod}
                            </div>
                        </div>
                    </div>
                </div>

                {/* QC Metrics */}
                <div className="glass-card" style={{
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(15, 23, 42, 0.8) 100%)',
                    borderTop: '2px solid #8b5cf6'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                        <h3 style={{ fontSize: '14px', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                            Quality Control
                        </h3>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#8b5cf6',
                            boxShadow: '0 0 10px #8b5cf6',
                            animation: 'pulse 2s ease-in-out infinite'
                        }} />
                    </div>

                    <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>Blur Variance</span>
                                <span style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-white)' }}>
                                    {result.qcSummary.blurVar.toFixed(1)}
                                </span>
                            </div>
                            <div style={{
                                height: '4px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: 'var(--radius-full)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${Math.min(100, (result.qcSummary.blurVar / 500) * 100)}%`,
                                    height: '100%',
                                    background: result.qcSummary.blurVar > 150 ? 'var(--color-green-500)' : 'var(--color-red-500)',
                                    borderRadius: 'var(--radius-full)'
                                }} />
                            </div>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>Glare Level</span>
                                <span style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-white)' }}>
                                    {result.qcSummary.glarePct.toFixed(1)}%
                                </span>
                            </div>
                            <div style={{
                                height: '4px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: 'var(--radius-full)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${Math.min(100, result.qcSummary.glarePct * 10)}%`,
                                    height: '100%',
                                    background: result.qcSummary.glarePct < 6 ? 'var(--color-green-500)' : 'var(--color-red-500)',
                                    borderRadius: 'var(--radius-full)'
                                }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Image Analysis Grid */}
            <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                    <h3 style={{ fontSize: '18px', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Captured Images
                    </h3>
                    <div style={{ fontSize: '12px', color: 'var(--color-teal-400)', fontFamily: 'var(--font-mono)' }}>
                        {result.images.length} VIEWS
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)' }}>
                    {result.images.map((img, idx) => (
                        <div key={idx} style={{
                            position: 'relative',
                            aspectRatio: '4/3',
                            borderRadius: 'var(--radius-lg)',
                            overflow: 'hidden',
                            border: '2px solid rgba(6, 182, 212, 0.3)',
                            boxShadow: '0 0 20px rgba(6, 182, 212, 0.2)',
                            background: '#000'
                        }}>
                            <img
                                src={img.url}
                                alt={`${img.view} view`}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block'
                                }}
                                onError={(e) => {
                                    console.error(`Failed to load image for ${img.view}:`, img.url)
                                    e.currentTarget.style.display = 'none'
                                }}
                            />

                            {/* Scan line overlay */}
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '2px',
                                background: 'linear-gradient(90deg, transparent, var(--color-teal-400), transparent)',
                                animation: 'scan 3s linear infinite'
                            }} />

                            {/* View label */}
                            <div style={{
                                position: 'absolute',
                                top: '12px',
                                left: '12px',
                                background: 'rgba(0, 0, 0, 0.8)',
                                padding: '4px 12px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '11px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                color: 'var(--color-teal-400)',
                                border: '1px solid rgba(6, 182, 212, 0.3)'
                            }}>
                                {img.view}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Technical Details */}
            <div className="glass-card">
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-white)',
                        fontSize: '16px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}
                >
                    <span>⚙ Technical Diagnostics</span>
                    <span style={{
                        fontSize: '20px',
                        transition: 'transform 0.3s',
                        transform: showDetails ? 'rotate(180deg)' : 'rotate(0)',
                        color: 'var(--color-teal-400)'
                    }}>
                        ▼
                    </span>
                </button>

                {showDetails && (
                    <div className="fade-in" style={{
                        marginTop: 'var(--space-4)',
                        padding: 'var(--space-4)',
                        background: 'rgba(6, 182, 212, 0.05)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(6, 182, 212, 0.2)'
                    }}>
                        <div style={{ display: 'grid', gap: 'var(--space-2)', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>
                            {[
                                { label: 'Enhancement Method', value: result.enhancementMethod },
                                { label: 'Blur Variance (QC)', value: result.qcSummary.blurVar.toFixed(1) },
                                { label: 'Glare Percentage (QC)', value: `${result.qcSummary.glarePct.toFixed(1)}%` },
                                { label: 'Capture Timestamp', value: new Date(result.captureTimestamp).toLocaleString() },
                                ...(result.participantId ? [{ label: 'Participant ID', value: result.participantId }] : [])
                            ].map((item, idx) => (
                                <div key={idx} style={{
                                    display: 'grid',
                                    gridTemplateColumns: '200px 1fr',
                                    gap: 'var(--space-3)',
                                    padding: 'var(--space-2) 0',
                                    borderBottom: idx < 4 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none'
                                }}>
                                    <div style={{ color: 'var(--color-gray-400)' }}>{item.label}:</div>
                                    <div style={{ color: 'var(--color-teal-400)' }}>{item.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)' }}>
                <button
                    className="btn btn-primary"
                    onClick={onCaptureAnother}
                    style={{ padding: '18px 24px', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}
                >
                    📸 New Analysis
                </button>
                <button
                    className="btn btn-secondary"
                    onClick={onViewAllCases}
                    style={{ padding: '18px 24px', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}
                >
                    📋 View All Cases
                </button>
            </div>

            {/* Add scanning animation keyframes */}
            <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(400px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
        </div>
    )
}
