
import { BuffType } from "./types";

export const CANVAS_WIDTH = 800; // Internal resolution width
export const CANVAS_HEIGHT = 1200; // Internal resolution height

export const PLAYER_BASE_STATS = {
  damage: 20,    
  fireRate: 15,  
  soldierCount: 1,
  speed: 15      
};

export const COLORS = {
  player: '#3b82f6', // blue-500
  bullet: '#60a5fa', // blue-400
  enemy: '#ef4444', // red-500
  gateLeft: '#10b981', // green-500
  gateRight: '#f59e0b', // amber-500
  text: '#ffffff',
  negativeGate: '#ef4444' // red-500 for debuffs
};

// Gates now start negative (Debuffs) and must be shot to become positive
// Steps are increased because updates happen every 0.5s instead of every bullet hit
export const BUFF_CONFIG = {
  [BuffType.DAMAGE]: { label: '攻击力', base: -20, step: 4 },
  [BuffType.FIRE_RATE]: { label: '攻速', base: -10, step: 2 }, 
  [BuffType.SOLDIER_COUNT]: { label: '士兵数量', base: -5, step: 1 }
};

export const ENEMY_SPAWN_INTERVAL = 60; // Frames
