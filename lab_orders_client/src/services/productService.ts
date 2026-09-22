import type { Product } from '../types/Product';
import { BASE_URL } from './apiConfig';

const API_URL = `${BASE_URL}/products`;

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
    };
};

export const getProducts = async (supplier: string): Promise<Product[]> => {
    const response = await fetch(`${API_URL}?supplier=${encodeURIComponent(supplier)}`, {
        headers: getHeaders(),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
};

export const updateProduct = async (product: Product): Promise<Product> => {
    const response = await fetch(`${API_URL}/${product.product_id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(product),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
};

export const deleteProduct = async (productId: number): Promise<void> => {
    const response = await fetch(`${API_URL}/${productId}`, {
        method: 'DELETE',
        headers: getHeaders(),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
};