/**
 * Seed Chart of Accounts from Dolibarr data
 * Run: npx tsx scripts/seed-coa-dolibarr.ts
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

interface CoaEntry {
  account_code: string;
  account_name: string;       // English
  account_name_ar: string;    // Arabic
  parent_code: string | null;
  account_type: string;       // asset, liability, equity, expense, revenue
  account_category: string | null;
}

const GROUP_MAP: Record<string, string> = {
  'Assets': 'asset',
  'Liability': 'liability',
  'Equity': 'equity',
  'Expense': 'expense',
  'Expenses': 'expense',
  'Income': 'revenue',
};

function inferCategory(code: string, type: string, nameEn: string): string | null {
  if (type === 'asset') {
    if (code.startsWith('110')) return 'Fixed Assets';
    if (code.startsWith('1200101') || code.startsWith('12001')) return 'Bank & Cash';
    if (code.startsWith('12002')) return 'Bank & Cash';
    if (code.startsWith('12003')) return 'Accounts Receivable';
    if (code.startsWith('12012')) return 'Inventory';
    if (code.startsWith('1280') || code.startsWith('128')) return 'Other Assets';
    if (code.startsWith('120')) return 'Current Assets';
    return 'Other Assets';
  }
  if (type === 'liability') {
    if (code.startsWith('2104') || code.startsWith('210401') || code.startsWith('210402') || code.startsWith('210403') || code.startsWith('210404') || code.startsWith('210405')) return 'Accounts Payable';
    if (code.startsWith('2102') || code.startsWith('2109')) return 'VAT Payable';
    if (code.startsWith('220')) return 'Long-term Liabilities';
    if (code.startsWith('210')) return 'Current Liabilities';
    return 'Current Liabilities';
  }
  if (type === 'equity') {
    if (code.startsWith('310')) return 'Share Capital';
    if (code.startsWith('330') || code.startsWith('340')) return 'Retained Earnings';
    return 'Current Year Earnings';
  }
  if (type === 'expense') {
    if (code.startsWith('440') || code.startsWith('44')) return 'Cost of Sales';
    if (code.startsWith('420') || code.startsWith('42')) return 'Operating Expenses';
    if (code.startsWith('430') || code.startsWith('43')) return 'Operating Expenses';
    if (code.startsWith('410') || code.startsWith('41')) return 'Administrative Expenses';
    return 'Other Expenses';
  }
  if (type === 'revenue') {
    if (code.startsWith('530') || code.startsWith('53')) return 'Sales Revenue';
    if (code.startsWith('520')) return 'Other Income';
    if (code.startsWith('510')) return 'Sales Revenue';
    return 'Other Income';
  }
  return null;
}

const COA_DATA: CoaEntry[] = [
  // ===== 1 - ASSETS =====
  { account_code: '1', account_name: 'Assets', account_name_ar: 'الأصول', parent_code: null, account_type: 'asset', account_category: null },
  { account_code: '110', account_name: 'Fixed Assets', account_name_ar: 'الأصول الثابتة', parent_code: '1', account_type: 'asset', account_category: 'Fixed Assets' },
  { account_code: '11001', account_name: 'Cars', account_name_ar: 'سيارات', parent_code: '110', account_type: 'asset', account_category: 'Fixed Assets' },
  { account_code: '1100101', account_name: 'Assets - Vehicles', account_name_ar: 'أصول - سيارات', parent_code: '11001', account_type: 'asset', account_category: 'Fixed Assets' },
  { account_code: '11002', account_name: 'Furniture', account_name_ar: 'أثاث ومفروشات', parent_code: '110', account_type: 'asset', account_category: 'Fixed Assets' },
  { account_code: '11003', account_name: 'Machinery and Equipment', account_name_ar: 'آلات ومعدات', parent_code: '110', account_type: 'asset', account_category: 'Fixed Assets' },
  { account_code: '1100301', account_name: 'Cranes', account_name_ar: 'الكرينات', parent_code: '11003', account_type: 'asset', account_category: 'Fixed Assets' },
  { account_code: '1100302', account_name: 'Purchasing Forklift', account_name_ar: 'شراء فوركلفت', parent_code: '11003', account_type: 'asset', account_category: 'Fixed Assets' },
  { account_code: '1100303', account_name: 'Iron Saw', account_name_ar: 'منشار حديد', parent_code: '11003', account_type: 'asset', account_category: 'Fixed Assets' },
  { account_code: '1100304', account_name: 'Welding Machines', account_name_ar: 'مكائن اللحام', parent_code: '11003', account_type: 'asset', account_category: 'Fixed Assets' },
  { account_code: '11004', account_name: 'Computers, Software, Printers and Telephones', account_name_ar: 'أجهزة كمبيوتر وبرامج وطابعات وتليفونات', parent_code: '110', account_type: 'asset', account_category: 'Fixed Assets' },
  { account_code: '11004001', account_name: 'Odoo Software', account_name_ar: 'برنامج Odoo', parent_code: '11004', account_type: 'asset', account_category: 'Fixed Assets' },
  { account_code: '11005', account_name: 'Electrical Devices', account_name_ar: 'أجهزة كهربائية', parent_code: '110', account_type: 'asset', account_category: 'Fixed Assets' },
  { account_code: '11006', account_name: 'Advertisement Boards', account_name_ar: 'لوحات اعلانية', parent_code: '110', account_type: 'asset', account_category: 'Fixed Assets' },
  { account_code: '11007', account_name: 'Tools', account_name_ar: 'العدد والأدوات', parent_code: '110', account_type: 'asset', account_category: 'Fixed Assets' },
  { account_code: '11008', account_name: 'Protective and Safety Devices', account_name_ar: 'معدات الحماية والسلامة', parent_code: '110', account_type: 'asset', account_category: 'Fixed Assets' },
  { account_code: '120', account_name: 'Current Assets', account_name_ar: 'الاصول المتداولة', parent_code: '1', account_type: 'asset', account_category: 'Current Assets' },
  { account_code: '12001', account_name: 'Cash', account_name_ar: 'النقدية', parent_code: '120', account_type: 'asset', account_category: 'Bank & Cash' },
  { account_code: '1200101', account_name: 'Primary Fund', account_name_ar: 'الصندوق الرئيسي', parent_code: '12001', account_type: 'asset', account_category: 'Bank & Cash' },
  { account_code: '12002', account_name: 'Banks', account_name_ar: 'البنوك', parent_code: '120', account_type: 'asset', account_category: 'Bank & Cash' },
  { account_code: '1200201', account_name: 'Alinma Bank', account_name_ar: 'بنك الانماء', parent_code: '12002', account_type: 'asset', account_category: 'Bank & Cash' },
  { account_code: '1200201001', account_name: 'Al Inma Bank SAR 68202607969000', account_name_ar: 'بنك الانماء بالريال 68202607969000', parent_code: '1200201', account_type: 'asset', account_category: 'Bank & Cash' },
  { account_code: '1200201002', account_name: 'Al Inma Bank USD 84 0026 0796 9001', account_name_ar: 'بنك الانماء دولار 84 0026 0796 9001', parent_code: '1200201', account_type: 'asset', account_category: 'Bank & Cash' },
  { account_code: '1200201003', account_name: 'Hexa Steel - Al Inma Bank SAR 68205995362000', account_name_ar: 'Hexa Steel -بنك الانماء بالريال68205995362000', parent_code: '1200201', account_type: 'asset', account_category: 'Bank & Cash' },
  { account_code: '1200201004', account_name: 'Hexa Steel - Al Inma Bank USD 84 0059 9536 2001', account_name_ar: 'Hexa Steel -بنك الانماءUSD 84 0059 9536 2001', parent_code: '1200201', account_type: 'asset', account_category: 'Bank & Cash' },
  { account_code: '1200202', account_name: 'Riyad Bank', account_name_ar: 'بنك الرياض', parent_code: '12002', account_type: 'asset', account_category: 'Bank & Cash' },
  { account_code: '1200202001', account_name: 'Riyad Bank SAR 2000239019940', account_name_ar: 'بنك الرياض بالريال2000239019940', parent_code: '1200202', account_type: 'asset', account_category: 'Bank & Cash' },
  { account_code: '1200202002', account_name: 'Riyad Bank USD 2000239010440', account_name_ar: 'بنك الرياض بالدولار 2000239010440', parent_code: '1200202', account_type: 'asset', account_category: 'Bank & Cash' },
  { account_code: '1200203', account_name: 'STC Pay Bank', account_name_ar: 'بنكSTCPAY', parent_code: '12002', account_type: 'asset', account_category: 'Bank & Cash' },
  { account_code: '1200203001', account_name: 'STC Bank SA483010094000136115683', account_name_ar: 'Stc Bank SA483010094000136115683', parent_code: '1200203', account_type: 'asset', account_category: 'Bank & Cash' },
  { account_code: '1200204', account_name: 'Bank Albilad', account_name_ar: 'بنك البلاد', parent_code: '12002', account_type: 'asset', account_category: 'Bank & Cash' },
  { account_code: '1200204001', account_name: 'Bank Albilad 422137969980008 SAR - Hexa', account_name_ar: 'بنك البلاد ح/ 422137969980008 ريال -اتحاد', parent_code: '1200204', account_type: 'asset', account_category: 'Bank & Cash' },
  { account_code: '12003', account_name: 'Customers', account_name_ar: 'العملاء', parent_code: '120', account_type: 'asset', account_category: 'Accounts Receivable' },
  { account_code: '12003001', account_name: 'Receivables - Local Customers', account_name_ar: 'ذمم عملاء محليون', parent_code: '12003', account_type: 'asset', account_category: 'Accounts Receivable' },
  { account_code: '12004', account_name: 'Covenant', account_name_ar: 'العهد', parent_code: '120', account_type: 'asset', account_category: 'Current Assets' },
  { account_code: '1200401', account_name: 'Temporary Covenant', account_name_ar: 'عهد مؤقتة', parent_code: '12004', account_type: 'asset', account_category: 'Current Assets' },
  { account_code: '12005', account_name: 'Loans', account_name_ar: 'السلف', parent_code: '120', account_type: 'asset', account_category: 'Current Assets' },
  { account_code: '12006', account_name: 'Upfront Expenses', account_name_ar: 'المصاريف المقدمة', parent_code: '120', account_type: 'asset', account_category: 'Current Assets' },
  { account_code: '12007', account_name: 'Miscellaneous Debtors', account_name_ar: 'مدينون متنوعون', parent_code: '120', account_type: 'asset', account_category: 'Current Assets' },
  { account_code: '12008', account_name: 'Preliminary Guarantees', account_name_ar: 'ضمانات ابتدائية', parent_code: '120', account_type: 'asset', account_category: 'Current Assets' },
  { account_code: '12009', account_name: 'Final Guarantees', account_name_ar: 'ضمانات نهائية', parent_code: '120', account_type: 'asset', account_category: 'Current Assets' },
  { account_code: '12009001', account_name: 'Advance Payment Guarantee Letters', account_name_ar: 'خطابات ضمان دفعة مقدمة', parent_code: '12009', account_type: 'asset', account_category: 'Current Assets' },
  { account_code: '12010', account_name: 'Notes Receivable', account_name_ar: 'اوراق قبض', parent_code: '120', account_type: 'asset', account_category: 'Current Assets' },
  { account_code: '12012', account_name: 'Inventory', account_name_ar: 'المخزون', parent_code: '120', account_type: 'asset', account_category: 'Inventory' },
  { account_code: '1201201', account_name: 'Raw Materials Inventory', account_name_ar: 'مخزون المواد الخام', parent_code: '12012', account_type: 'asset', account_category: 'Inventory' },
  { account_code: '1201202', account_name: 'Work-in-Progress Inventory', account_name_ar: 'مخزون تحت الانتاج', parent_code: '12012', account_type: 'asset', account_category: 'Inventory' },
  { account_code: '1201203', account_name: 'Spare Parts Inventory', account_name_ar: 'مخزون قطع الغيار', parent_code: '12012', account_type: 'asset', account_category: 'Inventory' },
  { account_code: '1280', account_name: 'VAT Purchases', account_name_ar: 'ضريبة القيمة المضافة مشتريات', parent_code: '120', account_type: 'asset', account_category: 'Other Assets' },
  { account_code: '128001', account_name: 'VAT Purchases 15%', account_name_ar: 'ضريبة القيمة المضافة مشتريات 15%', parent_code: '1280', account_type: 'asset', account_category: 'Other Assets' },
  { account_code: '128002', account_name: 'VAT Purchases 5%', account_name_ar: 'ضريبة القيمة المضافة مشتريات 5%', parent_code: '1280', account_type: 'asset', account_category: 'Other Assets' },

  // ===== 2 - LIABILITIES =====
  { account_code: '2', account_name: 'Liabilities', account_name_ar: 'الخصوم', parent_code: null, account_type: 'liability', account_category: null },
  { account_code: '210', account_name: 'Current Liabilities', account_name_ar: 'خصوم قصيرة الاجل', parent_code: '2', account_type: 'liability', account_category: 'Current Liabilities' },
  { account_code: '2101', account_name: 'Advance Revenue', account_name_ar: 'الايرادات المقدمة', parent_code: '210', account_type: 'liability', account_category: 'Current Liabilities' },
  { account_code: '2102', account_name: 'VAT Sales', account_name_ar: 'ضريبة القيمة المضافة مبيعات', parent_code: '210', account_type: 'liability', account_category: 'VAT Payable' },
  { account_code: '210201', account_name: 'VAT Sales 15%', account_name_ar: 'ضريبة القيمة المضافة مبيعات 15%', parent_code: '2102', account_type: 'liability', account_category: 'VAT Payable' },
  { account_code: '210202', account_name: 'VAT Sales 5%', account_name_ar: 'ضريبة القيمة المضافة مبيعات 5%', parent_code: '2102', account_type: 'liability', account_category: 'VAT Payable' },
  { account_code: '2103', account_name: 'Accrued Expenses', account_name_ar: 'المصاريف المستحقة', parent_code: '210', account_type: 'liability', account_category: 'Current Liabilities' },
  { account_code: '2104', account_name: 'Contractors & Suppliers', account_name_ar: 'ذمم مورديين', parent_code: '210', account_type: 'liability', account_category: 'Accounts Payable' },
  { account_code: '210401', account_name: 'Accounts Payable - Local Suppliers Materials', account_name_ar: 'ذمم موردين محليون مواد', parent_code: '2104', account_type: 'liability', account_category: 'Accounts Payable' },
  { account_code: '210402', account_name: 'Accounts Payable - Local Suppliers Consumables', account_name_ar: 'ذمم موردين محليون مستهلكات', parent_code: '2104', account_type: 'liability', account_category: 'Accounts Payable' },
  { account_code: '210403', account_name: 'Accounts Payable - Service Suppliers', account_name_ar: 'ذمم موردين خدمات', parent_code: '2104', account_type: 'liability', account_category: 'Accounts Payable' },
  { account_code: '210404', account_name: 'Accounts Payable - Subcontractors', account_name_ar: 'ذمم مقاولي الباطن', parent_code: '2104', account_type: 'liability', account_category: 'Accounts Payable' },
  { account_code: '210405', account_name: 'Accounts Payable - External Suppliers Materials', account_name_ar: 'ذمم موردين خارجيون مواد', parent_code: '2104', account_type: 'liability', account_category: 'Accounts Payable' },
  { account_code: '2105', account_name: 'Third Parties', account_name_ar: 'أطراف ثالثة', parent_code: '210', account_type: 'liability', account_category: 'Current Liabilities' },
  { account_code: '2106', account_name: 'Employee Benefits Payable', account_name_ar: 'استحقاق العاملين', parent_code: '210', account_type: 'liability', account_category: 'Current Liabilities' },
  { account_code: '2107', account_name: 'Miscellaneous Creditors', account_name_ar: 'دائنون متنوعون', parent_code: '210', account_type: 'liability', account_category: 'Current Liabilities' },
  { account_code: '2108', account_name: 'Accumulated Depreciation', account_name_ar: 'مجمع مخصص اهلاك الاصول', parent_code: '210', account_type: 'liability', account_category: 'Current Liabilities' },
  { account_code: '2108001', account_name: 'Accumulated Depreciation - Cars', account_name_ar: 'مجمع استهلاك السيارات', parent_code: '2108', account_type: 'liability', account_category: 'Current Liabilities' },
  { account_code: '2108002', account_name: 'Accumulated Depreciation - Furniture', account_name_ar: 'مجمع استهلاك الاثاث والمفروشات', parent_code: '2108', account_type: 'liability', account_category: 'Current Liabilities' },
  { account_code: '2108003', account_name: 'Accumulated Depreciation - Machinery & Equipment', account_name_ar: 'مجمع استهلاك الآلات والمعدات', parent_code: '2108', account_type: 'liability', account_category: 'Current Liabilities' },
  { account_code: '2108004', account_name: 'Accumulated Depreciation - Electrical & Office Equipment', account_name_ar: 'مجمع استهلاك اجهزة كهربائية ومكتبية', parent_code: '2108', account_type: 'liability', account_category: 'Current Liabilities' },
  { account_code: '2108005', account_name: 'Accumulated Depreciation - Tools', account_name_ar: 'مجمع استهلاك العدد والادوات', parent_code: '2108', account_type: 'liability', account_category: 'Current Liabilities' },
  { account_code: '2109', account_name: 'Paying VAT', account_name_ar: 'تسوية حساب ضريبة القيمة المضافة', parent_code: '210', account_type: 'liability', account_category: 'VAT Payable' },
  { account_code: '220', account_name: 'Long-term Liabilities', account_name_ar: 'خصوم طويلة الأجل', parent_code: '2', account_type: 'liability', account_category: 'Long-term Liabilities' },
  { account_code: '2201', account_name: 'Loans', account_name_ar: 'قروض', parent_code: '220', account_type: 'liability', account_category: 'Long-term Liabilities' },
  { account_code: '2202', account_name: 'Related Party Financing', account_name_ar: 'تمويل من أطراف ذات علاقة', parent_code: '220', account_type: 'liability', account_category: 'Long-term Liabilities' },

  // ===== 3 - EQUITY =====
  { account_code: '3', account_name: 'Equity', account_name_ar: 'حقوق الملكية', parent_code: null, account_type: 'equity', account_category: null },
  { account_code: '310', account_name: 'Share Capital', account_name_ar: 'رأس المال', parent_code: '3', account_type: 'equity', account_category: 'Share Capital' },
  { account_code: '320', account_name: 'Partners Current Account', account_name_ar: 'جاري الشركاء', parent_code: '3', account_type: 'equity', account_category: 'Current Year Earnings' },
  { account_code: '32001', account_name: 'Owners Equity', account_name_ar: 'جاري صاحب الشركة', parent_code: '320', account_type: 'equity', account_category: 'Current Year Earnings' },
  { account_code: '330', account_name: 'Retained Earnings (Losses)', account_name_ar: 'ارباح وخسائر مرحلة', parent_code: '3', account_type: 'equity', account_category: 'Retained Earnings' },
  { account_code: '340', account_name: 'Accumulated Retained Earnings', account_name_ar: 'أرباح وخسائر مبقاة', parent_code: '3', account_type: 'equity', account_category: 'Retained Earnings' },

  // ===== 4 - EXPENSES =====
  { account_code: '4', account_name: 'Expenses', account_name_ar: 'المصاريف', parent_code: null, account_type: 'expense', account_category: null },
  { account_code: '410', account_name: 'General and Administrative Expenses', account_name_ar: 'مصاريف اداريه وعمومية', parent_code: '4', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4101', account_name: 'Rents', account_name_ar: 'ايجارات', parent_code: '410', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '410101', account_name: 'Factories Leasing', account_name_ar: 'ايجار مقرات العمل', parent_code: '4101', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '410102', account_name: 'Employment Housing Rentals', account_name_ar: 'ايجارات سكن العمالة', parent_code: '4101', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '410103', account_name: 'Forklift - Factory', account_name_ar: 'إيجارفوركلفت - المصنع', parent_code: '4101', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4102', account_name: 'Salaries', account_name_ar: 'رواتب وأجور', parent_code: '410', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4103', account_name: 'Allowances', account_name_ar: 'البدلات', parent_code: '410', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '410301', account_name: 'Housing Allowance', account_name_ar: 'بدل السكن', parent_code: '4103', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '410302', account_name: 'Relocation Allowance', account_name_ar: 'بدل الانتقال', parent_code: '4103', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '410303', account_name: 'Vacation Allowance', account_name_ar: 'بدل اجازة سنوية', parent_code: '4103', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '410304', account_name: 'Travel Ticket Allowance', account_name_ar: 'بدل تذاكر السفر', parent_code: '4103', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '410305', account_name: 'Other Allowances', account_name_ar: 'بدلات اخري', parent_code: '4103', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4104', account_name: 'Stationery', account_name_ar: 'قرطاسية وادوات مكتبية', parent_code: '410', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4105', account_name: 'Telephone and Internet', account_name_ar: 'هاتف وانترنت', parent_code: '410', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4106', account_name: 'Hospitality Expenses', account_name_ar: 'مصاريف ضيافة', parent_code: '410', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '410601', account_name: 'Water Cartons', account_name_ar: 'كراتين مياه', parent_code: '4106', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '410602', account_name: 'Tea & Coffee', account_name_ar: 'ضيافة مكتب (شاي وقهوة)', parent_code: '4106', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4107', account_name: 'Governmental Expenses', account_name_ar: 'مصاريف حكومية', parent_code: '410', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '410701', account_name: 'Governmental Expenses - Issuance, Renewal, Exit and Return', account_name_ar: 'مصاريف حكومية اصدار وتجديد وخروج وعودة', parent_code: '4107', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '410702', account_name: 'Governmental Expenses - ZATCA', account_name_ar: 'مصاريف حكومية الهيئة العامة للزكاة والدخل', parent_code: '4107', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '410703', account_name: 'Government Expenses - Social Insurance', account_name_ar: 'مصاريف حكومية التأمينات الاجتماعية', parent_code: '4107', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '410704', account_name: 'Government Expenses - Iqama Renewal', account_name_ar: 'مصاريف حكومية تجديد الاقامات', parent_code: '4107', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '410705', account_name: 'Visa Fees', account_name_ar: 'رسوم التاشيرات', parent_code: '4107', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '410706', account_name: 'Traffic Violations', account_name_ar: 'المخالفات المرورية', parent_code: '4107', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '410707', account_name: 'Ministry of Human Resources Expenses', account_name_ar: 'مصاريف وزارة المواد البشرية', parent_code: '4107', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '410708', account_name: 'Government Approvals Expenses', account_name_ar: 'مصاريف تصديقات حكومية', parent_code: '4107', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '410709', account_name: 'Government Fees - Renewal of Commercial Records', account_name_ar: 'رسوم حكومية - تجديد السجلات التجارية', parent_code: '4107', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '410710', account_name: 'Renew The License Of The Ministry Of Investment', account_name_ar: 'تجديد ترخيص وزارة لاستثمار', parent_code: '4107', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '410711', account_name: 'Renewal Of Municipal License', account_name_ar: 'تجديد ترخيص البلدية', parent_code: '4107', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '410712', account_name: 'Kafalat Transfer Fees', account_name_ar: 'رسوم نقل كفالات', parent_code: '4107', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4108', account_name: 'Electricity Bills Expenses', account_name_ar: 'مصاريف كهرباء', parent_code: '410', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4109', account_name: 'Advertising Expenses', account_name_ar: 'مصاريف دعاية واعلان', parent_code: '410', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4110', account_name: 'Bank Charges', account_name_ar: 'مصاريف رسوم بنكية', parent_code: '410', account_type: 'expense', account_category: 'Financial Expenses' },
  { account_code: '4111', account_name: 'Various General and Administrative Expenses', account_name_ar: 'مصاريف ادارية وعمومية متنوعة', parent_code: '410', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '411101', account_name: 'Software License Renewal Fees', account_name_ar: 'رسوم تجديد تراخيص البرامج', parent_code: '4111', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '411102', account_name: 'Maintenance Expenses of Rented Buildings', account_name_ar: 'مصاريف صيانة مباني مستاجرة من الغير', parent_code: '4111', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '411103', account_name: 'Administrative Requirements', account_name_ar: 'مستلزمات ادارية', parent_code: '4111', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '411104', account_name: 'Renewal of Platform Subscriptions', account_name_ar: 'تجديد اشتراكات المنصات', parent_code: '4111', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '411105', account_name: 'Computer Accessories', account_name_ar: 'مستلزمات كمبيوتر', parent_code: '4111', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '411106', account_name: 'Hotel Accommodation - Administrative', account_name_ar: 'مصاريف اقامة فندية - ادارية', parent_code: '4111', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '411107', account_name: 'ISO Certification and Implementation', account_name_ar: 'شهادة الأيزو والتطبيق', parent_code: '4111', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4112', account_name: 'Medical Insurance Expenses', account_name_ar: 'تأمين طبي', parent_code: '410', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4113', account_name: 'Petroleum Expenses', account_name_ar: 'مصاريف بنزين', parent_code: '410', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4114', account_name: 'Hospital Expense', account_name_ar: 'مصاريف علاج', parent_code: '410', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4115', account_name: 'Bonuses for Employees', account_name_ar: 'مكافأت للموظفين', parent_code: '410', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4116', account_name: 'Discount Permitted', account_name_ar: 'خصم مسموح به', parent_code: '410', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4117', account_name: 'Audit and Legal Audit Expenses', account_name_ar: 'مصاريف تدقيق حسابات ومراجعة قانونية', parent_code: '410', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4118', account_name: 'End of Service Expenses for Employees', account_name_ar: 'مصاريف نهاية خدمة للموظفين', parent_code: '410', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4119', account_name: 'Fixed Asset Depreciation Expenses', account_name_ar: 'مصروفات أهلاك الاصول الثابتة', parent_code: '410', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4119001', account_name: 'Depreciation - Cars', account_name_ar: 'مصاريف استهلاك السيارات', parent_code: '4119', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4119002', account_name: 'Depreciation - Furniture', account_name_ar: 'مصاريف استهلاك الاثاث والمفروشات', parent_code: '4119', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4119003', account_name: 'Depreciation - Machinery & Equipment', account_name_ar: 'مصاريف استهلاك الالات والمعدات', parent_code: '4119', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4119004', account_name: 'Depreciation - Electrical', account_name_ar: 'مصاريف استهلاك أجهزة كهربائية ومكتبة', parent_code: '4119', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4119005', account_name: 'Depreciation - Tools', account_name_ar: 'مصاريف استهلاك العدد والادوات', parent_code: '4119', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '4120', account_name: 'Professional Ethics - Legal Practice', account_name_ar: 'اتعاب مهنية _ محاماة', parent_code: '4', account_type: 'expense', account_category: 'Administrative Expenses' },
  { account_code: '420', account_name: 'Operating Expenses', account_name_ar: 'المصاريف التتشغيلية', parent_code: '4', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42001', account_name: 'Operational / Salaries and Allowances', account_name_ar: 'تشغيلية /رواتب وبدلات', parent_code: '420', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42002', account_name: 'Operational / Equipment Rental', account_name_ar: 'تشغيلية / ايجار معدات', parent_code: '420', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42003', account_name: 'Operational / Employee Transportation (Taxi)', account_name_ar: 'تشغيلية / مواصلات موظفين (تكسي)', parent_code: '420', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42004', account_name: 'Operational / Food', account_name_ar: 'تشغيلية / طعام', parent_code: '420', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42005', account_name: 'Operational / Telephone and Internet', account_name_ar: 'تشغيلية / هاتف وانترنت', parent_code: '420', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42006', account_name: 'Operational / Water', account_name_ar: 'تشغلية / وايت مياة', parent_code: '420', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42007', account_name: 'Operational / Electrical Materials', account_name_ar: 'تشغيلية / مواد كهرباء', parent_code: '420', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42009', account_name: 'Operational / Treatment & Labor Medicine', account_name_ar: 'تشغيلية / علاج وادوية عمالة', parent_code: '420', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42010', account_name: 'Operational / Welding Materials', account_name_ar: 'تشغيلية / مواد مكن اللحام', parent_code: '420', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42011', account_name: 'Operational / Equipment Maintenance', account_name_ar: 'تشغيلية / اعمال صيانة معدات', parent_code: '420', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42012', account_name: 'Operational / Electricity', account_name_ar: 'تشغيلية / كهرباء', parent_code: '420', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42013', account_name: 'Operational / Miscellaneous Expenses', account_name_ar: 'تشغيلية / مصروفات متنوعة', parent_code: '420', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42014', account_name: 'Operational / Depreciation of Fixed Assets', account_name_ar: 'تشغيلية / اهلاك الأصول الثابتة', parent_code: '420', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42015', account_name: 'Operational / Travel Tickets', account_name_ar: 'تشغيلية /تذاكر سفر', parent_code: '420', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42016', account_name: 'OPEX - Cars', account_name_ar: 'مصاريف تشغلية / سيارات', parent_code: '420', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '4201601', account_name: 'OPEX - Cars Maintenance', account_name_ar: 'تشغيلية / صيانة سيارات', parent_code: '42016', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '4201602', account_name: 'OPEX - Cars Registration', account_name_ar: 'تشغيلية / رسوم التسجيل', parent_code: '42016', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '4201603', account_name: 'OPEX - Cars Insurance', account_name_ar: 'تشغيلية / تأمين السيارات', parent_code: '42016', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '4201604', account_name: 'OPEX - Car Rental', account_name_ar: 'مصاريف تشغلية / إيجار سيارات', parent_code: '42016', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '4201605', account_name: 'OPEX - Cars Fuel', account_name_ar: 'تشغيلية / بنزين', parent_code: '42016', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '4201606', account_name: 'OPEX - Cars Diesel', account_name_ar: 'تشغيلية / ديزل', parent_code: '42016', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '4201607', account_name: 'Expenses For Renewal Of Car Forms', account_name_ar: 'مصاريف تجديد استمارات السيارات', parent_code: '42016', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42017', account_name: 'Medical Insurance Expenses', account_name_ar: 'مصاريف تامين طبي', parent_code: '420', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42018', account_name: 'Operational / Clothing & Footwear', account_name_ar: 'تشغلية / ملابس واحذية', parent_code: '420', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42019', account_name: 'Spare Parts Of Machinery And Equipment', account_name_ar: 'مصاريف قطع غيار مكائن ومعدات', parent_code: '420', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42019001', account_name: 'Laser Machine Spare Parts Expenses', account_name_ar: 'مصاريف قطع غيار مكائن الليزر', parent_code: '42019', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42019002', account_name: 'Forklift Spare Parts Expenses', account_name_ar: 'مصاريف قطع غيار الفوركلفت', parent_code: '42019', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42019003', account_name: 'Plasma Machine Spare Parts Expenses', account_name_ar: 'مصاريف قطع غيار مكائن البلازما', parent_code: '42019', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42020', account_name: 'Expenses for Hygiene Supplies and Tools', account_name_ar: 'مصاريف مستلزمات وادوات نظاقة', parent_code: '420', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '42021', account_name: 'Drinking Water Expenses for Workers', account_name_ar: 'مصاريف مياة للشرب للعمالة', parent_code: '420', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '430', account_name: 'Marketing Expenses', account_name_ar: 'المصاريف التسويقية', parent_code: '4', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '4300001', account_name: 'Sales Commissions', account_name_ar: 'العمولات التسويقية', parent_code: '430', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '4300002', account_name: 'Sales Mens Commissions', account_name_ar: 'عمولات رجال المبيعات', parent_code: '430', account_type: 'expense', account_category: 'Operating Expenses' },
  { account_code: '440', account_name: 'Cost of Goods Sold (COGS)', account_name_ar: 'تكلفة البضاعة المباعة', parent_code: '4', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '44001', account_name: 'COGS - Products', account_name_ar: 'تكلفة البضاعة المباعة للمنتجات', parent_code: '440', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '4400101', account_name: 'COGS - Raw Material', account_name_ar: 'تكلفة البضاعة المباعة للمنتجات - المواد الخام', parent_code: '44001', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '4400102', account_name: 'COGS - Production Disposables', account_name_ar: 'تكلفة البضاعة المباعة للمنتجات - مستهلكات الإنتاج', parent_code: '44001', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '4400103', account_name: 'COGS - Gases', account_name_ar: 'تكلفة البضاعة المباعة للمنتجات - الغازات', parent_code: '44001', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '4400104', account_name: 'COGS - Bolts & Anchors', account_name_ar: 'تكلفة البضاعة المباعة للمنتجات - البراغي والصواميل', parent_code: '44001', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '4400105', account_name: 'COGS - Paints', account_name_ar: 'تكلفة البضاعة المباعة للمنتجات - مواد دهان', parent_code: '44001', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '4400106', account_name: 'COGS - Finished Product', account_name_ar: 'تكلفة البضاعة المباعة - مواد تامة الصنع', parent_code: '44001', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '4400107', account_name: 'COGS - Customs Clearing', account_name_ar: 'تكلفة البضاعة المباعة - رسوم الجمارك والتخليص', parent_code: '44001', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '4400108', account_name: 'COGS - Consumables Of Welding Machines', account_name_ar: 'تكلفة البضاعة المباعة - مستهلكات مكائن اللحام', parent_code: '44001', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '44002', account_name: 'COGS - Services', account_name_ar: 'تكلفة البضاعة المباعة للخدمات', parent_code: '440', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '4400201', account_name: 'COGS - Hot Dip Galvanization Service', account_name_ar: 'شراء خدمة الجلفنة على الحار', parent_code: '44002', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '4400202x', account_name: 'COGS - Buying Transportation Service', account_name_ar: 'شراء خدمة النقل', parent_code: '44002', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020201', account_name: 'Transportation Service - Dina 4-6m', account_name_ar: 'خدمة النقل - ديانا (من 4-6م)', parent_code: '4400202x', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020202', account_name: 'Transportation Service - Lorry', account_name_ar: 'خدمة النقل - شاحنة', parent_code: '4400202x', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020203', account_name: 'Forklift Rental for Projects', account_name_ar: 'إيجار فوركلفت للمشاريع', parent_code: '4400202x', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020204', account_name: 'Shipping Services (Like Aramex)', account_name_ar: 'خدمات الشحن (مثل ارامكس)', parent_code: '4400202x', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020205', account_name: 'COGS - Cranes Rental', account_name_ar: 'خدمة استئجار الكرينات', parent_code: '4400202x', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020206', account_name: 'COGS - Scaffolding Rental', account_name_ar: 'خدمة استئجار السقالات', parent_code: '4400202x', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020207', account_name: 'Transportation Service - Wanet', account_name_ar: 'خدمة النقل وانيت', parent_code: '4400202x', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020208', account_name: 'Loading Supplies (Timber, Fastening Belts, Others)', account_name_ar: 'مستلزمات التحميل (اخشاب - احزمة تربيط -غيرها', parent_code: '4400202x', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020209', account_name: 'COGS - Equipment Rental Service From Abroad', account_name_ar: 'خدمة ايجار معدات من الخارج', parent_code: '4400202x', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '4400203', account_name: 'COGS - Subcontracting Service', account_name_ar: 'خدمة مقاول الباطن', parent_code: '44002', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020301', account_name: 'COGS Subcon. - Installations', account_name_ar: 'خدمة مقاول الباطن - تركيبات', parent_code: '4400203', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020302', account_name: 'COGS Subcon. - Fabrication/Ton', account_name_ar: 'خدمة مقاول الباطن - تصنيع بالطن', parent_code: '4400203', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020303', account_name: 'COGS Subcon. - Rental Manpower', account_name_ar: 'خدمة مقاول الباطن - عمالة مستأجرة', parent_code: '4400203', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020304', account_name: 'COGS Subcon. - Fabrication w/o Material', account_name_ar: 'خدمة مقاول الباطن - تصنيع خارج المصنع - بدون مواد', parent_code: '4400203', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020305', account_name: 'COGS Subcon. - Fabrication w Material', account_name_ar: 'خدمة مقاول الباطن - تصنيع خارج المصنع - مع مواد', parent_code: '4400203', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020306', account_name: 'COGS - Laser Cutting', account_name_ar: 'مقاول باطن - تصنيع ليزر', parent_code: '4400203', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020307', account_name: 'COGS - Sand Blasting', account_name_ar: 'خدمة ضرب الرمل', parent_code: '4400203', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020308', account_name: 'COGS - Painting Service (Including Powder)', account_name_ar: 'خدمة مقاول الباطن - دهانات - شامل المواد - باودر', parent_code: '4400203', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020309', account_name: 'COGS - Cold Galvanization Service', account_name_ar: 'خدمة الجلفنة على البارد', parent_code: '4400203', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020310', account_name: 'COGS - Screening & Testing Of Materials', account_name_ar: 'خدمة اختبار الفحص والمعانية للمواد', parent_code: '4400203', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020311', account_name: 'COGS - Painting Service (Non Including Paint)', account_name_ar: 'خدمة مقاول الباطن - دهانات - بدون المواد', parent_code: '4400203', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020312', account_name: 'Cadastral Works Service', account_name_ar: 'خدمة اعمال مساحية', parent_code: '4400203', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '4400205', account_name: 'Work Orders Expenses', account_name_ar: 'مصاريف مهمات العمل', parent_code: '44002', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020501', account_name: 'Work Travel Tickets', account_name_ar: 'تذاكر السفر للعمل', parent_code: '4400205', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020502', account_name: 'Accommodation for Work', account_name_ar: 'إقامة فندقية للعمل', parent_code: '4400205', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020503', account_name: 'Car Rental for Works/Projects', account_name_ar: 'إيجار سيارة للعمل', parent_code: '4400205', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020504', account_name: 'Working Dinner', account_name_ar: 'طعام وشراب للعمل/المشاريع', parent_code: '4400205', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '4400206', account_name: 'Design & Detailing Services', account_name_ar: 'خدمة مقاول باطن - التصميم والرسم', parent_code: '44002', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020601', account_name: 'Detailing Services', account_name_ar: 'خدمة مقاول باطن - الرسم', parent_code: '4400206', account_type: 'expense', account_category: 'Cost of Sales' },
  { account_code: '440020602', account_name: 'Design Services', account_name_ar: 'خدمة مقاول باطن - التصميم', parent_code: '4400206', account_type: 'expense', account_category: 'Cost of Sales' },

  // ===== 5 - REVENUES =====
  { account_code: '5', account_name: 'Revenues', account_name_ar: 'الإيرادات', parent_code: null, account_type: 'revenue', account_category: null },
  { account_code: '510', account_name: 'Operating Revenues', account_name_ar: 'إيرادات تشغيلية', parent_code: '5', account_type: 'revenue', account_category: 'Sales Revenue' },
  { account_code: '5101', account_name: 'Operating Contract Revenue', account_name_ar: 'ايراداات عقود التشغيل', parent_code: '510', account_type: 'revenue', account_category: 'Sales Revenue' },
  { account_code: '520', account_name: 'Other Revenues', account_name_ar: 'إيرادات اخري', parent_code: '5', account_type: 'revenue', account_category: 'Other Income' },
  { account_code: '530', account_name: 'Sales Revenue', account_name_ar: 'إيرادات المبيعات', parent_code: '5', account_type: 'revenue', account_category: 'Sales Revenue' },
  { account_code: '53001', account_name: 'Products Sales Revenue', account_name_ar: 'إيرادات مبيعات المنتجات', parent_code: '530', account_type: 'revenue', account_category: 'Sales Revenue' },
  { account_code: '5300101', account_name: 'Products Sales Revenue - Trading', account_name_ar: 'إيرادات مبيعات المنتجات - تجارة', parent_code: '53001', account_type: 'revenue', account_category: 'Sales Revenue' },
  { account_code: '53002', account_name: 'Services Sales Revenue', account_name_ar: 'إيرادات مبيعات الخدمات', parent_code: '530', account_type: 'revenue', account_category: 'Sales Revenue' },
  { account_code: '5300201', account_name: 'Fabrication Service without Material', account_name_ar: 'خدمة تصنيع حديد بدون مواد', parent_code: '53002', account_type: 'revenue', account_category: 'Sales Revenue' },
  { account_code: '5300202', account_name: 'Services Sales Revenue - Laser Cutting', account_name_ar: 'إيرادات مبيعات الخدمات - قص ليزر', parent_code: '53002', account_type: 'revenue', account_category: 'Sales Revenue' },
  { account_code: '53003', account_name: 'Other Income', account_name_ar: 'ايرادات اخري', parent_code: '530', account_type: 'revenue', account_category: 'Other Income' },
  { account_code: '53003001', account_name: 'Income From The Sale Of Fixed Assets', account_name_ar: 'ايراد بيع الاصول الثابتة', parent_code: '53003', account_type: 'revenue', account_category: 'Other Income' },
];

async function main() {
  console.log(`Seeding ${COA_DATA.length} accounts...`);
  let created = 0, updated = 0;

  for (const entry of COA_DATA) {
    const existing: any[] = await prisma.$queryRawUnsafe(
      `SELECT id FROM fin_chart_of_accounts WHERE account_code = ?`, entry.account_code
    );

    if (existing.length > 0) {
      await prisma.$executeRawUnsafe(
        `UPDATE fin_chart_of_accounts SET account_name = ?, account_name_ar = ?, account_type = ?, account_category = ?, parent_code = ? WHERE account_code = ?`,
        entry.account_name, entry.account_name_ar, entry.account_type, entry.account_category, entry.parent_code, entry.account_code
      );
      updated++;
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO fin_chart_of_accounts (account_code, account_name, account_name_ar, account_type, account_category, parent_code, display_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        entry.account_code, entry.account_name, entry.account_name_ar, entry.account_type, entry.account_category, entry.parent_code, 0
      );
      created++;
    }
  }

  console.log(`Done! Created: ${created}, Updated: ${updated}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
