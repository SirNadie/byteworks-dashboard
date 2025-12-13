import type { CollectionConfig } from 'payload'

export const ContactRequests: CollectionConfig = {
    slug: 'contact-requests',
    admin: {
        useAsTitle: 'email',
        group: 'Others',
        description: 'Incoming contact form submissions',
        listSearchableFields: ['name', 'email', 'company'],
    },
    defaultSort: '-createdAt', // Sort by newest first
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
            // Hook 1: Make.com Webhook (for new leads)
            async ({ doc, operation }) => {
                if (operation !== 'create') return doc;

                const webhookUrl = process.env.MAKE_WEBHOOK_URL;
                if (!webhookUrl) return doc;

                try {
                    await fetch(webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(doc),
                    });
                } catch (error) {
                    console.error('Make webhook failed:', error);
                }
                return doc;
            },
            // Hook 2: Auto-Create Client on Conversion
            async ({ doc, previousDoc, req, operation }) => {
                if (operation !== 'update') return doc;

                const { payload } = req;
                const newStatus = doc.status;
                const oldStatus = previousDoc.status;

                // Only act if status changed to 'converted'
                if (newStatus === 'converted' && oldStatus !== newStatus) {
                    try {
                        console.log(`Converting lead to client: ${doc.email}`);

                        // Check if client exists
                        const existing = await payload.find({
                            collection: 'clients',
                            where: { email: { equals: doc.email } },
                        });

                        if (existing.totalDocs === 0) {
                            await payload.create({
                                collection: 'clients',
                                data: {
                                    name: doc.name,
                                    email: doc.email,
                                    phone: doc.phone,
                                    company: doc.company || doc.name,
                                    status: 'active',
                                    source: 'Website Lead',
                                },
                            });
                            console.log('Client created successfully.');
                        } else {
                            console.log('Client already exists, skipping creation.');
                        }

                    } catch (err) {
                        console.error('Error in conversion workflow:', err);
                    }
                }

                return doc;
            }
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
            name: 'company', // Added to support mapping
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
        },
        {
            name: 'status',
            type: 'select',
            options: [
                { label: 'New', value: 'new' },
                { label: 'Converted', value: 'converted' },
            ],
            defaultValue: 'new',
        },
    ],
}
