// Motor del juego de pelea: lógica pura (sin DOM), avanza a paso fijo de 60 fps.
// Coordenadas: x en píxeles del escenario, y = altura sobre el piso (positivo hacia arriba).

export const STAGE = { width: 960, height: 540, floor: 470, left: 50, right: 910 } as const;
export const MAX_HP = 100;
export const ROUND_FRAMES = 99 * 60;
export const ROUNDS_TO_WIN = 2;
export const FINISH_FRAMES = 6 * 60;

const GRAVITY = 0.8;
const JUMP_SPEED = 15;
const WALK_FORWARD = 4;
const WALK_BACK = 3;
const BODY_HALF = 24;
const STAND_HEIGHT = 175;
const CROUCH_HEIGHT = 100;
const SPECIAL_COOLDOWN = 75;
const FATALITY_WINDOW = 50;
const FATALITY_RANGE = 320;

export type CharacterId = "kaen" | "kori";
export type Element = "fuego" | "hielo";

export interface Character {
  id: CharacterId;
  name: string;
  element: Element;
  specialName: string;
  colors: { main: string; dark: string; suit: string; eyes: string; glow: string };
}

export const CHARACTERS: Record<CharacterId, Character> = {
  kaen: {
    id: "kaen",
    name: "KAEN",
    element: "fuego",
    specialName: "Bola de fuego",
    colors: { main: "#f2b418", dark: "#a8740a", suit: "#17151c", eyes: "#ffffff", glow: "#ff7a1a" },
  },
  kori: {
    id: "kori",
    name: "KORI",
    element: "hielo",
    specialName: "Lanza de hielo",
    colors: { main: "#2f8fe8", dark: "#1a5aa0", suit: "#12161f", eyes: "#d9f4ff", glow: "#7fdcff" },
  },
};

export interface Input {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  punch: boolean;
  kick: boolean;
  block: boolean;
  special: boolean;
}

export const NO_INPUT: Input = Object.freeze({
  left: false,
  right: false,
  up: false,
  down: false,
  punch: false,
  kick: false,
  block: false,
  special: false,
});

export type AttackId = "punch" | "kick" | "sweep" | "uppercut" | "jumpKick" | "special";

export interface AttackSpec {
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  reach: number;
  /** Rango vertical que golpea, relativo a los pies del atacante. */
  box: [number, number];
  hitstun: number;
  knockback: number;
  low?: boolean;
  launch?: number;
}

export const ATTACKS: Record<AttackId, AttackSpec> = {
  punch: { startup: 4, active: 3, recovery: 9, damage: 6, reach: 64, box: [125, 165], hitstun: 14, knockback: 3 },
  kick: { startup: 7, active: 4, recovery: 14, damage: 10, reach: 82, box: [80, 135], hitstun: 18, knockback: 5 },
  sweep: { startup: 6, active: 4, recovery: 16, damage: 8, reach: 80, box: [0, 35], hitstun: 0, knockback: 3, low: true, launch: 3 },
  uppercut: { startup: 8, active: 4, recovery: 24, damage: 15, reach: 50, box: [60, 210], hitstun: 0, knockback: 6, launch: 13 },
  jumpKick: { startup: 3, active: 14, recovery: 0, damage: 9, reach: 78, box: [30, 100], hitstun: 16, knockback: 5 },
  special: { startup: 12, active: 0, recovery: 20, damage: 0, reach: 0, box: [0, 0], hitstun: 0, knockback: 0 },
};

const PROJECTILE: Record<Element, { damage: number; speed: number; hitstun: number; knockback: number; freeze: number }> = {
  fuego: { damage: 11, speed: 9, hitstun: 26, knockback: 7, freeze: 0 },
  hielo: { damage: 7, speed: 8, hitstun: 0, knockback: 0, freeze: 80 },
};

export type Action =
  | "idle"
  | "walk"
  | "crouch"
  | "jump"
  | "block"
  | "attack"
  | "hit"
  | "knockdown"
  | "frozen"
  | "dizzy"
  | "victory"
  | "defeated"
  | "fatalityVictim";

type SeqKey = "U" | "D" | "F" | "B" | "P" | "K" | "S";

export interface Fighter {
  side: 0 | 1;
  char: CharacterId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  /** Vida mostrada con retraso (barra roja de daño). */
  trailHp: number;
  wins: number;
  action: Action;
  frame: number;
  attack: AttackId | null;
  attackHit: boolean;
  crouching: boolean;
  stun: number;
  specialCooldown: number;
  airAttackUsed: boolean;
  prev: Input;
  seq: { key: SeqKey; at: number }[];
  /** Parpadeo blanco al recibir daño. */
  flash: number;
}

export interface Projectile {
  owner: 0 | 1;
  element: Element;
  x: number;
  y: number;
  vx: number;
  age: number;
}

export type ParticleKind = "blood" | "spark" | "fire" | "ice" | "smoke" | "bone";

export interface Particle {
  kind: ParticleKind;
  x: number;
  /** En coordenadas de pantalla (y hacia abajo). */
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  grounded: boolean;
}

export type Phase = "intro" | "fight" | "roundOver" | "finish" | "fatality" | "matchOver";

export type GameEvent =
  | { type: "hit"; heavy: boolean; side: 0 | 1; x: number; y: number }
  | { type: "block"; x: number; y: number }
  | { type: "swing" }
  | { type: "special"; element: Element }
  | { type: "freeze" }
  | { type: "land" }
  | { type: "round"; round: number }
  | { type: "fight" }
  | { type: "ko" }
  | { type: "timeout" }
  | { type: "finish" }
  | { type: "fatality" }
  | { type: "fatalityStart"; element: Element }
  | { type: "explode" }
  | { type: "wins"; name: string };

export interface Banner {
  text: string;
  sub?: string;
  color: string;
}

interface AiStep {
  input: Partial<Input>;
  frames: number;
  defend?: boolean;
}

export interface GameState {
  fighters: [Fighter, Fighter];
  projectiles: Projectile[];
  particles: Particle[];
  phase: Phase;
  phaseFrame: number;
  round: number;
  timer: number;
  tick: number;
  hitstop: number;
  /** Cuadros de cámara lenta restantes (el K.O. se ve a 1/3 de velocidad). */
  slowmo: number;
  shake: number;
  banner: Banner | null;
  winner: 0 | 1 | null;
  fatality: boolean;
  events: GameEvent[];
  seed: number;
  ai: [AiStep[], AiStep[]];
}

// ───────────────────────── utilidades ─────────────────────────

export function rand(state: GameState): number {
  // mulberry32: determinista para poder testear.
  state.seed = (state.seed + 0x6d2b79f5) | 0;
  let t = state.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function range(state: GameState, min: number, max: number) {
  return min + rand(state) * (max - min);
}

export function characterOf(f: Fighter): Character {
  return CHARACTERS[f.char];
}

function createFighter(side: 0 | 1, char: CharacterId): Fighter {
  return {
    side,
    char,
    x: side === 0 ? 300 : 660,
    y: 0,
    vx: 0,
    vy: 0,
    facing: side === 0 ? 1 : -1,
    hp: MAX_HP,
    trailHp: MAX_HP,
    wins: 0,
    action: "idle",
    frame: 0,
    attack: null,
    attackHit: false,
    crouching: false,
    stun: 0,
    specialCooldown: 0,
    airAttackUsed: false,
    prev: NO_INPUT,
    seq: [],
    flash: 0,
  };
}

export function createGame(p1: CharacterId, p2: CharacterId, seed = Date.now()): GameState {
  const state: GameState = {
    fighters: [createFighter(0, p1), createFighter(1, p2)],
    projectiles: [],
    particles: [],
    phase: "intro",
    phaseFrame: 0,
    round: 0,
    timer: ROUND_FRAMES,
    tick: 0,
    hitstop: 0,
    slowmo: 0,
    shake: 0,
    banner: null,
    winner: null,
    fatality: false,
    events: [],
    seed,
    ai: [[], []],
  };
  startRound(state);
  return state;
}

function startRound(state: GameState) {
  state.round++;
  for (const f of state.fighters) {
    const wins = f.wins;
    Object.assign(f, createFighter(f.side, f.char), { wins });
  }
  state.projectiles = [];
  state.timer = ROUND_FRAMES;
  state.ai = [[], []];
  setPhase(state, "intro");
}

function setPhase(state: GameState, phase: Phase) {
  state.phase = phase;
  state.phaseFrame = 0;
}

function setAction(f: Fighter, action: Action) {
  if (f.action !== action) {
    f.action = action;
    f.frame = 0;
  }
  if (action !== "attack") f.attack = null;
}

function startAttack(state: GameState, f: Fighter, attack: AttackId) {
  f.action = "attack";
  f.attack = attack;
  f.frame = 0;
  f.attackHit = false;
  if (attack !== "special") state.events.push({ type: "swing" });
}

function edge(f: Fighter, input: Input, key: keyof Input) {
  return input[key] && !f.prev[key];
}

function isAirborne(f: Fighter) {
  return f.y > 0 || f.vy > 0;
}

function isInvulnerable(f: Fighter) {
  return f.action === "knockdown" || f.action === "defeated" || f.action === "fatalityVictim" || f.action === "victory";
}

function hurtHeight(f: Fighter) {
  return f.crouching ? CROUCH_HEIGHT : STAND_HEIGHT;
}

// ───────────────────────── paso principal ─────────────────────────

export function step(state: GameState, inputs: [Input, Input]) {
  state.events = [];
  if (state.slowmo > 0 && state.slowmo-- % 3 !== 0) return;
  state.tick++;
  updateParticles(state);
  for (const f of state.fighters) {
    if (f.flash > 0) f.flash--;
    if (f.trailHp > f.hp) f.trailHp = Math.max(f.hp, f.trailHp - 0.35);
  }
  if (state.shake > 0) state.shake = Math.max(0, state.shake - 1);
  if (state.hitstop > 0) {
    state.hitstop--;
    return;
  }

  state.phaseFrame++;
  const [a, b] = state.fighters;

  for (const f of state.fighters) {
    const input = inputFor(state, f, inputs[f.side]);
    recordSequence(state, f, input);
    updateFighter(state, f, input);
    f.prev = input;
  }

  resolveMelee(state, a, b);
  resolveMelee(state, b, a);
  updateProjectiles(state);
  separate(a, b);
  for (const f of state.fighters) {
    f.x = clamp(f.x, STAGE.left, STAGE.right);
    faceOpponent(f, state.fighters[1 - f.side]);
  }

  updatePhase(state);
}

function inputFor(state: GameState, f: Fighter, input: Input): Input {
  if (state.phase === "fight") return input;
  if (state.phase === "finish" && state.winner === f.side) return input;
  return NO_INPUT;
}

function recordSequence(state: GameState, f: Fighter, input: Input) {
  const push = (key: SeqKey) => {
    f.seq.push({ key, at: state.tick });
    if (f.seq.length > 8) f.seq.shift();
  };
  const forward = f.facing === 1 ? "right" : "left";
  const back = f.facing === 1 ? "left" : "right";
  if (edge(f, input, "up")) push("U");
  if (edge(f, input, "down")) push("D");
  if (edge(f, input, forward)) push("F");
  if (edge(f, input, back)) push("B");
  if (edge(f, input, "punch")) push("P");
  if (edge(f, input, "kick")) push("K");
  if (edge(f, input, "special")) push("S");
}

/** Abajo, abajo, puño: la fatality. */
export function hasFatalityInput(f: Fighter, tick: number) {
  const last = f.seq.slice(-3);
  if (last.length < 3) return false;
  const keys = last.map((s) => s.key).join("");
  return keys === "DDP" && tick - last[0].at <= FATALITY_WINDOW && last[2].at === tick;
}

function updateFighter(state: GameState, f: Fighter, input: Input) {
  f.frame++;
  if (f.specialCooldown > 0) f.specialCooldown--;
  const grounded = !isAirborne(f);

  switch (f.action) {
    case "hit":
    case "frozen":
      if (--f.stun <= 0) setAction(f, "idle");
      break;
    case "knockdown":
      f.crouching = false;
      if (grounded && --f.stun <= 0) setAction(f, f.hp <= 0 ? "defeated" : "idle");
      break;
    case "dizzy":
    case "victory":
    case "defeated":
    case "fatalityVictim":
      f.crouching = false;
      break;
    case "attack":
      updateAttack(state, f, input);
      break;
    default:
      handleControl(state, f, input, grounded);
  }

  // Física
  f.x += f.vx;
  if (isAirborne(f)) {
    f.y += f.vy;
    f.vy -= GRAVITY;
    if (f.y <= 0) {
      f.y = 0;
      f.vy = 0;
      land(state, f);
    }
  }
  if (!isAirborne(f) && f.action !== "walk") f.vx *= 0.78;
  if (Math.abs(f.vx) < 0.05) f.vx = 0;
}

function land(state: GameState, f: Fighter) {
  if (f.action === "jump" || (f.action === "attack" && f.attack === "jumpKick")) {
    setAction(f, "idle");
    f.vx = 0;
  } else if (f.action === "knockdown") {
    f.vx *= 0.4;
    state.shake = Math.max(state.shake, 6);
    state.events.push({ type: "land" });
    spawnDust(state, f.x);
  }
  f.airAttackUsed = false;
}

function handleControl(state: GameState, f: Fighter, input: Input, grounded: boolean) {
  if (!grounded) {
    // En el aire solo se puede patear (o pegar) una vez por salto.
    if (!f.airAttackUsed && (edge(f, input, "kick") || edge(f, input, "punch"))) {
      f.airAttackUsed = true;
      startAttack(state, f, "jumpKick");
    }
    return;
  }

  f.crouching = input.down;
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);

  if (edge(f, input, "punch")) return startAttack(state, f, input.down ? "uppercut" : "punch");
  if (edge(f, input, "kick")) return startAttack(state, f, input.down ? "sweep" : "kick");
  if (edge(f, input, "special") && f.specialCooldown === 0 && !state.projectiles.some((p) => p.owner === f.side)) {
    f.crouching = false;
    return startAttack(state, f, "special");
  }
  if (input.block) {
    setAction(f, "block");
    f.vx = 0;
    return;
  }
  if (input.up) {
    f.crouching = false;
    setAction(f, "jump");
    f.vy = JUMP_SPEED;
    f.y = 0.01;
    f.vx = dir * 4.5;
    return;
  }
  if (input.down) {
    setAction(f, "crouch");
    f.vx = 0;
    return;
  }
  if (dir !== 0) {
    setAction(f, "walk");
    f.vx = dir * (dir === f.facing ? WALK_FORWARD : WALK_BACK);
    return;
  }
  setAction(f, "idle");
}

function updateAttack(state: GameState, f: Fighter, input: Input) {
  const attack = f.attack!;
  const spec = ATTACKS[attack];
  f.crouching = attack === "sweep" || (attack === "uppercut" && f.frame <= spec.startup);
  if (attack === "jumpKick") return; // termina al aterrizar

  if (attack === "special" && f.frame === spec.startup && state.phase !== "fatality") {
    const element = characterOf(f).element;
    state.projectiles.push({
      owner: f.side,
      element,
      x: f.x + f.facing * 60,
      y: 125,
      vx: f.facing * PROJECTILE[element].speed,
      age: 0,
    });
    f.specialCooldown = SPECIAL_COOLDOWN;
    state.events.push({ type: "special", element });
  }
  if (f.frame >= spec.startup + spec.active + spec.recovery) {
    setAction(f, input.down ? "crouch" : "idle");
    f.crouching = input.down;
  }
}

export function isAttackActive(f: Fighter) {
  if (f.action !== "attack" || !f.attack || f.attack === "special") return false;
  const spec = ATTACKS[f.attack];
  return f.frame > spec.startup && f.frame <= spec.startup + spec.active;
}

function resolveMelee(state: GameState, attacker: Fighter, defender: Fighter) {
  if (!isAttackActive(attacker) || attacker.attackHit || isInvulnerable(defender)) return;
  const spec = ATTACKS[attacker.attack!];
  const dx = (defender.x - attacker.x) * attacker.facing;
  if (dx < -BODY_HALF || dx - BODY_HALF > spec.reach) return;
  const top = attacker.y + spec.box[1];
  const bottom = attacker.y + spec.box[0];
  if (bottom > defender.y + hurtHeight(defender) || top < defender.y) return;

  attacker.attackHit = true;
  const hitY = Math.min(top, defender.y + hurtHeight(defender)) - 15;
  applyHit(state, attacker.side, defender, {
    damage: spec.damage,
    hitstun: spec.hitstun,
    knockback: spec.knockback,
    low: !!spec.low,
    launch: spec.launch,
    dir: attacker.facing,
    hitY,
  });
}

interface HitInfo {
  damage: number;
  hitstun: number;
  knockback: number;
  low: boolean;
  launch?: number;
  freeze?: number;
  element?: Element;
  dir: 1 | -1;
  hitY: number;
}

function applyHit(state: GameState, attackerSide: 0 | 1, d: Fighter, hit: HitInfo) {
  const screenX = d.x - hit.dir * 10;
  const screenY = STAGE.floor - hit.hitY;
  const blocked = d.action === "block" && (!hit.low || d.crouching);

  if (blocked) {
    d.hp = Math.max(1, d.hp - Math.max(1, Math.round(hit.damage * 0.15)));
    d.vx = hit.dir * 3;
    state.hitstop = 3;
    state.events.push({ type: "block", x: screenX, y: screenY });
    spawnBurst(state, screenX, screenY, "spark", 8, "#bfe3ff", 4);
    return;
  }

  const heavy = hit.damage >= 10 || !!hit.launch;
  d.hp = Math.max(0, d.hp - hit.damage);
  d.flash = 6;
  state.hitstop = heavy ? 7 : 4;
  state.shake = Math.max(state.shake, heavy ? 10 : 4);
  state.events.push({ type: "hit", heavy, side: attackerSide, x: screenX, y: screenY });
  spawnBurst(state, screenX, screenY, "spark", 6, "#fff2b0", 5);
  spawnBlood(state, screenX, screenY, hit.dir, 6 + hit.damage);
  if (hit.element === "fuego") spawnBurst(state, screenX, screenY, "fire", 14, "#ff8a1a", 4);

  const finishing = state.phase === "finish" && d.action === "dizzy";
  if (d.hp <= 0 || finishing || hit.launch || isAirborne(d)) {
    knockDown(d, hit.dir, hit.launch ?? 7);
  } else if (hit.freeze && d.action !== "frozen") {
    setAction(d, "frozen");
    d.stun = hit.freeze;
    d.vx = 0;
    state.events.push({ type: "freeze" });
    spawnBurst(state, d.x, STAGE.floor - 90, "ice", 16, "#cfefff", 4);
  } else {
    setAction(d, "hit");
    d.stun = hit.hitstun;
    d.vx = hit.dir * hit.knockback;
  }

  if (finishing) {
    endMatch(state, attackerSide);
  } else if (d.hp <= 0 && state.phase === "fight") {
    handleKO(state, attackerSide);
  }
}

function knockDown(f: Fighter, dir: 1 | -1, launch: number) {
  setAction(f, "knockdown");
  f.crouching = false;
  f.vy = launch;
  f.y = Math.max(f.y, 0.01);
  f.vx = dir * 5;
  f.stun = 45;
}

function updateProjectiles(state: GameState) {
  const remaining: Projectile[] = [];
  for (const p of state.projectiles) {
    p.x += p.vx;
    p.age++;
    const sx = p.x;
    const sy = STAGE.floor - p.y;
    if (p.element === "fuego") {
      spawnParticle(state, "fire", sx - Math.sign(p.vx) * 14, sy + range(state, -8, 8), -p.vx * 0.15, range(state, -1.5, 0), 18, range(state, 4, 9), "#ff9d2e");
    } else if (state.tick % 2 === 0) {
      spawnParticle(state, "ice", sx - Math.sign(p.vx) * 16, sy + range(state, -6, 6), -p.vx * 0.1, range(state, -0.5, 0.5), 20, range(state, 2, 4), "#dff6ff");
    }

    const target = state.fighters[1 - p.owner];
    const hitsTarget =
      !isInvulnerable(target) &&
      Math.abs(p.x - target.x) < BODY_HALF + 10 &&
      p.y + 14 > target.y &&
      p.y - 14 < target.y + hurtHeight(target);

    if (hitsTarget) {
      const spec = PROJECTILE[p.element];
      applyHit(state, p.owner, target, {
        damage: spec.damage,
        hitstun: spec.hitstun,
        knockback: spec.knockback,
        low: false,
        freeze: spec.freeze,
        element: p.element,
        dir: p.vx > 0 ? 1 : -1,
        hitY: p.y,
      });
      continue;
    }
    if (p.x < -40 || p.x > STAGE.width + 40) continue;
    remaining.push(p);
  }

  // Dos proyectiles que chocan se anulan.
  if (remaining.length === 2 && remaining[0].owner !== remaining[1].owner && Math.abs(remaining[0].x - remaining[1].x) < 30) {
    const x = (remaining[0].x + remaining[1].x) / 2;
    spawnBurst(state, x, STAGE.floor - 125, "spark", 20, "#ffffff", 6);
    spawnBurst(state, x, STAGE.floor - 125, "smoke", 10, "#8d8d99", 2);
    state.events.push({ type: "block", x, y: STAGE.floor - 125 });
    state.projectiles = [];
    return;
  }
  state.projectiles = remaining;
}

function separate(a: Fighter, b: Fighter) {
  if (a.action === "fatalityVictim" || b.action === "fatalityVictim") return;
  if (Math.abs(a.y - b.y) > 110) return; // se puede saltar por encima
  const dx = b.x - a.x;
  const min = BODY_HALF * 2 + 4;
  if (Math.abs(dx) >= min) return;
  const push = (min - Math.abs(dx)) / 2;
  const dir = dx === 0 ? (a.side === 0 ? 1 : -1) : Math.sign(dx);
  a.x -= dir * push;
  b.x += dir * push;
  // Contra la pared, empuja solo al otro.
  if (a.x < STAGE.left || a.x > STAGE.right) b.x += dir * push;
  if (b.x < STAGE.left || b.x > STAGE.right) a.x -= dir * push;
}

function faceOpponent(f: Fighter, opp: Fighter) {
  const free = f.action === "idle" || f.action === "walk" || f.action === "crouch" || f.action === "block" || f.action === "dizzy";
  if (!free || isAirborne(f) || f.x === opp.x) return;
  f.facing = opp.x > f.x ? 1 : -1;
}

// ───────────────────────── fases ─────────────────────────

function handleKO(state: GameState, winnerSide: 0 | 1) {
  const winner = state.fighters[winnerSide];
  const loser = state.fighters[1 - winnerSide];
  winner.wins++;
  state.winner = winnerSide;
  state.projectiles = [];
  state.events.push({ type: "ko" });
  state.slowmo = 90;
  if (winner.wins >= ROUNDS_TO_WIN) {
    // El perdedor se levanta mareado: FINISH HIM.
    loser.hp = 0;
    loser.stun = 0;
    setPhase(state, "finish");
    state.banner = { text: "K.O.", color: "#ff3b3b" };
  } else {
    setPhase(state, "roundOver");
    state.banner = { text: "K.O.", color: "#ff3b3b" };
  }
}

function endMatch(state: GameState, winnerSide: 0 | 1) {
  const winner = state.fighters[winnerSide];
  state.winner = winnerSide;
  setPhase(state, "matchOver");
  setAction(winner, "victory");
  state.banner = { text: `${characterOf(winner).name} GANA`, sub: state.fatality ? "FATALITY" : undefined, color: "#ffd23f" };
  state.events.push({ type: "wins", name: characterOf(winner).name });
}

function updatePhase(state: GameState) {
  switch (state.phase) {
    case "intro":
      if (state.phaseFrame === 1) {
        state.banner = { text: `ROUND ${state.round}`, color: "#ffd23f" };
        state.events.push({ type: "round", round: state.round });
      } else if (state.phaseFrame === 80) {
        state.banner = { text: "FIGHT!", color: "#ff3b3b" };
        state.events.push({ type: "fight" });
      } else if (state.phaseFrame === 120) {
        state.banner = null;
        setPhase(state, "fight");
      }
      break;

    case "fight":
      if (--state.timer <= 0) handleTimeout(state);
      break;

    case "roundOver": {
      const winner = state.fighters[state.winner ?? 0];
      if (state.phaseFrame === 70 && state.winner !== null) {
        state.banner = { text: `${characterOf(winner).name} GANA`, color: "#ffd23f" };
        state.events.push({ type: "wins", name: characterOf(winner).name });
      }
      if (state.phaseFrame > 40 && state.winner !== null && !isAirborne(winner) && (winner.action === "idle" || winner.action === "crouch" || winner.action === "walk" || winner.action === "block")) {
        setAction(winner, "victory");
      }
      if (state.phaseFrame === 200) {
        state.winner = null;
        startRound(state);
      }
      break;
    }

    case "finish": {
      const winner = state.fighters[state.winner!];
      const loser = state.fighters[1 - state.winner!];
      if (loser.action !== "dizzy" && loser.action !== "knockdown") setAction(loser, "dizzy");
      if (loser.action === "knockdown" && !isAirborne(loser)) setAction(loser, "dizzy");
      if (state.phaseFrame === 60) {
        state.banner = { text: "FINISH HIM!", color: "#ff3b3b" };
        state.events.push({ type: "finish" });
      }
      if (state.phaseFrame > 60 && loser.action === "dizzy" && hasFatalityInput(winner, state.tick) && Math.abs(winner.x - loser.x) <= FATALITY_RANGE) {
        startFatality(state);
      } else if (state.phaseFrame >= FINISH_FRAMES) {
        knockDown(loser, winner.facing, 3);
        endMatch(state, state.winner!);
      }
      break;
    }

    case "fatality":
      updateFatality(state);
      break;

    case "matchOver": {
      const loser = state.fighters[1 - (state.winner ?? 0)];
      if (loser.action === "dizzy") knockDown(loser, loser.facing === 1 ? -1 : 1, 3);
      break;
    }
  }
}

function handleTimeout(state: GameState) {
  const [a, b] = state.fighters;
  state.events.push({ type: "timeout" });
  state.projectiles = [];
  if (a.hp === b.hp) {
    state.winner = null;
    setPhase(state, "roundOver");
    state.banner = { text: "EMPATE", color: "#ffd23f" };
    return;
  }
  const winnerSide: 0 | 1 = a.hp > b.hp ? 0 : 1;
  const winner = state.fighters[winnerSide];
  winner.wins++;
  state.winner = winnerSide;
  if (winner.wins >= ROUNDS_TO_WIN) {
    endMatch(state, winnerSide);
    state.banner = { text: `${characterOf(winner).name} GANA`, sub: "TIEMPO", color: "#ffd23f" };
  } else {
    setPhase(state, "roundOver");
    state.banner = { text: "TIEMPO", color: "#ffd23f" };
  }
}

function startFatality(state: GameState) {
  const winner = state.fighters[state.winner!];
  const loser = state.fighters[1 - state.winner!];
  state.fatality = true;
  setPhase(state, "fatality");
  state.banner = null;
  setAction(winner, "attack");
  winner.attack = "special";
  winner.frame = 0;
  setAction(loser, "fatalityVictim");
  loser.vx = 0;
  state.events.push({ type: "fatalityStart", element: characterOf(winner).element });
}

/** Cuadro en el que el cuerpo de la víctima estalla. */
export const FATALITY_EXPLODE_FRAME = 80;

function updateFatality(state: GameState) {
  const winner = state.fighters[state.winner!];
  const loser = state.fighters[1 - state.winner!];
  const element = characterOf(winner).element;
  const t = state.phaseFrame;
  const cx = loser.x;
  const top = STAGE.floor - STAND_HEIGHT;

  if (t < FATALITY_EXPLODE_FRAME) {
    if (element === "fuego") {
      for (let i = 0; i < 3; i++) {
        spawnParticle(state, "fire", cx + range(state, -30, 30), STAGE.floor - range(state, 0, 170), range(state, -0.6, 0.6), range(state, -3, -1), 30, range(state, 6, 14), rand(state) < 0.5 ? "#ff7a1a" : "#ffd23f");
      }
      if (t % 4 === 0) spawnParticle(state, "smoke", cx + range(state, -20, 20), top, range(state, -0.3, 0.3), -1.2, 70, 16, "#3b3540");
    } else if (t % 3 === 0) {
      spawnParticle(state, "ice", cx + range(state, -40, 40), STAGE.floor - range(state, 0, 190), 0, -0.3, 30, range(state, 2, 4), "#e8fbff");
    }
  } else if (t === FATALITY_EXPLODE_FRAME) {
    state.shake = 24;
    state.events.push({ type: "explode" });
    spawnBlood(state, cx, STAGE.floor - 110, 1, 60);
    spawnBlood(state, cx, STAGE.floor - 110, -1, 60);
    if (element === "fuego") {
      spawnBurst(state, cx, STAGE.floor - 100, "fire", 50, "#ff7a1a", 9);
      spawnBurst(state, cx, STAGE.floor - 100, "bone", 10, "#e9e1cf", 7);
    } else {
      spawnBurst(state, cx, STAGE.floor - 100, "ice", 70, "#bfeaff", 10);
    }
  } else if (t === FATALITY_EXPLODE_FRAME + 50) {
    state.banner = { text: "FATALITY", color: "#d4141f" };
    state.events.push({ type: "fatality" });
  } else if (t === FATALITY_EXPLODE_FRAME + 190) {
    endMatch(state, state.winner!);
  }
}

// ───────────────────────── partículas ─────────────────────────

const MAX_PARTICLES = 700;

function spawnParticle(state: GameState, kind: ParticleKind, x: number, y: number, vx: number, vy: number, life: number, size: number, color: string) {
  if (state.particles.length >= MAX_PARTICLES) state.particles.shift();
  state.particles.push({ kind, x, y, vx, vy, life, maxLife: life, size, color, grounded: false });
}

function spawnBurst(state: GameState, x: number, y: number, kind: ParticleKind, count: number, color: string, speed: number) {
  for (let i = 0; i < count; i++) {
    const angle = rand(state) * Math.PI * 2;
    const v = range(state, 0.3, 1) * speed;
    const life = kind === "bone" ? 400 : kind === "smoke" ? 60 : range(state, 18, 40);
    const size = kind === "spark" ? range(state, 2, 4) : kind === "bone" ? range(state, 8, 14) : range(state, 3, 8);
    spawnParticle(state, kind, x, y, Math.cos(angle) * v, Math.sin(angle) * v - (kind === "bone" || kind === "ice" ? 4 : 0), life, size, color);
  }
}

function spawnBlood(state: GameState, x: number, y: number, dir: number, count: number) {
  const colors = ["#b0101a", "#8c0a12", "#d01c24"];
  for (let i = 0; i < count; i++) {
    spawnParticle(
      state,
      "blood",
      x,
      y,
      dir * range(state, 1, 7) + range(state, -1.5, 1.5),
      range(state, -7, -1),
      range(state, 200, 320),
      range(state, 2, 5),
      colors[i % colors.length],
    );
  }
}

function spawnDust(state: GameState, x: number) {
  for (let i = 0; i < 10; i++) {
    spawnParticle(state, "smoke", x + range(state, -40, 40), STAGE.floor - 4, range(state, -1.5, 1.5), range(state, -1, -0.2), 35, range(state, 6, 12), "#8a7d70");
  }
}

function updateParticles(state: GameState) {
  const alive: Particle[] = [];
  for (const p of state.particles) {
    p.life--;
    if (p.life <= 0) continue;
    if (!p.grounded) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.kind === "blood" || p.kind === "bone" || p.kind === "ice") p.vy += 0.35;
      else if (p.kind === "fire" || p.kind === "smoke") {
        p.vx *= 0.96;
        p.vy *= 0.97;
      } else {
        p.vx *= 0.9;
        p.vy *= 0.9;
      }
      if ((p.kind === "blood" || p.kind === "bone" || p.kind === "ice") && p.y >= STAGE.floor) {
        if (p.kind === "ice" && Math.abs(p.vy) > 2) {
          p.y = STAGE.floor;
          p.vy *= -0.3;
          p.vx *= 0.5;
        } else {
          p.y = STAGE.floor + (p.kind === "blood" ? (p.size * 37) % 6 : 0);
          p.grounded = true;
          if (p.kind === "blood") p.size *= 1.6;
        }
      }
    }
    alive.push(p);
  }
  state.particles = alive;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

// ───────────────────────── CPU ─────────────────────────

export type Difficulty = "facil" | "normal" | "dificil";

const AI_LEVEL: Record<Difficulty, { think: number; block: number; aggression: number; fatality: number }> = {
  facil: { think: 26, block: 0.15, aggression: 0.45, fatality: 0.2 },
  normal: { think: 16, block: 0.4, aggression: 0.6, fatality: 0.6 },
  dificil: { think: 8, block: 0.7, aggression: 0.75, fatality: 1 },
};

/** Calcula el input del jugador controlado por la computadora. */
export function cpuInput(state: GameState, side: 0 | 1, difficulty: Difficulty): Input {
  const me = state.fighters[side];
  const opp = state.fighters[1 - side];
  const queue = state.ai[side];
  const level = AI_LEVEL[difficulty];

  if (state.phase !== "fight" && !(state.phase === "finish" && state.winner === side)) {
    state.ai[side] = [];
    return NO_INPUT;
  }

  const dist = Math.abs(opp.x - me.x);
  const toward: Partial<Input> = opp.x > me.x ? { right: true } : { left: true };
  const away: Partial<Input> = opp.x > me.x ? { left: true } : { right: true };
  const plan = (...steps: AiStep[]) => {
    state.ai[side] = steps;
  };

  if (queue.length === 0) {
    if (state.phase === "finish") {
      if (state.phaseFrame < 70) return NO_INPUT;
      if (rand(state) < level.fatality) {
        if (dist > 220) plan({ input: toward, frames: 10 });
        else plan({ input: {}, frames: 20 }, { input: { down: true }, frames: 4 }, { input: {}, frames: 3 }, { input: { down: true }, frames: 4 }, { input: {}, frames: 2 }, { input: { punch: true }, frames: 2 }, { input: {}, frames: 60 });
      } else if (dist > 80) {
        plan({ input: toward, frames: 8 });
      } else {
        plan({ input: { down: true }, frames: 2 }, { input: { down: true, punch: true }, frames: 2 }, { input: {}, frames: 30 });
      }
    } else {
      decide(state, me, opp, dist, toward, away, level, plan);
    }
  }

  // Reacción defensiva: interrumpe el plan si viene un golpe o un proyectil.
  const threatened =
    // Se evalúa en un único cuadro por amenaza para que la probabilidad no se acumule.
    (opp.action === "attack" && opp.attack !== "special" && dist < 140 && opp.frame === 2) ||
    state.projectiles.some((p) => p.owner !== side && Math.sign(me.x - p.x) === Math.sign(p.vx) && Math.abs(p.x - me.x) > 150 && Math.abs(p.x - me.x) <= 160);
  if (threatened && me.action !== "attack" && !state.ai[side][0]?.defend && rand(state) < level.block) {
    const projectile = state.projectiles.some((p) => p.owner !== side);
    if (projectile && rand(state) < 0.5) plan({ input: { down: true }, frames: 24, defend: true });
    else plan({ input: { block: true, down: opp.attack === "sweep" }, frames: 16, defend: true });
  }

  const current = state.ai[side][0];
  if (!current) return NO_INPUT;
  current.frames--;
  if (current.frames <= 0) state.ai[side].shift();
  return { ...NO_INPUT, ...current.input };
}

function decide(
  state: GameState,
  me: Fighter,
  opp: Fighter,
  dist: number,
  toward: Partial<Input>,
  away: Partial<Input>,
  level: (typeof AI_LEVEL)[Difficulty],
  plan: (...steps: AiStep[]) => void,
) {
  const r = rand(state);
  const think = { input: {}, frames: Math.round(level.think * range(state, 0.6, 1.4)) };
  const press = (input: Partial<Input>): AiStep[] => [{ input, frames: 2 }, { input: {}, frames: 1 }];
  const canSpecial = me.specialCooldown === 0 && !state.projectiles.some((p) => p.owner === me.side);

  if (opp.action === "knockdown" || opp.action === "frozen") {
    if (opp.action === "frozen" && dist < 90) return plan(...press({ down: true, punch: true }), think);
    if (opp.action === "frozen") return plan({ input: toward, frames: 10 });
    return plan({ input: away, frames: 10 }, think);
  }

  if (dist > 300) {
    if (canSpecial && r < 0.3) return plan(...press({ special: true }), think);
    if (r < 0.85) return plan({ input: toward, frames: 25 }, think);
    return plan({ input: { ...toward, up: true }, frames: 2 }, { input: {}, frames: 12 }, ...press({ kick: true }), { input: {}, frames: 25 });
  }
  if (dist > 110) {
    if (canSpecial && r < 0.18) return plan(...press({ special: true }), think);
    if (r < 0.35 * (1 + level.aggression)) return plan({ input: { ...toward, up: true }, frames: 2 }, { input: {}, frames: 14 }, ...press({ kick: true }), { input: {}, frames: 25 });
    if (r < 0.85) return plan({ input: toward, frames: 14 });
    return plan({ input: { block: true }, frames: 20 }, think);
  }
  if (r < level.aggression) {
    const pick = rand(state);
    if (pick < 0.3) return plan(...press({ punch: true }), { input: {}, frames: 8 }, ...press({ punch: true }), think);
    if (pick < 0.55) return plan(...press({ kick: true }), think);
    if (pick < 0.75) return plan({ input: { down: true }, frames: 3 }, ...press({ down: true, kick: true }), { input: { down: true }, frames: 10 }, think);
    if (dist < 80) return plan({ input: { down: true }, frames: 3 }, ...press({ down: true, punch: true }), think);
    return plan(...press({ punch: true }), think);
  }
  if (r < level.aggression + 0.2) return plan({ input: { block: true }, frames: 20 }, think);
  return plan({ input: away, frames: 15 }, think);
}
