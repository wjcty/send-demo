import axios from 'axios'

// 获取今天的开始时间（午夜）的Unix时间戳
const getStartOfTodayTimestamp = () => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return Math.floor(startOfToday.getTime() / 1000) // 转换为秒级的Unix时间戳
}

// 获取给定时间戳对应的区块号
const getBlockNumberByTimestamp = async (timestamp, apiKey) => {
    const url = `https://api-opbnb.bscscan.com/api`
    try {
        const response = await axios.get(url, {
            params: {
                module: 'block',
                action: 'getblocknobytime',
                timestamp: timestamp,
                closest: 'after',
                apikey: apiKey
            }
        })
        if (response.data.status === '1') {
            return response.data.result
        } else {
            throw new Error(response.data.message)
        }
    } catch (error) {
        console.error('Error fetching block number by timestamp:', error)
        throw error
    }
}
// 发送人地址
const senderAddr = '0x67bDCd09B94f8bCA7DFa769bbC0Fa0154cc598c1'
const getHaveReceivedTx = async (receiver) => {
    const apiKey = process.env.NEXT_PUBLIC_BSCSCAN_API_KEY
    const url = `https://api-opbnb.bscscan.com/api`

    // 获取今天开始的Unix时间戳
    const startOfTodayTimestamp = getStartOfTodayTimestamp()

    try {
        // 获取今天开始的区块号
        const startBlock = await getBlockNumberByTimestamp(startOfTodayTimestamp, apiKey)

        // 请求今天开始的交易列表
        const response = await axios.get(url, {
            params: {
                module: 'account',
                action: 'txlist',
                address: senderAddr,
                startblock: startBlock,
                endblock: 'latest',
                sort: 'asc',
                apikey: apiKey
            }
        })

        if (response.data.status === '1') {
            // 过滤出从指定地址发起的交易
            const item = response.data.result.find(
                (tx) =>
                    tx.from.toUpperCase() === senderAddr.toUpperCase() &&
                    tx.to.toUpperCase() === receiver.toUpperCase()
            )
            return item // 返回今天是否已经接收过
        } else {
            throw new Error(response.data.message)
        }
    } catch (error) {
        console.error('Error fetching transactions:', error)
        throw error
    }
}

export default getHaveReceivedTx
