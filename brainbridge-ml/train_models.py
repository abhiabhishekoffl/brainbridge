"""
BrainBridge — Model Trainer
============================
Trains two classifiers:
  1. Random Forest  → Dyslexia risk
  2. Decision Tree  → ADHD risk

Saves both as .pkl files for use in the Flask API.
Run: python train_models.py
"""

import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import StandardScaler

# ── Load data ─────────────────────────────────────────────────────────────────
print("Loading training data...")
df = pd.read_csv("training_data.csv")

# ── Feature sets ──────────────────────────────────────────────────────────────
# Dyslexia uses Mirror Game features (letter confusion, reaction time)
DYSLEXIA_FEATURES = [
    "mirror_error_rate",
    "mean_reaction_ms",
    "reaction_std",
    "early_accuracy",
    "late_accuracy",
    "bd_confusion_rate",
    "total_trials",
]

# ADHD uses Focus Catcher features (attention, impulsivity, stop-signal)
ADHD_FEATURES = [
    "window0_accuracy",
    "window1_accuracy",
    "window2_accuracy",
    "attention_decay",
    "impulse_error_rate",
    "stop_failure_rate",
    "mean_tap_rt_ms",
]

# ── Train Dyslexia Model ───────────────────────────────────────────────────────
print("\n" + "="*50)
print("Training Dyslexia Classifier (Random Forest)...")
print("="*50)

X_dys = df[DYSLEXIA_FEATURES]
y_dys = df["has_dyslexia"]

X_train, X_test, y_train, y_test = train_test_split(
    X_dys, y_dys, test_size=0.2, random_state=42, stratify=y_dys
)

scaler_dys = StandardScaler()
X_train_scaled = scaler_dys.fit_transform(X_train)
X_test_scaled  = scaler_dys.transform(X_test)

dyslexia_model = RandomForestClassifier(
    n_estimators=100,
    max_depth=8,
    min_samples_split=10,
    random_state=42,
    class_weight="balanced",
)
dyslexia_model.fit(X_train_scaled, y_train)

y_pred_dys = dyslexia_model.predict(X_test_scaled)
acc_dys = accuracy_score(y_test, y_pred_dys)
print(f"\n✅ Dyslexia Model Accuracy: {acc_dys:.1%}")
print(classification_report(y_test, y_pred_dys, target_names=["No Dyslexia", "Dyslexia"]))

# Feature importance
print("Top features for Dyslexia:")
importances = dyslexia_model.feature_importances_
for feat, imp in sorted(zip(DYSLEXIA_FEATURES, importances), key=lambda x: -x[1]):
    print(f"  {feat:25s} {imp:.3f}")

# ── Train ADHD Model ──────────────────────────────────────────────────────────
print("\n" + "="*50)
print("Training ADHD Classifier (Decision Tree)...")
print("="*50)

X_adhd = df[ADHD_FEATURES]
y_adhd = df["has_adhd"]

X_train2, X_test2, y_train2, y_test2 = train_test_split(
    X_adhd, y_adhd, test_size=0.2, random_state=42, stratify=y_adhd
)

scaler_adhd = StandardScaler()
X_train2_scaled = scaler_adhd.fit_transform(X_train2)
X_test2_scaled  = scaler_adhd.transform(X_test2)

adhd_model = DecisionTreeClassifier(
    max_depth=6,
    min_samples_split=15,
    random_state=42,
    class_weight="balanced",
)
adhd_model.fit(X_train2_scaled, y_train2)

y_pred_adhd = adhd_model.predict(X_test2_scaled)
acc_adhd = accuracy_score(y_test2, y_pred_adhd)
print(f"\n✅ ADHD Model Accuracy: {acc_adhd:.1%}")
print(classification_report(y_test2, y_pred_adhd, target_names=["No ADHD", "ADHD"]))

print("Top features for ADHD:")
importances2 = adhd_model.feature_importances_
for feat, imp in sorted(zip(ADHD_FEATURES, importances2), key=lambda x: -x[1]):
    print(f"  {feat:25s} {imp:.3f}")

# ── Save models ───────────────────────────────────────────────────────────────
print("\n" + "="*50)
print("Saving models...")

with open("dyslexia_model.pkl", "wb") as f:
    pickle.dump({"model": dyslexia_model, "scaler": scaler_dys, "features": DYSLEXIA_FEATURES}, f)

with open("adhd_model.pkl", "wb") as f:
    pickle.dump({"model": adhd_model, "scaler": scaler_adhd, "features": ADHD_FEATURES}, f)

print("✅ Saved: dyslexia_model.pkl")
print("✅ Saved: adhd_model.pkl")
print("\n🚀 Ready to start the Flask API!")
