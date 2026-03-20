import { useState, useEffect, useRef } from “react”;
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine, Cell } from “recharts”;
import { TrendingUp, TrendingDown, BookOpen, LayoutDashboard, History, Settings, PlusCircle, Trash2, ChevronLeft, Save, X, CheckCircle2, AlertCircle, Loader, Link2, Camera, Target, Zap, Waves, Fish, MapPin, Clock, Shield, ArrowLeft, ChevronRight, Edit3 } from “lucide-react”;

const T = {
bg:”#0B0E11”, surface:”#131920”, surface2:”#1C2333”,
border:”#252D3A”, accent:”#3772FF”, profit:”#00C087”, loss:”#EF454A”,
text:”#E8EDF5”, muted:”#8896AA”, dim:”#3D4D63”, gold:”#F5A623”,
};

const JOURNALS = [
{ id:“j1”, color:”#3772FF”, emoji:“📘” },
{ id:“j2”, color:”#00C087”, emoji:“📗” },
{ id:“j3”, color:”#F5A623”, emoji:“📙” },
];

const PAIRS = [“EUR/USD”,“GBP/USD”,“USD/JPY”,“USD/CHF”,“AUD/USD”,“USD/CAD”,“NZD/USD”,“EUR/GBP”,“EUR/JPY”,“GBP/JPY”,“CHF/JPY”,“XAU/USD (GOLD)”];
const STRATEGIES = [“Continuation”,“Retournement”];
const EMOTIONS   = [“😎 Confiant”,“😐 Neutre”,“😰 Stressé”,“🤑 Euphorique”,“😨 Craintif”,“😤 Frustré”,“🧘 Discipliné”,“😴 Fatigué”];
const CONFLUENCES = [
{ key:“r_zone”,       Icon:MapPin, label:“Zone Clé”,              sub:“Ancienne Offre / Demande” },
{ key:“r_sweep”,      Icon:Waves,  label:“Sweep de Liquidité”,    sub:“Avant la cassure” },
{ key:“r_bos”,        Icon:Zap,    label:“Cassure avec Momentum”, sub:“BOS / CHoCH” },
{ key:“r_fvg”,        Icon:Target, label:“Imbalance (FVG)”,       sub:“Fair Value Gap présent” },
{ key:“r_inducement”, Icon:Fish,   label:“Inducement”,            sub:“Liquidité créée avant le retour” },
];

function detectSession(dt) {
if (!dt) return “”;
const h = new Date(dt).getUTCHours();
if (h>=7&&h<9)   return “🔀 Overlap Tokyo / Londres”;
if (h>=12&&h<16) return “🔀 Overlap Londres / New York”;
if (h<9)         return “🇯🇵 Session Tokyo”;
if (h<12)        return “🇬🇧 Session Londres”;
if (h<21)        return “🇺🇸 Session New York”;
return “🌙 Creux de marché”;
}
function calcDuration(e,s) {
if (!e||!s) return null;
const d=new Date(s)-new Date(e); if(d<=0) return null;
const m=Math.floor(d/60000),dy=Math.floor(m/1440),h=Math.floor((m%1440)/60),mn=m%60;
if(dy>0) return `${dy}j ${h}h ${mn}min`;
if(h>0)  return `${h}h ${mn}min`;
return `${mn} min`;
}

const DEF = {
pair:“EUR/USD”, direction:“BUY”, entryDate:””, exitDate:””, session:””,
riskPercent:””, pnlPercent:””, pnlAmount:””, strategy:””, emotion:””,
r_zone:false, r_sweep:false, r_bos:false, r_fvg:false, r_inducement:false,
notes:””, screenshotEntry:null, screenshotEntryName:””, screenshotExit:null, screenshotExitName:””,
};

/* ── Atoms ──────────────────────────────────────── */
const inp = {
base: { background:”#0C1017”, border:`1px solid #252D3A`, borderRadius:10,
padding:“11px 14px”, color:”#E8EDF5”, fontSize:14, outline:“none”,
fontFamily:“inherit”, width:“100%”, boxSizing:“border-box” },
lbl: { fontSize:11, fontWeight:600, color:”#8896AA”, textTransform:“uppercase”,
letterSpacing:“0.07em”, marginBottom:6, display:“block” },
};

function Label({text,req,accent}) {
return <label style={inp.lbl}>{text}{req&&<span style={{color:accent||T.gold}}> *</span>}</label>;
}
function Field({label,k,type=“text”,ph,form,set,accent,req}) {
return <div><Label text={label} req={req} accent={accent}/>
<input type={type} value={form[k]||””} placeholder={ph}
onChange={e=>set(f=>({…f,[k]:e.target.value}))}
style={inp.base}
onFocus={e=>e.target.style.borderColor=accent||T.accent}
onBlur={e=>e.target.style.borderColor=”#252D3A”}
/>

  </div>;
}
function Drop({label,k,opts,form,set,accent}) {
  return <div><Label text={label} accent={accent}/>
    <select value={form[k]||""} onChange={e=>set(f=>({...f,[k]:e.target.value}))}
      style={{...inp.base,cursor:"pointer",color:form[k]?T.text:T.muted}}
      onFocus={e=>e.target.style.borderColor=accent||T.accent}
      onBlur={e=>e.target.style.borderColor="#252D3A"}>
      <option value="">— Choisir —</option>
      {opts.map(o=><option key={o} value={o} style={{background:"#131920"}}>{o}</option>)}
    </select>
  </div>;
}
function Btn({ch,onClick,col=T.accent,ghost,sm,full,style:s={}}) {
  return <button onClick={onClick} style={{
    background:ghost?"transparent":`linear-gradient(135deg,${col} 0%,${col}BB 100%)`,
    border:ghost?`1px solid ${T.border}`:"none", borderRadius:10,
    padding:sm?"8px 14px":"11px 22px", color:ghost?T.muted:"#fff",
    fontWeight:600, fontSize:sm?12:13, cursor:"pointer",
    display:"flex", alignItems:"center", gap:7,
    fontFamily:"inherit", width:full?"100%":"auto",
    justifyContent:full?"center":"flex-start", ...s,
  }}>{ch}</button>;
}
function Badge({text,col}) {
  return <span style={{background:col+"1A",color:col,border:`1px solid ${col}40`,
    borderRadius:7,padding:"2px 9px",fontSize:12,fontWeight:700,
    fontFamily:"'JetBrains Mono',monospace"}}>{text}</span>;
}
function KCard({children,p="18px 20px",style:s={}}) {
  return <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:p,...s}}>{children}</div>;
}
function SecCard({title,accent,children}) {
  return <KCard p="20px 22px"><div style={{fontSize:12,fontWeight:700,color:accent||T.accent,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
    <span style={{width:3,height:14,background:accent||T.accent,borderRadius:2,display:"inline-block"}}/>
    {title}</div>{children}</KCard>;
}
function Stat({lbl,val,sub,col}) {
  return <KCard><div style={{fontSize:11,fontWeight:600,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6}}>{lbl}</div>
    <div style={{fontSize:24,fontWeight:800,color:col,fontFamily:"'JetBrains Mono',monospace",lineHeight:1.2}}>{val}</div>
    {sub&&<div style={{fontSize:11,color:T.dim,marginTop:4}}>{sub}</div>}
  </KCard>;
}

/* ── Trade Row ─────────────────────────────────── */
function TRow({trade,col,onSel}) {
const pnl=parseFloat(trade.pnlPercent)||0;
const [hov,setHov]=useState(false);
return <div onClick={onSel}
onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
style={{background:hov?T.surface2:T.surface, border:`1px solid ${hov?col+"44":T.border}`,
borderRadius:12,padding:“13px 18px”,cursor:“pointer”,
display:“flex”,alignItems:“center”,gap:14,transition:“all 0.15s”}}>
<div style={{width:7,height:7,borderRadius:“50%”,background:pnl>0?T.profit:pnl<0?T.loss:T.dim,flexShrink:0}}/>
<div style={{fontWeight:700,fontSize:14,minWidth:110,fontFamily:”‘JetBrains Mono’,monospace”}}>{trade.pair}</div>
<Badge text={trade.direction} col={trade.direction===“BUY”?T.profit:T.loss}/>
{trade.strategy&&<div style={{fontSize:12,color:T.muted,flex:1}}>{trade.strategy}</div>}
{trade.entryDate&&<div style={{fontSize:11,color:T.dim,fontFamily:”‘JetBrains Mono’,monospace”}}>{new Date(trade.entryDate).toLocaleDateString(“fr”)}</div>}
{trade.pnlPercent&&<div style={{fontSize:14,fontWeight:700,fontFamily:”‘JetBrains Mono’,monospace”,color:pnl>0?T.profit:pnl<0?T.loss:T.muted,minWidth:65,textAlign:“right”}}>{pnl>=0?”+”:””}{trade.pnlPercent}%</div>}
<ChevronRight size={14} color={T.dim}/>

  </div>;
}

/* ── Journal Selector ──────────────────────────── */
function Selector({onOpen}) {
const [names,setNames]=useState({j1:“Journal 1”,j2:“Journal 2”,j3:“Journal 3”});
const [stats,setStats]=useState({});
const [edit,setEdit]=useState(null);
const [tmp,setTmp]=useState(””);

useEffect(()=>{
(()=>{
try{const v=localStorage.getItem(“jnames”);if(v)setNames(JSON.parse(v));}catch{}
const s={};
for(const j of JOURNALS){
try{
const rv=localStorage.getItem(“t-”+j.id);const r={value:rv};
const tr=r.value?JSON.parse(r.value):[];
const pnls=tr.map(t=>parseFloat(t.pnlPercent)||0);
const tot=pnls.reduce((a,b)=>a+b,0),w=pnls.filter(p=>p>0).length;
s[j.id]={n:tr.length,tot,w,l:pnls.filter(p=>p<0).length,wr:tr.length?Math.round((w/tr.length)*100):null};
}catch{s[j.id]={n:0,tot:0,w:0,l:0,wr:null};}
}
setStats(s);
})();
},[]);

const saveName=(id)=>{
const next={…names,[id]:tmp||names[id]};
setNames(next);setEdit(null);
try{localStorage.setItem(“jnames”,JSON.stringify(next));}catch{}
};

return (
<div style={{minHeight:“100vh”,background:T.bg,color:T.text,fontFamily:”‘Plus Jakarta Sans’,sans-serif”}}>
<style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#0B0E11}::-webkit-scrollbar-thumb{background:#252D3A;border-radius:3px}input[type="file"]{display:none}select option{background:#131920}`}</style>

```
  {/* Header */}
  <header style={{borderBottom:`1px solid ${T.border}`,padding:"22px 40px",display:"flex",alignItems:"center",gap:14}}>
    <div style={{width:42,height:42,borderRadius:13,background:`linear-gradient(135deg,${T.accent},#1A4FD6)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <TrendingUp size={21} color="#fff"/>
    </div>
    <div>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:17,letterSpacing:"0.04em"}}>FOREX JOURNAL</div>
      <div style={{fontSize:11,color:T.dim,letterSpacing:"0.1em",textTransform:"uppercase",marginTop:1}}>by Petit Médée</div>
    </div>
  </header>

  <main style={{maxWidth:700,margin:"0 auto",padding:"48px 28px"}}>
    <div style={{textAlign:"center",marginBottom:56}}>
      <div style={{display:"inline-block",background:`${T.accent}14`,border:`1px solid ${T.accent}30`,borderRadius:20,padding:"5px 16px",fontSize:12,fontWeight:700,color:T.accent,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>
        Sélectionnez votre espace
      </div>
      <h1 style={{fontSize:36,fontWeight:800,color:T.text,marginBottom:10,lineHeight:1.2}}>Vos Journaux de Trading</h1>
      <p style={{fontSize:15,color:T.muted,maxWidth:460,margin:"0 auto"}}>3 espaces indépendants — données séparées, Notion séparé</p>
    </div>

    <div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:760,margin:"0 auto"}}>
      {JOURNALS.map(j=>{
        const name=names[j.id];
        const st=stats[j.id]||{n:0,tot:0,w:0,l:0,wr:null};
        const isEd=edit===j.id;
        return (
          <div key={j.id} style={{background:T.surface,border:`1.5px solid ${T.border}`,borderRadius:18,padding:"22px 24px",cursor:"pointer",transition:"all 0.22s",display:"flex",flexDirection:"column",gap:14}}
            onMouseEnter={e=>{e.currentTarget.style.border=`1.5px solid ${j.color}60`;e.currentTarget.style.boxShadow=`0 8px 32px ${j.color}12`;}}
            onMouseLeave={e=>{e.currentTarget.style.border=`1.5px solid ${T.border}`;e.currentTarget.style.boxShadow="none";}}
            onClick={e=>{if(!isEd&&e.target.tagName!=="INPUT"&&e.target.tagName!=="BUTTON")onOpen(j.id,name,j.color,j.emoji);}}>

            {/* Top row: emoji + name + rename + open button */}
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:50,height:50,borderRadius:14,background:j.color+"15",border:`1.5px solid ${j.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{j.emoji}</div>
              <div style={{flex:1}}>
                {isEd?(
                  <div style={{display:"flex",gap:7}} onClick={e=>e.stopPropagation()}>
                    <input value={tmp} onChange={e=>setTmp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveName(j.id)} autoFocus
                      style={{...inp.base,fontSize:15,fontWeight:700,flex:1,borderColor:j.color,padding:"7px 11px"}}/>
                    <button onClick={()=>saveName(j.id)} style={{background:j.color,border:"none",borderRadius:9,padding:"0 13px",cursor:"pointer",color:"#fff",fontFamily:"inherit",fontWeight:700}}>✓</button>
                    <button onClick={()=>setEdit(null)} style={{background:T.surface2,border:`1px solid ${T.border}`,borderRadius:9,padding:"0 10px",cursor:"pointer",color:T.muted,fontFamily:"inherit"}}>✕</button>
                  </div>
                ):(
                  <div style={{fontSize:18,fontWeight:800,color:T.text}}>{name}</div>
                )}
                {!isEd&&<div style={{fontSize:11,color:T.muted,marginTop:3}}>{st.n} trade{st.n!==1?"s":""}{st.wr!==null?" · Win Rate "+st.wr+"%":""}</div>}
              </div>
              {!isEd&&<button onClick={e=>{e.stopPropagation();setEdit(j.id);setTmp(name);}} style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:8,padding:"5px 11px",cursor:"pointer",color:T.muted,fontSize:11,fontFamily:"inherit",display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                <Edit3 size={10}/> Renommer
              </button>}
            </div>

            {/* Stats row */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {[["Trades",""+st.n,j.color],["P&L",st.n?(st.tot>=0?"+":"")+st.tot.toFixed(1)+"%":"—",st.tot>=0?T.profit:T.loss],["Wins",""+st.w,T.profit],["Losses",""+st.l,T.loss]].map(([l,v,c])=>(
                <div key={l} style={{background:T.bg,borderRadius:10,padding:"9px 12px"}}>
                  <div style={{fontSize:10,color:T.dim,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>{l}</div>
                  <div style={{fontSize:18,fontWeight:700,color:c,fontFamily:"'JetBrains Mono',monospace"}}>{v}</div>
                </div>
              ))}
            </div>

            {/* Open button */}
            <button onClick={()=>onOpen(j.id,name,j.color,j.emoji)} style={{background:`linear-gradient(135deg,${j.color},${j.color}99)`,border:"none",borderRadius:11,padding:"12px",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              Ouvrir {name} <ChevronRight size={16}/>
            </button>
          </div>
        );
      })}
    </div>
  </main>
</div>
```

);
}

/* ── Journal App ───────────────────────────────── */
function JApp({jid,jname,jcol,jemoji,onBack}) {
const TK=“t-”+jid, NK=“n-”+jid;
const [trades,setTrades]=useState([]);
const [page,setPage]=useState(“dashboard”);
const [form,setForm]=useState(DEF);
const [sel,setSel]=useState(null);
const [editId,setEditId]=useState(null);
const [toast,setToast]=useState(null);
const [nt,setNt]=useState(””);
const [nd,setNd]=useState(””);
const [ns,setNs]=useState(“idle”);
const [nm,setNm]=useState(””);
const [filter,setFilter]=useState({pair:””,direction:””,strategy:””});
const feRef=useRef(),fsRef=useRef();

useEffect(()=>{
(()=>{
try{const v=localStorage.getItem(TK);if(v)setTrades(JSON.parse(v));}catch{}
try{const v=localStorage.getItem(NK);if(v){const cfg=JSON.parse(v);setNt(cfg.t||””);setNd(cfg.d||””);}}catch{}
})();
},[]);

const saveTr=(next)=>{setTrades(next);try{localStorage.setItem(TK,JSON.stringify(next));}catch{}};
const toast$=(msg,ok=true)=>{setToast({msg,ok});setTimeout(()=>setToast(null),2800);};

const syncN=async(trade)=>{
if(!nt||!nd)return; setNs(“syncing”);
const sc=[“r_zone”,“r_sweep”,“r_bos”,“r_fvg”,“r_inducement”].filter(k=>trade[k]).length;
const pr={“Paire”:{title:[{text:{content:trade.pair||””}}]},“Direction”:{select:{name:trade.direction||“BUY”}},“Session”:{rich_text:[{text:{content:trade.session||””}}]},“Durée”:{rich_text:[{text:{content:calcDuration(trade.entryDate,trade.exitDate)||”—”}}]},“Risque (%)”:{number:parseFloat(trade.riskPercent)||null},“P&L (%)”:{number:parseFloat(trade.pnlPercent)||null},“P&L ($)”:{number:parseFloat(trade.pnlAmount)||null},“Score”:{number:sc},“Émotion”:{rich_text:[{text:{content:trade.emotion||””}}]},“Notes”:{rich_text:[{text:{content:trade.notes||””}}]},“Zone Clé”:{checkbox:!!trade.r_zone},“Sweep”:{checkbox:!!trade.r_sweep},“BOS/CHoCH”:{checkbox:!!trade.r_bos},“FVG”:{checkbox:!!trade.r_fvg},“Inducement”:{checkbox:!!trade.r_inducement}};
if(trade.strategy)pr[“Stratégie”]={select:{name:trade.strategy}};
if(trade.entryDate)pr[“Date Entrée”]={date:{start:new Date(trade.entryDate).toISOString()}};
if(trade.exitDate) pr[“Date Sortie”]={date:{start:new Date(trade.exitDate).toISOString()}};
Object.keys(pr).forEach(k=>{if(pr[k]?.number===null)delete pr[k];});
try{
const res=await fetch(“https://api.notion.com/v1/pages”,{method:“POST”,headers:{“Authorization”:“Bearer “+nt,“Content-Type”:“application/json”,“Notion-Version”:“2022-06-28”},body:JSON.stringify({parent:{database_id:nd},properties:pr})});
if(res.ok){setNs(“success”);setNm(“Synchronisé avec Notion ✓”);setTimeout(()=>{setNs(“idle”);setNm(””);},3000);}
else{const e=await res.json();setNs(“error”);setNm(“Erreur: “+(e.message||res.status));setTimeout(()=>{setNs(“idle”);setNm(””);},5000);}
}catch{setNs(“error”);setNm(“Connexion Notion impossible”);setTimeout(()=>{setNs(“idle”);setNm(””);},5000);}
};

const submit=()=>{
if(!form.pair||!form.entryDate){toast$(“Paire et date d’entrée obligatoires”,false);return;}
const tr={…form,id:editId||Date.now().toString()};
const next=editId?trades.map(t=>t.id===editId?tr:t):[tr,…trades];
saveTr(next); setForm(DEF); setEditId(null); setPage(“history”);
toast$(editId?“Trade mis à jour ✓”:“Trade enregistré ✓”);
if(nt&&nd)syncN(tr);
};

const stats=(()=>{
const n=trades.length;
if(!n)return{n:0,w:0,l:0,wr:”—”,avg:”—”,tot:”—”,best:”—”,worst:”—”,totN:0};
const pnls=trades.map(t=>parseFloat(t.pnlPercent)||0);
const w=pnls.filter(p=>p>0).length,tot=pnls.reduce((a,b)=>a+b,0);
return{n,w,l:pnls.filter(p=>p<0).length,wr:Math.round((w/n)*100)+”%”,avg:(tot/n).toFixed(2)+”%”,tot:(tot>=0?”+”:””)+tot.toFixed(2)+”%”,best:Math.max(…pnls).toFixed(2)+”%”,worst:Math.min(…pnls).toFixed(2)+”%”,totN:tot};
})();

const chartData=(()=>{
const s=[…trades].sort((a,b)=>new Date(a.entryDate)-new Date(b.entryDate));
let c=0;
return s.map((t,i)=>{
const p=parseFloat(t.pnlPercent)||0; c=parseFloat((c+p).toFixed(2));
return{i:i+1,date:t.entryDate?new Date(t.entryDate).toLocaleDateString(“fr”,{day:“2-digit”,month:“2-digit”}):”#”+(i+1),cumul:c,pnl:parseFloat(p.toFixed(2)),pair:t.pair||”—”};
});
})();
const lastC=chartData.length?chartData[chartData.length-1].cumul:0;
const isPos=lastC>=0;

const filtered=trades.filter(t=>{
if(filter.pair&&t.pair!==filter.pair)return false;
if(filter.direction&&t.direction!==filter.direction)return false;
if(filter.strategy&&t.strategy!==filter.strategy)return false;
return true;
});

const NAV=[{id:“dashboard”,lbl:“Dashboard”,I:LayoutDashboard},{id:“history”,lbl:“Historique”,I:History},{id:“settings”,lbl:“Paramètres”,I:Settings}];

const CTip=({active,payload})=>{if(!active||!payload?.[0])return null;const d=payload[0].payload;return<div style={{background:”#090D11”,border:`1px solid ${T.border}`,borderRadius:10,padding:“10px 13px”,fontSize:12}}><div style={{color:T.muted,marginBottom:3}}>#{d.i}·{d.date}·{d.pair}</div><div style={{color:d.pnl>=0?T.profit:T.loss,fontWeight:700,fontFamily:”‘JetBrains Mono’,monospace”}}>Trade: {d.pnl>=0?”+”:””}{d.pnl}%</div><div style={{color:d.cumul>=0?jcol:T.loss,fontWeight:700,fontFamily:”‘JetBrains Mono’,monospace”}}>Cumulé: {d.cumul>=0?”+”:””}{d.cumul}%</div></div>;};
const BTip=({active,payload})=>{if(!active||!payload?.[0])return null;const d=payload[0].payload;return<div style={{background:”#090D11”,border:`1px solid ${T.border}`,borderRadius:10,padding:“10px 13px”,fontSize:12}}><div style={{color:T.muted,marginBottom:3}}>#{d.i}·{d.pair}</div><div style={{color:d.pnl>=0?T.profit:T.loss,fontWeight:700,fontFamily:”‘JetBrains Mono’,monospace”}}>{d.pnl>=0?”+”:””}{d.pnl}%</div></div>;};

return (
<div style={{minHeight:“100vh”,background:T.bg,color:T.text,fontFamily:”‘Plus Jakarta Sans’,sans-serif”,fontSize:14,display:“flex”}}>
<style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#0B0E11}::-webkit-scrollbar-thumb{background:#252D3A;border-radius:3px}input[type="file"]{display:none}select option{background:#131920}textarea{resize:vertical;font-family:inherit}input::placeholder,textarea::placeholder{color:#3D4D63}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>

```
  {/* Toast */}
  {toast&&<div style={{position:"fixed",top:20,right:20,zIndex:9999,background:toast.ok?"#0A2219":"#250B0C",border:`1px solid ${toast.ok?T.profit:T.loss}`,color:toast.ok?T.profit:T.loss,borderRadius:12,padding:"12px 18px",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:8,boxShadow:"0 8px 32px rgba(0,0,0,0.6)"}}>
    {toast.ok?<CheckCircle2 size={15}/>:<AlertCircle size={15}/>} {toast.msg}
  </div>}

  {/* Notion banner */}
  {ns!=="idle"&&<div style={{position:"fixed",bottom:22,left:"50%",transform:"translateX(-50%)",zIndex:9998,background:ns==="syncing"?"#1C2333":ns==="success"?"#0A2219":"#250B0C",border:`1px solid ${ns==="syncing"?T.border:ns==="success"?T.profit:T.loss}`,borderRadius:12,padding:"11px 18px",display:"flex",alignItems:"center",gap:9,color:ns==="syncing"?T.muted:ns==="success"?T.profit:T.loss,fontSize:13,fontWeight:600,boxShadow:"0 8px 32px rgba(0,0,0,0.6)"}}>
    {ns==="syncing"&&<Loader size={14} style={{animation:"spin 1s linear infinite"}}/>}
    {ns==="success"&&<CheckCircle2 size={14}/>}
    {ns==="error"&&<AlertCircle size={14}/>}
    {ns==="syncing"?"Synchronisation Notion...":nm}
  </div>}

  {/* ── SIDEBAR ── */}
  <aside style={{width:68,flexShrink:0,background:T.surface,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",alignItems:"center",padding:"16px 8px",position:"sticky",top:0,height:"100vh",overflowY:"auto",gap:4}}>
    {/* Back button */}
    <button onClick={onBack} title="Tous les journaux" style={{width:44,height:44,background:"transparent",border:`1px solid ${T.border}`,borderRadius:12,cursor:"pointer",color:T.muted,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10,transition:"all 0.17s",flexShrink:0}}
      onMouseEnter={e=>{e.currentTarget.style.background=T.surface2;e.currentTarget.style.color=T.text;}}
      onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.muted;}}>
      <ArrowLeft size={16}/>
    </button>

    {/* Journal emoji badge */}
    <div title={jname} style={{width:44,height:44,borderRadius:12,background:`${jcol}18`,border:`1.5px solid ${jcol}35`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:14,flexShrink:0}}>
      {jemoji}
    </div>

    {/* Separator */}
    <div style={{width:28,height:1,background:T.border,marginBottom:6}}/>

    {/* Nav icons */}
    {NAV.map(({id,lbl,I})=>{
      const active=page===id;
      return <button key={id} onClick={()=>setPage(id)} title={lbl} style={{
        width:44,height:44,background:active?`${jcol}1C`:"transparent",
        border:active?`1px solid ${jcol}40`:"1px solid transparent",
        borderRadius:12,cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",
        color:active?jcol:T.muted,
        transition:"all 0.17s",flexShrink:0,position:"relative",
      }}
      onMouseEnter={e=>{if(!active){e.currentTarget.style.background=T.surface2;e.currentTarget.style.color=T.text;}}}
      onMouseLeave={e=>{if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.muted;}}}>
        <I size={18}/>
        {active&&<span style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",width:4,height:4,borderRadius:"50%",background:jcol}}/>}
      </button>;
    })}

    <div style={{flex:1}}/>

    {/* Notion dot */}
    <div title={nt&&nd?"Notion connecté":"Notion non connecté"} style={{width:44,height:44,borderRadius:12,background:T.bg,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <div style={{width:9,height:9,borderRadius:"50%",background:nt&&nd?T.profit:T.dim,boxShadow:nt&&nd?`0 0 7px ${T.profit}40`:""}}/>
    </div>
  </aside>

  {/* ── CONTENT ── */}
  <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,overflow:"hidden"}}>

    {/* Top bar */}
    <header style={{background:"rgba(11,14,17,0.9)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${T.border}`,padding:"15px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
      <div>
        <div style={{fontSize:17,fontWeight:700,color:T.text}}>
          {page==="dashboard"&&"Tableau de Bord"}
          {page==="history"&&"Historique des Trades"}
          {page==="settings"&&"Paramètres"}
          {page==="add"&&(editId?"Modifier le Trade":"Nouveau Trade")}
          {page==="detail"&&"Détail du Trade"}
        </div>
        <div style={{fontSize:11,color:T.muted,marginTop:2}}>{new Date().toLocaleDateString("fr",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
      </div>
      <Btn ch={<><PlusCircle size={14}/> Nouveau Trade</>} onClick={()=>{setForm(DEF);setEditId(null);setPage("add");}} col={jcol}/>
    </header>

    <div style={{flex:1,padding:"26px 28px 44px",overflowY:"auto"}}>

      {/* ── DASHBOARD ── */}
      {page==="dashboard"&&(
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
            <Stat lbl="Total" val={""+stats.n} col={jcol}/>
            <Stat lbl="Win Rate" val={stats.wr} sub={`${stats.w}W · ${stats.l}L`} col={T.profit}/>
            <Stat lbl="P&L Total" val={stats.tot} col={stats.totN>=0?T.profit:T.loss}/>
            <Stat lbl="P&L Moyen" val={stats.avg} col="#A78BFA"/>
            <Stat lbl="Meilleur" val={stats.best} col={T.profit}/>
            <Stat lbl="Pire" val={stats.worst} col={T.loss}/>
          </div>

          {trades.length>0&&<>
            {/* Courbe */}
            <KCard p="20px 20px 12px">
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em",display:"flex",alignItems:"center",gap:7}}>
                    <span style={{width:3,height:12,background:isPos?T.profit:T.loss,borderRadius:2,display:"inline-block"}}/>Courbe de Capital
                  </div>
                  <div style={{fontSize:11,color:T.dim,marginTop:2}}>{chartData.length} trades</div>
                </div>
                <span style={{fontSize:21,fontWeight:800,color:isPos?T.profit:T.loss,fontFamily:"'JetBrains Mono',monospace"}}>{isPos?"+":""}{lastC.toFixed(2)}%</span>
              </div>
              <div style={{height:210}}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{top:5,right:5,left:-12,bottom:0}}>
                    <defs><linearGradient id={"g"+jid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={isPos?T.profit:T.loss} stopOpacity={0.28}/><stop offset="100%" stopColor={isPos?T.profit:T.loss} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} opacity={0.5}/>
                    <XAxis dataKey="date" tick={{fill:T.dim,fontSize:10}} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
                    <YAxis tick={{fill:T.dim,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v+"%"} width={40}/>
                    <Tooltip content={<CTip/>}/>
                    <ReferenceLine y={0} stroke={T.border} strokeDasharray="4 4"/>
                    <Area type="monotone" dataKey="cumul" stroke={isPos?T.profit:T.loss} strokeWidth={2.5} fill={"url(#g"+jid+")"}
                      dot={chartData.length<=20?{fill:isPos?T.profit:T.loss,r:3,strokeWidth:0}:false}
                      activeDot={{r:5,fill:isPos?T.profit:T.loss,strokeWidth:2,stroke:T.bg}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </KCard>

            {/* Barres */}
            <KCard p="20px 20px 12px">
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em",display:"flex",alignItems:"center",gap:7}}>
                  <span style={{width:3,height:12,background:jcol,borderRadius:2,display:"inline-block"}}/>P&L par Trade
                </div>
              </div>
              <div style={{height:160}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{top:5,right:5,left:-12,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} opacity={0.4} vertical={false}/>
                    <XAxis dataKey="date" tick={{fill:T.dim,fontSize:10}} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
                    <YAxis tick={{fill:T.dim,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v+"%"} width={40}/>
                    <Tooltip content={<BTip/>}/>
                    <ReferenceLine y={0} stroke={T.muted}/>
                    <Bar dataKey="pnl" radius={[4,4,0,0]} maxBarSize={34}>
                      {chartData.map((e,i)=><Cell key={i} fill={e.pnl>=0?T.profit:T.loss} fillOpacity={0.85}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </KCard>

            {/* Derniers trades */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:10}}>Derniers Trades</div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {trades.slice(0,5).map(t=><TRow key={t.id} trade={t} col={jcol} onSel={()=>{setSel(t);setPage("detail");}}/>)}
              </div>
              {trades.length>5&&<button onClick={()=>setPage("history")} style={{background:"transparent",border:"none",color:jcol,cursor:"pointer",fontSize:13,fontWeight:600,marginTop:10,fontFamily:"inherit"}}>Voir tous ({trades.length}) →</button>}
            </div>
          </>}

          {trades.length===0&&<KCard p="60px 24px" style={{textAlign:"center"}}>
            <div style={{fontSize:46,marginBottom:14}}>{jemoji}</div>
            <div style={{fontSize:17,fontWeight:700,color:T.muted,marginBottom:8}}>Aucun trade dans {jname}</div>
            <div style={{fontSize:13,color:T.dim,marginBottom:22}}>Enregistrez votre premier trade pour commencer</div>
            <Btn ch={<><PlusCircle size={14}/> Premier Trade</>} onClick={()=>{setForm(DEF);setEditId(null);setPage("add");}} col={jcol} s={{margin:"0 auto"}}/>
          </KCard>}
        </div>
      )}

      {/* ── HISTORY ── */}
      {page==="history"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            {[{key:"pair",opts:PAIRS,ph:"Toutes les paires"},{key:"direction",opts:["BUY","SELL"],ph:"Direction"},{key:"strategy",opts:STRATEGIES,ph:"Stratégie"}].map(({key,opts,ph})=>(
              <select key={key} value={filter[key]} onChange={e=>setFilter(p=>({...p,[key]:e.target.value}))}
                style={{background:"#0C1017",border:`1px solid ${T.border}`,borderRadius:9,padding:"9px 13px",color:filter[key]?T.text:T.muted,fontSize:12,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                <option value="">{ph}</option>
                {opts.map(o=><option key={o} value={o} style={{background:"#131920"}}>{o}</option>)}
              </select>
            ))}
            {(filter.pair||filter.direction||filter.strategy)&&<button onClick={()=>setFilter({pair:"",direction:"",strategy:""})} style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:9,padding:"9px 12px",color:T.muted,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}><X size={12}/> Reset</button>}
            <div style={{marginLeft:"auto",fontSize:12,color:T.muted}}>{filtered.length} trade{filtered.length!==1?"s":""}</div>
          </div>
          {filtered.length===0?<KCard p="44px 24px" style={{textAlign:"center",color:T.dim}}><History size={28} style={{margin:"0 auto 10px"}}/><div>Aucun trade trouvé</div></KCard>:(
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {filtered.map(t=><TRow key={t.id} trade={t} col={jcol} onSel={()=>{setSel(t);setPage("detail");}}/>)}
            </div>
          )}
        </div>
      )}

      {/* ── SETTINGS ── */}
      {page==="settings"&&(
        <div style={{maxWidth:580,display:"flex",flexDirection:"column",gap:18}}>
          <SecCard title="Connexion Notion" accent={jcol}>
            <div style={{background:nt&&nd?T.profit+"0F":jcol+"0D",border:`1px solid ${nt&&nd?T.profit+"28":jcol+"28"}`,borderRadius:10,padding:"10px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:8,fontSize:13,color:nt&&nd?T.profit:jcol,fontWeight:600}}>
              {nt&&nd?<><CheckCircle2 size={14}/> Notion connecté — sync auto activée</>:<><Link2 size={14}/> Configurez pour activer la synchronisation</>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
              <div>
                <label style={inp.lbl}>Token d'intégration Notion</label>
                <input type="password" value={nt} onChange={e=>setNt(e.target.value)} placeholder="secret_xxxxxxxxxxxx"
                  style={inp.base} onFocus={e=>e.target.style.borderColor=jcol} onBlur={e=>e.target.style.borderColor=T.border}/>
              </div>
              <div>
                <label style={inp.lbl}>Database ID</label>
                <input type="text" value={nd} onChange={e=>setNd(e.target.value)} placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  style={inp.base} onFocus={e=>e.target.style.borderColor=jcol} onBlur={e=>e.target.style.borderColor=T.border}/>
              </div>
            </div>
            <div style={{background:T.bg,borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:12,color:T.muted,lineHeight:1.7}}>
              💡 Chaque journal a son propre Database ID. Créez 3 bases séparées dans Notion et configurez chacune ici.
            </div>
            <div style={{display:"flex",gap:9}}>
              {nt&&nd&&<Btn ch={<><X size={13}/> Déconnecter</>} onClick={()=>{setNt("");setNd("");localStorage.setItem(NK,JSON.stringify({t:"",d:""}));toast$("Notion déconnecté");}} col={T.loss} ghost/>}
              <Btn ch={<><Save size={13}/> Sauvegarder</>} onClick={()=>{try{localStorage.setItem(NK,JSON.stringify({t:nt,d:nd}));toast$("Configuration sauvegardée ✓");}catch{toast$("Erreur",false);}}} col={jcol}/>
            </div>
          </SecCard>

          <SecCard title="À propos du Journal" accent={jcol}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["Journal",jname],["Total Trades",""+stats.n],["Win Rate",stats.wr],["P&L Total",stats.tot]].map(([l,v])=>(
                <div key={l} style={{background:T.bg,borderRadius:10,padding:"12px 14px"}}>
                  <div style={{fontSize:10,color:T.dim,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{l}</div>
                  <div style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:"'JetBrains Mono',monospace"}}>{v}</div>
                </div>
              ))}
            </div>
          </SecCard>
        </div>
      )}

      {/* ── ADD / EDIT ── */}
      {page==="add"&&(
        <div style={{maxWidth:740,display:"flex",flexDirection:"column",gap:16}}>
          <SecCard title="Informations de Base" accent={jcol}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Drop label="Paire *" k="pair" opts={PAIRS} form={form} set={setForm} accent={jcol}/>
              <div>
                <label style={inp.lbl}>Direction *</label>
                <div style={{display:"flex",gap:9}}>
                  {["BUY","SELL"].map(d=>{const a=form.direction===d;return(
                    <button key={d} onClick={()=>setForm(f=>({...f,direction:d}))} style={{flex:1,padding:"11px 0",borderRadius:10,cursor:"pointer",background:a?(d==="BUY"?T.profit+"1E":T.loss+"1E"):"#0C1017",border:a?`1px solid ${d==="BUY"?T.profit:T.loss}`:`1px solid ${T.border}`,color:a?(d==="BUY"?T.profit:T.loss):T.muted,fontWeight:700,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontFamily:"inherit"}}>
                      {d==="BUY"?<TrendingUp size={13}/>:<TrendingDown size={13}/>}{d}
                    </button>);
                  })}
                </div>
              </div>
            </div>
          </SecCard>

          <SecCard title="Dates & Session" accent={jcol}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:12}}>
              <div>
                <label style={inp.lbl}>Date d'Entrée <span style={{color:T.gold}}>*</span></label>
                <input type="datetime-local" value={form.entryDate}
                  onChange={e=>{const s=detectSession(e.target.value);setForm(f=>({...f,entryDate:e.target.value,session:s}));}}
                  style={inp.base} onFocus={e=>e.target.style.borderColor=jcol} onBlur={e=>e.target.style.borderColor=T.border}/>
              </div>
              <div>
                <label style={inp.lbl}>Date de Sortie</label>
                <input type="datetime-local" value={form.exitDate} onChange={e=>setForm(f=>({...f,exitDate:e.target.value}))}
                  style={inp.base} onFocus={e=>e.target.style.borderColor=jcol} onBlur={e=>e.target.style.borderColor=T.border}/>
              </div>
            </div>
            {form.session&&<div style={{background:`${jcol}0D`,border:`1px solid ${jcol}28`,borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:9,marginBottom:8}}>
              <Zap size={14} color={jcol}/>
              <div><div style={{fontSize:10,fontWeight:700,color:jcol,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:1}}>Session détectée</div><div style={{fontSize:13,fontWeight:600}}>{form.session}</div></div>
            </div>}
            {calcDuration(form.entryDate,form.exitDate)&&<div style={{background:"#F5A6230D",border:"1px solid #F5A62328",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:9}}>
              <Clock size={14} color={T.gold}/>
              <div><div style={{fontSize:10,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:1}}>Durée du trade</div><div style={{fontSize:13,fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{calcDuration(form.entryDate,form.exitDate)}</div></div>
            </div>}
          </SecCard>

          <SecCard title="Gestion & Performance" accent={jcol}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
              <Field label="Risque (%)" k="riskPercent" type="number" ph="1.0" form={form} set={setForm} accent={jcol}/>
              <Field label="P&L (%)" k="pnlPercent" type="number" ph="+2.5" form={form} set={setForm} accent={jcol}/>
              <Field label="P&L ($)" k="pnlAmount" type="number" ph="250" form={form} set={setForm} accent={jcol}/>
            </div>
          </SecCard>

          <SecCard title="Stratégie & Psychologie" accent={jcol}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
              <Drop label="Stratégie" k="strategy" opts={STRATEGIES} form={form} set={setForm} accent={jcol}/>
              <Drop label="Émotion" k="emotion" opts={EMOTIONS} form={form} set={setForm} accent={jcol}/>
            </div>
            <label style={inp.lbl}>Confluences</label>
            <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:16}}>
              {CONFLUENCES.map(({key,Icon,label,sub})=>{
                const on=!!form[key];
                return <div key={key} onClick={()=>setForm(f=>({...f,[key]:!f[key]}))} style={{display:"flex",alignItems:"center",gap:12,background:on?`${jcol}0D`:"#0C1017",border:`1px solid ${on?jcol+"48":T.border}`,borderRadius:10,padding:"11px 14px",cursor:"pointer",userSelect:"none",transition:"all 0.15s"}}>
                  <div style={{width:20,height:20,borderRadius:5,flexShrink:0,background:on?jcol:"transparent",border:on?"none":`1.5px solid ${T.dim}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
                    {on&&<span style={{color:"#fff",fontSize:11,fontWeight:700}}>✓</span>}
                  </div>
                  <Icon size={14} color={on?jcol:T.muted}/>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:on?T.text:T.muted}}>{label}</div><div style={{fontSize:11,color:T.dim}}>{sub}</div></div>
                  <span style={{fontSize:10,fontWeight:700,color:on?jcol:T.dim,fontFamily:"'JetBrains Mono',monospace"}}>{on?"OUI":"NON"}</span>
                </div>;
              })}
              {(()=>{const s=CONFLUENCES.filter(c=>form[c.key]).length;if(!s)return null;const c=s>=4?T.profit:s>=2?T.gold:T.loss;return<div style={{background:c+"0E",border:`1px solid ${c}28`,borderRadius:9,padding:"9px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:6}}><span style={{fontSize:12,color:T.muted}}>Score de confluences</span><span style={{fontSize:14,fontWeight:700,color:c,fontFamily:"'JetBrains Mono',monospace"}}>{s}/5 {s>=4?"🔥":s>=2?"👍":"⚠️"}</span></div>;})()}
            </div>
            <label style={inp.lbl}>Notes personnelles</label>
            <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={3} placeholder="Leçons apprises, ce que j'aurais fait différemment..."
              style={{...inp.base,lineHeight:1.6}}
              onFocus={e=>e.target.style.borderColor=jcol} onBlur={e=>e.target.style.borderColor=T.border}/>
          </SecCard>

          <SecCard title="Captures d'Écran" accent={jcol}>
            <input ref={feRef} type="file" accept="image/*" onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setForm(ff=>({...ff,screenshotEntry:ev.target.result,screenshotEntryName:f.name}));r.readAsDataURL(f);}}/>
            <input ref={fsRef} type="file" accept="image/*" onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setForm(ff=>({...ff,screenshotExit:ev.target.result,screenshotExitName:f.name}));r.readAsDataURL(f);}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {[{ref:feRef,field:"screenshotEntry",name:"screenshotEntryName",label:"Capture Entrée",col:T.profit},{ref:fsRef,field:"screenshotExit",name:"screenshotExitName",label:"Capture Sortie",col:T.loss}].map(({ref,field,name,label,col})=>(
                <div key={field}>
                  <label style={{...inp.lbl,color:col}}>{label}</label>
                  <button onClick={()=>ref.current.click()} style={{width:"100%",background:"#0C1017",border:`1.5px dashed ${col}38`,borderRadius:11,padding:"20px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:7,fontFamily:"inherit",transition:"border-color 0.2s"}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=col}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=col+"38"}>
                    <Camera size={20} color={col} opacity={0.7}/>
                    <span style={{fontSize:12,color:form[name]?col:T.dim}}>{form[name]||"Ajouter capture"}</span>
                  </button>
                  {form[field]&&<img src={form[field]} alt={label} style={{width:"100%",borderRadius:9,marginTop:9,border:`1px solid ${col}22`,maxHeight:180,objectFit:"contain"}}/>}
                </div>
              ))}
            </div>
          </SecCard>

          <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingBottom:32}}>
            <Btn ch={<><X size={13}/> Annuler</>} onClick={()=>{setPage("history");setForm(DEF);setEditId(null);}} ghost/>
            <Btn ch={<><Save size={13}/> {editId?"Mettre à Jour":"Enregistrer le Trade"}</>} onClick={submit} col={jcol}/>
          </div>
        </div>
      )}

      {/* ── DETAIL ── */}
      {page==="detail"&&sel&&(
        <div style={{maxWidth:740,display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <Btn ch={<><ChevronLeft size={14}/> Retour</>} onClick={()=>setPage("history")} ghost sm/>
            <h1 style={{fontSize:20,fontWeight:800,flex:1}}>{sel.pair}</h1>
            <Badge text={sel.direction} col={sel.direction==="BUY"?T.profit:T.loss}/>
            {sel.pnlPercent&&<Badge text={(parseFloat(sel.pnlPercent)>=0?"+":"")+sel.pnlPercent+"%"} col={parseFloat(sel.pnlPercent)>=0?T.profit:T.loss}/>}
            <div style={{display:"flex",gap:8,marginLeft:"auto"}}>
              <Btn ch={<><Edit3 size={13}/> Modifier</>} onClick={()=>{setForm({...sel});setEditId(sel.id);setPage("add");}} ghost sm s={{color:jcol,borderColor:jcol+"48"}}/>
              <Btn ch={<><Trash2 size={13}/> Supprimer</>} onClick={()=>{saveTr(trades.filter(t=>t.id!==sel.id));setPage("history");setSel(null);toast$("Trade supprimé");}} ghost sm s={{color:T.loss,borderColor:T.loss+"48"}}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
            {[["Paire",sel.pair],["Session",sel.session||"—"],["Date Entrée",sel.entryDate?new Date(sel.entryDate).toLocaleString("fr"):"—"],["Date Sortie",sel.exitDate?new Date(sel.exitDate).toLocaleString("fr"):"—"],["Durée",calcDuration(sel.entryDate,sel.exitDate)||"—"],["Risque",sel.riskPercent?sel.riskPercent+"%":"—"],["P&L (%)",sel.pnlPercent?sel.pnlPercent+"%":"—"],["P&L ($)",sel.pnlAmount?sel.pnlAmount+" $":"—"]].map(([l,v])=>(
              <div key={l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:"13px 16px"}}>
                <div style={{fontSize:10,fontWeight:600,color:T.dim,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>{l}</div>
                <div style={{fontSize:15,fontWeight:600,fontFamily:["Durée","Risque","P&L (%)","P&L ($)"].includes(l)?"'JetBrains Mono',monospace":"inherit"}}>{v}</div>
              </div>
            ))}
          </div>
          {sel.emotion&&<div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:"13px 16px",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>{sel.emotion.split(" ")[0]}</span>
            <div><div style={{fontSize:10,color:T.dim,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:2}}>Émotion</div><div style={{fontSize:13,fontWeight:600}}>{sel.emotion}</div></div>
          </div>}
          <SecCard title="Confluences" accent={jcol}>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
              {(()=>{const s=CONFLUENCES.filter(c=>sel[c.key]).length;const c=s>=4?T.profit:s>=2?T.gold:T.loss;return<span style={{fontSize:14,fontWeight:700,color:c,fontFamily:"'JetBrains Mono',monospace"}}>{s}/5 {s>=4?"🔥":s>=2?"👍":"⚠️"}</span>;})()}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {CONFLUENCES.map(({key,Icon,label,sub})=>{const on=!!sel[key];return(
                <div key={key} style={{display:"flex",alignItems:"center",gap:11,opacity:on?1:0.28}}>
                  <div style={{width:18,height:18,borderRadius:4,background:on?jcol:"transparent",border:on?"none":`1.5px solid ${T.dim}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {on&&<span style={{color:"#fff",fontSize:10,fontWeight:700}}>✓</span>}
                  </div>
                  <Icon size={13} color={on?jcol:T.muted}/>
                  <div><span style={{fontSize:13,fontWeight:600,color:on?T.text:T.muted}}>{label}</span><span style={{fontSize:11,color:T.dim,marginLeft:7}}>{sub}</span></div>
                </div>);
              })}
            </div>
          </SecCard>
          {sel.notes&&<div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{fontSize:10,color:T.dim,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:7}}>📝 Notes</div>
            <div style={{fontSize:14,color:T.text,lineHeight:1.7}}>{sel.notes}</div>
          </div>}
          {(sel.screenshotEntry||sel.screenshotExit)&&(
            <SecCard title="Captures d'Écran" accent={jcol}>
              <div style={{display:"grid",gridTemplateColumns:sel.screenshotEntry&&sel.screenshotExit?"1fr 1fr":"1fr",gap:14}}>
                {sel.screenshotEntry&&<div><div style={{fontSize:10,fontWeight:700,color:T.profit,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:7,display:"flex",alignItems:"center",gap:5}}><TrendingUp size={11}/> Entrée</div><img src={sel.screenshotEntry} alt="Entrée" style={{width:"100%",borderRadius:9,border:`1px solid ${T.profit}22`,maxHeight:360,objectFit:"contain"}}/></div>}
                {sel.screenshotExit&&<div><div style={{fontSize:10,fontWeight:700,color:T.loss,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:7,display:"flex",alignItems:"center",gap:5}}><TrendingDown size={11}/> Sortie</div><img src={sel.screenshotExit} alt="Sortie" style={{width:"100%",borderRadius:9,border:`1px solid ${T.loss}22`,maxHeight:360,objectFit:"contain"}}/></div>}
              </div>
            </SecCard>
          )}
        </div>
      )}
    </div>
  </div>
</div>
```

);
}

/* ── Root ──────────────────────────────────────── */
export default function App() {
const [cur,setCur]=useState(null);
const [info,setInfo]=useState(null);
if(cur){
return <JApp jid={cur} jname={info.name} jcol={info.col} jemoji={info.emoji} onBack={()=>{setCur(null);setInfo(null);}}/>;
}
return <Selector onOpen={(id,name,col,emoji)=>{setCur(id);setInfo({name,col,emoji});}}/>;
}
