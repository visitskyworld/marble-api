const axios = require('axios')
const express = require('express')
const { Decimal } = require('@cosmjs/math')
const { QueryClient, setupAuthExtension } = require('@cosmjs/stargate')
const { Tendermint34Client } = require('@cosmjs/tendermint-rpc')
const {
  ContinuousVestingAccount,
  DelayedVestingAccount,
  PeriodicVestingAccount,
} = require('cosmjs-types/cosmos/vesting/v1beta1/vesting')
const { CosmWasmClient } = require('@cosmjs/cosmwasm-stargate')

require('dotenv').config()

const denom = process.env.DENOM || 'ujuno'
const interval = process.env.INTERVAL || 7200000

const vestingAccounts = process.env.VESTING_ACCOUNTS ? process.env.VESTING_ACCOUNTS.split(',') : []

const app = express()
const port = process.env.PORT || 3000

const protectAgainstNaN = (value) => (isNaN(value) ? 0 : value)

async function makeClientWithAuth(rpcUrl) {
  const tmClient = await Tendermint34Client.connect(rpcUrl)
  return [QueryClient.withExtensions(tmClient, setupAuthExtension), tmClient]
}

// Declare variables
let totalMarbleSupply,
  totalBlockSupply,
  totalSupply,
  communityPool,
  communityPoolMainDenomTotal,
  circulatingSupply,
  tmpCirculatingSupply,
  apr,
  bondedRatio,
  totalStaked

// Gets supply info from chain
async function updateData() {
  try {
    // Create Tendermint RPC Client
    const client = await CosmWasmClient.connect(process.env.RPC_ENDPOINT)
    const marbleTokenInfo = await client.queryContractSmart(process.env.MARBLE_TOKEN_ADDRESS, {
      token_info: {},
    })
    const blockTokenInfo = await client.queryContractSmart(process.env.BLOCK_TOKEN_ADDRESS, {
      token_info: {},
    })

    console.log('Updating supply info', new Date())
    totalMarbleSupply = protectAgainstNaN(
      Number(marbleTokenInfo?.total_supply / Math.pow(10, marbleTokenInfo?.decimals))
    )

    totalBlockSupply = protectAgainstNaN(Number(blockTokenInfo?.total_supply / Math.pow(10, blockTokenInfo?.decimals)))

    console.log('Total Marble supply: ', totalMarbleSupply)
  } catch (e) {
    console.error(e)
  }
}

// Get initial data
updateData()

// Update data on an interval (2 hours)
setInterval(updateData, interval)

app.get('/', async (req, res) => {
  res.json({
    apr,
    bondedRatio,
    totalMarbleSupply,
    totalBlockSupply,
    // circulatingSupply: Decimal.fromAtomics(circulatingSupply, 6).toString(),
    // communityPool: Decimal.fromAtomics(communityPoolMainDenomTotal.split('.')[0], 6).toString(),
    // denom: denom.substring(1).toUpperCase(),
    // totalStaked: Decimal.fromAtomics(totalStaked, 6).toString(),
    // totalSupply: Decimal.fromAtomics(totalSupply.data.amount.amount, 6).toString(),
  })
})

app.get('/apr', async (req, res) => {
  res.send(apr.toString())
})

app.get('/bonded-ratio', async (req, res) => {
  res.send(bondedRatio.toString())
})

app.get('/circulating-supply', async (req, res) => {
  res.send(Decimal.fromAtomics(circulatingSupply, 6).toString())
})

app.get('/total-staked', async (req, res) => {
  res.send(Decimal.fromAtomics(totalStaked, 6).toString())
})

app.get('/total-supply', async (req, res) => {
  res.send(Decimal.fromAtomics(totalMarbleSupply, 6).toString())
})

app.get('/community-pool', async (req, res) => {
  res.send(Decimal.fromAtomics(communityPoolMainDenomTotal.split('.')[0], 6).toString())
})

app.get('/denom', async (req, res) => {
  res.send(denom.substring(1).toUpperCase())
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
