const DEFAULT_METERS=['Main Water Meter','Second Main Water Meter','Car Park Water Meter 1','Car Park Water Meter 2'];
const LS='gm_water_meter_v1_final';
let state=load();
function load(){try{return JSON.parse(localStorage.getItem(LS))||{meters:DEFAULT_METERS,records:{}}}catch(e){return{meters:DEFAULT_METERS,records:{}}}}
function save(){localStorage.setItem(LS,JSON.stringify(state))}
function ymNow(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
const monthPicker=document.getElementById('monthPicker');monthPicker.value=ymNow();
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab,.panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById(b.dataset.tab).classList.add('active');renderAll()});
document.getElementById('thisMonth').onclick=()=>{monthPicker.value=ymNow();renderAll()};
monthPicker.onchange=renderAll;
document.getElementById('clearMonth').onclick=()=>{if(confirm('Clear all readings for this month?')){delete state.records[monthPicker.value];save();renderAll()}};
document.getElementById('exportDailyExcel').onclick=exportDailyExcel;
document.getElementById('exportSummaryExcel').onclick=exportSummaryExcel;
document.getElementById('addMeter').onclick=()=>{const v=document.getElementById('newMeterName').value.trim();if(!v)return;state.meters.push(v);document.getElementById('newMeterName').value='';save();renderAll()};
function monthRows(ym){const [y,m]=ym.split('-').map(Number);const days=new Date(y,m,0).getDate();let rows=[];for(let d=1;d<=days;d++){rows.push({day:d,shift:'Day'});rows.push({day:d,shift:'Night'});}return rows}
function dateLabel(ym,d){const [y,m]=ym.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
function recKey(d,s){return `${d}_${s}`}
function getMonth(){const ym=monthPicker.value;if(!state.records[ym])state.records[ym]={};return state.records[ym]}
function val(ym,d,s,m){return (((state.records[ym]||{})[recKey(d,s)]||{})[m]??'')}
function num(x){const n=parseFloat(String(x).replace(/,/g,''));return isFinite(n)?n:null}
function previousReading(ym,rowIndex,meter){const rows=monthRows(ym);for(let i=rowIndex-1;i>=0;i--){const r=rows[i];const n=num(val(ym,r.day,r.shift,meter));if(n!==null)return n}return null}
function usageFor(ym,rowIndex,meter){const r=monthRows(ym)[rowIndex];const curr=num(val(ym,r.day,r.shift,meter));const prev=previousReading(ym,rowIndex,meter);if(curr===null||prev===null)return rowIndex===0&&curr!==null?0:null;return curr-prev}
function fmt(n){return n===null||n===undefined||Number.isNaN(n)?'-':Number(n).toLocaleString('en-US',{maximumFractionDigits:2})}
function renderDaily(){const ym=monthPicker.value;const table=document.getElementById('dailyTable');const rows=monthRows(ym);let html='<thead><tr><th>Date</th><th>Shift</th>';state.meters.forEach(m=>html+=`<th>${esc(m)}<br>Reading</th>`);html+='<th>Total Usage<br>(All Meters)</th></tr></thead><tbody>';rows.forEach((r,i)=>{let total=0,has=false,bad=false;let cells='';state.meters.forEach(m=>{const u=usageFor(ym,i,m);if(u!==null){has=true;total+=u;if(u<0)bad=true}const v=val(ym,r.day,r.shift,m);const cls=u!==null&&u<0?'bad':'';cells+=`<td class="${cls}"><input inputmode="decimal" data-day="${r.day}" data-shift="${r.shift}" data-meter="${escAttr(m)}" value="${escAttr(v)}"></td>`});html+=`<tr><td>${dateLabel(ym,r.day)}</td><td>${r.shift}</td>${cells}<td class="total-cell ${bad?'bad':''}">${has?fmt(total):'-'}</td></tr>`});html+='</tbody>';table.innerHTML=html;table.querySelectorAll('input').forEach(inp=>inp.onchange=e=>{const d=e.target.dataset.day,s=e.target.dataset.shift,m=e.target.dataset.meter;const month=getMonth();if(!month[recKey(d,s)])month[recKey(d,s)]={};month[recKey(d,s)][m]=e.target.value.trim();save();renderAll()})}
function renderSummary(){const ym=monthPicker.value;let rows='';let grand=0;state.meters.forEach(m=>{let usages=[];monthRows(ym).forEach((r,i)=>{const u=usageFor(ym,i,m);if(u!==null&&u>=0)usages.push(u)});const total=usages.reduce((a,b)=>a+b,0);grand+=total;rows+=`<tr><td>${esc(m)}</td><td>${fmt(total)}</td><td>${fmt(usages.length?total/usages.length:null)}</td><td>${fmt(usages.length?Math.max(...usages):null)}</td><td>${fmt(usages.length?Math.min(...usages):null)}</td></tr>`});document.getElementById('summaryContent').innerHTML=`<h3>${monthPicker.value} Total Usage: ${fmt(grand)}</h3><table class="summary-table"><tr><th>Meter Name</th><th>Total Usage</th><th>Average / Record</th><th>Highest</th><th>Lowest</th></tr>${rows}<tr><th>TOTAL</th><th>${fmt(grand)}</th><th colspan="3"></th></tr></table>`}
function renderValidation(){const ym=monthPicker.value;let out=[];monthRows(ym).forEach((r,i)=>state.meters.forEach(m=>{const u=usageFor(ym,i,m);if(u!==null&&u<0)out.push(`<tr><td>${dateLabel(ym,r.day)}</td><td>${r.shift}</td><td>${esc(m)}</td><td class="delete">Reading lower than previous reading</td></tr>`)}));document.getElementById('validationContent').innerHTML=out.length?`<table class="summary-table"><tr><th>Date</th><th>Shift</th><th>Meter</th><th>Issue</th></tr>${out.join('')}</table>`:'No validation issue found.'}
function renderSettings(){let html='<tr><th>No.</th><th>Meter Name</th><th>Action</th></tr>';state.meters.forEach((m,i)=>html+=`<tr><td>${i+1}</td><td><input data-i="${i}" value="${escAttr(m)}"></td><td><button class="smallbtn" data-up="${i}">↑</button><button class="smallbtn" data-down="${i}">↓</button><button class="smallbtn delete" data-del="${i}">Delete</button></td></tr>`);const t=document.getElementById('meterSettings');t.innerHTML=html;t.querySelectorAll('input').forEach(inp=>inp.onchange=e=>{state.meters[e.target.dataset.i]=e.target.value.trim()||state.meters[e.target.dataset.i];save();renderAll()});t.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{if(confirm('Delete this meter?')){state.meters.splice(+b.dataset.del,1);save();renderAll()}});t.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{let i=+b.dataset.up;if(i>0){[state.meters[i-1],state.meters[i]]=[state.meters[i],state.meters[i-1]];save();renderAll()}});t.querySelectorAll('[data-down]').forEach(b=>b.onclick=()=>{let i=+b.dataset.down;if(i<state.meters.length-1){[state.meters[i+1],state.meters[i]]=[state.meters[i],state.meters[i+1]];save();renderAll()}})}
function excelSafe(x){return String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function downloadExcel(filename,html){
  const blob=new Blob(['\ufeff'+html],{type:'application/vnd.ms-excel'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
function exportDailyExcel(){
  const ym=monthPicker.value;
  let html=`<html><head><meta charset="utf-8"></head><body>`;
  html+=`<h2>GM Water Meter Daily Input</h2><p>Month: ${excelSafe(ym)}</p>`;
  html+=`<table border="1"><tr><th>Date</th><th>Shift</th>`;
  state.meters.forEach(m=>html+=`<th>${excelSafe(m)} Reading</th><th>${excelSafe(m)} Usage</th>`);
  html+=`<th>Total Usage</th></tr>`;
  monthRows(ym).forEach((r,i)=>{
    let total=0,has=false;
    html+=`<tr><td>${excelSafe(dateLabel(ym,r.day))}</td><td>${excelSafe(r.shift)}</td>`;
    state.meters.forEach(m=>{
      const reading=val(ym,r.day,r.shift,m);
      const u=usageFor(ym,i,m);
      if(u!==null){has=true;total+=u}
      html+=`<td>${excelSafe(reading)}</td><td>${u===null?'':excelSafe(u)}</td>`;
    });
    html+=`<td>${has?excelSafe(total):''}</td></tr>`;
  });
  html+=`</table></body></html>`;
  downloadExcel(`GM_WATER_METER_DAILY_${ym}.xls`,html);
}
function exportSummaryExcel(){
  const ym=monthPicker.value;
  let grand=0;
  let html=`<html><head><meta charset="utf-8"></head><body>`;
  html+=`<h2>GM Water Meter Monthly Summary</h2><p>Month: ${excelSafe(ym)}</p>`;
  html+=`<table border="1"><tr><th>Meter Name</th><th>Total Usage</th><th>Average / Record</th><th>Highest</th><th>Lowest</th></tr>`;
  state.meters.forEach(m=>{
    let usages=[];
    monthRows(ym).forEach((r,i)=>{
      const u=usageFor(ym,i,m);
      if(u!==null&&u>=0)usages.push(u);
    });
    const total=usages.reduce((a,b)=>a+b,0);
    grand+=total;
    html+=`<tr><td>${excelSafe(m)}</td><td>${excelSafe(total)}</td><td>${excelSafe(usages.length?total/usages.length:'')}</td><td>${excelSafe(usages.length?Math.max(...usages):'')}</td><td>${excelSafe(usages.length?Math.min(...usages):'')}</td></tr>`;
  });
  html+=`<tr><th>TOTAL</th><th>${excelSafe(grand)}</th><th colspan="3"></th></tr>`;
  html+=`</table></body></html>`;
  downloadExcel(`GM_WATER_METER_SUMMARY_${ym}.xls`,html);
}
function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}function escAttr(s){return esc(s).replace(/"/g,'&quot;')}
function renderAll(){renderDaily();renderSummary();renderValidation();renderSettings()}renderAll();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
