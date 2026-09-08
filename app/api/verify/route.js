// 招待トークンの状態確認（有効/期限切れ/残り日数）。キーは返さない。
import { verifyToken } from "../../lib/invite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let b;
  try { b = await request.json(); } catch { return json({ valid: false, invalid: true }); }
  const v = verifyToken(b?.token);
  if (!v) return json({ valid: false, invalid: true });
  const daysLeft = Math.max(0, Math.ceil((v.exp - Date.now()) / 86400000));
  return json({ valid: v.valid, expired: v.expired, label: v.label, exp: v.exp, daysLeft });
}

function json(o) { return new Response(JSON.stringify(o), { headers: { "Content-Type": "application/json" } }); }
