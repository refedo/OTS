
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import prisma from '@/lib/db';
import { checkPermission } from '@/lib/permission-checker';
import { alertSupplierDecision,scopedApprovalDescription,STATUS } from '@/lib/services/supply-chain/supplier-intake.service';
export const dynamic='force-dynamic';
const noCache={'Cache-Control':'no-store'};
const decision=z.object({
 id:z.string().uuid(),action:z.enum(['START_REVIEW','REQUEST_UPDATE','APPROVE','REJECT']),
 publicMessage:z.string().trim().max(1800).optional(),internalNotes:z.string().trim().max(3000).optional()
});
const STAFF_FIELDS={
 id:true,reference:true,legalName:true,registrationNumber:true,registrationCountry:true,
 contactName:true,email:true,phone:true,companyWebsite:true,supplierType:true,scope:true,
 category:true,products:true,services:true,capabilities:true,documents:true,status:true,
 publicMessage:true,internalNotes:true,reviewHistory:true,reviewedById:true,
 approvedSupplierId:true,createdAt:true,updatedAt:true
} as const;
export async function GET(req:NextRequest){
 if(!(await checkPermission('supply_chain.manage')))return NextResponse.json({error:'Forbidden'},{status:403,headers:noCache});
 const p=new URL(req.url).searchParams;
 const status=p.get('status')||'';
 if(status&&!STATUS.includes(status as typeof STATUS[number]))return NextResponse.json({error:'Invalid filter'},{status:400});
 const page=Math.max(1,Math.min(200,Number(p.get('page')||1)||1));
 const query=(p.get('q')||'').slice(0,120).trim();
 const where={...(status?{status}:{}) ,...(query?{OR:[{legalName:{contains:query}},{reference:{contains:query}}]}:{})};
 const [records,total]=await prisma.$transaction([
  prisma.scSupplierApplication.findMany({where,select:STAFF_FIELDS,orderBy:{createdAt:'desc'},take:50,skip:(page-1)*50}),
  prisma.scSupplierApplication.count({where})
 ]);
 return NextResponse.json({records,total,page},{headers:noCache});
}
export async function PATCH(req:NextRequest){
 if(!(await checkPermission('supply_chain.manage')))return NextResponse.json({error:'Forbidden'},{status:403,headers:noCache});
 let raw:unknown;try{raw=await req.json();}catch{return NextResponse.json({error:'Invalid JSON'},{status:400});}
 const p=decision.safeParse(raw);
 if(!p.success)return NextResponse.json({error:'Invalid review decision'},{status:400});
 const {id,action,publicMessage,internalNotes}=p.data;
 if(['REQUEST_UPDATE','REJECT'].includes(action)&&(!publicMessage||publicMessage.length<5))return NextResponse.json({error:'A reason for the supplier is required.'},{status:400});
 const {cookies}=await import('next/headers');
 const {verifySession}=await import('@/lib/jwt');
 const store=await cookies();
 const token=store.get(process.env.COOKIE_NAME||'ots_session')?.value;
 const session=token?verifySession(token):null;
 if(!session)return NextResponse.json({error:'Unauthorized'},{status:401});
 const app=await prisma.scSupplierApplication.findUnique({where:{id}});
 if(!app)return NextResponse.json({error:'Application not found'},{status:404});
 if(['APPROVED','REJECTED'].includes(app.status))return NextResponse.json({error:'This application has been closed.'},{status:409});
 if(app.status==='UPDATE_REQUESTED'&&action!=='REJECT')return NextResponse.json({error:'Await the supplier resubmission before reviewing.'},{status:409});
 if(action==='START_REVIEW'&&app.status!=='SUBMITTED')return NextResponse.json({error:'Only submitted applications can enter review.'},{status:409});
 const newStatus=action==='START_REVIEW'?'UNDER_REVIEW':action==='REQUEST_UPDATE'?'UPDATE_REQUESTED':action==='APPROVE'?'APPROVED':'REJECTED';
 const now=new Date();
 const history=Array.isArray(app.reviewHistory)?app.reviewHistory:[];
 try{
  const result=await prisma.$transaction(async tx=>{
   const change=await tx.scSupplierApplication.updateMany({
    where:{id:app.id,status:app.status,approvedSupplierId:null},
    data:{
     status:newStatus,publicMessage:publicMessage||(
       action==='APPROVE'?'Your supplier application has been approved for the reviewed scope.':
       action==='START_REVIEW'?'Your application is under review.':null),
     internalNotes:internalNotes||app.internalNotes,reviewedById:session.sub,
     reviewHistory:[...history,{event:newStatus,at:now.toISOString(),actor:session.sub,note:internalNotes||null}],
    }
   });
   if(change.count!==1)throw Error('REVIEW_CONFLICT');
   let approvedSupplierId:string|null=null;
   if(action==='APPROVE'){
    // Issued only after an authenticated approval decision. No Dolibarr account is created.
    const created=await tx.scApprovedSupplier.create({data:{
      supplierCode:'SUP-W'+randomBytes(6).toString('hex').toUpperCase(),
      name:app.legalName,category:app.category||'Professional Services',
      scopeOfApproval:scopedApprovalDescription(app),approvalStatus:'APPROVED',
      approvalDate:now,createdById:session.sub
     },select:{id:true}});
    approvedSupplierId=created.id;
    await tx.scSupplierApplication.update({where:{id:app.id},data:{approvedSupplierId}});
   }
   return {status:newStatus,approvedSupplierId};
  });
  // This email is best-effort and non-blocking; status changes are durable even on provider failure.
  void alertSupplierDecision(app.email,app.reference,result.status,publicMessage||null).catch(()=>undefined);
  return NextResponse.json({ok:true,reference:app.reference,...result},{headers:noCache});
 }catch(err){
  if(err instanceof Error&&err.message==='REVIEW_CONFLICT')return NextResponse.json({error:'Another reviewer has already changed this application.'},{status:409});
  return NextResponse.json({error:'Unable to save the review decision.'},{status:503});
 }
}
