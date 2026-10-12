// src/lib/cache.ts
type CacheEntry<T> = { v: T; exp: number };

/**
 * 从localStorage缓存中获取数据
 * @param key 缓存键
 * @returns 缓存数据或null（过期/解析失败均返回null）
 */
export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (typeof parsed?.exp !== "number") return null;
    
    // 自动清理过期缓存
    if (Date.now() > parsed.exp) {
      localStorage.removeItem(key);
      return null;
    }
    
    return parsed.v ?? null;
  } catch {
    // JSON解析失败时返回null
    return null;
  }
}

/**
 * 将数据存入localStorage缓存
 * @param key 缓存键
 * @param value 要缓存的值
 * @param ttlMs 存活时间（毫秒）
 */
export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  try {
    const entry: CacheEntry<T> = { 
      v: value, 
      exp: Date.now() + ttlMs 
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage容量不足或禁用时静默失败
  }
}

/**
 * 清空所有与高德API相关的缓存
 */
export function clearAmapCache(): void {
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('transit_') || key.startsWith('subway_') || key.startsWith('parking_'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log(`🧹 已清理 ${keysToRemove.length} 个高德API缓存项`);
}

/**
 * 清空所有localStorage缓存
 */
export function cacheClear(): void {
  localStorage.clear();
  console.log('🧹 所有本地缓存已清空');
}