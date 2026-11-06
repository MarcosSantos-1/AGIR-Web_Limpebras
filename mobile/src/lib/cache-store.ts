type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
};

const MAX_AGE = 24 * 60 * 60 * 1000;

export function createCache(storage: Storage, now = Date.now) {
  const keyFor = (scope: string, resource: string) => `agir:cache:v1:${encodeURIComponent(scope)}:${encodeURIComponent(resource)}`;
  return {
    async read<T>(scope: string, resource: string): Promise<T | null> {
      try {
        const raw = await storage.getItem(keyFor(scope, resource));
        if (!raw) return null;
        const item = JSON.parse(raw);
        if (typeof item.savedAt !== "number" || now() - item.savedAt > MAX_AGE || item.savedAt > now()) return null;
        return item.data ?? null;
      } catch { return null; }
    },
    async write<T>(scope: string, resource: string, data: T) {
      try {
        const raw = JSON.stringify({ savedAt: now(), data });
        // Bound individual entries; drafts and photos use their own storage.
        if (raw.length <= 1_500_000) await storage.setItem(keyFor(scope, resource), raw);
      } catch { /* A full device must not interrupt cloud updates. */ }
    },
    async remove(scope: string, resource: string) {
      try { await storage.removeItem(keyFor(scope, resource)); } catch { /* Best effort. */ }
    },
  };
}

export function cachedSubscription<T>(
  cache: ReturnType<typeof createCache>, scope: string, resource: string,
  subscribe: (next: (items: T[]) => void, error: (cause: Error) => void) => () => void,
  next: (items: T[]) => void, error: (cause: Error) => void,
) {
  let active = true;
  let receivedLive = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  void cache.read<T[]>(scope, resource).then((items) => {
    if (active && !receivedLive && Array.isArray(items)) next(items);
  });
  const off = subscribe((items) => {
    if (!active) return;
    receivedLive = true;
    next(items);
    clearTimeout(timer);
    timer = setTimeout(() => { void cache.write(scope, resource, items); }, 600);
  }, (cause) => {
    if (!active) return;
    receivedLive = true;
    clearTimeout(timer);
    if ("code" in cause && cause.code === "permission-denied") {
      next([]);
      void cache.remove(scope, resource);
    }
    error(cause);
  });
  return () => { active = false; clearTimeout(timer); off(); };
}
