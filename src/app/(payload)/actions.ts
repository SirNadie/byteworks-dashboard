'use server'

import config from '@/payload.config'
import { getPayload } from 'payload'
import type { ServerFunctionClient } from 'payload'

export const handleServerFunctions: ServerFunctionClient = async function (args) {
    const payload = await getPayload({ config })

    // Access the server functions from the payload instance
    const serverFunctions = (payload as any).serverFunctions || {}
    const fn = serverFunctions[args.name]

    if (typeof fn === 'function') {
        return fn(args.args)
    }

    // Suppress error for known missing internal function
    if (args.name === 'form-state') {
        console.warn('Suppressing missing server function: form-state')
        return { state: undefined } // Return minimal object to prevent destructuring errors
    }

    throw new Error(`Server function "${args.name}" not found`)
}
