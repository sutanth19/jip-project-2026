import { parseApiError } from "@/lib/api"
import type { TeacherRecord } from "@/features/teacher/types/teacher.types"

type AssignmentListRecord = {
  id: string
  title: string
  status: string
  createdAt: string
  updatedAt: string
  startAt: string | null
  dueAt: string | null
  activity: {
    id: string
    title: string
    rendererKey: string | null
    status: string
  }
  targets: {
    classCount: number
    studentCount: number
    effectiveStudentCount: number
    classes: Array<{ id: string; className: string }>
  }
}

type AssignmentDetailRecord = AssignmentListRecord & {
  assignedBy: {
    teacherId: string
    name: string
  }
  school: {
    id: string
    schoolName: string
  }
  availability: {
    status: string
    isAvailableNow: boolean
    isUpcoming: boolean
    isOverdue: boolean
    isClosed: boolean
  }
  targets: AssignmentListRecord["targets"] & {
    students: Array<{
      id: string
      fullName: string
      className: string
    }>
  }
}

export function teacherAssignmentCreateErrorMessage(error: unknown): string {
  const apiError = parseApiError(error)

  if (
    apiError.code === "ASSIGNMENT_ACTIVITY_NOT_PUBLISHED"
    || apiError.code === "ASSIGNMENT_TARGET_INVALID"
    || apiError.status === 404
  ) {
    return "Aktiviti ini tidak lagi tersedia untuk ditugaskan."
  }

  if (apiError.code === "ASSIGNMENT_SCHEDULE_INVALID") {
    return apiError.message
  }

  if (apiError.code === "ASSIGNMENT_ACCESS_DENIED" || apiError.status === 403) {
    return "Anda tidak dibenarkan menugaskan aktiviti ini."
  }

  return apiError.message || "Tugasan tidak dapat disimpan."
}

export function teacherAssignmentDetailSummary(record: TeacherRecord) {
  if (
    typeof record.id !== "string"
    || typeof record.status !== "string"
    || typeof record.title !== "string"
    || typeof record.activity !== "object"
    || record.activity === null
    || typeof record.assignedBy !== "object"
    || record.assignedBy === null
    || typeof record.targets !== "object"
    || record.targets === null
    || !Array.isArray((record.targets as AssignmentDetailRecord["targets"]).students)
  ) {
    return null
  }

  const detail = record as unknown as AssignmentDetailRecord

  return {
    title: detail.activity.title,
    status: detail.status,
    studentCount: detail.targets.students.length,
    classCount: detail.targets.classCount,
    teacherName: detail.assignedBy.name,
  }
}

export function teacherAssignmentListSummaries(rows: TeacherRecord[]) {
  return rows.flatMap((record) => {
    if (
      typeof record.id !== "string"
      || typeof record.status !== "string"
      || typeof record.title !== "string"
      || typeof record.activity !== "object"
      || record.activity === null
      || typeof record.targets !== "object"
      || record.targets === null
    ) {
      return []
    }

    const assignment = record as unknown as AssignmentListRecord

    let summary = `${assignment.targets.effectiveStudentCount} murid`
    if (assignment.targets.classCount > 0 && assignment.targets.studentCount > 0) {
      summary = `${assignment.targets.classCount} kelas • ${assignment.targets.studentCount} murid dipilih`
    } else if (assignment.targets.classCount > 0) {
      summary = `${assignment.targets.classCount} kelas`
    }

    return [{
      id: assignment.id,
      title: assignment.activity.title,
      summary,
      status: assignment.status,
    }]
  })
}
