const cacheDB = new Map<string, any>();

export const getCache = (key: string): any => {
  return cacheDB.get(key);
};

export const setCache = (key: string, value: any, ttl: number = 0): void => {
  cacheDB.set(key, value);
  if (ttl > 0) {
    setTimeout(() => {
      cacheDB.delete(key);
    }, ttl);
  }
};

export const deleteCache = (key: string): void => {
  cacheDB.delete(key);
};

export const clearCache = (): void => {
  cacheDB.clear();
};

export const cacheKeys = (): string[] => {
  return [...cacheDB.keys()];
};

export const cacheValues = (): any[] => {
  return [...cacheDB.values()];
};

export const cacheEntries = (): Array<[string, any]> => {
  return [...cacheDB.entries()];
};

export const cacheHas = (key: string): boolean => {
  return cacheDB.has(key);
};
