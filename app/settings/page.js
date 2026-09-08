"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import "../globals.css";

const MODELS = [
  ["gemini-2.5-flash", "Gemini 2.5 Flash（推奨・速い・無料枠）"],
  ["gemini-2.5-pro", "Gemini 2.5 Pro（高精度）"],
  ["gemini-2.0-flash", "Gemini 2.0 Flash（軽量）"],
];
const DIALECTS = [["std", "標準語"], ["kansai", "関西弁"], ["hakata", "博多弁"], ["tohoku", "東北弁"], ["nagoya", "名古屋弁"], ["kyoto", "京言葉"]];
const TONES = [["polite", "丁寧"], ["frank", "フランク"], ["comedian", "芸人"], ["hot", "熱血"], ["calm", "クール"]];
const PREVIEW = {
  std_polite: "写真は外観・内観・メニューを最新で。表示から接触への後押しになります（一般的傾向）。",
  kansai_frank: "写真な、外観・内観・メニュー入れとこ。見られる→気になるの後押しになるで（あくまで一般的な傾向やけどな）。",
  hakata_comedian: "写真スカスカやん!…って冗談はさておき、外観・内観・メニュー入れよ? 選ばれる後押しになるとよ（※効果は一般的傾向、保証はできんばい）。",
  tohoku_polite: "写真っこ、外観・内観・メニューば最新にしとくといいべ。見つかって選ばれる後押しになるっちゃ（一般的な傾向だども）。",
  nagoya_frank: "写真、外観・内観・メニュー入れときゃあ。見られて気になる、の後押しになるがや（一般的な傾向だけどな）。",
  kyoto_polite: "お写真は外観・内観・お品書きを新しゅうしとくとよろしおす。選ばれる後押しになりますえ（一般的な傾向どすけど）。",
  std_comedian: "写真、少なっ!……はい本題。外観・内観・メニューを追加で。表示→接触の後押しになります（※効果は一般的傾向、保証はナシで）。",
  std_hot: "いきましょう!写真は外観・内観・メニューを最新に!ここが表示→接触を動かす一歩です(一般的傾向)!",
  std_calm: "写真:外観・内観・メニューを最新化。表示→接触に寄与(一般的傾向)。",
};

export default function Settings() {
  const [key, setKey] = useState("");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [dialect, setDialect] = useState("std");
  const [tone, setTone] = useState("polite");
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState(null);
  const [testing, setTesting] = useState(false);
  const [advisor, setAdvisor] = useState(false);

  useEffect(() => {
    setKey(localStorage.getItem("ml_key") || "");
    setModel(localStorage.getItem("ml_model") || "gemini-2.5-flash");
    setDialect(localStorage.getItem("ml_dialect") || "std");
    setTone(localStorage.getItem("ml_tone") || "polite");
    setAdvisor(!!localStorage.getItem("ml_invite")); // 招待リンク経由=アドバイザー
  }, []);

  const save = () => {
    localStorage.setItem("ml_key", key.trim());
    localStorage.setItem("ml_model", model);
    localStorage.setItem("ml_dialect", dialect);
    localStorage.setItem("ml_tone", tone);
    setSaved(true); setTimeout(() => setSaved(false), 1800);
  };
  const runTest = async () => {
    setTesting(true); setTest(null);
    try {
      const r = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim(), model, test: true }) });
      const d = await r.json();
      setTest(d.ok ? { ok: true, t: `接続OK（${d.model}）` } : { ok: false, t: d.error || "失敗" });
    } catch { setTest({ ok: false, t: "通信エラー" }); }
    setTesting(false);
  };
  const preview = PREVIEW[dialect + "_" + tone] || PREVIEW["std_" + tone] || PREVIEW.std_polite;

  return (
    <div className="app">
      <div className="hero" style={{ paddingBottom: 18 }}>
        <div className="row"><div className="brand">⚙️ 設定</div><Link href="/" style={{ color: "#fff", fontSize: 13 }}>← 戻る</Link></div>
        <h1 style={{ fontSize: 20 }}>{advisor ? "AIの話し方の設定" : "AIのセットアップ"}</h1>
        <p>{advisor ? "AIの方言・ニュアンスを選べます。" : "Geminiキーを入れると「AIアシスタント」が起動します。"}</p>
      </div>

      <div className="sec">
        {!advisor && (
          <>
            <h2>Gemini API キー</h2>
            <div className="card">
              <input className="kv" type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="AIza… で始まるキー" />
              <div className="row" style={{ marginTop: 10 }}>
                <span style={{ fontSize: 12, color: "var(--mut)" }}>モデル</span>
                <select value={model} onChange={(e) => setModel(e.target.value)} style={{ flex: 1, padding: 10, borderRadius: 9, border: "1px solid var(--line)" }}>
                  {MODELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn p" onClick={save}>{saved ? "✓ 保存しました" : "保存する"}</button>
                <button className="btn s" onClick={runTest} disabled={testing || !key.trim()}>{testing ? "テスト中…" : "接続テスト"}</button>
              </div>
              {test && <div className="constitution" style={{ borderColor: test.ok ? "#d7ebe6" : "#f0c8b0", background: test.ok ? "#eef7f4" : "#fff5f0" }}>{test.ok ? "✓ " : "⚠️ "}{test.t}</div>}
              <div className="note">キーは<b>この端末のブラウザ内だけ</b>に保存。サーバーには保存しません。<br />無料キー: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio</a></div>
            </div>
          </>
        )}

        <h2>🎭 AIの言語（方言）</h2>
        <div className="card"><div className="pchips">
          {DIALECTS.map(([k, n]) => <span key={k} className={"pchip" + (dialect === k ? " on" : "")} onClick={() => setDialect(k)}>{n}</span>)}
        </div></div>

        <h2>🎭 ニュアンス</h2>
        <div className="card"><div className="pchips">
          {TONES.map(([k, n]) => <span key={k} className={"pchip" + (tone === k ? " on" : "")} onClick={() => setTone(k)}>{n}</span>)}
        </div></div>

        <div className="card">
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>プレビュー（写真の項目の言い方）</div>
          <div className="preview"><div className="who">🤖 {DIALECTS.find((d) => d[0] === dialect)[1]} × {TONES.find((t) => t[0] === tone)[1]}</div>{preview}</div>
          <div className="constitution">🛡️ <b>AI憲法で保証</b>：口調をどう変えても「効果は一般的傾向・保証しない」「簡易セルフ診断」などの注記と、事実・境界（クチコミ集めの有料ノウハウは出さない）は必ず守られます。</div>
          <button className="btn p" style={{ marginTop: 12 }} onClick={save}>{saved ? "✓ 保存しました" : "この設定で保存"}</button>
        </div>
      </div>
      <div style={{ height: 30 }} />
    </div>
  );
}
