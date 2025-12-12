import config from '@/payload.config'
import '@payloadcms/next/css'
import { RootLayout } from '@payloadcms/next/layouts'
import { importMap } from './admin/importMap'
import React from 'react'

import './custom.scss'

const Layout = ({ children }: { children: React.ReactNode }) => (
    <RootLayout config={config} importMap={importMap}>
        {children}
    </RootLayout>
)

export default Layout
