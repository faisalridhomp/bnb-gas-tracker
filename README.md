# bnb-gas-tracker

Tracks BNB gas prices across public BSC RPCs and estimates mint costs.

A free-mint race dies if the wallet runs out of gas mid-run. Check the
price and what your balance affords *before* the window opens.

## Usage

```bash
npm i ethers
node gas.js              # current prices + cost of 1 / 5 / 20 mints
node gas.js 0.0000631    # same, with your BNB balance (warns if short)
```

Example output:

```
BSC gas prices (gwei):
  bsc.publicnode.com           0.100 gwei
  bsc-dataseed.bnbchain.org    0.100 gwei
  ...
cheapest: 0.1 gwei
cost per free mint (~140000 gas): 0.000014 BNB
   1 mints: 0.000014 BNB
   5 mints: 0.00007 BNB
  20 mints: 0.00028 BNB

balance 0.0000631 BNB affords ~4 mints at this price.
WARNING: balance covers fewer than 20 mints — top up before a race.
```

The 140k-gas planning figure covers a typical free mint; real mints land
around 120k–150k gas.
