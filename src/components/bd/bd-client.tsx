'use client';

import { Handshake } from 'lucide-react';

interface BdClientProps {
  initialCompanies: unknown[];
  initialDocuments: unknown[];
  initialRequests: unknown[];
  initialArchiveEntries: unknown[];
  totalDocs: number;
  totalRequests: number;
  canManage: boolean;
}

export function BdClient({ initialCompanies, totalDocs, totalRequests }: BdClientProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-sky-600 via-sky-500 to-blue-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Handshake className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold">Business Development</h1>
            </div>
            <p className="text-sky-100 text-sm">Manage companies, registration status, requirements, and all related documents &amp; requests.</p>
          </div>
        </div>

        {/* KPI Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-slate-50 to-white border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">Total Companies</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">{initialCompanies.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">All time</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Registered</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {(initialCompanies as Array<{ registrationStatus: string }>).filter(c => c.registrationStatus === 'REGISTERED').length}
            </p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">In Progress</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {(initialCompanies as Array<{ registrationStatus: string }>).filter(c => c.registrationStatus === 'IN_PROGRESS').length}
            </p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-rose-50 to-white border-rose-200 p-4 shadow-sm">
            <p className="text-xs text-rose-600 font-medium uppercase tracking-wide">Not Started</p>
            <p className="text-2xl font-bold text-rose-700 mt-1">
              {(initialCompanies as Array<{ registrationStatus: string }>).filter(c => c.registrationStatus === 'NOT_STARTED').length}
            </p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-slate-50 to-white border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">Documents</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">{totalDocs}</p>
            <p className="text-xs text-slate-500 mt-0.5">{totalRequests} requests</p>
          </div>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm p-8 text-center text-slate-400">
          <Handshake className="h-12 w-12 mx-auto mb-3 text-sky-300" />
          <p className="font-medium text-slate-600">Business Development module is being set up</p>
          <p className="text-sm mt-1">Full company table, documents, requests, and archive panels coming shortly.</p>
        </div>
      </div>
    </div>
  );
}
