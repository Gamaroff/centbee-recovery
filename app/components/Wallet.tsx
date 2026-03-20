'use client'

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ArrowLeft, CheckCircle2, Github, InfoIcon, Key, Loader2, RefreshCw, Send, ShieldCheck, WalletIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { SyncProgress, WalletClient, clearWallet, getWallet, importWallet, syncWallet } from "@/lib/wallet/walletClient"
import { P2PKH } from "@bsv/sdk"
import { Utxo } from "@/lib/wallet/types/utxo"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"

const SYNC_GAP_LIMIT = 3500
const SYNC_BATCH_SIZE = 25

export default function Wallet() {
    const router = useRouter()
    const [isSending, setIsSending] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
    const [scanLog, setScanLog] = useState<string[]>([])
    const [utxos, setUtxos] = useState<Utxo[]>([])
    const [destinationAddress, setDestinationAddress] = useState('')
    const [satoshisBalance, setSatoshisBalance] = useState(0)
    const [hasSynced, setHasSynced] = useState(false)
    const [rateLimitFailed, setRateLimitFailed] = useState(false)

    const syncWalletStatus = useCallback(async () => {
        if (isSyncing) {
            return
        }
        setIsSyncing(true)
        setSyncProgress(null)
        setScanLog([])
        setRateLimitFailed(false)
        try {
            const utxos = await syncWallet(SYNC_GAP_LIMIT, SYNC_BATCH_SIZE, (progress) => {
                setSyncProgress(progress)
                if (progress.logEntry) {
                    setScanLog(prev => [progress.logEntry!, ...prev])
                }
                if (progress.totalSatoshis !== undefined) {
                    setSatoshisBalance(progress.totalSatoshis)
                }
            })
            setUtxos(utxos)
            setHasSynced(true)
        } catch (error) {
            console.error(error)
            const isRateLimit = error instanceof Error && error.message.includes('Rate limited by Bitails after max retries')
            if (isRateLimit) {
                setRateLimitFailed(true)
            } else {
                toast.error("Error syncing wallet", {
                    description: error instanceof Error ? error.message : "An unexpected error occurred"
                })
            }
        } finally {
            setIsSyncing(false)
        }
    }, [isSyncing])

    useEffect(() => {
        const storedMnemonic = localStorage.getItem('wallet_mnemonic')
        const storedPin = localStorage.getItem('wallet_pin')
        if (!storedMnemonic || !WalletClient.validateMnemonic(storedMnemonic) || !storedPin) {
            router.push('/start')
            return
        }
        importWallet(storedMnemonic, storedPin)
        syncWalletStatus()
    }, [])

    const onChangeDestinationAddress = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setDestinationAddress(value.trim())
    }

    const handleBack = () => {
        clearWallet()
        router.push('/start')
    }

    const sendAll = async () => {
        try {
            new P2PKH().lock(destinationAddress)
        } catch {
            toast.error("Invalid destination address", {
                description: "Please enter a valid BSV address."
            })
            return
        }
        setIsSending(true)
        try {
            const txid = await getWallet()?.sendAll(utxos, destinationAddress)
            toast("Transaction sent", {
                description: "Your transaction has been sent successfully",
                action: {
                    label: "View",
                    onClick: () => {
                        window.open(`https://whatsonchain.com/tx/${txid}`, '_blank')
                    }
                }
            })
            syncWalletStatus()
        } catch (error) {
            console.error(error)
            toast.error("Error sending transaction", {
                description: error instanceof Error ? error.message : "An unexpected error occurred"
            })
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="flex min-h-[calc(100vh-4rem)]">
            {/* Left panel — brand / info */}
            <div className="hidden lg:flex lg:w-1/2 bg-zinc-900 flex-col justify-between p-12">
                <div>
                    <div className="mb-6 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Important notice</p>
                        <p className="text-sm text-white/80 leading-relaxed">
                            Centbee is closing on <span className="font-semibold text-white">1 April 2026</span>. Use this tool to sweep your BSV to any other wallet before that date.
                        </p>
                    </div>

                    <h1 className="text-4xl font-bold text-white leading-tight mb-4">
                        Sweep your BSV<br />to safety.
                    </h1>
                    <p className="text-white/60 text-base leading-relaxed max-w-sm">
                        Your wallet is going to be loaded. If coins are found, you can send them to any BSV wallet or service of your choice.
                    </p>
                </div>

                <div className="space-y-5">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                            <Key className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">You own your keys</p>
                            <p className="text-xs text-white/50 mt-0.5">All key operations happen locally. Nothing is sent to any server.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">100% client-side</p>
                            <p className="text-xs text-white/50 mt-0.5">All cryptography runs locally in your browser. Your phrase and PIN never leave your device.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                            <Github className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Open source</p>
                            <p className="text-xs text-white/50 mt-0.5">
                                <a href="https://github.com/HandCash/centbee-recovery" rel="noreferrer" target="_blank" className="underline underline-offset-2 hover:text-white/80 transition-colors">
                                    Audit the code on GitHub
                                </a>{" "}— nothing is hidden.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right panel — wallet UI */}
            <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-10">
                <div className="w-full max-w-md">
                    {/* Back button */}
                    <div className="mb-6 flex justify-start">
                        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2" onClick={handleBack}>
                            <ArrowLeft className="h-4 w-4" />
                            Use a different wallet
                        </Button>
                    </div>

                    {/* Balance */}
                    <div className="mb-7">
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="text-2xl font-bold tracking-tight">My Wallet</h2>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={syncWalletStatus} disabled={isSyncing}>
                                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">Current balance</p>
                        <p className="text-4xl font-bold mt-1">{(satoshisBalance / 10 ** 8).toFixed(8)} <span className="text-2xl font-semibold text-muted-foreground">BSV</span></p>
                    </div>

                    {/* Navigation warning */}
                    {isSyncing && (
                        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 mb-4">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                            <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed font-medium">
                                Do not navigate away from this page until the scan is complete or your funds may not be found.
                            </p>
                        </div>
                    )}

                    {/* Syncing state */}
                    {isSyncing && (
                        <div className="rounded-lg border border-border bg-muted/40 p-4 flex flex-col gap-3 mb-5">
                            <div className="flex items-center gap-3">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />
                                <p className="text-sm font-medium leading-snug">
                                    {syncProgress?.rateLimited ? 'Waiting for rate limit to clear…' : (syncProgress?.message ?? 'Preparing scan…')}
                                </p>
                            </div>

                            <div className="flex gap-4 text-xs text-muted-foreground">
                                <span>Addresses checked: <span className="font-mono font-semibold text-foreground">{syncProgress?.totalAddressesScanned ?? 0}</span></span>
                                <span>UTXOs found: <span className="font-mono font-semibold text-foreground">{syncProgress?.utxosFound ?? 0}</span></span>
                            </div>

                            {syncProgress?.rateLimited && (
                                <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                                    <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                                        {syncProgress.message}
                                    </p>
                                </div>
                            )}

                            {scanLog.length > 0 && (
                                <div className="w-full max-h-36 overflow-y-auto rounded border border-border bg-background/60 p-2 space-y-0.5">
                                    {scanLog.map((entry, i) => (
                                        <p key={i} className="text-xs font-mono text-muted-foreground leading-relaxed">{entry}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {rateLimitFailed && !isSyncing && (
                        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3 mb-5">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                            <div>
                                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Scan stopped — rate limited</p>
                                <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1 leading-relaxed">
                                    The Bitails API rejected requests after 5 retries. The results above may be incomplete. Wait a few minutes and try scanning again.
                                </p>
                                <Button variant="outline" size="sm" className="mt-3 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10" onClick={syncWalletStatus}>
                                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                                    Retry scan
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Scan summary (shown after sync) */}
                    {!isSyncing && scanLog.length > 0 && (
                        <div className="rounded-lg border border-border bg-muted/40 p-4 mb-5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Scan summary</p>
                            <div className="flex gap-4 text-xs mb-2">
                                <span>Addresses checked: <span className="font-mono font-semibold">{syncProgress?.totalAddressesScanned ?? 0}</span></span>
                                <span>UTXOs found: <span className="font-mono font-semibold">{syncProgress?.utxosFound ?? 0}</span></span>
                            </div>
                            <div className="max-h-36 overflow-y-auto rounded border border-border bg-background/60 p-2 space-y-0.5">
                                {scanLog.map((entry, i) => (
                                    <p key={i} className="text-xs font-mono text-muted-foreground leading-relaxed">{entry}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Send all */}
                    {!isSyncing && utxos.length > 0 && (
                        <div className="space-y-5 mb-5">
                            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 flex items-start gap-2">
                                <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">Send your funds to another BSV wallet</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {"Don't have another BSV wallet?"}{" "}
                                        <a href="https://market.handcash.io/" rel="noreferrer" target="_blank" className="underline underline-offset-2 hover:text-foreground transition-colors">Create one</a>
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Input placeholder="Enter destination BSV address" value={destinationAddress} onChange={onChangeDestinationAddress} />
                                <Button className="w-full gap-2" size="lg" onClick={() => sendAll()} disabled={!destinationAddress || isSending}>
                                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    {isSending ? 'Sending…' : 'Send All'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Empty / completed */}
                    {!isSyncing && hasSynced && utxos.length === 0 && (
                        <div className="rounded-lg border border-border bg-muted/40 p-6 flex flex-col items-center gap-3 text-center mb-5">
                            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                            <div>
                                <p className="text-sm font-semibold">Migration completed</p>
                                <p className="text-xs text-muted-foreground mt-0.5">No funds found in this wallet. Your coins have already been moved.</p>
                            </div>
                        </div>
                    )}

                    {/* Trust footer */}
                    <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/40 px-4 py-3">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            All operations run locally in your browser. Your keys and phrase are never sent to any server.{" "}
                            <a href="https://github.com/HandCash/centbee-recovery" rel="noreferrer" target="_blank" className="underline underline-offset-2 hover:text-foreground transition-colors">
                                View source on GitHub.
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
} 