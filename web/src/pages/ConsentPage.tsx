import { useState } from 'react'

interface ConsentPageProps {
    onConsentGiven: (participantId?: string) => void
    onBack: () => void
}

export default function ConsentPage({ onConsentGiven, onBack }: ConsentPageProps) {
    const [agreed, setAgreed] = useState(false)
    const [participantId, setParticipantId] = useState('')
    const [showDetails, setShowDetails] = useState(false)

    const handleSubmit = () => {
        if (agreed) {
            onConsentGiven(participantId || undefined)
        }
    }

    return (
        <div style={{
            maxWidth: '900px',
            margin: '0 auto',
            padding: 'var(--space-6)',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {/* Main Glassmorphic Card */}
            <div className="glass-card fade-in" style={{
                width: '100%',
                padding: 'var(--space-8)',
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#1e293b',
                position: 'relative',
                overflow: 'hidden',
                border: '2px solid rgba(6, 182, 212, 0.2)',
                boxShadow: '0 0 40px rgba(6, 182, 212, 0.1), 0 8px 32px rgba(0, 0, 0, 0.1)'
            }}>
                {/* Animated scan line at top */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'linear-gradient(90deg, transparent, #06b6d4, transparent)',
                    animation: 'scan 3s linear infinite'
                }} />

                {/* Header */}
                <div style={{
                    marginBottom: 'var(--space-8)',
                    textAlign: 'center',
                    position: 'relative'
                }}>
                    {/* Medical-tech header badge */}
                    <div style={{
                        display: 'inline-block',
                        padding: '6px 16px',
                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)',
                        border: '1px solid rgba(6, 182, 212, 0.3)',
                        borderRadius: 'var(--radius-full)',
                        marginBottom: 'var(--space-3)',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        color: '#0891b2'
                    }}>
                        AI-Powered Diagnostic System
                    </div>

                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: 700,
                        color: '#0f172a',
                        marginBottom: 'var(--space-2)',
                        letterSpacing: '-0.5px'
                    }}>
                        📋 Informed Consent
                    </h1>
                    <p style={{
                        fontSize: '16px',
                        color: '#64748b',
                        margin: 0
                    }}>
                        OralLight Oral Health Screening Study
                    </p>
                </div>

                {/* About the Study */}
                <section style={{
                    marginBottom: 'var(--space-6)',
                    padding: 'var(--space-4)',
                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.03) 0%, rgba(6, 182, 212, 0.01) 100%)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(6, 182, 212, 0.15)'
                }}>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#06b6d4',
                        marginBottom: 'var(--space-3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>
                        <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#06b6d4',
                            boxShadow: '0 0 10px rgba(6, 182, 212, 0.5)',
                            animation: 'pulse 2s ease-in-out infinite'
                        }} />
                        <span>About the Study</span>
                    </h3>
                    <p style={{
                        color: '#475569',
                        lineHeight: '1.8',
                        fontSize: '15px',
                        margin: 0
                    }}>
                        We are testing <strong>OralLight</strong>, a new technology using artificial intelligence (AI)
                        to help screen for oral health problems. The AI analyzes photos of your mouth to identify
                        areas that might need further examination.
                    </p>
                </section>

                {/* Two Column Layout */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-6)'
                }}>
                    {/* What you'll do */}
                    <div style={{
                        padding: 'var(--space-4)',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.02) 100%)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid rgba(16, 185, 129, 0.15)'
                    }}>
                        <h4 style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#10b981',
                            marginBottom: 'var(--space-3)',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span>✓</span>
                            <span>What you'll do</span>
                        </h4>
                        <ul style={{
                            color: '#64748b',
                            paddingLeft: '20px',
                            margin: 0,
                            fontSize: '14px',
                            lineHeight: '1.8'
                        }}>
                            <li style={{ marginBottom: '8px' }}>Take 3 photos of your mouth</li>
                            <li style={{ marginBottom: '8px' }}>Wait 5 seconds for AI analysis</li>
                            <li>Review results immediately</li>
                        </ul>
                    </div>

                    {/* You Receive */}
                    <div style={{
                        padding: 'var(--space-4)',
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(139, 92, 246, 0.02) 100%)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid rgba(139, 92, 246, 0.15)'
                    }}>
                        <h4 style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#8b5cf6',
                            marginBottom: 'var(--space-3)',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span>🎁</span>
                            <span>You Receive</span>
                        </h4>
                        <ul style={{
                            color: '#64748b',
                            paddingLeft: '20px',
                            margin: 0,
                            fontSize: '14px',
                            lineHeight: '1.8'
                        }}>
                            <li style={{ marginBottom: '8px' }}>Free oral health screening</li>
                            <li style={{ marginBottom: '8px' }}>Instant feedback</li>
                            <li>Early problem detection</li>
                        </ul>
                    </div>
                </div>

                {/* Show Details Button */}
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    style={{
                        width: '100%',
                        padding: '14px 24px',
                        background: showDetails ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
                        border: `2px solid ${showDetails ? '#06b6d4' : '#cbd5e1'}`,
                        borderRadius: 'var(--radius-md)',
                        color: '#06b6d4',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginBottom: 'var(--space-6)',
                        transition: 'all 0.3s ease',
                        fontFamily: 'inherit',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        boxShadow: showDetails ? '0 0 20px rgba(6, 182, 212, 0.15)' : 'none'
                    }}
                >
                    {showDetails ? '▼ Hide Detailed Information' : '▶ Show Detailed Information (Risks, Privacy, Withdrawal)'}
                </button>

                {/* Detailed Information */}
                {showDetails && (
                    <div className="fade-in" style={{
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        border: '2px solid #e2e8f0',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-6)',
                        marginBottom: 'var(--space-6)'
                    }}>
                        <h4 style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color: '#1e293b',
                            marginBottom: 'var(--space-3)',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ color: '#ef4444' }}>⚠️</span>
                            <span>Risks & Discomforts</span>
                        </h4>
                        <ul style={{
                            color: '#64748b',
                            fontSize: '14px',
                            marginBottom: 'var(--space-4)',
                            paddingLeft: '20px',
                            lineHeight: '1.8'
                        }}>
                            <li style={{ marginBottom: '8px' }}>No physical risks - we only take photos</li>
                            <li style={{ marginBottom: '8px' }}>Minor discomfort from opening mouth wide</li>
                            <li>AI may show false alarms (screening only)</li>
                        </ul>

                        <h4 style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color: '#1e293b',
                            marginBottom: 'var(--space-3)',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ color: '#10b981' }}>🔒</span>
                            <span>Data Protection</span>
                        </h4>
                        <ul style={{
                            color: '#64748b',
                            fontSize: '14px',
                            marginBottom: 'var(--space-4)',
                            paddingLeft: '20px',
                            lineHeight: '1.8'
                        }}>
                            <li style={{ marginBottom: '8px' }}>Photos encrypted immediately (AES-256)</li>
                            <li style={{ marginBottom: '8px' }}>Data stored on secure servers</li>
                            <li>GDPR & HIPAA compliant</li>
                        </ul>

                        <h4 style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color: '#1e293b',
                            marginBottom: 'var(--space-3)',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ color: '#06b6d4' }}>↩️</span>
                            <span>Withdrawal</span>
                        </h4>
                        <p style={{
                            color: '#64748b',
                            fontSize: '14px',
                            margin: 0,
                            lineHeight: '1.8'
                        }}>
                            Participation is voluntary. You can stop at any time or ask for your data to be deleted.
                        </p>
                    </div>
                )}

                {/* Medical Disclaimer */}
                <div style={{
                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                    borderLeft: '4px solid #f59e0b',
                    padding: 'var(--space-4)',
                    borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                    marginBottom: 'var(--space-6)',
                    boxShadow: '0 0 20px rgba(245, 158, 11, 0.1)'
                }}>
                    <h3 style={{
                        margin: 0,
                        marginBottom: '8px',
                        color: '#92400e',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>
                        <span>⚠️</span>
                        <span>Important Medical Disclaimer</span>
                    </h3>
                    <p style={{
                        margin: 0,
                        color: '#b45309',
                        fontSize: '14px',
                        lineHeight: '1.6'
                    }}>
                        <strong>This AI screening is NOT a medical diagnosis.</strong> It is a tool to help identify areas that may need professional examination. All concerning findings should be reviewed by a qualified healthcare provider.
                    </p>
                </div>

                {/* Participant ID Input */}
                <div style={{ marginBottom: 'var(--space-6)' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: 600,
                        color: '#1e293b',
                        fontSize: '13px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>
                        Participant ID (Optional)
                    </label>
                    <input
                        type="text"
                        value={participantId}
                        onChange={(e) => setParticipantId(e.target.value)}
                        placeholder="e.g., P-001"
                        style={{
                            width: '100%',
                            padding: '14px',
                            border: '2px solid #cbd5e1',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '16px',
                            fontFamily: 'var(--font-mono)',
                            transition: 'all 0.2s ease',
                            outline: 'none',
                            background: 'white'
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#06b6d4'
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(6, 182, 212, 0.1), 0 0 20px rgba(6, 182, 212, 0.15)'
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#cbd5e1'
                            e.currentTarget.style.boxShadow = 'none'
                        }}
                    />
                </div>

                {/* Consent Checkbox */}
                <div
                    onClick={() => setAgreed(!agreed)}
                    style={{
                        display: 'flex',
                        gap: '12px',
                        padding: 'var(--space-4)',
                        border: `2px solid ${agreed ? '#06b6d4' : '#cbd5e1'}`,
                        borderRadius: 'var(--radius-md)',
                        background: agreed ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(6, 182, 212, 0.03) 100%)' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        marginBottom: 'var(--space-6)',
                        boxShadow: agreed ? '0 0 25px rgba(6, 182, 212, 0.2)' : 'none'
                    }}
                >
                    <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => {
                            e.stopPropagation()
                            setAgreed(e.target.checked)
                        }}
                        style={{
                            marginTop: '4px',
                            width: '22px',
                            height: '22px',
                            cursor: 'pointer',
                            accentColor: '#06b6d4'
                        }}
                    />
                    <div>
                        <strong style={{
                            color: '#0f172a',
                            fontSize: '16px',
                            display: 'block',
                            marginBottom: '4px'
                        }}>
                            I agree to participate
                        </strong>
                        <p style={{
                            margin: 0,
                            color: '#64748b',
                            fontSize: '14px',
                            lineHeight: '1.6'
                        }}>
                            I have read the information above, understand the risks and benefits, and confirm that my participation is voluntary.
                        </p>
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={!agreed}
                    className={agreed ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{
                        width: '100%',
                        padding: '18px',
                        fontSize: '16px',
                        fontWeight: 700,
                        opacity: agreed ? 1 : 0.5,
                        cursor: agreed ? 'pointer' : 'not-allowed',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        boxShadow: agreed ? '0 0 30px rgba(6, 182, 212, 0.3)' : 'none'
                    }}
                >
                    {agreed ? '✓ START SCREENING' : 'READ & AGREE TO CONTINUE'}
                </button>

                <p style={{
                    marginTop: '12px',
                    fontSize: '11px',
                    color: '#94a3b8',
                    textAlign: 'center',
                    margin: '12px 0 0 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}>
                    By clicking "Start Screening", you consent to the processing of your data as described.
                </p>
            </div>

            {/* Add scan animation */}
            <style>{`
                @keyframes scan {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div >
    )
}
