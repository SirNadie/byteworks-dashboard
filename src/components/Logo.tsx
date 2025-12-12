'use client'

import React from 'react'

export const Logo: React.FC = () => {
    return (
        <img
            src="/logo-dark.png"
            alt="ByteWorks"
            style={{
                height: 'auto',
                width: '100%',
                maxWidth: '160px',
                maxHeight: '40px',
                objectFit: 'contain',
            }}
        />
    )
}
