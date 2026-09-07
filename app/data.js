// マップ集客ラボ｜ガイド内容＋診断ロジック（公開安全な範囲）
// レバー: display=表示 / contact=接触 / visit=来店 / aio=AI検索

export const LEVERS = [
  { k: "display", nm: "表示", ds: "見つかる" },
  { k: "contact", nm: "接触", ds: "選ばれる" },
  { k: "visit",   nm: "来店", ds: "行動" },
  { k: "aio",     nm: "AIO",  ds: "AI検索" },
];

export const GUIDE = [
  {
    key: "basic", emo: "📇", title: "基本情報の土台", levers: ["display", "aio"],
    what: "店名（正式表記）・カテゴリ・営業時間・電話・住所（NAP）・属性・ビジネス説明を正確&最新に。",
    why: "検索やAIが店を正しく理解する土台。ここがズレると、そもそも“見つかる”入口で損をします。",
    effect: "表示・AIOの底上げ（一般的傾向）。",
    risk: "情報の不一致や古さで、検索・地図・AIに正しく拾われにくくなる。",
    tips: [
      "メインカテゴリは“最も的確な1つ”。追加カテゴリで提供サービスを補足。",
      "営業時間・臨時休業・電話・住所は実態と完全一致に。",
      "ビジネス説明は、何の店で・何が強みかを具体的に。",
    ],
  },
  {
    key: "photo", emo: "📷", title: "写真", levers: ["display", "contact"],
    what: "外観・内観・メニュー/商品・スタッフの写真を、鮮明・最新で十分な枚数。",
    why: "写真は第一印象。閲覧は「表示→接触」を強く動かす主要因（一般的傾向）。",
    effect: "表示→接触のレバーを底上げ（一般的傾向）。",
    risk: "写真が少ない・古いと“今の姿”が伝わらず、選ばれにくい。",
    tips: [
      "外観（入りやすさ）・内観（雰囲気）・メニュー/商品（価値）を最低限そろえる。",
      "定期的に新しい写真を追加して鮮度を保つ。",
      "明るく・水平・被写体がはっきり分かる写真を。",
    ],
  },
  {
    key: "post", emo: "📝", title: "投稿の鮮度", levers: ["contact"],
    what: "最新情報・キャンペーン・新メニュー・空き状況などを定期投稿。",
    why: "投稿の鮮度は“活動中の店”のサイン。接触・再訪の後押しになります（一般的傾向）。",
    effect: "接触・再訪のレバーを底上げ（一般的傾向）。",
    risk: "投稿が止まっていると“やってる感”が薄れ、機会損失に。",
    tips: [
      "まずは週1本を目安に。写真つきだと目を引く。",
      "季節・キャンペーン・新商品・お知らせが定番ネタ。",
      "1本目のハードルを下げる（短くてOK、まず継続）。",
    ],
  },
  {
    key: "review", emo: "⭐", title: "クチコミ", levers: ["contact", "aio"],
    what: "件数・平均評価・**返信**・鮮度。特に“返信の姿勢”が信頼につながる。",
    why: "クチコミは信頼と接触に直結。返信は閲覧者への安心感になります（一般的傾向）。",
    effect: "接触・信頼・AIOのレバーに寄与（一般的傾向）。",
    risk: "無返信・放置は“見ていない店”の印象。良い声も活かしきれない。",
    tips: [
      "まずは新着から、感謝を添えて誠実に返信する。",
      "ネガティブな声にも冷静・具体的に。改善姿勢を示す。",
      "サクラ・自作自演レビューは規約違反。絶対にやらない。",
    ],
    // 注: “クチコミの集め方・増やす戦略”は本アプリでは扱わない（本格対策＝相談）。
  },
  {
    key: "menu", emo: "🍽️", title: "商品・サービス", levers: ["contact", "aio"],
    what: "メニュー/商品を、価格・説明つきで登録。",
    why: "何をいくらで提供するかが明確だと、比較検討で選ばれやすく、AIも拾いやすい（一般的傾向）。",
    effect: "接触・AIOのレバーに寄与（一般的傾向）。",
    risk: "情報不足だと“問い合わせが面倒”で離脱されやすい。",
    tips: [
      "主力メニュー/商品から、価格と一言説明を添えて登録。",
      "写真とセットにすると魅力が伝わりやすい。",
    ],
  },
  {
    key: "action", emo: "📅", title: "来店導線", levers: ["visit"],
    what: "予約リンク・Webサイト・メッセージ・電話など、行動への導線。",
    why: "“気になった今”を来店・予約に変える出口。ここが弱いと取りこぼす。",
    effect: "来店（コンバージョン）レバーに直結（一般的傾向）。",
    risk: "予約手段が分かりにくいと、せっかくの関心が流れる。",
    tips: [
      "予約リンク/電話/Webを分かりやすく設定。",
      "リンク先はスマホで完結できるページに。",
    ],
  },
  {
    key: "aio", emo: "🤖", title: "AIO耐性（AI検索）", levers: ["aio"],
    what: "AI検索（AskMaps等）に拾われる“情報の充実度・具体性”。",
    why: "AIは充実した具体情報とクチコミの中身を参照。情報が薄いと候補に挙がりにくい（一般的傾向）。",
    effect: "AI検索での露出（AIO）に寄与（一般的傾向）。",
    risk: "情報が断片的だと、AI回答の“おすすめ”から漏れやすい。",
    tips: [
      "基本情報・写真・メニュー・クチコミを一通り充実させる。",
      "何の店で誰に向くかが伝わる具体的な記述を。",
    ],
  },
];

export const SUCCESS_MODEL =
  "Googleマップで来店が生まれる流れ＝【表示（見つかる）→ 接触（選ばれる）→ 来店（行動）】。" +
  "さらに近年はAI検索（AIO）が“表示”の新しい入口に。各改善が、この4レバーのどれを動かすかで効果を考えます。";

// ===== 診断（手入力先行）: 各項目→レバー寄与 =====
export const DIAG_ITEMS = [
  { k: "category", q: "カテゴリは適切に設定されている？",
    opts: [["適切", 100], ["自信ない", 50], ["未設定/曖昧", 0]], lev: ["display", "aio"] },
  { k: "basic", q: "基本情報（営業時間/電話/住所/説明）は最新？",
    opts: [["最新で正確", 100], ["一部古いかも", 50], ["古い/未整備", 0]], lev: ["display", "aio"] },
  { k: "photoCount", q: "写真の枚数は？",
    opts: [["21枚以上", 100], ["6〜20枚", 55], ["5枚以下", 15]], lev: ["display", "contact"] },
  { k: "photoFresh", q: "最新写真はいつ頃？",
    opts: [["1ヶ月以内", 100], ["3ヶ月以内", 55], ["半年以上前", 15]], lev: ["contact"] },
  { k: "post", q: "直近30日に投稿した？",
    opts: [["した", 100], ["していない", 0]], lev: ["contact"] },
  { k: "rating", q: "平均★評価は？",
    opts: [["4.3以上", 100], ["3.8〜4.2", 60], ["3.7以下", 25]], lev: ["contact"] },
  { k: "reviewCount", q: "クチコミ件数は（同業比で）？",
    opts: [["多い方", 100], ["普通", 55], ["少ない", 20]], lev: ["display", "contact"] },
  { k: "reply", q: "クチコミへの返信は？",
    opts: [["ほぼ返信", 100], ["たまに", 50], ["ほぼしない", 0]], lev: ["contact", "aio"] },
  { k: "menu", q: "商品・メニューの登録は？",
    opts: [["価格・説明つき", 100], ["一部だけ", 50], ["ない", 0]], lev: ["contact", "aio"] },
  { k: "action", q: "予約リンク/Webなどの来店導線は？",
    opts: [["分かりやすい", 100], ["電話のみ", 45], ["ほぼ無い", 10]], lev: ["visit"] },
];

// answers: {k: value(0-100)} → レバー別スコア＋総合＋弱点
export function diagnose(answers) {
  const acc = { display: [], contact: [], visit: [], aio: [] };
  for (const it of DIAG_ITEMS) {
    const v = answers[it.k];
    if (v == null) continue;
    for (const L of it.lev) acc[L].push(v);
  }
  const levers = {};
  for (const L of LEVERS) {
    const arr = acc[L.k];
    levers[L.k] = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  }
  const vals = LEVERS.map((l) => levers[l.k]).filter((x) => x != null);
  const total = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  const grade = total >= 80 ? "A" : total >= 65 ? "B" : total >= 50 ? "C" : "D";
  // 弱点: 低スコア項目TOP3
  const weak = DIAG_ITEMS
    .filter((it) => answers[it.k] != null)
    .map((it) => ({ it, v: answers[it.k] }))
    .sort((a, b) => a.v - b.v)
    .slice(0, 3)
    .map(({ it }) => it);
  return { levers, total, grade, weak };
}
