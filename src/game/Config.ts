export type GameState =
  | 'MAIN_MENU'
  | 'WORLD_SELECT'
  | 'WORLD_COLLECTION'
  | 'CHARACTER_COLLECTION'
  | 'CHARACTER_SELECT'
  | 'CHARACTER_EDITOR'
  | 'LEADERBOARD'
  | 'ACHIEVEMENTS'
  | 'MISSION_CENTER'
  | 'COMPETITIVE_HUB'
  | 'PLAYER_PROGRESSION'
  | 'PLAYER_PROFILE'
  | 'STATS'
  | 'SETTINGS'
  | 'ABOUT'
  | 'READY'
  | 'PLAYING'
  | 'PAUSED'
  | 'REVIVE_PROMPT'
  | 'GAME_OVER'
  | 'TWO_PLAYER_SETUP'
  | 'PLAYER_1_READY'
  | 'PLAYER_1_PLAYING'
  | 'PLAYER_1_GAME_OVER'
  | 'PLAYER_2_TRANSITION'
  | 'PLAYER_2_READY'
  | 'PLAYER_2_PLAYING'
  | 'PLAYER_2_GAME_OVER'
  | 'ROUND_RESULT'
  | 'MATCH_RESULT';

export type PipeTheme = 'green' | 'mint' | 'blue' | 'purple';

export const GAME_CONFIG = {
  worldWidth: 400,
  worldHeight: 720,
  groundHeight: 96,

  physics: {
    gravity: 1620,
    flapStrength: -495,
    maxDownwardVelocity: 640,
    maxUpwardVelocity: -520,
    minRotation: -0.46,
    maxRotation: 1.32,
    rotationUpSpeed: 16,
    rotationDownSpeed: 6.2,
  },

  player: {
    startX: 114,
    startY: 300,
    visualRadius: 22,
    collisionRadius: 17.5,
    idleAmplitude: 9,
    idleFrequency: 3.1,
  },

  pipes: {
    width: 66,
    capHeight: 26,
    capOverhang: 6,
    gap: 166,
    speed: 176,
    spawnInterval: 1.54,
    minEdgeMargin: 82,
    maxStepDelta: 195,
  },

  effects: {
    shakeDuration: 0.28,
    shakeIntensity: 8,
    flashDuration: 0.22,
    scorePopDuration: 0.24,
    slowMoDuration: 0.22,
  },

  colors: {
    skyTop: '#56BCFF',
    skyMid: '#76D4FF',
    skyBottom: '#B5EEFF',
    primaryBlue: '#3998F7',
    accentYellow: '#FFD84D',
    pipeLight: '#82EB89',
    pipeMain: '#61D66B',
    pipeDark: '#32B85C',
    pipeHighlight: '#B8FABB',
    grassTop: '#8BD66A',
    grassStripe: '#79C957',
    grassBottom: '#58A83E',
    dirtTop: '#D9A96D',
    dirtBottom: '#C08A4B',
    darkOutline: '#24415C',
    white: '#FFFFFF',
  },
} as const;
