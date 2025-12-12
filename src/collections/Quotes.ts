import type { CollectionConfig } from 'payload'

export const Quotes: CollectionConfig = {
    slug: 'quotes',
    admin: {
        useAsTitle: 'quoteNumber',
        group: 'Main Menu',
        description: 'Create and manage client quotes/proposals',
    },
    fields: [
        {
            name: 'quoteNumber',
            type: 'text',
            required: true,
            unique: true,
        },
        {
            name: 'client',
            type: 'relationship',
            relationTo: 'clients',
            required: true,
        },
        {
            name: 'title',
            type: 'text',
            required: true,
            admin: {
                description: 'Project or service title',
            },
        },
        {
            name: 'description',
            type: 'richText',
        },
        {
            name: 'items',
            type: 'array',
            fields: [
                {
                    name: 'description',
                    type: 'text',
                    required: true,
                },
                {
                    name: 'quantity',
                    type: 'number',
                    defaultValue: 1,
                },
                {
                    name: 'unitPrice',
                    type: 'number',
                    required: true,
                },
            ],
        },
        {
            name: 'total',
            type: 'number',
            admin: {
                description: 'Total quote amount',
            },
        },
        {
            name: 'currency',
            type: 'select',
            options: [
                { label: 'USD', value: 'usd' },
                { label: 'EUR', value: 'eur' },
            ],
            defaultValue: 'usd',
        },
        {
            name: 'status',
            type: 'select',
            options: [
                { label: 'Draft', value: 'draft' },
                { label: 'Sent', value: 'sent' },
                { label: 'Accepted', value: 'accepted' },
                { label: 'Rejected', value: 'rejected' },
                { label: 'Expired', value: 'expired' },
            ],
            defaultValue: 'draft',
        },
        {
            name: 'validUntil',
            type: 'date',
            admin: {
                description: 'Quote expiration date',
            },
        },
        {
            name: 'notes',
            type: 'textarea',
            admin: {
                description: 'Internal notes (not visible to client)',
            },
        },
    ],
}
