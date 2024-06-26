import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { parseEther } from 'viem'

const senderPrivateKey = process.env.SENDER_PRIVATE_KEY as string
const providerUrl = process.env.PROVIDER_URL as string

if (!senderPrivateKey || !providerUrl) {
    throw new Error('SENDER_PRIVATE_KEY and PROVIDER_URL must be defined in environment variables.')
}

const provider = new ethers.JsonRpcProvider(providerUrl)
const wallet = new ethers.Wallet(senderPrivateKey, provider)

const gasAmountInEth = '0.000007'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { recipient } = body

        if (!recipient) {
            return NextResponse.json({ message: 'Recipient address is required' }, { status: 400 })
        }

        // Create the transaction
        const tx = {
            to: recipient,
            value: parseEther(gasAmountInEth)
        }

        // Send the transaction
        const txResponse = await wallet.sendTransaction(tx)
        await txResponse.wait()

        return NextResponse.json({ message: 'Gas sent successfully', txHash: txResponse.hash })
    } catch (error: any) {
        console.error('Error sending gas:', error)
        return NextResponse.json(
            { message: 'Failed to send gas', error: error.message },
            { status: 500 }
        )
    }
}
