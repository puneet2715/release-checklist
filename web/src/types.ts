export type ReleaseStatus = 'planned' | 'ongoing' | 'done';

export interface StepDefinition {
  id: string;
  label: string;
}

export interface Release {
  id: string;
  name: string;
  releaseDate: string; // ISO 8601
  additionalInfo: string | null;
  steps: Record<string, boolean>;
  status: ReleaseStatus;
  completedCount: number;
  totalSteps: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReleaseInput {
  name: string;
  releaseDate: string;
  additionalInfo?: string | null;
}
