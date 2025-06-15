'use client'

import { HD, Mnemonic, Transaction, P2PKH } from '@bsv/sdk'
import Bitails from './Bitails'
import { WalletCache } from './walletCache'

export interface Utxo {
  address: string
  txid: string
  vout: number
  satoshis: number
  height: number
  derivationPath?: string
}


export class WalletClient {
  private hdPrivateKey: HD
  private mnemonic: string
  private cache: WalletCache;

  private constructor(hdPrivateKey: HD, mnemonic: string) {
    this.hdPrivateKey = hdPrivateKey
    this.mnemonic = mnemonic
    this.cache = new WalletCache()
  }

  static createNew(): WalletClient {
    const mnemonic = Mnemonic.fromRandom()
    const hdPrivateKey = HD.fromSeed(mnemonic.toSeed())
    return new WalletClient(hdPrivateKey, mnemonic.toString())
  }

  static fromMnemonic(mnemonicString: string, pin: string): WalletClient {
    if (!WalletClient.validateMnemonic(mnemonicString)) {
      throw new Error('Invalid mnemonic')
    }
    const mnemonic = Mnemonic.fromString(mnemonicString);
    const hdPrivateKey = HD.fromSeed(mnemonic.toSeed(pin))
    return new WalletClient(hdPrivateKey, mnemonicString)
  }

  static validateMnemonic(mnemonic: string): boolean {
    try {
      return Mnemonic.isValid(mnemonic)
    } catch {
      return false
    }
  }

  deriveChild(path: string): HD {
    return this.hdPrivateKey.derive(path)
  }

  getMnemonic(): string {
    return this.mnemonic
  }

  getXpub(): string {
    return this.hdPrivateKey.toPublic().toString()
  }

  async sendAll(utxos: Utxo[], destinationAddress: string): Promise<string> {
    if (!utxos.length) {
      throw new Error('No UTXOs provided')
    }

    // Calculate total input amount
    const totalInput = utxos.reduce((sum, utxo) => sum + utxo.satoshis, 0)

    // Calculate fee (in satoshis per byte)
    const estimatedSize = utxos.length * 148 + 1 * 34 + 10 // Rough estimate
    const feeRate = 1 // 1 sat/byte
    const fee = estimatedSize * feeRate

    if (totalInput < fee) {
      throw new Error('Insufficient funds')
    }

    // Create transaction
    const tx = new Transaction()

    // Add inputs
    for (const utxo of utxos) {
      let sourceTransaction = this.cache.getTransactionById(utxo.txid)
      if (!sourceTransaction) {
        const rawTx = await fetchRawTx(utxo.txid)
        sourceTransaction = Transaction.fromHex(rawTx)
        this.cache.setTransaction(sourceTransaction)
      }
      tx.addInput({
        sourceTransaction,
        sourceOutputIndex: utxo.vout,
        unlockingScriptTemplate: new P2PKH().unlock(this.hdPrivateKey.derive(utxo.derivationPath!).privKey),
      })
    }

    // Add outputs
    tx.addOutput({
      lockingScript: new P2PKH().lock(destinationAddress),
      change: true,
    })

    await tx.fee()
    await tx.sign()
    await tx.broadcast(new Bitails('main'));
    return tx.id('hex')
  }
}

// Create a singleton instance for the client-side wallet
let walletInstance: WalletClient | null = null

export function getWallet(): WalletClient | null {
  return walletInstance
}

export function createWallet(): WalletClient {
  walletInstance = WalletClient.createNew()
  return walletInstance
}

export function importWallet(mnemonic: string, pin: string): WalletClient {
  walletInstance = WalletClient.fromMnemonic(mnemonic, pin)
  return walletInstance
}

export function clearWallet(): void {
  walletInstance = null
}

export async function fetchRawTx(txid: string): Promise<string> {
  const response = await fetch(`https://api.bitails.io/download/tx/${txid}/hex`, {
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

export async function fetchUtxosForAddress(addresses: string[]): Promise<Utxo[]> {
  const response = await fetch(`https://api.bitails.io/address/unspent/multi`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ addresses })
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch utxos for addresses ${addresses}: ${response.statusText}`);
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

export async function syncWallet(gapLimit = 25): Promise<Utxo[]> {
  const results: Utxo[] = []

  const wallet = getWallet()
  if (!wallet) {
    throw new Error('Wallet not found')
  }

  for (const chain of [0, 1]) { // 0 = external, 1 = internal/change
    let childIndex = 0
    const derivationPaths: Record<string, string> = {}
    let utxosFound = true
    while (utxosFound) {
      const addresses = Array.from({ length: gapLimit }, (_, i) => {
        const path = `m/44'/0/${chain}/${childIndex + i}`
        const child = wallet.deriveChild(path)
        const address = child.pubKey.toAddress().toString();
        derivationPaths[address] = path
        return address
      })
      childIndex += gapLimit

      await new Promise(resolve => setTimeout(resolve, 200))
      const utxos = await fetchUtxosForAddress(addresses)
      for (const utxo of utxos) {
        results.push({
          ...utxo,
          derivationPath: derivationPaths[utxo.address],
        })
      }
      utxosFound = utxos.length > 0
    }
  }
  return results
}