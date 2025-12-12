import type { CollectionConfig } from 'payload'

export const Clients: CollectionConfig = {
    slug: 'clients',
    admin: {
        useAsTitle: 'businessName',
    },
    access: {
        read: ({ req: { user } }) => {
            // Admin sees everything
            if (user?.role === 'admin') return true

            // Client sees their own profile
            return {
                owner: {
                    equals: user?.id,
                },
            }
        },
        create: ({ req: { user } }) => user?.role === 'admin', // Only admin creates clients
        update: ({ req: { user } }) => {
            if (user?.role === 'admin') return true
            return {
                owner: {
                    equals: user?.id,
                },
            }
        },
        delete: ({ req: { user } }) => user?.role === 'admin',
    },
    fields: [
        {
            name: 'businessName', // Razón Social
            type: 'text',
            required: true,
            label: 'Razón Social',
        },
        {
            name: 'taxId', // RFC/CIF
            type: 'text',
            label: 'RFC/CIF',
        },
        {
            name: 'address', // Dirección
            type: 'textarea',
            label: 'Dirección Fiscal',
        },
        {
            name: 'billingEmail', // Email de facturación
            type: 'email',
            label: 'Email de Facturación',
        },
        {
            name: 'owner', // Relación: "Este perfil pertenece al Usuario X"
            type: 'relationship',
            relationTo: 'users',
            hasMany: false,
            label: 'Usuario Administrador (Dueño)',
            admin: {
                description: 'Usuario que tiene acceso a este perfil de cliente',
            }
        },
    ],
}
