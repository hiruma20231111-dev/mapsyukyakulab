// FB②「1000人シミュレーション」ロジック（事前DB simdb.json を引く。runtimeはAPI/検索なし）
import simdb from "./simdb.json";
const { params = {}, cells = {}, narrative = {} } = simdb || {};

export const BIZ = [
  ["izakaya", "居酒屋・バー"], ["cafe", "カフェ・喫茶"], ["restaurant", "食堂・レストラン"],
  ["hair", "美容室"], ["nail", "ネイル・まつげ"], ["relax", "エステ・整体"],
  ["clinic", "クリニック・歯科"], ["retail", "小売・物販"], ["school", "塾・教室"],
  ["realestate", "不動産"], ["car", "自動車関連"], ["service", "その他サービス"],
];
export const BIZ_JP = Object.fromEntries(BIZ);
export const LEVER_JP = { find: "見つかる", choose: "選ばれる", act: "行動", ai: "AI検索" };

// GBPカテゴリ(自由文) → 業種slug 推定（当たらなければ null → 業種選択UIへ）
const KW = [
  ["izakaya", ["居酒屋", "ダイニングバー", "バル", "スナック", "パブ", "ビアガーデン", "ホルモン", "もつ焼", "串"]],
  ["cafe", ["カフェ", "喫茶", "コーヒー", "スイーツ", "ケーキ", "パン", "ベーカリー", "茶房", "珈琲"]],
  ["restaurant", ["レストラン", "食堂", "ラーメン", "定食", "焼肉", "そば", "蕎麦", "うどん", "寿司", "すし", "鮨", "中華", "洋食", "和食", "カレー", "弁当", "ピザ", "イタリア", "フレンチ", "焼き鳥", "焼鳥", "牛丼", "丼", "天ぷら", "うなぎ", "鰻", "鉄板", "お好み", "たこ焼", "ビストロ", "ダイニング"]],
  ["hair", ["美容室", "美容院", "ヘアサロン", "ヘアー", "ヘア", "理容", "床屋", "バーバー"]],
  ["nail", ["ネイル", "まつげ", "まつ毛", "まつエク", "マツエク", "アイラッシュ", "アイビューティー"]],
  ["relax", ["エステ", "リラク", "整体", "接骨", "整骨", "マッサージ", "リフレ", "カイロ", "もみほぐし", "リンパ", "鍼", "灸", "ヨガ", "ピラティス", "スパ", "岩盤"]],
  ["clinic", ["クリニック", "歯科", "医院", "病院", "皮膚科", "内科", "眼科", "耳鼻", "整形", "診療", "産婦", "小児", "動物病院", "薬局", "調剤", "接骨院外"]],
  ["retail", ["ショップ", "アパレル", "雑貨", "洋服", "衣料", "家具", "家電", "花屋", "フラワー", "酒屋", "書店", "本屋", "メガネ", "眼鏡", "時計", "スーパー", "ドラッグ", "商店", "販売", "ストア", "ブティック", "専門店"]],
  ["school", ["塾", "教室", "スクール", "予備校", "学習", "英会話", "ピアノ", "そろばん", "ジム", "フィットネス", "道場", "習い事", "アカデミー", "学院"]],
  ["realestate", ["不動産", "賃貸", "住宅", "ハウス", "リフォーム", "工務店", "建築", "建設", "リノベ", "ハウジング"]],
  ["car", ["自動車", "中古車", "カー用品", "整備", "板金", "ガソリン", "タイヤ", "バイク", "車検", "ディーラー", "自転車", "モータース"]],
  ["service", ["クリーニング", "修理", "税理士", "行政書士", "弁護士", "司法書士", "社労士", "ペット", "トリミング", "写真館", "フォトスタジオ", "保険", "便利屋", "葬儀", "旅館", "ホテル", "印刷", "鍵", "宿"]],
];
export function bizFromCategory(cat) {
  if (!cat) return null;
  const s = String(cat);
  for (const [slug, kws] of KW) if (kws.some((k) => s.includes(k))) return slug;
  return null;
}

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lvl = (v) => (v >= 72 ? "S" : v >= 48 ? "M" : "W"); // 強/中/弱（診断の閾値に合わせる）

export function stateFromLevers(levers = {}) {
  return { find: lvl(levers.display ?? 0), choose: lvl(levers.contact ?? 0), act: lvl(levers.visit ?? 0), ai: lvl(levers.aio ?? 0) };
}
const keyOf = (biz, st) => `${biz}|find:${st.find}|choose:${st.choose}|act:${st.act}|ai:${st.ai}`;
// 天井＝全レバーを強(S)にした時の値（DBのceilingは不整合が多いので算出し直す）
function bizCeiling(biz) { const c = cells[`${biz}|find:S|choose:S|act:S|ai:S`]; return c ? c.sel : 0; }
function weakestLever(st) {
  const rank = { W: 0, M: 1, S: 2 }; let best = "find", bi = 9;
  for (const l of ["find", "choose", "act", "ai"]) { const i = rank[st[l]]; if (i < bi) { bi = i; best = l; } }
  return best;
}

// 実★・実クチコミ件数で選択率を微調整（±方向・範囲で縛る）→ 全体に掛ける係数
function adjFactor(biz, chooseLevel, rating, reviews) {
  const p = params[biz];
  if (!p || !p.beta) return 1;
  const assumed = chooseLevel === "S" ? 0.8 : chooseLevel === "M" ? 0.5 : 0.2;
  const bR = p.beta[0] || 0, bRev = p.beta[1] || 0;
  let num = 0, den = 0;
  if (rating != null && !isNaN(rating)) { const r = clamp((rating - 3.0) / 1.5, 0, 1); num += bR * (r - assumed); den += bR; }
  if (reviews != null && !isNaN(reviews)) { const rv = clamp(Math.log10(reviews + 1) / Math.log10(300), 0, 1); num += bRev * (rv - assumed); den += bRev; }
  if (den === 0) return 1;
  return clamp(1 + 0.6 * (num / den), 0.6, 1.5);
}

// メイン：業種＋診断(levers) → 表示データ
export function simulate(biz, levers, { rating, reviews } = {}) {
  if (!biz) return null;
  const st = stateFromLevers(levers);
  const cell = cells[keyOf(biz, st)];
  if (!cell) return null;
  const f = adjFactor(biz, st.choose, rating, reviews);
  // 補正は“現在の数字”だけに掛ける。“直すと/天井”はモデルの構造値そのまま（二重加算を避ける）
  const sel = Math.max(1, Math.round(cell.sel * f));
  const improved = Math.max(sel, cell.sel + (cell.bestGain || 0));
  const bestLever = cell.bestLever || weakestLever(st);
  return {
    biz, state: st, sel, improved,
    gain: Math.max(0, improved - sel),
    bestLever, bestLeverJP: LEVER_JP[bestLever] || bestLever,
    ceiling: Math.max(improved, bizCeiling(biz)),
    strength: narrative[`${biz}|${bestLever}`] || narrative[`${biz}|choose`] || "",
    adjusted: f !== 1,
    label: (simdb.meta && simdb.meta.note) || "AIによる予測。実際のGoogle結果とは異なります。",
  };
}
