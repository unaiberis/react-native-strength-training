/**
 * Database module barrel export.
 *
 * Re-exports all public database modules so consumers can import
 * from a single path: `@/lib/db`
 */

export { getDb, closeDb, isOpen, resetDb } from "./database";
export { runMigrations, TABLES } from "./schema";
export { initDatabase } from "./init";
export { generateId, isValidId } from "./uuid";
export { NetworkMonitor } from "./network-monitor";
export type { NetworkListener } from "./network-monitor";

export { ChangeQueue } from "./change-queue";
export type { EnqueueParams } from "./change-queue";

export { SyncMeta } from "./sync-meta";

export { IdMapping } from "./id-mapping";

export { SyncEngine } from "./sync-engine";
export type { SyncResult, SyncListener, CollectionAPI } from "./sync-engine";

export { createSqlitePersister } from "./sqlite-storage";

export { OfflineSessionsService } from "./services/offline-sessions";
export { OfflineTemplatesService } from "./services/offline-templates";
export type {
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateExerciseInput,
  ReorderInput,
} from "./services/offline-templates";

export { OfflineExercisesService } from "./services/offline-exercises";
export type { ExerciseFilter } from "./services/offline-exercises";

export { OfflineHistoryService } from "./services/offline-history";
export type { SessionDetail } from "./services/offline-history";

export { OfflineRecordsService } from "./services/offline-records";
export type { PersonalRecord } from "./services/offline-records";

export type {
  QueueAction,
  QueueStatus,
  QueueEntry,
  SyncEventType,
  SyncProgressEvent,
  SyncEvent,
  ExerciseRow,
  WorkoutTemplateRow,
  WorkoutTemplateExerciseRow,
  WorkoutSessionRow,
  ExerciseSetRow,
  LogSetInput,
  CompleteSessionInput,
} from "./types";
