# Context — 2026-07-15T02:40:45+03:00

## Project Environment
- **Workspace URI**: d:\Шахматная школа 64 линии
- **Technology Stack**: Next.js (TypeScript), React, Prisma ORM, react-chessboard, chess.js, Tailwind CSS.
- **Key Modules**:
  - `teacher-hub.tsx`: Main dashboard containing video library and future puzzles section.
  - `ChatComponent`: Component handling chat functionality.
  - `Leaderboard`: Component displaying leaderboard.
  - API routes: `/api/puzzles`, `/api/chat`, etc.

## Initial Codebase Inspection Notes
- Next.js TypeScript project.
- Next config: `next.config.mjs`.
- Prisma folder exists, meaning SQLite or PostgreSQL is used for the database.
- Files list show many scripts: `seed-puzzles.js`, `make-teacher.js`, `delete-user.js`, and test scripts like `test-active.js`, `test-api-delete.js`, `test-db.js`, `test-delete.js`, `test-messages.js`, `test-pgn-split.js`, etc. These files might be helpful.
