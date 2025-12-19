'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/apiClient';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await api.login(email, password);
            router.push('/');
        } catch (err: any) {
            console.error(err);
            setError('Invalid email or password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white dark:bg-background-dark">
            {/* Left Side - Brand / Art */}
            <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-brand-dark to-brand relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-10"></div>

                <div className="relative z-10 flex flex-col justify-between h-full p-16 text-white">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="size-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 p-2">
                                <Image
                                    src="/logo.png"
                                    alt="Logo"
                                    width={24}
                                    height={24}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <span className="font-display font-bold text-2xl tracking-tight">
                                ByteWorks
                            </span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <blockquote className="text-3xl font-display font-medium leading-tight">
                            "Streamline your agency workflow with the power of intelligent automation."
                        </blockquote>
                        <div className="flex items-center gap-4">
                            <div className="h-px w-12 bg-white/50"></div>
                            <p className="text-white/80 text-sm font-medium tracking-wider uppercase">Portal v2.0</p>
                        </div>
                    </div>

                    <div className="text-xs text-white/40">
                        &copy; {new Date().getFullYear()} ByteWorks Agency. All rights reserved.
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 animate-in slide-in-from-right-4 duration-500 fade-in">
                <div className="mx-auto w-full max-w-sm lg:w-96">
                    <div className="lg:hidden mb-10 text-center flex flex-col items-center">
                        <div className="relative w-12 h-12 mb-4">
                            <Image
                                src="/logo.png"
                                alt="Logo"
                                width={48}
                                height={48}
                                className="object-contain w-full h-full"
                            />
                        </div>
                        <span className="font-display font-bold text-3xl tracking-tight text-gray-900 dark:text-white">
                            ByteWorks
                        </span>
                    </div>

                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-display font-bold tracking-tight text-gray-900 dark:text-white">
                            Welcome back
                        </h2>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            Please sign in to access your dashboard.
                        </p>
                    </div>

                    <div className="mt-10">
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Email address
                                </label>
                                <div className="mt-2 relative">
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent dark:bg-card-dark dark:text-white transition-all duration-200 sm:text-sm"
                                        placeholder="you@example.com"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                                        <span className="material-symbols-outlined text-[20px]">mail</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Password
                                </label>
                                <div className="mt-2 relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent dark:bg-card-dark dark:text-white transition-all duration-200 sm:text-sm"
                                        placeholder="••••••••"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                                        <span className="material-symbols-outlined text-[20px]">lock</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        id="remember-me"
                                        name="remember-me"
                                        type="checkbox"
                                        className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded cursor-pointer"
                                    />
                                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300 cursor-pointer select-none">
                                        Remember me
                                    </label>
                                </div>

                                <div className="text-sm">
                                    <a href="#" className="font-medium text-brand hover:text-brand-strong transition-colors">
                                        Forgot password?
                                    </a>
                                </div>
                            </div>

                            {error && (
                                <div className="rounded-lg bg-red-50 dark:bg-red-900/10 p-4 border border-red-100 dark:border-red-900/20 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <span className="material-symbols-outlined text-red-500 text-sm">error</span>
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                                                {error}
                                            </h3>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-brand/20 text-sm font-bold text-white bg-gradient-to-r from-brand to-brand-soft hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand transition-all duration-200 transform hover:-translate-y-0.5 ${loading ? 'opacity-75 cursor-not-allowed hover:transform-none' : ''}`}
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                                            Signing in...
                                        </span>
                                    ) : 'Sign in'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
