# ml/train_cls.py
from pathlib import Path
import warnings, json
warnings.filterwarnings("ignore", category=UserWarning, module="PIL")

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights
from PIL import Image
import numpy as np
import matplotlib.pyplot as plt

# ==== CONFIG ====
DATA_DIR = Path("data/")           # expects data/train, data/val
BATCH_SIZE = 32
EPOCHS = 40                        # increased for better convergence
LR = 1e-3
IMG_SIZE = 224
PATIENCE = 7                       # increased patience for better training
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# ==== FIX for RGBA/Palette PNGs ====
def rgba_to_rgb(img: Image.Image):
    if img.mode in ("RGBA", "P"):
        return img.convert("RGB")
    return img

# ==== AUGMENTATIONS (enhanced to improve generalization) ====
train_tfms = transforms.Compose([
    transforms.Lambda(rgba_to_rgb),
    transforms.RandomResizedCrop((IMG_SIZE, IMG_SIZE), scale=(0.85, 1.0)),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomVerticalFlip(p=0.2),  # added for oral images
    transforms.RandomAffine(degrees=15, translate=(0.1, 0.1)),
    transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.05),
    transforms.RandomGrayscale(p=0.1),  # added for robustness
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])

val_tfms = transforms.Compose([
    transforms.Lambda(rgba_to_rgb),
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])

# ==== DATASETS & LOADERS ====
train_ds = datasets.ImageFolder(DATA_DIR / "train", transform=train_tfms)
val_ds   = datasets.ImageFolder(DATA_DIR / "val", transform=val_tfms)

train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
val_loader   = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

# ==== CLASS WEIGHTS (increased weight for suspicious class to improve sensitivity) ====
targets = np.array(train_ds.targets)
class_counts = np.bincount(targets, minlength=2).astype(float)
# Increase weight for suspicious class (index 1) to prioritize sensitivity
inv_freq = 1.0 / np.maximum(class_counts, 1.0)
class_weights = (inv_freq / inv_freq.mean()).astype(np.float32)
# Boost suspicious class weight by 20% to improve sensitivity
class_weights[1] *= 1.2
CLASS_WEIGHTS_T = torch.tensor(class_weights, device=DEVICE)
print(f"Class counts (train): normal={int(class_counts[0])}, suspicious={int(class_counts[1])}")
print(f"Class weights used: {class_weights}")

# ==== MODEL ====
weights = MobileNet_V3_Small_Weights.DEFAULT
model = mobilenet_v3_small(weights=weights)
model.classifier[3] = nn.Linear(model.classifier[3].in_features, 2)
model = model.to(DEVICE)

def train():
    criterion = nn.CrossEntropyLoss(weight=CLASS_WEIGHTS_T)
    optimizer = optim.Adam(model.parameters(), lr=LR, weight_decay=1e-4)  # added weight decay
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="min", factor=0.5, patience=4
    )

    history = {"train_loss": [], "train_acc": [], "val_acc": [], "val_loss": [], "lr": []}

    best_val_loss = float("inf")
    best_path = Path("ml/mobilenetv3_small_opmd.pt")
    best_path.parent.mkdir(parents=True, exist_ok=True)
    epochs_no_improve = 0

    for epoch in range(EPOCHS):
        # ---- Train ----
        model.train()
        running_loss, correct, total = 0.0, 0, 0
        for imgs, labels in train_loader:
            imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()
            _, preds = outputs.max(1)
            correct += preds.eq(labels).sum().item()
            total += labels.size(0)

        train_acc = 100.0 * correct / total if total > 0 else 0.0
        train_loss = running_loss / max(len(train_loader), 1)

        # ---- Validate ----
        model.eval()
        val_correct, val_total = 0, 0
        val_running_loss = 0.0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
                outputs = model(imgs)
                loss = criterion(outputs, labels)
                val_running_loss += loss.item()

                _, preds = outputs.max(1)
                val_correct += preds.eq(labels).sum().item()
                val_total += labels.size(0)

        val_acc = 100.0 * val_correct / val_total if val_total > 0 else 0.0
        val_loss = val_running_loss / max(len(val_loader), 1)

        # ---- Scheduler & logging ----
        scheduler.step(val_loss)
        current_lr = optimizer.param_groups[0]["lr"]
        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)
        history["val_acc"].append(val_acc)
        history["val_loss"].append(val_loss)
        history["lr"].append(current_lr)

        print(f"Epoch {epoch+1}/{EPOCHS} "
              f"Loss: {train_loss:.4f}  Train Acc: {train_acc:.2f}%  "
              f"Val Loss: {val_loss:.4f}  Val Acc: {val_acc:.2f}%  LR: {current_lr:.1e}")

        # ---- Early stopping on best val loss ----
        if val_loss < best_val_loss - 1e-4:
            best_val_loss = val_loss
            epochs_no_improve = 0
            torch.save(model.state_dict(), best_path)
            print(f"  🔥 New best model saved → {best_path} (val_loss={best_val_loss:.4f})")
        else:
            epochs_no_improve += 1
            if epochs_no_improve >= PATIENCE:
                print(f"⏹ Early stopping at epoch {epoch+1} (no val loss improvement for {PATIENCE} epochs).")
                break

    # ---- Save history & training curves ----
    out_metrics = Path("ml/metrics")
    out_metrics.mkdir(parents=True, exist_ok=True)
    with open(out_metrics / "train_history.json", "w") as f:
        json.dump(history, f)

    epochs_x = range(1, len(history["train_acc"]) + 1)
    plt.figure(figsize=(12,5))

    plt.subplot(1,2,1)
    plt.plot(epochs_x, history["train_acc"], label="Train Acc")
    plt.plot(epochs_x, history["val_acc"], label="Val Acc")
    plt.xlabel("Epochs"); plt.ylabel("Accuracy (%)")
    plt.legend(); plt.title("Training vs Validation Accuracy")

    plt.subplot(1,2,2)
    plt.plot(epochs_x, history["train_loss"], label="Train Loss")
    plt.plot(epochs_x, history["val_loss"], label="Val Loss")
    plt.xlabel("Epochs"); plt.ylabel("Loss")
    plt.legend(); plt.title("Training & Validation Loss")
    plt.tight_layout()
    plt.savefig(out_metrics / "training_curves.png", dpi=200)
    plt.close()

    print("📊 Training curves saved to ml/metrics/training_curves.png")
    print(f"✅ Best model (by val loss) saved to {best_path}")

if __name__ == "__main__":
    train()
