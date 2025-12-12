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
    hooks: {
        afterChange: [
            async ({ doc, operation }) => {
                // Only trigger on create (new contact requests)
                if (operation !== 'create') return doc;

                const webhookUrl = process.env.MAKE_WEBHOOK_URL;

                if (!webhookUrl) {
                    console.warn('MAKE_WEBHOOK_URL not configured - skipping webhook');
                    return doc;
                }

                try {
                    // MUST await in Serverless environment, otherwise request is cancelled
                    await fetch(webhookUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            id: doc.id,
                            name: doc.name,
                            email: doc.email,
                            phone: doc.phone || '',
                            message: doc.message,
                            source: doc.source || 'unknown',
                            status: doc.status,
                            createdAt: doc.createdAt,
                        }),
                    });
                } catch (error) {
                    console.error('Failed to send webhook to Make:', error);
                    // Swallow error to prevent failing the user request
                }

                return doc;
            },
        ],
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
