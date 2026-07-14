# plan.md

## Step 1: Establish E2E Testing Framework & write TEST_INFRA.md
- Explore codebase to see what testing libraries/frameworks are already installed or should be installed.
- Propose/install an appropriate test runner (e.g., Playwright, Cypress, or Jest/vitest if API-only/unit-based, but since it's E2E and involves UI components like react-chessboard, Playwright is ideal for browser E2E, or Cypress. Let's check if Playwright/Cypress/Jest are installed in package.json).
- Document features, architecture, and directories in `TEST_INFRA.md`.

## Step 2: Implement Tier 1 (Feature Coverage)
- We need 20 test cases (5 per feature, 4 features).
  - Feature 1 (Chat History): Clear chat button calls API, API clears, cron cleanup clears older than 48h.
  - Feature 2 (Premium Video): Visual locks on premium videos, trigger purchase click, admin checkbox, isPremium user bypasses lock.
  - Feature 3 (Leaderboard Aesthetics): Premium users highlighted with yellow-500/10, non-premium not highlighted, premium user borders.
  - Feature 4 (Puzzles): Board load, FEN rendering, chess.js verification, submitting correct/incorrect, daily limit blocking (LIMIT_REACHED).

## Step 3: Implement Tier 2 (Boundary & Corner Cases)
- 20 test cases (5 per feature).
  - Feature 1: Non-existent users, deleting chat when none exists, cron cleanup with messages exactly 48h vs 47.9h vs 48.1h.
  - Feature 2: Clicking locked video multiple times, empty video lists, creating premium video with empty/invalid inputs.
  - Feature 3: Empty leaderboard, ties in premium status, multiple premium users, zero points.
  - Feature 4: Submitting invalid moves, rapid multiple submissions, limit at exactly 10, limit for premium users (unlimited).

## Step 4: Implement Tier 3 (Cross-Feature Combinations)
- 4 test cases (pairwise combination).
  - e.g., Puzzle solved counter / premium status check affecting puzzle limits.
  - Premium status purchase in video library immediately unlocking puzzles.
  - Chat deletion / message counts.
  - Premium status changing on leaderboard and instantly unlocking premium videos.

## Step 5: Implement Tier 4 (Real-World Application Scenarios)
- 5 test cases.
  - Student starts chat, solves 10 puzzles (reaches limit), purchases premium, gets unlimited puzzles, watches premium video, ascends leaderboard with highlighting.
  - Admin adds new premium video, student views locked, admin gives student premium, student views unlocked video.

## Step 6: Verify and Publish TEST_READY.md
- Run all tests.
- Ensure all pass.
- Write `TEST_READY.md` at project root.
