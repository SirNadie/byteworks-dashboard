import type { CollectionConfig } from 'payload'

export const ContactRequests: CollectionConfig = {
    slug: 'contact-requests',
    admin: {
        useAsTitle: 'email',
        group: 'Others',
        description: 'Incoming contact form submissions',
    },
    access: {
        // Anyone can create (public form submission)
        create: () => true,
        // Only authenticated users can read, update, delete
        read: ({ req: { user } }) => Boolean(user),
        update: ({ req: { user } }) => Boolean(user),
        delete: ({ req: { user } }) => Boolean(user),
    },
    timestamps: true,
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
            name: 'message',
            type: 'textarea',
            required: true,
        },
        {
            name: 'source',
            type: 'text',
            admin: {
                description: 'Where the request came from (e.g., website, referral)',
            },
        },
        {
            name: 'status',
            type: 'select',
            options: [
                { label: 'New', value: 'new' },
                { label: 'Contacted', value: 'contacted' },
                { label: 'Converted', value: 'converted' },
                { label: 'Closed', value: 'closed' },
            ],
            defaultValue: 'new',
        },
    ],
}
