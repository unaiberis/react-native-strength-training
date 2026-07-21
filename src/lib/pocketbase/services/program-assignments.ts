import { pb } from "../client";
import type { ProgramAssignmentRow } from "../../../types/pocketbase";
import { fetchTemplateNameMap } from "./templates";

/** Input for creating a new program assignment. */
export interface CreateAssignmentInput {
  athleteId: string;
  coachId: string;
  templateId: string;
  startedAt: string;
  teamId?: string;
  assignedAt: string;
}

/** Input for updating an existing assignment. */
export interface UpdateAssignmentInput {
  status?: "active" | "completed" | "paused" | "cancelled";
  startedAt?: string;
}

/**
 * Assign a workout template to an athlete for a given start date.
 * If a duplicate (same athlete + template + start_date) exists, it updates
 * the existing record instead (last assignment wins).
 */
export async function assignProgram(
  input: CreateAssignmentInput,
): Promise<ProgramAssignmentRow> {
  try {
    // Check for existing assignment with same athlete + template + started_at
    const existing = await pb
      .collection("program_assignments")
      .getFullList({
        filter: `athlete_id = '${input.athleteId}' && template_id = '${input.templateId}' && started_at = '${input.startedAt}'`,
        $autoCancel: false,
      });

    if (existing.length > 0) {
      // Update existing — last assignment wins
      const record = existing[0] as unknown as ProgramAssignmentRow;
      const updated = await pb
        .collection("program_assignments")
        .update(record.id, {
          status: "active",
          coach_id: input.coachId,
        });
      return updated as unknown as ProgramAssignmentRow;
    }

    // Create new assignment
    const record = await pb.collection("program_assignments").create({
      athlete_id: input.athleteId,
      coach_id: input.coachId,
      template_id: input.templateId,
      assigned_at: input.assignedAt,
      started_at: input.startedAt,
      team_id: input.teamId ?? null,
      status: "active",
    });

    if (!record) throw new Error("Failed to create assignment");
    return record as unknown as ProgramAssignmentRow;
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to assign program");
  }
}

/**
 * List all program assignments for a given athlete.
 */
export async function listAssignments(
  athleteId: string,
): Promise<ProgramAssignmentRow[]> {
  try {
    const records = await pb
      .collection("program_assignments")
      .getFullList({
        filter: `athlete_id = '${athleteId}'`,
        sort: "-started_at",
      });

    return (records ?? []) as unknown as ProgramAssignmentRow[];
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to list assignments");
  }
}

/**
 * List all program assignments for a given athlete, enriched with template names.
 * Fetches template names in a parallel query and attaches them to each row.
 */
export async function listAssignmentsWithTemplateNames(
  athleteId: string,
): Promise<(ProgramAssignmentRow & { templateName: string | null })[]> {
  const rows = await listAssignments(athleteId);
  if (rows.length === 0) return [];

  const templateIds = rows.map((r) => r.template_id);
  const nameMap = await fetchTemplateNameMap(templateIds);

  return rows.map((r) => ({
    ...r,
    templateName: nameMap.get(r.template_id) ?? null,
  }));
}

/**
 * List all assignments for the teams where a user is a coach or admin.
 */
export async function listCoachAssignments(
  coachId: string,
): Promise<ProgramAssignmentRow[]> {
  try {
    const memberships = await pb.collection("team_memberships").getFullList({
      filter: `user_id = '${coachId}' && (role = 'coach' || role = 'admin')`,
      $autoCancel: false,
    });
    if (memberships.length === 0) return [];

    const teamIds = memberships.map((m: any) => m.team_id) as string[];
    const teamFilter = teamIds.map((id: string) => `team_id = '${id}'`).join(" || ");

    const records = await pb
      .collection("program_assignments")
      .getFullList({
        filter: `(${teamFilter})`,
        sort: "-created",
        $autoCancel: false,
      });

    return (records ?? []) as unknown as ProgramAssignmentRow[];
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to list coach assignments");
  }
}

/**
 * Unassign a program by deleting the assignment record.
 */
export async function unassignProgram(
  assignmentId: string,
): Promise<void> {
  try {
    await pb.collection("program_assignments").delete(assignmentId);
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to unassign program");
  }
}

/**
 * Update an existing assignment (status, started_at).
 */
export async function updateAssignment(
  assignmentId: string,
  input: UpdateAssignmentInput,
): Promise<ProgramAssignmentRow> {
  try {
    const record = await pb
      .collection("program_assignments")
      .update(assignmentId, {
        status: input.status,
        started_at: input.startedAt,
      });

    if (!record) throw new Error("Assignment not found");
    return record as unknown as ProgramAssignmentRow;
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to update assignment");
  }
}

/**
 * Get a single program assignment by ID.
 */
export async function getAssignment(
  id: string,
): Promise<ProgramAssignmentRow> {
  try {
    const record = await pb
      .collection("program_assignments")
      .getOne(id, { $autoCancel: false });
    if (!record) throw new Error("Assignment not found");
    return record as unknown as ProgramAssignmentRow;
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to get assignment");
  }
}

/**
 * Check if an athlete has an active assignment for a given template on a date.
 */
export async function hasActiveAssignment(
  athleteId: string,
  templateId: string,
  startDate: string,
): Promise<boolean> {
  try {
    const records = await pb
      .collection("program_assignments")
      .getFullList({
        filter: `athlete_id = '${athleteId}' && template_id = '${templateId}' && started_at = '${startDate}' && status = 'active'`,
        fields: "id",
        $autoCancel: false,
      });

    return records.length > 0;
  } catch {
    return false;
  }
}
