// 店舗を削除（自分のGeminiキーを知る人だけ、自分の店舗を削除できる）
import { deleteStore, ownerHash, storeReady } from "../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!storeReady()) return json({ error: "ストア未接続" }, 400);
  let b;
  try { b = await request.json(); } catch { return json({ error: "不正なリクエスト" }, 400); }
  const gk = (b?.geminiKey || "").trim();
  const id = b?.id;
  if (!gk || !id) return json({ error: "情報が不足しています。" }, 400);
  await deleteStore(ownerHash(gk), id);
  return json({ ok: true });
}

function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } }); }
