
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

// Dashboard Analytics Types
export interface DashboardKPIs {
    new_contacts: number;
    new_contacts_change: number;
    pending_quotes: number;
    pending_quotes_change: number;
    outstanding_invoices: number;
    outstanding_change: number;
    weekly_visits: number;
    visits_change: number;
}

export interface QuoteStats {
    draft: number;
    sent: number;
    accepted: number;
    rejected: number;
    expired: number;
    acceptance_rate: number;
}

export interface RecentContact {
    id: string;
    name: string;
    email: string;
    source: string;
    created_at: string;
}

export interface OverdueInvoice {
    id: string;
    invoice_number: string;
    contact_name: string;
    total: number;
    due_date: string;
    days_overdue: number;
}

export interface DashboardData {
    kpis: DashboardKPIs;
    quote_stats: QuoteStats;
    recent_contacts: RecentContact[];
    overdue_invoices: OverdueInvoice[];
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

    // Services
    async getServices(activeOnly: boolean = true): Promise<ServiceListResponse> {
        const params = activeOnly ? '?active_only=true' : '?active_only=false';
        return this.request<ServiceListResponse>(`/services${params}`);
    }

    async createService(data: ServiceCreate): Promise<Service> {
        return this.request<Service>('/services', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateService(id: string, data: ServiceUpdate): Promise<Service> {
        return this.request<Service>(`/services/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteService(id: string): Promise<void> {
        return this.request<void>(`/services/${id}`, {
            method: 'DELETE',
        });
    }

    // Dashboard & Others
    async getDashboardData() {
        return this.request<any>('/analytics/dashboard');
    }

    // Quotes
    async getQuotes(params: Record<string, string> = {}): Promise<QuoteListResponse> {
        const query = new URLSearchParams(params).toString();
        return this.request<QuoteListResponse>(`/quotes?${query}`);
    }

    async createQuote(data: QuoteCreate): Promise<Quote> {
        return this.request<Quote>('/quotes', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getQuote(id: string): Promise<Quote> {
        return this.request<Quote>(`/quotes/${id}`);
    }

    async updateQuote(id: string, data: QuoteUpdate): Promise<Quote> {
        return this.request<Quote>(`/quotes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async sendQuote(id: string): Promise<Quote> {
        return this.request<Quote>(`/quotes/${id}/send`, {
            method: 'POST',
        });
    }

    async convertQuote(id: string): Promise<{ invoice_id: string; invoice_number: string }> {
        return this.request<{ invoice_id: string; invoice_number: string }>(`/quotes/${id}/convert`, {
            method: 'POST',
        });
    }

    async rejectQuote(id: string): Promise<void> {
        return this.request<void>(`/quotes/${id}/reject`, {
            method: 'POST',
        });
    }

    async getInvoices(params: Record<string, string> = {}): Promise<InvoiceListResponse> {
        const query = new URLSearchParams(params).toString();
        return this.request<InvoiceListResponse>(`/invoices?${query}`);
    }

    async getInvoice(id: string): Promise<Invoice> {
        return this.request<Invoice>(`/invoices/${id}`);
    }

    async markInvoicePaid(id: string, paymentMethod?: string): Promise<MarkPaidResponse> {
        return this.request<MarkPaidResponse>(`/invoices/${id}/mark-paid`, {
            method: 'POST',
            body: JSON.stringify({ payment_method: paymentMethod }),
        });
    }

    async deleteInvoice(id: string): Promise<void> {
        return this.request<void>(`/invoices/${id}`, {
            method: 'DELETE',
        });
    }

    // Analytics / Dashboard
    async getDashboard(): Promise<DashboardData> {
        return this.request<DashboardData>('/analytics/dashboard');
    }
}

// Service interfaces
export interface Service {
    id: string;
    name: string;
    description?: string;
    default_price: number;
    currency: string;
    category: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ServiceCreate {
    name: string;
    description?: string;
    default_price: number;
    currency?: string;
    category?: string;
    is_active?: boolean;
}

export interface ServiceUpdate {
    name?: string;
    description?: string;
    default_price?: number;
    currency?: string;
    category?: string;
    is_active?: boolean;
}

export interface ServiceListResponse {
    items: Service[];
    total: number;
}

// Quote interfaces
export interface QuoteItem {
    id?: string;
    service_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    total?: number;
    sort_order?: number;
}

export interface QuoteItemCreate {
    service_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    sort_order?: number;
}

export interface Quote {
    id: string;
    quote_number: string;
    client_name: string;
    client_email: string;
    client_phone?: string;
    client_company?: string;
    lead_id?: string;
    status: string;
    currency: string;
    subtotal: number;
    discount: number;
    discount_type: string;
    discount_value: number;
    tax: number;
    total: number;
    valid_until: string;
    language: string;
    notes?: string;
    reminder_sent: boolean;
    created_at: string;
    updated_at: string;
    sent_at?: string;
    items: QuoteItem[];
}

export interface QuoteCreate {
    quote_number: string;
    client_name: string;
    client_email: string;
    client_phone?: string;
    client_company?: string;
    lead_id?: string;
    currency: string;
    valid_until: string;
    items: QuoteItemCreate[];
    discount: number;
    discount_type: string;
    discount_value: number;
    tax: number;
    language: string;
    notes?: string;
}

export interface QuoteUpdate {
    client_name?: string;
    client_email?: string;
    client_phone?: string;
    client_company?: string;
    currency?: string;
    notes?: string;
    valid_until?: string;
    discount?: number;
    discount_type?: string;
    discount_value?: number;
    tax?: number;
    language?: string;
    items?: QuoteItemCreate[];
    status?: string;
}

export interface QuoteListResponse {
    items: Quote[];
    total: number;
    page: number;
    size: number;
    pages: number;
}

// Invoice interfaces
export interface InvoiceItem {
    description: string;
    quantity: number;
    unit_price: number;
}

export interface InvoiceContact {
    id: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
}

export interface Invoice {
    id: string;
    invoice_number: string;
    quote_id?: string;
    contact_id: string;
    contact?: InvoiceContact;
    items: InvoiceItem[];
    subtotal: number;
    tax_rate: number;
    tax: number;
    total: number;
    status: 'pending' | 'paid' | 'overdue' | 'cancelled';
    due_date: string;
    paid_at?: string;
    payment_method?: string;
    notes?: string;
    pdf_url?: string;
    created_at: string;
    updated_at: string;
}

export interface InvoiceListResponse {
    items: Invoice[];
    total: number;
    page: number;
    size: number;
    pages: number;
}

export interface MarkPaidResponse {
    paid_invoice: Invoice;
    next_invoice: {
        id: string;
        invoice_number: string;
        due_date: string;
    };
}
export const api = new ApiClient();
