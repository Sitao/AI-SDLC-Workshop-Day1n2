# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 05-reminders.spec.ts >> reminders ui >> sends reminder_minutes in create payload
- Location: tests/05-reminders.spec.ts:154:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.selectOption: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Reminder')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - main [ref=e2]:
    - heading "Todo Dashboard" [level=1] [ref=e3]
    - generic [ref=e4]:
      - generic [ref=e5]: Title
      - generic [ref=e6]:
        - textbox "Title" [ref=e7]:
          - /placeholder: What needs to be done?
          - text: Pay invoice
        - generic [ref=e8]:
          - generic [ref=e9]: Priority
          - combobox "Priority" [ref=e10]:
            - option "High"
            - option "Medium" [selected]
            - option "Low"
        - button "Add Todo" [ref=e11]
      - generic [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]: Due date
          - textbox "Due date" [active] [ref=e15]: 2026-10-15
        - generic [ref=e16]:
          - checkbox "Repeat" [ref=e17]
          - generic [ref=e18]: Repeat
    - paragraph [ref=e19]: No todos yet
    - generic [ref=e20]:
      - generic [ref=e21]: Filter by priority
      - combobox "Filter by priority" [ref=e22]:
        - option "All Priorities" [selected]
        - option "High Priority"
        - option "Medium Priority"
        - option "Low Priority"
    - generic [ref=e23]:
      - heading "Pending (0)" [level=2] [ref=e24]
      - list
    - generic [ref=e25]:
      - heading "Completed (0)" [level=2] [ref=e26]
      - list
  - button "Open Next.js Dev Tools" [ref=e32] [cursor=pointer]:
    - img [ref=e33]
  - alert [ref=e36]
```

# Test source

```ts
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
  136 |     await expect(reminderSelect).toBeDisabled();
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
> 194 |     await page.getByLabel('Reminder').selectOption('1440');
      |                                       ^ Error: locator.selectOption: Test timeout of 30000ms exceeded.
  195 |     await page.getByRole('button', { name: 'Add Todo' }).click();
  196 | 
  197 |     expect(capturedBody.reminder_minutes).toBe(1440);
  198 |     expect(capturedBody.due_date).toBe('2026-10-15');
  199 |   });
  200 | });
  201 | 
```