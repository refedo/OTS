'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Factory,
  FileCheck,
  Calendar,
  Users,
  BarChart3,
  Bell,
  Shield,
  BookOpen,
  Layers,
  Settings,
  Target,
  AlertTriangle,
  Truck,
  FileText,
  Network,
  Brain,
  Clock,
  Database,
} from 'lucide-react';

const modules = [
  {
    name: 'Project Management',
    icon: Target,
    description: 'Complete project lifecycle management with buildings, phases, and milestones tracking.',
    features: ['Project creation & setup', 'Building management', 'Project dashboard', 'Multi-project views'],
    color: 'bg-blue-500',
  },
  {
    name: 'Production Control',
    icon: Factory,
    description: 'End-to-end production tracking from assembly parts to finished products.',
    features: ['Assembly parts management', 'Production logs', 'Process tracking', 'Daily progress reports', 'Multi-project import'],
    color: 'bg-green-500',
  },
  {
    name: 'Quality Control (QC)',
    icon: FileCheck,
    description: 'Comprehensive quality management with inspections, RFIs, NCRs, and ITPs.',
    features: ['Dimensional QC', 'NDT Inspection', 'RFI Management', 'NCR Tracking', 'ITP & WPS'],
    color: 'bg-purple-500',
  },
  {
    name: 'Planning & Scheduling',
    icon: Calendar,
    description: 'Project planning with scope schedules, Gantt charts, and timeline views.',
    features: ['Scope schedules', 'Gantt visualization', 'Timeline management', 'Fabrication planning'],
    color: 'bg-orange-500',
  },
  {
    name: 'Task Management',
    icon: Clock,
    description: 'Task creation, assignment, and tracking with deadline management.',
    features: ['Task creation', 'Assignment & tracking', 'Deadline alerts', 'Progress monitoring'],
    color: 'bg-cyan-500',
  },
  {
    name: 'Document Management',
    icon: FileText,
    description: 'Centralized document storage with timeline tracking and version control.',
    features: ['Document upload', 'Timeline tracking', 'Category organization', 'Search & filter'],
    color: 'bg-indigo-500',
  },
  {
    name: 'Operations Control',
    icon: BarChart3,
    description: 'Advanced operations monitoring with work units and resource management.',
    features: ['Work unit tracking', 'Resource allocation', 'Capacity planning', 'Operations timeline'],
    color: 'bg-red-500',
  },
  {
    name: 'Early Warning System',
    icon: AlertTriangle,
    description: 'Predictive risk detection with automated alerts for delays and bottlenecks.',
    features: ['Late start detection', 'Dependency cascade alerts', 'Capacity overload warnings', 'Critical path analysis'],
    color: 'bg-yellow-500',
  },
  {
    name: 'Notification Center',
    icon: Bell,
    description: 'Real-time notifications for tasks, deadlines, and system events.',
    features: ['Task notifications', 'Deadline reminders', 'Alert management', 'Notification preferences'],
    color: 'bg-pink-500',
  },
  {
    name: 'Business Planning',
    icon: Target,
    description: 'Strategic planning with objectives, initiatives, and KPI tracking.',
    features: ['Objectives management', 'Initiative tracking', 'KPI dashboards', 'Progress monitoring'],
    color: 'bg-emerald-500',
  },
  {
    name: 'Knowledge Center',
    icon: BookOpen,
    description: 'Centralized knowledge base for documentation and best practices.',
    features: ['Knowledge articles', 'Category management', 'Search functionality', 'Rich text editor'],
    color: 'bg-teal-500',
  },
  {
    name: 'AI Assistant',
    icon: Brain,
    description: 'AI-powered assistant for project insights and recommendations.',
    features: ['Natural language queries', 'Project analysis', 'Risk summaries', 'Intelligent suggestions'],
    color: 'bg-violet-500',
  },
  {
    name: 'User Management',
    icon: Users,
    description: 'User administration with role-based access control.',
    features: ['User accounts', 'Role management', 'Permission control', 'Organization chart'],
    color: 'bg-slate-500',
  },
  {
    name: 'Reports & Analytics',
    icon: BarChart3,
    description: 'Comprehensive reporting with production plans and analytics.',
    features: ['Production reports', 'Progress analytics', 'Export capabilities', 'Custom filters'],
    color: 'bg-amber-500',
  },
  {
    name: 'Product Backlog',
    icon: Layers,
    description: 'Feature request and bug tracking with CEO control center.',
    features: ['Backlog management', 'Priority tracking', 'Status workflow', 'CEO dashboard'],
    color: 'bg-rose-500',
  },
];

export default function AboutOTSPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">About Hexa Steel® OTS</h1>
        <p className="text-xl text-muted-foreground">
          Operations Tracking System - Enterprise Resource Planning for Steel Fabrication
        </p>
        <Badge variant="outline" className="mt-4 text-lg px-4 py-1">
          Version 13.3.3
        </Badge>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            <strong>Hexa Steel® OTS™</strong> is a comprehensive Operations Tracking System designed specifically 
            for Hexa Steel®. It provides end-to-end project management, production tracking, 
            quality control, and business intelligence capabilities.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-3xl font-bold text-primary">15+</p>
              <p className="text-sm text-muted-foreground">Integrated Modules</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-3xl font-bold text-primary">100%</p>
              <p className="text-sm text-muted-foreground">Web-Based</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-3xl font-bold text-primary">24/7</p>
              <p className="text-sm text-muted-foreground">Availability</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-3xl font-bold text-primary">Real-time</p>
              <p className="text-sm text-muted-foreground">Data Sync</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modules Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-4">System Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Card key={module.name} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className={`p-2 rounded-lg ${module.color}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    {module.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{module.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {module.features.map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Technical Stack */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Technical Stack
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 border rounded-lg">
              <p className="font-semibold">Frontend</p>
              <p className="text-sm text-muted-foreground">Next.js 15, React 19, TypeScript</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="font-semibold">UI Framework</p>
              <p className="text-sm text-muted-foreground">Tailwind CSS, shadcn/ui</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="font-semibold">Database</p>
              <p className="text-sm text-muted-foreground">PostgreSQL, Prisma ORM</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="font-semibold">Authentication</p>
              <p className="text-sm text-muted-foreground">JWT, Session Management</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-muted-foreground text-sm pt-4 border-t">
        <p>© 2024-2026 Hexa Steel®. All rights reserved.</p>
        <p className="mt-1">Developed with ❤️ for the steel fabrication industry</p>
      </div>
    </div>
  );
}
