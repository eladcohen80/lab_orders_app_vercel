import { Router } from 'express';
import { getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier } from '../controllers/supplierController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authMiddleware, getSuppliers);
router.get('/:id', authMiddleware, getSupplierById);
router.post('/', authMiddleware, createSupplier);
router.put('/:id', authMiddleware, updateSupplier);
router.delete('/:id', authMiddleware, deleteSupplier);
export default router;
