// bnb-gas-tracker — BNB gas prices across public BSC RPCs.
//
// A free-mint race dies if the wallet runs out of gas mid-run. This tracker
// polls eth_gasPrice on several public RPCs, reports the cheapest, and
// estimates what N free mints will cost at that price — so you know BEFORE
// a race whether the wallet can afford it.
//
// RPCs are queried IN PARALLEL with an 8s timeout each: public RPCs can
// stall, and a sequential loop without a timeout hangs the whole run.
//
// Usage:
//   node gas.js            -> current gas price + cost of 1 / 5 / 20 mints
//   node gas.js 0.0000631  -> same, with your BNB balance (warns if short)
// Requires: ethers (npm i ethers). No key needed.

const { ethers } = require("ethers");

const RPCS = [
    "https://bsc-dataseed1.ninicoin.io",
    "https://bsc-dataseed1.binance.org",
    "https://bsc-dataseed.bnbchain.org",
    "https://bsc-dataseed2.defibit.io",
    "https://bsc.publicnode.com",
];
// Typical free-mint gas: 120k–150k. Use 140k as the planning figure.
const MINT_GAS = 140000n;
const TIMEOUT_MS = 8000;

async function gasPrice(url) {
    const p = new ethers.JsonRpcProvider(url);
    try {
        const fee = await Promise.race([
            p.getFeeData(),
            new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), TIMEOUT_MS)),
        ]);
        return fee.gasPrice;
    } finally {
        p.destroy();
    }
}

async function main() {
    const balance = process.argv[2] ? ethers.parseEther(process.argv[2]) : null;
    console.log("BSC gas prices (gwei):");
    const results = await Promise.all(RPCS.map(async (url) => {
        const host = new URL(url).hostname;
        try {
            const gp = await gasPrice(url);
            return { host, gwei: Number(ethers.formatUnits(gp, "gwei")), gp };
        } catch {
            return { host, gwei: null, gp: null };
        }
    }));
    let cheapest = null;
    for (const r of results) {
        if (r.gwei === null) {
            console.log(`  ${r.host.padEnd(28)} (unreachable)`);
        } else {
            console.log(`  ${r.host.padEnd(28)} ${r.gwei.toFixed(3)} gwei`);
            if (cheapest === null || r.gp < cheapest) cheapest = r.gp;
        }
    }
    if (cheapest === null) { console.log("no RPC responded."); return; }
    const perMint = cheapest * MINT_GAS;
    console.log(`\ncheapest: ${ethers.formatUnits(cheapest, "gwei")} gwei`);
    console.log(`cost per free mint (~${MINT_GAS} gas): ${ethers.formatEther(perMint)} BNB`);
    for (const n of [1, 5, 20]) {
        console.log(`  ${String(n).padStart(2)} mints: ${ethers.formatEther(perMint * BigInt(n))} BNB`);
    }
    if (balance !== null) {
        const afford = balance / perMint;
        console.log(`\nbalance ${ethers.formatEther(balance)} BNB affords ~${afford} mints at this price.`);
        if (afford < 20n) console.log("WARNING: balance covers fewer than 20 mints — top up before a race.");
    }
}

main().catch((e) => { console.error("error:", e.shortMessage || e.message); process.exit(1); });
