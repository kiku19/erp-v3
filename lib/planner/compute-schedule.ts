/**
 * Orchestrates full schedule recomputation:
 * 1. Normalize durations to days via toDays()
 * 2. Run forwardPass() → early start/finish
 * 3. Return Map<activityId, { startDate, finishDate }>
 */

import { toDays, type DurationUnit } from "./duration-utils";
import { forwardPass, type ForwardPassRelationship } from "./forward-pass";

interface ScheduleActivity {
  id: string;
  duration: number;
  durationUnit: string;
}

interface ScheduleResult {
  startDate: string;
  finishDate: string;
}

function computeSchedule(
  activities: ScheduleActivity[],
  relationships: ForwardPassRelationship[],
  projectStartDate: string,
): Map<string, ScheduleResult> {
  if (activities.length === 0) return new Map();

  // Normalize durations to days
  const normalizedActivities = activities.map((a) => ({
    id: a.id,
    duration: toDays(a.duration, (a.durationUnit || "days") as DurationUnit),
  }));

  // Forward pass → early dates
  const forwardResults = forwardPass(normalizedActivities, relationships, projectStartDate);

  // Build final result
  const result = new Map<string, ScheduleResult>();
  for (const act of activities) {
    const fp = forwardResults.get(act.id);
    if (fp) {
      result.set(act.id, {
        startDate: fp.startDate,
        finishDate: fp.finishDate,
      });
    }
  }

  return result;
}

export { computeSchedule, type ScheduleActivity, type ScheduleResult };
