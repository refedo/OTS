
import {NextResponse} from 'next/server';
import prisma from '@/lib/db';
import {checkPermission} from '@/lib/permission-checker';
import {documentsFromJson,readSupplierDocument} from '@/lib/services/supply-chain/supplier-intake.service';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Context={params:Promise<{id:string;fileId:string}>};
export async function GET(_request:Request,{params}:Context){
 if(!(await checkPermission('supply_chain.manage')))return NextResponse.json({error:'Forbidden'},{status:403});
 const {id,fileId}=await params;
 if(!/^[a-f0-9-]{36}$/.test(id)||!/^[a-f0-9-]{36}$/.test(fileId))return NextResponse.json({error:'Invalid document reference'},{status:400});
 const app=await prisma.scSupplierApplication.findUnique({where:{id},select:{documents:true}});
 if(!app)return NextResponse.json({error:'Not found'},{status:404});
 const file=documentsFromJson(app.documents).find(f=>f.id===fileId);
 if(!file)return NextResponse.json({error:'Not found'},{status:404});
 try{
  const content=await readSupplierDocument(file);
  return new NextResponse(new Uint8Array(content),{headers:{
   'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="supplier-document.pdf"',
   'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'
  }});
 }catch{return NextResponse.json({error:'Document unavailable'},{status:503});}
}
