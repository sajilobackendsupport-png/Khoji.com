/**
 * Alert Sound and Browser Notification Engine for Khoji Emergency System
 * Utilizes Web Audio API to synthesize crystal-clear emergency sirens and alerts without external asset dependencies.
 */

class SoundEngine {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private activeOscillators: OscillatorNode[] = [];
  private activeGainNodes: GainNode[] = [];
  private sirenInterval: any = null;
  private isSirenPlaying: boolean = false;

  constructor() {
    // Lazy AudioContext initialization on first user interaction
    if (typeof window !== "undefined") {
      const storedMute = localStorage.getItem("khoji_sound_muted");
      this.isMuted = storedMute === "true";
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch((e) => console.warn("AudioContext resume failed:", e));
    }
    return this.audioCtx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem("khoji_sound_muted", muted ? "true" : "false");
    if (muted) {
      this.stopSiren();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Plays a loud, pulsing dual-tone emergency siren
   */
  public playEmergencySiren(durationSeconds: number = 8) {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    // Stop any existing siren first
    this.stopSiren();
    this.isSirenPlaying = true;

    try {
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.3, ctx.currentTime);
      masterGain.connect(ctx.destination);
      this.activeGainNodes.push(masterGain);

      let step = 0;
      const playPulse = () => {
        if (!this.isSirenPlaying || this.isMuted) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Alternating high/low piercing frequency (960Hz / 770Hz ambulance/police warble)
        const freq = step % 2 === 0 ? 960 : 770;
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        // Siren envelope
        gain.gain.setValueAtTime(0.01, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.38);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);

        this.activeOscillators.push(osc);
        step++;
      };

      playPulse();
      this.sirenInterval = setInterval(playPulse, 420);

      // Auto-stop after specified duration if not stopped manually
      if (durationSeconds > 0) {
        setTimeout(() => {
          this.stopSiren();
        }, durationSeconds * 1000);
      }
    } catch (err) {
      console.warn("Failed to play emergency siren:", err);
    }
  }

  /**
   * Plays a quick notification chime (e.g. for status changes, alerts)
   */
  public playAlertChime() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "triangle";

      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.3); // D6

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.2);

      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn("Chime failed:", e);
    }
  }

  /**
   * Stops any currently sounding siren
   */
  public stopSiren() {
    this.isSirenPlaying = false;
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    });
    this.activeGainNodes.forEach((g) => {
      try {
        g.disconnect();
      } catch {}
    });
    this.activeOscillators = [];
    this.activeGainNodes = [];
  }

  public isPlaying(): boolean {
    return this.isSirenPlaying;
  }
}

export const soundEngine = new SoundEngine();

/**
 * Trigger browser native system notification if permitted
 */
export async function sendBrowserNotification(title: string, body: string, icon?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  try {
    if (Notification.permission === "granted") {
      const notif = new Notification(title, {
        body,
        icon: icon || "/favicon.ico",
        requireInteraction: true,
        tag: "khoji-emergency-alert",
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        new Notification(title, {
          body,
          icon: icon || "/favicon.ico",
          requireInteraction: true,
        });
      }
    }
  } catch (err) {
    console.warn("Browser notification error:", err);
  }
}

/**
 * Request notification permission explicitly
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  try {
    const perm = await Notification.requestPermission();
    return perm === "granted";
  } catch {
    return false;
  }
}
