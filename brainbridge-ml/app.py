"""
BrainBridge — Flask ML API
===========================
Endpoints:
  POST /predict   — accepts game data, returns risk scores
  GET  /health    — health check

Run: python app.py
"""

import pickle
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

from features import (
    extract_mirror_features,
    extract_focus_features,
    compute_overall_reliability,
)

app = Flask(__name__)
CORS(app)  # Allow requests from React frontend

# ── Load trained models ───────────────────────────────────────────────────────
print("Loading models...")
try:
    with open("dyslexia_model.pkl", "rb") as f:
        dyslexia_pkg = pickle.load(f)
        dyslexia_model   = dyslexia_pkg["model"]
        dyslexia_scaler  = dyslexia_pkg["scaler"]
        DYSLEXIA_FEATURES = dyslexia_pkg["features"]

    with open("adhd_model.pkl", "rb") as f:
        adhd_pkg = pickle.load(f)
        adhd_model   = adhd_pkg["model"]
        adhd_scaler  = adhd_pkg["scaler"]
        ADHD_FEATURES = adhd_pkg["features"]

    print("✅ Models loaded successfully!")
except FileNotFoundError:
    print("❌ Model files not found. Run: python generate_data.py && python train_models.py")
    dyslexia_model = dyslexia_scaler = None
    adhd_model     = adhd_scaler     = None


# ── Risk level helper ─────────────────────────────────────────────────────────
def get_risk_level(probability: float) -> str:
    """Convert probability to traffic light level."""
    if probability >= 0.65:
        return "RED"
    elif probability >= 0.40:
        return "YELLOW"
    else:
        return "GREEN"


def get_description(disorder: str, level: str, lang: str) -> str:
    """Plain-language descriptions for parents."""
    descriptions = {
        "dyslexia": {
            "RED": {
                "english": "Your child shows strong patterns associated with Dyslexia. We recommend seeking a formal assessment from a specialist.",
                "hindi":   "आपके बच्चे में डिस्लेक्सिया के मजबूत संकेत हैं। हम किसी विशेषज्ञ से औपचारिक मूल्यांकन कराने की सलाह देते हैं।",
            },
            "YELLOW": {
                "english": "Your child shows some patterns that may be associated with Dyslexia. We recommend monitoring closely and consulting a teacher.",
                "hindi":   "आपके बच्चे में डिस्लेक्सिया के कुछ संकेत हैं। शिक्षक से परामर्श करने और ध्यान से देखते रहने की सलाह दी जाती है।",
            },
            "GREEN": {
                "english": "Your child shows no significant patterns associated with Dyslexia at this time.",
                "hindi":   "इस समय आपके बच्चे में डिस्लेक्सिया के कोई महत्वपूर्ण संकेत नहीं हैं।",
            },
        },
        "adhd": {
            "RED": {
                "english": "Your child shows strong patterns associated with ADHD. We recommend seeking a formal assessment from a specialist.",
                "hindi":   "आपके बच्चे में ADHD के मजबूत संकेत हैं। हम किसी विशेषज्ञ से औपचारिक मूल्यांकन कराने की सलाह देते हैं।",
            },
            "YELLOW": {
                "english": "Your child shows some patterns that may be associated with ADHD. We recommend discussing this with your child's teacher.",
                "hindi":   "आपके बच्चे में ADHD के कुछ संकेत हैं। बच्चे के शिक्षक से चर्चा करने की सलाह दी जाती है।",
            },
            "GREEN": {
                "english": "Your child shows no significant patterns associated with ADHD at this time.",
                "hindi":   "इस समय आपके बच्चे में ADHD के कोई महत्वपूर्ण संकेत नहीं हैं।",
            },
        },
    }
    return descriptions.get(disorder, {}).get(level, {}).get(lang, descriptions[disorder][level]["english"])


# ── /health endpoint ──────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "models_loaded": dyslexia_model is not None,
    })


# ── /predict endpoint ─────────────────────────────────────────────────────────
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        mirror_events = data.get("mirror", [])
        focus_data    = data.get("focus",  {})
        lang          = data.get("language", "english")
        child_age     = data.get("age", 6)

        # ── Feature engineering ───────────────────────────────────────────
        mirror_feats = extract_mirror_features(mirror_events)
        focus_feats  = extract_focus_features(focus_data)
        reliability  = compute_overall_reliability(mirror_feats, focus_feats)

        # ── Dyslexia prediction ───────────────────────────────────────────
        if dyslexia_model:
            dys_vector = np.array([[mirror_feats[f] for f in DYSLEXIA_FEATURES]])
            dys_scaled = dyslexia_scaler.transform(dys_vector)
            dys_proba  = dyslexia_model.predict_proba(dys_scaled)[0][1]
        else:
            # Fallback: rule-based if model not loaded
            dys_proba = (
                mirror_feats["mirror_error_rate"] * 0.4 +
                (1 - mirror_feats["early_accuracy"]) * 0.3 +
                mirror_feats["bd_confusion_rate"] * 0.3
            )

        # ── ADHD prediction ───────────────────────────────────────────────
        if adhd_model:
            adhd_vector = np.array([[focus_feats[f] for f in ADHD_FEATURES]])
            adhd_scaled = adhd_scaler.transform(adhd_vector)
            adhd_proba  = adhd_model.predict_proba(adhd_scaled)[0][1]
        else:
            # Fallback: rule-based
            adhd_proba = (
                focus_feats["attention_decay"]    * 0.35 +
                focus_feats["impulse_error_rate"] * 0.35 +
                focus_feats["stop_failure_rate"]  * 0.30
            )

        # ── Age adjustment ────────────────────────────────────────────────
        # Younger children naturally make more errors — adjust thresholds
        age_factor = max(0.0, (child_age - 4) / 3)  # 0 at age 4, 1 at age 7
        dys_adjusted  = dys_proba  * (0.85 + age_factor * 0.15)
        adhd_adjusted = adhd_proba * (0.85 + age_factor * 0.15)

        # Clamp to [0, 1]
        dys_final  = round(min(1.0, max(0.0, dys_adjusted)),  3)
        adhd_final = round(min(1.0, max(0.0, adhd_adjusted)), 3)

        # ── Risk levels ───────────────────────────────────────────────────
        dys_level  = get_risk_level(dys_final)
        adhd_level = get_risk_level(adhd_final)

        # ── Build response ────────────────────────────────────────────────
        response = {
            "reliability": reliability,
            "lowReliability": reliability < 0.5,

            "dyslexia": {
                "probability": dys_final,
                "percentage":  round(dys_final * 100),
                "level":       dys_level,
                "description": get_description("dyslexia", dys_level, lang),
            },
            "adhd": {
                "probability": adhd_final,
                "percentage":  round(adhd_final * 100),
                "level":       adhd_level,
                "description": get_description("adhd", adhd_level, lang),
            },

            # Key signals for transparency
            "signals": {
                "mirrorErrorRate":  mirror_feats["mirror_error_rate"],
                "bdConfusion":      mirror_feats["bd_confusion_rate"],
                "attentionDecay":   focus_feats["attention_decay"],
                "impulsivityScore": focus_feats["impulse_error_rate"],
                "stopFailureRate":  focus_feats["stop_failure_rate"],
            },

            # Disclaimer — always included
            "disclaimer": (
                "This is a screening tool, NOT a diagnosis. "
                "Results should always be followed up with a qualified specialist."
                if lang == "english"
                else
                "यह एक स्क्रीनिंग टूल है, निदान नहीं। परिणामों की पुष्टि किसी योग्य विशेषज्ञ से करें।"
            ),
        }

        return jsonify(response)

    except Exception as e:
        print(f"Prediction error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ── Run server ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, port=5001)
