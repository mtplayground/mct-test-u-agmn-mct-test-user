import explosionClipUrl from './clips/explosion.ogg?url';
import flagClipUrl from './clips/flag.ogg?url';
import revealClipUrl from './clips/reveal.ogg?url';
import winClipUrl from './clips/win.ogg?url';

export type SfxName = 'reveal' | 'flag' | 'win' | 'explosion';

export interface SfxStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface SfxControllerOptions {
  readonly storage?: SfxStorage | null;
}

export interface SfxController {
  getMuted: () => boolean;
  setMuted: (muted: boolean) => void;
  play: (name: SfxName) => void;
  destroy: () => void;
}

type AudioContextConstructor = new () => AudioContext;

export const SFX_MUTED_STORAGE_KEY = 'zeroclaw.sfxMuted.v1';

const CLIP_URLS: Record<SfxName, string> = {
  reveal: revealClipUrl,
  flag: flagClipUrl,
  win: winClipUrl,
  explosion: explosionClipUrl,
};

const CLIP_VOLUMES: Record<SfxName, number> = {
  reveal: 0.22,
  flag: 0.22,
  win: 0.28,
  explosion: 0.32,
};

export function createSfxController(
  button: HTMLButtonElement,
  options: SfxControllerOptions = {},
): SfxController {
  const storage = options.storage ?? getBrowserStorage();
  let muted = readStoredMuted(storage) ?? true;
  let destroyed = false;
  let audioContext: AudioContext | null = null;
  const buffers = new Map<SfxName, Promise<AudioBuffer | null>>();

  const render = (): void => {
    button.textContent = muted ? 'Sound off' : 'Sound on';
    button.setAttribute('aria-pressed', String(!muted));
    button.setAttribute(
      'aria-label',
      muted ? 'Enable sound effects' : 'Mute sound effects',
    );
  };

  const ensureAudioContext = (): AudioContext | null => {
    if (audioContext !== null) {
      return audioContext;
    }

    const AudioContextCtor = getAudioContextConstructor();

    if (AudioContextCtor === null) {
      return null;
    }

    audioContext = new AudioContextCtor();

    return audioContext;
  };

  const setMuted = (nextMuted: boolean): void => {
    muted = nextMuted;
    writeStoredMuted(storage, muted);
    render();

    if (!muted) {
      void ensureAudioContext()
        ?.resume()
        .catch(() => undefined);
    }
  };

  const handleClick = (): void => {
    setMuted(!muted);
  };

  const loadBuffer = (name: SfxName): Promise<AudioBuffer | null> => {
    const existing = buffers.get(name);

    if (existing !== undefined) {
      return existing;
    }

    const audioContextForClip = ensureAudioContext();

    if (audioContextForClip === null) {
      return Promise.resolve(null);
    }

    const bufferPromise = fetch(CLIP_URLS[name])
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load sound effect ${name}.`);
        }

        return response.arrayBuffer();
      })
      .then((arrayBuffer) => audioContextForClip.decodeAudioData(arrayBuffer))
      .catch(() => null);

    buffers.set(name, bufferPromise);

    return bufferPromise;
  };

  const play = (name: SfxName): void => {
    if (destroyed || muted) {
      return;
    }

    const audioContextForPlayback = ensureAudioContext();

    if (audioContextForPlayback === null) {
      return;
    }

    void audioContextForPlayback.resume().catch(() => undefined);
    void loadBuffer(name).then((buffer) => {
      if (destroyed || muted || buffer === null) {
        return;
      }

      const source = audioContextForPlayback.createBufferSource();
      const gain = audioContextForPlayback.createGain();

      source.buffer = buffer;
      gain.gain.value = CLIP_VOLUMES[name];
      source.connect(gain);
      gain.connect(audioContextForPlayback.destination);
      source.start();
    });
  };

  button.type = 'button';
  button.addEventListener('click', handleClick);
  render();

  return {
    getMuted: () => muted,
    setMuted,
    play,
    destroy: () => {
      destroyed = true;
      button.removeEventListener('click', handleClick);
      void audioContext?.close().catch(() => undefined);
      buffers.clear();
    },
  };
}

export function readStoredMuted(storage: SfxStorage | null): boolean | null {
  if (storage === null) {
    return null;
  }

  try {
    const value = storage.getItem(SFX_MUTED_STORAGE_KEY);

    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    return null;
  } catch {
    return null;
  }
}

export function writeStoredMuted(
  storage: SfxStorage | null,
  muted: boolean,
): void {
  if (storage === null) {
    return;
  }

  try {
    storage.setItem(SFX_MUTED_STORAGE_KEY, String(muted));
  } catch {
    return;
  }
}

function getAudioContextConstructor(): AudioContextConstructor | null {
  const audioConstructors = globalThis as unknown as {
    readonly AudioContext?: AudioContextConstructor;
    readonly webkitAudioContext?: AudioContextConstructor;
  };

  return (
    audioConstructors.AudioContext ??
    audioConstructors.webkitAudioContext ??
    null
  );
}

function getBrowserStorage(): SfxStorage | null {
  try {
    if (!('localStorage' in globalThis)) {
      return null;
    }

    return globalThis.localStorage;
  } catch {
    return null;
  }
}
