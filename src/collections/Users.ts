import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
    slug: 'users',
    admin: {
        useAsTitle: 'email',
        group: 'Others',
    },
    auth: true,
    fields: [
        // Email is added by default when auth: true
        {
            name: 'name',
            type: 'text',
        },
        {
            name: 'role',
            type: 'select',
            options: [
                { label: 'Admin', value: 'admin' },
                { label: 'User', value: 'user' },
            ],
            defaultValue: 'user',
        },
    ],
}
