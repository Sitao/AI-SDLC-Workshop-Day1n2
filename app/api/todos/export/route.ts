import { NextRequest, NextResponse } from 'next/server'
import { handleRouteError, requireSession } from '@/lib/api'
import type { TodoExportEnvelope } from '@/lib/db'
import { todoDB } from '@/lib/db'
import { getSingaporeNow, toSingaporeISOString } from '@/lib/timezone'

function buildCsvValue(value: string | number | boolean | null): string {
  const normalizedValue = value == null ? '' : String(value)
  return `"${normalizedValue.replaceAll('"', '""')}"`
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const format = request.nextUrl.searchParams.get('format') ?? 'json'
    const todos = todoDB.listByUserId(session.userId)
    const dateStamp = toSingaporeISOString(getSingaporeNow()).slice(0, 10)

    if (format === 'csv') {
      const lines = [
        ['ID', 'Title', 'Completed', 'Due Date', 'Priority', 'Recurring', 'Pattern', 'Reminder'].join(','),
        ...todos.map((todo) => [
          buildCsvValue(todo.id),
          buildCsvValue(todo.title),
          buildCsvValue(todo.completed),
          buildCsvValue(todo.due_date),
          buildCsvValue(todo.priority),
          buildCsvValue(todo.is_recurring),
          buildCsvValue(todo.recurrence_pattern),
          buildCsvValue(todo.reminder_minutes),
        ].join(',')),
      ]

      return new NextResponse(lines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="todos-${dateStamp}.csv"`,
        },
      })
    }

    const payload: TodoExportEnvelope = {
      version: 1,
      exported_at: toSingaporeISOString(getSingaporeNow()),
      todos: todos.map((todo) => ({
        title: todo.title,
        completed: todo.completed,
        due_date: todo.due_date,
        priority: todo.priority,
        is_recurring: todo.is_recurring,
        recurrence_pattern: todo.recurrence_pattern,
        reminder_minutes: todo.reminder_minutes,
        last_notification_sent: todo.last_notification_sent,
        created_at: todo.created_at,
        updated_at: todo.updated_at,
        subtasks: (todo.subtasks ?? []).map((subtask) => ({
          title: subtask.title,
          completed: subtask.completed,
          position: subtask.position,
          created_at: subtask.created_at,
        })),
        tags: (todo.tags ?? []).map((tag) => ({
          name: tag.name,
          color: tag.color,
        })),
      })),
    }

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="todos-${dateStamp}.json"`,
      },
    })
  } catch (error) {
    return handleRouteError(error)
  }
}