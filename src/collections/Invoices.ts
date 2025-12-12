import type { CollectionConfig } from 'payload'

export const Invoices: CollectionConfig = {
    slug: 'invoices',
    admin: {
        useAsTitle: 'id',
        defaultColumns: ['id', 'status', 'total', 'client'],
    },
    access: {
        read: ({ req: { user } }) => {
            if (user?.role === 'admin') return true
            return {
                'client.owner': {
                    equals: user?.id,
                },
            }
        },
        create: ({ req: { user } }) => user?.role === 'admin',
        update: ({ req: { user } }) => user?.role === 'admin',
        delete: ({ req: { user } }) => user?.role === 'admin',
    },
    fields: [
        {
            name: 'client',
            type: 'relationship',
            relationTo: 'clients',
            required: true,
            label: 'Cliente',
        },
        {
            name: 'status',
            type: 'select',
            options: [
                { label: 'Borrador', value: 'draft' },
                { label: 'Pendiente', value: 'pending' },
                { label: 'Pagada', value: 'paid' },
            ],
            defaultValue: 'draft',
            required: true,
            label: 'Estado',
        },
        {
            name: 'items',
            type: 'array',
            label: 'Conceptos',
            fields: [
                {
                    name: 'concept',
                    type: 'text',
                    required: true,
                    label: 'Concepto',
                },
                {
                    name: 'quantity',
                    type: 'number',
                    min: 1,
                    defaultValue: 1,
                    required: true,
                    label: 'Cantidad',
                },
                {
                    name: 'price',
                    type: 'number',
                    required: true,
                    label: 'Precio Unitario',
                },
            ],
        },
        // We will use a hook later to calculate total automatically, but for now editable is fine or readOnly
        {
            name: 'total',
            type: 'number',
            label: 'Total',
            admin: {
                description: 'Se calculará automáticamente en el futuro',
            }
        },
        {
            name: 'invoiceFile',
            type: 'upload',
            relationTo: 'media',
            label: 'Archivo PDF',
        }
    ],
}
