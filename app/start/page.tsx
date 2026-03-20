'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { importWallet, WalletClient } from "@/lib/wallet/walletClient"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { detectMnemonicLanguage } from "@/lib/wallet/detectMnemonicLanguage"
import { ShieldCheck, Lock, Github, ArrowRight, Loader2, Key } from "lucide-react"

export default function StartPage() {
  const [mnemonic, setMnemonic] = useState('')
  const [mnemonicError, setMnemonicError] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

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

  const handleMnemonicChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const mnemonic = e.target.value;
    const language = detectMnemonicLanguage(mnemonic)
    const normalized = language === 'english' ? mnemonic.toLowerCase() : mnemonic
    setMnemonic(normalized)
  }

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
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile-only closure notice */}
          <div className="lg:hidden rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1">Important notice</p>
            <p className="text-xs text-amber-800 dark:text-amber-300/80 leading-relaxed">
              Centbee is closing on <span className="font-semibold">1 April 2026</span>. Your BSV is safe — Centbee never controlled your keys. Use your 12-word phrase and PIN to recover your coins below.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">Recover your wallet</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enter your 12-word recovery phrase and 4-digit PIN to sweep your BSV to a new wallet.
            </p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Recovery phrase</label>
              <Textarea
                placeholder="Enter your 12-word recovery phrase from Centbee"
                value={mnemonic}
                required
                onChange={handleMnemonicChange}
                rows={3}
                className={cn(
                  "resize-none transition-colors",
                  mnemonicError ? "border-destructive focus-visible:ring-destructive" : ""
                )}
              />
              {mnemonicError && (
                <p className="text-xs text-destructive">Invalid recovery phrase</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">PIN code</label>
              <Input
                placeholder="4-digit PIN"
                value={pin}
                type="password"
                autoComplete="off"
                required
                maxLength={4}
                onChange={(e) => setPin(e.target.value)}
                className={cn(pinError ? "border-destructive focus-visible:ring-destructive" : "")}
              />
              <p className={cn("text-xs", pinError ? "text-destructive" : "text-muted-foreground")}>
                {pinError ? "Enter a valid 4-digit PIN code" : "A wrong PIN will result in missing funds"}
              </p>
            </div>

            <Button
              className="w-full gap-2"
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
          </form>

          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            All operations run locally in your browser. Your keys are never sent to any server.{" "}
            <a href="https://github.com/Gamaroff/centbee-recovery" rel="noreferrer" target="_blank" className="underline underline-offset-2">
              View source on GitHub.
            </a>
          </p>
        </div>
      </div>
    </div>
  )
} 