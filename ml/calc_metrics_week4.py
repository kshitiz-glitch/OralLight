import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score, confusion_matrix, roc_auc_score

csv_path = 'ml/metrics/test_predictions.csv'
df = pd.read_csv(csv_path)

y_true = (df['true_label'] == 'suspicious').astype(int)
y_prob = df['prob_suspicious']
tau = 0.2156

y_pred = (y_prob >= tau).astype(int)

acc = accuracy_score(y_true, y_pred)
tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
sens = tp / (tp + fn) if (tp + fn) > 0 else 0
spec = tn / (tn + fp) if (tn + fp) > 0 else 0
auc = roc_auc_score(y_true, y_prob)

print(f"OralLight Metrics (tau={tau}):")
print(f"Accuracy: {acc*100:.2f}")
print(f"Sensitivity: {sens*100:.2f}")
print(f"Specificity: {spec*100:.2f}")
print(f"AUC: {auc*100:.2f}")
