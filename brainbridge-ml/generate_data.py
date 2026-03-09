"""
BrainBridge — Synthetic Training Data Generator
================================================
Generates realistic child session profiles based on
published clinical research parameters for:
  - Dyslexia (letter confusion, slow phonological processing)
  - ADHD     (attention decay, high impulsivity)

Run this once to create training_data.csv
"""

import numpy as np
import pandas as pd

np.random.seed(42)
N = 2000  # total profiles (1000 with disorder, 1000 without)

def generate_profiles(n, has_dyslexia, has_adhd):
    profiles = []

    for _ in range(n):
        # ── MIRROR GAME FEATURES ─────────────────────────────────────────
        if has_dyslexia:
            # Children with Dyslexia: more mirror errors, slower reactions
            mirror_error_rate   = np.clip(np.random.normal(0.55, 0.15), 0.2, 0.95)
            mean_reaction_ms    = np.clip(np.random.normal(2800, 600),  1200, 5000)
            reaction_std        = np.clip(np.random.normal(900,  250),   200, 2000)
            early_accuracy      = np.clip(np.random.normal(0.40, 0.15),  0.1, 0.75)
            late_accuracy       = np.clip(np.random.normal(0.35, 0.15),  0.0, 0.70)
            bd_confusion_rate   = np.clip(np.random.normal(0.45, 0.15),  0.1, 0.90)
            total_trials        = int(np.random.normal(10, 2))
        else:
            # Typical children: fewer mirror errors, faster reactions
            mirror_error_rate   = np.clip(np.random.normal(0.15, 0.10), 0.0, 0.45)
            mean_reaction_ms    = np.clip(np.random.normal(1400, 350),   600, 2800)
            reaction_std        = np.clip(np.random.normal(350,  120),   100, 800)
            early_accuracy      = np.clip(np.random.normal(0.82, 0.10),  0.5, 1.00)
            late_accuracy       = np.clip(np.random.normal(0.78, 0.10),  0.4, 1.00)
            bd_confusion_rate   = np.clip(np.random.normal(0.08, 0.06),  0.0, 0.30)
            total_trials        = int(np.random.normal(14, 2))

        # ── FOCUS CATCHER FEATURES ───────────────────────────────────────
        if has_adhd:
            # Children with ADHD: attention drops over time, impulsive
            window0_accuracy    = np.clip(np.random.normal(0.65, 0.15), 0.2, 0.95)
            window1_accuracy    = np.clip(np.random.normal(0.45, 0.15), 0.1, 0.80)
            window2_accuracy    = np.clip(np.random.normal(0.30, 0.15), 0.0, 0.65)
            attention_decay     = np.clip(window0_accuracy - window2_accuracy, 0, 1)
            impulse_error_rate  = np.clip(np.random.normal(0.40, 0.15), 0.1, 0.85)
            stop_failure_rate   = np.clip(np.random.normal(0.55, 0.18), 0.1, 0.95)
            mean_tap_rt_ms      = np.clip(np.random.normal(380,  120),  150, 800)
        else:
            # Typical children: attention stays stable, fewer impulse errors
            window0_accuracy    = np.clip(np.random.normal(0.82, 0.10), 0.5, 1.00)
            window1_accuracy    = np.clip(np.random.normal(0.80, 0.10), 0.5, 1.00)
            window2_accuracy    = np.clip(np.random.normal(0.78, 0.10), 0.4, 1.00)
            attention_decay     = np.clip(window0_accuracy - window2_accuracy, 0, 0.3)
            impulse_error_rate  = np.clip(np.random.normal(0.12, 0.08), 0.0, 0.35)
            stop_failure_rate   = np.clip(np.random.normal(0.15, 0.10), 0.0, 0.40)
            mean_tap_rt_ms      = np.clip(np.random.normal(520,  140),  250, 900)

        profiles.append({
            # Mirror Game features
            "mirror_error_rate":   round(mirror_error_rate, 3),
            "mean_reaction_ms":    round(mean_reaction_ms, 1),
            "reaction_std":        round(reaction_std, 1),
            "early_accuracy":      round(early_accuracy, 3),
            "late_accuracy":       round(late_accuracy, 3),
            "bd_confusion_rate":   round(bd_confusion_rate, 3),
            "total_trials":        max(5, total_trials),

            # Focus Catcher features
            "window0_accuracy":    round(window0_accuracy, 3),
            "window1_accuracy":    round(window1_accuracy, 3),
            "window2_accuracy":    round(window2_accuracy, 3),
            "attention_decay":     round(attention_decay, 3),
            "impulse_error_rate":  round(impulse_error_rate, 3),
            "stop_failure_rate":   round(stop_failure_rate, 3),
            "mean_tap_rt_ms":      round(mean_tap_rt_ms, 1),

            # Labels
            "has_dyslexia": int(has_dyslexia),
            "has_adhd":     int(has_adhd),
        })

    return profiles

# Generate 4 groups
all_profiles = (
    generate_profiles(500, has_dyslexia=True,  has_adhd=False) +  # Dyslexia only
    generate_profiles(500, has_dyslexia=False, has_adhd=True)  +  # ADHD only
    generate_profiles(500, has_dyslexia=True,  has_adhd=True)  +  # Both
    generate_profiles(500, has_dyslexia=False, has_adhd=False)    # Neither (typical)
)

df = pd.DataFrame(all_profiles)
df = df.sample(frac=1).reset_index(drop=True)  # shuffle rows
df.to_csv("training_data.csv", index=False)

print(f"✅ Generated {len(df)} training profiles")
print(f"   Dyslexia positive: {df['has_dyslexia'].sum()}")
print(f"   ADHD positive:     {df['has_adhd'].sum()}")
print(f"\nFeature columns:")
for col in df.columns:
    print(f"  {col}: min={df[col].min():.2f}, max={df[col].max():.2f}")
