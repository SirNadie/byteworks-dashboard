import { handle } from 'payload'
import config from '@/payload.config'
import '@payloadcms/next/css'
import type { ServerFunctionContext } from 'payload'

type Args = {
    params: Promise<{ segments?: string[] }>
    searchParams: Promise<{ [key: string]: string | string[] }>
}

export const generateMetadata = async ({ params, searchParams }: Args) => ({}) // Metadata logic handled by Payload

const Layout = async ({ children }: { children: React.ReactNode }) => {
    return (
        <html>
            <body>{children}</body>
        </html>
    )
}

export default Layout

/* Payload Admin Route Handler */
export const GET = async (args: Args) => {
    return handle({ config, ...args })
}

export const POST = async (args: Args) => {
    return handle({ config, ...args })
}
