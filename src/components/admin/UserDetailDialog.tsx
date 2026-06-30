import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface UserDetailDialogProps {
  profile: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UserDetailDialog = ({ profile, open, onOpenChange }: UserDetailDialogProps) => {
  if (!profile) return null;

  const isBanned = !!profile.banned_at;
  const isSuspended = profile.suspended_until && new Date(profile.suspended_until) > new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Detajet e përdoruesit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback className="bg-primary/20 text-primary text-lg">
                {(profile.display_name || "?")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{profile.display_name || "Pa emër"}</p>
              {isBanned ? (
                <Badge variant="destructive">I bllokuar</Badge>
              ) : isSuspended ? (
                <Badge className="bg-amber-500/20 text-amber-700 border-amber-300">Pezulluar</Badge>
              ) : (
                <Badge variant="secondary">Aktiv</Badge>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">User ID</p>
              <p className="font-mono text-xs break-all">{profile.user_id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Regjistruar</p>
              <p>{format(new Date(profile.created_at), "dd/MM/yyyy HH:mm")}</p>
            </div>
            {profile.banned_at && (
              <div>
                <p className="text-xs text-muted-foreground">Bllokuar më</p>
                <p>{format(new Date(profile.banned_at), "dd/MM/yyyy HH:mm")}</p>
              </div>
            )}
            {profile.suspended_until && (
              <div>
                <p className="text-xs text-muted-foreground">Pezulluar deri</p>
                <p>{format(new Date(profile.suspended_until), "dd/MM/yyyy HH:mm")}</p>
              </div>
            )}
          </div>
          {profile.bio && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Bio</p>
              <p className="text-sm">{profile.bio}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailDialog;
