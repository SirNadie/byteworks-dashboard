'use client';

import { useState, useEffect } from 'react';
import { api, Contact, ContactCreate, ContactUpdate } from '../../lib/apiClient';
import ContactForm from '@/components/contacts/ContactForm';

export default function ContactsPage() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const response = await api.getContacts({ search });
            setContacts(response.items);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, [search]);

    const handleCreate = () => {
        setEditingContact(null);
        setIsFormOpen(true);
    };

    const handleEdit = (contact: Contact) => {
        setEditingContact(contact);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this contact?')) return;

        try {
            await api.deleteContact(id);
            fetchContacts();
        } catch (error) {
            console.error('Failed to delete contact', error);
            alert('Failed to delete contact');
        }
    };

    const handleFormSubmit = async (data: ContactCreate | ContactUpdate) => {
        setFormLoading(true);
        try {
            if (editingContact) {
                await api.updateContact(editingContact.id, data);
            } else {
                await api.createContact(data as ContactCreate);
            }
            setIsFormOpen(false);
            fetchContacts();
        } catch (error) {
            console.error('Failed to save contact', error);
            alert('Failed to save contact');
        } finally {
            setFormLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Contacts</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage your leads and clients.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="btn btn-primary flex items-center gap-2 shadow-lg shadow-brand/20"
                >
                    <span className="material-symbols-outlined">add</span>
                    Add Contact
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <span className="material-symbols-outlined font-light">search</span>
                    </span>
                    <input
                        type="text"
                        placeholder="Search by name, email, or company..."
                        className="pl-10 block w-full rounded-xl border-gray-200 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-transparent sm:text-sm py-2.5 shadow-sm transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-border-dark">
                        <thead className="bg-gray-50 dark:bg-border-dark/30">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Name
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Contact Info
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Source
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Created
                                </th>
                                <th scope="col" className="relative px-6 py-4">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-border-dark bg-white dark:bg-card-dark">
                            {!loading && contacts.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="size-12 rounded-full bg-gray-100 dark:bg-border-dark flex items-center justify-center mb-3">
                                                <span className="material-symbols-outlined text-gray-400">person_off</span>
                                            </div>
                                            <p className="font-medium">No contacts found</p>
                                            <p className="text-sm mt-1">Try adjusting your search or add a new contact.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {loading ? (
                                // Loading Skeleton Rows
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 dark:bg-border-dark rounded w-32"></div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 dark:bg-border-dark rounded w-48 mb-2"></div><div className="h-3 bg-gray-200 dark:bg-border-dark rounded w-24"></div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="h-6 bg-gray-200 dark:bg-border-dark rounded-full w-20"></div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 dark:bg-border-dark rounded w-24"></div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 dark:bg-border-dark rounded w-24"></div></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right"><div className="h-4 bg-gray-200 dark:bg-border-dark rounded w-8 ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : (
                                contacts.map((contact) => (
                                    <tr key={contact.id} className="group hover:bg-gray-50 dark:hover:bg-border-dark/40 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand to-brand-strong text-white flex items-center justify-center font-bold text-lg uppercase flex-shrink-0 shadow-sm">
                                                    {contact.name.charAt(0)}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{contact.name}</div>
                                                    {contact.company && (
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{contact.company}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <a href={`mailto:${contact.email}`} className="text-sm text-gray-700 dark:text-gray-200 hover:text-brand transition-colors flex items-center gap-1.5 font-medium">
                                                    <span className="material-symbols-outlined text-[16px] opacity-70">mail</span>
                                                    {contact.email}
                                                </a>
                                                {contact.phone && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[14px] opacity-70">call</span>
                                                        {contact.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`badge uppercase tracking-wider shadow-sm ${contact.status === 'new' ? 'badge-new' :
                                                contact.status === 'qualified' ? 'badge-qualified' :
                                                    contact.status === 'converted' ? 'badge-converted' :
                                                        contact.status === 'contacted' ? 'badge-contacted' :
                                                            'badge-draft'
                                                }`}>
                                                {contact.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 capitalize font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className={`size-2 rounded-full ${contact.source === 'linkedin' ? 'bg-[#0077b5]' :
                                                    contact.source === 'web_form' ? 'bg-brand' :
                                                        'bg-gray-400'
                                                    }`}></div>
                                                {contact.source.replace('_', ' ')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-medium">
                                            {new Date(contact.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                <button
                                                    onClick={() => handleEdit(contact)}
                                                    className="text-gray-400 hover:text-brand hover:bg-brand/10 p-2 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <span className="material-symbols-outlined text-xl">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(contact.id)}
                                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <span className="material-symbols-outlined text-xl">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ContactForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleFormSubmit}
                initialData={editingContact}
                isLoading={formLoading}
            />
        </div>
    );
}
