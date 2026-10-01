import { AuthRepository } from "@/server/auth/repositories/AuthRepository";
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { AuditService } from "@/server/features/audit/services/AuditService";
import { ProjectRepository } from "@/server/features/projects/repositories/ProjectRepository";
import { parseAuditConfig } from "@/server/lib/audit/types";

const RECENT_AUDIT_WINDOW_MS = 6 * 24 * 60 * 60 * 1_000;

function parseStoredTimestamp(value: string) {
  const normalized = /(?:Z|[+-]\d\d:\d\d)$/.test(value)
    ? value
    : `${value.replace(" ", "T")}Z`;
  return new Date(normalized).getTime();
}

/**
 * Repeat the latest audit for one explicitly configured self-hosted project.
 * The latest run is the template, so operators do not need to duplicate a URL,
 * crawl limit, user identity, or Lighthouse strategy in deployment config.
 */
export async function runScheduledSiteAudit(env: Env, now = new Date()) {
  const projectId = env.SCHEDULED_SITE_AUDIT_PROJECT_ID?.trim();
  if (!projectId) return { status: "disabled" as const };

  const latest = await AuditRepository.getLatestAuditForProject(projectId);
  if (!latest) return { status: "no_template" as const };
  if (latest.status === "running")
    return { status: "already_running" as const };

  const latestStartedAt = parseStoredTimestamp(latest.startedAt);
  if (
    Number.isFinite(latestStartedAt) &&
    now.getTime() - latestStartedAt < RECENT_AUDIT_WINDOW_MS
  ) {
    return { status: "recent_audit" as const, auditId: latest.id };
  }

  const [project, actor] = await Promise.all([
    ProjectRepository.getProjectById(projectId),
    AuthRepository.getHostedUser(latest.startedByUserId),
  ]);
  if (!project)
    throw new Error(`Scheduled audit project ${projectId} not found`);
  if (!actor)
    throw new Error(
      `Scheduled audit actor ${latest.startedByUserId} not found`,
    );

  const config = parseAuditConfig(latest.config);
  if (!config)
    throw new Error(`Scheduled audit template ${latest.id} is invalid`);

  const result = await AuditService.startAudit({
    actorUserId: actor.id,
    billingCustomer: {
      userId: actor.id,
      userEmail: actor.email,
      organizationId: project.organizationId,
      projectId,
    },
    projectId,
    startUrl: latest.startUrl,
    maxPages: config.maxPages,
    lighthouseStrategy: config.lighthouseStrategy,
    limitTier: "self_hosted",
  });

  console.log("[cron] Scheduled site audit started", {
    projectId,
    auditId: result.auditId,
    templateAuditId: latest.id,
  });
  return { status: "started" as const, auditId: result.auditId };
}
