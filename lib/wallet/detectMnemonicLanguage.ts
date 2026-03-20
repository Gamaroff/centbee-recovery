/**
 * Detects the language of a BIP39 mnemonic phrase.
 *
 * Language detection is based on Unicode character ranges:
 * - CJK Unified Ideographs (\u4e00–\u9fff) → Chinese Simplified
 * - ASCII alphanumeric + space → English
 *
 * This auto-detection allows the recovery tool to validate and derive seeds from
 * both English and Chinese Simplified BIP39 mnemonics without requiring manual
 * language selection.
 *
 * Source: BIP39 Standard (https://github.com/trezor/python-mnemonic)
 */

export type MnemonicLanguage = 'english' | 'chinese-simplified'

/**
 * Detects the language of a mnemonic phrase.
 *
 * @param mnemonic - The mnemonic phrase to analyze (space-separated words)
 * @returns The detected language: 'english' or 'chinese-simplified'
 *
 * @example
 * detectMnemonicLanguage('能 轻 幅 腰 幸 纪 矿 碗 转 脏 牢 证')
 * // Returns: 'chinese-simplified'
 *
 * @example
 * detectMnemonicLanguage('ability abandon able about above absent absolute absorb abstract abuse')
 * // Returns: 'english'
 */
export function detectMnemonicLanguage(mnemonic: string): MnemonicLanguage {
  if (!mnemonic || typeof mnemonic !== 'string') {
    return 'english' // Default to English for empty or invalid input
  }

  // Check if the mnemonic contains any CJK Unified Ideographs
  // Unicode range: \u4e00–\u9fff (CJK Unified Ideographs)
  const cjkPattern = /[\u4e00-\u9fff]/

  return cjkPattern.test(mnemonic) ? 'chinese-simplified' : 'english'
}
