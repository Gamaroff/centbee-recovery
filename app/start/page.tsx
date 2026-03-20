'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { importWallet, WalletClient } from "@/lib/wallet/walletClient"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ShieldCheck, Github, ArrowRight, Loader2, Key, Info, Languages, Lock, Copy, Check, ArrowDown, RefreshCw } from "lucide-react"

type PhraseLanguage = 'english' | 'chinese-simplified'

function Tooltip({ text }: { text: string }) {
  return (
    <span className="relative group">
      <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground group-hover:text-foreground transition-colors" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
      </span>
    </span>
  )
}

const LANGUAGE_CONFIG: Record<PhraseLanguage, {
  label: string
  placeholder: string
  hint: string
  example: string
}> = {
  english: {
    label: 'English',
    placeholder: 'e.g. abandon ability able about above absent absorb abstract absurd abuse access accident',
    hint: '12 lowercase English words separated by spaces',
    example: 'abandon ability able…',
  },
  'chinese-simplified': {
    label: '中文简体 (Chinese Simplified)',
    placeholder: 'e.g. 的 一 是 了 我 不 人 在 他 有 这 中',
    hint: '12 Chinese characters separated by spaces',
    example: '的 一 是 了 我…',
  },
}

export default function StartPage() {
  const [mnemonic, setMnemonic] = useState('')
  const [mnemonicError, setMnemonicError] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [language, setLanguage] = useState<PhraseLanguage>('english')
  const [receivePubKey, setReceivePubKey] = useState<string | null>(null)
  const [changePubKey, setChangePubKey] = useState<string | null>(null)
  const [copied, setCopied] = useState<'receive' | 'change' | null>(null)
  const router = useRouter()

  useEffect(() => {
    const storedMnemonic = localStorage.getItem('wallet_mnemonic')
    const storedPin = localStorage.getItem('wallet_pin')
    if (storedMnemonic) setMnemonic(storedMnemonic)
    if (storedPin) setPin(storedPin)
  }, [])

  useEffect(() => {
    const trimmed = mnemonic.trim()
    const pinReady = pin.length === 4 && /^\d+$/.test(pin)
    if (!trimmed || !pinReady) {
      setReceivePubKey(null)
      setChangePubKey(null)
      return
    }
    try {
      const wallet = WalletClient.fromMnemonic(trimmed, pin)
      setReceivePubKey(wallet.deriveChild("m/44'/0/0").toPublic().toString())
      setChangePubKey(wallet.deriveChild("m/44'/0/1").toPublic().toString())
    } catch {
      setReceivePubKey(null)
      setChangePubKey(null)
    }
  }, [mnemonic, pin])

  const handleCopy = (type: 'receive' | 'change') => {
    const addr = type === 'receive' ? receivePubKey : changePubKey
    if (!addr) return
    navigator.clipboard.writeText(addr)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleImportWallet = async () => {
    try {
      setIsLoading(true)
      const mnemonicError = !WalletClient.validateMnemonic(mnemonic.trim())
      setMnemonicError(mnemonicError)
      const pinError = pin.length !== 4 || !/^\d+$/.test(pin)
      setPinError(pinError)

      if (pinError || mnemonicError) {
        return
      }

      await importWallet(mnemonic, pin)

      localStorage.setItem('wallet_mnemonic', mnemonic)
      localStorage.setItem('wallet_pin', pin)
      router.push('/')
    } catch (error) {
      console.error(error)
      toast.error(
        "Invalid parameters",
        { description: "Please check your recovery phrase and pin code" }
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setMnemonic('')
    setPin('')
    setMnemonicError(false)
    setPinError(false)
    setReceivePubKey(null)
    setChangePubKey(null)
    localStorage.removeItem('wallet_mnemonic')
    localStorage.removeItem('wallet_pin')
  }

  const handleMnemonicChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const normalized = language === 'english' ? value.toLowerCase() : value
    setMnemonic(normalized)
  }

  const langConfig = LANGUAGE_CONFIG[language]

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Left panel — brand / trust */}
      <div className="hidden lg:flex lg:w-1/2 bg-zinc-900 flex-col justify-between p-12">
        <div>
          {/* Closure notice */}
          <div className="mb-6 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Important notice</p>
            <p className="text-sm text-white/80 leading-relaxed">
              Centbee is closing on <span className="font-semibold text-white">1 April 2026</span>. If you still have your 12-word recovery phrase and 4-digit PIN, your BSV is completely safe — this tool lets you sweep your coins to any other BSV service in minutes.
            </p>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Your BSV is safe.<br />Let&apos;s move it to safety.
          </h1>
          <p className="text-white/60 text-base leading-relaxed max-w-sm">
            Centbee has never controlled your keys — you always have. As long as you have your recovery phrase and PIN, your coins are yours and no one can take them away.
          </p>
        </div>

        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
              <Key className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">You own your keys</p>
              <p className="text-xs text-white/50 mt-0.5">Centbee never held your BSV. Your 12-word phrase gives you full control, always.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">100% client-side</p>
              <p className="text-xs text-white/50 mt-0.5">All cryptography runs locally in your browser. Nothing is sent to any server.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
              <Github className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Open source</p>
              <p className="text-xs text-white/50 mt-0.5">
                <a href="https://github.com/Gamaroff/centbee-recovery" rel="noreferrer" target="_blank" className="underline underline-offset-2 hover:text-white/80 transition-colors">
                  Audit the code on GitHub
                </a>{" "}— nothing is hidden.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Mobile-only closure notice */}
          <div className="lg:hidden mb-6 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1">Important notice</p>
            <p className="text-xs text-amber-800 dark:text-amber-300/80 leading-relaxed">
              Centbee is closing on <span className="font-semibold">1 April 2026</span>. Your BSV is safe — Centbee never controlled your keys. Use your 12-word phrase and PIN to recover your coins below.
            </p>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight">Recover your wallet</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enter your recovery phrase and PIN to sweep your BSV to a new wallet.
            </p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-5">

            {/* Language selector */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5 text-muted-foreground" />
                <label className="text-sm font-medium">Recovery phrase language</label>
                <Tooltip text="Centbee supported both English and Chinese Simplified recovery phrases. Choose the language that matches the words you wrote down." />
              </div>
              <select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value as PhraseLanguage)
                  setMnemonic('')
                  setMnemonicError(false)
                }}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="english">English</option>
                <option value="chinese-simplified">中文简体 (Chinese Simplified)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {language === 'english'
                  ? 'Standard BIP39 English wordlist — all lowercase letters.'
                  : 'BIP39 Chinese Simplified wordlist — characters separated by spaces (空格分隔汉字).'}
              </p>
            </div>

            {/* Recovery phrase */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <label className="text-sm font-medium">Recovery phrase</label>
                  <Tooltip text="Your 12-word BIP39 mnemonic phrase. This was shown to you when you first created your Centbee wallet. Never share this with anyone." />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {mnemonic.trim() ? `${mnemonic.trim().split(/\s+/).filter(Boolean).length} / 12 words` : '12 words'}
                </span>
              </div>
              <Textarea
                placeholder={langConfig.placeholder}
                value={mnemonic}
                required
                onChange={handleMnemonicChange}
                rows={3}
                className={cn(
                  "resize-none transition-colors font-mono text-sm",
                  mnemonicError ? "border-destructive focus-visible:ring-destructive" : ""
                )}
              />
              {mnemonicError ? (
                <p className="text-xs text-destructive">
                  Invalid recovery phrase — check that all 12 words are correct and in the right order.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">{langConfig.hint}</p>
              )}
            </div>

            {/* PIN */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                <label className="text-sm font-medium">PIN code</label>
                <Tooltip text="The 4-digit PIN you set when creating your Centbee wallet. This is combined with your recovery phrase to derive your keys — an incorrect PIN will produce a different wallet with no funds." />
              </div>
              <Input
                placeholder="4-digit PIN"
                value={pin}
                type="password"
                autoComplete="off"
                required
                maxLength={4}
                onChange={(e) => setPin(e.target.value)}
                className={cn("font-mono tracking-widest", pinError ? "border-destructive focus-visible:ring-destructive" : "")}
              />
              <p className={cn("text-xs", pinError ? "text-destructive" : "text-muted-foreground")}>
                {pinError
                  ? "Enter a valid 4-digit PIN code"
                  : "Must match the PIN you used in Centbee — a wrong PIN produces an empty wallet"}
              </p>
            </div>

            {/* Derived addresses — only shown when mnemonic + PIN are valid */}
            {(receivePubKey || changePubKey) && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Derived public keys</p>
                  <Tooltip text="These public keys are mathematically derived from your phrase and PIN right now, in your browser. If they look familiar, your inputs are correct. No data leaves your device." />
                </div>

                {/* Receive public key */}
                {receivePubKey && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/50 dark:bg-emerald-950/30 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <ArrowDown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Receive public key</span>
                        <Tooltip text="The base external public key (path m/44'/0/0). Child receive addresses are derived from this key. Use it to verify your phrase and PIN are correct." />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy('receive')}
                        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                      >
                        {copied === 'receive' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied === 'receive' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="font-mono text-xs break-all text-emerald-900 dark:text-emerald-200 leading-relaxed">
                      {receivePubKey}
                    </p>
                  </div>
                )}

                {/* Change public key */}
                {changePubKey && (
                  <div className="rounded-lg border border-sky-200 bg-sky-50/60 dark:border-sky-800/50 dark:bg-sky-950/30 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                        <span className="text-xs font-semibold text-sky-700 dark:text-sky-400">Change public key</span>
                        <Tooltip text="The base internal/change public key (path m/44'/0/1). Child change addresses are derived from this key. Funds sent to change addresses are recovered automatically during the sweep." />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy('change')}
                        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-sky-700 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors"
                      >
                        {copied === 'change' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied === 'change' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="font-mono text-xs break-all text-sky-900 dark:text-sky-200 leading-relaxed">
                      {changePubKey}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleReset}
                disabled={isLoading}
                className="gap-2"
              >
                Reset
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleImportWallet}
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Restoring wallet…
                  </>
                ) : (
                  <>
                    Restore wallet
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Trust footer */}
          <div className="mt-6 flex items-start gap-2 rounded-md border border-border/60 bg-muted/40 px-4 py-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              All operations run locally in your browser. Your keys and phrase are never sent to any server.{" "}
              <a href="https://github.com/Gamaroff/centbee-recovery" rel="noreferrer" target="_blank" className="underline underline-offset-2 hover:text-foreground transition-colors">
                View source on GitHub.
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 