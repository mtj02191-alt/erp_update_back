/**
 * S3 bucket profiles for multi-bucket usage across the project.
 *
 * Env convention (PROFILE = uppercase id, e.g. APPEALS):
 *   AWS_S3_BUCKET                    — default bucket (fallback for all profiles)
 *   AWS_S3_<PROFILE>_BUCKET          — optional override per profile
 *   AWS_S3_<PROFILE>_PREFIX          — key prefix folder (e.g. appeals/)
 *   AWS_S3_<PROFILE>_PUBLIC_BASE_URL — optional CDN/base URL for that bucket
 *   AWS_S3_<PROFILE>_OBJECT_ACL      — optional; falls back to AWS_S3_OBJECT_ACL
 *
 * Shared: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION,
 *         AWS_S3_PUBLIC_BASE_URL (global CDN fallback), AWS_S3_MAX_FILE_MB, AWS_S3_OBJECT_ACL
 */
export const S3_BUCKET_PROFILE = {
  DEFAULT: "default",
  APPEALS: "appeals",
  SOCIAL_MEDIA: "social_media",
  TASKING: "tasking",
  DONATIONS: "donations",
} as const;

export type S3BucketProfileId =
  | (typeof S3_BUCKET_PROFILE)[keyof typeof S3_BUCKET_PROFILE]
  | string;

export function profileToEnvKey(profileId: string): string {
  return profileId.toUpperCase().replace(/-/g, "_");
}
