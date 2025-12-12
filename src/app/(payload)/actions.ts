'use server'

import config from '@/payload.config'
import { getPayload } from 'payload'

export async function handleServerFunctions(args: {
    name: string
    args: unknown[]
}): Promise<unknown> {
    const payload = await getPayload({ config })

    // Access the server functions from the payload instance
    const serverFunctions = (payload as any).serverFunctions || {}
    const fn = serverFunctions[args.name]

    if (typeof fn === 'function') {
        return fn(...args.args)
    }

    throw new Error(`Server function "${args.name}" not found`)
}
