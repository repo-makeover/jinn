import { createOrchestrationRuntimeFromConfig, type OrchestrationRuntime } from "../orchestration/runtime.js";
import type { JinnConfig } from "../shared/types.js";
import type { ApiContext } from "./api/context.js";

export function swapOrchestrationRuntime(
  apiContext: ApiContext,
  config: JinnConfig,
  currentRuntime?: OrchestrationRuntime,
  createRuntime: (nextConfig: JinnConfig) => OrchestrationRuntime | undefined = createOrchestrationRuntimeFromConfig,
): OrchestrationRuntime | undefined {
  if (config.orchestration?.enabled === true) {
    const nextRuntime = createRuntime(config);
    if (nextRuntime) {
      bindRuntime(apiContext, nextRuntime);
      currentRuntime?.close();
      return nextRuntime;
    }
  }

  if (currentRuntime?.hasActiveWork()) {
    bindRuntime(apiContext, currentRuntime);
    return currentRuntime;
  }

  currentRuntime?.close();
  unbindRuntime(apiContext);
  return undefined;
}

function bindRuntime(apiContext: ApiContext, runtime: OrchestrationRuntime): void {
  apiContext.orchestration = {
    ...(apiContext.orchestration ?? {}),
    runtime,
  };
}

function unbindRuntime(apiContext: ApiContext): void {
  if (!apiContext.orchestration) return;
  delete apiContext.orchestration.runtime;
  if (Object.keys(apiContext.orchestration).length === 0) {
    delete apiContext.orchestration;
  }
}
