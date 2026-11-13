// bnb-gas-tracker — BNB gas prices across public BSC RPCs.
//
// A free-mint race dies if the wallet runs out of gas mid-run. This tracker
// polls eth_gasPrice on several public RPCs, reports the cheapest, and
// estimates what N free mints will cost at that price — so you know BEFORE
// a race whether the wallet can afford it.
//
// Usage:
//   node gas.js            -> current gas price + cost of 1 / 5 / 20 mints
//   node gas.js 0.0000631  -> same, with your BNB balance (warns if short)
// Requires: ethers (npm i ethers). No key needed.

const { ethers } = require("ethers");

const RPCS = [
    "https://bsc.publicnode.com",
    "https://bsc-dataseed.bnbchain.org",
    "https://bsc-dataseed1.binance.org",
    "https://bsc-dataseed2.defibit.io",
    "https://bsc-dataseed1.ninicoin.io",
];
// Typical free-mint gas: 120k–150k. Use 140k as the planning figure.
const MINT_GAS = 140000n;

async function gasPrice(url) {
    const p = new ethers.JsonRpcProvider(url);
    const fee = await p.getFeeData();
    return fee.gasPrice;
}

async function main() {
    const balance = process.argv[2] ? ethers.parseEther(process.argv[2]) : null;
    console.log("BSC gas prices (gwei):");
    let cheapest = null;
    for (const url of RPCS) {
        try {
            const gp = await gasPrice(url);
            const gwei = Number(ethers.formatUnits(gp, "gwei"));
            const host = new URL(url).hostname;
            console.log(`  ${host.padEnd(28)} ${gwei.toFixed(3)} gwei`);
            if (cheapest === null || gp < cheapest) cheapest = gp;
        } catch {
            console.log(`  ${new URL(url).hostname.padEnd(28)} (unreachable)`);
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
