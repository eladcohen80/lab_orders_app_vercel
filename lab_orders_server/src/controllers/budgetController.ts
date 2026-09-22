import { Request, Response } from 'express';
import sql from '../db';
import { AuthRequest } from '../middleware/authMiddleware';
import { deleteDocumentBySourceKey, syncBudgetDocument } from '../services/ragSyncService';

export const getBudgets = async (req: Request, res: Response) => {
  try {
    const result = await sql`SELECT * FROM budgets ORDER BY budget_name`;   
    res.json(result);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getBudgetById = async (req: Request, res: Response) => {
  const { id } = req.params;
    try {
    const result = await sql`SELECT * FROM budgets WHERE budget_id = ${id}`;
    if (result.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    res.json(result[0]);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createBudget = async (req: AuthRequest, res: Response) => {
    try {
    const { name, balance } = req.body;
    const result = await sql`
      INSERT INTO budgets (budget_name, budget_balance)
      VALUES (${name}, ${balance})
        RETURNING *;
    `;
    await syncBudgetDocument(result[0].budget_id);
    res.status(201).json(result[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateBudget = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, balance } = req.body;
    const parsedId = Number(id);
    try {
        const result = await sql`
      UPDATE budgets
      SET budget_name = ${name}, budget_balance = ${balance}
        WHERE budget_id = ${parsedId}
        RETURNING *;
    `;
    if (result.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    await syncBudgetDocument(parsedId);
    res.json(result[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteBudget = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const parsedId = Number(id);
    try {
    const result = await sql`
      DELETE FROM budgets
      WHERE budget_id = ${parsedId}
        RETURNING *;
    `;
    if (result.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }   
    await deleteDocumentBySourceKey(`budget:${parsedId}`);
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};