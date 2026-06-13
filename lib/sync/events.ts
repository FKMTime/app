import "server-only";

import { EventEmitter } from "node:events";
import type { EntityScope } from "./contract";

export type SyncEvent = {
  competitionId: string;
  scopes: EntityScope[];
  at: Date;
};

// In-process pub/sub for "rows changed for competition X". Phase 3 SSE
// endpoints subscribe here and re-fetch their scope when an event arrives.
// Single-process is fine at the documented scale (1–10 concurrent comps,
// thousands of viewers); horizontal-scale escape hatch is Redis pub/sub.
class SyncEventBus extends EventEmitter {
  constructor() {
    super();
    // We expect many SSE subscribers per comp.
    this.setMaxListeners(1024);
  }

  emitChange(event: SyncEvent) {
    this.emit("change", event);
    this.emit(`change:${event.competitionId}`, event);
  }
}

const globalScope = globalThis as unknown as { __fkmtimeSyncBus?: SyncEventBus };
export const syncEventBus: SyncEventBus =
  globalScope.__fkmtimeSyncBus ??
  (globalScope.__fkmtimeSyncBus = new SyncEventBus());
