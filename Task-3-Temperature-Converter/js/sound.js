/* TEMPORA — optional interface sound engine
 * Generates quiet, synthetic UI tones with the Web Audio API.
 * No audio files or network requests are required.
 * Sound remains disabled until the user explicitly enables it.
 */
(function attachTemporaSound(root) {
  'use strict';

  const AudioContextClass = root.AudioContext || root.webkitAudioContext;
  const SOUND_PRESETS = Object.freeze({
    click:    [{ frequency: 520, duration: 0.045, volume: 0.12, type: 'sine' }],
    select:   [{ frequency: 620, duration: 0.075, volume: 0.11, type: 'sine' }],
    toggle:   [
      { frequency: 440, duration: 0.075, volume: 0.10, type: 'sine' },
      { frequency: 660, delay: 0.065, duration: 0.105, volume: 0.095, type: 'sine' }
    ],
    swap:     [
      { frequency: 740, duration: 0.085, volume: 0.10, type: 'triangle' },
      { frequency: 520, delay: 0.075, duration: 0.11, volume: 0.09, type: 'sine' }
    ],
    navigate: [{ frequency: 380, duration: 0.065, volume: 0.075, type: 'sine' }],
    copy:     [
      { frequency: 660, duration: 0.055, volume: 0.09, type: 'sine' },
      { frequency: 880, delay: 0.07, duration: 0.09, volume: 0.085, type: 'sine' }
    ],
    close:    [
      { frequency: 590, duration: 0.07, volume: 0.075, type: 'sine' },
      { frequency: 390, delay: 0.065, duration: 0.10, volume: 0.07, type: 'sine' }
    ]
  });

  let context = null;
  let masterGain = null;
  let enabled = false;
  let disposed = false;

  function createAudioGraph() {
    if (context || !AudioContextClass || disposed) return Boolean(context);

    try {
      context = new AudioContextClass();
      masterGain = context.createGain();
      masterGain.gain.value = 0.55;
      masterGain.connect(context.destination);
      return true;
    } catch (error) {
      context = null;
      masterGain = null;
      console.warn('[TEMPORA] Interface audio is unavailable in this browser.', error);
      return false;
    }
  }

  function resumeContext() {
    if (!createAudioGraph()) return Promise.resolve(false);
    if (context.state === 'running') return Promise.resolve(true);
    if (typeof context.resume !== 'function') return Promise.resolve(false);

    return context.resume().then(() => context.state === 'running').catch((error) => {
      console.warn('[TEMPORA] Audio could not be started.', error);
      return false;
    });
  }

  function playTone(note, startAt) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const start = startAt + Math.max(0, Number(note.delay) || 0);
    const duration = Math.min(0.35, Math.max(0.025, Number(note.duration) || 0.07));
    const peak = Math.min(0.18, Math.max(0.005, Number(note.volume) || 0.08));
    const frequency = Math.min(1800, Math.max(90, Number(note.frequency) || 440));
    const attack = Math.min(0.012, duration * 0.25);
    const releaseStart = start + Math.max(attack, duration * 0.55);

    oscillator.type = note.type === 'triangle' ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(peak, start + attack);
    envelope.gain.setValueAtTime(peak, releaseStart);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(envelope);
    envelope.connect(masterGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.015);
    oscillator.addEventListener('ended', () => {
      oscillator.disconnect();
      envelope.disconnect();
    }, { once: true });
  }

  function play(name = 'click') {
    if (!enabled || disposed || !createAudioGraph()) return false;
    const preset = SOUND_PRESETS[name] || SOUND_PRESETS.click;

    resumeContext().then((ready) => {
      if (!ready || !enabled || disposed || !context) return;
      const startAt = context.currentTime + 0.012;
      preset.forEach((note) => playTone(note, startAt));
    });
    return true;
  }

  function setEnabled(nextEnabled) {
    enabled = Boolean(nextEnabled);
    if (enabled) {
      // Called from the user's sound-toggle interaction, satisfying browser
      // autoplay policies before any optional interface tone is played.
      resumeContext();
    }
    return enabled;
  }

  function isEnabled() {
    return enabled;
  }

  function destroy() {
    enabled = false;
    disposed = true;
    if (context && context.state !== 'closed') {
      context.close().catch(() => {});
    }
    context = null;
    masterGain = null;
  }

  root.TemporaSound = Object.freeze({ play, setEnabled, isEnabled, destroy });
})(typeof window !== 'undefined' ? window : globalThis);
