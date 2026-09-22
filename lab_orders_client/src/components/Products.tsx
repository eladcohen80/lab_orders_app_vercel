import {deleteProduct, getProducts, updateProduct} from "../services/productService";
import { useEffect, useState } from "react";
import type { Product } from "../types/Product";
import './Products.css';

type SortKey = keyof Product | null;
type SortDirection = 'ascending' | 'descending' | null;

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
        const [isLoading, setIsLoading] = useState(true);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
    const filteredProducts = normalizedSearchTerm
        ? products.filter((product) => [
            product.product_name,
            product.cat_number,
            product.supplier,
        ].some((value) => String(value ?? '').toLowerCase().includes(normalizedSearchTerm)))
        : products;

    const sortedProducts = [...filteredProducts].sort((firstProduct, secondProduct) => {    
        if (sortKey === null || sortDirection === null) {
            return 0;
        }
        const firstValue = String(firstProduct[sortKey] ?? '');
        const secondValue = String(secondProduct[sortKey] ?? '');
        if (firstValue < secondValue) {
            return sortDirection === 'ascending' ? -1 : 1;
        }
        if (firstValue > secondValue) {
            return sortDirection === 'ascending' ? 1 : -1;
        }
        return 0;
    });
    async function fetchProducts() {
        setIsLoading(true);
        try {
            const data = await getProducts('');
            setProducts(data);
            setMessage('');
        } catch (error: any) {
            console.error('Error fetching products:', error);
            setMessage(getErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchProducts();
    }, []);

    function handleEditChange(event: React.ChangeEvent<HTMLInputElement>) {
        if (!editingProduct) {
            return;
        }

        setEditingProduct({
            ...editingProduct,
            [event.target.name]: event.target.value,
        });
    }

    async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!editingProduct) {
            return;
        }

        try {
            const updatedProduct = await updateProduct(editingProduct);
            setProducts((currentProducts) => currentProducts.map((product) => product.product_id === updatedProduct.product_id ? updatedProduct : product));
            setEditingProduct(null);
            setMessage('Product updated successfully');
        } catch (error: any) {
            setMessage(getErrorMessage(error));
        }
    }

    async function handleDelete(productId: number) {
        if (!window.confirm('Are you sure you want to delete this product?')) {
            return;
        }

        try {
            await deleteProduct(productId);
            setProducts((currentProducts) => currentProducts.filter((product) => product.product_id !== productId));
            setMessage('Product deleted successfully');
        } catch (error: any) {
            setMessage(getErrorMessage(error));
        }
    }

    return (
        <div className="products-container">
            <div className="list-title-row">
                <h2>Products</h2>
                <label className="list-search" aria-label="Search products">
                    <input
                        type="search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search by name, catalog or supplier"
                    />
                </label>
            </div>
            {message && <p className="error-message">{message}</p>}
            {isLoading ? (
                <p className="loading-state" role="status" aria-live="polite">
                    Loading<span className="loading-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
                </p>
            ) : products.length === 0 && !message ? (
                <p>No products found.</p>
            ) : filteredProducts.length === 0 ? (
                <p>No products match your search.</p>
            ) : (
                <div className="products-list">
                    <div className="products-header">
                        <button type="button" onClick={() => handleSort('product_name')}>Product Name{getSortIndicator('product_name')}</button>
                        <button type="button" onClick={() => handleSort('cat_number')}>Catalog Number{getSortIndicator('cat_number')}</button>
                        <button type="button" onClick={() => handleSort('supplier')}>Supplier{getSortIndicator('supplier')}</button>
                        <button type="button" onClick={() => handleSort('price_in_last_order')}>Last Price/Unit{getSortIndicator('price_in_last_order')}</button>
                        <span>Actions</span>
                    </div>
                    {sortedProducts.map((product) => (
                        <div className="product-row" key={product.product_id}>
                            <span>{product.product_name}</span>
                            <span>{product.cat_number || '-'}</span>
                            <span>{product.supplier || '-'}</span>
                            <span>{product.price_in_last_order || '-'}</span>
                            <span className="product-actions">
                                <button type="button" onClick={() => setEditingProduct({ ...product })}>Edit</button>
                                <button type="button" onClick={() => handleDelete(product.product_id!)}>Delete</button>
                            </span>
                        </div>
                    ))}
                </div>
            )}
            {editingProduct && (
                <div className="product-modal-backdrop" onClick={() => setEditingProduct(null)}>
                    <form className="product-edit-modal" onSubmit={handleEditSubmit} onClick={(event) => event.stopPropagation()}>
                        <h2>Edit Product</h2>
                        <label>
                            Product Name
                            <input name="product_name" value={editingProduct.product_name} onChange={handleEditChange} required />
                        </label>
                        <label>
                            Catalog Number
                            <input name="cat_number" value={editingProduct.cat_number} onChange={handleEditChange} />
                        </label>
                        <label>
                            Supplier
                            <input name="supplier" value={editingProduct.supplier} onChange={handleEditChange} />
                        </label>
                        <label>
                            Last Price/Unit
                            <input name="price_in_last_order" value={editingProduct.price_in_last_order ?? ''} onChange={handleEditChange} />
                        </label>
                        <div className="product-edit-actions">
                            <button type="button" onClick={() => setEditingProduct(null)}>Cancel</button>
                            <button type="submit">Update</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}