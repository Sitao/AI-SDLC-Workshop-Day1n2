import path from 'node:path'
import Database from 'better-sqlite3'
import { getSingaporeNow, parseSingaporeDateTime, toSingaporeISOString } from '@/lib/timezone'

type DatabaseClient = InstanceType<typeof Database>

declare global {
  var __todoAppDatabase: DatabaseClient | undefined
}

export type Priority = 'high' | 'medium' | 'low'
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type ReminderMinutes = 15 | 30 | 60 | 120 | 1440 | 2880 | 10080

export interface User {
  id: number
  username: string
  created_at: string
}

export interface Authenticator {
  id: number
  user_id: number
  credential_id: string
  credential_public_key: Buffer
  counter: number
  created_at: string
}

export interface Session {
  userId: number
  username: string
}

export interface Subtask {
  id: number
  todo_id: number
  title: string
  completed: boolean
  position: number
  created_at: string
}

export interface Tag {
  id: number
  user_id: number
  name: string
  color: string
  created_at: string
}

export interface Todo {
  id: number
  user_id: number
  title: string
  completed: boolean
  due_date: string | null
  priority: Priority
  is_recurring: boolean
  recurrence_pattern: RecurrencePattern | null
  reminder_minutes: number | null
  last_notification_sent: string | null
  created_at: string
  updated_at: string | null
  subtasks?: Subtask[]
  tags?: Tag[]
}

export interface Template {
  id: number
  user_id: number
  name: string
  description: string | null
  category: string | null
  title_template: string
  priority: Priority
  is_recurring: boolean
  recurrence_pattern: RecurrencePattern | null
  reminder_minutes: number | null
  due_date_offset_minutes: number | null
  subtasks_json: string | null
  created_at: string
}

export interface Holiday {
  id: number
  date: string
  name: string
  created_at: string
}

export interface NotificationCandidate {
  todoId: number
  title: string
  dueDate: string
  reminderMinutes: ReminderMinutes
  lastNotificationSent: string | null
}

export interface CreateTodoInput {
  user_id: number
  title: string
  due_date?: string | null
  priority?: Priority
  is_recurring?: boolean
  recurrence_pattern?: RecurrencePattern | null
  reminder_minutes?: ReminderMinutes | null
}

export interface UpdateTodoInput {
  title?: string
  completed?: boolean
  due_date?: string | null
  priority?: Priority
  is_recurring?: boolean
  recurrence_pattern?: RecurrencePattern | null
  reminder_minutes?: ReminderMinutes | null
  last_notification_sent?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface CreateSubtaskInput {
  todo_id: number
  title: string
  position?: number
}

export interface UpdateSubtaskInput {
  title?: string
  completed?: boolean
  position?: number
  created_at?: string
}

export interface CreateTagInput {
  user_id: number
  name: string
  color?: string
}

export interface UpdateTagInput {
  name?: string
  color?: string
}

export interface CreateTemplateInput {
  user_id: number
  name: string
  description?: string | null
  category?: string | null
  title_template: string
  priority?: Priority
  is_recurring?: boolean
  recurrence_pattern?: RecurrencePattern | null
  reminder_minutes?: ReminderMinutes | null
  due_date_offset_minutes?: number | null
  subtasks_json?: string | null
}

export interface UpdateTemplateInput {
  name?: string
  description?: string | null
  category?: string | null
  title_template?: string
  priority?: Priority
  is_recurring?: boolean
  recurrence_pattern?: RecurrencePattern | null
  reminder_minutes?: ReminderMinutes | null
  due_date_offset_minutes?: number | null
  subtasks_json?: string | null
}

export interface ExportedTodo extends Omit<Todo, 'id' | 'user_id' | 'subtasks' | 'tags'> {
  subtasks: Array<Omit<Subtask, 'id' | 'todo_id'>>
  tags: Array<Pick<Tag, 'name' | 'color'>>
}

export interface TodoExportEnvelope {
  version: 1
  exported_at: string
  todos: ExportedTodo[]
}

type AuthenticatorRow = Omit<Authenticator, 'counter'> & { counter: number | null }
type TodoRow = Omit<Todo, 'completed' | 'is_recurring'> & {
  completed: number
  is_recurring: number
}
type SubtaskRow = Omit<Subtask, 'completed'> & { completed: number }

const databaseFilePath = path.join(process.cwd(), 'todos.db')

function createDatabaseClient(): DatabaseClient {
  const database = new Database(databaseFilePath)
  database.pragma('foreign_keys = ON')
  return database
}

export const db = globalThis.__todoAppDatabase ?? createDatabaseClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__todoAppDatabase = db
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS authenticators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id TEXT UNIQUE NOT NULL,
    credential_public_key BLOB NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_authenticators_user_id ON authenticators(user_id);

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    due_date TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    is_recurring INTEGER NOT NULL DEFAULT 0,
    recurrence_pattern TEXT,
    reminder_minutes INTEGER,
    last_notification_sent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
  CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);

  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_subtasks_todo_id ON subtasks(todo_id);

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, name)
  );

  CREATE TABLE IF NOT EXISTS todo_tags (
    todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (todo_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    title_template TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    is_recurring INTEGER NOT NULL DEFAULT 0,
    recurrence_pattern TEXT,
    reminder_minutes INTEGER,
    due_date_offset_minutes INTEGER,
    subtasks_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
`)

function mapAuthenticatorRow(row: AuthenticatorRow): Authenticator {
  return {
    ...row,
    counter: row.counter ?? 0,
  }
}

function mapSubtaskRow(row: SubtaskRow): Subtask {
  return {
    ...row,
    completed: Boolean(row.completed),
  }
}

function mapTodoRow(row: TodoRow): Todo {
  return {
    ...row,
    completed: Boolean(row.completed),
    is_recurring: Boolean(row.is_recurring),
  }
}

function getPlaceholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ')
}

function hydrateTodos(todos: Todo[]): Todo[] {
  if (todos.length === 0) {
    return todos
  }

  const todoIds = todos.map((todo) => todo.id)
  const placeholders = getPlaceholders(todoIds.length)

  const subtaskRows = db
    .prepare(`SELECT * FROM subtasks WHERE todo_id IN (${placeholders}) ORDER BY todo_id ASC, position ASC, id ASC`)
    .all(...todoIds) as SubtaskRow[]

  const tagRows = db
    .prepare(
      `SELECT todo_tags.todo_id, tags.id, tags.user_id, tags.name, tags.color, tags.created_at
       FROM todo_tags
       INNER JOIN tags ON tags.id = todo_tags.tag_id
       WHERE todo_tags.todo_id IN (${placeholders})
       ORDER BY todo_tags.todo_id ASC, tags.name COLLATE NOCASE ASC`,
    )
    .all(...todoIds) as Array<Tag & { todo_id: number }>

  const subtasksByTodoId = new Map<number, Subtask[]>()
  const tagsByTodoId = new Map<number, Tag[]>()

  for (const row of subtaskRows) {
    const subtasks = subtasksByTodoId.get(row.todo_id) ?? []
    subtasks.push(mapSubtaskRow(row))
    subtasksByTodoId.set(row.todo_id, subtasks)
  }

  for (const row of tagRows) {
    const tags = tagsByTodoId.get(row.todo_id) ?? []
    tags.push({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      color: row.color,
      created_at: row.created_at,
    })
    tagsByTodoId.set(row.todo_id, tags)
  }

  return todos.map((todo) => ({
    ...todo,
    subtasks: subtasksByTodoId.get(todo.id) ?? [],
    tags: tagsByTodoId.get(todo.id) ?? [],
  }))
}

function fetchTodoByIdForUser(todoId: number, userId: number): Todo | null {
  const row = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(todoId, userId) as TodoRow | undefined

  if (!row) {
    return null
  }

  return hydrateTodos([mapTodoRow(row)])[0] ?? null
}

function ensureRecordChanged(changes: number, message: string): void {
  if (changes === 0) {
    throw new Error(message)
  }
}

export const userDB = {
  findById(userId: number): User | null {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined
    return row ?? null
  },
  findByUsername(username: string): User | null {
    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined
    return row ?? null
  },
  create(username: string): User {
    const result = db
      .prepare('INSERT INTO users (username, created_at) VALUES (?, ?)')
      .run(username, toSingaporeISOString(getSingaporeNow()))
    const user = userDB.findById(Number(result.lastInsertRowid))

    if (!user) {
      throw new Error('Failed to create user')
    }

    return user
  },
}

export const authenticatorDB = {
  findByCredentialId(credentialId: string): Authenticator | null {
    const row = db.prepare('SELECT * FROM authenticators WHERE credential_id = ?').get(credentialId) as AuthenticatorRow | undefined
    return row ? mapAuthenticatorRow(row) : null
  },
  listByUserId(userId: number): Authenticator[] {
    const rows = db
      .prepare('SELECT * FROM authenticators WHERE user_id = ? ORDER BY id ASC')
      .all(userId) as AuthenticatorRow[]

    return rows.map(mapAuthenticatorRow)
  },
  create(input: Omit<Authenticator, 'id' | 'created_at'>): Authenticator {
    db.prepare(
      'INSERT INTO authenticators (user_id, credential_id, credential_public_key, counter, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(
      input.user_id,
      input.credential_id,
      input.credential_public_key,
      input.counter,
      toSingaporeISOString(getSingaporeNow()),
    )

    const authenticator = authenticatorDB.findByCredentialId(input.credential_id)

    if (!authenticator) {
      throw new Error('Failed to create authenticator')
    }

    return authenticator
  },
  updateCounter(credentialId: string, counter: number): Authenticator {
    const result = db.prepare('UPDATE authenticators SET counter = ? WHERE credential_id = ?').run(counter, credentialId)
    ensureRecordChanged(result.changes, 'Authenticator not found')

    const authenticator = authenticatorDB.findByCredentialId(credentialId)

    if (!authenticator) {
      throw new Error('Failed to update authenticator counter')
    }

    return authenticator
  },
}

export const todoDB = {
  listByUserId(userId: number): Todo[] {
    const rows = db.prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC, id DESC').all(userId) as TodoRow[]
    return hydrateTodos(rows.map(mapTodoRow))
  },
  findByIdForUser(todoId: number, userId: number): Todo | null {
    return fetchTodoByIdForUser(todoId, userId)
  },
  create(input: CreateTodoInput): Todo {
    const result = db.prepare(
      `INSERT INTO todos (
        user_id,
        title,
        due_date,
        priority,
        is_recurring,
        recurrence_pattern,
        reminder_minutes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    ).run(
      input.user_id,
      input.title,
      input.due_date ?? null,
      input.priority ?? 'medium',
      input.is_recurring ? 1 : 0,
      input.recurrence_pattern ?? null,
      input.reminder_minutes ?? null,
      toSingaporeISOString(getSingaporeNow()),
      toSingaporeISOString(getSingaporeNow()),
    )

    const todo = fetchTodoByIdForUser(Number(result.lastInsertRowid), input.user_id)

    if (!todo) {
      throw new Error('Failed to create todo')
    }

    return todo
  },
  update(todoId: number, userId: number, input: UpdateTodoInput): Todo {
    const updates: string[] = []
    const values: Array<number | string | null> = []

    if (input.title !== undefined) {
      updates.push('title = ?')
      values.push(input.title)
    }

    if (input.completed !== undefined) {
      updates.push('completed = ?')
      values.push(input.completed ? 1 : 0)
    }

    if (input.due_date !== undefined) {
      updates.push('due_date = ?')
      values.push(input.due_date)
    }

    if (input.priority !== undefined) {
      updates.push('priority = ?')
      values.push(input.priority)
    }

    if (input.is_recurring !== undefined) {
      updates.push('is_recurring = ?')
      values.push(input.is_recurring ? 1 : 0)
    }

    if (input.recurrence_pattern !== undefined) {
      updates.push('recurrence_pattern = ?')
      values.push(input.recurrence_pattern)
    }

    if (input.reminder_minutes !== undefined) {
      updates.push('reminder_minutes = ?')
      values.push(input.reminder_minutes)
    }

    if (input.last_notification_sent !== undefined) {
      updates.push('last_notification_sent = ?')
      values.push(input.last_notification_sent)
    }

    if (updates.length === 0) {
      const todo = fetchTodoByIdForUser(todoId, userId)

      if (!todo) {
        throw new Error('Todo not found')
      }

      return todo
    }

    if (input.created_at !== undefined) {
      updates.push('created_at = ?')
      values.push(input.created_at)
    }

    const updatedAt = input.updated_at ?? toSingaporeISOString(getSingaporeNow())
    updates.push('updated_at = ?')
    values.push(updatedAt)

    values.push(todoId, userId)
    const result = db.prepare(`UPDATE todos SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values)
    ensureRecordChanged(result.changes, 'Todo not found')

    const todo = fetchTodoByIdForUser(todoId, userId)

    if (!todo) {
      throw new Error('Failed to update todo')
    }

    return todo
  },
  delete(todoId: number, userId: number): void {
    const result = db.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?').run(todoId, userId)
    ensureRecordChanged(result.changes, 'Todo not found')
  },
  attachTag(todoId: number, tagId: number, userId: number): void {
    db.prepare(
      `INSERT OR IGNORE INTO todo_tags (todo_id, tag_id)
       SELECT ?, ?
       WHERE EXISTS (SELECT 1 FROM todos WHERE id = ? AND user_id = ?)
         AND EXISTS (SELECT 1 FROM tags WHERE id = ? AND user_id = ?)`,
    ).run(todoId, tagId, todoId, userId, tagId, userId)
  },
  detachTag(todoId: number, tagId: number, userId: number): void {
    db.prepare(
      `DELETE FROM todo_tags
       WHERE todo_id = ?
         AND tag_id = ?
         AND EXISTS (SELECT 1 FROM todos WHERE id = ? AND user_id = ?)
         AND EXISTS (SELECT 1 FROM tags WHERE id = ? AND user_id = ?)`,
    ).run(todoId, tagId, todoId, userId, tagId, userId)
  },
  listNotificationCandidates(userId: number): NotificationCandidate[] {
    const rows = db
      .prepare(
        `SELECT id, title, due_date, reminder_minutes, last_notification_sent
         FROM todos
         WHERE user_id = ?
           AND completed = 0
           AND due_date IS NOT NULL
           AND reminder_minutes IS NOT NULL`,
      )
      .all(userId) as Array<{
      id: number
      title: string
      due_date: string
      reminder_minutes: ReminderMinutes
      last_notification_sent: string | null
    }>

    const now = getSingaporeNow().getTime()

    return rows.filter((row) => {
      const dueTime = parseSingaporeDateTime(row.due_date).getTime()
      const windowStart = dueTime - row.reminder_minutes * 60 * 1000
      const lastSent = row.last_notification_sent ? parseSingaporeDateTime(row.last_notification_sent).getTime() : null

      return now >= windowStart && now <= dueTime && (lastSent === null || lastSent < windowStart)
    }).map((row) => ({
      todoId: row.id,
      title: row.title,
      dueDate: row.due_date,
      reminderMinutes: row.reminder_minutes,
      lastNotificationSent: row.last_notification_sent,
    }))
  },
}

export const subtaskDB = {
  findByIdForUser(subtaskId: number, userId: number): Subtask | null {
    const row = db
      .prepare(
        `SELECT subtasks.*
         FROM subtasks
         INNER JOIN todos ON todos.id = subtasks.todo_id
         WHERE subtasks.id = ? AND todos.user_id = ?`,
      )
      .get(subtaskId, userId) as SubtaskRow | undefined

    return row ? mapSubtaskRow(row) : null
  },
  listByTodoId(todoId: number): Subtask[] {
    const rows = db
      .prepare('SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position ASC, id ASC')
      .all(todoId) as SubtaskRow[]

    return rows.map(mapSubtaskRow)
  },
  create(input: CreateSubtaskInput): Subtask {
    const positionRow = db
      .prepare('SELECT COALESCE(MAX(position), -1) AS max_position FROM subtasks WHERE todo_id = ?')
      .get(input.todo_id) as { max_position: number }

    const position = input.position ?? positionRow.max_position + 1
    const result = db
      .prepare('INSERT INTO subtasks (todo_id, title, position, created_at) VALUES (?, ?, ?, ?)')
      .run(input.todo_id, input.title, position, toSingaporeISOString(getSingaporeNow()))

    const row = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(Number(result.lastInsertRowid)) as SubtaskRow | undefined

    if (!row) {
      throw new Error('Failed to create subtask')
    }

    return mapSubtaskRow(row)
  },
  update(subtaskId: number, input: UpdateSubtaskInput): Subtask {
    const updates: string[] = []
    const values: Array<number | string> = []

    if (input.title !== undefined) {
      updates.push('title = ?')
      values.push(input.title)
    }

    if (input.completed !== undefined) {
      updates.push('completed = ?')
      values.push(input.completed ? 1 : 0)
    }

    if (input.position !== undefined) {
      updates.push('position = ?')
      values.push(input.position)
    }

    if (input.created_at !== undefined) {
      updates.push('created_at = ?')
      values.push(input.created_at)
    }

    if (updates.length === 0) {
      const existing = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(subtaskId) as SubtaskRow | undefined

      if (!existing) {
        throw new Error('Subtask not found')
      }

      return mapSubtaskRow(existing)
    }

    values.push(subtaskId)
    const result = db.prepare(`UPDATE subtasks SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    ensureRecordChanged(result.changes, 'Subtask not found')

    const row = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(subtaskId) as SubtaskRow | undefined

    if (!row) {
      throw new Error('Failed to update subtask')
    }

    return mapSubtaskRow(row)
  },
  delete(subtaskId: number): void {
    const result = db.prepare('DELETE FROM subtasks WHERE id = ?').run(subtaskId)
    ensureRecordChanged(result.changes, 'Subtask not found')
  },
}

export const tagDB = {
  findByIdForUser(tagId: number, userId: number): Tag | null {
    const row = db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?').get(tagId, userId) as Tag | undefined
    return row ?? null
  },
  listByUserId(userId: number): Tag[] {
    return db.prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name COLLATE NOCASE ASC, id ASC').all(userId) as Tag[]
  },
  findByName(userId: number, name: string): Tag | null {
    const row = db
      .prepare('SELECT * FROM tags WHERE user_id = ? AND LOWER(name) = LOWER(?)')
      .get(userId, name) as Tag | undefined

    return row ?? null
  },
  create(input: CreateTagInput): Tag {
    const result = db
      .prepare('INSERT INTO tags (user_id, name, color, created_at) VALUES (?, ?, ?, ?)')
      .run(input.user_id, input.name, input.color ?? '#3B82F6', toSingaporeISOString(getSingaporeNow()))

    const row = db.prepare('SELECT * FROM tags WHERE id = ?').get(Number(result.lastInsertRowid)) as Tag | undefined

    if (!row) {
      throw new Error('Failed to create tag')
    }

    return row
  },
  update(tagId: number, userId: number, input: UpdateTagInput): Tag {
    const updates: string[] = []
    const values: Array<number | string> = []

    if (input.name !== undefined) {
      updates.push('name = ?')
      values.push(input.name)
    }

    if (input.color !== undefined) {
      updates.push('color = ?')
      values.push(input.color)
    }

    if (updates.length === 0) {
      const existing = db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?').get(tagId, userId) as Tag | undefined

      if (!existing) {
        throw new Error('Tag not found')
      }

      return existing
    }

    values.push(tagId, userId)
    const result = db.prepare(`UPDATE tags SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values)
    ensureRecordChanged(result.changes, 'Tag not found')

    const row = db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?').get(tagId, userId) as Tag | undefined

    if (!row) {
      throw new Error('Failed to update tag')
    }

    return row
  },
  delete(tagId: number, userId: number): void {
    const result = db.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').run(tagId, userId)
    ensureRecordChanged(result.changes, 'Tag not found')
  },
}

export const templateDB = {
  listByUserId(userId: number): Template[] {
    return db.prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY name COLLATE NOCASE ASC, id ASC').all(userId) as Template[]
  },
  findByIdForUser(templateId: number, userId: number): Template | null {
    const row = db.prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?').get(templateId, userId) as Template | undefined
    return row ?? null
  },
  create(input: CreateTemplateInput): Template {
    const result = db.prepare(
      `INSERT INTO templates (
        user_id,
        name,
        description,
        category,
        title_template,
        priority,
        is_recurring,
        recurrence_pattern,
        reminder_minutes,
        due_date_offset_minutes,
        subtasks_json
        , created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      input.user_id,
      input.name,
      input.description ?? null,
      input.category ?? null,
      input.title_template,
      input.priority ?? 'medium',
      input.is_recurring ? 1 : 0,
      input.recurrence_pattern ?? null,
      input.reminder_minutes ?? null,
      input.due_date_offset_minutes ?? null,
      input.subtasks_json ?? null,
      toSingaporeISOString(getSingaporeNow()),
    )

    const template = templateDB.findByIdForUser(Number(result.lastInsertRowid), input.user_id)

    if (!template) {
      throw new Error('Failed to create template')
    }

    return template
  },
  update(templateId: number, userId: number, input: UpdateTemplateInput): Template {
    const updates: string[] = []
    const values: Array<number | string | null> = []

    if (input.name !== undefined) {
      updates.push('name = ?')
      values.push(input.name)
    }

    if (input.description !== undefined) {
      updates.push('description = ?')
      values.push(input.description)
    }

    if (input.category !== undefined) {
      updates.push('category = ?')
      values.push(input.category)
    }

    if (input.title_template !== undefined) {
      updates.push('title_template = ?')
      values.push(input.title_template)
    }

    if (input.priority !== undefined) {
      updates.push('priority = ?')
      values.push(input.priority)
    }

    if (input.is_recurring !== undefined) {
      updates.push('is_recurring = ?')
      values.push(input.is_recurring ? 1 : 0)
    }

    if (input.recurrence_pattern !== undefined) {
      updates.push('recurrence_pattern = ?')
      values.push(input.recurrence_pattern)
    }

    if (input.reminder_minutes !== undefined) {
      updates.push('reminder_minutes = ?')
      values.push(input.reminder_minutes)
    }

    if (input.due_date_offset_minutes !== undefined) {
      updates.push('due_date_offset_minutes = ?')
      values.push(input.due_date_offset_minutes)
    }

    if (input.subtasks_json !== undefined) {
      updates.push('subtasks_json = ?')
      values.push(input.subtasks_json)
    }

    if (updates.length === 0) {
      const existing = templateDB.findByIdForUser(templateId, userId)

      if (!existing) {
        throw new Error('Template not found')
      }

      return existing
    }

    values.push(templateId, userId)
    const result = db.prepare(`UPDATE templates SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values)
    ensureRecordChanged(result.changes, 'Template not found')

    const template = templateDB.findByIdForUser(templateId, userId)

    if (!template) {
      throw new Error('Failed to update template')
    }

    return template
  },
  delete(templateId: number, userId: number): void {
    const result = db.prepare('DELETE FROM templates WHERE id = ? AND user_id = ?').run(templateId, userId)
    ensureRecordChanged(result.changes, 'Template not found')
  },
}

export const holidayDB = {
  listAll(): Holiday[] {
    return db.prepare('SELECT * FROM holidays ORDER BY date ASC, id ASC').all() as Holiday[]
  },
  upsert(date: string, name: string): Holiday {
    db.prepare(
      `INSERT INTO holidays (date, name, created_at)
       VALUES (?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET name = excluded.name`,
    ).run(date, name, toSingaporeISOString(getSingaporeNow()))

    const row = db.prepare('SELECT * FROM holidays WHERE date = ?').get(date) as Holiday | undefined

    if (!row) {
      throw new Error('Failed to upsert holiday')
    }

    return row
  },
}

export function withTransaction<T>(callback: () => T): T {
  return db.transaction(callback)()
}
