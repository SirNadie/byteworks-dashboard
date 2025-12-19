
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface User {
    email: string;
    name?: string;
    id: number;
    is_active: boolean;
    is_superuser: boolean;
    role?: string;
}

export interface Contact {
    id: string; // UUID
    name: string;
    email: string;
    phone?: string;
    company?: string;
    source: string;
    status: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface ContactCreate {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    source?: string;
    status?: string;
    notes?: string;
}

export interface ContactUpdate extends Partial<ContactCreate> { }

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    size: number;
    pages: number;
}

class ApiClient {
    private token: string | null = null;
    private listeners: ((token: string | null) => void)[] = [];

    constructor() {
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('token');
        }
    }

    // Auth Headers
    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    // Token Management
    setToken(token: string | null) {
        this.token = token;
        if (typeof window !== 'undefined') {
            if (token) {
                localStorage.setItem('token', token);
            } else {
                localStorage.removeItem('token');
            }
        }
        this.notifyListeners();
    }

    getToken() {
        return this.token;
    }

    subscribe(listener: (token: string | null) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(l => l(this.token));
    }

    // Generic Fetch
    async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${API_BASE}${endpoint}`;
        const config: RequestInit = {
            headers: this.getHeaders(),
            ...options,
        };

        try {
            const response = await fetch(url, config);

            // Handle 401
            if (response.status === 401) {
                this.setToken(null);
                throw new Error('Session expired');
            }

            // Manejar 204 No Content
            if (response.status === 204) {
                return {} as T;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Request failed');
            }

            return data as T;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // --- Endpoints ---

    // Auth
    async login(email: string, password: string): Promise<{ access_token: string; token_type: string }> {
        const data = await this.request<{ access_token: string; token_type: string }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        this.setToken(data.access_token);
        return data;
    }

    async getCurrentUser() {
        return this.request<User>('/auth/me');
    }

    logout() {
        this.setToken(null);
    }

    // Contacts
    async getContacts(params: Record<string, string> = {}): Promise<PaginatedResponse<Contact>> {
        const query = new URLSearchParams(params).toString();
        return this.request<PaginatedResponse<Contact>>(`/contacts/?${query}`);
    }

    async createContact(data: ContactCreate) {
        return this.request<Contact>('/contacts/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateContact(id: string, data: ContactUpdate) {
        return this.request<Contact>(`/contacts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteContact(id: string) {
        return this.request<void>(`/contacts/${id}`, {
            method: 'DELETE',
        });
    }

    // Dashboard & Others
    async getDashboardData() {
        return this.request<any>('/analytics/dashboard');
    }

    async getQuotes() {
        return this.request<any>('/quotes');
    }

    async getInvoices() {
        return this.request<any>('/invoices');
    }
}

export const api = new ApiClient();
