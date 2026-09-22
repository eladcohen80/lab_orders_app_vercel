import {Request, Response} from "express";
import sql from '../db';
import { AuthRequest } from "../middleware/authMiddleware";
import { deleteDocumentBySourceKey, syncOrderDocument, syncProductDocumentByKey } from "../services/ragSyncService";

const isCurrentUserAdmin = async (userId?: number) => {
  if (!userId) {
    return false;
  }

  const users = await sql`
    SELECT role
    FROM users
    WHERE user_id = ${userId}
  `;

  return users[0]?.role === 'admin';
};

const addProductIfMissing = async (description: string, catNumber: string, supplier: string, price: number, currency: string) => {
  const trimmedCatNumber = catNumber?.trim();
  const productName = description?.trim() || '';
  const supplierName = supplier?.trim() || '';
  const lastPrice = currency?.trim() ? `${price} ${currency.trim()}` : `${price}`;

  await sql`
    INSERT INTO products (product_name, cat_number, supplier, price_in_last_order)
    SELECT ${productName}, ${trimmedCatNumber || ''}, ${supplierName}, ${lastPrice}
    WHERE NOT EXISTS (
      SELECT 1 FROM products
      WHERE (
        ${trimmedCatNumber || ''} <> '' AND cat_number = ${trimmedCatNumber || ''} AND supplier = ${supplierName}
      ) OR (
        ${trimmedCatNumber || ''} = '' AND product_name = ${productName} AND supplier = ${supplierName}
      )
    )
  `;

  await sql`
    UPDATE products
    SET price_in_last_order = ${lastPrice}
    WHERE (
      ${trimmedCatNumber || ''} <> '' AND cat_number = ${trimmedCatNumber || ''} AND supplier = ${supplierName}
    ) OR (
      ${trimmedCatNumber || ''} = '' AND product_name = ${productName} AND supplier = ${supplierName}
    )
  `;
};

const subtractOrderCostFromBudget = async (budgetName: string, totalPriceNis: number) => {
  if (!budgetName?.trim() || totalPriceNis === 0) {
    return;
  }

  const updatedBudgets = await sql`
    UPDATE budgets
    SET budget_balance = budget_balance - ${totalPriceNis}
    WHERE LOWER(TRIM(budget_name)) = LOWER(TRIM(${budgetName}))
    RETURNING budget_id
  `;

  if (updatedBudgets.length === 0) {
    throw new Error(`Budget not found: ${budgetName}`);
  }
};

const restoreOrderCostToBudget = async (budgetName: string, totalPriceNis: number) => {
  if (!budgetName?.trim() || totalPriceNis === 0) {
    return;
  }

  const updatedBudgets = await sql`
    UPDATE budgets
    SET budget_balance = budget_balance + ${totalPriceNis}
    WHERE LOWER(TRIM(budget_name)) = LOWER(TRIM(${budgetName}))
    RETURNING budget_id
  `;

  if (updatedBudgets.length === 0) {
    throw new Error(`Budget not found: ${budgetName}`);
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const result = await sql`SELECT * FROM orders`;
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const checkOrderManagementAuthorization = async (req: AuthRequest, res: Response) => {
  try {
    if (!await isCurrentUserAdmin(req.user?.user_id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ authorized: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  const { id } = req.params;
    try {
    const result = await sql`SELECT * FROM orders WHERE order_id = ${id}`;
    if (result.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }   
    res.json(result[0]);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    if (!await isCurrentUserAdmin(req.user?.user_id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const {
      order_date,
      description,
      cat_number,
      quote_number,
      po_number,
      supplier,
      budget,
      amount,
      price,
      currency,
      total_price_nis,
      status,
      comments
    } = req.body;

    const parsedOrderDate = order_date ? order_date : new Date().toISOString().split('T')[0];
    const parsedAmount = amount !== '' && amount !== null && amount !== undefined ? Number(amount) : 0;
    const parsedPrice = price !== '' && price !== null && price !== undefined ? Number(price) : 0;
    const parsedTotalPriceNis = total_price_nis !== '' && total_price_nis !== null && total_price_nis !== undefined ? Number(total_price_nis) : 0;
    const parsedStatus = status === 'received' || status === 'canceled' ? status : 'pending';

    const result = await sql`
      INSERT INTO orders (
        order_date, description, cat_number, quote_number, po_number,
        supplier, budget, amount, price, currency, total_price_nis, status, comments
      ) VALUES (
        ${parsedOrderDate}, ${description || ''}, ${cat_number || ''}, ${quote_number || ''},
        ${po_number || ''}, ${supplier || ''}, ${budget || ''}, ${parsedAmount},
        ${parsedPrice}, ${currency || ''}, ${parsedTotalPriceNis}, ${parsedStatus}, ${comments || ''}
      ) RETURNING *
    `;
    await subtractOrderCostFromBudget(budget, parsedTotalPriceNis);
    await addProductIfMissing(description, cat_number, supplier, parsedPrice, currency);
    await syncOrderDocument(result[0].order_id);
    await syncProductDocumentByKey(description, cat_number, supplier);
    res.status(201).json(result[0]);
  } catch (error: any) {
    console.error('Create order error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

export const updateOrder = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { order_date, description, cat_number, quote_number, po_number, supplier, budget, amount, price, currency, total_price_nis, status, comments } = req.body;
  try {
    if (!await isCurrentUserAdmin(req.user?.user_id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const parsedStatus = status === 'received' || status === 'canceled' ? status : 'pending';
    const result = await sql`UPDATE orders SET order_date = ${order_date}, description = ${description}, cat_number = ${cat_number}, quote_number = ${quote_number}, po_number = ${po_number}, supplier = ${supplier}, budget = ${budget}, amount = ${amount}, price = ${price}, currency = ${currency}, total_price_nis = ${total_price_nis}, status = ${parsedStatus}, comments = ${comments} WHERE order_id = ${id} RETURNING *`;
    if (result.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await addProductIfMissing(description, cat_number, supplier, Number(price) || 0, currency);
    await syncOrderDocument(result[0].order_id);
    await syncProductDocumentByKey(description, cat_number, supplier);
    res.json(result[0]);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteOrder = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
    try {
    if (!await isCurrentUserAdmin(req.user?.user_id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const result = await sql`DELETE FROM orders WHERE order_id = ${id} RETURNING *`;
    if (result.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const deletedOrder = result[0];
    await restoreOrderCostToBudget(
      deletedOrder.budget,
      Number(deletedOrder.total_price_nis) || 0
    );
    await deleteDocumentBySourceKey(`order:${id}`);
    res.json({ message: 'Order deleted successfully' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
