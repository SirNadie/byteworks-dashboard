import React from 'react'
import './(payload)/custom.scss'

export const metadata = {
    title: 'ByteWorks Dashboard',
    description: 'Agency client and billing management dashboard',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}
