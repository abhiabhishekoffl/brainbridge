"""
BrainBridge — Feature Engineering
===================================
Converts raw game event logs into ML feature vectors.

Mirror Game events look like:
  { trial, target, tapped, correct, mirrorError, reactionTimeMs, timestamp }

Focus Catcher events look like:
  { type, color, reactionTimeMs, timestamp, window }
  types: correct_tap | impulse_error | stop_failure
"""

import numpy as np


def extract_mirror_features(mirror_events: list) -> dict:
    """
    Extract Dyslexia-relevant features from Letter Mirror Game events.
    Returns a dict matching DYSLEXIA_FEATURES in train_models.py
    """
    if not mirror_events or len(mirror_events) < 3:
        # Not enough data — return neutral/average values
        return {
            "mirror_error_rate": 0.5,
            "mean_reaction_ms":  2000,
            "reaction_std":      600,
            "early_accuracy":    0.5,
            "late_accuracy":     0.5,
            "bd_confusion_rate": 0.3,
            "total_trials":      len(mirror_events),
            "reliability":       0.3,  # low reliability flag
        }

    total    = len(mirror_events)
    correct  = [e for e in mirror_events if e.get("correct")]
    errors   = [e for e in mirror_events if not e.get("correct")]
    mirrors  = [e for e in errors if e.get("mirrorError")]

    # Reaction times
    rts = [e["reactionTimeMs"] for e in mirror_events if "reactionTimeMs" in e]
    mean_rt = float(np.mean(rts)) if rts else 2000
    std_rt  = float(np.std(rts))  if rts else 600

    # Error rates
    error_rate  = len(errors) / total if total > 0 else 0.5
    mirror_rate = len(mirrors) / total if total > 0 else 0.3

    # b/d confusion specifically
    bd_errors = [
        e for e in errors
        if e.get("target") in ("b", "d") and e.get("tapped") in ("b", "d")
    ]
    bd_trials = [e for e in mirror_events if e.get("target") in ("b", "d")]
    bd_confusion = len(bd_errors) / len(bd_trials) if bd_trials else mirror_rate

    # Early vs late accuracy (first half vs second half)
    half = total // 2
    early_events = mirror_events[:half]
    late_events  = mirror_events[half:]

    early_acc = (
        sum(1 for e in early_events if e.get("correct")) / len(early_events)
        if early_events else 0.5
    )
    late_acc = (
        sum(1 for e in late_events if e.get("correct")) / len(late_events)
        if late_events else 0.5
    )

    # Reliability: penalise very fast taps (random clicking)
    very_fast = sum(1 for rt in rts if rt < 250)
    reliability = max(0.0, 1.0 - (very_fast / total))

    return {
        "mirror_error_rate": round(error_rate, 3),
        "mean_reaction_ms":  round(mean_rt, 1),
        "reaction_std":      round(std_rt, 1),
        "early_accuracy":    round(early_acc, 3),
        "late_accuracy":     round(late_acc, 3),
        "bd_confusion_rate": round(bd_confusion, 3),
        "total_trials":      total,
        "reliability":       round(reliability, 3),
    }


def extract_focus_features(focus_data: dict) -> dict:
    """
    Extract ADHD-relevant features from Focus Catcher Game events.
    Returns a dict matching ADHD_FEATURES in train_models.py
    """
    events        = focus_data.get("events", [])
    window_counts = focus_data.get("windowCounts", {})

    if not events or len(events) < 5:
        return {
            "window0_accuracy":   0.5,
            "window1_accuracy":   0.5,
            "window2_accuracy":   0.5,
            "attention_decay":    0.0,
            "impulse_error_rate": 0.3,
            "stop_failure_rate":  0.3,
            "mean_tap_rt_ms":     500,
            "reliability":        0.3,
        }

    # Window accuracies (0=first 30s, 1=30-60s, 2=60-90s)
    def window_acc(w):
        wc = window_counts.get(str(w), window_counts.get(w, {}))
        c  = wc.get("correct", 0)
        wr = wc.get("wrong", 0)
        total = c + wr
        return c / total if total > 0 else 0.5

    w0 = window_acc(0)
    w1 = window_acc(1)
    w2 = window_acc(2)

    # Attention decay = drop from first to last window
    decay = max(0.0, w0 - w2)

    # Impulse errors (tapped wrong colour)
    impulse = [e for e in events if e.get("type") == "impulse_error"]
    correct = [e for e in events if e.get("type") == "correct_tap"]
    stops   = [e for e in events if e.get("type") == "stop_failure"]

    total_taps = len(impulse) + len(correct)
    impulse_rate = len(impulse) / total_taps if total_taps > 0 else 0.3

    # Stop failure rate
    # Approximate: count stop events vs estimated stop opportunities
    stop_opportunities = max(1, len(stops) + max(0, round(len(events) / 15)))
    stop_failure_rate  = len(stops) / stop_opportunities

    # Mean reaction time on correct taps
    rts = [e["reactionTimeMs"] for e in correct if "reactionTimeMs" in e]
    mean_rt = float(np.mean(rts)) if rts else 500

    # Reliability: very fast = random tapping
    very_fast   = sum(1 for rt in rts if rt < 150)
    reliability = max(0.0, 1.0 - (very_fast / max(1, len(rts))))

    return {
        "window0_accuracy":   round(w0, 3),
        "window1_accuracy":   round(w1, 3),
        "window2_accuracy":   round(w2, 3),
        "attention_decay":    round(decay, 3),
        "impulse_error_rate": round(impulse_rate, 3),
        "stop_failure_rate":  round(min(1.0, stop_failure_rate), 3),
        "mean_tap_rt_ms":     round(mean_rt, 1),
        "reliability":        round(reliability, 3),
    }


def compute_overall_reliability(mirror_feats: dict, focus_feats: dict) -> float:
    """
    Overall session reliability score (0–1).
    Low score = results should not be trusted.
    """
    r1 = mirror_feats.get("reliability", 1.0)
    r2 = focus_feats.get("reliability", 1.0)
    t1 = mirror_feats.get("total_trials", 10)

    # Penalise very few trials
    trial_penalty = min(1.0, t1 / 8)

    return round((r1 + r2) / 2 * trial_penalty, 3)
