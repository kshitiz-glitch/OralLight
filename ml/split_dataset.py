import os
import shutil
import random
from pathlib import Path

# Source folders (adjust if needed)
MENDELEY_BENIGN = Path("data/raw/mendeley/benign")
MENDELEY_MALIGNANT = Path("data/raw/mendeley/malignant")
KAGGLE_NORMAL = Path("data/raw/kaggle/normal")
KAGGLE_CANCER = Path("data/raw/kaggle/cancer")

# Destination root
DEST = Path("data")
SPLITS = ["train", "val", "test"]
CLASSES = ["normal", "suspicious"]

# Ensure dirs exist
for split in SPLITS:
    for cls in CLASSES:
        (DEST / split / cls).mkdir(parents=True, exist_ok=True)

def move_split(src_dirs, target_cls):
    # Gather all images
    all_files = []
    for src in src_dirs:
        if src.exists():
            all_files.extend(list(src.glob("*.*")))
    print(f"{target_cls}: {len(all_files)} files found")

    # Shuffle for randomness
    random.shuffle(all_files)

    # Split indexes
    n = len(all_files)
    n_train = int(0.7 * n)
    n_val = int(0.15 * n)

    splits = {
        "train": all_files[:n_train],
        "val": all_files[n_train:n_train+n_val],
        "test": all_files[n_train+n_val:]
    }

    # Copy into folders
    for split, files in splits.items():
        for f in files:
            dest = DEST / split / target_cls / f.name
            shutil.copy(f, dest)
    print(f"{target_cls}: train={len(splits['train'])}, val={len(splits['val'])}, test={len(splits['test'])}")

# Normal class = benign + normal
move_split([MENDELEY_BENIGN, KAGGLE_NORMAL], "normal")

# Suspicious class = malignant + cancer
move_split([MENDELEY_MALIGNANT, KAGGLE_CANCER], "suspicious")
