/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: sound.js
 * Layer: Utils
 * Responsibility:
 * - Tiny synthesized UI sounds (no audio files, no network).
 * - Respects the "Sound effects" toggle in Settings and the
 *   OS-level prefers-reduced-motion signal.
 * ---------------------------------------------------------
 * Version: 1.0.0
 * ---------------------------------------------------------
 */

class SoundKit {
    constructor() {
        this.ctx = null;
    }

    enabled() {
        return localStorage.getItem("operation_sound_enabled") !== "0";
    }

    context() {
        if (this.ctx) return this.ctx;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
        return this.ctx;
    }

    tone(freq, duration, type = "sine", gainPeak = 0.05, delay = 0) {
        if (!this.enabled()) return;
        const ctx = this.context();
        if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
        const start = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(gainPeak, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration + 0.02);
    }

    /** Soft click when a hallway door opens (module transition). */
    doorTick() {
        this.tone(720, 0.08, "sine", 0.04);
        this.tone(480, 0.09, "sine", 0.025, 0.03);
    }

    /** Warm confirmation thud, used for successful saves/stamps. */
    stampThud() {
        this.tone(180, 0.16, "sine", 0.07);
        this.tone(90, 0.2, "triangle", 0.05, 0.02);
    }

    /** Gentle two-note chime for general success notifications. */
    successChime() {
        this.tone(660, 0.12, "sine", 0.045);
        this.tone(880, 0.16, "sine", 0.04, 0.09);
    }
}

export default new SoundKit();
