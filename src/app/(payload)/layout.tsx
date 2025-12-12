import config from '@/payload.config'
import '@payloadcms/next/css'
import { RootLayout } from '@payloadcms/next/layouts'
import { importMap } from './admin/importMap'
import { handleServerFunctions } from './actions'
import React from 'react'

import './custom.scss'

type LayoutArgs = { children: React.ReactNode }

const Layout = ({ children }: LayoutArgs) => (
    <RootLayout config={config} importMap={importMap} serverFunction={handleServerFunctions}>
        {children}
    </RootLayout>
)

export default Layout
