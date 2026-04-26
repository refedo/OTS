'use client';

import { CheckCircle } from 'lucide-react';
import { ApprovalInbox } from '@/components/workflow/ApprovalInbox';

export function ApprovalInboxPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-amber-500 via-amber-400 to-orange-500 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <CheckCircle className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold">My Approvals</h1>
            </div>
            <p className="text-amber-100 text-sm">
              All workflow steps waiting for your decision.
            </p>
          </div>
        </div>

        {/* Inbox */}
        <div className="rounded-2xl border bg-white shadow-sm p-6">
          <ApprovalInbox />
        </div>
      </div>
    </div>
  );
}
