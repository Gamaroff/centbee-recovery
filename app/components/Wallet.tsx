'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { InfoIcon, LogOutIcon, RefreshCwIcon, Send, WalletIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { Utxo, WalletClient, clearWallet, getWallet, importWallet, syncWallet } from "@/lib/wallet/walletClient"
import { toast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Props {
}

export default function Wallet({ }: Props) {
    const router = useRouter()
    const [isExportWalletOpen, setIsExportWalletOpen] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [utxos, setUtxos] = useState<Utxo[]>([])
    const [destinationAddress, setDestinationAddress] = useState('')
    const [satoshisBalance, setSatoshisBalance] = useState(0)

    useEffect(() => {
        const storedMnemonic = localStorage.getItem('wallet_mnemonic')
        if (!storedMnemonic || !WalletClient.validateMnemonic(storedMnemonic)) {
            router.push('/start')
            return
        }
        importWallet(storedMnemonic, localStorage.getItem('wallet_pin') || '')
        syncWalletStatus()
    }, [])

    const syncWalletStatus = async () => {
        if (isSyncing) {
            return
        }
        setIsSyncing(true)
        try {
            const utxos = await syncWallet()
            console.log(utxos)
            setUtxos(utxos)
            setSatoshisBalance(utxos.reduce((acc, utxo) => acc + utxo.satoshis, 0))
        } catch (error) {
            console.error(error)
            await toast({
                title: "Error syncing wallet",
                variant: "destructive",
                description: error instanceof Error ? error.message : "An unexpected error occurred"
            })
        } finally {
            setIsSyncing(false)
        }
    }

    const onChangeDestinationAddress = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setDestinationAddress(value.trim())
    }

    const sendAll = async () => {
        setIsSending(true)
        try {
            await getWallet()?.sendAll(utxos, destinationAddress)
            toast({
                title: "Transaction sent",
                description: "Your transaction has been sent successfully"
            })
            syncWalletStatus()
        } catch (error) {
            console.error(error)
            toast({
                title: "Error sending transaction",
                variant: "destructive",
                description: error instanceof Error ? error.message : "An unexpected error occurred"
            })
        } finally {
            setIsSending(false)
        }
    }

    return (
        <>
            <div className="min-h-screen flex flex-col items-center mt-12 p-4 gap-6">
                <Card className="w-full max-w-md bg-accent">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-2xl font-bold"><span className="pr-2">💰</span> My Wallet</CardTitle>
                        <Button variant="ghost" size="icon" onClick={syncWalletStatus}>
                            <RefreshCwIcon className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex flex-col items-center">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Current Balance</p>
                            <p className="text-4xl font-bold">{(satoshisBalance / 10 ** 8).toFixed(8)} BSV</p>
                        </div>
                    </CardContent>
                </Card>

                {utxos.length > 0 && (
                    <Card className="w-full max-w-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-2xl font-bold"><span className="pr-2">💡</span> Next Step</CardTitle>
                        </CardHeader>

                        <CardContent>
                            <Alert>
                                <InfoIcon className="h-4 w-4" />
                                <AlertTitle>Send your funds to another BSV wallet</AlertTitle>
                                <AlertDescription className="text-xs text-muted-foreground">
                                    {"Don't have another BSV wallet?"} <a href="https://market.handcash.io/" rel="noreferrer" target="_blank" className="text-accent-foreground underline">Create one</a>
                                </AlertDescription>
                            </Alert>
                            <div className="flex flex-col gap-3 mt-8 mb-6">
                                <div className="flex flex-col gap-2">
                                    <Input placeholder="Enter destination address" value={destinationAddress} onChange={onChangeDestinationAddress} />
                                </div>
                                <Button className="flex-1" variant="default" onClick={() => sendAll()} disabled={!destinationAddress || isSending}>
                                    <Send className="mr-2 h-4 w-4" /> {isSending ? 'Sending...' : 'Send All'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
                {utxos.length === 0 && (
                    <Card className="w-full max-w-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-2xl font-bold"><span className="pr-2">🎉</span> Migration Completed</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{"You don't have any funds in this wallet."}</p>
                        </CardContent>
                    </Card>
                )}
                <Button variant="link" className="max-w-lg text-muted-foreground text-xs" onClick={() => {
                    clearWallet()
                    localStorage.removeItem('wallet_mnemonic')
                    localStorage.removeItem('wallet_pin')
                    router.push('/start')
                }}>
                    <WalletIcon className="mr-2 h-3 w-3" /> Restore a different wallet
                </Button>
            </div>
        </>
    )
} 