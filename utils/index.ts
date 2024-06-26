import { JsonRpcProvider, TransactionResponse } from 'ethers'

const opBNBRpcUrl = 'https://opbnb-mainnet-rpc.bnbchain.org'
const provider = new JsonRpcProvider(opBNBRpcUrl)

async function getBlockWithTransactions(blockNumber: number): Promise<TransactionResponse[]> {
    try {
        const block = await provider.getBlock(blockNumber)
        if (!block || !block.transactions) {
            console.log(`Block ${blockNumber} or its transactions are empty`)
            return []
        }
        const transactionPromises = block.transactions.map((txHash) =>
            provider.getTransaction(txHash)
        )
        const transactions = await Promise.all(transactionPromises)
        return transactions.filter((tx) => tx !== null) as TransactionResponse[]
    } catch (error) {
        console.error(`Error fetching block ${blockNumber} with transactions:`, error)
        throw error
    }
}

export async function checkTransactionCount(address: string): Promise<number> {
    // 获取今天开始的时间戳（UTC 时间）
    const startOfDayUTC = new Date()
    startOfDayUTC.setUTCHours(0, 0, 0, 0)
    const startOfDayTimestamp = Math.floor(startOfDayUTC.getTime() / 1000)

    // 获取当前区块号
    const currentBlockNumber = await provider.getBlockNumber()

    // 计算今天起始时间的区块号
    let transactionCount = 0

    for (let blockNumber = currentBlockNumber; blockNumber >= startOfDayTimestamp; blockNumber--) {
        const transactions = await getBlockWithTransactions(blockNumber)
        for (const tx of transactions) {
            if (tx.from === address) {
                transactionCount++
                if (transactionCount >= 1000) {
                    console.log('当前已经交易1000次')
                    return transactionCount
                }
            }
        }
        await sleep(100) // 增加延迟
    }

    return transactionCount
}

// 获取两个地址之间的交易次数
export async function getTransactionCountBetween(
    address1: string,
    address2: `0x${string}` | undefined
): Promise<number> {
    // 获取当前区块号
    const currentBlockNumber = await provider.getBlockNumber()

    let transactionCount = 0

    for (
        let blockNumber = currentBlockNumber;
        transactionCount < 1000 && blockNumber > 0;
        blockNumber--
    ) {
        const transactions = await getBlockWithTransactions(blockNumber)
        for (const tx of transactions) {
            if (tx.from === address1 && tx.to === address2) {
                transactionCount++
                if (transactionCount >= 1000) {
                    console.log('当前已经交易1000次')
                    return transactionCount
                }
            }
        }
        await sleep(100) // 增加延迟
    }

    return transactionCount
}

async function getTransactionByHash(txHash: string): Promise<TransactionResponse | null> {
    try {
        const transaction = await provider.getTransaction(txHash)
        return transaction
    } catch (error) {
        console.error('Error fetching transaction:', error)
        return null
    }
}

// 获取两个地址今天的交易次数
export async function getTodayTransactionCount(
    account1: string,
    account2: string
): Promise<number> {
    try {
        const startOfToday = new Date()
        startOfToday.setHours(0, 0, 0, 0) // 设置为今天凌晨

        const startOfTodayUTC = Date.UTC(
            startOfToday.getUTCFullYear(),
            startOfToday.getUTCMonth(),
            startOfToday.getUTCDate(),
            0,
            0,
            0,
            0
        )

        const currentBlockNumber = await provider.getBlockNumber()

        let todayTransactionCount = 0

        for (let blockNumber = currentBlockNumber; blockNumber > 0; blockNumber--) {
            if (typeof blockNumber !== 'number' || isNaN(blockNumber)) {
                console.log(`Invalid block number: ${blockNumber}`)
                continue
            }

            const transactions = await getBlockWithTransactions(blockNumber)

            for (const tx of transactions) {
                const transaction = await getTransactionByHash(tx.hash)
                if (!transaction) {
                    continue
                }

                const blockNumberForGetBlock = transaction.blockNumber
                if (blockNumberForGetBlock === null || typeof blockNumberForGetBlock !== 'number') {
                    console.log(`Invalid block number: ${blockNumberForGetBlock}`)
                    continue
                }

                const block = await provider.getBlock(blockNumberForGetBlock)
                if (!block || !block.timestamp) {
                    continue
                }

                if (block.timestamp * 1000 > startOfTodayUTC) {
                    if (transaction.from === account1 && transaction.to === account2) {
                        todayTransactionCount++
                    }
                } else {
                    break
                }
            }

            await sleep(100) // 增加延迟
        }

        return todayTransactionCount
    } catch (error) {
        console.error('Error fetching transaction count:', error)
        throw error
    }
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
