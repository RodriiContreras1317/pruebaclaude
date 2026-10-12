// Dibujo del juego en un <canvas> 2D. Los luchadores se arman con un esqueleto de puntos
// (poses) que se interpolan según la acción y el cuadro actual.

import {
  ATTACKS,
  FATALITY_EXPLODE_FRAME,
  MAX_HP,
  ROUNDS_TO_WIN,
  STAGE,
  characterOf,
  type Character,
  type Fighter,
  type GameState,
  type Particle,
  type Projectile,
} from "./engine";

type P = [number, number];

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
  hip: [0, 95], neck: [4, 150], head: [6, 172],
  fElbow: [24, 126], fHand: [30, 148], bElbow: [-6, 122], bHand: [16, 138],
  fKnee: [18, 50], fFoot: [26, 0], bKnee: [-12, 50], bFoot: [-26, 0],
};
const CROUCH: Pose = {
  hip: [-4, 52], neck: [10, 102], head: [16, 123],
  fElbow: [30, 82], fHand: [36, 104], bElbow: [2, 78], bHand: [22, 94],
  fKnee: [30, 46], fFoot: [28, 0], bKnee: [-10, 28], bFoot: [-34, 0],
};
const JUMP: Pose = {
  hip: [0, 95], neck: [6, 148], head: [8, 170],
  fElbow: [26, 130], fHand: [30, 150], bElbow: [-10, 128], bHand: [12, 140],
  fKnee: [26, 72], fFoot: [10, 40], bKnee: [4, 60], bFoot: [-20, 42],
};
const PUNCH: Pose = {
  ...STAND, neck: [10, 150], head: [13, 172],
  fElbow: [44, 150], fHand: [82, 152], bElbow: [-12, 126], bHand: [8, 136],
  fKnee: [22, 50], fFoot: [34, 0], bKnee: [-16, 50], bFoot: [-32, 0],
};
const KICK: Pose = {
  hip: [-4, 95], neck: [-18, 148], head: [-22, 170],
  fElbow: [6, 130], fHand: [20, 145], bElbow: [-30, 125], bHand: [-42, 140],
  fKnee: [40, 112], fFoot: [96, 124], bKnee: [-8, 50], bFoot: [-12, 0],
};
const SWEEP: Pose = {
  hip: [-8, 40], neck: [-6, 92], head: [-4, 113],
  fElbow: [10, 64], fHand: [8, 40], bElbow: [-24, 70], bHand: [-34, 88],
  fKnee: [42, 24], fFoot: [94, 8], bKnee: [-14, 22], bFoot: [-36, 0],
};
const UPPERCUT_WIND: Pose = { ...CROUCH, fElbow: [10, 70], fHand: [20, 52] };
const UPPERCUT: Pose = {
  hip: [4, 100], neck: [10, 158], head: [8, 180],
  fElbow: [30, 176], fHand: [36, 218], bElbow: [-12, 128], bHand: [-4, 110],
  fKnee: [22, 52], fFoot: [24, 0], bKnee: [-14, 46], bFoot: [-30, 0],
};
const JUMP_KICK: Pose = {
  hip: [0, 95], neck: [-12, 146], head: [-16, 168],
  fElbow: [10, 130], fHand: [24, 148], bElbow: [-28, 126], bHand: [-38, 142],
  fKnee: [44, 84], fFoot: [92, 74], bKnee: [4, 62], bFoot: [-22, 46],
};
const BLOCK: Pose = { ...STAND, head: [2, 170], fElbow: [26, 142], fHand: [28, 176], bElbow: [20, 128], bHand: [32, 160] };
const CROUCH_BLOCK: Pose = { ...CROUCH, fElbow: [28, 88], fHand: [30, 122], bElbow: [22, 78], bHand: [34, 108] };
const HIT: Pose = {
  hip: [-6, 95], neck: [-20, 146], head: [-28, 166],
  fElbow: [-4, 126], fHand: [10, 112], bElbow: [-36, 128], bHand: [-48, 112],
  fKnee: [14, 50], fFoot: [22, 0], bKnee: [-18, 50], bFoot: [-30, 0],
};
const SPECIAL_WIND: Pose = { ...STAND, neck: [-4, 150], head: [-4, 172], fElbow: [-14, 130], fHand: [-30, 122], bElbow: [-20, 126], bHand: [-38, 116] };
const SPECIAL: Pose = {
  ...STAND, neck: [12, 150], head: [15, 172],
  fElbow: [42, 144], fHand: [74, 148], bElbow: [32, 134], bHand: [68, 138],
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

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = {} as Pose;
  for (const k of KEYS) out[k] = [lerp(a[k][0], b[k][0], t), lerp(a[k][1], b[k][1], t)];
  return out;
}

function offset(pose: Pose, dx: number, dy: number, keys: (keyof Pose)[] = KEYS): Pose {
  const out = { ...pose };
  for (const k of keys) out[k] = [pose[k][0] + dx, pose[k][1] + dy];
  return out;
}

function attackPose(base: Pose, hit: Pose, f: Fighter): Pose {
  const spec = ATTACKS[f.attack!];
  const frame = f.frame;
  if (frame <= spec.startup) return lerpPose(base, hit, Math.min(1, frame / spec.startup) ** 0.7);
  if (frame <= spec.startup + spec.active) return hit;
  return lerpPose(hit, base, Math.min(1, (frame - spec.startup - spec.active) / Math.max(1, spec.recovery)));
}

function walkPose(f: Fighter): Pose {
  const phase = f.frame * 0.22 * (f.vx * f.facing >= 0 ? 1 : -1);
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const pose = offset(STAND, 0, Math.abs(c) * 2, ["hip", "neck", "head", "fElbow", "fHand", "bElbow", "bHand"]);
  const fFoot: P = [4 + 22 * s, Math.max(0, 10 * c)];
  const bFoot: P = [-4 - 22 * s, Math.max(0, -10 * c)];
  return {
    ...pose,
    fFoot,
    bFoot,
    fKnee: [(pose.hip[0] + fFoot[0]) / 2 + 10, 50 + fFoot[1] / 2],
    bKnee: [(pose.hip[0] + bFoot[0]) / 2 + 10, 50 + bFoot[1] / 2],
    fHand: [30 - 6 * s, 146], bHand: [16 + 6 * s, 138],
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
          if (f.frame <= spec.startup) return lerpPose(STAND, SPECIAL_WIND, f.frame / spec.startup);
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
      return lerpPose(STAND, VICTORY, Math.min(1, f.frame / 12));
    case "fatalityVictim":
      return DIZZY;
  }
}

// ───────────────────────── escenario ─────────────────────────

let backgroundCache: HTMLCanvasElement | null = null;

function background(): HTMLCanvasElement {
  if (backgroundCache) return backgroundCache;
  const c = document.createElement("canvas");
  c.width = STAGE.width;
  c.height = STAGE.height;
  const g = c.getContext("2d")!;
  const { width: W, floor: F } = STAGE;

  const sky = g.createLinearGradient(0, 0, 0, F);
  sky.addColorStop(0, "#12051a");
  sky.addColorStop(0.55, "#4a0f22");
  sky.addColorStop(1, "#b0401c");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, F);

  // Luna
  const moon = g.createRadialGradient(700, 130, 10, 700, 130, 160);
  moon.addColorStop(0, "rgba(255,220,180,0.55)");
  moon.addColorStop(1, "rgba(255,120,80,0)");
  g.fillStyle = moon;
  g.fillRect(0, 0, W, F);
  g.fillStyle = "#ffd9b0";
  g.beginPath();
  g.arc(700, 130, 55, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(200,120,90,0.35)";
  for (const [x, y, r] of [[685, 115, 12], [720, 145, 8], [700, 160, 6]] as const) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  // Montañas
  const mountains = (color: string, base: number, peaks: number[][]) => {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, F);
    for (const [x, y] of peaks) g.lineTo(x, base - y);
    g.lineTo(W, F);
    g.closePath();
    g.fill();
  };
  mountains("#2a0b1c", 330, [[0, 40], [90, 130], [170, 60], [260, 170], [360, 70], [470, 150], [560, 50], [680, 120], [780, 40], [880, 140], [960, 60]]);
  mountains("#1a0612", 380, [[0, 20], [120, 90], [210, 30], [330, 110], [430, 20], [600, 80], [720, 10], [840, 100], [960, 30]]);

  // Templo: escalinata y columnas
  g.fillStyle = "#14070e";
  g.fillRect(0, 300, W, F - 300);
  for (let i = 0; i < 6; i++) {
    const x = 40 + i * 176;
    const col = g.createLinearGradient(x, 0, x + 44, 0);
    col.addColorStop(0, "#2b1418");
    col.addColorStop(0.5, "#4a2626");
    col.addColorStop(1, "#1d0c10");
    g.fillStyle = col;
    g.fillRect(x, 170, 44, F - 170);
    g.fillStyle = "#3a1a1e";
    g.fillRect(x - 8, 160, 60, 16);
    g.fillRect(x - 8, F - 30, 60, 30);
  }
  g.fillStyle = "#2a1216";
  g.fillRect(0, 140, W, 24);
  g.fillStyle = "#3d1a1f";
  g.beginPath();
  g.moveTo(-20, 140);
  g.lineTo(W / 2, 80);
  g.lineTo(W + 20, 140);
  g.closePath();
  g.fill();
  // Dragón (emblema)
  g.strokeStyle = "#b8862b";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(W / 2, 118, 18, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.moveTo(W / 2 - 10, 110);
  g.quadraticCurveTo(W / 2 + 14, 104, W / 2 + 6, 120);
  g.quadraticCurveTo(W / 2 - 4, 130, W / 2 + 10, 128);
  g.stroke();

  // Piso de piedra con perspectiva
  const floor = g.createLinearGradient(0, F - 40, 0, STAGE.height);
  floor.addColorStop(0, "#3b2a26");
  floor.addColorStop(1, "#1a1210");
  g.fillStyle = floor;
  g.fillRect(0, F - 40, W, STAGE.height - F + 40);
  g.strokeStyle = "rgba(0,0,0,0.45)";
  g.lineWidth = 1.5;
  for (let y = F - 40, h = 10; y < STAGE.height; y += h, h *= 1.35) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }
  for (let i = -12; i <= 12; i++) {
    g.beginPath();
    g.moveTo(W / 2 + i * 60, F - 40);
    g.lineTo(W / 2 + i * 140, STAGE.height);
    g.stroke();
  }
  // Viñeta
  const vignette = g.createRadialGradient(W / 2, 280, 200, W / 2, 280, 620);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.65)");
  g.fillStyle = vignette;
  g.fillRect(0, 0, W, STAGE.height);

  backgroundCache = c;
  return c;
}

function drawTorches(g: CanvasRenderingContext2D, tick: number) {
  for (const x of [128, 832]) {
    const y = 290;
    g.fillStyle = "#2b1a14";
    g.fillRect(x - 4, y, 8, 40);
    const flicker = Math.sin(tick * 0.3 + x) * 3 + Math.sin(tick * 0.71) * 2;
    const glow = g.createRadialGradient(x, y - 10, 2, x, y - 10, 90);
    glow.addColorStop(0, "rgba(255,170,60,0.35)");
    glow.addColorStop(1, "rgba(255,90,20,0)");
    g.fillStyle = glow;
    g.fillRect(x - 90, y - 100, 180, 180);
    g.fillStyle = "#ff8a1a";
    g.beginPath();
    g.ellipse(x, y - 10, 9, 18 + flicker, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ffe08a";
    g.beginPath();
    g.ellipse(x, y - 6, 4, 9 + flicker / 2, 0, 0, Math.PI * 2);
    g.fill();
  }
}

// ───────────────────────── luchadores ─────────────────────────

function limb(g: CanvasRenderingContext2D, a: P, b: P, width: number, color: string) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  g.moveTo(a[0], a[1]);
  g.lineTo(b[0], b[1]);
  g.stroke();
}

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => Math.max(0, Math.min(255, ((n >> shift) & 255) + amount));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

function drawFighter(g: CanvasRenderingContext2D, state: GameState, f: Fighter) {
  const fatality = state.phase === "fatality" || (state.fatality && state.phase === "matchOver");
  const victim = f.action === "fatalityVictim" || (state.fatality && state.winner !== f.side && state.winner !== null);
  const fatalityFrame = state.phase === "fatality" ? state.phaseFrame : 10_000;
  const winnerElement = state.winner !== null ? characterOf(state.fighters[state.winner]).element : "fuego";

  // Sombra
  g.fillStyle = "rgba(0,0,0,0.45)";
  const shadowScale = Math.max(0.4, 1 - f.y / 250);
  g.beginPath();
  g.ellipse(f.x, STAGE.floor + 2, 42 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
  g.fill();

  if (fatality && victim && fatalityFrame >= FATALITY_EXPLODE_FRAME) {
    if (winnerElement === "fuego") drawBones(g, f.x);
    return;
  }

  const ch = characterOf(f);
  const mirror = state.fighters[0].char === state.fighters[1].char && f.side === 1;
  let colors: Character["colors"] = mirror
    ? { ...ch.colors, main: f.char === "kaen" ? "#d6402a" : "#3fbf6b", dark: f.char === "kaen" ? "#8a2414" : "#227a44" }
    : ch.colors;
  const burning = fatality && victim && winnerElement === "fuego";
  if (burning) {
    const t = Math.min(1, fatalityFrame / 60);
    const charred = "#1c1512";
    colors = { ...colors, main: t > 0.5 ? charred : colors.main, dark: t > 0.3 ? charred : colors.dark };
  }

  const pose = poseFor(f, state.tick);
  const dir = f.facing;
  const ox = f.x;
  const oy = STAGE.floor - f.y;
  const tp = (p: P): P => [ox + p[0] * dir, oy - p[1]];
  const P2 = {} as Pose;
  for (const k of KEYS) P2[k] = tp(pose[k]);

  g.save();
  g.lineCap = "round";
  g.lineJoin = "round";
  const suit = colors.suit;
  const suitBack = shade(suit, -6);

  // Extremidades de atrás
  limb(g, P2.hip, P2.bKnee, 17, shade(colors.dark, -25));
  limb(g, P2.bKnee, P2.bFoot, 15, suitBack);
  limb(g, P2.neck, P2.bElbow, 13, suitBack);
  limb(g, P2.bElbow, P2.bHand, 12, shade(colors.dark, -25));
  dot(g, P2.bHand, 7, suitBack);

  // Torso
  const nx = P2.neck[0], ny = P2.neck[1], hx = P2.hip[0], hy = P2.hip[1];
  const ang = Math.atan2(ny - hy, nx - hx);
  const px = Math.cos(ang + Math.PI / 2), py = Math.sin(ang + Math.PI / 2);
  g.fillStyle = suit;
  g.beginPath();
  g.moveTo(nx + px * 17, ny + py * 17);
  g.lineTo(nx - px * 17, ny - py * 17);
  g.lineTo(hx - px * 14, hy - py * 14);
  g.lineTo(hx + px * 14, hy + py * 14);
  g.closePath();
  g.fill();
  // Chaleco de color en V
  g.fillStyle = colors.main;
  g.beginPath();
  g.moveTo(nx + px * 15, ny + py * 15);
  g.lineTo(lerp(nx, hx, 0.55), lerp(ny, hy, 0.55));
  g.lineTo(nx - px * 15, ny - py * 15);
  g.lineTo(lerp(nx, hx, 0.15) - px * 6, lerp(ny, hy, 0.15) - py * 6);
  g.lineTo(lerp(nx, hx, 0.35), lerp(ny, hy, 0.35));
  g.lineTo(lerp(nx, hx, 0.15) + px * 6, lerp(ny, hy, 0.15) + py * 6);
  g.closePath();
  g.fill();
  // Cinturón y faldón
  limb(g, [hx + px * 14, hy + py * 14], [hx - px * 14, hy - py * 14], 8, colors.dark);
  g.fillStyle = colors.main;
  g.beginPath();
  g.moveTo(hx - 6 * dir, hy + 2);
  g.lineTo(hx + 6 * dir, hy + 2);
  g.lineTo(hx + 10 * dir + (f.vx || 0) * -2, hy + 34);
  g.lineTo(hx - 2 * dir, hy + 32);
  g.closePath();
  g.fill();

  // Pierna de adelante
  limb(g, P2.hip, P2.fKnee, 18, colors.dark);
  limb(g, P2.fKnee, P2.fFoot, 16, suit);
  limb(g, P2.fFoot, [P2.fFoot[0] + 10 * dir, P2.fFoot[1]], 10, suit);
  limb(g, [P2.fKnee[0], P2.fKnee[1]], lerpP(P2.fKnee, P2.fFoot, 0.55), 17, colors.main);

  // Cabeza (capucha + máscara)
  const head = P2.head;
  dot(g, head, 16, colors.main);
  g.fillStyle = suit;
  g.beginPath();
  g.ellipse(head[0] + 4 * dir, head[1] + 1, 11, 5, 0, 0, Math.PI * 2);
  g.fill();
  const glowing = f.action !== "defeated" && f.action !== "knockdown";
  g.fillStyle = colors.eyes;
  if (glowing) {
    g.shadowColor = colors.glow;
    g.shadowBlur = 8;
  }
  g.fillRect(head[0] + (dir === 1 ? 2 : -12), head[1] - 1, 10, 3);
  g.shadowBlur = 0;
  // Máscara inferior
  g.fillStyle = colors.dark;
  g.beginPath();
  g.ellipse(head[0] + 5 * dir, head[1] + 9, 10, 6, 0, 0, Math.PI);
  g.fill();

  // Brazo de adelante
  limb(g, P2.neck, P2.fElbow, 14, suit);
  limb(g, P2.fElbow, P2.fHand, 13, colors.main);
  dot(g, P2.fHand, 8, suit);

  g.restore();

  if (f.flash > 0 && f.flash % 2 === 0) {
    g.save();
    g.globalAlpha = 0.5;
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.ellipse(f.x, oy - 95, 32, 92, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  // Elemento visible en el especial
  if (f.action === "attack" && f.attack === "special" && f.frame <= ATTACKS.special.startup + 2) {
    const hand = P2.fHand;
    const glow = g.createRadialGradient(hand[0], hand[1], 0, hand[0], hand[1], 26);
    glow.addColorStop(0, ch.element === "fuego" ? "rgba(255,200,80,0.9)" : "rgba(200,240,255,0.9)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = glow;
    g.fillRect(hand[0] - 26, hand[1] - 26, 52, 52);
  }

  // Hielo: bloque alrededor
  const iceVictim = fatality && victim && winnerElement === "hielo";
  if (f.action === "frozen" || iceVictim) {
    const t = iceVictim ? Math.min(1, fatalityFrame / 25) : 1;
    const crack = iceVictim && fatalityFrame > 50;
    drawIceBlock(g, f.x, oy, t, crack);
  }

  // Mareado: estrellitas
  if (f.action === "dizzy") {
    for (let i = 0; i < 3; i++) {
      const a = state.tick * 0.08 + (i * Math.PI * 2) / 3;
      drawStar(g, P2.head[0] + Math.cos(a) * 26, P2.head[1] - 22 + Math.sin(a) * 6, 5, "#ffe066");
    }
  }
}

function lerpP(a: P, b: P, t: number): P {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

function dot(g: CanvasRenderingContext2D, p: P, r: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(p[0], p[1], r, 0, Math.PI * 2);
  g.fill();
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

function drawIceBlock(g: CanvasRenderingContext2D, x: number, groundY: number, t: number, crack: boolean) {
  const h = 200 * t;
  g.save();
  g.globalAlpha = 0.55;
  const grad = g.createLinearGradient(x - 45, 0, x + 45, 0);
  grad.addColorStop(0, "#9fdcff");
  grad.addColorStop(0.5, "#e6f8ff");
  grad.addColorStop(1, "#6fbfef");
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(x - 44, groundY);
  g.lineTo(x - 50, groundY - h * 0.6);
  g.lineTo(x - 30, groundY - h);
  g.lineTo(x + 34, groundY - h * 0.96);
  g.lineTo(x + 48, groundY - h * 0.5);
  g.lineTo(x + 42, groundY);
  g.closePath();
  g.fill();
  g.globalAlpha = 0.9;
  g.strokeStyle = "#ffffff";
  g.lineWidth = 2;
  g.stroke();
  if (crack) {
    g.beginPath();
    g.moveTo(x - 10, groundY - h);
    g.lineTo(x + 6, groundY - h * 0.7);
    g.lineTo(x - 8, groundY - h * 0.45);
    g.lineTo(x + 12, groundY - h * 0.2);
    g.moveTo(x + 6, groundY - h * 0.7);
    g.lineTo(x + 30, groundY - h * 0.6);
    g.stroke();
  }
  g.restore();
}

function drawBones(g: CanvasRenderingContext2D, x: number) {
  const y = STAGE.floor;
  g.save();
  g.fillStyle = "#e9e1cf";
  g.strokeStyle = "#e9e1cf";
  g.lineCap = "round";
  g.lineWidth = 6;
  for (const [x1, y1, x2, y2] of [[-40, -4, 0, -8], [-10, -3, 30, -6], [10, -10, 44, -2], [-30, -12, -6, -16]]) {
    g.beginPath();
    g.moveTo(x + x1, y + y1);
    g.lineTo(x + x2, y + y2);
    g.stroke();
  }
  // Calavera
  g.beginPath();
  g.arc(x - 52, y - 14, 13, 0, Math.PI * 2);
  g.fill();
  g.fillRect(x - 60, y - 6, 16, 6);
  g.fillStyle = "#1a1210";
  g.beginPath();
  g.arc(x - 57, y - 16, 3.5, 0, Math.PI * 2);
  g.arc(x - 47, y - 16, 3.5, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// ───────────────────────── proyectiles y partículas ─────────────────────────

function drawProjectile(g: CanvasRenderingContext2D, p: Projectile, tick: number) {
  const x = p.x;
  const y = STAGE.floor - p.y;
  const dir = Math.sign(p.vx);
  g.save();
  if (p.element === "fuego") {
    const glow = g.createRadialGradient(x, y, 2, x, y, 40);
    glow.addColorStop(0, "rgba(255,240,170,1)");
    glow.addColorStop(0.35, "rgba(255,140,30,0.9)");
    glow.addColorStop(1, "rgba(255,60,0,0)");
    g.fillStyle = glow;
    g.beginPath();
    g.arc(x, y, 40, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff6d0";
    g.beginPath();
    g.arc(x + dir * 4, y, 8 + Math.sin(tick * 0.6) * 2, 0, Math.PI * 2);
    g.fill();
  } else {
    g.translate(x, y);
    g.scale(dir, 1);
    g.shadowColor = "#7fdcff";
    g.shadowBlur = 16;
    g.fillStyle = "#dff6ff";
    g.beginPath();
    g.moveTo(26, 0);
    g.lineTo(0, -9);
    g.lineTo(-30, -3);
    g.lineTo(-30, 3);
    g.lineTo(0, 9);
    g.closePath();
    g.fill();
    g.fillStyle = "#6fc6ff";
    g.beginPath();
    g.moveTo(26, 0);
    g.lineTo(0, 3);
    g.lineTo(-30, 1);
    g.lineTo(0, -2);
    g.closePath();
    g.fill();
  }
  g.restore();
}

function drawParticle(g: CanvasRenderingContext2D, p: Particle) {
  const t = p.life / p.maxLife;
  switch (p.kind) {
    case "blood":
      g.globalAlpha = p.grounded ? Math.min(1, t * 3) * 0.85 : 1;
      g.fillStyle = p.color;
      g.beginPath();
      if (p.grounded) g.ellipse(p.x, p.y, p.size * 1.6, p.size * 0.45, 0, 0, Math.PI * 2);
      else g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      g.fill();
      break;
    case "spark":
      g.globalAlpha = t;
      g.strokeStyle = p.color;
      g.lineWidth = p.size;
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
      g.stroke();
      break;
    case "fire":
      // Mezcla aditiva: las llamas superpuestas brillan en vez de taparse.
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = t * 0.7;
      g.fillStyle = t > 0.75 ? "#ffb347" : t > 0.35 ? p.color : "#a3200c";
      g.beginPath();
      g.arc(p.x, p.y, p.size * (0.4 + t * 0.6), 0, Math.PI * 2);
      g.fill();
      g.globalCompositeOperation = "source-over";
      break;
    case "smoke":
      g.globalAlpha = t * 0.5;
      g.fillStyle = p.color;
      g.beginPath();
      g.arc(p.x, p.y, p.size * (2 - t), 0, Math.PI * 2);
      g.fill();
      break;
    case "ice":
      g.globalAlpha = Math.min(1, t * 2);
      g.fillStyle = p.color;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.x * 0.1);
      g.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
      g.restore();
      break;
    case "bone":
      g.globalAlpha = Math.min(1, t * 4);
      g.strokeStyle = p.color;
      g.lineWidth = 4;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.grounded ? p.x : p.life * 0.3);
      g.beginPath();
      g.moveTo(-p.size / 2, 0);
      g.lineTo(p.size / 2, 0);
      g.stroke();
      g.restore();
      break;
  }
  g.globalAlpha = 1;
}

// ───────────────────────── HUD ─────────────────────────

const TITLE_FONT = "Impact, Anton, Haettenschweiler, 'Arial Narrow Bold', 'Arial Black', sans-serif";

function drawHud(g: CanvasRenderingContext2D, state: GameState) {
  const barW = 370;
  const barH = 22;
  const y = 24;
  state.fighters.forEach((f, i) => {
    const x = i === 0 ? 40 : STAGE.width - 40 - barW;
    g.fillStyle = "rgba(0,0,0,0.6)";
    g.fillRect(x - 3, y - 3, barW + 6, barH + 6);
    g.fillStyle = "#7a0c10";
    g.fillRect(x, y, barW, barH);
    const trail = (f.trailHp / MAX_HP) * barW;
    const hp = (f.hp / MAX_HP) * barW;
    // P1 se vacía hacia la izquierda, P2 hacia la derecha (como en el arcade).
    g.fillStyle = "#e8d34a";
    g.fillRect(i === 0 ? x : x + barW - trail, y, trail, barH);
    const grad = g.createLinearGradient(0, y, 0, y + barH);
    grad.addColorStop(0, "#5ee05a");
    grad.addColorStop(1, "#1d8f22");
    g.fillStyle = grad;
    g.fillRect(i === 0 ? x : x + barW - hp, y, hp, barH);
    g.strokeStyle = "#d9b45a";
    g.lineWidth = 2;
    g.strokeRect(x - 1, y - 1, barW + 2, barH + 2);

    g.font = `20px ${TITLE_FONT}`;
    g.textBaseline = "middle";
    g.textAlign = i === 0 ? "left" : "right";
    g.fillStyle = "#ffffff";
    g.strokeStyle = "#000000";
    g.lineWidth = 4;
    const nameX = i === 0 ? x + 6 : x + barW - 6;
    g.strokeText(characterOf(f).name, nameX, y + barH / 2 + 1);
    g.fillText(characterOf(f).name, nameX, y + barH / 2 + 1);

    // Medallones de rounds ganados
    for (let w = 0; w < ROUNDS_TO_WIN; w++) {
      const mx = i === 0 ? x + 12 + w * 26 : x + barW - 12 - w * 26;
      g.beginPath();
      g.arc(mx, y + barH + 18, 9, 0, Math.PI * 2);
      g.fillStyle = w < f.wins ? "#ffd23f" : "rgba(0,0,0,0.5)";
      g.fill();
      g.strokeStyle = "#a87a1f";
      g.lineWidth = 2;
      g.stroke();
      if (w < f.wins) drawStar(g, mx, y + barH + 18, 5, "#a8240f");
    }
  });

  // Reloj
  const seconds = Math.ceil(state.timer / 60);
  g.textAlign = "center";
  g.font = `44px ${TITLE_FONT}`;
  g.lineWidth = 6;
  g.strokeStyle = "#000000";
  g.fillStyle = seconds <= 10 && state.phase === "fight" ? "#ff4b4b" : "#ffd23f";
  g.strokeText(String(seconds), STAGE.width / 2, y + 14);
  g.fillText(String(seconds), STAGE.width / 2, y + 14);
}

function drawBanner(g: CanvasRenderingContext2D, state: GameState) {
  const banner = state.banner;
  if (!banner) return;
  const t = state.phaseFrame;
  const scale = 1 + Math.max(0, 0.6 - t * 0.06);
  const big = banner.text.length > 10 ? 72 : 96;
  g.save();
  g.translate(STAGE.width / 2, 230);
  g.scale(scale, scale);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `${big}px ${TITLE_FONT}`;
  g.lineJoin = "round";
  g.lineWidth = 12;
  g.strokeStyle = "#000000";
  g.strokeText(banner.text, 0, 0);
  const grad = g.createLinearGradient(0, -big / 2, 0, big / 2);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.45, banner.color);
  grad.addColorStop(1, shade(banner.color.length === 7 ? banner.color : "#ffd23f", -90));
  g.fillStyle = grad;
  g.fillText(banner.text, 0, 0);
  if (banner.sub) {
    g.font = `56px ${TITLE_FONT}`;
    g.lineWidth = 10;
    g.strokeText(banner.sub, 0, big * 0.85);
    g.fillStyle = "#d4141f";
    g.fillText(banner.sub, 0, big * 0.85);
  }
  g.restore();
}

// ───────────────────────── frame completo ─────────────────────────

export function render(g: CanvasRenderingContext2D, state: GameState) {
  g.save();
  if (state.shake > 0) {
    const s = state.shake * 0.6;
    g.translate(Math.sin(state.tick * 2.3) * s, Math.cos(state.tick * 3.1) * s * 0.6);
  }
  g.drawImage(background(), -20, -20, STAGE.width + 40, STAGE.height + 40);
  drawTorches(g, state.tick);

  // Fatality: el escenario se oscurece
  if (state.phase === "fatality" || (state.fatality && state.phase === "matchOver")) {
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.fillRect(-20, -20, STAGE.width + 40, STAGE.height + 40);
  }

  for (const p of state.particles) if (p.grounded) drawParticle(g, p);

  // El que ataca se dibuja adelante.
  const order = [...state.fighters].sort((a, b) => Number(a.action === "attack") - Number(b.action === "attack"));
  for (const f of order) drawFighter(g, state, f);
  for (const p of state.projectiles) drawProjectile(g, p, state.tick);
  for (const p of state.particles) if (!p.grounded) drawParticle(g, p);
  g.restore();

  drawHud(g, state);
  drawBanner(g, state);
}
