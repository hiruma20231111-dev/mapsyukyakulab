// 軽量ストア（Upstash/Vercel Redis を REDIS_URL でTCP接続）
import crypto from "crypto";
import Redis from "ioredis";

const URL = process.env.REDIS_URL || process.env.KV_URL || "";

let client = null;
function getClient() {
  if (!URL) return null;
  if (!client) {
    client = new Redis(URL, { maxRetriesPerRequest: 2, enableReadyCheck: false, lazyConnect: false });
    client.on("error", () => {}); // 例外でクラッシュさせない
  }
  return client;
}

export function storeReady() { return !!URL; }

// Geminiキー → オーナー識別ハッシュ（ダッシュボードはキーを知る人だけ閲覧可）
export function ownerHash(geminiKey) {
  return crypto.createHash("sha256").update("owner:" + (geminiKey || "")).digest("hex").slice(0, 24);
}

// イベント記録（オーナー単位・最新500件・60日で失効）
export async function logEvent(owner, event) {
  const c = getClient();
  if (!c || !owner) return;
  const key = `usage:${owner}`;
  try {
    await c.lpush(key, JSON.stringify({ ...event, ts: Date.now() }));
    await c.ltrim(key, 0, 499);
    await c.expire(key, 5184000); // 60日
  } catch {}
}

// オーナーのイベント取得（新しい順）
export async function getEvents(owner) {
  const c = getClient();
  if (!c || !owner) return [];
  try {
    const res = await c.lrange(`usage:${owner}`, 0, 499);
    if (!Array.isArray(res)) return [];
    return res.map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
  } catch {
    return [];
  }
}
