import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
    slug: 'users',
    auth: true,
    admin: {
        useAsTitle: 'email',
    },
    access: {
        read: ({ req: { user } }) => {
            if (user?.role === 'admin') return true
            return {
                id: {
                    equals: user?.id,
                },
            }
        },
        create: ({ req: { user } }) => user?.role === 'admin',
        update: ({ req: { user } }) => {
            if (user?.role === 'admin') return true
            return {
                id: {
                    equals: user?.id,
                },
            }
        },
        delete: ({ req: { user } }) => user?.role === 'admin',
    },
    fields: [
        {
            name: 'role',
            type: 'select',
            options: [
                { label: 'Admin', value: 'admin' },
                { label: 'Client', value: 'client' },
            ],
            required: true,
            defaultValue: 'client',
            admin: {
                // Only admins can see/edit roles
                condition: ({ user }) => user?.role === 'admin',
            }
        },
        // We can add more fields later like 'clientProfile' relationship
    ],
}
