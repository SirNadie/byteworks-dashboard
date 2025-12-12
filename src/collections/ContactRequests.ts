import type { CollectionConfig } from 'payload'

export const ContactRequests: CollectionConfig = {
    slug: 'contact-requests',
    admin: {
        useAsTitle: 'email',
    },
    fields: [
        {
            name: 'name',
            type: 'text',
            label: 'Nombre',
        },
        {
            name: 'email',
            type: 'email',
            label: 'Correo Electrónico',
        },
        {
            name: 'message',
            type: 'textarea',
            label: 'Mensaje',
        },
        {
            name: 'status',
            type: 'select',
            options: [
                { label: 'Nuevo', value: 'new' },
                { label: 'Contactado', value: 'contacted' },
                { label: 'Convertido', value: 'converted' },
                { label: 'Archivado', value: 'archived' },
            ],
            defaultValue: 'new',
            label: 'Estado',
        }
    ],
}
