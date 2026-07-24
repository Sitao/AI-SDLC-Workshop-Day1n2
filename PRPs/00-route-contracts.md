# Route Contracts

This file locks the request and response shapes for the initial implementation so frontend and backend work can proceed in parallel.

## Standard Error Envelopes

- `400`: `{ error: string; details?: Record<string, string | string[]> }`
- `401`: `{ error: 'Not authenticated' }`
- `404`: `{ error: 'Not found' }`
- `409`: `{ error: string }`
- `500`: `{ error: 'Internal server error' }`

## Auth

### `POST /api/auth/register-options`

- Request body: `{ username: string }`
- Response body: `{ options: PublicKeyCredentialCreationOptionsJSON }`

### `POST /api/auth/register-verify`

- Request body: `{ username: string; response: RegistrationResponseJSON }`
- Response body: `{ verified: boolean; user: { id: number; username: string } }`

### `POST /api/auth/login-options`

- Request body: `{ username: string }`
- Response body: `{ options: PublicKeyCredentialRequestOptionsJSON }`

### `POST /api/auth/login-verify`

- Request body: `{ username: string; response: AuthenticationResponseJSON }`
- Response body: `{ verified: boolean; user: { id: number; username: string } }`

### `POST /api/auth/logout`

- Request body: none
- Response body: `{ success: true }`

### `GET /api/auth/me`

- Auth required: yes
- Success: `{ user: { id: number; username: string } }`
- Failure: `401` with `{ error: 'Not authenticated' }`

## Todos

### `GET /api/todos`

- Auth required: yes
- Response body: `{ todos: Todo[] }`

### `POST /api/todos`

- Auth required: yes
- Request body:
  `{ title: string; due_date?: string | null; priority?: Priority; is_recurring?: boolean; recurrence_pattern?: RecurrencePattern | null; reminder_minutes?: ReminderMinutes | null }`
- Response body: `{ todo: Todo }`

### `GET /api/todos/[id]`

- Auth required: yes
- Response body: `{ todo: Todo }`

### `PUT /api/todos/[id]`

- Auth required: yes
- Request body:
  `{ title?: string; completed?: boolean; due_date?: string | null; priority?: Priority; is_recurring?: boolean; recurrence_pattern?: RecurrencePattern | null; reminder_minutes?: ReminderMinutes | null }`
- Response body: `{ todo: Todo }`

### `DELETE /api/todos/[id]`

- Auth required: yes
- Response body: `{ success: true }`

## Subtasks

### `POST /api/todos/[id]/subtasks`

- Auth required: yes
- Request body: `{ title: string }`
- Response body: `{ subtask: Subtask }`

### `PUT /api/subtasks/[id]`

- Auth required: yes
- Request body: `{ title?: string; completed?: boolean; position?: number }`
- Response body: `{ subtask: Subtask }`

### `DELETE /api/subtasks/[id]`

- Auth required: yes
- Response body: `{ success: true }`

## Tags

### `GET /api/tags`

- Auth required: yes
- Response body: `{ tags: Tag[] }`

### `POST /api/tags`

- Auth required: yes
- Request body: `{ name: string; color?: string }`
- Response body: `{ tag: Tag }`

### `PUT /api/tags/[id]`

- Auth required: yes
- Request body: `{ name?: string; color?: string }`
- Response body: `{ tag: Tag }`

### `DELETE /api/tags/[id]`

- Auth required: yes
- Response body: `{ success: true }`

### `POST /api/todos/[id]/tags`

- Auth required: yes
- Request body: `{ tagId: number }`
- Response body: `{ success: true }`

### `DELETE /api/todos/[id]/tags`

- Auth required: yes
- Request body: `{ tagId: number }`
- Response body: `{ success: true }`

## Templates

### `GET /api/templates`

- Auth required: yes
- Response body: `{ templates: Template[] }`

### `POST /api/templates`

- Auth required: yes
- Request body:
  `{ name: string; description?: string | null; category?: string | null; title_template: string; priority?: Priority; is_recurring?: boolean; recurrence_pattern?: RecurrencePattern | null; reminder_minutes?: ReminderMinutes | null; due_date_offset_minutes?: number | null; subtasks_json?: string | null }`
- Response body: `{ template: Template }`

### `PUT /api/templates/[id]`

- Auth required: yes
- Request body: same partial shape as template create
- Response body: `{ template: Template }`

### `DELETE /api/templates/[id]`

- Auth required: yes
- Response body: `{ success: true }`

### `POST /api/templates/[id]/use`

- Auth required: yes
- Request body: none
- Response body: `{ todo: Todo }`

## Export and Import

### `GET /api/todos/export?format=json|csv`

- Auth required: yes
- Response: downloadable file payload

### `POST /api/todos/import`

- Auth required: yes
- Request body: `TodoExportEnvelope`
- Response body: `{ imported: number }`

## Notifications

### `GET /api/notifications/check`

- Auth required: yes
- Response body:
  `{ notifications: Array<{ todoId: number; title: string; dueDate: string }> }`

## Holidays

### `GET /api/holidays`

- Auth required: yes
- Response body: `{ holidays: Holiday[] }`