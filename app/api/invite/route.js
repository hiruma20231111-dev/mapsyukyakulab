// 招待リンク発行：比留間さんのGeminiキーを暗号化して埋め込む（Vercel環境変数・管理PW不要）
import { mintToken, verifyToken } from "../../lib/invite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let b;
  try { b = await request.json(); } catch { return json({ error: "不正なリクエスト" }, 400); }
  const { geminiKey, label, days, model } = b || {};
  if (!geminiKey || !/^AIza/.test(geminiKey.trim())) {
    return json({ error: "Geminiキー（AIza…）を入力してください。" }, 400);
  }
  const token = mintToken({ geminiKey: geminiKey.trim(), label, days, model });
  const v = verifyToken(token);
  return json({ token, label: v.label, exp: v.exp });
}

function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } }); }
