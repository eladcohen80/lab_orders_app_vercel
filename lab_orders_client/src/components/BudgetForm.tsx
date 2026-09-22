import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {addBudget} from '../services/budgetService';
import type {Budget} from '../types/Budget';
import './BudgetForm.css';

export default function BudgetForm() {
    const navigate = useNavigate();
    const [budget, setBudget] = useState<Budget>({
        budget_name: '',
        budget_balance: 0
    });

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await addBudget(budget);
            alert('Budget added successfully');
            navigate('/budgets');
        }
        catch (error: any) {
            console.error('Error adding budget:', error);
            alert(error.message || 'Failed to add budget');
        }
    };
    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setBudget({
            ...budget,
            [e.target.name]: e.target.name === 'budget_balance' ? Number(e.target.value) : e.target.value,
        });
    }
    
return (
        <div className="budget-form-container">
            <h2>Add New Budget</h2>
            <form onSubmit={handleSubmit} className="budget-form">
                <div className="form-group">
                    <label>Budget Name</label>
                    <input type="text" name="budget_name" value={budget.budget_name} onChange={handleChange} placeholder="Budget Name" required />
                </div>
                <div className="form-group">
                    <label>Budget Balance</label>
                    <input type="number" name="budget_balance" value={budget.budget_balance} onChange={handleChange} placeholder="Budget Balance" required />
                </div>
                <button type="submit" className="submit-button">Add Budget</button>
            </form>
        </div>
    );
}

