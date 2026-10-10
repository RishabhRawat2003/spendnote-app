import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

import type { Category, Settings, Transaction } from '@/types';

const DEV_API_PORT = 4000;
const TIMEOUT_MS = 15_000;

/**
 * `EXPO_PUBLIC_API_URL` wins when set (required for standalone builds). In development the server is
 * assumed to run on the same computer as Metro, so the phone reaches it through the same IP.
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
  return `http://${host}:${DEV_API_PORT}`;
}

export const API_URL = resolveBaseUrl();

export class ApiError extends Error {
  constructor(
    message: string,
    /** 0 means the server couldn't be reached. */
    readonly status: number,
    readonly fieldErrors: Record<string, string[] | undefined> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}

// ---------------------------------------------------------------------------
// Session token
// ---------------------------------------------------------------------------

export interface ApiUser {
  id: string;
  name: string;
  email: string;
}

const SESSION_KEY = 'spendnote.session';

interface StoredSession {
  token: string;
  user: ApiUser;
}

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const session = {
  async load(): Promise<StoredSession | null> {
    try {
      const raw = await SecureStore.getItemAsync(SESSION_KEY);
      const stored = raw ? (JSON.parse(raw) as StoredSession) : null;
      token = stored?.token ?? null;
      return stored;
    } catch {
      return null;
    }
  },
  async save(stored: StoredSession) {
    token = stored.token;
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(stored));
  },
  async clear() {
    token = null;
    await SecureStore.deleteItemAsync(SESSION_KEY);
  },
};

/** Called when the server rejects the token, so the app can sign out. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

type Query = Record<string, string | number | undefined>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
}

async function request<T>(path: string, { method = 'GET', body, query }: RequestOptions = {}): Promise<T> {
  const params = Object.entries(query ?? {})
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  const url = `${API_URL}${path}${params ? `?${params}` : ''}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(`Can’t reach the SpendNote server (${API_URL}). Check that it’s running and reachable.`, 0);
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith('/api/auth/login')) onUnauthorized?.();
    throw new ApiError(
      data?.error?.message ?? `Request failed (${res.status})`,
      res.status,
      data?.error?.details?.fieldErrors ?? {},
    );
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

interface AuthResponse {
  token: string;
  user: ApiUser;
}

interface TransactionPage {
  transactions: Transaction[];
  total: number;
}

export type TransactionInput = Omit<Transaction, 'id' | 'upiId' | 'note'> & { upiId?: string; note?: string };
export type TransactionPatch = Partial<{ [K in keyof Omit<Transaction, 'id'>]: Transaction[K] | null }>;
export type DetectedInput = TransactionInput & { externalId: string };

const PAGE_SIZE = 500;

export const api = {
  signUp: (name: string, email: string, password: string) =>
    request<AuthResponse>('/api/auth/signup', { method: 'POST', body: { name, email, password } }),
  logIn: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request<{ user: ApiUser; settings: Settings }>('/api/auth/me'),

  categories: {
    list: () => request<Category[]>('/api/categories'),
    create: (body: Pick<Category, 'name' | 'icon' | 'color'>) =>
      request<Category>('/api/categories', { method: 'POST', body }),
    update: (id: string, body: Partial<Pick<Category, 'name' | 'icon' | 'color'>>) =>
      request<Category>(`/api/categories/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
    remove: (id: string) => request<unknown>(`/api/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },

  transactions: {
    /** Every transaction, newest first, fetched page by page. */
    async listAll(): Promise<Transaction[]> {
      const all: Transaction[] = [];
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const page = await request<TransactionPage>('/api/transactions', { query: { limit: PAGE_SIZE, offset } });
        all.push(...page.transactions);
        if (page.transactions.length < PAGE_SIZE || all.length >= page.total) return all;
      }
    },
    create: (body: TransactionInput) => request<Transaction>('/api/transactions', { method: 'POST', body }),
    update: (id: string, body: TransactionPatch) =>
      request<Transaction>(`/api/transactions/${id}`, { method: 'PATCH', body }),
    remove: (id: string) => request<void>(`/api/transactions/${id}`, { method: 'DELETE' }),
    saveDetected: (transactions: DetectedInput[]) =>
      request<{ added: number; skipped: number; transactions: Transaction[] }>('/api/transactions/detected', {
        method: 'POST',
        body: { transactions },
      }),
  },

  settings: {
    update: (body: Partial<Settings>) => request<Settings>('/api/settings', { method: 'PATCH', body }),
  },
};
