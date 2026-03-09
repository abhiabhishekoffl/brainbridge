import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// ── GAME CONFIG ───────────────────────────────────────────────────────────────
const GAME_DURATION   = 90;    // seconds
const BALL_COLORS     = ["red", "blue", "green", "yellow", "purple"];
const TARGET_COLOR    = "red"; // child must ONLY tap red
const STOP_SIGNAL_DURATION = 2000; // ms the STOP sign shows

// Ball spawn intervals by phase (ms) — gets faster
const SPAWN_INTERVALS = { 0: 1200, 1: 900, 2: 650 };

// Color display config
const COLOR_STYLES = {
  red:    { bg: "bg-rose-500",   border: "border-rose-300",   emoji: "🔴" },
  blue:   { bg: "bg-blue-500",   border: "border-blue-300",   emoji: "🔵" },
  green:  { bg: "bg-green-500",  border: "border-green-300",  emoji: "🟢" },
  yellow: { bg: "bg-yellow-400", border: "border-yellow-200", emoji: "🟡" },
  purple: { bg: "bg-purple-500", border: "border-purple-300", emoji: "🟣" },
};

const TEXT = {
  english: {
    title: "Focus Catcher",
    instruction: "Tap only the RED balls! Ignore all other colours.",
    stopInstruction: "🛑 STOP! Do NOT tap anything!",
    timeLeft: "Time Left",
    phase: "Speed",
    ready: "Get Ready!",
    readyDesc: "Tap ONLY red balls. When you see the STOP sign, freeze — don't tap anything!",
    startBtn: "Start Game",
    great: "⚡ Great!",
    wrong: "✗ Wrong colour!",
    stopped: "🛑 Good stop!",
    failed: "✗ Should have stopped!",
    done: "Game Complete!",
    analyzing: "Analysing your focus...",
    taps: "Total Taps",
    correct: "Correct",
    impulse: "Impulse Errors",
  },
  hindi: {
    title: "ध्यान पकड़ो",
    instruction: "केवल लाल गेंद टैप करें! बाकी रंग नजरअंदाज करें।",
    stopInstruction: "🛑 रुको! कुछ भी टैप मत करो!",
    timeLeft: "समय बचा",
    phase: "गति",
    ready: "तैयार हो जाएं!",
    readyDesc: "केवल लाल गेंद टैप करें। STOP दिखे तो रुक जाएं!",
    startBtn: "खेल शुरू करें",
    great: "⚡ शाबाश!",
    wrong: "✗ गलत रंग!",
    stopped: "🛑 अच्छा रोका!",
    failed: "✗ रोकना था!",
    done: "खेल पूरा!",
    analyzing: "ध्यान का विश्लेषण हो रहा है...",
    taps: "कुल टैप",
    correct: "सही",
    impulse: "आवेग गलतियाँ",
  },
};

let ballIdCounter = 0;

export default function FocusCatcher() {
  const navigate = useNavigate();
  const child = JSON.parse(sessionStorage.getItem("child") || "{}");
  const lang = child.language || "english";
  const t = TEXT[lang] || TEXT.english;

  // ── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase]           = useState("ready");
  const [timeLeft, setTimeLeft]     = useState(GAME_DURATION);
  const [balls, setBalls]           = useState([]);
  const [stopSignal, setStopSignal] = useState(false);
  const [feedback, setFeedback]     = useState(null);
  const [speedPhase, setSpeedPhase] = useState(0); // 0=slow, 1=medium, 2=fast

  // ── Refs (don't cause re-render) ────────────────────────────────────────────
  const events          = useRef([]);
  const timerRef        = useRef(null);
  const spawnRef        = useRef(null);
  const stopRef         = useRef(null);
  const stopActiveRef   = useRef(false);
  const stopStartRef    = useRef(null);
  const feedbackRef     = useRef(null);
  const gameAreaRef     = useRef(null);

  // Attention windows — track accuracy per 30-second window
  const windowCounts = useRef({ 0: { correct: 0, wrong: 0 }, 1: { correct: 0, wrong: 0 }, 2: { correct: 0, wrong: 0 } });

  // ── Spawn a ball ─────────────────────────────────────────────────────────────
  const spawnBall = useCallback(() => {
    if (stopActiveRef.current) return; // no balls during STOP signal

    const color = BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
    const areaWidth = gameAreaRef.current?.offsetWidth || 320;
    const xPos = Math.random() * (areaWidth - 80) + 10; // 10px padding each side

    const ball = {
      id: ++ballIdCounter,
      color,
      x: xPos,
      createdAt: Date.now(),
    };

    setBalls((prev) => [...prev, ball]);

    // Auto-remove ball after 2.5 seconds (if not tapped)
    setTimeout(() => {
      setBalls((prev) => prev.filter((b) => b.id !== ball.id));
    }, 2500);
  }, []);

  // ── Schedule STOP signals ────────────────────────────────────────────────────
  const scheduleStop = useCallback(() => {
    const delay = 8000 + Math.random() * 10000; // every 8–18 seconds
    stopRef.current = setTimeout(() => {
      if (stopActiveRef.current) return;
      stopActiveRef.current = true;
      stopStartRef.current = Date.now();
      setStopSignal(true);
      setBalls([]); // clear all balls

      // End stop signal after duration
      setTimeout(() => {
        stopActiveRef.current = false;
        setStopSignal(false);
        scheduleStop(); // schedule next stop
      }, STOP_SIGNAL_DURATION);
    }, delay);
  }, []);

  // ── Start game ───────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    setPhase("playing");
    events.current = [];
    windowCounts.current = { 0: { correct: 0, wrong: 0 }, 1: { correct: 0, wrong: 0 }, 2: { correct: 0, wrong: 0 } };

    // Countdown timer
    let remaining = GAME_DURATION;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);

      // Update speed phase
      if (remaining <= GAME_DURATION - 60) setSpeedPhase(2);
      else if (remaining <= GAME_DURATION - 30) setSpeedPhase(1);

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        clearInterval(spawnRef.current);
        clearTimeout(stopRef.current);
        setPhase("done");
      }
    }, 1000);

    // Ball spawner
    const startSpawner = (interval) => {
      clearInterval(spawnRef.current);
      spawnRef.current = setInterval(spawnBall, interval);
    };
    startSpawner(SPAWN_INTERVALS[0]);

    // Speed up at 30s and 60s
    setTimeout(() => startSpawner(SPAWN_INTERVALS[1]), 30000);
    setTimeout(() => startSpawner(SPAWN_INTERVALS[2]), 60000);

    scheduleStop();
  }, [spawnBall, scheduleStop]);

  // ── Handle ball tap ──────────────────────────────────────────────────────────
  const handleBallTap = useCallback(
    (ball) => {
      if (phase !== "playing") return;

      const reactionTime = Date.now() - ball.createdAt;
      const isCorrect    = ball.color === TARGET_COLOR;
      const timeElapsed  = GAME_DURATION - timeLeft;
      const window       = Math.min(2, Math.floor(timeElapsed / 30));

      // If stop signal is active — this is an impulsivity failure
      if (stopActiveRef.current) {
        events.current.push({
          type: "stop_failure",
          color: ball.color,
          reactionTimeMs: reactionTime,
          timestamp: Date.now(),
          window,
        });
        showFeedback("failed");
        return;
      }

      // Normal tap
      events.current.push({
        type: isCorrect ? "correct_tap" : "impulse_error",
        color: ball.color,
        reactionTimeMs: reactionTime,
        timestamp: Date.now(),
        window,
      });

      if (isCorrect) {
        windowCounts.current[window].correct += 1;
        showFeedback("great");
      } else {
        windowCounts.current[window].wrong += 1;
        showFeedback("wrong");
      }

      // Remove tapped ball
      setBalls((prev) => prev.filter((b) => b.id !== ball.id));
    },
    [phase, timeLeft]
  );

  // ── Handle tap on game area (miss = potential stop-signal failure) ────────────
  const handleAreaTap = useCallback(
    (e) => {
      // Only count if tapping the area background (not a ball)
      if (e.target !== e.currentTarget) return;
      if (!stopActiveRef.current) return;

      events.current.push({
        type: "stop_failure",
        color: null,
        reactionTimeMs: Date.now() - (stopStartRef.current || Date.now()),
        timestamp: Date.now(),
        window: Math.min(2, Math.floor((GAME_DURATION - timeLeft) / 30)),
      });
      showFeedback("failed");
    },
    [timeLeft]
  );

  // ── Feedback helper ──────────────────────────────────────────────────────────
  const showFeedback = (type) => {
    clearTimeout(feedbackRef.current);
    setFeedback(type);
    feedbackRef.current = setTimeout(() => setFeedback(null), 700);
  };

  // ── Save data and navigate when done ─────────────────────────────────────────
  useEffect(() => {
    if (phase !== "done") return;

    const existing = JSON.parse(sessionStorage.getItem("gameData") || "{}");
    sessionStorage.setItem(
      "gameData",
      JSON.stringify({
        ...existing,
        focus: {
          events: events.current,
          windowCounts: windowCounts.current,
        },
      })
    );

    setTimeout(() => navigate("/result"), 2000);
  }, [phase, navigate]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearInterval(spawnRef.current);
      clearTimeout(stopRef.current);
      clearTimeout(feedbackRef.current);
    };
  }, []);

  // ── Timer colour ─────────────────────────────────────────────────────────────
  const timerColor =
    timeLeft > 60 ? "text-green-400" : timeLeft > 20 ? "text-yellow-400" : "text-rose-400";

  const speedLabels = { 0: "🐢 Slow", 1: "🏃 Medium", 2: "⚡ Fast" };

  // ── READY SCREEN ─────────────────────────────────────────────────────────────
  if (phase === "ready") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2D1B69] to-[#5B2D8E] flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl p-10 max-w-md w-full text-center text-white shadow-2xl">
          <div className="text-6xl mb-4">🎯</div>
          <h1 className="text-2xl font-black mb-2">{t.title}</h1>
          <div className="bg-white/10 rounded-xl px-4 py-2 text-sm text-purple-200 mb-6 inline-block">
            Game 2 of 2
          </div>
          <p className="text-purple-200 mb-8">{t.readyDesc}</p>

          {/* Rules */}
          <div className="space-y-3 mb-8 text-left">
            <div className="flex items-center gap-3 bg-green-500/20 rounded-xl p-3">
              <span className="text-2xl">🔴</span>
              <span className="text-sm">TAP red balls — as fast as you can!</span>
            </div>
            <div className="flex items-center gap-3 bg-blue-500/20 rounded-xl p-3">
              <span className="text-2xl">🔵🟢🟡🟣</span>
              <span className="text-sm">IGNORE all other colours</span>
            </div>
            <div className="flex items-center gap-3 bg-rose-500/20 rounded-xl p-3">
              <span className="text-2xl">🛑</span>
              <span className="text-sm">When STOP appears — freeze! Don't tap!</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 font-black py-4 rounded-xl text-lg text-white transition-all transform hover:scale-105"
          >
            {t.startBtn}
          </button>
        </div>
      </div>
    );
  }

  // ── DONE SCREEN ───────────────────────────────────────────────────────────────
  if (phase === "done") {
    const totalTaps    = events.current.filter((e) => e.type !== "stop_failure").length;
    const correctTaps  = events.current.filter((e) => e.type === "correct_tap").length;
    const impulseTaps  = events.current.filter((e) => e.type === "impulse_error").length;
    const stopFailures = events.current.filter((e) => e.type === "stop_failure").length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2D1B69] to-[#5B2D8E] flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl p-10 max-w-md w-full text-center text-white">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-2xl font-black mb-2">{t.done}</h2>
          <p className="text-purple-200 mb-6">{t.analyzing}</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-2xl font-black text-teal-400">{correctTaps}</div>
              <div className="text-xs text-purple-300">{t.correct}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-2xl font-black text-rose-400">{impulseTaps + stopFailures}</div>
              <div className="text-xs text-purple-300">{t.impulse}</div>
            </div>
          </div>

          <p className="text-sm text-purple-300">Loading your results...</p>
          <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-rose-400 rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING SCREEN ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0a3e] to-[#2D1B69] flex flex-col select-none">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto w-full">
        <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
          <div className="text-xs text-purple-300">{t.phase}</div>
          <div className="font-black text-white text-sm">{speedLabels[speedPhase]}</div>
        </div>

        <div className="text-center">
          <div className="text-xs text-purple-300">{t.timeLeft}</div>
          <div className={`text-3xl font-black ${timerColor}`}>{timeLeft}s</div>
        </div>

        <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
          <div className="text-xs text-purple-300">Game</div>
          <div className="font-black text-white">2 / 2</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 max-w-md mx-auto w-full mb-2">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-rose-500 rounded-full transition-all duration-1000"
            style={{ width: `${((GAME_DURATION - timeLeft) / GAME_DURATION) * 100}%` }}
          />
        </div>
      </div>

      {/* Instruction */}
      <p className="text-center text-purple-300 text-xs px-4 mb-2">
        {stopSignal ? t.stopInstruction : t.instruction}
      </p>

      {/* Feedback */}
      <div className="h-8 flex items-center justify-center mb-1">
        {feedback === "great"  && <span className="text-green-400 font-black text-sm animate-bounce">{t.great}</span>}
        {feedback === "wrong"  && <span className="text-yellow-400 font-black text-sm">{t.wrong}</span>}
        {feedback === "stopped" && <span className="text-teal-400 font-black text-sm">{t.stopped}</span>}
        {feedback === "failed" && <span className="text-rose-400 font-black text-sm animate-pulse">{t.failed}</span>}
      </div>

      {/* ── GAME AREA ── */}
      <div
        ref={gameAreaRef}
        onClick={handleAreaTap}
        className={`
          flex-1 relative overflow-hidden mx-4 rounded-3xl border-2 transition-all duration-300
          ${stopSignal
            ? "border-rose-500 bg-rose-900/40"
            : "border-white/10 bg-white/5"
          }
        `}
        style={{ minHeight: "360px", maxHeight: "500px" }}
      >
        {/* STOP SIGNAL overlay */}
        {stopSignal && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="bg-rose-600 rounded-3xl px-10 py-6 shadow-2xl animate-pulse border-4 border-rose-300">
              <div className="text-6xl text-center">🛑</div>
              <div className="text-white font-black text-2xl text-center mt-2">STOP!</div>
            </div>
          </div>
        )}

        {/* Balls */}
        {balls.map((ball) => {
          const style = COLOR_STYLES[ball.color];
          return (
            <button
              key={ball.id}
              onClick={(e) => { e.stopPropagation(); handleBallTap(ball); }}
              className={`
                absolute w-16 h-16 rounded-full border-4 flex items-center justify-center
                text-2xl font-black transition-all duration-150 active:scale-90
                ${style.bg} ${style.border}
                animate-fall shadow-lg hover:brightness-110
              `}
              style={{
                left: ball.x,
                top: "10px",
                animationDuration: speedPhase === 2 ? "1.8s" : speedPhase === 1 ? "2.3s" : "3s",
              }}
            >
              {style.emoji}
            </button>
          );
        })}

        {/* Empty state hint */}
        {balls.length === 0 && !stopSignal && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-purple-500 text-sm">Balls coming...</p>
          </div>
        )}
      </div>

      {/* Bottom hint */}
      <p className="text-center text-purple-500 text-xs py-3">
        🧠 BrainBridge · Game 2 — Focus Catcher
      </p>
    </div>
  );
}
