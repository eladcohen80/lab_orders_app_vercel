import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBudgets } from "../services/budgetService";
import { addOrder } from "../services/orderService";
import { getProducts } from "../services/productService";
import { getSuppliers } from "../services/supplierService";
import type { Budget } from "../types/Budget";
import type { Order } from "../types/Order";
import type { Product } from "../types/Product";
import type { Supplier } from "../types/Supplier";
import './OrderForm.css';

export default function OrderForm() {
    const navigate = useNavigate();
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [isLoadingBudgets, setIsLoadingBudgets] = useState(true);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [isProductListOpen, setIsProductListOpen] = useState(false);
    const [isCatalogNumberListOpen, setIsCatalogNumberListOpen] = useState(false);
    const [order, setOrder] = useState<Order>({
        order_date: new Date().toISOString().split('T')[0],
        description: '',
        cat_number: '',
        quote_number: '',
        po_number: '',
        supplier: '',
        budget: '',
        amount: 0,
        price: 0,
        currency: '',
        total_price_nis: 0,
        status: 'pending',
        comments: '',
    });

    useEffect(() => {
        const loadBudgets = async () => {
            try {
                setBudgets(await getBudgets());
            } catch (error) {
                console.error('Error fetching budgets:', error);
            } finally {
                setIsLoadingBudgets(false);
            }
        };

        loadBudgets();
    }, []);

    useEffect(() => {
        const loadSuppliers = async () => {
            try {
                setSuppliers(await getSuppliers());
            } catch (error) {
                console.error('Error fetching suppliers:', error);
            } finally {
                setIsLoadingSuppliers(false);
            }
        };

        loadSuppliers();
    }, []);

    useEffect(() => {
        if (!order.supplier) {
            setProducts([]);
            return;
        }

        let isCurrent = true;
        setIsLoadingProducts(true);

        getProducts(order.supplier)
            .then((data) => {
                if (isCurrent) {
                    setProducts(data.filter((product) => product.supplier.trim().toLowerCase() === order.supplier.trim().toLowerCase()));
                }
            })
            .catch((error) => {
                console.error('Error fetching products:', error);
                if (isCurrent) {
                    setProducts([]);
                }
            })
            .finally(() => {
                if (isCurrent) {
                    setIsLoadingProducts(false);
                }
            });

        return () => {
            isCurrent = false;
        };
    }, [order.supplier]);

    const handlesubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await addOrder(order);
            alert('Order added successfully');
            navigate('/orders');
        }
        catch (error: any) {
            console.error('Error adding order:', error);
            alert(error.message || 'Failed to add order');
        }
    };

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
        const { name, value, type } = e.target;
        if (name === 'supplier') {
            setProducts([]);
            setIsProductListOpen(false);
            setIsCatalogNumberListOpen(false);
        }
        setOrder({
            ...order,
            ...(name === 'supplier' ? { description: '', cat_number: '' } : {}),
            [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value,
        });
    }

    function selectProduct(product: Product) {
        setIsProductListOpen(false);
        setIsCatalogNumberListOpen(false);
        setOrder({
            ...order,
            description: product.product_name,
            cat_number: product.cat_number,
        });
    }

    function handleProductChange(e: React.ChangeEvent<HTMLInputElement>) {
        setIsProductListOpen(true);
        setOrder({
            ...order,
            description: e.target.value,
        });
    }

    function handleCatalogNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
        setIsCatalogNumberListOpen(true);
        setOrder({
            ...order,
            cat_number: e.target.value,
        });
    }

    function useNewProduct() {
        setIsProductListOpen(false);
        setIsCatalogNumberListOpen(false);
    }

    const matchingProducts = products.filter((product) =>
        product.product_name.toLowerCase().includes(order.description.toLowerCase())
    );
    const matchingCatalogNumbers = products.filter((product) =>
        product.cat_number.toLowerCase().includes(order.cat_number.toLowerCase())
    );
    return (
        <div className="order-form-container">
            <h2>Add New Order</h2>
            <form onSubmit={handlesubmit} className="order-form">
                
                {/* Section 1: Item & Supplier Info */}
                <div className="form-section">
                    <h3 className="section-title">General Details</h3>
                    <div className="form-grid grid-3">
                        <div className="form-group">
                            <label>Order Date</label>
                            <input type="date" name="order_date" value={order.order_date.toString()} onChange={handleChange} required />
                        </div>
                        <div className="form-group span-2">
                            <label>Product</label>
                            <div className="supplier-combobox" onMouseLeave={() => setIsProductListOpen(false)}>
                                <input type="text" name="description" value={order.description} onChange={handleProductChange} onFocus={() => { setIsProductListOpen(true); setIsCatalogNumberListOpen(false); }} placeholder={order.supplier ? 'Select or enter a product' : 'Select a supplier first'} disabled={!order.supplier || isLoadingProducts} required autoComplete="off" />
                                <button type="button" className="combobox-toggle" onClick={() => setIsProductListOpen(!isProductListOpen)} disabled={!order.supplier || isLoadingProducts} aria-label="Show supplier products" aria-expanded={isProductListOpen}>
                                    <span className="combobox-arrow" aria-hidden="true" />
                                </button>
                                {isProductListOpen && (
                                    <div className="combobox-options" role="listbox">
                                        {matchingProducts.map((product) => (
                                            <button type="button" key={product.product_id} className="combobox-option" onMouseDown={(e) => e.preventDefault()} onClick={() => selectProduct(product)}>
                                                <span>{product.product_name}</span>
                                                <small>{product.cat_number}</small>
                                            </button>
                                        ))}
                                        {order.description.trim() && !products.some((product) => product.product_name.toLowerCase() === order.description.trim().toLowerCase()) && (
                                            <button type="button" className="combobox-option" onMouseDown={(e) => e.preventDefault()} onClick={useNewProduct}>
                                                <span>Add "{order.description}" as a new product</span>
                                            </button>
                                        )}
                                        {matchingProducts.length === 0 && !order.description.trim() && <span className="combobox-empty">No products found for this supplier</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Supplier</label>
                            <select name="supplier" value={order.supplier} onChange={handleChange} disabled={isLoadingSuppliers} required>
                                <option value="">{isLoadingSuppliers ? 'Loading suppliers...' : 'Select Supplier'}</option>
                                {suppliers.map((supplier) => (
                                    <option key={supplier.supplier_id} value={supplier.supplier_name}>
                                        {supplier.supplier_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Cat Number</label>
                            <div className="supplier-combobox" onMouseLeave={() => setIsCatalogNumberListOpen(false)}>
                                <input type="text" name="cat_number" value={order.cat_number} onChange={handleCatalogNumberChange} onFocus={() => { setIsCatalogNumberListOpen(true); setIsProductListOpen(false); }} placeholder={order.supplier ? 'Select or enter a catalog number' : 'Select a supplier first'} disabled={!order.supplier || isLoadingProducts} autoComplete="off" />
                                <button type="button" className="combobox-toggle" onClick={() => setIsCatalogNumberListOpen(!isCatalogNumberListOpen)} disabled={!order.supplier || isLoadingProducts} aria-label="Show supplier catalog numbers" aria-expanded={isCatalogNumberListOpen}>
                                    <span className="combobox-arrow" aria-hidden="true" />
                                </button>
                                {isCatalogNumberListOpen && (
                                    <div className="combobox-options" role="listbox">
                                        {matchingCatalogNumbers.map((product) => (
                                            <button type="button" key={product.product_id} className="combobox-option" onMouseDown={(e) => e.preventDefault()} onClick={() => selectProduct(product)}>
                                                <span>{product.cat_number}</span>
                                                <small>{product.product_name}</small>
                                            </button>
                                        ))}
                                        {order.cat_number.trim() && !products.some((product) => product.cat_number.toLowerCase() === order.cat_number.trim().toLowerCase()) && (
                                            <button type="button" className="combobox-option" onMouseDown={(e) => e.preventDefault()} onClick={useNewProduct}>
                                                <span>Add "{order.cat_number}" as a new catalog number</span>
                                            </button>
                                        )}
                                        {matchingCatalogNumbers.length === 0 && !order.cat_number.trim() && <span className="combobox-empty">No catalog numbers found for this supplier</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Quote Number</label>
                            <input type="text" name="quote_number" value={order.quote_number} onChange={handleChange} placeholder="Quote Number" />
                        </div>
                    </div>
                </div>

                {/* Section 2: Purchasing & Financial Info */}
                <div className="form-section">
                    <h3 className="section-title">Financial & Purchasing</h3>
                    <div className="form-grid grid-3">
                        <div className="form-group">
                            <label>Budget</label>
                            <select
                                name="budget"
                                value={order.budget}
                                onChange={handleChange}
                                disabled={isLoadingBudgets || budgets.length === 0}
                            >
                                <option value="">
                                    {isLoadingBudgets ? 'Loading budgets...' : 'Select Budget'}
                                </option>
                                {budgets.map((budget) => (
                                    <option key={budget.budget_id ?? budget.budget_name} value={budget.budget_name}>
                                        {budget.budget_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>PO Number</label>
                            <input type="text" name="po_number" value={order.po_number} onChange={handleChange} placeholder="PO Number" />
                        </div>
                        <div className="form-group">
                            <label>Amount (Quantity)</label>
                            <input type="number" name="amount" value={order.amount} onChange={handleChange} placeholder="0" />
                        </div>
                        <div className="form-group">
                            <label>Price</label>
                            <input type="number" name="price" value={order.price} onChange={handleChange} placeholder="0.00" />
                        </div>
                        <div className="form-group">
                            <label>Currency</label>
                            <select name="currency" value={order.currency} onChange={handleChange}>
                                <option value="">Select Currency</option>
                                <option value="ILS">ILS</option>
                                <option value="USD">USD</option>
                                <option value="Euro">Euro</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Total Price (NIS)</label>
                            <input type="number" name="total_price_nis" value={order.total_price_nis} onChange={handleChange} placeholder="0.00" />
                        </div>
                    </div>
                </div>

                {/* Section 3: Status & Comments */}
                <div className="form-section">
                    <h3 className="section-title">Status & Notes</h3>
                    <div className="form-grid grid-1-2">
                        <div className="form-group checkbox-card">
                            <label>
                                <span>Status</span>
                                <select name="status" value={order.status} onChange={(e) => setOrder({ ...order, status: e.target.value as Order['status'] })}>
                                    <option value="pending">Pending</option>
                                    <option value="received">Received</option>
                                    <option value="canceled">Canceled</option>
                                </select>
                            </label>
                        </div>
                        <div className="form-group">
                            <label>Comments</label>
                            <div className="comments-with-action">
                                <textarea name="comments" value={order.comments} onChange={handleChange} placeholder="Additional comments..." rows={2} />
                                <button type="submit" className="btn btn-primary">Add Order</button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}   
