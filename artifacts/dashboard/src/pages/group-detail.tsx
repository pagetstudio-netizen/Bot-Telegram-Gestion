import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  useGetGroup, getGetGroupQueryKey,
  useUpdateGroupSettings, 
  useListGroupWarnings, getListGroupWarningsQueryKey, useClearUserWarnings,
  useListGroupViolations,
  useListWordFilters, getListWordFiltersQueryKey, useAddWordFilter, useDeleteWordFilter,
  useListGroupBans, getListGroupBansQueryKey, useUnbanUser
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Shield, AlertTriangle, MessageSquare, Ban, Settings, Trash2, Plus, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const settingsSchema = z.object({
  antiSpam: z.boolean(),
  antiFlood: z.boolean(),
  antiLinks: z.boolean(),
  antiProfanity: z.boolean(),
  maxWarnings: z.coerce.number().min(1).max(10),
  muteDuration: z.coerce.number().min(60),
  floodLimit: z.coerce.number().min(3),
  floodWindow: z.coerce.number().min(5),
  welcomeMessage: z.string().optional().nullable(),
  rulesText: z.string().optional().nullable(),
});

function SettingsTab({ groupId }: { groupId: string }) {
  const { data: group, isLoading } = useGetGroup(groupId);
  const { mutate: updateSettings, isPending } = useUpdateGroupSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      antiSpam: false,
      antiFlood: false,
      antiLinks: false,
      antiProfanity: false,
      maxWarnings: 3,
      muteDuration: 3600,
      floodLimit: 5,
      floodWindow: 10,
      welcomeMessage: "",
      rulesText: "",
    }
  });

  useEffect(() => {
    if (group) {
      form.reset({
        antiSpam: group.antiSpam,
        antiFlood: group.antiFlood,
        antiLinks: group.antiLinks,
        antiProfanity: group.antiProfanity,
        maxWarnings: group.maxWarnings,
        muteDuration: group.muteDuration,
        floodLimit: group.floodLimit,
        floodWindow: group.floodWindow,
        welcomeMessage: group.welcomeMessage,
        rulesText: group.rulesText,
      });
    }
  }, [group, form]);

  if (isLoading) return <Skeleton className="h-96" />;

  function onSubmit(data: z.infer<typeof settingsSchema>) {
    updateSettings({ groupId, data }, {
      onSuccess: () => {
        toast({ title: "Settings updated successfully" });
        queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(groupId) });
      },
      onError: (err) => {
        toast({ title: "Failed to update settings", description: err.message, variant: "destructive" });
      }
    });
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Moderation Settings</CardTitle>
        <CardDescription>Configure automatic moderation rules for this group</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Active Filters</h3>
                <FormField
                  control={form.control}
                  name="antiSpam"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Anti-Spam</FormLabel>
                        <FormDescription>Block common spam patterns</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="antiFlood"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Anti-Flood</FormLabel>
                        <FormDescription>Prevent message flooding</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="antiLinks"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Anti-Links</FormLabel>
                        <FormDescription>Remove unauthorized links</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="antiProfanity"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Anti-Profanity</FormLabel>
                        <FormDescription>Filter bad words</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> Thresholds</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="maxWarnings"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Warnings before Ban</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="muteDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mute Duration (sec)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="floodLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Flood Msg Limit</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="floodWindow"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Flood Time Window (sec)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
               <h3 className="font-semibold text-lg flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /> Messages</h3>
               <FormField
                  control={form.control}
                  name="welcomeMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Welcome Message</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Welcome to the group!" className="resize-none" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rulesText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rules Text</FormLabel>
                      <FormControl>
                        <Textarea placeholder="1. Be nice..." className="resize-none" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function WarningsTab({ groupId }: { groupId: string }) {
  const { data: warnings, isLoading } = useListGroupWarnings(groupId);
  const { mutate: clearWarnings } = useClearUserWarnings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (isLoading) return <Skeleton className="h-64" />;

  const handleClear = (userId: string) => {
    clearWarnings({ groupId, userId }, {
      onSuccess: () => {
        toast({ title: "Warnings cleared" });
        queryClient.invalidateQueries({ queryKey: getListGroupWarningsQueryKey(groupId) });
      }
    });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Active Warnings</CardTitle>
        <CardDescription>Users who have been warned in this group.</CardDescription>
      </CardHeader>
      <CardContent>
        {warnings?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            No active warnings.
          </div>
        ) : (
          <div className="space-y-4">
            {warnings?.map(w => (
              <div key={w.id} className="flex items-center justify-between p-4 border rounded-lg hover-elevate transition-all">
                <div>
                  <div className="font-medium text-foreground">{w.firstName} {w.username ? `(@${w.username})` : ''}</div>
                  <div className="text-sm text-muted-foreground mt-1">Reason: <span className="text-foreground">{w.reason}</span></div>
                  <div className="text-xs text-muted-foreground mt-1">{format(new Date(w.createdAt), "MMM d, yyyy HH:mm")}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleClear(w.telegramUserId)}>Clear</Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ViolationsTab({ groupId }: { groupId: string }) {
  const { data: violations, isLoading } = useListGroupViolations(groupId);

  if (isLoading) return <Skeleton className="h-64" />;

  const getViolationColor = (type: string) => {
    if (type.includes("spam")) return "bg-orange-500/20 text-orange-500 border-orange-500/30";
    if (type.includes("flood")) return "bg-red-500/20 text-red-500 border-red-500/30";
    if (type.includes("link")) return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
    if (type.includes("profanity")) return "bg-purple-500/20 text-purple-500 border-purple-500/30";
    return "bg-primary/20 text-primary border-primary/30";
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Violations Log</CardTitle>
        <CardDescription>Recent rule violations caught by the bot.</CardDescription>
      </CardHeader>
      <CardContent>
        {violations?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            No recent violations.
          </div>
        ) : (
          <div className="space-y-4">
            {violations?.map(v => (
              <div key={v.id} className="p-4 border rounded-lg hover-elevate transition-all flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{v.firstName} {v.username ? `(@${v.username})` : ''}</span>
                    <Badge variant="outline" className={`text-[10px] uppercase font-mono ${getViolationColor(v.violationType)}`}>{v.violationType}</Badge>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono bg-secondary">{v.action}</Badge>
                  </div>
                  {v.details && <div className="text-sm text-muted-foreground break-all">{v.details}</div>}
                </div>
                <div className="text-xs text-muted-foreground sm:text-right whitespace-nowrap">
                  {format(new Date(v.createdAt), "MMM d, HH:mm")}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WordFiltersTab({ groupId }: { groupId: string }) {
  const { data: filters, isLoading } = useListWordFilters(groupId);
  const { mutate: addFilter, isPending: adding } = useAddWordFilter();
  const { mutate: deleteFilter } = useDeleteWordFilter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [word, setWord] = useState("");

  if (isLoading) return <Skeleton className="h-64" />;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word) return;
    addFilter({ groupId, data: { word, action: "delete" } }, {
      onSuccess: () => {
        toast({ title: "Word filter added" });
        setWord("");
        queryClient.invalidateQueries({ queryKey: getListWordFiltersQueryKey(groupId) });
      }
    });
  };

  const handleDelete = (filterId: string) => {
    deleteFilter({ groupId, filterId }, {
      onSuccess: () => {
        toast({ title: "Word filter removed" });
        queryClient.invalidateQueries({ queryKey: getListWordFiltersQueryKey(groupId) });
      }
    });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Word Filters</CardTitle>
        <CardDescription>Automatically delete messages containing these words.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input placeholder="Enter a word to filter..." value={word} onChange={e => setWord(e.target.value)} />
          <Button type="submit" disabled={adding}><Plus className="w-4 h-4 mr-2" /> Add</Button>
        </form>

        {filters?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            No word filters configured.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {filters?.map(f => (
              <div key={f.id} className="flex items-center justify-between px-3 py-2 border rounded-md bg-secondary/50">
                <span className="font-medium text-sm truncate">{f.word}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(f.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BansTab({ groupId }: { groupId: string }) {
  const { data: bans, isLoading } = useListGroupBans(groupId);
  const { mutate: unbanUser } = useUnbanUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (isLoading) return <Skeleton className="h-64" />;

  const handleUnban = (userId: string) => {
    unbanUser({ groupId, userId }, {
      onSuccess: () => {
        toast({ title: "User unbanned" });
        queryClient.invalidateQueries({ queryKey: getListGroupBansQueryKey(groupId) });
      }
    });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Banned Users</CardTitle>
        <CardDescription>Users permanently banned from this group.</CardDescription>
      </CardHeader>
      <CardContent>
        {bans?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            No banned users.
          </div>
        ) : (
          <div className="space-y-4">
            {bans?.map(b => (
              <div key={b.id} className="flex items-center justify-between p-4 border border-destructive/20 bg-destructive/5 rounded-lg hover-elevate transition-all">
                <div>
                  <div className="font-medium text-foreground">{b.firstName} {b.username ? `(@${b.username})` : ''}</div>
                  <div className="text-sm text-muted-foreground mt-1">Reason: <span className="text-foreground">{b.reason}</span></div>
                  <div className="text-xs text-muted-foreground mt-1">Banned at: {format(new Date(b.bannedAt), "MMM d, yyyy HH:mm")}</div>
                </div>
                <Button variant="outline" size="sm" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleUnban(b.telegramUserId)}>Unban</Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function GroupDetail() {
  const params = useParams();
  const groupId = params.groupId as string;
  const { data: group, isLoading } = useGetGroup(groupId, { query: { enabled: !!groupId } });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-96" /></div>;
  }

  if (!group) return <div>Group not found.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <Link href="/groups" className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2 rounded-md hover:bg-secondary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight">{group.title}</h1>
          <div className="text-sm text-muted-foreground font-mono mt-1">ID: {group.telegramId} &middot; {group.memberCount} members</div>
        </div>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="w-full justify-start border-b border-border rounded-none h-auto p-0 bg-transparent mb-6 overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 data-[state=active]:text-foreground"><Settings className="w-4 h-4 mr-2" /> Settings</TabsTrigger>
          <TabsTrigger value="warnings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 data-[state=active]:text-foreground"><AlertTriangle className="w-4 h-4 mr-2" /> Warnings</TabsTrigger>
          <TabsTrigger value="violations" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 data-[state=active]:text-foreground"><Shield className="w-4 h-4 mr-2" /> Violations</TabsTrigger>
          <TabsTrigger value="filters" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 data-[state=active]:text-foreground"><MessageSquare className="w-4 h-4 mr-2" /> Word Filters</TabsTrigger>
          <TabsTrigger value="bans" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 data-[state=active]:text-foreground"><Ban className="w-4 h-4 mr-2" /> Bans</TabsTrigger>
        </TabsList>
        <TabsContent value="settings" className="mt-0 focus-visible:outline-none"><SettingsTab groupId={groupId} /></TabsContent>
        <TabsContent value="warnings" className="mt-0 focus-visible:outline-none"><WarningsTab groupId={groupId} /></TabsContent>
        <TabsContent value="violations" className="mt-0 focus-visible:outline-none"><ViolationsTab groupId={groupId} /></TabsContent>
        <TabsContent value="filters" className="mt-0 focus-visible:outline-none"><WordFiltersTab groupId={groupId} /></TabsContent>
        <TabsContent value="bans" className="mt-0 focus-visible:outline-none"><BansTab groupId={groupId} /></TabsContent>
      </Tabs>
    </div>
  );
}