import { badRequest } from '@/lib/api'

export type TemplateSubtask = {
  title: string
  position: number
}

export function validateSubtasksJson(subtasksJson: string | null | undefined): string | null | undefined {
  if (subtasksJson == null) {
    return subtasksJson
  }

  try {
    const parsedValue = JSON.parse(subtasksJson) as unknown

    if (!Array.isArray(parsedValue)) {
      throw badRequest('subtasks_json must be a JSON array')
    }

    for (const item of parsedValue) {
      if (
        typeof item !== 'object' ||
        item === null ||
        typeof (item as { title?: unknown }).title !== 'string' ||
        typeof (item as { position?: unknown }).position !== 'number'
      ) {
        throw badRequest('subtasks_json contains an invalid subtask entry')
      }
    }

    return subtasksJson
  } catch (error) {
    if (error instanceof Error && 'status' in error) {
      throw error
    }

    throw badRequest('subtasks_json is not valid JSON')
  }
}

export function parseTemplateSubtasksJson(subtasksJson: string | null): TemplateSubtask[] {
  if (!subtasksJson) {
    return []
  }

  validateSubtasksJson(subtasksJson)
  return JSON.parse(subtasksJson) as TemplateSubtask[]
}