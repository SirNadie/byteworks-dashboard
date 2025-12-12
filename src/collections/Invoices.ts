import type { CollectionConfig } from 'payload'

export const Invoices: CollectionConfig = {
    slug: 'invoices',
    admin: {
        useAsTitle: 'invoiceNumber',
        group: 'Main Menu',
        description: 'Manage invoices and billing',
    },
    fields: [
        {
            name: 'invoiceNumber',
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
            name: 'amount',
            type: 'number',
            required: true,
            min: 0,
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
                { label: 'Paid', value: 'paid' },
                { label: 'Overdue', value: 'overdue' },
                { label: 'Cancelled', value: 'cancelled' },
            ],
            defaultValue: 'draft',
        },
        {
            name: 'dueDate',
            type: 'date',
        },
        {
            name: 'paidDate',
            type: 'date',
        },
        {
            name: 'description',
            type: 'textarea',
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
    ],
}
