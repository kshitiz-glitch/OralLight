# ml/evaluate.py
from pathlib import Path
import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="PIL")

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights
from PIL import Image

import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics import (
    confusion_matrix, ConfusionMatrixDisplay,
    roc_curve, auc,
    precision_recall_curve, average_precision_score,
    classification_report
)
import csv

# ===== CONFIG =====
DATA_DIR = Path("data/test")       # expects data/test/normal and data/test/suspicious
CKPT_PATH = Path("ml/mobilenetv3_small_opmd.pt")
OUT_DIR = Path("ml/metrics")       # where plots & csv will be saved
BATCH_SIZE = 32
IMG_SIZE = 224
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
CLASS_NAMES = ["normal", "suspicious"]  # index 0=normal, 1=suspicious

# ===== PIL fix for RGBA/Palette PNGs =====
def rgba_to_rgb(img: Image.Image) -> Image.Image:
    if img.mode in ("RGBA", "P"):
        return img.convert("RGB")
    return img

# ===== Transforms (match training normalization) =====
common_tfms = transforms.Compose([
    transforms.Lambda(rgba_to_rgb),
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])

# ===== Dataset & Loader =====
dataset = datasets.ImageFolder(DATA_DIR, transform=common_tfms)
loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

# ===== Model (must mirror train_cls.py) =====
weights = MobileNet_V3_Small_Weights.DEFAULT
model = mobilenet_v3_small(weights=weights)
model.classifier[3] = nn.Linear(model.classifier[3].in_features, 2)
state = torch.load(CKPT_PATH, map_location="cpu")
model.load_state_dict(state)
model = model.to(DEVICE)
model.eval()

# ===== Inference =====
all_probs = []
all_preds = []
all_labels = []
all_paths = []

softmax = nn.Softmax(dim=1)

with torch.no_grad():
    for imgs, labels in loader:
        imgs = imgs.to(DEVICE)
        logits = model(imgs)
        probs = softmax(logits).cpu().numpy()      # shape [N, 2]
        preds = np.argmax(probs, axis=1)           # 0 or 1

        all_probs.append(probs[:, 1])              # p(suspicious)
        all_preds.append(preds)
        all_labels.append(labels.numpy())

# concat
y_prob = np.concatenate(all_probs, axis=0)         # float [N]
y_pred = np.concatenate(all_preds, axis=0)         # int [N]
y_true = np.concatenate(all_labels, axis=0)        # int [N]

# capture file paths aligned to dataset order
for i in range(len(dataset.samples)):
    all_paths.append(dataset.samples[i][0])        # sample path

OUT_DIR.mkdir(parents=True, exist_ok=True)

# ===== Metrics =====
# Confusion matrix at default threshold 0.5
thr = 0.5
y_pred_thr = (y_prob >= thr).astype(int)

cm = confusion_matrix(y_true, y_pred_thr, labels=[0, 1])
tn, fp, fn, tp = cm.ravel()
acc = (tp + tn) / cm.sum()
sens = tp / (tp + fn) if (tp + fn) > 0 else 0.0       # recall of suspicious
spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
# Precision/F1 from classification_report (for completeness)
print("\n=== Classification Report @ threshold=0.5 ===")
print(classification_report(y_true, y_pred_thr, target_names=CLASS_NAMES, digits=3))

print(f"Accuracy:   {acc:.4f}")
print(f"Sensitivity (recall of 'suspicious'): {sens:.4f}")
print(f"Specificity (of 'normal'):            {spec:.4f}")

# ROC, AUC
fpr, tpr, _ = roc_curve(y_true, y_prob, pos_label=1)
roc_auc = auc(fpr, tpr)
print(f"AUC (ROC):  {roc_auc:.4f}")

# PR, AP
precision, recall, _ = precision_recall_curve(y_true, y_prob, pos_label=1)
ap = average_precision_score(y_true, y_prob, pos_label=1)
print(f"AP (PR):    {ap:.4f}")

# ===== Save plots =====
# 1) Confusion Matrix
disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=CLASS_NAMES)
disp.plot(cmap=plt.cm.Blues, values_format="d")
plt.title("Confusion Matrix (Test Set) @ threshold=0.5")
plt.tight_layout()
plt.savefig(OUT_DIR / "confusion_matrix.png", dpi=200)
plt.close()

# 2) ROC Curve
plt.figure()
plt.plot(fpr, tpr, label=f"AUC = {roc_auc:.3f}")
plt.plot([0, 1], [0, 1], "--", color="gray")
plt.xlabel("False Positive Rate")
plt.ylabel("True Positive Rate (Sensitivity)")
plt.title("ROC Curve (Test Set)")
plt.legend(loc="lower right")
plt.tight_layout()
plt.savefig(OUT_DIR / "roc_curve.png", dpi=200)
plt.close()

# 3) Precision-Recall Curve
plt.figure()
plt.plot(recall, precision, label=f"AP = {ap:.3f}")
plt.xlabel("Recall")
plt.ylabel("Precision")
plt.title("Precision–Recall Curve (Test Set)")
plt.legend(loc="lower left")
plt.tight_layout()
plt.savefig(OUT_DIR / "pr_curve.png", dpi=200)
plt.close()

# ===== Save per-image predictions (CSV) =====
csv_path = OUT_DIR / "test_predictions.csv"
with open(csv_path, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["image_path", "true_label", "prob_suspicious", "pred_label_thr_0.5"])
    for pth, y, prob, pred in zip(all_paths, y_true, y_prob, y_pred_thr):
        w.writerow([pth, CLASS_NAMES[y], f"{prob:.6f}", CLASS_NAMES[pred]])

print(f"\n✅ Saved plots and predictions to: {OUT_DIR.resolve()}")
print(" - confusion_matrix.png")
print(" - roc_curve.png")
print(" - pr_curve.png")
print(" - test_predictions.csv")
