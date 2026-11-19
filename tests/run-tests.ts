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
    { Game },
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
    import('../src/game/Game'),
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
    assert.equal(stored.version, 1);

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

  console.log(`\nALL ${passed} TESTS PASSED.`);
}

runTests().catch((err) => {
  console.error('\nTEST FAILURE:', err);
  process.exit(1);
});
