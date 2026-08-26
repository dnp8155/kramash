import { useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Pencil, Check, Camera, Loader2 } from "lucide-react";

export default function ProfileSection() {
  const { user, checkUserAuth } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.full_name || "");
  const [savingName, setSavingName] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileRef = useRef(null);

  const profileImage = user?.data?.profile_image || user?.profile_image;

  const onImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Please choose an image file." }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Image too large (max 5MB)." }); return; }
    setUploadingImg(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ profile_image: file_url });
      await checkUserAuth();
      toast({ title: "Profile photo updated" });
    } catch (err) {
      toast({ title: "Upload failed", description: err?.message, variant: "destructive" });
    } finally {
      setUploadingImg(false);
    }
  };

  const removeImage = async () => {
    try {
      await base44.auth.updateMe({ profile_image: "" });
      await checkUserAuth();
      toast({ title: "Profile photo removed" });
    } catch (err) {
      toast({ title: "Failed to remove photo", description: err?.message, variant: "destructive" });
    }
  };

  const saveName = async () => {
    if (!name.trim()) { toast({ title: "Name cannot be empty." }); return; }
    setSavingName(true);
    try {
      await base44.auth.updateMe({ full_name: name.trim() });
      await checkUserAuth();
      setEditing(false);
      toast({ title: "Profile updated" });
    } catch (err) {
      toast({ title: "Update failed", description: err?.message, variant: "destructive" });
    } finally {
      setSavingName(false);
    }
  };

  const cancelEdit = () => {
    setName(user?.full_name || "");
    setEditing(false);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Profile</h3>
      </div>

      {/* Avatar with upload */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative group shrink-0">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-xl overflow-hidden">
            {profileImage
              ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              : <span>{(user?.full_name || user?.email || "K").charAt(0).toUpperCase()}</span>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onImage} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploadingImg}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm"
            aria-label="Change profile photo"
            title="Change photo"
          >
            {uploadingImg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate">{user?.full_name || "User"}</div>
          <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          {profileImage && (
            <button
              onClick={removeImage}
              className="text-xs text-muted-foreground hover:text-destructive mt-1 transition-colors"
            >
              Remove photo
            </button>
          )}
        </div>
      </div>

      <div className="space-y-0">
        {/* Full Name — editable */}
        <div className="flex items-center justify-between py-3 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground shrink-0">Full Name</span>
          {editing ? (
            <div className="flex items-center gap-2 ml-3 flex-1 justify-end">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="flex-1 max-w-[180px] h-8 px-2 text-sm bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              <button
                onClick={saveName}
                disabled={savingName}
                className="w-8 h-8 rounded-md bg-success/10 text-success flex items-center justify-center hover:bg-success/20 transition-colors shrink-0"
                aria-label="Save name"
                title="Save"
              >
                {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={cancelEdit}
                className="w-8 h-8 rounded-md border border-border text-muted-foreground flex items-center justify-center hover:bg-muted transition-colors shrink-0"
                aria-label="Cancel"
                title="Cancel"
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <span className="text-sm text-foreground truncate ml-3">{user?.full_name || "—"}</span>
              <button
                onClick={() => { setName(user?.full_name || ""); setEditing(true); }}
                className="ml-2 w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors shrink-0"
                aria-label="Edit name"
                title="Edit name"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        <Row label="Email" value={user?.email || "—"} />
        <Row label="Role" value={user?.role || "—"} />
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground truncate ml-3">{value}</span>
    </div>
  );
}