import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Clients } from './collections/Clients'
import { Invoices } from './collections/Invoices'
import { ContactRequests } from './collections/ContactRequests'
import { Quotes } from './collections/Quotes'
import { Services } from './collections/Services'

import { Analytics } from './globals/Analytics'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
    cors: [
        // Production - ByteWorks Agency Website
        'https://byteworksagency.com',
        'https://www.byteworksagency.com',
        // Environment variable override
        process.env.AGENCY_WEBSITE_URL,
        // Local development
        'http://localhost:3000',
        'http://localhost:4321',
    ].filter(Boolean) as string[],
    admin: {
        user: Users.slug,
        importMap: {
            baseDir: path.resolve(dirname),
        },
        meta: {
            titleSuffix: ' | ByteWorks Dashboard',
            icons: [
                {
                    rel: 'icon',
                    type: 'image/x-icon',
                    url: '/favicon.ico',
                },
            ],
        },
        components: {
            graphics: {
                Logo: '/components/Logo#Logo',
                Icon: '/components/Icon#Icon',
            },
        },
    },
    collections: [Clients, Quotes, Invoices, Services, Users, ContactRequests],
    globals: [Analytics],
    editor: lexicalEditor(),
    secret: process.env.PAYLOAD_SECRET || '',
    typescript: {
        outputFile: path.resolve(dirname, 'payload-types.ts'),
    },
    db: postgresAdapter({
        pool: {
            connectionString: process.env.DATABASE_URI || process.env.DATABASE_URL || '',
        },
    }),
    sharp,
    plugins: [],
})
