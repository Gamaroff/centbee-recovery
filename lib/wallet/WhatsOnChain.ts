import { BroadcastFailure, BroadcastResponse, Transaction } from '@bsv/sdk'
import { Utxo } from './types/utxo'
import { IndexerService } from './types/indexerService'

/**
 * WhatsOnChain implementation of IndexerService.
 * Supports raw transaction fetching only — UTXO fetching and broadcasting are not supported.
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

    async broadcast(_tx: Transaction): Promise<BroadcastResponse | BroadcastFailure> {
        throw new Error('WhatsOnChain does not support broadcasting')
    }
}
