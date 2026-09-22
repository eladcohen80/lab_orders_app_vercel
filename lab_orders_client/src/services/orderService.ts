import type { Order } from "../types/Order";
import { BASE_URL } from "./apiConfig";

const API_URL = `${BASE_URL}/orders`;

const getHeaders = () => {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : "",
    };
};

export const checkOrderManagementAuthorization = async (): Promise<void> => {
    const response = await fetch(`${API_URL}/authorization`, {
        headers: getHeaders(),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
};

export const addOrder = async (order: Order): Promise<void> => {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(order),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error("Error adding order:", error);
        throw error;
    }
};

export const getOrders = async (): Promise<Order[]> => {
    try {
        const response = await fetch(API_URL, {
            headers: getHeaders(),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const orders: Order[] = await response.json();
        return orders;
    } catch (error) {
        console.error("Error fetching orders:", error);
        throw error;
    }
};

export const updateOrder = async (order: Order): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/${order.order_id}`, {
            method: "PUT",
            headers: getHeaders(),
            body: JSON.stringify(order),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error("Error updating order:", error);
        throw error;
    }
};

export const deleteOrder = async (order_id: number): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/${order_id}`, {
            method: "DELETE",
            headers: getHeaders(),
        }); 
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error("Error deleting order:", error);
        throw error;
    }
};

        