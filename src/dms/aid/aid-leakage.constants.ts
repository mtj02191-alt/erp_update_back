import { AidApplicationStatus } from "./aid.enums";

/** Days after last successful/delivered aid before another aid is allowed without override. */
export const AID_COOLDOWN_DAYS = 365;

/** Statuses that count as “already received aid” for leakage control. */
export const AID_SUCCESS_STATUSES: AidApplicationStatus[] = [
  AidApplicationStatus.SUCCESSFUL,
  AidApplicationStatus.DELIVERED,
];
