'use client'
import { useState, useEffect, useCallback } from 'react'
import {
    useAccount,
    useReadContract,
    useSendTransaction,
    useWaitForTransactionReceipt
} from 'wagmi'
import ABI from '@/constants/abi.json'
import { Button } from '@mantine/core'
import { BaseError, parseEther } from 'viem'
import { MyConnectBtn } from '@/components/wallet/myConnectBtn'

// 指定合约地址
const nftContractAddress = '0xbE8546cb8460755331335f728f978828191A8935'

// 发送的gas数量 (BNB) (单位是以太)
const gasAmountInEth = '0.000007'

export default function MySendGas() {
    // 定义 ownsNFT 状态，初始为 undefined 表示未加载
    const [ownsNFT, setOwnsNFT] = useState<boolean | undefined>(undefined)
    const [claimError, setClaimError] = useState<string>('')

    // 获取用户地址和连接状态
    const { address, isConnected } = useAccount()

    // 使用 useReadContract 钩子从合约读取数据
    const { data, isError, isLoading } = useReadContract({
        address: nftContractAddress,
        abi: ABI,
        functionName: 'balanceOf',
        args: ['0x341993d7e01f4ABF5bAC87eC4388A779aA940AeC', 1]
    })

    // 监听 data 和 isError 的变化来更新 ownsNFT 状态
    useEffect(() => {
        if (typeof window !== undefined) {
            if (data) {
                const balance = BigInt(data.toString()) // 将 data 转换为 BigInt
                setOwnsNFT(balance > 0) // 如果 balance 大于 0，说明拥有 NFT
            } else if (isError) {
                console.error('Failed to fetch NFT ownership:', isError)
                setOwnsNFT(false) // 如果有错误，设置 ownsNFT 为 false
            }
        }
    }, [data, isError])

    // hash 交易哈希
    const { data: hash, sendTransaction, isPending, error } = useSendTransaction()
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash
    })

    // 使用 useCallback 缓存函数实例，避免不必要的重新渲染
    const sendGas = useCallback(async () => {
        if (!window.ethereum) {
            setClaimError('请确保已安装并连接了 MetaMask！')
            return
        }

        try {
            setClaimError('')
            sendTransaction({
                to: address,
                value: parseEther(gasAmountInEth) // 将人类可读的 BNB 转换为 wei
            })
        } catch (error: any) {
            console.error('Failed to send gas:', error)
            if (error.code === 4001) {
                // 用户取消交易
                setClaimError('你取消了交易')
            } else if (error.code === 'INSUFFICIENT_FUNDS') {
                // 账户余额不足
                setClaimError('账户余额不足')
            } else {
                setClaimError('发送交易时发生错误，请稍后重试')
            }
        }
    }, [sendTransaction, address])

    return (
        <div className='flex items-center justify-center h-screen'>
            {isConnected ? (
                <div>
                    <div>账户: {address}</div>
                    <div>
                        {isLoading ? (
                            <div className='text-yellow-500'>正在检查...</div>
                        ) : ownsNFT === true ? (
                            <div className='text-green-500'>你拥有这个NFT！</div>
                        ) : ownsNFT === false ? (
                            <div className='text-red-500'>你没有这个NFT。</div>
                        ) : null}
                    </div>
                    {ownsNFT && (
                        <Button
                            className='px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-700 transition duration-300 mt-4'
                            onClick={sendGas}
                            disabled={isPending} // 如果正在处理则禁用按钮
                        >
                            {isPending ? '正在发送...' : '领取 GAS'}
                        </Button>
                    )}
                    {hash && <div>Transaction Hash: {hash}</div>}
                    {isConfirming && <div>Waiting for confirmation...</div>}
                    {isConfirmed && <div>Transaction Confirmed!</div>}
                    {error && (
                        <div>Error: {(error as BaseError).shortMessage || error.message}</div>
                    )}
                    {claimError && <div className='text-red-500 mt-2'>{claimError}</div>}
                </div>
            ) : (
                <MyConnectBtn />
            )}
        </div>
    )
}
