import { BroadcastFailure, BroadcastResponse, Transaction, Broadcaster } from '@bsv/sdk'
import { Utxo } from './types/utxo'

/**
 * Represents an Bitails transaction broadcaster.
 */
export default class Bitails implements Broadcaster {
    network: 'main' | 'test'
    URL: string

    /**
     * Constructs an instance of the Bitails broadcaster.
     *
     * @param {string} network - which network to use (testnet or mainnet)
     */
    constructor(network: 'main' | 'test') {
        this.network = network
        this.URL = `https://api.bitails.io`
    }

    /**
     * Broadcasts a transaction via Bitails.
     * https://docs.bitails.io/#send-raw-transaction
     *
     * @param {Transaction} tx - The transaction to be broadcasted.
     * @returns {Promise<BroadcastResponse | BroadcastFailure>} A promise that resolves to either a success or failure response.
     */
    async broadcast(tx: Transaction): Promise<BroadcastResponse | BroadcastFailure> {
        const txhex = tx.toHex()

        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raw: txhex })
        }

        try {
            let data: any = {}

            const response = await window.fetch(`${this.URL}/tx/broadcast`, requestOptions)
            data = await response.json()

            if (data.error) {
                return {
                    code: data.error.code.toString(),
                    description: data.error.message,
                } as BroadcastFailure
            }

            if (data.txid) {
                return {
                    txid: data.txid,
                    message: data.messages
                } as BroadcastResponse
            }
        } catch (e) {
            console.error(e)
        }
        return {
            code: 'unknown',
            description: 'Unknown error',
        } as BroadcastFailure
    }

    /**
     * Fetches a raw transaction from Bitails.
     * https://docs.bitails.io/#download-transaction
     *
     * @param {string} txid - The transaction id.
     * @returns {Promise<string>} A promise that resolves to the raw transaction.
     */
    async fetchRawTx(txid: string): Promise<string> {
        const response = await window.fetch(`${this.URL}/download/tx/${txid}/hex`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/gzip'
          }
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch raw transaction: ${response.statusText}`);
        }
        const data = await response.arrayBuffer()
        const rawTx = new TextDecoder().decode(data)
        return rawTx;
      }

      /**
     * Fetches UTXOs for a batch of addresses in a single request using the Bitails
     * multi-address unspent endpoint (`POST /address/unspent/multi`).
     *
     * The API returns an array of objects, one per address, each containing an
     * `unspent` array of UTXOs for that address. Addresses with no UTXOs are
     * included in the response with an empty `unspent` array. The response is
     * flattened so the caller receives a single list of UTXOs across all addresses.
     *
     * https://docs.bitails.io/#get-unspent-of-address
     *
     * @param {string[]} addresses - BSV addresses to query (sent as `{ addresses }` in POST body)
     * @returns {Promise<Utxo[]>} Flat list of UTXOs across all queried addresses
     */
      async fetchUtxosForAddress(
        addresses: string[],
        onRateLimit?: (attempt: number, delayMs: number) => void,
        onRateLimitCleared?: () => void,
      ): Promise<Utxo[]> {
        const maxRetries = 5
        let delay = 1000

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          const response = await window.fetch(`${this.URL}/address/unspent/multi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addresses }),
          })

          if (response.status === 429) {
            if (attempt === maxRetries) throw new Error('Rate limited by Bitails after max retries')
            onRateLimit?.(attempt + 1, delay)
            await new Promise(resolve => setTimeout(resolve, delay))
            delay *= 2
            continue
          }

          if (attempt > 0) onRateLimitCleared?.()

          if (!response.ok) {
            throw new Error(`Failed to fetch utxos for addresses: ${response.statusText}`)
          }

          const data = await response.json()
          return data.map((item: any) => item.unspent.map((utxo: any): Utxo => ({
            address: item.address,
            txid: utxo.txid,
            vout: utxo.vout,
            satoshis: utxo.satoshis,
            height: utxo.blockheight,
          }))).flat()
        }

        return []
      }
}