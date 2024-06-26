import axios from 'axios'
// 发送人地址
const senderAddr = '0x67bDCd09B94f8bCA7DFa769bbC0Fa0154cc598c1'
export const getAccountAllTx = async (receiver) => {
    const apiKey = process.env.NEXT_PUBLIC_BSCSCAN_API_KEY
    const url = `https://api-opbnb.bscscan.com/api`

    try {
        const response = await axios.get(url, {
            params: {
                module: 'account',
                action: 'txlist',
                address: senderAddr,
                startblock: 0,
                endblock: 'latest',
                sort: 'asc',
                apikey: apiKey
            }
        })

        if (response.data.status === '1') {
            // 过滤出receiver 接收的交易
            const arr = response.data.result.filter(
                (tx) =>
                    tx.from.toUpperCase() === senderAddr.toUpperCase() &&
                    tx.to.toUpperCase() === receiver.toUpperCase()
            )
            return arr.length // 返回receiver的交易数量
        } else {
            throw new Error(response.data.message)
        }
    } catch (error) {
        console.error('Error fetching transactions:', error)
        throw error
    }
}
