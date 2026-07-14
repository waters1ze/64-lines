# Scope: Implementation Track

## Architecture
- Next.js & React Components: Client-side dashboards and page routes in `app/` and `components/`.
- Database: PostgreSQL database accessed via Prisma Client.
- Chat: Poll-based message fetching in `ChatComponent.tsx`.
- Video Library: Video list rendered inside `VideosSection` in `components/teacher-hub.tsx`.
- Leaderboard: Student ranking list in `Leaderboard` in `components/teacher-hub.tsx`.
- Puzzles: Chess.js verification, submit result API, limit blocking.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Chat History Management | Implement `/api/chat/delete`, `/api/cron/cleanup-messages` and button fix in `ChatComponent.tsx` | None | IN_PROGRESS |
| M2 | Premium Video Library | Display locks, block viewing, trigger purchases, and add admin `isPremium` checkbox for Video | None | PLANNED |
| M3 | Premium Leaderboard | Visual highlighting for premium users on the leaderboard | None | PLANNED |
| M4 | Puzzles Feature Integration | Integrate the `Puzzles` component on teacher-hub, add navigation, hook limits | None | PLANNED |

## Interface Contracts
### Client ↔ Puzzles API (`/api/puzzles`)
- **GET**: Returns `{ id, fen, moves, rating, themes }` (random puzzle)
- **Status 403**: Returns `{ error: 'LIMIT_REACHED' }` if user has reached daily puzzle limit (10 for non-premium)

### Client ↔ Puzzles Submit API (`/api/puzzles/submit`)
- **POST**: Body `{ isCorrect: boolean }`.
- **Response**: `{ rating, ratingChange, puzzlesSolvedToday }`
- **Status 403**: Returns `{ error: 'LIMIT_REACHED' }` if daily limit is reached

### Client ↔ Video API (`/api/videos/create` / `/api/videos/[id]`)
- **POST/PUT**: Body `{ title, meta, url, isPremium: boolean }`
- **Response**: Video object with `isPremium` field

### Client ↔ Chat API (`/api/chat/delete`)
- **DELETE**: Query param `with=[userId]`. Deletes all messages between session user and `with` user.

### Cron ↔ Cleanup API (`/api/cron/cleanup-messages`)
- **DELETE/GET**: Clean up messages older than 48 hours.

## Code Layout
- `components/teacher-hub.tsx`: Main dashboard and video/leaderboard components.
- `components/ChatComponent.tsx`: Chat sidebar and window.
- `components/Puzzles.tsx`: Board solver interface.
- `app/api/chat/delete/route.ts`: New delete chat history API endpoint.
- `app/api/cron/cleanup-messages/route.ts`: New 48h message cleanup cron API endpoint.
- `app/api/videos/create/route.ts` & `app/api/videos/[id]/route.ts`: Create/edit video API endpoints.
