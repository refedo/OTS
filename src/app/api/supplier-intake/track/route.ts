
import {NextRequest,NextResponse} from 'next/server';
import prisma from '@/lib/db';
import {authorizedGateway,documentsFromJson,getFormString,intakeEnabled,newOtp,otpHash,publicSupplierSnapshot,removeSupplierDocuments,saveSupplierDocuments,sendSupplierMail,verifyOtpHash} from '@/lib/services/supply-chain/supplier-intake.service';
export const runtime='nodejs';export const dynamic='force-dynamic';
const noCache={'Cache-Control':'no-store'};
const invalid=()=>NextResponse.json({error:'Verification code is invalid or expired.'},{status:401,headers:noCache});
const generic=()=>NextResponse.json({ok:true,message:'If an application matches, a verification code will be sent.'},{headers:noCache});
export async function POST(req:NextRequest){
 if(!intakeEnabled())return NextResponse.json({error:'Tracking service unavailable.'},{status:503,headers:noCache});
 if(!authorizedGateway(req.headers.get('x-hexa-supplier-key')))return NextResponse.json({error:'Unauthorized'},{status:401,headers:noCache});
 if(Number(req.headers.get('content-length')||0)>9_000_000)return NextResponse.json({error:'Upload limit exceeded.'},{status:413});
 let data:FormData;try{data=await req.formData();}catch{return NextResponse.json({error:'Invalid request.'},{status:400});}
 const action=getFormString(data,'action');
 const reference=getFormString(data,'reference').trim().toUpperCase().slice(0,40);
 const email=getFormString(data,'email').trim().toLowerCase().slice(0,250);
 if(!/^[A-Z0-9-]{15,40}$/.test(reference)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return NextResponse.json({error:'Invalid reference or email.'},{status:400});
 if(!['request','verify','resubmit'].includes(action))return NextResponse.json({error:'Invalid action.'},{status:400});
 const app=await prisma.scSupplierApplication.findUnique({where:{reference}});
 if(action==='request'){
  if(!app||app.email.toLowerCase()!==email)return generic();
  const now=new Date();const today=now.toISOString().slice(0,10);
  if((app.otpSentAt&&now.getTime()-app.otpSentAt.getTime()<90_000)||(app.otpDay===today&&app.otpDailyCount>=5))return generic();
  const code=newOtp();const hash=otpHash(reference,email,code);
  const updated=await prisma.scSupplierApplication.updateMany({
   where:{id:app.id,otpSentAt:app.otpSentAt,otpDailyCount:app.otpDailyCount},
   data:{otpHash:hash,otpExpiresAt:new Date(now.getTime()+10*60_000),otpAttempts:0,
    otpSentAt:now,otpDay:today,otpDailyCount:app.otpDay===today?{increment:1}:1}
  });
  if(updated.count!==1)return generic();
  try{
   await sendSupplierMail(email,'HEXA Steel® supplier verification code',
    'Your one-time supplier application verification code is '+code+'.\nThis code expires in 10 minutes. Do not share it.');
  }catch{
   await prisma.scSupplierApplication.updateMany({where:{id:app.id,otpHash:hash},
    data:{otpHash:null,otpExpiresAt:null,otpSentAt:null}});
   return NextResponse.json({error:'Unable to send a verification email. Try again later.'},{status:503,headers:noCache});
  }
  return generic();
 }
 if(!app||app.email.toLowerCase()!==email)return invalid();
 const code=getFormString(data,'code');
 const now=new Date();
 if(!app.otpExpiresAt||app.otpExpiresAt<=now||app.otpAttempts>=5||!verifyOtpHash(app.otpHash,reference,email,code)){
  if(app.otpHash&&app.otpAttempts<5)await prisma.scSupplierApplication.updateMany({where:{id:app.id,otpHash:app.otpHash},data:{otpAttempts:{increment:1}}});
  return invalid();
 }
 if(action==='verify')return NextResponse.json({ok:true,application:publicSupplierSnapshot(app)},{headers:noCache});
 if(app.status!=='UPDATE_REQUESTED')return NextResponse.json({error:'No update has been requested.'},{status:409,headers:noCache});
 const response=getFormString(data,'response').trim();
 if(response.length<5||response.length>1800)return NextResponse.json({error:'Please explain the requested update.'},{status:400});
 const previous=documentsFromJson(app.documents);
 if(previous.length>9)return NextResponse.json({error:'Document limit reached; contact Supply Chain.'},{status:400});
 let extra:Awaited<ReturnType<typeof saveSupplierDocuments>>=[];
 try{
  extra=await saveSupplierDocuments(data.getAll('documents'),true);
  const history=Array.isArray(app.reviewHistory)?app.reviewHistory:[];
  const changed=await prisma.scSupplierApplication.updateMany({
   where:{id:app.id,status:'UPDATE_REQUESTED',otpHash:app.otpHash,otpAttempts:{lt:5}},
   data:{status:'SUBMITTED',publicMessage:'Additional information received. Your application is under review.',
    documents:[...previous,...extra],reviewHistory:[...history,{event:'RESUBMITTED',at:now.toISOString(),actor:'APPLICANT',response}],
    otpHash:null,otpExpiresAt:null,otpAttempts:0}
  });
  if(changed.count!==1){await removeSupplierDocuments(extra);return NextResponse.json({error:'The application changed. Refresh and try again.'},{status:409});}
  return NextResponse.json({ok:true,application:{reference,status:'SUBMITTED',publicMessage:'Additional information received. Your application is under review.',updatedAt:now.toISOString()}},{headers:noCache});
 }catch{await removeSupplierDocuments(extra);return NextResponse.json({error:'Unable to save your update.'},{status:503});}
}
