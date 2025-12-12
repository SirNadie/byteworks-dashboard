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
        beforeChange: [
            ({ data, operation }) => {
                // Anti-Spam: Honeypot check
                if (operation === 'create' && data.bot_field) {
                    throw new Error('Spam detected');
                }
                return data;
            },
        ],
        afterChange: [
            async ({ doc, operation, req }) => {
                // Only trigger on create (new contact requests)
                if (operation !== 'create') return doc;

                const webhookUrl = process.env.MAKE_WEBHOOK_URL;

                if (!webhookUrl) {
                    return doc;
                }

                try {
                    const response = await fetch(webhookUrl, {
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

                    if (response.ok) {
                        try {
                            // Update status to sent using local API (prevents firing hooks again if configured correctly, but here we just update)
                            // Note: updates trigger hooks, but our hook has "if (operation !== 'create') return" so it's safe.
                            await req.payload.update({
                                collection: 'contact-requests',
                                id: doc.id,
                                data: { automationStatus: 'sent' },
                                req
                            });
                        } catch (e) {
                            console.error('Error updating status to sent:', e);
                        }
                    } else {
                        throw new Error(`Make.com returned ${response.status}`);
                    }

                } catch (error) {
                    console.error('Failed to send webhook to Make:', error);
                    try {
                        await req.payload.update({
                            collection: 'contact-requests',
                            id: doc.id,
                            data: { automationStatus: 'failed' },
                            req
                        });
                    } catch (e) {
                        console.error('Error updating status to failed:', e);
                    }
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
        // Anti-Spam & Automation Fields
        {
            name: 'automationStatus',
            type: 'select',
            options: [
                { label: 'Pending', value: 'pending' },
                { label: 'Sent to Make', value: 'sent' },
                { label: 'Failed', value: 'failed' },
            ],
            defaultValue: 'pending',
            admin: {
                position: 'sidebar',
                readOnly: true,
                description: 'Status of the Make.com automation',
            },
        },
        {
            name: 'bot_field',
            type: 'text',
            admin: {
                hidden: true, // Hide from admin UI
            },
        },
    ],
}

