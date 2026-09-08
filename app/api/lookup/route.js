// Geminiの Google検索グラウンディング で、リンク/店名から公開情報を"下書き"取得
// 自前キー or 招待トークン(サーバーキー)。あくまで概算＝要確認。
import { verifyToken } from "../../lib/invite";
import { logEvent, ownerHash } from "../../lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let b;
  try { b = await request.json(); } catch { return json({ error: "リクエスト不正" }, 400); }
  let { key, invite, model = "gemini-2.5-flash", input } = b || {};
  let apiKey = key;
  if (invite) {
    const v = verifyToken(invite);
    if (!v || v.expired) return json({ error: "招待リンクが無効か期限切れです。" });
    apiKey = v.gk;
    if (v.model) model = v.model;
    try { await logEvent(ownerHash(v.gk), { id: v.id, label: v.label, type: "lookup", detail: String(input || "").slice(0, 60) }); } catch {}
  }
  if (!apiKey) return json({ error: "この機能はGeminiキーが必要です（設定で入力）。" }, 400);
  if (!input || !input.trim()) return json({ error: "リンクか店名を入力してください。" }, 400);

  // リンクなら「店名」を抽出して検索クエリにする（短縮リンクはリダイレクト展開）
  let query = input.trim();
  if (/^https?:\/\//i.test(query)) {
    query = await urlToQuery(query);
    if (!query) return json({ error: "リンクからお店を特定できませんでした。お店の名前（正式表記）で試してください。" });
  }

  const prompt =
    `あなたは店舗リサーチの担当です。次のお店を必ず Google検索して、Googleマップ/ビジネスプロフィールの公開情報を特定してください。\n` +
    `対象のお店: ${query}\n\n` +
    `手順: ①「${query}」でGoogle検索 ②Googleマップの該当店を特定 ③公開Webに出ている“外形情報”を読み取る（Googleマップ本体に加え、食べログ/ホットペッパー等ポータルや公式サイトも参照して裏取り）。\n` +
    `【必ず探す外形情報（取れたものは必ず埋める）】店名／業種(カテゴリ)／平均★評価／クチコミ件数／公式サイト有無／予約導線有無／エリア・最寄り。\n` +
    `最後に、次の形のJSONだけを1つ返す（前置き・説明・コードフェンス・出典は不要。JSON以外は書かない）:\n` +
    `{"name":"正式な店名","category":"業種(例:美容院,カフェ)","rating":平均評価の数値,"reviewCount":クチコミ件数の整数,"hasWebsite":true/false,"hasReservation":true/false,"area":"エリア/最寄り"}\n` +
    `・検索で判明した値を優先。どうしても確認できない項目だけ null（推測で埋めない・捏造しない）。\n` +
    `・rating は 3.9 のような数値、reviewCount は 128 のような整数。文字は付けない。`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0, maxOutputTokens: 800 },
  };
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json();
    if (!r.ok) return json({ error: d?.error?.message || `検索エラー(${r.status})` });
    let text = d?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return json({ error: "うまく取得できませんでした。店名を正式表記にするか、手入力でお願いします。" });
    let info;
    try { info = JSON.parse(m[0]); } catch { return json({ error: "取得結果の解析に失敗しました。手入力でお願いします。" }); }

    const auto = {};
    if (typeof info.category === "string" && info.category) auto.category = 100;
    if (typeof info.rating === "number") auto.rating = info.rating >= 4.3 ? 100 : info.rating >= 3.8 ? 60 : 25;
    if (typeof info.reviewCount === "number") auto.reviewCount = info.reviewCount >= 100 ? 100 : info.reviewCount >= 20 ? 55 : 20;
    if (info.hasWebsite === true || info.hasReservation === true) auto.action = info.hasReservation ? 100 : 60;

    return json({ found: true, info, auto, query });
  } catch (e) {
    return json({ error: "通信エラー: " + (e?.message || e) });
  }
}

// Googleマップ等のURL → 店名クエリ
async function urlToQuery(u) {
  let url = u;
  try {
    // 短縮リンク(maps.app.goo.gl / goo.gl / g.co)はリダイレクト展開
    if (/(maps\.app\.goo\.gl|goo\.gl|g\.co)/i.test(u)) {
      const r = await fetch(u, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Accept-Language": "ja" } });
      url = r.url || u;
    }
    const dec = decodeURIComponent(url);
    // /maps/place/<NAME>/ から店名
    let m = dec.match(/\/maps\/place\/([^/@?]+)/);
    if (m && m[1]) return m[1].replace(/\+/g, " ").trim();
    // ?q=<NAME> / &query=<NAME>
    m = dec.match(/[?&](?:q|query)=([^&]+)/);
    if (m && m[1]) return m[1].replace(/\+/g, " ").trim();
    // 座標だけ等で店名が取れない場合はnull
    return null;
  } catch {
    return null;
  }
}

function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } }); }
