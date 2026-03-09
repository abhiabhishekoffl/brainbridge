const mongoose = require("mongoose");

// We store ZERO personally identifiable information.
// childName is never stored — only an anonymous session ID.
const SessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Child info — age only, no name
    childAge: { type: Number, min: 4, max: 7 },
    language: { type: String, default: "english" },

    // Raw game event counts (not full event logs — privacy first)
    mirrorSummary: {
      totalTrials:    Number,
      correctCount:   Number,
      mirrorErrors:   Number,
      avgReactionMs:  Number,
    },
    focusSummary: {
      correctTaps:    Number,
      impulseTaps:    Number,
      stopFailures:   Number,
      avgReactionMs:  Number,
    },

    // ML results
    results: {
      reliability: Number,
      lowReliability: Boolean,
      dyslexia: {
        percentage: Number,
        level: String,       // GREEN | YELLOW | RED
        description: String,
      },
      adhd: {
        percentage: Number,
        level: String,
        description: String,
      },
      signals: Object,
      disclaimer: String,
    },

    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", SessionSchema);
