import { useMemo, useState } from "react";
import { Plus, Users, Download } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody } from "@/components/common/Card";
import SearchInput from "@/components/common/SearchInput";
import FilterControl from "@/components/common/FilterControl";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import TeamMemberCard from "@/components/team/TeamMemberCard";
import TeamMemberForm from "@/components/team/TeamMemberForm";
import AvailabilityChecker from "@/components/team/AvailabilityChecker";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useTeamRoles } from "@/hooks/useTeamRoles";
import { useEventTeamAssignments } from "@/hooks/useEventTeamAssignments";
import { useEvents } from "@/hooks/useEvents";
import { usePlan } from "@/lib/PlanContext";
import PlanLimitReached from "@/components/common/PlanLimitReached";
import { toast } from "@/components/ui/use-toast";
import { exportTeamCSV } from "@/utils/exports";

export default function Team() {
  const { members, loading, error, refetch, createMember } = useTeamMembers();
  const { roles } = useTeamRoles();
  const { assignments } = useEventTeamAssignments();
  const { events } = useEvents();
  const { canCreateResource, usage, getLimit } = usePlan();
  const teamLimit = getLimit("max_team_members");
  const teamLimitReached = !canCreateResource("team_members");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);

  const roleName = (m) =>
    roles.find((r) => r.id === m.role_id)?.name || m.profession || "—";

  const assignmentCount = (memberId) =>
    assignments.filter(
      (a) => a.team_member_id === memberId && a.assignment_status === "Assigned"
    ).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      const matchesSearch =
        !q ||
        [m.name, m.phone, m.email, m.profession, roleName(m)].some((f) =>
          (f || "").toLowerCase().includes(q)
        );
      const matchesStatus = statusFilter === "all" || m.status === statusFilter;
      const matchesRole =
        roleFilter === "all" || m.role_id === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [members, roles, search, statusFilter, roleFilter]);

  const handleSave = async (data) => {
    try {
      await createMember(data);
      toast({ title: "Team member added" });
    } catch (e) {
      toast({ title: "Cannot add team member", description: e?.message, variant: "destructive" });
      throw e;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team"
        description="Manage your crew, photographers, and editors."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { exportTeamCSV(filtered, roles); toast({ title: "Team exported" }); }}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button onClick={() => setModalOpen(true)} disabled={teamLimitReached}>
              <Plus className="h-4 w-4" /> Add Member
            </Button>
          </div>
        }
      />

      {teamLimitReached && (
        <PlanLimitReached
          resource="team member"
          currentUsage={usage.team_members}
          limit={teamLimit}
        />
      )}

      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, role…"
            className="flex-1"
          />
          <FilterControl
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={["Active", "Inactive"]}
          />
          <FilterControl
            label="Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={roles.map((r) => r.id)}
            optionLabels={roles.map((r) => r.name)}
          />
        </CardBody>
      </Card>

      {loading ? (
        <Card>
          <LoadingState label="Loading team…" />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={refetch} />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            title={search || statusFilter !== "all" || roleFilter !== "all" ? "No team members found" : "No team members yet"}
            description={
              search || statusFilter !== "all" || roleFilter !== "all"
                ? "Try a different search or filter."
                : "Add your first team member to begin scheduling."
            }
            icon={Users}
            action={
              !search && statusFilter === "all" && roleFilter === "all" ? (
                <Button onClick={() => setModalOpen(true)}>
                  <Plus className="h-4 w-4" /> Add Member
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => (
            <TeamMemberCard
              key={m.id}
              member={m}
              roleName={roleName(m)}
              assignmentCount={assignmentCount(m.id)}
            />
          ))}
        </div>
      )}

      <AvailabilityChecker
        members={members}
        assignments={assignments}
        events={events}
      />

      <TeamMemberForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        roles={roles}
        onSave={handleSave}
      />
    </div>
  );
}