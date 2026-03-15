# 🦷 OraLight — AI-Powered Oral Cancer Screening PWA

<div align="center">

**Early detection saves lives. OraLight puts it in every health worker's hands.**

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![ONNX Runtime](https://img.shields.io/badge/ONNX_Runtime-Web-FF6F00?logo=onnx&logoColor=white)](https://onnxruntime.ai)
[![PWA](https://img.shields.io/badge/PWA-Offline_First-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Model Performance](#-model-performance)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [ML Pipeline](#-ml-pipeline)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)
- [Disclaimer](#%EF%B8%8F-disclaimer)

---

## 🔬 Overview

**OraLight** is a Progressive Web App (PWA) that brings AI-powered oral cancer screening to resource-limited settings — **no internet, no server, no cloud**. The entire ML inference pipeline runs directly in the browser using ONNX Runtime Web, making it deployable on any device with a camera and a modern browser.

Designed for community health workers, OraLight captures multi-view oral images, performs real-time quality checks, and delivers risk assessments with uncertainty estimation — all while keeping patient data encrypted and stored locally.

> **Why it matters**: Oral cancer has a 5-year survival rate of ~65%, but early detection can push it above 80%. OraLight enables scalable, low-cost screening where it's needed most.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🧠 **In-Browser AI** | MobileNetV3-Small model runs entirely in the browser via ONNX Runtime — zero server dependency |
| 📸 **Multi-View Capture** | Guided 3-view capture (Front, Left, Right) for comprehensive oral screening |
| 🎯 **Quality Control** | Real-time blur detection (Laplacian variance) and glare detection before analysis |
| 🔴🟡🟢 **Risk Triage** | Clear Green / Amber / Red classification with calibrated confidence thresholds |
| 📊 **Uncertainty Estimation** | MC-Dropout style stochastic inference for confidence scoring |
| 🔒 **Privacy-First** | AES-256 encryption, IndexedDB local storage, no data leaves the device |
| 📶 **Offline-First PWA** | Full functionality without internet — service worker caches all assets |
| 🔄 **Smart Sync** | Only Red/Amber cases sync when connectivity returns; Green stays local |
| 🏥 **Clinical Workflow** | Consent management, participant tracking, and case review built in |

---

## 📈 Model Performance

Trained on a curated dataset of **1,558 oral cavity images** (Mendeley + Kaggle), the MobileNetV3-Small model achieves:

| Metric | Score | |
|--------|-------|---|
| **Accuracy** | 91.10% | ✅ |
| **Sensitivity (Recall)** | 91.34% | ✅ Exceeds 90% clinical target |
| **Specificity** | 90.83% | ✅ |
| **AUC-ROC** | 0.9569 | ✅ |
| **F1-Score** | 91.70% | ✅ |
| **Model Size** | ~6 MB | ✅ Browser-friendly |

> The model outperforms the base research paper in accuracy (+2.5%) and specificity (+4.43%).

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     OraLight PWA                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Consent  │→ │ Capture  │→ │ Results  │  │   Review   │  │
│  │  Page    │  │  Page    │  │  Page    │  │   Cases    │  │
│  └──────────┘  └────┬─────┘  └──────────┘  └────────────┘  │
│                     │                                       │
│              ┌──────▼──────┐                                │
│              │  QC Checks  │  Blur & Glare Detection        │
│              └──────┬──────┘                                │
│                     │                                       │
│              ┌──────▼──────┐                                │
│              │ ONNX Infer  │  MobileNetV3 + MC-Dropout      │
│              └──────┬──────┘                                │
│                     │                                       │
│              ┌──────▼──────┐                                │
│              │  Triage     │  Green / Amber / Red           │
│              └──────┬──────┘                                │
│                     │                                       │
│  ┌──────────────────▼──────────────────────────────────┐    │
│  │              IndexedDB (Encrypted)                  │    │
│  └──────────────────┬──────────────────────────────────┘    │
│                     │ (Red/Amber only)                      │
│              ┌──────▼──────┐                                │
│              │  Background │  Sync when online              │
│              │    Sync     │                                │
│              └─────────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

### Frontend (PWA)
- **React 18** + **TypeScript 5.5** — type-safe UI components
- **Vite 5** — lightning-fast builds with HMR
- **ONNX Runtime Web** — in-browser ML inference (WASM backend)
- **IndexedDB** (via `idb`) — encrypted local data persistence
- **Service Worker** — offline caching with Workbox

### ML Training Pipeline
- **PyTorch** — model training and evaluation
- **MobileNetV3-Small** — efficient CNN pretrained on ImageNet
- **ONNX** — cross-platform model export
- **scikit-learn** — metrics, calibration, and analysis
- **Matplotlib** — training visualization

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **Python** ≥ 3.10 (only for ML training)
- A modern browser (Chrome, Edge, Firefox, Safari)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/oralight.git
cd oralight

# 2. Install Node dependencies
npm install

# 3. Download the ONNX model
#    Place the model files in web/public/models/
#    - mobilenetv3_small_opmd.onnx (~6 MB)
#    - zero_dce_tiny.onnx (low-light enhancer)

# 4. Start the development server
npm run dev
```

The app will be available at `https://localhost:5173` (HTTPS required for camera access).

### ML Training (Optional)

```bash
# Install Python dependencies
pip install -r requirements.txt

# Train the classifier
python ml/train_cls.py

# Evaluate on test set
python ml/evaluate.py

# Export to ONNX
python ml/export_onnx.py
```

---

## 📁 Project Structure

```
oralight/
├── web/                        # React PWA frontend
│   ├── index.html
│   ├── public/
│   │   ├── models/             # ONNX model files (gitignored)
│   │   └── config/             # Calibrated thresholds
│   └── src/
│       ├── pages/              # App pages (Consent → Capture → Results → Review)
│       ├── components/         # Reusable UI (CameraView, QCBadges, SyncBadge)
│       ├── ml/                 # Browser inference (infer, preprocess, QC, enhance)
│       ├── store/              # IndexedDB persistence layer
│       ├── services/           # Background sync service
│       ├── api/                # Upload API (mock)
│       └── context/            # React context providers
│
├── ml/                         # Python ML training pipeline
│   ├── train_cls.py            # Model training script
│   ├── evaluate.py             # Test set evaluation
│   ├── export_onnx.py          # PyTorch → ONNX conversion
│   ├── calibrate_thresholds.py # Threshold calibration
│   ├── metrics/                # Charts, confusion matrix, ROC/PR curves
│   └── mobilenetv3_small_opmd.pt  # Trained PyTorch weights
│
├── package.json                # Node.js dependencies
├── requirements.txt            # Python dependencies
├── vite.config.ts              # Vite + PWA configuration
└── tsconfig.json               # TypeScript configuration
```

---

## 🧪 ML Pipeline

```
Dataset (Mendeley + Kaggle)
    │
    ▼
split_dataset.py ──→ 70% Train / 15% Val / 15% Test
    │
    ▼
train_cls.py ──→ MobileNetV3-Small (Early Stopping @ Epoch 4)
    │
    ▼
evaluate.py ──→ Metrics: 91.34% Sensitivity, 0.9569 AUC-ROC
    │
    ▼
calibrate_thresholds.py ──→ τ = 0.5009 (optimized for sensitivity ≥ 90%)
    │
    ▼
export_onnx.py ──→ mobilenetv3_small_opmd.onnx (~6 MB)
    │
    ▼
Browser Inference via ONNX Runtime Web
```

---

## 🌐 Deployment

OraLight is a static PWA — deploy it anywhere that serves static files:

```bash
# Build for production
npm run build

# Output will be in dist/
# Deploy dist/ to any static hosting:
#   - Netlify, Vercel, GitHub Pages
#   - Nginx, Apache, IIS
#   - Any static file server
```

> **Important**: Ensure the ONNX model files are placed in the correct directory before building. The models are not included in the repository due to size constraints.

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## ⚕️ Disclaimer

> **OraLight is a screening and decision-support tool, not a diagnostic device.** All positive predictions must be confirmed by qualified healthcare professionals. This software is not intended to replace clinical judgment. The model's performance metrics are based on a curated research dataset and may vary with real-world data.
