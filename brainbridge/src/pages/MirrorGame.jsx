import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// ── GAME CONFIG ───────────────────────────────────────────────────────────────
const GAME_DURATION = 60;        // seconds
const TRIAL_DISPLAY_TIME = 3000; // ms each letter shown

// Letter sets — target letter + 3 options (including mirrors)
const TRIALS = [
  { target: "b", options: ["b", "d", "p", "q"] },
  { target: "d", options: ["d", "b", "q", "p"] },
  { target: "p", options: ["p", "q", "b", "d"] },
  { target: "q", options: ["q", "p", "d", "b"] },
  { target: "m", options: ["m", "w", "n", "u"] },
  { target: "w", options: ["w", "m", "u", "n"] },
  { target: "n", options: ["n", "u", "m", "w"] },
  { target: "b", options: ["b", "d", "p", "q"] },
  { target: "p", options: ["p", "b", "d", "q"] },
  { target: "d", options: ["d", "q", "b", "p"] },
  { target: "q", options: ["q", "d", "p", "b"] },
  { target: "m", options: ["m", "n", "w", "u"] },
  { target: "b", options: ["b", "q", "d", "p"] },
  { target: "w", options: ["w", "u", "m", "n"] },
  { target: "n", options: ["n", "m", "u", "w"] },
];

// Mirror pairs — used to classify error type
const MIRROR_PAIRS = {
  b: ["d", "p", "q"],
  d: ["b", "q", "p"],
  p: ["q", "b", "d"],
  q: ["p", "d", "b"],
  m: ["w"],
  w: ["m"],
  n: ["u"],
  u: ["n"],
};

// Shuffle array helper
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// Text translations
const TEXT = {
  english: {
    title: "Letter Mirror Game",
    instruction: "Tap the letter that MATCHES the one shown above!",
    timeLeft: "Time Left",
    trial: "Trial",
    ready: "Get Ready!",
    readyDesc: "Tap the letter that matches the big one shown.",
    startBtn: "Start Game",
    correct: "✓ Correct!",
    wrong: "✗ Try Again",
    timeUp: "Time's Up!",
    analyzing: "Analysing your results...",
  },
  hindi: {
    title: "अक्षर पहचान खेल",
    instruction: "ऊपर दिखाए गए अक्षर से मिलता-जुलता अक्षर टैप करें!",
    timeLeft: "समय बचा",
    trial: "प्रश्न",
    ready: "तैयार हो जाएं!",
    readyDesc: "ऊपर दिखाए बड़े अक्षर से मिलता अक्षर टैप करें।",
    startBtn: "खेल शुरू करें",
    correct: "✓ सही!",
    wrong: "✗ फिर कोशिश करें",
    timeUp: "समय खत्म!",
    analyzing: "परिणाम विश्लेषण हो रहा है...",
  },
};

export default function MirrorGame() {
  const navigate = useNavigate();

  // ── Get child info from session ─────────────────────────────────────────────
  const child = JSON.parse(sessionStorage.getItem("child") || "{}");
  const lang = child.language || "english";
  const t = TEXT[lang] || TEXT.english;

  // ── Game state ──────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState("ready");       // ready | playing | done
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [trialIndex, setTrialIndex] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [feedback, setFeedback] = useState(null);    // null | "correct" | "wrong"
  const [trialStart, setTrialStart] = useState(null); // timestamp when trial started

  // ── Event log — this is what gets sent to the AI ────────────────────────────
  const events = useRef([]);

  // Timer ref
  const timerRef = useRef(null);

  // Current trial
  const trial = TRIALS[trialIndex % TRIALS.length];

  // ── Shuffle options when trial changes ──────────────────────────────────────
  useEffect(() => {
    if (phase === "playing") {
      setShuffledOptions(shuffle(trial.options));
      setTrialStart(Date.now());
      setFeedback(null);
    }
  }, [trialIndex, phase]);

  // ── Countdown timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setPhase("done");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [phase]);

  // ── When game is done, send data to backend ──────────────────────────────────
  useEffect(() => {
    if (phase === "done") {
      // Save mirror game events to sessionStorage
      // (Backend will be built in Module 4)
      const existing = JSON.parse(sessionStorage.getItem("gameData") || "{}");
      sessionStorage.setItem(
        "gameData",
        JSON.stringify({ ...existing, mirror: events.current })
      );

      // Move to next game after 2 seconds
      setTimeout(() => {
        navigate("/game/focus");
      }, 2000);
    }
  }, [phase, navigate]);

  // ── Handle option tap ────────────────────────────────────────────────────────
  const handleTap = useCallback(
    (tapped) => {
      if (phase !== "playing" || feedback !== null) return;

      const reactionTime = Date.now() - trialStart;
      const isCorrect = tapped === trial.target;
      const isMirrorError =
        !isCorrect && MIRROR_PAIRS[trial.target]?.includes(tapped);

      // Log the event
      events.current.push({
        trial: trialIndex,
        target: trial.target,
        tapped,
        correct: isCorrect,
        mirrorError: isMirrorError,
        reactionTimeMs: reactionTime,
        timestamp: Date.now(),
      });

      // Show feedback
      setFeedback(isCorrect ? "correct" : "wrong");

      // Move to next trial after short delay
      setTimeout(() => {
        setTrialIndex((i) => i + 1);
        setFeedback(null);
      }, 600);
    },
    [phase, feedback, trialStart, trial, trialIndex]
  );

  // ── Timer colour ─────────────────────────────────────────────────────────────
  const timerColor =
    timeLeft > 30 ? "text-green-400" : timeLeft > 10 ? "text-yellow-400" : "text-rose-400";

  // ── RENDER: READY SCREEN ─────────────────────────────────────────────────────
  if (phase === "ready") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2D1B69] to-[#5B2D8E] flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl p-10 max-w-md w-full text-center text-white shadow-2xl">
          <div className="text-6xl mb-4">🪞</div>
          <h1 className="text-2xl font-black mb-2">{t.title}</h1>
          <div className="bg-white/10 rounded-xl px-4 py-2 text-sm text-purple-200 mb-6 inline-block">
            Game 1 of 2
          </div>
          <p className="text-purple-200 mb-8">{t.readyDesc}</p>

          {/* Example */}
          <div className="bg-white/10 rounded-2xl p-4 mb-8">
            <p className="text-xs text-purple-300 mb-3">Example:</p>
            <div className="text-5xl font-black text-white mb-3">b</div>
            <div className="flex gap-2 justify-center">
              {["d", "b", "q", "p"].map((l) => (
                <div
                  key={l}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black border-2 ${
                    l === "b"
                      ? "bg-teal-400 border-teal-300 text-white"
                      : "bg-white/20 border-white/30 text-white"
                  }`}
                >
                  {l}
                </div>
              ))}
            </div>
            <p className="text-xs text-teal-300 mt-3">Tap "b" — the matching letter!</p>
          </div>

          <button
            onClick={() => setPhase("playing")}
            className="w-full bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-300 hover:to-teal-400 font-black py-4 rounded-xl text-lg transition-all transform hover:scale-105"
          >
            {t.startBtn}
          </button>
        </div>
      </div>
    );
  }

  // ── RENDER: DONE SCREEN ──────────────────────────────────────────────────────
  if (phase === "done") {
    const total = events.current.length;
    const correct = events.current.filter((e) => e.correct).length;
    const mirrorErrors = events.current.filter((e) => e.mirrorError).length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2D1B69] to-[#5B2D8E] flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl p-10 max-w-md w-full text-center text-white">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-black mb-2">{t.timeUp}</h2>
          <p className="text-purple-200 mb-6">{t.analyzing}</p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-2xl font-black text-teal-400">{total}</div>
              <div className="text-xs text-purple-300">Trials</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-2xl font-black text-green-400">{correct}</div>
              <div className="text-xs text-purple-300">Correct</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-2xl font-black text-rose-400">{mirrorErrors}</div>
              <div className="text-xs text-purple-300">Mirror Errors</div>
            </div>
          </div>

          <p className="text-sm text-purple-300">Moving to next game...</p>
          <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-teal-400 rounded-full animate-pulse w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: PLAYING SCREEN ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2D1B69] to-[#5B2D8E] flex flex-col p-4">

      {/* Header */}
      <div className="flex items-center justify-between max-w-md mx-auto w-full mb-6 pt-2">
        <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
          <div className="text-xs text-purple-300">{t.trial}</div>
          <div className="font-black text-white">{trialIndex + 1}</div>
        </div>

        <div className="text-center">
          <div className="text-xs text-purple-300">{t.timeLeft}</div>
          <div className={`text-3xl font-black ${timerColor}`}>{timeLeft}s</div>
        </div>

        <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
          <div className="text-xs text-purple-300">Game</div>
          <div className="font-black text-white">1 / 2</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="max-w-md mx-auto w-full mb-8">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-400 rounded-full transition-all duration-1000"
            style={{ width: `${((GAME_DURATION - timeLeft) / GAME_DURATION) * 100}%` }}
          />
        </div>
      </div>

      {/* Instruction */}
      <p className="text-center text-purple-200 text-sm mb-6 max-w-md mx-auto">
        {t.instruction}
      </p>

      {/* Target letter */}
      <div className="max-w-md mx-auto w-full flex justify-center mb-10">
        <div className="bg-white/15 border-2 border-white/30 rounded-3xl w-40 h-40 flex items-center justify-center shadow-2xl">
          <span className="text-8xl font-black text-white select-none">
            {trial.target}
          </span>
        </div>
      </div>

      {/* Feedback banner */}
      <div className="max-w-md mx-auto w-full h-10 flex items-center justify-center mb-4">
        {feedback === "correct" && (
          <div className="bg-green-400/30 border border-green-400/50 rounded-xl px-6 py-2 text-green-300 font-bold">
            {t.correct}
          </div>
        )}
        {feedback === "wrong" && (
          <div className="bg-rose-400/30 border border-rose-400/50 rounded-xl px-6 py-2 text-rose-300 font-bold">
            {t.wrong}
          </div>
        )}
      </div>

      {/* Option buttons */}
      <div className="max-w-md mx-auto w-full grid grid-cols-2 gap-4">
        {shuffledOptions.map((letter) => (
          <button
            key={letter}
            onClick={() => handleTap(letter)}
            disabled={feedback !== null}
            className={`
              h-24 rounded-2xl text-5xl font-black transition-all duration-150 border-2 select-none
              ${
                feedback !== null
                  ? "opacity-50 cursor-not-allowed bg-white/10 border-white/20 text-white"
                  : "bg-white/15 border-white/30 text-white hover:bg-white/25 hover:border-white/50 active:scale-95 hover:scale-105"
              }
            `}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Bottom hint */}
      <p className="text-center text-purple-400 text-xs mt-8">
        🧠 BrainBridge · Game 1 — Letter Mirror
      </p>
    </div>
  );
}
