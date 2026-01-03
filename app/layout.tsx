import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: '야식 구매비 정산 시스템',
    description: '병원 직원 복지 정산 시스템',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="ko">
            <body className={inter.className}>{children}</body>
        </html>
    )
}
