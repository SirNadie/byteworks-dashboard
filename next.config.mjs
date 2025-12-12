import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Your Next.js config here
    experimental: {
        reactCompiler: false, // simpler for now
    },
}

export default withPayload(nextConfig)
