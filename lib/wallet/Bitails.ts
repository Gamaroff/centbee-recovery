import { BroadcastFailure, BroadcastResponse, Transaction, Broadcaster } from '@bsv/sdk'

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
        this.URL = `https://api.bitails.io/tx/broadcast`
    }

    /**
     * Broadcasts a transaction via Bitails.
     * This method will assume that window.fetch is available
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

            // Use fetch in a browser environment
            const response = await window.fetch(`${this.URL}`, requestOptions)
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
}