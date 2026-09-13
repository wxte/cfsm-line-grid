import {HistoryAPI} from './history-api.js?v=0.5.15';
import {recordResources} from './resource-recorder.js?v=0.5.15';
import {highLoad,expiring,ActivityObserver} from './insights.js?v=0.5.15';
import {ViewRouter,pages,pageFromHash} from './router.js?v=0.5.15';
import {flag} from './flags.js?v=0.5.15';
import {windowSamples,historyFromArrays,aggregateHistory} from './network-core.js?v=0.5.15';
import {n,numeric,percent,fmtPct,ping,loss,bytes,online,uptime,month,trafficQuota,avg,total,costs,cycles,region,mergeSample} from './data.js?v=0.5.15';
import {DeferredNodeMap} from './lazy-map.js?v=0.5.15';
import {Plot} from './plot.js?v=0.5.15';
const $ = s => document.querySelector(s);
const icons={
 sun:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.3"/><path d="M12 2v2.1M12 19.9V22M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M2 12h2.1M19.9 12H22M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5"/></svg>',
 moon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.3 15.3A7.8 7.8 0 0 1 8.7 4.7 8.2 8.2 0 1 0 19.3 15.3Z"/></svg>',
 spark:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.2 5.7L19 9l-5.8 1.3L12 16l-1.2-5.7L5 9l5.8-1.3L12 2Zm7 12 .6 2.4L22 17l-2.4.6L19 20l-.6-2.4L16 17l2.4-.6L19 14ZM5 14l.5 2L7 16.5 5.5 17 5 19l-.5-2-1.5-.5 1.5-.5L5 14Z"/></svg>',
 pulse:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h3l2-6 4 12 2-6h7"/></svg>',
 activity:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 12h14M5 18h9"/></svg>',
 gear:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.7a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6Zm8 3.3-2-.7a6.8 6.8 0 0 0-.5-1.3l.9-1.9-1.8-1.8-1.9.9a6.8 6.8 0 0 0-1.3-.5l-.7-2h-2.5l-.7 2a6.8 6.8 0 0 0-1.3.5l-1.9-.9L4.5 8.1l.9 1.9a6.8 6.8 0 0 0-.5 1.3l-2 .7v2.5l2 .7c.1.5.3.9.5 1.3l-.9 1.9 1.8 1.8 1.9-.9c.4.2.9.4 1.3.5l.7 2h2.5l.7-2c.5-.1.9-.3 1.3-.5l1.9.9 1.8-1.8-.9-1.9c.2-.4.4-.9.5-1.3l2-.7v-2.5Z"/></svg>'
};
if($('#activity-toggle'))$('#activity-toggle').innerHTML=icons.activity;
if(!$('#activity-badge')){const badge=document.createElement('span');badge.id='activity-badge';badge.hidden=true;$('#activity-toggle')?.append(badge);}
const syncBrandIcon=()=>{
  const image=$('#brand-logo'),fallback=$('#brand-mark-fallback');
  if(!image||!fallback)return;
  const icon=document.querySelector('link[rel~="icon"]');
  const source=icon?.href;
  if(!source)return;
  image.addEventListener('load',()=>{
    image.hidden=false;
    image.classList.add('brand-logo-ready');
    fallback.hidden=true;
  },{once:true});
  image.addEventListener('error',()=>{
    image.hidden=true;
    image.classList.remove('brand-logo-ready');
    fallback.hidden=false;
  },{once:true});
  image.src=source;
};
syncBrandIcon();

const injectedSiteTitle=document.title||'CF-Server-Monitor';
const set = (el,value) => { if(!el)return; const text=String(value??'—'); if(el.textContent!==text)el.textContent=text; };
const osFamily=value=>{
 const text=String(value||'').toLowerCase();
 if(/windows|win32|win64/.test(text))return 'windows';
 if(/ubuntu/.test(text))return 'ubuntu';
 if(/debian/.test(text))return 'debian';
 if(/centos/.test(text))return 'centos';
 if(/openwrt|immortalwrt/.test(text))return 'openwrt';
 if(/freebsd|openbsd|netbsd/.test(text))return 'bsd';
 return 'linux';
};
const osTitle=s=>{
 const text=String(s.os||'').trim();
 if(!text)return 'Linux';
 const known=text.match(/Debian|Ubuntu|Alpine|Rocky|CentOS|Fedora|Arch|OpenWrt|ImmortalWrt|FreeBSD|OpenBSD|NetBSD|Windows/i);
 return known?known[0]:text.split(/[·,(]/)[0].trim().slice(0,24)||'Linux';
};
const osIcon=family=>{
 if(family==='windows')return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M2.75 7.189V2.865c0-.102 0-.115.115-.115h8.622c.128 0 .14 0 .14.128V11.5c0 .128 0 .128-.14.128H2.865c-.102 0-.115 0-.115-.116zM7.189 21.25H2.865c-.102 0-.115 0-.115-.116V12.59c0-.128 0-.128.128-.128h8.635c.102 0 .115 0 .115.115v8.57c0 .09 0 .103-.116.103zM21.25 7.189v4.31c0 .116 0 .116-.116.116h-8.557c-.102 0-.128 0-.128-.115V2.865c0-.09 0-.102.115-.102h8.48c.206 0 .206 0 .206.205zm-8.763 9.661v-4.273c0-.09 0-.115.103-.09h8.621c.026 0 .026.09.026.142v8.518a.06.06 0 0 1-.077.077H12.54s-.09 0-.077-.09V16.85z"/></svg>';
 if(family==='ubuntu')return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M17.61.455a3.41 3.41 0 0 0-3.41 3.41 3.41 3.41 0 0 0 3.41 3.41 3.41 3.41 0 0 0 3.41-3.41 3.41 3.41 0 0 0-3.41-3.41zM12.92.8C8.923.777 5.137 2.941 3.148 6.451a4.5 4.5 0 0 1 .26-.007 4.92 4.92 0 0 1 2.585.737A8.316 8.316 0 0 1 12.688 3.6 4.944 4.944 0 0 1 13.723.834 11.008 11.008 0 0 0 12.92.8zm9.226 4.994a4.915 4.915 0 0 1-1.918 2.246 8.36 8.36 0 0 1-.273 8.303 4.89 4.89 0 0 1 1.632 2.54 11.156 11.156 0 0 0 .559-13.089zM3.41 7.932A3.41 3.41 0 0 0 0 11.342a3.41 3.41 0 0 0 3.41 3.409 3.41 3.41 0 0 0 3.41-3.41 3.41 3.41 0 0 0-3.41-3.41zm2.027 7.866a4.908 4.908 0 0 1-2.915.358 11.1 11.1 0 0 0 7.991 6.698 11.234 11.234 0 0 0 2.422.249 4.879 4.879 0 0 1-.999-2.85 8.484 8.484 0 0 1-.836-.136 8.304 8.304 0 0 1-5.663-4.32zm11.405.928a3.41 3.41 0 0 0-3.41 3.41 3.41 3.41 0 0 0 3.41 3.41 3.41 3.41 0 0 0 3.41-3.41 3.41 3.41 0 0 0-3.41-3.41z"/></svg>';
 if(family==='debian')return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M13.88 12.685c-.4 0 .08.2.601.28.14-.1.27-.22.39-.33a3.001 3.001 0 01-.99.05m2.14-.53c.23-.33.4-.69.47-1.06-.06.27-.2.5-.33.73-.75.47-.07-.27 0-.56-.8 1.01-.11.6-.14.89m.781-2.05c.05-.721-.14-.501-.2-.221.07.04.13.5.2.22M12.38.31c.2.04.45.07.42.12.23-.05.28-.1-.43-.12m.43.12-.15.03.14-.01V.43m6.633 9.944c.02.64-.2.95-.38 1.5l-.35.181c-.28.54.03.35-.17.78-.44.39-1.34 1.22-1.62 1.301-.201 0 .14-.25.19-.34-.591.4-.481.6-1.371.85l-.03-.06c-2.221 1.04-5.303-1.02-5.253-3.842-.03.17-.07.13-.12.2a3.551 3.551 0 012.001-3.501 3.361 3.362 0 013.732.48 3.341 3.341 0 00-2.721-1.3c-1.18.01-2.281.76-2.651 1.57-.6.38-.67 1.47-.93 1.661-.361 2.601.66 3.722 2.38 5.042.27.19.08.21.12.35a4.702 4.702 0 01-1.53-1.16c.23.33.47.66.8.91-.55-.18-1.27-1.3-1.48-1.35.93 1.66 3.78 2.921 5.261 2.3a6.203 6.203 0 01-2.33-.28c-.33-.16-.77-.51-.7-.57a5.802 5.802 0 005.902-.84c.44-.35.93-.94 1.07-.95-.2.32.04.16-.12.44.44-.72-.2-.3.46-1.24l.24.33c-.09-.6.74-1.321.66-2.262.19-.3.2.3 0 .97.29-.74.08-.85.15-1.46.08.2.18.42.23.63-.18-.7.2-1.2.28-1.6-.09-.05-.28.3-.32-.53 0-.37.1-.2.14-.28-.08-.05-.26-.32-.38-.861.08-.13.22.33.34.34-.08-.42-.2-.75-.2-1.08-.34-.68-.12.1-.4-.3-.34-1.091.3-.25.34-.74.54.77.84 1.96.981 2.46-.1-.6-.28-1.2-.49-1.76.16.07-.26-1.241.21-.37A7.823 7.824 0 0017.702 1.6c.18.17.42.39.33.42-.75-.45-.62-.48-.73-.67-.61-.25-.65.02-1.06 0C15.082.73 14.862.8 13.8.4l.05.23c-.77-.25-.9.1-1.73 0-.05-.04.27-.14.53-.18-.741.1-.701-.14-1.431.03.17-.13.36-.21.55-.32-.6.04-1.44.35-1.18.07C9.6.68 7.847 1.3 6.867 2.22L6.838 2c-.45.54-1.96 1.611-2.08 2.311l-.131.03c-.23.4-.38.85-.57 1.261-.3.52-.45.2-.4.28-.6 1.22-.9 2.251-1.16 3.102.18.27 0 1.65.07 2.76-.3 5.463 3.84 10.776 8.363 12.006.67.23 1.65.23 2.49.25-.99-.28-1.12-.15-2.08-.49-.7-.32-.85-.7-1.34-1.13l.2.35c-.971-.34-.57-.42-1.361-.67l.21-.27c-.31-.03-.83-.53-.97-.81l-.34.01c-.41-.501-.63-.871-.61-1.161l-.111.2c-.13-.21-1.52-1.901-.8-1.511-.13-.12-.31-.2-.5-.55l.14-.17c-.35-.44-.64-1.02-.62-1.2.2.24.32.3.45.33-.88-2.172-.93-.12-1.601-2.202l.15-.02c-.1-.16-.18-.34-.26-.51l.06-.6c-.63-.74-.18-3.102-.09-4.402.07-.54.53-1.1.88-1.981l-.21-.04c.4-.71 2.341-2.872 3.241-2.761.43-.55-.09 0-.18-.14.96-.991 1.26-.7 1.901-.88.7-.401-.6.16-.27-.151 1.2-.3.85-.7 2.421-.85.16.1-.39.14-.52.26 1-.49 3.151-.37 4.562.27 1.63.77 3.461 3.011 3.531 5.132l.08.02c-.04.85.13 1.821-.17 2.711l.2-.42M9.54 13.236l-.05.28c.26.35.47.73.8 1.01-.24-.47-.42-.66-.75-1.3m.62-.02c-.14-.15-.22-.34-.31-.52.08.32.26.6.43.88l-.12-.36m10.945-2.382-.07.15c-.1.76-.34 1.511-.69 2.212.4-.73.65-1.541.75-2.362M12.45.12c.27-.1.66-.05.95-.12-.37.03-.74.05-1.1.1l.15.02M3.006 5.142c.07.57-.43.8.11.42.3-.66-.11-.18-.1-.42m-.64 2.661c.12-.39.15-.62.2-.84-.35.44-.17.53-.2.83"/></svg>';
 if(family==='centos')return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12.076.066L8.883 3.28H3.348v5.434L0 12.01l3.349 3.298v5.39h5.374l3.285 3.236 3.285-3.236h5.43v-5.374L24 12.026l-3.232-3.252V3.321H15.31zm0 .749l2.49 2.506h-1.69v6.441l-.8.805-.81-.815V3.28H9.627zm-8.2 2.991h4.483L6.485 5.692l4.253 4.279v.654H9.94L5.674 6.423l-1.798 1.77zm5.227 0h1.635v5.415l-3.509-3.53zm4.302.043h1.687l1.83 1.842-3.517 3.539zm2.431 0h4.404v4.394l-1.83-1.842-4.241 4.267h-.764v-.69l4.261-4.287zm2.574 3.3l1.83 1.843v1.676h-5.327zm-12.735.013l3.515 3.462H3.876v-1.69zM3.348 9.454v1.697h6.377l.871.858-.782.77H3.35v1.786L.753 12.01zm17.42.068l2.488 2.503-2.533 2.55v-1.796h-6.41l-.75-.754.825-.83h6.38zm-9.502.978l.81.815.186-.188.614-.618v.686h.768l-.825.83.75.754h-.719v.808l-.842-.83-.741.73v-.707h-.7l.781-.77-.188-.186-.682-.672h.788zm-7.39 2.807h5.402l-3.603 3.55-1.798-1.772zm6.154 0h.708v.7l-4.404 4.338 1.852 1.824h-4.31v-4.342l1.798 1.77zm3.348 0h.715l4.317 4.343.186-.187 1.599-1.61v4.316h-4.366l1.853-1.825-.188-.185-4.116-4.054zm1.46 0h5.357v1.798l-1.785 1.796zm-2.83.191l.842.829v6.37h1.691l-2.532 2.495-2.533-2.495h1.79V14.23zm-1.27 1.251v5.42H8.939l-1.852-1.823zm2.64.097l3.552 3.499-1.853 1.825h-1.7z"/></svg>';
 if(family==='openwrt')return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 14c3-3 6-3 9 0s6 3 9 0M5 9.5c2-2 4-2 6 0s4 2 6 0"/></svg>';
 if(family==='bsd')return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="7"/><path d="M8.5 6 6.5 3.5M15.5 6l2-2.5"/></svg>';
 return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 7 5 5-5 5M12 17h7"/></svg>';
};
const setNodeMeta=(el,s)=>{
 if(!el)return;
 const group=String(s.server_group||'').trim();
 const groupTag=group&&!/^default$/i.test(group)?group:'';
 const system=osTitle(s),family=osFamily(s.os);
 const items=[groupTag,s.arch||'—',numeric(s.cpu_cores)?String(n(s.cpu_cores))+'C':'—C',bytes(numeric(s.ram_total)?n(s.ram_total)*1048576:null)].filter(Boolean);
 const signature=[system,family,...items].join('\x1f');
 if(el.dataset.signature===signature)return;
 el.dataset.signature=signature;
 el.classList.add('node-meta');

 const emblem=el.closest('.node-main')?.querySelector('.node-os-emblem');
 if(emblem){
  emblem.dataset.os=family;
  emblem.title='系统：'+system;
  emblem.innerHTML=osIcon(family);
 }

 const osName=document.createElement('span');
 osName.className='os-name';
 osName.textContent=system;
 el.replaceChildren(osName,...items.map(text=>{
  const tag=document.createElement('span');
  tag.className='meta-tag';
  tag.textContent=text;
  return tag;
 }));
};

const severity = value => {
  if(!numeric(value))return 'unknown';
  const v=Math.max(0,n(value));
  return v>=95?'critical':v>=80?'hot':v>=60?'warn':'safe';
};
const meterColor=(value,kind='quota')=>{
  if(!numeric(value))return 'var(--muted)';
  const actual=Math.min(100,Math.max(0,n(value)));
  // Resource pressure is intentionally about 20 points more sensitive than a traffic quota:
  // 80% CPU/RAM/DISK reaches the same danger color as 100% monthly traffic usage.
  const p=kind==='resource'?Math.min(100,actual+20):actual;
  if(p>=100)return '#ef4444';
  const hue=142*(1-Math.pow(p/100,.72));
  const saturation=76+p*.10,lightness=42+p*.07;
  return `hsl(${hue.toFixed(1)} ${saturation.toFixed(1)}% ${lightness.toFixed(1)}%)`;
};
const markSeverity = (el,value,kind='quota') => {
  if(!el)return;
  el.classList.remove('safe','warn','hot','critical','unknown','zero');
  const visualValue=kind==='resource'&&numeric(value)?Math.min(100,n(value)+20):value;
  const level=severity(visualValue);el.classList.add(level);
  el.style.removeProperty('--meter-color');
  el.dataset.meterKind=kind;
  if(numeric(value)&&n(value)<=0)el.classList.add('zero');
};
const state={servers:new Map(),rows:new Map(),regions:new Map(),history:new Map(),config:{},sys:{},selected:'',search:'',status:'all',quick:'',sort:'default',page:'overview',ws:null,retry:null,heartbeat:null,attempt:0,loading:false,stopped:false,lastMessage:0};
const map=new DeferredNodeMap(selectRegion);
const liveRangeMs=5*60000,serverHistoryHours=[1,6,24,168];
const chartState={live:true,rangeMs:liveRangeMs};
let charts=null,networkChartsPromise=null,nodeTrendsModule=null;
const historyAPI=new HistoryAPI();
function ensureNetworkCharts(){
 if(charts)return Promise.resolve(charts);
 if(!networkChartsPromise)networkChartsPromise=import('./network.js?v=0.5.15').then(({NetworkCharts})=>{charts=new NetworkCharts();charts.live=chartState.live;charts.rangeMs=chartState.rangeMs;return charts;});
 return networkChartsPromise;
}
function renderNodeTrendsDeferred(row,s,history,enabled){
 if(!row.querySelector('.node-detail')?.open)return;
 if(nodeTrendsModule){nodeTrendsModule.renderNodeTrends(row,s,history,enabled);return;}
 import('./node-trends.js?v=0.5.15').then(mod=>{nodeTrendsModule=mod;if(row.querySelector('.node-detail')?.open)mod.renderNodeTrends(row,s,history,enabled);}).catch(()=>{});
}
let historyGeneration=0,historyLoading=false,historyLoadedAt=0,historyResults=new Map();
try{const saved=sessionStorage.getItem('atlas-network-range'),hours=Number(sessionStorage.getItem('atlas-network-hours'));if(saved==='live'){chartState.live=true;chartState.rangeMs=liveRangeMs;}else if(serverHistoryHours.includes(hours)){chartState.live=false;chartState.rangeMs=hours*3600000;}else{chartState.live=false;chartState.rangeMs=24*3600000;}}catch{chartState.live=false;chartState.rangeMs=86400000;}
function syncRangeButtons(){document.querySelectorAll('[data-network-range]').forEach(b=>{const value=b.dataset.networkRange;b.setAttribute('aria-pressed',String(value==='live'?chartState.live:Number(value)===chartState.rangeMs&&!chartState.live));});}
syncRangeButtons();
document.querySelectorAll('[data-network-range]').forEach(button=>button.addEventListener('click',()=>{const value=button.dataset.networkRange;chartState.live=value==='live';chartState.rangeMs=chartState.live?liveRangeMs:Number(value);if(charts){charts.live=chartState.live;charts.rangeMs=chartState.rangeMs;}try{sessionStorage.setItem('atlas-network-range',value);if(!chartState.live)sessionStorage.setItem('atlas-network-hours',String(chartState.rangeMs/3600000));}catch{}historyGeneration++;historyLoading=false;historyLoadedAt=0;historyResults=new Map();syncRangeButtons();renderNetwork();}));
async function loadNetworkHistory(){
 if(chartState.live){historyLoading=false;return;}
 if(historyLoading||Date.now()-historyLoadedAt<300000||state.page!=='network'||!allowed('show_three_net_details')||!state.servers.size)return;
 const generation=++historyGeneration,hours=chartState.rangeMs/3600000;historyLoading=true;set($('#network-history-note'),'正在读取 '+(hours===168?'7 天':hours+' 小时')+' 服务端历史…');
 const ids=[...state.servers.keys()];
 await Promise.all(ids.map(async id=>{const result=await historyAPI.get(id,hours);if(generation!==historyGeneration)return;historyResults.set(id,result);}));
 if(generation!==historyGeneration)return;historyLoading=false;historyLoadedAt=Date.now();renderNetwork();
}

const activityObserver=new ActivityObserver(),activityRows=[],filterChips=new Map();
function renderActivity(){
 const kind=$('#activity-kind').value||'all',search=$('#activity-search').value.trim().toLowerCase();let count=0;
 for(const row of activityRows){row.hidden=!(kind==='all'||row.dataset.kind===kind)||!row.searchText.includes(search);if(!row.hidden)count++;}
 set($('#activity-count'),count+' / '+activityRows.length+' 条');$('#activity-empty').hidden=count>0;
 set($('#activity-empty'),activityRows.length?'没有符合条件的活动':'等待状态变化');
 const pop=$('#activity-popover-list'),empty=$('#activity-popover-empty'),badge=$('#activity-badge');
 if(pop){pop.replaceChildren(...activityRows.slice(0,5).map(row=>{const copy=row.cloneNode(true);copy.hidden=false;return copy;}));}
 if(empty)empty.hidden=activityRows.length>0;
 if(badge){badge.hidden=activityRows.length===0;set(badge,activityRows.length>99?'99+':activityRows.length);}
}
const activityStoreKey='atlas-node-status-events-v1';
function savedActivity(){
 try{
  const value=JSON.parse(localStorage.getItem(activityStoreKey)||'[]');
  return Array.isArray(value)?value.filter(e=>e&&['online','offline'].includes(e.kind)&&Number.isFinite(Number(e.ts))).slice(0,100):[];
 }catch{return [];}
}
function saveActivity(event){
 try{
  const events=savedActivity();
  events.unshift(event);
  localStorage.setItem(activityStoreKey,JSON.stringify(events.slice(0,100)));
 }catch{}
}
function addEvent(text,kind='connection',node='',ts=Date.now(),persist=true){
 const normalized=kind==='recovery'&&text==='恢复在线'?'online':kind;
 if(normalized!=='offline'&&normalized!=='online')return;
 const li=document.createElement('li'),dot=document.createElement('i'),body=document.createElement('span'),tag=document.createElement('b'),description=document.createElement('span'),time=document.createElement('time');
 dot.className='status-dot'+(normalized==='offline'?' is-offline':'');dot.setAttribute('aria-hidden','true');body.className='event-body';tag.className='event-kind';
 set(tag,normalized==='offline'?'离线':'上线');set(description,(node?node+' · ':'')+text);body.append(tag,description);time.dateTime=new Date(ts).toISOString();
 set(time,new Date(ts).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}));
 li.append(dot,body,time);li.dataset.kind=normalized;li.searchText=((node||'')+' '+text).toLowerCase();
 $('#activity-list').prepend(li);activityRows.unshift(li);if(activityRows.length>100)activityRows.pop().remove();
 if(persist)saveActivity({text,kind:normalized,node,ts:Number(ts)});
 renderActivity();
}
function loadActivityHistory(){
 const events=savedActivity();
 for(const event of [...events].reverse())addEvent(event.text,event.kind,event.node,event.ts,false);
}
loadActivityHistory();
function observeStatus(){for(const event of activityObserver.scan(all()))addEvent(event.message,event.kind,event.node,event.ts);}
const carriers=['cu','ct','cm'];
const names={cu:'联通',ct:'电信',cm:'移动',bd:'BGP'};
const label=key=>state.sys[`custom_${key}_name`]||names[key];
const allowed=key=>state.sys[key]!==false&&state.sys[key]!=='false';
const all=()=>[...state.servers.values()];
const trafficSeries={in:[],out:[]},trafficPlots={};
const trafficSampleMs=2000;
function updateTrafficSparks(live){
  const now=Date.now();
  for(const [key,field] of [['in','net_in_speed'],['out','net_out_speed']]){
    const value=live.length?total(live,field):null,series=trafficSeries[key],last=series.at(-1),sample={ts:now,value:numeric(value)?n(value):null};
    // Important: do NOT move last.ts while coalescing. The old code reset the timestamp on every render,
    // so frequent live updates could keep the series at one point forever.
    if(last&&now-last.ts<trafficSampleMs)last.value=sample.value;
    else series.push(sample);
    trafficSeries[key]=series.slice(-60);
    const points=trafficSeries[key],maximum=Math.max(1024,...points.map(p=>numeric(p.value)?n(p.value):0));
    const divisor=Math.max(1,points.length-1),xAt=(i)=>points.length===1?118:2+i/divisor*116;
    trafficPlots[key]?.update(points.map((p,i)=>numeric(p.value)?{ts:p.ts,x:xAt(i),y:30-Math.min(maximum,n(p.value))/maximum*26}:null));
  }
}
function visible(){return all().filter(s=>(state.status==='all'||(state.status==='online')===online(s))&&(!state.quick||(state.quick==='load'?highLoad(s):allowed('show_expire')&&expiring(s)))&&(!state.selected||region(s.region).code===state.selected)&&(!state.search||`${s.name} ${region(s.region).name} ${s.region} ${s.server_group||''}`.toLowerCase().includes(state.search)));}
function sorted(){return visible().sort((a,b)=>state.sort==='cpu'?n(b.cpu)-n(a.cpu):state.sort==='traffic'?n(month(b))-n(month(a)):state.sort==='name'?String(a.name).localeCompare(String(b.name)):n(a.sort_order)-n(b.sort_order)||String(a.id).localeCompare(String(b.id)));}
function connection(text,live=false){$('#connection').title=text;if(state.connectionText!==text){if(state.connectionText)addEvent(text,'connection');state.connectionText=text;}set($('#connection'),text);$('#connection').classList.toggle('live',live);}
function loading(active){document.documentElement.classList.toggle('is-loading',active);$('main').setAttribute('aria-busy',String(active));$('#table-skeleton').hidden=!active;if(active)$('#empty').hidden=true;else if(!state.ready)$('#empty').hidden=false;}
function notice(text=''){set($('#notice'),text);$('#notice').hidden=!text;}
function chartSetup(){
  for(const key of [...carriers,'bd']){const div=document.createElement('div');div.className='carrier-line';div.innerHTML='<span></span><strong>—</strong><svg viewBox="0 0 240 28" preserveAspectRatio="none" role="img"><title></title><path/></svg><small class="trend-note"></small><small class="trend-loss">—</small>';div.dataset.carrier=key;div.plot=new Plot(div.querySelector('svg'),div.querySelector('path'),{baseline:27,smooth:true});$('#carrier-summary').append(div);}
  for(const key of ['in','out']){const svg=$(`[data-live-traffic="${key}"] .kpi-spark`);if(svg)trafficPlots[key]=new Plot(svg,svg.querySelector('.kpi-spark-series'));}
}
function renderSummary(){
  const list=all(),live=list.filter(s=>online(s));
  set($('#stat-nodes'),String(list.length).padStart(2,'0'));set($('#stat-online'),`${live.length} 在线 / ${list.length-live.length} 离线`);
  set($('#stat-regions'),String(new Set(list.map(s=>region(s.region).code).filter(c=>c!=='XX')).size).padStart(2,'0'));
  set($('#stat-in'),`${bytes(live.length?total(live,'net_in_speed'):0,true)}`);set($('#stat-out'),`${bytes(live.length?total(live,'net_out_speed'):0,true)}`);updateTrafficSparks(live);
  const monthly=list.map(month).filter(numeric);set($('#stat-month'),allowed('show_tf')?bytes(monthly.length?monthly.reduce((a,v)=>a+v,0):null):'未公开');
  const cost=costs(list);set($('#stat-cost'),allowed('show_price')?cost.text:'未公开');$('#stat-cost').classList.toggle('multi-currency',cost.currencies>1);set($('#cost-note'),cost.missing?`${list.length-cost.missing}/${list.length} 台已配置 · 按币种分别汇总`:'按币种分别汇总');
  $('#online-bar').style.width=`${list.length?live.length/list.length*100:0}%`;set($('#availability'),list.length?`${Math.round(live.length/list.length*100)}%`:'—');const pattern=live.length+'/'+list.length;if($('#availability-track').dataset.pattern!==pattern){$('#availability-track').dataset.pattern=pattern;$('#availability-track').replaceChildren();for(let i=0;i<32;i++){const segment=document.createElement('i');segment.classList.toggle('off',!list.length||i>=Math.round(live.length/list.length*32));$('#availability-track').append(segment);}}
  const shown=visible().filter(s=>online(s));set($('#map-online'),shown.length);const values=shown.flatMap(s=>carriers.map(k=>s[`ping_${k}`])).filter(v=>numeric(v)&&n(v)>=0);set($('#map-latency'),`${values.length?Math.round(values.reduce((a,v)=>a+n(v),0)/values.length)+' ms':'—'} AVG`);
}
function renderRegions(){

  const groups=new Map();for(const server of all()){const code=region(server.region).code;if(!groups.has(code))groups.set(code,[]);groups.get(code).push(server);}
  set($('#region-count'),groups.size);set($('#all-count'),state.servers.size);$('#all-regions').classList.toggle('active',!state.selected);$('#all-regions').setAttribute('aria-pressed',String(!state.selected));$('#clear-region').hidden=!state.selected;
  for(const [code,list]of [...groups].sort((a,b)=>b[1].length-a[1].length)){
    let button=state.regions.get(code);if(!button){button=document.createElement('button');button.className='region';button.innerHTML='<span class="flag"></span><span class="region-info"><strong></strong><small></small></span><span class="region-count"><b></b><small></small></span>';button.querySelector('.flag').innerHTML=flag(code);button.addEventListener('click',()=>selectRegion(code));state.regions.set(code,button);$('#region-list').append(button);}
    set(button.querySelector('strong'),region(code).name);const samples=list.filter(s=>online(s)).flatMap(s=>carriers.map(k=>s['ping_'+k])).filter(v=>numeric(v)&&n(v)>=0).map(Number);set(button.querySelector('.region-info small'),samples.length?'均值 '+Math.round(samples.reduce((a,b)=>a+b,0)/samples.length)+' ms · 最低 '+Math.min(...samples)+' ms':'暂无延迟数据');set(button.querySelector('b'),list.length+' 台');set(button.querySelector('.region-count small'),Math.round(list.length/state.servers.size*100)+'%');button.setAttribute('aria-pressed',String(state.selected===code));
  }
  for(const [code,el] of state.regions)if(!groups.has(code)){el.remove();state.regions.delete(code);}
}
function selectRegion(code){state.selected=code;renderRegions();renderRows();renderAggregates();map.focus(code);}
function updateRow(s){
  const row=state.rows.get(s.id);if(!row)return;const live=online(s),r=region(s.region);row.classList.toggle('offline',!live);row.querySelector('.status-cell').setAttribute('aria-label',live?'在线':'离线');
  const quotaCell=row.querySelector('.transfer-cell');
  let quotaTrack=quotaCell.querySelector('.quota-track'),quotaNote=quotaCell.querySelector('[data-field="traffic-remaining"]');
  if(!quotaTrack){quotaTrack=document.createElement('div');quotaTrack.className='quota-track';quotaTrack.setAttribute('role','progressbar');quotaTrack.setAttribute('aria-label','本周期流量已用比例');quotaTrack.setAttribute('aria-valuemin','0');quotaTrack.setAttribute('aria-valuemax','100');const fill=document.createElement('b');quotaTrack.append(fill);quotaNote=document.createElement('small');quotaNote.className='quota-remaining';quotaNote.dataset.field='traffic-remaining';quotaCell.append(quotaTrack,quotaNote);row.fields['traffic-remaining']=quotaNote;}
  renderNodeTrendsDeferred(row,s,state.history.get(s.id)||[],allowed('show_three_net_details'));
  const f=(key,value)=>set(row.fields[key],value);
  f('region',r.code);const emblem=row.querySelector('[data-flag]');if(emblem.dataset.code!==r.code){emblem.dataset.code=r.code;emblem.innerHTML=flag(r.code);}f('name',s.name||'未命名节点');f('status',live?'在线':'离线');setNodeMeta(row.fields.meta,s);
  f('cpu_info',s.cpu_info);f('os',`${s.os||'—'} · ${s.kernel_version||'—'}`);f('load',`${s.load_avg||'—'} / ${numeric(s.processes)?s.processes:'—'}`);f('connections',`${numeric(s.tcp_conn)?s.tcp_conn:'—'} / ${numeric(s.udp_conn)?s.udp_conn:'—'}`);
  f('price',allowed('show_price')?(numeric(s.price)?`${s.currency||''}${Math.max(0,n(s.price))} / ${cycles[s.billing_cycle]||'?'} 个月`:'未配置'):'未公开');f('expire',allowed('show_expire')?(s.expire_date||'未配置'):'未公开');
  for(const [key,value] of [['cpu',numeric(s.cpu)?n(s.cpu):null],['ram',percent(s.ram_used,s.ram_total)],['disk',percent(s.disk_used,s.disk_total)]]){f(key,fmtPct(value));const bar=row.bars[key],width=`${Math.min(100,Math.max(0,n(value)))}%`;if(bar.style.width!==width)bar.style.width=width;markSeverity(bar,value,'resource');}
  f('download',`${live?bytes(s.net_in_speed,true):'—'}`);f('upload',`${live?bytes(s.net_out_speed,true):'—'}`);
  const quota=trafficQuota(s),quotaBar=quotaTrack.firstElementChild,quotaVisible=allowed('show_tf')&&quota.limit!==null;
  const trafficMode=({dl:'仅下行',ul:'仅上行',max:'取高',total:'双向'}[s.traffic_calc_type||'total']||'双向');
  const trafficUsed=allowed('show_tf')?quota.used:null;
  f('month',allowed('show_tf')?(quotaVisible?`${bytes(trafficUsed)} / ${bytes(quota.limit)}`:bytes(trafficUsed)):'未公开');f('uptime',uptime(s));
  f('traffic-down',allowed('show_tf')?bytes(numeric(s.net_rx_monthly)?n(s.net_rx_monthly):null):'未公开');
  f('traffic-up',allowed('show_tf')?bytes(numeric(s.net_tx_monthly)?n(s.net_tx_monthly):null):'未公开');
  quotaTrack.hidden=!quotaVisible;
  if(quotaVisible){
    const usedPercent=numeric(quota.percent)?Math.max(0,quota.percent):0,width=`${Math.min(100,usedPercent)}%`;
    if(quotaBar.style.width!==width)quotaBar.style.width=width;
    markSeverity(quotaBar,usedPercent,'quota');quotaBar.classList.toggle('over',usedPercent>100);
    quotaTrack.setAttribute('aria-valuenow',String(Math.min(100,usedPercent)));
    quotaTrack.setAttribute('aria-valuetext',numeric(quota.percent)?`${trafficMode}流量，已用 ${quota.percent.toFixed(1)}%，余量 ${bytes(quota.remaining)}`:'等待流量上报');
    f('traffic-remaining',numeric(quota.percent)?`${trafficMode} · ${quota.percent>100?'已超额':'余 '+bytes(quota.remaining)} · ${quota.percent.toFixed(1)}%`:'等待流量上报');
  }else{f('traffic-remaining',allowed('show_tf')?'未配置月配额':'');}
  for(const k of carriers){f(k,`${label(k)} ${ping(s[`ping_${k}`])}${n(s[`loss_${k}`])>0?' / '+loss(s[`loss_${k}`]):''}`);row.fields[k].classList.toggle('lossy',numeric(s[`loss_${k}`])&&n(s[`loss_${k}`])>0);}
}
function renderRows(){
  renderFilters();
  const list=sorted(),ids=new Set(all().map(s=>s.id));
  for(const [id,row] of state.rows)if(!ids.has(id)){row.remove();state.rows.delete(id);state.history.delete(id);}
  for(const s of all())if(!state.rows.has(s.id)){const row=$('#node-template').content.firstElementChild.cloneNode(true);row.dataset.id=s.id;const detail=row.querySelector('details');for(const b of row.querySelectorAll('[data-detail-toggle]'))b.addEventListener('click',()=>{detail.open=!detail.open;if(detail.open)updateRow(state.servers.get(row.dataset.id));if(detail.parentElement.classList.contains('node-detail-cell'))detail.parentElement.hidden=false;row.querySelectorAll('[data-detail-toggle]').forEach(el=>{el.setAttribute('aria-expanded',String(detail.open));if(el.classList.contains('detail-button')){el.setAttribute('aria-label',detail.open?'收起节点详情':'展开节点详情');set(el,detail.open?'收起':'详情');}});});row.fields=Object.fromEntries([...row.querySelectorAll('[data-field]')].map(e=>[e.dataset.field,e]));row.bars=Object.fromEntries([...row.querySelectorAll('[data-bar]')].map(e=>[e.dataset.bar,e]));state.rows.set(s.id,row);$('#node-list').append(row);}
  const shown=new Set(list.map(s=>s.id));for(const [id,row] of state.rows)row.hidden=!shown.has(id);
  let cursor=$('#node-list').firstElementChild;
  for(const s of list){const row=state.rows.get(s.id);if(row!==cursor)$('#node-list').insertBefore(row,cursor);cursor=row.nextElementSibling;updateRow(s);}
  set($('#node-count'),`${list.length} / ${state.servers.size}`);$('#empty').hidden=list.length>0;set($('#empty'),state.servers.size?'没有符合筛选条件的节点。':'暂无服务器，请在 CFSM 后台添加节点。');$('#reset-filters').hidden=list.length>0||!state.servers.size;
}
function record(s,ts,metrics){
  recordResources(s.id,ts,metrics);
  const samples=state.history.get(s.id)||[];
  if(!numeric(ts)||!metrics||![...carriers,'bd'].some(k=>Object.hasOwn(metrics,'ping_'+k)||Object.hasOwn(metrics,'loss_'+k)))return;
  const sample={ts,...Object.fromEntries([...carriers,'bd'].map(k=>[k,metrics['ping_'+k]])),loss:Object.fromEntries([...carriers,'bd'].map(k=>[k,metrics['loss_'+k]]))};
  state.history.set(s.id,windowSamples([...samples,sample]));
}
function renderNetwork(){
 const live=visible().filter(s=>online(s)),now=Date.now(),enabled=allowed('show_three_net_details');
 if(state.page==='overview'||state.page==='resources')for(const key of [...carriers,'bd']){
  const el=$('[data-carrier="'+key+'"]'),value=avg(live,'ping_'+key);
  set(el.children[0],label(key));set(el.children[1],ping(value));set(el.querySelector('.trend-loss'),'丢包 '+loss(avg(live,'loss_'+key)));
  const {points,sources}=aggregateHistory(enabled?live.map(s=>s.id):[],state.history,key,now),svg=el.querySelector('svg');
  const maximum=Math.max(50,Math.ceil(Math.max(0,...points.map(p=>p.value))/50)*50);
  const x=p=>2+Math.max(0,Math.min(1,(p.ts-(now-7200000))/7200000))*236,y=p=>25-p.value/maximum*22;
  if(points.length){svg.removeAttribute('hidden');const geometry=[];let previous=null;for(const p of points){if(previous&&p.bucket-previous.bucket!==1)geometry.push(null);geometry.push({ts:p.ts,x:x(p),y:y(p)});previous=p;}el.plot?.update(geometry,{animate:true});}else{el.plot?.update([],{animate:false});svg.setAttribute('hidden','');}
  set(el.querySelector('.trend-note'),!enabled?'历史未公开':points.length?'近 2 小时 · '+sources+'/'+live.length+' 台':'暂无历史');
  const description=label(key)+'延迟趋势，纵轴 0–'+maximum+' ms；每 6 分钟汇总有采样节点的均值，不补齐缺失时段。'+points.map(p=>new Date(p.ts).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})+' '+Math.round(p.value)+' ms（'+p.count+'台）').join('；');
  svg.setAttribute('aria-label',description);set(svg.querySelector('title'),description);
 }
 if(state.page==='network'){
  if(!charts){set($('#network-history-note'),'正在加载网络图表…');ensureNetworkCharts().then(()=>{if(state.page==='network')renderNetwork();}).catch(()=>set($('#network-history-note'),'网络图表加载失败 · 点击重试'));return;}
  charts.live=chartState.live;charts.rangeMs=chartState.rangeMs;
  const histories=new Map();for(const s of all()){const result=historyResults.get(s.id);const archived=result?.points||[],latest=archived.at(-1)?.ts??0;histories.set(s.id,result?.error?[]:[...archived,...(state.history.get(s.id)||[]).filter(p=>p.ts>latest)]);}
  charts.update(all(),histories,Object.fromEntries(carriers.map(k=>[k,label(k)])),enabled);
  if(chartState.live)set($('#network-history-note'),'实时采样 · 约 5 分钟窗口 · 5 秒快照');
  else if(!enabled)set($('#network-history-note'),'后台未开启三网详情');
  else if(!historyLoading){const errors=[...historyResults.values()].filter(r=>r.error);set($('#network-history-note'),errors.length?[...new Set(errors.map(r=>r.error))].join('；')+' · 点击重试':'历史采样 · 点击图表锁定 · Esc 返回实时');}
  loadNetworkHistory();
 }
}
function renderAggregates(){observeStatus();renderNetwork();if(state.page==='overview'||state.page==='resources'){renderSummary();map.update(visible(),state.config.theme_options||{},state.selected);}}
async function json(url){const response=await fetch(url,{cache:'no-cache',headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000),priority:url==='/api/servers'?'high':'auto'});if(!response.ok)throw Error(response.status===401||response.status===403?'站点需要登录，请先打开后台登录':`读取失败（${response.status}）`);return response.json();}
async function refresh(){
  if(state.loading)return;state.loading=true;if(!state.ready)loading(true);$('#refresh').disabled=true;
  try{
    const payload=await json('/api/servers');if(!Array.isArray(payload.servers))throw Error('服务器列表格式不正确');state.sys=payload.sysConfig||{};
    const next=new Map();for(const s of payload.servers){if(!s.id)continue;const id=String(s.id),old=state.servers.get(id);next.set(id,old&&n(old.last_updated)>n(s.last_updated)?{...s,...old}:{...s,id});recordResources(id,s.last_updated,s);const samples=historyFromArrays(Array.isArray(s.ping)?s.ping:[],Array.isArray(s.loss)?s.loss:[]);state.history.set(id,windowSamples([...samples,...(state.history.get(id)||[])]));}
    state.servers=next;state.ready=true;if(state.selected&&!all().some(s=>region(s.region).code===state.selected))state.selected='';
    renderRegions();renderRows();renderAggregates();notice();set($('#last-update'),`更新于 ${new Date().toLocaleTimeString('zh-CN')}`);set($('#footer-status'),`${all().length} 个节点 · CFSM`);
    if(!state.activityBootstrapped){state.activityBootstrapped=true;addEvent(`已读取 ${all().length} 个节点`,'connection','CFSM');}
    if(state.ws?.readyState===WebSocket.OPEN){subscribe();connection('LIVE · 实时',true);}else if(!state.ws&&!state.retry)connect();
  }catch(e){notice(`${e.message}。${state.servers.size?'保留上次数据，可点击刷新重试。':'可点击刷新重试。'}`);if(!state.servers.size)set($('#empty'),'暂时无法读取节点');connection('数据暂不可用');}
  finally{state.loading=false;loading(false);$('#refresh').disabled=false;}
}
function subscribe(){const ids=[...state.servers.keys()].filter(id=>/^[a-zA-Z0-9._:-]{1,64}$/.test(id)).slice(0,500);state.ws.send(JSON.stringify({type:'subscribe',scope:'all',ids}));if(state.servers.size>500)notice('超过 500 台的节点通过定时刷新更新。');}
// Coalesce bursts from multiple agents into one render per animation frame.
const pendingRows=new Set();let liveFrame=0,summaryTimer=0,lastUpdateSecond=-1;
function scheduleOverviewSummary(){
  if(summaryTimer||document.hidden||state.page!=='overview')return;
  summaryTimer=setTimeout(()=>{
    summaryTimer=0;
    if(document.hidden||state.page!=='overview')return;
    renderRegions();
    renderAggregates();
  },180);
}
function scheduleLiveRender(){
  if(liveFrame)return;
  liveFrame=requestAnimationFrame(()=>{
    liveFrame=0;
    if(document.hidden){pendingRows.clear();return;}
    if(['overview','nodes','resources'].includes(state.page)){
      if(state.sort!=='default'||state.status!=='all'||state.quick)renderRows();
      else for(const id of pendingRows){const s=state.servers.get(id);if(s)updateRow(s);}
    }
    pendingRows.clear();
    scheduleOverviewSummary();
    const second=Math.floor(Date.now()/1000);
    if(second!==lastUpdateSecond){
      lastUpdateSecond=second;
      set($('#last-update'),`更新于 ${new Date().toLocaleTimeString('zh-CN')}`);
    }
  });
}
function connect(){
  if(state.stopped||document.hidden||state.ws)return;connection('连接中');let ws;
  try{ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/api/ws?subscribe=all`);}catch{reconnect();return;}
  state.ws=ws;const timeout=setTimeout(()=>{if(ws.readyState===WebSocket.CONNECTING)ws.close();},15000);
  ws.onopen=()=>{clearTimeout(timeout);state.attempt=0;state.lastMessage=Date.now();connection('LIVE · 实时',true);subscribe();state.heartbeat=setInterval(()=>{if(Date.now()-state.lastMessage>45000){ws.close();return;}if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'ping'}));},20000);};
  ws.onmessage=event=>{state.lastMessage=Date.now();let msg;try{msg=JSON.parse(event.data);}catch{return;}if(msg.type!=='batchUpdate'||!Array.isArray(msg.updates))return;const touched=new Set();
    for(const update of msg.updates){const s=state.servers.get(String(update.serverId));if(!s)continue;for(const sample of Array.isArray(update.samples)?update.samples:[])if(mergeSample(s,sample.data??sample.payload??sample.metrics,sample.ts)){touched.add(s.id);record(s,n(sample.ts),sample.data??sample.payload??sample.metrics);}}
    if(document.hidden)return;
    for(const id of touched)pendingRows.add(id);if(touched.size)scheduleLiveRender();
  };
  ws.onclose=()=>{clearTimeout(timeout);clearInterval(state.heartbeat);if(state.ws===ws)state.ws=null;reconnect();};ws.onerror=()=>ws.close();
}
function reconnect(){if(state.stopped||document.hidden||state.retry)return;connection('重连中 · 定时刷新');state.retry=setTimeout(()=>{state.retry=null;connect();},Math.min(30000,1000*2**Math.min(state.attempt++,5)));}
const settings={appearance:'system',globe:'auto'};try{const saved=JSON.parse(localStorage.getItem('wxt-atlas-settings')||'{}');for(const key of ['appearance','globe'])if(saved[key])settings[key]=saved[key];}catch{}
const systemTheme=matchMedia('(prefers-color-scheme: dark)');
function applySettings(){const theme=settings.appearance==='system'?(systemTheme.matches?'dark':'light'):settings.appearance==='dark'?'dark':'light';document.documentElement.dataset.theme=theme;document.querySelector('meta[name="theme-color"]').content=theme==='dark'?'#050608':'#ececeb';$('#theme').innerHTML=theme==='dark'?icons.sun:icons.moon;$('#theme').setAttribute('aria-label',theme==='dark'?'切换日间主题':'切换夜间主题');$('#theme').title=theme==='dark'?'切换日间主题':'切换夜间主题';map.mode=settings.globe;$('.map-panel').hidden=settings.globe==='off';$('.observatory').classList.toggle('no-globe',settings.globe==='off');map.requestDraw();}
function saveSettings(){try{localStorage.setItem('wxt-atlas-settings',JSON.stringify(settings));}catch{}applySettings();}
systemTheme.addEventListener?.('change',()=>{if(settings.appearance==='system')applySettings();});
$('#theme').addEventListener('click',()=>{settings.appearance=document.documentElement.dataset.theme==='dark'?'light':'dark';saveSettings();});
$('#activity-toggle').addEventListener('click',()=>{const button=$('#activity-toggle'),panel=$('#activity-popover'),open=panel.hidden;panel.hidden=!open;button.setAttribute('aria-expanded',String(open));if(open)renderActivity();});
document.addEventListener('click',event=>{const panel=$('#activity-popover'),button=$('#activity-toggle');if(!panel.hidden&&!panel.contains(event.target)&&event.target!==button&&!button.contains(event.target)){panel.hidden=true;button.setAttribute('aria-expanded','false');}});
applySettings();
$('#refresh').addEventListener('click',()=>{historyLoadedAt=0;historyAPI.cache.clear();refresh();});$('#network-history-note').addEventListener('click',()=>{historyLoadedAt=0;historyAPI.cache.clear();loadNetworkHistory();});$('#all-regions').addEventListener('click',()=>selectRegion(''));
$('#reset-filters').addEventListener('click',()=>{state.search='';state.status='all';state.quick='';$('#search').value='';document.querySelectorAll('[data-status]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.status==='all')));selectRegion('');});
function renderFilters(){
 saveViewState();
 if(!allowed('show_expire')&&state.quick==='expiry')state.quick='';
 document.querySelectorAll('[data-quick]').forEach(b=>{b.setAttribute('aria-pressed',String(state.quick===b.dataset.quick));b.hidden=b.dataset.quick==='expiry'&&!allowed('show_expire');});
 const selected=new Map();if(state.status!=='all')selected.set('status',state.status==='offline'?'离线':'在线');if(state.quick)selected.set('quick',state.quick==='load'?'高负载 ≥85%':'14 天内到期（含已到期）');if(state.selected)selected.set('selected',region(state.selected).name);if(state.search)selected.set('search','搜索：'+state.search);
 for(const [key,text] of selected){let b=filterChips.get(key);if(!b){b=document.createElement('button');b.addEventListener('click',()=>{state[key]=key==='status'?'all':'';if(key==='search')$('#search').value='';document.querySelectorAll('[data-status]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.status===state.status)));renderRegions();renderRows();renderAggregates();});filterChips.set(key,b);$('#active-filters').append(b);}set(b,text+' ×');b.setAttribute('aria-label','清除'+text+'筛选');}
 for(const [key,b] of filterChips)if(!selected.has(key)){b.remove();filterChips.delete(key);}$('#active-filters').hidden=selected.size===0;
}
document.querySelectorAll('[data-quick]').forEach(b=>b.addEventListener('click',()=>{state.quick=state.quick===b.dataset.quick?'':b.dataset.quick;renderRows();renderAggregates();}));
$('#activity-kind').addEventListener('change',renderActivity);$('#activity-search').addEventListener('input',renderActivity);
$('#search').addEventListener('input',e=>{state.search=e.target.value.trim().toLowerCase();renderRows();renderAggregates();});$('#clear-region').addEventListener('click',()=>selectRegion(''));document.querySelectorAll('[data-status]').forEach(b=>b.addEventListener('click',()=>{state.status=b.dataset.status;document.querySelectorAll('[data-status]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));renderRows();renderAggregates();}));$('#sort').addEventListener('change',e=>{state.sort=e.target.value;renderRows();});
function showPage(key,animate=false){
 const page=pageFromHash('#'+key),displayPage=page==='resources'?'overview':page;state.page=page;map.clearTip();
 for(const id of Object.keys(pages))if($('#'+id))$('#'+id).hidden=id!==displayPage&&!(id==='nodes'&&displayPage==='overview');set($('#page-title'),pages[displayPage]);map.active=displayPage==='overview';
 document.querySelectorAll('nav a').forEach(a=>{const active=a.getAttribute('href')==='#'+displayPage;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 if(map.active)map.requestDraw();if(state.servers.size){if(['overview','nodes','resources'].includes(page))renderRows();renderAggregates();}
 if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)$('main').animate?.([{opacity:.55,transform:'translateY(3px)'},{opacity:1,transform:'none'}],{duration:130,easing:'ease-out'});
}
function saveViewState(){try{sessionStorage.setItem('atlas-view-v1',JSON.stringify(Object.fromEntries(['search','status','quick','sort','selected'].map(k=>[k,state[k]]))));}catch{}}
try{const view=JSON.parse(sessionStorage.getItem('atlas-view-v1')||'{}');for(const [key,values] of Object.entries({status:['all','online','offline'],quick:['','load','expiry'],sort:['default','cpu','traffic','name']}))if(values.includes(view[key]))state[key]=view[key];if(typeof view.search==='string')state.search=view.search.slice(0,200);if(typeof view.selected==='string'&&/^[A-Z]{2}$/.test(view.selected))state.selected=view.selected;$('#search').value=state.search;$('#sort').value=state.sort;document.querySelectorAll('[data-status]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.status===state.status)));}catch{}
chartSetup();
new ViewRouter(showPage);
json('/api/config').then(config=>{
 state.config=config||{};
 const title=String(config.site_title||injectedSiteTitle||'CF-Server-Monitor').trim();
 set($('#site-title'),title);
 document.title=title;
 const preferred=String(config.preferred_theme||'auto').toLowerCase();
 let hasLocalAppearance=false;
 try{hasLocalAppearance=Boolean(JSON.parse(localStorage.getItem('wxt-atlas-settings')||'{}').appearance);}catch{}
 if(!hasLocalAppearance){
   settings.appearance=preferred==='dark'?'dark':preferred==='light'?'light':'system';
   applySettings();
 }
 const backend=$('#backend-version'),version=String(config.version||'').trim();
 if(backend)set(backend,version?'Powered by CF-Server-Monitor '+version:'Powered by CF-Server-Monitor');
 if(state.ready)renderAggregates();
}).catch(()=>{
 set($('#site-title'),injectedSiteTitle);
 document.title=injectedSiteTitle;
});
refresh().then(()=>{
 document.documentElement.classList.add('map-deferred');
 const startMap=()=>{if(all().length)map.focus(region(all()[0].region).code);Promise.resolve(map.init()).finally(()=>document.documentElement.classList.remove('map-deferred'));};
 // Give KPI/node text and the first paint priority. The WebGL globe is decorative
 // context, so it enters after the dashboard is already interactive.
 setTimeout(()=>{if('requestIdleCallback' in window)requestIdleCallback(startMap,{timeout:1600});else startMap();},1100);
});
// WebSocket remains primary. Polling is only a fallback, but 15s keeps a stalled public tab from looking frozen.
const poll=setInterval(()=>{if(!document.hidden)refresh();},15000);
const age=setInterval(()=>{if(document.hidden||!state.ready)return;if(state.status!=='all'||state.quick)renderRows();else for(const s of all())updateRow(s);renderRegions();renderAggregates();},5000);
const watchdog=setInterval(()=>{
 if(document.hidden||state.stopped)return;
 if(state.ws?.readyState===WebSocket.OPEN&&Date.now()-state.lastMessage>45000){state.ws.close();refresh();return;}
 if(!state.ws&&!state.retry)connect();
},5000);
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(state.retry);state.retry=null;clearInterval(state.heartbeat);state.ws?.close();return;}if(!document.hidden){state.lastMessage=Date.now();for(const s of all())updateRow(s);renderRegions();renderAggregates();refresh();if(!state.ws&&!state.retry)connect();}});
addEventListener('pagehide',()=>{state.stopped=true;clearInterval(poll);clearInterval(age);clearInterval(watchdog);clearInterval(state.heartbeat);clearTimeout(state.retry);state.ws?.close();});
addEventListener('pageshow',e=>{if(e.persisted)location.reload();});

const compact=matchMedia('(max-width:800px)');const foldPanels=()=>document.querySelectorAll('.regions-panel,.quality-panel').forEach(el=>el.open=!compact.matches);foldPanels();compact.addEventListener?.('change',foldPanels);

// Non-critical command palette/toast enhancements load after the dashboard is interactive.
const loadEnhancements=()=>import('./enhancements.js?v=0.5.15').catch(()=>{});
if('requestIdleCallback' in window)requestIdleCallback(loadEnhancements,{timeout:2200});else setTimeout(loadEnhancements,900);

