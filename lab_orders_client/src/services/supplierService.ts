import type { Supplier } from "../types/Supplier";
import { BASE_URL } from "./apiConfig";

const API_URL = `${BASE_URL}/suppliers`;

const getHeaders = () => {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : "",
    };
};

export const addSupplier = async (supplier: Supplier): Promise<void> => {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(supplier),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error("Error adding supplier:", error);
        throw error;
    }   
};

export const getSuppliers = async (): Promise<Supplier[]> => {
    try {
        const response = await fetch(API_URL, {
            headers: getHeaders(),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const suppliers: Supplier[] = await response.json();
        return suppliers;
    } catch (error) {
        console.error("Error fetching suppliers:", error);
        throw error;
    }   
};

export const updateSupplier = async (supplier: Supplier): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/${supplier.supplier_id}`, {
            method: "PUT",
            headers: getHeaders(),
            body: JSON.stringify(supplier),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error("Error updating supplier:", error);
        throw error;
    }
};

export const deleteSupplier = async (supplierId: number): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/${supplierId}`, {
            method: "DELETE",
            headers: getHeaders(),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error("Error deleting supplier:", error);
        throw error;
    }   
};