// 軽量ストア（Upstash Redis REST）。Vercel KV / Upstash どちらのenv名でも動く。
import crypto from "crypto";

const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export function storeReady() { return !!(URL && TOKEN); }

// Upstash REST: POST 本文に ["CMD", arg1, ...] を投げる
async function cmd(args) {
  if (!storeReady()) return null;
  const r = await fetch(URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const d = await r.json().catch(() => ({}));
  return d?.result;
}

// Geminiキー → オーナー識別ハッシュ（ダッシュボードはキーを知る人だけ閲覧可）
export function ownerHash(geminiKey) {
  return crypto.createHash("sha256").update("owner:" + (geminiKey || "")).digest("hex").slice(0, 24);
}

// イベント記録（オーナー単位のリストに追記・最新500件・60日で失効）
export async function logEvent(owner, event) {
  if (!storeReady() || !owner) return;
  const key = `usage:${owner}`;
  try {
    await cmd(["LPUSH", key, JSON.stringify({ ...event, ts: Date.now() })]);
    await cmd(["LTRIM", key, "0", "499"]);
    await cmd(["EXPIRE", key, "5184000"]); // 60日
  } catch {}
}

// オーナーのイベント取得（新しい順）
export async function getEvents(owner) {
  if (!storeReady() || !owner) return [];
  const res = await cmd(["LRANGE", `usage:${owner}`, "0", "499"]);
  if (!Array.isArray(res)) return [];
  return res.map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
}
