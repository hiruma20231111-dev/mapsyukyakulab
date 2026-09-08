// 利用イベントの記録（招待トークン経由のみ＝商談アドバイザー利用を記録）
import { verifyToken } from "../../lib/invite";
import { logEvent, ownerHash } from "../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let b;
  try { b = await request.json(); } catch { return json({ ok: false }); }
  const { invite, type, detail } = b || {};
  if (!invite || !type) return json({ ok: false });
  const v = verifyToken(invite);
  if (!v || !v.gk) return json({ ok: false });
  await logEvent(ownerHash(v.gk), { id: v.id, label: v.label, type: String(type).slice(0, 24), detail: String(detail || "").slice(0, 120) });
  return json({ ok: true });
}

function json(o) { return new Response(JSON.stringify(o), { headers: { "Content-Type": "application/json" } }); }
