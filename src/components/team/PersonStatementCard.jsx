import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Card, { CardBody } from "@/components/common/Card";
import SelfBadge from "@/components/common/SelfBadge";
import { formatCurrency, initials } from "@/utils/format";

// Consolidated financial statement card for a single person across both
// Team/Role assignments and Service Provider assignments.
//
// Shows: Due Now (overdue from completed events), Roles Total, Services Total
// (hidden if person has no service assignments), Total Paid, and Future Amount Due.
// SELF/Owner cards show the amounts but are marked as internal share, not
// external payable.
//
// Responsive: stacks cleanly on 320px+, no horizontal overflow, amounts wrap
// correctly. Uses existing Kramashah design tokens.
export default function PersonStatementCard({ statement }) {
  const {
    member,
    isSelf,
    rolesTotal,
    servicesTotal,
    totalObligation,
    totalPaid,
    futureDue,
    dueNow,
    teamAssignmentCount,
    serviceAssignmentCount,
    hasServiceAssignments,
  } = statement;

  const hasActivity = totalObligation > 0 || totalPaid > 0;

  return (
    <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
      <CardBody className="flex flex-1 flex-col gap-4">
        {/* Header: avatar + name + SELF badge */}
        <div className="flex items-center gap-3">
          <Link
            to={`/team/${member.id}`}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initials(member.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground hover:text-primary">
                {member.name}
                {isSelf && <SelfBadge className="ml-1.5" />}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {teamAssignmentCount > 0 && `${teamAssignmentCount} role${teamAssignmentCount === 1 ? "" : "s"}`}
                {teamAssignmentCount > 0 && serviceAssignmentCount > 0 && " · "}
                {serviceAssignmentCount > 0 && `${serviceAssignmentCount} service${serviceAssignmentCount === 1 ? "" : "s"}`}
                {teamAssignmentCount === 0 && serviceAssignmentCount === 0 && "No assignments"}
              </p>
            </div>
          </Link>
        </div>

        {/* Due Now — prominent, top of statement */}
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">
            Due Now (Till Now)
          </p>
          <p
            className={`mt-0.5 text-2xl font-bold ${
              dueNow > 0 ? "text-destructive" : "text-foreground"
            }`}
          >
            {isSelf ? "—" : formatCurrency(dueNow)}
          </p>
        </div>

        {/* Breakdown rows */}
        <div className="flex flex-col gap-2.5 border-t border-border pt-3">
          <StatementRow
            label="Team / Roles Total"
            value={formatCurrency(rolesTotal)}
          />
          {hasServiceAssignments && (
            <StatementRow
              label="Services Total"
              value={formatCurrency(servicesTotal)}
            />
          )}
          <StatementRow
            label="Total Paid"
            value={isSelf ? "—" : formatCurrency(totalPaid)}
            valueClass="text-success"
          />
          <div className="border-t border-border pt-2.5">
            <StatementRow
              label="Future Amount Due"
              value={isSelf ? "—" : formatCurrency(futureDue)}
              valueClass={
                futureDue > 0 ? "text-warning font-bold" : "text-foreground font-bold"
              }
            />
          </div>
        </div>

        {/* Footer link */}
        {hasActivity && (
          <Link
            to={`/team/${member.id}`}
            className="mt-auto flex items-center justify-between border-t border-border pt-3 text-sm font-medium text-primary"
          >
            <span>View Details</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </CardBody>
    </Card>
  );
}

function StatementRow({ label, value, valueClass = "text-foreground" }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}