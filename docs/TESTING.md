# Testing Guide

## Running Tests

```bash
npm run test              # Run all tests once
npm run test:watch        # Watch mode during development
npm run test:coverage     # Generate coverage report (HTML + text)
npm run test:ui           # @vitest/ui interactive dashboard
npm run test:e2e          # Run Playwright E2E tests (requires running dev server)
npm run test:e2e:debug    # Playwright debug mode
```

## Test Organisation

Tests are co-located with source files using the `.spec.ts` / `.spec.tsx` suffix:

```
lib/wallet/
├── walletClient.ts
├── walletClient.spec.ts       ← unit tests
├── Bitails.ts
├── Bitails.spec.ts            ← unit tests
├── walletCache.ts
└── walletCache.spec.ts        ← unit tests

app/components/
├── Wallet.tsx
└── Wallet.spec.tsx            ← component tests

app/start/
├── page.tsx
└── page.spec.tsx              ← component tests

__tests__/integration/
├── wallet-sync.spec.ts        ← cross-module integration tests
└── transaction-fee.spec.ts    ← fee calculation tests

e2e/
└── wallet-flow.spec.ts        ← Playwright E2E tests
```

## MSW Mocking

All external API calls are intercepted by [Mock Service Worker (MSW)](https://mswjs.io/) during tests. No real network requests are made.

**Default handlers** (`lib/mocks/handlers.ts`):

| Endpoint | Mock response |
|----------|--------------|
| `POST https://api.bitails.io/address/unspent/multi` | Returns `SAMPLE_UTXO_RESPONSE` (1 UTXO) |
| `GET https://api.bitails.io/download/tx/:txid/hex` | Returns `SAMPLE_RAW_TX_HEX` |
| `POST https://api.bitails.io/tx/broadcast` | Returns `{ txid: "abcdef..." }` |
| `GET https://api.whatsonchain.com/v1/bsv/main/tx/:txid/hex` | Returns `SAMPLE_RAW_TX_HEX` |

**Overriding handlers in a test**:

```ts
import { http, HttpResponse } from 'msw'
import { server } from '../../lib/mocks/server'

it('handles rate limiting', async () => {
  server.use(
    http.post('https://api.bitails.io/address/unspent/multi', () =>
      new HttpResponse(null, { status: 429 })
    )
  )
  // ... test code
})
```

Handlers reset automatically after each test (`afterEach(() => server.resetHandlers())`).

## Test Fixtures

Reusable test data lives in `lib/test-fixtures.ts`:

```ts
import { TEST_MNEMONIC, TEST_PIN, SAMPLE_UTXO_RESPONSE, SAMPLE_RAW_TX_HEX } from '../test-fixtures'
```

**Important**: `TEST_MNEMONIC` is the BIP39 all-zeros mnemonic (`abandon × 11 + about`). It is a well-known test vector — never use it for real funds.

## Component Testing Patterns

### Mocking Next.js navigation

```ts
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))
```

### Mocking localStorage

```ts
import { mockLocalStorage } from '../../lib/test-utils'

beforeEach(() => {
  mockLocalStorage({ wallet_mnemonic: TEST_MNEMONIC, wallet_pin: TEST_PIN })
})
```

### Mocking wallet functions

```ts
vi.mock('../../lib/wallet/walletClient', () => ({
  WalletClient: {
    validateMnemonic: vi.fn().mockReturnValue(true),
  },
  importWallet: vi.fn(),
  syncWallet: vi.fn().mockResolvedValue([]),
}))
```

## Coverage Targets

| Module | Target |
|--------|--------|
| `lib/wallet/walletClient.ts` | 85%+ |
| `lib/wallet/Bitails.ts` | 80%+ |
| `lib/wallet/walletCache.ts` | 80%+ |
| `app/components/Wallet.tsx` | 75%+ |
| `app/start/page.tsx` | 75%+ |

View coverage report after running `npm run test:coverage` — open `coverage/index.html` in your browser.

## Writing New Tests

1. Create `<source-file>.spec.ts` next to the file you're testing.
2. Import from `../../lib/test-utils` for React component tests.
3. Use MSW `server.use(...)` to override API responses for specific scenarios.
4. Use fixtures from `lib/test-fixtures.ts` for consistent test data.
5. Always call `clearWallet()` in `afterEach` if your test uses the wallet singleton.

## CI/CD

Tests run automatically on every pull request and push to `main`/`master`/`develop` via GitHub Actions (`.github/workflows/test.yml`). The pipeline:

1. Type-checks TypeScript
2. Runs ESLint
3. Runs all unit + integration tests with coverage
4. Uploads coverage report as an artifact
5. Builds the Next.js app to verify no build-time errors

PRs are blocked from merging if any step fails.
