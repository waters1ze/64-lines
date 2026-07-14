# Project Plan — Chess School 64 Lines (Шахматная школа 64 линии)

This plan outlines the coordination strategy for implementing the features specified in the original request.

## Target Features
1. **Puzzles Feature (R1)**: A tactical puzzle solving section on the teacher-hub page, integrated with `/api/puzzles` and `/api/puzzles/submit`, handling rating limits.
2. **Premium Video Library (R2)**: Visual locks for non-premium users, purchase trigger handlers, and an admin checkbox for marking videos premium.
3. **Chat History Management (R3)**: Chat message deletion endpoint (`/api/chat/delete`) and 48-hour message cleanup cron endpoint (`/api/cron/cleanup-messages`).
4. **Premium Leaderboard Aesthetics (R4)**: Visual highlighting of premium users on the leaderboard.

## Execution Tracks

### Track A: E2E Testing (Requirement-driven, Opaque-box)
- **Objective**: Establish the E2E test suite covering Tiers 1-4.
- **Milestone E2E-1**: Create test runner and basic setup.
- **Milestone E2E-2**: Write test cases for:
  - Chat history endpoints (R3).
  - Premium video library (R2).
  - Leaderboard aesthetics (R4).
  - Puzzles feature interface and limit handling (R1).
- **Deliverable**: `TEST_READY.md` containing test instructions and features checklist.

### Track B: Implementation
- **Milestone 1**: Chat history deletion and cleanup API endpoints.
- **Milestone 2**: Premium video library visual locks and admin premium checkbox.
- **Milestone 3**: Premium leaderboard highlighting.
- **Milestone 4**: Puzzle solving interface and submission API limit logic.
- **Milestone 5**: Full Integration and verification against E2E test suite.
- **Milestone 6**: Adversarial testing & white-box code-coverage hardening.

## Roster & Delegation
- **E2E Testing Track**: Spawns an E2E Testing Orchestrator (archetype `self`) to manage Track A.
- **Milestone Tracks**: Spawns Sub-orchestrators for implementing specific modules, or runs the iteration cycle directly.
