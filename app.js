const DB_NAME="comandoControleDB", DB_VERSION=1, KEY="campaign";
const defaults={
  profile:{xp:0,credits:0,medals:0,power:100,precision:10,defense:10,energy:100},
  inventory:{scrap:0,cores:0,intel:0,plates:0},
  equipment:{armor:1,terminal:1,uniform:1,reinforcedArmor:0,advancedTerminal:0,intelSystem:0},
  mission:{claimed:false,progress:{theory:false,mapping:false,review:false,battery:false}},
  history:[]
};
let state;
const $=id=>document.getElementById(id);
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>req.result.createObjectStore("records");req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function loadState(){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction("records","readonly"),req=tx.objectStore("records").get(KEY);req.onsuccess=()=>resolve(merge(defaults,req.result||{}));req.onerror=()=>reject(req.error)})}
function merge(base, saved){return {...structuredClone(base),...saved,profile:{...base.profile,...saved.profile},inventory:{...base.inventory,...saved.inventory},equipment:{...base.equipment,...saved.equipment},mission:{...base.mission,...saved.mission,progress:{...base.mission.progress,...(saved.mission?.progress||{})}},history:saved.history||[]}}
async function saveState(){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction("records","readwrite");tx.objectStore("records").put(state,KEY);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}
function levelInfo(xp){let level=1,threshold=500,remaining=xp;while(remaining>=threshold){remaining-=threshold;level++;threshold+=50}return {level,within:remaining,next:threshold}}
function showToast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function render(){
 const p=state.profile, lv=levelInfo(p.xp);
 $("xpText").textContent=`${lv.within} / ${lv.next} XP · NÍVEL ${lv.level}`;
 $("xpBar").style.width=Math.min(100,lv.within/lv.next*100)+"%";
 $("credits").textContent=p.credits;$("medals").textContent=p.medals;
 $("materials").textContent=Object.values(state.inventory).reduce((a,b)=>a+b,0);
 ["power","precision","defense","energy"].forEach(k=>$(k).textContent=p[k]);
 const m=state.mission.progress, done=Object.values(m).filter(Boolean).length, pct=done*25;
 $("missionPct").textContent=pct+"%";$("missionBar").style.width=pct+"%";
 const labels={theory:"Concluir um bloco de teoria",mapping:"Concluir um mapeamento",review:"Concluir uma revisão",battery:"Resolver uma bateria de questões"};
 $("objectives").innerHTML=Object.entries(labels).map(([k,v])=>`<li class="${m[k]?'done':''}">${m[k]?'✓':'○'} ${v}</li>`).join("");
 const ready=done===4&&!state.mission.claimed;$("claimMission").disabled=!ready;
 $("missionStatus").textContent=state.mission.claimed?"Missão concluída. Recompensa já contabilizada.":ready?"Objetivos cumpridos. Recompensa disponível.":"Aguardando cumprimento dos objetivos.";
 $("inventoryList").innerHTML=[
  ["scrap","Sucata tecnológica","⚙","Melhorias de terminais e equipamentos"],
  ["cores","Núcleos de energia","🔷","Sistemas de energia e proteção"],
  ["intel","Dados de inteligência","▣","Sistemas de análise e desbloqueios"],
  ["plates","Placas de blindagem","🛡","Fabricação e reforço de armaduras"]
 ].map(([k,n,ico,d])=>`<article class="card item"><div class="item-icon">${ico}</div><div><b>${n}</b><small>${d}</small></div><span class="owned">${state.inventory[k]}</span></article>`).join("");
 const recipes=[
  {id:"reinforcedArmor",name:"Armadura reforçada",desc:"Proteção aprimorada para operações de maior risco.",cost:{plates:5,scrap:3},icon:"🛡"},
  {id:"advancedTerminal",name:"Terminal avançado",desc:"Amplia a capacidade tecnológica da base.",cost:{scrap:6,cores:2},icon:"⌨"},
  {id:"intelSystem",name:"Sistema de inteligência",desc:"Estrutura avançada de análise operacional.",cost:{intel:4,cores:2},icon:"▣"}
 ];
 $("recipes").innerHTML=recipes.map(r=>{const owned=state.equipment[r.id]>0,can=Object.entries(r.cost).every(([k,v])=>state.inventory[k]>=v);const cost=Object.entries(r.cost).map(([k,v])=>`${v} ${({scrap:"sucatas",cores:"núcleos",intel:"dados",plates:"placas"})[k]}`).join(" + ");return `<article class="card recipe ${owned?'':'locked'}"><div class="item-icon">${r.icon}</div><h3>${r.name}</h3><p>${r.desc}</p><div class="cost">Custo: ${cost}</div><button class="${can&&!owned?'primary':'secondary'}" data-craft="${r.id}" ${!can||owned?'disabled':''}>${owned?'Fabricado':can?'Fabricar':'Materiais insuficientes'}</button></article>`}).join("");
 $("historyList").innerHTML=state.history.length?state.history.slice().reverse().map(h=>`<div class="history-entry"><div><b>${escapeHTML(h.title)}</b><small>${new Date(h.date).toLocaleString("pt-BR")} · ${escapeHTML(h.notes||"Registro de estudo")}</small></div><strong>+${h.xp} XP</strong></div>`).join(""):'<article class="card muted">Nenhuma operação registrada. Seu histórico aparecerá aqui.</article>';
 $("saveStatus").textContent="Último salvamento local: "+new Date().toLocaleTimeString("pt-BR");
}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function calcXP(){const pages=+ $("pages").value||0,q=+$("questions").value||0,c=+$("correct").value||0,err=+$("corrected").value||0;return pages+q*2+c+err+($("mapping").checked?30:0)+($("review").checked?25:0)+($("booklet").checked?50:0)+($("subject").checked?250:0)+($("simulation").checked?50:0)}
["pages","questions","correct","corrected","mapping","review","booklet","subject","simulation"].forEach(id=>$(id).addEventListener("input",()=>{$("previewXP").textContent=calcXP()+" XP"}));
$("studyForm").addEventListener("submit",async e=>{e.preventDefault();const pages=+$("pages").value||0,q=+$("questions").value||0,c=+$("correct").value||0,err=+$("corrected").value||0;if(c>q){showToast("Acertos não podem superar o total de questões.");return}if(err>q-c){showToast("Erros corrigidos não podem superar as questões erradas.");return}const xp=calcXP();if(xp<=0){showToast("Registre uma atividade antes de salvar.");return}
 state.profile.xp+=xp;state.profile.precision+=c?Math.min(5,Math.floor(c/10)):0;state.profile.defense+= $("review").checked?1:0;
 const flags={theory:pages>0,mapping:$("mapping").checked,review:$("review").checked,battery:q>0};
 Object.keys(flags).forEach(k=>{if(flags[k])state.mission.progress[k]=true});
 state.history.push({date:new Date().toISOString(),title:"Operação de estudo",notes:$("notes").value.trim(),xp,pages,questions:q,correct:c,corrected:err});
 await saveState();render();e.target.reset();$("previewXP").textContent="0 XP";showToast(`Operação salva: +${xp} XP`);
});
$("claimMission").addEventListener("click",async()=>{if(state.mission.claimed||!Object.values(state.mission.progress).every(Boolean))return;state.mission.claimed=true;state.profile.xp+=100;state.profile.credits+=50;state.inventory.scrap+=3;state.inventory.intel+=1;state.history.push({date:new Date().toISOString(),title:"Missão concluída: Operação Despertar",notes:"Recompensa: 50 créditos, 3 sucatas e 1 dado de inteligência",xp:100});await saveState();render();showToast("Missão concluída. Loot e recompensas adicionados.");});
$("recipes").addEventListener("click",async e=>{const id=e.target.dataset.craft;if(!id)return;const costs={reinforcedArmor:{plates:5,scrap:3},advancedTerminal:{scrap:6,cores:2},intelSystem:{intel:4,cores:2}};const cost=costs[id];if(state.equipment[id]||!Object.entries(cost).every(([k,v])=>state.inventory[k]>=v))return;Object.entries(cost).forEach(([k,v])=>state.inventory[k]-=v);state.equipment[id]=1;await saveState();render();showToast("Equipamento fabricado.");});
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".panel").forEach(x=>x.classList.toggle("active",x.id===b.dataset.tab))}));
$("exportBtn").addEventListener("click",()=>{const blob=new Blob([JSON.stringify({app:"COMANDO DE CONTROLE",version:1,exportedAt:new Date().toISOString(),state},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="comando-controle-backup.json";a.click();URL.revokeObjectURL(a.href);showToast("Backup exportado.");});
$("importFile").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(data.app!=="COMANDO DE CONTROLE"||!data.state)throw new Error("Arquivo inválido");if(!confirm("Importar este backup substituirá o progresso atual. Continuar?"))return;state=merge(defaults,data.state);await saveState();render();showToast("Backup restaurado.");}catch(err){showToast("Não foi possível importar: "+err.message)}e.target.value=""});
(async()=>{try{state=await loadState();render();if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});}catch(e){console.error(e);showToast("Falha ao iniciar o banco local.")}})();