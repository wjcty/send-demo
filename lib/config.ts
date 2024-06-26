import { http, createStorage, cookieStorage, createConfig } from 'wagmi'
import { mainnet, polygon, optimism, arbitrum, base, bsc, opBNB } from 'wagmi/chains'
import { Chain } from '@rainbow-me/rainbowkit'
import { connectors } from './connectorConfig'

const supportedChains: Chain[] = [opBNB]

export const config = createConfig({
    chains: supportedChains as any,
    ssr: true,
    storage: createStorage({
        storage: cookieStorage
    }),
    connectors,
    transports: supportedChains.reduce(
        (obj, chain) => ({
            ...obj,
            [opBNB.id]: http(
                'https://opbnb-mainnet.nodereal.io/v1/d772e8bd855444eea3519c2ab34ad18e'
            ),
            [chain.id]: http()
        }),
        {}
    )
})
