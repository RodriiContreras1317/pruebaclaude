"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { FightAudio } from "@/lib/fight/audio";
import {
  CHARACTERS,
  NO_INPUT,
  STAGE,
  cpuInput,
  createGame,
  step,
  type CharacterId,
  type Difficulty,
  type GameState,
  type Input,
} from "@/lib/fight/engine";
import { FightRenderer, TITLE_FONT, drawPortrait } from "@/lib/fight/render";

type Mode = "cpu" | "versus";

interface Config {
  mode: Mode;
  p1: CharacterId;
  p2: CharacterId;
  difficulty: Difficulty;
}

type KeyMap = Record<keyof Input, string[]>;

const P1_KEYS: KeyMap = {
  left: ["KeyA"],
  right: ["KeyD"],
  up: ["KeyW"],
  down: ["KeyS"],
  punch: ["KeyF"],
  kick: ["KeyG"],
  block: ["KeyR"],
  special: ["KeyT"],
};

const P2_KEYS: KeyMap = {
  left: ["ArrowLeft"],
  right: ["ArrowRight"],
  up: ["ArrowUp"],
  down: ["ArrowDown"],
  punch: ["KeyK", "Numpad1"],
  kick: ["KeyL", "Numpad2"],
  block: ["KeyI", "Numpad0"],
  special: ["KeyO", "Numpad3"],
};

const GAME_CODES = new Set([...Object.values(P1_KEYS).flat(), ...Object.values(P2_KEYS).flat(), "Space"]);
const STEP_MS = 1000 / 60;

function readKeys(keys: Set<string>, ...maps: KeyMap[]): Input {
  const input = { ...NO_INPUT };
  for (const map of maps) {
    for (const action of Object.keys(map) as (keyof Input)[]) {
      if (map[action].some((code) => keys.has(code))) input[action] = true;
    }
  }
  return input;
}

const OTHER: Record<CharacterId, CharacterId> = { kaen: "kori", kori: "kaen" };

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: "facil", label: "Fácil" },
  { id: "normal", label: "Normal" },
  { id: "dificil", label: "Difícil" },
];

export function FightGame() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const configRef = useRef<Config | null>(null);
  const keysRef = useRef(new Set<string>());
  // Teclas apretadas desde el último paso: así un toque rapidísimo (bajar y soltar entre dos cuadros) no se pierde.
  const tappedRef = useRef(new Set<string>());
  const touchRef = useRef<Input>({ ...NO_INPUT });
  const pausedRef = useRef(false);
  const audioRef = useRef<FightAudio | null>(null);

  const [config, setConfig] = useState<Config | null>(null);
  const [mode, setMode] = useState<Mode>("cpu");
  const [p1, setP1] = useState<CharacterId>("kaen");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [paused, setPaused] = useState(false);
  const [matchOver, setMatchOver] = useState(false);
  const [muted, setMuted] = useState(false);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    const update = () => setTouch(query.matches);
    update();
    query.addEventListener("change", update);
    audioRef.current = new FightAudio();
    void document.fonts?.load(`40px ${TITLE_FONT}`).catch(() => {});
    return () => {
      query.removeEventListener("change", update);
      audioRef.current?.dispose();
    };
  }, []);

  const togglePause = useCallback(() => {
    if (!gameRef.current || gameRef.current.phase === "matchOver") return;
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  }, []);

  const rematch = useCallback(() => {
    if (!config) return;
    gameRef.current = createGame(config.p1, config.p2);
    pausedRef.current = false;
    setPaused(false);
    setMatchOver(false);
  }, [config]);

  const backToMenu = useCallback(() => {
    gameRef.current = null;
    configRef.current = null;
    pausedRef.current = false;
    setPaused(false);
    setMatchOver(false);
    setConfig(null);
  }, []);

  // Teclado
  useEffect(() => {
    const keys = keysRef.current;
    const tapped = tappedRef.current;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!config) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      if (GAME_CODES.has(e.code)) e.preventDefault();
      if (e.code === "Escape" || e.code === "KeyP") {
        togglePause();
        return;
      }
      if ((e.code === "Enter" || e.code === "NumpadEnter") && gameRef.current?.phase === "matchOver") {
        rematch();
        return;
      }
      audioRef.current?.unlock();
      keys.add(e.code);
      if (!e.repeat) tapped.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
    const onBlur = () => keys.clear();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      keys.clear();
      tapped.clear();
    };
  }, [config, togglePause, rematch]);

  // Bucle principal: lógica a 60 pasos fijos por segundo, dibujo en cada frame.
  // Sin partida en curso, dos CPUs pelean de fondo detrás del menú.
  useEffect(() => {
    const canvas = canvasRef.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = STAGE.width * dpr;
    canvas.height = STAGE.height * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const renderer = new FightRenderer(g, dpr);
    let demo = createGame("kaen", "kori", 7);
    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const frame = (now: number) => {
      acc += Math.min(100, now - last);
      last = now;
      if (pausedRef.current) acc = 0;
      const game = gameRef.current;
      const config = configRef.current;
      while (acc >= STEP_MS) {
        acc -= STEP_MS;
        if (game && config) {
          const keys = new Set([...keysRef.current, ...tappedRef.current]);
          tappedRef.current.clear();
          const touchInput = touchRef.current;
          let in1: Input;
          let in2: Input;
          if (config.mode === "cpu") {
            in1 = merge(readKeys(keys, P1_KEYS, P2_KEYS), touchInput);
            in2 = cpuInput(game, 1, config.difficulty);
          } else {
            in1 = merge(readKeys(keys, P1_KEYS), touchInput);
            in2 = readKeys(keys, P2_KEYS);
          }
          const before = game.phase;
          step(game, [in1, in2]);
          audioRef.current?.play(game.events);
          renderer.onEvents(game.events, game);
          if (game.phase !== before && game.phase === "matchOver") setMatchOver(true);
        } else {
          step(demo, [cpuInput(demo, 0, "normal"), cpuInput(demo, 1, "normal")]);
          renderer.onEvents(demo.events, demo);
          if (demo.phase === "matchOver" && demo.phaseFrame > 240) demo = createGame("kaen", "kori", demo.seed);
        }
      }
      renderer.render(game && config ? game : demo);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const start = () => {
    audioRef.current?.unlock();
    const next = { mode, p1, p2: OTHER[p1], difficulty };
    configRef.current = next;
    gameRef.current = createGame(next.p1, next.p2);
    pausedRef.current = false;
    setPaused(false);
    setMatchOver(false);
    setConfig(next);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    audioRef.current?.setMuted(next);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrapperRef.current?.requestFullscreen?.();
  };

  const touchButton = (key: keyof Input) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      audioRef.current?.unlock();
      touchRef.current = { ...touchRef.current, [key]: true };
    },
    onPointerUp: () => (touchRef.current = { ...touchRef.current, [key]: false }),
    onPointerCancel: () => (touchRef.current = { ...touchRef.current, [key]: false }),
    onContextMenu: (e: ReactMouseEvent) => e.preventDefault(),
  });

  return (
    <div className="space-y-4">
      {/* Tipografía de los carteles del juego (FIGHT!, FATALITY…); solo la usa esta página. */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&display=swap" precedence="default" />
      <div
        ref={wrapperRef}
        className="relative overflow-hidden rounded-2xl bg-black shadow-xl ring-1 ring-black/10 [&:fullscreen]:flex [&:fullscreen]:items-center [&:fullscreen]:justify-center [&:fullscreen]:rounded-none"
      >
        <div className="relative aspect-video w-full [:fullscreen_&]:max-h-dvh [:fullscreen_&]:w-auto [:fullscreen_&]:h-dvh">
          <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-label="Juego de pelea" />

          {!config && (
            <Menu
              mode={mode}
              setMode={setMode}
              p1={p1}
              setP1={setP1}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              onStart={start}
            />
          )}

          {config && paused && (
            <Overlay>
              <p className="font-[Anton,Impact,sans-serif] text-5xl tracking-wide text-amber-300 md:text-7xl">PAUSA</p>
              <div className="flex gap-3">
                <OverlayButton onClick={togglePause}>Seguir</OverlayButton>
                <OverlayButton onClick={backToMenu} secondary>
                  Menú
                </OverlayButton>
              </div>
            </Overlay>
          )}

          {config && matchOver && (
            <div className="absolute inset-x-0 bottom-4 flex justify-center gap-3 md:bottom-8">
              <OverlayButton onClick={rematch}>Revancha</OverlayButton>
              <OverlayButton onClick={backToMenu} secondary>
                Menú
              </OverlayButton>
            </div>
          )}

          {config && (
            <div className="absolute top-14 right-2 flex gap-1.5 md:top-20 md:right-4">
              <HudButton onClick={togglePause} label={paused ? "Seguir" : "Pausa"}>
                {paused ? "▶" : "❚❚"}
              </HudButton>
              <HudButton onClick={toggleMute} label={muted ? "Activar sonido" : "Silenciar"}>
                {muted ? "🔇" : "🔊"}
              </HudButton>
              <HudButton onClick={toggleFullscreen} label="Pantalla completa">
                ⛶
              </HudButton>
            </div>
          )}
        </div>
      </div>

      {config && touch && (
        <div className="flex select-none items-center justify-between gap-4 touch-none">
          <div className="grid grid-cols-3 grid-rows-3 gap-1.5">
            <span />
            <PadButton {...touchButton("up")}>▲</PadButton>
            <span />
            <PadButton {...touchButton("left")}>◀</PadButton>
            <span />
            <PadButton {...touchButton("right")}>▶</PadButton>
            <span />
            <PadButton {...touchButton("down")}>▼</PadButton>
            <span />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <PadButton {...touchButton("punch")} className="bg-red-600 text-white">Piña</PadButton>
            <PadButton {...touchButton("kick")} className="bg-amber-500 text-slate-900">Patada</PadButton>
            <PadButton {...touchButton("block")} className="bg-slate-600 text-white">Bloq.</PadButton>
            <PadButton {...touchButton("special")} className="bg-sky-500 text-white">Esp.</PadButton>
          </div>
        </div>
      )}

      <Controls mode={config?.mode ?? mode} />
    </div>
  );
}

function merge(a: Input, b: Input): Input {
  const out = { ...a };
  for (const k of Object.keys(out) as (keyof Input)[]) out[k] = a[k] || b[k];
  return out;
}

function Menu(props: {
  mode: Mode;
  setMode: (m: Mode) => void;
  p1: CharacterId;
  setP1: (c: CharacterId) => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  onStart: () => void;
}) {
  const { mode, setMode, p1, setP1, difficulty, setDifficulty, onStart } = props;
  return (
    <Overlay>
      <div className="text-center">
        <h2 className="bg-gradient-to-b from-amber-200 via-amber-400 to-red-700 bg-clip-text font-[Anton,Impact,sans-serif] text-4xl tracking-wider text-transparent md:text-7xl">
          COMBATE FINAL
        </h2>
        <p className="mt-1 text-xs text-slate-300 md:text-sm">Elegí tu luchador</p>
      </div>

      <div className="flex gap-3 md:gap-5">
        {(Object.keys(CHARACTERS) as CharacterId[]).map((id) => {
          const ch = CHARACTERS[id];
          const selected = p1 === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setP1(id)}
              aria-pressed={selected}
              className="group flex w-28 flex-col items-center gap-1 rounded-xl border-2 border-white/15 bg-black/40 p-2 transition aria-pressed:border-amber-400 aria-pressed:bg-white/10 md:w-40 md:p-3"
            >
              <Portrait char={id} />
              <span className="font-[Anton,Impact,sans-serif] text-lg tracking-wide text-white md:text-2xl">{ch.name}</span>
              <span className="text-[10px] text-slate-300 md:text-xs">{ch.specialName}</span>
              {mode === "versus" && (
                <span className="mt-0.5 rounded bg-white/10 px-1.5 text-[10px] font-semibold text-amber-300">{selected ? "J1" : "J2"}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { id: "cpu", label: "1 jugador" },
            { id: "versus", label: "2 jugadores" },
          ]}
        />
        {mode === "cpu" && <Segmented value={difficulty} onChange={setDifficulty} options={DIFFICULTIES} />}
      </div>

      <OverlayButton onClick={onStart}>¡A pelear!</OverlayButton>
    </Overlay>
  );
}

function Portrait({ char }: { char: CharacterId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    const size = 96;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = size * dpr;
    c.height = size * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPortrait(g, char, size / 2, size / 2, size / 2 - 2);
  }, [char]);
  return <canvas ref={ref} className="size-12 md:size-20" aria-hidden="true" />;
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <div className="inline-flex rounded-lg bg-white/10 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-200 aria-pressed:bg-amber-400 aria-pressed:text-slate-900 md:px-3 md:text-sm"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 p-3 backdrop-blur-[2px] md:gap-6">
      {children}
    </div>
  );
}

function OverlayButton({ secondary, ...props }: ComponentProps<"button"> & { secondary?: boolean }) {
  return (
    <button
      type="button"
      className={
        secondary
          ? "rounded-lg border border-white/30 bg-black/50 px-4 py-2 text-sm font-semibold text-white hover:bg-black/70 md:px-6 md:text-base"
          : "rounded-lg bg-gradient-to-b from-amber-300 to-red-600 px-5 py-2 font-[Anton,Impact,sans-serif] text-lg tracking-wider text-white shadow-lg ring-1 ring-black/40 hover:brightness-110 md:px-8 md:text-2xl"
      }
      {...props}
    />
  );
}

function HudButton({ label, ...props }: ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-md bg-black/50 text-xs text-white hover:bg-black/70"
      {...props}
    />
  );
}

function PadButton({ className = "bg-slate-800 text-white", ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={`grid size-14 place-items-center rounded-xl text-sm font-bold shadow active:scale-95 active:brightness-125 ${className}`}
      {...props}
    />
  );
}

const CONTROL_ROWS: { label: string; p1: string; p2: string }[] = [
  { label: "Moverse / saltar / agacharse", p1: "W A S D", p2: "Flechas" },
  { label: "Piña", p1: "F", p2: "K" },
  { label: "Patada", p1: "G", p2: "L" },
  { label: "Bloquear", p1: "R", p2: "I" },
  { label: "Especial (proyectil)", p1: "T", p2: "O" },
];

function Controls({ mode }: { mode: Mode }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Controles</h2>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="py-1 font-medium">Acción</th>
              <th className="py-1 font-medium">{mode === "cpu" ? "Teclado" : "Jugador 1"}</th>
              <th className="py-1 font-medium">{mode === "cpu" ? "Alternativa" : "Jugador 2"}</th>
            </tr>
          </thead>
          <tbody>
            {CONTROL_ROWS.map((row) => (
              <tr key={row.label} className="border-t border-slate-100">
                <td className="py-1.5 text-slate-600">{row.label}</td>
                <td className="py-1.5"><Kbd>{row.p1}</Kbd></td>
                <td className="py-1.5"><Kbd>{row.p2}</Kbd></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-slate-500">
          <Kbd>Esc</Kbd> o <Kbd>P</Kbd> pausa · <Kbd>Enter</Kbd> revancha
        </p>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Golpes</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
          <li><b className="text-slate-900">Gancho:</b> abajo + piña. Lanza al rival por el aire.</li>
          <li><b className="text-slate-900">Barrida:</b> abajo + patada. Solo se bloquea agachado.</li>
          <li><b className="text-slate-900">Patada voladora:</b> patada o piña en el aire.</li>
          <li><b className="text-slate-900">Especiales:</b> Kaen tira una bola de fuego; Kori, una lanza de hielo que congela. Agachate para esquivarlos.</li>
          <li>
            <b className="text-red-700">Fatality:</b> cuando aparece <i>FINISH HIM!</i>, apretá{" "}
            <Kbd>abajo</Kbd> <Kbd>abajo</Kbd> <Kbd>piña</Kbd>.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-xs text-slate-700">{children}</kbd>
  );
}
