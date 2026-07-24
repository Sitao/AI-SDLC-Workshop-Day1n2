# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 05-reminders.spec.ts >> reminders ui >> reminder select is disabled without due date and enabled with due date
- Location: tests/05-reminders.spec.ts:132:7

# Error details

```
Error: expect(locator).toBeDisabled() failed

Locator: getByLabel('Reminder')
Expected: disabled
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeDisabled" with timeout 5000ms
  - waiting for getByLabel('Reminder')

```

```yaml
- main:
  - heading "Todo Dashboard" [level=1]
  - text: Title
  - textbox "Title":
    - /placeholder: What needs to be done?
  - text: Priority
  - combobox "Priority":
    - option "High"
    - option "Medium" [selected]
    - option "Low"
  - button "Add Todo"
  - text: Due date
  - textbox "Due date"
  - checkbox "Repeat" [disabled]
  - text: Repeat Set a due date to enable repeat
  - paragraph: No todos yet
  - text: Filter by priority
  - combobox "Filter by priority":
    - option "All Priorities" [selected]
    - option "High Priority"
    - option "Medium Priority"
    - option "Low Priority"
  - heading "Pending (0)" [level=2]
  - list
  - heading "Completed (0)" [level=2]
  - list
- alert
```

# Test source

```ts
  36  |       window.Notification = FakeNotification;
  37  |     });
  38  | 
  39  |     let todos: TodoRecord[] = [];
  40  |     let nextId = 1;
  41  | 
  42  |     await page.route('**/api/todos', async (route, request) => {
  43  |       if (request.method() === 'GET') {
  44  |         await route.fulfill({
  45  |           status: 200,
  46  |           contentType: 'application/json',
  47  |           body: JSON.stringify({ todos }),
  48  |         });
  49  |         return;
  50  |       }
  51  | 
  52  |       if (request.method() === 'POST') {
  53  |         const body = request.postDataJSON() as {
  54  |           title: string;
  55  |           priority?: Priority;
  56  |           due_date?: string | null;
  57  |           is_recurring?: boolean;
  58  |           recurrence_pattern?: RecurrencePattern | null;
  59  |           reminder_minutes?: ReminderMinutes | null;
  60  |         };
  61  | 
  62  |         const todo: TodoRecord = {
  63  |           id: nextId++,
  64  |           title: body.title,
  65  |           completed: false,
  66  |           due_date: body.due_date ?? null,
  67  |           priority: body.priority ?? 'medium',
  68  |           is_recurring: body.is_recurring ?? false,
  69  |           recurrence_pattern: body.recurrence_pattern ?? null,
  70  |           reminder_minutes: body.reminder_minutes ?? null,
  71  |           created_at: new Date().toISOString(),
  72  |         };
  73  | 
  74  |         todos = [todo, ...todos];
  75  | 
  76  |         await route.fulfill({
  77  |           status: 200,
  78  |           contentType: 'application/json',
  79  |           body: JSON.stringify({ todo }),
  80  |         });
  81  |         return;
  82  |       }
  83  | 
  84  |       await route.fulfill({ status: 405 });
  85  |     });
  86  | 
  87  |     await page.route('**/api/todos/*', async (route, request) => {
  88  |       const url = new URL(request.url());
  89  |       const id = Number(url.pathname.split('/').pop());
  90  | 
  91  |       if (request.method() === 'PUT') {
  92  |         const body = request.postDataJSON() as { completed?: boolean };
  93  |         todos = todos.map((todo) =>
  94  |           todo.id === id ? { ...todo, completed: body.completed ?? todo.completed } : todo
  95  |         );
  96  | 
  97  |         const todo = todos.find((item) => item.id === id);
  98  |         await route.fulfill({
  99  |           status: 200,
  100 |           contentType: 'application/json',
  101 |           body: JSON.stringify({ todo }),
  102 |         });
  103 |         return;
  104 |       }
  105 | 
  106 |       if (request.method() === 'DELETE') {
  107 |         todos = todos.filter((todo) => todo.id !== id);
  108 |         await route.fulfill({
  109 |           status: 200,
  110 |           contentType: 'application/json',
  111 |           body: JSON.stringify({ success: true }),
  112 |         });
  113 |         return;
  114 |       }
  115 | 
  116 |       await route.fulfill({ status: 405 });
  117 |     });
  118 |   });
  119 | 
  120 |   test('enable notifications button requests permission and toggles state', async ({ page }) => {
  121 |     await page.goto('/');
  122 | 
  123 |     const button = page.getByRole('button', { name: '🔔 Enable Notifications' });
  124 |     await expect(button).toBeVisible();
  125 |     await expect(button).toBeEnabled();
  126 | 
  127 |     await button.click();
  128 | 
  129 |     await expect(page.getByRole('button', { name: '🔔 Notifications On' })).toBeDisabled();
  130 |   });
  131 | 
  132 |   test('reminder select is disabled without due date and enabled with due date', async ({ page }) => {
  133 |     await page.goto('/');
  134 | 
  135 |     const reminderSelect = page.getByLabel('Reminder');
> 136 |     await expect(reminderSelect).toBeDisabled();
      |                                  ^ Error: expect(locator).toBeDisabled() failed
  137 | 
  138 |     await page.getByLabel('Due date').fill('2026-10-01');
  139 |     await expect(reminderSelect).toBeEnabled();
  140 |   });
  141 | 
  142 |   test('creates todo with reminder and shows reminder badge', async ({ page }) => {
  143 |     await page.goto('/');
  144 | 
  145 |     await page.getByLabel('Title').fill('Submit report');
  146 |     await page.getByLabel('Due date').fill('2026-10-01');
  147 |     await page.getByLabel('Reminder').selectOption('60');
  148 |     await page.getByRole('button', { name: 'Add Todo' }).click();
  149 | 
  150 |     await expect(page.getByText('Submit report')).toBeVisible();
  151 |     await expect(page.getByTestId('reminder-badge')).toHaveText('🔔 1h');
  152 |   });
  153 | 
  154 |   test('sends reminder_minutes in create payload', async ({ page }) => {
  155 |     await page.goto('/');
  156 | 
  157 |     let capturedBody: Record<string, unknown> = {};
  158 | 
  159 |     await page.route('**/api/todos', async (route, request) => {
  160 |       if (request.method() === 'POST') {
  161 |         capturedBody = request.postDataJSON() as Record<string, unknown>;
  162 | 
  163 |         const todo: TodoRecord = {
  164 |           id: 999,
  165 |           title: String(capturedBody.title ?? ''),
  166 |           completed: false,
  167 |           due_date: (capturedBody.due_date as string | null | undefined) ?? null,
  168 |           priority: (capturedBody.priority as Priority | undefined) ?? 'medium',
  169 |           is_recurring: (capturedBody.is_recurring as boolean | undefined) ?? false,
  170 |           recurrence_pattern:
  171 |             (capturedBody.recurrence_pattern as RecurrencePattern | null | undefined) ?? null,
  172 |           reminder_minutes:
  173 |             (capturedBody.reminder_minutes as ReminderMinutes | null | undefined) ?? null,
  174 |           created_at: new Date().toISOString(),
  175 |         };
  176 | 
  177 |         await route.fulfill({
  178 |           status: 200,
  179 |           contentType: 'application/json',
  180 |           body: JSON.stringify({ todo }),
  181 |         });
  182 |         return;
  183 |       }
  184 | 
  185 |       await route.fulfill({
  186 |         status: 200,
  187 |         contentType: 'application/json',
  188 |         body: JSON.stringify({ todos: [] }),
  189 |       });
  190 |     });
  191 | 
  192 |     await page.getByLabel('Title').fill('Pay invoice');
  193 |     await page.getByLabel('Due date').fill('2026-10-15');
  194 |     await page.getByLabel('Reminder').selectOption('1440');
  195 |     await page.getByRole('button', { name: 'Add Todo' }).click();
  196 | 
  197 |     expect(capturedBody.reminder_minutes).toBe(1440);
  198 |     expect(capturedBody.due_date).toBe('2026-10-15');
  199 |   });
  200 | });
  201 | 
```