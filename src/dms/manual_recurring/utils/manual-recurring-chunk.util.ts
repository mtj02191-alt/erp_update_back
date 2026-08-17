export const DEFAULT_MANUAL_RECURRING_CHUNK_SIZE = 500;
export const MAX_MANUAL_RECURRING_DETAILS_WHEN_INCLUDED = 5000;

export function resolveChunkSize(configService?: {
  get: (key: string) => string | undefined;
}): number {
  const raw = configService?.get("MANUAL_RECURRING_CHUNK_SIZE");
  const parsed = raw ? Number(raw) : DEFAULT_MANUAL_RECURRING_CHUNK_SIZE;
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_MANUAL_RECURRING_CHUNK_SIZE;
  }
  return Math.min(Math.floor(parsed), 5000);
}

export function resolveChunkDelayMs(configService?: {
  get: (key: string) => string | undefined;
}): number {
  const raw = configService?.get("MANUAL_RECURRING_CHUNK_DELAY_MS");
  const parsed = raw ? Number(raw) : 250;
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(Math.floor(parsed), 60_000);
}

export function resolveMaxDetails(
  includeDetails: boolean,
  configService?: { get: (key: string) => string | undefined },
): number {
  if (!includeDetails) return 0;
  const raw = configService?.get("MANUAL_RECURRING_MAX_DETAILS");
  const parsed = raw ? Number(raw) : MAX_MANUAL_RECURRING_DETAILS_WHEN_INCLUDED;
  if (!Number.isFinite(parsed) || parsed < 1) {
    return MAX_MANUAL_RECURRING_DETAILS_WHEN_INCLUDED;
  }
  return Math.min(Math.floor(parsed), MAX_MANUAL_RECURRING_DETAILS_WHEN_INCLUDED);
}

export function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
