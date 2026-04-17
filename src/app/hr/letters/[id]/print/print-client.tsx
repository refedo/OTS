'use client';

/**
 * PrintLetterClient — bilingual printable letter
 * Supports Arabic (RTL), English (LTR), and Bilingual display.
 * CSS @media print hides the control bar.
 *
 * 19.1.0
 */

import { useState } from 'react';
import { Printer, X } from 'lucide-react';

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

const fmtAr = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('ar-SA', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

export function PrintLetterClient({ letter }: { letter: Letter }) {
  const [lang, setLang] = useState<'ARABIC' | 'ENGLISH' | 'BILINGUAL'>(
    (letter.language as 'ARABIC' | 'ENGLISH' | 'BILINGUAL') ?? 'ARABIC',
  );

  const typeLabel = LETTER_TYPE_LABELS[letter.letterType] ?? { en: 'Letter', ar: 'خطاب' };
  const isApproved = letter.status === 'APPROVED';

  const showAr = lang === 'ARABIC' || lang === 'BILINGUAL';
  const showEn = lang === 'ENGLISH' || lang === 'BILINGUAL';

  return (
    <>
      {/* Print control bar — hidden when printing */}
      <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-slate-800 text-white px-6 py-3 flex items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="font-mono text-blue-300 text-sm">{letter.letterNumber}</span>
          <span className="text-slate-400 text-sm">·</span>
          <span className="text-sm text-slate-200 truncate max-w-xs">{letter.subject}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Language selector */}
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
          <button
            onClick={() => window.close()}
            className="text-slate-400 hover:text-white p-1.5 rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 20mm 15mm; }
          body { font-family: 'Arial', sans-serif; font-size: 12pt; }
        }
        .letter-body { white-space: pre-wrap; line-height: 1.8; }
      `}</style>

      {/* Letter content */}
      <div className="print:mt-0 mt-16 bg-white min-h-screen">
        <div className="max-w-[210mm] mx-auto px-8 py-10">

          {/* ── ARABIC VERSION ── */}
          {showAr && (
            <div dir="rtl" className={lang === 'BILINGUAL' ? 'mb-12 pb-10 border-b-2 border-slate-300' : ''}>
              {/* Letterhead */}
              <div className="text-center mb-8">
                <div className="text-2xl font-bold text-slate-800 mb-1">هيكسا ستيل®</div>
                <div className="text-sm text-slate-500 mb-4">Hexa Steel® — شركة هيكسا للصلب</div>
                <div className="border-t-4 border-b border-slate-800 pt-2 pb-1 mb-1" />
                <div className="h-px bg-slate-300" />
              </div>

              {/* Letter header */}
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

              {/* Employee info box */}
              <div className="border border-slate-300 rounded-lg p-4 mb-8 bg-slate-50">
                <div className="text-sm font-semibold text-slate-700 mb-3 border-b pb-2">بيانات الموظف</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div><span className="text-slate-500">الاسم: </span><span className="font-medium">{letter.employee.fullNameAr ?? letter.employee.fullNameEn}</span></div>
                  <div><span className="text-slate-500">رقم الموظف: </span><span className="font-mono font-medium">{letter.employee.employmentId}</span></div>
                  {letter.employee.nationalId && (
                    <div><span className="text-slate-500">رقم الهوية: </span><span className="font-medium">{letter.employee.nationalId}</span></div>
                  )}
                  {letter.employee.department && (
                    <div><span className="text-slate-500">القسم: </span><span className="font-medium">{letter.employee.department}</span></div>
                  )}
                  {letter.employee.occupation && (
                    <div><span className="text-slate-500">المسمى الوظيفي: </span><span className="font-medium">{letter.employee.occupation}</span></div>
                  )}
                  <div><span className="text-slate-500">تاريخ التعيين: </span><span className="font-medium">{fmtAr(letter.employee.dateOfJoining)}</span></div>
                </div>
              </div>

              {/* Subject */}
              <div className="mb-6">
                <span className="font-bold text-slate-800">الموضوع: </span>
                <span className="text-slate-700 font-medium">{letter.subject}</span>
              </div>

              {/* Body */}
              {letter.content && (
                <div className="letter-body text-slate-800 text-sm leading-8 mb-10 text-justify">
                  {letter.content}
                </div>
              )}

              {/* Signature area */}
              <div className="mt-12 flex justify-between items-end">
                <div className="text-center">
                  <div className="border-t border-slate-400 w-48 pt-2">
                    <div className="text-sm text-slate-600">المدير العام / الرئيس التنفيذي</div>
                    {isApproved && letter.approvedBy && (
                      <div className="text-xs text-emerald-600 font-medium mt-1">✓ {letter.approvedBy.name}</div>
                    )}
                    {isApproved && letter.approvedAt && (
                      <div className="text-xs text-slate-500">{fmtAr(letter.approvedAt)}</div>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t border-slate-400 w-48 pt-2">
                    <div className="text-sm text-slate-600">توقيع الموظف واستلام نسخة</div>
                  </div>
                </div>
              </div>

              {/* Approval stamp */}
              {isApproved && (
                <div className="mt-8 border-2 border-emerald-500 rounded-lg p-3 text-center text-emerald-700 font-bold text-sm bg-emerald-50">
                  ✓ معتمد — {letter.approvedBy?.name} — {fmtAr(letter.approvedAt)}
                </div>
              )}

              {/* Audit footer */}
              <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-400 flex justify-between">
                <span>أُصدر بواسطة: {letter.createdBy?.name}</span>
                <span className="font-mono">{letter.letterNumber}</span>
              </div>
            </div>
          )}

          {/* ── PAGE BREAK between bilingual versions ── */}
          {lang === 'BILINGUAL' && <div className="print:block hidden" style={{ pageBreakAfter: 'always' }} />}

          {/* ── ENGLISH VERSION ── */}
          {showEn && (
            <div dir="ltr">
              {/* Letterhead */}
              <div className="text-center mb-8">
                <div className="text-2xl font-bold text-slate-800 mb-1">Hexa Steel®</div>
                <div className="text-sm text-slate-500 mb-4">هيكسا للصلب — Hexa Steel Company</div>
                <div className="border-t-4 border-b border-slate-800 pt-2 pb-1 mb-1" />
                <div className="h-px bg-slate-300" />
              </div>

              {/* Letter header */}
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

              {/* Employee info box */}
              <div className="border border-slate-300 rounded-lg p-4 mb-8 bg-slate-50">
                <div className="text-sm font-semibold text-slate-700 mb-3 border-b pb-2">Employee Information</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div><span className="text-slate-500">Name: </span><span className="font-medium">{letter.employee.fullNameEn}</span></div>
                  <div><span className="text-slate-500">Employee ID: </span><span className="font-mono font-medium">{letter.employee.employmentId}</span></div>
                  {letter.employee.nationalId && (
                    <div><span className="text-slate-500">National ID: </span><span className="font-medium">{letter.employee.nationalId}</span></div>
                  )}
                  {letter.employee.department && (
                    <div><span className="text-slate-500">Department: </span><span className="font-medium">{letter.employee.department}</span></div>
                  )}
                  {letter.employee.occupation && (
                    <div><span className="text-slate-500">Position: </span><span className="font-medium">{letter.employee.occupation}</span></div>
                  )}
                  <div><span className="text-slate-500">Date of Joining: </span><span className="font-medium">{fmt(letter.employee.dateOfJoining)}</span></div>
                </div>
              </div>

              {/* Subject */}
              <div className="mb-6">
                <span className="font-bold text-slate-800">Subject: </span>
                <span className="text-slate-700 font-medium">{letter.subject}</span>
              </div>

              {/* Body */}
              {letter.content && (
                <div className="letter-body text-slate-800 text-sm leading-8 mb-10 text-justify">
                  {letter.content}
                </div>
              )}

              {/* Signature area */}
              <div className="mt-12 flex justify-between items-end">
                <div className="text-center">
                  <div className="border-t border-slate-400 w-48 pt-2">
                    <div className="text-sm text-slate-600">General Manager / CEO</div>
                    {isApproved && letter.approvedBy && (
                      <div className="text-xs text-emerald-600 font-medium mt-1">✓ {letter.approvedBy.name}</div>
                    )}
                    {isApproved && letter.approvedAt && (
                      <div className="text-xs text-slate-500">{fmt(letter.approvedAt)}</div>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t border-slate-400 w-48 pt-2">
                    <div className="text-sm text-slate-600">Employee Signature & Copy Received</div>
                  </div>
                </div>
              </div>

              {/* Approval stamp */}
              {isApproved && (
                <div className="mt-8 border-2 border-emerald-500 rounded-lg p-3 text-center text-emerald-700 font-bold text-sm bg-emerald-50">
                  ✓ Approved — {letter.approvedBy?.name} — {fmt(letter.approvedAt)}
                </div>
              )}

              {/* Audit footer */}
              <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-400 flex justify-between">
                <span>Issued by: {letter.createdBy?.name}</span>
                <span className="font-mono">{letter.letterNumber}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
