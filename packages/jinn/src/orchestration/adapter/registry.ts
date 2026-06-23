import type { ProviderAdapter, ProviderAdapterResult } from "./types.js";
import { adapterNotFound, providerOk } from "./types.js";
import { createLocalEchoAdapter } from "./local-echo-adapter.js";
import { createManualAdapter } from "./manual-adapter.js";
import { createStubAdapter } from "./stub-adapter.js";

export class ProviderAdapterRegistry {
  private readonly adapters = new Map<string, ProviderAdapter>();

  constructor(adapters: ProviderAdapter[] = []) {
    for (const adapter of adapters) this.register(adapter);
  }

  register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  resolve(provider: string): ProviderAdapterResult<ProviderAdapter> {
    const adapter = this.adapters.get(provider);
    if (!adapter) return adapterNotFound(provider);
    return providerOk(adapter);
  }

  listIds(): string[] {
    return [...this.adapters.keys()].sort((a, b) => a.localeCompare(b));
  }
}

export function createProviderAdapterRegistry(adapters: ProviderAdapter[] = defaultAdapters()): ProviderAdapterRegistry {
  return new ProviderAdapterRegistry(adapters);
}

function defaultAdapters(): ProviderAdapter[] {
  return [
    createStubAdapter("stub"),
    createManualAdapter("manual"),
    createLocalEchoAdapter({ id: "local_echo" }),
    createLocalEchoAdapter({ id: "mock" }),
  ];
}
