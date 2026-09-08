// 利用履歴の取得：自分のGeminiキーを知る人だけ、自分が発行した相手の履歴＋期限を見られる
import { getEvents, getInvites, getDiagMap, ownerHash, storeReady } from "../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = { ai_diagnose: "AI総評", ai_chat: "AI相談", lookup: "リンク検索", open: "アクセス", diagnose_done: "診断完了", guide_view: "ガイド閲覧" };

export async function POST(request) {
  if (!storeReady()) return json({ error: "履歴ストアが未接続です（Vercelで Upstash Redis を追加してください）。", noStore: true });
  let b;
  try { b = await request.json(); } catch { return json({ error: "不正なリクエスト" }, 400); }
  const gk = (b?.geminiKey || "").trim();
  if (!gk || gk.length < 10) return json({ error: "発行に使ったGeminiキーを入力してください。" }, 400);

  const owner = ownerHash(gk);
  const [invites, events, diagMap] = await Promise.all([getInvites(owner), getEvents(owner), getDiagMap(owner)]);

  // id ごとの集計
  const agg = {};
  const ensure = (id, label) => (agg[id] = agg[id] || { id, label: label || "（無題）", last: 0, total: 0, counts: {}, recent: [] });
  for (const inv of invites) { const m = ensure(inv.id, inv.label); m.exp = inv.exp; m.created = inv.created; m.token = inv.token; }
  for (const e of events) {
    const m = ensure(e.id || e.label || "unknown", e.label);
    m.total++;
    m.counts[e.type] = (m.counts[e.type] || 0) + 1;
    if (e.ts > m.last) m.last = e.ts;
    if (e.detail && (e.type === "ai_chat" || e.type === "ai_diagnose") && m.recent.length < 10) m.recent.push({ t: e.detail, ts: e.ts });
  }

  const now = Date.now();
  const prospects = Object.values(agg).map((p) => {
    const daysLeft = p.exp ? Math.ceil((p.exp - now) / 86400000) : null;
    const dg = diagMap[p.id];
    return { ...p, daysLeft, expired: p.exp ? now > p.exp : false, used: p.total > 0, hasDiag: !!dg, diagAt: dg ? dg.ts : null };
  }).sort((a, b) => {
    // 期限切れを上に(アラート)、次に最終利用が新しい順、未利用は下
    if (a.expired !== b.expired) return a.expired ? -1 : 1;
    return (b.last || b.created || 0) - (a.last || a.created || 0);
  });

  const alerts = prospects.filter((p) => p.expired).length;
  const soon = prospects.filter((p) => !p.expired && p.daysLeft != null && p.daysLeft <= 3).length;
  return json({ ok: true, prospects, typeLabels: TYPES, alerts, soon });
}

function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } }); }
