'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReportGeneratorDialogProps {
  projectId: string;
  projectNumber?: string;
  projectName?: string;
}

export function ReportGeneratorDialog({
  projectId,
  projectNumber,
  projectName,
}: ReportGeneratorDialogProps) {
  const [open, setOpen] = useState(false);
  const [reportType, setReportType] = useState<string>('project-summary');
  const [language, setLanguage] = useState<string>('en');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const reportTypes = [
    { value: 'project-summary', label: 'Project Summary Report' },
    { value: 'delivery-note', label: 'Delivery Note' },
    { value: 'production-log', label: 'Production Log (Coming Soon)', disabled: true },
    { value: 'qc-report', label: 'QC Report (Coming Soon)', disabled: true },
  ];

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType,
          projectId,
          language,
        }),
      });

      const result = await response.json();

      if (result.status === 'success') {
        toast({
          title: 'Report Generated Successfully',
          description: `${reportType} has been generated.`,
        });

        // Open PDF in new tab
        window.open(result.url, '_blank');
        setOpen(false);
      } else {
        toast({
          title: 'Report Generation Failed',
          description: result.error || 'An error occurred',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate PDF Report</DialogTitle>
          <DialogDescription>
            {projectNumber && projectName
              ? `Generate a professional PDF report for ${projectNumber} - ${projectName}`
              : 'Generate a professional PDF report for this project'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Report Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Report Type</label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => (
                  <SelectItem
                    key={type.value}
                    value={type.value}
                    disabled={type.disabled}
                  >
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Language Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Language</label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">العربية (Arabic)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Report Description */}
          <div className="rounded-lg bg-muted p-4 text-sm">
            {reportType === 'project-summary' && (
              <div>
                <p className="font-medium mb-2">Project Summary Report includes:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Project information and status</li>
                  <li>Weight summary and breakdown</li>
                  <li>Buildings list with completion</li>
                  <li>Production summary (Fit-up, Welding, Visual)</li>
                  <li>QC summary and pass rates</li>
                  <li>Dispatch summary</li>
                </ul>
              </div>
            )}
            {reportType === 'delivery-note' && (
              <div>
                <p className="font-medium mb-2">Delivery Note includes:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Building summary with shipment weights</li>
                  <li>Driver information and vehicle details</li>
                  <li>Complete items list with quantities</li>
                  <li>Shipment weight breakdown</li>
                  <li>Professional format for delivery documentation</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleGenerateReport} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Generate PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
