import {validate} from '../shared/core';
export const KEY='satresq-pro-queue-v2';
export function read(){const raw=localStorage.getItem(KEY);if(!raw)return [];const rows=JSON.parse(raw);if(!Array.isArray(rows))throw new Error('Saved queue is unreadable. Export browser data before resetting.');for(const x of rows)validate(x.report);return rows;}
export function edit(fn){const next=fn(read());localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new Event('queue-change'));return next;}
export function update(id,fn){return edit(rows=>rows.map(r=>r.report.id===id?fn(r):r));}
export function add(report){const r=validate(report);return edit(rows=>{if(rows.some(x=>x.report.id===r.id))throw new Error('That report is already in your queue.');if(rows.length>=50)throw new Error('Queue full. Export and remove old local reports first.');return [{report:r,state:'draft',attempts:0,nextTry:0,events:[{at:new Date().toISOString(),text:'Saved on this device'}]},...rows];});}
export function event(row,text){return {...row,events:[...(row.events||[]),{at:new Date().toISOString(),text}].slice(-40)};}
export function download(name,data){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
