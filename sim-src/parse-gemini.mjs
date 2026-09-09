import fs from "fs";

const raw = fs.readFileSync("g_out1.json", "utf8");

// トップレベルの {...} を、文字列内の波括弧を無視しながら1個ずつ切り出す
function extractObjects(s) {
  const objs = [];
  let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === "{") { if (depth === 0) start = i; depth++; }
    else if (c === "}") { depth--; if (depth === 0 && start >= 0) { objs.push(s.slice(start, i + 1)); start = -1; } }
  }
  return objs;
}

const chunks = extractObjects(raw);
const parsed = [];
for (const ch of chunks) { try { parsed.push(JSON.parse(ch)); } catch (e) { /* skip */ } }

// 分類
const isCell = (v) => v && typeof v === "object" && "sel" in v;
const isParam = (v) => v && typeof v === "object" && "beta" in v;

let cells = {}, params = {}, narrative = {};
for (const o of parsed) {
  const keys = Object.keys(o);
  if (!keys.length) continue;
  // ②は { meta, cells:{...} } 形式（業種グループごとに分割）→ cells を合算
  if (o.cells && typeof o.cells === "object") { for (const k of Object.keys(o.cells)) if (isCell(o.cells[k])) cells[k] = o.cells[k]; continue; }
  const sample = o[keys[0]];
  if (isCell(sample)) { for (const k of keys) if (isCell(o[k])) cells[k] = o[k]; }
  else if (isParam(sample)) { for (const k of keys) if (isParam(o[k])) params[k] = o[k]; }
  else if (typeof sample === "string" && /\|(find|choose|act|ai)/.test(keys[0])) { for (const k of keys) narrative[k] = o[k]; }
}

fs.writeFileSync("params.json", JSON.stringify(params, null, 2));
fs.writeFileSync("simdb-raw.json", JSON.stringify(cells, null, 2));
fs.writeFileSync("narrative.json", JSON.stringify(narrative, null, 2));

console.log("chunks:", chunks.length, "parsed:", parsed.length);
console.log("params 業種:", Object.keys(params).length, Object.keys(params).join(","));
console.log("cells:", Object.keys(cells).length);
console.log("narrative keys:", Object.keys(narrative).length);
