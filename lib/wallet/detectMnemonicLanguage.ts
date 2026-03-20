/**
 * Detects the language of a BIP39 mnemonic phrase.
 *
 * Language detection is based on Unicode character ranges:
 * - CJK Unified Ideographs (\u4e00–\u9fff) → Chinese Simplified
 * - Hiragana (\u3041–\u3096) → Japanese
 * - ASCII alphanumeric + space → English (default for Latin scripts)
 *
 * Note: French, Italian, and Spanish all use Latin script and cannot be
 * reliably auto-detected. These languages require explicit selection.
 *
 * Source: BIP39 Standard (https://github.com/trezor/python-mnemonic)
 */

export type MnemonicLanguage = 'english' | 'chinese-simplified' | 'french' | 'italian' | 'japanese' | 'spanish'

/**
 * Detects the language of a mnemonic phrase based on script/character ranges.
 *
 * Returns 'english' as a fallback for all Latin-script languages (French,
 * Italian, Spanish) since they cannot be distinguished without checking
 * against each wordlist. Use explicit language selection for those.
 *
 * @param mnemonic - The mnemonic phrase to analyze (space-separated words)
 * @returns The detected language, or 'english' as default for Latin scripts
 */
export function detectMnemonicLanguage(mnemonic: string): MnemonicLanguage {
  if (!mnemonic || typeof mnemonic !== 'string') {
    return 'english'
  }

  // CJK Unified Ideographs → Chinese Simplified
  if (/[\u4e00-\u9fff]/.test(mnemonic)) {
    return 'chinese-simplified'
  }

  // Hiragana → Japanese
  if (/[\u3041-\u3096]/.test(mnemonic)) {
    return 'japanese'
  }

  return 'english'
}
