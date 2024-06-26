'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import meet48NftABI from '@/constants/meet48Nft.json'
import wandNftAddrABI from '@/constants/wandNftAddr.json'
import { Button, Modal } from '@mantine/core'
import { MyConnectBtn } from '@/components/wallet/myConnectBtn'
import dynamic from 'next/dynamic'
import { useDisclosure } from '@mantine/hooks'

const meet48NftAddr = '0xbE8546cb8460755331335f728f978828191A8935'
const wandNftAddr = '0x663DcEF009d1C7408B888f571cbfDa2a67A71fc5'
import getAccountTodayTx from './api/getAccountTodayTx/route'
import getAccountAllTx from './api/getAccountAllTx/route'
import getHaveReceivedTx from './api/getHaveReceivedTx/route'

const MySendGas = () => {
    const [ownsMeet48NFT, setownsMeet48NFT] = useState<boolean | undefined>(undefined)
    const [ownsWandNFT, setownsWandNFT] = useState<boolean | undefined>(undefined)
    const [claimError, setClaimError] = useState<string>('')
    const { address, isConnected } = useAccount()

    //  meet48 打call nft
    // temp holder 0xef3f10b2cfe3d2464cf2f6ef89d60f054c8450ee
    const { data, isError } = useReadContract({
        address: meet48NftAddr,
        abi: meet48NftABI,
        functionName: 'balanceOf',
        args: [address, 1] // 使用当前用户地址检查持有的NFT
    })

    // wand nft
    const { data: wandData, isError: wandisError } = useReadContract({
        address: wandNftAddr,
        abi: wandNftAddrABI,
        functionName: 'balanceOf',
        args: [address, 1] // 使用当前用户地址检查持有的NFT
    })

    // 获取今天的交易次数
    const fetchTodayTx = async () => {
        try {
            const res = await getAccountTodayTx()
            setcurrentUse(res)
        } catch (err) {
            console.log("Error fetching today's transactions:", err)
        }
    }
    useEffect(() => {
        fetchTodayTx()
    }, [address])

    useEffect(() => {
        if (data) {
            const balance = BigInt(data.toString())
            setownsMeet48NFT(balance > 0)
        } else if (isError) {
            console.error('Failed to fetch NFT ownership:', isError)
            setownsMeet48NFT(false)
        }

        if (wandData) {
            const balance = BigInt(wandData.toString())
            setownsWandNFT(balance > 0)
        } else if (wandisError) {
            console.error('Failed to fetch NFT ownership:', wandisError)
            setownsWandNFT(false)
        }
    }, [data, isError, wandData, wandisError])

    const [isPending, setisPending] = useState<boolean | undefined>(false)
    const [currentUse, setcurrentUse] = useState(0)

    // 新增状态来保存交易次数和今日交易状态
    const [txCount, setTxCount] = useState(0)
    const [haveReceived, setHaveReceived] = useState(false)

    useEffect(() => {
        // 获取与address的总交易次数
        const fetchTxCount = async () => {
            try {
                const count = await getAccountAllTx(address)
                setTxCount(count) // 更新txCount状态
            } catch (err) {
                console.log('Error fetching all transactions:', err)
            }
        }

        // 获取今天是否已经领取
        const fetchHaveReceived = async () => {
            try {
                const received = await getHaveReceivedTx(address)
                setHaveReceived(received) // 更新haveReceived状态
            } catch (err) {
                console.log("Error checking today's transactions:", err)
            }
        }

        // 连接钱包并且持有任一个NFT 才去fecth数据
        if (address && (data || wandData)) {
            fetchTxCount()
            fetchHaveReceived()
        }
    }, [address, data, wandData])

    const [opened, { open, close }] = useDisclosure(false)
    const sendGas = useCallback(async () => {
        setisPending(true)

        if (currentUse >= 1000) {
            settext('今日已无gas可领取，请明日再来')
            open()
            setisPending(false)
            return
        }

        // 检查是否符合领取条件
        if (txCount >= 3) {
            settext('您已经领取三次, 不能再领取')
            open()
            setisPending(false)
            return
        }

        if (haveReceived) {
            settext('您今日已经领取过，请明日再来')
            open()
            setisPending(false)
            return
        }

        // temp receiver 0xef3f10b2cfe3d2464cf2f6ef89d60f054c8450ee
        try {
            const response = await fetch('/api/sendToken', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipient: address
                })
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(errorText)
            }

            const result = await response.json()
            settext('Gas领取成功！ 交易哈希: ' + result.txHash)
            setisPending(false)
            open()
            // 交易成功后更新今天的交易次数
            fetchTodayTx()
        } catch (error) {
            console.error('Error calling sendToken API:', error)
            setisPending(false)
        }
    }, [address, currentUse, txCount, haveReceived, open])

    const [text, settext] = useState('')

    // 按钮的禁用条件
    const isDisabled = useMemo(() => {
        return isPending || txCount >= 3 || haveReceived
    }, [isPending, txCount, haveReceived])

    return (
        <div className='flex pt-20 justify-center h-screen'>
            {isConnected ? (
                <div className='flex flex-col items-center'>
                    <MyConnectBtn />
                    <div className='mt-10'>今日可领取Gas剩余</div>
                    <div>{currentUse} / 1000</div>

                    {(ownsMeet48NFT || ownsWandNFT) && (
                        <div className='my-20'>
                            <button
                                className={`${
                                    isDisabled ? 'cursor-not-allowed' : ''
                                } px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-700 transition duration-300 mt-4`}
                                onClick={sendGas}
                                disabled={isDisabled} // 根据isDisabled禁用按钮
                            >
                                {isPending
                                    ? '正在领取...'
                                    : txCount >= 3
                                    ? '已达领取上限'
                                    : haveReceived
                                    ? '今日已领取'
                                    : '点击领取'}
                            </button>
                        </div>
                    )}

                    {!ownsMeet48NFT && !ownsWandNFT && (
                        <div className='my-4 rounded-xl border border-[#999] px-2 py-2'>
                            未持有NFT 暂不可领取
                        </div>
                    )}
                    <div>规则：每个地址24小时只能领取一次</div>
                    <div>每个地址最多只能领取Gas三次</div>
                </div>
            ) : (
                <div>
                    <MyConnectBtn />
                </div>
            )}
            <Modal opened={opened} onClose={close} title='提示'>
                <div className='flex flex-col items-center'>
                    <div className='mb-4'>{text}</div>
                    <Button onClick={close}>确定 </Button>
                </div>
            </Modal>
        </div>
    )
}

export default dynamic(() => Promise.resolve(MySendGas), { ssr: false })
