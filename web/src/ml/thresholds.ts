// src/ml/thresholds.ts
export const QC_THRESHOLDS = {
  blurVarMin: 150.0,  // tune in pilot
  glarePctMax: 6.0,
};

export function qcPass(blurVar: number, glarePct: number) {
  return blurVar >= QC_THRESHOLDS.blurVarMin && glarePct <= QC_THRESHOLDS.glarePctMax;
}

export function qcFailureReasons(blurVar: number, glarePct: number) {
  const reasons: string[] = [];
  if (blurVar < QC_THRESHOLDS.blurVarMin) reasons.push(`Low sharpness (σ² ${blurVar.toFixed(0)} < ${QC_THRESHOLDS.blurVarMin})`);
  if (glarePct > QC_THRESHOLDS.glarePctMax) reasons.push(`High glare (${glarePct.toFixed(1)}% > ${QC_THRESHOLDS.glarePctMax}%)`);
  return reasons;
}

export function qcTips(blurBad: boolean, glareBad: boolean) {
  const tips: string[] = [];
  if (blurBad) tips.push('Hold steadier / rest elbows • Ask subject not to move • Tap to focus if device supports');
  if (glareBad) tips.push('Tilt phone a bit • Wipe lens • Diffuse or dim light • Avoid direct reflections on mucosa');
  return tips;
}
