'use client';

import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Calendar, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  serialNumber: string;
  subject: string;
  content: string;
  startDate: string;
  endDate: string;
  bannerEnabled: boolean;
  targetType: string;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isActive(a: Announcement) {
  const now = Date.now();
  return new Date(a.startDate).getTime() <= now && new Date(a.endDate).getTime() >= now;
}

export function EmployeeAnnouncementsTab() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/announcements');
      const data = await res.json();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch { setAnnouncements([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = announcements.filter(isActive);
  const past = announcements.filter(a => !isActive(a));

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-violet-400" /></div>;
  }

  const renderAnnouncement = (a: Announcement) => {
    const open = expanded.has(a.id);
    const live = isActive(a);
    return (
      <div key={a.id} className={cn('border rounded-xl bg-white overflow-hidden', live ? 'border-violet-200' : 'border-slate-200 opacity-70')}>
        <div
          className="px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50"
          onClick={() => toggle(a.id)}
        >
          <div className={cn('p-1.5 rounded-lg', live ? 'bg-violet-100' : 'bg-slate-100')}>
            <Megaphone className={cn('h-4 w-4', live ? 'text-violet-600' : 'text-slate-400')} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{a.subject}</p>
            <p className="text-xs text-slate-400">{a.serialNumber} · {fmtDate(a.startDate)} – {fmtDate(a.endDate)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {live && <span className="text-xs bg-violet-100 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded-full font-medium">Active</span>}
            {a.bannerEnabled && <span className="text-xs bg-sky-100 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded-full font-medium">Banner</span>}
            {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </div>
        </div>
        {open && (
          <div className="px-5 py-4 border-t bg-slate-50 space-y-2">
            <div className="text-sm text-slate-700 whitespace-pre-wrap">{a.content}</div>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />From {fmtDate(a.startDate)} to {fmtDate(a.endDate)}</span>
              {a.createdBy && <span>By {a.createdBy.name}</span>}
              <span>Audience: {a.targetType === 'ALL' ? 'All Employees' : 'Specific'}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 py-2">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-3">
          <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Active Now</p>
          <p className="text-xl font-bold text-violet-700 mt-1">{active.length}</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-3">
          <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Total</p>
          <p className="text-xl font-bold text-sky-700 mt-1">{announcements.length}</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-slate-50 to-white border-slate-200 p-3">
          <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">Past</p>
          <p className="text-xl font-bold text-slate-700 mt-1">{past.length}</p>
        </div>
      </div>

      {active.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide px-1">Active Announcements</h3>
          {active.map(renderAnnouncement)}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide px-1">Past Announcements</h3>
          {past.map(renderAnnouncement)}
        </div>
      )}

      {announcements.length === 0 && (
        <div className="rounded-2xl border bg-white shadow-sm p-12 text-center">
          <Megaphone className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No announcements found</p>
        </div>
      )}
    </div>
  );
}
