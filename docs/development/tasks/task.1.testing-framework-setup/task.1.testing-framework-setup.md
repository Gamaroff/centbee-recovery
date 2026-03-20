---
title: Set up Testing Framework for Centbee Recovery Wallet
status: 📋 Planned
created: 2026-03-20
taskId: task.1
category: testing
priority: High
estimatedEffort: 32-40 hours
coverage: 80%
---

# Task 1: Set up Testing Framework for Centbee Recovery Wallet

## Overview

**One-sentence description:**
Establish a comprehensive testing framework for the Centbee Recovery wallet with unit, integration, and end-to-end tests targeting 80% code coverage.

**Scope:**
- Test runner setup (Vitest)
- Component testing (React Testing Library)
- API mocking (Mock Service Worker)
- Test configuration for Next.js 13 App Router
- Initial test suite for core modules
- E2E test infrastructure

**Key Deliverables:**
1. Vitest + React Testing Library configured with Next.js 13
2. Mock Service Worker (MSW) setup for Bitails API mocking
3. Initial test suites for WalletClient, Wallet component, and Bitails integration
4. E2E test suite for import → sync → send flow
5. GitHub Actions CI/CD integration for automated test runs
6. Testing documentation and patterns guide

**Expected Outcome:**
- No test coverage (0%) → 80% test coverage
- Developer-friendly test patterns established
- CI/CD pipeline validates all tests before merge
- Confidence in wallet logic correctness and UI behavior

---

## Motivation

### Current Problems

1. **Zero test coverage** — No automated validation of wallet logic correctness
2. **Manual testing only** — Every change requires manual QA of the import/sync/send flow
3. **Regression risk** — Changes to walletClient.ts, Wallet.tsx, or Bitails.ts could silently break critical wallet operations
4. **Brittle deployments** — No confidence that refactoring or dependency updates won't break production wallet functionality
5. **Slow feedback loop** — Developers can't quickly validate changes locally; must wait for manual testing

### Benefits of Solution

1. **Automated correctness validation** — Tests verify wallet derives correct keys, scans correct BIP44 paths, and handles UTXOs properly
2. **Regression prevention** — 80% coverage catches breaking changes instantly in CI/CD before merge (saves hours of manual QA per release)
3. **Faster development** — Developers get immediate feedback on wallet logic changes (vs waiting for manual testing)
4. **Safe refactoring** — Confidence to optimize walletClient.ts, improve component structure without fear of breaking functionality
5. **E2E confidence** — Full import→sync→send flow validated automatically, eliminating manual smoke tests
6. **Better code quality** — Writing tests surfaces edge cases and improves code clarity (estimated 15-20% fewer bugs post-test implementation)
7. **Developer onboarding** — New team members can understand wallet behavior and constraints through executable tests rather than reading code alone

---

## Technical Background

### Current Architecture

**Core Modules (no tests):**
- **lib/wallet/walletClient.ts** — WalletClient singleton that derives HD keys from mnemonic + PIN, scans BIP44 paths (m/44'/0/0/n external, m/44'/0/1/n change) in batches of 25
- **lib/wallet/Bitails.ts** — Broadcaster interface implementation; fetches UTXOs and raw txs from Bitails API (https://api.bitails.io) via window.fetch
- **lib/wallet/walletCache.ts** — In-memory tx cache keyed by txid to avoid re-fetching during signing
- **app/components/Wallet.tsx** — Main UI component: syncs UTXOs, displays balance, triggers send-all transactions
- **app/start/page.tsx** — Import page: accepts mnemonic + PIN, stores in localStorage

**State Persistence:**
- localStorage stores wallet_mnemonic and wallet_pin
- walletInstance singleton rehydrated on page load from localStorage

**API Integration:**
- Bitails API (https://api.bitails.io) — external dependency for UTXO/tx fetch
- No backend routes (browser-only wallet)

**Current Testing:**
- ❌ No unit tests
- ❌ No integration tests
- ❌ No E2E tests
- ❌ No test runner configured

### Target Architecture

**Testing Infrastructure:**
- Vitest as test runner (configured for Next.js 13, ESM support)
- React Testing Library for component testing
- Mock Service Worker (MSW) for Bitails API mocking (no real API calls in tests)
- @testing-library/user-event for realistic user interaction simulation
- Playwright for E2E testing (full browser simulation of import→sync→send)

**Test Organization:**
- Unit tests co-located with source files (*.spec.ts pattern)
- Integration tests in __tests__/integration/
- E2E tests in e2e/

**CI/CD Integration:**
- GitHub Actions workflow to run tests on every PR
- Block merges if coverage < 80% or tests fail

**Code Coverage:**
- Target: 80% line coverage
- walletClient.ts: 85%+ (critical logic)
- Bitails.ts: 80%+ (API integration)
- Wallet.tsx: 75%+ (UI component)
- walletCache.ts: 80%+

### Key Changes From Current State

1. Dependencies added: vitest, @vitest/ui, jsdom, @testing-library/react, @testing-library/user-event, msw, @playwright/test
2. Configuration files: vitest.config.ts, msw setup, .github/workflows/test.yml
3. Test files created: *.spec.ts files for each module
4. localStorage mocking: Tests mock localStorage (jsdom provides built-in support)
5. Bitails API mocking: MSW intercepts fetch calls to https://api.bitails.io
6. E2E tool: Playwright (full browser automation)
7. CI/CD coverage enforcement: Block PR merges if coverage drops below 80%
8. No changes to production code logic (tests validate existing behavior)

---

## Scope

### In Scope

✅ Configure Vitest with Next.js 13 App Router support
✅ Set up React Testing Library for component testing
✅ Set up Mock Service Worker (MSW) for Bitails API mocking
✅ Set up Playwright for E2E testing
✅ Create test utilities and helpers (localStorage mock, wallet fixtures, etc.)
✅ Write unit tests for:
   - lib/wallet/walletClient.ts (key derivation, BIP44 path scanning, UTXO logic)
   - lib/wallet/Bitails.ts (API integration, fetch handling, error cases)
   - lib/wallet/walletCache.ts (cache operations, txid lookups)
✅ Write integration tests for:
   - WalletClient + Bitails interaction (sync flow)
   - Transaction fee calculation (100 sat/byte model)
✅ Write component tests for:
   - app/components/Wallet.tsx (UI rendering, balance display, send button)
   - app/start/page.tsx (mnemonic + PIN input, validation, localStorage persistence)
✅ Write E2E tests for:
   - Complete import → sync → send-all flow
   - Error scenarios (invalid mnemonic, network errors, insufficient balance)
   - localStorage persistence across page refreshes
✅ Set up GitHub Actions CI/CD pipeline
✅ Create testing documentation and pattern guide
✅ Achieve 80% code coverage minimum

### Out of Scope

❌ Testing @bsv/sdk library itself (external dependency, already tested upstream)
❌ Testing browser APIs (localStorage, fetch) directly (Node.js test env sufficient)
❌ Performance/load testing (wallet is single-user, not needed)
❌ Visual regression testing (UI is simple, not critical)
❌ Mobile-specific testing (browser-only app, not applicable)
❌ Refactoring production code (tests validate existing behavior only)
❌ API contract testing with Bitails (MSW mocking sufficient)

---

## Breaking Changes

**BREAKING CHANGES: None — API stable**

**Rationale:**
This task adds testing infrastructure only. No production code is modified, no APIs are changed, and no consumer code needs migration. Tests validate existing behavior without altering it.

**New Dependencies Added (dev only):**
- vitest ^1.0.0
- @vitest/ui ^1.0.0
- jsdom ^23.0.0
- @testing-library/react ^14.0.0
- @testing-library/user-event ^14.0.0
- msw ^2.0.0
- @playwright/test ^1.40.0

These are devDependencies only and do not affect production bundle size or runtime.

**Impact on Existing Code:**
- None — walletClient.ts, Wallet.tsx, Bitails.ts, etc. remain unchanged
- localStorage usage continues to work identically
- Bitails API calls continue to work identically
- No API contract changes

---

## Implementation Plan

### Phase 1: Testing Infrastructure Setup

**Risk:** Low

**Files to modify/create:**
- package.json (add devDependencies)
- vitest.config.ts (create)
- tsconfig.test.json (create)
- vitest.setup.ts (create)

**Specific changes:**
- [ ] Install vitest, @vitest/ui, jsdom, @testing-library/react, @testing-library/user-event
- [ ] Create vitest.config.ts with Next.js 13 App Router configuration
- [ ] Configure jsdom environment for DOM testing
- [ ] Set up global test setup file (vitest.setup.ts)
- [ ] Add npm scripts: "test", "test:ui", "test:coverage"
- [ ] Verify TypeScript compiles without test files

**Dependencies:** None — this is first phase

---

### Phase 2: Mock Service Worker (MSW) Setup

**Risk:** Low

**Files to modify/create:**
- lib/mocks/handlers.ts (create)
- lib/mocks/server.ts (create)
- vitest.setup.ts (update)

**Specific changes:**
- [ ] Install msw
- [ ] Create MSW handlers for Bitails API endpoints (GET /api/utxos, GET /tx/{txid})
- [ ] Mock error scenarios (404, 500, network timeout)
- [ ] Set up MSW server in vitest.setup.ts
- [ ] Create test fixtures for common UTXO and transaction responses
- [ ] Test that MSW intercepts fetch calls correctly

**Dependencies:** Phase 1 (Vitest configured)

---

### Phase 3: Unit Tests — Core Wallet Logic

**Risk:** Low

**Files to modify/create:**
- lib/wallet/walletClient.spec.ts (create)
- lib/wallet/walletCache.spec.ts (create)
- lib/wallet/Bitails.spec.ts (create)

**Specific changes:**
- [ ] Test walletClient.ts:
  - Mnemonic + PIN → key derivation (correct seed from BIP39)
  - BIP44 path derivation (m/44'/0/0/n and m/44'/0/1/n)
  - UTXO scanning logic (batch of 25, stop on empty batch)
  - Address generation from keys
  - Edge cases (invalid mnemonic, empty PIN, zero UTXOs)
- [ ] Test Bitails.ts:
  - Successful UTXO fetch (MSW mocked)
  - Successful raw tx download (MSW mocked)
  - Error handling (API 404, timeout, network error)
  - Fetch parameter validation
- [ ] Test walletCache.ts:
  - Add/retrieve cached transactions
  - Cache hit/miss scenarios
  - Txid lookup correctness
- [ ] Achieve 80%+ coverage for all three modules

**Dependencies:** Phase 2 (MSW + fixtures ready)
**Target coverage:** 85%

---

### Phase 4: Component Tests — UI Components

**Risk:** Low

**Files to modify/create:**
- app/components/Wallet.spec.tsx (create)
- app/start/page.spec.tsx (create)
- lib/test-utils.tsx (create — render wrapper with providers)

**Specific changes:**
- [ ] Test Wallet.tsx:
  - Component renders without crashing
  - Balance displays correctly from wallet state
  - "Send All" button is present and clickable
  - UTXO sync triggered on mount
  - Fee calculation display (100 sat/byte)
  - Error message display on sync failure
  - Transaction success/failure feedback
- [ ] Test start/page.tsx:
  - Mnemonic input renders and accepts text
  - PIN input renders and accepts text
  - Import button triggers wallet creation
  - Validates mnemonic (rejects invalid words)
  - Stores credentials in localStorage
  - Redirects to / on successful import
  - Error display on invalid input
- [ ] Create test utilities (localStorage mock, wallet mock, render wrapper)
- [ ] Achieve 75%+ coverage for UI components

**Dependencies:** Phase 3 (walletClient mocked in component tests)
**Target coverage:** 75%

---

### Phase 5: Integration Tests — Cross-Module Flows

**Risk:** Medium

**Files to modify/create:**
- __tests__/integration/wallet-sync.spec.ts (create)
- __tests__/integration/transaction-fee.spec.ts (create)

**Specific changes:**
- [ ] Test WalletClient + Bitails integration:
  - Initialize wallet with mnemonic + PIN
  - Sync scans paths and fetches UTXOs (MSW mocked)
  - Correct balance calculated from UTXOs
  - Error handling on API failures
- [ ] Test fee calculation:
  - 100 sat/byte applied correctly
  - Multiple inputs/outputs handled
  - Fixed P2PKH sizes (148 bytes/input, 34 bytes/output, 10 bytes overhead)
  - Change output included
- [ ] Test localStorage persistence:
  - Wallet survives page refresh
  - Credentials correctly restored from storage
- [ ] Achieve 80%+ coverage for integration flows

**Dependencies:** Phase 4 (components tested independently)
**Target coverage:** 80%

---

### Phase 6: End-to-End Tests (Playwright)

**Risk:** Medium

**Files to modify/create:**
- playwright.config.ts (create)
- e2e/wallet-flow.spec.ts (create)
- e2e/error-scenarios.spec.ts (create)

**Specific changes:**
- [ ] Install @playwright/test
- [ ] Create playwright.config.ts with baseURL pointing to dev server
- [ ] Test complete import → sync → send flow:
  - Navigate to /start
  - Enter valid mnemonic + PIN
  - Click import button
  - Redirect to / verified
  - Wallet syncs UTXOs
  - Balance displays
  - Click "Send All" button
  - Transaction broadcast succeeds
  - Success message displays
- [ ] Test error scenarios:
  - Invalid mnemonic rejected
  - Missing PIN rejected
  - API timeout handled gracefully
  - Insufficient balance shows error
  - Network error during sync shows error
- [ ] Test persistence:
  - Page refresh preserves wallet state
  - localStorage cleared → import flow required again
- [ ] Achieve 70%+ scenario coverage

**Dependencies:** Phase 5 (all unit + integration tests passing)

---

### Phase 7: CI/CD Integration (GitHub Actions)

**Risk:** Low

**Files to modify/create:**
- .github/workflows/test.yml (create)

**Specific changes:**
- [ ] Create GitHub Actions workflow:
  - Trigger on: pull_request, push to main/master
  - Run on: ubuntu-latest
  - Steps: install, lint, build, test, coverage report
- [ ] Configure coverage enforcement:
  - Run: npm run test:coverage
  - Fail job if coverage < 80%
  - Post coverage badge to PR
- [ ] Configure test blocking:
  - Mark PR as failed if tests don't pass
  - Require passing tests before merge
- [ ] Test workflow locally with act (optional)

**Dependencies:** Phase 6 (all tests written and passing)

---

### Phase 8: Coverage Analysis and Documentation

**Risk:** Low

**Files to modify/create:**
- docs/TESTING.md (create)
- coverage/ (generated by vitest)

**Specific changes:**
- [ ] Run full coverage report: npm run test:coverage
- [ ] Identify and document any < 80% modules
- [ ] Fill coverage gaps if needed
- [ ] Write TESTING.md guide covering:
  - How to run tests locally (npm run test)
  - How to view coverage (npm run test:coverage)
  - MSW mocking patterns for API calls
  - Component testing patterns with localStorage
  - How to write new tests
  - Common test helpers and fixtures
  - CI/CD flow explanation
- [ ] Update README.md with testing section
- [ ] Verify 80%+ coverage achieved across all modules

**Dependencies:** Phase 7 (CI/CD configured)
**Final coverage target:** 80% minimum

---

## Files Summary

### Testing Configuration Files

1. ✅ vitest.config.ts (create) — Vitest configuration for Next.js 13
2. ✅ tsconfig.test.json (create) — TypeScript config for test files
3. ✅ vitest.setup.ts (create) — Global test setup (MSW server, mocks)
4. ✅ playwright.config.ts (create) — Playwright E2E configuration
5. ✅ .github/workflows/test.yml (create) — GitHub Actions CI/CD pipeline

### Mock and Test Utilities

6. ✅ lib/mocks/handlers.ts (create) — MSW request handlers for Bitails API
7. ✅ lib/mocks/server.ts (create) — MSW server setup
8. ✅ lib/test-utils.tsx (create) — React Testing Library render wrapper, helpers
9. ✅ lib/test-fixtures.ts (create) — Reusable test data (mnemonic, UTXOs, txs)

### Unit Tests

10. ✅ lib/wallet/walletClient.spec.ts (create) — Tests for WalletClient logic
11. ✅ lib/wallet/Bitails.spec.ts (create) — Tests for Bitails API integration
12. ✅ lib/wallet/walletCache.spec.ts (create) — Tests for cache operations

### Component Tests

13. ✅ app/components/Wallet.spec.tsx (create) — Tests for Wallet component
14. ✅ app/start/page.spec.tsx (create) — Tests for import page

### Integration Tests

15. ✅ __tests__/integration/wallet-sync.spec.ts (create) — Cross-module sync tests
16. ✅ __tests__/integration/transaction-fee.spec.ts (create) — Fee calculation tests

### End-to-End Tests

17. ✅ e2e/wallet-flow.spec.ts (create) — Complete import→sync→send flow
18. ✅ e2e/error-scenarios.spec.ts (create) — E2E error handling tests

### Documentation

19. ✅ docs/TESTING.md (create) — Testing guide and patterns
20. ✅ README.md (update) — Add "Testing" section with test commands

### Dependencies

21. ✅ package.json (update) — Add devDependencies and npm scripts

### Generated (not committed)

22. 📊 coverage/ (generated) — Code coverage reports
23. 📊 test-results/ (generated) — Test result artifacts

### No Changes Needed

24. ℹ️ tsconfig.json (no change) — Already excludes test files
25. ℹ️ next.config.js (no change) — No Next.js config changes needed
26. ℹ️ .gitignore (no change) — Coverage/ already ignored

---

## Testing Strategy

### Unit Tests

**Scope:** Core wallet logic, API integration, cache operations, UI components

**Actions (specific test cases):**

**walletClient.ts:**
- derive() returns correct HD keys from mnemonic + PIN
- BIP44 paths generated correctly (m/44'/0/0/n external, m/44'/0/1/n change)
- scanUtxos() fetches in batches of 25 and stops on empty batch
- getBalance() sums UTXO values correctly
- Error handling: invalid mnemonic throws error
- Edge case: empty PIN handled correctly
- Edge case: zero UTXOs returns empty array

**Bitails.ts:**
- broadcast() sends transaction to Bitails API correctly
- fetchUtxos() returns parsed UTXO array (MSW mocked)
- fetchRawTx() returns raw tx hex string (MSW mocked)
- Error handling: network timeout caught and reported
- Error handling: API 404 caught and reported
- Error handling: API 500 caught and reported

**walletCache.ts:**
- set(txid, rawTx) stores tx in cache
- get(txid) retrieves cached tx
- has(txid) returns true/false correctly
- Cache persists across multiple operations

**Wallet.tsx:**
- Component renders without crashing
- Balance displays from wallet state
- "Send All" button is present
- onClick handler calls sync() on mount
- Error message displays on sync failure
- Success message displays on tx broadcast

**start/page.tsx:**
- Mnemonic input accepts text
- PIN input accepts text
- Import button is clickable
- localStorage.setItem called with correct keys on import
- Redirects to / on successful import
- Error shown for invalid mnemonic

**Command:** `npm run test -- lib/ app/`
**Target:** 80%+ coverage for each module

### Integration Tests

**Scope:** WalletClient + Bitails interaction, transaction fee calculation, localStorage persistence

**Actions:**

**Wallet sync flow:**
- Initialize WalletClient with mnemonic + PIN
- Call syncUtxos()
- MSW mocks Bitails API response
- Verify correct addresses queried
- Verify balance calculated from UTXOs
- Verify cache populated with raw txs

**Fee calculation:**
- Create transaction with 2 inputs, 2 outputs
- Apply 100 sat/byte fee calculation
- Verify: 2 × 148 bytes/input + 2 × 34 bytes/output + 10 bytes overhead = 374 bytes
- Verify: 374 × 100 = 37,400 satoshis deducted from change
- Edge case: insufficient balance for fee throws error

**localStorage persistence:**
- Store mnemonic + PIN in localStorage
- Simulate page reload (clear walletInstance)
- Initialize new walletClient from localStorage
- Verify same keys derived (no data loss)

**Command:** `npm run test -- __tests__/integration/`
**Target:** 80%+ coverage for integration flows

### Component Integration Tests

**Scope:** Wallet.tsx + walletClient interaction, start/page.tsx + localStorage

**Actions:**

**Wallet component lifecycle:**
- Mount component
- Verify syncUtxos() called
- Mock Bitails API responses (MSW)
- Verify balance renders
- Verify send button enabled/disabled based on balance
- Click send button → verify broadcast() called

**Import flow:**
- Render start/page.tsx
- Enter mnemonic text
- Enter PIN text
- Click import button
- Verify localStorage updated
- Verify navigation to / triggered

**Command:** `npm run test -- app/components/ app/start/`
**Target:** 75%+ coverage for components

### Performance Tests

**Scope:** UTXO scanning batch performance, fee calculation performance, component render performance

**Actions:**

**UTXO scanning:**
- Baseline: Time to scan 100 addresses in batches of 25
- Target: < 100ms (4 batches)
- Verify batching doesn't add significant overhead

**Fee calculation:**
- Baseline: Time to calculate fee for tx with 10 inputs
- Target: < 10ms
- Verify no performance regression from addition

**Component rendering:**
- Baseline: Time to render Wallet component with 100 UTXOs
- Target: < 500ms
- Verify no memory leaks on re-renders

**Command:** `npm run test -- --reporter=verbose` (measure times in test output)

### Mock Service Worker (API Mocking)

**Scope:** Mock all Bitails API endpoints; no real API calls in unit/integration tests

**Handlers:**
- GET /api/utxos?addresses=addr1,addr2,... → Return UTXO array
- GET /tx/[txid] → Return raw tx hex
- Network error scenario → Simulate timeout
- API error scenario → Return 500 status

**Setup:**
- vitest.setup.ts: start MSW server before tests, close after
- Handlers in lib/mocks/handlers.ts
- Per-test override: server.use(override) for custom responses

**Fixtures:**
- Sample UTXO response in lib/test-fixtures.ts
- Sample raw tx in lib/test-fixtures.ts
- Reuse across all integration + E2E tests

### Consumer Tests

**Scope:** Test that wallet works from end-user perspective

**Risk areas to test:**
- Invalid mnemonic input (user typo)
- Network error during sync (connectivity issue)
- Insufficient balance (edge case)
- API timeout (slow network)
- localStorage cleared (browser data wipe)

**Approach:**
- E2E tests (Playwright) for full flows
- Component tests for input validation
- Integration tests for error handling

### Coverage Targets by Module

**Required (80%+):**
- lib/wallet/walletClient.ts: 85%
- lib/wallet/Bitails.ts: 80%
- lib/wallet/walletCache.ts: 80%

**Desired (75%+):**
- app/components/Wallet.tsx: 75%
- app/start/page.tsx: 75%

**E2E (scenario coverage, not line coverage):**
- import → sync → send flow: 100% (all paths covered)
- Error scenarios: 90% (main error types covered)

### Testing Commands

```bash
npm run test                    # Run all tests once
npm run test:watch             # Watch mode during development
npm run test:coverage          # Generate coverage report
npm run test:ui                # @vitest/ui dashboard
npm run test:e2e               # Run Playwright E2E tests only
npm run test:e2e:debug         # Playwright debug mode
```

---

## Success Criteria

### Functional Criteria

- [ ] All unit tests pass (walletClient, Bitails, walletCache, components)
  - Command: `npm run test`
  - Expected: 100% pass rate, 0 failures

- [ ] All integration tests pass (wallet sync, fee calculation, persistence)
  - Command: `npm run test -- __tests__/integration/`
  - Expected: 100% pass rate, 0 failures

- [ ] All E2E tests pass (import → sync → send flow, error scenarios)
  - Command: `npm run test:e2e`
  - Expected: 100% pass rate, 0 failures on both happy path and error cases

- [ ] No test regressions introduced
  - Expected: Existing app functionality unchanged (only tests added)
  - Verification: Manual smoke test of wallet import/sync/send

- [ ] MSW mocking works correctly
  - Expected: No real API calls to Bitails API during tests
  - Verification: Network tab shows 0 real requests, all mocked

- [ ] localStorage mocking functional
  - Expected: Tests can write/read localStorage without side effects
  - Verification: localStorage operations in tests isolated from browser storage

- [ ] Error scenarios handled gracefully
  - Expected: Invalid mnemonic rejected, network errors caught, insufficient balance shown
  - Verification: Error E2E tests all pass

### Performance Criteria

- [ ] UTXO scanning completes in < 100ms for 100 addresses (4 batches)
  - Baseline: No performance regression from test infrastructure
  - Measurement: Test execution time in Vitest output

- [ ] Fee calculation completes in < 10ms for any input set
  - Baseline: No performance overhead from fee calculation logic
  - Measurement: Test execution time in Vitest output

- [ ] Full test suite runs in < 30 seconds (unit + integration + component)
  - Baseline: Developer feedback loop fast enough for daily use
  - Measurement: `npm run test` execution time
  - Note: E2E tests separate, typically 2-5 minutes

- [ ] No memory leaks in component tests
  - Baseline: React components cleanup properly between test renders
  - Verification: No warnings from React in test output

### Code Quality Criteria

- [ ] Test coverage reaches 80% minimum across all modules
  - Command: `npm run test:coverage`
  - Expected output:
    - lib/wallet/walletClient.ts: 85%+
    - lib/wallet/Bitails.ts: 80%+
    - lib/wallet/walletCache.ts: 80%+
    - app/components/Wallet.tsx: 75%+
    - app/start/page.tsx: 75%+

- [ ] All test files pass linting
  - Command: `npm run lint`
  - Expected: No ESLint errors in *.spec.ts or *.spec.tsx files

- [ ] TypeScript compilation includes test files
  - Command: `npm run typecheck`
  - Expected: 0 TypeScript errors in test code

- [ ] Test code follows project conventions
  - Expected: Test naming, structure, assertions consistent across codebase
  - Verification: Code review of test patterns

- [ ] No skipped tests (no .skip or .only in committed code)
  - Command: `grep -r "\.skip\|\.only" lib/ app/ __tests__/ e2e/`
  - Expected: 0 results

- [ ] Test utilities documented and reusable
  - Expected: lib/test-utils.tsx and lib/test-fixtures.ts clearly documented
  - Verification: Can easily add new tests using existing utilities

### Migration Criteria

- [ ] GitHub Actions workflow configured and passing
  - Command: Push to branch, check GitHub Actions "test" workflow
  - Expected: Workflow runs on every PR, blocks merge if < 80% coverage or tests fail

- [ ] Documentation complete
  - Expected: docs/TESTING.md covers:
    - How to run tests locally
    - How to write new tests
    - MSW mocking patterns
    - Component testing patterns
    - Common test helpers

- [ ] README.md updated with testing section
  - Expected: Section explaining npm run test command, link to docs/TESTING.md

- [ ] npm scripts added and working
  - Expected: `npm run test`, `npm run test:ui`, `npm run test:coverage`, `npm run test:e2e` all work

- [ ] Dependencies installed correctly
  - Command: `npm install`
  - Expected: node_modules contains vitest, @testing-library/react, msw, @playwright/test

- [ ] CI/CD pipeline blocks non-compliant PRs
  - Expected: PR with < 80% coverage shows ❌, passing shows ✅

### Deployment Readiness

- [ ] Zero breaking changes to production code
  - Expected: app/ and lib/ logic unchanged; only tests added
  - Verification: git diff shows only new .spec.ts files and config files

- [ ] Production bundle size unaffected
  - Expected: Test dependencies are devDependencies only
  - Command: `npm run build && du -sh .next/`

- [ ] No security vulnerabilities in new dependencies
  - Command: `npm audit`
  - Expected: 0 vulnerabilities (or only low-severity, unrelated to testing)

- [ ] Backwards compatibility maintained
  - Expected: Existing wallet functionality works identically before/after tests

---

## Risk Assessment

### High Risk Areas

**1. MSW mocking doesn't cover all Bitails API scenarios**
- **Description:** If MSW handlers are incomplete, tests may pass but fail in production when encountering unmocked API responses (edge cases like partial UTXO responses, unusual error formats, rate limiting)
- **Probability:** Medium (50%)
- **Impact:** Critical — wallet could sync successfully in tests but fail with real API
- **Mitigation:**
  - Create comprehensive test fixtures for all known Bitails response types
  - Document all Bitails API endpoints and response formats before writing tests
  - Add E2E test against staging Bitails API (if available) to validate mock accuracy
  - Include "network error" and "timeout" scenarios in MSW handlers
  - Review Bitails API docs to catch edge cases before implementation
- **Rollback:** If discovered post-launch, disable MSW temporarily and replace with real API calls in integration tests (trade-off: slower tests but higher confidence)

**2. Test coverage targets are unachievable for some modules**
- **Description:** Some modules (especially UI components like Wallet.tsx) may have complex conditional logic that's hard to reach in tests, making 80% coverage impossible without refactoring production code
- **Probability:** Medium (40%)
- **Impact:** High — release blocked if coverage < 80% and can't increase
- **Mitigation:**
  - Run coverage analysis early (Phase 3-4) to identify problematic code paths
  - If coverage gap found, decide: refactor code OR adjust coverage target down to 75%
  - Document any intentionally untested code paths and why
  - Use code comments to mark "hard to test" sections for future refactoring
- **Rollback:** Lower coverage target to 75% for problematic modules with documented exception

**3. E2E tests are flaky (intermittent failures)**
- **Description:** Playwright E2E tests depending on localStorage, browser state, or timing may fail randomly, causing false negatives in CI/CD
- **Probability:** Medium (45%)
- **Impact:** High — CI/CD pipeline unreliable, developer confusion, release delays
- **Mitigation:**
  - Add explicit waits for UI elements (avoid hard sleeps)
  - Isolate test state: clear localStorage before each E2E test
  - Run E2E tests multiple times locally before committing
  - Set Playwright timeout to reasonable value (e.g., 30s per test)
  - Add verbose logging to E2E tests for debugging failures
- **Rollback:** Disable E2E tests in CI/CD temporarily (Phase 7), keep unit/integration tests

### Medium Risk Areas

**4. TypeScript errors in test files block compilation**
- **Description:** Complex mocking patterns (MSW handlers, component mocks) may introduce TypeScript type errors, causing tsc --noEmit to fail
- **Probability:** Medium (50%)
- **Impact:** Medium — blocks PR merges until types fixed
- **Mitigation:**
  - Create test-specific tsconfig.json with loose typing if needed
  - Use type assertions sparingly; prefer proper types
  - Test TypeScript compilation early (Phase 1)
  - Document common TypeScript patterns in docs/TESTING.md
- **Rollback:** Loosen tsconfig.test.json strictness temporarily

**5. Testing dependencies introduce security vulnerabilities**
- **Description:** New npm packages (vitest, msw, playwright, testing-library) may have reported vulnerabilities
- **Probability:** Low (20%)
- **Impact:** Medium — security audit fails, deployment blocked
- **Mitigation:**
  - Run `npm audit` before committing
  - Pin versions to known-good releases
  - Monitor GitHub Dependabot alerts
  - Prefer actively maintained packages (vitest, msw, playwright all maintained)
- **Rollback:** Update vulnerable package to patched version

**6. Test infrastructure slows down CI/CD pipeline**
- **Description:** Installing dependencies, running 100+ tests, generating coverage reports could extend GitHub Actions runtime from current 0s to 5+ minutes
- **Probability:** Low (30%)
- **Impact:** Medium — developer feedback loop slower, but acceptable
- **Mitigation:**
  - Use `npm ci` instead of `npm install` in CI/CD (faster)
  - Cache node_modules in GitHub Actions
  - Split tests into parallel jobs (unit, integration, E2E in parallel)
  - Target: total CI/CD time < 10 minutes
- **Rollback:** Accept slower feedback loop; optimize later

**7. localStorage mock doesn't match browser behavior exactly**
- **Description:** jsdom's localStorage implementation may differ slightly from browser, causing tests to pass locally but fail in production
- **Probability:** Low (25%)
- **Impact:** Medium — data persistence bugs in production
- **Mitigation:**
  - Test localStorage behavior early (Phase 2)
  - Write explicit tests for edge cases (quota exceeded, null values, etc.)
  - Include E2E test that verifies localStorage persistence in real browser
  - Document any known jsdom ↔ browser differences in docs/TESTING.md
- **Rollback:** If discovered, add workaround in component code for jsdom case

**8. Mnemonic handling in tests leaks sensitive data to logs**
- **Description:** If test mnemonics are logged or printed on failure, sensitive data could appear in CI/CD logs
- **Probability:** Low (20%)
- **Impact:** Medium — security issue, credential exposure
- **Mitigation:**
  - Use placeholder mnemonics in tests (not real seed phrases)
  - Never log full mnemonic in test output
  - Mark fixture mnemonics as "test-only, not real"
  - Sanitize CI/CD logs of sensitive test data
- **Rollback:** Rotate test fixtures if any leaked

### Low Risk Areas

**9. Test file naming conventions differ from project standards**
- **Description:** Using .spec.ts vs .test.ts naming could conflict with existing conventions
- **Probability:** Low (10%)
- **Impact:** Low — minor inconsistency, easily fixed
- **Mitigation:** Verify project convention, document in docs/TESTING.md, apply consistently

**10. Developers unfamiliar with test utilities initially**
- **Description:** New developers may not understand MSW mocking or test fixture patterns
- **Probability:** Medium (50%)
- **Impact:** Low — growth pain, resolved through documentation
- **Mitigation:** Write comprehensive docs/TESTING.md, create reusable test utilities, add code comments

**11. Test data gets out of sync with production reality**
- **Description:** If Bitails API changes response format, fixtures may become invalid without notice
- **Probability:** Low (20%)
- **Impact:** Low — caught when integrating with real API or E2E tests
- **Mitigation:** Document fixture sources, plan quarterly fixture review, add E2E tests against staging API

---

## Rollback Plan

### Immediate Rollback (< 1 hour)

**When to use:**
- Critical test infrastructure bug prevents all tests from running
- GitHub Actions workflow broken (can't merge any PRs)
- Test suite blocks legitimate code changes

**Triggers:**
- `npm run test` fails with 0% success rate (complete failure)
- GitHub Actions workflow won't execute (configuration error)
- Tests unable to start (dependency installation failure)
- Node.js/npm version incompatibility discovered

**Steps:**
1. Revert most recent commit(s) introducing testing infrastructure
   - Command: `git revert <commit-hash> --no-edit`
2. Push revert commit to feature branch
   - Command: `git push origin <branch>`
3. GitHub Actions re-runs on revert commit
4. Verify tests removed from CI/CD pipeline
   - Expected: No GitHub Actions test job in PR checks
5. Notify team: "Testing infrastructure reverted; will re-approach in next iteration"

**Rollback time estimate:** 15-30 minutes
**Risk of rollback:** Very low (only adds files/configs, no production code changes)
**Validation:** GitHub Actions passes without test job, PR can merge normally

### Partial Rollback (1-2 hours)

**When to use:**
- Some test phases working, others blocked (e.g., Phase 6 E2E tests broken)
- Can't complete full rollback; better to disable problematic phase
- Other phases (unit/integration) working and valuable

**Triggers:**
- E2E tests (Phase 6) consistently flaky but unit tests passing
- Coverage target unachievable for specific module; other modules fine
- GitHub Actions job timeout running all tests; splitting helps

**Steps (Example: Disable E2E tests only):**
1. Remove Playwright from package.json devDependencies
   - Command: `npm uninstall --save-dev @playwright/test`
2. Remove e2e/ test files OR comment out E2E workflow job
   - Command: `rm -rf e2e/` OR edit `.github/workflows/test.yml`
3. Adjust coverage threshold: exclude E2E from coverage calculation
   - Edit: `vitest.config.ts` (coverage exclude e2e/)
4. Push changes to feature branch
5. GitHub Actions now runs unit + integration tests only
6. Verify workflow completes in < 5 minutes
7. Update docs/TESTING.md: note that E2E tests are disabled temporarily
8. Create follow-up task to re-enable E2E tests (Phase 6 revisited)
9. Notify team: "E2E tests disabled; unit + integration tests active"

**Rollback time estimate:** 30-60 minutes
**Risk of rollback:** Low (removes non-critical test phase, keeps valuable tests)

### Forward Fix (continue + fix)

**When to use:**
- Tests are mostly working (> 50% pass rate)
- Issues are fixable without reverting entire phase
- Blocking issues can be resolved in hours
- More valuable to fix forward than revert

**Triggers:**
- 90% of tests pass, 10% have minor failures (e.g., MSW handler typo)
- Coverage at 75% instead of 80% (minor gap)
- E2E test timing issues (add waits, no logic changes)
- TypeScript errors in test code (fix types, don't revert)

**Steps (Example: Fix MSW handler bug):**
1. Identify failing tests
   - Command: `npm run test 2>&1 | grep "FAIL"`
2. Review test output; identify root cause
3. Fix the issue in lib/mocks/handlers.ts
4. Re-run tests locally
   - Command: `npm run test`
5. Verify fix resolves failures
6. Commit fix with clear message: "fix: correct MSW handler response format"
7. Push to feature branch; GitHub Actions re-runs
8. Verify tests now pass

**Rollback time estimate:** 30-120 minutes (depends on bug complexity)

### Rollback Decision Tree

```
Is the entire test infrastructure broken?
  ├─ YES → Use IMMEDIATE ROLLBACK (< 1 hour)
  └─ NO → Is one phase/component broken but others working?
      ├─ YES → Use PARTIAL ROLLBACK (disable broken phase, keep others)
      └─ NO → Are most tests passing with minor issues?
          ├─ YES → Use FORWARD FIX (fix bugs, don't revert)
          └─ NO → Escalate to team; consult on best path
```

### Rollback Triggers and Thresholds

**CRITICAL (Immediate Rollback Required):**
- `npm run test` fails to execute (0% success rate)
- GitHub Actions workflow won't run (configuration syntax error)
- Dependencies won't install (broken package.json)
- TypeScript compilation fails (unmigrated test types)
- All E2E tests timeout (Playwright setup broken)

**HIGH (Consider Partial or Forward Fix):**
- < 50% of unit tests passing (majority broken)
- Coverage drops to < 60% (major regression)
- CI/CD runtime exceeds 15 minutes (unacceptable slowdown)
- E2E tests consistently timeout (Phase 6 broken)

**MEDIUM (Forward Fix Preferred):**
- 50-90% of tests passing (most working)
- Coverage at 70-80% (close to target)
- Individual test failures (specific issues, not systemic)
- TypeScript errors in test code only

**LOW (Monitor, Don't Rollback):**
- 90%+ of tests passing (nearly complete)
- Coverage at 80%+ (meets target)
- Intermittent flaky tests (minor, fixable)
- Documentation incomplete (supplement with follow-up)

---

## Progress Tracking

### Phase Completion Checklist

- [ ] Phase 1: Testing Infrastructure Setup — Complete
- [ ] Phase 2: Mock Service Worker Setup — Complete
- [ ] Phase 3: Unit Tests — Core Wallet Logic — Complete
- [ ] Phase 4: Component Tests — UI Components — Complete
- [ ] Phase 5: Integration Tests — Cross-Module Flows — Complete
- [ ] Phase 6: End-to-End Tests (Playwright) — Complete
- [ ] Phase 7: CI/CD Integration (GitHub Actions) — Complete
- [ ] Phase 8: Coverage Analysis and Documentation — Complete

### Success Criteria Validation

- [ ] Functional criteria met (7/7)
- [ ] Performance criteria met (4/4)
- [ ] Code quality criteria met (6/6)
- [ ] Migration criteria met (6/6)
- [ ] Deployment readiness criteria met (4/4)
- [ ] Team code review passed
- [ ] Ready for production deployment

---

## Next Steps

1. **Review & Approve** this task document
2. **Begin Implementation** starting with Phase 1
3. **Track Progress** in the checklist above
4. **Hand Off to QA** when all phases complete
5. **Quality Gate Review** before deployment

---

## Related Documents

- **QA Testing:** When complete, QA will create:
  - `task.1.qa.1.testing-framework-setup.md` (QA report)
  - `docs/qa/gates/tasks/task.1.gate.1.testing-framework-setup.yml` (quality gate)

- **Documentation:** See `docs/TESTING.md` for patterns and guidelines

---

**Task Created:** 2026-03-20
**Status:** 📋 Planned
**Estimated Effort:** 32-40 hours
**Priority:** High
