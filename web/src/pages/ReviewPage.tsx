// src/pages/ReviewPage.tsx
import { useEffect, useState } from 'react'
import { getAllCaseIds, getEncryptedCase, deriveKey, deleteCase } from '../store/db'
import type { CaseBundle, SyncStatus } from '../store/types'
import { SyncBadge } from '../components/SyncBadge'
import { useToast } from '../context/ToastContext'

type CaseListItem = {
    id: string
    created_at: number
    bundle?: CaseBundle
}

export function ReviewPage() {
    const [cases, setCases] = useState<CaseListItem[]>([])
    const [loading, setLoading] = useState(true)
    const [syncFilter, setSyncFilter] = useState<'all' | SyncStatus>('all')
    const [selectedCase, setSelectedCase] = useState<CaseBundle | null>(null)
    const [syncing, setSyncing] = useState<string | null>(null)
    const [expandedSection, setExpandedSection] = useState<'red' | 'amber' | 'green' | null>('red')

    const { showToast } = useToast()

    async function loadCases() {
        setLoading(true)
        try {
            const ids = await getAllCaseIds()
            ids.sort((a, b) => b.created_at - a.created_at)

            const key = await deriveKey('DEMO_SITE', 'DEMO_WORKER')
            const loaded = await Promise.all(
                ids.map(async ({ id, created_at }) => {
                    try {
                        const bundle = await getEncryptedCase(id, key)
                        return { id, created_at, bundle }
                    } catch (e) {
                        console.error(`Failed to load case ${id}:`, e)
                        return { id, created_at }
                    }
                })
            )
            setCases(loaded)
        } catch (e) {
            console.error('Failed to load cases:', e)
            showToast('Failed to load cases. Check console for details.', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadCases()
    }, [])

    async function handleDelete(caseId: string) {
        if (!confirm('Delete this case? This cannot be undone.')) return
        try {
            await deleteCase(caseId)
            setCases(prev => prev.filter(c => c.id !== caseId))
            if (selectedCase?.meta.case_id === caseId) setSelectedCase(null)
            showToast('Case deleted successfully.', 'info')
        } catch (e) {
            console.error('Delete failed:', e)
            showToast('Failed to delete case.', 'error')
        }
    }

    async function handleManualSync(caseId: string) {
        setSyncing(caseId)
        try {
            const { syncCase } = await import('../services/sync')
            const success = await syncCase(caseId)
            await loadCases()
            if (success) {
                showToast('Case synced successfully!', 'success')
            } else {
                showToast('Sync failed. Check console for details.', 'error')
            }
        } catch (e) {
            console.error('Manual sync failed:', e)
            showToast('Failed to sync case.', 'error')
        } finally {
            setSyncing(null)
        }
    }

    function exportCase(bundle: CaseBundle) {
        const json = JSON.stringify({
            meta: bundle.meta,
            ml: bundle.ml,
        }, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `case_${bundle.meta.case_id}_metadata.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    // Categorize cases by risk level
    const categorizedCases = {
        red: cases.filter(c => c.bundle?.ml.decision === 'red' && (syncFilter === 'all' || c.bundle?.sync_status === syncFilter)),
        amber: cases.filter(c => c.bundle?.ml.decision === 'amber' && (syncFilter === 'all' || c.bundle?.sync_status === syncFilter)),
        green: cases.filter(c => c.bundle?.ml.decision === 'green' && (syncFilter === 'all' || c.bundle?.sync_status === syncFilter))
    }

    const totalCases = categorizedCases.red.length + categorizedCases.amber.length + categorizedCases.green.length

    const riskBadge = (decision: 'green' | 'amber' | 'red') => {
        return (
            <span className={`badge badge-${decision}`}>
                {decision === 'green' ? '✓' : decision === 'red' ? '!' : '⚠'} {decision}
            </span>
        )
    }

    const renderCaseCard = ({ id, created_at, bundle }: CaseListItem) => (
        <div key={id} className="glass-card fade-in" style={{
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.03) 0%, rgba(15, 23, 42, 0.8) 100%)',
            borderLeft: `3px solid ${bundle ? (bundle.ml.decision === 'red' ? 'var(--color-red-500)' : bundle.ml.decision === 'amber' ? 'var(--color-amber-500)' : 'var(--color-green-500)') : 'transparent'}`
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                        {new Date(created_at).toLocaleString()}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-teal-400)' }}>
                        #{id.slice(0, 8).toUpperCase()}
                    </div>
                </div>
                {bundle && riskBadge(bundle.ml.decision)}
            </div>

            {bundle && (
                <>
                    <div style={{
                        background: 'rgba(0,0,0,0.3)',
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                        <div>
                            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-white)', fontFamily: 'var(--font-mono)' }}>
                                {(bundle.ml.p_suspicious * 100).toFixed(1)}%
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Suspicion Probability
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                        <SyncBadge
                            status={bundle.sync_status}
                            attempts={bundle.sync_attempts}
                            lastAttempt={bundle.last_sync_attempt}
                        />

                        {(bundle.ml.decision === 'red' || bundle.ml.decision === 'amber') &&
                            bundle.sync_status !== 'sent' && (
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => handleManualSync(id)}
                                    disabled={syncing === id}
                                    style={{ fontSize: '11px', padding: '4px 10px', minHeight: 'auto' }}
                                >
                                    {syncing === id ? '⏳' : bundle.sync_status === 'failed' ? '🔄' : '📤'}
                                </button>
                            )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginTop: 'auto' }}>
                        <button
                            className="btn btn-primary"
                            onClick={() => setSelectedCase(bundle)}
                            style={{ fontSize: '13px', padding: '10px' }}
                        >
                            View Details
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => handleDelete(id)}
                            style={{ fontSize: '13px', padding: '10px', borderColor: 'var(--color-red-500)', color: 'var(--color-red-400)' }}
                        >
                            Delete
                        </button>
                    </div>
                </>
            )}
        </div>
    )

    const renderRiskSection = (risk: 'red' | 'amber' | 'green', label: string, icon: string) => {
        const sectionCases = categorizedCases[risk]
        const isExpanded = expandedSection === risk
        const color = risk === 'red' ? 'var(--color-red-500)' : risk === 'amber' ? 'var(--color-amber-500)' : 'var(--color-green-500)'

        return (
            <div className="glass-card" style={{
                background: `linear-gradient(135deg, rgba(${risk === 'red' ? '239, 68, 68' : risk === 'amber' ? '245, 158, 11' : '16, 185, 129'}, 0.05) 0%, rgba(15, 23, 42, 0.8) 100%)`,
                borderTop: `3px solid ${color}`
            }}>
                <button
                    onClick={() => setExpandedSection(isExpanded ? null : risk)}
                    style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-white)',
                        cursor: 'pointer',
                        padding: 'var(--space-4)',
                        textAlign: 'left'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{
                            fontSize: '32px',
                            lineHeight: 1
                        }}>
                            {icon}
                        </div>
                        <div>
                            <div style={{
                                fontSize: '18px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '2px',
                                color
                            }}>
                                {label}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-gray-400)', marginTop: '4px' }}>
                                {sectionCases.length} {sectionCases.length === 1 ? 'case' : 'cases'}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{
                            fontSize: '24px',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            color,
                            minWidth: '40px',
                            textAlign: 'right'
                        }}>
                            {sectionCases.length}
                        </div>
                        <div style={{
                            fontSize: '20px',
                            transition: 'transform 0.3s',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                            color: 'var(--color-teal-400)'
                        }}>
                            ▼
                        </div>
                    </div>
                </button>

                {isExpanded && sectionCases.length > 0 && (
                    <div className="fade-in" style={{
                        padding: '0 var(--space-4) var(--space-4)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: 'var(--space-4)'
                    }}>
                        {sectionCases.map(renderCaseCard)}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-6)' }}>
            {/* Header */}
            <div className="glass-card" style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
                borderLeft: '4px solid var(--color-teal-500)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, var(--color-teal-500), transparent)',
                    animation: 'scan 2s linear infinite'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                    <div>
                        <div style={{ fontSize: '12px', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
                            DIAGNOSTIC DATABASE
                        </div>
                        <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 700 }}>Case Review</h2>
                        <p style={{ opacity: 0.7, margin: '8px 0 0', fontSize: '14px' }}>
                            {totalCases} {totalCases === 1 ? 'case' : 'cases'} • AES-256 Encrypted
                        </p>
                    </div>
                    <button className="btn btn-secondary" onClick={loadCases} disabled={loading} style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {loading ? '⏳ Loading...' : '🔄 Refresh'}
                    </button>
                </div>

                {/* Sync Filter */}
                <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '1px' }}>Sync Status:</span>
                        {(['all', 'unsent', 'pending', 'sent', 'failed'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setSyncFilter(f)}
                                className={syncFilter === f ? 'btn btn-primary' : 'btn btn-secondary'}
                                style={{ padding: '4px 12px', fontSize: '11px', minHeight: '28px', textTransform: 'uppercase' }}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                    <div className="shimmer" style={{ width: '100%', height: '200px', borderRadius: 'var(--radius-lg)' }}></div>
                    <p style={{ marginTop: 'var(--space-4)', opacity: 0.7 }}>Loading cases...</p>
                </div>
            ) : totalCases === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: 'var(--space-12)', opacity: 0.7 }}>
                    <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>📭</div>
                    <h3>No cases found</h3>
                    <p>Capture and save a case to see it here.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                    {renderRiskSection('red', 'High Risk Cases', '🔴')}
                    {renderRiskSection('amber', 'Medium Risk Cases', '🟡')}
                    {renderRiskSection('green', 'Low Risk Cases', '🟢')}
                </div>
            )}

            {/* Case Detail Modal - unchanged */}
            {selectedCase && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 'var(--space-4)',
                        zIndex: 1000
                    }}
                    onClick={() => setSelectedCase(null)}
                >
                    <div
                        className="glass-card fade-in"
                        style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflow: 'auto', padding: 'var(--space-6)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--space-6)' }}>
                            <h2 style={{ margin: 0 }}>Case Details</h2>
                            <button className="btn btn-secondary" onClick={() => setSelectedCase(null)}>✕ Close</button>
                        </div>

                        <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
                            {/* ML Results */}
                            <div className="glass-panel">
                                <h4 style={{ marginTop: 0, color: 'var(--color-teal-400)' }}>ML Analysis Result</h4>
                                <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', marginTop: 'var(--space-2)' }}>
                                    {riskBadge(selectedCase.ml.decision)}
                                    <span style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-white)' }}>
                                        {(selectedCase.ml.p_suspicious * 100).toFixed(1)}%
                                    </span>
                                    <span style={{ opacity: 0.7 }}>suspicion probability</span>
                                </div>
                            </div>

                            {/* Images */}
                            <div>
                                <h4 style={{ color: 'var(--color-teal-400)', marginBottom: 'var(--space-3)' }}>Captured Images</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                                    {selectedCase.images.map((img, idx) => (
                                        <div key={idx} style={{ position: 'relative' }}>
                                            <div style={{
                                                position: 'absolute',
                                                top: '8px',
                                                left: '8px',
                                                background: 'rgba(0,0,0,0.7)',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                textTransform: 'uppercase',
                                                color: 'white'
                                            }}>
                                                {img.view}
                                            </div>
                                            <img
                                                src={URL.createObjectURL(img.blob)}
                                                alt={`${img.view} view`}
                                                style={{ width: '100%', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-700)' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Metadata */}
                            <div className="glass-panel">
                                <h4 style={{ marginTop: 0, color: 'var(--color-teal-400)' }}>Metadata</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', fontSize: '14px', opacity: 0.9 }}>
                                    <div>
                                        <div style={{ opacity: 0.6, fontSize: '12px' }}>Case ID</div>
                                        <div style={{ fontFamily: 'var(--font-mono)' }}>{selectedCase.meta.case_id}</div>
                                    </div>
                                    <div>
                                        <div style={{ opacity: 0.6, fontSize: '12px' }}>Captured At</div>
                                        <div>{new Date(selectedCase.meta.capture_ts).toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div style={{ opacity: 0.6, fontSize: '12px' }}>Site / Worker</div>
                                        <div>{selectedCase.meta.site_id} / {selectedCase.meta.worker_id}</div>
                                    </div>
                                    <div>
                                        <div style={{ opacity: 0.6, fontSize: '12px' }}>Quality Control</div>
                                        <div>Blur: {selectedCase.meta.qc_summary.blurVar.toFixed(1)} | Glare: {selectedCase.meta.qc_summary.glarePct.toFixed(1)}%</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => exportCase(selectedCase)}
                                >
                                    📥 Export JSON
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        if (confirm('Delete this case?')) {
                                            handleDelete(selectedCase.meta.case_id)
                                        }
                                    }}
                                    style={{ borderColor: 'var(--color-red-500)', color: 'var(--color-red-400)' }}
                                >
                                    🗑️ Delete Case
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes scan {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    )
}
