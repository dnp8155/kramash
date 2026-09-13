import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import Input from "@/components/common/Input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Globe, Copy, ExternalLink, Check, Loader2 } from "lucide-react";

function slugify(text) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export default function PublicProfileSection() {
  const { workspace, setWorkspace, refresh } = useWorkspace();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [slug, setSlug] = useState("");
  const [about, setAbout] = useState("");
  const [social, setSocial] = useState({ instagram: "", facebook: "", youtube: "", website: "" });
  const [copied, setCopied] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved
  const saveTimerRef = useRef(null);

  useEffect(() => {
    if (!workspace) return;
    setEnabled(!!workspace.public_profile_enabled);
    setSlug(workspace.public_profile_slug || slugify(workspace.name) || "");
    setAbout(workspace.public_profile_about || "");
    try {
      setSocial(workspace.public_profile_social_links ? JSON.parse(workspace.public_profile_social_links) : {});
    } catch { /* default */ }
  }, [workspace]);

  const publicUrl = slug ? `${window.location.origin}/p/${slug}` : "";

  // Save a single field patch to the workspace — optimistic + on blur
  const saveField = async (patch) => {
    // Optimistic: update local workspace immediately
    setWorkspace?.({ ...workspace, ...patch });
    setSaveState("saving");
    try {
      const updated = await base44.entities.Workspace.update(workspace.id, patch);
      setWorkspace?.(updated);
      refresh?.();
      setSaveState("saved");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveState("idle"), 1500);
    } catch (e) {
      // Revert on failure
      setWorkspace?.(workspace);
      setSaveState("idle");
      toast({ title: "Failed to save", description: e?.message, variant: "destructive" });
    }
  };

  const handleBlur = (field, value) => {
    const patch = { [field]: value };
    saveField(patch);
  };

  const handleSocialBlur = (key, value) => {
    const nextSocial = { ...social, [key]: value };
    setSocial(nextSocial);
    saveField({ public_profile_social_links: JSON.stringify(nextSocial) });
  };

  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next); // optimistic
    saveField({ public_profile_enabled: next });
  };

  const copyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      {/* Save indicator */}
      {saveState !== "idle" && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {saveState === "saving" ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
          ) : (
            <><Check className="w-3 h-3 text-success" /> Saved</>
          )}
        </div>
      )}

      {/* Enable toggle */}
      <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/40 border border-border">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Publish Public Profile</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Share a public page with your services, team, and contact info.
          </p>
        </div>
        <button
          onClick={handleToggle}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${enabled ? "bg-success" : "bg-muted-foreground/30"}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      {/* Slug */}
      <div className="space-y-1.5">
        <Label className="text-xs">Profile URL Slug</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">{window.location.origin}/p/</span>
          <Input
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            onBlur={(e) => handleBlur("public_profile_slug", e.target.value || slugify(workspace.name))}
            placeholder="your-business"
            className="flex-1"
          />
        </div>
        {publicUrl && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 min-w-0 px-3 py-1.5 rounded-md bg-muted text-xs text-muted-foreground truncate">{publicUrl}</div>
            <button onClick={copyLink} className="shrink-0 p-2 rounded-md border border-border hover:bg-muted transition-colors" aria-label="Copy link">
              {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            {enabled && (
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 p-2 rounded-md border border-border hover:bg-muted transition-colors" aria-label="Open profile">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* About */}
      <div className="space-y-1.5">
        <Label className="text-xs">About Text</Label>
        <Textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          onBlur={(e) => handleBlur("public_profile_about", e.target.value)}
          placeholder="Tell visitors about your business, experience, and what makes you unique..."
          rows={3}
        />
      </div>

      {/* Social Links */}
      <div className="space-y-2">
        <Label className="text-xs">Social Links</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            value={social.instagram || ""}
            onChange={(e) => setSocial({ ...social, instagram: e.target.value })}
            onBlur={(e) => handleSocialBlur("instagram", e.target.value)}
            placeholder="Instagram URL"
          />
          <Input
            value={social.facebook || ""}
            onChange={(e) => setSocial({ ...social, facebook: e.target.value })}
            onBlur={(e) => handleSocialBlur("facebook", e.target.value)}
            placeholder="Facebook URL"
          />
          <Input
            value={social.youtube || ""}
            onChange={(e) => setSocial({ ...social, youtube: e.target.value })}
            onBlur={(e) => handleSocialBlur("youtube", e.target.value)}
            placeholder="YouTube URL"
          />
          <Input
            value={social.website || ""}
            onChange={(e) => setSocial({ ...social, website: e.target.value })}
            onBlur={(e) => handleSocialBlur("website", e.target.value)}
            placeholder="Website URL"
          />
        </div>
      </div>
    </div>
  );
}