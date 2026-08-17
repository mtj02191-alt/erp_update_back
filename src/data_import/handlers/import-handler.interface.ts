export interface ImportRowResult {
  row: number;
  success: boolean;
  /** True when row was not inserted (duplicate / empty / already exists). */
  skipped?: boolean;
  email?: string;
  id?: number;
  error?: string;
  /** Human-readable why this row was skipped (shown in import UI). */
  skip_reason?: string;
}

export interface ImportBatchResult {
  entity_name: string;
  total_rows: number;
  success_count: number;
  failed_count: number;
  skipped_count: number;
  results: ImportRowResult[];
}

export interface EntityImportHandler {
  readonly entityName: string;
  getRequiredHeaders(): string[];
  getOptionalHeaders(): string[];
  importRows(
    rows: Record<string, string>[],
    user: any,
    options?: Record<string, unknown>,
  ): Promise<ImportBatchResult>;
}
