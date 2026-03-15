import { useEffect, useRef, useState } from 'react'
import { CameraView } from '../components/CameraView'
import { QCBadges } from '../components/QCBadges'
import { laplacianVariance, glarePercent } from '../ml/qc'
import { qcPass, qcFailureReasons, qcTips } from '../ml/thresholds'
import { enhanceCanvasToUrl, type EnhanceMeta } from '../ml/enhance'
import { saveEncryptedCase, deriveKey } from '../store/db'
import type { CaseBundle, CaseMeta, QCResult } from '../store/types'
import { inferWithUncertainty } from '../ml/infer';
import { configPromise } from '../config';
import { useToast } from '../context/ToastContext';

const VIEWS = ['front', 'left', 'right'] as const
type View = typeof VIEWS[number]

type Shot = { view: View; blob: Blob; url: string; meta: EnhanceMeta }

interface CapturePageProps {
  participantId?: string
  onAnalysisComplete?: (result: {
    caseId: string
    decision: 'green' | 'amber' | 'red'
    probability: number
    uncertainty: number
    captureTimestamp: string
    images: { view: string; url: string }[]
    qcSummary: { blurVar: number; glarePct: number }
    enhancementMethod: 'Zero-DCE' | 'WB/gamma' | 'None'
    participantId?: string
  }) => void
}

export function CapturePage({ participantId, onAnalysisComplete }: CapturePageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentView, setCurrentView] = useState<View>('front')
  const [qc, setQc] = useState<QCResult>({ blurVar: 0, glarePct: 0 })
  const [shots, setShots] = useState<Record<View, Shot | null>>({ front: null, left: null, right: null })
  const [busy, setBusy] = useState(false)
  const [gateMsg, setGateMsg] = useState<string>('')

  // Live QC loop
  useEffect(() => {
    const id = setInterval(() => {
      const c = canvasRef.current
      if (!c || c.width === 0 || c.height === 0) return
      const ctx = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
      const img = ctx.getImageData(0, 0, c.width, c.height)
      const blurVar = laplacianVariance(img)
      const glarePct = glarePercent(img)
      setQc({ blurVar, glarePct })
    }, 400)
    return () => clearInterval(id)
  }, [])

  function allViewsDone() {
    return VIEWS.every(v => Boolean(shots[v]))
  }

  const { showToast } = useToast()

  async function snap(force = false) {
    const c = canvasRef.current
    if (!c) return showToast('Camera not ready', 'error')

    const pass = qcPass(qc.blurVar, qc.glarePct)
    if (!pass && !force) {
      const reasons = qcFailureReasons(qc.blurVar, qc.glarePct)
      const tips = qcTips(qc.blurVar < 150, qc.glarePct > 6)
      setGateMsg(`QC failed: ${reasons.join(' • ')}. Try again. Tips: ${tips.join(' | ')}`)
      return
    }

    setBusy(true)
    try {
      const { url, meta, blob } = await enhanceCanvasToUrl(c, 0.9)
      const shot: Shot = { view: currentView, url, meta, blob }
      setShots(prev => ({ ...prev, [currentView]: shot }))
      setGateMsg('')

      // Auto-advance to next view if available
      const currentIndex = VIEWS.indexOf(currentView)
      if (currentIndex < VIEWS.length - 1) {
        setTimeout(() => setCurrentView(VIEWS[currentIndex + 1]), 500)
      }
    } catch (e) {
      console.error('Snap failed:', e)
      showToast('Could not capture frame. Try again.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function saveCase() {
    if (!allViewsDone()) return showToast('Capture front, left and right before saving.', 'warning')

    setBusy(true)
    try {
      const cfg = await configPromise;
      const frontBlob = shots.front!.blob;
      const img = new Image();
      const imgUrl = URL.createObjectURL(frontBlob);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imgUrl;
      });

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const ctx = tempCanvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(imgUrl);

      const { mean, std } = await inferWithUncertainty(tempCanvas);

      let decision: 'green' | 'amber' | 'red';
      if (std > cfg.uncertainty_very_high) {
        decision = 'red';
      } else if (mean >= cfg.tau) {
        decision = 'red';
      } else if (mean >= cfg.tau * 0.8) {
        decision = 'amber';
      } else {
        decision = 'green';
      }

      const reason = `p=${(mean * 100).toFixed(1)}% ± ${(std * 100).toFixed(1)}%`;
      const last = VIEWS.map(v => shots[v]!).filter(Boolean).slice(-1)[0]

      const meta: CaseMeta = {
        case_id: crypto.randomUUID(),
        site_id: 'site1',
        worker_id: 'worker1',
        device_hash: navigator.userAgent.slice(0, 32),
        created_at: Date.now(),
        decision,
        probability: mean,
        uncertainty: std,
        capture_ts: new Date().toISOString(),
        view_set: ['front', 'left', 'right'],
        qc_summary: qc,
        wb_gains: last?.meta.wb_gains,
        gamma: last?.meta.gamma,
        consent_obtained: true,
        consent_timestamp: new Date().toISOString(),
        participant_id: participantId
      }

      const images = VIEWS.map(v => ({ view: v, blob: shots[v]!.blob }))
      const key = await deriveKey(meta.site_id, meta.worker_id)

      const bundle: CaseBundle = {
        meta,
        images,
        ml: { p_suspicious: mean, decision },
        sync_status: 'unsent',
        sync_attempts: 0
      }

      await saveEncryptedCase(bundle, key)

      const shouldAutoSync = decision === 'red' || decision === 'amber';
      if (shouldAutoSync) {
        try {
          const { registerSync } = await import('../services/sync');
          await registerSync(meta.case_id);
        } catch (syncError) {
          console.error('[Sync] Failed to register for sync:', syncError);
        }
      }

      // Prepare result for dashboard
      const analysisResult = {
        caseId: meta.case_id,
        decision,
        probability: mean,
        uncertainty: std,
        captureTimestamp: meta.capture_ts,
        images: VIEWS.map(v => ({ view: v, url: shots[v]!.url })),
        qcSummary: qc,
        enhancementMethod: (last?.meta.used_zero_dce ? 'Zero-DCE' : 'WB/gamma') as 'Zero-DCE' | 'WB/gamma' | 'None',
        participantId
      }

      // Reset state but DON'T revoke URLs yet - results page needs them
      setShots({ front: null, left: null, right: null })
      setCurrentView('front')

      // Call callback if provided, otherwise show toast
      if (onAnalysisComplete) {
        onAnalysisComplete(analysisResult)
      } else {
        // Clean up blob URLs only if not navigating to results
        for (const v of VIEWS) { try { if (shots[v]?.url) URL.revokeObjectURL(shots[v]!.url) } catch { } }
        const syncMsg = shouldAutoSync
          ? 'Will sync automatically when online.'
          : 'Saved locally only (Green cases are not synced).';
        showToast(`Case saved! Risk: ${decision.toUpperCase()}. ${syncMsg}`, 'success', 5000)
      }
    } catch (e) {
      console.error('Save failed:', e)
      showToast(`Failed to save case: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-6)' }}>
      {/* Medical-Tech Header */}
      <div className="glass-card" style={{
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
        borderLeft: '4px solid var(--color-teal-500)',
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
          background: 'linear-gradient(90deg, transparent, var(--color-teal-500), transparent)',
          animation: 'scan 2s linear infinite'
        }} />

        <div>
          <div style={{ fontSize: '12px', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
            DIAGNOSTIC IMAGING SYSTEM
          </div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Image Capture Protocol</h2>
          <p style={{ opacity: 0.7, margin: '8px 0 0', fontSize: '14px' }}>
            Capture front, left, and right views • Real-time quality analysis
          </p>
        </div>
      </div>

      {/* Top Section: Split Screen */}
      <div className="capture-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 'var(--space-6)',
        alignItems: 'start'
      }}>

        {/* Left: Camera View */}
        <div className="glass-card" style={{
          padding: 'var(--space-4)',
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(15, 23, 42, 0.8) 100%)'
        }}>
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            zIndex: 10,
            background: 'rgba(0,0,0,0.8)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            color: 'var(--color-teal-400)',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '2px',
            boxShadow: '0 0 10px rgba(6, 182, 212, 0.3)'
          }}>
            {currentView} VIEW
          </div>
          <div style={{ position: 'relative' }}>
            <CameraView canvasRef={canvasRef} />
            {/* Scanning overlay effect */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, var(--color-teal-400), transparent)',
              animation: 'scan 3s linear infinite',
              pointerEvents: 'none'
            }} />
          </div>
        </div>

        {/* Right: Controls & QC */}
        <div className="glass-card" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(15, 23, 42, 0.8) 100%)',
          borderTop: '2px solid var(--color-green-500)'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <h2 style={{ fontSize: '16px', margin: 0, color: 'var(--color-white)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Quality Control
              </h2>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: qcPass(qc.blurVar, qc.glarePct) ? 'var(--color-green-500)' : 'var(--color-red-500)',
                boxShadow: `0 0 10px ${qcPass(qc.blurVar, qc.glarePct) ? 'var(--color-green-500)' : 'var(--color-red-500)'}`,
                animation: 'pulse 2s ease-in-out infinite'
              }} />
            </div>
            <p style={{ color: 'var(--color-gray-400)', fontSize: '12px', margin: 0 }}>
              Real-time image quality analysis
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2)' }}>
            <QCBadges blurVar={qc.blurVar} glarePct={qc.glarePct} />
          </div>

          {gateMsg && (
            <div className="fade-in" style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '2px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3)',
              color: 'var(--color-red-400)',
              fontSize: '13px',
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
            }}>
              <div style={{ fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '11px' }}>
                ⚠️ QUALITY CHECK FAILED
              </div>
              {gateMsg}
              <button
                onClick={() => snap(true)}
                className="btn btn-secondary"
                style={{
                  marginTop: '12px',
                  width: '100%',
                  fontSize: '12px',
                  padding: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                Force Capture
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {VIEWS.map(v => (
                <button
                  key={v}
                  onClick={() => setCurrentView(v)}
                  disabled={busy}
                  className={currentView === v ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{
                    flex: 1,
                    padding: '10px',
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    position: 'relative'
                  }}
                >
                  {shots[v] && (
                    <span style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--color-green-500)',
                      boxShadow: '0 0 8px var(--color-green-500)'
                    }} />
                  )}
                  {v}
                </button>
              ))}
            </div>

            <button
              className="btn btn-primary"
              onClick={() => snap()}
              disabled={busy}
              style={{
                padding: '18px',
                fontSize: '16px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 700
              }}
            >
              {busy ? '⏳ PROCESSING...' : `📸 CAPTURE ${currentView.toUpperCase()}`}
            </button>

            <button
              className="btn btn-secondary"
              onClick={saveCase}
              disabled={!allViewsDone() || busy}
              style={{
                padding: '18px',
                fontSize: '16px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 700,
                borderColor: allViewsDone() ? 'var(--color-green-500)' : undefined,
                color: allViewsDone() ? 'var(--color-green-400)' : undefined,
                background: allViewsDone() ? 'rgba(16, 185, 129, 0.1)' : undefined,
                boxShadow: allViewsDone() ? '0 0 20px rgba(16, 185, 129, 0.2)' : undefined
              }}
            >
              {busy ? '⏳ ANALYZING...' : '💾 SAVE & ANALYZE CASE'}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom: Preview Strip */}
      <div className="glass-panel" style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(15, 23, 42, 0.8) 100%)',
        borderTop: '2px solid #8b5cf6'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--color-gray-300)', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Session Previews
          </h3>
          <div style={{ fontSize: '12px', color: '#a78bfa', fontFamily: 'var(--font-mono)' }}>
            {VIEWS.filter(v => shots[v]).length}/{VIEWS.length} CAPTURED
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--space-4)' }}>
          {VIEWS.map(v => (
            <div key={v} style={{
              aspectRatio: '4/3',
              background: 'rgba(0,0,0,0.4)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              position: 'relative',
              border: shots[v] ? '2px solid var(--color-teal-500)' : '2px dashed rgba(255, 255, 255, 0.1)',
              boxShadow: shots[v] ? '0 0 15px rgba(6, 182, 212, 0.3)' : 'none'
            }}>
              {shots[v]?.url ? (
                <>
                  <img
                    src={shots[v]!.url}
                    alt={`${v} preview`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    background: 'rgba(0,0,0,0.8)',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '10px',
                    color: 'var(--color-teal-400)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    border: '1px solid rgba(6, 182, 212, 0.3)'
                  }}>
                    {v}
                  </div>
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--color-green-500)',
                    boxShadow: '0 0 10px var(--color-green-500)'
                  }} />
                </>
              ) : (
                <div style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '8px',
                  color: 'var(--color-gray-600)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  <div style={{ fontSize: '24px', opacity: 0.3 }}>📷</div>
                  {v}
                </div>
              )}
            </div>
          ))}
        </div>
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
    </div>
  )
}
