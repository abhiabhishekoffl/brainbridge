require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const mongoose = require("mongoose");

const sessionRoutes = require("./routes/session");

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: ["http://localhost:5173", "https://your-app.vercel.app"] }));
app.use(express.json({ limit: "2mb" })); // game data can be large

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/session", sessionRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ── MongoDB connection ────────────────────────────────────────────────────────
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    // DB is optional for hackathon — server still works without it
    console.warn("⚠️  MongoDB connection failed (non-fatal):", err.message);
    console.warn("    Sessions will not be saved but AI predictions will still work.");
  }
}

// ── Start server ──────────────────────────────────────────────────────────────
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n🚀 BrainBridge Backend running on http://localhost:${PORT}`);
    console.log(`   ML API target: ${process.env.ML_API_URL}`);
    console.log(`   Health check:  http://localhost:${PORT}/health\n`);
  });
}

start();
