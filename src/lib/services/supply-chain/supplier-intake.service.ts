
import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, realpath, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import prisma from '@/lib/db';

const execFileAsync = promisify(execFile);
export const STATUS = ['SUBMITTED','UNDER_REVIEW','UPDATE_REQUESTED','APPROVED','REJECTED'] as const;
export type SupplierStatus = typeof STATUS[number];

const products = z.array(z.object({
  name:z.string().trim().min(2).max(160),
  origin:z.string().trim().min(2).max(100)
})).max(12);
export const supplierSchema=z.object({
 legalName:z.string().trim().min(2).max(200),
 registrationNumber:z.string().trim().min(2).max(100),
 registrationCountry:z.string().trim().min(2).max(100),
 contactName:z.string().trim().min(2).max(120),
 email:z.string().trim().email().max(250).transform(v=>v.toLowerCase()),
 phone:z.string().trim().min(6).max(35),
 companyWebsite:z.union([z.string().trim().url().max(250),z.literal('')]).optional(),
 supplierType:z.enum(['Manufacturer','Distributor','Authorized Agent','Service Provider','Subcontractor']),
 scope:z.enum(['PRODUCTS','SERVICES','BOTH']),
 category:z.string().trim().max(120).optional(),
 products,
 services:z.string().trim().max(1800).optional(),
 capabilities:z.string().trim().max(1800).optional()
}).superRefine((d,c)=>{
 if(d.scope!=='SERVICES' && (!d.category||d.products.length===0)) c.addIssue({code:'custom',message:'Product category and details are required',path:['products']});
 if(d.scope==='SERVICES' && d.products.length) c.addIssue({code:'custom',message:'Service applications cannot contain products',path:['products']});
 if(d.scope!=='PRODUCTS' && (!d.services||d.services.length<3)) c.addIssue({code:'custom',message:'Services must be described',path:['services']});
});
export type SupplierInput=z.infer<typeof supplierSchema>;
export type SupplierDocument={id:string;storedName:string;name:string;size:number;sha256:string;createdAt:string};

export function intakeEnabled(){
 return process.env.SUPPLIER_INTAKE_ENABLED==='true' &&
 Boolean(process.env.SUPPLIER_INTAKE_API_KEY) &&
 Boolean(process.env.SUPPLIER_OTP_SECRET) &&
 Boolean(process.env.SUPPLIER_DOCUMENT_DIR) &&
 Boolean(process.env.SUPPLIER_CLAMSCAN_PATH);
}
export function authorizedGateway(key:string|null){
 const secret=process.env.SUPPLIER_INTAKE_API_KEY||'';
 if(!intakeEnabled()||!key||key.length!==secret.length)return false;
 return timingSafeEqual(Buffer.from(key),Buffer.from(secret));
}
export function getFormString(data:FormData,key:string){const v=data.get(key);return typeof v==='string'?v:'';}
export function parseSupplierForm(data:FormData) {
 let parsedProducts:unknown=[];
 try{parsedProducts=JSON.parse(getFormString(data,'products')||'[]');}catch{return null;}
 const parsed=supplierSchema.safeParse({
  legalName:getFormString(data,'legalName'),
  registrationNumber:getFormString(data,'registrationNumber'),
  registrationCountry:getFormString(data,'registrationCountry'),
  contactName:getFormString(data,'contactName'),
  email:getFormString(data,'email'),
  phone:getFormString(data,'phone'),
  companyWebsite:getFormString(data,'companyWebsite'),
  supplierType:getFormString(data,'supplierType'),
  scope:getFormString(data,'scope'),
  category:getFormString(data,'category'),
  products:parsedProducts,
  services:getFormString(data,'services'),
  capabilities:getFormString(data,'capabilities')
 });
 return parsed.success?parsed.data:null;
}
export function documentsFromJson(value:unknown):SupplierDocument[]{
 if(!Array.isArray(value))return [];
 return value.filter((v):v is SupplierDocument => v&&typeof v==='object'&&
  typeof v.id==='string'&&/^[a-f0-9-]{36}$/.test(v.id)&&
  typeof v.storedName==='string'&&/^[a-f0-9-]{36}\.pdf$/.test(v.storedName)&&
  typeof v.name==='string'&&typeof v.size==='number');
}
async function privateRoot(){
 const configured=process.env.SUPPLIER_DOCUMENT_DIR;
 if(!configured||!path.isAbsolute(configured))throw Error('Private supplier document directory is not configured');
 await mkdir(configured,{recursive:true,mode:0o700});
 const root=await realpath(configured);
 const publicDir=path.resolve(process.cwd(),'public');
 if(root===publicDir||root.startsWith(publicDir+path.sep)||
  root===process.cwd()||root.startsWith(process.cwd()+path.sep)) throw Error('Supplier document directory must be outside application tree');
 return root;
}
export async function saveSupplierDocuments(items:FormDataEntryValue[],allowEmpty=false){
 const files=items.filter((item):item is File=>typeof item==='object'&&item!==null&&'arrayBuffer' in item);
 if((!allowEmpty&&files.length===0)||files.length>3||items.length!==files.length)
  throw Error('Submit one to three PDF documents');
 const dir=await privateRoot();
 const scanner=process.env.SUPPLIER_CLAMSCAN_PATH;
 if(!scanner||!path.isAbsolute(scanner))throw Error('Malware scanner is not configured');
 const saved:SupplierDocument[]=[];
 try{
  for(const file of files){
   if(file.size<20||file.size>2*1024*1024||file.type!=='application/pdf'||!file.name.toLowerCase().endsWith('.pdf')) throw Error('PDF files only, maximum 2 MB each');
   const bytes=Buffer.from(await file.arrayBuffer());
   if(bytes.length!==file.size||bytes.subarray(0,5).toString('ascii')!=='%PDF-')throw Error('Invalid PDF document');
   const id=randomUUID();const storedName=id+'.pdf';const filepath=path.join(dir,storedName);
   await writeFile(filepath,bytes,{flag:'wx',mode:0o600});
   saved.push({id,storedName,name:path.basename(file.name).replace(/[^a-zA-Z0-9 ()._-]/g,'_').slice(0,120),size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),createdAt:new Date().toISOString()});
   // Scanner failures, timeouts, and detections all fail closed.
   await execFileAsync(scanner,['--no-summary',filepath],{timeout:30000,maxBuffer:128*1024});
  }
  return saved;
 }catch(err){await removeSupplierDocuments(saved);throw err;}
}
export async function removeSupplierDocuments(docs:SupplierDocument[]){
 if(!docs.length)return;
 let root:string;try{root=await privateRoot();}catch{return;}
 await Promise.all(docs.map(d=>unlink(path.join(root,d.storedName)).catch(()=>undefined)));
}
export async function readSupplierDocument(doc:SupplierDocument){
 const root=await privateRoot();return readFile(path.join(root,doc.storedName));
}
export function newSupplierReference(){
 return 'HEX-SUP-'+new Date().getUTCFullYear()+'-'+randomBytes(6).toString('hex').toUpperCase();
}
export function otpHash(reference:string,email:string,code:string){
 const key=process.env.SUPPLIER_OTP_SECRET;
 if(!key||key.length<32)throw Error('OTP signing key requires at least 32 characters');
 return createHmac('sha256',key).update(reference+'\n'+email.toLowerCase()+'\n'+code).digest('hex');
}
export function newOtp(){return String(randomInt(0,1000000)).padStart(6,'0');}
export function verifyOtpHash(expected:string|null,reference:string,email:string,code:string){
 if(!expected||!/^[0-9]{6}$/.test(code))return false;
 return timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(otpHash(reference,email,code),'hex'));
}
export async function sendSupplierMail(to:string,subject:string,text:string){
 const apiKey=process.env.SUPPLIER_MAIL_RESEND_API_KEY;
 const from=process.env.SUPPLIER_MAIL_FROM;
 if(!apiKey||!from)throw Error('Supplier email provider is not configured');
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{
  Authorization:'Bearer '+apiKey,'Content-Type':'application/json'
 },body:JSON.stringify({from,to:[to],subject,text}),signal:AbortSignal.timeout(10000),cache:'no-store'});
 if(!response.ok)throw Error('Supplier email provider failed');
}
export async function alertSupplierInbox(reference:string,company:string){
 const recipient=process.env.SUPPLIER_NOTIFY_EMAIL;
 if(!recipient)return;
 await sendSupplierMail(recipient,'New HEXA Steel® supplier application '+reference,
  'New supplier qualification request\nReference: '+reference+'\nCompany: '+company+'\nReview in OTS™ / Supply Chain / Supplier Applications.');
}
export async function alertSupplierDecision(email:string,reference:string,status:string,message:string|null){
 const text=['Your HEXA Steel® supplier application has been updated.','Reference: '+reference,'Status: '+status.replaceAll('_',' '),message||'','Track your application at https://hexasteel.sa/suppliers/track'].join('\n');
 await sendSupplierMail(email,'Supplier application update '+reference,text);
}
export function publicSupplierSnapshot(app:{reference:string;status:string;publicMessage:string|null;updatedAt:Date}){
 return {reference:app.reference,status:app.status,publicMessage:app.publicMessage,updatedAt:app.updatedAt.toISOString()};
}
export function scopedApprovalDescription(app:{products:unknown;services:string|null;scope:string;capabilities:string|null}){
 const p=Array.isArray(app.products)?app.products:[];const summary=p.map(x=>typeof x==='object'&&x&&'name' in x?String(x.name):'').filter(Boolean);
 return [app.scope==='PRODUCTS'?'Products':app.scope==='BOTH'?'Products and services':'Services',summary.join(', '),app.services||'',app.capabilities||''].filter(Boolean).join(' | ').slice(0,4000);
}
