// Efectos de sonido sintetizados (sin archivos) y voz del locutor con speechSynthesis.

import type { GameEvent } from "./engine";

export class FightAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  /** Debe llamarse desde un gesto del usuario (click/tecla) para que el navegador habilite el audio. */
  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted && typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  }

  play(events: GameEvent[]) {
    if (this.muted) return;
    for (const e of events) {
      switch (e.type) {
        case "hit":
          this.noise(e.heavy ? 0.22 : 0.12, e.heavy ? 900 : 1600, e.heavy ? 0.9 : 0.6);
          this.tone(e.heavy ? 70 : 110, 40, e.heavy ? 0.25 : 0.12, "sine", 0.8);
          break;
        case "block":
          this.tone(1400, 900, 0.06, "square", 0.15);
          this.noise(0.05, 4000, 0.2);
          break;
        case "swing":
          this.noise(0.08, 2500, 0.12);
          break;
        case "special":
          if (e.element === "fuego") {
            this.noise(0.4, 700, 0.5);
            this.tone(180, 420, 0.3, "sawtooth", 0.15);
          } else {
            this.tone(1200, 2400, 0.25, "triangle", 0.2);
            this.tone(1800, 3000, 0.2, "sine", 0.12, 0.05);
          }
          break;
        case "freeze":
          this.tone(2600, 1300, 0.3, "triangle", 0.2);
          break;
        case "land":
          this.tone(90, 40, 0.2, "sine", 0.6);
          this.noise(0.15, 500, 0.3);
          break;
        case "explode":
          this.noise(0.9, 600, 1);
          this.tone(60, 25, 0.8, "sine", 0.9);
          break;
        case "fatalityStart":
          if (e.element === "fuego") this.noise(1.2, 900, 0.4);
          else this.tone(400, 2000, 1, "triangle", 0.15);
          break;
        case "round":
          this.say(`Round ${e.round}`);
          break;
        case "fight":
          this.say("Fight!");
          break;
        case "finish":
          this.say("Finish him!");
          break;
        case "fatality":
          this.tone(55, 50, 1.4, "sawtooth", 0.25);
          this.say("Fatality!");
          break;
        case "wins":
          this.say(`${e.name.toLowerCase()} wins`);
          break;
        case "ko":
          this.tone(200, 50, 0.6, "sawtooth", 0.2);
          break;
        case "timeout":
          this.tone(600, 600, 0.3, "square", 0.12);
          break;
      }
    }
  }

  private tone(from: number, to: number, duration: number, type: OscillatorType, volume: number, delay = 0) {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  private noise(duration: number, cutoff: number, volume: number) {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const length = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
  }

  private say(text: string) {
    if (typeof speechSynthesis === "undefined") return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.85;
    u.pitch = 0.4;
    u.volume = 1;
    speechSynthesis.speak(u);
  }

  dispose() {
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    void this.ctx?.close();
    this.ctx = null;
  }
}
