
import {NextRequest,NextResponse} from 'next/server';
import prisma from '@/lib/db';
import {alertSupplierInbox,authorizedGateway,documentsFromJson,getFormString,intakeEnabled,newSupplierReference,parseSupplierForm,removeSupplierDocuments,saveSupplierDocuments,sendSupplierMail} from '@/lib/services/supply-chain/supplier-intake.service';
export const runtime='nodejs';export const dynamic='force-dynamic';
const noCache={'Cache-Control':'no-store'};
export async function POST(req:NextRequest){
 if(!intakeEnabled())return NextResponse.json({error:'Supplier intake is not available.'},{status:503,headers:noCache});
 if(!authorizedGateway(req.headers.get('x-hexa-supplier-key')))return NextResponse.json({error:'Unauthorized'},{status:401,headers:noCache});
 if(Number(req.headers.get('content-length')||0)>9_000_000)return NextResponse.json({error:'Attachments exceed the upload limit.'},{status:413});
 let data:FormData;try{data=await req.formData();}catch{return NextResponse.json({error:'Invalid request body.'},{status:400});}
 const input=parseSupplierForm(data);
 if(!input||getFormString(data,'consent')!=='yes')return NextResponse.json({error:'Please complete the required company and supply fields.'},{status:400});
 const documentItems=data.getAll('documents');
 if(documentItems.length<1||documentItems.length>3)return NextResponse.json({error:'Please upload one to three PDF documents.'},{status:400});
 const duplicate=await prisma.scSupplierApplication.findFirst({where:{
  registrationNumber:input.registrationNumber,registrationCountry:input.registrationCountry,
  status:{in:['SUBMITTED','UNDER_REVIEW','UPDATE_REQUESTED','APPROVED']}
 },select:{id:true}});
 if(duplicate)return NextResponse.json({error:'An application with this company registration is already on file. Please contact Supply Chain for support.'},{status:409});
 let documents:Awaited<ReturnType<typeof saveSupplierDocuments>>=[];
 try{
  documents=await saveSupplierDocuments(documentItems);
  const reference=newSupplierReference();
  await prisma.scSupplierApplication.create({data:{
   reference,legalName:input.legalName,registrationNumber:input.registrationNumber,
   registrationCountry:input.registrationCountry,contactName:input.contactName,email:input.email,
   phone:input.phone,companyWebsite:input.companyWebsite||null,supplierType:input.supplierType,
   scope:input.scope,category:input.category||null,products:input.products,
   services:input.services||null,capabilities:input.capabilities||null,documents,reviewHistory:[
    {event:'SUBMITTED',at:new Date().toISOString(),actor:'APPLICANT'}]
  }});
  // Persist first: no applicant ever receives an acknowledgement for an unsaved record.
  await Promise.allSettled([
   alertSupplierInbox(reference,input.legalName),
   sendSupplierMail(input.email,'HEXA Steel® supplier application received',
    'Thank you for applying to become a HEXA Steel® supplier.\nReference: '+reference+'\nTrack your application: https://hexasteel.sa/suppliers/track')
  ]);
  return NextResponse.json({ok:true,reference},{status:201,headers:noCache});
 }catch(err){
  await removeSupplierDocuments(documents);
  // Errors include malware rejection / scanner outage; never return internal details.
  return NextResponse.json({error:'Application could not be saved. Verify your PDF files or try again later.'},{status:503,headers:noCache});
 }
}
