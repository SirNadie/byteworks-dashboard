'use client'

import React from 'react'

export const Icon: React.FC = () => {
    return (
        <img
            src="/logo-dark.png"
            alt="ByteWorks"
            style={{
                height: 'auto',
                width: '100%',
                maxWidth: '28px',
                maxHeight: '28px',
                objectFit: 'contain',
            }}
        />
    )
}
