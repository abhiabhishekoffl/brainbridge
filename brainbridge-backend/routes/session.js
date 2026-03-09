const express  = require("express");
const axios    = require("axios");
const router   = express.Router();
const Session  = require("../models/Session");
const { validateSession } = require("../middleware/validate");

const ML_API = process.env.ML_API_URL || "http://localhost:5001";

// ── Helper: summarise mirror game events ─────────────────────────────────────
function summariseMirror(events) {
  if (!events || events.length === 0) return {};
  const correct   = events.filter((e) => e.correct).length;
  const mirrors   = events.filter((e) => e.mirrorError).length;
  const rts       = events.map((e) => e.reactionTimeMs).filter(Boolean);
  const avgRt     = rts.length > 0 ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0;
  return {
    totalTrials:   events.length,
    correctCount:  correct,
    mirrorErrors:  mirrors,
    avgReactionMs: avgRt,
  };
}

// ── Helper: summarise focus game events ──────────────────────────────────────
function summariseFocus(focusData) {
  if (!focusData || !focusData.events) return {};
  const events    = focusData.events;
  const correct   = events.filter((e) => e.type === "correct_tap").length;
  const impulse   = events.filter((e) => e.type === "impulse_error").length;
  const stops     = events.filter((e) => e.type === "stop_failure").length;
  const rts       = events.filter((e) => e.type === "correct_tap").map((e) => e.reactionTimeMs).filter(Boolean);
  const avgRt     = rts.length > 0 ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0;
  return {
    correctTaps:   correct,
    impulseTaps:   impulse,
    stopFailures:  stops,
    avgReactionMs: avgRt,
  };
}

// ── POST /api/session ─────────────────────────────────────────────────────────
// Receives full game data, calls ML API, saves to DB, returns results
router.post("/", validateSession, async (req, res) => {
  const { sessionId, age, language, gameData } = req.body;

  try {
    // ── 1. Call Python ML API ───────────────────────────────────────────
    let mlResult;
    try {
      const mlResponse = await axios.post(
        `${ML_API}/predict`,
        {
          mirror:   gameData.mirror   || [],
          focus:    gameData.focus    || {},
          language: language          || "english",
          age:      parseInt(age),
        },
        { timeout: 10000 } // 10 second timeout
      );
      mlResult = mlResponse.data;
    } catch (mlError) {
      console.error("ML API error:", mlError.message);
      // If ML API is down, return a "retry later" response
      return res.status(503).json({
        error: "AI analysis service temporarily unavailable. Please try again.",
        mlError: mlError.message,
      });
    }

    // ── 2. Save anonymised session to MongoDB ───────────────────────────
    try {
      const session = new Session({
        sessionId,
        childAge:      parseInt(age),
        language:      language || "english",
        mirrorSummary: summariseMirror(gameData.mirror),
        focusSummary:  summariseFocus(gameData.focus),
        results:       mlResult,
      });
      await session.save();
      console.log(`✅ Session saved: ${sessionId}`);
    } catch (dbError) {
      // DB save failure should not block the user from getting results
      console.error("DB save error (non-fatal):", dbError.message);
    }

    // ── 3. Return ML results to React frontend ──────────────────────────
    return res.json({
      success: true,
      sessionId,
      results: mlResult,
    });

  } catch (err) {
    console.error("Session route error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/session/:id ──────────────────────────────────────────────────────
// Retrieve a previous session result by ID
router.get("/:sessionId", async (req, res) => {
  try {
    const session = await Session.findOne({
      sessionId: req.params.sessionId,
    }).select("-_id -__v -mirrorSummary -focusSummary"); // return only result data

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    return res.json(session);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/session/:id ───────────────────────────────────────────────────
// DPDP compliance — parents can delete their child's data anytime
router.delete("/:sessionId", async (req, res) => {
  try {
    const result = await Session.deleteOne({
      sessionId: req.params.sessionId,
    });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Session not found" });
    }
    return res.json({ success: true, message: "Session data deleted." });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
