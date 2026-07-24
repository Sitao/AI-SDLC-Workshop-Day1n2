import { expect, test } from '@playwright/test';

type Priority = 'high' | 'medium' | 'low';
type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';
type ReminderMinutes = 15 | 30 | 60 | 120 | 1440 | 2880 | 10080;

type TodoRecord = {
  id: number;
  title: string;
  completed: boolean;
  due_date: string | null;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: ReminderMinutes | null;
  created_at: string;
};

test.describe('reminders ui', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      class FakeNotification {
        static permission: NotificationPermission = 'default';

        static async requestPermission(): Promise<NotificationPermission> {
          FakeNotification.permission = 'granted';
          return 'granted';
        }

        constructor(_title: string, _options?: NotificationOptions) {
          // No-op for tests.
        }
      }

      // @ts-expect-error Override browser Notification for deterministic tests.
      window.Notification = FakeNotification;
    });

    let todos: TodoRecord[] = [];
    let nextId = 1;

    await page.route('**/api/todos', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ todos }),
        });
        return;
      }

      if (request.method() === 'POST') {
        const body = request.postDataJSON() as {
          title: string;
          priority?: Priority;
          due_date?: string | null;
          is_recurring?: boolean;
          recurrence_pattern?: RecurrencePattern | null;
          reminder_minutes?: ReminderMinutes | null;
        };

        const todo: TodoRecord = {
          id: nextId++,
          title: body.title,
          completed: false,
          due_date: body.due_date ?? null,
          priority: body.priority ?? 'medium',
          is_recurring: body.is_recurring ?? false,
          recurrence_pattern: body.recurrence_pattern ?? null,
          reminder_minutes: body.reminder_minutes ?? null,
          created_at: new Date().toISOString(),
        };

        todos = [todo, ...todos];

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ todo }),
        });
        return;
      }

      await route.fulfill({ status: 405 });
    });

    await page.route('**/api/todos/*', async (route, request) => {
      const url = new URL(request.url());
      const id = Number(url.pathname.split('/').pop());

      if (request.method() === 'PUT') {
        const body = request.postDataJSON() as { completed?: boolean };
        todos = todos.map((todo) =>
          todo.id === id ? { ...todo, completed: body.completed ?? todo.completed } : todo
        );

        const todo = todos.find((item) => item.id === id);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ todo }),
        });
        return;
      }

      if (request.method() === 'DELETE') {
        todos = todos.filter((todo) => todo.id !== id);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
        return;
      }

      await route.fulfill({ status: 405 });
    });
  });

  test('enable notifications button requests permission and toggles state', async ({ page }) => {
    await page.goto('/');

    const button = page.getByRole('button', { name: '🔔 Enable Notifications' });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();

    await button.click();

    await expect(page.getByRole('button', { name: '🔔 Notifications On' })).toBeDisabled();
  });

  test('reminder select is disabled without due date and enabled with due date', async ({ page }) => {
    await page.goto('/');

    const reminderSelect = page.getByLabel('Reminder');
    await expect(reminderSelect).toBeDisabled();

    await page.getByLabel('Due date').fill('2026-10-01');
    await expect(reminderSelect).toBeEnabled();
  });

  test('creates todo with reminder and shows reminder badge', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Title').fill('Submit report');
    await page.getByLabel('Due date').fill('2026-10-01');
    await page.getByLabel('Reminder').selectOption('60');
    await page.getByRole('button', { name: 'Add Todo' }).click();

    await expect(page.getByText('Submit report')).toBeVisible();
    await expect(page.getByTestId('reminder-badge')).toHaveText('🔔 1h');
  });

  test('sends reminder_minutes in create payload', async ({ page }) => {
    await page.goto('/');

    let capturedBody: Record<string, unknown> = {};

    await page.route('**/api/todos', async (route, request) => {
      if (request.method() === 'POST') {
        capturedBody = request.postDataJSON() as Record<string, unknown>;

        const todo: TodoRecord = {
          id: 999,
          title: String(capturedBody.title ?? ''),
          completed: false,
          due_date: (capturedBody.due_date as string | null | undefined) ?? null,
          priority: (capturedBody.priority as Priority | undefined) ?? 'medium',
          is_recurring: (capturedBody.is_recurring as boolean | undefined) ?? false,
          recurrence_pattern:
            (capturedBody.recurrence_pattern as RecurrencePattern | null | undefined) ?? null,
          reminder_minutes:
            (capturedBody.reminder_minutes as ReminderMinutes | null | undefined) ?? null,
          created_at: new Date().toISOString(),
        };

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ todo }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ todos: [] }),
      });
    });

    await page.getByLabel('Title').fill('Pay invoice');
    await page.getByLabel('Due date').fill('2026-10-15');
    await page.getByLabel('Reminder').selectOption('1440');
    await page.getByRole('button', { name: 'Add Todo' }).click();

    expect(capturedBody.reminder_minutes).toBe(1440);
    expect(capturedBody.due_date).toBe('2026-10-15');
  });
});
