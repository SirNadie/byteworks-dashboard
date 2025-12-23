/**
 * Company Information Configuration
 * Centralized company details used across quotes, invoices, and PDFs
 */

export const COMPANY_INFO = {
    name: 'ByteWorks Agency',
    tagline: 'Digital Solutions',
    email: 'macrodriguez2512@gmail.com',
    phone: '+1 (868) 775-9858',
    website: 'byteworksagency.com',
} as const;

// Supported currencies for quotes and invoices
export const CURRENCIES = {
    USD: { symbol: '$', name: 'US Dollar' },
    TTD: { symbol: 'TT$', name: 'Trinidad Dollar' },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

// Standard Terms & Conditions (always shown on quotes)
export const STANDARD_TERMS = {
    en: [
        'Payment of the first month is required to start the service.',
        'This quote is valid for the period specified above.',
        'Services are billed on a monthly or yearly basis unless otherwise specified.',
        'Prices are subject to change with 30 days prior notice.',
        'Cancellation requires 15 days written notice before the next billing cycle.',
        'Late payments beyond 5 days may result in temporary service suspension.',
        'You retain ownership of your content (text, images, customer data). ByteWorks retains rights to the platform code and architecture.',
        'Acceptance of this quote constitutes agreement to ByteWorks Agency\'s full Terms & Conditions available at byteworksagency.com/terms.',
        'ByteWorks Agency\'s total liability is limited to the amount paid for services in the current billing period.',
    ],
    es: [
        'Se requiere el pago del primer mes para iniciar el servicio.',
        'Esta cotización es válida por el período especificado arriba.',
        'Los servicios se facturan mensual o anualmente a menos que se especifique lo contrario.',
        'Los precios están sujetos a cambios con 30 días de aviso previo.',
        'La cancelación requiere aviso por escrito con 15 días de anticipación al próximo ciclo de facturación.',
        'Los pagos atrasados más de 5 días pueden resultar en suspensión temporal del servicio.',
        'Conservas la propiedad de tu contenido (texto, imágenes, datos de clientes). ByteWorks retiene los derechos sobre el código y arquitectura de la plataforma.',
        'La aceptación de esta cotización constituye el acuerdo con los Términos y Condiciones completos de ByteWorks Agency disponibles en byteworksagency.com/terms.',
        'La responsabilidad total de ByteWorks Agency está limitada al monto pagado por servicios en el período de facturación actual.',
    ],
} as const;

// Quote translations
export type Language = 'en' | 'es';

export const TRANSLATIONS = {
    en: {
        quote: 'QUOTE',
        from: 'From',
        to: 'To',
        issueDate: 'Issue Date',
        validUntil: 'Valid Until',
        description: 'Description',
        qty: 'Qty',
        price: 'Price',
        total: 'Total',
        subtotal: 'Subtotal',
        discount: 'Discount',
        tax: 'Tax',
        notes: 'Notes',
        termsAndConditions: 'Terms & Conditions',
        thankYou: 'Thank you for your business!',
        addItemsHint: 'Add items to see them here...',
    },
    es: {
        quote: 'COTIZACIÓN',
        from: 'De',
        to: 'Para',
        issueDate: 'Fecha de Emisión',
        validUntil: 'Válido Hasta',
        description: 'Descripción',
        qty: 'Cant',
        price: 'Precio',
        total: 'Total',
        subtotal: 'Subtotal',
        discount: 'Descuento',
        tax: 'Impuesto',
        notes: 'Notas',
        termsAndConditions: 'Términos y Condiciones',
        thankYou: '¡Gracias por su preferencia!',
        addItemsHint: 'Agregue items para verlos aquí...',
    },
} as const;

// Service categories (must match backend enum)
export const SERVICE_CATEGORIES = [
    { value: 'web_development', label: 'Web Development' },
    { value: 'design', label: 'Design' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'consulting', label: 'Consulting' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'other', label: 'Other' },
] as const;
