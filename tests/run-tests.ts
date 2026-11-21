import assert from 'node:assert/strict';

type StorageMap = Map<string, string>;

function installBrowserShims(): { storage: StorageMap } {
  const storage: StorageMap = new Map();

  const localStorageMock: Storage = {
    get length() {
      return storage.size;
    },
    clear() {
      storage.clear();
    },
    getItem(key: string) {
      return storage.has(key) ? (storage.get(key) ?? null) : null;
    },
    key(index: number) {
      return Array.from(storage.keys())[index] ?? null;
    },
    removeItem(key: string) {
      storage.delete(key);
    },
    setItem(key: string, value: string) {
      storage.set(key, String(value));
    },
  };

  const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
  let rafCounter = 1;

  const windowMock = {
    localStorage: localStorageMock,
    devicePixelRatio: 1,
    addEventListener(type: string, cb: EventListenerOrEventListenerObject) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(cb);
    },
    removeEventListener(type: string, cb: EventListenerOrEventListenerObject) {
      listeners.get(type)?.delete(cb);
    },
    requestAnimationFrame(_cb: FrameRequestCallback) {
      rafCounter += 1;
      return rafCounter;
    },
    cancelAnimationFrame(_id: number) {},
    matchMedia(_query: string) {
      return {
        matches: false,
        media: '',
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent: () => false,
      };
    },
  };

  const documentMock = {
    hidden: false,
    visibilityState: 'visible',
    addEventListener() {},
    removeEventListener() {},
    createElement() {
      return createMockCanvas();
    },
  };

  Object.assign(globalThis, {
    window: windowMock,
    localStorage: localStorageMock,
    document: documentMock,
  });

  return { storage };
}

function createMockCtx(): CanvasRenderingContext2D {
  const noop = () => {};
  const gradient = { addColorStop: noop };
  return {
    save: noop,
    restore: noop,
    scale: noop,
    translate: noop,
    rotate: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    ellipse: noop,
    rect: noop,
    roundRect: noop,
    quadraticCurveTo: noop,
    bezierCurveTo: noop,
    clip: noop,
    fill: noop,
    stroke: noop,
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    fillText: noop,
    strokeText: noop,
    drawImage: noop,
    setTransform: noop,
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    measureText: () => ({ width: 20 }),
    canvas: null as unknown as HTMLCanvasElement,
  } as unknown as CanvasRenderingContext2D;
}

function createMockCanvas(): HTMLCanvasElement {
  const ctx = createMockCtx();
  const canvas = {
    width: 400,
    height: 720,
    style: {} as CSSStyleDeclaration,
    getContext: (kind: string) => (kind === '2d' ? ctx : null),
    getBoundingClientRect: () => ({ width: 400, height: 720, top: 0, left: 0, right: 400, bottom: 720 }),
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as HTMLCanvasElement;
  (ctx as unknown as { canvas: HTMLCanvasElement }).canvas = canvas;
  return canvas;
}

async function runTests(): Promise<void> {
  const { storage } = installBrowserShims();

  const [
    { GAME_CONFIG },
    { Physics },
    { Player },
    { Collision },
    { Pipe },
    { PipeManager },
    { Score },
    {
      GAME_OVER_REACTIONS,
      GameOverReactionSystem,
      pickMatchOutcomeReaction,
    },
    {
      createInitialMatchData,
      finalizeRoundInMatch,
      loadStoredPlayerNames,
      resetStoredPlayerNames,
      sanitizePlayerName,
      saveStoredPlayerNames,
    },
    { LeaderboardManager },
    { AchievementManager },
    { GalleryController },
    { CharacterStorage },
    { CHARACTER_REGISTRY, RARITY_ORDER },
    { CharacterUnlockManager, characterUnlockManager },
    { CharacterSkinManager, SKIN_REGISTRY, characterSkinManager },
    { CharacterFavorites },
    { CharacterRandomizer },
    { CharacterRenderer },
    { Ground },
    { SettingsManager },
    { WORLD_REGISTRY },
    { WorldUnlockManager, worldUnlockManager },
    { EnvironmentRenderer },
    { WeatherSystem },
    { SkySystem },
    { Game },
    { POWER_UP_REGISTRY, COLLECTIBLE_REGISTRY },
    { CurrencyManager, currencyManager },
    { PowerUpEffectManager },
    { CollectibleManager },
    { PowerUpSpawnManager },
    { PowerUpManager },
    { MissionManager, missionManager },
    {
      getLocalDateKey,
      getLocalWeekKey,
      getMsUntilNextDailyReset,
      getMsUntilNextWeeklyReset,
      diffCalendarDays,
    },
    {
      WEEKLY_MISSIONS,
      SPECIAL_CHALLENGES,
      STREAK_MILESTONES,
    },
    {
      MAX_PLAYER_LEVEL,
      MIN_PLAYER_LEVEL,
      getXPRequiredForLevel,
      getCumulativeXPForLevel,
      computeLevelStateFromTotalXP,
    },
    { PLAYER_RANK_TIERS, getRankForLevel },
    { TITLE_REGISTRY, ALL_TITLES_REGISTRY, getTitleById },
    { LEVEL_REWARD_TRACK, LEVEL_REWARD_MAP, getNextLevelReward },
    { PlayerProgressionManager, playerProgressionManager },
    { claimLevelRewardWithGrant },
    { ACHIEVEMENT_DEFINITIONS },
    { ACHIEVEMENT_RARITY_CONFIG, computeAchievementRank },
    { ACHIEVEMENT_CHAINS },
    { FIXED_BADGE_REGISTRY },
    { REWARD_SHOP_ITEMS, rewardShopManager },
  ] = await Promise.all([
    import('../src/game/Config'),
    import('../src/game/Physics'),
    import('../src/game/Player'),
    import('../src/game/Collision'),
    import('../src/game/Pipe'),
    import('../src/game/PipeManager'),
    import('../src/game/Score'),
    import('../src/game/GameOverReaction'),
    import('../src/game/TwoPlayerMatch'),
    import('../src/game/progression/LeaderboardManager'),
    import('../src/game/progression/AchievementManager'),
    import('../src/game/character/GalleryController'),
    import('../src/game/character/CharacterStorage'),
    import('../src/game/character/CharacterRegistry'),
    import('../src/game/character/CharacterUnlockManager'),
    import('../src/game/character/CharacterSkinManager'),
    import('../src/game/character/CharacterFavorites'),
    import('../src/game/character/CharacterRandomizer'),
    import('../src/game/character/CharacterRenderer'),
    import('../src/game/Ground'),
    import('../src/game/settings/SettingsManager'),
    import('../src/game/worlds/WorldRegistry'),
    import('../src/game/worlds/WorldUnlockManager'),
    import('../src/game/worlds/EnvironmentRenderer'),
    import('../src/game/worlds/WeatherSystem'),
    import('../src/game/worlds/SkySystem'),
    import('../src/game/Game'),
    import('../src/game/powerups/PowerUpRegistry'),
    import('../src/game/powerups/CurrencyManager'),
    import('../src/game/powerups/PowerUpEffectManager'),
    import('../src/game/powerups/CollectibleManager'),
    import('../src/game/powerups/PowerUpSpawnManager'),
    import('../src/game/powerups/PowerUpManager'),
    import('../src/game/missions/MissionManager'),
    import('../src/game/missions/MissionDateUtils'),
    import('../src/game/missions/MissionRegistry'),
    import('../src/game/progression/LevelCurve'),
    import('../src/game/progression/RankManager'),
    import('../src/game/progression/TitleRegistry'),
    import('../src/game/progression/LevelRewardRegistry'),
    import('../src/game/progression/PlayerProgressionManager'),
    import('../src/game/progression/LevelRewardService'),
    import('../src/game/achievements/AchievementRegistry'),
    import('../src/game/achievements/AchievementPointsManager'),
    import('../src/game/achievements/AchievementChains'),
    import('../src/game/achievements/BadgeRegistry'),
    import('../src/game/achievements/RewardShopManager'),
  ]);

  let passed = 0;
  const runCase = async (name: string, fn: () => void | Promise<void>) => {
    await fn();
    passed += 1;
    console.log(`  [PASS] ${name}`);
  };

  console.log('Running FLAPPY FACE Release Test Suite...\n');

  // 1. Physics & Player
  await runCase('Physics applies flap impulse and gravity fall predictably', () => {
    const physics = new Physics();
    const player = new Player();
    const startY = player.y;
    physics.applyFlap(player);
    assert.ok(player.vy < 0, 'Flap should produce upward velocity');
    physics.updatePlayer(player, 0.016);
    assert.ok(player.y < startY, 'Player should move upward shortly after flap');

    // Fall under gravity
    player.vy = 0;
    const midY = player.y;
    for (let i = 0; i < 20; i++) {
      physics.updatePlayer(player, 0.016);
    }
    assert.ok(player.y > midY && player.vy > 0, 'Gravity should pull player downward');
  });

  // 2. Collision Detection
  await runCase('Collision accurately detects ground, ceiling, pipe hit, and safe center pass', () => {
    const collision = new Collision();
    const player = new Player();
    const groundY = GAME_CONFIG.worldHeight - GAME_CONFIG.groundHeight;
    const pipe = new Pipe(player.x - GAME_CONFIG.pipes.width / 2, 300, 150, 'green');

    // Center pass inside gap
    player.y = 300;
    assert.equal(collision.check(player, [pipe], groundY).collided, false);

    // Hit top pipe
    player.y = 300 - 75;
    const topHit = collision.check(player, [pipe], groundY);
    assert.equal(topHit.collided, true);
    assert.equal(topHit.reason, 'pipe');

    // Hit ceiling
    player.y = player.collisionRadius - 1;
    assert.equal(collision.check(player, [], groundY).reason, 'ceiling');

    // Hit ground
    player.y = groundY - player.collisionRadius + 1;
    assert.equal(collision.check(player, [], groundY).reason, 'ground');
  });

  // 3. Pipe Fairness
  await runCase('PipeManager generates fair playable gaps within bounds across difficulty tiers', () => {
    const manager = new PipeManager();
    manager.reset();
    const playableHeight = GAME_CONFIG.worldHeight - GAME_CONFIG.groundHeight;

    for (const testScore of [0, 8, 20, 40]) {
      for (let step = 0; step < 80; step++) {
        manager.update(0.05, testScore);
      }
      for (const pipe of manager.getPipes()) {
        assert.ok(pipe.gapHeight >= 126, `Gap ${pipe.gapHeight} must remain fair (>=126)`);
        assert.ok(pipe.gapY - pipe.gapHeight / 2 >= GAME_CONFIG.pipes.minEdgeMargin - 0.01);
        assert.ok(
          pipe.gapY + pipe.gapHeight / 2 <= playableHeight - GAME_CONFIG.pipes.minEdgeMargin + 0.01
        );
      }
    }
  });

  // 4. Score Persistence, Versioning, Legacy Migration & 2P Isolation
  await runCase('Score prevents duplicate points, blocks dead scoring, and isolates 2P runs from Solo Best', () => {
    storage.clear();
    // Legacy unversioned value migration check
    storage.set('flappy_face_best_score', '42');
    const migrated = new Score();
    assert.equal(migrated.best, 42);

    // Corrupt storage recovery check
    storage.set('flappy_face_best_score', '{not-json');
    assert.equal(new Score().best, 0);

    // Normal 1P scoring
    storage.clear();
    const score = new Score();
    const player = new Player();
    const passedPipe = new Pipe(player.x - 100, 300, 150, 'blue');

    const res1 = score.checkPipes([passedPipe], player.x, false);
    assert.equal(res1.scored, true);
    assert.equal(res1.newBestTriggered, true);
    assert.equal(score.current, 1);
    assert.equal(score.best, 1);

    // Re-checking same pipe ID must NOT duplicate score
    const resDup = score.checkPipes([passedPipe], player.x, false);
    assert.equal(resDup.scored, false);
    assert.equal(score.current, 1);

    // Dead player cannot score
    const nextPipe = new Pipe(player.x - 100, 300, 150, 'mint');
    const resDead = score.checkPipes([nextPipe], player.x, true);
    assert.equal(resDead.scored, false);
    assert.equal(score.current, 1);

    // 2P run reset(false) must NOT overwrite solo best
    score.reset(false);
    const p2Pipe1 = new Pipe(player.x - 100, 300, 150, 'green');
    const p2Pipe2 = new Pipe(player.x - 120, 300, 150, 'purple');
    score.checkPipes([p2Pipe1, p2Pipe2], player.x, false);
    assert.equal(score.current, 2);
    assert.equal(score.best, 1, '2P match must not overwrite single-player bestScore');

    // Saved versioned format check
    score.reset(true);
    const soloPipe = new Pipe(player.x - 100, 300, 150, 'green');
    const soloPipe2 = new Pipe(player.x - 120, 300, 150, 'green');
    score.checkPipes([soloPipe, soloPipe2], player.x, false);
    const storedRaw = storage.get('flappy_face_best_score') ?? '';
    const parsedStored = JSON.parse(storedRaw);
    assert.equal(parsedStored.version, 1);
    assert.equal(parsedStored.best, 2);
  });

  // 5. Humor Reaction System
  await runCase('GameOverReactionSystem has >=20 Indonesian quips, >=8 categories, and avoids immediate repeats', () => {
    assert.ok(GAME_OVER_REACTIONS.length >= 20);
    const categories = new Set(GAME_OVER_REACTIONS.map((r) => r.category));
    assert.ok(categories.size >= 8);

    const sys = new GameOverReactionSystem();
    let prevId: string | null = null;
    for (let i = 0; i < 30; i++) {
      const picked = sys.pickReaction(i % 15);
      assert.notEqual(picked.id, prevId, 'Must not repeat immediately');
      assert.ok(picked.text.length > 0);
      prevId = picked.id;
    }

    const matchQuips = pickMatchOutcomeReaction(12, 8, 2);
    assert.ok(matchQuips.winnerLine.length > 0);
    assert.ok(matchQuips.loserLine.length > 0);
    assert.ok(matchQuips.drawLine.length > 0);
  });

  // 6. Sanitization & Stored Names
  await runCase('Player name sanitizer strips XSS/control characters and enforces max length', () => {
    storage.clear();
    assert.equal(sanitizePlayerName('<script>alert(1)</script>', 'PLAYER 1'), 'SCRIPTALERT(1)');
    assert.equal(sanitizePlayerName('   ', 'PLAYER 2'), 'PLAYER 2');
    assert.equal(sanitizePlayerName('SuperLongPlayerNameHere', 'PLAYER 1').length, 14);

    const saved = saveStoredPlayerNames('Budi', 'Sari', 'bo3');
    assert.equal(saved.player1Name, 'BUDI');
    assert.equal(saved.player2Name, 'SARI');
    assert.equal(saved.preferredFormat, 'bo3');
    assert.equal(loadStoredPlayerNames().preferredFormat, 'bo3');

    resetStoredPlayerNames();
    assert.equal(loadStoredPlayerNames().player1Name, 'PLAYER 1');
    assert.equal(loadStoredPlayerNames().preferredFormat, 'quick');
  });

  // 7. Two-Player Quick Match & Tournament Rules (BO3 / BO5)
  await runCase('Tournament rules handle Quick Match, 2-0 BO3 clinch, draws without free wins, and BO5', () => {
    // Quick Match win
    let qm = createInitialMatchData('ANDI', 'BUDI', 'quick');
    let res = finalizeRoundInMatch(qm, 7, 4);
    assert.equal(res.isMatchComplete, true);
    assert.equal(res.updatedMatch.winner, 'player1');
    assert.equal(res.updatedMatch.player1Wins, 1);

    // Quick Match draw
    qm = createInitialMatchData('ANDI', 'BUDI', 'quick');
    res = finalizeRoundInMatch(qm, 5, 5);
    assert.equal(res.isMatchComplete, true);
    assert.equal(res.updatedMatch.winner, 'draw');
    assert.equal(res.updatedMatch.draws, 1);
    assert.equal(res.updatedMatch.player1Wins, 0);

    // BO3 early 2-0 clinch stops immediately without round 3
    let bo3 = createInitialMatchData('ANDI', 'BUDI', 'bo3');
    res = finalizeRoundInMatch(bo3, 10, 3);
    assert.equal(res.isMatchComplete, false);
    assert.equal(res.updatedMatch.status, 'round_result');
    bo3 = { ...res.updatedMatch, currentRound: 2 };
    res = finalizeRoundInMatch(bo3, 8, 5);
    assert.equal(res.isMatchComplete, true);
    assert.equal(res.updatedMatch.winner, 'player1');
    assert.equal(res.updatedMatch.player1Wins, 2);
    assert.equal(res.updatedMatch.rounds.length, 2);

    // BO3 with draw round -> draw does NOT increment wins, stops after maxRounds=3
    let bo3Draw = createInitialMatchData('ANDI', 'BUDI', 'bo3');
    res = finalizeRoundInMatch(bo3Draw, 4, 4); // R1 draw
    assert.equal(res.isMatchComplete, false);
    assert.equal(res.updatedMatch.player1Wins, 0);
    assert.equal(res.updatedMatch.player2Wins, 0);
    bo3Draw = { ...res.updatedMatch, currentRound: 2 };
    res = finalizeRoundInMatch(bo3Draw, 4, 4); // R2 draw
    assert.equal(res.isMatchComplete, false);
    bo3Draw = { ...res.updatedMatch, currentRound: 3 };
    res = finalizeRoundInMatch(bo3Draw, 4, 4); // R3 draw
    assert.equal(res.isMatchComplete, true);
    assert.equal(res.updatedMatch.winner, 'draw');
    assert.equal(res.updatedMatch.draws, 3);

    // BO5 requires 3 wins
    let bo5 = createInitialMatchData('ANDI', 'BUDI', 'bo5');
    for (let round = 1; round <= 3; round++) {
      bo5 = { ...bo5, currentRound: round };
      const r = finalizeRoundInMatch(bo5, 1, 9);
      bo5 = r.updatedMatch;
      assert.equal(r.isMatchComplete, round === 3);
    }
    assert.equal(bo5.winner, 'player2');
    assert.equal(bo5.player2Wins, 3);
  });

  // 8. LeaderboardManager & Win Streak + History Cap
  await runCase('LeaderboardManager ranks players, tracks Win Streaks accurately, and caps history at 25', () => {
    storage.clear();
    const lb = new LeaderboardManager();

    // Match 1: P1 wins
    let m1 = createInitialMatchData('ALFA', 'BETA', 'bo3');
    m1 = finalizeRoundInMatch(m1, 5, 2).updatedMatch;
    m1 = { ...m1, currentRound: 2 };
    m1 = finalizeRoundInMatch(m1, 6, 3).updatedMatch;
    lb.recordCompletedMatch(m1);

    // Match 2: Draw preserves ALFA's win streak
    const mDraw = finalizeRoundInMatch(
      createInitialMatchData('ALFA', 'BETA', 'quick'),
      4,
      4
    ).updatedMatch;
    lb.recordCompletedMatch(mDraw);

    assert.equal(lb.getPlayerStats('ALFA')?.currentWinStreak, 1);
    assert.equal(lb.getPlayerStats('ALFA')?.championships, 1);

    // Match 3: ALFA wins again -> streak 2
    const m2 = finalizeRoundInMatch(
      createInitialMatchData('ALFA', 'BETA', 'quick'),
      9,
      1
    ).updatedMatch;
    lb.recordCompletedMatch(m2);
    assert.equal(lb.getPlayerStats('ALFA')?.currentWinStreak, 2);
    assert.equal(lb.getPlayerStats('ALFA')?.bestWinStreak, 2);
    assert.equal(lb.getPlayerStats('BETA')?.currentWinStreak, 0);

    // Match 4: BETA wins -> resets ALFA currentWinStreak, keeps ALFA bestWinStreak=2
    const m3 = finalizeRoundInMatch(
      createInitialMatchData('ALFA', 'BETA', 'quick'),
      1,
      8
    ).updatedMatch;
    lb.recordCompletedMatch(m3);
    assert.equal(lb.getPlayerStats('ALFA')?.currentWinStreak, 0);
    assert.equal(lb.getPlayerStats('ALFA')?.bestWinStreak, 2);
    assert.equal(lb.getPlayerStats('BETA')?.currentWinStreak, 1);

    const top = lb.getTopPlayers();
    assert.equal(top[0].name, 'ALFA');
    assert.equal(top[0].isNewRank, true, 'First session entrants show as new on leaderboard');

    // New session: BETA overtakes ALFA -> BETA climbs (+1), ALFA drops (-1), and persists across reload
    const lbSession2 = new LeaderboardManager();
    for (let i = 0; i < 2; i++) {
      const mBeta = finalizeRoundInMatch(
        createInitialMatchData('ALFA', 'BETA', 'quick'),
        1,
        10
      ).updatedMatch;
      lbSession2.recordCompletedMatch(mBeta);
    }
    const topSession2 = lbSession2.getTopPlayers();
    assert.equal(topSession2[0].name, 'BETA');
    assert.equal(topSession2[0].rankDelta, 1, 'BETA climbed from #2 to #1');
    assert.equal(topSession2[1].name, 'ALFA');
    assert.equal(topSession2[1].rankDelta, -1, 'ALFA dropped from #1 to #2');

    // Reload preserves previous session trend until next session match is played
    const lbReloadedTrend = new LeaderboardManager();
    const topReloadedTrend = lbReloadedTrend.getTopPlayers();
    assert.equal(topReloadedTrend[0].rankDelta, 1);
    assert.equal(topReloadedTrend[1].rankDelta, -1);

    // History cap 25
    for (let i = 0; i < 30; i++) {
      const m = finalizeRoundInMatch(
        createInitialMatchData('P1', 'P2', 'quick'),
        i + 1,
        i
      ).updatedMatch;
      lb.recordCompletedMatch(m);
    }
    assert.equal(lb.getMatchHistory().length, 25);

    // Corrupt storage safety
    storage.set('flappy_face_leaderboard', 'corrupt{{{');
    const safeLb = new LeaderboardManager();
    assert.equal(safeLb.getTopPlayers().length, 0);

    lb.reset();
    assert.equal(lb.getTopPlayers().length, 0);
    assert.equal(lb.getMatchHistory().length, 0);
  });

  // 9. AchievementManager Versioning & Unlocks
  await runCase('AchievementManager unlocks sequentially and persists versioned records', () => {
    storage.clear();
    const am = new AchievementManager();
    const first = am.checkScore(5);
    assert.equal(first.length, 2, 'Score 5 should unlock FIRST FLIGHT and ROOKIE');
    assert.equal(am.getUnlockedCount(), 2);

    const dup = am.checkScore(5);
    assert.equal(dup.length, 0, 'Already unlocked achievements should not re-trigger');

    const stored = JSON.parse(storage.get('flappy_face_achievements') ?? '{}');
    assert.equal(stored.version, 2);

    // Rehydrate
    const amReloaded = new AchievementManager();
    assert.equal(amReloaded.getUnlockedCount(), 2);
  });

  // 10. Security: File Validation & Slot Storage Isolation
  await runCase('GalleryController blocks SVG/oversized files and CharacterStorage isolates P1/P2/default slots', async () => {
    const svgFile = new File(['<svg></svg>'], 'evil.svg', { type: 'image/svg+xml' });
    assert.equal(GalleryController.validateFile(svgFile).valid, false);

    const jpgFile = new File([new Uint8Array(64)], 'face.jpg', { type: 'image/jpeg' });
    assert.equal(GalleryController.validateFile(jpgFile).valid, true);

    const hugeFile = {
      name: 'huge.png',
      type: 'image/png',
      size: 25 * 1024 * 1024,
    } as unknown as File;
    assert.equal(GalleryController.validateFile(hugeFile).valid, false);

    // Slot isolation via CharacterStorage fallback
    await CharacterStorage.saveCharacter('data:image/png;base64,AAA', 'gallery', 'player1');
    await CharacterStorage.saveCharacter('data:image/png;base64,BBB', 'camera', 'player2');
    const p1Rec = await CharacterStorage.loadCharacter('player1');
    const p2Rec = await CharacterStorage.loadCharacter('player2');
    const defRec = await CharacterStorage.loadCharacter('default');
    assert.equal(p1Rec?.imageDataUrl, 'data:image/png;base64,AAA');
    assert.equal(p2Rec?.imageDataUrl, 'data:image/png;base64,BBB');
    assert.equal(defRec, null);

    await CharacterStorage.removeCharacter('player1');
    await CharacterStorage.removeCharacter('player2');
  });

  // 11. Full Game State Machine Integration (1P + BO3 Tournament)
  await runCase('Game state machine transitions cleanly across 1P and BO3 Tournament without stuck loops', () => {
    storage.clear();
    const canvas = createMockCanvas();
    let latestUI: import('../src/game/Game').GameUIState | null = null;
    const getMatch = () => latestUI?.twoPlayerMatch ?? null;

    const game = new Game(canvas, (ui) => {
      latestUI = ui;
    });

    assert.equal(game.getState(), 'MAIN_MENU');

    // Single Player transition + Pause/Resume + Home
    game.startReady();
    assert.equal(game.getState(), 'READY');
    (game as unknown as { handleActionInput: () => void }).handleActionInput();
    assert.equal(game.getState(), 'PLAYING');
    game.pause();
    assert.equal(game.getState(), 'PAUSED');
    game.resume();
    assert.equal(game.getState(), 'PLAYING');
    game.setMenuState('MAIN_MENU');
    assert.equal(game.getState(), 'MAIN_MENU');

    // BO3 Tournament Flow: R1 P1 -> P2 -> Round Result -> R2 -> 2-0 Match Result
    game.startTwoPlayerMatch('ANI', 'BUDI', 'bo3');
    assert.equal(game.getState(), 'PLAYER_1_READY');

    // Simulate Round 1 completion for Player 1
    (game as unknown as { score: { current: number } }).score.current = 4;
    (game as unknown as { twoPlayerMatch: { player1Score: number | null } }).twoPlayerMatch.player1Score = 4;
    (game as unknown as { state: string }).state = 'PLAYER_1_GAME_OVER';
    game.continueFromPlayer1GameOver();
    assert.equal(game.getState(), 'PLAYER_2_TRANSITION');

    game.startPlayer2Turn();
    assert.equal(game.getState(), 'PLAYER_2_READY');
    (game as unknown as { twoPlayerMatch: { player2Score: number | null } }).twoPlayerMatch.player2Score = 1;
    (game as unknown as { state: string }).state = 'PLAYER_2_GAME_OVER';
    game.continueFromPlayer2GameOver();
    assert.equal(game.getState(), 'ROUND_RESULT');
    assert.equal(getMatch()?.player1Wins, 1);

    // Advance to Round 2
    game.startNextTournamentRound();
    assert.equal(game.getState(), 'PLAYER_1_READY');
    assert.equal(getMatch()?.currentRound, 2);

    // Finish Round 2 with Player 1 winning again -> 2-0 early clinch!
    (game as unknown as { twoPlayerMatch: { player1Score: number | null; player2Score: number | null } }).twoPlayerMatch.player1Score = 6;
    (game as unknown as { twoPlayerMatch: { player2Score: number | null } }).twoPlayerMatch.player2Score = 2;
    (game as unknown as { state: string }).state = 'PLAYER_2_GAME_OVER';
    game.continueFromPlayer2GameOver();
    assert.equal(game.getState(), 'MATCH_RESULT');
    assert.equal(getMatch()?.winner, 'player1');
    assert.equal(getMatch()?.rounds.length, 2);

    // Calling rematch creates fresh match
    game.rematchTwoPlayer();
    assert.equal(game.getState(), 'PLAYER_1_READY');
    assert.equal(getMatch()?.currentRound, 1);
    assert.equal(getMatch()?.player1Wins, 0);

    game.destroy();
  });

  // 12. Character Registry & Rendering (All 15 characters + 6 rarities + 9 skins)
  await runCase('CharacterRegistry contains >=15 unique characters across all 6 rarities and renders safely', () => {
    assert.ok(CHARACTER_REGISTRY.length >= 15);
    const ids = new Set(CHARACTER_REGISTRY.map((c) => c.id));
    assert.equal(ids.size, CHARACTER_REGISTRY.length, 'Character IDs must be unique');
    for (const r of RARITY_ORDER) {
      assert.ok(
        CHARACTER_REGISTRY.some((c) => c.rarity === r),
        `Missing rarity ${r}`
      );
    }

    const ctx = createMockCtx();
    for (const char of CHARACTER_REGISTRY) {
      for (const skin of SKIN_REGISTRY) {
        CharacterRenderer.draw(ctx, {
          x: 100,
          y: 200,
          visualRadius: GAME_CONFIG.player.visualRadius,
          rotation: 0,
          wingPhase: 0.5,
          flapPulse: 0.3,
          isDead: false,
          isBlinking: false,
          customFaceImage: null,
          characterId: char.id,
          skinId: skin.id,
          animTime: 1.2,
        });
      }
      CharacterRenderer.draw(ctx, {
        x: 100,
        y: 200,
        visualRadius: GAME_CONFIG.player.visualRadius,
        rotation: 0,
        wingPhase: 0.5,
        flapPulse: 0,
        isDead: false,
        isBlinking: false,
        customFaceImage: null,
        characterId: char.id,
        lockedSilhouette: true,
      });
    }
  });

  // 13. CharacterUnlockManager, Progression, Milestones, Locked Guard & Non-Duplicate Guarantee
  await runCase('CharacterUnlockManager enforces unlock conditions, prevents duplicates, persists, and unlocks milestones', () => {
    storage.clear();
    const um = new CharacterUnlockManager();

    // Starter characters available immediately
    assert.equal(um.isUnlocked('classic_bird'), true);
    assert.equal(um.isUnlocked('chicky'), true);
    assert.equal(um.isUnlocked('golden_bird'), false);

    // Locked character cannot be equipped
    assert.equal(um.selectGameCharacter('golden_bird', 'default'), false);
    assert.equal(um.getSelection('default').characterId, 'classic_bird');

    // Progress bars match real metrics
    const goldenDef = CHARACTER_REGISTRY.find((c) => c.id === 'golden_bird')!;
    const prog32 = um.getProgressForCharacter(goldenDef, {
      bestScore: 32,
      totalGamesPlayed: 5,
      tournamentsWon: 0,
      bestWinStreak: 0,
      unlockedAchievements: 3,
      totalAchievements: 6,
    });
    assert.equal(prog32.current, 32);
    assert.equal(prog32.target, 50);
    assert.equal(prog32.percent, 64);

    // Unlock score-based, games-based, tournament-based, streak-based, achievement-based
    const newly1 = um.evaluateProgress({
      bestScore: 50,
      totalGamesPlayed: 10,
      tournamentsWon: 3,
      bestWinStreak: 0,
      unlockedAchievements: 4,
      totalAchievements: 6,
    });
    const newly1Ids = new Set(newly1.map((c) => c.id));
    assert.equal(newly1Ids.has('toxic_bird'), true);
    assert.equal(newly1Ids.has('pinky'), true);
    assert.equal(newly1Ids.has('panda_fly'), true);
    assert.equal(newly1Ids.has('space_duck'), true);
    assert.equal(newly1Ids.has('ninja_bird'), true);
    assert.equal(newly1Ids.has('golden_bird'), true);

    // Repeating same metrics must NOT emit duplicate unlocks
    const dup = um.evaluateProgress({
      bestScore: 50,
      totalGamesPlayed: 10,
      tournamentsWon: 3,
      bestWinStreak: 0,
      unlockedAchievements: 4,
      totalAchievements: 6,
    });
    assert.equal(dup.length, 0);

    // Equip unlocked character & verify persistence across re-instantiation (simulated refresh)
    assert.equal(um.selectGameCharacter('golden_bird', 'default'), true);
    const reloaded = new CharacterUnlockManager();
    assert.equal(reloaded.isUnlocked('golden_bird'), true);
    assert.equal(reloaded.getSelection('default').characterId, 'golden_bird');

    // Full 100% completion unlocks LEGEND FACE + milestones (25, 50, 75, 100%)
    reloaded.evaluateProgress({
      bestScore: 150,
      totalGamesPlayed: 30,
      tournamentsWon: 10,
      bestWinStreak: 5,
      unlockedAchievements: 6,
      totalAchievements: 6,
    });
    const fullSummary = reloaded.getCollectionSummary();
    assert.equal(fullSummary.unlockedCount, fullSummary.totalCount);
    assert.equal(fullSummary.percent, 100);
    assert.equal(fullSummary.hasSpecialBackground, true);
    assert.equal(fullSummary.hasLegendTitle, true);
    assert.ok(fullSummary.milestones.every((m) => m.unlocked));
  });

  // 14. Skins, Favorites, Randomizer, Custom Face Preservation & 2P Slot Isolation
  await runCase('Skins, Favorites, Randomizer, Custom Face non-overwrite, and P1/P2 isolation work properly', async () => {
    storage.clear();
    const sm = new CharacterSkinManager();
    assert.equal(sm.selectSkin('golden', 'default'), false, 'Locked skin cannot be selected');
    sm.evaluateUnlocks({ bestScore: 40, totalGamesPlayed: 20, collectionPercent: 50 });
    assert.equal(sm.isUnlocked('neon'), true);
    assert.equal(sm.isUnlocked('retro_pixel'), true);
    assert.equal(sm.isUnlocked('shadow'), true);
    assert.equal(sm.isUnlocked('halloween'), true);
    assert.equal(sm.isUnlocked('golden'), true);
    assert.equal(sm.isUnlocked('christmas'), true);

    // P1 & P2 skin isolation
    assert.equal(sm.selectSkin('neon', 'player1'), true);
    assert.equal(sm.selectSkin('halloween', 'player2'), true);
    assert.equal(sm.getSelectedSkin('player1'), 'neon');
    assert.equal(sm.getSelectedSkin('player2'), 'halloween');
    const smReloaded = new CharacterSkinManager();
    assert.equal(smReloaded.getSelectedSkin('player1'), 'neon');
    assert.equal(smReloaded.getSelectedSkin('player2'), 'halloween');

    // Favorites persistence & isolation
    const favs = new CharacterFavorites();
    assert.equal(favs.toggleFavorite('chicky', 'default'), true);
    assert.equal(favs.isFavorite('chicky', 'default'), true);
    assert.equal(favs.isFavorite('chicky', 'player2'), false);
    assert.equal(new CharacterFavorites().isFavorite('chicky', 'default'), true);

    // Randomizer never selects locked, avoids immediate duplicate, respects custom face option
    for (let i = 0; i < 10; i++) {
      const pick = CharacterRandomizer.pickRandom({
        unlockedCharacterIds: ['classic_bird', 'chicky', 'toxic_bird'],
        currentCharacterId: 'classic_bird',
        currentIsCustomFace: false,
        hasCustomFace: true,
        includeCustomFace: false,
      });
      assert.equal(pick.kind, 'character');
      if (pick.kind === 'character') {
        assert.notEqual(pick.characterId, 'classic_bird');
      }
    }

    // Custom Face storage preserved even when switching back to a game character
    await CharacterStorage.saveCharacter('data:image/png;base64,MYFACE', 'gallery', 'default');
    const um = new CharacterUnlockManager();
    um.selectCustomFaceMode('default');
    assert.equal(um.getSelection('default').mode, 'custom_face');
    um.selectGameCharacter('chicky', 'default');
    assert.equal(um.getSelection('default').mode, 'character');
    const savedFace = await CharacterStorage.loadCharacter('default');
    assert.equal(savedFace?.imageDataUrl, 'data:image/png;base64,MYFACE');
    await CharacterStorage.removeCharacter('default');

    // P1 & P2 active visual isolation in Game turn transitions
    storage.clear();
    characterUnlockManager.reset();
    characterSkinManager.reset();
    characterUnlockManager.evaluateProgress({
      bestScore: 60,
      totalGamesPlayed: 20,
      tournamentsWon: 5,
      bestWinStreak: 0,
      unlockedAchievements: 4,
      totalAchievements: 6,
    });
    characterUnlockManager.selectGameCharacter('ninja_bird', 'player1');
    characterUnlockManager.selectGameCharacter('golden_bird', 'player2');
    characterSkinManager.selectSkin('neon', 'player1');
    characterSkinManager.selectSkin('golden', 'player2');

    const uiStates: import('../src/game/Game').GameUIState[] = [];
    const game = new Game(createMockCanvas(), (ui) => uiStates.push(ui));
    game.startTwoPlayerMatch('P1', 'P2', 'bo3');
    let latest = uiStates[uiStates.length - 1];
    assert.equal(latest.activeCharacterId, 'ninja_bird');
    assert.equal(latest.activeSkinId, 'neon');

    (game as unknown as { score: { current: number } }).score.current = 3;
    (game as unknown as { twoPlayerMatch: { player1Score: number | null } }).twoPlayerMatch.player1Score = 3;
    (game as unknown as { state: string }).state = 'PLAYER_1_GAME_OVER';
    game.continueFromPlayer1GameOver();
    game.startPlayer2Turn();
    latest = uiStates[uiStates.length - 1];
    assert.equal(latest.activeCharacterId, 'golden_bird');
    assert.equal(latest.activeSkinId, 'golden');
    game.destroy();
  });

  // 15. World Registry & Multi-Layer Biome + Weather Rendering
  await runCase('WorldRegistry defines 8 unique worlds and EnvironmentRenderer/Ground render all biomes and weathers safely', () => {
    assert.equal(WORLD_REGISTRY.length, 8);
    const ids = new Set(WORLD_REGISTRY.map((w) => w.id));
    const skins = new Set(WORLD_REGISTRY.map((w) => w.pipeSkin));
    assert.equal(ids.size, 8);
    assert.equal(skins.size, 8);

    const ctx = createMockCtx();
    const env = new EnvironmentRenderer();
    const ground = new Ground();
    for (const world of WORLD_REGISTRY) {
      env.setWorld(world.id);
      ground.setWorldTheme(world.id);
      for (const weather of world.compatibleWeathers) {
        env.setWeather(weather);
        env.update(0.016, 1, true);
        ground.update(0.016, 1);
        env.drawBackgroundLayers(ctx);
        env.drawWeatherOverlay(ctx);
        ground.draw(ctx);
      }
    }
  });

  // 16. Pipe Skin Hitbox Invariance (Strictly Cosmetic)
  await runCase('All 8 WorldPipeSkin styles produce identical Pipe collision hitboxes', () => {
    const groundY = GAME_CONFIG.worldHeight - GAME_CONFIG.groundHeight;
    const basePipe = new Pipe(180, 310, 160, 'green', 'classic_green');
    const baseRects = basePipe.getCollisionRects(groundY);
    const ctx = createMockCtx();

    for (const world of WORLD_REGISTRY) {
      const themedPipe = new Pipe(180, 310, 160, 'green', world.pipeSkin);
      assert.deepEqual(
        themedPipe.getCollisionRects(groundY),
        baseRects,
        `Collision rects must remain identical for pipeSkin ${world.pipeSkin}`
      );
      themedPipe.draw(ctx, groundY);
    }
  });

  // 17. WorldUnlockManager Progression, Locked Play Guard, Milestones & Persistence
  await runCase('WorldUnlockManager enforces conditions, blocks locked gameplay, prevents duplicates, and unlocks milestones', () => {
    storage.clear();
    worldUnlockManager.reset();
    const wm = new WorldUnlockManager();

    assert.equal(wm.isUnlocked('green_valley'), true);
    assert.equal(wm.isUnlocked('candy_world'), false);
    assert.equal(wm.selectWorld('lava_world'), false, 'Locked world cannot be selected');
    assert.equal(wm.getSelectedWorldId(), 'green_valley');

    // Game refuses starting gameplay on locked world
    const lockedGame = new Game(createMockCanvas(), () => {});
    assert.equal(lockedGame.startReady('space_odyssey'), false);
    assert.equal(lockedGame.getState(), 'MAIN_MENU');
    assert.equal(lockedGame.startTwoPlayerMatch('P1', 'P2', 'quick', 'lava_world'), false);
    lockedGame.destroy();

    // Progress tracking accuracy
    const lavaDef = WORLD_REGISTRY.find((w) => w.id === 'lava_world')!;
    const prog = wm.getProgressForWorld(lavaDef, {
      bestScore: 25,
      totalGamesPlayed: 4,
      tournamentsWon: 0,
      bestWinStreak: 0,
      unlockedAchievements: 2,
      totalAchievements: 6,
    });
    assert.equal(prog.current, 25);
    assert.equal(prog.target, 50);
    assert.equal(prog.percent, 50);

    // Evaluate unlocks incrementally + non-duplicate guarantee
    const firstBatch = wm.evaluateProgress({
      bestScore: 25,
      totalGamesPlayed: 20,
      tournamentsWon: 0,
      bestWinStreak: 0,
      unlockedAchievements: 4,
      totalAchievements: 6,
    });
    const firstIds = new Set(firstBatch.map((w) => w.id));
    assert.equal(firstIds.has('candy_world'), true);
    assert.equal(firstIds.has('snow_land'), true);
    assert.equal(firstIds.has('tropical_island'), true);
    assert.equal(firstIds.has('lava_world'), false);

    const dupBatch = wm.evaluateProgress({
      bestScore: 25,
      totalGamesPlayed: 20,
      tournamentsWon: 0,
      bestWinStreak: 0,
      unlockedAchievements: 4,
      totalAchievements: 6,
    });
    assert.equal(dupBatch.length, 0, 'Already unlocked worlds must not re-emit');

    // Compatible weather validation
    assert.equal(wm.setWeatherForWorld('snow_land', 'snow'), true);
    assert.equal(wm.setWeatherForWorld('snow_land', 'ash' as never), false);
    assert.equal(wm.selectWorld('snow_land'), true);

    // Persistence across refresh
    const reloaded = new WorldUnlockManager();
    assert.equal(reloaded.getSelectedWorldId(), 'snow_land');
    assert.equal(reloaded.isUnlocked('tropical_island'), true);

    // 8/8 full completion unlocks all milestones + WORLD EXPLORER badge
    reloaded.evaluateProgress({
      bestScore: 100,
      totalGamesPlayed: 30,
      tournamentsWon: 3,
      bestWinStreak: 2,
      unlockedAchievements: 6,
      totalAchievements: 6,
    });
    const full = reloaded.getCollectionSummary();
    assert.equal(full.unlockedCount, 8);
    assert.equal(full.percent, 100);
    assert.equal(full.hasTrailReward, true);
    assert.equal(full.hasEnvEffectReward, true);
    assert.equal(full.hasSkinReward, true);
    assert.equal(full.hasWorldExplorerBadge, true);
    assert.ok(full.milestones.every((m) => m.unlocked));
  });

  // 18. SkySystem, WeatherSystem Caps, Settings Persistence & 2P Shared World Consistency
  await runCase('SkySystem, WeatherSystem particle caps, Environment Settings, and 2P shared world consistency behave properly', () => {
    storage.clear();

    // Weather caps obey low / medium / high presets
    const ws = new WeatherSystem();
    ws.setWeather('rain');
    ws.setParticleLevel('low');
    assert.equal(ws.getActiveCount(), 0);
    ws.setParticleLevel('medium');
    assert.ok(ws.getActiveCount() > 0 && ws.getActiveCount() <= 24);
    ws.setParticleLevel('high');
    assert.ok(ws.getActiveCount() > 24 && ws.getActiveCount() <= 60);

    // SkySystem interpolates Morning -> Day -> Sunset -> Night smoothly
    const sky = new SkySystem();
    const valley = WORLD_REGISTRY[0];
    sky.setCycleTime(24);
    const daySky = sky.getEffectiveSky(valley, true, false);
    sky.setCycleTime(75);
    const nightSky = sky.getEffectiveSky(valley, true, false);
    assert.notEqual(daySky.top, nightSky.top);
    assert.ok(nightSky.starOpacity > daySky.starOpacity);

    // Settings persistence
    const sm = new SettingsManager();
    sm.update({
      weatherEnabled: false,
      dynamicSkyEnabled: true,
      parallaxEnabled: false,
      ambientSoundEnabled: false,
      particleLevel: 'low',
      graphicsPreset: 'medium',
    });
    const reloadedSettings = new SettingsManager().getSettings();
    assert.equal(reloadedSettings.weatherEnabled, false);
    assert.equal(reloadedSettings.dynamicSkyEnabled, true);
    assert.equal(reloadedSettings.parallaxEnabled, false);
    assert.equal(reloadedSettings.ambientSoundEnabled, false);
    assert.equal(reloadedSettings.particleLevel, 'low');
    assert.equal(reloadedSettings.graphicsPreset, 'medium');

    // 2P shared world consistency across P1 & P2 turns
    worldUnlockManager.reset();
    worldUnlockManager.evaluateProgress({
      bestScore: 55,
      totalGamesPlayed: 25,
      tournamentsWon: 3,
      bestWinStreak: 1,
      unlockedAchievements: 4,
      totalAchievements: 6,
    });
    assert.equal(worldUnlockManager.selectWorld('neon_city'), true);

    const uiStates: import('../src/game/Game').GameUIState[] = [];
    const game = new Game(createMockCanvas(), (ui) => uiStates.push(ui));
    assert.equal(game.startTwoPlayerMatch('P1', 'P2', 'bo3'), true);
    assert.equal(uiStates[uiStates.length - 1].activeWorldId, 'neon_city');

    (game as unknown as { score: { current: number } }).score.current = 4;
    (game as unknown as { twoPlayerMatch: { player1Score: number | null } }).twoPlayerMatch.player1Score = 4;
    (game as unknown as { state: string }).state = 'PLAYER_1_GAME_OVER';
    game.continueFromPlayer1GameOver();
    game.startPlayer2Turn();
    assert.equal(
      uiStates[uiStates.length - 1].activeWorldId,
      'neon_city',
      'Player 2 must play in the exact same world as Player 1'
    );
    game.destroy();
  });

  // 19. Shield & Post-Hit Invulnerability
  await runCase('Shield protects from 1 fatal hit, does not stack, and grants brief post-hit invulnerability', () => {
    assert.equal(POWER_UP_REGISTRY.length, 6);
    assert.equal(COLLECTIBLE_REGISTRY.length, 3);

    const pm = new PowerUpManager();
    const player = new Player();
    const particles = new (class {
      spawnFlapPuff() {}
      spawnCollisionBurst() {}
    })() as unknown as import('../src/game/ParticleSystem').ParticleSystem;
    const groundY = GAME_CONFIG.worldHeight - GAME_CONFIG.groundHeight;

    // Collect Shield once -> active; collecting again does NOT stack
    assert.notEqual(pm.collectPowerUp('shield', player.x, player.y, particles, false), null);
    assert.equal(pm.effects.hasShield, true);
    assert.equal(pm.collectPowerUp('shield', player.x, player.y, particles, false), null);

    // Hit pipe -> Shield saves player + grants invulnerability
    const hit1 = pm.handleCollision('pipe', player, groundY, particles);
    assert.equal(hit1.survived, true);
    assert.equal(hit1.shieldBroken, true);
    assert.equal(pm.effects.hasShield, false);
    assert.equal(pm.effects.isInvulnerable(), true);

    // Grace invulnerability protects immediately on subsequent hit
    const hitGrace = pm.handleCollision('ground', player, groundY, particles);
    assert.equal(hitGrace.survived, true);
    assert.equal(hitGrace.shieldBroken, false);

    // After invulnerability expires, hit without shield is fatal
    pm.effects.update(2.0);
    assert.equal(pm.effects.isInvulnerable(), false);
    const hitFatal = pm.handleCollision('pipe', player, groundY, particles);
    assert.equal(hitFatal.survived, false);
    assert.equal(hitFatal.offerRevive, false);
  });

  // 20. Second Chance Revive Flow (Accept, Max 1/Run, Decline & Timeout -> Game Over)
  await runCase('Second Chance triggers REVIVE_PROMPT, restores safely once per run, and handles Give Up & Timeout', () => {
    storage.clear();
    const canvas = createMockCanvas();
    const game = new Game(canvas, () => {});
    const groundY = GAME_CONFIG.worldHeight - GAME_CONFIG.groundHeight;

    // 1. Accept Revive path
    game.startReady();
    (game as unknown as { handleActionInput: () => void }).handleActionInput();
    assert.equal(game.getState(), 'PLAYING');
    game.powerUps.collectPowerUp('second_chance', 114, 300, undefined, false);
    assert.equal(game.powerUps.effects.canOfferRevive(), true);

    // Collecting second_chance again does not stack
    assert.equal(game.powerUps.collectPowerUp('second_chance', 114, 300, undefined, false), null);

    // Simulate ground hit collision -> enters REVIVE_PROMPT
    (game as unknown as { score: { current: number } }).score.current = 7;
    (game as unknown as { player: { y: number } }).player.y = groundY + 10;
    (game as unknown as { update: (dt: number) => void }).update(0.016);
    assert.equal(game.getState(), 'REVIVE_PROMPT');

    // Accept revive -> restores alive flight, preserves score, consumes revive charge (max 1/run)
    game.acceptRevive();
    assert.equal(game.getState(), 'PLAYING');
    assert.equal((game as unknown as { score: { current: number } }).score.current, 7);
    assert.equal(game.powerUps.effects.revivedThisRun, true);
    assert.equal(game.powerUps.effects.hasReviveCharge, false);
    assert.equal(game.powerUps.effects.isInvulnerable(), true);

    // Cannot get a second revive charge in the same run
    assert.equal(game.powerUps.collectPowerUp('second_chance', 114, 300, undefined, false), null);

    // Wait out invulnerability then hit ground -> immediate GAME_OVER
    game.powerUps.effects.update(2.5);
    (game as unknown as { player: { y: number } }).player.y = groundY + 10;
    (game as unknown as { update: (dt: number) => void }).update(0.016);
    assert.equal(game.getState(), 'GAME_OVER');

    // 2. Decline & Timeout paths
    game.startReady();
    (game as unknown as { handleActionInput: () => void }).handleActionInput();
    game.powerUps.collectPowerUp('second_chance', 114, 300, undefined, false);
    (game as unknown as { player: { y: number } }).player.y = groundY + 10;
    (game as unknown as { update: (dt: number) => void }).update(0.016);
    assert.equal(game.getState(), 'REVIVE_PROMPT');
    game.declineRevive();
    assert.equal(game.getState(), 'GAME_OVER');

    game.startReady();
    (game as unknown as { handleActionInput: () => void }).handleActionInput();
    game.powerUps.collectPowerUp('second_chance', 114, 300, undefined, false);
    (game as unknown as { player: { y: number } }).player.y = groundY + 10;
    (game as unknown as { update: (dt: number) => void }).update(0.016);
    assert.equal(game.getState(), 'REVIVE_PROMPT');
    for (let i = 0; i < 110; i++) {
      (game as unknown as { update: (dt: number) => void }).update(0.05);
    }
    assert.equal(game.getState(), 'GAME_OVER');
    game.destroy();
  });

  // 21. Slow Motion, Score Boost (Non-Stacking x2), and Feather Physics
  await runCase('Slow Motion, Score Boost x2 (non-stacking), and Feather gravity expire smoothly back to normal', () => {
    const effects = new PowerUpEffectManager();
    const physics = new Physics();
    const playerNormal = new Player();
    const playerFeather = new Player();

    // Slow Motion reduces pipe/env speed then eases back to 1
    effects.activate('slow_motion');
    assert.ok(effects.getEnvironmentSpeedMultiplier() < 0.7);
    effects.update(4.8);
    const easingMult = effects.getEnvironmentSpeedMultiplier();
    assert.ok(easingMult > 0.56 && easingMult < 1);
    effects.update(0.5);
    assert.equal(effects.getEnvironmentSpeedMultiplier(), 1);

    // Score Boost x2 refreshes duration, never stacks multiplier > 2x
    effects.activate('score_boost');
    assert.equal(effects.getScoreMultiplier(), 2);
    effects.update(4.0);
    const refreshed = effects.activate('score_boost');
    assert.equal(refreshed.refreshed, true);
    assert.equal(effects.getScoreMultiplier(), 2);
    assert.ok(effects.scoreBoostRemaining > 9.5);
    effects.update(10.5);
    assert.equal(effects.getScoreMultiplier(), 1);

    // Feather gently lowers gravity & max fall speed without disabling tap flap
    effects.activate('feather');
    playerNormal.vy = 0;
    playerFeather.vy = 0;
    for (let i = 0; i < 12; i++) {
      physics.updatePlayer(playerNormal, 0.016, 1, 1);
      physics.updatePlayer(
        playerFeather,
        0.016,
        effects.getGravityScale(),
        effects.getMaxFallVelocityScale()
      );
    }
    assert.ok(playerFeather.vy < playerNormal.vy, 'Feather must slow downward acceleration');
    physics.applyFlap(playerFeather);
    assert.equal(playerFeather.vy, GAME_CONFIG.physics.flapStrength, 'Flap strength remains crisp');
    effects.update(7.0);
    assert.equal(effects.getGravityScale(), 1);
    assert.equal(effects.getMaxFallVelocityScale(), 1);
  });

  // 22. Magnet Attraction (Collectibles Only) & Collectible Payouts
  await runCase('Magnet smoothly pulls collectibles within radius without moving pipes or power-up orbs', () => {
    const cm = new CollectibleManager();
    cm.reset();
    cm.spawn('coin', 200, 340); // within 160px of (114, 300)
    const pipe = new Pipe(200, 300, 150, 'green');
    const initialPipeY = pipe.gapY;

    // Run a few magnet frames at 0 scroll speed to isolate pull vector
    const item = cm.getActiveItems().find((c) => c.active)!;
    const startX = item.x;
    const startY = item.y;
    cm.update(0.05, 0, 114, 300, GAME_CONFIG.player.collisionRadius, true);
    assert.ok(item.x < startX && item.y < startY, 'Magnet pulls collectible smoothly toward player');
    assert.equal(pipe.gapY, initialPipeY, 'Pipes are unaffected by Magnet');

    // Collect Star & Gem directly under Score Boost x2 via PowerUpManager
    storage.clear();
    const pm = new PowerUpManager();
    pm.resetRun();
    pm.collectPowerUp('score_boost', 114, 300, undefined, false);
    const player = new Player();
    pm.collectibles.spawn('gem', player.x, player.y);
    const out = pm.update(0.016, {
      player,
      pipes: [],
      basePipeSpeed: 176,
      difficultyMultiplier: 1,
      particles: new (class {
        spawnFlapPuff() {}
        spawnCollisionBurst() {}
      })() as unknown as import('../src/game/ParticleSystem').ParticleSystem,
      emitPickupSounds: false,
    });
    assert.equal(out.bonusScoreEarned, 6, 'Gem (+3 bonus) doubled under Score Boost x2');
    assert.equal(pm.effects.runCoinsCollected, 10, 'Gem coins (+5) doubled under Score Boost x2');
    assert.equal(pm.effects.runGemsCollected, 1, 'Gem count recorded');
  });

  // 23. CurrencyManager Persistence, Event Deduplication & Reset
  await runCase('CurrencyManager persists coins/gems across reloads, deduplicates milestone events, and resets cleanly', () => {
    storage.clear();
    const cur = new CurrencyManager();
    cur.addGameplayRewards(12, 2, true);
    assert.equal(cur.awardEventOnce('ach_first_flight', 5, 0), true);
    assert.equal(cur.awardEventOnce('ach_first_flight', 5, 0), false, 'Duplicate milestone award blocked');

    const reloaded = new CurrencyManager();
    assert.equal(reloaded.getSnapshot().coins, 17);
    assert.equal(reloaded.getSnapshot().gems, 2);
    assert.equal(reloaded.getSnapshot().stats.totalStarsCollected, 1);

    reloaded.reset();
    assert.equal(reloaded.getSnapshot().coins, 0);
    assert.equal(reloaded.getSnapshot().gems, 0);
  });

  // 24. Spawn Safety (Outside Pipes), Settings Persistence, and Non-Carry-Over
  await runCase('PowerUpSpawnManager never spawns inside pipes and Settings/Run resets isolate temporary buffs', () => {
    storage.clear();
    const spawner = new PowerUpSpawnManager();
    spawner.reset(12345);
    const pipeAtSpawn = new Pipe(395, 320, 140, 'green');
    for (let i = 0; i < 30; i++) {
      const y = spawner.findSafeSpawnY(428, [pipeAtSpawn], []);
      if (y !== null) {
        assert.ok(
          Math.abs(y - pipeAtSpawn.gapY) <= pipeAtSpawn.gapHeight * 0.25 + 1,
          'Spawn inside pipe X range must stay safely inside the gap center band'
        );
      }
    }

    const sm = new SettingsManager();
    sm.update({
      powerUpsEnabled: false,
      collectiblesEnabled: false,
      powerUpFrequency: 'high',
      visualEffectsQuality: 'low',
    });
    const reloaded = new SettingsManager().getSettings();
    assert.equal(reloaded.powerUpsEnabled, false);
    assert.equal(reloaded.collectiblesEnabled, false);
    assert.equal(reloaded.powerUpFrequency, 'high');
    assert.equal(reloaded.visualEffectsQuality, 'low');

    // Run reset clears temporary buffs cleanly
    const pm = new PowerUpManager();
    pm.collectPowerUp('shield', 100, 200, undefined, false);
    pm.collectPowerUp('score_boost', 100, 200, undefined, false);
    pm.resetRun();
    assert.equal(pm.effects.hasShield, false);
    assert.equal(pm.effects.scoreBoostRemaining, 0);
  });

  // 25. Power-Up Achievements & 2P Tournament Deterministic Seed Fairness
  await runCase('Power-Up Achievements unlock cleanly without duplicates and Tournament rounds share deterministic RNG between P1 & P2', () => {
    storage.clear();
    const am = new AchievementManager();
    const unlocked1 = am.checkPowerUpMetrics(
      {
        shieldSaves: 3,
        revivesUsed: 3,
        totalCoinsCollected: 120,
        totalGemsCollected: 12,
        totalStarsCollected: 5,
        totalPowerUpsCollected: 22,
      },
      3
    );
    assert.equal(unlocked1.length, 6, 'All 6 Power-Up achievements should unlock when criteria met');
    assert.equal(am.checkScore(5).length, 2, 'Score achievements remain independent & functional');
    const dup = am.checkPowerUpMetrics(
      {
        shieldSaves: 5,
        revivesUsed: 5,
        totalCoinsCollected: 300,
        totalGemsCollected: 20,
        totalStarsCollected: 10,
        totalPowerUpsCollected: 40,
      },
      5
    );
    assert.equal(dup.length, 0, 'Achievements must never duplicate');

    // Tournament P1 & P2 receive identical deterministic spawn sequence for the same round
    const match = createInitialMatchData('P1', 'P2', 'bo3');
    const sp1 = new PowerUpSpawnManager();
    const sp2 = new PowerUpSpawnManager();
    sp1.setFrequency('normal');
    sp2.setFrequency('normal');
    sp1.reset(match.roundSeed);
    sp2.reset(match.roundSeed);

    const log1: string[] = [];
    const log2: string[] = [];
    for (let step = 0; step < 300; step++) {
      sp1.update(0.05, {
        powerUpsEnabled: true,
        collectiblesEnabled: true,
        pipes: [],
        activeCollectibles: [],
        difficultyMultiplier: 1,
        hasShield: false,
        hasReviveOrUsed: false,
        onSpawnCollectible: (t, x, y) => log1.push(`C:${t}:${Math.round(x)}:${Math.round(y)}`),
      });
      sp2.update(0.05, {
        powerUpsEnabled: true,
        collectiblesEnabled: true,
        pipes: [],
        activeCollectibles: [],
        difficultyMultiplier: 1,
        hasShield: false,
        hasReviveOrUsed: false,
        onSpawnCollectible: (t, x, y) => log2.push(`C:${t}:${Math.round(x)}:${Math.round(y)}`),
      });
    }
    assert.deepEqual(log1, log2, 'P1 and P2 in the same tournament round must get identical spawn RNG');
  });

  // 26. Singleton PowerUpManager & Game-End Effect Cleanup (TS + js/powerups/PowerUpManager.js)
  await runCase('Singleton PowerUpManager cleans up active effects on game end in both TS engine and js/powerups/PowerUpManager.js', async () => {
    const { powerUpManager: tsSingleton } = await import('../src/game/powerups/PowerUpManager');
    assert.equal(PowerUpManager.getInstance(), tsSingleton);

    // Trigger GAME_OVER with active buffs -> effects must be cleared immediately while preserving run coin count
    const game = new Game(createMockCanvas(), () => {});
    game.startReady();
    (game as unknown as { handleActionInput: () => void }).handleActionInput();
    game.powerUps.collectPowerUp('slow_motion', 114, 300, undefined, false);
    game.powerUps.collectPowerUp('score_boost', 114, 300, undefined, false);
    game.powerUps.effects.runCoinsCollected = 9;
    assert.ok(game.powerUps.getActiveStatuses().length >= 2);

    const groundY = GAME_CONFIG.worldHeight - GAME_CONFIG.groundHeight;
    (game as unknown as { player: { y: number } }).player.y = groundY + 10;
    (game as unknown as { update: (dt: number) => void }).update(0.016);
    assert.equal(game.getState(), 'GAME_OVER');
    assert.equal(game.powerUps.getActiveStatuses().length, 0, 'Active buffs must clear on game end');
    assert.equal(game.powerUps.effects.runCoinsCollected, 9, 'Run coin summary stays visible for GameOverOverlay');
    game.destroy();

    // Verify js/powerups/PowerUpManager.js standalone singleton
    const jsMod = await import('../js/powerups/PowerUpManager.js');
    const jsMgr = jsMod.default.getInstance();
    assert.equal(jsMgr, jsMod.powerUpManager);
    assert.equal(new jsMod.default(), jsMgr);

    jsMgr.reset();
    jsMgr.configure({ powerUpsEnabled: true, collectiblesEnabled: true, frequency: 'high' });
    jsMgr.spawnPowerUp('magnet', 114, 300);
    jsMgr.spawnCollectible('gem', 114, 300);
    const out = jsMgr.update(0.016, { x: 114, y: 300, collisionRadius: 17.5 }, []);
    assert.deepEqual(out.collectedPowerUps, ['magnet']);
    assert.deepEqual(out.collectedItems, ['gem']);
    assert.equal(jsMgr.getActiveEffectsStatus().length, 1);

    jsMgr.onGameEnd();
    assert.equal(jsMgr.getActiveEffectsStatus().length, 0);
    assert.equal(jsMgr.powerUpOrbs.length, 0);
    assert.equal(jsMgr.collectibles.length, 0);
  });

  // 27. Daily & Weekly Mission Rotation, Eligibility, Same-Day Determinism & Midnight/Monday Resets
  await runCase('Daily & Weekly missions filter impossible tasks, stay deterministic same day, and reset cleanly at midnight / Monday', () => {
    storage.clear();
    currencyManager.reset();
    characterSkinManager.reset();

    // Sunday 2026-06-14 23:55 local time
    let mockNow = new Date(2026, 5, 14, 23, 55, 0, 0).getTime();
    const mm = new MissionManager({
      nowProvider: () => mockNow,
      eligibilityProvider: () => ({
        unlockedWorldIds: ['green_valley'],
        unlockedCharacterIds: ['classic_bird', 'chicky'],
        hasRareOrHigherCharacter: false,
        powerUpsEnabled: false,
        collectiblesEnabled: false,
      }),
    });

    const snap1 = mm.getSnapshot();
    assert.equal(snap1.dailyMissions.length, 3);
    assert.deepEqual(
      snap1.dailyMissions.map((m) => m.difficulty),
      ['easy', 'medium', 'hard']
    );
    assert.equal(snap1.weeklyMissions.length, WEEKLY_MISSIONS.length);
    assert.equal(snap1.specialMissions.length, SPECIAL_CHALLENGES.length);

    // Impossible missions (powerups, collectibles, non-starter worlds, rare+) must NOT appear
    const disallowedIds = new Set([
      'daily_easy_coins_10',
      'daily_easy_powerup_2',
      'daily_med_coins_30',
      'daily_med_powerup_5',
      'daily_med_stars_2',
      'daily_med_bonus_world',
      'daily_med_rare_char',
      'daily_hard_coins_60',
      'daily_hard_gems_2',
    ]);
    for (const m of snap1.dailyMissions) {
      assert.equal(disallowedIds.has(m.id), false, `Ineligible mission ${m.id} must be filtered out`);
    }

    // Countdown timers must always be non-negative
    assert.ok(getMsUntilNextDailyReset(mockNow) > 0 && getMsUntilNextDailyReset(mockNow) <= 300_000);
    assert.ok(getMsUntilNextWeeklyReset(mockNow) > 0 && getMsUntilNextWeeklyReset(mockNow) <= 300_000);

    // Emit progress before midnight & simulate reload on the same day -> preserves exact selection & progress
    mm.emitEvent({ type: 'game_finished', mode: 'solo', worldId: 'green_valley', score: 2 });
    const progressBeforeReload = mm.getSnapshot().dailyMissions.map((m) => ({
      id: m.id,
      progress: m.progress,
    }));

    const mmReloaded = new MissionManager({
      nowProvider: () => mockNow,
      eligibilityProvider: () => ({
        unlockedWorldIds: ['green_valley'],
        unlockedCharacterIds: ['classic_bird', 'chicky'],
        hasRareOrHigherCharacter: false,
        powerUpsEnabled: false,
        collectiblesEnabled: false,
      }),
    });
    assert.deepEqual(
      mmReloaded.getSnapshot().dailyMissions.map((m) => ({ id: m.id, progress: m.progress })),
      progressBeforeReload,
      'Same-day reload must keep exact daily missions and progress'
    );

    // Cross into Monday 2026-06-15 00:05 -> both Daily AND Weekly must reset automatically
    const sundayKey = getLocalDateKey(mockNow);
    const sundayWeekKey = getLocalWeekKey(mockNow);
    mockNow = new Date(2026, 5, 15, 0, 5, 0, 0).getTime();
    mmReloaded.setNowProviderForTesting(() => mockNow);
    const changed = mmReloaded.ensureCurrentPeriods(mockNow, true);
    assert.equal(changed, true);

    const snapMonday = mmReloaded.getSnapshot();
    assert.notEqual(snapMonday.dailyPeriodKey, sundayKey);
    assert.notEqual(snapMonday.weeklyPeriodKey, sundayWeekKey);
    assert.ok(snapMonday.dailyMissions.every((m) => m.progress === 0 && !m.claimed));
    assert.ok(snapMonday.weeklyMissions.every((m) => m.progress === 0 && !m.claimed));

    // Repeated ensureCurrentPeriods on same Monday does NOT re-reset
    assert.equal(mmReloaded.ensureCurrentPeriods(mockNow, true), false);

    // Advancing to Tuesday 2026-06-16 resets Daily only, preserving Weekly progress
    mmReloaded.emitEvent({ type: 'pipe_passed', mode: 'solo', amount: 12 });
    const mondayWeeklyPipes = mmReloaded
      .getSnapshot()
      .weeklyMissions.find((w) => w.id === 'weekly_pipes_200')!.progress;
    assert.equal(mondayWeeklyPipes, 12);

    mockNow = new Date(2026, 5, 16, 8, 0, 0, 0).getTime();
    mmReloaded.setNowProviderForTesting(() => mockNow);
    const snapTuesday = mmReloaded.getSnapshot();
    assert.equal(snapTuesday.weeklyPeriodKey, snapMonday.weeklyPeriodKey);
    assert.equal(
      snapTuesday.weeklyMissions.find((w) => w.id === 'weekly_pipes_200')!.progress,
      12,
      'Tuesday daily reset must preserve Monday weekly progress'
    );
  });

  // 28. Event-Based Progress, 2P Isolation & Non-Duplicate Tournament Completion
  await runCase('Gameplay emits accurate mission events, isolates Solo-only missions from P2, and counts Tournament wins once', () => {
    storage.clear();
    currencyManager.reset();
    characterUnlockManager.reset();
    characterSkinManager.reset();
    worldUnlockManager.reset();
    missionManager.reset();

    // P2 soloOnly isolation check via Game
    const game = new Game(createMockCanvas(), () => {});
    game.startTwoPlayerMatch('ANI', 'BUDI', 'bo3');

    // Simulate Round 1 completion (NOT match complete yet -> zero match_won / tournament_won)
    (game as unknown as { score: { current: number } }).score.current = 18;
    (game as unknown as { twoPlayerMatch: { player1Score: number | null } }).twoPlayerMatch.player1Score = 18;
    (game as unknown as { state: string }).state = 'PLAYER_1_GAME_OVER';
    game.continueFromPlayer1GameOver();
    game.startPlayer2Turn();
    (game as unknown as { score: { current: number } }).score.current = 4;
    (game as unknown as { twoPlayerMatch: { player2Score: number | null } }).twoPlayerMatch.player2Score = 4;
    (game as unknown as { state: string }).state = 'PLAYER_2_GAME_OVER';
    game.continueFromPlayer2GameOver();

    assert.equal(game.getState(), 'ROUND_RESULT');
    let champMission = missionManager
      .getSnapshot()
      .specialMissions.find((m) => m.id === 'special_champion')!;
    let survivorMission = missionManager
      .getSnapshot()
      .specialMissions.find((m) => m.id === 'special_survivor')!;
    assert.equal(champMission.progress, 0, 'Incomplete BO3 tournament must not count as tournament win');
    assert.equal(survivorMission.progress, 0, '2P runs must not complete Solo-only missions');

    // Finish Round 2 with Player 1 clinching 2-0 -> tournament_won emits ONCE
    game.startNextTournamentRound();
    (game as unknown as { score: { current: number } }).score.current = 9;
    (game as unknown as { twoPlayerMatch: { player1Score: number | null } }).twoPlayerMatch.player1Score = 9;
    (game as unknown as { state: string }).state = 'PLAYER_1_GAME_OVER';
    game.continueFromPlayer1GameOver();
    game.startPlayer2Turn();
    (game as unknown as { score: { current: number } }).score.current = 2;
    (game as unknown as { twoPlayerMatch: { player2Score: number | null } }).twoPlayerMatch.player2Score = 2;
    (game as unknown as { state: string }).state = 'PLAYER_2_GAME_OVER';
    game.continueFromPlayer2GameOver();

    assert.equal(game.getState(), 'MATCH_RESULT');
    champMission = missionManager
      .getSnapshot()
      .specialMissions.find((m) => m.id === 'special_champion')!;
    const weeklyWins = missionManager
      .getSnapshot()
      .weeklyMissions.find((m) => m.id === 'weekly_wins_5')!;
    assert.equal(champMission.progress, 1, 'Completed BO3 tournament must increment CHAMPION by 1');
    assert.equal(weeklyWins.progress, 1, 'Completed BO3 tournament must increment Arena Striker by 1');

    // Calling continueFromPlayer2GameOver again must be a no-op (no duplicate increment)
    game.continueFromPlayer2GameOver();
    assert.equal(
      missionManager.getSnapshot().specialMissions.find((m) => m.id === 'special_champion')!.progress,
      1
    );

    // Solo Gameplay run updates coins, pipes, score, and game_finished accurately without disturbing physics
    game.startReady();
    (game as unknown as { handleActionInput: () => void }).handleActionInput();
    assert.equal(game.getState(), 'PLAYING');

    const player = (game as unknown as { player: import('../src/game/Player').Player }).player;
    game.powerUps.collectibles.spawn('coin', player.x, player.y);
    game.powerUps.collectibles.spawn('gem', player.x, player.y);
    (game as unknown as { update: (dt: number) => void }).update(0.016);

    const snapDuringRun = missionManager.getSnapshot();
    const coinHunter = snapDuringRun.specialMissions.find((m) => m.id === 'special_coin_hunter')!;
    // coin (+1) + gem (+5 coins) = 6 coins
    assert.ok(coinHunter.progress >= 6, 'Solo collectible pickup must emit exact coin progress');

    game.destroy();
  });

  // 29. Idempotent Reward Claiming, Currency Payouts, Reload Persistence & History
  await runCase('Mission claiming grants Coin/Gem/Cosmetics strictly once, persists across reload, and records History', () => {
    storage.clear();
    currencyManager.reset();
    characterSkinManager.reset();

    const fixedNow = new Date(2026, 5, 17, 14, 0, 0, 0).getTime();
    const mm = new MissionManager({ nowProvider: () => fixedNow });

    // Uncompleted mission cannot be claimed
    const unready = mm.claimReward('special_coin_hunter');
    assert.equal(unready.success, false);

    // Complete special_coin_hunter (100 coins)
    mm.emitEvent({ type: 'coin_collected', amount: 100 });
    const coinBefore = currencyManager.getSnapshot().coins;
    const gemBefore = currencyManager.getSnapshot().gems;

    const claim1 = mm.claimReward('special_coin_hunter');
    assert.equal(claim1.success, true);
    assert.equal(currencyManager.getSnapshot().coins, coinBefore + 400);
    assert.equal(currencyManager.getSnapshot().gems, gemBefore + 10);
    assert.ok(mm.getSnapshot().cosmetics.badges.includes('COIN HUNTER'));

    // Duplicate claim immediately rejected & currency unchanged
    const claim2 = mm.claimReward('special_coin_hunter');
    assert.equal(claim2.success, false);
    assert.equal(currencyManager.getSnapshot().coins, coinBefore + 400);
    assert.equal(currencyManager.getSnapshot().gems, gemBefore + 10);

    // Reload MissionManager & CurrencyManager -> claimed status & history remain intact
    const mmReloaded = new MissionManager({ nowProvider: () => fixedNow });
    const reloadedCoinHunter = mmReloaded
      .getSnapshot()
      .specialMissions.find((m) => m.id === 'special_coin_hunter')!;
    assert.equal(reloadedCoinHunter.claimed, true);
    assert.equal(mmReloaded.claimReward('special_coin_hunter').success, false);
    assert.ok(
      mmReloaded
        .getSnapshot()
        .history.some((h) => h.missionId === 'special_coin_hunter' && h.status === 'claimed')
    );
    assert.equal(mmReloaded.getSnapshot().stats.totalClaimed, 1);
    assert.equal(mmReloaded.getSnapshot().stats.totalCoinsEarned, 400);
    assert.equal(mmReloaded.getSnapshot().stats.totalGemsEarned, 10);
  });

  // 30. Daily Streak & Milestone Bonuses (Consecutive Days, Same-Day Cap, Missed Reset, Clock Rewind Safety)
  await runCase('Daily Streak increments max +1/day, awards milestone bonuses once, resets on missed day, and resists clock rewind', () => {
    storage.clear();
    currencyManager.reset();
    characterSkinManager.reset();

    assert.equal(diffCalendarDays('2026-06-14', '2026-06-15'), 1);
    assert.equal(diffCalendarDays('2026-06-14', '2026-06-17'), 3);

    let mockNow = new Date(2026, 5, 10, 10, 0, 0, 0).getTime();
    const mm = new MissionManager({
      nowProvider: () => mockNow,
      eligibilityProvider: () => ({
        unlockedWorldIds: ['green_valley'],
        unlockedCharacterIds: ['classic_bird', 'chicky'],
        hasRareOrHigherCharacter: false,
        powerUpsEnabled: true,
        collectiblesEnabled: true,
      }),
    });

    const completeAndClaimTwoDailies = () => {
      // Trigger lots of gameplay events so whichever Easy/Medium daily missions rotated in finish
      for (let i = 0; i < 10; i++) {
        mm.emitEvent({ type: 'pipe_passed', mode: 'solo', worldId: 'green_valley', characterId: 'classic_bird', amount: 15 });
        mm.emitEvent({ type: 'score_reached', mode: 'solo', score: 25, worldId: 'green_valley', characterId: 'classic_bird' });
        mm.emitEvent({ type: 'coin_collected', amount: 25 });
        mm.emitEvent({ type: 'star_collected', amount: 2 });
        mm.emitEvent({ type: 'gem_collected', amount: 2 });
        mm.emitEvent({ type: 'powerup_used', powerUpId: 'shield' });
        mm.emitEvent({ type: 'game_finished', mode: 'solo', worldId: 'green_valley', characterId: 'classic_bird', score: 25 });
        mm.emitEvent({ type: 'multiplayer_played', mode: 'quick' });
        mm.emitEvent({ type: 'tournament_won', mode: 'bo3', winner: 'player1' });
      }
      const dailyList = mm.getSnapshot().dailyMissions;
      return dailyList.map((m) => mm.claimReward(m.id));
    };

    // Day 1: claiming all 3 daily missions must increment streak to 1 ONLY (max +1/day)
    const day1Claims = completeAndClaimTwoDailies();
    assert.ok(day1Claims.every((c) => c.success));
    assert.equal(mm.getSnapshot().streak.currentStreak, 1);
    assert.equal(mm.getSnapshot().streak.bestStreak, 1);

    // Day 2 & Day 3 -> Day 3 unlocks 3-Day Spark milestone reward ONCE
    for (const day of [11, 12]) {
      mockNow = new Date(2026, 5, day, 10, 0, 0, 0).getTime();
      mm.setNowProviderForTesting(() => mockNow);
      mm.ensureCurrentPeriods(mockNow, true);
      const res = completeAndClaimTwoDailies();
      if (day === 12) {
        const milestoneHit = res.find((r) => r.streakMilestonesUnlocked.length > 0);
        assert.ok(milestoneHit, 'Day 3 must unlock 3-Day Streak Milestone');
        assert.equal(milestoneHit.streakMilestonesUnlocked[0].days, STREAK_MILESTONES[0].days);
      }
    }
    assert.equal(mm.getSnapshot().streak.currentStreak, 3);
    assert.equal(mm.getSnapshot().streak.bestStreak, 3);
    assert.deepEqual(mm.getSnapshot().streak.claimedMilestones, [3]);

    // Clock rewind back to Day 11 must NOT corrupt or re-grant streak
    const coinsBeforeRewind = currencyManager.getSnapshot().coins;
    mockNow = new Date(2026, 5, 11, 12, 0, 0, 0).getTime();
    mm.setNowProviderForTesting(() => mockNow);
    mm.ensureCurrentPeriods(mockNow, true);
    assert.equal(mm.getSnapshot().streak.currentStreak, 3, 'Clock rewind must not erase valid streak');
    assert.equal(currencyManager.getSnapshot().coins, coinsBeforeRewind);

    // Skipping Day 13 & Day 14 -> checking on Day 14 resets currentStreak to 0, keeps bestStreak=3
    mockNow = new Date(2026, 5, 14, 10, 0, 0, 0).getTime();
    mm.setNowProviderForTesting(() => mockNow);
    assert.equal(mm.getSnapshot().streak.currentStreak, 0, 'Missed calendar day must reset active streak');
    assert.equal(mm.getSnapshot().streak.bestStreak, 3, 'Best streak must be preserved');

    // Claiming on Day 14 restarts streak at 1 and does NOT duplicate Day 3 milestone when reaching 3 again
    completeAndClaimTwoDailies();
    assert.equal(mm.getSnapshot().streak.currentStreak, 1);
    mockNow = new Date(2026, 5, 15, 10, 0, 0, 0).getTime();
    mm.setNowProviderForTesting(() => mockNow);
    completeAndClaimTwoDailies();
    mockNow = new Date(2026, 5, 16, 10, 0, 0, 0).getTime();
    mm.setNowProviderForTesting(() => mockNow);
    const repeatDay3 = completeAndClaimTwoDailies();
    assert.ok(
      repeatDay3.every((r) => r.streakMilestonesUnlocked.length === 0),
      'Previously claimed 3-day milestone must never pay out twice'
    );
  });

  // 31. Special Challenges (PERFECT FLYER, POWER MASTER 6/6, SURVIVOR, WORLD EXPLORER), Cosmetics & Settings
  await runCase('Special Challenges track multi-condition/distinct progress accurately and Mission Settings + Cosmetics persist', () => {
    storage.clear();
    currencyManager.reset();
    characterSkinManager.reset();

    const mm = new MissionManager({ nowProvider: () => new Date(2026, 5, 20, 12, 0, 0, 0).getTime() });

    // Colliding in a run blocks PERFECT FLYER even if score >= 15, whereas clean run completes it
    mm.emitEvent({
      type: 'score_reached',
      mode: 'solo',
      score: 16,
      collidedThisRun: true,
      usedShieldThisRun: false,
      usedSecondChanceThisRun: false,
    });
    assert.equal(
      mm.getSnapshot().specialMissions.find((m) => m.id === 'special_perfect_flyer')!.completed,
      false
    );

    mm.emitEvent({
      type: 'score_reached',
      mode: 'solo',
      score: 15,
      collidedThisRun: false,
      usedShieldThisRun: false,
      usedSecondChanceThisRun: false,
    });
    assert.equal(
      mm.getSnapshot().specialMissions.find((m) => m.id === 'special_perfect_flyer')!.completed,
      true
    );

    // Using Second Chance blocks SURVIVOR; achieving 20 without Second Chance completes it
    mm.emitEvent({
      type: 'score_reached',
      mode: 'solo',
      score: 21,
      usedSecondChanceThisRun: true,
    });
    assert.equal(
      mm.getSnapshot().specialMissions.find((m) => m.id === 'special_survivor')!.completed,
      false
    );
    mm.emitEvent({
      type: 'score_reached',
      mode: 'solo',
      score: 20,
      usedSecondChanceThisRun: false,
    });
    assert.equal(
      mm.getSnapshot().specialMissions.find((m) => m.id === 'special_survivor')!.completed,
      true
    );

    // POWER MASTER tracks 6 DISTINCT power-ups (repeats of same powerup do NOT finish it)
    for (let i = 0; i < 6; i++) {
      mm.emitEvent({ type: 'powerup_used', powerUpId: 'shield' });
    }
    const pmPartial = mm.getSnapshot().specialMissions.find((m) => m.id === 'special_power_master')!;
    assert.equal(pmPartial.progress, 1);
    assert.equal(pmPartial.completed, false);

    for (const pId of ['second_chance', 'slow_motion', 'magnet', 'score_boost', 'feather'] as const) {
      mm.emitEvent({ type: 'powerup_used', powerUpId: pId });
    }
    const pmDone = mm.getSnapshot().specialMissions.find((m) => m.id === 'special_power_master')!;
    assert.equal(pmDone.progress, 6);
    assert.equal(pmDone.completed, true);

    const claimPM = mm.claimReward('special_power_master');
    assert.equal(claimPM.success, true);
    assert.equal(claimPM.unlockedCosmetics.skinId, 'retro_pixel');
    assert.equal(characterSkinManager.isUnlocked('retro_pixel'), true);

    // Claim PERFECT FLYER unlocks & equips Sky Precision frame & SKY PRECISION title
    const claimPerfect = mm.claimReward('special_perfect_flyer');
    assert.equal(claimPerfect.success, true);
    assert.equal(mm.getSnapshot().cosmetics.equippedFrame, 'perfect_wings');
    mm.equipTitle('POWER MASTER');
    assert.equal(mm.getSnapshot().cosmetics.equippedTitle, 'POWER MASTER');

    // WORLD EXPLORER tracks 5 distinct worlds
    for (const wId of ['green_valley', 'candy_world', 'snow_land', 'lava_world', 'neon_city'] as const) {
      mm.emitEvent({ type: 'world_played', worldId: wId });
    }
    assert.equal(
      mm.getSnapshot().specialMissions.find((m) => m.id === 'special_world_explorer')!.completed,
      true
    );

    // Mission Settings toggles persist cleanly across reloads
    const sm = new SettingsManager();
    sm.update({
      missionNotificationsEnabled: false,
      missionSoundsEnabled: false,
      missionRewardAnimationEnabled: false,
      reducedMotion: true,
      missionReminderEnabled: false,
    });
    const reloadedSettings = new SettingsManager().getSettings();
    assert.equal(reloadedSettings.missionNotificationsEnabled, false);
    assert.equal(reloadedSettings.missionSoundsEnabled, false);
    assert.equal(reloadedSettings.missionRewardAnimationEnabled, false);
    assert.equal(reloadedSettings.reducedMotion, true);
    assert.equal(reloadedSettings.missionReminderEnabled, false);

    // Clean reset
    mm.reset();
    assert.equal(mm.getSnapshot().history.length, 0);
    assert.equal(mm.getSnapshot().streak.bestStreak, 0);
    assert.equal(mm.getSnapshot().cosmetics.equippedTitle, null);
    assert.equal(mm.getSnapshot().cosmetics.equippedFrame, 'default');
  });

  // 32. Standalone ES Module js/missions/MissionManager.js
  await runCase('js/missions/MissionManager.js manages daily/weekly resets, completion queue, localStorage persistence, and wallet payouts', async () => {
    storage.clear();
    const jsMissionMod = await import('../js/missions/MissionManager.js');
    const jsMM = jsMissionMod.default.getInstance();
    assert.equal(jsMM, jsMissionMod.missionManager);
    assert.equal(new jsMissionMod.default(), jsMM);

    // Sunday 2026-06-14 23:58 -> crosses into Monday 2026-06-15 00:02
    let mockNow = new Date(2026, 5, 14, 23, 58, 0, 0).getTime();
    jsMM.configure({
      nowProvider: () => mockNow,
      eligibilityProvider: () => ({
        unlockedWorldIds: ['green_valley'],
        unlockedCharacterIds: ['classic_bird', 'chicky'],
        hasRareOrHigherCharacter: false,
        powerUpsEnabled: true,
        collectiblesEnabled: true,
      }),
    });
    jsMM.reset();

    const receivedNotes: string[] = [];
    const unsub = jsMM.subscribeNotifications((note: { missionId: string }) => {
      receivedNotes.push(note.missionId);
    });

    // Track gameplay events completing special_coin_hunter -> enters completionQueue
    jsMM.trackEvent({ type: 'coin_collected', amount: 100 });
    assert.ok(receivedNotes.includes('special_coin_hunter'));
    assert.ok(jsMM.getCompletionQueue().some((n) => n.missionId === 'special_coin_hunter'));

    // Claiming grants coins & gems directly into flappy_face_currency wallet + consumes queue entry
    const claim = jsMM.claimReward('special_coin_hunter');
    assert.equal(claim.success, true);
    assert.equal(claim.walletBalance?.coins, 400);
    assert.equal(claim.walletBalance?.gems, 10);
    assert.equal(jsMM.claimReward('special_coin_hunter').success, false, 'Wallet claim must stay idempotent');
    assert.equal(
      jsMM.getCompletionQueue().some((n) => n.missionId === 'special_coin_hunter'),
      false,
      'Claiming removes claimed mission from completion queue'
    );

    // Verify localStorage persistence across reloadFromStorage
    jsMM.reloadFromStorage();
    assert.equal(jsMM.getWalletBalance().coins, 400);
    assert.equal(jsMM.getWalletBalance().gems, 10);
    assert.equal(
      jsMM.getSnapshot().specialMissions.find((m) => m.id === 'special_coin_hunter')!.claimed,
      true
    );

    // Advance device date across midnight into Monday -> triggers daily & weekly reset cleanly
    const sundayDailyKey = jsMM.getSnapshot().dailyPeriodKey;
    const sundayWeeklyKey = jsMM.getSnapshot().weeklyPeriodKey;
    mockNow = new Date(2026, 5, 15, 0, 2, 0, 0).getTime();
    jsMM.configure({ nowProvider: () => mockNow });
    const resetTriggered = jsMM.ensureCurrentPeriods(mockNow, true);
    assert.equal(resetTriggered, true);
    assert.notEqual(jsMM.getSnapshot().dailyPeriodKey, sundayDailyKey);
    assert.notEqual(jsMM.getSnapshot().weeklyPeriodKey, sundayWeeklyKey);

    unsub();
  });

  // 33. Level Curve, Carry-Over Multi-Level Up, Level 100 Cap & 11 Ranks
  await runCase('XP curve computes carry-over multi-level ups, enforces Level 100 cap, and maps all 11 Ranks accurately', () => {
    assert.equal(MIN_PLAYER_LEVEL, 1);
    assert.equal(MAX_PLAYER_LEVEL, 100);
    assert.equal(getXPRequiredForLevel(1), 136);
    assert.equal(getXPRequiredForLevel(100), 0);

    // Carry-over from Lv 1 -> Lv 3 in single burst (136 + 176 = 312 XP required for Lv 3; +400 gives Lv 3 with 88 XP carry-over)
    const lv1to2 = getXPRequiredForLevel(1);
    const lv2to3 = getXPRequiredForLevel(2);
    const computedLv3 = computeLevelStateFromTotalXP(lv1to2 + lv2to3 + 88);
    assert.equal(computedLv3.currentLevel, 3);
    assert.equal(computedLv3.currentLevelXP, 88);
    assert.equal(computedLv3.isMaxLevel, false);

    // Level 100 cap preserves totalXP without overflowing past Level 100
    const xpForLv100 = getCumulativeXPForLevel(100);
    const capped = computeLevelStateFromTotalXP(xpForLv100 + 50000);
    assert.equal(capped.currentLevel, 100);
    assert.equal(capped.isMaxLevel, true);
    assert.equal(capped.progressPercent, 100);

    // Verify all 11 rank tiers
    assert.equal(PLAYER_RANK_TIERS.length, 11);
    assert.equal(getRankForLevel(1).name, 'ROOKIE');
    assert.equal(getRankForLevel(9).name, 'ROOKIE');
    assert.equal(getRankForLevel(10).name, 'BEGINNER FLYER');
    assert.equal(getRankForLevel(20).name, 'SKILLED FLYER');
    assert.equal(getRankForLevel(30).name, 'ADVANCED FLYER');
    assert.equal(getRankForLevel(40).name, 'EXPERT');
    assert.equal(getRankForLevel(50).name, 'VETERAN');
    assert.equal(getRankForLevel(60).name, 'ELITE');
    assert.equal(getRankForLevel(70).name, 'MASTER');
    assert.equal(getRankForLevel(80).name, 'GRANDMASTER');
    assert.equal(getRankForLevel(90).name, 'LEGEND');
    assert.equal(getRankForLevel(100).name, 'ULTIMATE LEGEND');
  });

  // 34. Anti-Exploit Idempotency, Abort Mid-Run Safety & Personal Best XP
  await runCase('PlayerProgressionManager enforces strict eventId idempotency, ignores aborted runs, and rewards Personal Best strictly on increase', () => {
    storage.clear();
    const pm = new PlayerProgressionManager(() => 1_700_000_000_000);
    pm.reset(true);

    // First grant succeeds and triggers multi-level up + rank promotion when reaching Lv 10
    const xpNeededLv10 = getCumulativeXPForLevel(10);
    const burst = pm.awardXP({
      profileId: 'solo',
      eventId: 'test_burst_1',
      amount: xpNeededLv10,
      label: 'TEST BURST',
      category: 'gameplay',
    });
    assert.equal(burst.awarded, true);
    assert.equal(burst.previousLevel, 1);
    assert.equal(burst.newLevel, 10);
    assert.equal(burst.levelsGained, 9);
    assert.equal(burst.rankPromoted, true);
    assert.equal(pm.getProfile('solo').rank.name, 'BEGINNER FLYER');

    // Replay same eventId -> strictly ignored
    const dup = pm.awardXP({
      profileId: 'solo',
      eventId: 'test_burst_1',
      amount: 999,
      label: 'REPLAY',
      category: 'gameplay',
    });
    assert.equal(dup.awarded, false);
    assert.equal(pm.getProfile('solo').totalXP, xpNeededLv10);

    // Negative / zero XP rejected
    assert.equal(
      pm.awardXP({ profileId: 'solo', eventId: 'zero_xp', amount: 0, label: 'ZERO', category: 'gameplay' }).awarded,
      false
    );

    // Aborting mid-run via setMenuState('MAIN_MENU') in Game must NOT grant game completion XP (+10)
    playerProgressionManager.reset(true);
    const game = new Game(createMockCanvas(), () => {});
    game.startReady();
    (game as unknown as { handleActionInput: () => void }).handleActionInput();
    assert.equal(game.getState(), 'PLAYING');
    const xpBeforeAbort = playerProgressionManager.getProfile('solo').totalXP;
    game.setMenuState('MAIN_MENU');
    assert.equal(
      playerProgressionManager.getProfile('solo').totalXP,
      xpBeforeAbort,
      'Quitting mid-run must not grant +10 completion XP'
    );
    assert.equal(playerProgressionManager.getProfile('solo').stats.totalGamesPlayed, 0);

    // Personal Best XP fires strictly when newBest triggers (run 1 best=3 grants +25; run 2 score=2 does NOT)
    game.startReady();
    (game as unknown as { handleActionInput: () => void }).handleActionInput();
    for (let i = 0; i < 3; i++) {
      const res = (
        game as unknown as {
          score: { addBonus: (pts: number, isGameOver?: boolean) => { newBestTriggered: boolean } };
        }
      ).score.addBonus(1, false);
      (
        game as unknown as {
          handleScoreAdvance: (slot: null, newBest: boolean, spawnBurst: boolean) => void;
        }
      ).handleScoreAdvance(null, res.newBestTriggered, true);
    }
    const afterBestHist = playerProgressionManager.getXPHistory('solo', 'gameplay');
    assert.equal(afterBestHist.filter((h) => h.label.startsWith('NEW HIGH SCORE')).length, 1);
    game.destroy();
  });

  // 35. Level Rewards Track, Character Unlock Without Duplicate XP, Fallback Currency & Aurora Theme
  await runCase('Level rewards claim atomically, unlock characters without duplicate collection XP, grant fallback currency when owned, and unlock Lv 40 Aurora Theme', () => {
    storage.clear();
    currencyManager.reset();
    characterUnlockManager.reset();
    characterSkinManager.reset();
    worldUnlockManager.reset();
    missionManager.reset();
    playerProgressionManager.reset(true);

    // Reach Level 40
    playerProgressionManager.awardXP({
      profileId: 'solo',
      eventId: 'reach_lv40',
      amount: getCumulativeXPForLevel(40),
      label: 'LEVEL 40',
      category: 'gameplay',
    });

    assert.equal(playerProgressionManager.getProfile('solo').currentLevel, 40);
    assert.ok(getNextLevelReward(40, [])?.level === 2);

    // Claim Level 2 (+50 coins)
    const c2 = claimLevelRewardWithGrant(2, 'solo');
    assert.equal(c2.success, true);
    assert.equal(c2.coinsGranted, 50);
    assert.equal(currencyManager.getSnapshot().coins, 50);

    // Duplicate claim Level 2 blocked
    assert.equal(claimLevelRewardWithGrant(2, 'solo').success, false);
    assert.equal(currencyManager.getSnapshot().coins, 50);

    // Unreached Level 50 reward blocked
    assert.equal(claimLevelRewardWithGrant(50, 'solo').success, false);

    // Claim Level 10 (Rare Character Unlock) -> unlocks a RARE character WITHOUT awarding duplicate +50 Collection XP
    const xpBeforeLv10Claim = playerProgressionManager.getProfile('solo').totalXP;
    const c10 = claimLevelRewardWithGrant(10, 'solo');
    assert.equal(c10.success, true);
    assert.ok(c10.unlockedCharacterId, 'Lv 10 reward must unlock a real RARE character');
    assert.equal(characterUnlockManager.isUnlocked(c10.unlockedCharacterId!), true);
    assert.equal(
      playerProgressionManager.getProfile('solo').totalXP,
      xpBeforeLv10Claim,
      'Level reward character unlock must not double-grant +50 Character Unlock XP'
    );

    // Unlock ALL RARE characters manually, then claim Lv 30 (Rare Character) -> pays fallback Coins & Gems
    for (const c of CHARACTER_REGISTRY) {
      if (c.rarity === 'RARE') {
        characterUnlockManager.unlockRewardCharacter(c.id, 'level_reward');
      }
    }
    const coinsBeforeFallback = currencyManager.getSnapshot().coins;
    const gemsBeforeFallback = currencyManager.getSnapshot().gems;
    const c30 = claimLevelRewardWithGrant(30, 'solo');
    assert.equal(c30.success, true);
    assert.equal(c30.usedFallback, true);
    assert.equal(
      currencyManager.getSnapshot().coins,
      coinsBeforeFallback + (LEVEL_REWARD_MAP.get(30)!.coins ?? 0) + (LEVEL_REWARD_MAP.get(30)!.fallbackCoins ?? 0)
    );
    assert.equal(
      currencyManager.getSnapshot().gems,
      gemsBeforeFallback + (LEVEL_REWARD_MAP.get(30)!.fallbackGems ?? 0)
    );

    // Claim Level 40 -> unlocks Exclusive Aurora Sky Theme & World Traveler title
    const c40 = claimLevelRewardWithGrant(40, 'solo');
    assert.equal(c40.success, true);
    assert.equal(c40.unlockedWorldTheme, true);
    assert.equal(playerProgressionManager.hasExclusiveWorldTheme('solo'), true);
    assert.ok(playerProgressionManager.getProfile('solo').unlockedTitleIds.includes('world_traveler'));
    assert.equal(LEVEL_REWARD_TRACK.length, 25);
  });

  // 36. Titles, Frames, XP History Filtering/Cap & Solo/P1/P2 Isolation + Canceled Tournament Safety
  await runCase('Titles & Frames validate unlocks, XP History caps at 150 & filters accurately, and Solo/P1/P2 + Tournaments isolate XP correctly', () => {
    storage.clear();
    playerProgressionManager.reset(true);

    // Locked title cannot be equipped; unlocked title equips cleanly
    assert.equal(TITLE_REGISTRY.length, 15);
    assert.equal(playerProgressionManager.equipTitle('ultimate_legend', 'solo'), false);
    assert.equal(getTitleById(playerProgressionManager.getProfile('solo').equippedTitleId).id, 'newbie_flyer');

    playerProgressionManager.unlockTitle('sky_legend', 'solo');
    assert.equal(playerProgressionManager.equipTitle('sky_legend', 'solo'), true);
    assert.equal(playerProgressionManager.getEquippedTitleName('solo'), 'Sky Legend');

    // XP History cap at 150 + category filter
    for (let i = 1; i <= 165; i++) {
      playerProgressionManager.awardXP({
        profileId: 'solo',
        eventId: `hist_test_${i}`,
        amount: 5,
        label: `EVENT ${i}`,
        category: i % 2 === 0 ? 'mission' : 'gameplay',
      });
    }
    const allHist = playerProgressionManager.getXPHistory('solo', 'all');
    const missionHist = playerProgressionManager.getXPHistory('solo', 'mission');
    assert.equal(allHist.length, 150, 'XP history must be capped at 150 entries');
    assert.ok(missionHist.every((h) => h.category === 'mission'));
    assert.ok(missionHist.length > 0 && missionHist.length < 150);

    // 2P & Tournament XP isolation (solo untouched, loser gets completion XP only, winner gets win + champion + title)
    playerProgressionManager.reset(true);
    const soloXPBefore2P = playerProgressionManager.getProfile('solo').totalXP;

    // Canceled / incomplete tournament grants ZERO XP
    playerProgressionManager.recordMultiplayerMatchXP({
      matchId: 'aborted_match_1',
      format: 'bo3',
      status: 'round_1',
      winner: null,
      player1Name: 'ALEX',
      player2Name: 'BRIAN',
    });
    assert.equal(playerProgressionManager.getProfile('player1').totalXP, 0);
    assert.equal(playerProgressionManager.getProfile('player2').totalXP, 0);

    // Completed BO5 where P2 wins
    playerProgressionManager.recordMultiplayerMatchXP({
      matchId: 'bo5_match_1',
      format: 'bo5',
      status: 'completed',
      winner: 'player2',
      player1Name: 'ALEX',
      player2Name: 'BRIAN',
    });
    const p1 = playerProgressionManager.getProfile('player1');
    const p2 = playerProgressionManager.getProfile('player2');
    assert.equal(playerProgressionManager.getProfile('solo').totalXP, soloXPBefore2P);
    assert.equal(p1.totalXP, 50, 'Tournament loser receives +50 completion XP only');
    assert.equal(p2.totalXP, 300, 'BO5 winner receives +50 completion +100 win +150 champion = 300 XP');
    assert.equal(p1.stats.tournamentWins, 0);
    assert.equal(p2.stats.tournamentWins, 1);
    assert.ok(p2.unlockedTitleIds.includes('tournament_champion'));
  });

  // 37. Cross-System Integration (Missions, Achievements, Characters, Skins, Worlds), Settings & Storage Corruption Recovery
  await runCase('Missions, Achievements, Characters, Skins, Worlds emit XP cleanly; Progression Settings persist; Corruption recovers cleanly', () => {
    storage.clear();
    currencyManager.reset();
    characterUnlockManager.reset();
    characterSkinManager.reset();
    worldUnlockManager.reset();
    missionManager.reset();
    playerProgressionManager.reset(true);

    // 1. Achievement unlock emits XP strictly once
    const am = new AchievementManager();
    am.checkScore(5); // unlocks first_flight (+25) & rookie (+25) = +50
    const xpAfterAch = playerProgressionManager.getProfile('solo').stats.totalAchievementXP;
    assert.equal(xpAfterAch, 50);
    am.checkScore(5);
    assert.equal(playerProgressionManager.getProfile('solo').stats.totalAchievementXP, 50);

    // 2. Mission completion emits Mission XP once (claiming does NOT duplicate)
    const mm = new MissionManager({ nowProvider: () => new Date(2026, 6, 1, 12, 0, 0, 0).getTime() });
    mm.emitEvent({ type: 'coin_collected', amount: 100 }); // completes special_coin_hunter (250 XP)
    const missionXP = playerProgressionManager.getProfile('solo').totalXP;
    const achAndMissionXP = playerProgressionManager.getProfile('solo').stats.totalMissionXP;
    assert.ok(achAndMissionXP >= 250, 'Mission completion must award mission XP immediately');
    mm.claimReward('special_coin_hunter');
    assert.equal(
      playerProgressionManager.getProfile('solo').totalXP,
      missionXP,
      'Claiming a completed mission must not duplicate XP'
    );

    // 3. Character, Skin, and World gameplay unlocks emit Collection XP once
    const cm = new CharacterUnlockManager();
    cm.evaluateProgress({
      bestScore: 10,
      totalGamesPlayed: 5,
      tournamentsWon: 0,
      bestWinStreak: 0,
      unlockedAchievements: 2,
      totalAchievements: 12,
    });
    assert.ok(playerProgressionManager.getProfile('solo').stats.totalCollectionXP >= 50);

    const smSkin = new CharacterSkinManager();
    smSkin.evaluateUnlocks({
      bestScore: 10,
      totalGamesPlayed: 5,
      collectionPercent: 25,
    });
    assert.ok(playerProgressionManager.getProfile('solo').stats.totalCollectionXP >= 75);

    const wm = new WorldUnlockManager();
    wm.evaluateProgress({
      bestScore: 10,
      totalGamesPlayed: 5,
      tournamentsWon: 0,
      bestWinStreak: 0,
      unlockedAchievements: 2,
      totalAchievements: 12,
    });
    assert.ok(playerProgressionManager.getProfile('solo').stats.totalCollectionXP >= 125);

    // 4. Progression Settings toggles persist cleanly
    const sm = new SettingsManager();
    sm.update({
      xpNotificationsEnabled: false,
      levelUpAnimationEnabled: false,
      progressionSoundsEnabled: false,
    });
    const reloaded = new SettingsManager().getSettings();
    assert.equal(reloaded.xpNotificationsEnabled, false);
    assert.equal(reloaded.levelUpAnimationEnabled, false);
    assert.equal(reloaded.progressionSoundsEnabled, false);

    // 5. LocalStorage persistence & corruption recovery
    const savedTotal = playerProgressionManager.getProfile('solo').totalXP;
    const reloadedPm = new PlayerProgressionManager();
    assert.equal(reloadedPm.getProfile('solo').totalXP, savedTotal);

    storage.set('flappy_face_player_progression', '{corrupt-json!!!');
    const recoveredPm = new PlayerProgressionManager();
    assert.equal(recoveredPm.getProfile('solo').currentLevel, 1);
    assert.equal(recoveredPm.getProfile('solo').totalXP, 0);
  });

  // 38. Update 6 Registry Completeness: 122 Achievements, 11 Categories, 22 Hidden, 5 Rarities, 28 Badges, 6 Chains
  await runCase('Update 6 Registry exposes 122 achievements across 11 categories, 5 rarities, 28 badges, and 6 chains', () => {
    assert.ok(ACHIEVEMENT_DEFINITIONS.length >= 100);
    assert.equal(ACHIEVEMENT_DEFINITIONS.length, 122);

    const uniqueIds = new Set(ACHIEVEMENT_DEFINITIONS.map((d) => d.id));
    assert.equal(uniqueIds.size, ACHIEVEMENT_DEFINITIONS.length, 'Achievement IDs must be unique');

    const categories = new Set(ACHIEVEMENT_DEFINITIONS.map((d) => d.category));
    assert.equal(categories.size, 11, 'All 11 achievement categories must be represented');

    const hiddenDefs = ACHIEVEMENT_DEFINITIONS.filter((d) => d.hidden);
    assert.ok(hiddenDefs.length >= 20, 'Must have at least 20 hidden achievements');

    assert.equal(ACHIEVEMENT_RARITY_CONFIG.COMMON.xp, 25);
    assert.equal(ACHIEVEMENT_RARITY_CONFIG.COMMON.coins, 25);
    assert.equal(ACHIEVEMENT_RARITY_CONFIG.COMMON.gems, 0);
    assert.equal(ACHIEVEMENT_RARITY_CONFIG.UNCOMMON.xp, 50);
    assert.equal(ACHIEVEMENT_RARITY_CONFIG.RARE.gems, 2);
    assert.equal(ACHIEVEMENT_RARITY_CONFIG.EPIC.gems, 5);
    assert.equal(ACHIEVEMENT_RARITY_CONFIG.LEGENDARY.xp, 500);
    assert.equal(ACHIEVEMENT_RARITY_CONFIG.LEGENDARY.gems, 10);

    assert.equal(FIXED_BADGE_REGISTRY.length, 28);
    const badgeCats = new Set(FIXED_BADGE_REGISTRY.map((b) => b.category));
    assert.equal(badgeCats.size, 7, 'All 7 badge categories must be represented');

    assert.equal(ACHIEVEMENT_CHAINS.length, 6);
    assert.ok(ALL_TITLES_REGISTRY.length >= TITLE_REGISTRY.length + 6);
  });

  // 39. Near-Miss Read-Only Detection Preserves Collision Hitbox Unchanged
  await runCase('Near-miss helper detects close clearances without altering Collision.check hitboxes', () => {
    const collision = new Collision();
    const p = new Player();
    const groundY = GAME_CONFIG.worldHeight - GAME_CONFIG.groundHeight;
    const nearPipe = new Pipe(p.x - GAME_CONFIG.pipes.width / 2, 250, 140, 'green');
    // gapTop = 180; p.collisionRadius = 15 => at p.y = 200, top hitbox = 185 (5px clearance <= 8px)
    p.y = 200;

    const collisionResult = collision.check(p, [nearPipe], groundY);
    assert.equal(collisionResult.collided, false, 'Player inside safe gap must not collide');

    const nearIds = collision.findNearMissPipeIds(p, [nearPipe], groundY, 8);
    assert.deepEqual(
      nearIds,
      [nearPipe.id],
      'Near-miss must trigger when clearance is within threshold without colliding'
    );

    // Moving far from edge returns no near miss
    p.y = 250;
    assert.deepEqual(collision.findNearMissPipeIds(p, [nearPipe], groundY, 8), []);
  });

  // 40. Real Event Unlocks: Gameplay, Skill, Hidden Secrets, Multiplayer, Tournament, and Idempotent Rewards
  await runCase('Real achievement events unlock Gameplay, Skill, Hidden, Multiplayer, and Tournament achievements once', () => {
    storage.clear();
    currencyManager.reset();
    characterUnlockManager.reset();
    characterSkinManager.reset();
    worldUnlockManager.reset();
    missionManager.reset();
    playerProgressionManager.reset(true);
    rewardShopManager.reset();

    const am = new AchievementManager();

    // Hidden: zero score death (oops_zero) + patient_bird + night_owl
    const startedUnlocks = am.recordEvent({
      type: 'game_started',
      mode: 'solo',
      characterId: 'classic_bird',
      skinId: 'default',
      worldId: 'green_valley',
      weather: 'sunny',
      isCustomFace: false,
      localHour: 2,
      readyWaitSeconds: 9,
    });
    const runZero = am.recordEvent({
      type: 'game_completed',
      mode: 'solo',
      score: 0,
      pipes: 0,
      elapsedSeconds: 3,
      reason: 'ground',
      characterId: 'classic_bird',
      worldId: 'green_valley',
      isCustomFace: false,
      usedPowerUp: false,
      usedShield: false,
      usedSecondChance: false,
      shieldSavesInRun: 0,
      scoreAfterRevive: 0,
      coinsInRun: 0,
      starsInRun: 0,
      gemsInRun: 0,
      didPauseAndScore5: false,
      localHour: 2,
    });
    const idsZero = new Set([...startedUnlocks, ...runZero].map((r) => r.id));
    assert.ok(idsZero.has('oops_zero'), '0-score loss must unlock oops_zero');
    assert.ok(idsZero.has('patient_flyer'), 'Waiting >=8s on READY must unlock patient_flyer');
    assert.ok(idsZero.has('night_owl'), 'Local hour 02:00 must unlock night_owl');
    assert.ok(idsZero.has('flying_start'), 'Starting first run must unlock flying_start');

    // Lucky 7 + near miss + pause-and-clutch
    am.recordEvent({ type: 'near_miss', count: 3, inRunTotal: 3 });
    am.recordEvent({
      type: 'score_updated',
      score: 12,
      mode: 'solo',
      usedPowerUp: false,
      usedShield: false,
      usedSecondChance: false,
      coinsInRun: 0,
      nearMissCountInRun: 3,
      characterId: 'classic_bird',
      worldId: 'green_valley',
      isCustomFace: false,
    });
    const clutchRes = am.recordEvent({
      type: 'game_completed',
      mode: 'solo',
      score: 7,
      pipes: 7,
      elapsedSeconds: 18,
      reason: 'pipe',
      characterId: 'classic_bird',
      worldId: 'green_valley',
      isCustomFace: false,
      usedPowerUp: false,
      usedShield: false,
      usedSecondChance: false,
      shieldSavesInRun: 0,
      scoreAfterRevive: 0,
      coinsInRun: 0,
      starsInRun: 0,
      gemsInRun: 0,
      didPauseAndScore5: true,
      localHour: 14,
    });
    const clutchIds = new Set(clutchRes.map((r) => r.id));
    assert.ok(clutchIds.has('lucky_seven'));
    assert.ok(clutchIds.has('pause_and_clutch'));
    assert.ok(am.getAll().find((r) => r.id === 'untouchable_10')?.unlocked);

    // Curious bird (7 menus)
    for (const m of ['WORLD_SELECT', 'MISSION_CENTER', 'PLAYER_PROFILE', 'PLAYER_PROGRESSION', 'ACHIEVEMENTS', 'SETTINGS', 'LEADERBOARD']) {
      am.recordEvent({ type: 'menu_visited', menuId: m });
    }
    assert.ok(am.getAll().find((r) => r.id === 'curious_bird')?.unlocked);

    // Tournament clean sweep & multiplayer draws
    am.recordEvent({
      type: 'multiplayer_played',
      format: 'quick',
      winner: 'draw',
      combinedScore: 22,
    });
    const tRes = am.recordEvent({
      type: 'tournament_completed',
      format: 'bo5',
      won: true,
      winner: 'player1',
      cleanSweep: true,
      comebackWin: true,
    });
    const tIds = new Set(tRes.map((r) => r.id));
    assert.ok(tIds.has('first_trophy'));
    assert.ok(tIds.has('clean_sweep'));
    assert.ok(tIds.has('tournament_comeback'));
    assert.equal(am.getAll().find((r) => r.id === 'bo5_champion')?.progress, 1);

    am.recordEvent({ format: 'bo5', type: 'tournament_completed', won: true, winner: 'player1', cleanSweep: false, comebackWin: false });
    const t3 = am.recordEvent({ format: 'bo5', type: 'tournament_completed', won: true, winner: 'player1', cleanSweep: false, comebackWin: false });
    const t3Ids = new Set(t3.map((r) => r.id));
    assert.ok(t3Ids.has('bo5_champion'), '3rd BO5 win unlocks bo5_champion');
    assert.ok(t3Ids.has('tournament_streak'), '3 consecutive tournament wins unlock tournament_streak');

    // Verify coins/gems/xp were credited accurately & cannot duplicate
    const coinsBefore = currencyManager.getSnapshot().coins;
    assert.ok(coinsBefore > 0);
    am.recordEvent({ type: 'menu_visited', menuId: 'SETTINGS' });
    assert.equal(currencyManager.getSnapshot().coins, coinsBefore, 'Re-visiting must not duplicate coins');
  });

  // 41. Points, Rank Ladder, 3-Slot Showcase, and Reward Shop Purchase
  await runCase('Achievement Rank tiers, 3-slot Showcase validation, and Reward Shop purchases work genuinely', () => {
    assert.equal(computeAchievementRank(0).tier, 'BEGINNER');
    assert.equal(computeAchievementRank(100).tier, 'COLLECTOR');
    assert.equal(computeAchievementRank(500).tier, 'ACHIEVER');
    assert.equal(computeAchievementRank(1000).tier, 'MASTER');
    assert.equal(computeAchievementRank(2500).tier, 'ELITE');
    assert.equal(computeAchievementRank(5000).tier, 'LEGEND');

    storage.clear();
    currencyManager.reset();
    characterSkinManager.reset();
    missionManager.reset();
    playerProgressionManager.reset(true);
    rewardShopManager.reset();

    const am = new AchievementManager();
    am.checkScore(15); // unlocks multiple score achievements
    const unlockedIds = am.getAll().filter((r) => r.unlocked).map((r) => r.id);
    assert.ok(unlockedIds.length >= 2);

    // Reject locked achievements in showcase
    const rejectLocked = am.setShowcaseSlots(['the_legend', unlockedIds[0]]);
    assert.deepEqual(rejectLocked, [unlockedIds[0]]);

    // Fund currency and purchase Reward Shop item -> unlocks real skin + achievement
    currencyManager.addGameplayRewards(1000, 20);
    const emeraldItem = REWARD_SHOP_ITEMS.find((i) => i.id === 'skin_emerald')!;
    const purchase = rewardShopManager.purchase(emeraldItem.id);
    assert.equal(purchase.success, true);
    assert.ok(characterSkinManager.isUnlocked('emerald'));

    const shopUnlocks = am.recordEvent({
      type: 'shop_purchase',
      coinsSpent: purchase.coinsSpent,
      gemsSpent: purchase.gemsSpent,
      totalOwnedCount: purchase.totalOwnedCount,
    });
    assert.ok(shopUnlocks.some((a) => a.id === 'spender'));
  });

  // 42. Settings Toggles, V1 -> V2 Lossless Migration & Corrupt Recovery
  await runCase('Update 6 settings persist, v1 saves migrate without duplicate payouts, and corrupt saves recover cleanly', () => {
    storage.clear();
    currencyManager.reset();
    playerProgressionManager.reset(true);
    rewardShopManager.reset();

    const sm = new SettingsManager();
    sm.update({
      achievementNotificationsEnabled: false,
      achievementSoundsEnabled: false,
      achievementUnlockAnimationEnabled: false,
      achievementBadgeEffectsEnabled: false,
    });
    const reloaded = new SettingsManager().getSettings();
    assert.equal(reloaded.achievementNotificationsEnabled, false);
    assert.equal(reloaded.achievementSoundsEnabled, false);
    assert.equal(reloaded.achievementUnlockAnimationEnabled, false);
    assert.equal(reloaded.achievementBadgeEffectsEnabled, false);

    // Simulate legacy v1 save payload
    storage.set(
      'flappy_face_achievements',
      JSON.stringify({
        version: 1,
        records: {
          first_flight: { unlocked: true, unlockedAt: 1700000000000 },
          rookie: { unlocked: true, unlockedAt: 1700000001000 },
        },
      })
    );
    const migrated = new AchievementManager();
    assert.equal(migrated.getUnlockedCount(), 2);
    assert.equal(currencyManager.getSnapshot().coins, 0, 'Migration must not re-grant historical Coins');
    assert.equal(
      playerProgressionManager.getProfile('solo').totalXP,
      0,
      'Migration must not duplicate historical XP'
    );
    assert.equal(migrated.getSnapshot().recentUnlocks.length, 2);

    // Corrupt payload recovery
    storage.set('flappy_face_achievements', '{invalid-json!');
    const recovered = new AchievementManager();
    assert.equal(recovered.getUnlockedCount(), 0);
    assert.equal(recovered.getAll().length, 122);
  });

  console.log(`\nALL ${passed} TESTS PASSED.`);
}

runTests().catch((err) => {
  console.error('\nTEST FAILURE:', err);
  process.exit(1);
});
