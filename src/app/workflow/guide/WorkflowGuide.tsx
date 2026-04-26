'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  GitBranch, Zap, CheckCircle2, ArrowRight, Copy, Check,
  Layers, Users, Clock, ChevronRight, ExternalLink,
  BookOpen, Code2, Puzzle, Shield,
} from 'lucide-react';

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="absolute top-3 right-3 p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── Code block ───────────────────────────────────────────────────────────────

function Code({ children, lang = 'ts' }: { children: string; lang?: string }) {
  return (
    <div className="relative group">
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-t-lg border border-slate-700 border-b-0">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{lang}</span>
      </div>
      <div className="relative bg-slate-900 rounded-b-lg border border-slate-700 overflow-x-auto">
        <CopyButton text={children} />
        <pre className="p-4 pr-12 text-sm font-mono text-slate-300 leading-relaxed whitespace-pre">{children}</pre>
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ num, title, sub }: { num: string; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-4 mb-8">
      <span className="text-5xl font-black text-slate-700/40 leading-none tabular-nums select-none">{num}</span>
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
        <p className="text-slate-400 text-sm mt-1">{sub}</p>
      </div>
    </div>
  );
}

// ─── Pill badge ───────────────────────────────────────────────────────────────

function Pill({ children, color = 'slate' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    sky: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    slate: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };
  return (
    <span className={`inline-flex items-center text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${colors[color]}`}>
      {children}
    </span>
  );
}

// ─── Module card ──────────────────────────────────────────────────────────────

interface ModuleCardProps {
  name: string;
  definitionKey: string;
  entityType: string;
  entityTrigger: string;
  approverNote: string;
  statusGate: string;
  color: string;
  icon: React.ReactNode;
}

function ModuleCard({ name, definitionKey, entityType, entityTrigger, approverNote, statusGate, color, icon }: ModuleCardProps) {
  const [open, setOpen] = useState(false);

  const integrationCode = `// 1. In your module's submit/create API route:
import { workflowService } from '@/lib/services/workflow.service';

// After creating the record:
await workflowService.startWorkflow(
  '${definitionKey}',   // definition key from /workflow/definitions
  '${entityType}',         // entity type string
  ${entityType.toLowerCase()}.id,   // the record's ID
  session.userId,          // who initiated
  undefined,               // siteId (optional)
  {                        // metadata for conditions & amount bands
    amount: ${entityType.toLowerCase()}.amount,
    departmentId: ${entityType.toLowerCase()}.departmentId,
  }
);

// 2. In your detail page, fetch & display the timeline:
const wf = await fetch(
  '/api/workflow/entity/${entityType}/' + id
).then(r => r.json());

// 3. Render:
{wf && <WorkflowTimeline instance={wf} />}

// 4. Gate your action button:
const canDisburse = wf?.status === 'APPROVED';
<Button disabled={!canDisburse}>Disburse Loan</Button>`;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      <button
        className="w-full text-left flex items-center justify-between px-5 py-4 hover:bg-slate-800/50 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
          <div>
            <p className="text-sm font-bold text-white">{name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{approverNote}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded hidden sm:block">{definitionKey}</code>
          <ChevronRight className={`h-4 w-4 text-slate-500 transition-transform ${open ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-800 px-5 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Definition Key</p>
              <code className="text-xs font-mono text-violet-400">{definitionKey}</code>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Entity Type</p>
              <code className="text-xs font-mono text-sky-400">{entityType}</code>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Trigger</p>
              <p className="text-xs text-slate-300">{entityTrigger}</p>
            </div>
          </div>

          <div className="bg-slate-800/30 rounded-xl p-3 flex items-start gap-2.5">
            <Shield className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300">
              <span className="font-semibold text-amber-400">Status gate: </span>
              {statusGate}
            </p>
          </div>

          <Code>{integrationCode}</Code>
        </div>
      )}
    </div>
  );
}

// ─── Resolver example card ────────────────────────────────────────────────────

function ResolverCard({ type, label, example, color }: { type: string; label: string; example: string; color: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Pill color={color}>{type}</Pill>
      </div>
      <p className="text-xs text-slate-400 mb-3">{label}</p>
      <pre className="text-[11px] font-mono text-slate-300 bg-slate-800/60 rounded-lg p-3 overflow-x-auto">{example}</pre>
    </div>
  );
}

// ─── Quick setup guide ────────────────────────────────────────────────────────

function QuickSetupStep({ n, title, detail }: { n: number; title: string; detail: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white text-sm font-bold">
          {n}
        </div>
        {n < 5 && <div className="w-px flex-1 bg-slate-700 mt-2" />}
      </div>
      <div className="pb-6 min-w-0">
        <p className="text-sm font-semibold text-white mb-1">{title}</p>
        <p className="text-xs text-slate-400 leading-relaxed">{detail}</p>
      </div>
    </div>
  );
}

// ─── Main guide ───────────────────────────────────────────────────────────────

export function WorkflowGuide() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      {/* Top nav */}
      <div className="border-b border-slate-800/80 sticky top-0 z-50 backdrop-blur-xl bg-[#0a0a0f]/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <GitBranch className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-semibold tracking-tight">Workflow Engine</span>
            <span className="text-slate-600 text-sm">/</span>
            <span className="text-sm text-slate-400">Integration Guide</span>
          </div>
          <Link
            href="/workflow/definitions"
            className="flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
          >
            Open Admin <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-transparent to-slate-900/0 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 relative">
          <div className="flex items-center gap-2 mb-6">
            <Pill color="violet">v21.0.0</Pill>
            <Pill color="emerald">Stable</Pill>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4 leading-none">
            Connect any module<br />
            <span className="text-violet-400">to the workflow engine</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-2xl">
            The workflow engine is a generic approval backbone. Any module — Loans, Assets,
            QC Documents, HR — can plug in with{' '}
            <span className="text-white font-medium">3 lines of code</span> and get
            multi-step approvals, SLA tracking, and a full audit trail.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10">
            {[
              { icon: <Layers className="h-4 w-4" />, label: 'Definitions', desc: 'One-time setup in the admin UI' },
              { icon: <Zap className="h-4 w-4" />, label: '3-line integration', desc: 'Call startWorkflow() on submit' },
              { icon: <Puzzle className="h-4 w-4" />, label: 'Embed anywhere', desc: 'Drop Timeline + Inbox components' },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 shrink-0">{item.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-20">

        {/* ── 01 Concepts ── */}
        <section>
          <SectionHeader
            num="01"
            title="Three concepts, that's it"
            sub="You only need to understand these before integrating"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: <BookOpen className="h-4 w-4" />,
                color: 'violet',
                title: 'Definition',
                tag: 'WorkflowDefinition',
                desc: 'A template. Created once in the admin UI. Has a unique key like LOAN_APPROVAL and ordered steps. Shared across all loans.',
              },
              {
                icon: <Zap className="h-4 w-4" />,
                color: 'amber',
                title: 'Instance',
                tag: 'WorkflowInstance',
                desc: 'A running flow for one specific loan/asset/document. Created automatically when you call startWorkflow(). Lives alongside the entity.',
              },
              {
                icon: <CheckCircle2 className="h-4 w-4" />,
                color: 'emerald',
                title: 'Decision',
                tag: 'WorkflowApproval',
                desc: 'An approver\'s action (APPROVE / REJECT / DELEGATE) on one step. When enough decisions are collected, the step advances automatically.',
              },
            ].map(c => (
              <div key={c.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className={`inline-flex p-2 rounded-lg mb-4 ${
                  c.color === 'violet' ? 'bg-violet-500/10 text-violet-400' :
                  c.color === 'amber' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {c.icon}
                </div>
                <p className="text-sm font-bold text-white mb-1">{c.title}</p>
                <code className="text-[10px] font-mono text-slate-500">{c.tag}</code>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 02 Quick Setup ── */}
        <section>
          <SectionHeader
            num="02"
            title="Wiring a module in 5 steps"
            sub="Follow this checklist for any new module integration"
          />
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <QuickSetupStep
              n={1}
              title="Create a Definition in the admin UI"
              detail="Go to /workflow/definitions → New Definition. Set a UPPER_SNAKE key (e.g. LOAN_APPROVAL), set Entity Type to match your module (e.g. LOAN), then add steps with your chosen approver resolver."
            />
            <QuickSetupStep
              n={2}
              title="Call startWorkflow() in your submit API route"
              detail="Right after creating/updating the entity record, call workflowService.startWorkflow(key, entityType, entityId, userId, undefined, metadata). The metadata object is used for amount-band conditions — include amount, departmentId, etc."
            />
            <QuickSetupStep
              n={3}
              title="Embed WorkflowTimeline in the detail page"
              detail="Fetch /api/workflow/entity/LOAN/{id} in the detail page and pass the result to <WorkflowTimeline instance={data} />. It shows the full step progression with approver names, decisions, and SLA."
            />
            <QuickSetupStep
              n={4}
              title="Gate action buttons on workflow status"
              detail="Only show 'Disburse' / 'Issue' / 'Activate' when the workflow instance status is 'APPROVED'. Read status from the same entity workflow API call."
            />
            <QuickSetupStep
              n={5}
              title="Embed ApprovalInbox in the relevant dashboard"
              detail="Drop <ApprovalInbox /> into the HR dashboard, Finance dashboard, or any role-specific landing page. It auto-fetches from /api/workflow/my-approvals and shows only the current user's pending steps."
            />
          </div>
        </section>

        {/* ── 03 Approver Resolvers ── */}
        <section>
          <SectionHeader
            num="03"
            title="Choosing the right approver resolver"
            sub="The resolver config is the JSON you paste in the step editor"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResolverCard
              type="ROLE"
              color="violet"
              label="Any active user with this role (HR, Manager, CEO). Good default."
              example={`{
  "type": "ROLE",
  "role": "HR"
}`}
            />
            <ResolverCard
              type="MANAGER_OF_INITIATOR"
              color="sky"
              label="The direct manager (reportsTo) of whoever submitted. No config needed."
              example={`{
  "type": "MANAGER_OF_INITIATOR"
}`}
            />
            <ResolverCard
              type="DEPARTMENT_HEAD"
              color="amber"
              label="The manager of the initiator's department. Resolves automatically."
              example={`{
  "type": "DEPARTMENT_HEAD"
}`}
            />
            <ResolverCard
              type="FIXED_USER"
              color="rose"
              label="Always routes to one specific user (CEO sign-off, CFO, etc.)."
              example={`{
  "type": "FIXED_USER",
  "userId": "abc123-user-id-here"
}`}
            />
            <ResolverCard
              type="PBAC_PERMISSION"
              color="emerald"
              label="All users who hold a specific PBAC permission. Dynamic — updates as roles change."
              example={`{
  "type": "PBAC_PERMISSION",
  "permission": "hr.payroll.approve"
}`}
            />
            <ResolverCard
              type="AMOUNT_BAND"
              color="slate"
              label="Route to different approvers based on a numeric metadata field (e.g. loan amount)."
              example={`{
  "type": "AMOUNT_BAND",
  "field": "amount",
  "bands": [
    { "min": 0, "max": 5000, "role": "HR" },
    { "min": 5001, "max": 50000, "role": "Manager" },
    { "min": 50001, "role": "CEO" }
  ]
}`}
            />
          </div>
        </section>

        {/* ── 04 Module Recipes ── */}
        <section>
          <SectionHeader
            num="04"
            title="Module integration recipes"
            sub="Click any module to see the exact definition config and integration code"
          />
          <div className="space-y-3">
            <ModuleCard
              name="Employee Loan Approval"
              definitionKey="LOAN_APPROVAL"
              entityType="LOAN"
              entityTrigger="When employee submits a loan request (status → PENDING)"
              approverNote="HR reviews → Manager approves → disbursed"
              statusGate="Only allow disbursement when workflow status = APPROVED"
              color="bg-emerald-500/10 text-emerald-400"
              icon={<Users className="h-4 w-4" />}
            />
            <ModuleCard
              name="Asset / Custody Request"
              definitionKey="ASSET_REQUEST_APPROVAL"
              entityType="ASSET_REQUEST"
              entityTrigger="When employee requests an asset or custody advance"
              approverNote="Department head → HR final approval"
              statusGate="Only issue/assign the asset when workflow status = APPROVED"
              color="bg-sky-500/10 text-sky-400"
              icon={<Layers className="h-4 w-4" />}
            />
            <ModuleCard
              name="QC Document Approval (ITP/WPS)"
              definitionKey="QC_DOCUMENT_APPROVAL"
              entityType="QC_DOCUMENT"
              entityTrigger="When QC engineer submits a document for review"
              approverNote="QC Manager → Client approval (optional FIXED_USER step)"
              statusGate="Stamp document APPROVED, lock edits when workflow complete"
              color="bg-amber-500/10 text-amber-400"
              icon={<Shield className="h-4 w-4" />}
            />
            <ModuleCard
              name="Salary Revision Approval"
              definitionKey="SALARY_REVISION_APPROVAL"
              entityType="SALARY_HISTORY"
              entityTrigger="When HR submits a raise/revision record"
              approverNote="HR Manager → CEO final sign-off"
              statusGate="Only activate the new salary in payroll when workflow = APPROVED"
              color="bg-violet-500/10 text-violet-400"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <ModuleCard
              name="IMS Revision Approval"
              definitionKey="IMS_REVISION_APPROVAL"
              entityType="IMS_DOCUMENT"
              entityTrigger="When a controlled document is revised and submitted"
              approverNote="Technical reviewer → Document controller → Management rep"
              statusGate="Promote revision to CURRENT status when workflow = APPROVED"
              color="bg-rose-500/10 text-rose-400"
              icon={<Code2 className="h-4 w-4" />}
            />
          </div>
        </section>

        {/* ── 05 Component API ── */}
        <section>
          <SectionHeader
            num="05"
            title="Reusable component API"
            sub="Drop these anywhere — they handle their own data fetching"
          />
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold text-white">WorkflowTimeline</p>
                <Pill color="violet">@/components/workflow/WorkflowTimeline</Pill>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Vertical step progression. Show in any entity detail page. Pass the API response directly.
              </p>
              <Code lang="tsx">{`import { WorkflowTimeline } from '@/components/workflow/WorkflowTimeline';

// In your detail page (server or client):
const wf = await fetch('/api/workflow/entity/LOAN/' + loanId).then(r => r.json());

// Render — pass the full instance object:
{wf && (
  <WorkflowTimeline
    instance={wf}
    compact={false}   // true = hide approver lists & comments
  />
)}`}</Code>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold text-white">ApprovalInbox</p>
                <Pill color="amber">@/components/workflow/ApprovalInbox</Pill>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Pending approvals for the current user. Drop in dashboards, sidebars, or the dedicated /workflow/my-approvals page.
              </p>
              <Code lang="tsx">{`import { ApprovalInbox } from '@/components/workflow/ApprovalInbox';

// In a dashboard widget:
<div className="rounded-2xl border bg-white p-6">
  <h3 className="text-sm font-semibold mb-4">Pending Approvals</h3>
  <ApprovalInbox
    compact={true}             // hides delegate/comment buttons
    onDecisionMade={() => {
      router.refresh();        // refresh parent data after approval
    }}
  />
</div>`}</Code>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold text-white">REST API — quick reference</p>
                <Pill color="sky">JSON</Pill>
              </div>
              <Code lang="http">{`# Start a workflow
POST /api/workflow/start
{ "key": "LOAN_APPROVAL", "entityType": "LOAN", "entityId": "...", "metadata": { "amount": 25000 } }

# Get status for an entity (use in detail pages)
GET  /api/workflow/entity/LOAN/{entityId}

# Get current user's pending approvals
GET  /api/workflow/my-approvals

# Approve / reject / delegate / comment
POST /api/workflow/instances/{instanceId}/decide
{ "decision": "APPROVE", "comment": "Looks good" }
{ "decision": "REJECT",  "comment": "Insufficient documentation" }
{ "decision": "DELEGATE","delegatedToUserId": "..." }

# Cancel
POST /api/workflow/instances/{instanceId}/cancel
{ "reason": "Employee withdrew the request" }`}</Code>
            </div>
          </div>
        </section>

        {/* ── 06 Conditional Steps ── */}
        <section>
          <SectionHeader
            num="06"
            title="Conditional step skipping"
            sub="Steps can be automatically skipped when metadata conditions aren't met"
          />
          <p className="text-sm text-slate-400 mb-5 leading-relaxed">
            Pass entity metadata in <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded text-xs">startWorkflow()</code>'s last argument.
            Steps whose conditions evaluate to <span className="text-rose-400 font-mono text-xs">false</span> are skipped automatically — no code changes needed per-instance.
          </p>
          <Code>{`// Example: CEO approval only required for loans above SAR 50,000
// In the step editor, set conditions to:
[
  { "field": "amount", "operator": "gt", "value": 50000 }
]

// Supported operators:
// eq  ne  gt  gte  lt  lte  in  nin  contains

// When you start the workflow, pass metadata:
await workflowService.startWorkflow(
  'LOAN_APPROVAL',
  'LOAN',
  loan.id,
  session.userId,
  undefined,
  {
    amount: loan.amount,           // used by "gt" condition
    departmentId: loan.deptId,     // can be used in conditions too
    isUrgent: loan.isUrgent,
  }
);
// → If amount ≤ 50,000: CEO step is SKIPPED automatically
// → If amount > 50,000: CEO step is ACTIVE, waits for decision`}</Code>
        </section>

        {/* ── 07 Reject behaviors ── */}
        <section>
          <SectionHeader
            num="07"
            title="What happens when a step is rejected?"
            sub="Set per-step in the definition editor — controls the rejection flow"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                key: 'RETURN_PREVIOUS',
                color: 'amber',
                title: 'Return to previous',
                desc: 'Reactivates the step just before the rejected one. The previous approver must re-approve. Good for revision cycles.',
              },
              {
                key: 'TERMINATE',
                color: 'rose',
                title: 'Terminate',
                desc: 'Marks the whole instance as REJECTED immediately. No recovery. Use for loan denials or hard rejections.',
              },
              {
                key: 'RESTART',
                color: 'sky',
                title: 'Restart from step 1',
                desc: 'Resets all steps to PENDING and re-evaluates from the beginning. Good for document re-submissions.',
              },
            ].map(b => (
              <div key={b.key} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <Pill color={b.color}>{b.key}</Pill>
                <p className="text-sm font-bold text-white mt-3 mb-2">{b.title}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-900/20 to-slate-900 p-8 text-center">
          <GitBranch className="h-8 w-8 text-violet-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Ready to wire up your first module?</h2>
          <p className="text-slate-400 text-sm mb-6">Create a definition, add your resolver config, then call startWorkflow() in your API.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/workflow/definitions"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
            >
              <GitBranch className="h-4 w-4" /> Open Definitions Admin
            </Link>
            <Link
              href="/workflow/my-approvals"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 text-white text-sm font-semibold transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" /> View My Approvals
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
