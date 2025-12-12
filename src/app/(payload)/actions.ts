'use server'

import config from '@/payload.config'
import { handleServerFunctions as payloadServerFunctions, type PayloadServerFunctionArgs } from '@payloadcms/next/utilities'

export async function handleServerFunctions(args: PayloadServerFunctionArgs): Promise<unknown> {
    return payloadServerFunctions({
        ...args,
        config,
    })
}
