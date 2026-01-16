'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, Globe, CheckCircle, Clock } from 'lucide-react';
import { LogoUploader } from '@/components/reports/LogoUploader';

interface ReportType {
  type: string;
  name: string;
  description: string;
  supportedLanguages: string[];
  status?: string;
}

export default function ReportsPage() {
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportTypes();
  }, []);

  const fetchReportTypes = async () => {
    try {
      const response = await fetch('/api/reports/types');
      const data = await response.json();
      if (data.status === 'success') {
        setReportTypes(data.reportTypes);
      }
    } catch (error) {
      console.error('Failed to fetch report types:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
          <CheckCircle className="h-3 w-3" />
          Available
        </span>
      );
    }
    if (status === 'coming-soon') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
          <Clock className="h-3 w-3" />
          Coming Soon
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading reports...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-2">
            Generate professional PDF reports for your projects
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-blue-100 p-3">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">
                Hexa Reporting Engine (HRE)
              </h3>
              <p className="text-sm text-blue-700">
                Professional PDF reports with Hexa Steel® branding, bilingual support (English & Arabic),
                and pixel-perfect formatting. Reports are generated using Puppeteer and can be accessed
                from project pages or generated here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo Uploader */}
      <LogoUploader />

      {/* Report Types Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((report) => (
          <Card key={report.type} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="rounded-lg bg-primary/10 p-3 mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                {getStatusBadge(report.status)}
              </div>
              <CardTitle className="text-xl">{report.name}</CardTitle>
              <CardDescription className="text-sm">
                {report.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Supported Languages */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4" />
                <span>
                  {report.supportedLanguages.includes('en') && 'English'}
                  {report.supportedLanguages.includes('en') &&
                    report.supportedLanguages.includes('ar') &&
                    ' & '}
                  {report.supportedLanguages.includes('ar') && 'Arabic'}
                </span>
              </div>

              {/* Action Button */}
              <Button
                className="w-full"
                variant={report.status === 'coming-soon' ? 'outline' : 'default'}
                disabled={report.status === 'coming-soon'}
              >
                {report.status === 'coming-soon' ? (
                  'Coming Soon'
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Generate from Project
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* How to Use Section */}
      <Card>
        <CardHeader>
          <CardTitle>How to Generate Reports</CardTitle>
          <CardDescription>
            Follow these steps to generate reports for your projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold mb-1">Navigate to a Project</h4>
                <p className="text-sm text-muted-foreground">
                  Go to any project page from your projects list
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold mb-1">Click "Generate Report"</h4>
                <p className="text-sm text-muted-foreground">
                  Find the "Generate Report" button on the project page
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold mb-1">Select Report Type & Language</h4>
                <p className="text-sm text-muted-foreground">
                  Choose the report type and language (English or Arabic)
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h4 className="font-semibold mb-1">Download & View</h4>
                <p className="text-sm text-muted-foreground">
                  The PDF will be generated and opened in a new tab automatically
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <CardDescription>
            For developers: Generate reports programmatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Endpoint</h4>
              <code className="block bg-muted p-3 rounded text-sm">
                POST /api/reports/generate
              </code>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Request Body</h4>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "reportType": "project-summary",
  "projectId": "uuid-string",
  "language": "en"
}`}
              </pre>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Response</h4>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "status": "success",
  "url": "/outputs/reports/247/project-summary-123.pdf",
  "metadata": { ... }
}`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
