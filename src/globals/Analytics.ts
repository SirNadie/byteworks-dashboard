import type { GlobalConfig } from 'payload'

export const Analytics: GlobalConfig = {
    slug: 'analytics',
    label: 'Website Stats',
    admin: {
        group: 'Others',
        components: {
            views: {
                Edit: {
                    Component: '/components/Dashboard#default',
                },
            },
        },
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
