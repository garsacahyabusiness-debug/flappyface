import { audioManager } from './audio/AudioManager';
import { Background } from './Background';
import { Collision } from './Collision';
import { GAME_CONFIG, GameState } from './Config';
import { GameOverReaction, gameOverReactionSystem } from './GameOverReaction';
import { Ground } from './Ground';
import { Input } from './Input';
import { Physics } from './Physics';
import { PipeManager } from './PipeManager';
import { Player } from './Player';
import { achievementManager, AchievementRecord } from './progression/AchievementManager';
import { DifficultyTierId } from './progression/DifficultyConfig';
import { difficultyManager } from './progression/DifficultyManager';
import { leaderboardManager } from './progression/LeaderboardManager';
import { statsManager } from './progression/StatsManager';
import { Renderer } from './Renderer';
import { Score } from './Score';
import { PerformanceMode } from './settings/SettingsManager';
import { vibrationManager } from './settings/VibrationManager';
import {
  createInitialMatchData,
  finalizeRoundInMatch,
  loadStoredPlayerNames,
  MatchFormat,
  PlayerSlot,
  saveStoredPlayerNames,
  TwoPlayerMatchData,
} from './TwoPlayerMatch';

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

  private state: GameState = 'MAIN_MENU';
  private pausedFromState: 'PLAYING' | 'PLAYER_1_PLAYING' | 'PLAYER_2_PLAYING' = 'PLAYING';
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
    onAchievementsUnlocked?: (achievements: AchievementRecord[]) => void
  ) {
    this.onStateChange = onStateChange;
    this.onAchievementsUnlocked = onAchievementsUnlocked;

    this.renderer = new Renderer(canvas);
    this.background = new Background();
    this.ground = new Ground();
    this.player = new Player();
    this.pipes = new PipeManager();
    this.physics = new Physics();
    this.collision = new Collision();
    this.score = new Score();

    statsManager.syncBestScore(this.score.best);

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
        this.elapsedTime
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

  public setCustomFaceImage(image: HTMLImageElement | null): void {
    this.defaultFaceImg = image;
    if (!this.isTwoPlayerActiveState()) {
      this.player.setCustomFaceImage(image);
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
        this.player.setCustomFaceImage(image);
      }
    } else {
      this.player2FaceImg = image;
      if (
        this.state === 'PLAYER_2_READY' ||
        this.state === 'PLAYER_2_PLAYING' ||
        this.state === 'PLAYER_2_GAME_OVER'
      ) {
        this.player.setCustomFaceImage(image);
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
      this.pipes.reset();
      this.player.reset();
      this.player.setCustomFaceImage(this.defaultFaceImg);
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
      this.score.reset(false);
      this.countdownStep = null;
      this.countdownElapsed = 0;
      this.gameOverPanelShown = false;
      this.currentGameOverReaction = null;
      audioManager.startMusic();
    }
    this.emitUIState();
  }

  public startReady(): void {
    this.pausedFromState = 'PLAYING';
    this.twoPlayerMatch = null;
    this.player.reset();
    this.player.setCustomFaceImage(this.defaultFaceImg);
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
  }

  public startTwoPlayerMatch(
    player1Name: string,
    player2Name: string,
    format: MatchFormat = 'quick'
  ): void {
    const saved = saveStoredPlayerNames(player1Name, player2Name, format);
    const initial = createInitialMatchData(saved.player1Name, saved.player2Name, format);
    this.twoPlayerMatch = {
      ...initial,
      startedAt: Date.now(),
      status: 'round_1',
    };
    this.beginTwoPlayerRound(1);
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

      if (finalized.winner === 'draw') {
        audioManager.playDraw();
        vibrationManager.vibrateDraw();
      } else {
        this.renderer.particles.spawnNewBestCelebration();
        audioManager.playVictory();
        vibrationManager.vibrateVictory();
      }
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
    this.beginTwoPlayerRound(1);
  }

  private beginTwoPlayerRound(slot: PlayerSlot): void {
    this.player.reset();
    this.player.setCustomFaceImage(slot === 1 ? this.player1FaceImg : this.player2FaceImg);
    this.pipes.reset();
    this.score.reset(false);
    this.ground.reset();
    this.renderer.resetEffects();
    this.deathElapsed = 0;
    this.gameOverPanelShown = false;
    this.currentGameOverReaction = null;
    this.countdownElapsed = 0;
    this.countdownStep = 3;
    this.state = slot === 1 ? 'PLAYER_1_READY' : 'PLAYER_2_READY';
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

  public resetProgression(): void {
    this.score.resetBest();
    achievementManager.reset();
    statsManager.reset();
    this.emitUIState();
  }

  private handleActionInput(): void {
    audioManager.unlock();

    if (this.state === 'READY') {
      this.state = 'PLAYING';
      this.physics.applyFlap(this.player);
      this.renderer.particles.spawnFlapPuff(this.player.x, this.player.y);
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
      this.renderer.particles.spawnFlapPuff(this.player.x, this.player.y);
      audioManager.playFlap();
      vibrationManager.vibrateFlap();
    }
  }

  private getActivePlayerSlot(): PlayerSlot | null {
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
      activePlayerSlot: this.getActivePlayerSlot(),
      twoPlayerMatch: this.twoPlayerMatch ? { ...this.twoPlayerMatch } : null,
      isTwoPlayerPaused: this.state === 'PAUSED' && this.pausedFromState !== 'PLAYING',
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

  private updateActiveGameplay(dt: number, slot: PlayerSlot | null): void {
    const diff = difficultyManager.getForScore(this.score.current);
    const speedFactor = diff.difficultyMultiplier;

    this.background.update(dt, 0.85 + (speedFactor - 1) * 0.45);
    this.ground.update(dt, speedFactor);
    this.pipes.update(dt, this.score.current);
    this.physics.updatePlayer(this.player, dt);
    this.score.update(dt);
    this.renderer.updateEffects(dt, false);

    // Check collision BEFORE scoring so fatal frames never award extra points
    const groundY = GAME_CONFIG.worldHeight - GAME_CONFIG.groundHeight;
    const result = this.collision.check(this.player, this.pipes.getPipes(), groundY);
    if (result.collided) {
      this.player.isDead = true;
      this.player.vy = result.reason === 'ground' ? 0 : -110;
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
      }

      this.emitUIState();
      return;
    }

    const scoreResult = this.score.checkPipes(
      this.pipes.getPipes(),
      this.player.x,
      this.player.isDead
    );

    if (scoreResult.scored) {
      this.renderer.particles.spawnScoreBurst(this.player.x, this.player.y);

      if (slot === null) {
        statsManager.recordPipePassed(this.score.current);

        const newlyUnlocked = achievementManager.checkScore(this.score.current);
        if (newlyUnlocked.length > 0 && this.onAchievementsUnlocked) {
          this.onAchievementsUnlocked(newlyUnlocked);
        }

        if (scoreResult.newBestTriggered) {
          this.newBestEventId += 1;
          this.renderer.particles.spawnNewBestCelebration();
          audioManager.playNewBest();
        } else {
          audioManager.playScore();
        }
      } else {
        audioManager.playScore();
      }

      vibrationManager.vibrateScore();
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
    }
  }

  private update(dt: number): void {
    this.elapsedTime += dt;

    if (
      this.state === 'MAIN_MENU' ||
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
      this.background.update(dt, menuDrift);
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
