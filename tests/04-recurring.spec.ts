import { expect, test } from '@playwright/test';

type Priority = 'high' | 'medium' | 'low';
type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

type TodoRecord = {
  id: number;
  title: string;
  completed: boolean;
  due_date: string | null;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  created_at: string;
};

test.describe('recurring todos', () => {
  test.beforeEach(async ({ page }) => {
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
        };
        const todo: TodoRecord = {
          id: nextId++,
          title: body.title,
          completed: false,
          due_date: body.due_date ?? null,
          priority: body.priority ?? 'medium',
          is_recurring: body.is_recurring ?? false,
          recurrence_pattern: body.recurrence_pattern ?? null,
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

  test('repeat checkbox is disabled when no due date is set', async ({ page }) => {
    await page.goto('/');

    const repeatCheckbox = page.getByLabel('Repeat');
    await expect(repeatCheckbox).toBeVisible();
    await expect(repeatCheckbox).toBeDisabled();

    // Helper text shown
    await expect(page.getByText('Set a due date to enable repeat')).toBeVisible();
  });

  test('repeat checkbox becomes enabled after setting due date', async ({ page }) => {
    await page.goto('/');

    const repeatCheckbox = page.getByLabel('Repeat');
    await expect(repeatCheckbox).toBeDisabled();

    await page.getByLabel('Due date').fill('2026-08-01');
    await expect(repeatCheckbox).toBeEnabled();

    // Helper text hidden when due date is set
    await expect(page.getByText('Set a due date to enable repeat')).not.toBeVisible();
  });

  test('recurrence pattern select appears when repeat is checked', async ({ page }) => {
    await page.goto('/');

    // Pattern select not visible initially
    await expect(page.getByLabel('Recurrence pattern')).not.toBeVisible();

    // Enable repeat
    await page.getByLabel('Due date').fill('2026-08-01');
    await page.getByLabel('Repeat').check();

    // Pattern select now visible with options
    const patternSelect = page.getByLabel('Recurrence pattern');
    await expect(patternSelect).toBeVisible();

    // Verify all options exist
    await expect(patternSelect.locator('option')).toHaveCount(4);
    await expect(patternSelect).toHaveValue('daily');
  });

  test('creates recurring todo and shows recurring badge', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Title').fill('Standup meeting');
    await page.getByLabel('Due date').fill('2026-08-01');
    await page.getByLabel('Repeat').check();
    await page.getByLabel('Recurrence pattern').selectOption('weekly');
    await page.getByRole('button', { name: 'Add Todo' }).click();

    // Todo created
    await expect(page.getByText('Standup meeting')).toBeVisible();

    // Recurring badge visible
    await expect(page.getByTestId('recurring-badge')).toBeVisible();
    await expect(page.getByTestId('recurring-badge')).toHaveText('Weekly');
  });

  test('sends correct payload with recurring fields', async ({ page }) => {
    await page.goto('/');

    let capturedBody: Record<string, unknown> = {};

    // Intercept to capture POST body
    await page.route('**/api/todos', async (route, request) => {
      if (request.method() === 'POST') {
        capturedBody = request.postDataJSON() as Record<string, unknown>;
        const todo: TodoRecord = {
          id: 99,
          title: capturedBody.title as string,
          completed: false,
          due_date: (capturedBody.due_date as string) ?? null,
          priority: (capturedBody.priority as Priority) ?? 'medium',
          is_recurring: (capturedBody.is_recurring as boolean) ?? false,
          recurrence_pattern: (capturedBody.recurrence_pattern as RecurrencePattern) ?? null,
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

    await page.getByLabel('Title').fill('Daily review');
    await page.getByLabel('Due date').fill('2026-09-15');
    await page.getByLabel('Repeat').check();
    await page.getByLabel('Recurrence pattern').selectOption('monthly');
    await page.getByRole('button', { name: 'Add Todo' }).click();

    expect(capturedBody.title).toBe('Daily review');
    expect(capturedBody.due_date).toBe('2026-09-15');
    expect(capturedBody.is_recurring).toBe(true);
    expect(capturedBody.recurrence_pattern).toBe('monthly');
  });

  test('non-recurring todo does not show recurring badge', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Title').fill('One-off task');
    await page.getByRole('button', { name: 'Add Todo' }).click();

    await expect(page.getByText('One-off task')).toBeVisible();
    await expect(page.getByTestId('recurring-badge')).not.toBeVisible();
  });

  test('unchecking repeat hides pattern select and clears value', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Due date').fill('2026-08-01');
    await page.getByLabel('Repeat').check();
    await page.getByLabel('Recurrence pattern').selectOption('yearly');

    // Uncheck repeat
    await page.getByLabel('Repeat').uncheck();

    // Pattern select hidden
    await expect(page.getByLabel('Recurrence pattern')).not.toBeVisible();

    // Create todo without recurrence
    await page.getByLabel('Title').fill('Not recurring');
    await page.getByRole('button', { name: 'Add Todo' }).click();

    await expect(page.getByText('Not recurring')).toBeVisible();
    await expect(page.getByTestId('recurring-badge')).not.toBeVisible();
  });

  test('clearing due date unchecks and disables repeat', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Due date').fill('2026-08-01');
    await page.getByLabel('Repeat').check();

    // Clear due date
    await page.getByLabel('Due date').fill('');

    // Repeat gets unchecked and disabled
    await expect(page.getByLabel('Repeat')).toBeDisabled();
    await expect(page.getByLabel('Repeat')).not.toBeChecked();
    await expect(page.getByLabel('Recurrence pattern')).not.toBeVisible();
  });
});
