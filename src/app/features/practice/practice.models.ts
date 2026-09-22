export type ExerciseType = 'multiple_choice' | 'fill_blank';
export type ExerciseStatus = 'pending' | 'done';

/** One practice item (`POST /exercises/generate`, `GET /exercises`). Never carries the answer:
 * that is only revealed by attempting it. */
export interface Exercise {
  id: string;
  /** One of RULE_TAGS (see analysis.models.ts); looked up as `'rules.' + rule_tag`. */
  rule_tag: string;
  type: ExerciseType;
  prompt: string;
  /** Choices for `multiple_choice`; `null` for `fill_blank`. */
  options: string[] | null;
  status: ExerciseStatus;
  created_at: string;
}

/** Immediate feedback for one attempt (`POST /exercises/{id}/attempt`). */
export interface ExerciseAttemptResult {
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
}
