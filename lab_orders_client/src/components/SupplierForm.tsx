import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addSupplier } from '../services/supplierService';
import type { Supplier } from '../types/Supplier';
import './SupplierForm.css';

export default function SupplierForm() {
    const navigate = useNavigate();
    const [supplier, setSupplier] = useState<Supplier>({
        supplier_name: '',
        contact_person: '',
        email: '',
        phone: ''
    });

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await addSupplier(supplier);
            alert('Supplier added successfully');
            navigate('/suppliers');
        }
        catch (error: any) {
            console.error('Error adding supplier:', error);
            alert(error.message || 'Failed to add supplier');
        }   
    };

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setSupplier({
            ...supplier,
            [e.target.name]: e.target.value,
        });
    }

    return (
        <div className="supplier-form-container">
            <h2>Add New Supplier</h2>
            <form onSubmit={handleSubmit} className="supplier-form">
                <div className="form-group">
                    <label>Supplier Name</label>
                    <input type="text" name="supplier_name" value={supplier.supplier_name} onChange={handleChange} placeholder="Supplier Name" required />
                </div>
                <div className="form-group">
                    <label>Contact Person</label>
                    <input type="text" name="contact_person" value={supplier.contact_person} onChange={handleChange} placeholder="Contact Person" />
                </div>
                <div className="form-group">
                    <label>Email</label>
                    <input type="email" name="email" value={supplier.email} onChange={handleChange} placeholder="Email" />
                </div>
                <div className="form-group">
                    <label>Phone</label>
                    <input type="text" name="phone" value={supplier.phone} onChange={handleChange} placeholder="Phone" />
                </div>
                <button type="submit" className="submit-button">Add Supplier</button>
            </form>
        </div>
    );
}