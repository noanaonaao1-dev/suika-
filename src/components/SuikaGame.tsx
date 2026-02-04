import React, { useEffect, useRef, useState, useCallback } from "react";
import { PhysicsEngine } from "../game/PhysicsEngine";
import { FRUIT_TYPES } from "../game/fruits";
import type { FruitType } from "../game/fruits";
import { Play, RotateCcw, Trophy } from "lucide-react";

const SuikaGame: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PhysicsEngine | null>(null);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [currentFruit, setCurrentFruit] = useState<FruitType>(FRUIT_TYPES[0]);
  const currentFruitRef = useRef<FruitType>(FRUIT_TYPES[0]);
  const [nextFruit, setNextFruit] = useState<FruitType>(FRUIT_TYPES[Math.floor(Math.random() * 5)]);
  const [launcherX, setLauncherX] = useState(200);
  const launcherXRef = useRef(200);
  const [dropTimer, setDropTimer] = useState(5);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isGyroEnabled, setIsGyroEnabled] = useState(false);
  const [ranking, setRanking] = useState<{ score: number }[]>([]);
  const [showRanking, setShowRanking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "https://suika-ranking.your-subdomain.workers.dev";

  const spawnNewFruit = useCallback(() => {
    setCurrentFruit(nextFruit);
    currentFruitRef.current = nextFruit;
    setNextFruit(FRUIT_TYPES[Math.floor(Math.random() * 5)]);
    setDropTimer(5);
  }, [nextFruit]);

  const dropFruit = useCallback(() => {
    if (!engineRef.current || isGameOver || !isGameStarted) return;

    engineRef.current.addFruit(launcherXRef.current, 50, currentFruitRef.current);
    spawnNewFruit();
  }, [isGameOver, isGameStarted, spawnNewFruit]);

  // Handle Gyro
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (!isGameStarted || isGameOver) return;

      const { beta, gamma } = event; // beta: front-back, gamma: left-right
      if (gamma !== null && beta !== null) {
        // Move launcher based on gamma (tilt left/right)
        // Gamma ranges from -90 to 90. Map it to container width.
        let newX = launcherXRef.current + gamma * 0.5;
        newX = Math.max(currentFruitRef.current.radius, Math.min(400 - currentFruitRef.current.radius, newX));
        launcherXRef.current = newX;
        setLauncherX(newX);

        // Gravity manipulation
        // Normal gravity is y=1.
        const gx = Math.sin((gamma * Math.PI) / 180) * 1.5;
        const gy = Math.cos((gamma * Math.PI) / 180) * 1.0;

        // Intensify gravity if tilt is sharp
        const intensify = Math.abs(gamma) > 30 ? 2 : 1;
        engineRef.current?.setGravity(gx * intensify, gy);
      }
    };

    if (isGyroEnabled) {
      window.addEventListener("deviceorientation", handleOrientation);
    }
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, [isGyroEnabled, isGameStarted, isGameOver]);

  // Auto-drop timer
  useEffect(() => {
    if (!isGameStarted || isGameOver) return;

    const timer = setInterval(() => {
      setDropTimer((prev) => {
        if (prev <= 1) {
          dropFruit();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isGameStarted, isGameOver, dropFruit]);

  const startGame = async () => {
    // Request gyro permission for iOS
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          setIsGyroEnabled(true);
        }
      } catch (err) {
        console.error("Gyro permission denied", err);
      }
    } else {
      setIsGyroEnabled(true);
    }

    if (containerRef.current && !engineRef.current) {
      engineRef.current = new PhysicsEngine(
        containerRef.current,
        (s) => setScore((prev) => prev + s),
        () => setIsGameOver(true)
      );
      engineRef.current.start();
    }
    setIsGameStarted(true);
  };

  const resetGame = () => {
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }
    setScore(0);
    setIsGameOver(false);
    setShowRanking(false);
    setLauncherX(200);
    launcherXRef.current = 200;
    currentFruitRef.current = FRUIT_TYPES[0];
    setDropTimer(5);
    if (containerRef.current) {
       startGame();
    }
  };

  const fetchRanking = async () => {
    try {
      const res = await fetch(`${API_URL}/ranking`);
      if (res.ok) {
        const data = await res.json();
        setRanking(data);
      }
    } catch (err) {
      console.error("Failed to fetch ranking", err);
    }
  };

  const submitScore = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await fetch(`${API_URL}/ranking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
      });
      await fetchRanking();
      setShowRanking(true);
    } catch (err) {
      console.error("Failed to submit score", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-orange-50 p-4 font-sans">
      <div className="flex justify-between w-full max-w-[400px] mb-4">
        <div className="bg-white p-2 rounded-lg shadow-md">
          <p className="text-xs text-gray-500">SCORE</p>
          <p className="text-2xl font-bold">{score}</p>
        </div>
        <div className="bg-white p-2 rounded-lg shadow-md flex items-center">
          <p className="text-xs text-gray-500 mr-2">NEXT</p>
          <div
            className="w-8 h-8 rounded-full"
            style={{ backgroundColor: nextFruit.color }}
          />
        </div>
      </div>

      <div className="relative">
        <div
          ref={containerRef}
          className="border-4 border-amber-900 rounded-b-xl overflow-hidden shadow-2xl"
          style={{ width: 400, height: 600 }}
          onClick={(e) => {
            if (!isGyroEnabled) {
              const rect = e.currentTarget.getBoundingClientRect();
              const newX = e.clientX - rect.left;
              setLauncherX(newX);
              launcherXRef.current = newX;
            }
          }}
          onTouchMove={(e) => {
            if (!isGyroEnabled) {
              const rect = e.currentTarget.getBoundingClientRect();
              const touch = e.touches[0];
              const newX = touch.clientX - rect.left;
              setLauncherX(newX);
              launcherXRef.current = newX;
            }
          }}
        />

        {!isGameOver && isGameStarted && (
          <>
            {/* Game Over Line */}
            <div
              className="absolute top-[80px] w-full h-[2px] bg-red-400/50 pointer-events-none"
            />
            {/* Launcher Lane */}
            <div
              className="absolute top-0 w-full h-[80px] border-b-2 border-dashed border-gray-300/30 pointer-events-none"
            />
            {/* Current Fruit */}
            <div
              className="absolute pointer-events-none transition-all duration-75"
              style={{
                left: launcherX - currentFruit.radius,
                top: 40 - currentFruit.radius,
                width: currentFruit.radius * 2,
                height: currentFruit.radius * 2,
                borderRadius: '50%',
                backgroundColor: currentFruit.color,
                opacity: 0.8
              }}
            />
          </>
        )}

        {!isGameStarted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-b-xl">
            <button
              onClick={startGame}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-full font-bold text-xl flex items-center shadow-lg transform transition active:scale-95"
            >
              <Play className="mr-2" /> プレイ開始
            </button>
          </div>
        )}

        {isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-b-xl text-white p-6">
            {!showRanking ? (
              <>
                <h2 className="text-4xl font-black mb-2 text-orange-400">GAME OVER</h2>
                <p className="text-2xl mb-6">最終スコア: {score}</p>
                <button
                  onClick={submitScore}
                  disabled={isSubmitting}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-full font-bold text-lg flex items-center mb-4 disabled:opacity-50"
                >
                  <Trophy className="mr-2" /> {isSubmitting ? "送信中..." : "スコアを登録"}
                </button>
                <button
                  onClick={resetGame}
                  className="text-white underline"
                >
                  登録せずにリトライ
                </button>
              </>
            ) : (
              <div className="w-full max-w-[300px]">
                <h2 className="text-2xl font-black mb-4 text-center text-yellow-400">世界ランキング</h2>
                <div className="bg-white/10 rounded-lg p-4 mb-6">
                  {ranking.length > 0 ? (
                    ranking.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
                        <span className="font-bold text-yellow-500">{index + 1}位</span>
                        <span className="text-xl">{item.score.toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center">データなし</p>
                  )}
                </div>
                <button
                  onClick={resetGame}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-full font-bold text-lg flex items-center justify-center"
                >
                  <RotateCcw className="mr-2" /> もう一度遊ぶ
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isGameStarted && !isGameOver && (
        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="text-gray-600 font-medium">
            自動落下まで: <span className="text-orange-600 text-xl font-bold">{dropTimer}</span>秒
          </div>
          <button
            onClick={dropFruit}
            className="w-24 h-24 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold text-xl shadow-xl transform transition active:scale-90 flex items-center justify-center"
          >
            落とす
          </button>
          {!isGyroEnabled && (
            <p className="text-sm text-gray-400 italic">※ジャイロ未検知。クリックで位置を移動できます。</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SuikaGame;
