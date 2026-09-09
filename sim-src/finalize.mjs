import fs from "fs";
const cells = JSON.parse(fs.readFileSync("simdb-raw.json","utf8"));
const params = JSON.parse(fs.readFileSync("params.json","utf8"));
const narrative = JSON.parse(fs.readFileSync("narrative.json","utf8"));
const BIZ=["izakaya","cafe","restaurant","hair","nail","relax","clinic","retail","school","realestate","car","service"];
const L=["W","M","S"]; const idx={W:0,M:1,S:2};
const levers=["find","choose","act","ai"];
const key=(b,st)=>`${b}|find:${st.find}|choose:${st.choose}|act:${st.act}|ai:${st.ai}`;
const parse=(k)=>{const[b,...r]=k.split("|");const st={};r.forEach(p=>{const[l,v]=p.split(":");st[l]=v;});return{b,st};};

// 欠けセルを、同業種のHamming-1(±1レベル)近傍の平均で補間
function neighbors(b,st){
  const out=[];
  for(const l of levers){for(const d of [-1,1]){const ni=idx[st[l]]+d; if(ni<0||ni>2)continue; const nst={...st,[l]:L[ni]}; const nk=key(b,nst); if(cells[nk])out.push(cells[nk]);}}
  return out;
}
const expected=[]; for(const b of BIZ)for(const f of L)for(const c of L)for(const a of L)for(const ai of L)expected.push(key(b,{find:f,choose:c,act:a,ai:ai}));
let filled=0;
for(const k of expected){ if(cells[k])continue; const{b,st}=parse(k); const nb=neighbors(b,st);
  if(!nb.length){console.log("no neighbors for",k);continue;}
  const avg=(f)=>Math.round(nb.reduce((s,x)=>s+(x[f]||0),0)/nb.length);
  const bl=nb.map(x=>x.bestLever).sort((a,c)=>nb.filter(v=>v.bestLever===c).length-nb.filter(v=>v.bestLever===a).length)[0];
  cells[k]={sel:avg("sel"),band:[avg("sel")-8,avg("sel")+8],bestLever:bl,bestGain:avg("bestGain"),ceiling:avg("ceiling"),filled:true};
  filled++; console.log("filled",k,"->",cells[k].sel);
}
console.log("filled:",filled,"total cells:",Object.keys(cells).length);

// narrative キー検証
const narExp=[]; for(const b of BIZ)for(const l of levers)narExp.push(`${b}|${l}`);
const narMiss=narExp.filter(k=>!(k in narrative));
console.log("narrative:",Object.keys(narrative).length,"missing:",narMiss.length, narMiss.slice(0,8).join(","));

// 最終アセンブル
const meta={version:"1.0",created:"2026-09-09",source:"gemini-pro montecarlo (code exec)",note:"AIによる予測シミュレーション。実測ではない。",biz:BIZ,levers,levels:["W","M","S"]};
const simdb={meta,params,cells,narrative};
fs.writeFileSync("simdb.json", JSON.stringify(simdb));
fs.writeFileSync("simdb.pretty.json", JSON.stringify(simdb,null,2));
const b=fs.statSync("simdb.json").size;
console.log("WROTE simdb.json", (b/1024).toFixed(1)+"KB", "cells:",Object.keys(cells).length,"params:",Object.keys(params).length,"narrative:",Object.keys(narrative).length);
