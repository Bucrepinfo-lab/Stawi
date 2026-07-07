/**
 * Formalization wizard logic — Pillar 1.
 *
 * Guides an informal chama from registration as a Self-Help Group (Community
 * Groups Registration Act 2022) up to a SACCO (Co-operative Societies Act).
 * Pure & deterministic. See PRD §6 for the regulatory sources.
 */

export type FormalizationTrack = 'SHG' | 'SACCO';

export interface FormalizationStep {
  key: string;
  title: string;
  description: string;
  statute: string;
}

export const SHG_STEPS: FormalizationStep[] = [
  { key: 'name_search', title: 'Name search', description: 'Reserve a unique group name at the County Department of Social Protection.', statute: 'Community Groups Registration Act, 2022' },
  { key: 'constitution', title: 'Draft constitution & by-laws', description: 'Adopt a constitution covering objectives, membership, and governance.', statute: 'Community Groups Registration Act, 2022' },
  { key: 'formation_minutes', title: 'Formation meeting & minutes', description: 'Hold the foundational meeting, elect officials, and record signed minutes.', statute: 'Community Groups Registration Act, 2022' },
  { key: 'members', title: 'Member list (min 5)', description: 'Compile at least 5 members with ID copies and contacts.', statute: 'Community Groups Registration Act, 2022' },
  { key: 'submit_fee', title: 'Submit & pay fee', description: 'Lodge the application with documents and pay the ~KES 1,000 fee (14–30 days).', statute: 'Community Groups Registration Act, 2022' },
];

export const SACCO_STEPS: FormalizationStep[] = [
  { key: 'common_bond', title: 'Establish common bond', description: 'Confirm the shared bond linking members (profession, community, employment).', statute: 'Co-operative Societies Act' },
  { key: 'members_20', title: 'Recruit members (min 20)', description: 'Reach at least 20 members (or 10 founders with a common bond).', statute: 'Co-operative Societies Act' },
  { key: 'bylaws_4', title: 'Proposed by-laws (×4)', description: 'Prepare 4 copies of by-laws in English: purpose, governance, loans, dissolution.', statute: 'Co-operative Societies Act' },
  { key: 'economic_appraisal', title: 'Economic appraisal', description: 'Complete the application and supplementary economic appraisal forms.', statute: 'Co-operative Societies Act' },
  { key: 'formation_minutes', title: 'Formation minutes', description: 'Minutes of the formation meeting signed by chair and secretary.', statute: 'Co-operative Societies Act' },
  { key: 'register_commissioner', title: 'Register with Commissioner', description: 'Lodge with the Commissioner for Cooperative Development (~2 months).', statute: 'Co-operative Societies Act' },
];

export function stepsForTrack(track: FormalizationTrack): FormalizationStep[] {
  return track === 'SACCO' ? SACCO_STEPS : SHG_STEPS;
}

export interface FormalizationProgress {
  completed: number;
  total: number;
  pct: number;
  nextStep: FormalizationStep | null;
  done: boolean;
}

/** Progress over a track given the set of completed step keys. */
export function formalizationProgress(
  track: FormalizationTrack,
  completedKeys: string[],
): FormalizationProgress {
  const steps = stepsForTrack(track);
  const done = new Set(completedKeys);
  const completed = steps.filter((s) => done.has(s.key)).length;
  const nextStep = steps.find((s) => !done.has(s.key)) ?? null;
  return {
    completed,
    total: steps.length,
    pct: Math.round((completed / steps.length) * 100),
    nextStep,
    done: completed === steps.length,
  };
}
