export enum ProgressStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  SKIPPED = "skipped",
  CANCELLED = "cancelled",
}

export enum EvidenceFileType {
  IMAGE = "image",
  VIDEO = "video",
  PDF = "pdf",
  LINK = "link",
  DOCUMENT = "document",
}

export enum NotificationChannel {
  EMAIL = "email",
  WHATSAPP = "whatsapp",
  SMS = "sms",
  INTERNAL = "internal",
}

export enum ParentEntityType {
  DONATION = "donation",
  PROJECT_CASE = "project_case",
  DISTRIBUTION_BATCH = "distribution_batch",
  // Add other trackable entities here
}

export enum TrackerOverallStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  PARTIALLY_COMPLETED = "partially_completed",
  CANCELLED = "cancelled",
}
