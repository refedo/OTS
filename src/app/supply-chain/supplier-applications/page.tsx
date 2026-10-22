
import type {Metadata} from 'next';
import {checkPermission} from '@/lib/permission-checker';
import {redirect} from 'next/navigation';
import {SupplierApplicationsClient} from './_page-client';
export const metadata:Metadata={title:'Supplier Applications | OTS™ | HEXA Steel®'};
export const dynamic='force-dynamic';
export default async function SupplierApplicationsPage(){
 if(!(await checkPermission('supply_chain.manage')))redirect('/unauthorized');
 return <SupplierApplicationsClient/>;
}
