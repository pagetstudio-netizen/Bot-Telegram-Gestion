import { useListGroupViolations } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Violations() {
  const { data: violations, isLoading } = useListGroupViolations("");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="space-y-4">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  const getViolationColor = (type: string) => {
    if (type.includes("spam")) return "bg-orange-500/20 text-orange-500 border-orange-500/30";
    if (type.includes("flood")) return "bg-red-500/20 text-red-500 border-red-500/30";
    if (type.includes("link")) return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
    if (type.includes("profanity")) return "bg-purple-500/20 text-purple-500 border-purple-500/30";
    return "bg-primary/20 text-primary border-primary/30";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold font-mono tracking-tight mb-6">GLOBAL_VIOLATIONS_LOG</h1>

      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle>Recent Violations Across All Groups</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {violations?.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No recent violations found.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {violations?.map((v) => (
                <div key={v.id} className="p-4 hover:bg-secondary/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] uppercase font-mono ${getViolationColor(v.violationType)}`}>{v.violationType}</Badge>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono bg-secondary text-foreground">{v.action}</Badge>
                      <span className="text-sm font-medium text-foreground">{v.firstName} {v.username ? `(@${v.username})` : ''}</span>
                    </div>
                    {v.details && <div className="text-sm text-muted-foreground break-all font-mono text-xs">{v.details}</div>}
                    <div className="text-xs text-muted-foreground">Group ID: {v.telegramGroupId}</div>
                  </div>
                  <div className="text-xs text-muted-foreground sm:text-right whitespace-nowrap font-mono bg-background px-2 py-1 rounded border">
                    {format(new Date(v.createdAt), "MMM d, yyyy HH:mm:ss")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}