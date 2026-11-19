import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Trophy } from 'lucide-react';
import { audioManager } from './game/audio/AudioManager';
import {
  characterManager,
  player1CharacterManager,
  player2CharacterManager,
} from './game/character/CharacterManager';
import { Game, GameUIState } from './game/Game';
import { achievementManager, AchievementRecord } from './game/progression/AchievementManager';
import {
  leaderboardManager,
  LeaderboardPlayerEntry,
  MatchHistoryEntry,
} from './game/progression/LeaderboardManager';
import { GameStats, statsManager } from './game/progression/StatsManager';
import { pwaManager } from './game/pwa/PWAManager';
import { GameSettings, settingsManager } from './game/settings/SettingsManager';
import {
  loadStoredPlayerNames,
  MatchFormat,
  PlayerSlot,
  resetStoredPlayerNames,
  saveStoredPlayerNames,
} from './game/TwoPlayerMatch';
import { AboutPanel } from './ui/AboutPanel';
import { AchievementCollectionUI } from './ui/AchievementCollectionUI';
import { AchievementPopup } from './ui/AchievementPopup';
import { CharacterCustomization } from './ui/CharacterCustomization';
import { CountdownOverlay } from './ui/CountdownOverlay';
import { GameOverOverlay } from './ui/GameOverOverlay';
import { LeaderboardUI } from './ui/LeaderboardUI';
import { MainMenu } from './ui/MainMenu';
import { MatchResultOverlay } from './ui/MatchResultOverlay';
import { OfflineIndicator } from './ui/OfflineIndicator';
import { PauseOverlay } from './ui/PauseOverlay';
import { PrivacyModal } from './ui/PrivacyModal';
import { PWAUpdateBanner } from './ui/PWAUpdateBanner';
import { RoundResultOverlay } from './ui/RoundResultOverlay';
import { SettingsUI } from './ui/SettingsUI';
import { SplashScreen } from './ui/SplashScreen';
import { StatsUI } from './ui/StatsUI';
import { TurnTransitionOverlay } from './ui/TurnTransitionOverlay';
import { TwoPlayerGameOverOverlay } from './ui/TwoPlayerGameOverOverlay';
import { TwoPlayerSetup } from './ui/TwoPlayerSetup';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const [customFaceImg, setCustomFaceImg] = useState<HTMLImageElement | null>(() =>
    characterManager.getImage()
  );
  const [player1FaceImg, setPlayer1FaceImg] = useState<HTMLImageElement | null>(() =>
    player1CharacterManager.getImage()
  );
  const [player2FaceImg, setPlayer2FaceImg] = useState<HTMLImageElement | null>(() =>
    player2CharacterManager.getImage()
  );
  const [charEditorTarget, setCharEditorTarget] = useState<'default' | 'player1' | 'player2'>(
    'default'
  );
  const [twoPlayerDraftNames, setTwoPlayerDraftNames] = useState(() => loadStoredPlayerNames());
  const [settings, setSettings] = useState<GameSettings>(() => settingsManager.getSettings());
  const [achievements, setAchievements] = useState<AchievementRecord[]>(() =>
    achievementManager.getAll()
  );
  const [stats, setStats] = useState<GameStats>(() => statsManager.getStats());
  const [leaderboardPlayers, setLeaderboardPlayers] = useState<LeaderboardPlayerEntry[]>(() =>
    leaderboardManager.getTopPlayers()
  );
  const [matchHistory, setMatchHistory] = useState<MatchHistoryEntry[]>(() =>
    leaderboardManager.getMatchHistory()
  );
  const [achievementQueue, setAchievementQueue] = useState<AchievementRecord[]>([]);
  const [showNewBestBanner, setShowNewBestBanner] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const showPrivacyModalRef = useRef(false);
  const charEditorTargetRef = useRef<'default' | 'player1' | 'player2'>('default');

  useEffect(() => {
    showPrivacyModalRef.current = showPrivacyModal;
  }, [showPrivacyModal]);

  useEffect(() => {
    charEditorTargetRef.current = charEditorTarget;
  }, [charEditorTarget]);

  const [uiState, setUiState] = useState<GameUIState>({
    state: 'MAIN_MENU',
    score: 0,
    bestScore: 0,
    isNewBest: false,
    newBestEventId: 0,
    difficultyTier: 'easy',
    difficultyLabel: 'EASY',
    isGameOverPanelReady: false,
    gameOverReaction: null,
    countdownStep: null,
    activePlayerSlot: null,
    twoPlayerMatch: null,
    isTwoPlayerPaused: false,
  });

  const consumeCurrentAchievement = useCallback(() => {
    setAchievementQueue((prev) => prev.slice(1));
  }, []);

  // Initialize PWA lifecycle & service worker
  useEffect(() => {
    pwaManager.init();
  }, []);

  // Manage Screen Wake Lock during active flight (1P or 2P)
  useEffect(() => {
    const isFlying =
      uiState.state === 'PLAYING' ||
      uiState.state === 'PLAYER_1_PLAYING' ||
      uiState.state === 'PLAYER_2_PLAYING';
    if (isFlying) {
      pwaManager.requestWakeLock().catch(() => {});
    } else {
      pwaManager.releaseWakeLock().catch(() => {});
    }
  }, [uiState.state]);

  // Subscribe to settings, achievements, and stats
  useEffect(() => {
    const unsubSettings = settingsManager.subscribe((next) => {
      setSettings(next);
      gameRef.current?.setPerformanceMode(next.performanceMode);
    });
    const unsubAchievements = achievementManager.subscribe((list) => {
      setAchievements(list);
    });
    const unsubStats = statsManager.subscribe((nextStats) => {
      setStats(nextStats);
    });
    const unsubLeaderboard = leaderboardManager.subscribe(() => {
      setLeaderboardPlayers(leaderboardManager.getTopPlayers());
      setMatchHistory(leaderboardManager.getMatchHistory());
    });
    return () => {
      unsubSettings();
      unsubAchievements();
      unsubStats();
      unsubLeaderboard();
    };
  }, []);

  // Trigger non-blocking NEW BEST! celebration banner once per run
  useEffect(() => {
    if (uiState.newBestEventId <= 0) return;
    setShowNewBestBanner(true);
    const timer = window.setTimeout(() => {
      setShowNewBestBanner(false);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [uiState.newBestEventId]);

  // Clear temporary HUD banner if player exits gameplay
  useEffect(() => {
    if (uiState.state !== 'PLAYING') {
      setShowNewBestBanner(false);
    }
  }, [uiState.state]);

  // Unlock Web Audio cleanly on first user interaction and mark menu music desired
  useEffect(() => {
    audioManager.startMusic();
    const handleFirstUnlock = () => {
      audioManager.unlock();
      window.removeEventListener('pointerdown', handleFirstUnlock);
      window.removeEventListener('keydown', handleFirstUnlock);
    };
    window.addEventListener('pointerdown', handleFirstUnlock, { passive: true });
    window.addEventListener('keydown', handleFirstUnlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstUnlock);
      window.removeEventListener('keydown', handleFirstUnlock);
    };
  }, []);

  // Load persisted custom faces (1P + 2P slots) from IndexedDB and complete brief splash transition
  useEffect(() => {
    let active = true;
    let splashTimer: number | null = null;
    const unsubscribeDefault = characterManager.subscribe((img) => {
      setCustomFaceImg(img);
      gameRef.current?.setCustomFaceImage(img);
    });
    const unsubscribeP1 = player1CharacterManager.subscribe((img) => {
      setPlayer1FaceImg(img);
      gameRef.current?.setPlayerCustomFaceImage(1, img);
    });
    const unsubscribeP2 = player2CharacterManager.subscribe((img) => {
      setPlayer2FaceImg(img);
      gameRef.current?.setPlayerCustomFaceImage(2, img);
    });

    const minDelay = new Promise<void>((resolve) => {
      splashTimer = window.setTimeout(resolve, 380);
    });
    Promise.all([
      characterManager.init().catch(() => null),
      player1CharacterManager.init().catch(() => null),
      player2CharacterManager.init().catch(() => null),
      minDelay,
    ]).finally(() => {
      if (active) {
        setShowSplash(false);
      }
    });

    return () => {
      active = false;
      if (splashTimer !== null) {
        window.clearTimeout(splashTimer);
      }
      unsubscribeDefault();
      unsubscribeP1();
      unsubscribeP2();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new Game(
      canvas,
      (next) => {
        setUiState(next);
      },
      (newlyUnlocked) => {
        setAchievementQueue((prev) => [...prev, ...newlyUnlocked]);
      }
    );
    game.setPerformanceMode(settingsManager.getSettings().performanceMode);
    const activeFace = characterManager.getImage();
    if (activeFace) {
      game.setCustomFaceImage(activeFace);
    }
    const p1Face = player1CharacterManager.getImage();
    if (p1Face) {
      game.setPlayerCustomFaceImage(1, p1Face);
    }
    const p2Face = player2CharacterManager.getImage();
    if (p2Face) {
      game.setPlayerCustomFaceImage(2, p2Face);
    }
    gameRef.current = game;
    game.start();

    const handleResize = () => {
      game.resize();
    };
    window.addEventListener('resize', handleResize);

    const ro = new ResizeObserver(() => {
      game.resize();
    });
    ro.observe(canvas);

    const handlePauseKeys = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        const currentState = game.getState();
        if (
          currentState === 'PLAYING' ||
          currentState === 'PLAYER_1_PLAYING' ||
          currentState === 'PLAYER_2_PLAYING'
        ) {
          e.preventDefault();
          audioManager.playButton();
          game.pause();
        } else if (currentState === 'PAUSED') {
          e.preventDefault();
          audioManager.playButton();
          game.resume();
        }
      }
    };
    window.addEventListener('keydown', handlePauseKeys);

    const autoPauseOnLeave = () => {
      const currentState = game.getState();
      if (
        currentState === 'PLAYING' ||
        currentState === 'PLAYER_1_PLAYING' ||
        currentState === 'PLAYER_2_PLAYING'
      ) {
        game.pause();
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        autoPauseOnLeave();
        pwaManager.releaseWakeLock().catch(() => {});
      }
    };

    const handleBackAction = () => {
      if (showPrivacyModalRef.current) {
        setShowPrivacyModal(false);
        return;
      }
      const currentState = game.getState();
      if (
        currentState === 'PLAYING' ||
        currentState === 'PLAYER_1_PLAYING' ||
        currentState === 'PLAYER_2_PLAYING'
      ) {
        audioManager.playButton();
        game.pause();
      } else if (currentState === 'PAUSED') {
        audioManager.playButton();
        game.resume();
      } else if (currentState === 'CHARACTER_EDITOR') {
        audioManager.playButton();
        game.setMenuState(
          charEditorTargetRef.current === 'default' ? 'MAIN_MENU' : 'TWO_PLAYER_SETUP'
        );
      } else if (
        currentState === 'TWO_PLAYER_SETUP' ||
        currentState === 'LEADERBOARD' ||
        currentState === 'ACHIEVEMENTS' ||
        currentState === 'STATS' ||
        currentState === 'SETTINGS' ||
        currentState === 'ABOUT' ||
        currentState === 'READY' ||
        currentState === 'GAME_OVER' ||
        currentState === 'MATCH_RESULT'
      ) {
        audioManager.playButton();
        game.setMenuState('MAIN_MENU');
      }
    };

    const handleCordovaBackButton = (e: Event) => {
      e.preventDefault?.();
      handleBackAction();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('backbutton', handleCordovaBackButton);
    window.addEventListener('blur', autoPauseOnLeave);
    window.addEventListener('pagehide', autoPauseOnLeave);

    const capApp = (
      window as Window & {
        Capacitor?: {
          Plugins?: {
            App?: {
              addListener?: (
                eventName: string,
                cb: () => void
              ) => Promise<{ remove: () => void }> | { remove: () => void };
            };
          };
        };
      }
    ).Capacitor?.Plugins?.App;

    let capBackHandle: { remove: () => void } | null = null;
    if (capApp && typeof capApp.addListener === 'function') {
      try {
        const res = capApp.addListener('backButton', handleBackAction);
        if (res && typeof (res as Promise<{ remove: () => void }>).then === 'function') {
          (res as Promise<{ remove: () => void }>)
            .then((handle) => {
              capBackHandle = handle;
            })
            .catch(() => {});
        } else if (res && typeof (res as { remove: () => void }).remove === 'function') {
          capBackHandle = res as { remove: () => void };
        }
      } catch {
        // Capacitor App plugin optional in web mode
      }
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('backbutton', handleCordovaBackButton);
      capBackHandle?.remove?.();
      window.removeEventListener('blur', autoPauseOnLeave);
      window.removeEventListener('pagehide', autoPauseOnLeave);
      window.removeEventListener('keydown', handlePauseKeys);
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const personalRecordTitle = achievementManager.getHighestMilestoneName(
    Math.max(uiState.bestScore, stats.bestScore)
  );
  const isGameplayPausedCapable =
    uiState.state === 'PLAYING' ||
    uiState.state === 'PLAYER_1_PLAYING' ||
    uiState.state === 'PLAYER_2_PLAYING';
  const isFlightOrCountdown =
    isGameplayPausedCapable ||
    uiState.state === 'READY' ||
    uiState.state === 'PLAYER_1_READY' ||
    uiState.state === 'PLAYER_2_READY';

  const activeEditorManager =
    charEditorTarget === 'player1'
      ? player1CharacterManager
      : charEditorTarget === 'player2'
        ? player2CharacterManager
        : characterManager;
  const activeEditorFaceImg =
    charEditorTarget === 'player1'
      ? player1FaceImg
      : charEditorTarget === 'player2'
        ? player2FaceImg
        : customFaceImg;
  const activeSlotBadge =
    charEditorTarget === 'player1'
      ? ({ label: 'PLAYER 1', tone: 'blue' } as const)
      : charEditorTarget === 'player2'
        ? ({ label: 'PLAYER 2', tone: 'rose' } as const)
        : null;

  return (
    <main className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-gradient-to-b from-[#49B4FF] via-[#69C9FF] to-[#9BE4FF]">
      <SplashScreen visible={showSplash} />

      {/* Responsive Portrait Arcade Stage (400:720 logical ratio) */}
      <div
        className="relative overflow-hidden bg-[#69C9FF] sm:rounded-[30px] sm:border-[4px] sm:border-[#24415C] sm:shadow-[0_14px_0_rgba(36,65,92,0.2),0_28px_60px_rgba(36,65,92,0.28)]"
        style={{
          width: 'min(100vw, calc(100dvh * 400 / 720))',
          height: 'min(100dvh, calc(100vw * 720 / 400))',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ touchAction: 'none' }}
          className="block h-full w-full cursor-pointer"
        />

        {/* NON-INTRUSIVE OFFLINE INDICATOR */}
        <OfflineIndicator />

        {/* PWA UPDATE NOTIFICATION (SUPPRESSED DURING ACTIVE FLIGHT) */}
        <PWAUpdateBanner isPlaying={isFlightOrCountdown} />

        {/* NON-BLOCKING ACHIEVEMENT UNLOCK POPUP */}
        <AchievementPopup
          queue={achievementQueue}
          onConsumeCurrent={consumeCurrentAchievement}
        />

        {/* NON-BLOCKING NEW BEST HUD CELEBRATION */}
        {uiState.state === 'PLAYING' && showNewBestBanner && (
          <div className="pointer-events-none absolute top-24 left-1/2 z-20 -translate-x-1/2">
            <div className="anim-panel-pop inline-flex items-center gap-1.5 rounded-full border-2 border-[#24415C] bg-[#FFD84D] px-4 py-1 text-xs font-black tracking-wide text-[#24415C] shadow-[0_3px_0_#24415C,0_0_16px_rgba(255,216,77,0.75)]">
              <Trophy className="h-3.5 w-3.5" />
              <span>NEW BEST!</span>
            </div>
          </div>
        )}

        {/* DIFFICULTY TIER BADGE DURING GAMEPLAY */}
        {uiState.state === 'PLAYING' && (
          <div className="pointer-events-none absolute top-4 left-4 z-20">
            <span
              className={`inline-flex items-center rounded-xl border-2 border-[#24415C] px-2.5 py-1 text-[10px] font-black tracking-wider shadow-[0_2px_0_#24415C] ${
                uiState.difficultyTier === 'easy'
                  ? 'bg-emerald-200 text-[#24415C]'
                  : uiState.difficultyTier === 'medium'
                    ? 'bg-sky-200 text-[#24415C]'
                    : uiState.difficultyTier === 'hard'
                      ? 'bg-[#FFD84D] text-[#24415C]'
                      : 'bg-[#FF6B6B] text-white'
              }`}
            >
              {uiState.difficultyLabel}
            </span>
          </div>
        )}

        {/* ACTIVE 2-PLAYER HUD BADGE DURING GAMEPLAY */}
        {(uiState.state === 'PLAYER_1_PLAYING' || uiState.state === 'PLAYER_2_PLAYING') &&
          uiState.twoPlayerMatch && (
            <div className="pointer-events-none absolute top-4 left-4 z-20 max-w-[240px]">
              <div
                className={`inline-flex items-center gap-1.5 rounded-xl border-2 border-[#24415C] px-2.5 py-1 text-[10px] font-black tracking-wider text-white shadow-[0_2px_0_#24415C] ${
                  uiState.state === 'PLAYER_1_PLAYING' ? 'bg-[#3998F7]' : 'bg-[#FF6B6B]'
                }`}
              >
                {uiState.twoPlayerMatch.maxRounds > 1 && (
                  <span className="rounded bg-[#24415C]/25 px-1">
                    R{uiState.twoPlayerMatch.currentRound}/{uiState.twoPlayerMatch.maxRounds}
                  </span>
                )}
                <span>{uiState.state === 'PLAYER_1_PLAYING' ? 'P1' : 'P2'}</span>
                <span className="opacity-70">·</span>
                <span className="truncate">
                  {uiState.state === 'PLAYER_1_PLAYING'
                    ? uiState.twoPlayerMatch.player1Name
                    : uiState.twoPlayerMatch.player2Name}
                </span>
              </div>
            </div>
          )}

        {/* MAIN MENU */}
        {uiState.state === 'MAIN_MENU' && (
          <div className="absolute inset-0 z-20">
            <MainMenu
              bestScore={uiState.bestScore}
              unlockedCount={unlockedCount}
              totalAchievements={achievements.length}
              customFaceImg={customFaceImg}
              onPlay={() => gameRef.current?.startReady()}
              onTwoPlayer={() => {
                const current = loadStoredPlayerNames();
                const updated = saveStoredPlayerNames(
                  current.player1Name,
                  current.player2Name,
                  'quick'
                );
                setTwoPlayerDraftNames(updated);
                gameRef.current?.setMenuState('TWO_PLAYER_SETUP');
              }}
              onTournament={() => {
                const current = loadStoredPlayerNames();
                const tournamentFmt: MatchFormat =
                  current.preferredFormat === 'bo5' ? 'bo5' : 'bo3';
                const updated = saveStoredPlayerNames(
                  current.player1Name,
                  current.player2Name,
                  tournamentFmt
                );
                setTwoPlayerDraftNames(updated);
                gameRef.current?.setMenuState('TWO_PLAYER_SETUP');
              }}
              onLeaderboard={() => gameRef.current?.setMenuState('LEADERBOARD')}
              onChangeFace={() => {
                setCharEditorTarget('default');
                gameRef.current?.setMenuState('CHARACTER_EDITOR');
              }}
              onAchievements={() => gameRef.current?.setMenuState('ACHIEVEMENTS')}
              onStats={() => gameRef.current?.setMenuState('STATS')}
              onSettings={() => gameRef.current?.setMenuState('SETTINGS')}
              onAbout={() => gameRef.current?.setMenuState('ABOUT')}
            />
          </div>
        )}

        {/* 2 PLAYER / TOURNAMENT LOBBY SETUP */}
        {uiState.state === 'TWO_PLAYER_SETUP' && (
          <div className="absolute inset-0 z-20">
            <TwoPlayerSetup
              initialPlayer1Name={twoPlayerDraftNames.player1Name}
              initialPlayer2Name={twoPlayerDraftNames.player2Name}
              initialFormat={twoPlayerDraftNames.preferredFormat}
              player1FaceImg={player1FaceImg}
              player2FaceImg={player2FaceImg}
              onEditFace={(
                slot: PlayerSlot,
                p1Name: string,
                p2Name: string,
                format: MatchFormat
              ) => {
                const saved = saveStoredPlayerNames(p1Name, p2Name, format);
                setTwoPlayerDraftNames(saved);
                setCharEditorTarget(slot === 1 ? 'player1' : 'player2');
                gameRef.current?.setMenuState('CHARACTER_EDITOR');
              }}
              onStartMatch={(p1Name, p2Name, format) => {
                const saved = saveStoredPlayerNames(p1Name, p2Name, format);
                setTwoPlayerDraftNames(saved);
                gameRef.current?.startTwoPlayerMatch(
                  saved.player1Name,
                  saved.player2Name,
                  saved.preferredFormat
                );
              }}
              onBack={() => gameRef.current?.setMenuState('MAIN_MENU')}
            />
          </div>
        )}

        {/* CHARACTER CUSTOMIZATION (DEFAULT OR 2P PLAYER SLOT) */}
        {uiState.state === 'CHARACTER_EDITOR' && (
          <div className="absolute inset-0 z-20">
            <CharacterCustomization
              key={charEditorTarget}
              customFaceImg={activeEditorFaceImg}
              targetManager={activeEditorManager}
              slotBadge={activeSlotBadge}
              onBack={() =>
                gameRef.current?.setMenuState(
                  charEditorTarget === 'default' ? 'MAIN_MENU' : 'TWO_PLAYER_SETUP'
                )
              }
            />
          </div>
        )}

        {/* LEADERBOARD & MATCH HISTORY SCREEN */}
        {uiState.state === 'LEADERBOARD' && (
          <div className="absolute inset-0 z-20">
            <LeaderboardUI
              players={leaderboardPlayers}
              history={matchHistory}
              singlePlayerBest={Math.max(uiState.bestScore, stats.bestScore)}
              onBack={() => gameRef.current?.setMenuState('MAIN_MENU')}
            />
          </div>
        )}

        {/* ACHIEVEMENTS SCREEN */}
        {uiState.state === 'ACHIEVEMENTS' && (
          <div className="absolute inset-0 z-20">
            <AchievementCollectionUI
              achievements={achievements}
              bestScore={uiState.bestScore}
              onBack={() => gameRef.current?.setMenuState('MAIN_MENU')}
            />
          </div>
        )}

        {/* STATS SCREEN */}
        {uiState.state === 'STATS' && (
          <div className="absolute inset-0 z-20">
            <StatsUI
              stats={stats}
              bestScore={uiState.bestScore}
              unlockedAchievements={unlockedCount}
              totalAchievements={achievements.length}
              personalRecordTitle={personalRecordTitle}
              onBack={() => gameRef.current?.setMenuState('MAIN_MENU')}
            />
          </div>
        )}

        {/* SETTINGS SCREEN */}
        {uiState.state === 'SETTINGS' && (
          <div className="absolute inset-0 z-20">
            <SettingsUI
              settings={settings}
              onChangeFace={() => {
                setCharEditorTarget('default');
                gameRef.current?.setMenuState('CHARACTER_EDITOR');
              }}
              onResetProgression={() => gameRef.current?.resetProgression()}
              onResetAllData={async () => {
                gameRef.current?.resetProgression();
                settingsManager.resetToDefaults();
                leaderboardManager.reset();
                resetStoredPlayerNames();
                setTwoPlayerDraftNames(loadStoredPlayerNames());
                await Promise.all([
                  characterManager.removePhoto(),
                  player1CharacterManager.removePhoto(),
                  player2CharacterManager.removePhoto(),
                ]);
              }}
              onOpenPrivacy={() => setShowPrivacyModal(true)}
              onOpenAbout={() => gameRef.current?.setMenuState('ABOUT')}
              onBack={() => gameRef.current?.setMenuState('MAIN_MENU')}
            />
          </div>
        )}

        {/* ABOUT SCREEN */}
        {uiState.state === 'ABOUT' && (
          <div className="absolute inset-0 z-20">
            <AboutPanel onBack={() => gameRef.current?.setMenuState('MAIN_MENU')} />
          </div>
        )}

        {/* PRIVACY POLICY MODAL */}
        {showPrivacyModal && <PrivacyModal onClose={() => setShowPrivacyModal(false)} />}

        {/* TOP-RIGHT PAUSE BUTTON DURING GAMEPLAY (1P OR 2P) */}
        {isGameplayPausedCapable && (
          <button
            type="button"
            aria-label="Pause Game"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              audioManager.playButton();
              gameRef.current?.pause();
            }}
            className="btn-base btn-icon absolute top-4 right-4 z-20"
          >
            <Pause className="h-5 w-5 fill-[#24415C] text-[#24415C]" />
          </button>
        )}

        {/* 2 PLAYER COUNTDOWN (3-2-1-GO!) */}
        {(uiState.state === 'PLAYER_1_READY' || uiState.state === 'PLAYER_2_READY') &&
          uiState.twoPlayerMatch && (
            <CountdownOverlay
              playerSlot={uiState.state === 'PLAYER_1_READY' ? 1 : 2}
              playerName={
                uiState.state === 'PLAYER_1_READY'
                  ? uiState.twoPlayerMatch.player1Name
                  : uiState.twoPlayerMatch.player2Name
              }
              currentRound={uiState.twoPlayerMatch.currentRound}
              maxRounds={uiState.twoPlayerMatch.maxRounds}
              step={uiState.countdownStep}
            />
          )}

        {/* PAUSE OVERLAY */}
        {uiState.state === 'PAUSED' && (
          <PauseOverlay
            onResume={() => gameRef.current?.resume()}
            onRestart={() => gameRef.current?.restart()}
            onHome={() => gameRef.current?.setMenuState('MAIN_MENU')}
          />
        )}

        {/* SINGLE PLAYER GAME OVER OVERLAY */}
        {uiState.state === 'GAME_OVER' && uiState.isGameOverPanelReady && (
          <GameOverOverlay
            score={uiState.score}
            bestScore={uiState.bestScore}
            isNewBest={uiState.isNewBest}
            reaction={uiState.gameOverReaction}
            onRetry={() => gameRef.current?.restart()}
            onHome={() => gameRef.current?.setMenuState('MAIN_MENU')}
          />
        )}

        {/* 2 PLAYER ROUND GAME OVER OVERLAY */}
        {(uiState.state === 'PLAYER_1_GAME_OVER' || uiState.state === 'PLAYER_2_GAME_OVER') &&
          uiState.isGameOverPanelReady &&
          uiState.twoPlayerMatch && (
            <TwoPlayerGameOverOverlay
              playerSlot={uiState.state === 'PLAYER_1_GAME_OVER' ? 1 : 2}
              playerName={
                uiState.state === 'PLAYER_1_GAME_OVER'
                  ? uiState.twoPlayerMatch.player1Name
                  : uiState.twoPlayerMatch.player2Name
              }
              currentRound={uiState.twoPlayerMatch.currentRound}
              maxRounds={uiState.twoPlayerMatch.maxRounds}
              score={uiState.score}
              reaction={uiState.gameOverReaction}
              onContinue={() => {
                if (uiState.state === 'PLAYER_1_GAME_OVER') {
                  gameRef.current?.continueFromPlayer1GameOver();
                } else {
                  gameRef.current?.continueFromPlayer2GameOver();
                }
              }}
            />
          )}

        {/* TURN TRANSITION: GILIRAN PLAYER 2! */}
        {uiState.state === 'PLAYER_2_TRANSITION' && uiState.twoPlayerMatch && (
          <TurnTransitionOverlay
            player1Name={uiState.twoPlayerMatch.player1Name}
            player1Score={uiState.twoPlayerMatch.player1Score ?? 0}
            player2Name={uiState.twoPlayerMatch.player2Name}
            player2FaceImg={player2FaceImg}
            currentRound={uiState.twoPlayerMatch.currentRound}
            maxRounds={uiState.twoPlayerMatch.maxRounds}
            player1Wins={uiState.twoPlayerMatch.player1Wins}
            player2Wins={uiState.twoPlayerMatch.player2Wins}
            onStartTurn={() => gameRef.current?.startPlayer2Turn()}
          />
        )}

        {/* TOURNAMENT BETWEEN-ROUND SUMMARY */}
        {uiState.state === 'ROUND_RESULT' && uiState.twoPlayerMatch && (
          <RoundResultOverlay
            match={uiState.twoPlayerMatch}
            onNextRound={() => gameRef.current?.startNextTournamentRound()}
          />
        )}

        {/* 2 PLAYER MATCH RESULT SCOREBOARD */}
        {uiState.state === 'MATCH_RESULT' && uiState.twoPlayerMatch && (
          <MatchResultOverlay
            match={uiState.twoPlayerMatch}
            player1FaceImg={player1FaceImg}
            player2FaceImg={player2FaceImg}
            winnerWinStreak={
              uiState.twoPlayerMatch.winner === 'player1'
                ? (leaderboardManager.getPlayerStats(
                    uiState.twoPlayerMatch.player1Name,
                    'PLAYER 1'
                  )?.currentWinStreak ?? 0)
                : uiState.twoPlayerMatch.winner === 'player2'
                  ? (leaderboardManager.getPlayerStats(
                      uiState.twoPlayerMatch.player2Name,
                      'PLAYER 2'
                    )?.currentWinStreak ?? 0)
                  : 0
            }
            onRematch={() => gameRef.current?.rematchTwoPlayer()}
            onChangePlayer={() => {
              if (uiState.twoPlayerMatch) {
                setTwoPlayerDraftNames({
                  player1Name: uiState.twoPlayerMatch.player1Name,
                  player2Name: uiState.twoPlayerMatch.player2Name,
                  preferredFormat: uiState.twoPlayerMatch.format,
                });
              }
              gameRef.current?.setMenuState('TWO_PLAYER_SETUP');
            }}
            onMainMenu={() => gameRef.current?.setMenuState('MAIN_MENU')}
          />
        )}
      </div>
    </main>
  );
}
