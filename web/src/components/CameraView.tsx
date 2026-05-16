// src/components/CameraView.tsx
import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement>
}

type CamErr =
  | 'none'
  | 'permission'
  | 'busy'
  | 'notfound'
  | 'insecure'
  | 'unknown'

export function CameraView({ canvasRef }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [err, setErr] = useState<CamErr>('none')
  const [msg, setMsg] = useState<string>('')
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  const drawRAF = useRef<number>(0)

  async function stopStream() {
    if (drawRAF.current) cancelAnimationFrame(drawRAF.current)
    const s = videoRef.current?.srcObject as MediaStream | null
    s?.getTracks().forEach(t => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
  }

  async function checkMultipleCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cams = devices.filter(d => d.kind === 'videoinput')
      setHasMultipleCameras(cams.length > 1)
    } catch {
      setHasMultipleCameras(false)
    }
  }

  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    setErr('none'); setMsg('')
    try {
      await stopStream()

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      const v = videoRef.current!
      v.srcObject = stream
      await v.play().catch(() => {
        setMsg('Tap the video to start preview (autoplay blocked).')
      })

      await checkMultipleCameras()

      // Draw loop → into hidden canvas for QC
      const c = canvasRef.current!
      const ctx = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
      function draw() {
        const { videoWidth: w, videoHeight: h } = v
        if (w && h) { c.width = w; c.height = h; ctx.drawImage(v, 0, 0, w, h) }
        drawRAF.current = requestAnimationFrame(draw)
      }
      draw()
    } catch (e: any) {
      console.error('startCamera error:', e)
      if (e?.name === 'NotAllowedError') { setErr('permission'); setMsg('Camera permission denied. Allow it and reload.') }
      else if (e?.name === 'NotReadableError') { setErr('busy'); setMsg('Camera is used by another app. Close it (Zoom/Meet/Camera) and retry.') }
      else if (e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError') { setErr('notfound'); setMsg('No usable camera found on this device.') }
      else if (e?.name === 'NotSecureError') { setErr('insecure'); setMsg('Camera requires HTTPS (or localhost). Use HTTPS dev server on mobile.') }
      else { setErr('unknown'); setMsg(e?.message || 'Could not start camera.') }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef])

  function toggleCamera() {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(newFacing)
    startCamera(newFacing)
  }

  useEffect(() => {
    startCamera(facingMode)
    return () => { stopStream() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ position: 'relative' }}>
      {(err !== 'none' || msg) && (
        <div className="card" style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Camera status</div>
          <div style={{ opacity: .9 }}>{msg}</div>
          <div style={{ marginTop: 8 }}>
            <button className="button" onClick={() => startCamera(facingMode)}>Restart Camera</button>
          </div>
        </div>
      )}
      {/* Important attributes for mobile autoplay */}
      <video
        ref={videoRef}
        style={{ width:'100%', borderRadius:12, display:'block', background:'#000' }}
        playsInline
        muted
        onClick={() => videoRef.current?.play().catch(()=>{})}
      />

      {/* Camera flip button — only shown when multiple cameras exist */}
      {hasMultipleCameras && (
        <button
          onClick={toggleCamera}
          title={facingMode === 'environment' ? 'Switch to front camera' : 'Switch to rear camera'}
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '2px solid rgba(6, 182, 212, 0.5)',
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            color: 'var(--color-teal-400)',
            fontSize: '22px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.3)',
            transition: 'all 0.2s ease',
            zIndex: 10,
          }}
        >
          🔄
        </button>
      )}

      <canvas ref={canvasRef} style={{ display:'none' }} />
    </div>
  )
}
