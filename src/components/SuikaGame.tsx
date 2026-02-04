import React, { useEffect, useRef, useState, useCallback } from "react";
import { PhysicsEngine } from "../game/PhysicsEngine";
import { FRUIT_TYPES } from "../game/fruits";
import type { FruitType } from "../game/fruits";
import { Play, Trophy, HelpCircle, Settings, X, Check, ExternalLink, Mail } from "lucide-react";
import { translations } from "../i18n/translations";
import type { Language } from "../i18n/translations";
import { THEMES } from "../theme/themes";
import type { Theme } from "../theme/themes";

const SuikaGame: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PhysicsEngine | null>(null);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [currentFruit, setCurrentFruit] = useState<FruitType>(FRUIT_TYPES[0]);
  const currentFruitRef = useRef<FruitType>(FRUIT_TYPES[0]);
  const [nextFruit, setNextFruit] = useState<FruitType>(FRUIT_TYPES[Math.floor(Math.random() * 5)]);
  const [launcherX, setLauncherX] = useState(300);
  const launcherXRef = useRef(300);
  const targetLauncherXRef = useRef(300);
  const currentTiltRef = useRef(0);
  const [dropTimer, setDropTimer] = useState(5);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isGyroEnabled, setIsGyroEnabled] = useState(false);
  const [ranking, setRanking] = useState<{ score: number }[]>([]);
  const [showRanking, setShowRanking] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lang, setLang] = useState<Language>("ja");
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES.find(t => t.id === 'classic') || THEMES[0]);
  const [isAssetsLoaded, setIsAssetsLoaded] = useState(false);

  const containerWidth = 600;
  const containerHeight = 850;
  const API_URL = import.meta.env.VITE_API_URL || "https://suika-ranking.your-subdomain.workers.dev";

  const t = translations[lang];

  // Preload Assets
  useEffect(() => {
    const preloadImages = async () => {
      const promises = FRUIT_TYPES.map((fruit) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.src = fruit.image;
          img.onload = resolve;
          img.onerror = reject;
        });
      });
      try {
        await Promise.all(promises);
        setIsAssetsLoaded(true);
      } catch (err) {
        console.error("Failed to preload assets", err);
        // Still set to true so game can at least try to run
        setIsAssetsLoaded(true);
      }
    };
    preloadImages();
  }, []);

  // Language & Theme Detection
  useEffect(() => {
    // Language
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

    // Theme
    const savedThemeId = localStorage.getItem("suika-theme");
    if (savedThemeId) {
      const theme = THEMES.find(th => th.id === savedThemeId);
      if (theme) setCurrentTheme(theme);
    }
  }, []);

  const changeLang = (l: Language) => {
    setLang(l);
    localStorage.setItem("suika-lang", l);
  };

  const changeTheme = (theme: Theme) => {
    setCurrentTheme(theme);
    localStorage.setItem("suika-theme", theme.id);
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
        // Movement logic: Constant speed when tilted beyond dead zone
        const deadZone = 7;
        const moveSpeed = 6;

        if (currentTiltRef.current > deadZone) {
          targetLauncherXRef.current += moveSpeed;
        } else if (currentTiltRef.current < -deadZone) {
          targetLauncherXRef.current -= moveSpeed;
        }

        // Clamp target position to screen bounds based on current fruit size
        const radius = currentFruitRef.current.radius;
        const minX = radius + 20;
        const maxX = containerWidth - radius - 20;
        if (targetLauncherXRef.current < minX) targetLauncherXRef.current = minX;
        if (targetLauncherXRef.current > maxX) targetLauncherXRef.current = maxX;

        // Linear Interpolation (Lerp) for smooth movement feel
        const lerpFactor = 0.2;
        launcherXRef.current += (targetLauncherXRef.current - launcherXRef.current) * lerpFactor;

        setLauncherX(launcherXRef.current);
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

      const { gamma } = event;
      if (gamma !== null) {
        currentTiltRef.current = gamma;

        // Gravity follows the tilt - enhanced sensitivity
        const gx = Math.sin((gamma * Math.PI) / 180) * 2.5;
        const gy = Math.cos((gamma * Math.PI) / 180) * 1.5;
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
    setLauncherX(300);
    launcherXRef.current = 300;
    targetLauncherXRef.current = 300;
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
    <div
      className="flex flex-col items-center min-h-screen font-sans overflow-x-hidden pb-20 transition-colors duration-500"
      style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}
    >
      {/* Top Header */}
      <div
        className="w-full py-3 flex items-center justify-between px-6 shadow-md mb-8 transition-colors duration-500"
        style={{ backgroundColor: currentTheme.header }}
      >
        <div className="flex flex-col">
          <div className="flex items-center text-white font-black text-2xl italic tracking-tighter">
            <div className="bg-green-600 rounded-full w-8 h-8 mr-2 flex items-center justify-center text-sm">🍉</div>
            {t.title}
          </div>
          <span className="text-white/60 text-[10px] font-bold tracking-widest ml-10 -mt-1">{t.subtitle}</span>
        </div>

        <div className="flex items-center gap-3">
           <div className="hidden md:flex bg-black/10 rounded-full p-1">
             {(["ja", "en", "zh", "ko"] as Language[]).map((l) => (
               <button
                 key={l}
                 onClick={() => changeLang(l)}
                 className={`px-2 py-1 text-xs font-bold rounded-full transition ${lang === l ? 'bg-white text-black' : 'text-white hover:bg-white/20'}`}
               >
                 {l.toUpperCase()}
               </button>
             ))}
           </div>
           <button onClick={() => setShowSettings(true)} className="text-white hover:text-white/80 transition transform active:rotate-90">
              <Settings className="w-6 h-6" />
           </button>
           <button onClick={() => setShowHowToPlay(true)} className="text-white hover:text-white/80" data-testid="help-button">
              <HelpCircle className="w-6 h-6" />
           </button>
        </div>
      </div>

      <div className="w-full max-w-[650px] px-4 relative flex flex-col items-center">
        {/* Top Controls Area */}
        <div className="flex justify-between w-full mb-10 items-center">
          {/* Score Bubble */}
          <div className="flex flex-col items-center">
             <span className="font-bold text-xl mb-1 opacity-80" style={{ color: currentTheme.text }}>{t.score}</span>
             <div
               className="w-24 h-24 rounded-full border-4 flex items-center justify-center shadow-inner transition-colors duration-500"
               style={{ backgroundColor: currentTheme.bubbleBg, borderColor: currentTheme.header }}
             >
                <span className="text-4xl font-black" style={{ color: currentTheme.text }}>{score}</span>
             </div>
          </div>

          {/* Leaderboard Button */}
          <button
            onClick={openRanking}
            className="px-6 py-3 rounded-xl font-black flex items-center shadow-lg transform transition active:scale-95 text-lg hover:brightness-110"
            style={{ backgroundColor: currentTheme.header, color: "white" }}
          >
            <Trophy className="w-5 h-5 mr-2" /> {t.leaderboard}
          </button>

          {/* Next Bubble */}
          <div className="flex flex-col items-center">
             <span className="font-bold text-xl mb-1 text-right w-full opacity-80" style={{ color: currentTheme.text }}>{t.next}</span>
             <div
               className="w-24 h-24 rounded-full border-4 flex items-center justify-center shadow-inner overflow-hidden transition-colors duration-500"
               style={{ backgroundColor: currentTheme.bubbleBg, borderColor: currentTheme.header }}
             >
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
          <div
            className="absolute inset-x-[-20px] bottom-[-20px] top-[120px] rounded-b-3xl border-[20px] pointer-events-none shadow-2xl transition-all duration-500"
            style={{ backgroundColor: currentTheme.boxBg, borderColor: currentTheme.boxBorder }}
          >
             <div className="absolute inset-0 border-[3px] border-white/20 rounded-xl"></div>
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
                targetLauncherXRef.current = newX;
              }
            }}
          />

          {!isGameOver && isGameStarted && (
            <>
              {/* Game Over Line */}
              <div
                className="absolute top-[120px] w-full h-[3px] bg-red-500/50 pointer-events-none z-20"
              />
              {/* Launcher Lane */}
              <div
                className="absolute top-0 w-full h-[120px] border-b-2 border-dashed border-white/20 pointer-events-none z-0"
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
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-b-2xl">
              {!isAssetsLoaded ? (
                <div className="flex flex-col items-center gap-4">
                   <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                   <span className="text-white font-bold tracking-widest uppercase">{t.loading}...</span>
                </div>
              ) : (
                <button
                  onClick={startGame}
                  className="hover:brightness-125 text-white px-10 py-5 rounded-full font-black text-2xl flex items-center shadow-lg transform transition active:scale-95 animate-in fade-in zoom-in duration-500"
                  style={{ backgroundColor: currentTheme.header }}
                >
                  <Play className="mr-3 w-8 h-8" /> {t.play_start}
                </button>
              )}
            </div>
          )}

          {isGameOver && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-b-2xl text-white p-8">
              {!showRanking ? (
                <>
                  <h2 className="text-5xl font-black mb-4 italic tracking-tighter" style={{ color: currentTheme.header }}>{t.game_over}</h2>
                  <p className="text-3xl mb-8 font-bold">{t.final_score}: {score}</p>
                  <button
                    onClick={submitScore}
                    disabled={isSubmitting}
                    className="hover:brightness-125 text-white px-8 py-4 rounded-full font-black text-xl flex items-center mb-6 disabled:opacity-50"
                    style={{ backgroundColor: currentTheme.header }}
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
                  <h2 className="text-3xl font-black mb-6 text-center" style={{ color: currentTheme.accent }}>{t.ranking_title}</h2>
                  <div className="bg-white/10 rounded-xl p-5 mb-8 border border-white/20">
                    {ranking.length > 0 ? (
                      ranking.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-3 border-b border-white/10 last:border-0">
                          <span className="font-bold text-lg" style={{ color: currentTheme.header }}>{index + 1}{t.rank_unit}</span>
                          <span className="text-2xl font-mono">{item.score.toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-4">{t.no_data}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowRanking(false)}
                    className="w-full hover:brightness-125 text-white px-8 py-4 rounded-full font-black text-xl flex items-center justify-center"
                    style={{ backgroundColor: currentTheme.header }}
                  >
                    {t.close}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Settings Modal (Themes) */}
          {showSettings && (
            <div className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-black/90 backdrop-blur-lg rounded-b-2xl text-white p-6">
               <div className="w-full max-w-[450px]">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-black italic tracking-tighter">{t.settings}</h2>
                    <button onClick={() => setShowSettings(false)} className="hover:text-red-500">
                       <X className="w-8 h-8" />
                    </button>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-xl font-bold mb-4 opacity-70">{t.select_theme}</h3>
                    <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                       {THEMES.map((theme) => (
                         <button
                           key={theme.id}
                           onClick={() => changeTheme(theme)}
                           className={`relative flex items-center p-3 rounded-xl border-2 transition-all ${currentTheme.id === theme.id ? 'border-white' : 'border-white/10 hover:border-white/30'}`}
                           style={{ backgroundColor: theme.bg }}
                         >
                            <div className="w-6 h-6 rounded-full border border-white/20 mr-3" style={{ backgroundColor: theme.header }}></div>
                            <span className="font-bold text-sm" style={{ color: theme.id === 'mono' ? '#333' : 'white' }}>{theme.name}</span>
                            {currentTheme.id === theme.id && (
                              <div className="absolute top-2 right-2">
                                <Check className="w-4 h-4 text-green-400" />
                              </div>
                            )}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                     {(["ja", "en", "zh", "ko"] as Language[]).map((l) => (
                       <button
                         key={l}
                         onClick={() => changeLang(l)}
                         className={`flex-1 py-2 rounded-lg font-bold border-2 transition ${lang === l ? 'bg-white text-black border-white' : 'border-white/20 hover:bg-white/10'}`}
                       >
                         {l.toUpperCase()}
                       </button>
                     ))}
                  </div>
               </div>
            </div>
          )}

          {/* Ranking Modal */}
          {showRanking && !isGameOver && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-b-2xl text-white p-8">
               <div className="w-full max-w-[350px]">
                  <h2 className="text-3xl font-black mb-6 text-center" style={{ color: currentTheme.accent }}>{t.ranking_title}</h2>
                  <div className="bg-white/10 rounded-xl p-5 mb-8 border border-white/20">
                    {ranking.length > 0 ? (
                      ranking.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-3 border-b border-white/10 last:border-0">
                          <span className="font-bold text-lg" style={{ color: currentTheme.header }}>{index + 1}{t.rank_unit}</span>
                          <span className="text-2xl font-mono">{item.score.toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-4">{t.loading}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowRanking(false)}
                    className="w-full hover:brightness-125 text-white px-8 py-4 rounded-full font-black text-xl flex items-center justify-center"
                    style={{ backgroundColor: currentTheme.header }}
                  >
                    {t.close}
                  </button>
                </div>
            </div>
          )}

          {/* How to Play Modal */}
          {showHowToPlay && (
            <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md rounded-b-2xl text-white p-6 overflow-y-auto">
               <div className="w-full max-w-[450px]">
                  <h2 className="text-3xl font-black mb-6 text-center italic tracking-tighter" style={{ color: currentTheme.header }}>{t.how_to_play}</h2>

                  <div className="space-y-6 mb-8 text-center">
                    <p className="text-lg leading-relaxed font-bold">{t.rule_desc}</p>
                    <p className="text-sm bg-white/10 p-3 rounded-lg italic border border-white/10">{t.controls}</p>

                    <div className="mt-8">
                       <h3 className="text-xl font-bold mb-4 opacity-70">{t.evolution_chart}</h3>
                       <div className="flex flex-wrap justify-center gap-2 bg-white/5 p-4 rounded-2xl border border-white/10">
                          {FRUIT_TYPES.map((fruit, i) => (
                            <React.Fragment key={fruit.name}>
                              <div className="flex flex-col items-center">
                                <img src={fruit.image} className="w-8 h-8 md:w-10 md:h-10 object-contain" alt={fruit.name} />
                                <span className="text-[10px] mt-1 opacity-60">{i+1}</span>
                              </div>
                              {i < FRUIT_TYPES.length - 1 && (
                                <span className="flex items-center text-white/30 font-bold">→</span>
                              )}
                            </React.Fragment>
                          ))}
                       </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/10 flex flex-col gap-4">
                     <a
                       href="https://otieu.com/4/10570616"
                       target="_blank"
                       rel="noopener noreferrer"
                       className="flex items-center justify-center gap-2 text-white/80 hover:text-white transition font-bold"
                     >
                        <ExternalLink className="w-4 h-4" /> {t.support_link}
                     </a>
                     <a
                       href="mailto:1ooamano1@gmail.com"
                       className="flex items-center justify-center gap-2 text-white/60 hover:text-white transition text-xs"
                     >
                        <Mail className="w-3 h-3" /> 1ooamano1@gmail.com
                     </a>
                  </div>

                  <button
                    onClick={() => setShowHowToPlay(false)}
                    className="w-full mt-8 hover:brightness-125 text-white px-8 py-4 rounded-full font-black text-xl flex items-center justify-center"
                    style={{ backgroundColor: currentTheme.header }}
                  >
                    {t.close}
                  </button>
                </div>
            </div>
          )}
        </div>

        {isGameStarted && !isGameOver && (
          <div className="mt-16 flex flex-col items-center gap-6 w-full max-w-[400px]">
            <div className="font-bold text-xl flex items-center gap-2">
              <span className="opacity-70">{t.auto_drop}</span>
              <span className="text-4xl font-black italic tracking-tighter" style={{ color: currentTheme.header }}>{dropTimer}</span>
              <span className="opacity-70">{t.seconds}</span>
            </div>

            {/* BIG PURGE BUTTON */}
            <button
              onClick={dropFruit}
              className="group relative w-full h-24 overflow-hidden rounded-2xl font-black text-3xl italic tracking-tighter transition-all transform active:scale-95 shadow-2xl"
              style={{ backgroundColor: currentTheme.header, color: "white" }}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="relative z-10 drop-shadow-lg">{t.drop_button}</span>
            </button>

            {!isGyroEnabled && (
              <p className="opacity-50 text-base italic mt-2 font-medium">{t.gyro_notice}</p>
            )}
          </div>
        )}

        {/* SEO Text Section */}
        <div
          className="mt-24 w-full border-t pt-10 px-4 transition-colors duration-500 flex flex-col md:flex-row justify-between gap-10"
          style={{ borderColor: currentTheme.header + "33" }}
        >
           <div className="flex-1">
           <h2 className="text-2xl font-black italic tracking-tighter mb-4" style={{ color: currentTheme.header }}>{t.title} - {t.how_to_play}</h2>
           <p className="mb-4 text-lg font-bold opacity-80">
             {t.rule_desc} {t.controls}
           </p>
           <div className="text-base leading-relaxed opacity-60">
             {lang === 'ja' && (
               <p>
                 進化した次世代スイカゲーム「CYBER SUIKA: FRUIT BURST」へようこそ。
                 本ゲームは、物理演算 Matter.js を使用した本格的なマージパズルです。
                 ジャイロセンサーを利用した重力操作や、10種類以上のカスタムカラーテーマを自由に切り替えられる機能を搭載。
                 世界ランキングでスコアを競い、サイバー空間で究極のスイカを合成しましょう。
               </p>
             )}
             {lang === 'en' && (
               <p>
                 Welcome to "CYBER SUIKA: FRUIT BURST," the evolved next-gen watermelon game.
                 Built with Matter.js physics, this game features intuitive gyro-based gravity controls
                 and 10+ customizable color themes. Compete on the global leaderboard and
                 merge your way to the ultimate watermelon in cyber space.
               </p>
             )}
             {/* Other languages omitted for brevity in SEO block but can be added back if needed */}
           </div>
           </div>

           <div className="flex flex-col gap-4 min-w-[200px]">
              <h3 className="font-black italic tracking-tighter text-xl" style={{ color: currentTheme.header }}>SUPPORT</h3>
              <a
                href="https://otieu.com/4/10570616"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 font-bold hover:underline"
              >
                <ExternalLink className="w-5 h-5" /> {t.support_link}
              </a>
              <a
                href="mailto:1ooamano1@gmail.com"
                className="flex items-center gap-2 opacity-60 hover:opacity-100 transition"
              >
                <Mail className="w-4 h-4" /> {t.contact}: 1ooamano1@gmail.com
              </a>
           </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
};

export default SuikaGame;
