import { describe, expect, it } from "vitest";
import { parseWorkers } from "../schemas.js";
import { MatrixScheduler, type SchedulerOptions } from "../scheduler.js";
import type { AllocationRequest, OrchestrationConfig, RoleDefinition, Worker } from "../types.js";

const fixedNow = new Date("2026-06-23T12:00:00.000Z");

function worker(overrides: Partial<Worker> & Pick<Worker, "id" | "provider" | "family">): Worker {
  return {
    tier: "frontier",
    capabilities: ["repo_edit", "coding", "code_review", "validation"],
    tools: ["git", "filesystem", "shell"],
    maxConcurrentTasks: 1,
    costClass: "medium",
    workspacePolicy: "isolated_worktree",
    ...overrides,
  };
}

const roles: RoleDefinition[] = [
  {
    id: "seniorImplementer",
    requiredCapabilities: ["repo_edit", "coding"],
    requiredTools: ["git", "filesystem"],
    preferredTiers: ["frontier"],
  },
  {
    id: "independentReviewer",
    requiredCapabilities: ["code_review"],
    requiredTools: ["filesystem"],
    familyConstraint: "opposite_of_implementer",
    preferredCostClasses: ["low", "medium"],
  },
  {
    id: "qaGate",
    requiredCapabilities: ["validation"],
    requiredTools: ["shell"],
    preferredCostClasses: ["near_zero", "low"],
  },
  {
    id: "missingSpecialist",
    requiredCapabilities: ["rare_capability"],
    requiredTools: [],
  },
];

function config(workers: Worker[], extra: Partial<OrchestrationConfig> = {}): OrchestrationConfig {
  return {
    workers,
    roles,
    coordinatorTemplates: [
      {
        id: "standardImplementation",
        purpose: "feature work",
        requiredRoles: ["seniorImplementer", "independentReviewer", "qaGate"],
        optionalRoles: [],
      },
    ],
    quotas: { providers: {}, families: {} },
    ...extra,
  };
}

function request(overrides: Partial<AllocationRequest> = {}): AllocationRequest {
  return {
    taskId: "task-1",
    coordinatorId: "coord-1",
    requiredRoles: ["seniorImplementer"],
    optionalRoles: [],
    priority: "normal",
    leaseDurationMs: 60 * 60 * 1000,
    ...overrides,
  };
}

function scheduler(cfg: OrchestrationConfig, opts: Omit<SchedulerOptions, "now"> = {}): MatrixScheduler {
  return new MatrixScheduler(cfg, { now: () => fixedNow, ...opts });
}

describe("orchestration schemas", () => {
  it("validates worker config and reports malformed workers", () => {
    expect(parseWorkers({
      workers: {
        localQa: {
          provider: "ollama",
          family: "local",
          tier: "local",
          capabilities: ["validation"],
        },
      },
    })[0]).toMatchObject({
      id: "localQa",
      tools: [],
      maxConcurrentTasks: 1,
      costClass: "medium",
      workspacePolicy: "shared",
    });

    expect(() => parseWorkers({ workers: { bad: { family: "openai" } } })).toThrow();
  });
});

describe("MatrixScheduler", () => {
  it("allocates one task to one qualified worker", () => {
    const s = scheduler(config([worker({ id: "codexSenior", provider: "openai", family: "openai" })]));
    const result = s.requestAllocation(request());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.allocation.leases).toHaveLength(1);
    expect(result.allocation.leases[0]).toMatchObject({
      workerId: "codexSenior",
      taskId: "task-1",
      role: "seniorImplementer",
      state: "running",
    });
    expect(s.validateLeaseForWorker("codexSenior", result.allocation.leases[0].leaseId, "task-1", "coord-1")).toEqual({ ok: true });
  });

  it("queues the second task when one max-concurrency worker is busy", () => {
    const s = scheduler(config([worker({ id: "codexSenior", provider: "openai", family: "openai" })]));
    expect(s.requestAllocation(request({ taskId: "task-1" })).ok).toBe(true);

    const second = s.requestAllocation(request({ taskId: "task-2", coordinatorId: "coord-2" }));

    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.queueItem).toMatchObject({
      taskId: "task-2",
      state: "blocked_resource",
      missingRoles: ["seniorImplementer"],
      resumeOn: ["worker_released", "quota_available", "lease_expired"],
    });
  });

  it("uses maxConcurrentTasks before blocking", () => {
    const s = scheduler(config([
      worker({ id: "localQa", provider: "ollama", family: "local", maxConcurrentTasks: 2 }),
    ]));

    expect(s.requestAllocation(request({ taskId: "a" })).ok).toBe(true);
    expect(s.requestAllocation(request({ taskId: "b", coordinatorId: "coord-b" })).ok).toBe(true);
    expect(s.requestAllocation(request({ taskId: "c", coordinatorId: "coord-c" })).ok).toBe(false);
  });

  it("does not allocate partial required teams when a role is unavailable", () => {
    const s = scheduler(config([worker({ id: "codexSenior", provider: "openai", family: "openai" })]));
    const result = s.requestAllocation(request({ requiredRoles: ["seniorImplementer", "missingSpecialist"] }));

    expect(result.ok).toBe(false);
    expect(s.listLeases()).toHaveLength(0);
  });

  it("selects an opposite-family reviewer after an implementer", () => {
    const s = scheduler(config([
      worker({ id: "codexSenior", provider: "openai", family: "openai", costClass: "high" }),
      worker({ id: "codexReviewer", provider: "openai", family: "openai", costClass: "low" }),
      worker({ id: "haikuReviewer", provider: "anthropic", family: "anthropic", costClass: "low" }),
      worker({ id: "localQa", provider: "ollama", family: "local", tier: "local", costClass: "near_zero" }),
    ]));
    const result = s.requestAllocation(request({
      requiredRoles: ["seniorImplementer", "independentReviewer", "qaGate"],
    }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.allocation.leases.find((lease) => lease.role === "independentReviewer")?.workerId).toBe("haikuReviewer");
    expect(result.reviewPolicy.explanations[0]).toMatchObject({
      role: "independentReviewer",
      decision: "opposite_family_selected",
      selectedWorkerId: "haikuReviewer",
      sameFamilyReviewerFallback: false,
    });
  });

  it("blocks same-family-only reviewers when fallback is forbidden", () => {
    const s = scheduler(config([
      worker({
        id: "openaiImplementer",
        provider: "openai",
        family: "openai",
        capabilities: ["repo_edit", "coding"],
        tools: ["git", "filesystem"],
      }),
      worker({
        id: "openaiReviewer",
        provider: "openai",
        family: "openai",
        capabilities: ["code_review"],
        tools: ["filesystem"],
      }),
    ]));
    const result = s.requestAllocation(request({
      requiredRoles: ["seniorImplementer", "independentReviewer"],
    }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.queueItem.missingRoles).toEqual(["independentReviewer"]);
    expect(result.reviewPolicy.explanations[0]).toMatchObject({
      role: "independentReviewer",
      decision: "same_family_fallback_forbidden",
      sameFamilyReviewerFallback: false,
      implementerFamilies: ["openai"],
      sameFamilyCandidateIds: ["openaiReviewer"],
    });
    expect(s.listLeases()).toHaveLength(0);
  });

  it("uses explicit same-family reviewer fallback when no opposite-family reviewer is qualified", () => {
    const s = scheduler(config([
      worker({
        id: "openaiImplementer",
        provider: "openai",
        family: "openai",
        capabilities: ["repo_edit", "coding"],
        tools: ["git", "filesystem"],
      }),
      worker({
        id: "openaiReviewer",
        provider: "openai",
        family: "openai",
        capabilities: ["code_review"],
        tools: ["filesystem"],
      }),
    ]), { reviewPolicy: { sameFamilyReviewerFallback: true } });
    const result = s.requestAllocation(request({
      requiredRoles: ["seniorImplementer", "independentReviewer"],
    }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.allocation.leases.find((lease) => lease.role === "independentReviewer")?.workerId).toBe("openaiReviewer");
    expect(result.reviewPolicy.explanations[0]).toMatchObject({
      role: "independentReviewer",
      decision: "same_family_fallback_used",
      sameFamilyReviewerFallback: true,
      selectedWorkerId: "openaiReviewer",
    });
  });

  it("prefers an opposite-family reviewer even when same-family fallback is enabled", () => {
    const s = scheduler(config([
      worker({
        id: "openaiImplementer",
        provider: "openai",
        family: "openai",
        capabilities: ["repo_edit", "coding"],
        tools: ["git", "filesystem"],
      }),
      worker({
        id: "openaiReviewer",
        provider: "openai",
        family: "openai",
        capabilities: ["code_review"],
        tools: ["filesystem"],
        costClass: "near_zero",
      }),
      worker({
        id: "anthropicReviewer",
        provider: "anthropic",
        family: "anthropic",
        capabilities: ["code_review"],
        tools: ["filesystem"],
        costClass: "medium",
      }),
    ]), { reviewPolicy: { sameFamilyReviewerFallback: true } });
    const result = s.requestAllocation(request({
      requiredRoles: ["seniorImplementer", "independentReviewer"],
    }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.allocation.leases.find((lease) => lease.role === "independentReviewer")?.workerId).toBe("anthropicReviewer");
    expect(result.reviewPolicy.explanations[0]).toMatchObject({
      decision: "opposite_family_selected",
      oppositeFamilyCandidateIds: ["anthropicReviewer"],
      sameFamilyCandidateIds: ["openaiReviewer"],
    });
  });

  it("blocks atomically when provider quota is exhausted by the required team", () => {
    const s = scheduler(config([
      worker({ id: "openaiOne", provider: "openai", family: "openai" }),
      worker({ id: "openaiTwo", provider: "openai", family: "openai" }),
    ], {
      quotas: { providers: { openai: { maxActiveLeases: 1 } }, families: {} },
    }));
    const result = s.requestAllocation(request({ requiredRoles: ["seniorImplementer", "qaGate"] }));

    expect(result.ok).toBe(false);
    expect(s.listLeases()).toHaveLength(0);
  });

  it("releases and retries queued work without a live waiting model", () => {
    const s = scheduler(config([worker({ id: "codexSenior", provider: "openai", family: "openai" })]));
    const first = s.requestAllocation(request({ taskId: "task-1" }));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    s.requestAllocation(request({ taskId: "task-2", coordinatorId: "coord-2" }));

    s.releaseLease(first.allocation.leases[0].leaseId, "coord-1");
    const retried = s.retryQueued();

    expect(retried).toHaveLength(1);
    expect(retried[0].ok).toBe(true);
    if (!retried[0].ok) return;
    expect(retried[0].allocation.taskId).toBe("task-2");
  });

  it("expires leases deterministically and rejects expired lease validation", () => {
    const s = new MatrixScheduler(config([worker({ id: "codexSenior", provider: "openai", family: "openai" })]), {
      now: () => fixedNow,
    });
    const result = s.requestAllocation(request({ leaseDurationMs: 1000 }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const leaseId = result.allocation.leases[0].leaseId;

    const expired = s.expireLeases(new Date("2026-06-23T12:00:01.000Z"));

    expect(expired.map((lease) => lease.leaseId)).toEqual([leaseId]);
    expect(s.validateLeaseForWorker("codexSenior", leaseId, "task-1", "coord-1")).toEqual({ ok: false, reason: "lease_expired" });
  });

  it("renews lease expiry on heartbeat with the original lease duration", () => {
    let now = fixedNow;
    const s = new MatrixScheduler(config([worker({ id: "codexSenior", provider: "openai", family: "openai" })]), {
      now: () => now,
    });
    const result = s.requestAllocation(request({ leaseDurationMs: 1_000 }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const leaseId = result.allocation.leases[0].leaseId;

    now = new Date("2026-06-23T12:00:00.750Z");
    const renewed = s.heartbeatLease(leaseId, "coord-1");
    expect(renewed.leaseExpiresAt).toBe("2026-06-23T12:00:01.750Z");

    expect(s.expireLeases(new Date("2026-06-23T12:00:01.000Z"))).toEqual([]);
    expect(s.validateLeaseForWorker("codexSenior", leaseId, "task-1", "coord-1")).toEqual({ ok: true });
  });

  it("retries queued work by priority", () => {
    const s = scheduler(config([worker({ id: "codexSenior", provider: "openai", family: "openai" })]));
    const first = s.requestAllocation(request({ taskId: "running" }));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    s.requestAllocation(request({ taskId: "low", coordinatorId: "coord-low", priority: "low" }));
    s.requestAllocation(request({ taskId: "high", coordinatorId: "coord-high", priority: "high" }));

    s.releaseLease(first.allocation.leases[0].leaseId);
    const retried = s.retryQueued();

    expect(retried[0].ok).toBe(true);
    if (!retried[0].ok) return;
    expect(retried[0].allocation.taskId).toBe("high");
  });
});
