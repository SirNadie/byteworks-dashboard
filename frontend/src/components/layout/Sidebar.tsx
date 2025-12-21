'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '../../lib/apiClient';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

export default function Sidebar({ isOpen, onClose, isCollapsed = false, onToggleCollapse }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [user, setUser] = useState<{ name?: string, email: string } | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const userData = await api.getCurrentUser();
                setUser(userData);
            } catch (error) {
                console.error("Failed to fetch user in sidebar", error);
            }
        };
        fetchUser();
    }, []);

    const handleLogout = () => {
        api.logout();
        router.push('/login');
    };

    const isActive = (path: string) => pathname === path;

    const getLinkClass = (path: string) => {
        const base = `nav-item flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isCollapsed ? 'justify-center' : ''}`;
        const active = "bg-brand text-white shadow-lg shadow-brand/20";
        const inactive = "hover:bg-gray-100 dark:hover:bg-border-dark text-gray-700 dark:text-gray-300";

        return `${base} ${isActive(path) ? active : inactive}`;
    };

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
                ${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-card-dark border-r border-gray-200 dark:border-border-dark 
                flex flex-col fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    <div className={`flex items-center gap-3 ${isCollapsed ? '' : 'px-2'}`}>
                        {/* Logo */}
                        <div className="relative w-8 h-8 flex-shrink-0">
                            <Image
                                src="/logo.png"
                                alt="Logo"
                                width={32}
                                height={32}
                                className="object-contain"
                                priority
                            />
                        </div>
                        {!isCollapsed && (
                            <span className="font-display font-bold text-xl tracking-tight text-gray-900 dark:text-white">
                                ByteWorks
                            </span>
                        )}
                    </div>

                    {/* Close Button (Mobile Only) */}
                    {!isCollapsed && (
                        <button
                            onClick={onClose}
                            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-border-dark rounded-lg"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    )}
                </div>

                {/* Collapse Toggle Button (Desktop Only) */}
                {onToggleCollapse && (
                    <button
                        onClick={onToggleCollapse}
                        className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-card-dark border border-gray-200 dark:border-border-dark rounded-full items-center justify-center shadow-sm hover:bg-gray-50 dark:hover:bg-border-dark transition-colors z-50"
                        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <span className={`material-symbols-outlined text-sm text-gray-500 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
                            chevron_left
                        </span>
                    </button>
                )}

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <Link href="/" className={getLinkClass('/')} onClick={() => onClose()} title="Dashboard">
                        <span className="material-symbols-outlined">dashboard</span>
                        {!isCollapsed && <span className="text-sm font-medium">Dashboard</span>}
                    </Link>
                    <Link href="/contacts" className={getLinkClass('/contacts')} onClick={() => onClose()} title="Leads">
                        <span className="material-symbols-outlined">person_add</span>
                        {!isCollapsed && <span className="text-sm font-medium">Leads</span>}
                    </Link>
                    <Link href="/services" className={getLinkClass('/services')} onClick={() => onClose()} title="Services">
                        <span className="material-symbols-outlined">inventory_2</span>
                        {!isCollapsed && <span className="text-sm font-medium">Services</span>}
                    </Link>
                    <Link href="/quotes" className={getLinkClass('/quotes')} onClick={() => onClose()} title="Quotes">
                        <span className="material-symbols-outlined">description</span>
                        {!isCollapsed && <span className="text-sm font-medium">Quotes</span>}
                    </Link>
                    <Link href="/invoices" className={getLinkClass('/invoices')} onClick={() => onClose()} title="Invoices">
                        <span className="material-symbols-outlined">receipt_long</span>
                        {!isCollapsed && <span className="text-sm font-medium">Invoices</span>}
                    </Link>
                    <Link href="/clients" className={getLinkClass('/clients')} onClick={() => onClose()} title="Clients">
                        <span className="material-symbols-outlined">group</span>
                        {!isCollapsed && <span className="text-sm font-medium">Clients</span>}
                    </Link>
                </nav>

                {/* User Dropdown Section */}
                <div className="p-4 border-t border-gray-200 dark:border-border-dark relative">
                    <button
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-border-dark cursor-pointer transition-colors group text-left ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? user?.name || 'User menu' : undefined}
                    >
                        <div className="size-10 rounded-full bg-brand flex items-center justify-center text-white font-bold shadow-md uppercase flex-shrink-0">
                            {user?.name ? user.name.charAt(0) : 'U'}
                        </div>
                        {!isCollapsed && (
                            <>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold truncate text-gray-900 dark:text-white">{user?.name || 'Loading...'}</p>
                                    <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
                                </div>
                                <span className={`material-symbols-outlined text-gray-400 group-hover:text-brand transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`}>
                                    expand_more
                                </span>
                            </>
                        )}
                    </button>

                    {/* Dropdown Menu */}
                    {
                        isUserMenuOpen && (
                            <>
                                {/* Backdrop to close when clicking outside */}
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setIsUserMenuOpen(false)}
                                />

                                <div className={`absolute bottom-full mb-2 bg-white dark:bg-card-dark rounded-xl shadow-lg border border-gray-200 dark:border-border-dark overflow-hidden z-50 animate-in slide-in-from-bottom-2 fade-in duration-200 ${isCollapsed ? 'left-2 right-2 min-w-[200px]' : 'left-4 right-4'}`}>
                                    <div className="p-2 space-y-1">
                                        <Link
                                            href="/settings"
                                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-border-dark text-gray-700 dark:text-gray-300 transition-colors w-full"
                                            onClick={() => {
                                                setIsUserMenuOpen(false);
                                                onClose();
                                            }}
                                        >
                                            <span className="material-symbols-outlined text-lg">settings</span>
                                            <span className="text-sm font-medium">Settings</span>
                                        </Link>

                                        <div className="h-px bg-gray-200 dark:bg-border-dark my-1" />

                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors w-full text-left"
                                        >
                                            <span className="material-symbols-outlined text-lg">logout</span>
                                            <span className="text-sm font-medium">Log Out</span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )
                    }
                </div >
            </aside >
        </>
    );
}

