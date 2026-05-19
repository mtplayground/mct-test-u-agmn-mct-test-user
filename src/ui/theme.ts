export type ThemeName = 'light' | 'dark';

export interface ThemeStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface ThemeToggleOptions {
  readonly root?: HTMLElement;
  readonly storage?: ThemeStorage | null;
  readonly prefersDark?: () => boolean;
}

export interface ThemeToggleController {
  getTheme: () => ThemeName;
  destroy: () => void;
}

export const THEME_STORAGE_KEY = 'zeroclaw.theme.v1';

export function createThemeToggle(
  button: HTMLButtonElement,
  options: ThemeToggleOptions = {},
): ThemeToggleController {
  const root = options.root ?? document.documentElement;
  const storage = options.storage ?? getBrowserStorage();
  const prefersDark = options.prefersDark ?? getPrefersDarkTheme;
  let currentTheme = resolveInitialTheme(storage, prefersDark);

  const apply = (theme: ThemeName): void => {
    currentTheme = theme;
    applyTheme(root, currentTheme);
    renderThemeButton(button, currentTheme);
  };

  const handleClick = (): void => {
    const nextTheme = getNextTheme(currentTheme);

    writeStoredTheme(storage, nextTheme);
    apply(nextTheme);
  };

  button.type = 'button';
  button.addEventListener('click', handleClick);
  apply(currentTheme);

  return {
    getTheme: () => currentTheme,
    destroy: () => {
      button.removeEventListener('click', handleClick);
    },
  };
}

export function resolveInitialTheme(
  storage: ThemeStorage | null,
  prefersDark: () => boolean,
): ThemeName {
  return readStoredTheme(storage) ?? (prefersDark() ? 'dark' : 'light');
}

export function readStoredTheme(
  storage: ThemeStorage | null,
): ThemeName | null {
  if (storage === null) {
    return null;
  }

  try {
    const value = storage.getItem(THEME_STORAGE_KEY);

    return isThemeName(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredTheme(
  storage: ThemeStorage | null,
  theme: ThemeName,
): void {
  if (storage === null) {
    return;
  }

  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    return;
  }
}

export function applyTheme(root: HTMLElement, theme: ThemeName): void {
  root.dataset.theme = theme;
}

export function getNextTheme(theme: ThemeName): ThemeName {
  return theme === 'dark' ? 'light' : 'dark';
}

function renderThemeButton(button: HTMLButtonElement, theme: ThemeName): void {
  const isDark = theme === 'dark';

  button.textContent = isDark ? 'Dark' : 'Light';
  button.setAttribute('aria-pressed', String(isDark));
  button.setAttribute(
    'aria-label',
    isDark ? 'Switch to light theme' : 'Switch to dark theme',
  );
}

function isThemeName(value: unknown): value is ThemeName {
  return value === 'light' || value === 'dark';
}

function getPrefersDarkTheme(): boolean {
  if (!('matchMedia' in globalThis)) {
    return false;
  }

  return globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getBrowserStorage(): ThemeStorage | null {
  try {
    if (!('localStorage' in globalThis)) {
      return null;
    }

    return globalThis.localStorage;
  } catch {
    return null;
  }
}
