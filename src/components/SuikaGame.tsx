import React, { useEffect, useRef, useState, useCallback } from "react";
import { PhysicsEngine } from "../game/PhysicsEngine";
import { FRUIT_TYPES } from "../game/fruits";
import type { FruitType } from "../game/fruits";
import { Play, Trophy } from "lucide-react";

const SuikaGame: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PhysicsEngine | null>(null);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [currentFruit, setCurrentFruit] = useState<FruitType>(FRUIT_TYPES[0]);
  const currentFruitRef = useRef<FruitType>(FRUIT_TYPES[0]);
  const [nextFruit, setNextFruit] = useState<FruitType>(FRUIT_TYPES[Math.floor(Math.random() * 5)]);
  const [launcherX, setLauncherX] = useState(225);
  const launcherXRef = useRef(225);
  const velocityRef = useRef(0);
  const [dropTimer, setDropTimer] = useState(5);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isGyroEnabled, setIsGyroEnabled] = useState(false);
  const [ranking, setRanking] = useState<{ score: number }[]>([]);
  const [showRanking, setShowRanking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const containerWidth = 450;
  const containerHeight = 650;
  const API_URL = import.meta.env.VITE_API_URL || "https://suika-ranking.your-subdomain.workers.dev";

  const spawnNewFruit = useCallback(() => {
    setCurrentFruit(nextFruit);
    currentFruitRef.current = nextFruit;
    setNextFruit(FRUIT_TYPES[Math.floor(Math.random() * 5)]);
    setDropTimer(5);
  }, [nextFruit]);

  const dropFruit = useCallback(() => {
    if (!engineRef.current || isGameOver || !isGameStarted) return;

    engineRef.current.addFruit(launcherXRef.current, 100, currentFruitRef.current);
    spawnNewFruit();
  }, [isGameOver, isGameStarted, spawnNewFruit]);

  // Smooth Movement Loop
  useEffect(() => {
    let animationFrame: number;
    const update = () => {
      if (isGyroEnabled && isGameStarted && !isGameOver) {
        launcherXRef.current += velocityRef.current;

        const radius = currentFruitRef.current.radius;
        if (launcherXRef.current < radius + 20) {
          launcherXRef.current = radius + 20;
          velocityRef.current = 0;
        } else if (launcherXRef.current > containerWidth - radius - 20) {
          launcherXRef.current = containerWidth - radius - 20;
          velocityRef.current = 0;
        }

        setLauncherX(launcherXRef.current);
        velocityRef.current *= 0.92; // Damping
      }
      animationFrame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(animationFrame);
  }, [isGyroEnabled, isGameStarted, isGameOver]);

  // Handle Gyro
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (!isGameStarted || isGameOver) return;

      const { gamma } = event; // gamma: left-right tilt
      if (gamma !== null) {
        // Accelerate velocity based on tilt
        const accel = gamma * 0.08;
        velocityRef.current += accel;

        // Max speed limit
        const maxSpeed = 12;
        if (Math.abs(velocityRef.current) > maxSpeed) {
          velocityRef.current = maxSpeed * Math.sign(velocityRef.current);
        }

        // Gravity manipulation
        const gx = Math.sin((gamma * Math.PI) / 180) * 1.5;
        const gy = Math.cos((gamma * Math.PI) / 180) * 1.0;
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
    setLauncherX(225);
    launcherXRef.current = 225;
    velocityRef.current = 0;
    currentFruitRef.current = FRUIT_TYPES[0];
    setCurrentFruit(FRUIT_TYPES[0]);
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

  const openRanking = async () => {
    await fetchRanking();
    setShowRanking(true);
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
    <div className="flex flex-col items-center min-h-screen bg-[#f3c483] font-sans overflow-x-hidden">
      {/* Top Header */}
      <div className="w-full bg-[#f68b1f] py-2 flex items-center justify-center shadow-md mb-6">
        <div className="flex items-center text-white font-bold text-xl italic">
          <div className="bg-green-600 rounded-full w-6 h-6 mr-2 flex items-center justify-center text-xs">🍉</div>
          play <span className="text-white ml-1">SuikaGame</span>
        </div>
      </div>

      <div className="w-full max-w-[500px] px-4 relative flex flex-col items-center">
        {/* Top Controls Area */}
        <div className="flex justify-between w-full mb-8 items-center">
          {/* Score Bubble */}
          <div className="flex flex-col items-center">
             <span className="text-[#8b4513] font-bold text-lg mb-1">スコア</span>
             <div className="w-20 h-20 rounded-full bg-white/40 border-4 border-white/60 flex items-center justify-center shadow-inner">
                <span className="text-3xl font-black text-[#8b4513]">{score}</span>
             </div>
          </div>

          {/* Leaderboard Button */}
          <button
            onClick={openRanking}
            className="bg-[#f68b1f] hover:bg-[#e07a1b] text-white px-4 py-2 rounded-lg font-bold flex items-center shadow-lg transform transition active:scale-95"
          >
            <Trophy className="w-4 h-4 mr-2" /> リーダーボード
          </button>

          {/* Next Bubble */}
          <div className="flex flex-col items-center">
             <span className="text-[#8b4513] font-bold text-lg mb-1 text-right w-full">ネクスト</span>
             <div className="w-20 h-20 rounded-full bg-white/40 border-4 border-white/60 flex items-center justify-center shadow-inner overflow-hidden">
                <img
                  src={nextFruit.image}
                  className="w-12 h-12 object-contain"
                  alt="next"
                />
             </div>
          </div>
        </div>

        {/* Game Area */}
        <div className="relative">
          {/* 3D Box Visual Effect */}
          <div className="absolute inset-x-[-15px] bottom-[-15px] top-[100px] bg-white/20 rounded-b-2xl border-[15px] border-[#e8d5b5]/80 pointer-events-none shadow-2xl">
             <div className="absolute inset-0 border-[2px] border-white/30 rounded-lg"></div>
          </div>

          <div
            ref={containerRef}
            className="relative z-10 overflow-hidden"
            style={{ width: containerWidth, height: containerHeight }}
            onClick={(e) => {
              if (!isGyroEnabled) {
                const rect = e.currentTarget.getBoundingClientRect();
                let newX = e.clientX - rect.left;
                const radius = currentFruitRef.current.radius;
                newX = Math.max(radius + 20, Math.min(containerWidth - radius - 20, newX));
                setLauncherX(newX);
                launcherXRef.current = newX;
              }
            }}
            onTouchMove={(e) => {
              if (!isGyroEnabled) {
                const rect = e.currentTarget.getBoundingClientRect();
                const touch = e.touches[0];
                let newX = touch.clientX - rect.left;
                const radius = currentFruitRef.current.radius;
                newX = Math.max(radius + 20, Math.min(containerWidth - radius - 20, newX));
                setLauncherX(newX);
                launcherXRef.current = newX;
              }
            }}
          />

          {!isGameOver && isGameStarted && (
            <>
              {/* Game Over Line */}
              <div
                className="absolute top-[100px] w-full h-[2px] bg-red-400/50 pointer-events-none z-20"
              />
              {/* Launcher Lane */}
              <div
                className="absolute top-0 w-full h-[100px] border-b-2 border-dashed border-white/30 pointer-events-none z-0"
              />
              {/* Cloud Launcher Character */}
              <div
                className="absolute pointer-events-none transition-all duration-75 z-20"
                style={{
                  left: launcherX - 40,
                  top: 10,
                  width: 80,
                  height: 60,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                <div className="relative">
                   <div className="text-white drop-shadow-md">
                      <svg width="80" height="60" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.5,19c-3.037,0-5.5-2.463-5.5-5.5c0-0.007,0-0.013,0-0.019c-0.165,0.012-0.331,0.019-0.5,0.019c-3.037,0-5.5-2.463-5.5-5.5 c0-3.037,2.463-5.5,5.5-5.5c0.169,0,0.335,0.007,0.5,0.019C12,2.487,14.463,0,17.5,0c3.037,0,5.5,2.463,5.5,5.5 c0,0.169-0.007,0.335-0.019,0.5C23.513,6.165,24,8.632,24,11.5C24,15.642,20.642,19,17.5,19z" />
                        <circle cx="14" cy="11" r="1.5" fill="#555" />
                        <circle cx="21" cy="11" r="1.5" fill="#555" />
                        <path d="M16 14 Q 17.5 16 19 14" stroke="#555" strokeWidth="1" fill="none" />
                      </svg>
                   </div>
                   {/* Current Fruit dangling */}
                   <div
                     className="absolute"
                     style={{
                       left: 40 - currentFruit.radius,
                       top: 45,
                       width: currentFruit.radius * 2,
                       height: currentFruit.radius * 2,
                     }}
                   >
                     <img
                       src={currentFruit.image}
                       className="w-full h-full object-contain"
                       alt="current"
                     />
                   </div>
                </div>
              </div>
            </>
          )}

          {!isGameStarted && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-b-xl">
              <button
                onClick={startGame}
                className="bg-[#f68b1f] hover:bg-[#e07a1b] text-white px-8 py-4 rounded-full font-bold text-xl flex items-center shadow-lg transform transition active:scale-95"
              >
                <Play className="mr-2" /> プレイ開始
              </button>
            </div>
          )}

          {isGameOver && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-b-xl text-white p-6">
              {!showRanking ? (
                <>
                  <h2 className="text-4xl font-black mb-2 text-[#f68b1f]">GAME OVER</h2>
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
                    onClick={() => setShowRanking(false)}
                    className="w-full bg-[#f68b1f] hover:bg-[#e07a1b] text-white px-6 py-3 rounded-full font-bold text-lg flex items-center justify-center"
                  >
                    閉じる
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Leaderboard Modal (when opened from main button) */}
          {showRanking && !isGameOver && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md rounded-b-xl text-white p-6">
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
                      <p className="text-center">ロード中...</p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowRanking(false)}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-full font-bold text-lg flex items-center justify-center"
                  >
                    閉じる
                  </button>
                </div>
            </div>
          )}
        </div>

        {isGameStarted && !isGameOver && (
          <div className="mt-12 flex flex-col items-center gap-4">
            <div className="text-[#8b4513] font-bold text-lg">
              自動落下まで: <span className="text-[#f68b1f] text-2xl font-black">{dropTimer}</span>秒
            </div>
            <button
              onClick={dropFruit}
              className="w-24 h-24 bg-red-500 hover:bg-red-600 border-b-8 border-red-800 text-white rounded-full font-bold text-xl shadow-xl transform transition active:scale-90 active:border-b-0 flex items-center justify-center"
            >
              落とす
            </button>
            {!isGyroEnabled && (
              <p className="text-[#8b4513]/60 text-sm italic mt-2 font-medium">※ジャイロ未検知。クリックで位置を移動できます。</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuikaGame;
