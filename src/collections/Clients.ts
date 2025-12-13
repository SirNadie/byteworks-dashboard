import type { CollectionConfig } from 'payload'

export const Clients: CollectionConfig = {
    slug: 'clients',
    admin: {
        useAsTitle: 'name',
        group: 'Main Menu',
        description: 'Manage your agency clients',
    },
    fields: [
        {
            name: 'name',
            type: 'text',
            required: true,
        },
        {
            name: 'email',
            type: 'email',
            required: true,
        },
        {
            name: 'phone',
            type: 'text',
        },
        {
            name: 'company',
            type: 'text',
        },
        {
            name: 'website',
            type: 'text',
        },
        {
            name: 'source',
            type: 'text',
        },
        {
            name: 'status',
            type: 'select',
            options: [
                { label: 'Lead', value: 'lead' },
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
            ],
            defaultValue: 'lead',
        },
        {
            name: 'notes',
            type: 'textarea',
        },
    ],
}
