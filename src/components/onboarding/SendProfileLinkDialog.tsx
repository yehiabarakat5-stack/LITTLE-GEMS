/**
 * Staff dialog: generate a /join/<token> profile link for a client, see what
 * was prefilled (and from where), and copy a WhatsApp-ready message.
 * Nothing is sent from here — reception pastes the text into WhatsApp / Chatwoot.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Check, Link2, Loader2, MessageCircle, FileText, Camera, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LITTLE_GEMS_BRANCH_CODE,
  useCancelOnboardingLink,
  useCreateOnboardingLink,
  useOnboardingLinks,
  type CreateOnboardingLinkResult,
  type OnboardingLink,
  type OnboardingStage,
} from "@/hooks/useOnboardingLinks";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerId?: string | null;
  ownerName?: string | null;
  phone?: string | null;
  defaultStage?: OnboardingStage;
};

const STATUS_LABEL: Record<OnboardingLink["status"], string> = {
  sent: "Sent",
  opened: "Opened",
  submitted: "Submitted — verify fee",
  completed: "Completed",
  expired: "Expired",
  cancelled: "Cancelled",
};

const SOURCE_LABEL: Record<string, string> = {
  profile: "on file",
  whatsapp: "from WhatsApp",
  upload: "read from photo",
  provider: "from sign-in",
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Could not copy — select the text and copy manually");
        }
      }}
    >
      {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

function PrefillSummary({ result }: { result: CreateOnboardingLinkResult }) {
  const { prefill } = result;
  const sources = useMemo(() => prefill.sources || {}, [prefill.sources]);
  const ownerLines = Object.entries(prefill.owner || {})
    .filter(([, v]) => v)
    .map(([k, v]) => ({ k, v: String(v), src: sources[`owner.${k}`] }));
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of Object.values(sources)) c[s] = (c[s] || 0) + 1;
    return c;
  }, [sources]);

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">Prefilled</span>
        {Object.entries(counts).map(([s, n]) => (
          <Badge key={s} variant="outline" className="gap-1">
            {s === "whatsapp" ? <MessageCircle className="h-3 w-3" /> : s === "upload" ? <Camera className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
            {n} {SOURCE_LABEL[s] || s}
          </Badge>
        ))}
        {prefill.conversation ? (
          <Badge variant="secondary">
            Chat #{prefill.conversation.id} · {prefill.conversation.inboundCount} client msgs
          </Badge>
        ) : (
          <Badge variant="secondary">No WhatsApp thread found</Badge>
        )}
      </div>
      {prefill.conversation?.summary ? <p className="text-muted-foreground">{prefill.conversation.summary}</p> : null}
      {ownerLines.length ? (
        <dl className="grid grid-cols-[120px_1fr] gap-x-2 gap-y-0.5">
          {ownerLines.map(({ k, v, src }) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k.replace(/_/g, " ")}</dt>
              <dd className="truncate">
                {v}
                {src ? <span className="ml-1 text-xs text-muted-foreground">({SOURCE_LABEL[src] || src})</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {(prefill.pets || []).length ? (
        <ul className="space-y-1">
          {(prefill.pets || []).map((p) => (
            <li key={p.ref}>
              <span className="font-medium">{p.name || "Unnamed pet"}</span>
              {p.breed ? ` · ${p.breed}` : ""}
              {p.id ? "" : <Badge variant="outline" className="ml-2">new</Badge>}
              {(p.vaccinations || []).filter((v) => v.expiry_date).length ? (
                <span className="ml-2 text-xs text-muted-foreground">
                  {(p.vaccinations || []).filter((v) => v.expiry_date).length} vaccine date(s)
                </span>
              ) : null}
              {(p.documents || []).length ? (
                <span className="ml-2 text-xs text-muted-foreground">{(p.documents || []).length} photo(s)</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">No pets yet — the client will add them.</p>
      )}
      {(prefill.notes || []).length ? (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {(prefill.notes || []).map((n, i) => (
            <li key={i}>• {n}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function SendProfileLinkDialog({ open, onOpenChange, ownerId, ownerName, phone, defaultStage = "assessment" }: Props) {
  const [stage, setStage] = useState<OnboardingStage>(defaultStage);
  const [phoneInput, setPhoneInput] = useState(phone || "");
  const [conversationId, setConversationId] = useState("");
  const [result, setResult] = useState<CreateOnboardingLinkResult | null>(null);
  const create = useCreateOnboardingLink();
  const cancel = useCancelOnboardingLink();
  const existing = useOnboardingLinks(ownerId);

  useEffect(() => {
    if (open) {
      setStage(defaultStage);
      setPhoneInput(phone || "");
      setConversationId("");
      setResult(null);
    }
  }, [open, defaultStage, phone]);

  const generate = async () => {
    try {
      const res = await create.mutateAsync({
        stage,
        ownerId: ownerId || null,
        phone: phoneInput.trim() || null,
        conversationId: conversationId.trim() ? Number(conversationId.trim()) : null,
        branchCode: LITTLE_GEMS_BRANCH_CODE,
        contactName: ownerName || null,
      });
      setResult(res);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const openLinks = (existing.data || []).filter((l) => ["sent", "opened", "submitted"].includes(l.status));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Send profile link{ownerName ? ` — ${ownerName}` : ""}
          </DialogTitle>
          <DialogDescription>
            The client fills their own profile from a link. We prefill from their record, their WhatsApp chat and any
            vaccine photos they sent, so reception stops re-typing forms.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>What should the client do?</Label>
              <RadioGroup value={stage} onValueChange={(v) => setStage(v as OnboardingStage)} className="grid gap-2">
                <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${stage === "assessment" ? "border-primary" : ""}`}>
                  <RadioGroupItem value="assessment" className="mt-0.5" />
                  <span>
                    <span className="block text-sm font-medium">Book an assessment</span>
                    <span className="block text-xs text-muted-foreground">Contact details, pets, vaccinations, pick a slot. Creates the client + booking.</span>
                  </span>
                </label>
                <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${stage === "membership" ? "border-primary" : ""}`}>
                  <RadioGroupItem value="membership" className="mt-0.5" />
                  <span>
                    <span className="block text-sm font-medium">Complete membership</span>
                    <span className="block text-xs text-muted-foreground">Full profile, care details, Get to Know My Dog, consent and the joining fee. Reception verifies payment.</span>
                  </span>
                </label>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pl-phone">WhatsApp number</Label>
                <Input id="pl-phone" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="+971 50 …" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pl-conv">Chatwoot conversation # (optional)</Label>
                <Input id="pl-conv" value={conversationId} onChange={(e) => setConversationId(e.target.value)} placeholder="auto from number" inputMode="numeric" />
              </div>
            </div>

            {openLinks.length ? (
              <div className="space-y-1 rounded-lg border p-3 text-sm">
                <p className="font-medium">Open links</p>
                {openLinks.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-2">
                    <span>
                      <Badge variant="outline" className="mr-2">{l.stage}</Badge>
                      {STATUS_LABEL[l.status]} · {new Date(l.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex gap-1">
                      <CopyButton text={l.url} label="Copy" />
                      {l.status !== "submitted" ? (
                        <Button type="button" size="sm" variant="ghost" onClick={() => cancel.mutate(l.id)}>
                          Cancel
                        </Button>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button type="button" onClick={() => void generate()} disabled={create.isPending || (!ownerId && !phoneInput.trim() && !conversationId.trim())}>
                {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                {create.isPending ? "Reading chat & building link…" : "Generate link"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Link (valid 14 days)</Label>
              <div className="flex gap-2">
                <Input readOnly value={result.link.url} onFocus={(e) => e.currentTarget.select()} />
                <CopyButton text={result.link.url} label="Copy" />
              </div>
            </div>

            <PrefillSummary result={result} />

            <div className="space-y-1.5">
              <Label>WhatsApp message to paste</Label>
              <Textarea readOnly value={result.message} rows={7} onFocus={(e) => e.currentTarget.select()} />
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5" /> Nothing is sent automatically — paste it into the chat.
                </p>
                <CopyButton text={result.message} label="Copy message" />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResult(null)}>
                Make another
              </Button>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default SendProfileLinkDialog;
