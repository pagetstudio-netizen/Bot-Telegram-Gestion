import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Radio, Send, Loader2, CheckCircle2, XCircle, Plus, Trash2,
  Globe, Hash, Users, BarChart3, ShieldAlert, Ban, AlertTriangle,
  RefreshCw, Bot, Activity, TrendingUp, MessageSquare,
  Zap, Clock, ChevronUp,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type LinkType = "channel" | "website";
interface OwnerLink { type: LinkType; value: string; title: string }
interface BotStats {
  totalUsers: number;
  totalGroups: number;
  activeGroups: number;
  totalWarnings: number;
  totalBans: number;
  totalViolations: number;
  todayViolations: number;
  todayWarnings: number;
  weekViolations: number;
  languages: { language: string; count: number }[];
  topGroups: { title: string; violations: number }[];
  dailyActivity: { day: string; count: number }[];
  botInfo: { first_name: string; username: string } | null;
  uptime: number;
  restartCount: number;
}

const LANG_FLAGS: Record<string, string> = { fr: "🇫🇷", en: "🇬🇧", es: "🇪🇸", pt: "🇵🇹", ar: "🇸🇦" };
const LANG_NAMES: Record<string, string> = { fr: "Français", en: "English", es: "Español", pt: "Português", ar: "العربية" };

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}j ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function OwnerSettings() {
  const { toast } = useToast();

  // ── Stats ──────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<BotStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Links ──────────────────────────────────────────────────────────────
  const [links, setLinks] = useState<OwnerLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addType, setAddType] = useState<LinkType>("channel");
  const [addValue, setAddValue] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [adding, setAdding] = useState(false);

  // ── Restart ────────────────────────────────────────────────────────────
  const [restarting, setRestarting] = useState(false);

  // ── Broadcast ──────────────────────────────────────────────────────────
  const [bMsg, setBMsg] = useState("");
  const [bBtnText, setBBtnText] = useState("");
  const [bBtnUrl, setBBtnUrl] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await apiFetch("/api/owner/stats");
      setStats(data);
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger les statistiques.", variant: "destructive" });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadLinks = useCallback(async () => {
    setLinksLoading(true);
    try {
      const data = await apiFetch("/api/owner/config");
      setLinks(data.requiredLinks ?? []);
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger la configuration.", variant: "destructive" });
    } finally {
      setLinksLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadLinks();
  }, []);

  const persist = async (updated: OwnerLink[]) => {
    setSaving(true);
    try {
      await apiFetch("/api/owner/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requiredLinks: updated }),
      });
      setLinks(updated);
    } catch {
      toast({ title: "Erreur", description: "Sauvegarde échouée.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    const val = addValue.trim();
    const title = addTitle.trim();
    if (!val || !title) {
      toast({ title: "Champs requis", description: "Veuillez remplir la valeur et le titre.", variant: "destructive" });
      return;
    }
    if (addType === "channel" && !val.startsWith("@") && !val.startsWith("-")) {
      toast({ title: "Format invalide", description: "Le canal doit commencer par @ ou être un ID numérique.", variant: "destructive" });
      return;
    }
    if (addType === "website" && !val.startsWith("http")) {
      toast({ title: "Format invalide", description: "L'URL doit commencer par https://", variant: "destructive" });
      return;
    }
    setAdding(true);
    await persist([...links, { type: addType, value: val, title }]);
    setAddValue(""); setAddTitle(""); setAdding(false);
    toast({ title: "✅ Ajouté", description: `${title} ajouté avec succès.` });
  };

  const handleRemove = async (idx: number) => {
    const removed = links[idx];
    await persist(links.filter((_, i) => i !== idx));
    toast({ title: "🗑️ Supprimé", description: `${removed.title} retiré.` });
  };

  const handleRestart = async () => {
    setRestarting(true);
    try {
      const result = await apiFetch("/api/owner/restart", { method: "POST" });
      if (result.success) {
        toast({ title: "✅ Bot redémarré", description: result.message });
        setTimeout(loadStats, 2000);
      } else {
        toast({ title: "❌ Erreur", description: result.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "❌ Erreur", description: "Impossible de redémarrer le bot.", variant: "destructive" });
    } finally {
      setRestarting(false);
    }
  };

  const handleBroadcast = async () => {
    if (!bMsg.trim()) {
      toast({ title: "Message vide", description: "Rédigez un message avant d'envoyer.", variant: "destructive" });
      return;
    }
    setBroadcasting(true);
    setBroadcastResult(null);
    try {
      const result = await apiFetch("/api/owner/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: bMsg, buttonText: bBtnText || undefined, buttonUrl: bBtnUrl || undefined }),
      });
      setBroadcastResult(result);
      if (result.sent > 0) setBMsg("");
    } catch {
      toast({ title: "Erreur", description: "Échec de la diffusion.", variant: "destructive" });
    } finally {
      setBroadcasting(false);
    }
  };

  // ── Mini bar chart ─────────────────────────────────────────────────────
  const maxDaily = Math.max(...(stats?.dailyActivity?.map((d) => d.count) ?? [1]), 1);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-mono tracking-tight">OWNER_PANEL</h1>
        <Button variant="outline" size="sm" onClick={loadStats} disabled={statsLoading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${statsLoading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* ── Section : Statistiques globales ──────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-sm font-mono font-semibold text-muted-foreground tracking-wider uppercase flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Statistiques globales
        </h2>

        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="bg-card border-border animate-pulse">
                <CardContent className="p-4">
                  <div className="h-8 bg-secondary rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Utilisateurs</span>
                    <Users className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="text-2xl font-bold">{stats?.totalUsers ?? 0}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">ayant écrit au bot</div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Groupes</span>
                    <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold">{stats?.totalGroups ?? 0}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    <span className="text-green-500">{stats?.activeGroups ?? 0} actifs</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Avertissements</span>
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                  </div>
                  <div className="text-2xl font-bold">{stats?.totalWarnings ?? 0}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    <span className="text-yellow-500">+{stats?.todayWarnings ?? 0}</span> aujourd'hui
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Bans actifs</span>
                    <Ban className="h-3.5 w-3.5 text-destructive" />
                  </div>
                  <div className="text-2xl font-bold">{stats?.totalBans ?? 0}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">utilisateurs bannis</div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Violations totales</span>
                    <ShieldAlert className="h-3.5 w-3.5 text-orange-500" />
                  </div>
                  <div className="text-2xl font-bold">{stats?.totalViolations ?? 0}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    <span className="text-orange-500">+{stats?.todayViolations ?? 0}</span> aujourd'hui
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Cette semaine</span>
                    <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold">{stats?.weekViolations ?? 0}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">violations (7j)</div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Uptime bot</span>
                    <Clock className="h-3.5 w-3.5 text-green-400" />
                  </div>
                  <div className="text-lg font-bold font-mono">{formatUptime(stats?.uptime ?? 0)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stats?.restartCount ?? 0} restart(s)</div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Bot</span>
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="text-sm font-bold truncate">@{stats?.botInfo?.username ?? "—"}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    En ligne
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activité 7 jours */}
            {(stats?.dailyActivity?.length ?? 0) > 0 && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Activité des 7 derniers jours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1.5 h-20">
                    {stats!.dailyActivity.map((d) => (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div
                          className="w-full bg-primary/70 hover:bg-primary rounded-sm transition-all cursor-default"
                          style={{ height: `${Math.max(4, (d.count / maxDaily) * 60)}px` }}
                          title={`${d.day} : ${d.count} violation(s)`}
                        />
                        <span className="text-[9px] text-muted-foreground hidden sm:block">
                          {d.day.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top groupes */}
              {(stats?.topGroups?.length ?? 0) > 0 && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ChevronUp className="h-4 w-4 text-orange-500" />
                      Top groupes par violations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {stats!.topGroups.map((g, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                        <span className="text-sm flex-1 truncate">{g.title}</span>
                        <Badge variant="outline" className="text-xs font-mono">{g.violations}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Distribution langues */}
              {(stats?.languages?.length ?? 0) > 0 && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-400" />
                      Langues configurées
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {stats!.languages.sort((a, b) => b.count - a.count).map((l) => (
                      <div key={l.language} className="flex items-center justify-between">
                        <span className="text-sm">
                          {LANG_FLAGS[l.language] ?? "🌍"} {LANG_NAMES[l.language] ?? l.language}
                        </span>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-1.5 bg-primary/60 rounded-full"
                            style={{ width: `${Math.max(8, (l.count / (stats!.totalGroups || 1)) * 80)}px` }}
                          />
                          <Badge variant="outline" className="text-xs">{l.count}</Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>

      <Separator />

      {/* ── Section : Bot & redémarrage ──────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5 text-primary" />
            Gestion du bot
          </CardTitle>
          <CardDescription>
            Informations sur le bot et actions de maintenance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-secondary/40 rounded-md p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nom du bot</span>
                <span className="font-medium">{stats?.botInfo?.first_name ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Username</span>
                <span className="font-mono text-primary">@{stats?.botInfo?.username ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Statut</span>
                <span className="flex items-center gap-1 text-green-500">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" /> En ligne
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Uptime</span>
                <span className="font-mono">{formatUptime(stats?.uptime ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token Telegram</span>
                <span className="text-muted-foreground text-xs font-mono">
                  Configurable via <code className="bg-background px-1 rounded">TELEGRAM_BOT_TOKEN</code>
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Le redémarrage du bot déconnecte temporairement Telegram (environ 2 secondes) puis reconnecte avec les paramètres actuels.
                Utile après un changement de token ou de configuration.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="gap-2 w-full border-destructive/50 hover:border-destructive hover:text-destructive" disabled={restarting}>
                    {restarting
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Redémarrage…</>
                      : <><RefreshCw className="h-4 w-4" /> Redémarrer le bot</>
                    }
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer le redémarrage</AlertDialogTitle>
                    <AlertDialogDescription>
                      Le bot sera déconnecté ~2 secondes. Les messages envoyés pendant ce temps ne seront pas perdus (Telegram les met en file d'attente). Continuer ?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRestart}>Redémarrer</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="bg-secondary/30 rounded-md p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Changer le token du bot :</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Allez dans les <strong>Secrets Replit</strong> (cadenas 🔒)</li>
                  <li>Modifiez <code className="bg-background px-1 rounded">TELEGRAM_BOT_TOKEN</code></li>
                  <li>Cliquez <strong>Redémarrer le bot</strong> ci-dessus</li>
                </ol>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* ── Section : Liens obligatoires ───────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Radio className="h-5 w-5 text-primary" />
            Liens obligatoires
            {links.length > 0 && <Badge variant="secondary">{links.length}</Badge>}
          </CardTitle>
          <CardDescription>
            Canaux Telegram et sites web que les utilisateurs doivent rejoindre avant d'ajouter le bot dans un groupe.
            Quand quelqu'un tente d'ajouter le bot sans être abonné, le bot quitte le groupe et lui envoie les liens en privé.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {linksLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
            </div>
          ) : (
            <>
              {links.length === 0 ? (
                <div className="text-muted-foreground text-sm py-2 border border-dashed border-border rounded-md text-center p-6">
                  Aucun lien configuré — les utilisateurs peuvent ajouter le bot librement.
                </div>
              ) : (
                <div className="space-y-2">
                  {links.map((link, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-md border border-border bg-secondary/30 group">
                      <div className="shrink-0">
                        {link.type === "channel"
                          ? <Hash className="h-4 w-4 text-primary" />
                          : <Globe className="h-4 w-4 text-blue-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{link.title}</div>
                        <div className="text-xs text-muted-foreground font-mono truncate">{link.value}</div>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {link.type === "channel" ? "Canal" : "Site"}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={saving}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ce lien ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              <strong>{link.title}</strong> ({link.value}) sera retiré des liens obligatoires. Les utilisateurs n'auront plus besoin de le rejoindre.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemove(i)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <p className="text-sm font-medium">Ajouter un lien</p>
                <div className="flex gap-2">
                  <Button
                    variant={addType === "channel" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAddType("channel")}
                    className="gap-1.5"
                  >
                    <Hash className="h-3.5 w-3.5" /> Canal Telegram
                  </Button>
                  <Button
                    variant={addType === "website" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAddType("website")}
                    className="gap-1.5"
                  >
                    <Globe className="h-3.5 w-3.5" /> Site Web
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{addType === "channel" ? "Username ou ID du canal" : "URL du site"}</Label>
                    <Input
                      placeholder={addType === "channel" ? "@moncanal ou -1001234567890" : "https://monsite.com"}
                      value={addValue}
                      onChange={(e) => setAddValue(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nom affiché dans le bouton</Label>
                    <Input
                      placeholder={addType === "channel" ? "Mon Canal Officiel" : "Notre Site Web"}
                      value={addTitle}
                      onChange={(e) => setAddTitle(e.target.value)}
                    />
                  </div>
                </div>

                <Button onClick={handleAdd} disabled={adding || saving} className="gap-1.5">
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Ajouter
                </Button>

                {links.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ℹ️ Pour les canaux, le bot doit être <strong>administrateur</strong> du canal pour vérifier les abonnements.
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* ── Section : Panel Telegram ───────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            Panel Telegram (commande /owner)
          </CardTitle>
          <CardDescription>
            Accédez au panel de contrôle directement dans Telegram avec la commande{" "}
            <code className="text-xs bg-secondary px-1 py-0.5 rounded">/owner</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-secondary/50 rounded-md p-4 text-sm space-y-2">
            <p className="font-medium">Configuration requise :</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Ouvrez Telegram et cherchez <strong>@userinfobot</strong></li>
              <li>Envoyez <code className="text-xs bg-background px-1 rounded">/start</code> — il vous donnera votre ID</li>
              <li>Ajoutez cet ID dans les Secrets Replit sous la clé <code className="text-xs bg-background px-1 rounded">BOT_OWNER_ID</code></li>
              <li>Tapez <code className="text-xs bg-background px-1 rounded">/owner</code> en privé avec votre bot</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* ── Section : Diffusion ────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-primary" />
            Diffusion (Broadcast)
            {stats && (
              <Badge variant="secondary" className="text-xs">
                {stats.totalUsers} destinataire(s)
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Envoyez un message en privé à toutes les personnes qui ont déjà écrit au bot. Supporte le Markdown Telegram.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              placeholder="Rédigez votre message… (*gras*, _italique_, `code`)"
              value={bMsg}
              onChange={(e) => setBMsg(e.target.value)}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">{bMsg.length} caractère(s)</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Texte du bouton (optionnel)</Label>
              <Input placeholder="Visiter le site" value={bBtnText} onChange={(e) => setBBtnText(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>URL du bouton</Label>
              <Input placeholder="https://…" value={bBtnUrl} onChange={(e) => setBBtnUrl(e.target.value)} />
            </div>
          </div>

          {stats && stats.totalUsers === 0 && (
            <p className="text-xs text-yellow-500">
              ⚠️ Aucun utilisateur n'a encore écrit au bot en privé. La diffusion n'enverra rien.
            </p>
          )}

          <Button onClick={handleBroadcast} disabled={broadcasting || !bMsg.trim()} className="gap-1.5 w-full md:w-auto">
            {broadcasting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours…</>
              : <><Send className="h-4 w-4" /> Envoyer à {stats?.totalUsers ?? "?"} utilisateur(s)</>
            }
          </Button>

          {broadcastResult && (
            <div className={`flex items-center gap-2 text-sm font-medium p-3 rounded-md ${broadcastResult.failed === 0 ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}`}>
              {broadcastResult.failed === 0 ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              <span>
                ✅ Envoyé : <strong>{broadcastResult.sent}</strong> / {broadcastResult.total}
                {broadcastResult.failed > 0 && <span className="text-destructive ml-2">❌ {broadcastResult.failed} échec(s)</span>}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
