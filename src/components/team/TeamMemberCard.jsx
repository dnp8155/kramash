import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { TEAM_STATUS } from "@/constants/statusConfig";
import { formatINR } from "@/utils/format";
import { cn } from "@/lib/utils";

export default function TeamMemberCard({ member }) {
  const status = TEAM_STATUS[member.status];
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2">
        <span className={cn("w-2.5 h-2.5 rounded-full", status.dot)} />
        <span className="text-sm font-semibold text-foreground flex-1">{member.name}</span>
        {member.self && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wide">
            Self
          </span>
        )}
        <button className="text-muted-foreground hover:text-foreground" aria-label="Edit">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button className="text-muted-foreground hover:text-destructive" aria-label="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Role</div>
          <div className="text-foreground font-medium">{member.role}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Bookings</div>
          <div className="text-foreground font-medium flex items-center gap-1">
            {member.bookings}
            {member.bookings > 0 && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-border text-center">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Rate</div>
          <div className="text-sm font-medium text-foreground">{formatINR(member.rate)}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Paid</div>
          <div className="text-sm font-medium text-success">{formatINR(member.paid)}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Remaining</div>
          <div className="text-sm font-medium text-[#a67c00]">{formatINR(member.remaining)}</div>
        </div>
      </div>
    </div>
  );
}