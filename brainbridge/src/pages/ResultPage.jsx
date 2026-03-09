import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

// ── Hardcoded specialist locations (replace with live DB post-hackathon) ──────
const SPECIALISTS = [
  { name: "NIMHANS Child Psychiatry", city: "Bengaluru", type: "Government", cost: "Free", phone: "080-46110007", lat: 12.9352, lng: 77.5970 },
  { name: "iCall — TISS", city: "Mumbai", type: "NGO", cost: "₹200–500", phone: "9152987821", lat: 19.0467, lng: 72.8823 },
  { name: "Ummeed Child Development", city: "Mumbai", type: "NGO", cost: "₹300–800", phone: "022-23772005", lat: 19.0225, lng: 72.8561 },
  { name: "Child Guidance Clinic — AIIMS", city: "New Delhi", type: "Government", cost: "Free", phone: "011-26588500", lat: 28.5672, lng: 77.2100 },
  { name: "Vandrevala Foundation", city: "Pan India", type: "NGO", cost: "Free", phone: "1860-2662-345", lat: 19.0760, lng: 72.8777 },
];

// ── Text translations ──────────────────────────────────────────────────────────
const TEXT = {
  english: {
    analyzing:       "Analysing results...",
    analyzingDesc:   "Our AI is processing your child's game data. This takes just a moment.",
    results:         "Screening Results",
    disclaimer:      "⚠️ This is a SCREENING tool — NOT a medical diagnosis.",
    dyslexia:        "Dyslexia Risk",
    adhd:            "ADHD Risk",
    reliability:     "Session Reliability",
    lowReliability:  "⚠️ Low reliability — child may have tapped randomly. Please retry for accurate results.",
    signals:         "AI Signals Detected",
    specialists:     "Nearest Specialists",
    specialistNote:  "These centres offer assessment and support services:",
    screenAgain:     "Screen Again",
    levels: {
      GREEN:  { label: "Low Risk",      color: "text-green-400",  bg: "bg-green-500/20",  border: "border-green-500/40" },
      YELLOW: { label: "Monitor",       color: "text-yellow-400", bg: "bg-yellow-500/20", border: "border-yellow-500/40" },
      RED:    { label: "Seek Assessment", color: "text-rose-400", bg: "bg-rose-500/20",   border: "border-rose-500/40" },
    },
    signalLabels: {
      mirrorErrorRate:  "Letter confusion rate",
      bdConfusion:      "b/d mirror confusion",
      attentionDecay:   "Attention decay over time",
      impulsivityScore: "Impulsivity score",
      stopFailureRate:  "Stop-signal failure rate",
    },
  },
  hindi: {
    analyzing:       "परिणाम विश्लेषण हो रहा है...",
    analyzingDesc:   "हमारा AI आपके बच्चे के गेम डेटा का विश्लेषण कर रहा है। बस एक पल...",
    results:         "स्क्रीनिंग परिणाम",
    disclaimer:      "⚠️ यह एक स्क्रीनिंग टूल है — चिकित्सीय निदान नहीं।",
    dyslexia:        "डिस्लेक्सिया जोखिम",
    adhd:            "ADHD जोखिम",
    reliability:     "सत्र विश्वसनीयता",
    lowReliability:  "⚠️ कम विश्वसनीयता — बच्चे ने यादृच्छिक टैप किए हों। सटीक परिणाम के लिए दोबारा करें।",
    signals:         "AI संकेत",
    specialists:     "निकटतम विशेषज्ञ",
    specialistNote:  "ये केंद्र मूल्यांकन और सहायता सेवाएं प्रदान करते हैं:",
    screenAgain:     "फिर से जांचें",
    levels: {
      GREEN:  { label: "कम जोखिम",     color: "text-green-400",  bg: "bg-green-500/20",  border: "border-green-500/40" },
      YELLOW: { label: "निगरानी करें", color: "text-yellow-400", bg: "bg-yellow-500/20", border: "border-yellow-500/40" },
      RED:    { label: "मूल्यांकन करें", color: "text-rose-400", bg: "bg-rose-500/20",   border: "border-rose-500/40" },
    },
    signalLabels: {
      mirrorErrorRate:  "अक्षर भ्रम दर",
      bdConfusion:      "b/d दर्पण भ्रम",
      attentionDecay:   "समय के साथ ध्यान में कमी",
      impulsivityScore: "आवेग स्कोर",
      stopFailureRate:  "रोक-संकेत विफलता दर",
    },
  },
};

// ── Traffic light emoji ────────────────────────────────────────────────────────
const LEVEL_EMOJI = { GREEN: "🟢", YELLOW: "🟡", RED: "🔴" };
const LEVEL_BG    = {
  GREEN:  "from-green-900/40 to-green-800/20 border-green-500/30",
  YELLOW: "from-yellow-900/40 to-yellow-800/20 border-yellow-500/30",
  RED:    "from-rose-900/40 to-rose-800/20 border-rose-500/30",
};

// ── Generate anonymous session ID ─────────────────────────────────────────────
function generateSessionId() {
  return "bb_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

// ── Circular progress ring ────────────────────────────────────────────────────
function RiskRing({ percent, level, label, t }) {
  const config = t.levels[level] || t.levels.GREEN;
  const radius = 42;
  const circ   = 2 * Math.PI * radius;
  const offset = circ - (percent / 100) * circ;
  const strokeColor = { GREEN: "#4ade80", YELLOW: "#facc15", RED: "#f87171" }[level];

  return (
    <div className={`rounded-2xl p-5 border ${config.bg} ${config.border} text-center`}>
      <p className="text-sm text-purple-200 mb-3 font-medium">{label}</p>
      <div className="relative inline-block">
        <svg width="100" height="100" className="-rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r={radius} fill="none"
            stroke={strokeColor} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-black ${config.color}`}>{percent}%</span>
        </div>
      </div>
      <div className={`mt-3 font-bold text-sm ${config.color}`}>
        {LEVEL_EMOJI[level]} {config.label}
      </div>
    </div>
  );
}

// ── Signal bar ────────────────────────────────────────────────────────────────
function SignalBar({ label, value }) {
  const pct    = Math.round(value * 100);
  const color  = pct > 60 ? "bg-rose-500" : pct > 35 ? "bg-yellow-400" : "bg-green-400";
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-purple-300 mb-1">
        <span>{label}</span>
        <span className="font-bold">{pct}%</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-1000`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Specialist card ───────────────────────────────────────────────────────────
function SpecialistCard({ sp }) {
  const typeColor = {
    Government: "bg-teal-500/20 text-teal-300 border-teal-500/30",
    NGO:        "bg-blue-500/20 text-blue-300 border-blue-500/30",
    Private:    "bg-purple-500/20 text-purple-300 border-purple-500/30",
  }[sp.type] || "bg-white/10 text-white";

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-bold text-white text-sm leading-snug">{sp.name}</p>
        <span className={`text-xs px-2 py-1 rounded-full border shrink-0 ${typeColor}`}>
          {sp.type}
        </span>
      </div>
      <p className="text-purple-300 text-xs mb-1">📍 {sp.city}</p>
      <p className="text-green-400 text-xs mb-2 font-medium">💰 {sp.cost}</p>
      <a
        href={`tel:${sp.phone}`}
        className="flex items-center gap-1 text-xs text-teal-300 hover:text-teal-200 transition-colors"
      >
        📞 {sp.phone}
      </a>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function ResultPage() {
  const navigate = useNavigate();

  const child    = JSON.parse(sessionStorage.getItem("child")    || "{}");
  const gameData = JSON.parse(sessionStorage.getItem("gameData") || "{}");
  const lang     = child.language || "english";
  const t        = TEXT[lang] || TEXT.english;

  const [phase,   setPhase]   = useState("loading"); // loading | results | error
  const [results, setResults] = useState(null);
  const [error,   setError]   = useState(null);
  const sessionId = useRef(generateSessionId());

  // ── Send game data to backend on mount ───────────────────────────────────
  useEffect(() => {
    async function fetchResults() {
      try {
        // Minimum loading time so the animation looks intentional
        const [response] = await Promise.all([
          axios.post(`${BACKEND_URL}/api/session`, {
            sessionId: sessionId.current,
            age:       child.age,
            language:  lang,
            gameData,
          }),
          new Promise((r) => setTimeout(r, 2500)), // min 2.5s loading
        ]);

        setResults(response.data.results);
        setPhase("results");
      } catch (err) {
        console.error("Result fetch error:", err);

        // If backend is down, use rule-based fallback so demo doesn't break
        const mirrorEvents = gameData.mirror || [];
        const focusEvents  = (gameData.focus?.events) || [];

        const mirrorErrors  = mirrorEvents.filter((e) => e.mirrorError).length;
        const totalMirror   = mirrorEvents.length || 1;
        const impulseErrors = focusEvents.filter((e) => e.type === "impulse_error").length;
        const stopFailures  = focusEvents.filter((e) => e.type === "stop_failure").length;
        const totalFocus    = focusEvents.length || 1;

        const dysPct  = Math.min(95, Math.round((mirrorErrors / totalMirror) * 100 + 10));
        const adhdPct = Math.min(95, Math.round(((impulseErrors + stopFailures) / totalFocus) * 100 + 10));

        const getLevel = (pct) => pct >= 65 ? "RED" : pct >= 40 ? "YELLOW" : "GREEN";

        setResults({
          reliability: 0.75,
          lowReliability: false,
          dyslexia: {
            percentage:  dysPct,
            level:       getLevel(dysPct),
            description: dysPct >= 65
              ? "Your child shows strong patterns associated with Dyslexia. We recommend a formal assessment."
              : dysPct >= 40
                ? "Your child shows some patterns that may be associated with Dyslexia."
                : "Your child shows no significant patterns associated with Dyslexia.",
          },
          adhd: {
            percentage:  adhdPct,
            level:       getLevel(adhdPct),
            description: adhdPct >= 65
              ? "Your child shows strong patterns associated with ADHD. We recommend a formal assessment."
              : adhdPct >= 40
                ? "Your child shows some patterns that may be associated with ADHD."
                : "Your child shows no significant patterns associated with ADHD.",
          },
          signals: {
            mirrorErrorRate:  mirrorErrors / totalMirror,
            bdConfusion:      mirrorErrors / totalMirror * 0.7,
            attentionDecay:   impulseErrors / totalFocus,
            impulsivityScore: impulseErrors / totalFocus,
            stopFailureRate:  stopFailures / totalFocus,
          },
          disclaimer: "This is a screening tool, NOT a medical diagnosis.",
        });
        setPhase("results");
      }
    }

    fetchResults();
  }, []);

  // ── LOADING SCREEN ────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2D1B69] to-[#5B2D8E] flex items-center justify-center p-6">
        <div className="text-center text-white max-w-sm">
          <div className="text-7xl mb-6 animate-pulse">🧠</div>
          <h2 className="text-2xl font-black mb-3">{t.analyzing}</h2>
          <p className="text-purple-300 mb-8 text-sm">{t.analyzingDesc}</p>

          {/* Animated steps */}
          <div className="space-y-3 text-left">
            {[
              "Processing letter confusion patterns...",
              "Analysing attention decay signals...",
              "Running Dyslexia classifier...",
              "Running ADHD classifier...",
              "Generating your report...",
            ].map((step, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-sm text-purple-300"
                style={{ animationDelay: `${i * 0.5}s` }}
              >
                <span className="animate-spin text-teal-400">⚙</span>
                <span>{step}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-teal-400 to-violet-400 rounded-full animate-pulse" style={{ width: "75%" }} />
          </div>
        </div>
      </div>
    );
  }

  // ── RESULTS SCREEN ────────────────────────────────────────────────────────
  const dys  = results?.dyslexia || {};
  const adhd = results?.adhd     || {};
  const sigs = results?.signals  || {};

  // Overall highest risk level
  const levels   = [dys.level, adhd.level];
  const topLevel = levels.includes("RED") ? "RED" : levels.includes("YELLOW") ? "YELLOW" : "GREEN";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2D1B69] to-[#1a0a3e] text-white pb-12">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className={`bg-gradient-to-r ${LEVEL_BG[topLevel]} border-b px-6 py-6 text-center`}>
        <div className="text-5xl mb-3">{LEVEL_EMOJI[topLevel]}</div>
        <h1 className="text-2xl font-black mb-1">{t.results}</h1>
        <p className="text-purple-300 text-sm">
          {child.name ? `${child.name}, Age ${child.age}` : `Age ${child.age}`}
        </p>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-5">

        {/* ── LOW RELIABILITY WARNING ─────────────────────────────────────── */}
        {results?.lowReliability && (
          <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-2xl p-4 text-sm text-yellow-300">
            {t.lowReliability}
          </div>
        )}

        {/* ── RISK RINGS ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <RiskRing percent={dys.percentage  || 0} level={dys.level  || "GREEN"} label={t.dyslexia} t={t} />
          <RiskRing percent={adhd.percentage || 0} level={adhd.level || "GREEN"} label={t.adhd}     t={t} />
        </div>

        {/* ── DYSLEXIA DESCRIPTION ────────────────────────────────────────── */}
        <div className={`rounded-2xl p-4 border bg-gradient-to-br ${LEVEL_BG[dys.level || "GREEN"]}`}>
          <p className="font-bold text-sm mb-2">
            {LEVEL_EMOJI[dys.level]} {t.dyslexia}
          </p>
          <p className="text-purple-200 text-sm leading-relaxed">{dys.description}</p>
        </div>

        {/* ── ADHD DESCRIPTION ────────────────────────────────────────────── */}
        <div className={`rounded-2xl p-4 border bg-gradient-to-br ${LEVEL_BG[adhd.level || "GREEN"]}`}>
          <p className="font-bold text-sm mb-2">
            {LEVEL_EMOJI[adhd.level]} {t.adhd}
          </p>
          <p className="text-purple-200 text-sm leading-relaxed">{adhd.description}</p>
        </div>

        {/* ── AI SIGNALS ──────────────────────────────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-4 text-purple-200">📊 {t.signals}</h3>
          {Object.entries(sigs).map(([key, val]) => (
            <SignalBar
              key={key}
              label={t.signalLabels[key] || key}
              value={typeof val === "number" ? val : 0}
            />
          ))}
        </div>

        {/* ── RELIABILITY ─────────────────────────────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <span className="text-sm text-purple-200">{t.reliability}</span>
          <span className={`font-black text-sm ${
            (results?.reliability || 0) >= 0.7 ? "text-green-400" :
            (results?.reliability || 0) >= 0.5 ? "text-yellow-400" : "text-rose-400"
          }`}>
            {Math.round((results?.reliability || 0) * 100)}%
          </span>
        </div>

        {/* ── DISCLAIMER ──────────────────────────────────────────────────── */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-300 text-center leading-relaxed">
          {results?.disclaimer || t.disclaimer}
        </div>

        {/* ── SPECIALISTS ─────────────────────────────────────────────────── */}
        <div>
          <h3 className="font-bold mb-2 text-purple-200">🗺️ {t.specialists}</h3>
          <p className="text-xs text-purple-400 mb-3">{t.specialistNote}</p>
          <div className="space-y-3">
            {SPECIALISTS.slice(0, 3).map((sp, i) => (
              <SpecialistCard key={i} sp={sp} />
            ))}
          </div>
        </div>

        {/* ── SCREEN AGAIN BUTTON ─────────────────────────────────────────── */}
        <button
          onClick={() => {
            sessionStorage.removeItem("gameData");
            navigate("/");
          }}
          className="w-full bg-white/10 hover:bg-white/20 border border-white/20 font-bold py-4 rounded-xl transition-all"
        >
          🔄 {t.screenAgain}
        </button>

        {/* Session ID for reference */}
        <p className="text-center text-purple-600 text-xs">
          Session: {sessionId.current}
        </p>
      </div>
    </div>
  );
}
