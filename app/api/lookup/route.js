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
    `手順: ①「${query}」および「${query} クチコミ 評価」「${query} 口コミ」で複数回Google検索 ②Googleマップの該当店を特定 ③公開Webに出ている“外形情報”を読み取る（Googleマップ本体に加え、食べログ/ホットペッパー等ポータルや公式サイトも参照して裏取り）。\n` +
    `【必ず探す5項目（＋店名・エリア）】①業種(カテゴリ) ②平均★評価 ③クチコミ件数 ④ビジネス説明文の有無と文字数 ⑤最新情報(投稿)の有無。＋店名・エリア。\n` +
    `【探し方】\n` +
    `・評価/件数：Googleマップ見出しの「4.2 ★ (128)」「4.2 · クチコミ128件」「星4.2 128 reviews」等を最優先。無ければナレッジパネルや食べログ/ホットペッパー等も参考。件数が見つかればその整数を必ず reviewCount に入れる（0件や未取得のときのみ null）。\n` +
    `・ビジネス説明文：Googleマップ プロフィールの「概要/説明(About)」欄。あれば概算の文字数を descriptionLength に整数で（無ければ0、確認不能ならnull）。\n` +
    `・投稿：Googleマップの「最新情報/更新(Updates/Posts)」があるか。あれば hasPosts=true、無ければfalse、確認不能ならnull。\n` +
    `最後に、次の形のJSONだけを1つ返す（前置き・説明・コードフェンス・出典は不要。JSON以外は書かない）:\n` +
    `{"name":"正式な店名","category":"業種(例:美容院,カフェ)","rating":平均評価の数値,"reviewCount":クチコミ件数の整数,"descriptionLength":ビジネス説明文の文字数(整数/無ければ0/不明はnull),"hasPosts":true/false,"area":"エリア/最寄り"}\n` +
    `・検索で判明した値を優先。どうしても確認できない項目だけ null（推測で埋めない・捏造しない）。\n` +
    `・rating は 3.9 のような数値、reviewCount と descriptionLength は整数。文字は付けない。`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const gen = { temperature: 0, maxOutputTokens: 1200 };
  // flashは“思考(thinking)”が出力枠を食い、JSONが出る前に切れて空になる → 思考を切る
  if (/flash/i.test(model)) gen.thinkingConfig = { thinkingBudget: 0 };
  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: gen,
  };
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json();
    if (!r.ok) return json({ error: d?.error?.message || `検索エラー(${r.status})` });
    let text = d?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return json({ error: `「${query}」の情報をうまく取得できませんでした。店名を正式表記（駅名や地域を足す）にするか、下の設問に手動でご回答ください。`, query });
    let info;
    try { info = JSON.parse(m[0]); } catch { return json({ error: "取得結果の解析に失敗しました。手入力でお願いします。" }); }

    return json({ found: true, info, query });
  } catch (e) {
    return json({ error: "通信エラー: " + (e?.message || e) });
  }
}

// Googleマップ等のURL → 店名クエリ（短縮リンク展開・同意画面・cidページにも対応）
async function urlToQuery(u) {
  let finalUrl = u, html = "";
  try {
    const r = await fetch(u, { redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", "Accept-Language": "ja" } });
    finalUrl = r.url || u;
    try { html = await r.text(); } catch {}
  } catch {}

  // 同意画面(consent.google.com)に飛ばされたら continue= の中の実URLを使う
  if (/consent\.google\./i.test(finalUrl)) {
    const c = finalUrl.match(/[?&]continue=([^&]+)/);
    if (c && c[1]) { try { finalUrl = decodeURIComponent(c[1]); } catch {} }
  }

  // URL から店名を取る
  const fromUrl = (url) => {
    try {
      const dec = decodeURIComponent(url);
      let m = dec.match(/\/maps\/place\/([^/@?]+)/);
      if (m && m[1]) return m[1].replace(/\+/g, " ").trim();
      m = dec.match(/[?&](?:q|query)=([^&]+)/);
      if (m && m[1] && !/^[-0-9.,\s]+$/.test(m[1])) return decodeURIComponent(m[1].replace(/\+/g, " ")).trim(); // 座標だけは除外
    } catch {}
    return "";
  };
  let name = fromUrl(finalUrl) || fromUrl(u);

  // URLで取れない（cid=… 等）ときは、開いたページの og:title / title から店名を拾う
  if (!name && html) {
    const pick = (re) => { const m = html.match(re); return m && m[1] ? m[1] : ""; };
    let t = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
         || pick(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)
         || pick(/<meta[^>]+itemprop=["']name["'][^>]+content=["']([^"']+)["']/i)
         || pick(/<title[^>]*>([^<]+)<\/title>/i);
    const c = cleanTitle(t);
    if (c && !isJunkName(c)) name = c;
  }
  return name && !isJunkName(name) ? name : null;
}

// タイトルから「 - Google マップ」「 · ★4.2 · カフェ」などの付帯を除去
function cleanTitle(t) {
  return String(t || "")
    .replace(/\s*[-–—|]\s*Google\s*(マップ|Maps).*$/i, "")
    .replace(/\s+·\s+.*$/, "")
    .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .trim();
}

// 「Google マップ」等の一般タイトル＝店名ではない → 弾く
function isJunkName(s) {
  return /^\s*google\s*(マップ|maps)?\s*$/i.test(s) || s.length < 2;
}

function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } }); }
