declare module "expo-sqlite" {
  export type SQLiteBindValue = string | number | null | Uint8Array;

  export interface SQLiteDatabase {
    execAsync(sql: string): Promise<void>;
    execSync(sql: string): void;
    getAllAsync<T = any>(sql: string, ...params: any[]): Promise<T[]>;
    getAllSync<T = any>(sql: string, ...params: any[]): T[];
    getFirstAsync<T = any>(sql: string, ...params: any[]): Promise<T | null>;
    getFirstSync<T = any>(sql: string, ...params: any[]): T | null;
    runAsync(sql: string, ...params: any[]): Promise<SQLiteRunResult>;
    runSync(sql: string, ...params: any[]): SQLiteRunResult;
    closeAsync(): Promise<void>;
    closeSync(): void;
    isReady: boolean;
  }

  export interface SQLiteRunResult {
    changes: number;
    lastInsertRowId: number;
  }

  export interface SQLiteSession {
    execAsync(sql: string): Promise<void>;
    execSync(sql: string): void;
    getAllAsync<T = any>(sql: string, ...params: any[]): Promise<T[]>;
    getAllSync<T = any>(sql: string, ...params: any[]): T[];
    getFirstAsync<T = any>(sql: string, ...params: any[]): Promise<T | null>;
    getFirstSync<T = any>(sql: string, ...params: any[]): T | null;
    runAsync(sql: string, ...params: any[]): Promise<SQLiteRunResult>;
    runSync(sql: string, ...params: any[]): SQLiteRunResult;
  }

  export function openDatabaseAsync(
    name: string,
    options?: { useNewDb?: boolean }
  ): Promise<SQLiteDatabase>;

  export function openDatabaseSync(
    name: string,
    options?: { useNewDb?: boolean }
  ): SQLiteDatabase;

  export function useSQLiteContext(): SQLiteDatabase;
}
