// utils/fetchTransactions.ts

import axios from 'axios'

// BSCScan API base URL
// const BASE_URL = 'https://api.bscscan.com/api'
const BASE_URL = 'https://opbnbscan.com/'

// Your BSCScan API key (get one from bscscan.com)
const API_KEY = 'NYEZYWYBWPMH3UZKRGF79X6RIA1JAHQZXT'

// Function to fetch transaction count for a specific address today
export async function fetchTransactions(address: string): Promise<number> {
    try {
        const today = Math.floor(Date.now() / 1000) // Current Unix timestamp
        const response = await axios.get(BASE_URL, {
            params: {
                module: 'account',
                action: 'txlist',
                address: address,
                startblock: 0,
                endblock: 'latest',
                sort: 'asc',
                apikey: API_KEY
            }
        })

        console.log(123, response)
        // const transactions = response.data.result.filter((tx: any) => {
        //     // Check if transaction is sent today
        //     return tx.from === address && tx.timeStamp >= today
        // })

        // return transactions.length
    } catch (error) {
        console.error('Error fetching transaction count:', error)
        throw error
    }
}
