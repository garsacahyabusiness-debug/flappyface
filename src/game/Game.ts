import { audioManager } from './audio/AudioManager';
import { Background } from './Background';
import { characterFavorites } from './character/CharacterFavorites';
import { CharacterRandomizer, characterRandomizer } from './character/CharacterRandomizer';
import { CharacterDefinition } from './character/CharacterRegistry';
import { characterSkinManager, SkinId } from './character/CharacterSkinManager';
import { CharacterSlot } from './character/CharacterStorage';
import { CharacterMetrics, characterUnlockManager } from './character/CharacterUnlockManager';
import { Collision } from './Collision';
import { GAME_CONFIG, GameState } from './Config';
import { GameOverReaction, gameOverReactionSystem } from './GameOverReaction';
import { Ground } from './Ground';
import { Input } from './Input';
import { Physics } from './Physics';
import { PipeManager } from './PipeManager';
import { Player } from './Player';
import { currencyManager } from './powerups/CurrencyManager';
import { ActivePowerUpStatus } from './powerups/PowerUpEffectManager';
import { PowerUpBannerEvent, PowerUpManager } from './powerups/PowerUpManager';
import { achievementManager, AchievementRecord } from './progression/AchievementManager';
import { DifficultyTierId } from './progression/DifficultyConfig';
import { difficultyManager } from './progression/DifficultyManager';
import { leaderboardManager } from './progression/LeaderboardManager';
import { statsManager } from './progression/StatsManager';
import { Renderer } from './Renderer';
import { Score } from './Score';
import { PerformanceMode, settingsManager } from './settings/SettingsManager';
import { vibrationManager } from './settings/VibrationManager';
import {
  createInitialMatchData,
  finalizeRoundInMatch,
  generateRoundSeed,
  loadStoredPlayerNames,
  MatchFormat,
  PlayerSlot,
  saveStoredPlayerNames,
  TwoPlayerMatchData,
} from './TwoPlayerMatch';

import {
  WeatherType,
  WorldDefinition,
  WorldId,
} from './worlds/WorldRegistry';
import { worldUnlockManager } from './worlds/WorldUnlockManager';

export type CountdownStep = 3 | 2 | 1 | 'GO' | null;

export interface GameUIState {
  state: GameState;
  score: number;
  bestScore: number;
  isNewBest: boolean;
  newBestEventId: number;
  difficultyTier: DifficultyTierId;
  difficultyLabel: string;
  isGameOverPanelReady: boolean;
  gameOverReaction: GameOverReaction | null;
  countdownStep: CountdownStep;
  activePlayerSlot: PlayerSlot | null;
  twoPlayerMatch: TwoPlayerMatchData | null;
  isTwoPlayerPaused: boolean;
  activeCharacterId: string;
  activeSkinId: SkinId;
  activeWorldId: WorldId;
  activeWeather: WeatherType | null;
  activePowerUps: ActivePowerUpStatus[];
  reviveRemainingSec: number;
  latestPowerUpBanner: PowerUpBannerEvent | null;
  runCoinsCollected: number;
  runGemsCollected: number;
}

const COUNTDOWN_STEP_SECONDS = 0.72;
const COUNTDOWN_GO_END_SECONDS = 2.66;

export class Game {
  private renderer: Renderer;
  private background: Background;
  private ground: Ground;
  private player: Player;
  private pipes: PipeManager;
  private physics: Physics;
  private collision: Collision;
  private score: Score;
  private input: Input;
  public readonly powerUps = new PowerUpManager();

  private state: GameState = 'MAIN_MENU';
  private pausedFromState: 'PLAYING' | 'PLAYER_1_PLAYING' | 'PLAYER_2_PLAYING' = 'PLAYING';
  private reviveFromSlot: PlayerSlot | null = null;
  private reviveCollisionReason: 'pipe' | 'ground' | 'ceiling' = 'pipe';
  private reviveTimer = 0;
  private hudSyncTimer = 0;
  private latestPowerUpBanner: PowerUpBannerEvent | null = null;
  private rafId: number | null = null;
  private lastTimestamp = 0;
  private elapsedTime = 0;
  private deathElapsed = 0;
  private countdownElapsed = 0;
  private countdownStep: CountdownStep = null;
  private gameOverPanelShown = false;
  private currentGameOverReaction: GameOverReaction | null = null;
  private newBestEventId = 0;
  private twoPlayerMatch: TwoPlayerMatchData | null = null;

  private defaultFaceImg: HTMLImageElement | null = null;
  private player1FaceImg: HTMLImageElement | null = null;
  private player2FaceImg: HTMLImageElement | null = null;

  private onStateChange: (uiState: GameUIState) => void;
  private onAchievementsUnlocked?: (achievements: AchievementRecord[]) => void;
  private onCharacterUnlocks?: (characters: CharacterDefinition[]) => void;
  private onWorldUnlocks?: (worlds: WorldDefinition[]) => void;
  private pendingCharacterUnlocks: CharacterDefinition[] = [];
  private pendingWorldUnlocks: WorldDefinition[] = [];

  private performanceMode: PerformanceMode = 'high';
  private adaptiveLowDetail = false;
  private reducedMotion = false;
  private fpsSampleFrames = 0;
  private fpsSampleElapsed = 0;
  private lowFpsStreak = 0;
  private highFpsStreak = 0;
  private motionMediaQuery: MediaQueryList | null = null;
  private handleMotionChange = (e: MediaQueryListEvent) => {
    this.applyReducedMotion(e.matches);
  };

  constructor(
    canvas: HTMLCanvasElement,
    onStateChange: (uiState: GameUIState) => void,
    onAchievementsUnlocked?: (achievements: AchievementRecord[]) => void,
    onCharacterUnlocks?: (characters: CharacterDefinition[]) => void,
    onWorldUnlocks?: (worlds: WorldDefinition[]) => void
  ) {
    this.onStateChange = onStateChange;
    this.onAchievementsUnlocked = onAchievementsUnlocked;
    this.onCharacterUnlocks = onCharacterUnlocks;
    this.onWorldUnlocks = onWorldUnlocks;

    this.renderer = new Renderer(canvas);
    this.background = new Background();
    this.ground = new Ground();
    this.player = new Player();
    this.pipes = new PipeManager();
    this.physics = new Physics();
    this.collision = new Collision();
    this.score = new Score();

    statsManager.syncBestScore(this.score.best);
    this.evaluateCharacterUnlocks(false);
    this.evaluateWorldUnlocks(false);
    this.syncEnvironmentSettings();
    this.syncPlayerVisualForSlot('default', false);

    this.input = new Input(
      canvas,
      () => this.handleActionInput(),
      () =>
        this.state === 'READY' ||
        this.state === 'PLAYING' ||
        this.state === 'PLAYER_1_PLAYING' ||
        this.state === 'PLAYER_2_PLAYING'
    );
    this.initReducedMotionObserver();
    this.pipes.reset();
    this.emitUIState();
  }

  private initReducedMotionObserver(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    this.motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.applyReducedMotion(this.motionMediaQuery.matches);
    this.motionMediaQuery.addEventListener?.('change', this.handleMotionChange);
  }

  private applyReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    this.renderer.setReducedMotion(reduced);
    this.background.setReducedMotion(reduced);
  }

  private syncDetailLevel(): void {
    const low = this.performanceMode === 'eco' || this.adaptiveLowDetail;
    this.background.setLowDetail(low);
    this.renderer.setLowDetail(low);
  }

  private sampleFramePerformance(rawDt: number): void {
    if (typeof document !== 'undefined' && document.hidden) return;
    if (this.performanceMode === 'eco') return;
    if (
      this.state !== 'PLAYING' &&
      this.state !== 'PLAYER_1_PLAYING' &&
      this.state !== 'PLAYER_2_PLAYING' &&
      this.state !== 'MAIN_MENU'
    ) {
      return;
    }

    this.fpsSampleFrames += 1;
    this.fpsSampleElapsed += Math.min(rawDt, 0.25);

    if (this.fpsSampleElapsed >= 1.5) {
      const avgFps = this.fpsSampleFrames / this.fpsSampleElapsed;
      this.fpsSampleFrames = 0;
      this.fpsSampleElapsed = 0;

      if (avgFps < 42) {
        this.lowFpsStreak += 1;
        this.highFpsStreak = 0;
        if (this.lowFpsStreak >= 2 && !this.adaptiveLowDetail) {
          this.adaptiveLowDetail = true;
          this.syncDetailLevel();
        }
      } else if (avgFps > 54) {
        this.highFpsStreak += 1;
        this.lowFpsStreak = 0;
        if (this.highFpsStreak >= 2 && this.adaptiveLowDetail) {
          this.adaptiveLowDetail = false;
          this.syncDetailLevel();
        }
      } else {
        this.lowFpsStreak = 0;
        this.highFpsStreak = 0;
      }
    }
  }

  public start(): void {
    if (this.rafId !== null) return;
    this.lastTimestamp = performance.now();
    const tick = (now: number) => {
      const rawDt = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;
      const dt = Math.max(0, Math.min(rawDt, 0.05));

      this.sampleFramePerformance(rawDt);
      this.update(dt);
      this.renderer.render(
        this.state,
        this.background,
        this.pipes,
        this.ground,
        this.player,
        this.score,
        this.elapsedTime,
        this.powerUps
      );

      this.rafId = window.requestAnimationFrame(tick);
    };
    this.rafId = window.requestAnimationFrame(tick);
  }

  public resize(): void {
    this.renderer.resize();
  }

  public setPerformanceMode(mode: PerformanceMode): void {
    this.performanceMode = mode;
    if (mode === 'high') {
      this.adaptiveLowDetail = false;
      this.lowFpsStreak = 0;
      this.highFpsStreak = 0;
    }
    this.renderer.setMaxDpr(mode === 'eco' ? 1.25 : 2);
    this.syncDetailLevel();
  }

  public destroy(): void {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.motionMediaQuery?.removeEventListener?.('change', this.handleMotionChange);
    this.motionMediaQuery = null;
    this.input.destroy();
    audioManager.stopMusic();
  }

  public getState(): GameState {
    return this.state;
  }

  public getUnlockMetrics(): CharacterMetrics {
    const st = statsManager.getStats();
    const players = leaderboardManager.getTopPlayers();
    const tournamentsWon = players.reduce((sum, p) => sum + p.wins, 0);
    const bestWinStreak = players.reduce((max, p) => Math.max(max, p.bestWinStreak), 0);
    return {
      bestScore: Math.max(this.score.best, st.bestScore),
      totalGamesPlayed: st.totalGamesPlayed,
      tournamentsWon,
      bestWinStreak,
      unlockedAchievements: achievementManager.getUnlockedCount(),
      totalAchievements: achievementManager.getTotalCount(),
    };
  }

  private evaluateCharacterUnlocks(queuePopup: boolean): void {
    const unlocked = characterUnlockManager.evaluateProgress(this.getUnlockMetrics());
    if (queuePopup && unlocked.length > 0) {
      this.pendingCharacterUnlocks.push(...unlocked);
    }
  }

  private evaluateWorldUnlocks(queuePopup: boolean): void {
    const unlocked = worldUnlockManager.evaluateProgress(this.getUnlockMetrics());
    const worldSummary = worldUnlockManager.getCollectionSummary();
    if (worldSummary.hasTrailReward) {
      characterSkinManager.unlockMilestoneSkin('neon');
    }
    if (worldSummary.hasSkinReward) {
      characterSkinManager.unlockMilestoneSkin('golden');
    }
    if (queuePopup && unlocked.length > 0) {
      this.pendingWorldUnlocks.push(...unlocked);
    }
  }

  private flushPendingCharacterUnlocks(): void {
    if (this.pendingCharacterUnlocks.length === 0) return;
    const batch = [...this.pendingCharacterUnlocks];
    this.pendingCharacterUnlocks = [];
    this.onCharacterUnlocks?.(batch);
  }

  private flushPendingWorldUnlocks(): void {
    if (this.pendingWorldUnlocks.length === 0) return;
    const batch = [...this.pendingWorldUnlocks];
    this.pendingWorldUnlocks = [];
    this.onWorldUnlocks?.(batch);
  }

  public syncBackgroundSkyTheme(): void {
    const summary = characterUnlockManager.getCollectionSummary();
    const wanted = settingsManager.getSettings().skyTheme;
    this.background.setSkyTheme(
      summary.hasSpecialBackground && wanted === 'special' ? 'special' : 'classic'
    );
  }

  public syncEnvironmentSettings(): void {
    const world = worldUnlockManager.getSelectedWorld();
    const settings = settingsManager.getSettings();
    const worldSummary = worldUnlockManager.getCollectionSummary();
    const effectiveWeather = worldUnlockManager.getEffectiveWeather(
      world.id,
      settings.weatherEnabled
    );

    this.background.setWorld(world.id);
    this.background.setWeather(effectiveWeather);
    this.background.setParallaxEnabled(settings.parallaxEnabled);
    this.background.setDynamicSkyEnabled(settings.dynamicSkyEnabled);
    this.background.setParticleLevel(settings.particleLevel);
    this.background.setGraphicsPreset(settings.graphicsPreset);
    this.background.setEnhancedEnvGlow(worldSummary.hasEnvEffectReward);
    this.ground.setWorldTheme(world.id);
    this.pipes.setPipeSkin(world.pipeSkin);
    audioManager.setAmbientType(world.ambientSound);
    this.syncBackgroundSkyTheme();

    // Sync Power-Up & Collectible config; enforce standardized 'normal' frequency in 2P/Tournament
    const isTwoPlayerOrTournament = this.isTwoPlayerActiveState();
    this.powerUps.configure({
      powerUpsEnabled: settings.powerUpsEnabled,
      collectiblesEnabled: settings.collectiblesEnabled,
      frequency: isTwoPlayerOrTournament ? 'normal' : settings.powerUpFrequency,
      visualFxQuality:
        this.performanceMode === 'eco' ? 'low' : settings.visualEffectsQuality,
    });
  }

  private applyRandomizerForSlot(slot: CharacterSlot): void {
    if (!characterRandomizer.isRandomEveryRun(slot)) return;
    const faceImg =
      slot === 'player1'
        ? this.player1FaceImg
        : slot === 'player2'
          ? this.player2FaceImg
          : this.defaultFaceImg;
    const currentSel = characterUnlockManager.getSelection(slot);
    const pick = CharacterRandomizer.pickRandom({
      unlockedCharacterIds: characterUnlockManager.getUnlockedIds(),
      currentCharacterId: currentSel.characterId,
      currentIsCustomFace: currentSel.mode === 'custom_face',
      hasCustomFace: Boolean(faceImg),
      includeCustomFace: slot === 'default' && Boolean(faceImg),
    });
    if (pick.kind === 'custom_face' && faceImg) {
      characterUnlockManager.selectCustomFaceMode(slot);
    } else if (pick.kind === 'character') {
      characterUnlockManager.selectGameCharacter(pick.characterId, slot);
    }
  }

  private syncPlayerVisualForSlot(slot: CharacterSlot, applyRandomEveryRun = false): void {
    if (applyRandomEveryRun) {
      this.applyRandomizerForSlot(slot);
    }
    const faceImg =
      slot === 'player1'
        ? this.player1FaceImg
        : slot === 'player2'
          ? this.player2FaceImg
          : this.defaultFaceImg;
    const sel = characterUnlockManager.getSelection(slot);
    const skinId = characterSkinManager.getSelectedSkin(slot);
    this.player.setCharacterVisual(sel.characterId, skinId);
    this.player.setCustomFaceImage(sel.mode === 'custom_face' && faceImg ? faceImg : null);
  }

  public syncExternalVisuals(): void {
    this.syncEnvironmentSettings();
    if (!this.isTwoPlayerActiveState()) {
      this.syncPlayerVisualForSlot('default', false);
    }
    this.emitUIState();
  }

  public setCustomFaceImage(image: HTMLImageElement | null): void {
    this.defaultFaceImg = image;
    if (!this.isTwoPlayerActiveState()) {
      this.syncPlayerVisualForSlot('default', false);
      this.emitUIState();
    }
  }

  public setPlayerCustomFaceImage(slot: PlayerSlot, image: HTMLImageElement | null): void {
    if (slot === 1) {
      this.player1FaceImg = image;
      if (
        this.state === 'PLAYER_1_READY' ||
        this.state === 'PLAYER_1_PLAYING' ||
        this.state === 'PLAYER_1_GAME_OVER'
      ) {
        this.syncPlayerVisualForSlot('player1', false);
        this.emitUIState();
      }
    } else {
      this.player2FaceImg = image;
      if (
        this.state === 'PLAYER_2_READY' ||
        this.state === 'PLAYER_2_PLAYING' ||
        this.state === 'PLAYER_2_GAME_OVER'
      ) {
        this.syncPlayerVisualForSlot('player2', false);
        this.emitUIState();
      }
    }
  }

  private isTwoPlayerActiveState(s: GameState = this.state): boolean {
    return (
      s === 'TWO_PLAYER_SETUP' ||
      s === 'PLAYER_1_READY' ||
      s === 'PLAYER_1_PLAYING' ||
      s === 'PLAYER_1_GAME_OVER' ||
      s === 'PLAYER_2_TRANSITION' ||
      s === 'PLAYER_2_READY' ||
      s === 'PLAYER_2_PLAYING' ||
      s === 'PLAYER_2_GAME_OVER' ||
      s === 'ROUND_RESULT' ||
      s === 'MATCH_RESULT' ||
      (s === 'PAUSED' && this.pausedFromState !== 'PLAYING')
    );
  }

  public setMenuState(
    next:
      | 'MAIN_MENU'
      | 'WORLD_SELECT'
      | 'WORLD_COLLECTION'
      | 'CHARACTER_COLLECTION'
      | 'CHARACTER_SELECT'
      | 'CHARACTER_EDITOR'
      | 'LEADERBOARD'
      | 'ACHIEVEMENTS'
      | 'STATS'
      | 'SETTINGS'
      | 'ABOUT'
      | 'TWO_PLAYER_SETUP',
    preferredFormat?: MatchFormat
  ): void {
    this.state = next;
    if (next === 'MAIN_MENU') {
      this.pausedFromState = 'PLAYING';
      this.reviveFromSlot = null;
      this.reviveTimer = 0;
      this.latestPowerUpBanner = null;
      this.pipes.reset();
      this.player.reset();
      this.powerUps.resetRun();
      this.syncEnvironmentSettings();
      this.syncPlayerVisualForSlot('default', false);
      this.score.reset(true);
      this.gameOverPanelShown = false;
      this.currentGameOverReaction = null;
      this.countdownStep = null;
      this.countdownElapsed = 0;
      this.twoPlayerMatch = null;
      this.deathElapsed = 0;
      audioManager.startMusic();
    } else if (next === 'TWO_PLAYER_SETUP') {
      this.pausedFromState = 'PLAYING';
      this.reviveFromSlot = null;
      this.reviveTimer = 0;
      this.latestPowerUpBanner = null;
      const stored = loadStoredPlayerNames();
      const format = preferredFormat ?? this.twoPlayerMatch?.format ?? stored.preferredFormat;
      const names = this.twoPlayerMatch
        ? {
            player1Name: this.twoPlayerMatch.player1Name,
            player2Name: this.twoPlayerMatch.player2Name,
          }
        : stored;
      this.twoPlayerMatch = createInitialMatchData(names.player1Name, names.player2Name, format);
      this.pipes.reset();
      this.player.reset();
      this.powerUps.resetRun();
      this.syncEnvironmentSettings();
      this.score.reset(false);
      this.countdownStep = null;
      this.countdownElapsed = 0;
      this.gameOverPanelShown = false;
      this.currentGameOverReaction = null;
      audioManager.startMusic();
    }
    this.emitUIState();
  }

  public startReady(requestedWorldId?: WorldId): boolean {
    if (requestedWorldId) {
      if (!worldUnlockManager.canPlayWorld(requestedWorldId)) {
        return false;
      }
      worldUnlockManager.selectWorld(requestedWorldId);
    } else if (!worldUnlockManager.canPlayWorld(worldUnlockManager.getSelectedWorldId())) {
      worldUnlockManager.selectWorld('green_valley');
    }

    this.pausedFromState = 'PLAYING';
    this.reviveFromSlot = null;
    this.reviveTimer = 0;
    this.latestPowerUpBanner = null;
    this.twoPlayerMatch = null;
    this.pendingCharacterUnlocks = [];
    this.pendingWorldUnlocks = [];
    this.player.reset();
    this.powerUps.resetRun();
    this.syncEnvironmentSettings();
    this.syncPlayerVisualForSlot('default', true);
    this.pipes.reset();
    this.score.reset(true);
    this.ground.reset();
    this.renderer.resetEffects();
    this.deathElapsed = 0;
    this.countdownElapsed = 0;
    this.countdownStep = null;
    this.gameOverPanelShown = false;
    this.currentGameOverReaction = null;
    this.state = 'READY';
    audioManager.startMusic();
    this.emitUIState();
    return true;
  }

  public startTwoPlayerMatch(
    player1Name: string,
    player2Name: string,
    format: MatchFormat = 'quick',
    requestedWorldId?: WorldId
  ): boolean {
    if (requestedWorldId) {
      if (!worldUnlockManager.canPlayWorld(requestedWorldId)) {
        return false;
      }
      worldUnlockManager.selectWorld(requestedWorldId);
    } else if (!worldUnlockManager.canPlayWorld(worldUnlockManager.getSelectedWorldId())) {
      worldUnlockManager.selectWorld('green_valley');
    }

    const saved = saveStoredPlayerNames(player1Name, player2Name, format);
    const initial = createInitialMatchData(saved.player1Name, saved.player2Name, format);
    this.twoPlayerMatch = {
      ...initial,
      startedAt: Date.now(),
      status: 'round_1',
    };
    this.pendingCharacterUnlocks = [];
    this.pendingWorldUnlocks = [];
    this.applyRandomizerForSlot('player1');
    this.applyRandomizerForSlot('player2');
    this.beginTwoPlayerRound(1);
    return true;
  }

  public continueFromPlayer1GameOver(): void {
    if (this.state !== 'PLAYER_1_GAME_OVER' || !this.twoPlayerMatch) return;
    this.twoPlayerMatch = {
      ...this.twoPlayerMatch,
      status: 'turn_transition',
    };
    this.pipes.reset();
    this.player.reset();
    this.renderer.resetEffects();
    this.gameOverPanelShown = false;
    this.currentGameOverReaction = null;
    this.state = 'PLAYER_2_TRANSITION';
    audioManager.startMusic();
    this.emitUIState();
  }

  public startPlayer2Turn(): void {
    if (this.state !== 'PLAYER_2_TRANSITION' || !this.twoPlayerMatch) return;
    this.twoPlayerMatch = {
      ...this.twoPlayerMatch,
      status: 'round_2',
    };
    this.beginTwoPlayerRound(2);
  }

  public continueFromPlayer2GameOver(): void {
    if (this.state !== 'PLAYER_2_GAME_OVER' || !this.twoPlayerMatch) return;
    const p1Score = this.twoPlayerMatch.player1Score ?? 0;
    const p2Score = this.twoPlayerMatch.player2Score ?? this.score.current;

    const { updatedMatch, isMatchComplete } = finalizeRoundInMatch(
      this.twoPlayerMatch,
      p1Score,
      p2Score
    );

    this.gameOverPanelShown = false;
    this.currentGameOverReaction = null;

    if (isMatchComplete) {
      let finalized = updatedMatch;
      if (!finalized.recordedToHistory) {
        leaderboardManager.recordCompletedMatch(finalized);
        finalized = { ...finalized, recordedToHistory: true };
      }
      this.twoPlayerMatch = finalized;
      this.state = 'MATCH_RESULT';
      this.evaluateCharacterUnlocks(true);
      this.evaluateWorldUnlocks(true);

      if (finalized.winner === 'draw') {
        audioManager.playDraw();
        vibrationManager.vibrateDraw();
      } else {
        this.renderer.particles.spawnNewBestCelebration();
        audioManager.playVictory();
        vibrationManager.vibrateVictory();
      }
      this.emitUIState();
      this.flushPendingCharacterUnlocks();
      this.flushPendingWorldUnlocks();
      return;
    } else {
      this.twoPlayerMatch = updatedMatch;
      this.state = 'ROUND_RESULT';
      if (updatedMatch.lastRoundWinner === 'draw') {
        audioManager.playDraw();
        vibrationManager.vibrateDraw();
      } else {
        audioManager.playVictory();
        vibrationManager.vibrateScore();
      }
    }
    this.emitUIState();
  }

  public startNextTournamentRound(): void {
    if (this.state !== 'ROUND_RESULT' || !this.twoPlayerMatch) return;
    const m = this.twoPlayerMatch;
    // Guard against advancing past clinched wins or maxRounds (prevents any infinite round loop)
    if (
      m.currentRound >= m.maxRounds ||
      m.player1Wins >= m.targetWins ||
      m.player2Wins >= m.targetWins
    ) {
      this.state = 'MATCH_RESULT';
      this.emitUIState();
      return;
    }

    this.twoPlayerMatch = {
      ...m,
      currentRound: m.currentRound + 1,
      player1Score: null,
      player2Score: null,
      status: 'round_1',
      roundSeed: generateRoundSeed(),
    };
    this.beginTwoPlayerRound(1);
  }

  public rematchTwoPlayer(): void {
    if (!this.twoPlayerMatch) return;
    const fresh = createInitialMatchData(
      this.twoPlayerMatch.player1Name,
      this.twoPlayerMatch.player2Name,
      this.twoPlayerMatch.format
    );
    this.twoPlayerMatch = {
      ...fresh,
      startedAt: Date.now(),
      status: 'round_1',
    };
    this.pendingCharacterUnlocks = [];
    this.applyRandomizerForSlot('player1');
    this.applyRandomizerForSlot('player2');
    this.beginTwoPlayerRound(1);
  }

  private beginTwoPlayerRound(slot: PlayerSlot): void {
    this.reviveFromSlot = null;
    this.reviveTimer = 0;
    this.latestPowerUpBanner = null;
    this.player.reset();
    this.state = slot === 1 ? 'PLAYER_1_READY' : 'PLAYER_2_READY';
    this.powerUps.resetRun(this.twoPlayerMatch?.roundSeed);
    this.syncEnvironmentSettings();
    this.syncPlayerVisualForSlot(slot === 1 ? 'player1' : 'player2', false);
    this.pipes.reset();
    this.score.reset(false);
    this.ground.reset();
    this.renderer.resetEffects();
    this.deathElapsed = 0;
    this.gameOverPanelShown = false;
    this.currentGameOverReaction = null;
    this.countdownElapsed = 0;
    this.countdownStep = 3;
    audioManager.startMusic();
    audioManager.playCountdownTick();
    vibrationManager.vibrateCountdown();
    this.emitUIState();
  }

  public pause(): void {
    if (
      this.state === 'PLAYING' ||
      this.state === 'PLAYER_1_PLAYING' ||
      this.state === 'PLAYER_2_PLAYING'
    ) {
      this.pausedFromState = this.state;
      this.state = 'PAUSED';
      audioManager.pauseGameplayAudio();
      this.emitUIState();
    }
  }

  public resume(): void {
    if (this.state === 'PAUSED') {
      this.state = this.pausedFromState;
      audioManager.resumeGameplayAudio();
      this.emitUIState();
    }
  }

  public restart(): void {
    if (this.pausedFromState !== 'PLAYING' && this.twoPlayerMatch) {
      this.rematchTwoPlayer();
      return;
    }
    this.startReady();
  }

  public acceptRevive(): void {
    if (this.state !== 'REVIVE_PROMPT') return;
    const groundY = GAME_CONFIG.worldHeight - GAME_CONFIG.groundHeight;
    const revived = this.powerUps.executeRevive(
      this.player,
      this.pipes.getPipes(),
      groundY,
      this.renderer.particles
    );
    if (!revived) {
      this.declineRevive();
      return;
    }

    const slot = this.reviveFromSlot;
    this.reviveFromSlot = null;
    this.reviveTimer = 0;
    this.state =
      slot === 1
        ? 'PLAYER_1_PLAYING'
        : slot === 2
          ? 'PLAYER_2_PLAYING'
          : 'PLAYING';
    audioManager.resumeGameplayAudio();
    this.checkPowerUpAchievements();
    this.emitUIState();
  }

  public declineRevive(): void {
    if (this.state !== 'REVIVE_PROMPT') return;
    const slot = this.reviveFromSlot;
    const reason = this.reviveCollisionReason;
    this.reviveFromSlot = null;
    this.reviveTimer = 0;
    this.triggerGameOver(reason, slot);
  }

  public resetProgression(): void {
    this.score.resetBest();
    achievementManager.reset();
    statsManager.reset();
    currencyManager.reset();
    this.emitUIState();
  }

  public resetCollectionAndSkins(): void {
    characterUnlockManager.reset();
    characterSkinManager.reset();
    characterFavorites.reset();
    characterRandomizer.reset();
    worldUnlockManager.reset();
    this.pendingCharacterUnlocks = [];
    this.pendingWorldUnlocks = [];
    this.syncEnvironmentSettings();
    this.syncPlayerVisualForSlot('default', false);
    this.emitUIState();
  }

  private handleActionInput(): void {
    audioManager.unlock();

    if (this.state === 'READY') {
      this.state = 'PLAYING';
      this.physics.applyFlap(this.player);
      const trail = this.player.getTrailStyle();
      this.renderer.particles.spawnFlapPuff(this.player.x, this.player.y, trail.colors, trail.kind);
      audioManager.startMusic();
      audioManager.playFlap();
      vibrationManager.vibrateFlap();
      this.emitUIState();
      return;
    }

    if (
      this.state === 'PLAYING' ||
      this.state === 'PLAYER_1_PLAYING' ||
      this.state === 'PLAYER_2_PLAYING'
    ) {
      this.physics.applyFlap(this.player);
      const trail = this.player.getTrailStyle();
      this.renderer.particles.spawnFlapPuff(this.player.x, this.player.y, trail.colors, trail.kind);
      audioManager.playFlap();
      vibrationManager.vibrateFlap();
    }
  }

  private getActivePlayerSlot(): PlayerSlot | null {
    if (this.state === 'REVIVE_PROMPT') {
      return this.reviveFromSlot;
    }
    if (
      this.state === 'PLAYER_1_READY' ||
      this.state === 'PLAYER_1_PLAYING' ||
      this.state === 'PLAYER_1_GAME_OVER' ||
      (this.state === 'PAUSED' && this.pausedFromState === 'PLAYER_1_PLAYING')
    ) {
      return 1;
    }
    if (
      this.state === 'PLAYER_2_TRANSITION' ||
      this.state === 'PLAYER_2_READY' ||
      this.state === 'PLAYER_2_PLAYING' ||
      this.state === 'PLAYER_2_GAME_OVER' ||
      (this.state === 'PAUSED' && this.pausedFromState === 'PLAYER_2_PLAYING')
    ) {
      return 2;
    }
    return null;
  }

  private emitUIState(): void {
    const diff = difficultyManager.getForScore(this.score.current);
    const activeSlot = this.getActivePlayerSlot();
    const charSlot: CharacterSlot =
      activeSlot === 1 ? 'player1' : activeSlot === 2 ? 'player2' : 'default';
    const sel = characterUnlockManager.getSelection(charSlot);
    const skinId = characterSkinManager.getSelectedSkin(charSlot);
    const activeWorldId = worldUnlockManager.getSelectedWorldId();
    const activeWeather = worldUnlockManager.getEffectiveWeather(
      activeWorldId,
      settingsManager.getSettings().weatherEnabled
    );
    this.onStateChange({
      state: this.state,
      score: this.score.current,
      bestScore: this.score.best,
      isNewBest: this.score.isNewBest,
      newBestEventId: this.newBestEventId,
      difficultyTier: diff.tier,
      difficultyLabel: diff.tierLabel,
      isGameOverPanelReady: this.gameOverPanelShown,
      gameOverReaction: this.currentGameOverReaction,
      countdownStep: this.countdownStep,
      activePlayerSlot: activeSlot,
      twoPlayerMatch: this.twoPlayerMatch ? { ...this.twoPlayerMatch } : null,
      isTwoPlayerPaused: this.state === 'PAUSED' && this.pausedFromState !== 'PLAYING',
      activeCharacterId: sel.characterId,
      activeSkinId: skinId,
      activeWorldId,
      activeWeather,
      activePowerUps: this.powerUps.getActiveStatuses(),
      reviveRemainingSec: this.reviveTimer,
      latestPowerUpBanner: this.latestPowerUpBanner,
      runCoinsCollected: this.powerUps.effects.runCoinsCollected,
      runGemsCollected: this.powerUps.effects.runGemsCollected,
    });
  }

  private updateCountdown(dt: number, nextPlayingState: 'PLAYER_1_PLAYING' | 'PLAYER_2_PLAYING'): void {
    this.background.update(dt, 0.55);
    this.ground.update(dt, 0.65);
    this.player.updateIdle(this.elapsedTime, dt);
    this.renderer.updateEffects(dt, false);

    this.countdownElapsed += dt;

    if (this.countdownElapsed >= COUNTDOWN_GO_END_SECONDS) {
      this.countdownStep = null;
      this.state = nextPlayingState;
      this.emitUIState();
      return;
    }

    let nextStep: CountdownStep = 3;
    if (this.countdownElapsed >= COUNTDOWN_STEP_SECONDS * 3) {
      nextStep = 'GO';
    } else if (this.countdownElapsed >= COUNTDOWN_STEP_SECONDS * 2) {
      nextStep = 1;
    } else if (this.countdownElapsed >= COUNTDOWN_STEP_SECONDS) {
      nextStep = 2;
    }

    if (nextStep !== this.countdownStep) {
      this.countdownStep = nextStep;
      if (nextStep === 'GO') {
        audioManager.playCountdownGo();
        vibrationManager.vibrateScore();
      } else {
        audioManager.playCountdownTick();
        vibrationManager.vibrateCountdown();
      }
      this.emitUIState();
    }
  }

  private checkPowerUpAchievements(): void {
    const newlyUnlocked = achievementManager.checkPowerUpMetrics(
      currencyManager.getSnapshot().stats,
      this.powerUps.effects.runPowerUpsCollected
    );
    if (newlyUnlocked.length > 0 && this.onAchievementsUnlocked) {
      this.onAchievementsUnlocked(newlyUnlocked);
    }
  }

  private triggerGameOver(reason: 'pipe' | 'ground' | 'ceiling', slot: PlayerSlot | null): void {
    this.player.isDead = true;
    this.player.vy = reason === 'ground' ? 0 : -110;
    this.deathElapsed = 0;
    this.gameOverPanelShown = false;
    this.currentGameOverReaction = gameOverReactionSystem.pickReaction(this.score.current);
    this.renderer.triggerCollisionEffect(this.player.x, this.player.y);
    audioManager.stopMusic();
    audioManager.playCollision();
    vibrationManager.vibrateCollision();

    if (slot === 1) {
      this.state = 'PLAYER_1_GAME_OVER';
      if (this.twoPlayerMatch) {
        this.twoPlayerMatch = {
          ...this.twoPlayerMatch,
          player1Score: this.score.current,
          status: 'player_1_done',
        };
      }
    } else if (slot === 2) {
      this.state = 'PLAYER_2_GAME_OVER';
      if (this.twoPlayerMatch) {
        this.twoPlayerMatch = {
          ...this.twoPlayerMatch,
          player2Score: this.score.current,
        };
      }
    } else {
      this.state = 'GAME_OVER';
      statsManager.recordGameCompleted(this.score.current);
      this.evaluateCharacterUnlocks(true);
      this.evaluateWorldUnlocks(true);
    }

    this.emitUIState();
  }

  private handleScoreAdvance(
    slot: PlayerSlot | null,
    newBestTriggered: boolean,
    spawnBurst: boolean
  ): void {
    if (spawnBurst) {
      this.renderer.particles.spawnScoreBurst(this.player.x, this.player.y);
    }

    if (slot === null) {
      statsManager.recordPipePassed(this.score.current);

      const newlyUnlocked = achievementManager.checkScore(this.score.current);
      if (newlyUnlocked.length > 0 && this.onAchievementsUnlocked) {
        this.onAchievementsUnlocked(newlyUnlocked);
      }

      if (newBestTriggered) {
        this.newBestEventId += 1;
        this.renderer.particles.spawnNewBestCelebration();
        audioManager.playNewBest();
      } else if (spawnBurst) {
        audioManager.playScore();
      }
    } else if (spawnBurst) {
      audioManager.playScore();
    }

    if (spawnBurst) {
      vibrationManager.vibrateScore();
    }
  }

  private updateActiveGameplay(dt: number, slot: PlayerSlot | null): void {
    const diff = difficultyManager.getForScore(this.score.current);
    const speedFactor = diff.difficultyMultiplier;
    const envSlowMult = this.powerUps.effects.getEnvironmentSpeedMultiplier();
    const effectiveSpeedFactor = speedFactor * envSlowMult;

    this.background.update(dt, (0.85 + (speedFactor - 1) * 0.45) * envSlowMult);
    this.ground.update(dt, effectiveSpeedFactor);
    this.pipes.update(dt, this.score.current, envSlowMult);
    this.physics.updatePlayer(
      this.player,
      dt,
      this.powerUps.effects.getGravityScale(),
      this.powerUps.effects.getMaxFallVelocityScale()
    );
    this.score.update(dt);

    const prevStatuses = this.powerUps.getActiveStatuses();
    const powerUpOut = this.powerUps.update(dt, {
      player: this.player,
      pipes: this.pipes.getPipes(),
      basePipeSpeed: diff.speed,
      difficultyMultiplier: speedFactor,
      particles: this.renderer.particles,
      emitPickupSounds: true,
    });

    if (powerUpOut.banner) {
      this.latestPowerUpBanner = powerUpOut.banner;
      this.checkPowerUpAchievements();
    }
    if (powerUpOut.currencyChanged) {
      this.checkPowerUpAchievements();
    }

    let bonusNewBest = false;
    if (powerUpOut.bonusScoreEarned > 0 && !this.player.isDead) {
      const bonusRes = this.score.addBonus(powerUpOut.bonusScoreEarned, this.player.isDead);
      if (bonusRes.scored) {
        bonusNewBest = bonusRes.newBestTriggered;
        this.handleScoreAdvance(slot, bonusRes.newBestTriggered, false);
      }
    }

    this.renderer.updateEffects(dt, false);

    // Check collision BEFORE pipe pass scoring so fatal frames never award extra points
    const groundY = GAME_CONFIG.worldHeight - GAME_CONFIG.groundHeight;
    const result = this.collision.check(this.player, this.pipes.getPipes(), groundY);
    if (result.collided) {
      const reason = result.reason ?? 'pipe';
      const hitResolution = this.powerUps.handleCollision(
        reason,
        this.player,
        groundY,
        this.renderer.particles
      );
      if (hitResolution.shieldBroken) {
        this.checkPowerUpAchievements();
      }
      if (hitResolution.survived) {
        this.emitUIState();
        return;
      }
      if (hitResolution.offerRevive) {
        this.reviveFromSlot = slot;
        this.reviveCollisionReason = reason;
        this.reviveTimer = 5.0;
        this.state = 'REVIVE_PROMPT';
        audioManager.pauseGameplayAudio();
        this.emitUIState();
        return;
      }

      this.triggerGameOver(reason, slot);
      return;
    }

    const scoreResult = this.score.checkPipes(
      this.pipes.getPipes(),
      this.player.x,
      this.player.isDead
    );

    if (scoreResult.scored) {
      this.handleScoreAdvance(slot, scoreResult.newBestTriggered, true);
      this.emitUIState();
      return;
    }

    const nextStatuses = this.powerUps.getActiveStatuses();
    const statusChanged =
      prevStatuses.length !== nextStatuses.length ||
      powerUpOut.banner !== null ||
      powerUpOut.currencyChanged ||
      powerUpOut.bonusScoreEarned > 0 ||
      bonusNewBest;

    this.hudSyncTimer += dt;
    if (statusChanged || (nextStatuses.some((s) => !s.isCharge) && this.hudSyncTimer >= 0.1)) {
      this.hudSyncTimer = 0;
      this.emitUIState();
    }
  }

  private updateDeathSequence(dt: number, allowNewBestCelebration: boolean): void {
    this.deathElapsed += dt;
    const slowMoScale = this.deathElapsed < GAME_CONFIG.effects.slowMoDuration ? 0.38 : 1;
    const scaledDt = dt * slowMoScale;

    const groundY = GAME_CONFIG.worldHeight - GAME_CONFIG.groundHeight;
    this.player.updateDeathFall(scaledDt, groundY);
    this.renderer.updateEffects(dt, false);

    if (!this.gameOverPanelShown && this.deathElapsed >= 0.42) {
      this.gameOverPanelShown = true;
      if (allowNewBestCelebration && this.score.isNewBest) {
        this.renderer.particles.spawnNewBestCelebration();
      }
      audioManager.playGameOver();
      vibrationManager.vibrateGameOver();
      this.emitUIState();
      this.flushPendingCharacterUnlocks();
      this.flushPendingWorldUnlocks();
    }
  }

  private update(dt: number): void {
    this.elapsedTime += dt;

    if (
      this.state === 'MAIN_MENU' ||
      this.state === 'WORLD_SELECT' ||
      this.state === 'WORLD_COLLECTION' ||
      this.state === 'CHARACTER_COLLECTION' ||
      this.state === 'CHARACTER_SELECT' ||
      this.state === 'CHARACTER_EDITOR' ||
      this.state === 'LEADERBOARD' ||
      this.state === 'ACHIEVEMENTS' ||
      this.state === 'STATS' ||
      this.state === 'SETTINGS' ||
      this.state === 'ABOUT' ||
      this.state === 'TWO_PLAYER_SETUP' ||
      this.state === 'PLAYER_2_TRANSITION' ||
      this.state === 'ROUND_RESULT' ||
      this.state === 'MATCH_RESULT'
    ) {
      const menuDrift = this.reducedMotion ? 0.08 : 0.35;
      this.background.update(dt, menuDrift, false);
      this.ground.update(dt, menuDrift);
      this.renderer.updateEffects(
        dt,
        this.state === 'MAIN_MENU' || this.state === 'MATCH_RESULT'
      );
      return;
    }

    if (this.state === 'PAUSED') {
      return;
    }

    if (this.state === 'REVIVE_PROMPT') {
      this.renderer.updateEffects(dt, false);
      this.reviveTimer = Math.max(0, this.reviveTimer - dt);
      if (this.reviveTimer <= 0) {
        this.declineRevive();
        return;
      }
      this.hudSyncTimer += dt;
      if (this.hudSyncTimer >= 0.1) {
        this.hudSyncTimer = 0;
        this.emitUIState();
      }
      return;
    }

    if (this.state === 'READY') {
      this.background.update(dt, 0.55);
      this.ground.update(dt, 0.65);
      this.player.updateIdle(this.elapsedTime, dt);
      this.renderer.updateEffects(dt, false);
      return;
    }

    if (this.state === 'PLAYER_1_READY') {
      this.updateCountdown(dt, 'PLAYER_1_PLAYING');
      return;
    }

    if (this.state === 'PLAYER_2_READY') {
      this.updateCountdown(dt, 'PLAYER_2_PLAYING');
      return;
    }

    if (this.state === 'PLAYING') {
      this.updateActiveGameplay(dt, null);
      return;
    }

    if (this.state === 'PLAYER_1_PLAYING') {
      this.updateActiveGameplay(dt, 1);
      return;
    }

    if (this.state === 'PLAYER_2_PLAYING') {
      this.updateActiveGameplay(dt, 2);
      return;
    }

    if (this.state === 'GAME_OVER') {
      this.updateDeathSequence(dt, true);
      return;
    }

    if (this.state === 'PLAYER_1_GAME_OVER' || this.state === 'PLAYER_2_GAME_OVER') {
      this.updateDeathSequence(dt, false);
    }
  }
}
