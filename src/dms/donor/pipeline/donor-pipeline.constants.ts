/** CRM fundraising pipeline stages (additive; existing donors with NULL = donor). */
export enum DonorPipelineStage {
  LEAD = "lead",
  PROSPECT = "prospect",
  CULTIVATION = "cultivation",
  ASK = "ask",
  PLEDGE = "pledge",
  DONOR = "donor",
  MAJOR_DONOR = "major_donor",
  LAPSED_DONOR = "lapsed_donor",
  STEWARDSHIP = "stewardship",
}

export const DONOR_PIPELINE_STAGES = Object.values(DonorPipelineStage);

export const DONOR_PIPELINE_STAGE_LABELS: Record<DonorPipelineStage, string> = {
  [DonorPipelineStage.LEAD]: "Lead",
  [DonorPipelineStage.PROSPECT]: "Prospect",
  [DonorPipelineStage.CULTIVATION]: "Cultivation",
  [DonorPipelineStage.ASK]: "Ask",
  [DonorPipelineStage.PLEDGE]: "Pledge",
  [DonorPipelineStage.DONOR]: "Donor",
  [DonorPipelineStage.MAJOR_DONOR]: "Major Donor",
  [DonorPipelineStage.LAPSED_DONOR]: "Lapsed Donor",
  [DonorPipelineStage.STEWARDSHIP]: "Stewardship",
};

/** Existing rows with NULL stage are treated as Donor (no data rewrite). */
export function resolveDonorPipelineStage(
  stage: string | null | undefined,
): DonorPipelineStage {
  if (
    stage &&
    DONOR_PIPELINE_STAGES.includes(stage as DonorPipelineStage)
  ) {
    return stage as DonorPipelineStage;
  }
  return DonorPipelineStage.DONOR;
}

export function isValidDonorPipelineStage(
  stage: string | null | undefined,
): stage is DonorPipelineStage {
  return !!stage && DONOR_PIPELINE_STAGES.includes(stage as DonorPipelineStage);
}
