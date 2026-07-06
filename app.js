const DEFAULT_METERS=['Main Water Meter','Second Main Water Meter','Car Park Water Meter 1','Car Park Water Meter 2'];
const LS='gm_water_meter_v1_final';
const COMPANY_NAME='Glowmore Express Sdn Bhd';
let state=load();
function load(){try{return JSON.parse(localStorage.getItem(LS))||{meters:DEFAULT_METERS,records:{}}}catch(e){return{meters:DEFAULT_METERS,records:{}}}}
function save(){localStorage.setItem(LS,JSON.stringify(state))}
function ymNow(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
const monthPicker=document.getElementById('monthPicker');monthPicker.value=ymNow();
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab,.panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById(b.dataset.tab).classList.add('active');renderAll()});
document.getElementById('thisMonth').onclick=()=>{monthPicker.value=ymNow();renderAll()};
monthPicker.onchange=renderAll;
document.getElementById('clearMonth').onclick=()=>{if(confirm('Clear all readings for this month?')){delete state.records[monthPicker.value];save();renderAll()}};
document.getElementById('importDailyCsv').onclick=()=>document.getElementById('importCsvFile').click();
document.getElementById('importCsvFile').onchange=importDailyCsv;
document.getElementById('exportDailyCsv').onclick=exportDailyCsv;
document.getElementById('exportSummaryCsv').onclick=exportSummaryCsv;
document.getElementById('addMeter').onclick=()=>{const v=document.getElementById('newMeterName').value.trim();if(!v)return;state.meters.push(v);document.getElementById('newMeterName').value='';save();renderAll()};
function monthRows(ym){const [y,m]=ym.split('-').map(Number);const days=new Date(y,m,0).getDate();let rows=[];for(let d=1;d<=days;d++){rows.push({day:d,shift:'Day'});rows.push({day:d,shift:'Night'});}return rows}
function dateLabel(ym,d){const [y,m]=ym.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
function monthLabel(ym){const [y,m]=ym.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('en-GB',{month:'long',year:'numeric'})}
function generatedLabel(){const d=new Date();return d.toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false})}
function recKey(d,s){return `${d}_${s}`}
function getMonth(){const ym=monthPicker.value;if(!state.records[ym])state.records[ym]={};return state.records[ym]}
function val(ym,d,s,m){return (((state.records[ym]||{})[recKey(d,s)]||{})[m]??'')}
function cleanReadingInput(x){return String(x??'').trim().replace(/,/g,'')}
function isValidReadingText(x){const v=cleanReadingInput(x);return v===''||/^\d+(\.\d+)?$/.test(v)}
function num(x){const v=cleanReadingInput(x);if(v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}
function previousReading(ym,rowIndex,meter){const rows=monthRows(ym);for(let i=rowIndex-1;i>=0;i--){const r=rows[i];const n=num(val(ym,r.day,r.shift,meter));if(n!==null)return n}return null}
function usageFor(ym,rowIndex,meter){const r=monthRows(ym)[rowIndex];const curr=num(val(ym,r.day,r.shift,meter));const prev=previousReading(ym,rowIndex,meter);if(curr===null||prev===null)return rowIndex===0&&curr!==null?0:null;return curr-prev}
function fmt(n){return n===null||n===undefined||Number.isNaN(n)?'-':Number(n).toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:3})}
function csvNum(n){return n===null||n===undefined||Number.isNaN(n)?'':Number(n).toFixed(3)}
function renderDaily(){const ym=monthPicker.value;const table=document.getElementById('dailyTable');const rows=monthRows(ym);let html='<thead><tr><th>Date</th><th>Shift</th>';state.meters.forEach(m=>html+=`<th>${esc(m)}<br>Reading<br><span class="th-note">type as shown, e.g. 4183.888 or 334888</span></th>`);html+='<th>Total Usage<br>(All Meters)</th></tr></thead><tbody>';rows.forEach((r,i)=>{let total=0,has=false,bad=false;let cells='';state.meters.forEach(m=>{const raw=val(ym,r.day,r.shift,m);const invalid=!isValidReadingText(raw);const u=usageFor(ym,i,m);if(u!==null){has=true;total+=u;if(u<0)bad=true}const cls=(u!==null&&u<0)||invalid?'bad':'';cells+=`<td class="${cls}"><input inputmode="decimal" pattern="[0-9]*[.]?[0-9]*" placeholder="0 or 0.000" data-day="${r.day}" data-shift="${r.shift}" data-meter="${escAttr(m)}" value="${escAttr(raw)}"></td>`});html+=`<tr><td>${dateLabel(ym,r.day)}</td><td>${r.shift}</td>${cells}<td class="total-cell ${bad?'bad':''}">${has?fmt(total):'-'}</td></tr>`});html+='</tbody>';table.innerHTML=html;table.querySelectorAll('input').forEach(inp=>{
    const saveInput=e=>{const d=e.target.dataset.day,s=e.target.dataset.shift,m=e.target.dataset.meter;let v=cleanReadingInput(e.target.value);if(!isValidReadingText(v)){e.target.closest('td').classList.add('bad');return}const month=getMonth();if(!month[recKey(d,s)])month[recKey(d,s)]={};month[recKey(d,s)][m]=v;save();renderAll()};
    inp.onchange=saveInput;
    inp.onblur=saveInput;
  })}
function summaryRows(ym){let rows=[];let grand=0;state.meters.forEach(m=>{let usages=[];monthRows(ym).forEach((r,i)=>{const u=usageFor(ym,i,m);if(u!==null&&u>=0)usages.push(u)});const total=usages.reduce((a,b)=>a+b,0);grand+=total;rows.push({meter:m,total,average:usages.length?total/usages.length:null,highest:usages.length?Math.max(...usages):null,lowest:usages.length?Math.min(...usages):null})});return {rows,grand}}
function dailyTotals(ym){
  const byDay={};
  monthRows(ym).forEach((r,i)=>{
    let total=0,has=false,bad=false;
    state.meters.forEach(m=>{const u=usageFor(ym,i,m);if(u!==null){has=true;total+=u;if(u<0)bad=true}});
    if(has && !bad){byDay[r.day]=(byDay[r.day]||0)+total}
  });
  return Object.keys(byDay).map(d=>({day:+d,label:dateLabel(ym,+d),total:byDay[d]})).sort((a,b)=>a.day-b.day)
}
function previousMonth(ym){const [y,m]=ym.split('-').map(Number);const d=new Date(y,m-2,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function monthGrand(ym){return summaryRows(ym).grand}
function comparisonText(ym,current){const prev=monthGrand(previousMonth(ym));if(!prev)return 'No previous month data available.';const diff=current-prev;const pct=prev?diff/prev*100:0;const arrow=diff>=0?'▲':'▼';return `${arrow} ${diff>=0?'+':''}${fmt(pct)}% Compared with Last Month`}
function renderLineChart(points){
  if(!points.length)return '<div class="empty-chart">No daily usage data yet.</div>';
  const w=720,h=220,pad=34,max=Math.max(...points.map(p=>p.total),1),min=Math.min(...points.map(p=>p.total),0);
  const range=max-min||1;
  const xy=points.map((p,i)=>{const x=pad+(points.length===1?0:i*(w-pad*2)/(points.length-1));const y=h-pad-((p.total-min)/range)*(h-pad*2);return {x,y,...p}});
  const path=xy.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const circles=xy.map(p=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3"><title>${esc(p.label)}: ${fmt(p.total)}</title></circle>`).join('');
  return `<div class="chart-scroll"><svg class="line-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Daily usage trend"><line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}"/><line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h-pad}"/><path d="${path}"/>${circles}<text x="${pad}" y="24">Max ${fmt(max)}</text><text x="${w-pad-90}" y="${h-10}">${points.length} day(s)</text></svg></div>`
}
function renderBars(rows){
  const max=Math.max(...rows.map(r=>r.total),1);
  return `<div class="bar-list">${rows.map(r=>`<div class="bar-row"><div class="bar-label">${esc(r.meter)}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(2,r.total/max*100)}%"></div></div><div class="bar-value">${fmt(r.total)}</div></div>`).join('')}</div>`
}
function buildInsights(ym,data,points,ranked){
  const insights=[];const prev=monthGrand(previousMonth(ym));
  if(prev){const pct=(data.grand-prev)/prev*100;insights.push(`Water usage ${pct>=0?'increased':'decreased'} ${fmt(Math.abs(pct))}% compared with last month.`)}
  else insights.push('No previous month data available for comparison yet.');
  if(points.length){const peak=points.reduce((a,b)=>b.total>a.total?b:a,points[0]);insights.push(`Highest usage occurred on ${peak.label} with ${fmt(peak.total)} total usage.`)}
  if(ranked.length&&data.grand>0){insights.push(`${ranked[0].meter} contributed ${fmt(ranked[0].total/data.grand*100)}% of the monthly usage.`)}
  const issues=[];monthRows(ym).forEach((r,i)=>state.meters.forEach(m=>{const u=usageFor(ym,i,m);if(u!==null&&u<0)issues.push(1)}));
  insights.push(issues.length?`${issues.length} abnormal negative reading issue(s) found. Please check Validation.`:'No abnormal negative reading detected.');
  return `<ul class="insight-list">${insights.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`
}
function isIncomingMeterName(name){
  const n=String(name||'').trim().toLowerCase().replace(/\s+/g,' ');
  return n==='main water meter' || n==='second main water meter';
}
function renderMeterGroupRows(rows){
  if(!rows.length)return '<div class="wm-empty">No meter found.</div>';
  return rows.map(r=>`<div class="wm-row"><div class="wm-name">${esc(r.meter)}</div><div class="wm-value">${fmt(r.total)} <span>m³</span></div></div>`).join('');
}
function renderSummary(){
  const ym=monthPicker.value;
  const data=summaryRows(ym);
  const incomingRows=data.rows.filter(r=>isIncomingMeterName(r.meter));
  const subRows=data.rows.filter(r=>!isIncomingMeterName(r.meter));
  const totalIncoming=incomingRows.reduce((a,b)=>a+b.total,0);
  const totalConsumption=subRows.reduce((a,b)=>a+b.total,0);
  const difference=totalIncoming-totalConsumption;

  document.getElementById('summaryContent').innerHTML=`
    <div class="wm-summary-dashboard">
      <details class="wm-group" open>
        <summary>Incoming Meter</summary>
        <div class="wm-group-body">
          ${renderMeterGroupRows(incomingRows)}
          <div class="wm-total-row"><div>Total Incoming</div><div>${fmt(totalIncoming)} <span>m³</span></div></div>
        </div>
      </details>

      <div class="wm-divider"></div>

      <details class="wm-group" open>
        <summary>Sub Meter</summary>
        <div class="wm-group-body">
          ${renderMeterGroupRows(subRows)}
          <div class="wm-total-row"><div>Total Consumption</div><div>${fmt(totalConsumption)} <span>m³</span></div></div>
        </div>
      </details>

      <div class="wm-divider strong"></div>

      <div class="wm-difference-row">
        <div>Difference</div>
        <div>${fmt(difference)} <span>m³</span></div>
      </div>
    </div>`;
}
function renderValidation(){const ym=monthPicker.value;let out=[];monthRows(ym).forEach((r,i)=>state.meters.forEach(m=>{const raw=val(ym,r.day,r.shift,m);if(raw!==''&&!isValidReadingText(raw))out.push(`<tr><td>${dateLabel(ym,r.day)}</td><td>${r.shift}</td><td>${esc(m)}</td><td class="delete">Invalid reading format. Use numbers only, example 4183.888 or 334888.</td></tr>`);const u=usageFor(ym,i,m);if(u!==null&&u<0)out.push(`<tr><td>${dateLabel(ym,r.day)}</td><td>${r.shift}</td><td>${esc(m)}</td><td class="delete">Reading lower than previous reading</td></tr>`);if(u!==null&&u>1000)out.push(`<tr><td>${dateLabel(ym,r.day)}</td><td>${r.shift}</td><td>${esc(m)}</td><td class="warn">Unusually high usage: ${fmt(u)} m³. Please verify decimal point / digit count.</td></tr>`)}));document.getElementById('validationContent').innerHTML=out.length?`<table class="summary-table"><tr><th>Date</th><th>Shift</th><th>Meter</th><th>Issue</th></tr>${out.join('')}</table>`:'No validation issue found.'}
function renderSettings(){let html='<tr><th>No.</th><th>Meter Name</th><th>Action</th></tr>';state.meters.forEach((m,i)=>html+=`<tr><td>${i+1}</td><td><input data-i="${i}" value="${escAttr(m)}"></td><td><button class="smallbtn" data-up="${i}">↑</button><button class="smallbtn" data-down="${i}">↓</button><button class="smallbtn delete" data-del="${i}">Delete</button></td></tr>`);const t=document.getElementById('meterSettings');t.innerHTML=html;t.querySelectorAll('input').forEach(inp=>inp.onchange=e=>{state.meters[e.target.dataset.i]=e.target.value.trim()||state.meters[e.target.dataset.i];save();renderAll()});t.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{if(confirm('Delete this meter?')){state.meters.splice(+b.dataset.del,1);save();renderAll()}});t.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{let i=+b.dataset.up;if(i>0){[state.meters[i-1],state.meters[i]]=[state.meters[i],state.meters[i-1]];save();renderAll()}});t.querySelectorAll('[data-down]').forEach(b=>b.onclick=()=>{let i=+b.dataset.down;if(i<state.meters.length-1){[state.meters[i+1],state.meters[i]]=[state.meters[i],state.meters[i+1]];save();renderAll()}})}
function centeredLine(text){return ['', '', '', '', text]}
function csvCell(x){return `"${String(x??'').replace(/"/g,'""')}"`}
function csvLine(items){return items.map(csvCell).join(',')}
function downloadCsv(filename,lines){const csv='\uFEFF'+lines.join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url)},100)}

function parseCsv(text){
  text=String(text||'').replace(/^\uFEFF/,'');
  const rows=[];let row=[],cell='',q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(q){
      if(c==='"'&&n==='"'){cell+='"';i++;}
      else if(c==='"'){q=false;}
      else cell+=c;
    }else{
      if(c==='"')q=true;
      else if(c===','){row.push(cell);cell='';}
      else if(c==='\n'){row.push(cell);rows.push(row);row=[];cell='';}
      else if(c==='\r'){}
      else cell+=c;
    }
  }
  row.push(cell);rows.push(row);
  return rows.filter(r=>r.some(c=>String(c).trim()!==''));
}
function parseImportDate(x){
  const s=String(x||'').trim();
  let m=s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
  if(m){
    const months={jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,sept:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12};
    const mo=months[m[2].toLowerCase()]; if(mo) return {ym:`${m[3]}-${String(mo).padStart(2,'0')}`,day:+m[1]};
  }
  m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m)return {ym:`${m[1]}-${String(+m[2]).padStart(2,'0')}`,day:+m[3]};
  m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if(m)return {ym:`${m[3]}-${String(+m[2]).padStart(2,'0')}`,day:+m[1]};
  const d=new Date(s);
  if(!Number.isNaN(d.getTime()))return {ym:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,day:d.getDate()};
  return null;
}
function normalizeHeader(h){return String(h||'').trim().replace(/^\uFEFF/,'')}
function meterNameFromHeader(h){return normalizeHeader(h).replace(/\s*Reading\s*$/i,'').trim()}
function importDailyCsv(e){
  const file=e.target.files&&e.target.files[0];
  e.target.value='';
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const rows=parseCsv(reader.result);
      const headerIndex=rows.findIndex(r=>normalizeHeader(r[0]).toLowerCase()==='date'&&normalizeHeader(r[1]).toLowerCase()==='shift');
      if(headerIndex<0){alert('Import failed: Cannot find CSV header row with Date and Shift.');return;}
      const header=rows[headerIndex].map(normalizeHeader);
      const totalIndex=header.findIndex(h=>h.toLowerCase()==='total usage');
      const meterIndexes=[];
      for(let i=2;i<header.length;i++){
        if(i===totalIndex)continue;
        const name=meterNameFromHeader(header[i]);
        if(name)meterIndexes.push({i,name});
      }
      if(!meterIndexes.length){alert('Import failed: No meter columns found in CSV.');return;}
      const newRecords={};let imported=0;let firstYm=null;
      rows.slice(headerIndex+1).forEach(r=>{
        const parsed=parseImportDate(r[0]);
        const shift=String(r[1]||'').trim();
        if(!parsed||!shift)return;
        if(!newRecords[parsed.ym])newRecords[parsed.ym]={};
        const key=recKey(parsed.day,shift);
        if(!newRecords[parsed.ym][key])newRecords[parsed.ym][key]={};
        let has=false;
        meterIndexes.forEach(({i,name})=>{
          const v=cleanReadingInput(r[i]);
          if(v!==''&&isValidReadingText(v)){newRecords[parsed.ym][key][name]=v;has=true;}
        });
        if(has){imported++; if(!firstYm)firstYm=parsed.ym;}
      });
      if(!imported){alert('Import failed: No valid reading rows found.');return;}
      state.meters=meterIndexes.map(x=>x.name);
      state.records=newRecords;
      if(firstYm)monthPicker.value=firstYm;
      save();renderAll();
      alert(`CSV imported. ${imported} row(s) loaded. Settings meter list was updated automatically from the CSV columns.`);
    }catch(err){alert('Import failed: '+err.message)}
  };
  reader.readAsText(file);
}

function exportDailyCsv(){const ym=monthPicker.value;let lines=[];lines.push(csvLine(centeredLine(COMPANY_NAME)));lines.push('');lines.push(csvLine(centeredLine('GM WATER METER REPORT')));lines.push('');lines.push(csvLine(centeredLine(`Month : ${monthLabel(ym)}`)));lines.push(csvLine(centeredLine(`Generated : ${generatedLabel()}`)));lines.push('');lines.push(csvLine(['Date','Shift',...state.meters.map(m=>`${m} Reading`),'Total Usage']));monthRows(ym).forEach((r,i)=>{let total=0,has=false;let vals=state.meters.map(m=>{const u=usageFor(ym,i,m);if(u!==null){has=true;total+=u}return val(ym,r.day,r.shift,m)});lines.push(csvLine([dateLabel(ym,r.day),r.shift,...vals,has?csvNum(total):'']))});downloadCsv(`GM_Water_Meter_Daily_${ym}.csv`,lines)}
function exportSummaryCsv(){const ym=monthPicker.value;const data=summaryRows(ym);let lines=[];lines.push(csvLine(centeredLine(COMPANY_NAME)));lines.push('');lines.push(csvLine(centeredLine('GM WATER METER MONTHLY SUMMARY')));lines.push('');lines.push(csvLine(centeredLine(`Month : ${monthLabel(ym)}`)));lines.push(csvLine(centeredLine(`Generated : ${generatedLabel()}`)));lines.push('');lines.push(csvLine(['Meter Name','Total Usage','Average / Record','Highest','Lowest']));data.rows.forEach(r=>lines.push(csvLine([r.meter,csvNum(r.total),csvNum(r.average),csvNum(r.highest),csvNum(r.lowest)])));lines.push(csvLine(['TOTAL',csvNum(data.grand),'','','']));downloadCsv(`GM_Water_Meter_Summary_${ym}.csv`,lines)}
function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}function escAttr(s){return esc(s).replace(/"/g,'&quot;')}
function renderAll(){renderDaily();renderSummary();renderValidation();renderSettings()}renderAll();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
