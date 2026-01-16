'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, TrendingUp, Lightbulb, AlertTriangle, Activity, Calendar } from 'lucide-react';
import { BusinessPlanningTour } from '@/components/business-planning-tour';

export default function BusinessPlanningDashboard() {
  const currentYear = new Date().getFullYear();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [viewMode, setViewMode] = useState<'single' | 'multi'>('single');
  const availableYears = [2024, 2025, 2026, 2027, 2028];
  const [multiYearData, setMultiYearData] = useState<any[]>([]);

  useEffect(() => {
    if (viewMode === 'single' && selectedYear) {
      fetchDashboard(parseInt(selectedYear));
    } else if (viewMode === 'multi') {
      fetchMultiYearData();
    }
  }, [selectedYear, viewMode]);


  const fetchDashboard = async (year: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/business-planning/dashboard?year=${year}`);
      const data = await res.json();
      setDashboardData(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setLoading(false);
    }
  };

  const fetchMultiYearData = async () => {
    setLoading(true);
    try {
      const promises = availableYears.map(year => 
        fetch(`/api/business-planning/dashboard?year=${year}`).then(res => res.json())
      );
      const data = await Promise.all(promises);
      setMultiYearData(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching multi-year data:', err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Business Planning Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Hexa Strategic Planning System (HSPS)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('single')}
            >
              Single Year
            </Button>
            <Button
              variant={viewMode === 'multi' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('multi')}
            >
              Multi-Year
            </Button>
          </div>
          
          {/* Year Selector (only in single year mode) */}
          {viewMode === 'single' && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Multi-Year Comparison */}
      {viewMode === 'multi' && multiYearData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Multi-Year Comparison</CardTitle>
            <CardDescription>Comparing {multiYearData.length} years of strategic planning data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Metric</th>
                    {multiYearData.map((data) => (
                      <th key={data.year} className="text-center p-2 font-medium">{data.year}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-2">Objectives</td>
                    {multiYearData.map((data) => (
                      <td key={data.year} className="text-center p-2">{data.objectiveStats?.total || 0}</td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Avg Progress</td>
                    {multiYearData.map((data) => (
                      <td key={data.year} className="text-center p-2">{Math.round(data.objectiveStats?.avgProgress || 0)}%</td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Key Results</td>
                    {multiYearData.map((data) => (
                      <td key={data.year} className="text-center p-2">{data.keyResultStats?.total || 0}</td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Initiatives</td>
                    {multiYearData.map((data) => (
                      <td key={data.year} className="text-center p-2">{data.initiativeStats?.total || 0}</td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Total Budget</td>
                    {multiYearData.map((data) => (
                      <td key={data.year} className="text-center p-2">
                        ${(data.initiativeStats?.totalBudget || 0).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">BSC KPIs</td>
                    {multiYearData.map((data) => (
                      <td key={data.year} className="text-center p-2">{data.bscKPIs?.length || 0}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Single Year View */}
      {viewMode === 'single' && dashboardData && (
        <>
          {/* Year Info */}
          <Card className="bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Strategic Planning Year</div>
                  <div className="text-3xl font-bold">{dashboardData.year}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total Objectives</div>
                  <div className="text-3xl font-bold">{dashboardData.objectiveStats?.total || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Objectives */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Company Objectives</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.objectiveStats?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.objectiveStats?.onTrack || 0} on track
            </p>
            <div className="mt-2">
              <div className="text-xs text-muted-foreground">Progress</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${dashboardData?.objectiveStats?.avgProgress || 0}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Results */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Key Results</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.keyResultStats?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.keyResultStats?.completed || 0} completed
            </p>
            <div className="mt-2">
              <div className="text-xs text-muted-foreground">Avg Completion</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${dashboardData?.keyResultStats?.avgCompletion || 0}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Initiatives */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Initiatives</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.initiativeStats?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.initiativeStats?.inProgress || 0} in progress
            </p>
            <div className="mt-2">
              <div className="text-xs text-muted-foreground">Budget</div>
              <div className="text-sm font-medium">
                ${(dashboardData?.initiativeStats?.totalBudget || 0).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Issues */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.issueStats?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.issueStats?.open || 0} open
            </p>
            <div className="mt-2">
              <div className="text-xs text-red-600">
                {dashboardData?.issueStats?.critical || 0} critical
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BSC KPI Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Balanced Scorecard KPIs</CardTitle>
          <CardDescription>Performance across 4 perspectives</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Financial */}
            <div className="space-y-2">
              <div className="font-medium text-sm">Financial</div>
              <div className="text-2xl font-bold">
                {dashboardData?.bscStats?.financial?.total || 0}
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-green-600">On Track:</span>
                  <span>{dashboardData?.bscStats?.financial?.onTrack || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-600">At Risk:</span>
                  <span>{dashboardData?.bscStats?.financial?.atRisk || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">Behind:</span>
                  <span>{dashboardData?.bscStats?.financial?.behind || 0}</span>
                </div>
              </div>
            </div>

            {/* Customer */}
            <div className="space-y-2">
              <div className="font-medium text-sm">Customer</div>
              <div className="text-2xl font-bold">
                {dashboardData?.bscStats?.customer?.total || 0}
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-green-600">On Track:</span>
                  <span>{dashboardData?.bscStats?.customer?.onTrack || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-600">At Risk:</span>
                  <span>{dashboardData?.bscStats?.customer?.atRisk || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">Behind:</span>
                  <span>{dashboardData?.bscStats?.customer?.behind || 0}</span>
                </div>
              </div>
            </div>

            {/* Internal Process */}
            <div className="space-y-2">
              <div className="font-medium text-sm">Internal Process</div>
              <div className="text-2xl font-bold">
                {dashboardData?.bscStats?.internalProcess?.total || 0}
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-green-600">On Track:</span>
                  <span>{dashboardData?.bscStats?.internalProcess?.onTrack || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-600">At Risk:</span>
                  <span>{dashboardData?.bscStats?.internalProcess?.atRisk || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">Behind:</span>
                  <span>{dashboardData?.bscStats?.internalProcess?.behind || 0}</span>
                </div>
              </div>
            </div>

            {/* Learning & Growth */}
            <div className="space-y-2">
              <div className="font-medium text-sm">Learning & Growth</div>
              <div className="text-2xl font-bold">
                {dashboardData?.bscStats?.learningGrowth?.total || 0}
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-green-600">On Track:</span>
                  <span>{dashboardData?.bscStats?.learningGrowth?.onTrack || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-600">At Risk:</span>
                  <span>{dashboardData?.bscStats?.learningGrowth?.atRisk || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">Behind:</span>
                  <span>{dashboardData?.bscStats?.learningGrowth?.behind || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

          {/* Coming Soon Notice */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Module Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  ✅ <strong>Database Schema:</strong> Complete (17 tables)
                </p>
                <p className="text-muted-foreground">
                  ✅ <strong>API Endpoints:</strong> Core endpoints ready
                </p>
                <p className="text-muted-foreground">
                  ✅ <strong>Navigation:</strong> Added to sidebar
                </p>
                <p className="text-muted-foreground">
                  ✅ <strong>UI Pages:</strong> All 9 pages complete
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Full HSPS module is now production-ready!
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Tour Component */}
      <BusinessPlanningTour />
    </div>
  );
}
