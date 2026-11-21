import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Trophy } from 'lucide-react';
import { audioManager } from './game/audio/AudioManager';
import { characterFavorites } from './game/character/CharacterFavorites';
import {
  characterManager,
  player1CharacterManager,
  player2CharacterManager,
} from './game/character/CharacterManager';
import { characterRandomizer } from './game/character/CharacterRandomizer';
import { CharacterDefinition } from './game/character/CharacterRegistry';
import { characterSkinManager, SkinId } from './game/character/CharacterSkinManager';
import { CharacterSlot } from './game/character/CharacterStorage';
import { CharacterMetrics, characterUnlockManager } from './game/character/CharacterUnlockManager';
import { Game, GameUIState } from './game/Game';
import { competitiveManager } from './game/competitive/CompetitiveManager';
import {
  CompetitiveNotificationItem,
  CompetitiveSnapshot,
} from './game/competitive/CompetitiveTypes';
import { rewardShopManager } from './game/achievements/RewardShopManager';
import { currencyManager, CurrencySnapshot } from './game/powerups/CurrencyManager';
import {
  achievementManager,
  AchievementRecord,
  AchievementSnapshot,
} from './game/progression/AchievementManager';
import {
  leaderboardManager,
  LeaderboardPlayerEntry,
  MatchHistoryEntry,
} from './game/progression/LeaderboardManager';
import { playerProgressionManager } from './game/progression/PlayerProgressionManager';
import {
  LevelUpEvent,
  PlayerProgressProfile,
  ProgressionProfileId,
  XPNotificationItem,
} from './game/progression/PlayerProgressTypes';
import { GameStats, statsManager } from './game/progression/StatsManager';
import { getTitleById } from './game/progression/TitleRegistry';
import { missionManager } from './game/missions/MissionManager';
import {
  MissionCompletionNotification,
  MissionSnapshot,
} from './game/missions/MissionTypes';
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
import { CharacterCollectionScreen } from './ui/CharacterCollectionScreen';
import { CharacterCustomization } from './ui/CharacterCustomization';
import { CharacterProfileScreen } from './ui/CharacterProfileScreen';
import { CharacterSelectScreen } from './ui/CharacterSelectScreen';
import { CharacterUnlockPopup } from './ui/CharacterUnlockPopup';
import { CompetitiveHubScreen } from './ui/CompetitiveHubScreen';
import { CompetitiveNotificationToast } from './ui/CompetitiveNotificationToast';
import { CountdownOverlay } from './ui/CountdownOverlay';
import { GameOverOverlay } from './ui/GameOverOverlay';
import { LeaderboardUI } from './ui/LeaderboardUI';
import { LevelUpOverlay } from './ui/LevelUpOverlay';
import { MainMenu } from './ui/MainMenu';
import { MatchResultOverlay } from './ui/MatchResultOverlay';
import { MissionCenterScreen } from './ui/MissionCenterScreen';
import { MissionNotificationToast } from './ui/MissionNotificationToast';
import { OfflineIndicator } from './ui/OfflineIndicator';
import { PauseOverlay } from './ui/PauseOverlay';
import { PersonalBestPopup } from './ui/PersonalBestPopup';
import { PlayerProfileScreen } from './ui/PlayerProfileScreen';
import { PlayerProgressionScreen, ProgressionTab } from './ui/PlayerProgressionScreen';
import { PowerUpHUD } from './ui/PowerUpHUD';
import { PowerUpNotification } from './ui/PowerUpNotification';
import { PrivacyModal } from './ui/PrivacyModal';
import { PWAUpdateBanner } from './ui/PWAUpdateBanner';
import { ReviveDialog } from './ui/ReviveDialog';
import { RoundResultOverlay } from './ui/RoundResultOverlay';
import { SettingsUI } from './ui/SettingsUI';
import { SplashScreen } from './ui/SplashScreen';
import { StatsUI } from './ui/StatsUI';
import { TurnTransitionOverlay } from './ui/TurnTransitionOverlay';
import { TwoPlayerGameOverOverlay } from './ui/TwoPlayerGameOverOverlay';
import { TwoPlayerSetup } from './ui/TwoPlayerSetup';
import { WorldCollectionScreen } from './ui/WorldCollectionScreen';
import { WorldSelectScreen } from './ui/WorldSelectScreen';
import { WorldUnlockPopup } from './ui/WorldUnlockPopup';
import { XPNotificationToast } from './ui/XPNotificationToast';
import { WorldDefinition, WorldId } from './game/worlds/WorldRegistry';
import { worldUnlockManager } from './game/worlds/WorldUnlockManager';

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
  const [charEditorTarget, setCharEditorTarget] = useState<CharacterSlot>('default');
  const [selectReturnState, setSelectReturnState] = useState<
    'MAIN_MENU' | 'TWO_PLAYER_SETUP' | 'CHARACTER_COLLECTION'
  >('MAIN_MENU');
  const [selectFocusCharId, setSelectFocusCharId] = useState<string | null>(null);
  const [profileTarget, setProfileTarget] = useState<{
    character: CharacterDefinition;
    slot: CharacterSlot;
  } | null>(null);
  const [, setCollectionVersion] = useState(0);
  const [twoPlayerDraftNames, setTwoPlayerDraftNames] = useState(() => loadStoredPlayerNames());
  const [settings, setSettings] = useState<GameSettings>(() => settingsManager.getSettings());
  const [achievementSnapshot, setAchievementSnapshot] = useState<AchievementSnapshot>(() =>
    achievementManager.getSnapshot()
  );
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
  const [currency, setCurrency] = useState<CurrencySnapshot>(() => currencyManager.getSnapshot());
  const [missionSnapshot, setMissionSnapshot] = useState<MissionSnapshot>(() =>
    missionManager.getSnapshot()
  );
  const [soloProfile, setSoloProfile] = useState<PlayerProgressProfile>(() =>
    playerProgressionManager.getProfile('solo')
  );
  const [p1Profile, setP1Profile] = useState<PlayerProgressProfile>(() =>
    playerProgressionManager.getProfile('player1')
  );
  const [p2Profile, setP2Profile] = useState<PlayerProgressProfile>(() =>
    playerProgressionManager.getProfile('player2')
  );
  const [xpToastQueue, setXpToastQueue] = useState<XPNotificationItem[]>(() =>
    playerProgressionManager.getPendingXPNotifications()
  );
  const [levelUpQueue, setLevelUpQueue] = useState<LevelUpEvent[]>(() =>
    playerProgressionManager.getPendingLevelUps()
  );
  const [progressionInitialTab, setProgressionInitialTab] = useState<ProgressionTab>('rewards');
  const [missionQueue, setMissionQueue] = useState<MissionCompletionNotification[]>([]);
  const [competitiveSnapshot, setCompetitiveSnapshot] = useState<CompetitiveSnapshot>(() =>
    competitiveManager.getSnapshot()
  );
  const [competitiveNotifications, setCompetitiveNotifications] = useState<
    CompetitiveNotificationItem[]
  >(() => competitiveManager.getPendingNotifications());
  const [achievementQueue, setAchievementQueue] = useState<AchievementRecord[]>([]);
  const [characterUnlockQueue, setCharacterUnlockQueue] = useState<CharacterDefinition[]>([]);
  const [worldUnlockQueue, setWorldUnlockQueue] = useState<WorldDefinition[]>([]);
  const [worldReturnState, setWorldReturnState] = useState<
    'MAIN_MENU' | 'TWO_PLAYER_SETUP' | 'SETTINGS'
  >('MAIN_MENU');
  const [worldFocusId, setWorldFocusId] = useState<WorldId | null>(null);
  const [showNewBestBanner, setShowNewBestBanner] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const showPrivacyModalRef = useRef(false);
  const profileOpenRef = useRef(false);
  const charEditorTargetRef = useRef<CharacterSlot>('default');
  const selectReturnStateRef = useRef<'MAIN_MENU' | 'TWO_PLAYER_SETUP' | 'CHARACTER_COLLECTION'>(
    'MAIN_MENU'
  );
  const worldReturnStateRef = useRef<'MAIN_MENU' | 'TWO_PLAYER_SETUP' | 'SETTINGS'>('MAIN_MENU');

  useEffect(() => {
    showPrivacyModalRef.current = showPrivacyModal;
  }, [showPrivacyModal]);

  useEffect(() => {
    profileOpenRef.current = profileTarget !== null;
  }, [profileTarget]);

  useEffect(() => {
    charEditorTargetRef.current = charEditorTarget;
  }, [charEditorTarget]);

  useEffect(() => {
    selectReturnStateRef.current = selectReturnState;
  }, [selectReturnState]);

  useEffect(() => {
    worldReturnStateRef.current = worldReturnState;
  }, [worldReturnState]);

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
    activeCharacterId: 'classic_bird',
    activeSkinId: 'default',
    activeWorldId: 'green_valley',
    activeWeather: 'sunny',
    activePowerUps: [],
    reviveRemainingSec: 0,
    latestPowerUpBanner: null,
    runCoinsCollected: 0,
    runGemsCollected: 0,
    runXPGained: 0,
    activeChallenge: null,
    runDurationSec: 0,
    selectedRival: competitiveManager.rivals.getSelectedRival(0),
    competitiveBestScore: competitiveManager.getEffectiveBestScore(),
    previousRunScore: competitiveManager.history.getPreviousRunScore() ?? 0,
  });

  const consumeCurrentAchievement = useCallback(() => {
    setAchievementQueue((prev) => prev.slice(1));
  }, []);

  const enqueueAchievements = useCallback((list: AchievementRecord[]) => {
    if (!list || list.length === 0) return;
    setAchievementQueue((prev) => {
      const seen = new Set(prev.map((a) => a.id));
      const added = list.filter((a) => !seen.has(a.id));
      return added.length > 0 ? [...prev, ...added] : prev;
    });
  }, []);

  const consumeCurrentMissionNotification = useCallback(() => {
    setMissionQueue((prev) => prev.slice(1));
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
      gameRef.current?.syncEnvironmentSettings();
    });
    const unsubAchievements = achievementManager.subscribeSnapshot((snap) => {
      setAchievementSnapshot(snap);
      setAchievements(snap.records);
    });
    const unsubStats = statsManager.subscribe((nextStats) => {
      setStats(nextStats);
    });
    const unsubLeaderboard = leaderboardManager.subscribe(() => {
      setLeaderboardPlayers(leaderboardManager.getTopPlayers());
      setMatchHistory(leaderboardManager.getMatchHistory());
    });
    const bumpCollection = () => {
      setCollectionVersion((v) => v + 1);
      gameRef.current?.syncExternalVisuals();
    };
    const unsubUnlocks = characterUnlockManager.subscribe(bumpCollection);
    const unsubWorlds = worldUnlockManager.subscribe(bumpCollection);
    const unsubSkins = characterSkinManager.subscribe(bumpCollection);
    const unsubFavs = characterFavorites.subscribe(() => setCollectionVersion((v) => v + 1));
    const unsubRand = characterRandomizer.subscribe(() => setCollectionVersion((v) => v + 1));
    const unsubCurrency = currencyManager.subscribe((snap) => setCurrency(snap));
    const unsubMissions = missionManager.subscribe((snap) => setMissionSnapshot(snap));
    const unsubMissionNotes = missionManager.subscribeNotifications((note) => {
      if (settingsManager.getSettings().missionNotificationsEnabled) {
        setMissionQueue((prev) => [...prev, note]);
      }
    });
    const unsubProgression = playerProgressionManager.subscribe(() => {
      setSoloProfile(playerProgressionManager.getProfile('solo'));
      setP1Profile(playerProgressionManager.getProfile('player1'));
      setP2Profile(playerProgressionManager.getProfile('player2'));
    });
    const unsubProgressionQueues = playerProgressionManager.subscribeQueues(() => {
      setXpToastQueue(playerProgressionManager.getPendingXPNotifications());
      setLevelUpQueue(playerProgressionManager.getPendingLevelUps());
    });
    const unsubCompetitive = competitiveManager.subscribe((snap) => {
      setCompetitiveSnapshot(snap);
    });
    const unsubCompetitiveNotes = competitiveManager.subscribeNotifications((items) => {
      setCompetitiveNotifications(items);
    });
    return () => {
      unsubSettings();
      unsubAchievements();
      unsubStats();
      unsubLeaderboard();
      unsubUnlocks();
      unsubWorlds();
      unsubSkins();
      unsubFavs();
      unsubRand();
      unsubCurrency();
      unsubMissions();
      unsubMissionNotes();
      unsubProgression();
      unsubProgressionQueues();
      unsubCompetitive();
      unsubCompetitiveNotes();
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

  // Clear temporary HUD banner if player exits gameplay & track explored menus for Curious Bird achievement
  useEffect(() => {
    if (uiState.state !== 'PLAYING') {
      setShowNewBestBanner(false);
    }
    const menuScreens = new Set([
      'WORLD_SELECT',
      'WORLD_COLLECTION',
      'CHARACTER_COLLECTION',
      'CHARACTER_SELECT',
      'MISSION_CENTER',
      'COMPETITIVE_HUB',
      'PLAYER_PROFILE',
      'PLAYER_PROGRESSION',
      'ACHIEVEMENTS',
      'LEADERBOARD',
      'STATS',
      'SETTINGS',
      'ABOUT',
    ]);
    if (menuScreens.has(uiState.state)) {
      const unlocked = achievementManager.recordEvent({
        type: 'menu_visited',
        menuId: uiState.state,
      });
      enqueueAchievements(unlocked);
    }
  }, [uiState.state, enqueueAchievements]);

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
        enqueueAchievements(newlyUnlocked);
      },
      (newlyUnlockedChars) => {
        setCharacterUnlockQueue((prev) => [...prev, ...newlyUnlockedChars]);
      },
      (newlyUnlockedWorlds) => {
        setWorldUnlockQueue((prev) => [...prev, ...newlyUnlockedWorlds]);
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
      if (profileOpenRef.current) {
        setProfileTarget(null);
        return;
      }
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
      } else if (currentState === 'REVIVE_PROMPT') {
        audioManager.playButton();
        game.declineRevive();
      } else if (currentState === 'PAUSED') {
        audioManager.playButton();
        game.resume();
      } else if (currentState === 'CHARACTER_EDITOR') {
        audioManager.playButton();
        game.setMenuState(
          charEditorTargetRef.current === 'default' ? 'MAIN_MENU' : 'TWO_PLAYER_SETUP'
        );
      } else if (currentState === 'CHARACTER_SELECT') {
        audioManager.playButton();
        game.setMenuState(selectReturnStateRef.current);
      } else if (currentState === 'WORLD_COLLECTION') {
        audioManager.playButton();
        game.setMenuState('WORLD_SELECT');
      } else if (currentState === 'WORLD_SELECT') {
        audioManager.playButton();
        game.setMenuState(worldReturnStateRef.current);
      } else if (
        currentState === 'CHARACTER_COLLECTION' ||
        currentState === 'TWO_PLAYER_SETUP' ||
        currentState === 'LEADERBOARD' ||
        currentState === 'ACHIEVEMENTS' ||
        currentState === 'MISSION_CENTER' ||
        currentState === 'COMPETITIVE_HUB' ||
        currentState === 'PLAYER_PROGRESSION' ||
        currentState === 'PLAYER_PROFILE' ||
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

  const unlockedCount = achievementSnapshot.stats.unlockedAchievements;
  const showcaseRecords = achievementSnapshot.showcaseIds
    .map((id) => achievementSnapshot.records.find((r) => r.id === id && r.unlocked))
    .filter((r): r is AchievementRecord => Boolean(r));
  const personalRecordTitle = achievementManager.getHighestMilestoneName(
    Math.max(uiState.bestScore, stats.bestScore)
  );
  const isGameplayPausedCapable =
    uiState.state === 'PLAYING' ||
    uiState.state === 'PLAYER_1_PLAYING' ||
    uiState.state === 'PLAYER_2_PLAYING';
  const isFlightOrCountdown =
    isGameplayPausedCapable ||
    uiState.state === 'REVIVE_PROMPT' ||
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

  const defaultSelection = characterUnlockManager.getSelection('default');
  const p1Selection = characterUnlockManager.getSelection('player1');
  const p2Selection = characterUnlockManager.getSelection('player2');
  const defaultSkinId = characterSkinManager.getSelectedSkin('default');
  const p1SkinId = characterSkinManager.getSelectedSkin('player1');
  const p2SkinId = characterSkinManager.getSelectedSkin('player2');
  const collectionSummary = characterUnlockManager.getCollectionSummary();
  const worldSummary = worldUnlockManager.getCollectionSummary();
  const activeWorldId = worldUnlockManager.getSelectedWorldId();
  const unlockMetrics: CharacterMetrics = {
    bestScore: Math.max(uiState.bestScore, stats.bestScore),
    totalGamesPlayed: stats.totalGamesPlayed,
    tournamentsWon: leaderboardPlayers.reduce((sum, p) => sum + p.wins, 0),
    bestWinStreak: leaderboardPlayers.reduce((max, p) => Math.max(max, p.bestWinStreak), 0),
    unlockedAchievements: unlockedCount,
    totalAchievements: achievements.length,
  };
  const activeEditorSkinId = characterSkinManager.getSelectedSkin(charEditorTarget);

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
          suppressed={isFlightOrCountdown}
          enabled={settings.achievementNotificationsEnabled}
          animationEnabled={settings.achievementUnlockAnimationEnabled}
          badgeEffectsEnabled={settings.achievementBadgeEffectsEnabled}
          reducedMotion={settings.reducedMotion}
          onConsumeCurrent={consumeCurrentAchievement}
        />

        {/* NON-BLOCKING QUEUED MISSION COMPLETION TOAST */}
        <MissionNotificationToast
          queue={missionQueue}
          enabled={settings.missionNotificationsEnabled}
          suppressed={achievementQueue.length > 0}
          isPlaying={isFlightOrCountdown}
          onConsumeCurrent={consumeCurrentMissionNotification}
          onOpenMissionCenter={() => gameRef.current?.setMenuState('MISSION_CENTER')}
        />

        {/* NON-BLOCKING XP NOTIFICATION TOAST */}
        <XPNotificationToast
          queue={xpToastQueue}
          enabled={settings.xpNotificationsEnabled}
          suppressed={achievementQueue.length > 0 || missionQueue.length > 0}
          isPlaying={isFlightOrCountdown}
          onConsumeCurrent={(id) => playerProgressionManager.consumeXPNotification(id)}
        />

        {/* NON-BLOCKING COMPETITIVE NOTIFICATION TOAST */}
        <CompetitiveNotificationToast
          queue={competitiveNotifications}
          enabled={settings.competitiveNotificationsEnabled}
          suppressed={
            achievementQueue.length > 0 ||
            missionQueue.length > 0 ||
            xpToastQueue.length > 0
          }
          isPlaying={isFlightOrCountdown}
          reducedMotion={settings.reducedMotion}
          onConsumeCurrent={(id) => competitiveManager.consumeNotification(id)}
          onOpenHub={() => gameRef.current?.setMenuState('COMPETITIVE_HUB')}
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

        {/* POWER-UP & COLLECTIBLE GAMEPLAY HUD */}
        {isGameplayPausedCapable && (
          <PowerUpHUD
            activePowerUps={uiState.activePowerUps}
            runCoins={uiState.runCoinsCollected}
            runGems={uiState.runGemsCollected}
            collectiblesEnabled={settings.collectiblesEnabled}
          />
        )}

        {/* COMPACT LIVE RIVAL & CHALLENGE HUD STRIP (SOLO / CHALLENGE ONLY) */}
        {uiState.state === 'PLAYING' && (
          <div className="pointer-events-none absolute top-16 right-4 z-20 flex flex-col items-end gap-1">
            {uiState.activeChallenge && (
              <div className="rounded-xl border-2 border-[#24415C] bg-[#FFF9DB]/95 px-2.5 py-0.5 text-[10px] font-black text-[#24415C] shadow-[0_2px_0_#24415C]">
                🎯 {uiState.activeChallenge.title} ·{' '}
                <span className="tabular-nums text-[#0369A1]">
                  {uiState.activeChallenge.metric === 'duration_sec'
                    ? `${Math.floor(uiState.runDurationSec)}/${uiState.activeChallenge.targetValue}s`
                    : uiState.activeChallenge.metric === 'coins'
                      ? `${uiState.runCoinsCollected}/${uiState.activeChallenge.targetValue}`
                      : `${uiState.score}/${uiState.activeChallenge.targetValue}`}
                </span>
              </div>
            )}
            <div className="rounded-xl border-2 border-[#24415C] bg-white/90 px-2 py-0.5 text-[9px] font-black tabular-nums text-[#24415C] shadow-[0_2px_0_#24415C]">
              {uiState.selectedRival.name.replace(' [AI]', '')}:{' '}
              <span
                className={
                  uiState.score > uiState.selectedRival.targetScore
                    ? 'text-emerald-600'
                    : 'text-[#FF6B6B]'
                }
              >
                {uiState.score}/{uiState.selectedRival.targetScore}
              </span>
            </div>
          </div>
        )}

        {/* BRIEF NON-BLOCKING POWER-UP ACTIVATION BANNER */}
        <PowerUpNotification
          banner={uiState.latestPowerUpBanner}
          visible={isGameplayPausedCapable}
        />

        {/* MAIN MENU */}
        {uiState.state === 'MAIN_MENU' && (
          <div className="absolute inset-0 z-20">
            <MainMenu
              bestScore={uiState.bestScore}
              unlockedCount={unlockedCount}
              totalAchievements={achievements.length}
              customFaceImg={customFaceImg}
              activeCharacterId={defaultSelection.characterId}
              activeSkinId={defaultSkinId}
              isCustomFaceActive={
                defaultSelection.mode === 'custom_face' && Boolean(customFaceImg)
              }
              collectionUnlockedCount={collectionSummary.unlockedCount}
              collectionTotalCount={collectionSummary.totalCount}
              hasLegendTitle={collectionSummary.hasLegendTitle}
              activeWorldId={activeWorldId}
              worldUnlockedCount={worldSummary.unlockedCount}
              worldTotalCount={worldSummary.totalCount}
              hasWorldExplorerBadge={worldSummary.hasWorldExplorerBadge}
              coins={currency.coins}
              gems={currency.gems}
              unclaimedMissions={missionSnapshot.unclaimed.total}
              missionReminderEnabled={settings.missionReminderEnabled}
              equippedMissionTitle={missionSnapshot.cosmetics.equippedTitle}
              equippedMissionFrame={soloProfile.equippedFrameId}
              playerLevel={soloProfile.currentLevel}
              playerRankName={soloProfile.rank.name}
              playerRankIcon={soloProfile.rank.icon}
              playerTitleName={getTitleById(soloProfile.equippedTitleId).name}
              unclaimedLevelRewards={playerProgressionManager.getUnclaimedRewardLevels('solo').length}
              showcaseRecords={showcaseRecords}
              achievementPoints={achievementSnapshot.stats.earnedAchievementPoints}
              achievementRankLabel={achievementSnapshot.stats.rank.label}
              badgeEffectsEnabled={settings.achievementBadgeEffectsEnabled}
              reducedMotion={settings.reducedMotion}
              competitiveRankLabel={competitiveSnapshot.rank.label}
              competitiveRankColor={competitiveSnapshot.rank.colorHex}
              competitivePoints={competitiveSnapshot.rank.points}
              unclaimedChallenges={competitiveManager.challenges.getUnclaimedCount()}
              onCompetitiveHub={() => {
                competitiveManager.ensureCurrentPeriods();
                gameRef.current?.setMenuState('COMPETITIVE_HUB');
              }}
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
              onWorlds={() => {
                setWorldFocusId(activeWorldId);
                setWorldReturnState('MAIN_MENU');
                gameRef.current?.setMenuState('WORLD_SELECT');
              }}
              onMissions={() => {
                missionManager.ensureCurrentPeriods();
                gameRef.current?.setMenuState('MISSION_CENTER');
              }}
              onProfile={() => gameRef.current?.setMenuState('PLAYER_PROFILE')}
              onProgression={() => {
                setProgressionInitialTab('rewards');
                gameRef.current?.setMenuState('PLAYER_PROGRESSION');
              }}
              onCharacters={() => {
                setCharEditorTarget('default');
                gameRef.current?.setMenuState('CHARACTER_COLLECTION');
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

        {/* WORLD SELECT SCREEN */}
        {uiState.state === 'WORLD_SELECT' && (
          <div className="absolute inset-0 z-20">
            <WorldSelectScreen
              selectedWorldId={activeWorldId}
              focusWorldId={worldFocusId}
              weatherEnabled={settings.weatherEnabled}
              dynamicSkyEnabled={settings.dynamicSkyEnabled}
              metrics={unlockMetrics}
              onSelectWorld={(id) => {
                worldUnlockManager.selectWorld(id);
                gameRef.current?.syncEnvironmentSettings();
              }}
              onSelectWeather={(id, w) => {
                worldUnlockManager.setWeatherForWorld(id, w);
                gameRef.current?.syncEnvironmentSettings();
              }}
              onPlayNow={() => {
                if (worldReturnState === 'TWO_PLAYER_SETUP') {
                  gameRef.current?.setMenuState('TWO_PLAYER_SETUP');
                } else {
                  gameRef.current?.startReady();
                }
              }}
              onOpenCollection={() => gameRef.current?.setMenuState('WORLD_COLLECTION')}
              onOpenEnvSettings={() => gameRef.current?.setMenuState('SETTINGS')}
              onBack={() => gameRef.current?.setMenuState(worldReturnState)}
            />
          </div>
        )}

        {/* WORLD COLLECTION SCREEN */}
        {uiState.state === 'WORLD_COLLECTION' && (
          <div className="absolute inset-0 z-20">
            <WorldCollectionScreen
              selectedWorldId={activeWorldId}
              metrics={unlockMetrics}
              onInspectWorld={(id) => {
                setWorldFocusId(id);
                gameRef.current?.setMenuState('WORLD_SELECT');
              }}
              onBack={() => gameRef.current?.setMenuState('WORLD_SELECT')}
            />
          </div>
        )}

        {/* CHARACTER COLLECTION SCREEN */}
        {uiState.state === 'CHARACTER_COLLECTION' && (
          <div className="absolute inset-0 z-20">
            <CharacterCollectionScreen
              selection={defaultSelection}
              selectedSkinId={defaultSkinId}
              customFaceImg={customFaceImg}
              favorites={characterFavorites.getFavorites('default')}
              randomEveryRun={characterRandomizer.isRandomEveryRun('default')}
              metrics={unlockMetrics}
              onSelectGameCharacter={(id) => {
                characterUnlockManager.selectGameCharacter(id, 'default');
              }}
              onSelectCustomFaceMode={() => {
                characterUnlockManager.selectCustomFaceMode('default');
              }}
              onOpenCustomFaceEditor={() => {
                setCharEditorTarget('default');
                gameRef.current?.setMenuState('CHARACTER_EDITOR');
              }}
              onSelectSkin={(skinId: SkinId) => {
                characterSkinManager.selectSkin(skinId, 'default');
                enqueueAchievements(achievementManager.recordEvent({ type: 'skin_equipped', skinId }));
              }}
              onToggleFavorite={(id) => {
                characterFavorites.toggleFavorite(id, 'default');
              }}
              onToggleRandomEveryRun={() => {
                characterRandomizer.toggleRandomEveryRun('default');
              }}
              onOpenProfile={(char) => {
                setProfileTarget({ character: char, slot: 'default' });
              }}
              onOpenSelectScreen={(focusId) => {
                setCharEditorTarget('default');
                setSelectFocusCharId(focusId ?? null);
                setSelectReturnState('CHARACTER_COLLECTION');
                gameRef.current?.setMenuState('CHARACTER_SELECT');
              }}
              onBack={() => gameRef.current?.setMenuState('MAIN_MENU')}
            />
          </div>
        )}

        {/* CHARACTER SELECT SCREEN (1P OR P1 / P2 SLOT) */}
        {uiState.state === 'CHARACTER_SELECT' && (
          <div className="absolute inset-0 z-20">
            <CharacterSelectScreen
              key={charEditorTarget}
              slot={charEditorTarget}
              slotBadge={activeSlotBadge}
              selection={characterUnlockManager.getSelection(charEditorTarget)}
              selectedSkinId={characterSkinManager.getSelectedSkin(charEditorTarget)}
              customFaceImg={activeEditorFaceImg}
              favorites={characterFavorites.getFavorites(charEditorTarget)}
              randomEveryRun={characterRandomizer.isRandomEveryRun(charEditorTarget)}
              metrics={unlockMetrics}
              initialFocusId={selectFocusCharId}
              onSelectGameCharacter={(id) => {
                characterUnlockManager.selectGameCharacter(id, charEditorTarget);
              }}
              onSelectCustomFaceMode={() => {
                characterUnlockManager.selectCustomFaceMode(charEditorTarget);
              }}
              onOpenCustomFaceEditor={() => {
                gameRef.current?.setMenuState('CHARACTER_EDITOR');
              }}
              onSelectSkin={(skinId: SkinId) => {
                characterSkinManager.selectSkin(skinId, charEditorTarget);
                enqueueAchievements(achievementManager.recordEvent({ type: 'skin_equipped', skinId }));
              }}
              onToggleFavorite={(id) => {
                characterFavorites.toggleFavorite(id, charEditorTarget);
              }}
              onToggleRandomEveryRun={() => {
                characterRandomizer.toggleRandomEveryRun(charEditorTarget);
              }}
              onOpenProfile={(char) => {
                setProfileTarget({ character: char, slot: charEditorTarget });
              }}
              onBack={() => gameRef.current?.setMenuState(selectReturnState)}
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
              player1Selection={p1Selection}
              player2Selection={p2Selection}
              player1SkinId={p1SkinId}
              player2SkinId={p2SkinId}
              activeWorldId={activeWorldId}
              onChangeWorld={(p1Name, p2Name, format) => {
                const saved = saveStoredPlayerNames(p1Name, p2Name, format);
                setTwoPlayerDraftNames(saved);
                setWorldFocusId(activeWorldId);
                setWorldReturnState('TWO_PLAYER_SETUP');
                gameRef.current?.setMenuState('WORLD_SELECT');
              }}
              onSelectCharacter={(
                slot: PlayerSlot,
                p1Name: string,
                p2Name: string,
                format: MatchFormat
              ) => {
                const saved = saveStoredPlayerNames(p1Name, p2Name, format);
                setTwoPlayerDraftNames(saved);
                const slotKey: CharacterSlot = slot === 1 ? 'player1' : 'player2';
                setCharEditorTarget(slotKey);
                setSelectFocusCharId(characterUnlockManager.getSelection(slotKey).characterId);
                setSelectReturnState('TWO_PLAYER_SETUP');
                gameRef.current?.setMenuState('CHARACTER_SELECT');
              }}
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
              activeSkinId={activeEditorSkinId}
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
              onOpenCompetitiveHub={() => {
                competitiveManager.ensureCurrentPeriods();
                gameRef.current?.setMenuState('COMPETITIVE_HUB');
              }}
              onBack={() => gameRef.current?.setMenuState('MAIN_MENU')}
            />
          </div>
        )}

        {/* COMPETITIVE HUB SCREEN */}
        {uiState.state === 'COMPETITIVE_HUB' && (
          <div className="absolute inset-0 z-20">
            <CompetitiveHubScreen
              snapshot={competitiveSnapshot}
              singlePlayerBest={Math.max(uiState.bestScore, stats.bestScore)}
              onStartChallenge={(challengeId) => {
                gameRef.current?.startChallenge(challengeId);
              }}
              onPlayQuickDuel={() => {
                const current = loadStoredPlayerNames();
                const updated = saveStoredPlayerNames(
                  current.player1Name,
                  current.player2Name,
                  'quick'
                );
                setTwoPlayerDraftNames(updated);
                gameRef.current?.setMenuState('TWO_PLAYER_SETUP');
              }}
              onBack={() => gameRef.current?.setMenuState('MAIN_MENU')}
            />
          </div>
        )}

        {/* ACHIEVEMENTS SCREEN */}
        {uiState.state === 'ACHIEVEMENTS' && (
          <div className="absolute inset-0 z-20">
            <AchievementCollectionUI
              snapshot={achievementSnapshot}
              coins={currency.coins}
              gems={currency.gems}
              badgeEffectsEnabled={settings.achievementBadgeEffectsEnabled}
              reducedMotion={settings.reducedMotion}
              onShopPurchased={(unlocked) => {
                gameRef.current?.syncExternalVisuals();
                enqueueAchievements(unlocked);
              }}
              onBack={() => gameRef.current?.setMenuState('MAIN_MENU')}
            />
          </div>
        )}

        {/* MISSION CENTER SCREEN */}
        {uiState.state === 'MISSION_CENTER' && (
          <div className="absolute inset-0 z-20">
            <MissionCenterScreen
              snapshot={missionSnapshot}
              coins={currency.coins}
              gems={currency.gems}
              customFaceImg={customFaceImg}
              activeCharacterId={defaultSelection.characterId}
              activeSkinId={defaultSkinId}
              isCustomFaceActive={
                defaultSelection.mode === 'custom_face' && Boolean(customFaceImg)
              }
              rewardAnimationEnabled={settings.missionRewardAnimationEnabled}
              reducedMotion={settings.reducedMotion}
              onBack={() => gameRef.current?.setMenuState('MAIN_MENU')}
            />
          </div>
        )}

        {/* PLAYER PROGRESSION & LEVEL REWARDS SCREEN */}
        {uiState.state === 'PLAYER_PROGRESSION' && (
          <div className="absolute inset-0 z-20">
            <PlayerProgressionScreen
              profile={soloProfile}
              initialTab={progressionInitialTab}
              onOpenProfile={() => gameRef.current?.setMenuState('PLAYER_PROFILE')}
              onRewardClaimed={() => gameRef.current?.syncExternalVisuals()}
              onBack={() => gameRef.current?.setMenuState('MAIN_MENU')}
            />
          </div>
        )}

        {/* PLAYER PROFILE SCREEN */}
        {uiState.state === 'PLAYER_PROFILE' && (
          <div className="absolute inset-0 z-20">
            <PlayerProfileScreen
              soloProfile={soloProfile}
              p1Profile={p1Profile}
              p2Profile={p2Profile}
              stats={stats}
              bestScore={uiState.bestScore}
              missionStats={missionSnapshot.stats}
              achievementsUnlocked={unlockedCount}
              achievementsTotal={achievements.length}
              charsUnlocked={collectionSummary.unlockedCount}
              charsTotal={collectionSummary.totalCount}
              worldsUnlocked={worldSummary.unlockedCount}
              worldsTotal={worldSummary.totalCount}
              customFaceImg={customFaceImg}
              p1FaceImg={player1FaceImg}
              p2FaceImg={player2FaceImg}
              activeCharacterId={defaultSelection.characterId}
              activeSkinId={defaultSkinId}
              isCustomFaceActive={
                defaultSelection.mode === 'custom_face' && Boolean(customFaceImg)
              }
              p1Selection={p1Selection}
              p2Selection={p2Selection}
              p1SkinId={p1SkinId}
              p2SkinId={p2SkinId}
              achievementSnapshot={achievementSnapshot}
              badgeEffectsEnabled={settings.achievementBadgeEffectsEnabled}
              reducedMotion={settings.reducedMotion}
              onRenameSlot={(slot: ProgressionProfileId, newName: string) => {
                if (slot === 'player1') {
                  const cur = loadStoredPlayerNames();
                  setTwoPlayerDraftNames(
                    saveStoredPlayerNames(newName, cur.player2Name, cur.preferredFormat)
                  );
                } else if (slot === 'player2') {
                  const cur = loadStoredPlayerNames();
                  setTwoPlayerDraftNames(
                    saveStoredPlayerNames(cur.player1Name, newName, cur.preferredFormat)
                  );
                }
              }}
              onOpenProgression={(tab = 'rewards') => {
                setProgressionInitialTab(tab);
                gameRef.current?.setMenuState('PLAYER_PROGRESSION');
              }}
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
              onOpenWorldSelect={() => {
                setWorldFocusId(activeWorldId);
                setWorldReturnState('SETTINGS');
                gameRef.current?.setMenuState('WORLD_SELECT');
              }}
              onEnvironmentChange={() => {
                gameRef.current?.syncEnvironmentSettings();
              }}
              onSkyThemeChange={() => {
                gameRef.current?.syncExternalVisuals();
              }}
              onResetProgression={() => gameRef.current?.resetProgression()}
              onResetAllData={async () => {
                gameRef.current?.resetProgression();
                gameRef.current?.resetCollectionAndSkins();
                missionManager.reset();
                rewardShopManager.reset();
                competitiveManager.reset();
                settingsManager.resetToDefaults();
                leaderboardManager.reset();
                resetStoredPlayerNames();
                setTwoPlayerDraftNames(loadStoredPlayerNames());
                setAchievementQueue([]);
                setMissionQueue([]);
                setCharacterUnlockQueue([]);
                setWorldUnlockQueue([]);
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

        {/* CHARACTER PROFILE MODAL */}
        {profileTarget && (
          <CharacterProfileScreen
            character={profileTarget.character}
            slot={profileTarget.slot}
            metrics={unlockMetrics}
            isFavorite={characterFavorites.isFavorite(
              profileTarget.character.id,
              profileTarget.slot
            )}
            isEquipped={
              characterUnlockManager.getSelection(profileTarget.slot).mode === 'character' &&
              characterUnlockManager.getSelection(profileTarget.slot).characterId ===
                profileTarget.character.id
            }
            selectedSkinId={characterSkinManager.getSelectedSkin(profileTarget.slot)}
            onToggleFavorite={(id) => {
              characterFavorites.toggleFavorite(id, profileTarget.slot);
            }}
            onEquipCharacter={(id) => {
              characterUnlockManager.selectGameCharacter(id, profileTarget.slot);
            }}
            onSelectSkin={(skinId) => {
              characterSkinManager.selectSkin(skinId, profileTarget.slot);
              enqueueAchievements(achievementManager.recordEvent({ type: 'skin_equipped', skinId }));
            }}
            onClose={() => setProfileTarget(null)}
          />
        )}

        {/* CHARACTER UNLOCK REWARD POPUP (SUPPRESSED DURING ACTIVE FLIGHT) */}
        {!isFlightOrCountdown && characterUnlockQueue.length > 0 && (
          <CharacterUnlockPopup
            queue={characterUnlockQueue}
            onEquipNow={(id) => {
              characterUnlockManager.selectGameCharacter(id, 'default');
              gameRef.current?.syncExternalVisuals();
              setCharacterUnlockQueue((prev) => prev.slice(1));
            }}
            onLater={() => {
              setCharacterUnlockQueue((prev) => prev.slice(1));
            }}
          />
        )}

        {/* WORLD UNLOCK REWARD POPUP (SHOWS AFTER CHARACTER POPUP QUEUE OR IMMEDIATELY OUTSIDE FLIGHT) */}
        {!isFlightOrCountdown && characterUnlockQueue.length === 0 && worldUnlockQueue.length > 0 && (
          <WorldUnlockPopup
            queue={worldUnlockQueue}
            onExploreNow={(worldId) => {
              worldUnlockManager.selectWorld(worldId);
              gameRef.current?.syncEnvironmentSettings();
              setWorldFocusId(worldId);
              setWorldReturnState('MAIN_MENU');
              setWorldUnlockQueue((prev) => prev.slice(1));
              gameRef.current?.setMenuState('WORLD_SELECT');
            }}
            onLater={() => {
              setWorldUnlockQueue((prev) => prev.slice(1));
            }}
          />
        )}

        {/* LEVEL UP REWARD POPUP (SUPPRESSED DURING FLIGHT & HIGHER PRIORITY POPUPS) */}
        {!isFlightOrCountdown &&
          uiState.state !== 'PLAYER_2_TRANSITION' &&
          uiState.state !== 'ROUND_RESULT' &&
          achievementQueue.length === 0 &&
          characterUnlockQueue.length === 0 &&
          worldUnlockQueue.length === 0 &&
          levelUpQueue.length > 0 && (() => {
            const activeEv = levelUpQueue[0];
            const targetProfile =
              activeEv.profileId === 'player1'
                ? p1Profile
                : activeEv.profileId === 'player2'
                  ? p2Profile
                  : soloProfile;
            return (
              <LevelUpOverlay
                event={activeEv}
                playerName={targetProfile.playerName}
                progressPercent={targetProfile.progressPercent}
                animationEnabled={settings.levelUpAnimationEnabled}
                reducedMotion={settings.reducedMotion}
                onOpenRewards={() => {
                  setProgressionInitialTab('rewards');
                  gameRef.current?.setMenuState('PLAYER_PROGRESSION');
                }}
                onContinue={(id) => playerProgressionManager.consumeLevelUp(id)}
              />
            );
          })()}

        {/* NEW PERSONAL BEST CELEBRATION POPUP (NON-BLOCKING OUTSIDE FLIGHT) */}
        {!isFlightOrCountdown &&
          achievementQueue.length === 0 &&
          characterUnlockQueue.length === 0 &&
          worldUnlockQueue.length === 0 &&
          levelUpQueue.length === 0 &&
          (() => {
            const pbNote = competitiveNotifications.find(
              (n) => n.type === 'NEW_PERSONAL_BEST' && n.pbEvent
            );
            if (!pbNote || !settings.competitiveNotificationsEnabled) return null;
            return (
              <PersonalBestPopup
                event={pbNote.pbEvent ?? null}
                reducedMotion={settings.reducedMotion}
                onDismiss={() => competitiveManager.consumeNotification(pbNote.id)}
                onOpenHub={() => gameRef.current?.setMenuState('COMPETITIVE_HUB')}
              />
            );
          })()}

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

        {/* SECOND CHANCE REVIVE DIALOG */}
        {uiState.state === 'REVIVE_PROMPT' && (
          <ReviveDialog
            remainingSec={uiState.reviveRemainingSec}
            score={uiState.score}
            onRevive={() => gameRef.current?.acceptRevive()}
            onGiveUp={() => gameRef.current?.declineRevive()}
          />
        )}

        {/* SINGLE PLAYER GAME OVER OVERLAY */}
        {uiState.state === 'GAME_OVER' && uiState.isGameOverPanelReady && (
          <GameOverOverlay
            score={uiState.score}
            bestScore={uiState.bestScore}
            isNewBest={uiState.isNewBest}
            reaction={uiState.gameOverReaction}
            characterId={uiState.activeCharacterId}
            skinId={uiState.activeSkinId}
            customFaceImg={
              defaultSelection.mode === 'custom_face' && customFaceImg ? customFaceImg : null
            }
            runCoins={uiState.runCoinsCollected}
            runGems={uiState.runGemsCollected}
            runXP={uiState.runXPGained}
            previousRunScore={uiState.previousRunScore}
            rivalName={uiState.selectedRival.name}
            rivalTargetScore={uiState.selectedRival.targetScore}
            activeChallengeTitle={uiState.activeChallenge?.title ?? null}
            onOpenCompetitiveHub={() => {
              competitiveManager.ensureCurrentPeriods();
              gameRef.current?.setMenuState('COMPETITIVE_HUB');
            }}
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
              characterId={uiState.activeCharacterId}
              skinId={uiState.activeSkinId}
              customFaceImg={
                uiState.state === 'PLAYER_1_GAME_OVER'
                  ? p1Selection.mode === 'custom_face' && player1FaceImg
                    ? player1FaceImg
                    : null
                  : p2Selection.mode === 'custom_face' && player2FaceImg
                    ? player2FaceImg
                    : null
              }
              showcaseRecords={showcaseRecords}
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
            player2FaceImg={
              p2Selection.mode === 'custom_face' && player2FaceImg ? player2FaceImg : null
            }
            player2CharacterId={p2Selection.characterId}
            player2SkinId={p2SkinId}
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
            player1FaceImg={
              p1Selection.mode === 'custom_face' && player1FaceImg ? player1FaceImg : null
            }
            player2FaceImg={
              p2Selection.mode === 'custom_face' && player2FaceImg ? player2FaceImg : null
            }
            player1CharacterId={p1Selection.characterId}
            player1SkinId={p1SkinId}
            player2CharacterId={p2Selection.characterId}
            player2SkinId={p2SkinId}
            player1Level={p1Profile.currentLevel}
            player1Title={getTitleById(p1Profile.equippedTitleId).name}
            player2Level={p2Profile.currentLevel}
            player2Title={getTitleById(p2Profile.equippedTitleId).name}
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
            showcaseRecords={showcaseRecords}
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
