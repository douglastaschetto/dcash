'use client';

import { useCallback, useSyncExternalStore } from 'react';

/*
 * Piggy-bank planning aids the API doesn't persist (allowances, challenges,
 * direct deposit log, seen achievements). They live in this browser only,
 * scoped per user, and every read/write tolerates blocked storage.
 */

export type Frequency = 'weekly' | 'monthly';

export type Allowance = {
  id: string;
  name: string;
  bankId: string;
  amount: number;
  frequency: Frequency;
  /** weekly: 0 (dom) – 6 (sáb) · monthly: 1 – 31 */
  day: number;
  /** ISO date (yyyy-mm-dd) of the last occurrence confirmed or skipped */
  lastHandled: string;
  active: boolean;
  createdAt: string;
};

export type ChallengeType = 'amount' | 'streak';

export type Challenge = {
  id: string;
  title: string;
  type: ChallengeType;
  /** amount: R$ to save · streak: consecutive months */
  target: number;
  bankId: string | null;
  deadline: string | null;
  reward: string;
  rewardAllowance: { amount: number; frequency: Frequency; day: number; bankId: string } | null;
  status: 'active' | 'claimed';
  createdAt: string;
};

export type Movement = { id: string; bankId: string; amount: number; date: string };

const userKey = () => {
  try {
    const u = JSON.parse(localStorage.getItem('dcash:user') || '{}');
    return u.id || u.email || 'me';
  } catch {
    return 'me';
  }
};

const key = (name: string) => `dcash:piggy:${userKey()}:${name}`;
const EVENT = 'dcash:piggy-store';

function read<T>(name: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key(name));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(name: string, value: T) {
  try { localStorage.setItem(key(name), JSON.stringify(value)); } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: name }));
}

/* Snapshots are cached by raw string so useSyncExternalStore gets stable references */
const snapshotCache = new Map<string, { raw: string | null; value: unknown }>();
const serverCache = new Map<string, unknown>();

function snapshot<T>(name: string, fallback: T): T {
  let raw: string | null = null;
  try { raw = localStorage.getItem(key(name)); } catch {}
  const k = key(name);
  const cached = snapshotCache.get(k);
  if (cached && cached.raw === raw) return cached.value as T;
  let value: T = fallback;
  try { if (raw) value = JSON.parse(raw) as T; } catch {}
  snapshotCache.set(k, { raw, value });
  return value;
}

function subscribe(cb: () => void) {
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export function useLocalList<T>(name: string, fallback: T) {
  const value = useSyncExternalStore(
    subscribe,
    () => snapshot(name, fallback),
    () => {
      if (!serverCache.has(name)) serverCache.set(name, fallback);
      return serverCache.get(name) as T;
    },
  );

  const update = useCallback((next: T | ((prev: T) => T)) => {
    const resolved = typeof next === 'function' ? (next as (p: T) => T)(read(name, fallback)) : next;
    write(name, resolved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  return [value, update] as const;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const fromISODate = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/** Occurrences of an allowance after `lastHandled` up to today (oldest first, capped). */
export function pendingOccurrences(a: Allowance, today = new Date()): Date[] {
  if (!a.active) return [];
  const out: Date[] = [];
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const cur = fromISODate(a.lastHandled);
  cur.setDate(cur.getDate() + 1);
  while (cur <= end && out.length < 12) {
    const lastDay = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
    const hit = a.frequency === 'weekly'
      ? cur.getDay() === a.day
      : cur.getDate() === Math.min(a.day, lastDay);
    if (hit) out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const describeSchedule = (frequency: Frequency, day: number) =>
  frequency === 'weekly' ? `Toda ${WEEKDAYS[day]}` : `Dia ${day} de cada mês`;
