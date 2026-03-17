export interface Utxo {
  address: string
  txid: string
  vout: number
  satoshis: number
  height: number
  derivationPath?: string
}