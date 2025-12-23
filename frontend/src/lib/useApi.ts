'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    api,
    DashboardData,
    Quote,
    QuoteCreate,
    Invoice,
    Contact,
    ContactCreate,
    ContactUpdate,
    Service,
    ServiceCreate,
    ServiceUpdate,
} from './apiClient';

// Query keys for cache management
export const queryKeys = {
    dashboard: ['dashboard'] as const,
    quotes: ['quotes'] as const,
    quote: (id: string) => ['quotes', id] as const,
    invoices: ['invoices'] as const,
    invoice: (id: string) => ['invoices', id] as const,
    contacts: ['contacts'] as const,
    contact: (id: string) => ['contacts', id] as const,
    services: ['services'] as const,
    service: (id: string) => ['services', id] as const,
};

// Dashboard
export function useDashboard() {
    return useQuery<DashboardData>({
        queryKey: queryKeys.dashboard,
        queryFn: () => api.getDashboard(),
        refetchInterval: 60000, // Refresh every minute
    });
}

// Quotes
export function useQuotes(params: Record<string, string> = {}) {
    return useQuery({
        queryKey: [...queryKeys.quotes, params],
        queryFn: () => api.getQuotes(params),
    });
}

export function useQuote(id: string) {
    return useQuery<Quote>({
        queryKey: queryKeys.quote(id),
        queryFn: () => api.getQuote(id),
        enabled: !!id,
    });
}

export function useCreateQuote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: QuoteCreate) => api.createQuote(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.quotes });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
        },
    });
}

export function useUpdateQuote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Quote> }) =>
            api.updateQuote(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.quote(id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.quotes });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
        },
    });
}

export function useSendQuote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.sendQuote(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.quote(id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.quotes });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
        },
    });
}

export function useConvertQuote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.convertQuote(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.quotes });
            queryClient.invalidateQueries({ queryKey: queryKeys.invoices });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
        },
    });
}

// Invoices
export function useInvoices(params: Record<string, string> = {}) {
    return useQuery({
        queryKey: [...queryKeys.invoices, params],
        queryFn: () => api.getInvoices(params),
    });
}

export function useInvoice(id: string) {
    return useQuery<Invoice>({
        queryKey: queryKeys.invoice(id),
        queryFn: () => api.getInvoice(id),
        enabled: !!id,
    });
}

export function useMarkInvoicePaid() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, paymentMethod }: { id: string; paymentMethod?: string }) =>
            api.markInvoicePaid(id, paymentMethod),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.invoice(id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.invoices });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
        },
    });
}

// Contacts
export function useContacts(params: Record<string, string> = {}) {
    return useQuery({
        queryKey: [...queryKeys.contacts, params],
        queryFn: () => api.getContacts(params),
    });
}

export function useCreateContact() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: ContactCreate) => api.createContact(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.contacts });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
        },
    });
}

export function useUpdateContact() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: ContactUpdate }) =>
            api.updateContact(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.contact(id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.contacts });
        },
    });
}

export function useDeleteContact() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.deleteContact(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.contacts });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
        },
    });
}

// Services
export function useServices(activeOnly = true) {
    return useQuery({
        queryKey: [...queryKeys.services, { activeOnly }],
        queryFn: () => api.getServices(activeOnly),
        staleTime: 5 * 60 * 1000, // Services rarely change, cache for 5 min
    });
}

export function useCreateService() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: ServiceCreate) => api.createService(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.services });
        },
    });
}

export function useUpdateService() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: ServiceUpdate }) =>
            api.updateService(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.services });
        },
    });
}

export function useDeleteService() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.deleteService(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.services });
        },
    });
}
