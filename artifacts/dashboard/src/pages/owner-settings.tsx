import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Radio, Send, Loader2, CheckCircle2, XCircle } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchOwnerConfig() {
  const res = await fetch(`${BASE}/api/owner/config`);
  if (!res.ok) throw new Error("Erreur chargement config");
  return res.json();
}

async function saveOwnerConfig(data: object) {
  const res = await fetch(`${BASE}/api/owner/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
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

  // ── Canal obligatoire ──────────────────────────────────────────────────
  const [channel, setChannel]       = useState("");
  const [channelTitle, setChannelTitle] = useState("");
  const [channelMsg, setChannelMsg]  = useState("");
  const [savingCfg, setSavingCfg]   = useState(false);
  const [loadingCfg, setLoadingCfg] = useState(true);

  // ── Broadcast ─────────────────────────────────────────────────────────
  const [bMsg, setBMsg]             = useState("");
  const [bBtnText, setBBtnText]     = useState("");
  const [bBtnUrl, setBBtnUrl]       = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  useEffect(() => {
    fetchOwnerConfig()
      .then((cfg) => {
        setChannel(cfg.requiredChannel ?? "");
        setChannelTitle(cfg.requiredChannelTitle ?? "");
        setChannelMsg(cfg.requiredChannelMsg ?? "");
      })
      .catch(() => toast({ title: "Erreur", description: "Impossible de charger la configuration.", variant: "destructive" }))
      .finally(() => setLoadingCfg(false));
  }, []);

  const handleSaveChannel = async () => {
    setSavingCfg(true);
    try {
      await saveOwnerConfig({
        requiredChannel: channel || null,
        requiredChannelTitle: channelTitle || null,
        requiredChannelMsg: channelMsg || null,
      });
      toast({ title: "Sauvegardé", description: "Configuration du canal mise à jour." });
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
    } finally {
      setSavingCfg(false);
    }
  };

  const handleClearChannel = async () => {
    setSavingCfg(true);
    try {
      await saveOwnerConfig({ requiredChannel: null, requiredChannelTitle: null, requiredChannelMsg: null });
      setChannel(""); setChannelTitle(""); setChannelMsg("");
      toast({ title: "Canal supprimé", description: "Restriction d'abonnement désactivée." });
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer.", variant: "destructive" });
    } finally {
      setSavingCfg(false);
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
      const result = await sendBroadcast({
        message: bMsg,
        buttonText: bBtnText || undefined,
        buttonUrl: bBtnUrl || undefined,
      });
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

      {/* ── Section : Canal obligatoire ─────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Radio className="h-5 w-5 text-primary" />
            Canal d&apos;abonnement obligatoire
          </CardTitle>
          <CardDescription>
            Les membres de tous les groupes devront rejoindre ce canal avant de pouvoir écrire.
            Laissez vide pour désactiver.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingCfg ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="channel">Username du canal</Label>
                  <Input
                    id="channel"
                    placeholder="@moncanal"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Format : @username ou ID numérique (ex: -1001234567890)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="channelTitle">Nom affiché dans le message</Label>
                  <Input
                    id="channelTitle"
                    placeholder="Mon Canal Officiel"
                    value={channelTitle}
                    onChange={(e) => setChannelTitle(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="channelMsg">Message personnalisé (optionnel)</Label>
                <Textarea
                  id="channelMsg"
                  placeholder="Laissez vide pour utiliser le message par défaut. Supporte le Markdown (*gras*, _italique_)."
                  value={channelMsg}
                  onChange={(e) => setChannelMsg(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleSaveChannel} disabled={savingCfg}>
                  {savingCfg ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Sauvegarder
                </Button>
                {channel && (
                  <Button variant="destructive" onClick={handleClearChannel} disabled={savingCfg}>
                    Désactiver
                  </Button>
                )}
              </div>

              {channel && (
                <div className="flex items-center gap-2 text-sm text-green-500 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Canal actif : <span className="font-mono">{channel}</span>
                </div>
              )}
            </>
          )}
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
            <Label htmlFor="bMsg">Message</Label>
            <Textarea
              id="bMsg"
              placeholder="Rédigez votre message ici… (*gras*, _italique_, \`code\`)"
              value={bMsg}
              onChange={(e) => setBMsg(e.target.value)}
              rows={5}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bBtnText">Texte du bouton (optionnel)</Label>
              <Input
                id="bBtnText"
                placeholder="Visiter le site"
                value={bBtnText}
                onChange={(e) => setBBtnText(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bBtnUrl">URL du bouton</Label>
              <Input
                id="bBtnUrl"
                placeholder="https://…"
                value={bBtnUrl}
                onChange={(e) => setBBtnUrl(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleBroadcast}
            disabled={broadcasting || !bMsg.trim()}
            className="w-full md:w-auto"
          >
            {broadcasting
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Envoi en cours…</>
              : <><Send className="h-4 w-4 mr-2" /> Envoyer à tous les groupes</>
            }
          </Button>

          {broadcastResult && (
            <div className={`flex items-center gap-2 text-sm font-medium ${broadcastResult.failed > 0 ? "text-yellow-500" : "text-green-500"}`}>
              {broadcastResult.failed === 0
                ? <CheckCircle2 className="h-4 w-4" />
                : <XCircle className="h-4 w-4" />
              }
              Envoyé : {broadcastResult.sent} / {broadcastResult.total} groupes
              {broadcastResult.failed > 0 && ` (${broadcastResult.failed} échec${broadcastResult.failed > 1 ? "s" : ""})`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
