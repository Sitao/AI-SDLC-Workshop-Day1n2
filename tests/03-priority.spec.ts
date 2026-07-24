import { expect, test } from '@playwright/test';

type Priority = 'high' | 'medium' | 'low';

type TodoRecord = {
  id: number;
  title: string;
  completed: boolean;
  due_date: string | null;
  priority: Priority;
  created_at: string;
};

test.describe('priority system', () => {
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
        const body = request.postDataJSON() as { title: string; priority?: Priority };
        const todo: TodoRecord = {
          id: nextId++,
          title: body.title,
          completed: false,
          due_date: null,
          priority: body.priority ?? 'medium',
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
        const body = request.postDataJSON() as { completed?: boolean; priority?: Priority };
        todos = todos.map((todo) =>
          todo.id === id
            ? {
                ...todo,
                completed: body.completed ?? todo.completed,
                priority: body.priority ?? todo.priority,
              }
            : todo
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

  test('creates todo with high priority and shows badge', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Title').fill('Ship fix');
    await page.getByLabel('Priority', { exact: true }).selectOption('high');
    await page.getByRole('button', { name: 'Add Todo' }).click();

    await expect(page.getByText('Ship fix')).toBeVisible();
    await expect(page.getByTestId('priority-badge-high')).toHaveText('High');
  });

  test('defaults priority to medium when not selected', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Title').fill('Default me');
    await page.getByRole('button', { name: 'Add Todo' }).click();

    await expect(page.getByText('Default me')).toBeVisible();
    await expect(page.getByTestId('priority-badge-medium')).toHaveText('Medium');
  });

  test('sorts pending todos high then medium then low', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Title').fill('Low work');
    await page.getByLabel('Priority', { exact: true }).selectOption('low');
    await page.getByRole('button', { name: 'Add Todo' }).click();

    await page.getByLabel('Title').fill('High work');
    await page.getByLabel('Priority', { exact: true }).selectOption('high');
    await page.getByRole('button', { name: 'Add Todo' }).click();

    await page.getByLabel('Title').fill('Medium work');
    await page.getByLabel('Priority', { exact: true }).selectOption('medium');
    await page.getByRole('button', { name: 'Add Todo' }).click();

    const items = page.getByTestId('pending-list').locator('li');
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toContainText('High work');
    await expect(items.nth(1)).toContainText('Medium work');
    await expect(items.nth(2)).toContainText('Low work');
  });

  test('filters by priority and clears filter', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Title').fill('Low focus');
    await page.getByLabel('Priority', { exact: true }).selectOption('low');
    await page.getByRole('button', { name: 'Add Todo' }).click();

    await page.getByLabel('Title').fill('High focus');
    await page.getByLabel('Priority', { exact: true }).selectOption('high');
    await page.getByRole('button', { name: 'Add Todo' }).click();

    await page.getByLabel('Title').fill('Medium focus');
    await page.getByLabel('Priority', { exact: true }).selectOption('medium');
    await page.getByRole('button', { name: 'Add Todo' }).click();

    await page.getByLabel('Filter by priority').selectOption('high');
    await expect(page.getByText('High focus')).toBeVisible();
    await expect(page.getByText('Medium focus')).not.toBeVisible();
    await expect(page.getByText('Low focus')).not.toBeVisible();

    await page.getByLabel('Filter by priority').selectOption('all');
    await expect(page.getByText('High focus')).toBeVisible();
    await expect(page.getByText('Medium focus')).toBeVisible();
    await expect(page.getByText('Low focus')).toBeVisible();
  });
});
