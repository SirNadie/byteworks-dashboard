'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Types
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    showToast: (message: string, type?: ToastType, duration?: number) => void;
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
    removeToast: (id: string) => void;
}

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

// Contexts
const ToastContext = createContext<ToastContextType | undefined>(undefined);
const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

// Toast Icons
const ToastIcon = ({ type }: { type: ToastType }) => {
    switch (type) {
        case 'success':
            return (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            );
        case 'error':
            return (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            );
        case 'warning':
            return (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            );
        case 'info':
        default:
            return (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
    }
};

// Toast styles
const toastStyles: Record<ToastType, string> = {
    success: 'bg-gradient-to-r from-emerald-500 to-green-600 text-white',
    error: 'bg-gradient-to-r from-red-500 to-rose-600 text-white',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
    info: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white',
};

// Single Toast Component
const ToastItem = ({ toast, onRemove }: { toast: Toast; onRemove: () => void }) => {
    const [isExiting, setIsExiting] = useState(false);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(onRemove, 300);
        }, toast.duration || 4000);

        return () => clearTimeout(timer);
    }, [toast.duration, onRemove]);

    return (
        <div
            className={`
        flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl min-w-[320px] max-w-md
        backdrop-blur-sm border border-white/20
        transform transition-all duration-300 ease-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        ${toastStyles[toast.type]}
      `}
        >
            <div className="flex-shrink-0 p-1 bg-white/20 rounded-lg">
                <ToastIcon type={toast.type} />
            </div>
            <p className="flex-1 font-medium text-sm">{toast.message}</p>
            <button
                onClick={() => {
                    setIsExiting(true);
                    setTimeout(onRemove, 300);
                }}
                className="flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};

// Toast Container Component
const ToastContainer = ({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) => {
    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
            ))}
        </div>
    );
};

// Confirm Modal Component
const ConfirmModal = ({
    isOpen,
    options,
    onConfirm,
    onCancel,
}: {
    isOpen: boolean;
    options: ConfirmOptions;
    onConfirm: () => void;
    onCancel: () => void;
}) => {
    if (!isOpen) return null;

    const typeColors = {
        danger: {
            icon: 'bg-red-100 text-red-600',
            button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        },
        warning: {
            icon: 'bg-amber-100 text-amber-600',
            button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
        },
        info: {
            icon: 'bg-blue-100 text-blue-600',
            button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
        },
    };

    const colors = typeColors[options.type || 'danger'];

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
                onClick={onCancel}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
                <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 p-3 rounded-xl ${colors.icon}`}>
                        {options.type === 'info' ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {options.title || 'Confirm Action'}
                        </h3>
                        <p className="mt-2 text-sm text-gray-600">
                            {options.message}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                        {options.cancelText || 'Cancel'}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.button}`}
                    >
                        {options.confirmText || 'Confirm'}
                    </button>
                </div>
            </div>

            <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { 
            opacity: 0; 
            transform: scale(0.95);
          }
          to { 
            opacity: 1; 
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
        </div>
    );
};

// Provider Component
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        options: ConfirmOptions;
        resolve: ((value: boolean) => void) | null;
    }>({
        isOpen: false,
        options: { message: '' },
        resolve: null,
    });

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
        const id = crypto.randomUUID();
        setToasts((prev) => [...prev, { id, message, type, duration }]);
    }, []);

    const success = useCallback((message: string, duration?: number) => showToast(message, 'success', duration), [showToast]);
    const error = useCallback((message: string, duration?: number) => showToast(message, 'error', duration), [showToast]);
    const warning = useCallback((message: string, duration?: number) => showToast(message, 'warning', duration), [showToast]);
    const info = useCallback((message: string, duration?: number) => showToast(message, 'info', duration), [showToast]);

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                options,
                resolve,
            });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        confirmState.resolve?.(true);
        setConfirmState({ isOpen: false, options: { message: '' }, resolve: null });
    }, [confirmState]);

    const handleCancel = useCallback(() => {
        confirmState.resolve?.(false);
        setConfirmState({ isOpen: false, options: { message: '' }, resolve: null });
    }, [confirmState]);

    return (
        <ToastContext.Provider value={{ toasts, showToast, success, error, warning, info, removeToast }}>
            <ConfirmContext.Provider value={{ confirm }}>
                {children}
                <ToastContainer toasts={toasts} removeToast={removeToast} />
                <ConfirmModal
                    isOpen={confirmState.isOpen}
                    options={confirmState.options}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            </ConfirmContext.Provider>
        </ToastContext.Provider>
    );
}

// Hooks
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ToastProvider');
    }
    return context.confirm;
}
