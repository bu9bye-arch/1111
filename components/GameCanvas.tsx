
import React, { useEffect, useRef, useCallback } from 'react';
import { 
  GameState, 
  WorldState, 
  BuffType, 
  PlayerStats
} from '../types';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  COLORS, 
  PLAYER_BASE_STATS, 
  BUFF_CONFIG 
} from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setScore: (score: number) => void;
  setStats: (stats: PlayerStats) => void;
}

// --- Audio System ---
class SoundSystem {
  ctx: AudioContext | null = null;
  bgmNode: AudioBufferSourceNode | null = null;
  masterGain: GainNode | null = null;
  noiseBuffer: AudioBuffer | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3; // Master volume
      this.masterGain.connect(this.ctx.destination);

      // Generate Noise Buffer for explosions
      const bufferSize = this.ctx.sampleRate * 2; // 2 seconds buffer
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playShoot() {
    // Pew pew - high pitch slide down
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playHit() {
    // Dull thud
    this.playTone(100, 'square', 0.05, 0.02);
  }

  playExplosion() {
    // Enhanced explosion with noise and punch
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;

    // 1. Noise Burst (Crunch)
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = this.noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(1000, t);
    noiseFilter.frequency.linearRampToValueAtTime(100, t + 0.2);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    
    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noiseSrc.start();
    noiseSrc.stop(t + 0.25);

    // 2. Low Thud (Impact)
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.5, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start();
    osc.stop(t + 0.15);
  }

  playGateHit() {
    this.playTone(800, 'sine', 0.05, 0.05);
  }

  playPowerUp() {
    // Rising tone
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playDebuff() {
    // Falling tone for negative buff pickup
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  startBGM() {
    if (!this.ctx || !this.masterGain) return;
    if (this.bgmNode) return; // Already playing

    // Create a simple rhythmic loop buffer
    const duration = 2.0; // 2 seconds loop (120 BPM ish)
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        const t = i / sampleRate;
        let val = 0;
        
        // Kick drum (every 0.5s)
        if (t % 0.5 < 0.1) {
            val += Math.sin(2 * Math.PI * 60 * Math.exp(-10 * (t % 0.5))) * 0.5;
        }
        
        // Bassline (sawtooth-ish)
        const note = (Math.floor(t * 4) % 4 === 0) ? 110 : 165; // A2 then E3
        val += (Math.random() * 0.1) * Math.sin(2 * Math.PI * note * t);

        data[i] = val * 0.3; // Volume
    }

    this.bgmNode = this.ctx.createBufferSource();
    this.bgmNode.buffer = buffer;
    this.bgmNode.loop = true;
    
    // Lowpass filter for the BGM to make it background-y
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    this.bgmNode.connect(filter);
    filter.connect(this.masterGain);
    this.bgmNode.start();
  }

  stopBGM() {
    if (this.bgmNode) {
      this.bgmNode.stop();
      this.bgmNode = null;
    }
  }
}

const soundSystem = new SoundSystem();


const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, setScore, setStats }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Game State Mutable Ref
  const worldRef = useRef<WorldState>({
    gameState: GameState.MENU,
    score: 0,
    wave: 1,
    frames: 0,
    phase: 'COMBAT',
    player: {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 300, 
      width: 40,
      height: 40,
      speed: PLAYER_BASE_STATS.speed,
      damage: PLAYER_BASE_STATS.damage,
      fireRate: PLAYER_BASE_STATS.fireRate,
      soldierCount: PLAYER_BASE_STATS.soldierCount,
      lastShotFrame: 0
    },
    bullets: [],
    enemies: [],
    gates: [],
    particles: []
  });

  const inputRef = useRef({ x: CANVAS_WIDTH / 2, isDown: false });

  // --- Input Handling (Window Level for "Follow Me" feel) ---
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (gameState !== GameState.PLAYING) return;
      
      let clientX;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
      } else {
        clientX = (e as MouseEvent).clientX;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        // Map screen coordinates to internal canvas coordinates (800 width)
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        
        // Calculate X relative to canvas, but allow it to be clamped inside logic 
        // We subtract rect.left to get pos inside element
        const relativeX = (clientX - rect.left) * scaleX;
        inputRef.current.x = relativeX;
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
    };
  }, [gameState]);


  // --- Core Logic Helpers ---

  // Helper to get soldier position in the grid
  const getSoldierPosition = (index: number, playerX: number, playerY: number) => {
    const COLS = 5;
    const SPACING_X = 25;
    const SPACING_Y = 25;
    
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    
    // Center the columns. If 5 cols, center is index 2.
    const xOffset = (col - (COLS - 1) / 2) * SPACING_X;
    const yOffset = row * SPACING_Y;

    return {
      x: playerX + xOffset,
      y: playerY + yOffset
    };
  };

  const spawnEnemies = (wave: number) => {
    const player = worldRef.current.player;
    // Calculate estimated DPS: Damage * ShotsPerSecond * Soldiers
    const shotsPerSec = 60 / Math.max(1, player.fireRate);
    const estimatedDPS = player.damage * shotsPerSec * player.soldierCount;

    // --- BOSS WAVE LOGIC ---
    if (wave % 5 === 0) {
      // Boss HP scales heavily with DPS to ensure it lasts about 10-15 seconds
      const bossHP = estimatedDPS * 15 + 2000; 

      worldRef.current.enemies.push({
        id: Date.now(),
        x: CANVAS_WIDTH / 2,
        y: -300,
        width: 150,
        height: 150,
        hp: bossHP,
        maxHp: bossHP,
        speed: 1.0, // Slow moving boss
        isBoss: true
      });
      
      // Also spawn some minions to protect boss
      const minionCount = 5;
      for (let i = 0; i < minionCount; i++) {
        worldRef.current.enemies.push({
          id: Date.now() + i + 1,
          x: (CANVAS_WIDTH / (minionCount + 1)) * (i + 1),
          y: -200 - (Math.random() * 100),
          width: 50,
          height: 50,
          hp: 100, // Fixed low hp minions
          maxHp: 100,
          speed: 2.0,
          isBoss: false
        });
      }
      return;
    }

    // --- NORMAL WAVE LOGIC ---
    // Increase quantity based on DPS so powerful players have more targets
    // Base count + 1 for every 500 DPS
    const dpsFactor = Math.floor(estimatedDPS / 500);
    
    // SIGNIFICANTLY REDUCED for wave 1
    // Wave 1: 5 enemies. Wave 2: 7...
    const count = 5 + Math.floor(wave * 1.5) + dpsFactor;
    
    // SIGNIFICANTLY REDUCED HP for wave 1
    const enemyHP = 15 + (wave * 2); // Starts at 17HP, easy kill

    const baseSpacing = 200; // More spacing for easier start
    const minSpacing = 60;
    const spacing = Math.max(minSpacing, baseSpacing - (wave * 2)); 
    
    for (let i = 0; i < count; i++) {
      const xOffset = Math.random() * (CANVAS_WIDTH - 100) + 50;
      
      // Slower speed for early waves (Wave 1: 2.2, Wave 10: 4.0)
      const enemySpeed = Math.min(6, 2.0 + (wave * 0.2));

      worldRef.current.enemies.push({
        id: Date.now() + i,
        x: xOffset,
        y: -100 - (i * spacing), 
        width: 50,
        height: 50,
        hp: enemyHP,
        maxHp: enemyHP,
        speed: enemySpeed,
        isBoss: false
      });
    }
  };

  const spawnGates = () => {
    const types = [BuffType.DAMAGE, BuffType.FIRE_RATE, BuffType.SOLDIER_COUNT];
    const typeLeft = types[Math.floor(Math.random() * types.length)];
    const typeRight = types[Math.floor(Math.random() * types.length)];

    const gateY = -200;
    const gateH = 150;
    const gateW = CANVAS_WIDTH / 2 - 10;

    worldRef.current.gates = [
      {
        id: 0,
        x: 5,
        y: gateY,
        width: gateW,
        height: gateH,
        type: typeLeft,
        value: BUFF_CONFIG[typeLeft].base,
        color: COLORS.gateLeft,
        lastHitFrame: -999
      },
      {
        id: 1,
        x: CANVAS_WIDTH / 2 + 5,
        y: gateY,
        width: gateW,
        height: gateH,
        type: typeRight,
        value: BUFF_CONFIG[typeRight].base,
        color: COLORS.gateRight,
        lastHitFrame: -999
      }
    ];
  };

  const createParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      worldRef.current.particles.push({
        id: Math.random(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        maxLife: 1.0,
        color,
        size: Math.random() * 5 + 2
      });
    }
  };

  const resetGame = () => {
    soundSystem.init();
    soundSystem.startBGM();

    worldRef.current = {
      gameState: GameState.PLAYING,
      score: 0,
      wave: 1,
      frames: 0,
      phase: 'COMBAT',
      player: {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT - 300,
        width: 40,
        height: 40,
        speed: PLAYER_BASE_STATS.speed,
        damage: PLAYER_BASE_STATS.damage,
        fireRate: PLAYER_BASE_STATS.fireRate,
        soldierCount: PLAYER_BASE_STATS.soldierCount,
        lastShotFrame: 0
      },
      bullets: [],
      enemies: [],
      gates: [],
      particles: []
    };
    spawnEnemies(1);
    setScore(0);
  };

  // --- Update Loop ---

  const update = (dt: number) => {
    const world = worldRef.current;
    if (world.gameState !== GameState.PLAYING) return;

    world.frames++;

    // Broadcast stats every 10 frames to avoid React overhead
    if (world.frames % 10 === 0) {
      setStats({
        damage: world.player.damage,
        fireRate: world.player.fireRate,
        soldierCount: world.player.soldierCount
      });
    }

    // 1. Player Movement - DIRECT CONTROL (No Lerp)
    // Constrain to canvas bounds
    const targetX = Math.max(world.player.width, Math.min(CANVAS_WIDTH - world.player.width, inputRef.current.x));
    world.player.x = targetX;

    // 2. Shooting
    const effectiveFireRate = Math.max(2, world.player.fireRate);
    if (world.frames - world.player.lastShotFrame >= effectiveFireRate) {
      const soldierCountInt = Math.floor(world.player.soldierCount);
      let shotFired = false;
      
      for (let i = 0; i < soldierCountInt; i++) {
        // Use Grid Logic for bullet origin
        const pos = getSoldierPosition(i, world.player.x, world.player.y);
        
        world.bullets.push({
          id: Math.random(),
          x: pos.x,
          y: pos.y - 20,
          radius: 6,
          dy: -20, // Faster bullets
          damage: world.player.damage
        });
        shotFired = true;
      }
      if (shotFired) soundSystem.playShoot();
      world.player.lastShotFrame = world.frames;
    }

    // 3. Bullets
    world.bullets.forEach(b => b.y += b.dy);
    world.bullets = world.bullets.filter(b => b.y > -50);

    // 4. Combat Phase
    if (world.phase === 'COMBAT') {
      world.enemies.forEach(e => e.y += e.speed);

      // Fail check
      const enemiesPastPlayer = world.enemies.some(e => e.y > CANVAS_HEIGHT);
      if (enemiesPastPlayer) {
        setGameState(GameState.GAME_OVER);
        world.gameState = GameState.GAME_OVER;
        soundSystem.playTone(100, 'sawtooth', 0.5); // Fail sound
        soundSystem.stopBGM();
      }

      // Collisions
      world.bullets.forEach(b => {
        world.enemies.forEach(e => {
          if (b.y < e.y + e.height && b.y > e.y && Math.abs(b.x - e.x) < e.width/2 + b.radius) {
            e.hp -= b.damage;
            b.y = -1000;
            createParticles(b.x, b.y, COLORS.bullet, 1);
            soundSystem.playHit();
            
            if (e.hp <= 0) {
              createParticles(e.x, e.y, e.isBoss ? '#9333ea' : COLORS.enemy, e.isBoss ? 50 : 8);
              world.score += e.isBoss ? 500 : 10;
              setScore(world.score);
              soundSystem.playExplosion();
            }
          }
        });
      });

      world.enemies = world.enemies.filter(e => e.hp > 0);

      if (world.enemies.length === 0) {
        world.phase = 'GATES';
        spawnGates();
      }
    }

    // 5. Gates Phase
    if (world.phase === 'GATES') {
      let gateHit = false;

      // Update gate values every 0.5 seconds (30 frames) if engaged
      const shouldUpdateValues = world.frames % 30 === 0;

      world.gates.forEach(g => {
        g.y += 2; // Reduced speed

        // Shoot Gates
        world.bullets.forEach(b => {
          if (b.y < g.y + g.height && b.y > g.y && b.x > g.x && b.x < g.x + g.width) {
             b.y = -1000;
             createParticles(b.x, g.y + g.height, g.value < 0 ? COLORS.negativeGate : g.color, 1);
             soundSystem.playGateHit();
             
             // MARK AS ENGAGED
             g.lastHitFrame = world.frames;
          }
        });

        // TIME BASED UPDATE LOGIC
        if (shouldUpdateValues) {
            // Check if this gate was hit in the last 30 frames (0.5s)
            if (world.frames - g.lastHitFrame < 30) {
                 // Increase THIS gate's value
                 g.value += BUFF_CONFIG[g.type].step;
                 
                 // Decrease OTHER gate's value
                 const otherGate = world.gates.find(og => og.id !== g.id);
                 if (otherGate) {
                    otherGate.value -= BUFF_CONFIG[otherGate.type].step;
                 }
                 
                 // Little visual pop
                 createParticles(g.x + g.width/2, g.y + g.height/2, '#ffffff', 5);
            }
        }

        // Pass Gate
        if (
          world.player.y < g.y + g.height && 
          world.player.y + world.player.height > g.y &&
          Math.abs(world.player.x - (g.x + g.width/2)) < g.width/2
        ) {
          if (!gateHit) {
            gateHit = true;
            applyBuff(g.type, g.value);
            createParticles(world.player.x, world.player.y, '#ffffff', 20);
            
            if (g.value > 0) {
                soundSystem.playPowerUp();
            } else {
                soundSystem.playDebuff();
            }
            
            world.wave++;
            world.phase = 'COMBAT';
            world.gates = [];
            spawnEnemies(world.wave);
          }
        }
      });

      // Missed Gates
      if (world.gates.length > 0 && world.gates[0].y > CANVAS_HEIGHT) {
        world.wave++;
        world.phase = 'COMBAT';
        world.gates = [];
        spawnEnemies(world.wave);
      }
    }

    // 6. Particles
    world.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
    });
    world.particles = world.particles.filter(p => p.life > 0);
  };

  const applyBuff = (type: BuffType, value: number) => {
    const p = worldRef.current.player;
    switch(type) {
      case BuffType.DAMAGE:
        p.damage += value;
        if (p.damage < 1) p.damage = 1;
        break;
      case BuffType.SOLDIER_COUNT:
        p.soldierCount += value;
        if (p.soldierCount < 1) p.soldierCount = 1;
        break;
      case BuffType.FIRE_RATE:
        // Lower fireRate is faster. 
        // If value is positive (Buff), we subtract. 
        // If value is negative (Debuff), we add (subtracting negative).
        p.fireRate = p.fireRate - (value * 0.5);
        if (p.fireRate < 2) p.fireRate = 2; // Max speed cap
        if (p.fireRate > 40) p.fireRate = 40; // Min speed cap
        break;
    }
  };

  // --- Render Loop ---
  const draw = (ctx: CanvasRenderingContext2D) => {
    const world = worldRef.current;
    
    // Clear
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid - Slightly improved
    ctx.lineWidth = 2;
    const gridSize = 100;
    const offset = (world.frames * 3) % gridSize;
    
    // Vertical lines
    for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
        const distToCenter = Math.abs(x - CANVAS_WIDTH/2) / (CANVAS_WIDTH/2);
        const opacity = 0.15 - (distToCenter * 0.1); // Fade out at edges
        ctx.strokeStyle = `rgba(59, 130, 246, ${Math.max(0, opacity)})`;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
    }
    // Horizontal lines (moving)
    for (let y = offset - gridSize; y <= CANVAS_HEIGHT; y += gridSize) {
        const distToPlayer = Math.abs(y - world.player.y) / CANVAS_HEIGHT;
        const opacity = 0.2 - (distToPlayer * 0.1);
        ctx.strokeStyle = `rgba(59, 130, 246, ${Math.max(0, opacity)})`;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
    }


    // Draw Gates
    if (world.phase === 'GATES') {
      world.gates.forEach(g => {
        const isNegative = g.value < 0;
        const color = isNegative ? COLORS.negativeGate : g.color;

        // Glassy fill
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = color;
        ctx.fillRect(g.x, g.y, g.width, g.height);
        
        // Shiny Border
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 6;
        ctx.strokeRect(g.x, g.y, g.width, g.height);

        // Inner Glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = color;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px "Microsoft YaHei", sans-serif'; 
        ctx.textAlign = 'center';
        
        const label = BUFF_CONFIG[g.type].label;
        const displayVal = Math.floor(g.value);
        let sign = displayVal >= 0 ? "+" : ""; // Negative numbers already have -
        
        ctx.fillText(label, g.x + g.width/2, g.y + g.height/2 - 20);
        ctx.font = 'bold 50px monospace';
        ctx.fillText(`${sign}${displayVal}`, g.x + g.width/2, g.y + g.height/2 + 40);
        ctx.shadowBlur = 0;
      });
    }

    // Particles
    world.particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Bullets - Glowing
    ctx.shadowBlur = 10;
    ctx.shadowColor = COLORS.bullet;
    ctx.fillStyle = COLORS.bullet;
    world.bullets.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // Enemies
    world.enemies.forEach(e => {
      if (e.isBoss) {
        // Boss Drawing
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#9333ea';
        ctx.fillStyle = '#9333ea'; // Purple Boss
        ctx.fillRect(e.x - e.width/2, e.y, e.width, e.height);
        ctx.shadowBlur = 0;
        
        // Skull Face (Simple)
        ctx.fillStyle = '#000';
        ctx.fillRect(e.x - 30, e.y + 40, 20, 20); // Eye
        ctx.fillRect(e.x + 10, e.y + 40, 20, 20); // Eye
        ctx.fillRect(e.x - 20, e.y + 80, 40, 10); // Mouth

        // Boss HP Bar
        const barWidth = e.width + 20;
        const barHeight = 10;
        const barX = e.x - barWidth / 2;
        const barY = e.y - 20;
        
        // Background
        ctx.fillStyle = '#374151'; // gray-700
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health
        const healthPct = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = '#ef4444'; // red-500
        ctx.fillRect(barX, barY, barWidth * healthPct, barHeight);
        
        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

      } else {
        // Normal Enemy
        ctx.shadowBlur = 0;
        ctx.fillStyle = COLORS.enemy;
        ctx.fillRect(e.x - e.width/2, e.y, e.width, e.height);
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(e.x - 15, e.y + 10, 10, 10);
        ctx.fillRect(e.x + 5, e.y + 10, 10, 10);
      }
    });

    // Player (Army Grid)
    const soldierCountInt = Math.floor(world.player.soldierCount);
    for (let i = 0; i < soldierCountInt; i++) {
        const pos = getSoldierPosition(i, world.player.x, world.player.y);
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = COLORS.player;
        ctx.fillStyle = COLORS.player;
        
        // Draw little soldier
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Gun
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x, pos.y - 15);
        ctx.stroke();
    }
  };

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        update(16);
        draw(ctx);
      }
    }
    requestRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
        // Reset world if starting fresh
        if (worldRef.current.gameState !== GameState.PLAYING) {
            resetGame();
        }
        requestRef.current = requestAnimationFrame(gameLoop);
    } else {
        cancelAnimationFrame(requestRef.current);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState, gameLoop]);

  return (
    <canvas 
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="w-full h-full object-contain cursor-none touch-none"
    />
  );
};

export default GameCanvas;
