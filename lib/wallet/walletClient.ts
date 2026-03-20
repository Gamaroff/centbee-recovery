'use client'

import { HD, Mnemonic, Transaction, P2PKH, SatoshisPerKilobyte } from '@bsv/sdk'
import Bitails from './Bitails'
import { WalletCache } from './walletCache'
import { Utxo } from './types/utxo'

const FEE_RATE_IN_SATOSHIS_PER_BYTE = 100
const FEE_PER_P2PKH_INPUT = 148
const FEE_PER_P2PKH_OUTPUT = 34
const FEE_OVERHEAD = 10


export class WalletClient {
  private hdPrivateKey: HD
  private mnemonic: string
  private cache: WalletCache
  private bitails: Bitails
  
  private constructor(hdPrivateKey: HD, mnemonic: string) {
    this.hdPrivateKey = hdPrivateKey
    this.mnemonic = mnemonic
    this.cache = new WalletCache()
    this.bitails = new Bitails('main')
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

  async fetchUtxosForAddress(addresses: string[]): Promise<Utxo[]> {
    return this.bitails.fetchUtxosForAddress(addresses)
  }

  /**
   * Builds, signs, and broadcasts a "sweep" transaction that spends all provided UTXOs
   * to a single destination address.
   *
   * Fee is calculated manually before signing:
   *   fee = (inputs × 148 + outputs × 34 + 10) × 100 sat/byte
   *
   * The source transaction for each UTXO is required by @bsv/sdk to construct the
   * unlocking script. It is fetched from Bitails and cached to avoid redundant requests.
   *
   * Throws if:
   * - No UTXOs are provided
   * - Total input value is less than the estimated fee (balance too low to cover fees)
   *
   * @param utxos - UTXOs to spend, each must have a `derivationPath` set
   * @param destinationAddress - BSV address to receive all funds minus fee
   * @returns The broadcast transaction ID (hex)
   */
  async sendAll(utxos: Utxo[], destinationAddress: string): Promise<string> {
    if (!utxos.length) {
      throw new Error('No UTXOs provided')
    }

    const totalInputInSatoshis = utxos.reduce((sum, utxo) => sum + utxo.satoshis, 0)
    const totalOutputs = 1

    const estimatedSize = utxos.length * FEE_PER_P2PKH_INPUT + totalOutputs * FEE_PER_P2PKH_OUTPUT + FEE_OVERHEAD
    const fee = estimatedSize * FEE_RATE_IN_SATOSHIS_PER_BYTE

    if (totalInputInSatoshis < fee) {
      throw new Error(`Insufficient funds: total input in satoshis is less than the fee (${fee} satoshis)`)
    }

    // Create transaction
    const tx = new Transaction()

    // Add inputs
    for (const utxo of utxos) {
      let sourceTransaction = this.cache.getTransactionById(utxo.txid)
      if (!sourceTransaction) {
        const rawTx = await this.bitails.fetchRawTx(utxo.txid)
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

    await tx.fee(new SatoshisPerKilobyte(FEE_RATE_IN_SATOSHIS_PER_BYTE * 1000))
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

/**
 * Scans the blockchain for UTXOs belonging to the current wallet singleton.
 *
 * Derives addresses in batches of `gapLimit` (default 25) for both the external
 * chain (chain 0, receiving addresses) and the internal chain (chain 1, change addresses),
 * following the BIP44 path `m/44'/0/${chain}/${index}`.
 *
 * Gap limit behaviour: scanning stops on a chain as soon as a full batch of
 * `gapLimit` addresses returns no UTXOs. This means up to `gapLimit - 1`
 * consecutive unused addresses are tolerated; a larger gap will cause funds
 * beyond that point to be missed.
 *
 * A 200ms delay is inserted between batch requests to avoid rate-limiting by Bitails.
 *
 * @param gapLimit - Number of addresses per batch; scanning stops when a full batch
 *                   returns no UTXOs (default: 25)
 * @returns All discovered UTXOs with their derivation paths attached
 * @throws If no wallet singleton exists (call `importWallet` first)
 */
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
      const utxos = await wallet.fetchUtxosForAddress(addresses)
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