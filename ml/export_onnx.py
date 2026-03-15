# ml/export_onnx.py
from pathlib import Path
import torch
from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights

# ==== Paths ====
CKPT_PATH = Path("ml/mobilenetv3_small_opmd.pt")
OUT_PATH = Path("web/public/models/mobilenetv3_small_opmd.onnx")
OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

# ==== Model ====
# Use new weights API, but we don't actually need ImageNet weights here
# (weights=None would also work), we only care about the architecture
model = mobilenet_v3_small(weights=None)
model.classifier[3] = torch.nn.Linear(model.classifier[3].in_features, 2)

# Load your trained weights
state = torch.load(CKPT_PATH, map_location="cpu")
model.load_state_dict(state)
model.eval()

# ==== Export to ONNX ====
dummy = torch.randn(1, 3, 224, 224)

torch.onnx.export(
    model, dummy, str(OUT_PATH),
    input_names=["input"], output_names=["logits"],
    opset_version=17,
    dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}}
)

print(f"✅ Exported ONNX model to {OUT_PATH}")
