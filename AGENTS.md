# Instructions for Codex

- Read `PROJECT_STATUS.md` before making code or configuration changes.
- Preserve existing working functionality and verify how a change affects the client and API together.
- Use the current React, Vite, Tailwind CSS, Express, MongoDB, Mongoose, and Axios stack unless a change is justified by the task.
- Make small, incremental changes that fit the existing project structure.
- Before implementation, explain which files will change and why.
- Never expose, overwrite, or commit `.env` secrets. Never print secret values in terminal output or documentation.
- Never hardcode database credentials; read connection settings from environment variables.
- Follow the existing coding style and avoid unrelated refactors or new dependencies.
- Run relevant tests, lint, or build checks when possible and report what was run. Do not claim checks passed unless they were run.
- Update `PROJECT_STATUS.md` when implementation status, architecture, setup, API behavior, or limitations change.
- Do not reset, clear, or delete MongoDB data unless the user explicitly requests that operation.
