// 招待リンク発行（管理者パスワードで認証）
import { mintToken, verifyToken } from "../../lib/invite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let b;
  try { b = await request.json(); } catch { return json({ error: "不正なリクエスト" }, 400); }
  const { password, label, days } = b || {};
  if (!process.env.ADMIN_PASSWORD) return json({ error: "ADMIN_PASSWORD が未設定です（管理者がVercelに設定してください）。" }, 500);
  if (password !== process.env.ADMIN_PASSWORD) return json({ error: "パスワードが違います。" }, 401);
  if (!process.env.GEMINI_SERVER_KEY) return json({ error: "GEMINI_SERVER_KEY 未設定：発行しても商談版AIが動きません。先にVercelでキー設定を。", warn: true }, 200);
  const token = mintToken(label, days || 14);
  const v = verifyToken(token);
  return json({ token, label: v.label, exp: v.exp });
}

function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } }); }
