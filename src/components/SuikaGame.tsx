import React, { useEffect, useRef, useState, useCallback } from "react";
import { PhysicsEngine } from "../game/PhysicsEngine";
import { FRUIT_TYPES } from "../game/fruits";
import type { FruitType } from "../game/fruits";
import { Play, Trophy, HelpCircle } from "lucide-react";
import { translations } from "../i18n/translations";
import type { Language } from "../i18n/translations";

const SuikaGame: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PhysicsEngine | null>(null);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [currentFruit, setCurrentFruit] = useState<FruitType>(FRUIT_TYPES[0]);
  const currentFruitRef = useRef<FruitType>(FRUIT_TYPES[0]);
  const [nextFruit, setNextFruit] = useState<FruitType>(FRUIT_TYPES[Math.floor(Math.random() * 5)]);
  const [launcherX, setLauncherX] = useState(270);
  const launcherXRef = useRef(270);
  const velocityRef = useRef(0);
  const [dropTimer, setDropTimer] = useState(5);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isGyroEnabled, setIsGyroEnabled] = useState(false);
  const [ranking, setRanking] = useState<{ score: number }[]>([]);
  const [showRanking, setShowRanking] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lang, setLang] = useState<Language>("ja");

  const containerWidth = 540;
  const containerHeight = 780;
  const API_URL = import.meta.env.VITE_API_URL || "https://suika-ranking.your-subdomain.workers.dev";

  const t = translations[lang];

  // Language Detection
  useEffect(() => {
    const savedLang = localStorage.getItem("suika-lang") as Language;
    if (savedLang && translations[savedLang]) {
      setLang(savedLang);
    } else {
      const browserLang = navigator.language.split("-")[0] as Language;
      if (translations[browserLang]) {
        setLang(browserLang);
      } else {
        setLang("en");
      }
    }
  }, []);

  const changeLang = (l: Language) => {
    setLang(l);
    localStorage.setItem("suika-lang", l);
  };

  const spawnNewFruit = useCallback(() => {
    setCurrentFruit(nextFruit);
    currentFruitRef.current = nextFruit;
    setNextFruit(FRUIT_TYPES[Math.floor(Math.random() * 5)]);
    setDropTimer(5);
  }, [nextFruit]);

  const dropFruit = useCallback(() => {
    if (!engineRef.current || isGameOver || !isGameStarted) return;

    engineRef.current.addFruit(launcherXRef.current, 120, currentFruitRef.current);
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
        velocityRef.current *= 0.90; // Slightly more damping for stability
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
        // Limited acceleration with sigmoid-like clamping for extreme tilts
        // Math.tanh(gamma / 30) gives a value between -1 and 1
        const tiltFactor = Math.tanh(gamma / 25);
        const accel = tiltFactor * 0.5; // Sensitivity
        velocityRef.current += accel;

        // Max speed limit (Reduced for better control as requested)
        const maxSpeed = 7;
        if (Math.abs(velocityRef.current) > maxSpeed) {
          velocityRef.current = maxSpeed * Math.sign(velocityRef.current);
        }

        // Gravity manipulation (Gentle shift)
        const gx = Math.sin((gamma * Math.PI) / 180) * 1.2;
        const gy = Math.cos((gamma * Math.PI) / 180) * 1.0;
        engineRef.current?.setGravity(gx, gy);
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
        () => setIsGameOver(true),
        containerWidth,
        containerHeight
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
    setLauncherX(270);
    launcherXRef.current = 270;
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
    <div className="flex flex-col items-center min-h-screen bg-[#f3c483] font-sans overflow-x-hidden pb-20">
      {/* Top Header */}
      <div className="w-full bg-[#f68b1f] py-3 flex items-center justify-between px-6 shadow-md mb-8">
        <div className="flex items-center text-white font-bold text-2xl italic">
          <div className="bg-green-600 rounded-full w-8 h-8 mr-2 flex items-center justify-center text-sm">🍉</div>
          {t.title}
        </div>

        <div className="flex items-center gap-3">
           <div className="flex bg-black/10 rounded-full p-1">
             {(["ja", "en", "zh", "ko"] as Language[]).map((l) => (
               <button
                 key={l}
                 onClick={() => changeLang(l)}
                 className={`px-2 py-1 text-xs font-bold rounded-full transition ${lang === l ? 'bg-white text-[#f68b1f]' : 'text-white hover:bg-white/20'}`}
               >
                 {l.toUpperCase()}
               </button>
             ))}
           </div>
           <button
             onClick={() => setShowHowToPlay(true)}
             className="text-white hover:text-white/80"
             data-testid="help-button"
           >
              <HelpCircle className="w-6 h-6" />
           </button>
        </div>
      </div>

      <div className="w-full max-w-[650px] px-4 relative flex flex-col items-center">
        {/* Top Controls Area */}
        <div className="flex justify-between w-full mb-10 items-center">
          {/* Score Bubble */}
          <div className="flex flex-col items-center">
             <span className="text-[#8b4513] font-bold text-xl mb-1">{t.score}</span>
             <div className="w-24 h-24 rounded-full bg-white/40 border-4 border-white/60 flex items-center justify-center shadow-inner">
                <span className="text-4xl font-black text-[#8b4513]">{score}</span>
             </div>
          </div>

          {/* Leaderboard Button */}
          <button
            onClick={openRanking}
            className="bg-[#f68b1f] hover:bg-[#e07a1b] text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-lg transform transition active:scale-95 text-lg"
          >
            <Trophy className="w-5 h-5 mr-2" /> {t.leaderboard}
          </button>

          {/* Next Bubble */}
          <div className="flex flex-col items-center">
             <span className="text-[#8b4513] font-bold text-xl mb-1 text-right w-full">{t.next}</span>
             <div className="w-24 h-24 rounded-full bg-white/40 border-4 border-white/60 flex items-center justify-center shadow-inner overflow-hidden">
                <img
                  src={nextFruit.image}
                  className="w-14 h-14 object-contain"
                  alt="next"
                />
             </div>
          </div>
        </div>

        {/* Game Area */}
        <div className="relative">
          {/* 3D Box Visual Effect */}
          <div className="absolute inset-x-[-20px] bottom-[-20px] top-[120px] bg-white/20 rounded-b-3xl border-[20px] border-[#e8d5b5]/80 pointer-events-none shadow-2xl">
             <div className="absolute inset-0 border-[3px] border-white/30 rounded-xl"></div>
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
          />

          {!isGameOver && isGameStarted && (
            <>
              {/* Game Over Line */}
              <div
                className="absolute top-[120px] w-full h-[3px] bg-red-400/50 pointer-events-none z-20"
              />
              {/* Launcher Lane */}
              <div
                className="absolute top-0 w-full h-[120px] border-b-2 border-dashed border-white/30 pointer-events-none z-0"
              />
              {/* Cloud Launcher Character */}
              <div
                className="absolute pointer-events-none transition-all duration-75 z-20"
                style={{
                  left: launcherX - 50,
                  top: 15,
                  width: 100,
                  height: 80,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                <div className="relative">
                   <div className="text-white drop-shadow-md">
                      <svg width="100" height="75" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
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
                       left: 50 - currentFruit.radius,
                       top: 55,
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
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-b-2xl">
              <button
                onClick={startGame}
                className="bg-[#f68b1f] hover:bg-[#e07a1b] text-white px-10 py-5 rounded-full font-bold text-2xl flex items-center shadow-lg transform transition active:scale-95"
              >
                <Play className="mr-3 w-8 h-8" /> {t.play_start}
              </button>
            </div>
          )}

          {isGameOver && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-b-2xl text-white p-8">
              {!showRanking ? (
                <>
                  <h2 className="text-5xl font-black mb-4 text-[#f68b1f]">{t.game_over}</h2>
                  <p className="text-3xl mb-8">{t.final_score}: {score}</p>
                  <button
                    onClick={submitScore}
                    disabled={isSubmitting}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-4 rounded-full font-bold text-xl flex items-center mb-6 disabled:opacity-50"
                  >
                    <Trophy className="mr-3" /> {isSubmitting ? t.submitting : t.submit_score}
                  </button>
                  <button
                    onClick={resetGame}
                    className="text-white text-lg underline opacity-80 hover:opacity-100"
                  >
                    {t.retry_without_save}
                  </button>
                </>
              ) : (
                <div className="w-full max-w-[350px]">
                  <h2 className="text-3xl font-black mb-6 text-center text-yellow-400">{t.ranking_title}</h2>
                  <div className="bg-white/10 rounded-xl p-5 mb-8">
                    {ranking.length > 0 ? (
                      ranking.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-3 border-b border-white/10 last:border-0">
                          <span className="font-bold text-yellow-500 text-lg">{index + 1}{t.rank_unit}</span>
                          <span className="text-2xl">{item.score.toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-4">{t.no_data}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowRanking(false)}
                    className="w-full bg-[#f68b1f] hover:bg-[#e07a1b] text-white px-8 py-4 rounded-full font-bold text-xl flex items-center justify-center"
                  >
                    {t.close}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Ranking Modal */}
          {showRanking && !isGameOver && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md rounded-b-2xl text-white p-8">
               <div className="w-full max-w-[350px]">
                  <h2 className="text-3xl font-black mb-6 text-center text-yellow-400">{t.ranking_title}</h2>
                  <div className="bg-white/10 rounded-xl p-5 mb-8">
                    {ranking.length > 0 ? (
                      ranking.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-3 border-b border-white/10 last:border-0">
                          <span className="font-bold text-yellow-500 text-lg">{index + 1}{t.rank_unit}</span>
                          <span className="text-2xl">{item.score.toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-4">{t.loading}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowRanking(false)}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-full font-bold text-xl flex items-center justify-center"
                  >
                    {t.close}
                  </button>
                </div>
            </div>
          )}

          {/* How to Play Modal */}
          {showHowToPlay && (
            <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-b-2xl text-white p-6 overflow-y-auto">
               <div className="w-full max-w-[450px]">
                  <h2 className="text-3xl font-black mb-6 text-center text-yellow-400">{t.how_to_play}</h2>

                  <div className="space-y-6 mb-8 text-center">
                    <p className="text-lg leading-relaxed">{t.rule_desc}</p>
                    <p className="text-sm bg-white/10 p-3 rounded-lg italic">{t.controls}</p>

                    <div className="mt-8">
                       <h3 className="text-xl font-bold mb-4 text-[#f68b1f]">{t.evolution_chart}</h3>
                       <div className="flex flex-wrap justify-center gap-2 bg-white/5 p-4 rounded-2xl">
                          {FRUIT_TYPES.map((fruit, i) => (
                            <React.Fragment key={fruit.name}>
                              <div className="flex flex-col items-center">
                                <img src={fruit.image} className="w-8 h-8 md:w-10 md:h-10 object-contain" alt={fruit.name} />
                                <span className="text-[10px] mt-1 opacity-60">{i+1}</span>
                              </div>
                              {i < FRUIT_TYPES.length - 1 && (
                                <span className="flex items-center text-yellow-500 font-bold">→</span>
                              )}
                            </React.Fragment>
                          ))}
                       </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowHowToPlay(false)}
                    className="w-full bg-[#f68b1f] hover:bg-[#e07a1b] text-white px-8 py-4 rounded-full font-bold text-xl flex items-center justify-center"
                  >
                    {t.close}
                  </button>
                </div>
            </div>
          )}
        </div>

        {isGameStarted && !isGameOver && (
          <div className="mt-16 flex flex-col items-center gap-6">
            <div className="text-[#8b4513] font-bold text-xl">
              {t.auto_drop} <span className="text-[#f68b1f] text-3xl font-black">{dropTimer}</span>{t.seconds}
            </div>
            <button
              onClick={dropFruit}
              className="w-28 h-28 bg-red-500 hover:bg-red-600 border-b-[10px] border-red-800 text-white rounded-full font-bold text-2xl shadow-2xl transform transition active:scale-90 active:border-b-0 flex items-center justify-center"
            >
              {t.drop_button}
            </button>
            {!isGyroEnabled && (
              <p className="text-[#8b4513]/60 text-base italic mt-2 font-medium">{t.gyro_notice}</p>
            )}
          </div>
        )}

        {/* SEO Text Section */}
        <div className="mt-24 w-full text-[#8b4513]/80 border-t border-[#8b4513]/20 pt-10 px-4">
           <h2 className="text-2xl font-bold mb-4">{t.title} - {t.how_to_play}</h2>
           <p className="mb-4 text-lg">
             {t.rule_desc} {t.controls}
           </p>
           <p className="text-base leading-relaxed">
             {lang === 'ja' && (
               <>
                 このスイカゲーム オンラインは、ブラウザで無料で遊べる物理パズルゲームです。チェリーから始まり、イチゴ、ブドウとフルーツを大きくしていき、最終的に大きなスイカを作ることを目指します。
                 スマートフォンのジャイロセンサー（傾き）に対応しており、直感的な操作感で楽しめます。世界中のプレイヤーとスコアを競い合い、リーダーボードのトップを目指しましょう！
                 落ち物パズルや合成ゲームが好きな方にぴったりの暇つぶしゲームです。
               </>
             )}
             {lang === 'en' && (
               <>
                 This Suika Game Online is a free physics puzzle game you can play in your browser. Start with a cherry and merge fruits like strawberries and grapes to eventually create a giant watermelon.
                 With smartphone gyro sensor support, you can enjoy intuitive tilt controls. Compete with players worldwide for the high score and climb the leaderboard!
                 Perfect for fans of falling object puzzles and merging games.
               </>
             )}
             {lang === 'zh' && (
               <>
                 这款合成大西瓜在线版是一款可以在浏览器中免费玩的物理拼图游戏。从樱桃开始，通过合并草莓、葡萄等水果，最终目标是合成一个巨大的西瓜。
                 支持智能手机陀螺仪（倾斜），带来直观的操作体验。与全球玩家竞争分数，力争登上排行榜榜首！
                 非常适合喜欢掉落消除类或合成类游戏的玩家消磨时间。
               </>
             )}
             {lang === 'ko' && (
               <>
                 이 수박 게임 온라인은 브라우저에서 무료로 즐길 수 있는 물리 퍼즐 게임입니다. 체리에서 시작해 딸기, 포도 등 과일을 합쳐 점점 크게 만들고, 최종적으로 거대한 수박을 만드는 것이 목표입니다.
                 스마트폰 자이로 센서(기울기)를 지원하여 직관적인 조작감을 느낄 수 있습니다. 전 세계 플레이어들과 점수를 경쟁하고 리더보드 상위에 이름을 올려보세요!
                 퍼즐이나 합성 게임을 좋아하는 분들께 최고의 킬링타임 게임입니다.
               </>
             )}
           </p>
        </div>
      </div>
    </div>
  );
};

export default SuikaGame;
