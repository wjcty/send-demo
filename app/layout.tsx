import React from 'react'
import './globals.css'
import { Inter } from 'next/font/google'
// ranbowkit配置 start
import '@rainbow-me/rainbowkit/styles.css'
import Providers from './providers'
// ranbowkit end

const inter = Inter({ subsets: ['latin'] })
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'

export default function Layout({
    children
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang='en'>
            <body className={inter.className}>
                <MantineProvider>
                    <Providers>{children}</Providers>
                </MantineProvider>
            </body>
        </html>
    )
}
