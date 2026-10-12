// Gráficos del juego en <canvas> 2D.
//
// - Luchadores: esqueleto de poses interpoladas; cada parte del cuerpo se dibuja como un
//   volumen sombreado en un lienzo propio, que después se usa para el contorno, la sombra
//   proyectada, el reflejo en el piso y la iluminación (fuego, hielo, braseros, luna).
// - Escenario: capas con parallax que se mueven distinto según la cámara.
// - Cámara: sigue a los luchadores y hace zoom en los momentos clave (K.O., fatality).
// - Post-proceso: brillo (bloom), viñeta, grano y destellos.

import {
  ATTACKS,
  FATALITY_EXPLODE_FRAME,
  MAX_HP,
  ROUNDS_TO_WIN,
  STAGE,
  characterOf,
  type CharacterId,
  type Fighter,
  type GameEvent,
  type GameState,
  type Particle,
  type Projectile,
} from "./engine";

const W = STAGE.width;
const H = STAGE.height;
const FLOOR = STAGE.floor;
const MARGIN = 90;
export const TITLE_FONT = "Anton, Impact, 'Arial Narrow Bold', sans-serif";

type P = [number, number];

// ───────────────────────── poses ─────────────────────────

interface Pose {
  hip: P;
  neck: P;
  head: P;
  fElbow: P;
  fHand: P;
  bElbow: P;
  bHand: P;
  fKnee: P;
  fFoot: P;
  bKnee: P;
  bFoot: P;
}

// Puntos en "espacio del luchador": x hacia adelante, y hacia arriba desde los pies.
const STAND: Pose = {
  hip: [0, 95], neck: [4, 150], head: [7, 170],
  fElbow: [24, 124], fHand: [32, 146], bElbow: [-4, 120], bHand: [18, 136],
  fKnee: [20, 50], fFoot: [28, 0], bKnee: [-12, 50], bFoot: [-26, 0],
};
const CROUCH: Pose = {
  hip: [-4, 52], neck: [10, 102], head: [16, 122],
  fElbow: [30, 80], fHand: [38, 102], bElbow: [4, 76], bHand: [24, 92],
  fKnee: [30, 46], fFoot: [28, 0], bKnee: [-10, 28], bFoot: [-34, 0],
};
const JUMP: Pose = {
  hip: [0, 95], neck: [6, 148], head: [9, 168],
  fElbow: [26, 130], fHand: [32, 150], bElbow: [-10, 128], bHand: [12, 140],
  fKnee: [26, 72], fFoot: [10, 40], bKnee: [4, 60], bFoot: [-20, 42],
};
const PUNCH: Pose = {
  ...STAND, neck: [10, 150], head: [14, 170],
  fElbow: [46, 150], fHand: [84, 152], bElbow: [-12, 126], bHand: [6, 136],
  fKnee: [22, 50], fFoot: [36, 0], bKnee: [-16, 50], bFoot: [-34, 0],
};
const KICK: Pose = {
  hip: [-4, 95], neck: [-18, 148], head: [-22, 168],
  fElbow: [6, 130], fHand: [20, 145], bElbow: [-30, 125], bHand: [-44, 140],
  fKnee: [40, 112], fFoot: [96, 124], bKnee: [-8, 50], bFoot: [-12, 0],
};
const SWEEP: Pose = {
  hip: [-8, 40], neck: [-6, 92], head: [-4, 112],
  fElbow: [10, 64], fHand: [8, 40], bElbow: [-24, 70], bHand: [-34, 88],
  fKnee: [42, 24], fFoot: [94, 8], bKnee: [-14, 22], bFoot: [-36, 0],
};
const UPPERCUT_WIND: Pose = { ...CROUCH, fElbow: [10, 70], fHand: [20, 52] };
const UPPERCUT: Pose = {
  hip: [4, 100], neck: [10, 158], head: [8, 178],
  fElbow: [30, 176], fHand: [36, 218], bElbow: [-12, 128], bHand: [-4, 110],
  fKnee: [22, 52], fFoot: [24, 0], bKnee: [-14, 46], bFoot: [-30, 0],
};
const JUMP_KICK: Pose = {
  hip: [0, 95], neck: [-12, 146], head: [-16, 166],
  fElbow: [10, 130], fHand: [24, 148], bElbow: [-28, 126], bHand: [-38, 142],
  fKnee: [44, 84], fFoot: [92, 74], bKnee: [4, 62], bFoot: [-22, 46],
};
const BLOCK: Pose = { ...STAND, head: [3, 168], fElbow: [26, 142], fHand: [28, 176], bElbow: [20, 128], bHand: [32, 160] };
const CROUCH_BLOCK: Pose = { ...CROUCH, fElbow: [28, 88], fHand: [30, 122], bElbow: [22, 78], bHand: [34, 108] };
const HIT: Pose = {
  hip: [-6, 95], neck: [-20, 146], head: [-28, 164],
  fElbow: [-4, 126], fHand: [10, 112], bElbow: [-36, 128], bHand: [-48, 112],
  fKnee: [14, 50], fFoot: [22, 0], bKnee: [-18, 50], bFoot: [-30, 0],
};
const SPECIAL_WIND: Pose = { ...STAND, neck: [-4, 150], head: [-4, 170], fElbow: [-14, 130], fHand: [-30, 122], bElbow: [-20, 126], bHand: [-38, 116] };
const SPECIAL: Pose = {
  ...STAND, neck: [12, 150], head: [16, 170],
  fElbow: [42, 144], fHand: [76, 148], bElbow: [32, 134], bHand: [68, 138],
  fKnee: [24, 48], fFoot: [38, 0], bKnee: [-18, 48], bFoot: [-36, 0],
};
const LYING: Pose = {
  hip: [0, 14], neck: [-56, 16], head: [-78, 16],
  fElbow: [-36, 32], fHand: [-18, 12], bElbow: [-46, 6], bHand: [-28, 4],
  fKnee: [26, 30], fFoot: [56, 8], bKnee: [28, 14], bFoot: [60, 4],
};
const FLYING: Pose = {
  hip: [0, 60], neck: [-40, 92], head: [-56, 106],
  fElbow: [-20, 112], fHand: [-4, 132], bElbow: [-50, 72], bHand: [-62, 92],
  fKnee: [24, 74], fFoot: [48, 58], bKnee: [18, 50], bFoot: [42, 36],
};
const DIZZY: Pose = { ...STAND, fElbow: [10, 116], fHand: [14, 88], bElbow: [-8, 116], bHand: [-6, 88] };
const VICTORY: Pose = { ...STAND, fElbow: [22, 182], fHand: [16, 222], bElbow: [-20, 122], bHand: [-4, 104] };

const KEYS = Object.keys(STAND) as (keyof Pose)[];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
function lerpP(a: P, b: P, t: number): P {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}
function sub(a: P, b: P): P {
  return [a[0] - b[0], a[1] - b[1]];
}
function norm(v: P): P {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
}
function add(a: P, b: P, k = 1): P {
  return [a[0] + b[0] * k, a[1] + b[1] * k];
}

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = {} as Pose;
  for (const k of KEYS) out[k] = lerpP(a[k], b[k], t);
  return out;
}

function offset(pose: Pose, dx: number, dy: number, keys: (keyof Pose)[] = KEYS): Pose {
  const out = { ...pose };
  for (const k of keys) out[k] = [pose[k][0] + dx, pose[k][1] + dy];
  return out;
}

function ease(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function attackPose(base: Pose, hit: Pose, f: Fighter): Pose {
  const spec = ATTACKS[f.attack!];
  if (f.frame <= spec.startup) return lerpPose(base, hit, Math.min(1, f.frame / spec.startup) ** 0.7);
  if (f.frame <= spec.startup + spec.active) return hit;
  return lerpPose(hit, base, ease(Math.min(1, (f.frame - spec.startup - spec.active) / Math.max(1, spec.recovery))));
}

function walkPose(f: Fighter): Pose {
  const phase = f.frame * 0.22 * (f.vx * f.facing >= 0 ? 1 : -1);
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const pose = offset(STAND, 0, Math.abs(c) * 2.5, ["hip", "neck", "head", "fElbow", "fHand", "bElbow", "bHand"]);
  const fFoot: P = [4 + 22 * s, Math.max(0, 10 * c)];
  const bFoot: P = [-4 - 22 * s, Math.max(0, -10 * c)];
  return {
    ...pose,
    fFoot,
    bFoot,
    fKnee: [(pose.hip[0] + fFoot[0]) / 2 + 10, 50 + fFoot[1] / 2],
    bKnee: [(pose.hip[0] + bFoot[0]) / 2 + 10, 50 + bFoot[1] / 2],
    fHand: [32 - 6 * s, 146], bHand: [18 + 6 * s, 138],
  };
}

function poseFor(f: Fighter, tick: number): Pose {
  const breathe = Math.sin(tick * 0.08 + f.side) * 2;
  switch (f.action) {
    case "idle":
      return offset(STAND, 0, breathe, ["neck", "head", "fElbow", "fHand", "bElbow", "bHand"]);
    case "walk":
      return walkPose(f);
    case "crouch":
      return CROUCH;
    case "block":
      return f.crouching ? CROUCH_BLOCK : BLOCK;
    case "jump":
      return f.vy > 6 ? lerpPose(STAND, JUMP, 0.5) : JUMP;
    case "attack":
      switch (f.attack) {
        case "punch":
          return attackPose(STAND, PUNCH, f);
        case "kick":
          return attackPose(STAND, KICK, f);
        case "sweep":
          return attackPose(CROUCH, SWEEP, f);
        case "uppercut":
          return f.frame <= ATTACKS.uppercut.startup
            ? lerpPose(CROUCH, UPPERCUT_WIND, f.frame / ATTACKS.uppercut.startup)
            : attackPose(STAND, UPPERCUT, f);
        case "jumpKick":
          return f.frame <= ATTACKS.jumpKick.startup ? JUMP : JUMP_KICK;
        case "special": {
          const spec = ATTACKS.special;
          if (f.frame <= spec.startup) return lerpPose(STAND, SPECIAL_WIND, ease(f.frame / spec.startup));
          if (f.frame <= spec.startup + 4) return lerpPose(SPECIAL_WIND, SPECIAL, (f.frame - spec.startup) / 4);
          return lerpPose(SPECIAL, STAND, Math.min(1, (f.frame - spec.startup - 4) / spec.recovery));
        }
      }
      return STAND;
    case "hit":
      return f.crouching ? lerpPose(CROUCH, HIT, 0.3) : HIT;
    case "frozen":
      return HIT;
    case "knockdown":
      if (f.y > 0) return FLYING;
      if (f.stun > 12) return LYING;
      return lerpPose(LYING, CROUCH, (12 - f.stun) / 12);
    case "defeated":
      return LYING;
    case "dizzy": {
      const sway = Math.sin(tick * 0.09) * 10;
      return offset(DIZZY, sway, 0, ["neck", "head", "fElbow", "fHand", "bElbow", "bHand"]);
    }
    case "victory":
      return lerpPose(STAND, VICTORY, ease(Math.min(1, f.frame / 14)));
    case "fatalityVictim":
      return DIZZY;
  }
}

// ───────────────────────── colores ─────────────────────────

interface Look {
  suit: string;
  main: string;
  mainDark: string;
  metal: string;
  eyes: string;
  glow: string;
  leather: string;
}

const LOOKS: Record<CharacterId, Look> = {
  kaen: { suit: "#1b1815", main: "#eba81c", mainDark: "#8f5f08", metal: "#d8b058", eyes: "#ffffff", glow: "#ff8a2a", leather: "#2c1f17" },
  kori: { suit: "#121722", main: "#2b88e3", mainDark: "#164c88", metal: "#c9d6e3", eyes: "#eafcff", glow: "#7fdcff", leather: "#1a1f2a" },
};
const MIRROR_LOOKS: Record<CharacterId, Partial<Look>> = {
  kaen: { main: "#d84a2c", mainDark: "#7a1e10", glow: "#ff5a3a" },
  kori: { main: "#3fbf6b", mainDark: "#1f6e3c", glow: "#7fffb0" },
};

function lookFor(state: GameState, f: Fighter): Look {
  const base = LOOKS[f.char];
  const mirror = state.fighters[0].char === state.fighters[1].char && f.side === 1;
  return mirror ? { ...base, ...MIRROR_LOOKS[f.char] } : base;
}

const shadeCache = new Map<string, string>();
/** amt > 0 aclara hacia blanco; amt < 0 oscurece hacia negro. Devuelve hex. */
function shade(hex: string, amt: number): string {
  const key = hex + amt;
  const cached = shadeCache.get(key);
  if (cached) return cached;
  const n = parseInt(hex.slice(1), 16);
  const target = amt >= 0 ? 255 : 0;
  const k = Math.abs(amt);
  const ch = (v: number) => Math.round(v + (target - v) * k).toString(16).padStart(2, "0");
  const out = `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
  shadeCache.set(key, out);
  return out;
}

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w: number, h: number, scale: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w * scale));
  c.height = Math.max(1, Math.ceil(h * scale));
  const g = c.getContext("2d")!;
  g.setTransform(scale, 0, 0, scale, 0, 0);
  return { c, g };
}

const softCache = new Map<string, HTMLCanvasElement>();
/** Círculo difuso pre-dibujado: base de llamas, humo, brillo y luces. */
function soft(color: string): HTMLCanvasElement {
  let c = softCache.get(color);
  if (c) return c;
  const s = makeCanvas(64, 64, 1);
  const grad = s.g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, rgba(color, 1));
  grad.addColorStop(0.35, rgba(color, 0.55));
  grad.addColorStop(1, rgba(color, 0));
  s.g.fillStyle = grad;
  s.g.fillRect(0, 0, 64, 64);
  c = s.c;
  softCache.set(color, c);
  return c;
}

function drawSoft(g: CanvasRenderingContext2D, color: string, x: number, y: number, r: number, rx = r) {
  g.drawImage(soft(color), x - rx, y - r, rx * 2, r * 2);
}

/** Camino suave y cerrado que pasa cerca de los puntos (curvas por los puntos medios). */
function smoothPath(g: CanvasRenderingContext2D, pts: P[]) {
  const n = pts.length;
  const mid = (i: number): P => lerpP(pts[i % n], pts[(i + 1) % n], 0.5);
  g.beginPath();
  const m0 = mid(n - 1);
  g.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const m = mid(i);
    g.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
  }
  g.closePath();
}

// ───────────────────────── cuerpo ─────────────────────────

/** Extremidad con volumen: cápsula afinada, levemente musculosa y sombreada como un cilindro. */
function limb(g: CanvasRenderingContext2D, a: P, b: P, ra: number, rb: number, color: string, bulge = 0) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const ang = Math.atan2(dy, dx);
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const rm = (ra + rb) / 2 + bulge;

  g.beginPath();
  g.moveTo(a[0] + px * ra, a[1] + py * ra);
  g.quadraticCurveTo(mx + px * rm * 1.08, my + py * rm * 1.08, b[0] + px * rb, b[1] + py * rb);
  g.arc(b[0], b[1], rb, ang + Math.PI / 2, ang - Math.PI / 2, true);
  g.quadraticCurveTo(mx - px * rm * 1.08, my - py * rm * 1.08, a[0] - px * ra, a[1] - py * ra);
  g.arc(a[0], a[1], ra, ang - Math.PI / 2, ang + Math.PI / 2, true);
  g.closePath();

  // La luz viene de arriba: el lado cuya normal apunta hacia arriba es el iluminado.
  const s = py <= 0 ? 1 : -1;
  const grad = g.createLinearGradient(mx + px * rm * s, my + py * rm * s, mx - px * rm * s, my - py * rm * s);
  grad.addColorStop(0, shade(color, 0.32));
  grad.addColorStop(0.28, shade(color, 0.06));
  grad.addColorStop(0.62, color);
  grad.addColorStop(1, shade(color, -0.55));
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = "rgba(0,0,0,0.35)";
  g.lineWidth = 0.8;
  g.stroke();
}

function bands(g: CanvasRenderingContext2D, a: P, b: P, r: number, ts: number[], color: string, width = 1.4) {
  const d = norm(sub(b, a));
  const p: P = [-d[1], d[0]];
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  for (const t of ts) {
    const c = lerpP(a, b, t);
    g.moveTo(c[0] + p[0] * r, c[1] + p[1] * r);
    g.lineTo(c[0] - p[0] * r, c[1] - p[1] * r);
  }
  g.stroke();
}

function boot(g: CanvasRenderingContext2D, ankle: P, shin: P, dir: number, color: string) {
  // La punta del pie va perpendicular a la canilla, hacia adelante (o hacia arriba en una patada).
  const t1: P = [shin[1], -shin[0]];
  const t2: P = [-shin[1], shin[0]];
  const score = (t: P) => t[0] * dir - t[1] * 0.5;
  const t = score(t1) >= score(t2) ? t1 : t2;
  const pts: P[] = [
    add(add(ankle, t, -6), shin, -2),
    add(add(ankle, t, -7), shin, 7),
    add(add(ankle, t, 19), shin, 8),
    add(add(ankle, t, 20), shin, 4),
    add(add(ankle, t, 9), shin, -1),
    add(add(ankle, t, 4), shin, -5),
  ];
  smoothPath(g, pts);
  const top = add(ankle, shin, -4);
  const bottom = add(ankle, shin, 8);
  const grad = g.createLinearGradient(top[0], top[1], bottom[0], bottom[1]);
  grad.addColorStop(0, shade(color, 0.25));
  grad.addColorStop(0.6, color);
  grad.addColorStop(1, shade(color, -0.6));
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = "rgba(0,0,0,0.5)";
  g.lineWidth = 0.8;
  g.stroke();
}

function fist(g: CanvasRenderingContext2D, elbow: P, hand: P, color: string, r = 7.2) {
  const d = norm(sub(hand, elbow));
  const c = add(hand, d, 2);
  const grad = g.createRadialGradient(c[0] - 2, c[1] - 3, 1, c[0], c[1], r);
  grad.addColorStop(0, shade(color, 0.35));
  grad.addColorStop(0.6, color);
  grad.addColorStop(1, shade(color, -0.6));
  g.fillStyle = grad;
  g.beginPath();
  g.arc(c[0], c[1], r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(0,0,0,0.45)";
  g.lineWidth = 0.8;
  g.stroke();
  // Nudillos
  g.strokeStyle = rgba("#ffffff", 0.18);
  g.lineWidth = 1;
  g.beginPath();
  g.arc(c[0], c[1], r * 0.62, Math.atan2(d[1], d[0]) - 0.9, Math.atan2(d[1], d[0]) + 0.9);
  g.stroke();
}

function shoulderPad(g: CanvasRenderingContext2D, shoulder: P, elbow: P, color: string) {
  const d = norm(sub(elbow, shoulder));
  const c = add(shoulder, d, 4);
  const ang = Math.atan2(d[1], d[0]);
  g.save();
  g.translate(c[0], c[1]);
  g.rotate(ang);
  const grad = g.createLinearGradient(0, -8, 0, 8);
  grad.addColorStop(0, shade(color, 0.5));
  grad.addColorStop(0.45, color);
  grad.addColorStop(1, shade(color, -0.55));
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(0, 0, 12, 8.5, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(0,0,0,0.55)";
  g.lineWidth = 1;
  g.stroke();
  g.fillStyle = shade(color, -0.5);
  g.beginPath();
  g.arc(-5, -3, 1.3, 0, Math.PI * 2);
  g.arc(5, -3, 1.3, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function ribbon(g: CanvasRenderingContext2D, pts: P[], width: number, dark: string, light: string) {
  if (pts.length < 2) return;
  const left: P[] = [];
  const right: P[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const d = norm(sub(b, a));
    const w = width * (1 - i / pts.length) * 0.8 + 1.3;
    left.push([pts[i][0] - d[1] * w, pts[i][1] + d[0] * w]);
    right.push([pts[i][0] + d[1] * w, pts[i][1] - d[0] * w]);
  }
  g.beginPath();
  g.moveTo(left[0][0], left[0][1]);
  for (const p of left) g.lineTo(p[0], p[1]);
  for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
  g.closePath();
  const end = pts[pts.length - 1];
  const grad = g.createLinearGradient(pts[0][0], pts[0][1], end[0], end[1]);
  grad.addColorStop(0, light);
  grad.addColorStop(1, dark);
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = "rgba(0,0,0,0.4)";
  g.lineWidth = 0.8;
  g.stroke();
}

function leg(g: CanvasRenderingContext2D, hip: P, knee: P, foot: P, dir: number, look: Look, dim: number) {
  const suit = shade(look.suit, dim);
  const wrap = shade(look.main, dim);
  const shin = norm(sub(foot, knee));
  const ankle = add(foot, shin, -7);
  limb(g, hip, knee, 12, 8.8, suit, 2.6);
  limb(g, knee, ankle, 8.8, 6.2, suit, 1.6);
  const wrapTop = lerpP(knee, ankle, 0.3);
  limb(g, wrapTop, ankle, 8.6, 6.5, wrap, 0.6);
  bands(g, wrapTop, ankle, 8, [0.25, 0.5, 0.75], rgba(shade(look.main, -0.6), 0.7), 1.1);
  boot(g, ankle, shin, dir, shade(look.leather, dim));
}

function arm(g: CanvasRenderingContext2D, shoulder: P, elbow: P, hand: P, look: Look, dim: number) {
  limb(g, shoulder, elbow, 8.8, 6.8, shade(look.suit, dim), 1.8);
  limb(g, elbow, hand, 6.9, 5.6, shade(look.main, dim), 0.6);
  bands(g, elbow, hand, 6.4, [0.3, 0.72], rgba(shade(look.metal, dim), 0.9), 1.6);
  fist(g, elbow, hand, shade(look.leather, dim));
}

function drawHead(g: CanvasRenderingContext2D, head: P, neck: P, dir: number, look: Look) {
  const [hx, hy] = head;
  limb(g, neck, [hx - dir * 1, hy + 7], 7, 6.5, look.suit);

  // Capucha que cae por la nuca
  smoothPath(g, [
    [hx - dir * 13, hy - 7],
    [hx - dir * 18, hy + 6],
    [neck[0] - dir * 12, neck[1] + 8],
    [neck[0] + dir * 5, neck[1] + 5],
    [hx + dir * 5, hy + 12],
  ]);
  g.fillStyle = shade(look.mainDark, -0.15);
  g.fill();

  const grad = g.createRadialGradient(hx - dir * 3, hy - 8, 2, hx, hy, 17);
  grad.addColorStop(0, shade(look.main, 0.4));
  grad.addColorStop(0.45, look.main);
  grad.addColorStop(1, shade(look.main, -0.5));
  g.fillStyle = grad;
  g.beginPath();
  g.arc(hx, hy, 15.5, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(0,0,0,0.45)";
  g.lineWidth = 0.9;
  g.stroke();

  // Costura de la capucha
  g.strokeStyle = rgba(shade(look.main, -0.6), 0.6);
  g.lineWidth = 1;
  g.beginPath();
  g.arc(hx - dir * 4, hy + 2, 13, -Math.PI / 2 - 0.9, -Math.PI / 2 + 0.6);
  g.stroke();

  // Máscara inferior
  g.fillStyle = look.mainDark;
  g.beginPath();
  g.ellipse(hx + dir * 5, hy + 6.5, 11, 7.5, 0, 0, Math.PI);
  g.fill();
  g.strokeStyle = rgba("#000000", 0.35);
  g.beginPath();
  g.moveTo(hx + dir * 1, hy + 7);
  g.lineTo(hx + dir * 14, hy + 6);
  g.stroke();

  // Abertura de los ojos
  g.fillStyle = "#0d0708";
  g.beginPath();
  g.ellipse(hx + dir * 7.5, hy - 1.5, 9, 3.8, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = look.eyes;
  g.beginPath();
  g.ellipse(hx + dir * 11, hy - 1.6, 3.4, 1.5, 0, 0, Math.PI * 2);
  g.ellipse(hx + dir * 3.5, hy - 1.4, 1.8, 1.2, 0, 0, Math.PI * 2);
  g.fill();
  // Ceño
  g.strokeStyle = shade(look.main, -0.45);
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(hx + dir * 1, hy - 6);
  g.quadraticCurveTo(hx + dir * 9, hy - 7.5, hx + dir * 15.5, hy - 4.5);
  g.stroke();
}

interface BodyOpts {
  look: Look;
  dir: 1 | -1;
  sway: number;
  chain: P[] | null;
}

/** Dibuja al luchador con los pies en (0,0). Devuelve la posición local del ojo (para el brillo). */
function drawBody(g: CanvasRenderingContext2D, pose: Pose, o: BodyOpts): P {
  const { look, dir } = o;
  const J = {} as Pose;
  for (const k of KEYS) J[k] = [pose[k][0] * dir, -pose[k][1]];
  const up = norm(sub(J.neck, J.hip));
  let side: P = [-up[1], up[0]];
  if (side[0] * dir < 0) side = [-side[0], -side[1]];
  const at = (t: number, w: number): P => [
    J.hip[0] + (J.neck[0] - J.hip[0]) * t + side[0] * w,
    J.hip[1] + (J.neck[1] - J.hip[1]) * t + side[1] * w,
  ];
  const down: P = [-up[0], -up[1]];
  const shoulderF = at(0.9, 6);
  const shoulderB = at(0.9, -8);
  const hipF = at(0.03, 5);
  const hipB = at(0.03, -5);
  const dim = -0.38;

  if (o.chain) ribbon(g, o.chain, 6.5, shade(look.mainDark, -0.3), look.main);

  // Plano de atrás
  leg(g, hipB, J.bKnee, J.bFoot, dir, look, dim);
  arm(g, shoulderB, J.bElbow, J.bHand, look, dim);
  shoulderPad(g, shoulderB, J.bElbow, shade(look.metal, dim));
  flap(g, at(0.02, -14), at(0.02, -4), norm(lerpP(down, norm(sub(J.bKnee, hipB)), 0.5)), o.sway * 0.7, 44, shade(look.mainDark, -0.25), shade(look.metal, -0.4));

  // Torso
  const torso: P[] = [
    at(1.0, 7), at(0.9, 19.5), at(0.72, 19.5), at(0.5, 15.5), at(0.28, 13), at(0.04, 15.5),
    at(0.04, -15.5), at(0.3, -14), at(0.55, -17.5), at(0.82, -20.5), at(0.98, -12),
  ];
  smoothPath(g, torso);
  const tf = at(0.6, 21);
  const tb = at(0.6, -21);
  const tg = g.createLinearGradient(tf[0], tf[1], tb[0], tb[1]);
  tg.addColorStop(0, shade(look.suit, 0.2));
  tg.addColorStop(0.45, look.suit);
  tg.addColorStop(1, shade(look.suit, -0.6));
  g.fillStyle = tg;
  g.fill();
  g.strokeStyle = "rgba(0,0,0,0.5)";
  g.lineWidth = 0.9;
  g.stroke();
  // Pecho y abdominales
  g.strokeStyle = "rgba(0,0,0,0.4)";
  g.lineWidth = 1.3;
  g.beginPath();
  const c1 = at(0.62, 17.5);
  const c2 = at(0.54, 8);
  const c3 = at(0.66, 2);
  g.moveTo(c1[0], c1[1]);
  g.quadraticCurveTo(c2[0], c2[1], c3[0], c3[1]);
  for (const t of [0.42, 0.3]) {
    const a = at(t, 3);
    const b = at(t, 12);
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
  }
  g.stroke();

  // Chaleco
  smoothPath(g, [at(0.98, 6), at(0.93, 20), at(0.7, 20.2), at(0.46, 16), at(0.36, 12.5), at(0.5, 7), at(0.8, 4)]);
  const vg = g.createLinearGradient(tf[0], tf[1], tb[0], tb[1]);
  vg.addColorStop(0, shade(look.main, 0.25));
  vg.addColorStop(0.5, look.main);
  vg.addColorStop(1, shade(look.main, -0.5));
  g.fillStyle = vg;
  g.fill();
  g.strokeStyle = rgba(look.metal, 0.75);
  g.lineWidth = 1.2;
  g.stroke();
  smoothPath(g, [at(0.97, -11), at(0.84, -20.8), at(0.56, -17.8), at(0.36, -14.6), at(0.5, -9), at(0.8, -8)]);
  g.fillStyle = shade(look.mainDark, -0.1);
  g.fill();
  // Cuello
  g.strokeStyle = look.mainDark;
  g.lineWidth = 4;
  g.lineCap = "round";
  g.beginPath();
  const n1 = at(0.98, 8);
  const n2 = at(1.08, -1);
  const n3 = at(0.98, -10);
  g.moveTo(n1[0], n1[1]);
  g.quadraticCurveTo(n2[0], n2[1], n3[0], n3[1]);
  g.stroke();

  // Plano de adelante
  leg(g, hipF, J.fKnee, J.fFoot, dir, look, 0);

  // Cinturón
  const b1 = at(0.15, 16.2);
  const b2 = at(0.15, -16);
  const b3 = at(0.0, -16);
  const b4 = at(0.0, 16.2);
  g.beginPath();
  g.moveTo(b1[0], b1[1]);
  g.lineTo(b2[0], b2[1]);
  g.lineTo(b3[0], b3[1]);
  g.lineTo(b4[0], b4[1]);
  g.closePath();
  const bg = g.createLinearGradient(b1[0], b1[1], b4[0], b4[1]);
  bg.addColorStop(0, shade(look.leather, 0.25));
  bg.addColorStop(1, shade(look.leather, -0.4));
  g.fillStyle = bg;
  g.fill();
  g.strokeStyle = rgba(look.metal, 0.6);
  g.lineWidth = 0.9;
  g.stroke();
  flap(g, at(0.02, 3), at(0.02, 15), norm(lerpP(down, norm(sub(J.fKnee, hipF)), 0.55)), o.sway, 50, look.main, look.metal);
  const buckle = at(0.075, 15.5);
  const bk = g.createRadialGradient(buckle[0] - 1.5, buckle[1] - 1.5, 0.5, buckle[0], buckle[1], 5.2);
  bk.addColorStop(0, shade(look.metal, 0.6));
  bk.addColorStop(1, shade(look.metal, -0.45));
  g.fillStyle = bk;
  g.beginPath();
  g.arc(buckle[0], buckle[1], 5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = shade(look.metal, -0.6);
  g.beginPath();
  g.arc(buckle[0], buckle[1], 1.8, 0, Math.PI * 2);
  g.fill();

  drawHead(g, J.head, J.neck, dir, look);

  arm(g, shoulderF, J.fElbow, J.fHand, look, 0);
  shoulderPad(g, shoulderF, J.fElbow, look.metal);

  return [J.head[0] + dir * 11, J.head[1] - 1.6];
}

/** Faldón de tela que cuelga del cinturón y se balancea. */
function flap(g: CanvasRenderingContext2D, a: P, b: P, hang: P, sway: number, len: number, color: string, trim: string) {
  const ang = Math.atan2(hang[1], hang[0]) + sway;
  const d: P = [Math.cos(ang), Math.sin(ang)];
  const m = lerpP(a, b, 0.5);
  const pts: P[] = [a, add(a, d, len * 0.86), add(m, d, len), add(b, d, len * 0.9), b];
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
  g.closePath();
  const end = add(m, d, len);
  const grad = g.createLinearGradient(m[0], m[1], end[0], end[1]);
  grad.addColorStop(0, shade(color, -0.15));
  grad.addColorStop(0.3, color);
  grad.addColorStop(1, shade(color, -0.45));
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = rgba(trim, 0.85);
  g.lineWidth = 1.3;
  g.stroke();
  // Emblema
  const e = add(m, d, len * 0.42);
  g.strokeStyle = rgba(trim, 0.8);
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(e[0], e[1], 4.5, 0, Math.PI * 2);
  g.stroke();
}

/** Retrato del luchador (para el menú y el HUD). */
export function drawPortrait(g: CanvasRenderingContext2D, char: CharacterId, cx: number, cy: number, r: number, dir: 1 | -1 = 1) {
  const look = LOOKS[char];
  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.clip();
  const bg = g.createRadialGradient(cx, cy - r * 0.2, r * 0.1, cx, cy, r);
  bg.addColorStop(0, rgba(look.glow, 0.85));
  bg.addColorStop(1, "#12060a");
  g.fillStyle = bg;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);
  const k = r / 22;
  g.translate(cx - dir * 4 * k, cy + 6 * k);
  g.scale(k, k);
  drawHead(g, [0, -6], [-dir * 6, 26], dir, look);
  g.restore();
}

// ───────────────────────── escenario ─────────────────────────

interface Layers {
  sky: HTMLCanvasElement;
  clouds: HTMLCanvasElement;
  mountains: HTMLCanvasElement;
  temple: HTMLCanvasElement;
  hall: HTMLCanvasElement;
  floor: HTMLCanvasElement;
  fog: HTMLCanvasElement;
  vignette: HTMLCanvasElement;
  grain: CanvasPattern | null;
}

const MOON: P = [700, 120];
const BRAZIERS = [62, 898];
const LANTERNS = [176, 784];
const BANNERS = [128, 832];

function layerCanvas(scale: number) {
  const l = makeCanvas(W + MARGIN * 2, H, scale);
  l.g.translate(MARGIN, 0);
  return l;
}

function buildSky(scale: number) {
  const { c, g } = layerCanvas(scale);
  const grad = g.createLinearGradient(0, 0, 0, 380);
  grad.addColorStop(0, "#07020c");
  grad.addColorStop(0.35, "#250820");
  grad.addColorStop(0.65, "#5e1224");
  grad.addColorStop(0.88, "#a8381e");
  grad.addColorStop(1, "#d8682a");
  g.fillStyle = grad;
  g.fillRect(-MARGIN, 0, W + MARGIN * 2, H);
  const r = rng(11);
  // Nebulosas
  for (let i = 0; i < 6; i++) {
    const x = r() * W;
    const y = 30 + r() * 160;
    const rad = 80 + r() * 140;
    const ng = g.createRadialGradient(x, y, 0, x, y, rad);
    ng.addColorStop(0, i % 2 ? "rgba(120,30,90,0.18)" : "rgba(160,40,40,0.14)");
    ng.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = ng;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // Estrellas
  for (let i = 0; i < 260; i++) {
    const x = -MARGIN + r() * (W + MARGIN * 2);
    const y = r() ** 1.6 * 260;
    const a = (1 - y / 260) * (0.3 + r() * 0.7);
    g.fillStyle = `rgba(255,${220 + Math.floor(r() * 35)},${200 + Math.floor(r() * 55)},${a})`;
    const s = r() < 0.08 ? 1.6 : 0.5 + r() * 0.8;
    g.fillRect(x, y, s, s);
  }
  // Luna de sangre
  const [mx, my] = MOON;
  const halo = g.createRadialGradient(mx, my, 40, mx, my, 320);
  halo.addColorStop(0, "rgba(255,150,100,0.45)");
  halo.addColorStop(0.3, "rgba(255,90,60,0.15)");
  halo.addColorStop(1, "rgba(255,60,40,0)");
  g.fillStyle = halo;
  g.fillRect(mx - 320, my - 320, 640, 640);
  const disc = g.createRadialGradient(mx - 20, my - 22, 4, mx, my, 62);
  disc.addColorStop(0, "#fff3e0");
  disc.addColorStop(0.55, "#f4c49a");
  disc.addColorStop(1, "#c86c52");
  g.fillStyle = disc;
  g.beginPath();
  g.arc(mx, my, 60, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.beginPath();
  g.arc(mx, my, 60, 0, Math.PI * 2);
  g.clip();
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * 50;
    const cx = mx + Math.cos(a) * d;
    const cy = my + Math.sin(a) * d;
    const cr = 3 + r() * 10;
    g.fillStyle = "rgba(150,70,60,0.22)";
    g.beginPath();
    g.arc(cx, cy, cr, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(255,235,210,0.25)";
    g.lineWidth = 1;
    g.beginPath();
    g.arc(cx + 0.8, cy + 0.8, cr, 0.2, 1.8);
    g.stroke();
  }
  const term = g.createRadialGradient(mx + 46, my + 40, 10, mx + 30, my + 26, 90);
  term.addColorStop(0, "rgba(60,8,20,0.55)");
  term.addColorStop(1, "rgba(60,8,20,0)");
  g.fillStyle = term;
  g.fillRect(mx - 60, my - 60, 120, 120);
  g.restore();
  return c;
}

function buildClouds() {
  const { c, g } = makeCanvas(W * 2, 240, 1);
  const r = rng(5);
  const puff = (x: number, y: number, rad: number, dark: string, light: string) => {
    for (const ox of [0, -W * 2, W * 2]) {
      const pg = g.createRadialGradient(x + ox, y - rad * 0.3, rad * 0.1, x + ox, y, rad);
      pg.addColorStop(0, light);
      pg.addColorStop(0.55, dark);
      pg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = pg;
      g.beginPath();
      g.arc(x + ox, y, rad, 0, Math.PI * 2);
      g.fill();
    }
  };
  for (let i = 0; i < 14; i++) {
    const cx = r() * W * 2;
    const cy = 40 + r() * 150;
    const n = 6 + Math.floor(r() * 8);
    for (let j = 0; j < n; j++) {
      puff(cx + (r() - 0.5) * 220, cy + (r() - 0.5) * 30, 22 + r() * 40, "rgba(40,10,30,0.45)", "rgba(150,60,70,0.35)");
    }
  }
  return c;
}

function ridge(g: CanvasRenderingContext2D, seed: number, baseY: number, amp: number, color: string, rim: string) {
  const r = rng(seed);
  const n = 128;
  const ys = new Array(n + 1).fill(0);
  // Desplazamiento de punto medio: cumbres naturales.
  ys[0] = r();
  ys[n] = r();
  for (let size = n; size > 1; size /= 2) {
    for (let i = size / 2; i < n; i += size) {
      ys[i] = (ys[i - size / 2] + ys[i + size / 2]) / 2 + (r() - 0.5) * (size / n) * 1.6;
    }
  }
  const x0 = -MARGIN;
  const span = W + MARGIN * 2;
  g.beginPath();
  g.moveTo(x0, H);
  for (let i = 0; i <= n; i++) g.lineTo(x0 + (i / n) * span, baseY - ys[i] * amp);
  g.lineTo(x0 + span, H);
  g.closePath();
  const grad = g.createLinearGradient(0, baseY - amp, 0, baseY + 80);
  grad.addColorStop(0, shade(color, 0.08));
  grad.addColorStop(1, shade(color, -0.4));
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = rim;
  g.lineWidth = 1.4;
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const x = x0 + (i / n) * span;
    const y = baseY - ys[i] * amp;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
}

function buildMountains(scale: number) {
  const { c, g } = layerCanvas(scale);
  ridge(g, 21, 330, 170, "#3c1229", "rgba(255,140,110,0.3)");
  const mist = g.createLinearGradient(0, 250, 0, 380);
  mist.addColorStop(0, "rgba(160,50,60,0)");
  mist.addColorStop(1, "rgba(170,60,60,0.5)");
  g.fillStyle = mist;
  g.fillRect(-MARGIN, 250, W + MARGIN * 2, 200);
  ridge(g, 33, 370, 110, "#220817", "rgba(255,120,100,0.22)");
  return c;
}

function pagoda(g: CanvasRenderingContext2D, cx: number, baseY: number, tiers: number, s: number, r: () => number) {
  let y = baseY;
  for (let i = 0; i < tiers; i++) {
    const w = (72 - i * 12) * s;
    const h = 24 * s;
    g.fillStyle = "#16060e";
    g.fillRect(cx - w / 2, y - h, w, h);
    // Ventanas iluminadas
    for (let k = -1; k <= 1; k++) {
      if (r() < 0.35) continue;
      const wx = cx + k * w * 0.28;
      const wy = y - h * 0.6;
      const glow = g.createRadialGradient(wx, wy, 0, wx, wy, 12 * s);
      glow.addColorStop(0, "rgba(255,170,70,0.6)");
      glow.addColorStop(1, "rgba(255,120,40,0)");
      g.fillStyle = glow;
      g.fillRect(wx - 12 * s, wy - 12 * s, 24 * s, 24 * s);
      g.fillStyle = "#ffb050";
      g.fillRect(wx - 2.5 * s, wy - 4 * s, 5 * s, 7 * s);
    }
    y -= h;
    // Techo con aleros curvos
    const ew = w / 2 + 16 * s;
    g.fillStyle = "#1c0710";
    g.beginPath();
    g.moveTo(cx - ew, y + 2 * s);
    g.quadraticCurveTo(cx - w / 2, y - 2 * s, cx - w / 2 + 8 * s, y - 12 * s);
    g.lineTo(cx + w / 2 - 8 * s, y - 12 * s);
    g.quadraticCurveTo(cx + w / 2, y - 2 * s, cx + ew, y + 2 * s);
    g.lineTo(cx + w / 2, y + 4 * s);
    g.lineTo(cx - w / 2, y + 4 * s);
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(255,130,90,0.25)";
    g.lineWidth = 1;
    g.stroke();
    y -= 12 * s;
  }
  g.strokeStyle = "#1c0710";
  g.lineWidth = 2.5 * s;
  g.beginPath();
  g.moveTo(cx, y);
  g.lineTo(cx, y - 26 * s);
  g.stroke();
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.ellipse(cx, y - 6 * s - i * 5 * s, 4 * s, 1.5 * s, 0, 0, Math.PI * 2);
    g.stroke();
  }
}

function buildTemple(scale: number) {
  const { c, g } = layerCanvas(scale);
  const r = rng(77);
  // Acantilados
  g.fillStyle = "#1a0710";
  g.beginPath();
  g.moveTo(-MARGIN, H);
  g.lineTo(-MARGIN, 250);
  g.lineTo(40, 236);
  g.lineTo(110, 252);
  g.lineTo(230, 248);
  g.lineTo(300, 290);
  g.lineTo(330, H);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(W + MARGIN, H);
  g.lineTo(W + MARGIN, 280);
  g.lineTo(900, 290);
  g.lineTo(820, 300);
  g.lineTo(740, 330);
  g.lineTo(700, H);
  g.closePath();
  g.fill();
  pagoda(g, 150, 250, 4, 1, r);
  pagoda(g, 860, 292, 3, 0.75, r);
  // Puente colgante con faroles
  g.strokeStyle = "#1a0710";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(290, 282);
  g.quadraticCurveTo(520, 340, 740, 318);
  g.stroke();
  for (let i = 1; i < 9; i++) {
    const t = i / 9;
    const x = lerp(290, 740, t);
    const y = (1 - t) ** 2 * 282 + 2 * (1 - t) * t * 340 + t * t * 318;
    const lg = g.createRadialGradient(x, y + 6, 0, x, y + 6, 10);
    lg.addColorStop(0, "rgba(255,150,60,0.8)");
    lg.addColorStop(1, "rgba(255,90,30,0)");
    g.fillStyle = lg;
    g.fillRect(x - 10, y - 4, 20, 20);
    g.fillStyle = "#ffb050";
    g.fillRect(x - 1.5, y + 3, 3, 5);
  }
  const mist = g.createLinearGradient(0, 280, 0, 400);
  mist.addColorStop(0, "rgba(150,50,60,0)");
  mist.addColorStop(1, "rgba(120,40,50,0.55)");
  g.fillStyle = mist;
  g.fillRect(-MARGIN, 280, W + MARGIN * 2, 160);
  return c;
}

function dragonGlyph(g: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.strokeStyle = color;
  g.lineWidth = 3;
  g.lineCap = "round";
  g.beginPath();
  g.arc(0, 0, 18, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 3.2;
  g.beginPath();
  g.moveTo(-9, -9);
  g.bezierCurveTo(10, -16, 14, -2, 2, 2);
  g.bezierCurveTo(-10, 6, -6, 16, 10, 10);
  g.stroke();
  g.fillStyle = color;
  g.beginPath();
  g.arc(-9, -9, 2.6, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function goldGradient(g: CanvasRenderingContext2D, y0: number, y1: number) {
  const grad = g.createLinearGradient(0, y0, 0, y1);
  grad.addColorStop(0, "#fff0b0");
  grad.addColorStop(0.35, "#d6a038");
  grad.addColorStop(0.65, "#7a4e12");
  grad.addColorStop(1, "#e2b24e");
  return grad;
}

function buildHall(scale: number) {
  const { c, g } = layerCanvas(scale);
  // Baranda de piedra al fondo
  const wall = g.createLinearGradient(0, 360, 0, 440);
  wall.addColorStop(0, "#3a2024");
  wall.addColorStop(1, "#140a0c");
  g.fillStyle = wall;
  g.fillRect(-MARGIN, 368, W + MARGIN * 2, 80);
  for (let x = -MARGIN + 30; x < W + MARGIN; x += 116) {
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.fillRect(x, 384, 86, 40);
    g.strokeStyle = "rgba(255,170,130,0.12)";
    g.lineWidth = 1;
    g.strokeRect(x + 0.5, 384.5, 86, 40);
    g.strokeStyle = "rgba(220,150,90,0.18)";
    g.beginPath();
    g.arc(x + 43, 404, 11, 0, Math.PI * 2);
    g.moveTo(x + 32, 404);
    g.lineTo(x + 54, 404);
    g.stroke();
  }
  const rail = g.createLinearGradient(0, 356, 0, 372);
  rail.addColorStop(0, "#6a4038");
  rail.addColorStop(1, "#2a1416");
  g.fillStyle = rail;
  g.fillRect(-MARGIN, 356, W + MARGIN * 2, 14);
  g.fillStyle = "rgba(255,190,150,0.25)";
  g.fillRect(-MARGIN, 356, W + MARGIN * 2, 1.5);

  // Faroles de piedra (tōrō)
  for (const x of LANTERNS) {
    g.fillStyle = "#24161a";
    g.fillRect(x - 8, 380, 16, 60);
    g.fillRect(x - 16, 432, 32, 10);
    const box = g.createLinearGradient(x - 14, 0, x + 14, 0);
    box.addColorStop(0, "#2a181c");
    box.addColorStop(0.5, "#4a2a2c");
    box.addColorStop(1, "#1a0e10");
    g.fillStyle = box;
    g.fillRect(x - 14, 344, 28, 36);
    g.fillStyle = "#ffcf7a";
    g.fillRect(x - 6, 352, 12, 18);
    g.fillStyle = "#2a1418";
    g.beginPath();
    g.moveTo(x - 24, 346);
    g.quadraticCurveTo(x, 324, x + 24, 346);
    g.closePath();
    g.fill();
  }

  // Columnas laqueadas
  for (const x of [-30, 252, 708, 990]) {
    const cw = 56;
    const col = g.createLinearGradient(x - cw / 2, 0, x + cw / 2, 0);
    col.addColorStop(0, "#1e0405");
    col.addColorStop(0.22, "#6a1214");
    col.addColorStop(0.4, "#c8442c");
    col.addColorStop(0.55, "#7a1616");
    col.addColorStop(1, "#160304");
    g.fillStyle = col;
    g.fillRect(x - cw / 2, 60, cw, 380);
    for (const y of [86, 400]) {
      g.fillStyle = goldGradient(g, y, y + 12);
      g.fillRect(x - cw / 2 - 2, y, cw + 4, 12);
    }
    // Dragón enroscado (relieve sutil)
    g.strokeStyle = "rgba(255,190,120,0.16)";
    g.lineWidth = 3;
    g.beginPath();
    for (let y = 120; y < 380; y += 2) {
      const xx = x + Math.sin(y * 0.045) * (cw * 0.36);
      if (y === 120) g.moveTo(xx, y);
      else g.lineTo(xx, y);
    }
    g.stroke();
    const base = g.createLinearGradient(0, 418, 0, 448);
    base.addColorStop(0, "#5a4a46");
    base.addColorStop(1, "#1e1616");
    g.fillStyle = base;
    g.beginPath();
    g.moveTo(x - cw / 2 - 6, 418);
    g.lineTo(x + cw / 2 + 6, 418);
    g.lineTo(x + cw / 2 + 12, 448);
    g.lineTo(x - cw / 2 - 12, 448);
    g.closePath();
    g.fill();
    // Ménsulas
    g.fillStyle = "#2a0e0e";
    g.fillRect(x - cw / 2 - 14, 60, cw + 28, 14);
    g.fillRect(x - cw / 2 - 26, 50, cw + 52, 10);
  }

  // Viga principal y tejas
  const beam = g.createLinearGradient(0, 0, 0, 62);
  beam.addColorStop(0, "#14060a");
  beam.addColorStop(1, "#3a1412");
  g.fillStyle = beam;
  g.fillRect(-MARGIN, 0, W + MARGIN * 2, 62);
  g.fillStyle = goldGradient(g, 56, 62);
  g.fillRect(-MARGIN, 56, W + MARGIN * 2, 5);
  g.fillStyle = "#0b0306";
  for (let x = -MARGIN; x < W + MARGIN; x += 22) {
    g.beginPath();
    g.arc(x, 10, 9, 0, Math.PI * 2);
    g.fill();
  }
  // Greca dorada
  g.strokeStyle = "rgba(214,160,56,0.35)";
  g.lineWidth = 1.5;
  g.beginPath();
  for (let x = -MARGIN; x < W + MARGIN; x += 24) {
    g.moveTo(x, 44);
    g.lineTo(x, 30);
    g.lineTo(x + 16, 30);
    g.lineTo(x + 16, 40);
    g.lineTo(x + 8, 40);
  }
  g.stroke();
  // Medallón central
  g.fillStyle = "#1a0608";
  g.beginPath();
  g.arc(W / 2, 34, 30, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = goldGradient(g, 4, 64);
  g.stroke();
  dragonGlyph(g, W / 2, 34, 1, "#d6a038");
  return c;
}

function buildFloor(scale: number) {
  const { c, g } = layerCanvas(scale);
  const top = 432;
  const vp: P = [W / 2, 170];
  const grad = g.createLinearGradient(0, top, 0, H);
  grad.addColorStop(0, "#3a2420");
  grad.addColorStop(1, "#0e0807");
  g.fillStyle = grad;
  g.fillRect(-MARGIN, top, W + MARGIN * 2, H - top);

  const rows = [top, 438, 447, 459, 475, 497, 526, 566];
  const xAt = (x0: number, y: number) => vp[0] + (x0 - vp[0]) * ((y - vp[1]) / (top - vp[1]));
  const r = rng(3);
  for (let ri = 0; ri < rows.length - 1; ri++) {
    for (let ci = -14; ci < 14; ci++) {
      const x0 = W / 2 + ci * 46;
      const x1 = x0 + 46;
      const y0 = rows[ri];
      const y1 = rows[ri + 1];
      const v = r();
      g.fillStyle = `rgba(${v < 0.5 ? "255,200,170" : "0,0,0"},${0.02 + r() * 0.06})`;
      g.beginPath();
      g.moveTo(xAt(x0, y0), y0);
      g.lineTo(xAt(x1, y0), y0);
      g.lineTo(xAt(x1, y1), y1);
      g.lineTo(xAt(x0, y1), y1);
      g.closePath();
      g.fill();
    }
  }
  g.strokeStyle = "rgba(0,0,0,0.5)";
  g.lineWidth = 1.2;
  g.beginPath();
  for (const y of rows) {
    g.moveTo(-MARGIN, y);
    g.lineTo(W + MARGIN, y);
  }
  for (let ci = -14; ci <= 14; ci++) {
    const x0 = W / 2 + ci * 46;
    g.moveTo(xAt(x0, top), top);
    g.lineTo(xAt(x0, H + 40), H + 40);
  }
  g.stroke();
  // Grietas
  g.strokeStyle = "rgba(0,0,0,0.45)";
  g.lineWidth = 1;
  for (let i = 0; i < 9; i++) {
    let x = -MARGIN + r() * (W + MARGIN * 2);
    let y = top + 10 + r() * 90;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (r() - 0.5) * 30;
      y += r() * 8;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // Brillo del piso pulido: reflejo de la luna
  const sheen = g.createRadialGradient(MOON[0], top + 20, 5, MOON[0], top + 30, 220);
  sheen.addColorStop(0, "rgba(255,170,130,0.22)");
  sheen.addColorStop(1, "rgba(255,120,90,0)");
  g.fillStyle = sheen;
  g.fillRect(-MARGIN, top, W + MARGIN * 2, H - top);
  g.fillStyle = "rgba(255,190,150,0.18)";
  g.fillRect(-MARGIN, top, W + MARGIN * 2, 1.5);
  return c;
}

function buildFog() {
  const { c, g } = makeCanvas(W * 2, 120, 1);
  const r = rng(9);
  for (let i = 0; i < 70; i++) {
    const x = r() * W * 2;
    const y = 30 + r() * 60;
    const rad = 30 + r() * 60;
    for (const ox of [0, -W * 2, W * 2]) {
      const fg = g.createRadialGradient(x + ox, y, 0, x + ox, y, rad);
      fg.addColorStop(0, "rgba(220,150,150,0.16)");
      fg.addColorStop(1, "rgba(220,150,150,0)");
      g.fillStyle = fg;
      g.fillRect(x + ox - rad, y - rad, rad * 2, rad * 2);
    }
  }
  return c;
}

function buildVignette(scale: number) {
  const { c, g } = makeCanvas(W, H, scale);
  const v = g.createRadialGradient(W / 2, H * 0.48, H * 0.35, W / 2, H * 0.5, H * 1.05);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.75)");
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  const top = g.createLinearGradient(0, 0, 0, 120);
  top.addColorStop(0, "rgba(0,0,0,0.55)");
  top.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = top;
  g.fillRect(0, 0, W, 120);
  return c;
}

function buildLayers(scale: number, main: CanvasRenderingContext2D): Layers {
  const noise = makeCanvas(160, 160, 1);
  const img = noise.g.createImageData(160, 160);
  const r = rng(99);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(r() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  noise.g.putImageData(img, 0, 0);
  return {
    sky: buildSky(scale),
    clouds: buildClouds(),
    mountains: buildMountains(scale),
    temple: buildTemple(scale),
    hall: buildHall(scale),
    floor: buildFloor(scale),
    fog: buildFog(),
    vignette: buildVignette(scale),
    grain: main.createPattern(noise.c, "repeat"),
  };
}

// ───────────────────────── renderer ─────────────────────────

interface ChainNode {
  x: number;
  y: number;
  px: number;
  py: number;
}

interface FighterFx {
  chain: ChainNode[];
  sway: number;
  swayVel: number;
  trail: P[];
  pose: Pose;
  eye: P;
}

interface Ring {
  x: number;
  y: number;
  r: number;
  max: number;
  life: number;
  maxLife: number;
  color: string;
  width: number;
  star: boolean;
}

interface Ambient {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  kind: "ember" | "ash";
}

interface Glow {
  x: number;
  y: number;
  r: number;
  color: string;
  a: number;
  f: number;
}

interface Sprite {
  c: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  sil: HTMLCanvasElement;
  silG: CanvasRenderingContext2D;
}

const SPRITE_W = 320;
const SPRITE_H = 300;
const SPRITE_OX = 160;
const SPRITE_OY = 280;

export class FightRenderer {
  quality: "high" | "low" = "high";
  private readonly scale: number;
  private readonly spriteScale: number;
  private layers: Layers | null = null;
  private cam = { x: W / 2, zoom: 1.08 };
  private shake: P = [0, 0];
  private sprites: Sprite[];
  private glowA: { c: HTMLCanvasElement; g: CanvasRenderingContext2D };
  private glowB: { c: HTMLCanvasElement; g: CanvasRenderingContext2D };
  private glows: Glow[] = [];
  private fx: FighterFx[] = [];
  private rings: Ring[] = [];
  private ambient: Ambient[] = [];
  private bolts: { pts: P[]; life: number }[] = [];
  private flash = 0;
  private flashColor = "#ffffff";
  private combo = [
    { count: 0, last: -999, pop: 0 },
    { count: 0, last: -999, pop: 0 },
  ];
  private drips: { x: number; len: number; max: number; speed: number; w: number }[] = [];
  private bannerKey = "";
  private bannerAge = 0;
  private time = 0;
  private last = 0;
  private lastTick = -1;
  private frameAvg = 16.7;
  private slowCount = 0;

  constructor(private readonly g: CanvasRenderingContext2D, dpr: number) {
    this.scale = Math.min(2, Math.max(1, dpr));
    this.spriteScale = Math.min(2.6, this.scale * 1.3);
    this.sprites = [0, 1].map(() => {
      const a = makeCanvas(SPRITE_W, SPRITE_H, this.spriteScale);
      const b = makeCanvas(SPRITE_W, SPRITE_H, this.spriteScale);
      return { c: a.c, g: a.g, sil: b.c, silG: b.g };
    });
    this.glowA = makeCanvas(W / 4, H / 4, 1);
    this.glowB = makeCanvas(W / 8, H / 8, 1);
    this.reset();
  }

  private reset() {
    this.fx = [0, 1].map(() => ({ chain: [], sway: 0, swayVel: 0, trail: [], pose: STAND, eye: [0, 0] as P }));
    this.rings = [];
    this.bolts = [];
    this.drips = [];
    this.flash = 0;
    this.combo.forEach((c) => {
      c.count = 0;
      c.last = -999;
    });
  }

  /** Efectos que dependen de lo que pasó en cada paso de la simulación. */
  onEvents(events: GameEvent[], state: GameState) {
    for (const e of events) {
      switch (e.type) {
        case "hit": {
          this.rings.push({ x: e.x, y: e.y, r: 6, max: e.heavy ? 80 : 50, life: 16, maxLife: 16, color: "#fff2c0", width: e.heavy ? 6 : 3.5, star: false });
          this.rings.push({ x: e.x, y: e.y, r: 4, max: e.heavy ? 46 : 30, life: 9, maxLife: 9, color: "#ffffff", width: 2, star: true });
          if (e.heavy) this.addFlash(0.16, "#fff4e0");
          const c = this.combo[e.side];
          c.count = state.tick - c.last < 75 ? c.count + 1 : 1;
          c.last = state.tick;
          c.pop = 1;
          break;
        }
        case "block":
          this.rings.push({ x: e.x, y: e.y, r: 5, max: 34, life: 12, maxLife: 12, color: "#a8dcff", width: 3, star: false });
          break;
        case "ko":
          this.addFlash(0.55, "#ffffff");
          break;
        case "fight":
          this.addFlash(0.15, "#ffd0a0");
          break;
        case "finish":
          this.lightning();
          break;
        case "fatalityStart":
          this.addFlash(0.25, e.element === "fuego" ? "#ff8a2a" : "#bfeaff");
          break;
        case "explode":
          this.addFlash(0.9, "#ffffff");
          this.lightning();
          break;
        case "fatality":
          this.addFlash(0.45, "#c8141e");
          this.lightning();
          break;
      }
    }
  }

  private addFlash(a: number, color: string) {
    if (a >= this.flash) {
      this.flash = a;
      this.flashColor = color;
    }
  }

  private lightning() {
    const x0 = 120 + Math.random() * 720;
    const pts: P[] = [[x0, -20]];
    let x = x0;
    for (let y = -20; y < 300; y += 14 + Math.random() * 16) {
      x += (Math.random() - 0.5) * 46;
      pts.push([x, y]);
    }
    this.bolts.push({ pts, life: 22 });
    this.addFlash(0.45, "#cfd8ff");
  }

  render(state: GameState) {
    const now = typeof performance !== "undefined" ? performance.now() : 0;
    const dtMs = this.last ? Math.min(100, now - this.last) : 16.7;
    this.last = now;
    const dt = dtMs / (1000 / 60);
    this.trackPerformance(dtMs);
    if (state.tick < this.lastTick) this.reset();
    this.lastTick = state.tick;
    this.time += dt;
    this.layers ??= buildLayers(this.scale, this.g);
    const L = this.layers;
    const g = this.g;
    const high = this.quality === "high";
    this.glows = [];

    this.updateCamera(state, dt);
    this.updateFighters(state, dt);
    this.updateEffects(dt);

    // ── Fondo con parallax ──
    g.save();
    this.view(g, 0.04);
    g.drawImage(L.sky, -MARGIN, 0, W + MARGIN * 2, H);
    g.restore();

    g.save();
    this.view(g, 0.08);
    if (high) {
      const cloudX = -((this.time * 0.18) % (W * 2));
      g.globalAlpha = 0.85;
      g.drawImage(L.clouds, cloudX - MARGIN, 30);
      g.drawImage(L.clouds, cloudX + W * 2 - MARGIN, 30);
      g.globalAlpha = 1;
    }
    this.drawBolts(g);
    g.restore();

    g.save();
    this.view(g, 0.15);
    g.drawImage(L.mountains, -MARGIN, 0, W + MARGIN * 2, H);
    g.restore();

    g.save();
    this.view(g, 0.3);
    g.drawImage(L.temple, -MARGIN, 0, W + MARGIN * 2, H);
    g.restore();

    g.save();
    this.view(g, 0.7);
    g.drawImage(L.hall, -MARGIN, 0, W + MARGIN * 2, H);
    this.drawBanners(g);
    for (const x of LANTERNS) this.glows.push({ x, y: 361, r: 30, color: "#ffb050", a: 0.8, f: 0.7 });
    g.restore();

    g.save();
    this.view(g, 0.9);
    this.drawBraziers(g);
    g.restore();

    // ── Mundo ──
    g.save();
    this.view(g, 1);
    g.drawImage(L.floor, -MARGIN, 0, W + MARGIN * 2, H);
    this.drawFloorLights(g, state);
    for (const p of state.particles) if (p.grounded) drawParticle(g, p);

    const order = [...state.fighters].sort((a, b) => Number(a.action === "attack") - Number(b.action === "attack"));
    for (const f of state.fighters) this.paintSprite(state, f);
    if (high) {
      for (const f of state.fighters) this.drawCastShadows(g, f);
      for (const f of state.fighters) this.drawReflection(g, f);
    }
    for (const f of state.fighters) if (!this.hidden(state, f)) this.drawContactShadow(g, f);

    if (high) {
      g.globalAlpha = 0.55;
      const fogX = -((this.time * 0.35) % (W * 2));
      g.drawImage(L.fog, fogX - MARGIN, 380);
      g.drawImage(L.fog, fogX + W * 2 - MARGIN, 380);
      g.globalAlpha = 1;
    }

    for (const f of order) this.drawFighter(g, state, f);
    this.drawTrails(g, state);
    for (const p of state.projectiles) this.drawProjectile(g, p);
    for (const p of state.particles) if (!p.grounded) this.drawAirParticle(g, p);
    this.drawRings(g);
    this.drawAmbient(g);

    if (high) {
      g.globalAlpha = 0.35;
      const fogX2 = -((this.time * 0.6 + 400) % (W * 2));
      g.drawImage(L.fog, fogX2 - MARGIN, 440);
      g.drawImage(L.fog, fogX2 + W * 2 - MARGIN, 440);
      g.globalAlpha = 1;
    }
    g.restore();

    // ── Post-proceso ──
    if (high) this.drawBloom(g);
    g.drawImage(L.vignette, 0, 0, W, H);
    if (high && L.grain) {
      g.save();
      g.globalAlpha = 0.045;
      g.globalCompositeOperation = "overlay";
      g.translate(Math.floor(Math.random() * 160), Math.floor(Math.random() * 160));
      g.fillStyle = L.grain;
      g.fillRect(-160, -160, W + 160, H + 160);
      g.restore();
    }
    if (this.flash > 0.01) {
      g.save();
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = Math.min(1, this.flash);
      g.fillStyle = this.flashColor;
      g.fillRect(0, 0, W, H);
      g.restore();
    }

    this.drawHud(g, state);
    this.drawCombo(g, state);
    this.drawBanner(g, state, dt);
  }

  private trackPerformance(dtMs: number) {
    if (this.quality === "low") return;
    this.frameAvg = this.frameAvg * 0.95 + dtMs * 0.05;
    // Si el equipo no llega a ~40 fps durante varios segundos, se apagan los efectos caros.
    this.slowCount = this.frameAvg > 25 ? this.slowCount + 1 : 0;
    if (this.slowCount > 180) this.quality = "low";
  }

  // ── cámara ──

  private camY(zoom: number) {
    return FLOOR - 200 / zoom;
  }

  private view(g: CanvasRenderingContext2D, f: number) {
    const z = 1 + (this.cam.zoom - 1) * f;
    const cx = W / 2 + (this.cam.x - W / 2) * f;
    const cy = H / 2 + (this.camY(this.cam.zoom) - H / 2) * f;
    g.translate(W / 2 + this.shake[0] * f, H / 2 + this.shake[1] * f);
    g.scale(z, z);
    g.translate(-cx, -cy);
  }

  private project(x: number, y: number, f: number): [number, number, number] {
    const z = 1 + (this.cam.zoom - 1) * f;
    const cx = W / 2 + (this.cam.x - W / 2) * f;
    const cy = H / 2 + (this.camY(this.cam.zoom) - H / 2) * f;
    return [W / 2 + this.shake[0] * f + (x - cx) * z, H / 2 + this.shake[1] * f + (y - cy) * z, z];
  }

  private unproject(sx: number, sy: number): P {
    const z = this.cam.zoom;
    return [(sx - W / 2 - this.shake[0]) / z + this.cam.x, (sy - H / 2 - this.shake[1]) / z + this.camY(z)];
  }

  private updateCamera(state: GameState, dt: number) {
    const [a, b] = state.fighters;
    let tx = (a.x + b.x) / 2;
    const dist = Math.abs(a.x - b.x);
    let tz = 1.14 - clamp01((dist - 140) / 460) * 0.14;
    const winner = state.winner !== null ? state.fighters[state.winner] : null;
    const loser = state.winner !== null ? state.fighters[1 - state.winner] : null;
    switch (state.phase) {
      case "intro":
        tz = 1.04;
        break;
      case "finish":
        tz = 1.22;
        break;
      case "fatality":
        if (loser) tx = lerp(tx, loser.x, 0.65);
        tz = 1.4;
        break;
      case "roundOver":
        if (loser && state.phaseFrame < 110) {
          tx = lerp(tx, loser.x, 0.5);
          tz = 1.26;
        }
        break;
      case "matchOver":
        if (winner) tx = lerp(tx, winner.x, 0.4);
        tz = 1.16;
        break;
    }
    const k = 1 - Math.pow(1 - 0.06, dt);
    this.cam.zoom += (tz - this.cam.zoom) * k;
    this.cam.x += (tx - this.cam.x) * k;
    const half = W / (2 * this.cam.zoom);
    this.cam.x = Math.min(W - half, Math.max(half, this.cam.x));
    const s = state.shake;
    this.shake = s > 0 ? [Math.sin(this.time * 2.3) * s * 0.7, Math.cos(this.time * 3.1) * s * 0.45] : [0, 0];
  }

  // ── luchadores ──

  private localJoint(f: Fighter, p: P): P {
    return [f.x + p[0] * f.facing, FLOOR - f.y - p[1]];
  }

  private updateFighters(state: GameState, dt: number) {
    const steps = Math.min(3, Math.max(1, Math.round(dt)));
    state.fighters.forEach((f, i) => {
      const fx = this.fx[i];
      fx.pose = poseFor(f, state.tick);
      const dir = f.facing;
      const anchor = this.localJoint(f, [fx.pose.head[0] - 13, fx.pose.head[1] - 1]);

      // Tela de la capucha: cadena de verlet.
      if (!fx.chain.length || Math.hypot(fx.chain[0].x - anchor[0], fx.chain[0].y - anchor[1]) > 160) {
        fx.chain = Array.from({ length: 8 }, (_, k) => {
          const x = anchor[0] - dir * k * 7;
          const y = anchor[1] + k * 3;
          return { x, y, px: x, py: y };
        });
      }
      for (let s = 0; s < steps; s++) {
        const c = fx.chain;
        c[0].x = anchor[0];
        c[0].y = anchor[1];
        for (let k = 1; k < c.length; k++) {
          const n = c[k];
          const vx = (n.x - n.px) * 0.93;
          const vy = (n.y - n.py) * 0.93;
          n.px = n.x;
          n.py = n.y;
          n.x += vx - dir * 0.12 + Math.sin(this.time * 0.05 + k * 0.7) * 0.14;
          n.y += vy + 0.3;
        }
        for (let it = 0; it < 3; it++) {
          for (let k = 1; k < c.length; k++) {
            const a = c[k - 1];
            const b = c[k];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d = Math.hypot(dx, dy) || 1;
            const diff = (d - 7.5) / d;
            if (k === 1) {
              b.x -= dx * diff;
              b.y -= dy * diff;
            } else {
              a.x += dx * diff * 0.5;
              a.y += dy * diff * 0.5;
              b.x -= dx * diff * 0.5;
              b.y -= dy * diff * 0.5;
            }
          }
          c[0].x = anchor[0];
          c[0].y = anchor[1];
        }
      }

      // Balanceo del faldón con resorte.
      const target = Math.max(-0.7, Math.min(0.7, -f.vx * 0.06 * dir + (f.y > 0 ? -f.vy * 0.02 : 0)));
      fx.swayVel += (target - fx.sway) * 0.12 * dt;
      fx.swayVel *= Math.pow(0.82, dt);
      fx.sway += fx.swayVel * dt;

      // Estela del golpe
      const striking =
        f.action === "attack" && f.attack !== null && f.attack !== "special" && f.frame <= ATTACKS[f.attack].startup + ATTACKS[f.attack].active + 2;
      if (striking) {
        const limbEnd = f.attack === "punch" || f.attack === "uppercut" ? fx.pose.fHand : fx.pose.fFoot;
        fx.trail.push(this.localJoint(f, limbEnd));
        if (fx.trail.length > 8) fx.trail.shift();
      } else if (fx.trail.length) {
        fx.trail.splice(0, Math.max(1, Math.round(dt * 2)));
      }
    });
  }

  private hidden(state: GameState, f: Fighter) {
    return (
      state.fatality &&
      state.winner !== null &&
      state.winner !== f.side &&
      (state.phase !== "fatality" || state.phaseFrame >= FATALITY_EXPLODE_FRAME)
    );
  }

  private paintSprite(state: GameState, f: Fighter) {
    const sp = this.sprites[f.side];
    const fx = this.fx[f.side];
    const g = sp.g;
    g.setTransform(this.spriteScale, 0, 0, this.spriteScale, 0, 0);
    g.clearRect(0, 0, SPRITE_W, SPRITE_H);
    sp.silG.setTransform(this.spriteScale, 0, 0, this.spriteScale, 0, 0);
    sp.silG.clearRect(0, 0, SPRITE_W, SPRITE_H);
    if (this.hidden(state, f)) return;

    const look = lookFor(state, f);
    const ox = f.x;
    const oy = FLOOR - f.y;
    g.save();
    g.translate(SPRITE_OX, SPRITE_OY);
    g.lineCap = "round";
    g.lineJoin = "round";
    const chain: P[] = fx.chain.map((n) => [n.x - ox, n.y - oy]);
    const eye = drawBody(g, fx.pose, { look, dir: f.facing, sway: fx.sway, chain });
    fx.eye = [ox + eye[0], oy + eye[1]];
    g.restore();

    // Iluminación sobre la silueta (solo donde hay cuerpo).
    g.save();
    g.globalCompositeOperation = "source-atop";
    // Luz de luna desde atrás (borde)
    const back = f.facing === 1 ? 0 : SPRITE_W;
    const rim = g.createLinearGradient(back, 0, SPRITE_W / 2, 0);
    rim.addColorStop(0, "rgba(255,170,140,0.32)");
    rim.addColorStop(0.42, "rgba(255,170,140,0)");
    g.fillStyle = rim;
    g.fillRect(0, 0, SPRITE_W, SPRITE_H);
    // Braseros: luz cálida de costado
    for (const bx of BRAZIERS) {
      const d = Math.abs(bx - f.x);
      const a = Math.max(0, 0.32 - d / 1500) * (0.85 + Math.sin(this.time * 0.4 + bx) * 0.15);
      const sx = bx < f.x ? 0 : SPRITE_W;
      const lg = g.createLinearGradient(sx, 0, SPRITE_W / 2, 0);
      lg.addColorStop(0, `rgba(255,140,50,${a})`);
      lg.addColorStop(1, "rgba(255,140,50,0)");
      g.fillStyle = lg;
      g.fillRect(0, 0, SPRITE_W, SPRITE_H);
    }
    // Proyectiles cercanos tiñen al luchador
    for (const p of state.projectiles) {
      const lx = p.x - ox + SPRITE_OX;
      const ly = FLOOR - p.y - oy + SPRITE_OY;
      const color = p.element === "fuego" ? "255,140,40" : "120,210,255";
      const pg = g.createRadialGradient(lx, ly, 10, lx, ly, 170);
      pg.addColorStop(0, `rgba(${color},0.55)`);
      pg.addColorStop(1, `rgba(${color},0)`);
      g.fillStyle = pg;
      g.fillRect(0, 0, SPRITE_W, SPRITE_H);
    }
    // Estados
    const fatalityVictim = state.fatality && state.winner !== null && state.winner !== f.side;
    const winnerElement = state.winner !== null ? characterOf(state.fighters[state.winner]).element : "fuego";
    if (fatalityVictim && state.phase === "fatality") {
      const t = Math.min(1, state.phaseFrame / 60);
      g.fillStyle = winnerElement === "fuego" ? `rgba(20,10,6,${t * 0.85})` : `rgba(170,225,255,${t * 0.55})`;
      g.fillRect(0, 0, SPRITE_W, SPRITE_H);
    }
    if (f.action === "frozen") {
      g.fillStyle = "rgba(160,220,255,0.5)";
      g.fillRect(0, 0, SPRITE_W, SPRITE_H);
    }
    if (f.flash > 0 && f.flash % 2 === 0) {
      g.fillStyle = "rgba(255,255,255,0.75)";
      g.fillRect(0, 0, SPRITE_W, SPRITE_H);
    }
    g.restore();

    // Silueta (contorno, sombras proyectadas)
    const s = sp.silG;
    s.save();
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.drawImage(sp.c, 0, 0);
    s.globalCompositeOperation = "source-in";
    s.fillStyle = "#050204";
    s.fillRect(0, 0, sp.sil.width, sp.sil.height);
    s.restore();

    if (!fatalityVictim && f.action !== "defeated" && f.action !== "knockdown") {
      this.glows.push({ x: fx.eye[0], y: fx.eye[1], r: 9, color: look.glow, a: 0.9, f: 1 });
    }
    // Brillo en la mano al cargar el especial
    if (f.action === "attack" && f.attack === "special" && state.phase !== "fatality" && f.frame <= ATTACKS.special.startup + 3) {
      const hand = this.localJoint(f, fx.pose.fHand);
      const t = Math.min(1, f.frame / ATTACKS.special.startup);
      const el = characterOf(f).element;
      this.glows.push({ x: hand[0], y: hand[1], r: 26 + t * 26, color: el === "fuego" ? "#ff8a2a" : "#8fe0ff", a: 1, f: 1 });
    }
  }

  private spriteRect(f: Fighter): [number, number] {
    return [f.x - SPRITE_OX, FLOOR - f.y - SPRITE_OY];
  }

  private drawContactShadow(g: CanvasRenderingContext2D, f: Fighter) {
    const k = Math.max(0.35, 1 - f.y / 260);
    const lying = (f.action === "knockdown" && f.y <= 0) || f.action === "defeated" ? 1.6 : 1;
    g.save();
    g.globalAlpha = 0.6 * k;
    g.drawImage(soft("#000000"), f.x - 46 * k * lying, FLOOR - 9 * k, 92 * k * lying, 18 * k);
    g.restore();
  }

  private drawCastShadows(g: CanvasRenderingContext2D, f: Fighter) {
    const sp = this.sprites[f.side];
    for (const bx of BRAZIERS) {
      const d = f.x - bx;
      const strength = Math.max(0, 0.38 - Math.abs(d) / 2600) * Math.max(0.2, 1 - f.y / 200);
      if (strength <= 0.02) continue;
      const k = Math.sign(d) * Math.min(1.2, 120 / Math.max(60, Math.abs(d)) + 0.25);
      g.save();
      g.globalAlpha = strength;
      // Aplasta la silueta sobre el piso, inclinada en dirección opuesta al brasero.
      g.transform(1, 0, -k, 0.16, f.x, FLOOR);
      g.drawImage(sp.sil, -SPRITE_OX, -SPRITE_OY, SPRITE_W, SPRITE_H);
      g.restore();
    }
  }

  private drawReflection(g: CanvasRenderingContext2D, f: Fighter) {
    const sp = this.sprites[f.side];
    const [sx, sy] = this.spriteRect(f);
    g.save();
    g.beginPath();
    g.rect(-MARGIN, FLOOR, W + MARGIN * 2, H);
    g.clip();
    g.globalAlpha = 0.22 * Math.max(0.2, 1 - f.y / 220);
    g.translate(0, FLOOR * 2);
    g.scale(1, -1);
    g.drawImage(sp.c, sx, sy, SPRITE_W, SPRITE_H);
    g.restore();
  }

  private drawFighter(g: CanvasRenderingContext2D, state: GameState, f: Fighter) {
    const sp = this.sprites[f.side];
    const [sx, sy] = this.spriteRect(f);
    const winnerElement = state.winner !== null ? characterOf(state.fighters[state.winner]).element : "fuego";
    if (this.hidden(state, f)) {
      if (winnerElement === "fuego") drawBones(g, f.x);
      return;
    }
    // Contorno oscuro: la silueta corrida un poco en cuatro direcciones.
    const o = 1.3;
    for (const [dx, dy] of [[o, 0], [-o, 0], [0, o], [0, -o]]) g.drawImage(sp.sil, sx + dx, sy + dy, SPRITE_W, SPRITE_H);
    g.drawImage(sp.c, sx, sy, SPRITE_W, SPRITE_H);

    const victim = state.fatality && state.winner !== null && state.winner !== f.side && state.phase === "fatality";
    if (f.action === "frozen" || (victim && winnerElement === "hielo")) {
      const t = victim ? Math.min(1, state.phaseFrame / 25) : 1;
      drawIceBlock(g, f.x, FLOOR - f.y, t, victim && state.phaseFrame > 50, this.time);
      this.glows.push({ x: f.x, y: FLOOR - f.y - 100, r: 90, color: "#7fdcff", a: 0.35, f: 1 });
    }
    if (f.action === "dizzy") {
      const head = this.localJoint(f, this.fx[f.side].pose.head);
      for (let i = 0; i < 3; i++) {
        const a = this.time * 0.09 + (i * Math.PI * 2) / 3;
        const x = head[0] + Math.cos(a) * 26;
        const y = head[1] - 24 + Math.sin(a) * 6;
        drawStar(g, x, y, 5, "#ffe066");
        this.glows.push({ x, y, r: 10, color: "#ffe066", a: 0.7, f: 1 });
      }
    }
  }

  private drawTrails(g: CanvasRenderingContext2D, state: GameState) {
    g.save();
    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";
    this.fx.forEach((fx, i) => {
      const t = fx.trail;
      if (t.length < 2) return;
      const color = lookFor(state, state.fighters[i]).glow;
      for (let k = 1; k < t.length; k++) {
        const a = k / t.length;
        g.strokeStyle = rgba(color, a * 0.45);
        g.lineWidth = 2 + a * 12;
        g.beginPath();
        g.moveTo(t[k - 1][0], t[k - 1][1]);
        g.lineTo(t[k][0], t[k][1]);
        g.stroke();
      }
      g.strokeStyle = "rgba(255,255,255,0.5)";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(t[0][0], t[0][1]);
      for (const p of t) g.lineTo(p[0], p[1]);
      g.stroke();
    });
    g.restore();
  }

  // ── escenario dinámico ──

  private drawBanners(g: CanvasRenderingContext2D) {
    for (const bx of BANNERS) {
      const top = 74;
      const len = 170;
      const w = 54;
      const sway = (y: number) => Math.sin(this.time * 0.035 + bx * 0.01 + y * 0.02) * 7 * (y / len) ** 1.4;
      const left: P[] = [];
      const right: P[] = [];
      for (let y = 0; y <= len; y += 10) {
        const s = sway(y);
        left.push([bx - w / 2 + s, top + y]);
        right.push([bx + w / 2 + s, top + y]);
      }
      const tip: P = [bx + sway(len + 22), top + len + 22];
      g.beginPath();
      g.moveTo(left[0][0], left[0][1]);
      for (const p of left) g.lineTo(p[0], p[1]);
      g.lineTo(tip[0], tip[1]);
      for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
      g.closePath();
      const grad = g.createLinearGradient(bx - w / 2, 0, bx + w / 2, 0);
      grad.addColorStop(0, "#3a0508");
      grad.addColorStop(0.45, "#9a1418");
      grad.addColorStop(1, "#2a0306");
      g.fillStyle = grad;
      g.fill();
      g.strokeStyle = "#c99034";
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = goldGradient(g, top - 6, top + 4);
      g.fillRect(bx - w / 2 - 6, top - 6, w + 12, 8);
      dragonGlyph(g, bx + sway(70), top + 70, 0.9, "#d6a038");
      g.fillStyle = "#d6a038";
      g.beginPath();
      g.arc(tip[0], tip[1] + 6, 3.5, 0, Math.PI * 2);
      g.fill();
    }
  }

  private drawBraziers(g: CanvasRenderingContext2D) {
    for (const bx of BRAZIERS) {
      const by = 436;
      const flick = 0.85 + Math.sin(this.time * 0.37 + bx) * 0.08 + Math.sin(this.time * 1.13) * 0.05;
      g.save();
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = 0.24 * flick;
      drawSoft(g, "#ff6a1a", bx, by - 70, 170);
      g.restore();
      // Trípode y cuenco de bronce
      g.strokeStyle = "#2a1a12";
      g.lineWidth = 5;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(bx - 18, by + 10);
      g.lineTo(bx - 4, by - 36);
      g.moveTo(bx + 18, by + 10);
      g.lineTo(bx + 4, by - 36);
      g.moveTo(bx, by + 12);
      g.lineTo(bx, by - 36);
      g.stroke();
      const bowl = g.createLinearGradient(0, by - 60, 0, by - 34);
      bowl.addColorStop(0, "#d09048");
      bowl.addColorStop(0.4, "#7a4a1c");
      bowl.addColorStop(1, "#2a1608");
      g.fillStyle = bowl;
      g.beginPath();
      g.moveTo(bx - 36, by - 60);
      g.quadraticCurveTo(bx, by - 18, bx + 36, by - 60);
      g.closePath();
      g.fill();
      g.fillStyle = "#ff9a3a";
      g.beginPath();
      g.ellipse(bx, by - 60, 34, 5, 0, 0, Math.PI * 2);
      g.fill();
      // Llamas en capas, de las rojas de afuera al núcleo claro.
      g.save();
      const tongues = [
        { ox: -14, h: 62, w: 16, c: "#b8260f", a: 0.9 },
        { ox: 12, h: 70, w: 18, c: "#b8260f", a: 0.9 },
        { ox: -2, h: 96, w: 24, c: "#f05a12", a: 0.9 },
        { ox: 6, h: 72, w: 16, c: "#ff9a2a", a: 0.85 },
        { ox: -6, h: 50, w: 13, c: "#ffc45a", a: 0.85 },
      ];
      tongues.forEach((t, i) => {
        const n = Math.sin(this.time * (0.21 + i * 0.05) + i * 2 + bx) * 0.5 + Math.sin(this.time * (0.53 + i * 0.07) + i) * 0.5;
        const h = t.h * (0.85 + n * 0.18);
        const tipX = bx + t.ox + Math.sin(this.time * 0.17 + i + bx) * 8;
        g.fillStyle = rgba(t.c, t.a);
        g.beginPath();
        g.moveTo(bx + t.ox - t.w, by - 60);
        g.bezierCurveTo(bx + t.ox - t.w, by - 60 - h * 0.5, tipX - 4, by - 60 - h * 0.7, tipX, by - 60 - h);
        g.bezierCurveTo(tipX + 4, by - 60 - h * 0.7, bx + t.ox + t.w, by - 60 - h * 0.5, bx + t.ox + t.w, by - 60);
        g.closePath();
        g.fill();
      });
      g.restore();
      this.glows.push({ x: bx, y: by - 100, r: 90, color: "#ff6a1a", a: 0.75 * flick, f: 0.9 });
      this.glows.push({ x: bx, y: by - 75, r: 36, color: "#ffb050", a: 0.6, f: 0.9 });
      // Brasas que suben
      if (Math.random() < 0.6) {
        this.ambient.push({
          x: bx + (Math.random() - 0.5) * 30,
          y: by - 90,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -0.8 - Math.random() * 1.2,
          life: 90 + Math.random() * 90,
          max: 180,
          size: 1 + Math.random() * 1.6,
          kind: "ember",
        });
      }
    }
  }

  private drawFloorLights(g: CanvasRenderingContext2D, state: GameState) {
    g.save();
    g.globalCompositeOperation = "lighter";
    for (const bx of BRAZIERS) {
      g.globalAlpha = 0.28 + Math.sin(this.time * 0.37 + bx) * 0.04;
      drawSoft(g, "#ff7a1a", bx, 470, 50, 190);
      g.globalAlpha = 0.22;
      drawSoft(g, "#ffb050", bx, 482, 40, 22);
    }
    for (const p of state.projectiles) {
      g.globalAlpha = 0.45;
      drawSoft(g, p.element === "fuego" ? "#ff7a1a" : "#7fdcff", p.x, FLOOR + 6, 22, 130);
    }
    g.restore();
  }

  private drawBolts(g: CanvasRenderingContext2D) {
    g.save();
    g.globalCompositeOperation = "lighter";
    for (const b of this.bolts) {
      const a = b.life / 22;
      if (Math.floor(b.life) % 5 > 3) continue; // parpadeo
      for (const [w, alpha] of [[8, 0.18], [3, 0.6], [1.2, 1]] as const) {
        g.strokeStyle = `rgba(210,220,255,${alpha * a})`;
        g.lineWidth = w;
        g.beginPath();
        b.pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
        g.stroke();
      }
    }
    g.restore();
  }

  // ── efectos ──

  private updateEffects(dt: number) {
    this.flash *= Math.pow(0.86, dt);
    for (const r of this.rings) r.life -= dt;
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const b of this.bolts) b.life -= dt;
    this.bolts = this.bolts.filter((b) => b.life > 0);
    for (const c of this.combo) c.pop = Math.max(0, c.pop - 0.08 * dt);

    // Ceniza que flota en primer plano
    if (Math.random() < 0.25 * dt) {
      this.ambient.push({ x: Math.random() * W, y: -10, vx: (Math.random() - 0.3) * 0.5, vy: 0.3 + Math.random() * 0.5, life: 600, max: 600, size: 0.8 + Math.random() * 1.4, kind: "ash" });
    }
    for (const a of this.ambient) {
      a.life -= dt;
      a.x += (a.vx + (a.kind === "ash" ? Math.sin(this.time * 0.02 + a.y * 0.03) * 0.3 : 0)) * dt;
      a.y += a.vy * dt;
      if (a.kind === "ember") a.vx += Math.sin(this.time * 0.05 + a.y * 0.05) * 0.02;
    }
    this.ambient = this.ambient.filter((a) => a.life > 0 && a.y < H + 10).slice(-260);
  }

  private drawRings(g: CanvasRenderingContext2D) {
    g.save();
    g.globalCompositeOperation = "lighter";
    for (const r of this.rings) {
      const t = 1 - r.life / r.maxLife;
      const rad = r.r + (r.max - r.r) * (1 - (1 - t) ** 3);
      g.globalAlpha = 1 - t;
      g.strokeStyle = r.color;
      if (r.star) {
        g.lineWidth = r.width;
        g.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4 + 0.3;
          const inner = rad * 0.3;
          g.moveTo(r.x + Math.cos(a) * inner, r.y + Math.sin(a) * inner);
          g.lineTo(r.x + Math.cos(a) * rad, r.y + Math.sin(a) * rad);
        }
        g.stroke();
      } else {
        g.lineWidth = r.width * (1 - t) + 0.5;
        g.beginPath();
        g.arc(r.x, r.y, rad, 0, Math.PI * 2);
        g.stroke();
      }
      this.glows.push({ x: r.x, y: r.y, r: rad * 0.8, color: "#fff0c0", a: (1 - t) * 0.8, f: 1 });
    }
    g.restore();
  }

  private drawAmbient(g: CanvasRenderingContext2D) {
    g.save();
    for (const a of this.ambient) {
      const t = a.life / a.max;
      if (a.kind === "ember") {
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = Math.min(1, t * 2);
        g.fillStyle = t > 0.5 ? "#ffd27a" : "#ff6a1a";
        // Las brasas nacen en la capa de los braseros (0,9): se pasan al espacio del mundo.
        const [sx, sy] = this.project(a.x, a.y, 0.9);
        const [wx, wy] = this.unproject(sx, sy);
        g.fillRect(wx, wy, a.size, a.size);
      } else {
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = Math.min(0.5, t);
        g.fillStyle = "#b8a8a0";
        g.fillRect(a.x, a.y, a.size, a.size);
      }
    }
    g.restore();
  }

  private drawBloom(g: CanvasRenderingContext2D) {
    const a = this.glowA;
    const b = this.glowB;
    a.g.setTransform(1, 0, 0, 1, 0, 0);
    a.g.globalCompositeOperation = "source-over";
    a.g.clearRect(0, 0, a.c.width, a.c.height);
    a.g.globalCompositeOperation = "lighter";
    for (const gl of this.glows) {
      const [sx, sy, z] = this.project(gl.x, gl.y, gl.f);
      const r = (gl.r * z) / 4;
      a.g.globalAlpha = Math.min(1, gl.a);
      a.g.drawImage(soft(gl.color), sx / 4 - r, sy / 4 - r, r * 2, r * 2);
    }
    a.g.globalAlpha = 1;
    b.g.setTransform(1, 0, 0, 1, 0, 0);
    b.g.clearRect(0, 0, b.c.width, b.c.height);
    b.g.imageSmoothingEnabled = true;
    b.g.drawImage(a.c, 0, 0, b.c.width, b.c.height);
    g.save();
    g.globalCompositeOperation = "lighter";
    g.imageSmoothingEnabled = true;
    g.globalAlpha = 0.85;
    g.drawImage(a.c, 0, 0, W, H);
    g.globalAlpha = 0.7;
    g.drawImage(b.c, 0, 0, W, H);
    g.restore();
  }

  // ── proyectiles y partículas ──

  private drawProjectile(g: CanvasRenderingContext2D, p: Projectile) {
    const x = p.x;
    const y = FLOOR - p.y;
    const dir = Math.sign(p.vx) || 1;
    g.save();
    g.globalCompositeOperation = "lighter";
    if (p.element === "fuego") {
      for (let i = 7; i >= 0; i--) {
        const tx = x - dir * i * 8 + Math.sin(this.time * 0.9 + i) * 2;
        const ty = y + Math.sin(this.time * 0.7 + i * 1.3) * (i * 0.6);
        g.globalAlpha = 0.65 - i * 0.06;
        drawSoft(g, i > 4 ? "#c8301a" : "#ff7a1a", tx, ty, 26 - i * 2.2);
      }
      g.globalAlpha = 1;
      drawSoft(g, "#ffd27a", x, y, 22);
      drawSoft(g, "#ffffff", x + dir * 3, y, 10);
      g.strokeStyle = "rgba(255,240,190,0.7)";
      g.lineWidth = 2;
      for (let k = 0; k < 2; k++) {
        const a = this.time * 0.45 + k * Math.PI;
        g.beginPath();
        g.arc(x, y, 15, a, a + 1.6);
        g.stroke();
      }
      this.glows.push({ x, y, r: 80, color: "#ff7a1a", a: 1, f: 1 });
      this.glows.push({ x, y, r: 30, color: "#ffe0a0", a: 1, f: 1 });
    } else {
      drawSoft(g, "#7fdcff", x, y, 34);
      g.globalCompositeOperation = "source-over";
      g.translate(x, y);
      g.scale(dir, 1);
      const body = g.createLinearGradient(0, -10, 0, 10);
      body.addColorStop(0, "#ffffff");
      body.addColorStop(0.4, "#bfeaff");
      body.addColorStop(1, "#3a8ad8");
      g.fillStyle = body;
      g.beginPath();
      g.moveTo(38, 0);
      g.lineTo(8, -10);
      g.lineTo(-6, -6);
      g.lineTo(-18, -12);
      g.lineTo(-30, -4);
      g.lineTo(-40, -8);
      g.lineTo(-34, 0);
      g.lineTo(-42, 7);
      g.lineTo(-26, 5);
      g.lineTo(-14, 11);
      g.lineTo(-2, 6);
      g.lineTo(8, 10);
      g.closePath();
      g.fill();
      g.strokeStyle = "rgba(255,255,255,0.9)";
      g.lineWidth = 1.2;
      g.stroke();
      g.strokeStyle = "rgba(255,255,255,0.7)";
      g.beginPath();
      g.moveTo(36, 0);
      g.lineTo(-30, -1);
      g.moveTo(8, -10);
      g.lineTo(2, 0);
      g.lineTo(8, 10);
      g.stroke();
      this.glows.push({ x, y, r: 70, color: "#7fdcff", a: 0.9, f: 1 });
      this.glows.push({ x: x + dir * 30, y, r: 16, color: "#ffffff", a: 1, f: 1 });
    }
    g.restore();
  }

  private drawAirParticle(g: CanvasRenderingContext2D, p: Particle) {
    drawParticle(g, p);
    if (p.kind === "fire") this.glows.push({ x: p.x, y: p.y, r: p.size * 3, color: "#ff7a1a", a: (p.life / p.maxLife) * 0.6, f: 1 });
    else if (p.kind === "spark") this.glows.push({ x: p.x, y: p.y, r: 8, color: p.color, a: p.life / p.maxLife, f: 1 });
    else if (p.kind === "ice" && p.life % 6 === 0) this.glows.push({ x: p.x, y: p.y, r: 6, color: "#dff6ff", a: 0.6, f: 1 });
  }

  // ── HUD ──

  private drawHud(g: CanvasRenderingContext2D, state: GameState) {
    g.save();
    const shadow = g.createLinearGradient(0, 0, 0, 90);
    shadow.addColorStop(0, "rgba(0,0,0,0.55)");
    shadow.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = shadow;
    g.fillRect(0, 0, W, 90);

    const barW = 330;
    const barH = 20;
    const y = 24;
    state.fighters.forEach((f, i) => {
      const left = i === 0;
      const x = left ? 86 : W - 86 - barW;
      // Marco dorado
      g.fillStyle = goldGradient(g, y - 4, y + barH + 4);
      roundRect(g, x - 4, y - 4, barW + 8, barH + 8, 6);
      g.fill();
      g.fillStyle = "#1e0306";
      roundRect(g, x, y, barW, barH, 3);
      g.fill();
      const trail = (f.trailHp / MAX_HP) * barW;
      const hp = (f.hp / MAX_HP) * barW;
      const tg = g.createLinearGradient(0, y, 0, y + barH);
      tg.addColorStop(0, "#ffb050");
      tg.addColorStop(1, "#b8301a");
      g.fillStyle = tg;
      g.fillRect(left ? x : x + barW - trail, y, trail, barH);
      const ratio = f.hp / MAX_HP;
      const hg = g.createLinearGradient(0, y, 0, y + barH);
      if (ratio > 0.3) {
        hg.addColorStop(0, "#a8ff7a");
        hg.addColorStop(0.5, "#3cc83a");
        hg.addColorStop(1, "#14701c");
      } else {
        const pulse = Math.sin(this.time * 0.25) > 0;
        hg.addColorStop(0, pulse ? "#fff07a" : "#ffd04a");
        hg.addColorStop(0.5, "#e8781a");
        hg.addColorStop(1, "#8a2a0c");
      }
      g.fillStyle = hg;
      g.fillRect(left ? x : x + barW - hp, y, hp, barH);
      // Brillo y marcas
      g.fillStyle = "rgba(255,255,255,0.22)";
      g.fillRect(x, y + 1, barW, barH * 0.38);
      g.strokeStyle = "rgba(0,0,0,0.3)";
      g.lineWidth = 1;
      g.beginPath();
      for (let k = 1; k < 10; k++) {
        g.moveTo(x + (barW * k) / 10, y);
        g.lineTo(x + (barW * k) / 10, y + barH);
      }
      g.stroke();

      // Retrato
      const pcx = left ? 44 : W - 44;
      g.fillStyle = goldGradient(g, 4, 76);
      g.beginPath();
      g.arc(pcx, 40, 31, 0, Math.PI * 2);
      g.fill();
      drawPortrait(g, f.char, pcx, 40, 27, left ? 1 : -1);
      if (f.hp <= 0) {
        g.fillStyle = "rgba(120,0,0,0.5)";
        g.beginPath();
        g.arc(pcx, 40, 27, 0, Math.PI * 2);
        g.fill();
      }

      // Nombre
      g.font = `20px ${TITLE_FONT}`;
      g.textBaseline = "middle";
      g.textAlign = left ? "left" : "right";
      setSpacing(g, 2);
      const nx = left ? x + 2 : x + barW - 2;
      g.lineWidth = 4;
      g.strokeStyle = "#000";
      g.strokeText(characterOf(f).name, nx, y + barH + 18);
      g.fillStyle = "#f4e6d0";
      g.fillText(characterOf(f).name, nx, y + barH + 18);
      setSpacing(g, 0);

      // Medallas de rounds ganados
      for (let w = 0; w < ROUNDS_TO_WIN; w++) {
        const mx = left ? x + barW - 10 - w * 24 : x + 10 + w * 24;
        const my = y + barH + 18;
        g.beginPath();
        g.arc(mx, my, 9, 0, Math.PI * 2);
        if (w < f.wins) {
          const mg = g.createRadialGradient(mx - 3, my - 3, 1, mx, my, 9);
          mg.addColorStop(0, "#fff4c0");
          mg.addColorStop(0.5, "#e0a830");
          mg.addColorStop(1, "#7a4e12");
          g.fillStyle = mg;
          g.fill();
          dragonGlyph(g, mx, my, 0.3, "#5a2a08");
        } else {
          g.fillStyle = "rgba(0,0,0,0.55)";
          g.fill();
          g.strokeStyle = "#7a5a2a";
          g.lineWidth = 1.5;
          g.stroke();
        }
      }
    });

    // Reloj
    const seconds = Math.ceil(state.timer / 60);
    g.fillStyle = goldGradient(g, 6, 74);
    g.beginPath();
    g.arc(W / 2, 40, 33, 0, Math.PI * 2);
    g.fill();
    const face = g.createRadialGradient(W / 2, 34, 4, W / 2, 40, 29);
    face.addColorStop(0, "#3a0a10");
    face.addColorStop(1, "#0a0204");
    g.fillStyle = face;
    g.beginPath();
    g.arc(W / 2, 40, 29, 0, Math.PI * 2);
    g.fill();
    const urgent = seconds <= 10 && state.phase === "fight";
    const s = urgent ? 1 + Math.max(0, Math.sin(this.time * 0.2)) * 0.12 : 1;
    g.translate(W / 2, 42);
    g.scale(s, s);
    g.font = `34px ${TITLE_FONT}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    const ng = g.createLinearGradient(0, -16, 0, 16);
    ng.addColorStop(0, urgent ? "#ffd0c0" : "#fff4c0");
    ng.addColorStop(0.5, urgent ? "#ff4a3a" : "#f2b418");
    ng.addColorStop(1, urgent ? "#8a0a0a" : "#8a5a10");
    g.fillStyle = ng;
    g.fillText(String(seconds), 0, 0);
    g.restore();
  }

  private drawCombo(g: CanvasRenderingContext2D, state: GameState) {
    this.combo.forEach((c, i) => {
      if (c.count < 2 || state.tick - c.last > 100) return;
      const left = i === 0;
      const s = 1 + c.pop * 0.35;
      g.save();
      g.translate(left ? 92 : W - 92, 110);
      g.scale(s, s);
      g.font = `30px ${TITLE_FONT}`;
      g.textAlign = left ? "left" : "right";
      g.textBaseline = "middle";
      const text = `${c.count} GOLPES`;
      g.lineWidth = 6;
      g.strokeStyle = "#000";
      g.strokeText(text, 0, 0);
      const grad = g.createLinearGradient(0, -14, 0, 14);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.5, "#ffd23f");
      grad.addColorStop(1, "#c8501a");
      g.fillStyle = grad;
      g.fillText(text, 0, 0);
      g.restore();
    });
  }

  private drawBanner(g: CanvasRenderingContext2D, state: GameState, dt: number) {
    const banner = state.banner;
    const key = banner ? banner.text + (banner.sub ?? "") : "";
    if (key !== this.bannerKey) {
      this.bannerKey = key;
      this.bannerAge = 0;
      this.drips = [];
      if (banner && (banner.text === "FATALITY" || banner.sub === "FATALITY")) {
        for (let i = 0; i < 16; i++) {
          this.drips.push({ x: (Math.random() - 0.5) * 380, len: 0, max: 30 + Math.random() * 90, speed: 0.4 + Math.random() * 1.2, w: 2 + Math.random() * 4 });
        }
      }
    }
    if (!banner) return;
    this.bannerAge += dt;
    const t = this.bannerAge;
    const e = 1 - (1 - Math.min(1, t / 14)) ** 3;
    const scale = 1.7 - 0.7 * e;
    const big = banner.text.length > 10 ? 76 : 100;
    g.save();
    g.globalAlpha = Math.min(1, t / 5);
    g.translate(W / 2, 178);
    g.scale(scale, scale);
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `${big}px ${TITLE_FONT}`;
    g.lineJoin = "round";
    setSpacing(g, 4);
    drawTitle(g, banner.text, 0, 0, banner.color, big);
    if (banner.sub) {
      g.font = `58px ${TITLE_FONT}`;
      drawTitle(g, banner.sub, 0, big * 0.88, "#d4141f", 58);
    }
    // Sangre que chorrea de las letras de FATALITY
    if (this.drips.length) {
      const baseY = banner.text === "FATALITY" ? big * 0.36 : big * 0.88 + 22;
      for (const d of this.drips) {
        d.len = Math.min(d.max, d.len + d.speed * dt);
        const dg = g.createLinearGradient(0, baseY, 0, baseY + d.len);
        dg.addColorStop(0, "#8a0a10");
        dg.addColorStop(1, "#c8141e");
        g.fillStyle = dg;
        g.fillRect(d.x - d.w / 2, baseY - 4, d.w, d.len + 4);
        g.beginPath();
        g.arc(d.x, baseY + d.len, d.w * 0.9, 0, Math.PI * 2);
        g.fill();
      }
    }
    setSpacing(g, 0);
    g.restore();
  }
}

function setSpacing(g: CanvasRenderingContext2D, px: number) {
  if ("letterSpacing" in g) g.letterSpacing = `${px}px`;
}

function drawTitle(g: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size: number) {
  // Extrusión 3D
  g.fillStyle = "#1a0204";
  for (let i = 8; i >= 1; i--) g.fillText(text, x, y + i);
  g.lineWidth = size * 0.12;
  g.strokeStyle = "#000000";
  g.strokeText(text, x, y);
  g.save();
  g.shadowColor = color;
  g.shadowBlur = 28;
  const grad = g.createLinearGradient(0, y - size / 2, 0, y + size / 2);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.32, shade(color, 0.3));
  grad.addColorStop(0.55, color);
  grad.addColorStop(0.75, shade(color, -0.5));
  grad.addColorStop(1, shade(color, 0.1));
  g.fillStyle = grad;
  g.fillText(text, x, y);
  g.restore();
  g.lineWidth = 1.2;
  g.strokeStyle = "rgba(255,255,255,0.45)";
  g.strokeText(text, x, y - 1);
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function drawStar(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r / 2.4;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

function drawIceBlock(g: CanvasRenderingContext2D, x: number, groundY: number, t: number, crack: boolean, time: number) {
  const h = 210 * t;
  const pts: P[] = [
    [x - 46, groundY],
    [x - 52, groundY - h * 0.55],
    [x - 36, groundY - h * 0.92],
    [x - 8, groundY - h],
    [x + 30, groundY - h * 0.95],
    [x + 50, groundY - h * 0.6],
    [x + 44, groundY],
  ];
  g.save();
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.closePath();
  const grad = g.createLinearGradient(x - 50, groundY - h, x + 50, groundY);
  grad.addColorStop(0, "rgba(235,250,255,0.55)");
  grad.addColorStop(0.45, "rgba(150,215,255,0.35)");
  grad.addColorStop(1, "rgba(60,140,220,0.55)");
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = "rgba(255,255,255,0.9)";
  g.lineWidth = 2;
  g.stroke();
  g.clip();
  // Caras del cristal
  g.strokeStyle = "rgba(255,255,255,0.45)";
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(x - 36, groundY - h * 0.92);
  g.lineTo(x - 4, groundY - h * 0.6);
  g.lineTo(x + 30, groundY - h * 0.95);
  g.moveTo(x - 4, groundY - h * 0.6);
  g.lineTo(x - 10, groundY);
  g.moveTo(x - 52, groundY - h * 0.55);
  g.lineTo(x - 4, groundY - h * 0.6);
  g.lineTo(x + 50, groundY - h * 0.6);
  g.stroke();
  // Brillo especular que recorre el bloque
  const sweep = ((time * 2) % 260) - 60;
  const sg = g.createLinearGradient(x - 60 + sweep, groundY - h, x - 20 + sweep, groundY);
  sg.addColorStop(0, "rgba(255,255,255,0)");
  sg.addColorStop(0.5, "rgba(255,255,255,0.35)");
  sg.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = sg;
  g.fillRect(x - 60, groundY - h, 120, h);
  if (crack) {
    g.strokeStyle = "rgba(255,255,255,0.95)";
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(x - 10, groundY - h);
    g.lineTo(x + 6, groundY - h * 0.7);
    g.lineTo(x - 8, groundY - h * 0.45);
    g.lineTo(x + 12, groundY - h * 0.2);
    g.lineTo(x + 2, groundY);
    g.moveTo(x + 6, groundY - h * 0.7);
    g.lineTo(x + 34, groundY - h * 0.6);
    g.moveTo(x - 8, groundY - h * 0.45);
    g.lineTo(x - 40, groundY - h * 0.38);
    g.stroke();
  }
  g.restore();
}

function drawBones(g: CanvasRenderingContext2D, x: number) {
  const y = FLOOR;
  g.save();
  g.lineCap = "round";
  const bone = (x1: number, y1: number, x2: number, y2: number) => {
    g.strokeStyle = "#d8cdb4";
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(x + x1, y + y1);
    g.lineTo(x + x2, y + y2);
    g.stroke();
    g.fillStyle = "#e9e1cf";
    for (const [bx, by] of [[x1, y1], [x2, y2]]) {
      g.beginPath();
      g.arc(x + bx, y + by - 1.5, 3, 0, Math.PI * 2);
      g.arc(x + bx, y + by + 1.5, 3, 0, Math.PI * 2);
      g.fill();
    }
  };
  bone(-40, -4, 0, -7);
  bone(-8, -3, 32, -6);
  bone(12, -10, 46, -3);
  // Costillas
  g.strokeStyle = "#d8cdb4";
  g.lineWidth = 2.5;
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.ellipse(x - 18 + i * 7, y - 9, 4, 9, 0, Math.PI, Math.PI * 2);
    g.stroke();
  }
  // Calavera
  const sg = g.createRadialGradient(x - 56, y - 19, 2, x - 52, y - 14, 14);
  sg.addColorStop(0, "#fffaf0");
  sg.addColorStop(1, "#b8ab90");
  g.fillStyle = sg;
  g.beginPath();
  g.arc(x - 52, y - 15, 13, 0, Math.PI * 2);
  g.fill();
  g.fillRect(x - 59, y - 7, 14, 7);
  g.fillStyle = "#1a1210";
  g.beginPath();
  g.ellipse(x - 57, y - 16, 3.6, 4.2, 0, 0, Math.PI * 2);
  g.ellipse(x - 47, y - 16, 3.6, 4.2, 0, 0, Math.PI * 2);
  g.fill();
  g.fillRect(x - 53, y - 10, 2, 3);
  g.restore();
}

function drawParticle(g: CanvasRenderingContext2D, p: Particle) {
  const t = p.life / p.maxLife;
  switch (p.kind) {
    case "blood": {
      if (p.grounded) {
        g.globalAlpha = Math.min(1, t * 3) * 0.9;
        g.fillStyle = "#7a0810";
        g.beginPath();
        g.ellipse(p.x, p.y, p.size * 1.8, p.size * 0.5, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "rgba(255,120,120,0.25)";
        g.beginPath();
        g.ellipse(p.x - p.size * 0.4, p.y - p.size * 0.12, p.size * 0.6, p.size * 0.14, 0, 0, Math.PI * 2);
        g.fill();
      } else {
        const speed = Math.hypot(p.vx, p.vy);
        g.globalAlpha = 1;
        g.fillStyle = p.color;
        g.beginPath();
        g.ellipse(p.x, p.y, p.size * (1 + speed * 0.22), p.size * 0.75, Math.atan2(p.vy, p.vx), 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "rgba(255,160,160,0.5)";
        g.beginPath();
        g.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.3, 0, Math.PI * 2);
        g.fill();
      }
      break;
    }
    case "spark":
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = t;
      g.strokeStyle = p.color;
      g.lineWidth = p.size;
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(p.x - p.vx * 3.5, p.y - p.vy * 3.5);
      g.stroke();
      g.globalCompositeOperation = "source-over";
      break;
    case "fire":
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = t * 0.8;
      drawSoft(g, t > 0.7 ? "#ffd27a" : t > 0.35 ? "#ff7a1a" : "#a3200c", p.x, p.y, p.size * (0.6 + t * 0.9));
      g.globalCompositeOperation = "source-over";
      break;
    case "smoke":
      g.globalAlpha = t * 0.45;
      drawSoft(g, "#3a3036", p.x, p.y, p.size * (2.2 - t));
      break;
    case "ice": {
      g.globalAlpha = Math.min(1, t * 2);
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.x * 0.1 + p.life * 0.05);
      const s = p.size;
      g.fillStyle = "#e8fbff";
      g.beginPath();
      g.moveTo(-s * 1.4, 0);
      g.lineTo(0, -s * 0.7);
      g.lineTo(s * 1.4, 0);
      g.lineTo(0, s * 0.7);
      g.closePath();
      g.fill();
      g.strokeStyle = "rgba(90,170,230,0.8)";
      g.lineWidth = 0.8;
      g.stroke();
      g.restore();
      break;
    }
    case "bone":
      g.globalAlpha = Math.min(1, t * 4);
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.grounded ? p.x : p.life * 0.3);
      g.strokeStyle = "#e0d6c0";
      g.lineWidth = 3.5;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(-p.size / 2, 0);
      g.lineTo(p.size / 2, 0);
      g.stroke();
      g.restore();
      break;
  }
  g.globalAlpha = 1;
}
