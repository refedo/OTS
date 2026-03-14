'use client';

import { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  AlertTriangle,
  AlertCircle,
  Bot,
  Copy,
  CheckCircle,
  Clock,
  Zap,
  Link2,
  Gauge,
  Send,
  FileText
} from 'lucide-react';

interface FormattedRisk {
  id: string;
  severity: string;
  type: string;
  reason: string;
  recommendedAction: string;
  affectedProjects: string[];
  affectedWorkUnits: string[];
  detectedAt: string;
}

interface DigestData {
  executiveSummary: {
    totalActiveRisks: number;
    criticalCount: number;
    highCount: number;
    affectedProjectCount: number;
    topConcerns: FormattedRisk[];
  };
  sections: {
    critical: FormattedRisk[];
    high: FormattedRisk[];
    medium: FormattedRisk[];
    low: FormattedRisk[];
  };
  aiContext: string;
  generatedAt: string;
}

const typeIcons: Record<string, any> = {
  DELAY: Clock,
  BOTTLENECK: Zap,
  DEPENDENCY: Link2,
  OVERLOAD: Gauge,
};

export default function AIDigestPage() {
  const [digest, setDigest] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sendingToAI, setSendingToAI] = useState(false);

  const fetchDigest = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/operations-control/ai-digest');
      if (!response.ok) throw new Error('Failed to fetch AI digest');
      
      const data = await response.json();
      setDigest(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDigest();
  }, []);

  const copyToClipboard = async () => {
    if (!digest) return;
    try {
      await navigator.clipboard.writeText(digest.aiContext);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('Failed to copy to clipboard');
    }
  };

  const sendToAIAssistant = () => {
    if (!digest) return;
    // Navigate to AI Assistant with the context pre-filled
    const encodedContext = encodeURIComponent(
      `As a Risk Officer, please analyze this Operations Control digest and provide recommendations:\n\n${digest.aiContext}`
    );
    window.location.href = `/ai-assistant?prompt=${encodedContext}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Generating AI digest...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
          <button onClick={fetchDigest} className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!digest) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="w-7 h-7 text-blue-600" />
            AI Risk Digest
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            AI-ready risk summary for analysis • Generated: {new Date(digest.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={sendToAIAssistant}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Send className="w-4 h-4 mr-2" />
            Send to AI Assistant
          </button>
          <button
            onClick={copyToClipboard}
            className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Digest
              </>
            )}
          </button>
          <button
            onClick={fetchDigest}
            className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-4">Executive Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-500">Total Active Risks</div>
            <div className="text-3xl font-bold text-gray-900">{digest.executiveSummary.totalActiveRisks}</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 shadow-sm border border-red-200">
            <div className="text-sm text-red-600">Critical</div>
            <div className="text-3xl font-bold text-red-700">{digest.executiveSummary.criticalCount}</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 shadow-sm border border-orange-200">
            <div className="text-sm text-orange-600">High</div>
            <div className="text-3xl font-bold text-orange-700">{digest.executiveSummary.highCount}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-500">Affected Projects</div>
            <div className="text-3xl font-bold text-gray-900">{digest.executiveSummary.affectedProjectCount}</div>
          </div>
        </div>
      </div>

      {/* How to Use AI Assistant */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-yellow-800 flex items-center gap-2">
          <Bot className="w-5 h-5" />
          How to Use AI as Risk Officer
        </h3>
        <div className="mt-2 text-sm text-yellow-700 space-y-2">
          <p>1. Click <strong>"Send to AI Assistant"</strong> to open the AI chat with this digest pre-loaded</p>
          <p>2. Ask questions like:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>"What are the top 3 actions I should take today?"</li>
            <li>"Which project is at highest risk of delay?"</li>
            <li>"Summarize the critical risks for my manager"</li>
            <li>"What resources should I reallocate to address bottlenecks?"</li>
            <li>"Create an action plan for the next week"</li>
          </ul>
          <p>3. Or copy the digest and paste it into any AI tool (ChatGPT, Claude, etc.)</p>
        </div>
      </div>

      {/* Top Concerns */}
      {digest.executiveSummary.topConcerns.length > 0 && (
        <div className="bg-white rounded-lg border mb-6">
          <div className="px-4 py-3 border-b bg-red-50">
            <h2 className="font-semibold text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Top Concerns (Immediate Attention)
            </h2>
          </div>
          <div className="divide-y">
            {digest.executiveSummary.topConcerns.map((risk, index) => {
              const TypeIcon = typeIcons[risk.type] || AlertCircle;
              return (
                <div key={risk.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-700 rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                          CRITICAL
                        </span>
                        <span className="flex items-center text-sm text-gray-600">
                          <TypeIcon className="w-4 h-4 mr-1" />
                          {risk.type}
                        </span>
                      </div>
                      <p className="text-gray-900 font-medium">{risk.reason}</p>
                      <div className="mt-2 text-sm text-gray-600">
                        <strong>Projects:</strong> {risk.affectedProjects.join(', ') || 'N/A'}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        <strong>Work Units:</strong> {risk.affectedWorkUnits.join(', ') || 'N/A'}
                      </div>
                      <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                        <strong>Recommended:</strong> {risk.recommendedAction}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Risk Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* High Priority */}
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-3 border-b bg-orange-50">
            <h2 className="font-semibold text-orange-900">
              High Priority ({digest.sections.high.length})
            </h2>
          </div>
          <div className="divide-y max-h-[300px] overflow-y-auto">
            {digest.sections.high.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No high priority risks</div>
            ) : (
              digest.sections.high.map((risk) => (
                <div key={risk.id} className="p-3">
                  <div className="text-sm text-gray-900">{risk.reason}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {risk.affectedProjects.join(', ')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Medium Priority */}
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-3 border-b bg-yellow-50">
            <h2 className="font-semibold text-yellow-900">
              Medium Priority ({digest.sections.medium.length})
            </h2>
          </div>
          <div className="divide-y max-h-[300px] overflow-y-auto">
            {digest.sections.medium.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No medium priority risks</div>
            ) : (
              digest.sections.medium.map((risk) => (
                <div key={risk.id} className="p-3">
                  <div className="text-sm text-gray-900">{risk.reason}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {risk.affectedProjects.join(', ')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Raw AI Context */}
      <div className="bg-white rounded-lg border">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Raw AI Context (Copy-Paste Ready)
          </h2>
          <button
            onClick={copyToClipboard}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
        </div>
        <div className="p-4">
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm whitespace-pre-wrap font-mono">
            {digest.aiContext}
          </pre>
        </div>
      </div>
    </div>
  );
}
