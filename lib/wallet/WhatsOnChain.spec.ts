import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import WhatsOnChain from './WhatsOnChain'

const WOC_URL = 'https://api.whatsonchain.com/v1/bsv/main'

describe('WhatsOnChain', () => {
  let woc: WhatsOnChain

  woc = new WhatsOnChain()

  describe('fetchRawTx', () => {
    it('returns raw tx hex on success', async () => {
      server.use(
        http.get(`${WOC_URL}/tx/:txid/hex`, () =>
          new HttpResponse('  aabbccddeeff  ', { headers: { 'Content-Type': 'text/plain' } })
        )
      )
      const result = await woc.fetchRawTx('aabbcc')
      expect(result).toBe('aabbccddeeff')
    })

    it('throws when API returns non-OK', async () => {
      server.use(
        http.get(`${WOC_URL}/tx/:txid/hex`, () =>
          new HttpResponse(null, { status: 404, statusText: 'Not Found' })
        )
      )
      await expect(woc.fetchRawTx('missing')).rejects.toThrow(
        'WhatsOnChain failed to fetch raw transaction'
      )
    })
  })

  describe('fetchUtxosForAddress', () => {
    it('throws unsupported error', async () => {
      await expect(woc.fetchUtxosForAddress(['1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'])).rejects.toThrow(
        'WhatsOnChain does not support UTXO fetching'
      )
    })
  })

  describe('broadcast', () => {
    it('returns BroadcastResponse with txid on success', async () => {
      const { Transaction } = await import('@bsv/sdk')
      const { SAMPLE_RAW_TX_HEX } = await import('../test-fixtures')
      const tx = Transaction.fromHex(SAMPLE_RAW_TX_HEX)
      server.use(
        http.post(`${WOC_URL}/tx/raw`, () =>
          new HttpResponse('"abc123txid"', { headers: { 'Content-Type': 'text/plain' } })
        )
      )
      const result = await woc.broadcast(tx)
      expect(result).toMatchObject({ txid: 'abc123txid' })
    })

    it('returns BroadcastFailure on non-OK response', async () => {
      const { Transaction } = await import('@bsv/sdk')
      const { SAMPLE_RAW_TX_HEX } = await import('../test-fixtures')
      const tx = Transaction.fromHex(SAMPLE_RAW_TX_HEX)
      server.use(
        http.post(`${WOC_URL}/tx/raw`, () =>
          new HttpResponse('Transaction already in mempool', { status: 400 })
        )
      )
      const result = await woc.broadcast(tx)
      expect(result).toMatchObject({ code: '400', description: 'Transaction already in mempool' })
    })

    it('returns BroadcastFailure on network error', async () => {
      const { Transaction } = await import('@bsv/sdk')
      const { SAMPLE_RAW_TX_HEX } = await import('../test-fixtures')
      const tx = Transaction.fromHex(SAMPLE_RAW_TX_HEX)
      server.use(
        http.post(`${WOC_URL}/tx/raw`, () => HttpResponse.error())
      )
      const result = await woc.broadcast(tx)
      expect(result).toMatchObject({ code: 'unknown' })
    })
  })
})
