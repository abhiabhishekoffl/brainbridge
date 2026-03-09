import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function LandingPage() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState("english");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [error, setError] = useState("");

  const text = {
    english: {
      tagline: "AI-Powered Early Detection of Learning Disabilities",
      subtitle:
        "Free screening for Dyslexia, Dyscalculia & ADHD — in 8 minutes, on any phone, in your language.",
      stat1: "4.5 Cr+",
      stat1label: "Children with LDs in India",
      stat2: "90%",
      stat2label: "Go undiagnosed until age 10+",
      stat3: "₹0",
      stat3label: "Cost to families",
      formTitle: "Start Screening",
      namePlaceholder: "Child's first name",
      agePlaceholder: "Child's age (4–7)",
      startBtn: "Start Screening →",
      langLabel: "Language",
      errorName: "Please enter the child's name.",
      errorAge: "Please enter a valid age between 4 and 7.",
    },
    hindi: {
      tagline: "AI-आधारित सीखने की अक्षमताओं की जल्दी पहचान",
      subtitle:
        "डिस्लेक्सिया, डिस्केल्कुलिया और ADHD की मुफ्त जांच — 8 मिनट में, किसी भी फोन पर।",
      stat1: "4.5 करोड़+",
      stat1label: "भारत में बच्चे प्रभावित",
      stat2: "90%",
      stat2label: "10 साल की उम्र तक अनजान",
      stat3: "₹0",
      stat3label: "परिवारों के लिए लागत",
      formTitle: "जांच शुरू करें",
      namePlaceholder: "बच्चे का नाम",
      agePlaceholder: "बच्चे की उम्र (4–7)",
      startBtn: "जांच शुरू करें →",
      langLabel: "भाषा",
      errorName: "कृपया बच्चे का नाम दर्ज करें।",
      errorAge: "कृपया 4 से 7 के बीच की सही उम्र दर्ज करें।",
    },
  };

  const t = text[language];

  function handleStart() {
    setError("");
    if (!childName.trim()) {
      setError(t.errorName);
      return;
    }
    const age = parseInt(childAge);
    if (!childAge || isNaN(age) || age < 4 || age > 7) {
      setError(t.errorAge);
      return;
    }
    // Save to sessionStorage so other pages can access it
    sessionStorage.setItem(
      "child",
      JSON.stringify({ name: childName.trim(), age, language })
    );
    navigate("/game/mirror");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2D1B69] via-[#5B2D8E] to-[#7C3AED] text-white">

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🧠</span>
          <span className="text-xl font-bold tracking-tight">BrainBridge</span>
        </div>
        {/* Language Toggle */}
        <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
          <span className="text-sm opacity-70">{t.langLabel}:</span>
          <button
            onClick={() => setLanguage("english")}
            className={`text-sm px-3 py-1 rounded-full transition-all ${
              language === "english"
                ? "bg-white text-purple-800 font-bold"
                : "text-white opacity-60 hover:opacity-100"
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage("hindi")}
            className={`text-sm px-3 py-1 rounded-full transition-all ${
              language === "hindi"
                ? "bg-white text-purple-800 font-bold"
                : "text-white opacity-60 hover:opacity-100"
            }`}
          >
            हिंदी
          </button>
        </div>
      </nav>

      {/* ── HERO SECTION ───────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-8 flex flex-col lg:flex-row items-center gap-12">

        {/* Left — Text */}
        <div className="flex-1 text-center lg:text-left">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mb-6 text-sm">
            <span className="text-green-400">●</span>
            <span>SDG 4 · SDG 3 · SDG 10</span>
          </div>

          <h1 className="text-4xl lg:text-6xl font-black leading-tight mb-4">
            Brain
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-teal-300">
              Bridge
            </span>
          </h1>
          <p className="text-xl lg:text-2xl font-medium text-purple-200 mb-4">
            {t.tagline}
          </p>
          <p className="text-base text-purple-300 mb-8 max-w-xl">
            {t.subtitle}
          </p>

          {/* Stat chips */}
          <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-8">
            {[
              { v: t.stat1, l: t.stat1label, color: "bg-rose-500" },
              { v: t.stat2, l: t.stat2label, color: "bg-violet-500" },
              { v: t.stat3, l: t.stat3label, color: "bg-teal-500" },
            ].map((s, i) => (
              <div
                key={i}
                className={`${s.color} bg-opacity-80 rounded-2xl px-5 py-3 text-center min-w-[100px]`}
              >
                <div className="text-2xl font-black">{s.v}</div>
                <div className="text-xs opacity-80 mt-1">{s.l}</div>
              </div>
            ))}
          </div>

          {/* Feature chips */}
          <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
            {["🎮 5 Games", "🧠 AI-Powered", "📱 Any Phone", "🆓 Always Free"].map(
              (f) => (
                <span
                  key={f}
                  className="bg-white/10 border border-white/20 rounded-full px-3 py-1 text-sm"
                >
                  {f}
                </span>
              )
            )}
          </div>
        </div>

        {/* Right — Form Card */}
        <div className="w-full max-w-sm">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-center">{t.formTitle}</h2>

            {/* Child Name */}
            <div className="mb-4">
              <input
                type="text"
                placeholder={t.namePlaceholder}
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/60 transition-all"
              />
            </div>

            {/* Child Age */}
            <div className="mb-4">
              <input
                type="number"
                placeholder={t.agePlaceholder}
                value={childAge}
                onChange={(e) => setChildAge(e.target.value)}
                min="4"
                max="7"
                className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/60 transition-all"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 bg-rose-500/30 border border-rose-400/50 rounded-xl px-4 py-2 text-sm text-rose-200">
                ⚠️ {error}
              </div>
            )}

            {/* Start Button */}
            <button
              onClick={handleStart}
              className="w-full bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-300 hover:to-teal-400 text-white font-bold py-4 rounded-xl text-lg transition-all transform hover:scale-105 shadow-lg"
            >
              {t.startBtn}
            </button>

            <p className="text-center text-xs text-purple-300 mt-4">
              No login required · No data stored with your name
            </p>
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ───────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-center mb-8 text-purple-200">
          How It Works
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: "🎮", step: "1", title: "Play Games", desc: "5 fun mini-games, 60–90 sec each" },
            { icon: "🧠", step: "2", title: "AI Analyses", desc: "20+ behavioural signals detected" },
            { icon: "📋", step: "3", title: "Get Report", desc: "Plain language risk assessment" },
            { icon: "🗺️", step: "4", title: "Find Help", desc: "Nearest specialists on a map" },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-white/10 rounded-2xl p-5 text-center border border-white/10"
            >
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="text-xs text-purple-300 mb-1">Step {item.step}</div>
              <div className="font-bold mb-1">{item.title}</div>
              <div className="text-xs text-purple-300">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="text-center text-purple-400 text-sm py-6 border-t border-white/10">
        🧠 BrainBridge · Free · Open Source · Built for Bharat
      </footer>
    </div>
  );
}
