# API-Verse (ATMP) — Sprint 1 Frontend

A lightweight React frontend for the API-Verse interim assessment / first sprint. It provides a presentable UI and basic browser-side workflows without introducing advanced backend infrastructure.

## Features included

- Demo sign-in with role selection (Owner, Analyst, Tester, Viewer, Super Admin).
- Project creation, project overview and project settings.
- API endpoint management and small OpenAPI / Postman JSON imports.
- Requirement entry and TXT, Markdown, CSV or JSON imports.
- Keyword-based endpoint suggestions with manual confirmation of mappings.
- Requirement coverage and missing-API gap reporting.
- Authentication profile metadata (no passwords or API keys).
- Basic test case generation and deterministic simulated test runs.
- Test result history and CSV exports.
- Team member and role management in local demo data.
- Responsive layout and browser-local persistence.

## Requirements

- Node.js **22.12 or newer**
- npm **10 or newer**

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

Create a production build with:

```bash
npm run build
npm run preview
```

## Open the offline demo (no npm install required)

The repository includes a self-contained browser demo. Open `OPEN_DEMO.html` in a modern browser. The offline demo uses the bundled compatibility runtime in `public/vendor/` and the generated bundle in `demo/`.

To rebuild that offline bundle after editing the React source, run:

```bash
npm install
npm run build:offline
```

The Vite production output is written to `dist/` and is intentionally ignored by Git. The offline demo bundle is written to `demo/app.offline.js` so it does not conflict with Vite's build directory.

## Repository structure

```text
api-verse-sprint1/
├── .gitignore
├── OPEN_DEMO.html
├── README.md
├── package.json
├── index.html
├── src/
│   ├── App.jsx
│   ├── data.js
│   ├── main.jsx
│   └── styles.css
├── public/vendor/          # Offline preview runtime and its license
├── demo/                   # Offline preview bundle
├── examples/               # Sample OpenAPI and requirements files
├── docs/                   # Sprint scope and preview images
└── scripts/                # Offline demo build script
```

## Demo walkthrough

1. Choose **Owner** on the demo sign-in page.
2. Open **Projects** and create a project.
3. Import `examples/sample-openapi.json` or add endpoints manually.
4. Import `examples/sample-requirements.txt` or add requirements manually.
5. Click **Find suggestions** and manually confirm appropriate endpoint mappings.
6. Add an authentication profile (metadata only).
7. Generate basic test cases and select **Simulate test run**.
8. Review the simulated results and export CSV reports.
9. Open **Team & Roles** to add a demo member and change their role.

## What is simulated / not implemented

This is a frontend-only Sprint 1 prototype. It does **not** provide:

- Real user authentication, password reset, or server-enforced RBAC.
- Backend APIs, database persistence, or live collaboration.
- Real email invitations or invitation acceptance.
- AI-based semantic requirement analysis or AI test generation.
- Full OpenAPI/YAML parsing, remote URL sync, or PDF/DOCX extraction.
- Secure credential storage or actual HTTP API test execution.
- Production audit logs, notifications, or PDF reports.

Role-based UI behavior is for demonstration only and is not a security boundary. Test runs are deterministic simulations, not real API requests. Do not enter real passwords, tokens, API keys, or other secrets. Data is stored in the current browser's `localStorage` and is not shared between users or devices.

For the detailed implementation boundary and next-sprint roadmap, see [`docs/SPRINT1_SCOPE.md`](docs/SPRINT1_SCOPE.md).

## Push this project to GitHub

1. Extract this ZIP file.
2. Create an empty repository on GitHub.
3. Open a terminal in the extracted project folder and run:

```bash
git init
git add .
git commit -m "Add API-Verse Sprint 1 frontend"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the remote URL with your own GitHub repository URL. Do not commit real `.env` files, credentials, API tokens, or private client data.
