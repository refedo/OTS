'use client';

/**
 * PrintLetterClient — bilingual printable letter
 * Supports Arabic (RTL), English (LTR), and Bilingual display.
 * CSS @media print hides the control bar.
 */

import { useEffect, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { resolveUploadUrl } from '@/lib/utils';

const LETTER_TYPE_LABELS: Record<string, { en: string; ar: string }> = {
  QUESTIONING:           { en: 'Questioning Letter',        ar: 'خطاب مسائلة' },
  ATTENTION:             { en: 'Attention Letter',           ar: 'خطاب لفت نظر' },
  FIRST_WARNING:         { en: 'First Warning',             ar: 'إنذار أول' },
  FINAL_WARNING:         { en: 'Final Warning',             ar: 'إنذار نهائي' },
  NON_RENEWAL_NOTICE:    { en: 'Non-Renewal Notice',        ar: 'إشعار عدم تجديد' },
  DISMISSAL:             { en: 'Dismissal Letter',          ar: 'خطاب فصل' },
  CIRCULATION:           { en: 'Circular',                  ar: 'تعميم' },
  WORK_COMMENCEMENT:     { en: 'Work Commencement',         ar: 'خطاب مباشرة عمل' },
  SALARY_CERTIFICATE:    { en: 'Salary Certificate',        ar: 'شهادة راتب' },
  LEAVE_NOTICE:          { en: 'Leave Notice',              ar: 'إشعار إجازة' },
  RETURN_FROM_LEAVE:     { en: 'Return from Leave',         ar: 'خطاب عودة من إجازة' },
  PROBATION_EVALUATION:  { en: 'Probation Evaluation',      ar: 'تقييم فترة التجربة' },
  PERFORMANCE_APPRAISAL: { en: 'Performance Appraisal',     ar: 'تقييم الأداء' },
  CLEARANCE_FORM:        { en: 'Clearance Form',            ar: 'إخلاء طرف' },
  SALARY_NON_DISCLOSURE: { en: 'Salary Non-Disclosure',     ar: 'إقرار عدم الإفصاح عن الراتب' },
  OTHER:                 { en: 'Letter',                    ar: 'خطاب' },
};

type Letter = {
  id: string;
  letterNumber: string;
  letterType: string;
  classification: string;
  language: string;
  status: string;
  subject: string;
  content: string | null;
  contentEn: string | null;
  issuedAt: Date | string;
  notes: string | null;
  approvedAt: Date | string | null;
  rejectionReason: string | null;
  employee: {
    fullNameEn: string;
    fullNameAr: string | null;
    employmentId: string;
    department: string | null;
    occupation: string | null;
    nationalId: string | null;
    dateOfJoining: Date | string;
  };
  createdBy: { name: string } | null;
  approvedBy: { name: string } | null;
  rejectedBy: { name: string } | null;
};

const fmt = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

// Gregorian calendar in Arabic locale
const fmtAr = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('ar-SA-u-ca-gregory', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

export function PrintLetterClient({ letter }: { letter: Letter }) {
  const [lang, setLang] = useState<'ARABIC' | 'ENGLISH' | 'BILINGUAL'>(
    (letter.language as 'ARABIC' | 'ENGLISH' | 'BILINGUAL') ?? 'ARABIC',
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [ceoSignatureUrl, setCeoSignatureUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.companyLogo) setLogoUrl(resolveUploadUrl(data.companyLogo));
        if (data?.ceoSignatureUrl) setCeoSignatureUrl(resolveUploadUrl(data.ceoSignatureUrl));
      })
      .catch(() => {});
  }, []);

  const typeLabel = LETTER_TYPE_LABELS[letter.letterType] ?? { en: 'Letter', ar: 'خطاب' };
  const isApproved = letter.status === 'APPROVED';

  const showAr = lang === 'ARABIC' || lang === 'BILINGUAL';
  const showEn = lang === 'ENGLISH' || lang === 'BILINGUAL';

  // For bilingual: Arabic body uses content, English body uses contentEn (fallback to content)
  const bodyAr = letter.content;
  const bodyEn = letter.contentEn || letter.content;

  function Letterhead({ dir }: { dir: 'rtl' | 'ltr' }) {
    return (
      <div className="text-center mb-8">
        {logoUrl && (
          <div className="flex justify-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Company Logo" className="h-16 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}
        <div className="text-2xl font-bold text-slate-800 mb-1">
          {dir === 'rtl' ? 'هيكسا ستيل®' : 'Hexa Steel®'}
        </div>
        <div className="text-sm text-slate-500 mb-4">
          {dir === 'rtl' ? 'Hexa Steel®' : 'هيكسا ستيل®'}
        </div>
        <div className="border-t-4 border-b border-slate-800 pt-2 pb-1 mb-1" />
        <div className="h-px bg-slate-300" />
      </div>
    );
  }

  function ApprovalStamp({ dir }: { dir: 'rtl' | 'ltr' }) {
    if (!isApproved) return null;
    return (
      <div className={`mt-10 flex ${dir === 'rtl' ? 'justify-start' : 'justify-end'}`}>
        <div className="relative inline-flex flex-col items-center justify-center w-36 h-36 rounded-full border-4 border-emerald-600 bg-emerald-50 opacity-90 rotate-[-12deg]">
          <div className="text-emerald-700 font-black text-lg tracking-widest uppercase leading-none">
            {dir === 'rtl' ? 'معتمد' : 'APPROVED'}
          </div>
          <div className="mt-1 text-emerald-600 text-xs font-bold">{letter.approvedBy?.name}</div>
          <div className="mt-0.5 text-emerald-500 text-[10px]">
            {dir === 'rtl' ? fmtAr(letter.approvedAt) : fmt(letter.approvedAt)}
          </div>
          <div className="absolute inset-1 rounded-full border-2 border-emerald-400 pointer-events-none" />
        </div>
      </div>
    );
  }

  function CeoSignatureArea({ dir }: { dir: 'rtl' | 'ltr' }) {
    return (
      <div className="mt-12 flex justify-between items-end">
        <div className="text-center">
          <div className="w-48 pt-2">
            {ceoSignatureUrl && isApproved && (
              <div className="mb-1 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ceoSignatureUrl} alt="CEO Signature" className="h-12 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}
            <div className="border-t border-slate-400 pt-2">
              <div className="text-sm text-slate-600">
                {dir === 'rtl' ? 'المدير العام / الرئيس التنفيذي' : 'General Manager / CEO'}
              </div>
            </div>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-slate-400 w-48 pt-2">
            <div className="text-sm text-slate-600">
              {dir === 'rtl' ? 'توقيع الموظف واستلام نسخة' : 'Employee Signature & Copy Received'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print control bar */}
      <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-slate-800 text-white px-6 py-3 flex items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="font-mono text-blue-300 text-sm">{letter.letterNumber}</span>
          <span className="text-slate-400 text-sm">·</span>
          <span className="text-sm text-slate-200 truncate max-w-xs">{letter.subject}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-md overflow-hidden border border-slate-600">
            {(['ARABIC', 'ENGLISH', 'BILINGUAL'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${lang === l ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                {l === 'ARABIC' ? 'Arabic' : l === 'ENGLISH' ? 'English' : 'Bilingual'}
              </button>
            ))}
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </button>
          <button onClick={() => window.close()} className="text-slate-400 hover:text-white p-1.5 rounded transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 20mm 15mm; }
          body { font-family: 'Arial', sans-serif; font-size: 12pt; }
        }
        .letter-body { white-space: pre-wrap; line-height: 1.8; }
      `}</style>

      <div className="print:mt-0 mt-16 bg-white min-h-screen">
        <div className="max-w-[210mm] mx-auto px-8 py-10">

          {/* ── ARABIC VERSION ── */}
          {showAr && (
            <div dir="rtl" className={lang === 'BILINGUAL' ? 'mb-12 pb-10 border-b-2 border-slate-300' : ''}>
              <Letterhead dir="rtl" />

              <div className="flex justify-between items-start mb-8">
                <div className="text-right">
                  <div className="text-lg font-bold text-slate-800 mb-1">{typeLabel.ar}</div>
                  <div className="text-sm text-slate-600">رقم الخطاب: <span className="font-mono font-bold">{letter.letterNumber}</span></div>
                  <div className="text-sm text-slate-600">التصنيف: {letter.classification === 'INTERNAL' ? 'داخلي' : 'خارجي'}</div>
                </div>
                <div className="text-left">
                  <div className="text-sm text-slate-600">التاريخ: {fmtAr(letter.issuedAt)}</div>
                </div>
              </div>

              <div className="border border-slate-300 rounded-lg p-4 mb-8 bg-slate-50">
                <div className="text-sm font-semibold text-slate-700 mb-3 border-b pb-2">بيانات الموظف</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div><span className="text-slate-500">الاسم: </span><span className="font-medium">{letter.employee.fullNameAr ?? letter.employee.fullNameEn}</span></div>
                  <div><span className="text-slate-500">رقم الموظف: </span><span className="font-mono font-medium">{letter.employee.employmentId}</span></div>
                  {letter.employee.nationalId && <div><span className="text-slate-500">رقم الهوية: </span><span className="font-medium">{letter.employee.nationalId}</span></div>}
                  {letter.employee.department && <div><span className="text-slate-500">القسم: </span><span className="font-medium">{letter.employee.department}</span></div>}
                  {letter.employee.occupation && <div><span className="text-slate-500">المسمى الوظيفي: </span><span className="font-medium">{letter.employee.occupation}</span></div>}
                  <div><span className="text-slate-500">تاريخ التعيين: </span><span className="font-medium">{fmtAr(letter.employee.dateOfJoining)}</span></div>
                </div>
              </div>

              <div className="mb-6">
                <span className="font-bold text-slate-800">الموضوع: </span>
                <span className="text-slate-700 font-medium">{letter.subject}</span>
              </div>

              {bodyAr && (
                <div className="letter-body text-slate-800 text-sm leading-8 mb-10 text-justify">{bodyAr}</div>
              )}

              <CeoSignatureArea dir="rtl" />
              <ApprovalStamp dir="rtl" />

              <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-400 flex justify-between">
                <span>أُصدر بواسطة: قسم الموارد البشرية</span>
                <span className="font-mono">{letter.letterNumber}</span>
              </div>
            </div>
          )}

          {lang === 'BILINGUAL' && <div className="print:block hidden" style={{ pageBreakAfter: 'always' }} />}

          {/* ── ENGLISH VERSION ── */}
          {showEn && (
            <div dir="ltr">
              <Letterhead dir="ltr" />

              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="text-lg font-bold text-slate-800 mb-1">{typeLabel.en}</div>
                  <div className="text-sm text-slate-600">Letter No: <span className="font-mono font-bold">{letter.letterNumber}</span></div>
                  <div className="text-sm text-slate-600">Classification: {letter.classification === 'INTERNAL' ? 'Internal' : 'External'}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-600">Date: {fmt(letter.issuedAt)}</div>
                </div>
              </div>

              <div className="border border-slate-300 rounded-lg p-4 mb-8 bg-slate-50">
                <div className="text-sm font-semibold text-slate-700 mb-3 border-b pb-2">Employee Information</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div><span className="text-slate-500">Name: </span><span className="font-medium">{letter.employee.fullNameEn}</span></div>
                  <div><span className="text-slate-500">Employee ID: </span><span className="font-mono font-medium">{letter.employee.employmentId}</span></div>
                  {letter.employee.nationalId && <div><span className="text-slate-500">National ID: </span><span className="font-medium">{letter.employee.nationalId}</span></div>}
                  {letter.employee.department && <div><span className="text-slate-500">Department: </span><span className="font-medium">{letter.employee.department}</span></div>}
                  {letter.employee.occupation && <div><span className="text-slate-500">Position: </span><span className="font-medium">{letter.employee.occupation}</span></div>}
                  <div><span className="text-slate-500">Date of Joining: </span><span className="font-medium">{fmt(letter.employee.dateOfJoining)}</span></div>
                </div>
              </div>

              <div className="mb-6">
                <span className="font-bold text-slate-800">Subject: </span>
                <span className="text-slate-700 font-medium">{letter.subject}</span>
              </div>

              {bodyEn && (
                <div className="letter-body text-slate-800 text-sm leading-8 mb-10 text-justify">{bodyEn}</div>
              )}

              <CeoSignatureArea dir="ltr" />
              <ApprovalStamp dir="ltr" />

              <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-400 flex justify-between">
                <span>Issued by: HR Department</span>
                <span className="font-mono">{letter.letterNumber}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
