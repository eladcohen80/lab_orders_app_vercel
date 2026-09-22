import {getSuppliers, deleteSupplier, updateSupplier,} from "../services/supplierService";
import { useEffect, useState } from "react";
import type { Supplier } from "../types/Supplier";
import outlookIcon from '../assets/outlook_icon.png';
import whatsappIcon from '../assets/whatsapp_icon.png';
import './Suppliers.css';

type SortKey = keyof Supplier | null;
type SortDirection = 'ascending' | 'descending' | null;

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [message, setMessage] = useState('');
        const [isLoading, setIsLoading] = useState(true);

  function getErrorMessage(error: any): string {
    if (error.response && error.response.data && error.response.data.message) {
      return error.response.data.message;
    }
    return error.message || 'An unknown error occurred';
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'ascending' ? 'descending' : 'ascending');
    } else {
      setSortKey(key);
      setSortDirection('ascending');
    }
    }
    function getSortIndicator(key: SortKey): string {
        if (sortKey !== key) {
            return '';
        }
        return sortDirection === 'ascending' ? ' ↑' : ' ↓';
    }

    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const filteredSuppliers = normalizedSearchTerm
        ? suppliers.filter((supplier) => [
            supplier.supplier_name,
            supplier.contact_person,
            supplier.email,
            supplier.phone,
        ].some((value) => String(value ?? '').toLowerCase().includes(normalizedSearchTerm)))
        : suppliers;

    const sortedSuppliers = [...filteredSuppliers].sort((firstSupplier, secondSupplier) => {
        if (sortKey === null || sortDirection === null) {
            return 0;
        }
        const firstValue = String(firstSupplier[sortKey] ?? '');
        const secondValue = String(secondSupplier[sortKey] ?? '');
        if (firstValue < secondValue) {
            return sortDirection === 'ascending' ? -1 : 1;
        }
        if (firstValue > secondValue) {
            return sortDirection === 'ascending' ? 1 : -1;
        }
        return 0;
    });
    async function fetchSuppliers() {
        setIsLoading(true);
        try {
            const data = await getSuppliers();
            setSuppliers(data);
            setMessage('');
        } catch (error: any) {
            console.error('Error fetching suppliers:', error);
            setMessage(getErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchSuppliers();
    }, []);

    async function handleDelete(supplierId: number) {
        if (!window.confirm('Are you sure you want to delete this supplier?')) {
            return;
        }
        try {
            await deleteSupplier(supplierId);
            setSuppliers(suppliers.filter(supplier => supplier.supplier_id !== supplierId));
        }
        catch (error: any) {
            console.error('Error deleting supplier:', error);
            alert(getErrorMessage(error));
        }
    }

    async function handleUpdate(supplierId: number) {
        const supplierToUpdate = suppliers.find(supplier => supplier.supplier_id === supplierId);
        if (!supplierToUpdate) {
            alert('Supplier not found');
            return;
        }
        const newSupplierName = prompt('Enter new supplier name:', supplierToUpdate.supplier_name);
        if (newSupplierName === null || newSupplierName.trim() === '') {
            alert('Supplier name cannot be empty');
            return;
        }
        try {
            const updatedSupplier = { ...supplierToUpdate, supplier_name: newSupplierName };
            await updateSupplier(updatedSupplier);
            setSuppliers(suppliers.map(supplier => supplier.supplier_id === supplierId ? updatedSupplier : supplier));
        }
        catch (error: any) {
            console.error('Error updating supplier:', error);
            alert(getErrorMessage(error));
        }
    }

    function handleContact(email: string) {
        window.location.href = `mailto:${email.trim()}`;
    }

    function handleWhatsApp(phone: string) {
        const digitsOnly = phone.replace(/\D/g, '');
        const internationalPhone = digitsOnly.startsWith('0')
            ? `972${digitsOnly.slice(1)}`
            : digitsOnly;
        window.open(`https://web.whatsapp.com/send?phone=${internationalPhone}`, '_blank', 'noopener,noreferrer');
    }

    return (
        <div className="suppliers-container">
            <div className="list-title-row">
                <h2>Suppliers</h2>
                <label className="list-search" aria-label="Search suppliers">
                    <input
                        type="search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search by name, contact, email or phone"
                    />
                </label>
            </div>
            {message && <p className="error-message">{message}</p>}
            {isLoading ? (
                <p className="loading-state" role="status" aria-live="polite">
                    Loading<span className="loading-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
                </p>
            ) : suppliers.length === 0 && !message ? (
                <p>No suppliers found. Please add a supplier.</p>
            ) : filteredSuppliers.length === 0 ? (
                <p>No suppliers match your search.</p>
            ) : (
                <div className="suppliers-list">
                    <div className="suppliers-header">
                        <div className="supplier-column" onClick={() => handleSort('supplier_name')}>
                            Supplier Name{getSortIndicator('supplier_name')}
                        </div>
                        <div className="supplier-column" onClick={() => handleSort('contact_person')}>
                            Contact Person{getSortIndicator('contact_person')}
                        </div>
                        <div className="supplier-column" onClick={() => handleSort('email')}>
                            Email{getSortIndicator('email')}
                        </div>
                        <div className="supplier-column" onClick={() => handleSort('phone')}>
                            Phone{getSortIndicator('phone')}
                        </div>
                        <div className="supplier-column">Actions</div>
                    </div>
                    {sortedSuppliers.map(supplier => (
                        <div key={supplier.supplier_id} className="supplier-row">
                            <div className="supplier-column">{supplier.supplier_name}</div>
                            <div className="supplier-column">{supplier.contact_person}</div>
                            <div className="supplier-column">{supplier.email}</div>
                            <div className="supplier-column">{supplier.phone}</div>
                            <div className="supplier-column">
                                <button
                                    className="whatsapp-button"
                                    type="button"
                                    onClick={() => handleWhatsApp(supplier.phone)}
                                    aria-label={`Contact ${supplier.supplier_name} on WhatsApp`}
                                    title="Open WhatsApp chat"
                                >
                                    <img src={whatsappIcon} alt="" aria-hidden="true" />
                                </button>
                                <button
                                    className="outlook-button"
                                    type="button"
                                    onClick={() => handleContact(supplier.email)}
                                    aria-label={`Send email to ${supplier.supplier_name}`}
                                    title="Send email with Outlook"
                                >
                                    <img src={outlookIcon} alt="" aria-hidden="true" />
                                </button>
                                <button onClick={() => handleUpdate(supplier.supplier_id!)}>Edit</button>
                                <button onClick={() => handleDelete(supplier.supplier_id!)}>Delete</button>
                            </div>
                        </div>
                    ))} 
                </div>
            )}
        </div>
    );
}
