import type { ReleaseStatus, StepState } from './domain/steps';

/** The shape every release endpoint returns. `status` & counts are computed. */
export interface ReleaseDTO {
  id: string;
  name: string;
  releaseDate: string; // ISO 8601
  additionalInfo: string | null;
  steps: StepState;
  status: ReleaseStatus;
  completedCount: number;
  totalSteps: number;
  createdAt: string;
  updatedAt: string;
}
