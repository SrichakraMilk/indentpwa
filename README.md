# IndentPWA

A Next.js progressive web app scaffold with login, dashboard, and indent management.

## Features
- App Router-based Next.js structure
- Mock login and auth persistence in local storage
- Dashboard summary view
- Indent creation, status updates, and deletion
- PWA manifest with icons

## Setup

```bash
npm install
npm run dev
```

## API integration

The current implementation uses mock client-side API functions in `lib/api.ts`.
Replace the API functions in `lib/api.ts` with your backend endpoints once your APIs are ready.

## Pages

- `/login` — login form
- `/dashboard` — dashboard summary
- `/indents` — indent management
