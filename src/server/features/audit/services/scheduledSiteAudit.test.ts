import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLatestAuditForProject: vi.fn(),
  getProjectById: vi.fn(),
  getHostedUser: vi.fn(),
  startAudit: vi.fn(),
}));

vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("@/server/features/audit/repositories/AuditRepository", () => ({
  AuditRepository: {
    getLatestAuditForProject: mocks.getLatestAuditForProject,
  },
}));
vi.mock("@/server/features/projects/repositories/ProjectRepository", () => ({
  ProjectRepository: { getProjectById: mocks.getProjectById },
}));
vi.mock("@/server/auth/repositories/AuthRepository", () => ({
  AuthRepository: { getHostedUser: mocks.getHostedUser },
}));
vi.mock("@/server/features/audit/services/AuditService", () => ({
  AuditService: { startAudit: mocks.startAudit },
}));

import { runScheduledSiteAudit } from "./scheduledSiteAudit";

const testEnv = (projectId?: string) => {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- minimal Worker env test double
  return { SCHEDULED_SITE_AUDIT_PROJECT_ID: projectId } as Env;
};

function completedAudit(startedAt = "2026-09-01 04:23:00") {
  return {
    id: "audit_template",
    projectId: "project_1",
    startedByUserId: "user_1",
    startUrl: "https://example.com/",
    status: "completed",
    config: JSON.stringify({ maxPages: 40, lighthouseStrategy: "auto" }),
    startedAt,
  };
}

describe("runScheduledSiteAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLatestAuditForProject.mockResolvedValue(completedAudit());
    mocks.getProjectById.mockResolvedValue({
      id: "project_1",
      organizationId: "org_1",
    });
    mocks.getHostedUser.mockResolvedValue({
      id: "user_1",
      email: "owner@example.com",
    });
    mocks.startAudit.mockResolvedValue({ auditId: "audit_new" });
  });

  it("is a no-op when no project is configured", async () => {
    await expect(runScheduledSiteAudit(testEnv())).resolves.toEqual({
      status: "disabled",
    });
    expect(mocks.getLatestAuditForProject).not.toHaveBeenCalled();
  });

  it("does not overlap or repeat a recent audit", async () => {
    mocks.getLatestAuditForProject.mockResolvedValueOnce({
      ...completedAudit(),
      status: "running",
    });
    await expect(
      runScheduledSiteAudit(
        testEnv("project_1"),
        new Date("2026-09-08T04:23:00Z"),
      ),
    ).resolves.toEqual({ status: "already_running" });

    mocks.getLatestAuditForProject.mockResolvedValueOnce(
      completedAudit("2026-09-07 04:23:00"),
    );
    await expect(
      runScheduledSiteAudit(
        testEnv("project_1"),
        new Date("2026-09-08T04:23:00Z"),
      ),
    ).resolves.toEqual({
      status: "recent_audit",
      auditId: "audit_template",
    });
    expect(mocks.startAudit).not.toHaveBeenCalled();
  });

  it("repeats the latest audit after the guard window", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(
      runScheduledSiteAudit(
        testEnv("project_1"),
        new Date("2026-09-08T04:23:00Z"),
      ),
    ).resolves.toEqual({ status: "started", auditId: "audit_new" });

    expect(mocks.startAudit).toHaveBeenCalledWith({
      actorUserId: "user_1",
      billingCustomer: {
        userId: "user_1",
        userEmail: "owner@example.com",
        organizationId: "org_1",
        projectId: "project_1",
      },
      projectId: "project_1",
      startUrl: "https://example.com/",
      maxPages: 40,
      lighthouseStrategy: "auto",
      limitTier: "self_hosted",
    });
    expect(logSpy).toHaveBeenCalledWith(
      "[cron] Scheduled site audit started",
      expect.objectContaining({ auditId: "audit_new", projectId: "project_1" }),
    );
  });
});
