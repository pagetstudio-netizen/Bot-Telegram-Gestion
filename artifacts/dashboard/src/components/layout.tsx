import { Link, useLocation } from "wouter";
import { useGetBotStatus } from "@workspace/api-client-react";
import { LayoutDashboard, Users, ShieldAlert, Activity, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: botStatus } = useGetBotStatus();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Groups", href: "/groups", icon: Users },
    { name: "Violations", href: "/violations", icon: ShieldAlert },
  ];

  const formatUptime = (seconds?: number) => {
    if (!seconds) return "0s";
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <div className="hidden md:flex w-64 flex-col bg-card border-r border-border">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="font-mono font-bold text-primary flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <span>MOD_OPS</span>
          </div>
        </div>
        <div className="p-4 flex-1 flex flex-col gap-2">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location === item.href || (item.href !== '/' && location.startsWith(item.href)) ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </div>
        <div className="p-4 border-t border-border text-xs flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className={`h-2 w-2 rounded-full ${botStatus?.running ? 'bg-green-500' : 'bg-red-500'}`} />
            {botStatus?.running ? 'System Online' : 'System Offline'}
          </div>
          {botStatus?.running && (
            <div className="text-muted-foreground ml-4">
              Uptime: {formatUptime(botStatus.uptime)}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="md:hidden p-4 border-b border-border bg-card flex items-center justify-between">
          <div className="font-mono font-bold text-primary flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <span>MOD_OPS</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-card border-border">
              <div className="flex flex-col gap-2 mt-8">
                {navigation.map((item) => (
                  <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location === item.href || (item.href !== '/' && location.startsWith(item.href)) ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}