import { BroadcastFailure, BroadcastResponse, Transaction } from '@bsv/sdk'
import { Utxo } from './types/utxo'
import { IndexerService } from './types/indexerService'

/**
 * WhatsOnChain implementation of IndexerService.
 * Supports raw transaction fetching and broadcasting. UTXO fetching is not supported.
 */
export default class WhatsOnChain implements IndexerService {
    readonly URL = 'https://api.whatsonchain.com/v1/bsv/main'

    async fetchRawTx(txid: string): Promise<string> {
        const response = await window.fetch(`${this.URL}/tx/${txid}/hex`, {
            method: 'GET',
        })
        if (!response.ok) {
            throw new Error(`WhatsOnChain failed to fetch raw transaction: ${response.statusText}`)
        }
        return (await response.text()).trim()
    }

    async fetchUtxosForAddress(_addresses: string[]): Promise<Utxo[]> {
        throw new Error('WhatsOnChain does not support UTXO fetching')
    }

    async broadcast(tx: Transaction): Promise<BroadcastResponse | BroadcastFailure> {
        const txhex = tx.toHex()

        try {
            const response = await window.fetch(`${this.URL}/tx/raw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ txhex }),
            })

            const text = (await response.text()).trim()

            if (!response.ok) {
                return { code: response.status.toString(), description: text } as BroadcastFailure
            }

            return { txid: text.replace(/"/g, ''), message: 'broadcast successful' } as BroadcastResponse
        } catch (e: any) {
            return { code: 'unknown', description: e?.message ?? 'Unknown error' } as BroadcastFailure
        }
    }
}
