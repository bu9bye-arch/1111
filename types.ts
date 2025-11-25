
export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export enum BuffType {
  DAMAGE = 'DAMAGE',
  FIRE_RATE = 'FIRE_RATE',
  SOLDIER_COUNT = 'SOLDIER_COUNT'
}

export interface PlayerStats {
  damage: number;
  fireRate: number;
  soldierCount: number;
}

export interface Player {
  x: number;
  y: number; // Usually fixed near bottom
  width: number;
  height: number;
  speed: number;
  // Stats
  damage: number;
  fireRate: number; // lower is faster (frames per shot)
  soldierCount: number;
  lastShotFrame: number;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  radius: number;
  dy: number;
  damage: number;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  speed: number;
  isBoss: boolean;
}

export interface Gate {
  id: number; // 0 for left, 1 for right
  x: number;
  y: number;
  width: number;
  height: number;
  type: BuffType;
  value: number;
  color: string;
  lastHitFrame: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface WorldState {
  gameState: GameState;
  score: number;
  wave: number;
  frames: number;
  phase: 'COMBAT' | 'GATES';
  // Entities
  player: Player;
  bullets: Bullet[];
  enemies: Enemy[];
  gates: Gate[]; // Should contain 2 when in gate phase
  particles: Particle[];
}
