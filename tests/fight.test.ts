import { describe, expect, it } from "vitest";
import {
  ATTACKS,
  FINISH_FRAMES,
  MAX_HP,
  NO_INPUT,
  createGame,
  cpuInput,
  step,
  type GameState,
  type Input,
} from "@/lib/fight/engine";

const press = (input: Partial<Input>): Input => ({ ...NO_INPUT, ...input });

function run(state: GameState, frames: number, p1: Partial<Input> = {}, p2: Partial<Input> = {}) {
  for (let i = 0; i < frames; i++) step(state, [press(p1), press(p2)]);
}

function fightReady(gap = 70) {
  const state = createGame("kaen", "kori", 1);
  while (state.phase !== "fight") run(state, 1);
  state.fighters[0].x = 400;
  state.fighters[1].x = 400 + gap;
  return state;
}

/** Aprieta un botón un cuadro y deja correr el ataque completo. */
function attack(state: GameState, side: 0 | 1, input: Partial<Input>, hold: Partial<Input> = {}) {
  const other = side === 0 ? 1 : 0;
  const inputs: [Partial<Input>, Partial<Input>] = [{}, {}];
  inputs[side] = input;
  inputs[other] = hold;
  run(state, 1, inputs[0], inputs[1]);
  const held: [Partial<Input>, Partial<Input>] = [{}, {}];
  held[other] = hold;
  run(state, 40, held[0], held[1]);
}

describe("motor de pelea", () => {
  it("arranca con la presentación del round y luego permite pelear", () => {
    const state = createGame("kaen", "kori", 1);
    expect(state.phase).toBe("intro");
    expect(state.round).toBe(1);
    run(state, 120);
    expect(state.phase).toBe("fight");
  });

  it("una piña en rango saca vida", () => {
    const state = fightReady();
    attack(state, 0, { punch: true });
    expect(state.fighters[1].hp).toBe(MAX_HP - ATTACKS.punch.damage);
  });

  it("una piña fuera de rango no pega", () => {
    const state = fightReady(250);
    attack(state, 0, { punch: true });
    expect(state.fighters[1].hp).toBe(MAX_HP);
  });

  it("agacharse esquiva la piña alta", () => {
    const state = fightReady();
    attack(state, 0, { punch: true }, { down: true });
    expect(state.fighters[1].hp).toBe(MAX_HP);
  });

  it("bloquear reduce el daño de la patada", () => {
    const state = fightReady();
    attack(state, 0, { kick: true }, { block: true });
    const hp = state.fighters[1].hp;
    expect(hp).toBeLessThan(MAX_HP);
    expect(hp).toBeGreaterThan(MAX_HP - ATTACKS.kick.damage);
  });

  it("la barrida no se bloquea parado pero sí agachado", () => {
    const standing = fightReady();
    attack(standing, 0, { down: true, kick: true }, { block: true });
    expect(standing.fighters[1].hp).toBe(MAX_HP - ATTACKS.sweep.damage);

    const crouching = fightReady();
    attack(crouching, 0, { down: true, kick: true }, { block: true, down: true });
    expect(crouching.fighters[1].hp).toBeGreaterThan(MAX_HP - ATTACKS.sweep.damage);
  });

  it("el gancho derriba al rival", () => {
    const state = fightReady();
    run(state, 1, { down: true, punch: true });
    run(state, 12, { down: true });
    expect(state.fighters[1].action).toBe("knockdown");
    expect(state.fighters[1].hp).toBe(MAX_HP - ATTACKS.uppercut.damage);
  });

  it("el hielo congela y el fuego hace más daño", () => {
    const ice = createGame("kori", "kaen", 1);
    while (ice.phase !== "fight") run(ice, 1);
    ice.fighters[1].x = 700;
    run(ice, 1, { special: true });
    let frozen = false;
    for (let i = 0; i < 80 && !frozen; i++) {
      run(ice, 1);
      frozen = ice.fighters[1].action === "frozen";
    }
    expect(frozen).toBe(true);

    const fire = fightReady(300);
    run(fire, 1, { special: true });
    run(fire, 80);
    expect(fire.fighters[1].hp).toBeLessThan(MAX_HP - 10);
  });

  it("al llegar a 0 de vida termina el round y arranca el siguiente", () => {
    const state = fightReady();
    state.fighters[1].hp = 3;
    attack(state, 0, { punch: true });
    expect(state.phase).toBe("roundOver");
    expect(state.fighters[0].wins).toBe(1);
    run(state, 200);
    expect(state.round).toBe(2);
    expect(state.fighters[1].hp).toBe(MAX_HP);
  });

  it("el último K.O. lleva a FINISH HIM y la fatality cierra la pelea", () => {
    const state = fightReady();
    state.fighters[0].wins = 1;
    state.fighters[1].hp = 3;
    attack(state, 0, { punch: true });
    expect(state.phase).toBe("finish");
    run(state, 80);
    expect(state.fighters[1].action).toBe("dizzy");

    // Abajo, abajo, piña.
    run(state, 3, { down: true });
    run(state, 2);
    run(state, 3, { down: true });
    run(state, 2);
    run(state, 1, { punch: true });
    expect(state.phase).toBe("fatality");
    expect(state.fatality).toBe(true);

    run(state, 400);
    expect(state.phase).toBe("matchOver");
    expect(state.winner).toBe(0);
    expect(state.banner?.sub).toBe("FATALITY");
  });

  it("si no se remata a tiempo, gana igual sin fatality", () => {
    const state = fightReady();
    state.fighters[0].wins = 1;
    state.fighters[1].hp = 3;
    attack(state, 0, { punch: true });
    run(state, FINISH_FRAMES);
    expect(state.phase).toBe("matchOver");
    expect(state.fatality).toBe(false);
  });

  it("por tiempo gana el que tiene más vida", () => {
    const state = fightReady();
    state.fighters[0].hp = 40;
    state.timer = 1;
    run(state, 1);
    expect(state.phase).toBe("roundOver");
    expect(state.fighters[1].wins).toBe(1);
  });

  it("la CPU termina ganándole a un jugador quieto", () => {
    const state = createGame("kaen", "kori", 42);
    for (let i = 0; i < 60 * 60 * 6 && state.phase !== "matchOver"; i++) {
      step(state, [NO_INPUT, cpuInput(state, 1, "dificil")]);
    }
    expect(state.phase).toBe("matchOver");
    expect(state.winner).toBe(1);
  });
});
