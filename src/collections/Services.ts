import type { CollectionConfig } from 'payload'

export const Services: CollectionConfig = {
    slug: 'services',
    admin: {
        useAsTitle: 'name',
        group: 'Settings',
        description: 'Reusable services/items for quotes',
    },
    fields: [
        {
            name: 'name',
            type: 'text',
            required: true,
            admin: {
                description: 'Service or item name (e.g., "Website Design", "Monthly Maintenance")',
            },
        },
        {
            name: 'description',
            type: 'textarea',
            admin: {
                description: 'Detailed description of the service',
            },
        },
        {
            name: 'defaultPrice',
            type: 'number',
            required: true,
            min: 0,
            admin: {
                description: 'Default price for this service (can be modified per quote)',
            },
        },
        {
            name: 'category',
            type: 'select',
            options: [
                { label: 'Web Development', value: 'web-development' },
                { label: 'Design', value: 'design' },
                { label: 'Maintenance', value: 'maintenance' },
                { label: 'Consulting', value: 'consulting' },
                { label: 'Other', value: 'other' },
            ],
            defaultValue: 'web-development',
        },
        {
            name: 'isActive',
            type: 'checkbox',
            defaultValue: true,
            admin: {
                description: 'Only active services can be added to new quotes',
            },
        },
    ],
}
