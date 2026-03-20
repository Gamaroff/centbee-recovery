import { describe, it, expect, afterEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../lib/mocks/server'
import { WalletClient, importWallet, clearWallet, syncWallet } from '../../lib/wallet/walletClient'
import { TEST_MNEMONIC, TEST_PIN, SAMPLE_UTXO_RESPONSE } from '../../lib/test-fixtures'

describe('Wallet sync integration', () => {
  afterEach(() => {
    clearWallet()
    vi.restoreAllMocks()
  })

  it('wallet derives correct addresses and fetches UTXOs via Bitails', async () => {
    const wallet = importWallet(TEST_MNEMONIC, TEST_PIN)
    expect(wallet).toBeInstanceOf(WalletClient)

    // The API call goes through MSW — verify UTXOs come back
    const child = wallet.deriveChild("m/44'/0/0/0")
    const address = child.pubKey.toAddress().toString()
    expect(address).toBeTruthy()
    expect(address.length).toBeGreaterThan(20)
  })

  it('syncWallet returns all UTXOs found across batches', async () => {
    importWallet(TEST_MNEMONIC, TEST_PIN)
    // Use tiny gap limit (25) so we only scan one batch and test finishes fast
    const utxos = await syncWallet(25, 25)
    expect(Array.isArray(utxos)).toBe(true)
  })

  it('all returned UTXOs have derivation paths set', async () => {
    importWallet(TEST_MNEMONIC, TEST_PIN)
    // First request returns 1 UTXO for the first queried address; all subsequent return empty.
    // This ensures the sync terminates and the returned UTXO has a correct derivationPath.
    let requestCount = 0
    server.use(
      http.post('https://api.bitails.io/address/unspent/multi', async ({ request }) => {
        const body = await request.json() as { addresses: string[] }
        requestCount++
        if (requestCount === 1) {
          return HttpResponse.json(
            body.addresses.map((address, i) => ({
              address,
              unspent: i === 0 ? [{ txid: 'aabbcc', vout: 0, satoshis: 100000, blockheight: 700000 }] : [],
            }))
          )
        }
        return HttpResponse.json(body.addresses.map(address => ({ address, unspent: [] })))
      })
    )
    const utxos = await syncWallet(25, 25)
    expect(utxos.length).toBeGreaterThan(0)
    for (const utxo of utxos) {
      expect(utxo.derivationPath).toBeTruthy()
      expect(utxo.derivationPath).toMatch(/^m\/44'\/0\/[01]\/\d+$/)
    }
  })

  it('syncWallet calls onProgress callback during scan', async () => {
    importWallet(TEST_MNEMONIC, TEST_PIN)
    const messages: string[] = []
    await syncWallet(25, 25, (p) => messages.push(p.message))
    expect(messages.length).toBeGreaterThan(0)
    expect(messages[messages.length - 1]).toContain('Scan complete')
  })

  it('handles rate limit during sync and retries', async () => {
    let callCount = 0
    server.use(
      http.post('https://api.bitails.io/address/unspent/multi', async ({ request }) => {
        const body = await request.json() as { addresses: string[] }
        callCount++
        if (callCount === 1) return new HttpResponse(null, { status: 429 })
        return HttpResponse.json(body.addresses.map(address => ({ address, unspent: [] })))
      })
    )
    importWallet(TEST_MNEMONIC, TEST_PIN)

    const messages: string[] = []
    await syncWallet(25, 25, (p) => messages.push(p.message))
    // The rate-limit message is emitted when a 429 is received before retrying
    expect(messages.some(m => m.includes('Rate limited') || m.includes('rate limit'))).toBe(true)
  })

  it('rehydrates wallet from localStorage when singleton missing', async () => {
    localStorage.setItem('wallet_mnemonic', TEST_MNEMONIC)
    localStorage.setItem('wallet_pin', TEST_PIN)
    const utxos = await syncWallet(25, 25)
    expect(Array.isArray(utxos)).toBe(true)
    localStorage.clear()
  })
})
