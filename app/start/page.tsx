'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { importWallet, WalletClient } from "@/lib/wallet/walletClient"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { detectMnemonicLanguage } from "@/lib/wallet/detectMnemonicLanguage"

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
      console.log(pin.length !== 4, !/^\d+$/.test(pin))
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
    // Apply lowercase only for English mnemonics; Chinese characters have no case
    const language = detectMnemonicLanguage(mnemonic)
    const normalized = language === 'english' ? mnemonic.toLowerCase() : mnemonic
    setMnemonic(normalized)
  }

  return (
    <div className="flex flex-col items-center mt-12 p-4 gap-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Centbee Recovery</CardTitle>
          <CardDescription>
            Restore your wallet to send the funds to a new wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={(e) => {
            e.preventDefault()
          }}>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <Textarea
                  placeholder="Enter your 12-word recovery phrase from Centbee"
                  value={mnemonic}
                  required
                  onChange={handleMnemonicChange}
                  className={cn(mnemonicError ? "border-destructive" : "")}
                />
                {mnemonicError && (
                  <p className="text-xs pl-3 text-destructive flex items-center gap-1.5">
                    Invalid recovery phrase
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Input
                  placeholder="Enter your PIN code"
                  value={pin}
                  type="password"
                  autoComplete="off"
                  required
                  maxLength={4}
                  onChange={(e) => setPin(e.target.value)}
                />
                <p className={cn("text-xs pl-3 flex items-center gap-1.5", pinError ? "text-destructive" : "text-muted-foreground")}>
                  {pinError ? "Enter a 4-digit PIN code" : "Entering a wrong PIN will result in missing funds"}
                </p>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  className="flex-1"
                  onClick={handleImportWallet}
                  disabled={isLoading}
                >
                  {isLoading ? "Restoring..." : "Restore"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 