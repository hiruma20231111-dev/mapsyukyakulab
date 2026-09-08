// 担当者ダッシュボードから、特定店舗の最新診断を取得（自分のGeminiキーを知る人だけ）
import { getDiag, ownerHash, storeReady } from "../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!storeReady()) return json({ error: "ストア未接続" }, 400);
  let b;
  try { b = await request.json(); } catch { return json({ error: "不正なリクエスト" }, 400); }
  const gk = (b?.geminiKey || "").trim();
  const id = b?.id;
  if (!gk || !id) return json({ error: "情報が不足しています。" }, 400);
  const diag = await getDiag(ownerHash(gk), id);
  if (!diag) return json({ error: "この店舗の診断はまだありません。" }, 404);
  return json({ ok: true, diag });
}

function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } }); }
