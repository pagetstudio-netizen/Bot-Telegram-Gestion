import { useGetBotStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShieldAlert, AlertTriangle, Ban } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetBotStats();

  if (isLoading) {
    return <div className="space-y-4">
      <Skeleton className="h-8 w-64 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
    </div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-2xl font-bold font-mono tracking-tight">SYSTEM_OVERVIEW</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monitored Groups</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalGroups || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalWarnings || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{stats?.todayWarnings || 0} today
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bans</CardTitle>
            <Ban className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalBans || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Violations Today</CardTitle>
            <ShieldAlert className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.todayViolations || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalViolations || 0} total
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold font-mono tracking-tight mb-4">RECENT_ACTIVITY</h2>
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            {stats?.recentActivity?.length ? (
              <div className="divide-y divide-border">
                {stats.recentActivity.map((activity, i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{activity.action}</div>
                      <div className="text-sm text-muted-foreground">{activity.details}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(activity.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                No recent activity to display.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}