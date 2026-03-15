// src/components/CameraView.tsx
import { useEffect, useRef, useState } from 'react'

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

  async function stopStream() {
    const s = videoRef.current?.srcObject as MediaStream | null
    s?.getTracks().forEach(t => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
  }

  async function pickDeviceId(): Promise<string | undefined> {
    // On first call, some browsers need an initial getUserMedia to reveal labels.
    const devices = await navigator.mediaDevices.enumerateDevices()
    const cams = devices.filter(d => d.kind === 'videoinput')
    if (!cams.length) return undefined
    const rear = cams.find(d => /rear|back|environment/i.test(d.label))
    return (rear ?? cams[0]).deviceId
  }

  async function startCamera() {
    setErr('none'); setMsg('')
    try {
      await stopStream()
      let deviceId = await pickDeviceId()

      // Fallback: try a short provisional open to populate labels if blocked
      if (!deviceId) {
        try {
          const probe = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          probe.getTracks().forEach(t => t.stop())
          deviceId = await pickDeviceId()
        } catch (_) { /* ignore */ }
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      const v = videoRef.current!
      v.srcObject = stream
      // Make sure autoplay can happen on mobile
      await v.play().catch(() => {
        // user gesture fallback: show message
        setMsg('Tap the video to start preview (autoplay blocked).')
      })

      // Draw loop → into hidden canvas for QC
      const c = canvasRef.current!
      const ctx = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
      function draw() {
        const { videoWidth: w, videoHeight: h } = v
        if (w && h) { c.width = w; c.height = h; ctx.drawImage(v, 0, 0, w, h) }
        requestAnimationFrame(draw)
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
  }

  useEffect(() => {
    startCamera()
    return () => { stopStream() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      {(err !== 'none' || msg) && (
        <div className="card" style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Camera status</div>
          <div style={{ opacity: .9 }}>{msg}</div>
          <div style={{ marginTop: 8 }}>
            <button className="button" onClick={startCamera}>Restart Camera</button>
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
      <canvas ref={canvasRef} style={{ display:'none' }} />
    </div>
  )
}
