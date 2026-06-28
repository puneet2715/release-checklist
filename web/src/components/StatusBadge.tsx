import type { ReleaseStatus } from '../types';

const LABELS: Record<ReleaseStatus, string> = {
  planned: 'Planned',
  ongoing: 'Ongoing',
  done: 'Done',
};

export function StatusBadge({ status }: { status: ReleaseStatus }) {
  return <span className={`badge badge--${status}`}>{LABELS[status]}</span>;
}
