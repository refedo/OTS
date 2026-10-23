
import {describe,it,expect,vi,beforeEach} from 'vitest';
vi.mock('@/lib/db',()=>({default:{}}));
import {supplierSchema,authorizedGateway,otpHash,verifyOtpHash,documentsFromJson,newSupplierReference} from './supplier-intake.service';
const example={
 legalName:'International Steel Supply Ltd',registrationNumber:'CR-123456',registrationCountry:'Saudi Arabia',
 contactName:'Sales Representative',email:'SUPPLIER@EXAMPLE.COM',phone:'+966500000000',companyWebsite:'',
 supplierType:'Manufacturer',scope:'PRODUCTS',category:'Structural steel plates & sheets',
 products:[{name:'S355 steel plate',origin:'Saudi Arabia'}],services:'',capabilities:''
};
beforeEach(()=>{
 process.env.SUPPLIER_INTAKE_ENABLED='true';
 process.env.SUPPLIER_INTAKE_API_KEY='a'.repeat(40);
 process.env.SUPPLIER_OTP_SECRET='b'.repeat(40);
 process.env.SUPPLIER_DOCUMENT_DIR='/var/lib/ots-supplier-documents';
 process.env.SUPPLIER_CLAMSCAN_PATH='/usr/bin/clamscan';
 process.env.SUPPLIER_MAIL_RESEND_API_KEY='test-key';
 process.env.SUPPLIER_MAIL_FROM='test@example.com';
 process.env.SUPPLIER_NOTIFY_EMAIL='inbox@example.com';
});
describe('supplier qualification intake',()=>{
 it('normalizes email and requires per-product origin',()=>{
  const v=supplierSchema.safeParse(example);
  expect(v.success).toBe(true);
  if(v.success)expect(v.data.email).toBe('supplier@example.com');
  expect(supplierSchema.safeParse({...example,products:[{name:'Plate',origin:''}]}).success).toBe(false);
 });
 it('accepts specialist services and rejects missing service descriptions',()=>{
  expect(supplierSchema.safeParse({...example,scope:'SERVICES',products:[],category:'',services:'Engineering design and detailing'}).success).toBe(true);
  expect(supplierSchema.safeParse({...example,scope:'SERVICES',products:[],services:''}).success).toBe(false);
 });
 it('never admits unauthenticated or disabled gateways',()=>{
  expect(authorizedGateway('a'.repeat(40))).toBe(true);
  expect(authorizedGateway('a'.repeat(39)+'x')).toBe(false);
  expect(authorizedGateway(null)).toBe(false);
  process.env.SUPPLIER_INTAKE_ENABLED='false';
  expect(authorizedGateway('a'.repeat(40))).toBe(false);
 });
 it('requires a matching reference/email/code without plaintext OTP storage',()=>{
  const hash=otpHash('HEX-SUP-2026-ABC','supplier@example.com','123456');
  expect(hash).toHaveLength(64);
  expect(verifyOtpHash(hash,'HEX-SUP-2026-ABC','supplier@example.com','123456')).toBe(true);
  expect(verifyOtpHash(hash,'HEX-SUP-2026-ABC','other@example.com','123456')).toBe(false);
  expect(verifyOtpHash(hash,'HEX-SUP-2026-ABC','supplier@example.com','123457')).toBe(false);
 });
 it('generates opaque references and rejects malformed private document metadata',()=>{
  expect(newSupplierReference()).toMatch(/^HEX-SUP-\d{4}-[A-F0-9]{12}$/);
  expect(documentsFromJson([{id:'../../etc/passwd',storedName:'bad',name:'a.pdf',size:10}])).toEqual([]);
 });
});
