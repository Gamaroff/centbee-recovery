'use client'

import { HD, Mnemonic, Transaction, P2PKH, SatoshisPerKilobyte } from '@bsv/sdk'
import Bitails from './Bitails'
import { WalletCache } from './walletCache'
import { Utxo } from './types/utxo'
import { detectMnemonicLanguage } from './detectMnemonicLanguage'
import { chineseSimplifiedWordList } from './wordlists/chinese-simplified'

const FEE_RATE_IN_SATOSHIS_PER_BYTE = 100
const FEE_PER_P2PKH_INPUT = 148
const FEE_PER_P2PKH_OUTPUT = 34
const FEE_OVERHEAD = 10

/**
 * Returns the appropriate wordlist for a mnemonic based on auto-detected language.
 * @param mnemonic - The mnemonic phrase to analyze
 * @returns The wordlist object if Chinese Simplified is detected, undefined for English (uses SDK default)
 */
function getWordlist(mnemonic: string) {
  return detectMnemonicLanguage(mnemonic) === 'chinese-simplified'
    ? chineseSimplifiedWordList
    : undefined // undefined = use SDK default (English)
}

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
    const wordlist = getWordlist(mnemonicString)
    const mnemonic = wordlist
      ? new Mnemonic(mnemonicString, undefined, wordlist)
      : Mnemonic.fromString(mnemonicString)
    const hdPrivateKey = HD.fromSeed(mnemonic.toSeed(pin))
    return new WalletClient(hdPrivateKey, mnemonicString)
  }

  static validateMnemonic(mnemonic: string): boolean {
    try {
      const wordlist = getWordlist(mnemonic)
      const m = wordlist
        ? new Mnemonic(mnemonic, undefined, wordlist)
        : new Mnemonic(mnemonic)
      return m.isValid()
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

  async fetchUtxosForAddress(
    addresses: string[],
    onRateLimit?: (attempt: number, delayMs: number) => void,
    onRateLimitCleared?: () => void,
  ): Promise<Utxo[]> {
    return this.bitails.fetchUtxosForAddress(addresses, onRateLimit, onRateLimitCleared)
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
export interface SyncProgress {
  message: string
  /** Total UTXOs found so far */
  utxosFound: number
  /** Total satoshis found so far */
  totalSatoshis: number
  /** Total addresses checked so far */
  totalAddressesScanned: number
  /** Set after each batch completes — accumulate these in the UI for a scan log */
  logEntry?: string
  /** True while waiting on a 429 retry */
  rateLimited?: boolean
}

export async function syncWallet(
  gapLimit = 1000,
  batchSize = 25,
  onProgress?: (progress: SyncProgress) => void,
): Promise<Utxo[]> {
  const results: Utxo[] = []
  let totalAddressesScanned = 0

  const wallet = getWallet()
  if (!wallet) {
    throw new Error('Wallet not found')
  }

  const chainLabels: Record<number, string> = { 0: 'receive', 1: 'change' }

  for (const chain of [0, 1]) {
    let childIndex = 0
    const derivationPaths: Record<string, string> = {}
    let consecutiveEmpty = 0

    while (consecutiveEmpty < gapLimit) {
      const startIndex = childIndex
      const endIndex = childIndex + batchSize - 1

      onProgress?.({
        message: `Scanning ${chainLabels[chain]} addresses ${startIndex}–${endIndex} (m/44'/0/${chain}/${startIndex} … m/44'/0/${chain}/${endIndex})…`,
        utxosFound: results.length,
        totalSatoshis: results.reduce((s, u) => s + u.satoshis, 0),
        totalAddressesScanned,
      })

      const addresses = Array.from({ length: batchSize }, (_, i) => {
        const path = `m/44'/0/${chain}/${childIndex + i}`
        const child = wallet.deriveChild(path)
        const address = child.pubKey.toAddress().toString()
        derivationPaths[address] = path
        return address
      })
      childIndex += batchSize

      await new Promise(resolve => setTimeout(resolve, 200))
      const utxos = await wallet.fetchUtxosForAddress(
        addresses,
        (attempt, delayMs) => {
          onProgress?.({
            message: `Rate limited — retrying in ${delayMs / 1000}s (attempt ${attempt} of 5)…`,
            utxosFound: results.length,
            totalSatoshis: results.reduce((s, u) => s + u.satoshis, 0),
            totalAddressesScanned,
            rateLimited: true,
          })
        },
        () => {
          onProgress?.({
            message: 'Rate limit cleared, continuing scan…',
            utxosFound: results.length,
            totalSatoshis: results.reduce((s, u) => s + u.satoshis, 0),
            totalAddressesScanned,
            rateLimited: false,
          })
        },
      )

      const addressesWithUtxos = new Set(utxos.map(u => u.address))
      for (const addr of addresses) {
        if (addressesWithUtxos.has(addr)) {
          consecutiveEmpty = 0
        } else {
          consecutiveEmpty++
        }
      }

      for (const utxo of utxos) {
        results.push({
          ...utxo,
          derivationPath: derivationPaths[utxo.address],
        })
      }

      totalAddressesScanned += batchSize

      const logEntry = utxos.length > 0
        ? `✓ ${chainLabels[chain]} [${startIndex}–${endIndex}]: ${utxos.length} UTXO${utxos.length !== 1 ? 's' : ''} found (gap reset)`
        : `– ${chainLabels[chain]} [${startIndex}–${endIndex}]: empty (${consecutiveEmpty}/${gapLimit} gap)`

      onProgress?.({
        message: utxos.length > 0
          ? `Found ${utxos.length} UTXO${utxos.length !== 1 ? 's' : ''}, continuing…`
          : `No UTXOs in ${chainLabels[chain]} batch (${consecutiveEmpty}/${gapLimit} consecutive empty)`,
        utxosFound: results.length,
        totalSatoshis: results.reduce((s, u) => s + u.satoshis, 0),
        totalAddressesScanned,
        logEntry,
      })
    }
  }

  onProgress?.({
    message: 'Scan complete',
    utxosFound: results.length,
    totalSatoshis: results.reduce((s, u) => s + u.satoshis, 0),
    totalAddressesScanned,
    logEntry: `Done — ${totalAddressesScanned} addresses scanned, ${results.length} UTXO${results.length !== 1 ? 's' : ''} found`,
  })
  return results
}