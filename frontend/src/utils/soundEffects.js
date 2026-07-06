// Sound effects utility using Web Audio API
// Synthesizes sounds in code, no external mp3 assets needed.

let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// Toggle setting to mute/unmute
let soundsEnabled = true;

export const setSoundsEnabled = (enabled) => {
  soundsEnabled = enabled;
  localStorage.setItem('sounds_enabled', enabled ? 'true' : 'false');
};

export const getSoundsEnabled = () => {
  const saved = localStorage.getItem('sounds_enabled');
  if (saved !== null) {
    soundsEnabled = saved === 'true';
  }
  return soundsEnabled;
};

// Play a realistic dual-oscillator referee whistle
export const playWhistleSound = () => {
  if (!getSoundsEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Main high pitch whistle oscillator
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1000, now); // 1000 Hz
    osc1.frequency.linearRampToValueAtTime(1050, now + 0.1);
    osc1.frequency.linearRampToValueAtTime(980, now + 0.35);
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1025, now); // slightly detuned for beating effect
    osc2.frequency.linearRampToValueAtTime(1075, now + 0.1);
    osc2.frequency.linearRampToValueAtTime(1005, now + 0.35);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05); // quick fade in
    gainNode.gain.setValueAtTime(0.2, now + 0.25);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4); // fade out
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  } catch (e) {
    console.warn("AudioContext failed or blocked:", e);
  }
};

// Play a bright arpeggiated chime for a Goal / Success
export const playGoalChime = () => {
  if (!getSoundsEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Notes of a Major chord (C4, E4, G4, C5)
    const notes = [261.63, 329.63, 392.00, 523.25];
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08); // Arpeggiated trigger
      
      const noteStart = now + idx * 0.08;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.setValueAtTime(0, noteStart);
      gainNode.gain.linearRampToValueAtTime(0.15, noteStart + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.6);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(noteStart);
      osc.stop(noteStart + 0.65);
    });
  } catch (e) {
    console.warn("AudioContext failed or blocked:", e);
  }
};

// Play a soft interface click sound
export const playClickSound = () => {
  if (!getSoundsEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(1, now + 0.05);
    
    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.06);
  } catch (e) {
    console.warn("AudioContext failed or blocked:", e);
  }
};

// Trigger mobile haptic feedback if supported
export const triggerHapticFeedback = (duration = 40) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(duration);
    } catch (e) {
      // Ignore vibration failures (often happens in desktop or blocked iframe)
    }
  }
};
