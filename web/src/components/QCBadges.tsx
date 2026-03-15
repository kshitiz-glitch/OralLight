interface Props { blurVar: number; glarePct: number }

export function QCBadges({ blurVar, glarePct }: Props) {
  // Week-1 rough thresholds (tune later)
  const blurOk = blurVar >= 150.0
  const glareOk = glarePct <= 6.0

  return (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
      {/* Blur Indicator */}
      <div className={`qc-indicator ${blurOk ? 'pass' : 'fail'}`}>
        <div className="qc-indicator-value">{blurVar.toFixed(0)}</div>
        <div className="qc-indicator-label">Blur σ²</div>
        <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>
          {blurOk ? '✓ OK' : '✗ Low'}
        </div>
      </div>

      {/* Glare Indicator */}
      <div className={`qc-indicator ${glareOk ? 'pass' : 'fail'}`}>
        <div className="qc-indicator-value">{glarePct.toFixed(1)}%</div>
        <div className="qc-indicator-label">Glare</div>
        <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>
          {glareOk ? '✓ OK' : '✗ High'}
        </div>
      </div>
    </div>
  )
}
