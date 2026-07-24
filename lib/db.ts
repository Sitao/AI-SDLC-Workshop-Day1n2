import path from 'node:path'
import Database from 'better-sqlite3'

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

function unimplemented(methodName: string): never {
  throw new Error(`${methodName} is not implemented yet`)
}

// Stub implementations intentionally preserve the shared contracts for M0.

export const userDB = {
  findById(_userId: number): User | null {
    return unimplemented('userDB.findById')
  },
  findByUsername(_username: string): User | null {
    return unimplemented('userDB.findByUsername')
  },
  create(_username: string): User {
    return unimplemented('userDB.create')
  },
}

export const authenticatorDB = {
  findByCredentialId(_credentialId: string): Authenticator | null {
    return unimplemented('authenticatorDB.findByCredentialId')
  },
  listByUserId(_userId: number): Authenticator[] {
    return unimplemented('authenticatorDB.listByUserId')
  },
  create(_input: Omit<Authenticator, 'id' | 'created_at'>): Authenticator {
    return unimplemented('authenticatorDB.create')
  },
  updateCounter(_credentialId: string, _counter: number): Authenticator {
    return unimplemented('authenticatorDB.updateCounter')
  },
}

export const todoDB = {
  listByUserId(_userId: number): Todo[] {
    return unimplemented('todoDB.listByUserId')
  },
  findByIdForUser(_todoId: number, _userId: number): Todo | null {
    return unimplemented('todoDB.findByIdForUser')
  },
  create(_input: CreateTodoInput): Todo {
    return unimplemented('todoDB.create')
  },
  update(_todoId: number, _userId: number, _input: UpdateTodoInput): Todo {
    return unimplemented('todoDB.update')
  },
  delete(_todoId: number, _userId: number): void {
    return unimplemented('todoDB.delete')
  },
  attachTag(_todoId: number, _tagId: number, _userId: number): void {
    return unimplemented('todoDB.attachTag')
  },
  detachTag(_todoId: number, _tagId: number, _userId: number): void {
    return unimplemented('todoDB.detachTag')
  },
  listNotificationCandidates(_userId: number): NotificationCandidate[] {
    return unimplemented('todoDB.listNotificationCandidates')
  },
}

export const subtaskDB = {
  listByTodoId(_todoId: number): Subtask[] {
    return unimplemented('subtaskDB.listByTodoId')
  },
  create(_input: CreateSubtaskInput): Subtask {
    return unimplemented('subtaskDB.create')
  },
  update(_subtaskId: number, _input: UpdateSubtaskInput): Subtask {
    return unimplemented('subtaskDB.update')
  },
  delete(_subtaskId: number): void {
    return unimplemented('subtaskDB.delete')
  },
}

export const tagDB = {
  listByUserId(_userId: number): Tag[] {
    return unimplemented('tagDB.listByUserId')
  },
  findByName(_userId: number, _name: string): Tag | null {
    return unimplemented('tagDB.findByName')
  },
  create(_input: CreateTagInput): Tag {
    return unimplemented('tagDB.create')
  },
  update(_tagId: number, _userId: number, _input: UpdateTagInput): Tag {
    return unimplemented('tagDB.update')
  },
  delete(_tagId: number, _userId: number): void {
    return unimplemented('tagDB.delete')
  },
}

export const templateDB = {
  listByUserId(_userId: number): Template[] {
    return unimplemented('templateDB.listByUserId')
  },
  findByIdForUser(_templateId: number, _userId: number): Template | null {
    return unimplemented('templateDB.findByIdForUser')
  },
  create(_input: CreateTemplateInput): Template {
    return unimplemented('templateDB.create')
  },
  update(_templateId: number, _userId: number, _input: UpdateTemplateInput): Template {
    return unimplemented('templateDB.update')
  },
  delete(_templateId: number, _userId: number): void {
    return unimplemented('templateDB.delete')
  },
}

export const holidayDB = {
  listAll(): Holiday[] {
    return unimplemented('holidayDB.listAll')
  },
  upsert(_date: string, _name: string): Holiday {
    return unimplemented('holidayDB.upsert')
  },
}

export function withTransaction<T>(callback: () => T): T {
  return db.transaction(callback)()
}
