// 招待リンク発行：比留間さんのGeminiキーを暗号化して埋め込む（Vercel環境変数・管理PW不要）
import { mintToken, verifyToken } from "../../lib/invite";
import { saveInvite, ownerHash } from "../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let b;
  try { b = await request.json(); } catch { return json({ error: "不正なリクエスト" }, 400); }
  const { geminiKey, label, days, model } = b || {};
  const gk = (geminiKey || "").trim();
  if (!gk || gk.length < 10) {
    return json({ error: "Geminiキーを入力してください（Google AI Studioで発行できます）。" }, 400);
  }
  const token = mintToken({ geminiKey: gk, label, days, model });
  const v = verifyToken(token);
  // 発行済み招待をダッシュボード用に保存（利用が無くても店舗として並ぶ）
  try {
    await saveInvite(ownerHash(gk), { id: v.id, label: v.label || "（無題）", exp: v.exp, created: Date.now() });
  } catch {}
  return json({ token, label: v.label, exp: v.exp });
}

function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } }); }
