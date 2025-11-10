import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  User, 
  FolderKanban, 
  ListChecks, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  LogOut
} from 'lucide-react';

export default async function DashboardPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  // Fetch tasks for the user
  const tasksResponse = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/tasks`, {
    headers: {
      Cookie: `${cookieName}=${token}`,
    },
    cache: 'no-store',
  });
  const tasks = tasksResponse.ok ? await tasksResponse.json() : [];

  // Calculate task stats
  const pendingTasks = tasks.filter((t: any) => t.status === 'Pending');
  const inProgressTasks = tasks.filter((t: any) => t.status === 'In Progress');
  const completedTasks = tasks.filter((t: any) => t.status === 'Completed');
  const overdueTasks = tasks.filter((t: any) => {
    if (!t.dueDate || t.status === 'Completed') return false;
    return new Date(t.dueDate) < new Date();
  });

  // Get upcoming tasks (due within 7 days)
  const upcomingTasks = tasks
    .filter((t: any) => {
      if (!t.dueDate || t.status === 'Completed') return false;
      const dueDate = new Date(t.dueDate);
      const today = new Date();
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return dueDate >= today && dueDate <= weekFromNow;
    })
    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  async function logout() {
    'use server';
    const cookieStore = await cookies();
    const secure = process.env.COOKIE_SECURE === 'true';
    const domain = process.env.COOKIE_DOMAIN || undefined;
    cookieStore.set(cookieName, '', {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure,
      domain,
      maxAge: 0
    });
    redirect('/login');
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 space-y-8 max-lg:pt-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {session?.name || 'User'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your projects today
            </p>
          </div>
          <form action={logout}>
            <Button variant="outline" size="default">
              <LogOut className="size-4" />
              Logout
            </Button>
          </form>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Projects
                </CardTitle>
                <FolderKanban className="size-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">12</div>
              <p className="text-xs text-muted-foreground mt-1">
                +2 from last month
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Tasks
                </CardTitle>
                <Clock className="size-5 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingTasks.length + inProgressTasks.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {upcomingTasks.length} due this week
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completed
                </CardTitle>
                <CheckCircle2 className="size-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completedTasks.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}% completion rate
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Overdue
                </CardTitle>
                <AlertCircle className="size-5 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overdueTasks.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {overdueTasks.length > 0 ? 'Requires attention' : 'All on track'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* User Info Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <User className="size-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="text-sm font-medium">{session?.sub || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Role</span>
                  <span className="text-sm font-medium capitalize">{session?.role || '-'}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Department</span>
                  <span className="text-sm font-medium">{session?.departmentId || '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Projects */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <FolderKanban className="size-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Recent Projects</CardTitle>
                  <CardDescription>Your most active projects</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FolderKanban className="size-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Project Alpha {i}</p>
                        <p className="text-sm text-muted-foreground">Updated 2 hours ago</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">View</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks & KPIs */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <ListChecks className="size-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Upcoming Tasks</CardTitle>
                  <CardDescription>Tasks due this week</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No upcoming tasks this week
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingTasks.map((task: any) => {
                    const daysUntilDue = Math.ceil((new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <Link key={task.id} href={`/tasks/${task.id}`}>
                        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                          <div className={`size-2 rounded-full ${
                            task.priority === 'High' ? 'bg-red-500' :
                            task.priority === 'Medium' ? 'bg-orange-500' :
                            'bg-gray-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{task.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Due in {daysUntilDue} {daysUntilDue === 1 ? 'day' : 'days'}
                              {task.project && ` • ${task.project.projectNumber}`}
                            </p>
                          </div>
                          <div className={`text-xs px-2 py-1 rounded ${
                            task.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {task.status}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <TrendingUp className="size-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Performance KPIs</CardTitle>
                  <CardDescription>Key metrics overview</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">On-time Delivery</span>
                    <span className="font-medium">94%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: '94%' }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Quality Score</span>
                    <span className="font-medium">87%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: '87%' }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Team Efficiency</span>
                    <span className="font-medium">91%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500" style={{ width: '91%' }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
