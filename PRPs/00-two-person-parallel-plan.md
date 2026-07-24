# Two-Person Parallel Implementation Plan

Source of truth: [PRPs/00-one-shot-implementation.md](./00-one-shot-implementation.md)

## Goal

Split the full Todo App build between two engineers so they can work in parallel with minimal merge conflicts, clear handoff contracts, and roughly equal total effort.

## Planning Rules

1. Split by file ownership first, then by feature ownership.
2. Keep `app/page.tsx` under one owner only.
3. Freeze shared contracts early: schema, types, route payloads, and auth/session shape.
4. Treat equal work as equal complexity and risk, not equal feature count.
5. Merge at milestone gates, not continuously into the same files.

## Work Split Summary

Engineer A owns backend, shared contracts, data integrity, and all server routes.

Engineer B owns frontend pages, client workflows, calendar rendering, and the full Playwright suite.

This is the cleanest equal split because the repo's largest conflict surface is the monolithic UI file, while the highest-risk logic sits in authentication, recurrence, reminder timing, and import/export.

## Shared Kickoff Phase

Both engineers pair briefly before splitting.

### Deliverables

| Deliverable | Primary Owner | Notes |
|---|---|---|
| Next.js app scaffold and dependency install | Engineer A | Includes all libraries from the one-shot PRP |
| App shell files: `app/layout.tsx`, `app/globals.css`, core config | Engineer B | Keeps frontend ownership clean |
| `lib/db.ts` with full schema, all interfaces, and method signatures | Engineer A | Schema and types are frozen after review |
| `lib/timezone.ts` and `lib/auth.ts` | Engineer A | Shared backend contract |
| `middleware.ts` | Engineer A | Auth protection for `/` and `/calendar` |
| `playwright.config.ts` and `tests/helpers.ts` skeleton | Engineer B | Includes Singapore timezone and virtual WebAuthn setup |
| Route contract sheet for request/response payloads | Both | This is the handoff agreement |

### Exit Criteria

1. `npm run dev` starts.
2. `lib/db.ts` compiles with the full schema and type set.
3. Both engineers agree on route payload shapes before implementation diverges.

## Engineer A Workstream

### Ownership

Engineer A exclusively owns these files and directories:

- `lib/db.ts`
- `lib/auth.ts`
- `lib/timezone.ts`
- `lib/hooks/useNotifications.ts`
- `middleware.ts`
- `app/api/**`
- `scripts/seed-holidays.ts`

### Feature Scope

| Order | Area | Scope |
|---|---|---|
| 1 | Auth | WebAuthn register/login options and verify routes, logout, session, `/api/auth/me` |
| 2 | Todo CRUD | `/api/todos`, `/api/todos/[id]`, validation, server sorting support as needed |
| 3 | Priority | Priority validation and persistence |
| 4 | Recurring Todos | `calculateNextDueDate`, recurring completion branch in todo update |
| 5 | Reminders | `/api/notifications/check`, dedup via `last_notification_sent`, notification hook |
| 6 | Subtasks API | Create, update, delete subtask routes |
| 7 | Tags API | Tag CRUD and todo-tag attach/detach routes |
| 8 | Templates API | Template CRUD and `/api/templates/[id]/use` |
| 9 | Export/Import | JSON/CSV export, validated transactional import, tag conflict resolution |
| 10 | Holidays | `GET /api/holidays` and seed script |

### Complexity Notes

Engineer A has fewer files but owns the highest-risk logic:

- WebAuthn correctness and session security
- recurring date math and month/year clamping
- reminder timing windows and dedup rules
- import transaction integrity and ID remapping
- SQLite schema fidelity and cascade behavior

## Engineer B Workstream

### Ownership

Engineer B exclusively owns these files and directories:

- `app/page.tsx`
- `app/login/page.tsx`
- `app/calendar/page.tsx`
- `app/layout.tsx`
- `app/globals.css`
- `next.config.ts`
- `tailwind.config.ts`
- `playwright.config.ts`
- `tests/**`
- `public/**` if assets are needed

### Feature Scope

| Order | Area | Scope |
|---|---|---|
| 1 | Login UI | WebAuthn browser flow, register/login UX, redirect behavior |
| 2 | Todo CRUD UI | Main list, create/edit/delete flows, Overdue/Pending/Completed sections |
| 3 | Priority UI | Badge rendering, priority input, color handling |
| 4 | Recurring UI | Recurrence controls and recurring badge |
| 5 | Reminder UI | Reminder dropdown, disabled state without due date, permission flow |
| 6 | Subtasks UI | Inline CRUD, progress text, progress bar behavior |
| 7 | Tags UI | Tag chips, attach/detach UX, Manage Tags modal |
| 8 | Templates UI | Create/use template flows and subtasks capture |
| 9 | Search & Filtering | Debounce, AND-order filtering, presets in localStorage |
| 10 | Calendar | Grid generation, month URL state, holiday rendering, day modal |
| 11 | Export/Import UI | Download/upload actions and user feedback |
| 12 | E2E Tests | Helpers plus all Playwright specs |

### Complexity Notes

Engineer B owns more lines and most of the integration surface:

- the monolithic `app/page.tsx`
- calendar rendering and date state handling
- all user-facing feature interactions
- the full Playwright suite and end-to-end verification

## Equalization Rationale

The split is intentionally not 50/50 by feature count.

- Engineer A owns the densest correctness and security work.
- Engineer B owns the largest total implementation volume and all E2E coverage.
- This yields a near-even split by effort while minimizing conflicts.

## Integration Contracts

### Shared Contracts Frozen in Kickoff

1. `lib/db.ts` interfaces and exported type names.
2. Session shape from `lib/auth.ts`.
3. Request and response payloads for every API route.
4. Hook signature for `lib/hooks/useNotifications.ts`.

### Required API Expectations for Engineer B

Engineer B should build against these stable response shapes:

| Route | Expected Shape |
|---|---|
| `GET /api/auth/me` | `{ user: { id, username } }` or `401` |
| `GET /api/todos` | `{ todos: Todo[] }` |
| `POST /api/todos` | `{ todo: Todo }` |
| `PUT /api/todos/[id]` | `{ todo: Todo }` |
| `POST /api/todos/[id]/subtasks` | `{ subtask: Subtask }` |
| `GET /api/tags` | `{ tags: Tag[] }` |
| `GET /api/templates` | `{ templates: Template[] }` |
| `GET /api/notifications/check` | `{ notifications: Array<{ todoId: number; title: string; dueDate: string }> }` |
| `POST /api/todos/import` | `{ imported: number }` |

If any payload must change after kickoff, Engineer A proposes it first and Engineer B rebases after agreement.

## Milestones

### M0: Scaffold and Contract Lock

- App boots.
- Types exist.
- Route contracts are agreed.

### M1: Auth Vertical Slice

- Engineer A completes auth routes, session helpers, and middleware.
- Engineer B completes login page against real auth routes.
- Manual register/login flow works end to end.

### M2: Core Todo Vertical Slice

- Engineer A completes todo CRUD and priority persistence.
- Engineer B completes main list, forms, sectioning, and priority badges.
- Create, edit, complete, and delete todo flows work end to end.

### M3: Extended Todo Features

- Engineer A completes recurring, reminders, subtasks, tags, and templates APIs.
- Engineer B completes their corresponding UI flows in `app/page.tsx`.
- Feature surfaces integrate against live routes.

### M4: Calendar and Data Portability

- Engineer A completes holidays plus export/import.
- Engineer B completes calendar page, month navigation, export/import UX, and day modal.

### M5: Quality Gate

- Engineer B runs and stabilizes Playwright coverage.
- Engineer A fixes backend issues found by E2E or build/lint.
- Both engineers close remaining integration defects.

## Parallel Execution Rules

1. Engineer A merges first at each milestone because the API is the dependency surface.
2. Engineer B may mock route responses locally until M1 and M2 are ready.
3. Engineer A never edits `app/page.tsx`.
4. Engineer B never edits `app/api/**`.
5. Post-kickoff edits to `lib/db.ts` are owned by Engineer A only.

## Merge Conflict Mitigation

| Conflict Risk | Mitigation |
|---|---|
| `app/page.tsx` becomes a hotspot | Engineer B owns it exclusively |
| `lib/db.ts` changes ripple widely | Freeze interfaces early; Engineer A only after kickoff |
| Config churn during setup | Finish config in M0 and avoid reopening unless blocked |
| Tests rely on unstable payloads | Lock route shapes in kickoff and keep them stable |
| Calendar logic overlaps timezone logic | Engineer B owns calendar rendering; Engineer A owns timezone utilities |

## Definition of Done Per Engineer

### Engineer A

- All schema objects and route handlers required by the one-shot PRP exist.
- Every API route checks session first where required.
- WebAuthn counter handling uses `?? 0` and respects clone-attack safeguards.
- Recurring due-date generation handles monthly and yearly edge cases.
- Notification polling data is deduplicated correctly.
- Template usage recreates subtasks from `subtasks_json`.
- Export/import preserves subtasks and tags while remapping IDs.
- Build passes for server code.

### Engineer B

- Main UI exposes all feature workflows described in the one-shot PRP.
- Search/filter order is exactly: search, priority, tag, completion, date range.
- Reminder, recurring, priority, and tag badges render correctly.
- Subtask progress UI hides at zero and turns green at exactly 100%.
- Calendar grid handles 5 or 6 rows, adjacent-month fillers, and `?month=YYYY-MM` state.
- Login and logout flows work in the browser.
- Playwright coverage exists for all required user flows.

## Recommended Execution Order

1. Pair for M0.
2. Engineer A drives auth immediately.
3. Engineer B builds login plus page shell in parallel, using mocked route responses if needed.
4. Engineer A delivers todo CRUD next; Engineer B switches the main UI from mocks to live routes.
5. Both proceed through M3 and M4 on their owned surfaces.
6. Finish with M5 stabilization until `build`, `lint`, and Playwright are green.

## Bottom Line

This split keeps ownership clean:

- Engineer A: backend, shared logic, correctness-sensitive features.
- Engineer B: frontend, user flows, calendar, and E2E coverage.

That is the most parallelizable two-person plan available from the one-shot PRP because it isolates the monolithic UI to one person and the shared API/data layer to the other.