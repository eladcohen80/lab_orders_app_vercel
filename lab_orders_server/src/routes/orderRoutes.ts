import { Router } from 'express';
import { getOrders, getOrderById, createOrder, updateOrder, deleteOrder, checkOrderManagementAuthorization } from '../controllers/orderController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/',authMiddleware, getOrders);
router.get('/authorization', authMiddleware, checkOrderManagementAuthorization);
router.get('/:id',authMiddleware, getOrderById);
router.post('/',authMiddleware, createOrder);
router.put('/:id',authMiddleware, updateOrder);
router.delete('/:id',authMiddleware, deleteOrder);
export default router;
