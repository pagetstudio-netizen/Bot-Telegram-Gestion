import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Radio, Send, Loader2, CheckCircle2, XCircle, Plus, Trash2, Globe, Hash } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type LinkType = "channel" | "website";
interface OwnerLink { type: LinkType; value: string; title: string }

async function fetchLinks(): Promise<OwnerLink[]> {
  const res = await fetch(`${BASE}/api/owner/config`);
  if (!res.ok) throw new Error("Erreur chargement");
  const data = await res.json();
  return data.requiredLinks ?? [];
}

async function saveLinks(links: OwnerLink[]) {
  const res = await fetch(`${BASE}/api/owner/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requiredLinks: links }),
  });
  if (!res.ok) throw new Error("Erreur sauvegarde");
  return res.json();
}

async function sendBroadcast(data: object) {
  const res = await fetch(`${BASE}/api/owner/broadcast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erreur broadcast");
  return res.json();
}

export default function OwnerSettings() {
  const { toast } = useToast();

  // ── Liens ─────────────────────────────────────────────────────────────
  const [links, setLinks] = useState<OwnerLink[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  // Formulaire ajout
  const [addType, setAddType]   = useState<LinkType>("channel");
  const [addValue, setAddValue] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [adding, setAdding]     = useState(false);

  // ── Broadcast ─────────────────────────────────────────────────────────
  const [bMsg, setBMsg]     = useState("");
  const [bBtnText, setBBtnText] = useState("");
  const [bBtnUrl, setBBtnUrl]   = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  useEffect(() => {
    fetchLinks()
      .then(setLinks)
      .catch(() => toast({ title: "Erreur", description: "Impossible de charger la configuration.", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const persist = async (updated: OwnerLink[]) => {
    setSaving(true);
    try {
      await saveLinks(updated);
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
    const updated = [...links, { type: addType, value: val, title }];
    await persist(updated);
    setAddValue(""); setAddTitle(""); setAdding(false);
    toast({ title: "Ajouté", description: `${title} ajouté avec succès.` });
  };

  const handleRemove = async (idx: number) => {
    const updated = links.filter((_, i) => i !== idx);
    await persist(updated);
    toast({ title: "Supprimé", description: "Lien retiré." });
  };

  const handleBroadcast = async () => {
    if (!bMsg.trim()) {
      toast({ title: "Message vide", description: "Rédigez un message avant d'envoyer.", variant: "destructive" });
      return;
    }
    setBroadcasting(true);
    setBroadcastResult(null);
    try {
      const result = await sendBroadcast({ message: bMsg, buttonText: bBtnText || undefined, buttonUrl: bBtnUrl || undefined });
      setBroadcastResult(result);
      if (result.sent > 0) setBMsg("");
    } catch {
      toast({ title: "Erreur", description: "Échec de la diffusion.", variant: "destructive" });
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-2xl font-bold font-mono tracking-tight">OWNER_SETTINGS</h1>

      {/* ── Section : Liens obligatoires ───────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Radio className="h-5 w-5 text-primary" />
            Liens obligatoires
          </CardTitle>
          <CardDescription>
            Quand quelqu'un essaie d'ajouter votre bot dans un groupe, le bot vérifie que cette personne
            est abonnée à tous vos canaux. Si ce n'est pas le cas, le bot quitte le groupe et envoie
            un message privé à la personne avec les liens à rejoindre. Vous pouvez configurer plusieurs
            canaux Telegram <strong>et</strong> des liens vers votre site web.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
            </div>
          ) : (
            <>
              {/* Liste des liens existants */}
              {links.length === 0 ? (
                <div className="text-muted-foreground text-sm py-2">
                  Aucun lien configuré — les membres peuvent écrire librement.
                </div>
              ) : (
                <div className="space-y-2">
                  {links.map((link, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-md border border-border bg-secondary/30">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemove(i)}
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              {/* Formulaire ajout */}
              <div className="space-y-4">
                <p className="text-sm font-medium">Ajouter un lien</p>

                {/* Type selector */}
                <div className="flex gap-2">
                  <Button
                    variant={addType === "channel" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAddType("channel")}
                    className="gap-1.5"
                  >
                    <Hash className="h-3.5 w-3.5" />
                    Canal Telegram
                  </Button>
                  <Button
                    variant={addType === "website" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAddType("website")}
                    className="gap-1.5"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Site Web
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

      {/* ── Section : Panel Telegram ───────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Hash className="h-5 w-5 text-primary" />
            Panel Telegram (gestion via bot)
          </CardTitle>
          <CardDescription>
            Configurez votre Chat ID dans la variable <code className="text-xs bg-secondary px-1 py-0.5 rounded">BOT_OWNER_ID</code> pour
            accéder au panel de contrôle directement dans Telegram avec la commande <code className="text-xs bg-secondary px-1 py-0.5 rounded">/owner</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-secondary/50 rounded-md p-4 text-sm space-y-2">
            <p className="font-medium">Comment obtenir votre Chat ID ?</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Ouvrez Telegram et cherchez <strong>@userinfobot</strong></li>
              <li>Envoyez <code className="text-xs bg-background px-1 rounded">/start</code> — il vous donnera votre ID</li>
              <li>Ajoutez cet ID dans les secrets Replit sous la clé <code className="text-xs bg-background px-1 rounded">BOT_OWNER_ID</code></li>
              <li>Redémarrez le bot, puis tapez <code className="text-xs bg-background px-1 rounded">/owner</code> en privé avec votre bot</li>
            </ol>
          </div>
          <p className="text-xs text-muted-foreground">
            Le panel Telegram vous permet de gérer les liens obligatoires, envoyer des diffusions et voir les statistiques
            sans ouvrir ce tableau de bord.
          </p>
        </CardContent>
      </Card>

      <Separator />

      {/* ── Section : Diffusion (Broadcast) ────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-primary" />
            Diffusion vers tous les groupes
          </CardTitle>
          <CardDescription>
            Envoyez un message à tous les groupes où votre bot est actif. Supporte le Markdown.
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
          <Button onClick={handleBroadcast} disabled={broadcasting || !bMsg.trim()} className="gap-1.5 w-full md:w-auto">
            {broadcasting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours…</>
              : <><Send className="h-4 w-4" /> Envoyer à tous les groupes</>
            }
          </Button>
          {broadcastResult && (
            <div className={`flex items-center gap-2 text-sm font-medium ${broadcastResult.failed > 0 ? "text-yellow-500" : "text-green-500"}`}>
              {broadcastResult.failed === 0 ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              Envoyé : {broadcastResult.sent} / {broadcastResult.total} groupe(s)
              {broadcastResult.failed > 0 && ` — ${broadcastResult.failed} échec(s)`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
