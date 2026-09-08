// 利用履歴の取得：自分のGeminiキーを知る人だけ、自分が発行した相手の履歴を見られる
import { getEvents, ownerHash, storeReady } from "../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!storeReady()) return json({ error: "履歴ストアが未接続です（Vercelで Upstash Redis を追加してください）。", noStore: true });
  let b;
  try { b = await request.json(); } catch { return json({ error: "不正なリクエスト" }, 400); }
  const { geminiKey } = b || {};
  if (!geminiKey || !/^AIza/.test(geminiKey.trim())) return json({ error: "発行に使ったGeminiキーを入力してください。" }, 400);

  const events = await getEvents(ownerHash(geminiKey.trim()));
  // 相手(id)ごとに集計
  const map = {};
  const TYPES = { ai_diagnose: "AI総評", ai_chat: "AI相談", lookup: "リンク検索", open: "アクセス", diagnose_done: "診断完了", guide_view: "ガイド閲覧" };
  for (const e of events) {
    const k = e.id || e.label || "unknown";
    if (!map[k]) map[k] = { id: k, label: e.label || "（無題）", first: e.ts, last: e.ts, total: 0, counts: {}, recent: [] };
    const m = map[k];
    m.total++;
    m.counts[e.type] = (m.counts[e.type] || 0) + 1;
    if (e.ts < m.first) m.first = e.ts;
    if (e.ts > m.last) m.last = e.ts;
    if (e.detail && (e.type === "ai_chat" || e.type === "ai_diagnose") && m.recent.length < 8) m.recent.push({ t: e.detail, ts: e.ts });
  }
  const prospects = Object.values(map).sort((a, b) => b.last - a.last);
  return json({ ok: true, prospects, typeLabels: TYPES, totalEvents: events.length });
}

function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } }); }
