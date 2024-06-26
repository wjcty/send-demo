'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import meet48NftABI from '@/constants/meet48Nft.json'
import wandNftAddrABI from '@/constants/wandNftAddr.json'
import { Button, Modal } from '@mantine/core'
import { MyConnectBtn } from '@/components/wallet/myConnectBtn'
import dynamic from 'next/dynamic'
import { useDisclosure } from '@mantine/hooks'
import getAccountTodayTx from '@/api/getAccountTodayTx/route'
import getAccountAllTx from '@/api/getAccountAllTx/route'
import getHaveReceivedTx from '@/api/getHaveReceivedTx/route'

const meet48NftAddr = '0xbE8546cb8460755331335f728f978828191A8935'
const wandNftAddr = '0x663DcEF009d1C7408B888f571cbfDa2a67A71fc5'
0x6b011243fb0fe6d715a3f6a9da0a372849443b3b
const MySendGas = () => {
    const { address, isConnected } = useAccount()
    const [ownsMeet48NFT, setownsMeet48NFT] = useState<boolean | undefined>(undefined)
    const [ownsWandNFT, setownsWandNFT] = useState<boolean | undefined>(undefined)
    const [claimError, setClaimError] = useState<string>('')

    //  meet48 打call nft
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

    const [currentUse, setcurrentUse] = useState(0)
    const [txCount, setTxCount] = useState(0)
    const [haveReceived, setHaveReceived] = useState(false)

    // 是否获取失败
    const [fetchFailure, setfetchFailure] = useState(false)

    // retryFetch: 重试逻辑封装
    const retryFetch = useCallback(
        async (fetchFn: () => Promise<any>, delay = 1000): Promise<any> => {
            try {
                const result = await fetchFn() // 尝试执行 fetchFn
                return result // 成功时返回结果
            } catch (error: any) {
                console.warn(`Attempt failed. Retrying in ${delay}ms...`, error)
                await new Promise((res) => setTimeout(res, delay))
                return retryFetch(fetchFn, delay) // 重试递归调用
            }
        },
        []
    )

    const [init, setInit] = useState(false)
    // 获取今天的交易次数 并行 获取某个用户总交易次数 和 是否已领取
    const fetchTxAndReceivedStatus = useCallback(async () => {
        const tempAddr = '0x46c2594bb8295da7be14064604046caa12c61a45'

        setInit(true)
        const requests = [
            retryFetch(() => getAccountTodayTx()),
            retryFetch(() => getAccountAllTx(address)),
            retryFetch(() => getHaveReceivedTx(address))
        ]

        let results = await Promise.all(requests)

        // 过滤失败的请求，结果是 Error 对象的表示请求失败
        let failedRequests = results.filter((result) => result instanceof Error)

        // 继续重试失败的请求，直到全部成功
        while (failedRequests.length > 0) {
            console.log('Retrying failed requests:', failedRequests)

            // 对失败的请求重新进行请求
            const retryResults = await Promise.all(
                failedRequests.map((req) => {
                    if (req.message.includes('getAccountTodayTx')) {
                        return retryFetch(() => getAccountTodayTx())
                    } else if (req.message.includes('getAccountAllTx')) {
                        return retryFetch(() => getAccountAllTx(address))
                    } else if (req.message.includes('getHaveReceivedTx')) {
                        return retryFetch(() => getHaveReceivedTx(address))
                    } else {
                        return req
                    }
                })
            )

            // 更新结果，过滤出新的失败请求
            results = retryResults.map((res, i) => (res instanceof Error ? results[i] : res))
            failedRequests = retryResults.filter((result) => result instanceof Error)
        }

        // 提取成功的请求结果
        const [useCount, txCountRes, haveReceivedRes] = results
        setcurrentUse(useCount) // 更新当日已经领取数量
        setTxCount(txCountRes) // 更新 txCount 状态
        setHaveReceived(haveReceivedRes) // 更新 今日是否接收 状态
        setInit(false)
    }, [address, retryFetch])

    // 用户连接钱包后 获取数据
    useEffect(() => {
        if (address) {
            fetchTxAndReceivedStatus()
        }
    }, [address, fetchTxAndReceivedStatus])

    useEffect(() => {
        if (data) {
            const balance = BigInt(data.toString())
            setownsMeet48NFT(balance > 0)
        } else if (isError) {
            console.log('Failed to fetch NFT ownership:', isError)
            setownsMeet48NFT(false)
        }

        if (wandData) {
            const balance = BigInt(wandData.toString())
            setownsWandNFT(balance > 0)
        } else if (wandisError) {
            console.log('Failed to fetch NFT ownership:', wandisError)
            setownsWandNFT(false)
        }
    }, [data, isError, wandData, wandisError])

    const [opened, { open, close }] = useDisclosure(false)
    const sendGas = useCallback(async () => {
        setisPending(true)

        if (currentUse >= 1000) {
            settext('今日已无gas可领取，请明日再来')
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
            const res = await getAccountTodayTx()
            setcurrentUse(res)
        } catch (error) {
            console.error('Error calling sendToken API:', error)
            setisPending(false)
        }
    }, [address, currentUse, open])

    const [text, settext] = useState('')
    const [isPending, setisPending] = useState(false)

    // 按钮的禁用条件
    const isDisabled = isPending || txCount >= 3 || haveReceived
    return (
        <div className='flex pt-20 justify-center h-screen'>
            {isConnected ? (
                <div className='flex flex-col items-center'>
                    <MyConnectBtn />
                    <div className='mt-10'>今日可领取Gas剩余</div>
                    <div> {1000 - currentUse} </div>
                    <div> 总领取次数{txCount}</div>
                    <div> 今日领取次数{haveReceived ? 1 : 0}</div>

                    {!fetchFailure && (
                        <div>
                            {(ownsMeet48NFT || ownsWandNFT) && (
                                <div className='my-20'>
                                    <button
                                        className={`${
                                            isDisabled ? 'cursor-not-allowed' : ''
                                        } px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-700 transition duration-300 mt-4`}
                                        onClick={sendGas}
                                        disabled={init || isDisabled} // 根据isDisabled禁用按钮
                                    >
                                        {init && <div>加载中...</div>}
                                        {isPending && <div>正在领取...</div>}
                                        {txCount >= 3 && <div>已达领取上限</div>}
                                        {haveReceived && <div>今日已领取</div>}
                                        {!init && !isPending && txCount < 3 && !haveReceived && (
                                            <div>点击领取</div>
                                        )}

                                        {/* {isPending
                                            ? '正在领取...'
                                            : txCount >= 3
                                            ? '已达领取上限'
                                            : haveReceived
                                            ? '今日已领取'
                                            : '点击领取'} */}
                                    </button>
                                </div>
                            )}

                            {!ownsMeet48NFT && !ownsWandNFT && (
                                <div className='my-20 rounded-xl border border-[#999] px-2 py-2'>
                                    未持有meet48投票券 暂不可领取
                                </div>
                            )}
                        </div>
                    )}

                    {fetchFailure && <div className='my-20'>获取数据失败 正在重新获取...</div>}
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
