import React from 'react'
import './custom.scss'

/* This is the root layout for the Payload Admin Panel pages */
const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="payload-layout">
            {children}
        </div>
    )
}

export default Layout
