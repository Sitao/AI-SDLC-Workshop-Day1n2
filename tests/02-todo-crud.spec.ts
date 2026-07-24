import { expect, test } from '@playwright/test';

type TodoRecord = {
  id: number;
  title: string;
  completed: boolean;
  due_date: string | null;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
};

test.describe('todo crud ui', () => {
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
        const body = request.postDataJSON() as { title: string };
        const todo: TodoRecord = {
          id: nextId++,
          title: body.title,
          completed: false,
          due_date: null,
          priority: 'medium',
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

  test('shows empty state initially', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Todo Dashboard' })).toBeVisible();
    await expect(page.getByText('No todos yet')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pending (0)' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Completed (0)' })).toBeVisible();
  });

  test('creates a todo and places it under pending', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Title').fill('Buy milk');
    await page.getByRole('button', { name: 'Add Todo' }).click();

    await expect(page.getByText('Buy milk')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pending (1)' })).toBeVisible();
  });

  test('completes and deletes a todo', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Title').fill('Read docs');
    await page.getByRole('button', { name: 'Add Todo' }).click();

    await page.getByRole('checkbox', { name: 'Mark Read docs complete' }).check();
    await expect(page.getByRole('heading', { name: 'Completed (1)' })).toBeVisible();

    await page.getByRole('button', { name: 'Delete Read docs' }).click();
    await expect(page.getByText('Read docs')).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'Completed (0)' })).toBeVisible();
  });
});
