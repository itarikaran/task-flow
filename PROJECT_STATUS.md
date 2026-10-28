# TaskFlow Project Status

## Project overview

TaskFlow is a single-user task management dashboard. The React client reads and mutates task records through an Express API, which stores them in MongoDB through Mongoose.

This status is based on source and configuration inspection on 2026-10-28. The Atlas connection and local development servers were not independently started or checked during this documentation task.

## Actual technology stack

- Frontend: React 19, Vite 8, Tailwind CSS 4 (via `@tailwindcss/vite`), Axios
- Backend: Node.js, Express 5, Mongoose 9, dotenv, CORS
- Database: MongoDB, configured through `MONGODB_URI`
- JavaScript modules: frontend ES modules; backend CommonJS
- Tooling: npm, ESLint, nodemon

The root `package.json` currently declares Tailwind/Vite integration dependencies but has no scripts. The runnable client and server each have their own package manifests and lockfiles.

## Architecture and folder structure

```text
TaskFlow/
├── AGENTS.md
├── PROJECT_STATUS.md
├── package.json                 # Root dependencies; no scripts
├── package-lock.json
├── client/
│   ├── .gitignore
│   ├── package.json              # Vite scripts and React dependencies
│   ├── index.html
│   ├── vite.config.js             # React and Tailwind Vite plugins
│   └── src/
│       ├── main.jsx               # React entry point
│       ├── App.jsx                # Dashboard, form, search, filters, task actions
│       ├── index.css              # Tailwind import
│       └── services/taskService.js # Axios API client
└── server/
    ├── .env                      # Local environment file; do not expose its contents
    ├── package.json              # Express server scripts and dependencies
    └── server.js                 # Schema/model, API routes, DB connection, startup
```

`node_modules` directories are present locally and are omitted from this structure. No root `.gitignore` or `.git` directory was found. The client `.gitignore` ignores common logs, dependencies, build output, local files, and editor files, but does not include `.env` patterns. There is no server-specific ignore file. Since `server/.env` exists, it needs an ignore rule before this workspace is placed under Git; do not print, copy, or commit its values.

## Features verified in source

- Dashboard displays task totals by status and completion progress.
- Dashboard and Tasks views use a responsive workspace layout with dark navigation, clearer page hierarchy, refined statistic cards, consistent form and task panels, and subtle reduced-motion-aware transitions.
- Loading feedback, API error messaging with retry, and an empty/search-no-results state are presented in the dashboard UI.
- Dashboard highlights total tasks, due-today tasks, in-progress tasks, and completed tasks; it shows the five nearest tasks and offers an overdue-task shortcut.
- Dashboard now stays focused on overview and progress; task lists are shown on task-focused pages, not under a “Recent Tasks” dashboard section.
- Sidebar navigation includes Dashboard, My Tasks, Groups, Upcoming, and Completed, with responsive navigation and active-page styling.
- Groups are persisted in MongoDB. The Groups page can create groups; tasks can be assigned to a group during creation or editing, filtered by group, and displayed under group headings.
- The task completion indicator is an accessible button that toggles completion through the existing PATCH API; the status dropdown remains available.
- The Tasks view includes quick views for all tasks, due today, upcoming, overdue, and completed tasks; search, status and priority filters; and sorting by due date, priority, or creation time.
- Due dates are formatted for display and overdue open tasks are visibly highlighted. Date comparisons use the user's local calendar date.
- Tasks load from the API on initial render; a refresh action reloads them.
- Task creation accepts title, description, priority, and due date; new tasks default to Pending.
- Client-side search matches title and description, with a status filter.
- The Tasks view can show completed tasks through its quick view; Dashboard shows the five nearest matching tasks.
- Task status can be changed and tasks can be deleted.
- Existing tasks can be edited from the dashboard. The edit form is prefilled with title, description, status, priority, and due date; it validates a nonblank title, submits through the existing PATCH service, and replaces the task in client state with the API response.
- API calls use Axios and update the React task state on successful responses.
- Mongoose task schema validates status and priority enums and records timestamps.
- Server connects with `process.env.MONGODB_URI` after loading dotenv. It fails startup if the variable is missing.
- Server inserts two sample tasks only if the collection is empty; it does not clear existing records.

Authentication, user accounts, pagination, and automated tests are not present in the inspected files.

## API endpoints

All task endpoints return JSON. Task records include the numeric `id` and Mongoose document fields; the client uses `id` to identify tasks.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/` | Health response `{ message }` |
| GET | `/api/groups` | Return saved groups sorted by name |
| POST | `/api/groups` | Create a group from `{ name }`; rejects empty or duplicate names |
| GET | `/api/tasks` | Return all tasks sorted by numeric `id` ascending, including `groupId` |
| GET | `/api/tasks/:id` | Return one task, or 404 `{ message }` |
| POST | `/api/tasks` | Create task; accepts title, description, status, priority, dueDate, and groupId; success is 201 with created record |
| PATCH | `/api/tasks/:id` | Update allowed task fields: title, description, status, priority, dueDate, groupId; success returns updated record |
| DELETE | `/api/tasks/:id` | Delete task; success returns `{ message, task }` |

Unknown paths return 404 `{ message: "API route not found" }`. Error responses use a `{ message }` object. CORS is currently restricted to `http://localhost:5173`.

## Database and environment configuration

The backend calls `require("dotenv").config()` and reads the MongoDB connection string from `MONGODB_URI`; `PORT` is optional and defaults to `5000`. Configure these in `server/.env` for local use. Never put credentials in source or documentation. Keep `.env` out of version control and avoid displaying its contents. Startup creates Personal, Work, Study, and Projects groups only when the group collection is empty. Existing tasks without a group are assigned to Personal, or the first existing group, at backend startup. Existing task records are not deleted. Sample tasks are inserted only when the task collection is empty, and receive the default group.

The client currently hardcodes its API base URL as `http://localhost:5000/api` in `client/src/services/taskService.js`.

## Run locally

From the repository root, use separate terminals:

```sh
cd server
npm install
npm run dev
```

```sh
cd client
npm install
npm run dev
```

The backend requires a valid `MONGODB_URI` in `server/.env`; it listens on port 5000 by default. The Vite client defaults to port 5173. The client also provides `npm run build`, `npm run lint`, and `npm run preview`; the server provides `npm start` and `npm run dev`.

## Current limitations and differences from the reported status

- Core task CRUD and database wiring are present in source, but a live database connection and successful browser/API session were not verified in this inspection.
- The API includes a single-task GET route beyond the listed CRUD endpoints.
- The API URL and allowed CORS origin are fixed to local development addresses.
- New task IDs use `Date.now()`; uniqueness is enforced by MongoDB, so simultaneous creations could collide.
- There is no root `.gitignore`, no server ignore file, and no Git repository metadata detected. The existing client ignore rules do not protect `server/.env`.
- No automated test files or backend test script were found.
- Group creation is supported; group rename and deletion are not currently exposed in the UI or API.
- `client/README.md` remains the default React/Vite starter documentation rather than TaskFlow-specific setup guidance.

## Recommended next steps

1. Add a root `.gitignore` covering `.env` files (with an explicit exception only for a safe example template), `node_modules`, and generated build output; confirm no secret file is tracked before initializing or using Git.
2. Make the API URL and CORS origin configurable for deployment, retaining local defaults.
3. Add automated coverage for API validation, CRUD behavior, and the client’s error/loading states.

## Latest verification

- `npm.cmd run build` in `client/` completed successfully after group management and navigation updates.
- `npm.cmd run lint` in `client/` completed successfully after group management and navigation updates.
- `node --check server.js` in `server/` completed successfully after the group API and migration changes.
- Live MongoDB persistence, backend restart migration, and browser interaction were not exercised in this environment.

