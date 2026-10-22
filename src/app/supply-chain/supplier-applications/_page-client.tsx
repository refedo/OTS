
'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Doc={id:string;name:string;size:number;createdAt:string};
type Item={
 id:string;reference:string;legalName:string;registrationNumber:string;registrationCountry:string;
 contactName:string;email:string;phone:string;companyWebsite:string|null;supplierType:string;
 scope:string;category:string|null;products:unknown;services:string|null;capabilities:string|null;
 documents:Doc[];status:string;publicMessage:string|null;internalNotes:string|null;
 approvedSupplierId:string|null;createdAt:string;updatedAt:string;reviewHistory:unknown
};
const statuses=['ALL','SUBMITTED','UNDER_REVIEW','UPDATE_REQUESTED','APPROVED','REJECTED'];
const date=(value:string)=>new Date(value).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
export function SupplierApplicationsClient(){
 const [records,setRecords]=useState<Item[]>([]),[selected,setSelected]=useState<string|null>(null);
 const [status,setStatus]=useState('ALL'),[q,setQ]=useState(''),[page,setPage]=useState(1);
 const [total,setTotal]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [publicMessage,setPublicMessage]=useState(''),[internalNotes,setInternalNotes]=useState('');
 const [loading,setLoading]=useState(true);
 async function refresh(){
  setLoading(true);
  try{
   const p=new URLSearchParams({page:String(page),q});
   if(status!=='ALL')p.set('status',status);
   const r=await fetch('/api/supply-chain/supplier-applications?'+p,{cache:'no-store'});
   if(!r.ok)throw Error('Unable to load supplier applications');
   const result=await r.json();
   setRecords(result.records||[]);setTotal(result.total||0);
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to load applications');}finally{setLoading(false);}
 }
 useEffect(()=>{void refresh();},[status,page,q]);
 const app=records.find(a=>a.id===selected)||null;
 useEffect(()=>{setPublicMessage(app?.publicMessage||'');setInternalNotes(app?.internalNotes||'')},[selected,app?.status]);
 async function decide(action:string){
  if(!app)return;
  if(['REQUEST_UPDATE','REJECT'].includes(action)&&publicMessage.trim().length<5){setMessage('Provide a clear reason to the supplier.');return;}
  if(!window.confirm('Confirm '+action.replaceAll('_',' ').toLowerCase()+' for '+app.legalName+'?'))return;
  setBusy(true);setMessage('');
  try{
   const r=await fetch('/api/supply-chain/supplier-applications',{method:'PATCH',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({id:app.id,action,publicMessage,internalNotes})});
   const result=await r.json();if(!r.ok)throw Error(result.error||'Failed to save review');
   setMessage('Review decision saved.');await refresh();
  }catch(e){setMessage(e instanceof Error?e.message:'Review failed');}finally{setBusy(false);}
 }
 return <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
  <div className="mb-7 border-b border-slate-200 pb-6">
   <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-500">Supply Chain · Supplier Qualification</p>
   <h1 className="mt-2 text-3xl font-semibold text-[#2C3E50]">Supplier Applications</h1>
   <p className="mt-2 text-sm text-slate-600">Review external applications before creating an approved supplier. No automatic Dolibarr registration.</p>
   <Link href="/supply-chain/approved-suppliers" className="mt-3 inline-block text-sm underline text-[#2C3E50]">View approved-supplier register</Link>
  </div>
  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
   <section aria-label="Supplier applications" className="rounded border border-slate-200 bg-white p-4">
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="text-xs font-semibold text-slate-700">Filter by status<select aria-label="Filter supplier status" value={status} onChange={e=>{setPage(1);setStatus(e.target.value)}} className="mt-1 w-full border border-slate-300 p-3 text-sm">{statuses.map(s=><option key={s}>{s}</option>)}</select></label>
     <label className="text-xs font-semibold text-slate-700">Company or reference<input aria-label="Search supplier applications" value={q} onChange={e=>{setPage(1);setQ(e.target.value)}} className="mt-1 w-full border border-slate-300 p-3 text-sm"/></label>
    </div>
    <p className="my-3 text-xs text-slate-500">{loading?'Loading…':total+' applications'}</p>
    <div className="space-y-2">
     {records.map(r=><button type="button" key={r.id} onClick={()=>setSelected(r.id)} className={'block w-full border p-4 text-left hover:border-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 '+(selected===r.id?'border-[#2C3E50] bg-slate-50':'border-slate-200')}>
      <span className="block text-sm font-semibold text-[#2C3E50]">{r.legalName}</span><span className="mt-1 block text-xs text-slate-500">{r.reference} · {date(r.createdAt)}</span>
      <span className="mt-2 inline-block bg-slate-100 px-2 py-1 text-xs font-bold tracking-wide text-slate-700">{r.status.replaceAll('_',' ')}</span>
     </button>)}
     {!loading&&records.length===0&&<p className="py-8 text-sm text-slate-500">No supplier applications found.</p>}
    </div>
    <div className="mt-5 flex items-center justify-between gap-3 text-sm"><button type="button" disabled={page===1} onClick={()=>setPage(p=>p-1)} className="border px-3 py-2 disabled:opacity-40">Previous</button><span>Page {page}</span><button type="button" disabled={page*50>=total} onClick={()=>setPage(p=>p+1)} className="border px-3 py-2 disabled:opacity-40">Next</button></div>
   </section>
   <section aria-label="Application review" className="rounded border border-slate-200 bg-white p-5">
    {!app?<p className="text-sm text-slate-500">Select an application to review its registration, scope, documents and qualification decision.</p>:<>
     <h2 className="text-2xl font-semibold text-[#2C3E50]">{app.legalName}</h2><p className="mt-1 text-xs text-slate-500">{app.reference}</p>
     <dl className="my-6 grid grid-cols-1 gap-x-4 gap-y-3 border-y border-slate-200 py-5 text-sm sm:grid-cols-2">
      {([
       ['Company registration',app.registrationNumber],['Registered in',app.registrationCountry],
       ['Contact',app.contactName],['Business email',app.email],['Telephone',app.phone],
       ['Relationship',app.supplierType],['Supply interest',app.scope],['Product category',app.category||'—'],
       ['Professional services',app.services||'—'],['Capabilities',app.capabilities||'—']
      ] as const).map(([label,value])=><div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium text-slate-800">{value}</dd></div>)}
     </dl>
     <h3 className="font-semibold text-[#2C3E50]">Specific products and origin</h3>
     <ul className="mt-2 space-y-1 text-sm text-slate-700">{Array.isArray(app.products)?app.products.map((p:any,i:number)=><li key={i}>{String(p.name||'')} — {String(p.origin||'')}</li>):null}</ul>
     <h3 className="mt-6 font-semibold text-[#2C3E50]">Private qualification documents</h3>
     <ul className="mt-2 space-y-2">{Array.isArray(app.documents)&&app.documents.map(f=><li key={f.id}><a href={'/api/supply-chain/supplier-applications/'+app.id+'/documents/'+f.id} className="text-sm font-medium text-[#2C3E50] underline">{f.name} ({Math.round(f.size/1024)} KB)</a></li>)}</ul>
     {app.approvedSupplierId&&<p className="mt-5 text-sm font-semibold text-[#2C3E50]">Linked to the OTS™ approved-supplier register.</p>}
     {!['APPROVED','REJECTED'].includes(app.status)&&<>
      <div className="mt-8 grid gap-4">
       <label className="text-xs font-semibold text-slate-700">Supplier-visible review message<textarea value={publicMessage} onChange={e=>setPublicMessage(e.target.value)} maxLength={1800} rows={3} className="mt-1 block w-full border border-slate-300 p-3 text-sm"/></label>
       <label className="text-xs font-semibold text-slate-700">Internal Supply Chain notes<textarea value={internalNotes} onChange={e=>setInternalNotes(e.target.value)} maxLength={3000} rows={3} className="mt-1 block w-full border border-slate-300 p-3 text-sm"/></label>
      </div>
      <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold">
       {app.status==='SUBMITTED'&&<button type="button" disabled={busy} onClick={()=>decide('START_REVIEW')} className="border border-[#2C3E50] px-4 py-3 text-[#2C3E50]">Start review</button>}
       {app.status!=='UPDATE_REQUESTED'&&<button type="button" disabled={busy} onClick={()=>decide('REQUEST_UPDATE')} className="border border-slate-400 px-4 py-3">Request update</button>}
       {app.status!=='UPDATE_REQUESTED'&&<button type="button" disabled={busy} onClick={()=>decide('APPROVE')} className="bg-[#2C3E50] px-4 py-3 text-white">Approve supplier</button>}
       <button type="button" disabled={busy} onClick={()=>decide('REJECT')} className="border border-red-700 px-4 py-3 text-red-800">Reject application</button>
      </div>
     </>}
    </>}
   </section>
  </div>
  {message&&<p role="status" className="mt-5 border-l-4 border-[#2C3E50] bg-slate-100 p-3 text-sm text-slate-800">{message}</p>}
 </main>;
}
