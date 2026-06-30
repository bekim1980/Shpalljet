import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateReport } from "@/hooks/useReports";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const REASONS = [
  { value: "fake", label: "Artikull i rremë" },
  { value: "scam", label: "Mashtrim" },
  { value: "inappropriate", label: "Përmbajtje e papërshtatshme" },
  { value: "stolen", label: "Mall i vjedhur" },
  { value: "other", label: "Tjetër" },
];

interface ReportDialogProps {
  reportedType: "product" | "user";
  reportedId: string;
  triggerVariant?: "icon" | "button";
}

const ReportDialog = ({ reportedType, reportedId, triggerVariant = "icon" }: ReportDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { mutate: createReport, isPending } = useCreateReport();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!reason) return;
    createReport(
      { reportedType, reportedId, reason, description },
      { onSuccess: () => { setOpen(false); setReason(""); setDescription(""); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerVariant === "icon" ? (
          <button className="p-1.5 rounded-full hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-destructive">
            <Flag className="h-4 w-4" />
          </button>
        ) : (
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
            <Flag className="h-4 w-4 mr-1" />
            Raporto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            Raporto {reportedType === "product" ? "Artikullin" : "Përdoruesin"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Arsyeja *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Zgjidhni arsyejen" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Përshkrimi</Label>
            <Textarea
              placeholder="Jepni detaje shtesë..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
            />
          </div>
          <Button variant="gold" className="w-full" onClick={handleSubmit} disabled={!reason || isPending}>
            {isPending ? "Duke dërguar..." : "Dërgo Raportin"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
