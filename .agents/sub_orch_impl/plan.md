# Implementation Plan

This plan details the steps to implement all application features listed in the original request.

## Milestones & Execution Flow

For each milestone, we will follow the loop:
1. **Explorer**: Spawn 3 Explorers to investigate current codebase, analyze requirements, and suggest implementation strategy.
2. **Worker**: Spawn 1 Worker with Explorer recommendations to make the actual changes.
3. **Reviewers**: Spawn 2 Reviewers to verify build/tests pass, and check correctness.
4. **Challengers**: Spawn 2 Challengers to perform empirical correctness/verification checks.
5. **Auditor**: Spawn 1 Forensic Auditor to verify integrity and ensure no cheating (e.g. hardcoding).
6. **Gate**: If all checks pass and Auditor is CLEAN, proceed. Otherwise, iterate.

If `TEST_READY.md` is published by the E2E testing track during our work, we will also run the E2E tests at each milestone's verification gate.

## Milestone Breakdown

### Milestone 1: Chat History Management
- Scope:
  - Add "Clear Chat" button in `components/ChatComponent.tsx` that calls `/api/chat/delete`.
  - Implement `/api/chat/delete` route (`app/api/chat/delete/route.ts`).
  - Implement 48h message cleanup cron API (`app/api/cron/cleanup-messages/route.ts`).
- Verification: Build succeeds, unit/integration tests pass.

### Milestone 2: Premium Video Library
- Scope:
  - Display locks for premium videos in `VideosSection` of `components/teacher-hub.tsx`.
  - Block viewing for non-premium users, trigger purchase workflow (or modal).
  - Add admin `isPremium` checkbox for Video (creation/editing interface).
- Verification: Build succeeds, video player blocks non-premium access.

### Milestone 3: Premium Leaderboard Row Aesthetics
- Scope:
  - Update leaderboard rendering in `Leaderboard` of `components/teacher-hub.tsx`.
  - Apply `yellow-500/10` background/border styling for premium users.
- Verification: Classnames are correctly applied based on user premium status.

### Milestone 4: Puzzles Feature Integration
- Scope:
  - Integrate `Puzzles` component on teacher-hub dashboard.
  - Implement chess.js verification on moves.
  - Implement submit result API (`/api/puzzles/submit`).
  - Enforce puzzle limit blocking (10 per day for non-premium).
- Verification: Valid moves verified, daily limit block works.

### Phase 2: Adversarial Coverage Hardening (Tier 5)
- White-box testing of implementation code using Challengers to generate adversarial tests and Workers to fix discovered gaps.
