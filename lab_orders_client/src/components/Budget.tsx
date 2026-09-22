import {getBudgets, updateBudget, deleteBudget} from "../services/budgetService";
import { useEffect, useState } from "react";
import type { Budget } from "../types/Budget";
import './Budget.css';

type SortKey = keyof Budget | null;
type SortDirection = 'ascending' | 'descending' | null;

export default function Budgets() {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [sortKey, setSortKey] = useState<SortKey>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

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
    const filteredBudgets = normalizedSearchTerm
        ? budgets.filter((budget) => [budget.budget_name, budget.budget_balance]
            .some((value) => String(value ?? '').toLowerCase().includes(normalizedSearchTerm)))
        : budgets;

    const sortedBudgets = [...filteredBudgets].sort((firstBudget, secondBudget) => {
        if (sortKey === null || sortDirection === null) {
            return 0;
        }
        const firstValue = String(firstBudget[sortKey] ?? '');
        const secondValue = String(secondBudget[sortKey] ?? '');
        if (firstValue < secondValue) {
            return sortDirection === 'ascending' ? -1 : 1;
        }
        if (firstValue > secondValue) {
            return sortDirection === 'ascending' ? 1 : -1;
        }
        return 0;
    });

    async function fetchBudgets() {
        setIsLoading(true);
        try {
            const data = await getBudgets();
            setBudgets(data);
            setMessage('');
        } catch (error: any) {
            console.error('Error fetching budgets:', error);
            setMessage(getErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchBudgets();
    }, []);

    async function handleUpdateBudget(updatedBudget: Budget) {
        try {
            const updated = await updateBudget(updatedBudget);
            setBudgets(prevBudgets => prevBudgets.map(budget => budget.budget_id === updated.budget_id ? updated : budget));
            setEditingBudget(null);
            setMessage('Budget updated successfully');
        } catch (error: any) {
            console.error('Error updating budget:', error);
            setMessage(getErrorMessage(error));
        }
    }

    function handleEditChange(event: React.ChangeEvent<HTMLInputElement>) {
        if (!editingBudget) {
            return;
        }

        setEditingBudget({
            ...editingBudget,
            [event.target.name]: event.target.name === 'budget_balance'
                ? Number(event.target.value)
                : event.target.value,
        });
    }

    function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (editingBudget) {
            void handleUpdateBudget(editingBudget);
        }
    }

    async function handleDeleteBudget(budgetId: number) {
        if (!window.confirm('Are you sure you want to delete this budget?')) {
            return;
        }
        try {
            await deleteBudget(budgetId);
            setBudgets(prevBudgets => prevBudgets.filter(budget => budget.budget_id !== budgetId));
            setMessage('Budget deleted successfully');
        }
        catch (error: any) {
            console.error('Error deleting budget:', error);
            setMessage(getErrorMessage(error));
        }
    }

    return (
        <div className="budget-container">
            <div className="list-title-row">
                <h1>Budgets</h1>
                <label className="list-search" aria-label="Search budgets">
                    <input
                        type="search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search by name or balance"
                    />
                </label>
            </div>
            {message && <p className="message">{message}</p>}
            {isLoading ? (
                <p className="loading-state" role="status" aria-live="polite">
                    Loading<span className="loading-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
                </p>
            ) : budgets.length === 0 && !message ? (
                <p>No budgets available.</p>
            ) : filteredBudgets.length === 0 ? (
                <p>No budgets match your search.</p>
            ) : (
                <table className="budget-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('budget_name')}>Name{getSortIndicator('budget_name')}</th>
                            <th onClick={() => handleSort('budget_balance')}>Balance{getSortIndicator('budget_balance')}</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedBudgets.map(budget => (
                            <tr key={budget.budget_id}>
                                <td>{budget.budget_name}</td>
                                <td>{budget.budget_balance} ILS</td>
                                <td>
                                    <button onClick={() => setEditingBudget({ ...budget })}>Edit</button>
                                    <button onClick={() => handleDeleteBudget(budget.budget_id!)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>    
                </table>
            )}
            {editingBudget && (
                <div className="budget-modal-backdrop" onClick={() => setEditingBudget(null)}>
                    <form className="budget-edit-modal" onSubmit={handleEditSubmit} onClick={(event) => event.stopPropagation()}>
                        <h2>Update Budget</h2>
                        <div className="form-group">
                            <label htmlFor="edit-budget-name">Budget Name</label>
                            <input
                                id="edit-budget-name"
                                name="budget_name"
                                type="text"
                                value={editingBudget.budget_name}
                                onChange={handleEditChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="edit-budget-balance">Budget Balance</label>
                            <input
                                id="edit-budget-balance"
                                name="budget_balance"
                                type="number"
                                value={editingBudget.budget_balance}
                                onChange={handleEditChange}
                                required
                            />
                        </div>
                        <div className="budget-edit-actions">
                            <button type="button" onClick={() => setEditingBudget(null)}>Cancel</button>
                            <button type="submit">Update</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
