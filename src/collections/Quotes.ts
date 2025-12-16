import type { CollectionConfig } from 'payload'

export const Quotes: CollectionConfig = {
    slug: 'quotes',
    admin: {
        useAsTitle: 'quoteNumber',
        group: 'Main Menu',
        description: 'Create and manage client quotes/proposals',
    },
    hooks: {
        // Auto-calculate total before saving
        beforeChange: [
            async ({ data }) => {
                if (data?.items && Array.isArray(data.items)) {
                    // Calculate subtotal from items
                    const subtotal = data.items.reduce((sum: number, item: any) => {
                        const qty = item?.quantity || 1
                        const price = item?.unitPrice || 0
                        return sum + (qty * price)
                    }, 0)

                    // Calculate discount
                    let discountAmount = 0
                    const discountType = data.discountType || 'none'
                    const discountValue = data.discountValue || 0

                    if (discountType === 'percentage' && discountValue > 0) {
                        discountAmount = (subtotal * discountValue) / 100
                    } else if (discountType === 'fixed' && discountValue > 0) {
                        discountAmount = discountValue
                    }

                    // Calculate final total
                    data.subtotal = subtotal
                    data.discountAmount = discountAmount
                    data.total = Math.max(0, subtotal - discountAmount)
                }
                return data
            },
        ],
    },
    fields: [
        // Main row with columns
        {
            type: 'row',
            fields: [
                // Left column - Form fields (60%)
                {
                    type: 'collapsible',
                    label: 'Quote Details',
                    admin: {
                        initCollapsed: false,
                        style: {
                            flexBasis: '55%',
                        },
                    },
                    fields: [
                        {
                            name: 'quoteNumber',
                            type: 'text',
                            required: true,
                            unique: true,
                            admin: {
                                components: {
                                    Field: '/components/AutoQuoteNumberField#AutoQuoteNumberField',
                                },
                            },
                        },
                        {
                            type: 'row',
                            fields: [
                                {
                                    name: 'client',
                                    type: 'relationship',
                                    relationTo: 'clients',
                                    required: true,
                                    admin: {
                                        width: '50%',
                                        components: {
                                            Field: '/components/ClientRelationshipField#ClientRelationshipField',
                                        },
                                    },
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
                                    admin: {
                                        width: '50%',
                                    },
                                },
                            ],
                        },
                        {
                            name: 'title',
                            type: 'text',
                            required: true,
                            admin: {
                                description: 'Project or service title',
                            },
                        },
                        // Line Items section with custom UI
                        {
                            name: 'items',
                            type: 'array',
                            labels: {
                                singular: 'Line Item',
                                plural: 'Line Items',
                            },
                            admin: {
                                components: {
                                    Field: '/components/LineItemsField#LineItemsField',
                                },
                            },
                            fields: [
                                {
                                    name: 'service',
                                    type: 'relationship',
                                    relationTo: 'services',
                                },
                                {
                                    name: 'description',
                                    type: 'text',
                                    required: true,
                                },
                                {
                                    name: 'quantity',
                                    type: 'number',
                                    required: true,
                                    defaultValue: 1,
                                    min: 1,
                                },
                                {
                                    name: 'unitPrice',
                                    type: 'number',
                                    required: true,
                                    min: 0,
                                },
                            ],
                        },
                        // Discount section
                        {
                            type: 'row',
                            fields: [
                                {
                                    name: 'discountType',
                                    type: 'select',
                                    options: [
                                        { label: 'No Discount', value: 'none' },
                                        { label: 'Percentage (%)', value: 'percentage' },
                                        { label: 'Fixed Amount ($)', value: 'fixed' },
                                    ],
                                    defaultValue: 'none',
                                    admin: {
                                        width: '50%',
                                        description: 'Apply a discount to this quote',
                                    },
                                },
                                {
                                    name: 'discountValue',
                                    type: 'number',
                                    min: 0,
                                    defaultValue: 0,
                                    admin: {
                                        width: '50%',
                                        description: 'Enter discount value (percentage or fixed amount)',
                                    },
                                },
                            ],
                        },
                        // Subtotal (hidden, calculated)
                        {
                            name: 'subtotal',
                            type: 'number',
                            admin: {
                                hidden: true,
                            },
                        },
                        // Discount Amount (hidden, calculated)
                        {
                            name: 'discountAmount',
                            type: 'number',
                            admin: {
                                hidden: true,
                            },
                        },
                        // Total and Currency row
                        {
                            type: 'row',
                            fields: [
                                {
                                    name: 'total',
                                    type: 'number',
                                    admin: {
                                        width: '50%',
                                        components: {
                                            Field: '/components/AutoTotalField#AutoTotalField',
                                        },
                                    },
                                },
                                {
                                    name: 'currency',
                                    type: 'select',
                                    options: [
                                        { label: 'USD ($)', value: 'usd' },
                                        { label: 'TTD (TT$)', value: 'ttd' },
                                    ],
                                    defaultValue: 'usd',
                                    admin: {
                                        width: '50%',
                                    },
                                },
                            ],
                        },
                        {
                            name: 'validUntil',
                            type: 'date',
                            admin: {
                                description: 'Quote expiration date (auto-set to 15 days from creation)',
                                components: {
                                    Field: '/components/AutoValidUntilField#AutoValidUntilField',
                                },
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
                },
                // Right column - PDF Preview (40%)
                {
                    name: 'pdfPreview',
                    type: 'ui',
                    admin: {
                        components: {
                            Field: '/components/QuotePDFPreview#QuotePDFPreview',
                        },
                    },
                },
            ],
        },
    ],
}
