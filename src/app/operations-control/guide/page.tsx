'use client';

import { 
  BookOpen, 
  AlertTriangle, 
  Clock, 
  Zap, 
  Link2, 
  Gauge,
  CheckCircle,
  ArrowRight,
  ListChecks,
  Network,
  Bot,
  RefreshCw,
  FileText,
  Wrench,
  ClipboardCheck,
  Package,
  PenTool,
  Brain,
  Activity,
  TrendingUp,
  Users,
  Factory,
  Layers
} from 'lucide-react';
import Link from 'next/link';

export default function OperationsControlGuidePage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Operations Control Quick Guide</h1>
            <p className="text-gray-500">Learn how the predictive operations system works</p>
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          What is Operations Control?
        </h2>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
          <p className="text-gray-700 mb-4">
            Operations Control is a <strong>predictive early warning system</strong> that automatically monitors 
            all work in your MRP and alerts you to potential problems before they become critical.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-2xl font-bold text-blue-600 mb-1">Automatic</div>
              <p className="text-sm text-gray-600">Work is tracked automatically when you create Tasks, WorkOrders, RFIs, or Documents</p>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-2xl font-bold text-orange-600 mb-1">Predictive</div>
              <p className="text-sm text-gray-600">Risks are detected before they become problems using the Early Warning Engine</p>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-2xl font-bold text-green-600 mb-1">Self-Healing</div>
              <p className="text-sm text-gray-600">Risks automatically clear when you fix the underlying issues</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-blue-500" />
          How It Works
        </h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-white rounded-lg border">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">1</div>
            <div>
              <h3 className="font-semibold text-gray-900">You Create Work</h3>
              <p className="text-gray-600 text-sm">Create a Task, WorkOrder, RFI, or DocumentSubmission as normal</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 mt-2" />
          </div>
          <div className="flex items-start gap-4 p-4 bg-white rounded-lg border">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-600">2</div>
            <div>
              <h3 className="font-semibold text-gray-900">WorkUnit Auto-Created</h3>
              <p className="text-gray-600 text-sm">A WorkUnit is automatically created to track this work in Operations Control</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 mt-2" />
          </div>
          <div className="flex items-start gap-4 p-4 bg-white rounded-lg border">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">3</div>
            <div>
              <h3 className="font-semibold text-gray-900">Status Auto-Synced</h3>
              <p className="text-gray-600 text-sm">When you update the status, the WorkUnit status is automatically updated too</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 mt-2" />
          </div>
          <div className="flex items-start gap-4 p-4 bg-white rounded-lg border">
            <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-600">4</div>
            <div>
              <h3 className="font-semibold text-gray-900">Engine Runs Hourly</h3>
              <p className="text-gray-600 text-sm">The Early Warning Engine scans all WorkUnits every hour looking for risks</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 mt-2" />
          </div>
          <div className="flex items-start gap-4 p-4 bg-white rounded-lg border">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center font-bold text-red-600">5</div>
            <div>
              <h3 className="font-semibold text-gray-900">Risks Detected</h3>
              <p className="text-gray-600 text-sm">If problems are found, RiskEvents are created and shown in the dashboard</p>
            </div>
          </div>
        </div>
      </section>

      {/* Risk Types */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          Risk Types
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-6 h-6 text-blue-500" />
              <h3 className="font-semibold text-gray-900">DELAY</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">Work items past their planned end date</p>
            <div className="text-xs bg-blue-50 text-blue-700 p-2 rounded">
              <strong>Example:</strong> WorkOrder due Dec 10, still "In Progress" on Dec 15
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-6 h-6 text-yellow-500" />
              <h3 className="font-semibold text-gray-900">BOTTLENECK</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">Too many items stuck at the same stage</p>
            <div className="text-xs bg-yellow-50 text-yellow-700 p-2 rounded">
              <strong>Example:</strong> 50+ parts waiting for QC inspection
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3 mb-2">
              <Link2 className="w-6 h-6 text-purple-500" />
              <h3 className="font-semibold text-gray-900">DEPENDENCY</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">Work blocked waiting for other items</p>
            <div className="text-xs bg-purple-50 text-purple-700 p-2 rounded">
              <strong>Example:</strong> Fabrication waiting for design approval
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3 mb-2">
              <Gauge className="w-6 h-6 text-red-500" />
              <h3 className="font-semibold text-gray-900">OVERLOAD</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">Too much work assigned to one resource</p>
            <div className="text-xs bg-red-50 text-red-700 p-2 rounded">
              <strong>Example:</strong> Engineer has 20+ active tasks
            </div>
          </div>
        </div>
      </section>

      {/* Severity Levels */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Risk Severity Levels</h2>
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-lg border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Severity</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Meaning</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Response Time</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-medium">CRITICAL</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">Immediate threat to delivery</td>
                <td className="px-4 py-3 text-sm font-medium text-red-600">Now</td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm font-medium">HIGH</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">Significant risk to schedule</td>
                <td className="px-4 py-3 text-sm font-medium text-orange-600">Within 24 hours</td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm font-medium">MEDIUM</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">Potential issue developing</td>
                <td className="px-4 py-3 text-sm font-medium text-yellow-600">Within 1 week</td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">LOW</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">Minor concern for monitoring</td>
                <td className="px-4 py-3 text-sm font-medium text-blue-600">When convenient</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Work Unit Types */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-green-500" />
          Work Unit Types
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
            <PenTool className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <div className="font-medium text-purple-900">DESIGN</div>
            <div className="text-xs text-purple-600">From Tasks</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-200">
            <Package className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <div className="font-medium text-yellow-900">PROCUREMENT</div>
            <div className="text-xs text-yellow-600">From Tasks</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-200">
            <Wrench className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <div className="font-medium text-orange-900">PRODUCTION</div>
            <div className="text-xs text-orange-600">From WorkOrders</div>
          </div>
          <div className="bg-cyan-50 rounded-lg p-4 text-center border border-cyan-200">
            <ClipboardCheck className="w-8 h-8 text-cyan-600 mx-auto mb-2" />
            <div className="font-medium text-cyan-900">QC</div>
            <div className="text-xs text-cyan-600">From RFIs</div>
          </div>
          <div className="bg-indigo-50 rounded-lg p-4 text-center border border-indigo-200">
            <FileText className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <div className="font-medium text-indigo-900">DOCUMENTATION</div>
            <div className="text-xs text-indigo-600">From Submissions</div>
          </div>
        </div>
      </section>

      {/* Dependency Types */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Network className="w-5 h-5 text-purple-500" />
          Dependency Types (Critical Path)
        </h2>
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-mono text-sm">FS</span>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">Finish-to-Start</td>
                <td className="px-4 py-3 text-sm text-gray-600">B cannot start until A finishes (most common)</td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-mono text-sm">SS</span>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">Start-to-Start</td>
                <td className="px-4 py-3 text-sm text-gray-600">B cannot start until A starts</td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded font-mono text-sm">FF</span>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">Finish-to-Finish</td>
                <td className="px-4 py-3 text-sm text-gray-600">B cannot finish until A finishes</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Define dependencies in the <Link href="/operations-control/dependencies" className="text-blue-600 hover:underline">Dependencies page</Link> to enable critical path analysis.
        </p>
      </section>

      {/* AI Risk Officer */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-500" />
          Using AI as Risk Officer
        </h2>
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6">
          <p className="text-gray-700 mb-4">
            The <Link href="/operations-control/ai-digest" className="text-blue-600 hover:underline font-medium">AI Risk Digest</Link> page 
            generates an AI-ready summary of all active risks that you can send to the AI Assistant for analysis.
          </p>
          <h4 className="font-semibold text-gray-900 mb-2">Example questions to ask:</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              "What are the top 3 actions I should take today?"
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              "Which project is at highest risk of delay?"
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              "Summarize the critical risks for my manager"
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              "Create an action plan for the next week"
            </li>
          </ul>
        </div>
      </section>

      {/* Quick Links */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/operations-control" className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow text-center">
            <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <div className="font-medium text-gray-900">Risk Dashboard</div>
          </Link>
          <Link href="/operations-control/work-units" className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow text-center">
            <ListChecks className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <div className="font-medium text-gray-900">Work Units</div>
          </Link>
          <Link href="/operations-control/dependencies" className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow text-center">
            <Network className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <div className="font-medium text-gray-900">Dependencies</div>
          </Link>
          <Link href="/operations-control/capacity" className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow text-center">
            <Gauge className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="font-medium text-gray-900">Capacity</div>
          </Link>
        </div>
      </section>

      {/* ========================================== */}
      {/* CAPACITY CONSUMPTION - BEST CASE SCENARIO */}
      {/* ========================================== */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-500" />
          How Capacity Consumption Works (Best Case Scenario)
        </h2>
        
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-6 mb-6">
          <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
            <Brain className="w-5 h-5" />
            The Vision: Automatic Capacity Intelligence
          </h3>
          <p className="text-gray-700 mb-4">
            When you create work (Tasks, WorkOrders, RFIs, Documents), the system should <strong>automatically</strong>:
          </p>
          <ol className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
              <span>Create a <strong>WorkUnit</strong> to track the work</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <span>Estimate the <strong>load</strong> (how much capacity it will consume)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <span>Create <strong>dependencies</strong> based on workflow templates</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
              <span>Show <strong>blocking status</strong> and <strong>capacity impact</strong> in real-time</span>
            </li>
          </ol>
        </div>

        {/* Capacity Flow Diagram */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">Capacity Consumption Flow</h3>
          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex items-center gap-4">
              <div className="w-32 text-center">
                <div className="bg-blue-100 rounded-lg p-3 mb-1">
                  <FileText className="w-6 h-6 text-blue-600 mx-auto" />
                </div>
                <span className="text-xs text-gray-600">Create Task</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
              <div className="w-32 text-center">
                <div className="bg-purple-100 rounded-lg p-3 mb-1">
                  <Layers className="w-6 h-6 text-purple-600 mx-auto" />
                </div>
                <span className="text-xs text-gray-600">WorkUnit Created</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
              <div className="w-32 text-center">
                <div className="bg-orange-100 rounded-lg p-3 mb-1">
                  <TrendingUp className="w-6 h-6 text-orange-600 mx-auto" />
                </div>
                <span className="text-xs text-gray-600">Load Estimated</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
              <div className="w-32 text-center">
                <div className="bg-green-100 rounded-lg p-3 mb-1">
                  <Gauge className="w-6 h-6 text-green-600 mx-auto" />
                </div>
                <span className="text-xs text-gray-600">Capacity Updated</span>
              </div>
            </div>
          </div>
        </div>

        {/* Resource Type Mapping */}
        <div className="bg-white rounded-lg border overflow-hidden mb-6">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h3 className="font-bold text-gray-900">WorkUnit Type → Resource Type → Capacity Unit</h3>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">WorkUnit Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Resource Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Capacity Unit</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Load Estimation</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">DESIGN</span>
                </td>
                <td className="px-4 py-3 text-sm">DESIGNER</td>
                <td className="px-4 py-3 text-sm font-mono">DRAWINGS</td>
                <td className="px-4 py-3 text-sm text-gray-600">5-10 drawings per task (keyword-based)</td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm">PRODUCTION</span>
                </td>
                <td className="px-4 py-3 text-sm">WELDER / LASER</td>
                <td className="px-4 py-3 text-sm font-mono">TONS</td>
                <td className="px-4 py-3 text-sm text-gray-600">Weight from WorkOrder (totalWeight field)</td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded text-sm">QC</span>
                </td>
                <td className="px-4 py-3 text-sm">QC</td>
                <td className="px-4 py-3 text-sm font-mono">HOURS</td>
                <td className="px-4 py-3 text-sm text-gray-600">1 inspection per RFI (8 hours default)</td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">PROCUREMENT</span>
                </td>
                <td className="px-4 py-3 text-sm">PROCUREMENT</td>
                <td className="px-4 py-3 text-sm font-mono">HOURS</td>
                <td className="px-4 py-3 text-sm text-gray-600">1 procurement action per task</td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-sm">DOCUMENTATION</span>
                </td>
                <td className="px-4 py-3 text-sm">DESIGNER</td>
                <td className="px-4 py-3 text-sm font-mono">DRAWINGS</td>
                <td className="px-4 py-3 text-sm text-gray-600">1 document per submission</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Example Scenario */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mb-6">
          <h3 className="font-bold text-blue-900 mb-3">Example: Creating a WorkOrder</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <strong>You create:</strong> WorkOrder for Project P-2024-001, Building A, 50 tons
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <strong>System creates:</strong> WorkUnit (type=PRODUCTION, weight=50 tons)
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <div>
                <strong>Dependencies created:</strong> This PRODUCTION WorkUnit is blocked by incomplete DESIGN and PROCUREMENT WorkUnits in the same project
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <div>
                <strong>Capacity impact:</strong> WELDER resource load increases by 50 tons for the planned week
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
              <div>
                <strong>If overloaded:</strong> Early Warning Engine creates OVERLOAD risk event
              </div>
            </div>
          </div>
        </div>

        {/* Dependency Blueprints */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Network className="w-5 h-5 text-purple-500" />
            Dependency Blueprints (Auto-Dependencies)
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            When a WorkUnit is created, the system automatically creates dependencies based on the project's workflow template:
          </p>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded font-medium">DESIGN</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded font-medium">PROCUREMENT</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded font-medium">PRODUCTION</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded font-medium">QC</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded font-medium">DOCUMENTATION</span>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Standard Steel Fabrication Blueprint: Each stage must complete before the next can start (FS dependencies)
            </p>
          </div>
        </div>
      </section>

      {/* Operations Intelligence */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-500" />
          Operations Intelligence Dashboard
        </h2>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
          <p className="text-gray-700 mb-4">
            The <Link href="/operations-control/intelligence" className="text-blue-600 hover:underline font-medium">Operations Intelligence</Link> page 
            shows WorkUnits, Dependencies, and Capacity together in one unified view.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border">
              <ListChecks className="w-6 h-6 text-blue-600 mb-2" />
              <h4 className="font-semibold text-gray-900">WorkUnits Table</h4>
              <p className="text-sm text-gray-600">See all work items with their blocking status and capacity impact</p>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <Network className="w-6 h-6 text-purple-600 mb-2" />
              <h4 className="font-semibold text-gray-900">Dependency Graph</h4>
              <p className="text-sm text-gray-600">Visual network showing how work items depend on each other</p>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <Gauge className="w-6 h-6 text-green-600 mb-2" />
              <h4 className="font-semibold text-gray-900">Capacity Cards</h4>
              <p className="text-sm text-gray-600">Real-time utilization per resource type with overload warnings</p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-white rounded-lg border">
            <h4 className="font-semibold text-gray-900 mb-2">Create WorkUnit Preview</h4>
            <p className="text-sm text-gray-600">
              Click "Create WorkUnit" to see a <strong>live preview</strong> of:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li>• Which existing WorkUnits would <strong>block</strong> the new one</li>
              <li>• How much <strong>capacity</strong> it would consume</li>
              <li>• Whether it would cause a <strong>resource overload</strong></li>
            </ul>
          </div>
        </div>
      </section>

      {/* Self-Healing Note */}
      <section className="mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-green-900">Self-Healing System</h3>
              <p className="text-sm text-green-700 mt-1">
                When you fix the root cause of a risk (e.g., complete a delayed task), the risk will automatically 
                clear on the next scheduler run. No manual intervention needed!
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
