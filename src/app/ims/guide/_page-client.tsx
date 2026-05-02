'use client';

import Link from 'next/link';
import {
  ShieldCheck, FileText, GitPullRequest, AlertTriangle,
  Grid3X3, Calendar, BarChart3, CheckCircle2, ArrowRight,
  BookOpen, Layers, RefreshCw, Users, ChevronRight,
  Info, Zap, TrendingDown, ClipboardList,
  AlertOctagon, Siren, HardHat, Workflow,
} from 'lucide-react';

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ num, title, sub, children }: { num: string; title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-4">
        <span className="text-5xl font-black text-slate-200 dark:text-slate-700 leading-none tabular-nums select-none">{num}</span>
        <div>
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{sub}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

// ─── Card step ────────────────────────────────────────────────────────────────

function Step({ icon: Icon, color, title, desc }: { icon: React.ElementType; color: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
      <div className={`p-2 rounded-lg shrink-0 ${color}`}>
        <Icon className="size-4 text-white" />
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

// ─── Flow arrow ───────────────────────────────────────────────────────────────

function Flow({ steps }: { steps: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {steps.map((s, i) => (
        <span key={s} className="flex items-center gap-1">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted border">{s}</span>
          {i < steps.length - 1 && <ChevronRight className="size-3.5 text-muted-foreground" />}
        </span>
      ))}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function Tag({ label, color = 'bg-blue-100 text-blue-700 border-blue-200' }: { label: string; color?: string }) {
  return <span className={`text-xs font-medium px-2 py-0.5 rounded border ${color}`}>{label}</span>;
}

// ─── Main guide ───────────────────────────────────────────────────────────────

export function ImsGuideClient() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-700/20 via-transparent to-transparent" />
        <div className="relative flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm shrink-0">
            <ShieldCheck className="size-8 text-blue-200" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">IMS Quick Guide</h1>
            <p className="text-blue-200 mt-1 text-sm leading-relaxed max-w-xl">
              Integrated Management System covering ISO 9001:2015 (Quality), ISO 14001:2015 (Environment),
              and ISO 45001:2018 (OHS). This guide walks through each module and how to use it day-to-day.
            </p>
            <div className="flex gap-2 mt-4 flex-wrap">
              <Tag label="ISO 9001:2015" color="bg-blue-500/20 text-blue-200 border-blue-500/30" />
              <Tag label="ISO 14001:2015" color="bg-green-500/20 text-green-200 border-green-500/30" />
              <Tag label="ISO 45001:2018" color="bg-orange-500/20 text-orange-200 border-orange-500/30" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/ims', icon: BarChart3, label: 'Dashboard', color: 'bg-blue-500' },
          { href: '/ims/documents', icon: FileText, label: 'Documents', color: 'bg-indigo-500' },
          { href: '/ims/change-requests', icon: GitPullRequest, label: 'Change Requests', color: 'bg-purple-500' },
          { href: '/ims/risks', icon: AlertTriangle, label: 'Risk Register', color: 'bg-red-500' },
          { href: '/ims/clause-matrix', icon: Grid3X3, label: 'Clause Matrix', color: 'bg-teal-500' },
          { href: '/ims/review-calendar', icon: Calendar, label: 'Review Calendar', color: 'bg-orange-500' },
          { href: '/ims/risks/matrix', icon: TrendingDown, label: 'Risk Matrix', color: 'bg-rose-500' },
          { href: '/ims/risks/treatments', icon: ClipboardList, label: 'Treatments', color: 'bg-amber-500' },
          { href: '/ims/safety/incidents', icon: AlertOctagon, label: 'Incidents', color: 'bg-red-600' },
          { href: '/ims/safety/drills', icon: Siren, label: 'Drills', color: 'bg-orange-500' },
          { href: '/ims/safety/toolbox-talks', icon: HardHat, label: 'Toolbox Talks', color: 'bg-yellow-600' },
          { href: '/ims/processes', icon: Workflow, label: 'QMS Processes', color: 'bg-sky-500' },
        ].map(({ href, icon: Icon, label, color }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2.5 p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors group"
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${color}`}>
              <Icon className="size-3.5 text-white" />
            </div>
            <span className="text-xs font-medium group-hover:text-primary transition-colors">{label}</span>
            <ArrowRight className="size-3 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        ))}
      </div>

      {/* 1. Document Control */}
      <Section num="01" title="Document Control" sub="Manage controlled documents with versioning, distribution, and review cycles.">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Document Registry is the central store for all IMS controlled documents. Each document is assigned
            a unique number in the format <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{'<CAT>-<YYYY>-<NNNN>'}</code> (e.g. <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">SOP-2026-0001</code>).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Step icon={FileText} color="bg-indigo-500" title="Create a document" desc="Navigate to Documents → New Document. Fill in title, category, owner, and review cycle." />
            <Step icon={RefreshCw} color="bg-blue-500" title="Version & revise" desc="Open a document → Revisions tab → Add Revision. Each revision has a version number and change type (Major / Minor / Administrative)." />
            <Step icon={Users} color="bg-teal-500" title="Distribute" desc="Issue a controlled distribution from the Distributions tab. Recipients are tracked and must acknowledge receipt." />
            <Step icon={Calendar} color="bg-orange-500" title="Review cycle" desc="The Review Calendar shows upcoming and overdue reviews. Set the review frequency (days) when creating the document." />
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Document Categories</p>
            <div className="flex flex-wrap gap-2">
              {[
                { code: 'QM', name: 'Quality Manual' },
                { code: 'POL', name: 'Policy' },
                { code: 'SOP', name: 'Standard Operating Procedure' },
                { code: 'PLN', name: 'Plan' },
                { code: 'WI', name: 'Work Instruction' },
                { code: 'FRM', name: 'Form' },
                { code: 'EXT', name: 'External Document' },
                { code: 'REC', name: 'Record' },
              ].map(({ code, name }) => (
                <span key={code} className="text-xs border rounded px-2 py-0.5">
                  <span className="font-mono font-bold mr-1">{code}</span>
                  <span className="text-muted-foreground">{name}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Document Status Flow</p>
            <Flow steps={['Draft', 'Under Review', 'Approved', 'Superseded / Obsolete']} />
          </div>
        </div>
      </Section>

      {/* 2. Document Change Requests */}
      <Section num="02" title="Document Change Requests (DCR)" sub="Formally request and track changes to controlled documents.">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Any proposed change to an approved document must go through a Document Change Request. DCRs are auto-numbered
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono mx-1">DCR-YYYY-NNNN</code>
            and route through the <strong>IMS_CHANGE_REQUEST</strong> workflow (Document Controller → Manager).
          </p>

          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">DCR Lifecycle</p>
            <Flow steps={['Submitted', 'Under Review', 'Approved', 'Implemented', 'Withdrawn / Rejected']} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Step icon={GitPullRequest} color="bg-purple-500" title="Submit a DCR" desc="Change Requests → New DCR. Set title, priority, reason, and optionally link a document." />
            <Step icon={CheckCircle2} color="bg-green-500" title="Approve & implement" desc="Approvers review and approve via the workflow. Once implemented, status moves to IMPLEMENTED." />
          </div>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-4 flex gap-3">
            <Info className="size-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              After a DCR is approved, create a new Revision on the linked document to capture the actual version change.
              The DCR is the <em>request</em>; the revision is the <em>record</em>.
            </p>
          </div>
        </div>
      </Section>

      {/* 3. Risk Register */}
      <Section num="03" title="Risk & Opportunity Register" sub="ISO 9001 §6.1 / ISO 14001 §6.1 / ISO 45001 §6.1 — identify, assess, and treat risks.">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Risks and Opportunities are rated on a 5×5 likelihood × severity matrix. The product gives a risk level (1–25)
            mapped to a rating: <strong>LOW</strong> (≤4), <strong>MEDIUM</strong> (≤9), <strong>HIGH</strong> (≤15), <strong>CRITICAL</strong> (&gt;15).
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'LOW', range: '1–4', color: 'bg-green-100 border-green-200 text-green-700' },
              { label: 'MEDIUM', range: '5–9', color: 'bg-yellow-100 border-yellow-200 text-yellow-700' },
              { label: 'HIGH', range: '10–15', color: 'bg-orange-100 border-orange-200 text-orange-700' },
              { label: 'CRITICAL', range: '16–25', color: 'bg-red-100 border-red-200 text-red-700' },
            ].map(({ label, range, color }) => (
              <div key={label} className={`rounded-lg border p-3 text-center ${color}`}>
                <p className="font-bold text-sm">{label}</p>
                <p className="text-xs opacity-70 mt-0.5">Level {range}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Step icon={AlertTriangle} color="bg-red-500" title="Register a risk" desc="Risk Register → New Risk. Set type (Risk / Opportunity), category, owner, and initial L×S assessment." />
            <Step icon={Layers} color="bg-amber-500" title="Add treatments" desc="Open a risk → Treatments tab. Log treatment actions with responsible person, target date, and effectiveness." />
            <Step icon={TrendingDown} color="bg-rose-500" title="Risk Matrix" desc="Visual 5×5 heat map showing all risks by likelihood vs severity. Click a cell to drill down to individual risks." />
            <Step icon={ClipboardList} color="bg-orange-500" title="Treatments Tracker" desc="Cross-register view of all treatment actions — filter by overdue, effectiveness, or standard." />
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Risk Status Flow</p>
            <Flow steps={['Open', 'Under Treatment', 'Treated', 'Accepted', 'Monitoring', 'Closed']} />
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Treatment Strategies</p>
            <div className="flex flex-wrap gap-2">
              {['Mitigate', 'Transfer', 'Accept', 'Eliminate', 'Exploit', 'Share', 'Enhance'].map(s => (
                <span key={s} className="text-xs border rounded px-2 py-0.5 bg-muted">{s}</span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Mitigate / Transfer / Accept / Eliminate apply to Risks. Exploit / Share / Enhance apply to Opportunities.</p>
          </div>
        </div>
      </Section>

      {/* 4. Clause Matrix */}
      <Section num="04" title="Clause Matrix" sub="Map your documents to ISO standard clauses §4–10.">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Clause Matrix shows which documents cover which clauses of ISO 9001, ISO 14001, and ISO 45001.
            Toggle a cell on/off to link a document to a clause. Use the Excel export to produce a coverage report.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Step icon={Grid3X3} color="bg-teal-500" title="Link documents to clauses" desc="Open Clause Matrix, pick the standard tab, click a cell to toggle the document↔clause mapping." />
            <Step icon={Zap} color="bg-cyan-500" title="Excel export" desc="Use the Export button to download a full coverage matrix in XLSX format for audits or management review." />
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 flex gap-3">
            <Info className="size-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Clauses §4–10 for all three standards are pre-seeded. Only APPROVED documents appear in the matrix by default.
            </p>
          </div>
        </div>
      </Section>

      {/* 5. Review Calendar */}
      <Section num="05" title="Review Calendar" sub="Never miss a scheduled document review.">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Review Calendar shows all documents grouped by their upcoming review month. Overdue reviews are
            highlighted in red. The Document Controller is responsible for scheduling and completing reviews.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Step icon={Calendar} color="bg-orange-500" title="View upcoming reviews" desc="Review Calendar groups documents by review month. Filter by standard or department." />
            <Step icon={RefreshCw} color="bg-blue-500" title="Update review date" desc="After completing a review, update the document's lastReviewDate — the next review date is auto-calculated." />
          </div>
        </div>
      </Section>

      {/* 6. Roles & Permissions */}
      <Section num="06" title="Roles & Permissions" sub="Who can do what in the IMS module.">
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                {['Role', 'Permissions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                { role: 'Admin', perms: 'Full access to all IMS functions including delete.' },
                { role: 'CEO', perms: 'View all, approve DCRs and revisions, manage risks.' },
                { role: 'Manager', perms: 'Create/edit documents, approve DCRs, manage risks and treatments.' },
                { role: 'Engineer', perms: 'View all, create risks and treatments, acknowledge distributions.' },
                { role: 'Document Controller', perms: 'Full document CRUD, issue distributions, manage DCR workflow.' },
              ].map(({ role, perms }) => (
                <tr key={role} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{role}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{perms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 7. ISO Standards Reference */}
      <Section num="07" title="ISO Standards Reference" sub="Key clauses covered by this IMS.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              standard: 'ISO 9001:2015',
              badge: 'bg-blue-500',
              focus: 'Quality Management',
              clauses: ['§4 Context', '§5 Leadership', '§6 Planning', '§7 Support', '§8 Operation', '§9 Performance', '§10 Improvement'],
            },
            {
              standard: 'ISO 14001:2015',
              badge: 'bg-green-500',
              focus: 'Environmental Management',
              clauses: ['§4 Context', '§5 Leadership', '§6 Planning', '§7 Support', '§8 Operation', '§9 Performance', '§10 Improvement'],
            },
            {
              standard: 'ISO 45001:2018',
              badge: 'bg-orange-500',
              focus: 'Occupational H&S',
              clauses: ['§4 Context', '§5 Leadership', '§6 Planning', '§7 Support', '§8 Operation', '§9 Performance', '§10 Improvement'],
            },
          ].map(({ standard, badge, focus, clauses }) => (
            <div key={standard} className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${badge}`} />
                <p className="font-semibold text-sm">{standard}</p>
              </div>
              <p className="text-xs text-muted-foreground">{focus}</p>
              <div className="space-y-1">
                {clauses.map(c => (
                  <p key={c} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="size-3 text-green-500 shrink-0" />
                    {c}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 08. Safety & HSE */}
      <Section num="08" title="Safety & HSE" sub="ISO 45001:2018 — Incident management, emergency preparedness, and safety awareness.">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Safety & HSE sub-module covers three mandatory ISO 45001 records. All forms are auto-numbered and stored with soft-delete audit trails.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertOctagon className="size-4 text-red-500" />
                <p className="font-semibold text-sm">Incidents / Near-Miss</p>
                <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-mono">FRM-024</span>
              </div>
              <p className="text-xs text-muted-foreground">ISO 45001 §10.2.1 — Report, investigate, and track corrective actions for workplace incidents and near-misses.</p>
              <p className="text-xs font-mono text-muted-foreground">Auto-number: INC-YYYY-NNNN</p>
            </div>
            <div className="rounded-xl border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Siren className="size-4 text-orange-500" />
                <p className="font-semibold text-sm">Emergency Drills</p>
                <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-mono">FRM-025</span>
              </div>
              <p className="text-xs text-muted-foreground">ISO 45001 §8.8 — Plan and record emergency evacuation drills, first aid exercises, and chemical spill responses.</p>
              <p className="text-xs font-mono text-muted-foreground">Auto-number: DRILL-YYYY-NNNN</p>
            </div>
            <div className="rounded-xl border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <HardHat className="size-4 text-yellow-600" />
                <p className="font-semibold text-sm">Toolbox Talks</p>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-mono">FRM-026</span>
              </div>
              <p className="text-xs text-muted-foreground">ISO 45001 §7.3 — Record short safety briefings conducted on the shop floor. Track topic, attendees, duration, and follow-up actions.</p>
              <p className="text-xs font-mono text-muted-foreground">Auto-number: TBT-YYYY-NNNN</p>
            </div>
          </div>
          <div className="rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 p-4 flex gap-3">
            <Info className="size-4 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-sm text-orange-700 dark:text-orange-300">
              All three pages are under <strong>IMS → Safety & HSE</strong> in the sidebar. Incident records require a severity classification (Low / Medium / High / Critical) and must have corrective and preventive actions documented before closing.
            </p>
          </div>
        </div>
      </Section>

      {/* 09. QMS Process List */}
      <Section num="09" title="QMS Process List" sub="ISO 9001:2015 §4.4 / ISO 14001 §4.4 — Define and manage your quality management system processes.">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The QMS Process List covers both <strong>FRM-002</strong> (Master List of QMS Processes) and <strong>FRM-004</strong> (In-house &amp; Outsourced Processes) in a single register.
            Use the <em>Process Type</em> field to distinguish Core / Support / In-House / Outsourced processes.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Workflow className="size-4 text-sky-500" />
                <p className="font-semibold text-sm">FRM-002 — Master List</p>
              </div>
              <p className="text-xs text-muted-foreground">Defines all QMS processes with owner, inputs, outputs, KPIs, and ISO clause reference. Auto-number: PROC-NNN.</p>
            </div>
            <div className="rounded-xl border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Workflow className="size-4 text-teal-500" />
                <p className="font-semibold text-sm">FRM-004 — Outsourced Processes</p>
              </div>
              <p className="text-xs text-muted-foreground">Filter the QMS Process List by type = OUTSOURCED to view all externally provided processes subject to §8.4 controls.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Footer nav */}
      <div className="flex flex-wrap gap-3 pt-4 border-t">
        <Link href="/ims">
          <button className="flex items-center gap-1.5 text-sm text-primary hover:underline">
            <BookOpen className="size-4" />
            IMS Dashboard
          </button>
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/ims/documents/new">
          <button className="flex items-center gap-1.5 text-sm text-primary hover:underline">
            <FileText className="size-4" />
            Create a Document
          </button>
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/ims/change-requests/new">
          <button className="flex items-center gap-1.5 text-sm text-primary hover:underline">
            <GitPullRequest className="size-4" />
            Submit a DCR
          </button>
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/ims/risks">
          <button className="flex items-center gap-1.5 text-sm text-primary hover:underline">
            <AlertTriangle className="size-4" />
            Risk Register
          </button>
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/ims/safety/incidents">
          <button className="flex items-center gap-1.5 text-sm text-primary hover:underline">
            <AlertOctagon className="size-4" />
            Incidents
          </button>
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/ims/safety/toolbox-talks">
          <button className="flex items-center gap-1.5 text-sm text-primary hover:underline">
            <HardHat className="size-4" />
            Toolbox Talks
          </button>
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/ims/processes">
          <button className="flex items-center gap-1.5 text-sm text-primary hover:underline">
            <Workflow className="size-4" />
            QMS Processes
          </button>
        </Link>
      </div>
    </div>
  );
}
