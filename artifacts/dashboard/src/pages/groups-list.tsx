import { useListGroups } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle, Ban } from "lucide-react";

export default function GroupsList() {
  const { data: groups, isLoading } = useListGroups();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h1 className="text-2xl font-bold font-mono tracking-tight">MANAGED_GROUPS</h1>

      {groups?.length === 0 ? (
        <Card className="bg-card border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            No groups currently monitored. Add the bot to a group to begin.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups?.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card className="bg-card border-border hover:border-primary/50 transition-all cursor-pointer h-full hover-elevate">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg truncate">{group.title}</CardTitle>
                  <div className="text-xs font-mono text-muted-foreground">ID: {group.telegramId}</div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" /> {group.memberCount}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-yellow-500">
                      <AlertTriangle className="h-4 w-4" /> {group.warningCount}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-destructive">
                      <Ban className="h-4 w-4" /> {group.banCount}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-4">
                    {group.antiSpam && <Badge variant="secondary" className="text-[10px]">Anti-Spam</Badge>}
                    {group.antiFlood && <Badge variant="secondary" className="text-[10px]">Anti-Flood</Badge>}
                    {group.antiLinks && <Badge variant="secondary" className="text-[10px]">Anti-Links</Badge>}
                    {group.antiProfanity && <Badge variant="secondary" className="text-[10px]">Anti-Profanity</Badge>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}