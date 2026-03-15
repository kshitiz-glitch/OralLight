#!/usr/bin/env python3
"""Calibration script for OralLight PWA (Week 4).

- Loads predictions from `ml/metrics/test_predictions.csv`.
- Computes ROC curve and selects the smallest probability threshold τ
  that yields **sensitivity (recall) ≥ 0.90**.
- Writes the calibrated threshold and default uncertainty thresholds to
  `public/config/calibrated.json` for the frontend.
"""

import json
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.metrics import roc_curve

# ---- Configurable paths ----
PROJECT_ROOT = Path(__file__).resolve().parents[1]  # oralight/
PREDICTIONS_CSV = PROJECT_ROOT / "ml" / "metrics" / "test_predictions.csv"
OUTPUT_JSON = PROJECT_ROOT / "web" / "public" / "config" / "calibrated.json"

def find_threshold(y_true, y_prob):
    fpr, tpr, thresholds = roc_curve(y_true, y_prob, pos_label=1)
    # tpr is sensitivity. Find first threshold where sensitivity >= 0.90
    # Thresholds are in decreasing order
    for sens, thr in zip(tpr, thresholds):
        if sens >= 0.90:
            return float(thr)
    return float(thresholds[-1])

def main():
    if not PREDICTIONS_CSV.is_file():
        raise FileNotFoundError(f"Predictions CSV not found at {PREDICTIONS_CSV}")
    
    print(f"Loading predictions from {PREDICTIONS_CSV} ...")
    df = pd.read_csv(PREDICTIONS_CSV)
    
    # Map labels to binary
    y_true = (df['true_label'] == 'suspicious').astype(int)
    y_prob = df['prob_suspicious']
    
    tau = find_threshold(y_true, y_prob)
    print(f"Calibrated threshold τ (sensitivity≥90%): {tau:.4f}")
    
    config = {
        "tau": tau,
        "uncertainty_high": 0.12,
        "uncertainty_very_high": 0.20
    }
    
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)
    print(f"Wrote calibrated config to {OUTPUT_JSON}")

if __name__ == "__main__":
    main()
