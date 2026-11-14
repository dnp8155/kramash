import { describe, it, expect, beforeEach } from "vitest";
import {
  setWorkspaceSuspended, isWorkspaceSuspended, assertTableWritable, assertFunctionAllowed,
  functionAllowedWhenSuspended, suspendedError, SUSPENDED_MESSAGE,
} from "@/lib/suspension";

describe("read-only mode for a suspended workspace", () => {
  beforeEach(() => setWorkspaceSuspended(false));

  it("changes nothing while the workspace is active", () => {
    expect(() => assertTableWritable("events")).not.toThrow();
    expect(() => assertFunctionAllowed("recordPayment")).not.toThrow();
  });

  it("refuses saves to business data once suspended, with a message screens can show", () => {
    setWorkspaceSuspended(true);
    expect(isWorkspaceSuspended()).toBe(true);
    for (const table of ["events", "clients", "leads", "financial_transactions", "quotations", "invoices", "team_members", "services", "workspaces", "uploads"]) {
      expect(() => assertTableWritable(table), table).toThrow(SUSPENDED_MESSAGE);
    }
    const err = suspendedError();
    expect(err.data.error).toBe(SUSPENDED_MESSAGE);
    expect(err.status).toBe(403);
  });

  it("still lets the owner ask for help and keep their sign-in working", () => {
    setWorkspaceSuspended(true);
    for (const table of ["support_tickets", "upgrade_requests", "notifications", "push_subscriptions", "user_auth_credentials", "profiles"]) {
      expect(() => assertTableWritable(table), table).not.toThrow();
    }
  });

  it("holds server functions that change things, and allows reading, the assistant and support", () => {
    setWorkspaceSuspended(true);
    for (const fn of ["createEvent", "createLead", "createTeamMember", "createService", "recordPayment", "createInvoiceFromQuotation", "sendClientEmail", "togglePublicLink", "enableClientPortalAccess"]) {
      expect(() => assertFunctionAllowed(fn), fn).toThrow();
    }
    for (const fn of ["getPortalData", "getPublicProfile", "agentChat", "submitUpgradeRequest", "verifyOtp", "adminListWorkspaces"]) {
      expect(functionAllowedWhenSuspended(fn), fn).toBe(true);
    }
  });
});
