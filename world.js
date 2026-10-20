/* world.js · Cyber Galaxy open world
   Pick an alien, fly the galaxy, land on any world, walk around, plant seeds of love.
   Loaded by index.html AFTER its main script, so it can use that script's globals
   (hash, rngFrom, lore, objs, cst, cam, W, H, ctx, glow, pos, sing, CFG, RAW, SPECIES, current, openCard). */
(()=>{
"use strict";
const N=96,T=8,WP=N*T;                       // a world is N x N tiles of T px. N must match cloudflare-worker.js
const GOD=[["Mother Nebula","#ff7ad9"],["The Cartographer","#ffd24a"],["Old Static","#7a8bff"]];
const LOVE=[["Hope","#ffd24a","Something good is on its way."],["Home","#ff9a5a","You are always welcome here."],["Courage","#ff4d6d","Small steps still count."],["Thanks","#6dffb0","Thank you for being here."],["Remembering","#b48aff","Some things stay with us, gently."],["Company","#4de3ff","You are not alone out here."]];
const HUES=[330,170,50,270,10,200,110,300];
// 8 alien bodies, 10px wide. 1 = main color, 2 = accent, 3 = white, 4 = dark. Order matches SPECIES in index.html
const SP=[
["..2....2..","...2..2...","22..11..22","2222112222","2221331222","2222112222",".22.11.22.","....11....","....44...."],
["...2.2....","....2.....","..111111..",".11111111.","1111113311","1122222211",".11222211.","..1111111.","2.....22.."],
["11......11","121....121","1111111111","1311221131","1111111111",".11122111.","..111111..","..4....4.."],
["..222222..",".22222222.","2232222322","2222222222",".22222222.","1.1.11.1.1",".1..1.1..1","1.1..1.1..",".1.1..1.1."],
["..1111....",".113311...",".11111.2..","..2222.2..","...1111...","..1111....",".1111.....",".11112222.","..11111111"],
["...3333...","..3....3..","....11....","2.113311.2","22.1111.22","222.11.222","22.2222.22","2..2222..2","...2222...","...4..4..."],
["....33....","...2222...","....44....","11.1111.11","1.113311.1",".11111111.",".1.1..1.1.","1..1..1..1"],
["1........1","111....111","1111111111",".11311311.","..111111..","...1111...","....22....","....2.....","....2....."]
];
const HEART=[".11...11.","1111.1111","111111111","111111111",".1111111.","..11111..","...111...","....1...."];
const hsl=(h,s,l)=>`hsl(${((h%360)+360)%360} ${s}% ${l}%)`;
const rnd=n=>Math.floor(Math.random()*n);

/* ---------- me: species + color, remembered on this device ---------- */
let me=null;try{me=JSON.parse(localStorage.getItem("cg_me"))}catch(e){}
let chosen=!!(me&&me.ok);
if(!me||!(me.sp>=0&&me.sp<8)||typeof me.hue!=="number")me={sp:rnd(8),hue:HUES[rnd(8)]};
const saveMe=()=>{try{localStorage.setItem("cg_me",JSON.stringify({sp:me.sp,hue:me.hue,ok:1}))}catch(e){}};
function spr(c,i,x,y,hue,flip){const rows=SP[i],pal={1:hsl(hue,85,55),2:hsl(hue+60,90,65),3:"#fff",4:hsl(hue,60,25)};
  for(let r=0;r<rows.length;r++)for(let q=0;q<10;q++){const ch=rows[r][q];if(ch==="."||!ch)continue;c.fillStyle=pal[ch];c.fillRect(x+(flip?9-q:q),y+r,1,1)}}

/* ---------- page furniture ---------- */
const st=document.createElement("style");st.textContent=`
#wv{position:fixed;inset:0;z-index:8;background:#05010f;display:none;opacity:0;transition:opacity .5s}
#wv.on{display:block}#wv.show{opacity:1}
#wc{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;touch-action:none}
.wtop,.wbot{position:absolute;left:0;right:0;padding:10px 12px;display:flex;justify-content:space-between;gap:8px;pointer-events:none;z-index:2}
.wtop{top:0;align-items:flex-start;padding-top:calc(env(safe-area-inset-top,0px) + 10px)}
.wbot{bottom:0;align-items:flex-end;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 12px)}
.wtop>*,.wbot>*{pointer-events:auto}
.wbtns{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
#wname{color:var(--neon);text-shadow:0 0 8px var(--neon);font-size:13px;max-width:52vw;pointer-events:none}
#wname small{display:block;color:var(--pink);font-size:11px;margin-top:2px}
#bub{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 78px);max-width:min(90vw,420px);background:#12072aee;border:2px solid var(--pink);box-shadow:0 0 16px #ff2bd666;padding:8px 12px;font-size:13px;line-height:1.4;text-align:center;opacity:0;transition:opacity .25s;pointer-events:none;z-index:3}
#bub.on{opacity:1}
#lovepick{display:flex;gap:4px}
#lovepick button{padding:4px 7px;font-size:17px;line-height:1.1;box-shadow:none}
#lovepick button.sel{background:#fff3;box-shadow:0 0 10px currentColor}
#wload{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--neon);z-index:4;background:#05010f;letter-spacing:2px}
#mepick{z-index:9}
#mesp,#meco{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:12px 0}
#mesp button{padding:6px}#mesp canvas{width:50px;height:50px;image-rendering:pixelated;display:block}
#mesp button.sel{background:#00ffd533;box-shadow:0 0 14px var(--neon)}
#meco button{width:30px;height:30px;padding:0;border-radius:50%}
#meco button.sel{outline:3px solid #fff}
#landBtn{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 40px);z-index:3;display:none;background:#05010fdd;max-width:92vw}`;
document.head.appendChild(st);
const wv=document.createElement("div");wv.id="wv";
wv.innerHTML=`<canvas id="wc"></canvas>
<div class="wtop"><div id="wname"></div><div class="wbtns"><button id="wme" title="change your alien">&#128125;</button><button id="wleave" class="pink">&uarr; TO SPACE</button></div></div>
<div id="bub"></div>
<div class="wbot"><div id="lovepick"></div><div class="wbtns"><button id="wact" title="E: make friends / touch">E</button><button id="wplant" class="pink">&hearts; PLANT LOVE</button></div></div>
<div id="wload">DESCENDING...</div>`;
document.body.appendChild(wv);
const pk=document.createElement("div");pk.className="overlay";pk.id="mepick";
pk.innerHTML=`<div class="box"><h2>Who are you out here?</h2><div id="mesp"></div><div id="meco"></div><div class="row" style="justify-content:center"><button class="pink" id="mego">GO EXPLORE</button></div></div>`;
document.body.appendChild(pk);
const lb=document.createElement("button");lb.id="landBtn";lb.className="pink";document.body.appendChild(lb);
const meBtn=document.createElement("button");meBtn.id="meBtn";meBtn.innerHTML="&#128760; MY ALIEN";
$("findBtn").parentNode.insertBefore(meBtn,$("findBtn"));

/* ---------- alien picker ---------- */
let pickAfter=null;
function drawPicker(){
  const a=$("mesp"),b=$("meco");a.textContent="";b.textContent="";
  SP.forEach((_,i)=>{const bt=document.createElement("button"),cv=document.createElement("canvas");cv.width=10;cv.height=10;
    spr(cv.getContext("2d"),i,0,0,me.hue,false);bt.appendChild(cv);bt.title=SPECIES[i];if(i===me.sp)bt.className="sel";
    bt.onclick=()=>{me.sp=i;drawPicker()};a.appendChild(bt)});
  HUES.forEach(h=>{const bt=document.createElement("button");bt.style.background=hsl(h,85,55);bt.style.borderColor=hsl(h,85,55);
    if(h===me.hue)bt.className="sel";bt.onclick=()=>{me.hue=h;drawPicker()};b.appendChild(bt)});
}
function openPicker(after){pickAfter=after||null;drawPicker();pk.classList.add("on")}
$("mego").onclick=()=>{chosen=true;saveMe();pk.classList.remove("on");const f=pickAfter;pickAfter=null;if(f)f()};
meBtn.onclick=()=>openPicker();$("wme").onclick=()=>openPicker();
const dexB=document.createElement("button");dexB.textContent="DEX";dexB.title="your field guide";dexB.onclick=showDex;$("wme").parentNode.insertBefore(dexB,$("wme"));
$("enter").addEventListener("click",()=>{if(!chosen)setTimeout(()=>openPicker(),200)});

/* ---------- deterministic terrain (integer hashes + plain arithmetic, so every device builds the same world) ---------- */
function ih(a,b,s){let h=Math.imul(a|0,374761393)^Math.imul(b|0,668265263)^Math.imul(s|0,1597334677);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296}
function vn(s,x,y,f){const gx=Math.floor(x/f),gy=Math.floor(y/f);let fx=x/f-gx,fy=y/f-gy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
  const a=ih(gx,gy,s),b=ih(gx+1,gy,s),c=ih(gx,gy+1,s),d=ih(gx+1,gy+1,s);return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy}
// terrain: 0 deep water, 1 shallow, 2 sand, 3 grass, 4 dust, 5 rock, 6 peak
function genWorld(o){
  const seed=o.seed|0,hue=o.hue!=null?o.hue:hash(String(o.seed))%360;
  const ter=new Uint8Array(N*N),solid=new Uint8Array(N*N);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const dx=(x-N/2)/(N/2),dy=(y-N/2)/(N/2),i=y*N+x;
    const e=.5*vn(seed,x,y,18)+.3*vn(seed+1,x,y,9)+.2*vn(seed+2,x,y,4.5)-.62*(dx*dx+dy*dy)+.12,m=vn(seed+7,x,y,14);
    const t=e<.28?0:e<.36?1:e<.42?2:e<.78?(m>.42?3:4):e<.92?5:6;ter[i]=t;solid[i]=(t===0||t===6)?1:0;
  }
  let sx=N>>1,sy=N>>1,bd=1e9;
  for(let pass=0;pass<2&&bd===1e9;pass++)for(let y=0;y<N;y++)for(let x=0;x<N;x++){const t=ter[y*N+x];
    if(pass===0?t!==3:(t<2||t>5))continue;const d=(x-N/2)**2+(y-N/2)**2;if(d<bd){bd=d;sx=x;sy=y}}
  const ob=[];
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=y*N+x;if(solid[i]||Math.abs(x-sx)+Math.abs(y-sy)<4)continue;
    const t=ter[i],r=ih(x,y,seed+20);
    if(t===3){if(r<.075){ob.push({tx:x,ty:y,k:Math.floor(ih(x,y,seed+21)*3),ph:r*80});solid[i]=1}else if(r<.2)ob.push({tx:x,ty:y,k:3,ph:r*50})}
    else if((t===5||t===4)&&r<.045){ob.push({tx:x,ty:y,k:4,ph:r*60});solid[i]=1}
    else if(t===2&&r<.02){ob.push({tx:x,ty:y,k:5,ph:0});solid[i]=1}
  }
  const g=document.createElement("canvas");g.width=g.height=WP;const gc=g.getContext("2d");
  const C={0:[[190,70,11],[190,70,14]],1:[[190,65,26],[190,65,31]],2:[[40,55,60],[40,55,54]],3:[[0,55,30],[0,55,34],[0,60,27]],4:[[25,35,30],[25,35,26]],5:[[10,10,40],[10,10,34]],6:[[0,0,72],[0,0,62]]};
  const at=(x,y)=>x>=0&&y>=0&&x<N&&y<N?ter[y*N+x]:0;
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const t=ter[y*N+x],cs=C[t],p=cs[Math.floor(ih(x,y,seed+3)*cs.length)];
    gc.fillStyle=hsl(t===3?hue:hue+p[0],p[1],p[2]);gc.fillRect(x*T,y*T,T,T);
    if(t>1)for(let k=0;k<3;k++){gc.fillStyle=k&1?"rgba(0,0,0,.12)":"rgba(255,255,255,.07)";gc.fillRect(x*T+Math.floor(ih(x,y,seed+30+k)*8),y*T+Math.floor(ih(x,y,seed+40+k)*8),1,1)}
    if(t===1){gc.fillStyle="rgba(255,255,255,.22)";if(at(x-1,y)>=2)gc.fillRect(x*T,y*T,1,T);if(at(x+1,y)>=2)gc.fillRect(x*T+7,y*T,1,T);if(at(x,y-1)>=2)gc.fillRect(x*T,y*T,T,1);if(at(x,y+1)>=2)gc.fillRect(x*T,y*T+7,T,1)}
    if(t===6){gc.fillStyle="#fff";gc.fillRect(x*T+2,y*T+1,4,3)}
  }
  return{seed,hue,ter,solid,ob,sx,sy,ground:g,lm:[],occ:new Set()};
}

/* ---------- world state ---------- */
let W0=null,cur=null,wk="",L=null,P=null,cre=[],seeds=[],remote=[],mine=[],kids=[],MIRS={},wcam={x:0,y:0},VW=0,VH=0,runId=0;
let pickK=0,goal=null,lastPlant=0,lastMs=0,lastRc=0,wx=[],fx=[],trail=[],shown=new Map(),portalT=0,pollT=0,bt=0;
const lights=[],keys=new Set();
const c2=$("wc").getContext("2d");
const worldKey=o=>o.id!=null?"w"+o.id:o.creature&&o.n!=null?"c"+o.creature.id+"."+o.n:"s"+o.seed.toString(36);
const free=(tx,ty)=>tx>=0&&ty>=0&&tx<N&&ty<N&&!W0.solid[ty*N+tx];
const canStand=(x,y)=>free(Math.floor((x-2)/T),Math.floor(y/T))&&free(Math.floor((x+2)/T),Math.floor(y/T));
function nearFree(tx,ty,maxR,far){
  for(let r=0;r<=maxR;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const x=tx+dx,y=ty+dy;if(!free(x,y))continue;
    const t=W0.ter[y*N+x];if(t<2||t>4)continue;if(far&&Math.abs(x-W0.sx)+Math.abs(y-W0.sy)<5)continue;if(W0.occ.has(x+","+y))continue;return[x,y]}
  return null}
function say(s,ms){const b=$("bub");b.textContent=s;b.classList.add("on");clearTimeout(bt);bt=setTimeout(()=>b.classList.remove("on"),ms||4500)}
const ago=t=>{const s=Math.max(0,(Date.now()-t)/1000);return s<60?"just now":s<3600?Math.floor(s/60)+" min ago":s<86400?Math.floor(s/3600)+" h ago":Math.floor(s/86400)+" days ago"};
function chime(n){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const f=262*Math.pow(2,[0,2,4,7,9,12][n%6]/12),t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();
  o.type="triangle";o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.07,t+.03);g.gain.exponentialRampToValueAtTime(.0001,t+.9);o.connect(g).connect(AC.destination);o.start(t);o.stop(t+1)}catch(e){}}

/* ---------- love seeds: yours + everyone's, grow with real time, spread where love is already growing ---------- */
const localLoad=()=>{try{return JSON.parse(localStorage.getItem("cg_seeds:"+wk)||"[]").filter(s=>Number.isInteger(s.tx)&&Number.isInteger(s.ty)&&s.k>=0&&s.k<6)}catch(e){return[]}};
const localSave=()=>{try{localStorage.setItem("cg_seeds:"+wk,JSON.stringify(mine))}catch(e){}};
function merge(){const m=new Map();remote.forEach(s=>m.set(s.tx+","+s.ty,s));mine.forEach(s=>{const k=s.tx+","+s.ty;if(!m.has(k))m.set(k,s)});
  seeds=[...m.values()].sort((a,b)=>a.t-b.t||(a.id<b.id?-1:1))}
function recompute(){
  const now=Date.now();W0.occ=new Set(W0.lm.map(l=>l.tx+","+l.ty));seeds.forEach(s=>W0.occ.add(s.tx+","+s.ty));kids=[];
  for(const s of seeds){let nb=0;for(const q of seeds)if(q!==s&&Math.abs(q.tx-s.tx)<=3&&Math.abs(q.ty-s.ty)<=3)nb++;
    s.age=(now-s.t)/1000*(1+.4*Math.min(4,nb));s.st=s.age<15?0:s.age<90?1:s.age<600?2:s.age<3600?3:4;
    if(s.st>=3)[1800,5400,14400].forEach((th,i)=>{if(s.age>th){const h=hash(s.id+":"+i),p=nearFree(s.tx+(h%7)-3,s.ty+((h>>>5)%7)-3,3,false);
      if(p){W0.occ.add(p[0]+","+p[1]);kids.push({tx:p[0],ty:p[1],k:s.k,sp:s.sp,id:s.id+i,st:3,kid:1,t:s.t})}}})}
}
async function fetchSeeds(){const w=wk;if(!CFG.API_URL||!w)return;
  try{const r=await fetch(CFG.API_URL.replace(/\/$/,"")+"/seeds?w="+encodeURIComponent(w)),j=await r.json();if(w!==wk||!j.ok||!Array.isArray(j.seeds))return;
    remote=j.seeds.filter(s=>s&&Number.isInteger(s.tx)&&s.tx>=0&&s.tx<N&&Number.isInteger(s.ty)&&s.ty>=0&&s.ty<N&&s.k>=0&&s.k<6&&s.sp>=0&&s.sp<8&&s.t>0)
      .slice(0,150).map(s=>({id:String(s.id).slice(0,12),tx:s.tx,ty:s.ty,k:s.k|0,sp:s.sp|0,t:+s.t}));merge();recompute()}catch(e){}}
async function fetchMir(){for(const u of [RAW+"miracles.json","miracles.json"]){try{const r=await fetch(u);if(r.ok){MIRS=await r.json();return}}catch(e){}}}
function plant(){
  if(!W0)return;if(Date.now()-lastPlant<2500)return say("Let the last seed settle first...",2000);
  const tx=Math.floor((P.x+P.dx*9)/T),ty=Math.floor((P.y+P.dy*9)/T);
  if(!free(tx,ty)||(W0.ter[ty*N+tx]!==3&&W0.ter[ty*N+tx]!==4))return say("Love grows in soil. Face some grass and try again.");
  if(W0.occ.has(tx+","+ty))return say("Something already grows there.");
  if(mine.length>=12)return say("That is plenty of love for now. Let it grow, then come back.");
  const s={id:"l"+Math.random().toString(36).slice(2,8),tx,ty,k:pickK,sp:me.sp,t:Date.now()};lastPlant=Date.now();
  mine.push(s);localSave();merge();recompute();burst(tx*T+4,ty*T,LOVE[pickK][1],10);chime(pickK);
  say("You planted a seed of "+LOVE[pickK][0].toLowerCase()+". It keeps growing while you are away.");
  if(!CFG.API_URL){setTimeout(()=>say("Only you can see it until the Worker is connected.",3500),2800);return}
  fetch(CFG.API_URL.replace(/\/$/,"")+"/seed",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({w:wk,tx,ty,k:s.k,sp:s.sp})})
    .then(r=>r.json()).then(j=>{if(j.ok&&j.seed){s.id=String(j.seed.id).slice(0,12);s.t=+j.seed.t||s.t;localSave();merge();recompute()}
      else{mine=mine.filter(q=>q!==s);localSave();merge();recompute();say(j.error||"The universe could not keep that seed.")}})
    .catch(()=>say("Planted in your own garden. Could not reach the shared one."))}
function burst(x,y,col,n){for(let i=0;i<n;i++)fx.push({x,y:y-4,vx:(Math.random()-.5)*26,vy:-14-Math.random()*22,l:1.4,c:col})}

/* ---------- landing ---------- */
const wtype=s=>{s=(s||"").toLowerCase();return/rain|drizzle|thunder|shower/.test(s)?"rain":/snow|glitter|frost|ice|hail/.test(s)?"snow":/ash|ember|fire|spark/.test(s)?"ember":/meteor|comet|shooting/.test(s)?"meteor":/fog|mist|cloud|haze|moon/.test(s)?"fog":/wind|static|hum|breeze|gale|storm/.test(s)?"wind":"spark"};
function blob(r,h){const c=document.createElement("canvas");c.width=9;c.height=9;const x=c.getContext("2d"),body=hsl(h,80,60),acc=hsl(h+70,85,70);
  for(let y=2;y<9;y++)for(let q=0;q<5;q++){const d=Math.hypot(q-4,(y-5.4)*1.2);if(d<4.2&&r()<.92){x.fillStyle=r()<.25?acc:body;x.fillRect(q,y,1,1);x.fillRect(8-q,y,1,1)}}
  x.fillStyle=body;x.fillRect(4,3,1,5);x.fillStyle="#fff";x.fillRect(2,5,1,1);x.fillRect(6,5,1,1);x.fillStyle="#102";x.fillRect(2,6,1,1);x.fillRect(6,6,1,1);
  if(r()<.6){x.fillStyle=acc;x.fillRect(2,1,1,2);x.fillRect(6,1,1,2)}return c}
function setupLandmarks(){W0.lm=[];W0.occ=new Set();
  (MIRS[wk]||[]).slice(-6).forEach(m=>{if(!m||typeof m.kind!=="string")return;const h=hash(wk+":"+m.name+":"+m.kind),p=nearFree(h%N,(h>>>8)%N,30,true);
    if(!p)return;W0.solid[p[1]*N+p[0]]=1;W0.occ.add(p[0]+","+p[1]);
    W0.lm.push({tx:p[0],ty:p[1],m:{god:(m.god|0)%3,kind:m.kind,name:String(m.name||"").slice(0,40),note:String(m.note||"").slice(0,160)}})})}
function setupCreatures(){cre=[];const r=rngFrom(hash(String(L.life)+cur.seed));
  for(let i=0;i<6;i++)for(let tries=0;tries<80;tries++){const tx=Math.floor(r()*N),ty=Math.floor(r()*N);
    if(!free(tx,ty)||W0.ter[ty*N+tx]!==3||Math.abs(tx-W0.sx)+Math.abs(ty-W0.sy)<3)continue;
    cre.push({x:tx*T+4,y:ty*T+6,tx:tx*T+4,ty:ty*T+6,wait:r()*3,follow:false,fi:0,img:blob(r,W0.hue+r()*140),ph:r()*6,spi:i%3});break}}
function setupWeather(){const k=wtype(L.weather),n=k==="meteor"?6:k==="fog"?6:70;wx=[];
  for(let i=0;i<n;i++)wx.push({x:Math.random(),y:Math.random(),s:.5+Math.random(),h:Math.random()*360,k})}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function loadWorld(o){
  const id=++runId;cur=o;wk=worldKey(o);W0=null;window.worldOpen=true;
  $("wload").style.display="flex";wv.classList.add("on");requestAnimationFrame(()=>wv.classList.add("show"));
  await sleep(80);
  const w=wk;await Promise.race([Promise.all([fetchMir(),(async()=>{mine=localLoad();remote=[]})()]),sleep(2500)]);
  if(id!==runId)return;
  L=lore(o);W0=genWorld(o);setupLandmarks();setupCreatures();setupWeather();
  P={x:W0.sx*T+4,y:W0.sy*T+6,dx:0,dy:1,step:0,face:1};wcam.x=P.x;wcam.y=P.y;trail=[];fx=[];goal=null;shown.clear();kids=[];portalT=0;
  merge();recompute();
  $("wname").textContent="";const n=document.createElement("span");n.textContent=o.name;const sm=document.createElement("small");sm.textContent=o.region||o.type||"";$("wname").append(n,sm);
  drawLovePick();resizeW();$("wload").style.display="none";sing(o);
  say("You landed on "+o.name+". Weather: "+(L.weather||"calm")+". Walk with WASD, arrows or tap. Plant love with Space.",6500);
  lastMs=performance.now();requestAnimationFrame(loop);
  clearInterval(pollT);fetchSeeds();pollT=setInterval(fetchSeeds,30000);
}
function leave(){runId++;window.worldOpen=false;clearInterval(pollT);wv.classList.remove("show");setTimeout(()=>{if(!window.worldOpen)wv.classList.remove("on")},520);cam.tx=null}
function land(o){if(!o||o.kind==="being"||o.seed==null)return;if(!chosen)return openPicker(()=>land(o));loadWorld(o)}
function warp(){const ps=objs.filter(q=>q!==cur&&q.text);if(!ps.length)return;const o=ps[rnd(ps.length)];say("The portal pulls you toward "+o.name+"...",2500);
  wv.classList.remove("show");setTimeout(()=>loadWorld(o),550)}
function drawLovePick(){const p=$("lovepick");p.textContent="";LOVE.forEach((k,i)=>{const b=document.createElement("button");b.textContent="\u2665";b.style.color=k[1];b.style.borderColor=k[1];b.title=k[0];
  if(i===pickK)b.className="sel";b.onclick=()=>{pickK=i;drawLovePick();say(k[0]+": "+k[2],2500)};p.appendChild(b)})}
function resizeW(){const px=Math.max(2,Math.round(Math.min(innerWidth,innerHeight)/200));VW=Math.ceil(innerWidth/px);VH=Math.ceil(innerHeight/px);$("wc").width=VW;$("wc").height=VH}
addEventListener("resize",()=>{if(window.worldOpen)resizeW()});

/* ---------- input ---------- */
const typing=e=>e.target&&/INPUT|TEXTAREA/.test(e.target.tagName);
addEventListener("keydown",e=>{if(typing(e))return;const k=e.key.toLowerCase();
  if(window.worldOpen){if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k))e.preventDefault();
    if(k==="escape"&&!pk.classList.contains("on"))leave();else if(k==="e")act();else if(k===" "||k==="f")plant();
    else if(/^[1-6]$/.test(k)){pickK=+k-1;drawLovePick()}else keys.add(k);return}
  if(k==="e"&&nearObj&&!document.querySelector(".overlay.on"))land(nearObj);else keys.add(k)});
addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));addEventListener("blur",()=>keys.clear());
const toW=e=>{const b=$("wc").getBoundingClientRect();return{x:(e.clientX-b.left)/b.width*VW+wcam.x-VW/2,y:(e.clientY-b.top)/b.height*VH+wcam.y-VH/2}};
let wdown=false;
$("wc").addEventListener("pointerdown",e=>{if(!W0||!P)return;wdown=true;$("wc").setPointerCapture(e.pointerId);goal=toW(e);
  const g=goal;let best=null,bd=10;for(const c of cre){const d=Math.hypot(c.x-g.x,c.y-g.y);if(d<bd){bd=d;best=c}}
  if(best&&Math.hypot(best.x-P.x,best.y-P.y)<30){pet(best);goal=null}});
$("wc").addEventListener("pointermove",e=>{if(wdown)goal=toW(e)});
$("wc").addEventListener("pointerup",()=>{wdown=false});
$("wleave").onclick=leave;$("wplant").onclick=plant;$("wact").onclick=act;

function pet(c){burst(c.x,c.y-3,"#ff7ad9",7);chime(rnd(6));
  if(c.follow){c.follow=false;say("Your friend wanders off, still smiling.");return}
  const n=cre.filter(q=>q.follow).length;if(n>=3){say("Your three friends are full of hugs already.");return}
  c.follow=true;c.fi=n;const d=dexAdd(c);say("You made friends with "+d.name+(d.isNew?" (new! added to your field guide)":"")+". They will follow you.")}
function dexAdd(c){let name=L.life||"a tiny local",isNew=false;
  try{const s=species(cur),sp=s[c.spi%s.length],dx=getDex(),k=wk+":"+c.spi;isNew=!dx[k];name=sp.name;
    dx[k]={name:sp.name,desc:sp.desc,planet:cur.name,img:c.img.toDataURL("image/png")};localStorage.setItem("cg_dex",JSON.stringify(dx))}catch(e){}
  return{name,isNew}}
function act(){if(!W0||!P)return;
  const c=[];cre.forEach(q=>c.push([Math.hypot(q.x-P.x,q.y-P.y),()=>pet(q)]));
  W0.lm.forEach(l=>c.push([Math.hypot(l.tx*T+4-P.x,l.ty*T+7-P.y)-4,()=>touchLm(l)]));
  c.sort((a,b)=>a[0]-b[0]);if(c[0]&&c[0][0]<26)c[0][1]();else say("Nothing within reach. Walk up to a creature or a landmark and press E.")}
function touchLm(l){const m=l.m;say(GOD[m.god][0]+" left "+m.name+" here: "+m.note,7000);if(m.kind==="music-stone")sing(cur);else chime(m.god*2)}

/* ---------- update ---------- */
function update(dt,t){
  let ix=0,iy=0;
  if(keys.has("arrowleft")||keys.has("a"))ix--;if(keys.has("arrowright")||keys.has("d"))ix++;if(keys.has("arrowup")||keys.has("w"))iy--;if(keys.has("arrowdown")||keys.has("s"))iy++;
  if(ix||iy)goal=null;else if(goal){const dx=goal.x-P.x,dy=goal.y-P.y,d=Math.hypot(dx,dy);if(d<3)goal=null;else{ix=dx/d;iy=dy/d}}
  const m=Math.hypot(ix,iy);P.moving=false;
  if(m){ix/=m;iy/=m;P.dx=ix;P.dy=iy;if(Math.abs(ix)>.2)P.face=ix>0?1:-1;
    const shallow=W0.ter[Math.floor(P.y/T)*N+Math.floor(P.x/T)]===1,sp=(shallow?32:54)*dt,ox=P.x,oy=P.y;
    if(canStand(P.x+ix*sp,P.y))P.x+=ix*sp;if(canStand(P.x,P.y+iy*sp))P.y+=iy*sp;
    P.moving=Math.hypot(P.x-ox,P.y-oy)>.01;if(!P.moving)goal=null;else P.step+=dt*9;
    if(P.moving&&(!trail.length||Math.hypot(trail[0].x-P.x,trail[0].y-P.y)>2)){trail.unshift({x:P.x,y:P.y});if(trail.length>40)trail.pop()}}
  wcam.x+=(P.x-wcam.x)*Math.min(1,dt*6);wcam.y+=(P.y-wcam.y)*Math.min(1,dt*6);
  wcam.x=Math.max(VW/2,Math.min(WP-VW/2,wcam.x));wcam.y=Math.max(VH/2,Math.min(WP-VH/2,wcam.y));
  for(const c of cre){
    if(c.follow){const tr=trail[Math.min(trail.length-1,(c.fi+1)*7)];if(tr){c.tx=tr.x;c.ty=tr.y}}
    else{c.wait-=dt;const dp=Math.hypot(P.x-c.x,P.y-c.y);
      if(dp<30&&dp>12){c.tx=P.x;c.ty=P.y}
      else if(c.wait<=0||Math.hypot(c.tx-c.x,c.ty-c.y)<2){const a=Math.random()*6.28,d=10+Math.random()*30;c.tx=c.x+Math.cos(a)*d;c.ty=c.y+Math.sin(a)*d;c.wait=2+Math.random()*3}}
    const dx=c.tx-c.x,dy=c.ty-c.y,d=Math.hypot(dx,dy);
    if(d>2&&!(!c.follow&&Math.hypot(P.x-c.x,P.y-c.y)<12)){const sp=(c.follow?42:15)*dt,nx=c.x+dx/d*sp,ny=c.y+dy/d*sp;if(canStand(nx,c.y))c.x=nx;if(canStand(c.x,ny))c.y=ny;c.dir=dx>0?1:-1}}
  for(const l of W0.lm){const d=Math.hypot(l.tx*T+4-P.x,l.ty*T+7-P.y);
    if(d<18&&t-(shown.get(l)||-99)>14){shown.set(l,t);touchLm(l)}
    if(l.m.kind==="portal"&&d<13){portalT+=dt;if(portalT>.5){portalT=-99;warp()}}}
  for(const s of seeds.concat(kids)){const d=Math.hypot(s.tx*T+4-P.x,s.ty*T+4-P.y);
    if(s.st>=1&&d<13&&t-(shown.get(s.id)||-99)>12){shown.set(s.id,t);const k=LOVE[s.k];say(k[0]+": "+k[2]+"  Planted by a "+SPECIES[s.sp]+" "+ago(s.t)+".",5500);if(s.st>=3)chime(s.k)}}
  if(t-lastRc>4){recompute();lastRc=t}
  for(const f of fx){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=10*dt;f.l-=dt}fx=fx.filter(f=>f.l>0);
}

/* ---------- draw ---------- */
let R=null;
function rect(x,y,w,h,col){c2.fillStyle=col;c2.fillRect(Math.round(x),Math.round(y),w,h)}
function disc(X,Y,r,col){c2.fillStyle=col;for(let dy=-r;dy<=r;dy++){const w=Math.floor(Math.sqrt(r*r-dy*dy));c2.fillRect(Math.round(X-w),Math.round(Y+dy),2*w+1,1)}}
function heart(X,Y,col){c2.fillStyle=col;for(let y=0;y<8;y++)for(let x=0;x<9;x++)if(HEART[y][x]==="1")c2.fillRect(Math.round(X)+x,Math.round(Y)+y,1,1)}
function drawOb(o,X,Y,t){const h=W0.hue,sw=Math.sin(t*1.4+o.ph)*.9;
  if(o.k===0){rect(X-1,Y-5,2,5,"#4a3224");disc(X+sw,Y-9,5,hsl(h+20,55,36));disc(X+sw-1,Y-10,3,hsl(h+20,60,46))}
  else if(o.k===1){rect(X-1,Y-3,2,3,"#4a3224");for(let i=0;i<9;i++){const w=1+(i>>1);rect(X-w+sw*(1-i/9),Y-12+i,2*w+1,1,hsl(h+10,50,i%2?30:37))}}
  else if(o.k===2){const a=hsl(h+150,70,55);rect(X-1,Y-4,2,4,"#e8dcc8");rect(X-4,Y-6,9,2,a);rect(X-3,Y-8,7,2,a);rect(X-2,Y-9,5,1,a);rect(X-2,Y-7,1,1,"#fff");rect(X+1,Y-8,1,1,"#fff")}
  else if(o.k===3){rect(X,Y-2,1,2,hsl(h,50,30));rect(X-1,Y-4,3,2,hsl(h+120+(o.ph*37)%200,90,72))}
  else if(o.k===4){const a=hsl(h+180,90,68);for(let i=0;i<9;i++){const w=i<5?(i>>1):(8-i)>>1;rect(X-w,Y-10+i,2*w+1,1,i%3?a:"#fff")}lights.push({x:X,y:Y-6,r:12,c:a})}
  else{rect(X-2,Y-3,5,3,"#8d8aa6");rect(X-1,Y-4,3,1,"#b7b4cc")}}
function drawLove(s,X,Y,t){const col=LOVE[s.k][1],sw=Math.sin(t*2+s.tx)*.7,g="#3fbf6a",hh=s.kid?4:7;
  if(s.st===0){rect(X-1,Y-2,2,2,col);lights.push({x:X,y:Y-1,r:5,c:col})}
  else if(s.st===1){rect(X,Y-4,1,4,g);rect(X-2,Y-4,2,1,g);rect(X+1,Y-5,2,1,g)}
  else if(s.st===2){rect(X,Y-5,1,5,g);rect(X-1,Y-6,3,1,g);rect(X-1+sw*.5,Y-9,3,3,col)}
  else if(s.st===3){const hx=X+sw,hy=Y-hh-3;rect(X,Y-hh,1,hh,g);rect(X-3,Y-hh+2,3,1,g);rect(X+1,Y-hh+3,3,1,g);
    for(const[dx,dy]of[[0,-2],[2,0],[0,2],[-2,0]])rect(hx-1+dx,hy-1+dy,3,3,col);rect(hx,hy,1,1,"#fff6a0");lights.push({x:X,y:hy,r:s.kid?7:10,c:col})}
  else{rect(X-1,Y-8,3,8,"#5a3a2a");rect(X-3,Y-5,2,1,g);rect(X+2,Y-6,2,1,g);heart(X-4+sw,Y-18,col);rect(X-2+sw,Y-16,1,1,"#fff");lights.push({x:X,y:Y-14,r:17,c:col});
    if(Math.random()<.02)fx.push({x:X+(Math.random()-.5)*8,y:Y-12,vx:(Math.random()-.5)*10,vy:2,l:2.2,c:col})}}
function drawLm(l,X,Y,t){const m=l.m,gc=GOD[m.god][1],k=m.kind,b=Math.sin(t*2+l.tx)*1.5,stone="#8d8aa6",dark="#5a5873";let oh=24;
  if(k==="shrine"){rect(X-5,Y-3,11,3,stone);rect(X-3,Y-9,7,6,dark);rect(X-1,Y-12,3,3,gc);lights.push({x:X,y:Y-11,r:14,c:gc})}
  else if(k==="pond"){rect(X-8,Y-2,17,4,hsl(200,70,30));rect(X-6,Y-4,13,2,hsl(200,70,34));rect(X-5+(Math.floor(t*3)%9),Y-3,2,1,"#bff");rect(X+2,Y-4,2,1,gc);oh=14}
  else if(k==="great-tree"){rect(X-3,Y-12,6,12,"#4a3224");disc(X,Y-20,12,hsl(W0.hue+30,55,34));disc(X-3,Y-22,6,hsl(W0.hue+30,60,44));
    for(let i=0;i<6;i++)rect(X-9+i*4+(i*5)%3,Y-26+(i*7)%11,2,2,gc);oh=38}
  else if(k==="portal"){for(let a=0;a<30;a++){const an=a/30*6.283+t*2;rect(X+Math.cos(an)*7,Y-12+Math.sin(an)*10,2,2,a%2?gc:"#fff")}lights.push({x:X,y:Y-12,r:14,c:gc});oh=30}
  else if(k==="statue"){rect(X-3,Y-2,7,2,stone);rect(X-2,Y-10,5,8,dark);rect(X-1,Y-14,3,4,stone);rect(X-4,Y-8,2,1,dark);rect(X+3,Y-8,2,1,dark);rect(X-3,Y-17,7,1,gc)}
  else if(k==="lantern"){rect(X,Y-14,1,14,dark);rect(X-2,Y-18,5,4,gc);lights.push({x:X,y:Y-16,r:20,c:gc})}
  else if(k==="garden"){for(let i=0;i<6;i++){const fx_=X-8+i*3,fy=Y-((i*5)%4);rect(fx_,fy-3,1,3,"#3fbf6a");rect(fx_-1,fy-5,3,2,i%2?gc:"#fff")}oh=14}
  else{rect(X-3,Y-12,7,12,stone);rect(X-2,Y-12,5,2,dark);rect(X-1,Y-9,1,4,gc);rect(X,Y-9,2,1,gc);rect(X-2,Y-6,2,2,gc);if(Math.sin(t*4)>.6)lights.push({x:X,y:Y-8,r:10,c:gc})}
  rect(X-1,Y-oh-6+b,3,3,gc);rect(X,Y-oh-7+b,1,1,"#fff");lights.push({x:X,y:Y-oh-5+b,r:8,c:gc})}
function drawWeather(t,dt,night){const k=wx.length?wx[0].k:"spark";
  for(const p of wx){
    if(k==="rain"){p.y+=(.9+p.s*.5)*dt*1.4;p.x-=dt*.12;rect(p.x*VW,p.y*VH,1,3,"rgba(160,190,255,.55)")}
    else if(k==="snow"){p.y+=dt*.14*p.s;p.x+=Math.sin(t+p.h)*dt*.04;rect(p.x*VW,p.y*VH,1,1,p.h%3<1?"#fff":hsl(p.h,100,80))}
    else if(k==="ember"){p.y-=dt*.1*p.s;p.x+=Math.sin(t*2+p.h)*dt*.03;rect(p.x*VW,p.y*VH,1,1,Math.sin(t*5+p.h)>0?"#ffb347":"#ff6a3d")}
    else if(k==="meteor"){p.x+=dt*.9;p.y+=dt*.5;for(let i=0;i<7;i++)rect(p.x*VW-i*2,p.y*VH-i,1,1,`rgba(255,${230-i*25},200,${1-i/7})`)}
    else if(k==="fog"){p.x+=dt*.015*p.s;c2.globalAlpha=.07;rect(p.x*VW-30,p.y*VH,60+p.s*30,10+p.s*8,"#fff");c2.globalAlpha=1}
    else if(k==="wind"){p.x+=dt*.5*p.s;p.y+=Math.sin(t+p.h)*dt*.01;rect(p.x*VW,p.y*VH,5,1,"rgba(255,255,255,.28)")}
    else if(Math.sin(t*3+p.h)>.7)rect(p.x*VW,p.y*VH,1,1,hsl(p.h,100,85));
    if(p.x>1.1)p.x=-.1;if(p.x<-.1)p.x=1.1;if(p.y>1.1)p.y=-.1;if(p.y<-.1)p.y=1.1}
  if(night>.12)for(let i=0;i<24;i++){const x=ih(i,1,9)*VW+Math.sin(t*.6+i)*9,y=ih(i,2,9)*VH+Math.cos(t*.5+i*2)*7;
    if(Math.sin(t*2+i*3)>-.2){rect(x,y,1,1,"#e9ff7a");lights.push({x,y,r:4,c:"#e9ff7a"})}}}
function draw(t,dt){
  const c=c2;c.imageSmoothingEnabled=false;c.globalAlpha=1;c.globalCompositeOperation="source-over";lights.length=0;
  const ox=Math.round(wcam.x-VW/2),oy=Math.round(wcam.y-VH/2);
  c.drawImage(W0.ground,ox,oy,VW,VH,0,0,VW,VH);
  const x0=Math.max(0,Math.floor(ox/T)),x1=Math.min(N-1,Math.floor((ox+VW)/T)),y0=Math.max(0,Math.floor(oy/T)),y1=Math.min(N-1,Math.floor((oy+VH)/T));
  c.fillStyle="rgba(255,255,255,.33)";
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(W0.ter[y*N+x]<2&&(x*7+y*13+Math.floor(t*1.5))%9===0)c.fillRect(x*T-ox+2+(x*3)%3,y*T-oy+3,2,1);
  const D=[],vis=(x,y)=>x>ox-24&&x<ox+VW+24&&y>oy-8&&y<oy+VH+44;
  for(const o of W0.ob){const x=o.tx*T+4,y=o.ty*T+7;if(vis(x,y))D.push([y,()=>drawOb(o,x-ox,y-oy,t)])}
  for(const s of seeds.concat(kids)){const x=s.tx*T+4,y=s.ty*T+7;if(vis(x,y))D.push([y,()=>drawLove(s,x-ox,y-oy,t)])}
  for(const l of W0.lm){const x=l.tx*T+4,y=l.ty*T+7;if(vis(x,y))D.push([y,()=>drawLm(l,x-ox,y-oy,t)])}
  for(const q of cre)if(vis(q.x,q.y))D.push([q.y,()=>{const b=Math.abs(Math.sin(t*4+q.ph))*(q.follow?1.5:.7);
    rect(q.x-ox-3,q.y-oy-1,7,2,"rgba(0,0,0,.25)");c.save();if(q.dir<0){c.translate(Math.round(q.x-ox)*2,0);c.scale(-1,1)}c.drawImage(q.img,Math.round(q.x-ox)-4,Math.round(q.y-oy-8-b));c.restore();
    if(q.follow)heart(q.x-ox-2,q.y-oy-17,"#ff7ad9")}]);
  D.push([P.y,()=>{const b=P.moving?Math.abs(Math.sin(P.step))*1.5:Math.sin(t*2)*.4;rect(P.x-ox-4,P.y-oy-1,9,2,"rgba(0,0,0,.3)");spr(c,me.sp,Math.round(P.x-ox)-5,Math.round(P.y-oy-10-b),me.hue,P.face<0)}]);
  D.sort((a,b)=>a[0]-b[0]);D.forEach(d=>d[1]());
  for(const f of fx){c.globalAlpha=Math.min(1,f.l);c.fillStyle=f.c;const X=Math.round(f.x-ox),Y=Math.round(f.y-oy);c.fillRect(X+1,Y,1,1);c.fillRect(X+3,Y,1,1);c.fillRect(X,Y+1,5,1);c.fillRect(X+1,Y+2,3,1);c.fillRect(X+2,Y+3,1,1)}
  c.globalAlpha=1;drawWeather(t,dt,0);
  const night=Math.max(0,Math.sin(((Date.now()/240000)%1)*6.2832))*.5;
  if(night>0){c.fillStyle=`rgba(8,4,40,${night})`;c.fillRect(0,0,VW,VH)}
  c.globalCompositeOperation="lighter";
  for(const l of lights){const sx=l.x+(l.ox||0);for(let k=l.r;k>1;k-=3){c.globalAlpha=.06+night*.1;disc(sx,l.y,k,l.c)}}
  c.globalAlpha=1;c.globalCompositeOperation="source-over";
  if(night>.12)for(let i=0;i<24;i++){const x=ih(i,1,9)*VW+Math.sin(t*.6+i)*9,y=ih(i,2,9)*VH+Math.cos(t*.5+i*2)*7;if(Math.sin(t*2+i*3)>-.2)rect(x,y,1,1,"#e9ff7a")}
}
function loop(ms){const id=runId;if(!window.worldOpen||!W0)return;const dt=Math.min(.05,(ms-lastMs)/1000||.016);lastMs=ms;const t=ms/1000;
  update(dt,t);draw(t,dt);if(id===runId&&window.worldOpen)requestAnimationFrame(loop)}

/* ---------- galaxy: your alien flies at the center of the screen; land when you are close to a world ---------- */
let nearObj=null,gt=0,gf=0,face=1;const gtrail=[];
window.WORLD_KEYS=true; // tells index.html to ignore its old arrow-key panning
window.galaxyHook=t=>{
  const dt=Math.min(.05,t-(gt||t));gt=t;
  if(!document.querySelector(".overlay.on")&&!window.worldOpen){
    let ix=0,iy=0;if(keys.has("arrowleft")||keys.has("a"))ix--;if(keys.has("arrowright")||keys.has("d"))ix++;if(keys.has("arrowup")||keys.has("w"))iy--;if(keys.has("arrowdown")||keys.has("s"))iy++;
    if(ix||iy){const m=Math.hypot(ix,iy),sp=(keys.has("shift")?420:150)*dt/PX*3;cam.tx=null;cam.x+=ix/m*sp;cam.y+=iy/m*sp;if(ix)face=ix>0?1:-1;
      gtrail.unshift({x:cam.x,y:cam.y});if(gtrail.length>14)gtrail.pop()}}
  const x=Math.round(W/2),y=Math.round(H/2)+Math.round(Math.sin(t*3)*1.2);
  gtrail.forEach((p,i)=>{const px=Math.round(p.x-cam.x+W/2),py=Math.round(p.y-cam.y+H/2);ctx.fillStyle=hsl(me.hue,100,70).replace(")",` / ${.6-i/24})`);ctx.fillRect(px,py,1,1)});
  glow(x,y,8,hsl(me.hue,100,60).replace(")"," / .12)"));spr(ctx,me.sp,x-5,y-5,me.hue,face<0);
  if(++gf%6===0){let b=null,bd=34;const tt=performance.now()/1000;
    for(const o of objs.concat(cst)){const p=pos(o,tt),d=Math.hypot(p.x-cam.x,p.y-cam.y);if(d<bd){bd=d;b=o}}
    nearObj=b;const show=b&&chosen&&!document.querySelector(".overlay.on")&&!window.worldOpen;
    lb.style.display=show?"block":"none";if(show)lb.textContent="\u{1FA90} LAND ON "+(b.name||"THIS WORLD")+" (E)"}
};
lb.onclick=()=>{if(nearObj)land(nearObj)};

/* ---------- the card gets a LAND button ---------- */
const landCard=document.createElement("button");landCard.className="pink";landCard.textContent="\u{1FA90} LAND ON THIS WORLD";
$("crow").insertBefore(landCard,$("crow").firstChild);
landCard.onclick=()=>{const o=current;$("cclose").click();land(o)};
const _oc=window.openCard;
window.openCard=function(o){_oc(o);landCard.style.display=(o&&o.kind!=="being"&&o.seed!=null)?"":"none"};
window.__cgw={genWorld,ih,vn,SP,N,T};
})();
