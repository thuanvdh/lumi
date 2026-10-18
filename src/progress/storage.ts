import Storage from 'expo-sqlite/kv-store';
import { type SavedSession, type Settings, type Stats, emptyStats, isValidSession } from './progress.ts';

const KEYS = {
  stats: 'lumi.stats.v1',
  session: 'lumi.session.v1',
  settings: 'lumi.settings.v1',
};

function read<T>(key: string): T | null {
  try {
    const raw = Storage.getItemSync(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    Storage.setItemSync(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`storage: failed to save ${key}`, e);
  }
}

export function loadStats(): Stats {
  const s = read<Stats>(KEYS.stats);
  return s && typeof s.solved === 'number' && s.bySize && s.streak ? s : emptyStats();
}

export const saveStats = (stats: Stats) => write(KEYS.stats, stats);

export function loadSession(): SavedSession | null {
  const s = read<unknown>(KEYS.session);
  return isValidSession(s) ? s : null;
}

export const saveSession = (session: SavedSession) => write(KEYS.session, session);

export function clearSession() {
  try {
    Storage.removeItemSync(KEYS.session);
  } catch {
    // Nothing saved — fine.
  }
}

export function loadSettings(): Settings | null {
  const s = read<Settings>(KEYS.settings);
  return s && typeof s.size === 'number' ? s : null;
}

export const saveSettings = (settings: Settings) => write(KEYS.settings, settings);
