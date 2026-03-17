# Centbee Recovery

A web app to **recover BSV (Bitcoin SV) funds** from a Centbee wallet using your 12-word recovery phrase and 4-digit PIN. Use it when you need to move your funds from Centbee to another BSV wallet.

---

## What This Tool Does

- **Restore** a wallet from your Centbee recovery phrase and PIN (no Centbee app needed).
- **Discover** all unspent outputs (UTXOs) associated with that wallet on the BSV blockchain.
- **Send all** your balance to a destination address (e.g. HandCash, another wallet) in one “sweep” transaction.

It is intended for **recovery and migration only**: you enter your phrase and PIN, the app finds your coins, and you send them to an address you control elsewhere.

---

## Architecture (High Level)

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js App (React)                                             │
│  /start  →  Import wallet (mnemonic + PIN)                       │
│  /       →  Wallet UI: sync UTXOs, show balance, "Send All"      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│  WalletClient (lib/wallet/walletClient.ts)                       │
│  • HD wallet from mnemonic + PIN (@bsv/sdk)                      │
│  • BIP44 paths: m/44'/0/0/n (external), m/44'/0/1/n (change)    │
│  • Builds & signs sweep transaction, uses WalletCache for prevs  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│  Bitails API (lib/wallet/Bitails.ts + fetchUtxos/fetchRawTx)     │
│  • Fetch unspent outputs per address (UTXOs)                     │
│  • Fetch raw transaction hex (for signing inputs)               │
│  • Broadcast signed transaction                                 │
└─────────────────────────────────────────────────────────────────┘
```

- **WalletClient**: Derives keys and addresses from your phrase and PIN, builds the “send all” transaction, and signs it using previous transaction data.
- **WalletCache**: Caches raw transactions in memory so the app can sign inputs without re-fetching every time.
- **Bitails**: Used only as the external service for UTXO lookup, raw tx download, and broadcast (no custody; keys never leave your browser).

---

## How UTXO Restoration Works

BSV (like Bitcoin) uses **addresses** derived from your seed. The app doesn’t know which addresses you used in Centbee, so it has to **scan** the blockchain for outputs that belong to you.

1. **Seed**  
   Your 12-word phrase + 4-digit PIN are turned into a seed; that seed generates a single HD (hierarchical deterministic) tree of keys.

2. **Derivation**  
   The app uses the same path layout as typical BSV wallets (BIP44 style):  
   - **External chain** (receiving): `m/44'/0/0/0`, `m/44'/0/0/1`, …  
   - **Internal chain** (change): `m/44'/0/1/0`, `m/44'/0/1/1`, …

3. **Discovery (gap limit)**  
   For each chain, it derives addresses in batches (e.g. 25 at a time). For each batch it asks Bitails: “Which of these addresses have unspent outputs?”  
   - If it finds UTXOs, it records them and keeps going to the next batch.  
   - When a full batch has **no** UTXOs, it stops that chain (no point scanning forever).

4. **Result**  
   You get a list of all discovered UTXOs (address, txid, vout, amount, and derivation path). The UI shows total balance and lets you “Send All” to one destination address.

5. **Spending**  
   “Send All” builds one transaction that spends every discovered UTXO to your chosen address (minus a small fee), signs it with the keys derived from your phrase + PIN, and broadcasts it via Bitails.

So: **restoring UTXOs** here means “re-derive addresses from your backup, ask the API which of those addresses have unspent outputs, then show and spend them.”

---

## Prerequisites

- **Node.js** (version 18 or 20 recommended).  
  [Download Node.js](https://nodejs.org/) and install it. To check:
  ```bash
  node -v
  npm -v
  ```
- A **terminal** (Terminal.app on macOS, Command Prompt or PowerShell on Windows, etc.).
- Your **Centbee 12-word recovery phrase** and **4-digit PIN**.

---

## Installation (Step by Step)

### 1. Open a terminal

- **macOS**: Open “Terminal” from Applications → Utilities (or search “Terminal”).
- **Windows**: Press `Win + R`, type `cmd` or `powershell`, press Enter.

### 2. Go to the project folder

```bash
cd /path/to/centbee-recovery
```

Replace `/path/to/centbee-recovery` with the real path (e.g. `C:\Users\YourName\centbee-recovery` on Windows or `~/Development/centbee-recovery` on Mac).

### 3. Install dependencies

```bash
npm install
```

Wait until it finishes (it may take a minute). If you see errors, make sure Node.js and npm are installed and try again.

### 4. Run the app in development mode

```bash
npm run dev
```

You should see something like:

```text
▲ Next.js 13.x.x
- Local:        http://localhost:3000
```

### 5. Open the app in your browser

- Go to: **http://localhost:3000**
- To **restore**: open **http://localhost:3000/start**
- Enter your **12-word recovery phrase** and **4-digit PIN**, then click **Restore**.
- You’ll be taken to the main wallet page: balance is loaded by scanning UTXOs; enter a destination address and use **Send All** to move your funds.

---

## Scripts Reference

| Command           | Description                    |
|-------------------|--------------------------------|
| `npm run dev`     | Start development server       |
| `npm run build`   | Build for production           |
| `npm start`       | Run production build           |
| `npm run lint`    | Run ESLint                     |
| `npm run typecheck` | Run TypeScript check (no emit) |

---

## Security Notes

- Your **recovery phrase and PIN** are used only in the browser to derive keys and sign the “Send All” transaction; they are not sent to the app’s backend.
- Mnemonic and PIN are stored in **localStorage** for the session so you don’t have to re-enter them on refresh; clear them when done (e.g. use “Restore a different wallet” or clear site data).
- The app relies on **Bitails** for UTXO data, raw transactions, and broadcast. Use over HTTPS and be aware of the trust and availability of that service. Potentially, it can be replaced by **WhatsOnChain**.

---

## Disclaimer

**This software is provided “as is”, without warranty of any kind, express or implied.**  
There are **no guarantees** regarding the correctness, reliability, or fitness for a particular purpose of this recovery tool. Use it at your own risk. The authors and contributors are not responsible for any loss of funds, missed recovery, or other damages arising from the use of this software. Always verify addresses and amounts before sending. If in doubt, test with a small amount first or seek professional advice.

---

## License

Licensed under the [MIT license](https://opensource.org/licenses/MIT).
