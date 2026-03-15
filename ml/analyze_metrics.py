import json
import pandas as pd

# Load training history
with open('ml/metrics/train_history.json', 'r') as f:
    data = json.load(f)

print('=' * 60)
print('TRAINING HISTORY')
print('=' * 60)
print(f'Epochs trained: {len(data["train_acc"])}')
print(f'Final train accuracy: {data["train_acc"][-1]:.2f}%')
print(f'Final val accuracy: {data["val_acc"][-1]:.2f}%')
print(f'Best val accuracy: {max(data["val_acc"]):.2f}%')
print(f'Final train loss: {data["train_loss"][-1]:.4f}')
print(f'Final val loss: {data["val_loss"][-1]:.4f}')
print(f'Best val loss: {min(data["val_loss"]):.4f}')

# Load test predictions
df = pd.read_csv('ml/metrics/test_predictions.csv')

print('\n' + '=' * 60)
print('TEST SET PERFORMANCE')
print('=' * 60)
print(f'Total samples: {len(df)}')
print(f'Normal samples: {(df["true_label"] == "normal").sum()}')
print(f'Suspicious samples: {(df["true_label"] == "suspicious").sum()}')

accuracy = (df["true_label"] == df["pred_label_thr_0.5"]).mean()
print(f'\nAccuracy: {accuracy:.4f} ({accuracy*100:.2f}%)')

# Sensitivity (recall of suspicious)
suspicious_mask = df["true_label"] == "suspicious"
correctly_predicted_suspicious = (df["true_label"] == "suspicious") & (df["pred_label_thr_0.5"] == "suspicious")
sensitivity = correctly_predicted_suspicious.sum() / suspicious_mask.sum()
print(f'Sensitivity (recall of suspicious): {sensitivity:.4f} ({sensitivity*100:.2f}%)')

# Specificity (recall of normal)
normal_mask = df["true_label"] == "normal"
correctly_predicted_normal = (df["true_label"] == "normal") & (df["pred_label_thr_0.5"] == "normal")
specificity = correctly_predicted_normal.sum() / normal_mask.sum()
print(f'Specificity (recall of normal): {specificity:.4f} ({specificity*100:.2f}%)')

# False positives and false negatives
fp = ((df["true_label"] == "normal") & (df["pred_label_thr_0.5"] == "suspicious")).sum()
fn = ((df["true_label"] == "suspicious") & (df["pred_label_thr_0.5"] == "normal")).sum()
print(f'\nFalse Positives: {fp}')
print(f'False Negatives: {fn}')

print('\n' + '=' * 60)
print('WEEK 4 REQUIREMENTS CHECK')
print('=' * 60)
print('Expected: Sensitivity >= 90% (at least 90% of suspicious cases detected)')
print(f'Current:  Sensitivity = {sensitivity*100:.2f}%')
if sensitivity >= 0.90:
    print('✅ MEETS Week 4 requirement')
else:
    print('❌ DOES NOT MEET Week 4 requirement - Retraining needed')
    print(f'   Gap: {(0.90 - sensitivity)*100:.2f}% below target')
