const STORAGE_KEY = 'battleship-muted-v1';

export const SOUND_CONFIG = {
    fire: { frequency: 150, endFrequency: 85, duration: 0.1, type: 'square' },
    hit: { frequency: 440, endFrequency: 760, duration: 0.14, type: 'sawtooth' },
    splash: { frequency: 230, endFrequency: 100, duration: 0.18, type: 'sine' },
    sink: { frequency: 240, endFrequency: 70, duration: 0.42, type: 'triangle' },
    win: {
        tones: [
            { frequency: 523, duration: 0.14 },
            { frequency: 784, duration: 0.22 }
        ],
        type: 'sine'
    },
    lose: { frequency: 240, endFrequency: 90, duration: 0.42, type: 'sawtooth' },
    sonar: { frequency: 720, endFrequency: 180, duration: 0.38, type: 'sine' }
};

let muted = false;
let audioContext = null;

try {
    muted = globalThis.localStorage?.getItem(STORAGE_KEY) === 'true';
} catch {
    muted = false;
}

function getAudioContext() {
    if (audioContext) return audioContext;
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) return null;
    try {
        audioContext = new Context();
        return audioContext;
    } catch {
        return null;
    }
}

export function setMuted(value) {
    muted = Boolean(value);
    try {
        globalThis.localStorage?.setItem(STORAGE_KEY, String(muted));
    } catch {
        // Storage may be unavailable in private browsing.
    }
}

export function isMuted() {
    return muted;
}

export function playSound(name) {
    if (muted) return;
    const config = SOUND_CONFIG[name];
    const context = getAudioContext();
    if (!config || !context) return;

    try {
        const tones = config.tones ?? [config];
        let offset = context.currentTime;
        tones.forEach((tone) => {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            const duration = tone.duration ?? config.duration;
            oscillator.type = tone.type ?? config.type;
            oscillator.frequency.setValueAtTime(tone.frequency, offset);
            if (tone.endFrequency || config.endFrequency) {
                oscillator.frequency.exponentialRampToValueAtTime(
                    tone.endFrequency ?? config.endFrequency,
                    offset + duration
                );
            }
            gain.gain.setValueAtTime(0.0001, offset);
            gain.gain.exponentialRampToValueAtTime(0.14, offset + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, offset + duration);
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start(offset);
            oscillator.stop(offset + duration);
            offset += duration + (config.gap ?? 0.025);
        });
        if (context.state === 'suspended') context.resume().catch(() => {});
    } catch {
        // Audio is enhancement-only and must never interrupt gameplay.
    }
}
