import { Link } from "react-router-dom";
import { Mail, Phone, ArrowRight } from "lucide-react";
import Card, { CardBody } from "@/components/common/Card";
import StatusBadge from "@/components/common/StatusBadge";
import { initials } from "@/utils/format";

export default function TeamMemberCard({ member, roleName, assignmentCount }) {
  return (
    <Link to={`/team/${member.id}`} className="block h-full">
      <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
        <CardBody className="flex flex-1 flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
              {initials(member.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {member.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {roleName || member.profession || "—"}
              </p>
            </div>
            <StatusBadge status={member.status} />
          </div>
          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {member.email && (
              <p className="flex items-center gap-2 truncate">
                <Mail className="h-4 w-4 shrink-0" /> {member.email}
              </p>
            )}
            {member.phone && (
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" /> {member.phone}
              </p>
            )}
          </div>
          <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">
              {assignmentCount} event{assignmentCount === 1 ? "" : "s"} assigned
            </span>
            <span className="flex items-center gap-1 text-sm font-medium text-primary">
              View <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}