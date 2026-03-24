import { describe, it, expect, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import Bitails from './Bitails'
import WhatsOnChain from './WhatsOnChain'
import DelegatedIndexerService from './DelegatedIndexerService'
import { SAMPLE_UTXO_RESPONSE } from '../test-fixtures'

const BITAILS_URL = 'https://api.bitails.io'
const WOC_URL = 'https://api.whatsonchain.com'

describe('DelegatedIndexerService', () => {
  function makeService() {
    return new DelegatedIndexerService(new Bitails(), new WhatsOnChain())
  }

  describe('fetchRawTx', () => {
    it('falls back to WhatsOnChain when Bitails returns non-OK', async () => {
      server.use(
        http.get(`${BITAILS_URL}/download/tx/:txid/hex`, () =>
          new HttpResponse(null, { status: 404 })
        ),
        http.get(`${WOC_URL}/v1/bsv/main/tx/:txid/hex`, () =>
          new HttpResponse('woc-raw-tx-hex', { headers: { 'Content-Type': 'text/plain' } })
        )
      )
      const rawTx = await makeService().fetchRawTx('missing-txid')
      expect(rawTx).toBe('woc-raw-tx-hex')
    })

    it('throws when both Bitails and WhatsOnChain fail', async () => {
      server.use(
        http.get(`${BITAILS_URL}/download/tx/:txid/hex`, () =>
          new HttpResponse(null, { status: 404 })
        ),
        http.get(`${WOC_URL}/v1/bsv/main/tx/:txid/hex`, () =>
          new HttpResponse(null, { status: 404, statusText: 'Not Found' })
        )
      )
      await expect(makeService().fetchRawTx('missing-txid')).rejects.toThrow(
        'WhatsOnChain failed to fetch raw transaction'
      )
    })
  })

  describe('fetchUtxosForAddress', () => {
    it('calls onRateLimit callback on 429 and retries', async () => {
      let callCount = 0
      server.use(
        http.post(`${BITAILS_URL}/address/unspent/multi`, () => {
          callCount++
          if (callCount === 1) return new HttpResponse(null, { status: 429 })
          return HttpResponse.json(SAMPLE_UTXO_RESPONSE)
        })
      )

      const rateLimitCalls: number[] = []
      const utxos = await makeService().fetchUtxosForAddress(
        ['1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'],
        (attempt) => rateLimitCalls.push(attempt),
      )
      expect(rateLimitCalls).toHaveLength(1)
      expect(rateLimitCalls[0]).toBe(1)
      expect(utxos).toHaveLength(1)
    })

    it('calls onRateLimitCleared after successful retry', async () => {
      let callCount = 0
      server.use(
        http.post(`${BITAILS_URL}/address/unspent/multi`, () => {
          callCount++
          if (callCount === 1) return new HttpResponse(null, { status: 429 })
          return HttpResponse.json(SAMPLE_UTXO_RESPONSE)
        })
      )

      let cleared = false
      await makeService().fetchUtxosForAddress(
        ['1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'],
        undefined,
        () => { cleared = true },
      )
      expect(cleared).toBe(true)
    })

    it('throws after max retries exceeded', async () => {
      vi.useFakeTimers()
      server.use(
        http.post(`${BITAILS_URL}/address/unspent/multi`, () =>
          new HttpResponse(null, { status: 429 })
        )
      )
      const promise = makeService().fetchUtxosForAddress(['1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'])
      // Attach rejection handler before advancing timers to prevent unhandled rejection
      const expectation = expect(promise).rejects.toThrow('Rate limited by Bitails')
      // Advance through all retry delays (1s, 2s, 4s, 8s, 16s)
      await vi.runAllTimersAsync()
      await expectation
      vi.useRealTimers()
    })
  })
})
