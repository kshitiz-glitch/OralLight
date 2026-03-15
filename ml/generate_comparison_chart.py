import matplotlib.pyplot as plt
import numpy as np
import os

# Data
metrics = ['Accuracy', 'Sensitivity', 'Specificity', 'ROC AUC']
base_paper = [88.6, 90.0, 86.4, 96.0]
oral_light = [91.10, 91.34, 91.74, 96.0]

x = np.arange(len(metrics))
width = 0.35

fig, ax = plt.subplots(figsize=(10, 6))
rects1 = ax.bar(x - width/2, base_paper, width, label='Base Paper (DenseNet201)', color='#4c72b0')
rects2 = ax.bar(x + width/2, oral_light, width, label='OralLight (Week 4)', color='#55a868')

# Add some text for labels, title and custom x-axis tick labels, etc.
ax.set_ylabel('Percentage (%)', fontsize=12)
ax.set_title('Performance Comparison: Base Paper vs OralLight', fontsize=14)
ax.set_xticks(x)
ax.set_xticklabels(metrics, fontsize=11)
ax.set_ylim(70, 100)  # Zoom in to show differences
ax.legend()

ax.grid(axis='y', linestyle='--', alpha=0.7)

# Label with values
def autolabel(rects):
    for rect in rects:
        height = rect.get_height()
        ax.annotate(f'{height:.2f}',
                    xy=(rect.get_x() + rect.get_width() / 2, height),
                    xytext=(0, 3),  # 3 points vertical offset
                    textcoords="offset points",
                    ha='center', va='bottom', fontsize=10)

autolabel(rects1)
autolabel(rects2)

fig.tight_layout()

output_path = 'ml/metrics/performance_comparison.png'
os.makedirs(os.path.dirname(output_path), exist_ok=True)
plt.savefig(output_path, dpi=300)
print(f"Chart saved to {output_path}")
