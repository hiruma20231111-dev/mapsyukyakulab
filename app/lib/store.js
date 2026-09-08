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

// 発行した招待（店舗）を保存：発行時にダッシュボードへ並ぶ
export async function saveInvite(owner, rec) {
  const c = getClient();
  if (!c || !owner || !rec?.id) return;
  try {
    await c.hset(`invites:${owner}`, rec.id, JSON.stringify(rec));
    await c.expire(`invites:${owner}`, 7776000); // 90日
  } catch {}
}

// 発行済み招待一覧
export async function getInvites(owner) {
  const c = getClient();
  if (!c || !owner) return [];
  try {
    const h = await c.hgetall(`invites:${owner}`);
    if (!h) return [];
    return Object.values(h).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
  } catch {
    return [];
  }
}

// 店舗を削除（招待レコード＋その店のイベント＋診断を消す）
export async function deleteStore(owner, id) {
  const c = getClient();
  if (!c || !owner || !id) return;
  try {
    await c.hdel(`invites:${owner}`, id);
    await c.hdel(`diag:${owner}`, id);
    const key = `usage:${owner}`;
    const arr = await c.lrange(key, 0, 499);
    const keep = (arr || []).filter((s) => { try { return JSON.parse(s).id !== id; } catch { return true; } });
    await c.del(key);
    if (keep.length) await c.rpush(key, ...keep); // 新しい順のまま復元
  } catch {}
}

// 診断結果を保存（店舗単位・最新のみ上書き）
export async function saveDiag(owner, id, data) {
  const c = getClient();
  if (!c || !owner || !id) return;
  try {
    await c.hset(`diag:${owner}`, id, JSON.stringify({ ...data, ts: Date.now() }));
    await c.expire(`diag:${owner}`, 7776000); // 90日
  } catch {}
}

// 特定店舗の最新診断を取得
export async function getDiag(owner, id) {
  const c = getClient();
  if (!c || !owner || !id) return null;
  try {
    const s = await c.hget(`diag:${owner}`, id);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

// オーナーの全診断（id→{ts,...} の軽いマップ。ダッシュボードのバッジ用）
export async function getDiagMap(owner) {
  const c = getClient();
  if (!c || !owner) return {};
  try {
    const h = await c.hgetall(`diag:${owner}`);
    const out = {};
    for (const [id, s] of Object.entries(h || {})) {
      try { const d = JSON.parse(s); out[id] = { ts: d.ts || 0 }; } catch {}
    }
    return out;
  } catch { return {}; }
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
