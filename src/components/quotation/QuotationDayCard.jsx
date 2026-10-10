import { useState } from "react";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Button from "@/components/common/Button";
import { formatMoney } from "@/utils/format";
import DateChip from "@/components/common/DateChip";
import { lineTotal, formatDateChip, isRoleOnlyItem } from "@/lib/quotationCalc";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import { getMemberTypes } from "@/lib/memberTypeService";
import { Trash2, Plus, Copy, Users, Package, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";

// Members whose main role matches the slot come first; everyone else follows under a heading, so a
// person can fill a role that is not their main one (e.g. a Reg Photographer in a Hybrid Photographer slot).
function MemberOptions({ members, roleId, roleName, label = (m) => m.name }) {
  const t = useT();
  const opt = (m) => <option key={m.id} value={m.id}>{label(m)}</option>;
  if (!roleId) return members.map(opt);
  const isMain = (m) => m.role_id === roleId || (!!roleName && m.profession === roleName);
  const others = members.filter((m) => !isMain(m));
  return (
    <>
      {members.filter(isMain).map(opt)}
      {others.length > 0 && <optgroup label={t("Other team members")}>{others.map(opt)}</optgroup>}
    </>
  );
}

export default function QuotationDayCard({
  date, phaseTitle, items,
  onUpdatePhaseTitle, onAddTeam, onAddService, onAddCustom, onAssignMember,
  onUpdateItem, onRemoveItem, onDuplicate,
  teamMembers, roles, services, currency, readOnly, workspace,
  isUncategorized, includedDates = [], itemErrors = {}
}) {
  const t = useT();
  const [addRoleId, setAddRoleId] = useState("");
  const [addTeamId, setAddTeamId] = useState("");
  const [addServiceId, setAddServiceId] = useState("");
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const memberTypes = getMemberTypes(workspace);

  const teamItems = items.filter((it) => it.item_type === "team");
  const serviceItems = items.filter((it) => it.item_type === "service");
  const customItems = items.filter((it) => it.item_type === "custom" || (!it.item_type && !it.team_member_id));
  const otherItems = items.filter((it) => it.item_type === "role");

  const dayTotal = items.reduce((s, it) => s + lineTotal(it), 0);

  // The same person can't be on the same day (or on the general list) twice.
  const duplicateMember = addTeamId ? teamMembers.find((m) => m.id === addTeamId && teamItems.some((it) => it.team_member_id === addTeamId)) : null;
  // Only the role is required — the member can be picked now, later on the row, or left open.
  const handleAddTeam = () => { if (!addRoleId || duplicateMember) return; onAddTeam(date, addRoleId, addTeamId); setAddRoleId(""); setAddTeamId(""); };
  const handleRoleChange = (roleId) => { setAddRoleId(roleId); setAddTeamId(""); };
  const handleAddService = () => { if (!addServiceId) return; onAddService(date, addServiceId); setAddServiceId(""); };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-3 sm:p-4 bg-muted/30 border-b border-border flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[140px]">
          {isUncategorized
            ? <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 text-primary px-3 py-1 text-xs font-medium">{t("General")}</span>
            : <DateChip date={date} />}
        </div>
        <input
          value={phaseTitle || ""}
          onChange={(e) => onUpdatePhaseTitle(date, e.target.value)}
          disabled={readOnly}
          placeholder={t("Function / phase title")}
          className="flex-1 min-w-[160px] bg-transparent text-sm font-medium focus:outline-none placeholder:text-muted-foreground/50"
        />
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground tabular-nums">{formatMoney(dayTotal, currency)}</span>
          {!readOnly && !isUncategorized && (
            <Button size="sm" variant="ghost" onClick={() => setShowDuplicate(!showDuplicate)}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {showDuplicate && !readOnly && (
        <DuplicateDayInline
          sourceDate={date}
          includedDates={includedDates}
          onDuplicate={onDuplicate}
          onClose={() => setShowDuplicate(false)}
        />
      )}

      <div className="p-3 sm:p-4 space-y-4">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Team")}</span>
          </div>
          {teamItems.length === 0 && otherItems.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 py-1">{t("No team assigned for this day.")}</p>
          ) : (
            <div className="space-y-2">
              {[...teamItems, ...otherItems].map((it) => (
                <ItemRow
                  key={it._idx ?? it.id ?? Math.random()}
                  item={it}
                  onUpdate={(field, val) => onUpdateItem(it._idx, field, val)}
                  onRemove={() => onRemoveItem(it._idx)}
                  currency={currency}
                  readOnly={readOnly}
                  showMemberType={it.item_type === "team"}
                  memberTypes={memberTypes}
                  teamMembers={teamMembers}
                  onAssignMember={(memberId) => onAssignMember?.(it._idx, memberId)}
                  hasError={!!itemErrors[it._idx]?.name}
                />
              ))}
            </div>
          )}
          {!readOnly && (
            <div className="flex gap-2 mt-2">
              <Select value={addRoleId} onChange={(e) => handleRoleChange(e.target.value)} className="flex-1 h-8 text-xs">
                <option value="">{t("— Select role —")}</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
              <Select value={addTeamId} onChange={(e) => setAddTeamId(e.target.value)} className={cn("flex-1 h-8 text-xs", duplicateMember && "[&_select]:border-destructive")} disabled={!addRoleId}>
                <option value="">{t("— Member (optional) —")}</option>
                <MemberOptions members={teamMembers} roleId={addRoleId} label={(m) => `${m.name}${teamItems.some((it) => it.team_member_id === m.id) ? ` (${t("already added")})` : ""}`} />
              </Select>
              <Button size="sm" variant="outline" onClick={handleAddTeam} disabled={!addRoleId || !!duplicateMember}>
                <Plus className="w-3 h-3" />{t("Add")}
              </Button>
            </div>
          )}
          {!readOnly && duplicateMember && (
            <p className="text-[11px] text-destructive mt-1">{duplicateMember.name} {isUncategorized ? t("is already added to this quotation.") : t("is already added on this day.")}</p>
          )}
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Package className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Services")}</span>
          </div>
          {serviceItems.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 py-1">{t("No services added for this day.")}</p>
          ) : (
            <div className="space-y-2">
              {serviceItems.map((it) => (
                <ItemRow
                  key={it._idx ?? it.id ?? Math.random()}
                  item={it}
                  onUpdate={(field, val) => onUpdateItem(it._idx, field, val)}
                  onRemove={() => onRemoveItem(it._idx)}
                  currency={currency}
                  readOnly={readOnly}
                  showAddon
                  hasError={!!itemErrors[it._idx]?.name}
                />
              ))}
            </div>
          )}
          {!readOnly && (
            <div className="flex gap-2 mt-2">
              <Select value={addServiceId} onChange={(e) => setAddServiceId(e.target.value)} className="flex-1 h-8 text-xs">
                <option value="">{t("— Add service —")}</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              <Button size="sm" variant="outline" onClick={handleAddService} disabled={!addServiceId}>
                <Plus className="w-3 h-3" />{t("Add")}
              </Button>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Custom Items")}</span>
          </div>
          {customItems.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 py-1">{t("No custom items for this day.")}</p>
          ) : (
            <div className="space-y-2">
              {customItems.map((it) => (
                <ItemRow
                  key={it._idx ?? it.id ?? Math.random()}
                  item={it}
                  onUpdate={(field, val) => onUpdateItem(it._idx, field, val)}
                  onRemove={() => onRemoveItem(it._idx)}
                  currency={currency}
                  readOnly={readOnly}
                  showDescription
                  hasError={!!itemErrors[it._idx]?.name}
                />
              ))}
            </div>
          )}
          {!readOnly && (
            <Button size="sm" variant="ghost" onClick={() => setShowCustom(true)} className="mt-2">
              <Plus className="w-3 h-3" />{t("Add Custom Item")}
            </Button>
          )}
        </div>
      </div>
      <CustomItemDialog
        open={showCustom}
        roles={roles} teamMembers={teamMembers} services={services}
        onClose={() => setShowCustom(false)}
        onAdd={(spec) => {
          // Existing role / service keep their saved rate; typed ones are added as custom lines.
          if (spec.kind === "team" && spec.roleId) onAddTeam(date, spec.roleId, spec.memberId, spec.name);
          else if (spec.kind === "service" && spec.serviceId) onAddService(date, spec.serviceId);
          else onAddCustom(date, spec);
          setShowCustom(false);
        }}
      />
    </div>
  );
}

// Asks what a custom line is, so the PDF lists it as a team member, a service, or a plain item.
const NEW = "__new";

// Asks what a custom line is — team member, service or other — so the PDF lists it under the right heading.
// Roles, members and services can be picked from the saved ones or typed fresh (kept on this quotation only).
function CustomItemDialog({ open, roles = [], teamMembers = [], services = [], onClose, onAdd }) {
  const t = useT();
  const [kind, setKind] = useState("team");
  const [roleSel, setRoleSel] = useState("");
  const [memberSel, setMemberSel] = useState("");
  const [serviceSel, setServiceSel] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const reset = () => { setKind("team"); setRoleSel(""); setMemberSel(""); setServiceSel(""); setName(""); setRole(""); };
  const close = () => { reset(); onClose(); };
  const KINDS = [
    { id: "team", label: t("Team member"), hint: t("Listed under Team on the PDF") },
    { id: "service", label: t("Service"), hint: t("Listed under Services on the PDF") },
    { id: "custom", label: t("Other item"), hint: t("A plain line item") },
  ];
  const newRole = roleSel === NEW;
  const newMember = memberSel === NEW;
  const newService = serviceSel === NEW;

  let valid;
  if (kind === "team") valid = newRole ? !!role.trim() : !!roleSel;
  else if (kind === "service") valid = newService ? !!name.trim() : !!serviceSel;
  else valid = !!name.trim();

  const submit = () => {
    if (!valid) return;
    if (kind === "team") {
      if (newRole) onAdd({ kind, role, name });
      else onAdd({ kind, roleId: roleSel, memberId: newMember ? "" : memberSel, name: newMember ? name.trim() : "" });
    } else if (kind === "service") {
      onAdd(newService ? { kind, name } : { kind, serviceId: serviceSel });
    } else onAdd({ kind, name });
    reset();
  };
  const label = "block text-xs font-medium text-muted-foreground mb-1";
  return (
    <AppDialog open={open} onOpenChange={(o) => !o && close()}>
      <AppDialogContent maxWidth="max-w-md">
        <AppDialogHeader><AppDialogTitle>{t("Add custom item")}</AppDialogTitle></AppDialogHeader>
        <AppDialogBody className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {KINDS.map((k) => (
              <button key={k.id} type="button" onClick={() => setKind(k.id)}
                className={cn("rounded-lg border p-2 text-left transition-colors", kind === k.id ? "border-primary bg-primary/5" : "border-border sm:hover:border-primary/40")}>
                <div className="text-sm font-medium">{k.label}</div>
                <div className="text-[10px] text-muted-foreground leading-snug mt-0.5">{k.hint}</div>
              </button>
            ))}
          </div>

          {kind === "team" && (
            <>
              <div>
                <label className={label}>{t("Role (shown on the PDF)")}</label>
                <Select value={roleSel} onChange={(e) => { setRoleSel(e.target.value); setMemberSel(""); }}>
                  <option value="">{t("— Select role —")}</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  <option value={NEW}>{t("+ New role…")}</option>
                </Select>
                {newRole && <Input className="mt-2" value={role} onChange={(e) => setRole(e.target.value)} placeholder={t("e.g. Candid Photographer")} />}
              </div>
              {roleSel && (
                <div>
                  <label className={label}>{t("Member (optional, not shown on the PDF)")}</label>
                  {newRole ? (
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("e.g. Amit")} />
                  ) : (
                    <>
                      <Select value={memberSel} onChange={(e) => setMemberSel(e.target.value)}>
                        <option value="">{t("Decide later")}</option>
                        <MemberOptions members={teamMembers} roleId={roleSel} />
                        <option value={NEW}>{t("+ New member…")}</option>
                      </Select>
                      {newMember && <Input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("e.g. Amit")} />}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {kind === "service" && (
            <div>
              <label className={label}>{t("Service")}</label>
              <Select value={serviceSel} onChange={(e) => setServiceSel(e.target.value)}>
                <option value="">{t("— Select service —")}</option>
                {services.map((sv) => <option key={sv.id} value={sv.id}>{sv.name}</option>)}
                <option value={NEW}>{t("+ New service…")}</option>
              </Select>
              {newService && <Input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("e.g. Drone coverage")} />}
            </div>
          )}

          {kind === "custom" && (
            <div>
              <label className={label}>{t("Item name")}</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("e.g. Travel")} />
            </div>
          )}
        </AppDialogBody>
        <AppDialogFooter>
          <Button variant="outline" onClick={close}>{t("Cancel")}</Button>
          <Button variant="dark" onClick={submit} disabled={!valid}>{t("Add")}</Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}

function ItemRow({ item, onUpdate, onRemove, currency, readOnly, showMemberType, memberTypes = [], teamMembers = [], onAssignMember, showAddon, showDescription, hasError }) {
  const t = useT();
  const isTeam = item.item_type === "team";
  const roleOnly = isRoleOnlyItem(item);
  const roleName = item.description || item.name;
  const personName = item.team_member_name_snapshot || "";
  return (
    <div className={cn("bg-muted/20 border rounded-lg p-2.5 space-y-2", hasError ? "border-destructive bg-destructive/5" : "border-border/60")}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {showDescription ? (
            <input
              value={item.name || ""}
              onChange={(e) => onUpdate("name", e.target.value)}
              disabled={readOnly}
              placeholder={t("Description")}
              className={cn("w-full text-sm font-medium bg-transparent focus:outline-none placeholder:text-muted-foreground/50", hasError && "text-destructive placeholder:text-destructive/40")}
            />
          ) : isTeam ? (
            <>
              <span className="text-sm font-medium text-foreground block truncate">{roleName || t("Unnamed")}</span>
              {personName ? (
                <span className="text-xs text-muted-foreground block truncate">{personName}</span>
              ) : (
                <span className="text-[11px] text-muted-foreground/70 block">{t("Member not selected yet")}</span>
              )}
            </>
          ) : (
            <span className="text-sm font-medium text-foreground block truncate">{item.name || t("Unnamed")}</span>
          )}
          {item.description && !showDescription && !isTeam && (
            <span className="text-xs text-muted-foreground block truncate">{item.description}</span>
          )}
          {showDescription && (
            <input
              value={item.description || ""}
              onChange={(e) => onUpdate("description", e.target.value)}
              disabled={readOnly}
              placeholder={t("Notes (optional)")}
              className="w-full text-xs text-muted-foreground bg-transparent focus:outline-none placeholder:text-muted-foreground/50 mt-0.5"
            />
          )}
        </div>
        {!readOnly && (
          <button onClick={onRemove} className="text-muted-foreground sm:hover:text-destructive p-1 shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {roleOnly && !readOnly && teamMembers.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground uppercase">{t("Member")}</span>
            <Select value="" onChange={(e) => e.target.value && onAssignMember?.(e.target.value)} className="h-7 text-xs py-0">
              <option value="">{t("Select later")}</option>
              <MemberOptions members={teamMembers} roleId={item.reference_id} roleName={roleName} />
            </Select>
          </div>
        )}
        {showMemberType && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground uppercase">{t("Side")}</span>
            <Select value={item.member_type || ""} onChange={(e) => onUpdate("member_type", e.target.value)} disabled={readOnly} className="h-7 text-xs py-0">
              <option value="">—</option>
              {memberTypes.map((mt) => <option key={mt.id} value={mt.title}>{mt.title}</option>)}
            </Select>
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground uppercase">{t("Qty")}</span>
          <Input type="number" min="0" value={item.quantity} onChange={(e) => onUpdate("quantity", Number(e.target.value))} disabled={readOnly} className="h-7 w-14 text-xs text-right py-0" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground uppercase">{t("Rate")}</span>
          <Input type="number" min="0" value={item.unit_rate} onChange={(e) => onUpdate("unit_rate", Number(e.target.value))} disabled={readOnly} className="h-7 w-24 text-xs text-right py-0" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground uppercase">{t("Amount")}</span>
          <span className="text-sm font-medium tabular-nums h-7 flex items-center">{formatMoney(lineTotal(item), currency)}</span>
        </div>
        {showAddon && !readOnly && (
          <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer ml-auto">
            <input type="checkbox" checked={!!item.is_addon} onChange={(e) => onUpdate("is_addon", e.target.checked)} className="rounded" />
            {t("Add-on")}
          </label>
        )}
      </div>
    </div>
  );
}

function DuplicateDayInline({ sourceDate, includedDates, onDuplicate, onClose }) {
  const t = useT();
  const [targets, setTargets] = useState([]);

  const toggleTarget = (d) => {
    if (targets.includes(d)) setTargets(targets.filter((x) => x !== d));
    else setTargets([...targets, d]);
  };

  const available = includedDates.filter((d) => d !== sourceDate);

  return (
    <div className="p-3 bg-muted/20 border-b border-border space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{t("Duplicate to target dates")}:</span>
        <button onClick={onClose} className="text-xs text-muted-foreground sm:hover:text-foreground">{t("Cancel")}</button>
      </div>
      {available.length === 0 ? (
        <span className="text-xs text-muted-foreground/60">{t("No other included dates available. Add more dates or include excluded ones.")}</span>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {available.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleTarget(d)}
                className={cn(
                  "px-2 py-1 rounded-lg text-xs font-medium border transition-colors",
                  targets.includes(d) ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border sm:hover:border-primary/40"
                )}
              >
                {formatDateChip(d)}
              </button>
            ))}
          </div>
          {targets.length > 0 && (
            <Button size="sm" variant="dark" onClick={() => { onDuplicate(sourceDate, targets); onClose(); }}>
              <Copy className="w-3 h-3" /> {t("Duplicate to")} {targets.length} {targets.length > 1 ? t("dates") : t("date")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}