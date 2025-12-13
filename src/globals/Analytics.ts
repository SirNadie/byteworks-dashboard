import type { GlobalConfig } from 'payload'

export const Analytics: GlobalConfig = {
    slug: 'analytics',
    label: 'Website Stats',
    admin: {
        group: 'Others',
    },
    fields: [
        {
            name: 'info',
            type: 'ui',
            admin: {
                components: {
                    Field: '/components/Dashboard#default',
                },
            },
        },
    ],
}
