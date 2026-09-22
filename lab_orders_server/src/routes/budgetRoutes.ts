import {Router} from 'express';
import {getBudgets, getBudgetById, createBudget, updateBudget, deleteBudget} from '../controllers/budgetController';
import {authMiddleware} from '../middleware/authMiddleware';

const router = Router();

router.get('/', authMiddleware, getBudgets);
router.get('/:id', authMiddleware, getBudgetById);
router.post('/', authMiddleware, createBudget);
router.put('/:id', authMiddleware, updateBudget);
router.delete('/:id', authMiddleware, deleteBudget);
export default router;