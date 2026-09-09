import fs from "fs";
const cells = JSON.parse(fs.readFileSync("simdb-raw.json","utf8"));
const BIZ=["izakaya","cafe","restaurant","hair","nail","relax","clinic","retail","school","realestate","car","service"];
const L=["S","M","W"];
const levers=["find","choose","act","ai"];
const expected=[];
for(const b of BIZ)for(const f of L)for(const c of L)for(const a of L)for(const ai of L)
  expected.push(`${b}|find:${f}|choose:${c}|act:${a}|ai:${ai}`);
const have=new Set(Object.keys(cells));
const missing=expected.filter(k=>!have.has(k));
const extra=Object.keys(cells).filter(k=>!expected.includes(k));
console.log("expected:",expected.length,"have:",have.size,"missing:",missing.length,"extra:",extra.length);
if(missing.length) console.log("MISSING:", missing.slice(0,20).join("\n           "));
if(extra.length) console.log("EXTRA:", extra.slice(0,10));
// per-業種 count
const per={}; for(const k of have){const b=k.split("|")[0]; per[b]=(per[b]||0)+1;}
console.log("per-業種:", JSON.stringify(per));
// range/sanity
let bad=0,neg=0;
for(const [k,v] of Object.entries(cells)){
  if(typeof v.sel!=="number"||v.sel<0||v.sel>1000) {bad++; if(bad<=5)console.log("BAD sel",k,v.sel);}
  if(typeof v.bestGain==="number"&&v.bestGain<0) neg++;
}
console.log("bad sel:",bad,"negative bestGain:",neg);
// monotonicity spot: all-W vs all-S per業種
for(const b of BIZ){
  const w=cells[`${b}|find:W|choose:W|act:W|ai:W`]?.sel;
  const s=cells[`${b}|find:S|choose:S|act:S|ai:S`]?.sel;
  if(w!=null&&s!=null&&!(s>w)) console.log(`MONO FAIL ${b}: allW=${w} allS=${s}`);
}
console.log("sample allW/allS:", BIZ.slice(0,4).map(b=>`${b}:${cells[`${b}|find:W|choose:W|act:W|ai:W`]?.sel}->${cells[`${b}|find:S|choose:S|act:S|ai:S`]?.sel}`).join("  "));
