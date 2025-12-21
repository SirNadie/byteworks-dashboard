'use client';

import Link from 'next/link';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
    return (
        <nav className="flex items-center gap-2 text-sm mb-6" aria-label="Breadcrumb">
            <Link
                href="/"
                className="text-gray-400 hover:text-brand transition-colors"
                title="Dashboard"
            >
                <span className="material-symbols-outlined text-lg">home</span>
            </Link>
            {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-gray-300 text-sm">chevron_right</span>
                    {item.href ? (
                        <Link
                            href={item.href}
                            className="text-gray-500 dark:text-gray-400 hover:text-brand transition-colors"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-gray-900 dark:text-white font-medium">
                            {item.label}
                        </span>
                    )}
                </div>
            ))}
        </nav>
    );
}

// Copy to clipboard utility function with toast feedback
export const copyToClipboard = async (
    text: string,
    toast: { success: (msg: string) => void; error: (msg: string) => void }
) => {
    try {
        await navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard!');
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            toast.success('Copied to clipboard!');
        } catch (e) {
            toast.error('Failed to copy');
        }
        document.body.removeChild(textArea);
    }
};
