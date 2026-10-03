(function(){
'use strict';
const CFG=Object.assign({scheduleCsv:'',daysCsv:'',refreshSeconds:60,phone:'',entDoctor:'พญ.สุณัฐดา'},window.APP_CONFIG||{});
const ENT_DOC=CFG.entDoctor;
const MON=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const MONS=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const DOW=['จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์','อาทิตย์'];
const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,'0');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mkey=(y,m)=>y+'-'+pad(m), dkey=(y,m,d)=>mkey(y,m)+'-'+pad(d);
const wdOf=(y,m,d)=>(new Date(y,m-1,d).getDay()+6)%7, dim=(y,m)=>new Date(y,m,0).getDate();
const thDate=id=>{const [y,m,d]=id.split('-').map(Number);return d+' '+MONS[m-1]+' '+(y+543);};
const now=new Date();
let cur={y:now.getFullYear(),m:now.getMonth()+1}, sel=null, specFilter='', days={}, spec={}, loaded=false, flash=new Set(), sample=false;

function toast(t){const el=$('toast');el.textContent=t;el.classList.add('show');clearTimeout(toast.h);toast.h=setTimeout(()=>el.classList.remove('show'),3200);}
function status(live,t){$('dot').classList.toggle('live',live);$('stxt').textContent=t;}

/* ---------- data ---------- */
function parseCSV(text){
  const rows=[];let row=[],f='',q=false;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(q){if(c==='"'){if(text[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}
    else if(c==='"')q=true; else if(c===','){row.push(f);f='';}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(f);rows.push(row);row=[];f='';}
    else f+=c;}
  if(f!==''||row.length){row.push(f);rows.push(row);}
  return rows;
}
function table(text,key){
  const rows=parseCSV(text); const hi=rows.findIndex((r,i)=>i<6&&r.some(c=>c.trim()===key)); if(hi<0)return [];
  const h=rows[hi].map(c=>c.trim());
  return rows.slice(hi+1).map(r=>{const o={};h.forEach((k,i)=>{if(k)o[k]=(r[i]||'').trim();});return o;});
}
function parseDate(v){
  v=String(v||'').trim(); let a=v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if(a){let y=+a[3];if(y<100)y+=2000;if(y>2400)y-=543;return dkey(y,+a[2],+a[1]);}
  a=v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if(a){let y=+a[1];if(y>2400)y-=543;return dkey(y,+a[2],+a[3]);}
  return null;
}
function build(main,dayInfo){
  const out={}, sp={};
  const get=id=>out[id]||(out[id]={ent:null,docs:[],holiday:'',note:''});
  main.forEach(r=>{const name=r['แพทย์'],id=parseDate(r['วันที่']); if(!name||!id)return;
    const o=get(id), t=r['เวลา']||''; if(r['สาขา'])sp[name]=r['สาขา'];
    if(name.startsWith(ENT_DOC)) o.ent=(t==='งดตรวจ')?'':t; else if(t!=='งดตรวจ') o.docs.push({name,time:t});});
  dayInfo.forEach(r=>{const id=parseDate(r['วันที่']); if(!id)return; const h=r['ป้ายวันหยุด']||'',n=r['หมายเหตุ']||''; if(!h&&!n&&!out[id])return; const o=get(id); o.holiday=h; o.note=n;});
  return {days:out,spec:sp};
}
async function fetchText(u){const r=await fetch(u,{cache:'no-store'}); if(!r.ok)throw new Error('HTTP '+r.status); return r.text();}
async function load(){
  try{
    let data;
    if(CFG.scheduleCsv){
      const [a,b]=await Promise.all([fetchText(CFG.scheduleCsv), CFG.daysCsv?fetchText(CFG.daysCsv):Promise.resolve('')]);
      data=build(table(a,'แพทย์'), b?table(b,'ป้ายวันหยุด'):[]); sample=false;
    }else{
      const r=await fetch('/data/sample.json',{cache:'no-store'}); data=await r.json(); sample=true;
    }
    if(loaded){Object.keys(Object.assign({},days,data.days)).forEach(id=>{if(JSON.stringify(days[id]||null)!==JSON.stringify(data.days[id]||null))flash.add(id);});
      if(flash.size)toast('ตารางมีการอัปเดต '+flash.size+' วัน');}
    days=data.days; spec=data.spec; loaded=true;
    const t=new Date();
    status(true,(sample?'ข้อมูลตัวอย่าง · ':'')+'อัปเดตล่าสุด '+pad(t.getHours())+'.'+pad(t.getMinutes())+' น.');
    render();
  }catch(e){
    status(false,'โหลดตารางไม่สำเร็จ กำลังลองใหม่'); if(!loaded)render();
  }
}

/* ---------- render ---------- */
function dayMatches(r){
  if(!specFilter)return true;
  if(typeof r.ent==='string'&&r.ent&&spec[ENT_DOC]===specFilter)return true;
  return (r.docs||[]).some(x=>spec[x.name]===specFilter);
}
function render(){
  const {y,m}=cur; $('mlabel').textContent=MON[m-1]+' '+(y+543);
  const first=wdOf(y,m,1),n=dim(y,m),total=Math.ceil((first+n)/7)*7,t=new Date(),tid=dkey(t.getFullYear(),t.getMonth()+1,t.getDate());
  let h='';
  for(let i=0;i<total;i++){const d=i-first+1;
    if(d<1||d>n){h+='<div class="cell blank" aria-hidden="true"></div>';continue;}
    const id=dkey(y,m,d),wd=wdOf(y,m,d),r=days[id]||{},cls=['cell'];
    if(wd>=5)cls.push('weekend');if(r.holiday)cls.push('holiday');if(id===tid)cls.push('today');if(flash.has(id))cls.push('flash');if(!dayMatches(r))cls.push('dim');
    let inner='<div class="top-line"><span><span class="num">'+d+'</span> <span class="dowm">'+DOW[wd]+'</span></span>'+(r.holiday?'<span class="hol">'+esc(r.holiday)+'</span>':'')+'</div>';
    if(typeof r.ent==='string')inner+=r.ent?'<div class="ent"><span>หู คอ จมูก</span><span>'+esc(r.ent)+'</span></div>':'<div class="ent off"><span>หู คอ จมูก</span><span>งดตรวจ</span></div>';
    (r.docs||[]).forEach(x=>{const sp=spec[x.name],hit=!specFilter||sp===specFilter;inner+='<div class="doc'+(hit?'':' faded')+'"><span>'+esc(x.name)+(sp?'<span class="sp">'+esc(sp)+'</span>':'')+'</span><span class="t">'+esc(x.time)+'</span></div>';});
    if(days[id]&&!(r.docs||[]).length)inner+='<div class="none">ไม่มีคลินิกพิเศษ</div>';
    if(r.note)inner+='<div class="note">'+esc(r.note)+'</div>';
    h+='<div class="'+cls.join(' ')+'" data-id="'+id+'" role="group" aria-label="'+DOW[wd]+' '+thDate(id)+'">'+inner+'</div>';}
  $('grid').innerHTML=h;
  const has=Object.keys(days).some(k=>k.startsWith(mkey(y,m)));
  $('emptyBox').innerHTML=(loaded&&!has)?'<div class="empty"><p>ยังไม่มีตารางของเดือนนี้</p></div>':'';
  const specs=[...new Set(Object.values(spec).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'th'));
  const fs=$('fSpec');fs.innerHTML='<option value="">ทุกสาขา</option>'+specs.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');fs.value=specs.includes(specFilter)?specFilter:'';
  renderMini();renderDay();renderDocs();flash.clear();
}
function ensureSel(){const {y,m}=cur,t=new Date();if(!sel||sel.slice(0,7)!==mkey(y,m))sel=(t.getFullYear()===y&&t.getMonth()+1===m)?dkey(y,m,t.getDate()):dkey(y,m,1);}
function renderMini(){
  ensureSel();const {y,m}=cur,first=wdOf(y,m,1),n=dim(y,m),t=new Date(),tid=dkey(t.getFullYear(),t.getMonth()+1,t.getDate());
  let h='';for(let i=0;i<first;i++)h+='<span class="md blank" aria-hidden="true"></span>';
  for(let d=1;d<=n;d++){const id=dkey(y,m,d),wd=wdOf(y,m,d),r=days[id]||{},cls=['md'];
    if(wd>=5)cls.push('weekend');if(r.holiday)cls.push('holiday');if(id===tid)cls.push('today');if(id===sel)cls.push('sel');if(!dayMatches(r))cls.push('dim');if(flash.has(id))cls.push('flash');
    const cnt=(r.docs||[]).length,e=typeof r.ent==='string'?'<i class="e'+(r.ent?'':' off')+'"></i>':'';
    h+='<button type="button" class="'+cls.join(' ')+'" data-d="'+id+'" aria-pressed="'+(id===sel)+'" aria-label="'+DOW[wd]+' '+thDate(id)+(r.holiday?' '+esc(r.holiday):'')+'"><span class="n">'+d+'</span><span class="k">'+e+(cnt||'')+'</span></button>';}
  $('mini').innerHTML=h;
}
function renderDay(){
  const box=$('daycard');if(!sel){box.innerHTML='';return;}
  const [y,m,d]=sel.split('-').map(Number),wd=wdOf(y,m,d),r=days[sel]||{};
  let h='<div class="dayhead"><button class="btn" type="button" data-step="-1" aria-label="วันก่อนหน้า">‹</button><h2>'+DOW[wd]+' '+thDate(sel)+'</h2><button class="btn" type="button" data-step="1" aria-label="วันถัดไป">›</button></div>';
  if(r.holiday)h+='<span class="badge">★ '+esc(r.holiday)+'</span>';
  let rows='';
  if(typeof r.ent==='string'){const hit=!specFilter||spec[ENT_DOC]===specFilter;rows+='<div class="drow entr'+(hit?'':' faded')+'"><span><span class="nm">'+esc(ENT_DOC)+'</span><span class="sp2">'+esc(spec[ENT_DOC]||'หู คอ จมูก')+'</span></span><span class="tm">'+(r.ent?esc(r.ent):'งดตรวจ')+'</span></div>';}
  (r.docs||[]).forEach(x=>{const sp=spec[x.name]||'',hit=!specFilter||sp===specFilter;rows+='<div class="drow'+(hit?'':' faded')+'"><span><span class="nm">'+esc(x.name)+'</span>'+(sp?'<span class="sp2">'+esc(sp)+'</span>':'')+'</span><span class="tm">'+esc(x.time)+'</span></div>';});
  h+=rows||'<p class="none" style="margin:6px 0">'+(!loaded?'กำลังโหลด…':(days[sel]?'ไม่มีแพทย์ออกตรวจ':'ยังไม่มีตารางของวันนี้'))+'</p>';
  if(r.note)h+='<p class="note" style="margin:8px 0 0">หมายเหตุ: '+esc(r.note)+'</p>';
  box.innerHTML=h;box.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>stepDay(+b.dataset.step));
}
function stepDay(k){const [y,m,d]=sel.split('-').map(Number),nd=new Date(y,m-1,d+k);sel=dkey(nd.getFullYear(),nd.getMonth()+1,nd.getDate());
  if(nd.getFullYear()!==cur.y||nd.getMonth()+1!==cur.m){cur={y:nd.getFullYear(),m:nd.getMonth()+1};render();}else{renderMini();renderDay();}}
function renderDocs(){
  const {y,m}=cur,mk=mkey(y,m);$('docsTitle').textContent='แพทย์ออกตรวจ '+MON[m-1]+' '+(y+543);
  const by={},add=(n,id,t,off)=>{const o=by[n]||(by[n]={dates:[],times:new Set(),n:0});o.dates.push([id,off]);if(!off){o.n++;if(t)o.times.add(t);}};
  Object.keys(days).filter(k=>k.startsWith(mk)).sort().forEach(id=>{const r=days[id];if(typeof r.ent==='string')add(ENT_DOC,id,r.ent,!r.ent);(r.docs||[]).forEach(x=>add(x.name,id,x.time,false));});
  const names=Object.keys(by);if(!names.length){$('docList').innerHTML='<p class="none" style="margin-top:12px">ยังไม่มีตารางของเดือนนี้</p>';return;}
  const g={};names.forEach(n=>{const k=spec[n]||'ไม่ระบุสาขา';(g[k]=g[k]||[]).push(n);});
  let h='';Object.keys(g).sort((a,b)=>a==='ไม่ระบุสาขา'?1:b==='ไม่ระบุสาขา'?-1:a.localeCompare(b,'th')).forEach(k=>{if(specFilter&&k!==specFilter)return;
    h+='<div class="dgroup"><h3>'+esc(k)+'</h3>';
    g[k].sort((a,b)=>a.localeCompare(b,'th')).forEach(n=>{const o=by[n];h+='<div class="ditem"><div class="dn"><span>'+esc(n)+'</span><span>'+o.n+' ครั้ง</span></div><div class="dt">'+esc([...o.times].join(' · '))+'</div><div class="chips">'+
      o.dates.map(([id,off])=>{const dd=+id.slice(8);return '<button type="button" class="chip'+(off?' off':'')+'" data-go="'+id+'" aria-label="'+thDate(id)+(off?' งดตรวจ':'')+'">'+dd+'</button>';}).join('')+'</div></div>';});
    h+='</div>';});
  $('docList').innerHTML=h||'<p class="none" style="margin-top:12px">ไม่มีแพทย์สาขานี้ในเดือนนี้</p>';
}
function setTab(t){['cal','docs','more'].forEach(k=>{$('v-'+k).hidden=k!==t;$('tab-'+k).setAttribute('aria-selected',String(k===t));});window.scrollTo(0,0);}

/* ---------- events ---------- */
document.querySelectorAll('.tabs [data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
$('mini').addEventListener('click',e=>{const b=e.target.closest('[data-d]');if(!b)return;sel=b.dataset.d;renderMini();renderDay();});
$('grid').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(!b)return;sel=b.dataset.id;renderMini();renderDay();});
$('docList').addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(!b)return;sel=b.dataset.go;setTab('cal');renderMini();renderDay();
  const g=document.querySelector('.cal [data-id="'+sel+'"]');if(g&&g.offsetParent){if(g.scrollIntoView)g.scrollIntoView({block:'center'});g.focus();}});
$('fSpec').onchange=e=>{specFilter=e.target.value;render();};
function go(k){let m=cur.m+k,y=cur.y;if(m<1){m=12;y--;}if(m>12){m=1;y++;}cur={y,m};sel=null;render();}
$('prev').onclick=()=>go(-1);$('next').onclick=()=>go(1);
$('todayBtn').onclick=()=>{const t=new Date();cur={y:t.getFullYear(),m:t.getMonth()+1};sel=dkey(cur.y,cur.m,t.getDate());setTab('cal');render();};
(function(){let x0=null,y0=null;const el=$('daycard');
  el.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;y0=e.touches[0].clientY;},{passive:true});
  el.addEventListener('touchend',e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;x0=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)stepDay(dx<0?1:-1);},{passive:true});})();
if(CFG.phone){$('tel').textContent='โทร '+CFG.phone;$('tel').href='tel:'+CFG.phone.replace(/[^0-9+]/g,'');}
$('about').textContent=CFG.scheduleCsv?'ข้อมูลดึงจาก Google Sheets ของสำนักเลขานุการ อัปเดตอัตโนมัติทุก '+CFG.refreshSeconds+' วินาที (หลังแก้ไขใน Google Sheets อาจใช้เวลาไม่กี่นาทีจึงแสดงผล)':'ขณะนี้แสดงข้อมูลตัวอย่าง ยังไม่ได้เชื่อมกับ Google Sheets';
document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
render();load();setInterval(load,Math.max(20,+CFG.refreshSeconds||60)*1000);
})();
