'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  TrendingUp, 
  Lightbulb, 
  Network, 
  AlertTriangle,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Info
} from 'lucide-react';
import Link from 'next/link';

export default function BusinessPlanningGuide() {
  const steps = [
    {
      order: 1,
      title: 'Company Objectives (OKRs)',
      subtitle: 'Objectives & Key Results',
      description: 'Define WHAT you want to achieve at the company level',
      icon: Target,
      color: 'blue',
      path: '/business-planning/objectives',
      whenToUse: 'Start of the year or quarter',
      whoShouldDo: 'Leadership team, executives',
      keyPoints: [
        'Set 3-5 strategic objectives per year',
        'Each objective = ambitious goal',
        'Key Results = measurable outcomes (2-5 per objective)',
        'Organize by quarters (Q1, Q2, Q3, Q4)',
        'Use Balanced Scorecard categories'
      ],
      examples: [
        {
          objective: 'Increase Market Share',
          keyResults: ['Grow revenue by 25%', 'Acquire 100 new enterprise clients', 'Launch in 3 new markets']
        },
        {
          objective: 'Improve Customer Satisfaction',
          keyResults: ['Achieve NPS score of 70+', 'Reduce churn to <5%', 'Increase support response time to <2 hours']
        }
      ],
      commonMistakes: [
        'Setting too many objectives (stick to 3-5)',
        'Making objectives too vague or unmeasurable',
        'Not linking key results to objectives'
      ]
    },
    {
      order: 2,
      title: 'KPIs',
      subtitle: 'Key Performance Indicators',
      description: 'Measure and track progress toward objectives',
      icon: TrendingUp,
      color: 'green',
      path: '/business-planning/kpis',
      whenToUse: 'After setting objectives',
      whoShouldDo: 'Department heads, managers',
      keyPoints: [
        'Link each KPI to a specific objective',
        'Set target value and track current value',
        'Choose measurement frequency (Monthly/Quarterly/Annually)',
        'Assign an owner for accountability',
        'Use Balanced Scorecard categories or custom'
      ],
      examples: [
        {
          kpi: 'Monthly Recurring Revenue (MRR)',
          target: '$500,000',
          current: '$380,000',
          linkedTo: 'Increase Market Share objective'
        },
        {
          kpi: 'Customer Satisfaction Score (CSAT)',
          target: '4.5/5',
          current: '4.1/5',
          linkedTo: 'Improve Customer Satisfaction objective'
        }
      ],
      commonMistakes: [
        'Tracking too many KPIs (focus on vital few)',
        'Not linking KPIs to objectives',
        'Setting unrealistic targets'
      ]
    },
    {
      order: 3,
      title: 'Initiatives',
      subtitle: 'Strategic Projects',
      description: 'Define HOW you will achieve your objectives',
      icon: Lightbulb,
      color: 'purple',
      path: '/business-planning/objectives',
      whenToUse: 'After objectives and KPIs are set',
      whoShouldDo: 'Project managers, team leads',
      keyPoints: [
        'Each initiative supports one or more objectives',
        'Set clear start and end dates',
        'Assign project owner and budget',
        'Track progress and status regularly',
        'Break down into milestones'
      ],
      examples: [
        {
          initiative: 'Launch New Product Line',
          duration: 'Q1-Q2 2025',
          budget: '$200,000',
          linkedTo: 'Increase Market Share',
          milestones: ['Research (Q1)', 'Development (Q1-Q2)', 'Launch (Q2)']
        },
        {
          initiative: 'Implement 24/7 Customer Support',
          duration: 'Q2-Q3 2025',
          budget: '$150,000',
          linkedTo: 'Improve Customer Satisfaction',
          milestones: ['Hire team (Q2)', 'Training (Q2)', 'Go-live (Q3)']
        }
      ],
      commonMistakes: [
        'Starting initiatives without clear objectives',
        'Not assigning clear ownership',
        'Underestimating time and budget'
      ]
    },
    {
      order: 4,
      title: 'Department Plans',
      subtitle: 'Departmental Strategy',
      description: 'Cascade company strategy to individual departments',
      icon: Network,
      color: 'indigo',
      path: '/business-planning/departments',
      whenToUse: 'After company objectives are finalized',
      whoShouldDo: 'Department heads',
      keyPoints: [
        'Align with company objectives',
        'Define department strategic focus',
        'Set department-specific priorities',
        'Identify risks and dependencies',
        'Create department-level KPIs'
      ],
      examples: [
        {
          department: 'Sales',
          focus: 'Focus on enterprise clients and expand into new verticals',
          alignedTo: ['Increase Market Share', 'Grow Revenue'],
          priorities: ['Hire 5 enterprise sales reps', 'Develop vertical-specific sales playbooks', 'Implement new CRM']
        },
        {
          department: 'Customer Success',
          focus: 'Reduce churn and increase customer lifetime value',
          alignedTo: ['Improve Customer Satisfaction'],
          priorities: ['Launch customer health scoring', 'Implement quarterly business reviews', 'Build customer community']
        }
      ],
      commonMistakes: [
        'Creating department plans in isolation',
        'Not aligning with company objectives',
        'Ignoring cross-department dependencies'
      ]
    },
    {
      order: 5,
      title: 'Weekly Issues',
      subtitle: 'EOS-Style Issue Tracking',
      description: 'Track and resolve problems quickly',
      icon: AlertTriangle,
      color: 'orange',
      path: '/business-planning/issues',
      whenToUse: 'Ongoing, throughout the year',
      whoShouldDo: 'All team members',
      keyPoints: [
        'Log issues as they arise',
        'Assign priority level (Critical/High/Medium/Low)',
        'Assign to specific team member',
        'Discuss in weekly meetings',
        'Track until fully resolved'
      ],
      examples: [
        {
          issue: 'Server downtime affecting sales platform',
          priority: 'Critical',
          assignedTo: 'IT Team',
          status: 'In Progress',
          resolution: 'Migrate to redundant servers by end of week'
        },
        {
          issue: 'Marketing campaign underperforming',
          priority: 'High',
          assignedTo: 'Marketing Manager',
          status: 'Open',
          resolution: 'Review targeting and adjust budget allocation'
        }
      ],
      commonMistakes: [
        'Letting issues linger without resolution',
        'Not assigning clear ownership',
        'Treating symptoms instead of root causes'
      ]
    }
  ];

  const getColorClasses = (color: string) => {
    const colors: any = {
      blue: 'border-blue-500 bg-blue-50',
      green: 'border-green-500 bg-green-50',
      purple: 'border-purple-500 bg-purple-50',
      indigo: 'border-indigo-500 bg-indigo-50',
      orange: 'border-orange-500 bg-orange-50',
    };
    return colors[color] || colors.blue;
  };

  const getIconBg = (color: string) => {
    const colors: any = {
      blue: 'bg-blue-100 text-blue-700',
      green: 'bg-green-100 text-green-700',
      purple: 'bg-purple-100 text-purple-700',
      indigo: 'bg-indigo-100 text-indigo-700',
      orange: 'bg-orange-100 text-orange-700',
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <BookOpen className="h-12 w-12 text-primary" />
          <h1 className="text-4xl font-bold">Business Planning Guide</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          A comprehensive guide to strategic planning: Learn what each component means, 
          when to use it, and how they work together
        </p>
      </div>

      {/* Quick Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            The Right Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            {steps.map((step, idx) => (
              <div key={step.order} className="flex items-center gap-2">
                <Badge variant="outline" className="text-base px-3 py-1">
                  {step.order}. {step.title}
                </Badge>
                {idx < steps.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Steps */}
      <div className="space-y-8">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Card key={step.order} className={`border-l-4 ${getColorClasses(step.color)}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${getIconBg(step.color)}`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-lg px-3 py-1">
                          Step {step.order}
                        </Badge>
                      </div>
                      <CardTitle className="text-2xl">{step.title}</CardTitle>
                      <CardDescription className="text-base mt-1">{step.subtitle}</CardDescription>
                      <p className="text-muted-foreground mt-2">{step.description}</p>
                    </div>
                  </div>
                  <Link href={step.path}>
                    <Button>
                      Go to Page
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* When & Who */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="font-semibold mb-1 text-sm">When to use:</div>
                    <div className="text-sm">{step.whenToUse}</div>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="font-semibold mb-1 text-sm">Who should do it:</div>
                    <div className="text-sm">{step.whoShouldDo}</div>
                  </div>
                </div>

                {/* Key Points */}
                <div>
                  <h4 className="font-semibold mb-3">Key Points:</h4>
                  <ul className="space-y-2">
                    {step.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Examples */}
                <div>
                  <h4 className="font-semibold mb-3">Examples:</h4>
                  <div className="space-y-3">
                    {step.examples.map((example: any, idx) => (
                      <div key={idx} className="bg-muted p-4 rounded-lg">
                        <pre className="text-sm whitespace-pre-wrap font-mono">
                          {JSON.stringify(example, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Common Mistakes */}
                <div>
                  <h4 className="font-semibold mb-3 text-red-700">Common Mistakes to Avoid:</h4>
                  <ul className="space-y-2">
                    {step.commonMistakes.map((mistake, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-red-700">{mistake}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Glossary */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Glossary</CardTitle>
          <CardDescription>Common terms explained</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            <div>
              <dt className="font-semibold">OKR (Objectives & Key Results)</dt>
              <dd className="text-sm text-muted-foreground ml-4">A goal-setting framework where Objectives define what you want to achieve, and Key Results measure how you'll know you've achieved it.</dd>
            </div>
            <div>
              <dt className="font-semibold">KPI (Key Performance Indicator)</dt>
              <dd className="text-sm text-muted-foreground ml-4">A measurable value that demonstrates how effectively you're achieving key business objectives.</dd>
            </div>
            <div>
              <dt className="font-semibold">Balanced Scorecard</dt>
              <dd className="text-sm text-muted-foreground ml-4">A strategic planning framework that looks at performance from four perspectives: Financial, Customer, Internal Process, and Learning & Growth.</dd>
            </div>
            <div>
              <dt className="font-semibold">Initiative</dt>
              <dd className="text-sm text-muted-foreground ml-4">A strategic project or program designed to achieve specific objectives.</dd>
            </div>
            <div>
              <dt className="font-semibold">EOS (Entrepreneurial Operating System)</dt>
              <dd className="text-sm text-muted-foreground ml-4">A business management system that includes weekly issue tracking for rapid problem resolution.</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
