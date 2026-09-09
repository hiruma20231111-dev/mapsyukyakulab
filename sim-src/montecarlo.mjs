// ローカル・モンテカルロ再生成（数字だけ較正。params/narrativeは既存を流用）
import fs from "fs";
const params = JSON.parse(fs.readFileSync("params.json", "utf8"));
const narrative = JSON.parse(fs.readFileSync("narrative.json", "utf8"));
const BIZ = Object.keys(params);
const LV = ["W", "M", "S"];

// ==== 較正ノブ ====
const TAU = 0.30;                 // softmax温度（高いほど勝者集中を緩める）
const PVIS = { W: 0.45, M: 0.72, S: 0.95 };  // find→表示圏に入る確率
const CHV = { W: 0.25, M: 0.5, S: 0.8 };     // choose→選ばれる系6属性の値
const AIV = { W: 0.2, M: 0.5, S: 0.8 };      // ai→AIチャネルでの強さ
const ACTW = { W: 0.2, M: 0.5, S: 0.8 };     // act→加点(係数0.05)
const AI_FRAC = 0.15;             // AI検索チャネルの割合
const M = 12000;                  // 1セルあたりの試行人数

// 簡易seed付きPRNG（再現可能）
let seed = 42 >>> 0;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
function gauss(m, s) { const u = Math.max(1e-9, rnd()), v = rnd(); return m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const clamp01 = (x) => Math.max(0, Math.min(1, x));

function attract(attrs, beta) { let a = 0; for (let k = 0; k < 6; k++) a += beta[k] * attrs[k]; return a; }

function simCell(biz, st) {
  const p = params[biz];
  const beta = p.beta, N = Math.max(p.N, 5), cm = p.comp.mean, cs = p.comp.sd;
  const tv = CHV[st.choose];
  const tAttr = [tv, tv, tv, tv, tv, tv];
  const tA = attract(tAttr, beta) + 0.05 * ACTW[st.act];
  let picks = 0;
  for (let s = 0; s < M; s++) {
    // 競合N店
    const compA = [];
    for (let c = 0; c < N; c++) { const at = []; for (let k = 0; k < 6; k++) at.push(clamp01(gauss(cm[k], cs[k]))); compA.push(attract(at, beta)); }
    if (rnd() < AI_FRAC) {
      // AIチャネル：情報の充実(ai)で決まる。競合は0.5相当
      const visible = rnd() < PVIS[st.find];
      const ts = visible ? Math.exp(AIV[st.ai] / TAU) : 0;
      let den = ts; for (let c = 0; c < N; c++) den += Math.exp(0.5 / TAU);
      if (den > 0 && rnd() < ts / den) picks++;
    } else {
      const visible = rnd() < PVIS[st.find];
      const ts = visible ? Math.exp(tA / TAU) : 0;
      let den = ts; for (let c = 0; c < N; c++) den += Math.exp(compA[c] / TAU);
      if (den > 0 && rnd() < ts / den) picks++;
    }
  }
  return Math.round(picks / M * 1000);
}

const keyOf = (b, st) => `${b}|find:${st.find}|choose:${st.choose}|act:${st.act}|ai:${st.ai}`;
const cells = {};
for (const b of BIZ) for (const f of LV) for (const c of LV) for (const a of LV) for (const ai of LV) {
  const st = { find: f, choose: c, act: a, ai: ai };
  cells[keyOf(b, st)] = { sel: simCell(b, st) };
}
// bestLever/bestGain（1段上げて最大増分）＋ceiling(all-S)
const up = { W: "M", M: "S" };
for (const b of BIZ) {
  const ceil = cells[`${b}|find:S|choose:S|act:S|ai:S`].sel;
  for (const f of LV) for (const c of LV) for (const a of LV) for (const ai of LV) {
    const st = { find: f, choose: c, act: a, ai: ai };
    const cur = cells[keyOf(b, st)];
    let best = null, gain = 0;
    for (const l of ["find", "choose", "act", "ai"]) {
      if (!up[st[l]]) continue;
      const nst = { ...st, [l]: up[st[l]] };
      const d = cells[keyOf(b, nst)].sel - cur.sel;
      if (d > gain) { gain = d; best = l; }
    }
    cur.bestLever = best; cur.bestGain = gain; cur.ceiling = ceil;
  }
}

const meta = { version: "1.1", created: "2026-09-09", source: "local montecarlo (calibrated)", note: "AIによる予測シミュレーション。実測ではない。", biz: BIZ, levers: ["find", "choose", "act", "ai"], levels: LV, tau: TAU };
fs.writeFileSync("simdb.json", JSON.stringify({ meta, params, cells, narrative }));

// レポート
const rep = (b) => { const w = cells[`${b}|find:W|choose:W|act:W|ai:W`].sel, m = cells[`${b}|find:M|choose:M|act:M|ai:M`].sel, s = cells[`${b}|find:S|choose:S|act:S|ai:S`].sel; const all = Object.keys(cells).filter(k => k.startsWith(b + "|")).map(k => cells[k].sel); const avg = Math.round(all.reduce((x, y) => x + y, 0) / all.length); return `${b.padEnd(11)} 全弱${String(w).padStart(3)} 平均${String(avg).padStart(3)} 全強${String(s).padStart(3)}`; };
console.log("TAU=", TAU);
for (const b of BIZ) console.log(rep(b));
