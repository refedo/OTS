'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Target, 
  TrendingUp, 
  Lightbulb, 
  Network, 
  AlertTriangle,
  CheckCircle2,
  Compass
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TourStep {
  title: string;
  description: string;
  icon: any;
  order: number;
  path: string;
  color: string;
  details: string[];
  example: string;
}

const tourSteps: TourStep[] = [
  {
    title: 'Company Objectives (OKRs)',
    description: 'Start here: Define WHAT you want to achieve',
    icon: Target,
    order: 1,
    path: '/business-planning/objectives',
    color: 'blue',
    details: [
      'Set 3-5 strategic objectives per year',
      'Each objective should be ambitious but achievable',
      'Add Key Results (measurable outcomes)',
      'Organize by quarters (Q1-Q4)',
      'Categorize: Financial, Customer, Internal, Learning & Growth'
    ],
    example: 'Objective: "Increase Market Share"\nKey Result: "Grow revenue by 25%"'
  },
  {
    title: 'KPIs (Key Performance Indicators)',
    description: 'Measure progress toward your objectives',
    icon: TrendingUp,
    order: 2,
    path: '/business-planning/kpis',
    color: 'green',
    details: [
      'Link KPIs to specific objectives',
      'Set target values and current values',
      'Choose measurement frequency (Monthly/Quarterly)',
      'Assign owners for accountability',
      'Track across Balanced Scorecard categories'
    ],
    example: 'KPI: "Monthly Recurring Revenue"\nTarget: $500K | Current: $380K'
  },
  {
    title: 'Initiatives (Projects)',
    description: 'Define HOW you will achieve objectives',
    icon: Lightbulb,
    order: 3,
    path: '/business-planning/objectives',
    color: 'purple',
    details: [
      'Create initiatives that support objectives',
      'Set start and end dates',
      'Assign owners and budgets',
      'Track progress and status',
      'Link to specific objectives'
    ],
    example: 'Initiative: "Launch New Product Line"\nDuration: Q1-Q2 | Budget: $200K'
  },
  {
    title: 'Department Plans',
    description: 'Cascade strategy to departments',
    icon: Network,
    order: 4,
    path: '/business-planning/departments',
    color: 'indigo',
    details: [
      'Align department plans with company objectives',
      'Set department-specific strategic focus',
      'Define priorities, risks, and dependencies',
      'Create department-level objectives and KPIs',
      'Ensure cross-functional alignment'
    ],
    example: 'Sales Dept: "Focus on enterprise clients"\nAligned to: "Increase Market Share"'
  },
  {
    title: 'Weekly Issues (EOS)',
    description: 'Track and resolve problems quickly',
    icon: AlertTriangle,
    order: 5,
    path: '/business-planning/issues',
    color: 'orange',
    details: [
      'Log issues as they arise',
      'Assign priority (Critical/High/Medium/Low)',
      'Assign to team members',
      'Discuss in weekly meetings',
      'Track until resolved'
    ],
    example: 'Issue: "Server downtime affecting sales"\nPriority: Critical | Assigned to: IT Team'
  }
];

export function BusinessPlanningTour() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    // Check if user has seen the tour
    const hasSeenTour = localStorage.getItem('hasSeenBusinessPlanningTour');
    if (!hasSeenTour) {
      // Show tour after a short delay
      setTimeout(() => setOpen(true), 1000);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGoToPage = () => {
    const step = tourSteps[currentStep];
    localStorage.setItem('hasSeenBusinessPlanningTour', 'true');
    setOpen(false);
    router.push(step.path);
  };

  const handleSkip = () => {
    localStorage.setItem('hasSeenBusinessPlanningTour', 'true');
    setOpen(false);
  };

  const handleFinish = () => {
    localStorage.setItem('hasSeenBusinessPlanningTour', 'true');
    setOpen(false);
  };

  const step = tourSteps[currentStep];
  const Icon = step.icon;

  const getColorClasses = (color: string) => {
    const colors: any = {
      blue: 'bg-blue-100 text-blue-700 border-blue-300',
      green: 'bg-green-100 text-green-700 border-green-300',
      purple: 'bg-purple-100 text-purple-700 border-purple-300',
      indigo: 'bg-indigo-100 text-indigo-700 border-indigo-300',
      orange: 'bg-orange-100 text-orange-700 border-orange-300',
    };
    return colors[color] || colors.blue;
  };

  return (
    <>
      {/* Tour Button - Always visible */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 shadow-lg"
      >
        <Compass className="h-4 w-4 mr-2" />
        Quick Tour
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Compass className="h-6 w-6" />
                Business Planning Quick Tour
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription>
              Learn the correct order and purpose of each planning component
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Progress Indicator */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {tourSteps.length}
              </div>
              <div className="flex gap-1">
                {tourSteps.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2 w-8 rounded-full transition-colors ${
                      idx === currentStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Step Content */}
            <Card className={`border-2 ${getColorClasses(step.color)}`}>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${getColorClasses(step.color)}`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        Step {step.order}
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl mb-2">{step.title}</CardTitle>
                    <CardDescription className="text-base">
                      {step.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Details */}
                <div>
                  <h4 className="font-semibold mb-3">What to do:</h4>
                  <ul className="space-y-2">
                    {step.details.map((detail, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Example */}
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 text-sm">Example:</h4>
                  <pre className="text-sm whitespace-pre-wrap font-mono">{step.example}</pre>
                </div>

                {/* Go to Page Button */}
                <Button 
                  onClick={handleGoToPage} 
                  className="w-full"
                  size="lg"
                >
                  Go to {step.title}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {currentStep === tourSteps.length - 1 ? (
                <Button onClick={handleFinish}>
                  Finish Tour
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  Next Step
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
