import type { Budget } from "../types/Budget";
import { BASE_URL } from "./apiConfig";

const API_URL = `${BASE_URL}/budgets`;

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
    };
}

export const addBudget = async (budget: Budget): Promise<Budget> => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name: budget.budget_name, balance: budget.budget_balance }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error('Error adding budget:', error);
        throw error;
    }
};

export const getBudgets = async (): Promise<Budget[]> => {
    const response = await fetch(API_URL, {
        headers: getHeaders(),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

export const updateBudget = async (budget: Budget): Promise<Budget> => {
    try {
        const response = await fetch(`${API_URL}/${budget.budget_id}`, {    
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ name: budget.budget_name, balance: budget.budget_balance }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error('Error updating budget:', error);
        throw error;
    }
};

export const deleteBudget = async (budget_id: number): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/${budget_id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error deleting budget:', error);
        throw error;
    }
};