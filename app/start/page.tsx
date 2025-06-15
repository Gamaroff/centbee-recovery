'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { importWallet, WalletClient } from "@/lib/wallet/walletClient"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"

export default function StartPage() {
  const [mnemonic, setMnemonic] = useState('')
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleImportWallet = async () => {
    try {
      setIsLoading(true)
      if (!WalletClient.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase')
      }

      // Import wallet locally
      const wallet = importWallet(mnemonic, pin)

      // Store mnemonic and redirect
      localStorage.setItem('wallet_mnemonic', mnemonic)
      localStorage.setItem('wallet_pin', pin)
      router.push('/')
    } catch (error) {
      console.error(error)
      toast.error(
        "Invalid mnemonic",
        { description: error instanceof Error ? error.message : "Please check your recovery phrase and try again" }
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center mt-12 p-4 gap-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to CentBee Recovery</CardTitle>
          <CardDescription>
            Restore your wallet to send the funds to a new wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Textarea
              placeholder="Enter your 12-word recovery phrase"
              value={mnemonic}
              onChange={(e) => setMnemonic(e.target.value)}
            />
            <Input
              placeholder="Enter your PIN code"
              value={pin}
              type="password"
              autoComplete="off"
              readOnly={true}
              onFocus={(e) => e.target.removeAttribute('readonly')}
              maxLength={4}
              minLength={4}
              onChange={(e) => setPin(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleImportWallet}
                disabled={isLoading}
              >
                {isLoading ? "Importing..." : "Import"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 