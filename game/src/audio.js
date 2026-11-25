// Sound effects, synthesised with WebAudio only — no audio files, no
// network. The context is created lazily on the first sound (browsers block
// audio before a gesture) and every call is guarded, so a headless run or a
// blocked context never breaks the game.

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context !== null) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(frequency, duration, type, gain, when = 0) {
    const ctx = ensure();
    if (ctx === null || muted) return;
    try {
      if (ctx.state === 'suspended') void ctx.resume();
      const oscillator = ctx.createOscillator();
      const envelope = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      const start = ctx.currentTime + when;
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(gain, start + 0.01);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(envelope).connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.05);
    } catch {
      // Sound is garnish: never let it stop the game.
    }
  }

  function noise(duration, gain, frequency) {
    const ctx = ensure();
    if (ctx === null || muted) return;
    try {
      if (ctx.state === 'suspended') void ctx.resume();
      const length = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = frequency;
      const envelope = ctx.createGain();
      envelope.gain.setValueAtTime(gain, ctx.currentTime);
      envelope.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      source.connect(filter).connect(envelope).connect(ctx.destination);
      source.start();
    } catch {
      // Sound is garnish: never let it stop the game.
    }
  }

  return {
    /** The chop tick: a short woody knock, once per chop step. */
    chop() {
      noise(0.06, 0.25, 1200);
    },
    /** A chop finishes: a firm thock. */
    chopDone() {
      tone(180, 0.12, 'triangle', 0.3);
      noise(0.05, 0.2, 900);
    },
    /** An item drops into a wok: a sizzle burst. */
    place() {
      noise(0.25, 0.2, 4000);
    },
    /** A wok finishes cooking: a bright ding. */
    cookDone() {
      tone(880, 0.15, 'sine', 0.25);
      tone(1318, 0.2, 'sine', 0.2, 0.09);
    },
    /** A dish lands on the plate: a soft tap. */
    plate() {
      tone(520, 0.08, 'triangle', 0.25);
    },
    /** A dish is served: a happy two-note ding. */
    serve() {
      tone(659, 0.14, 'sine', 0.3);
      tone(988, 0.22, 'sine', 0.3, 0.11);
    },
    /** Something went wrong: a low buzz. */
    buzz() {
      tone(140, 0.18, 'square', 0.12);
    },
    /** A ticket expired: a sad two-note fall. */
    missed() {
      tone(392, 0.18, 'sine', 0.25);
      tone(262, 0.3, 'sine', 0.25, 0.14);
    },
    setMuted(value) {
      muted = value;
    },
    isMuted() {
      return muted;
    },
  };
}
