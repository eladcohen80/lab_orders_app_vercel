import {Request, Response} from "express";
import sql from '../db';
import { AuthRequest } from "../middleware/authMiddleware";
import { syncProductDocument } from "../services/ragSyncService";

export const getProducts = async (req: Request, res: Response) => {
  try {
    const supplier = typeof req.query.supplier === 'string' ? req.query.supplier.trim() : '';
    const result = supplier
      ? await sql`SELECT * FROM products WHERE LOWER(supplier) = LOWER(${supplier}) ORDER BY product_name`
      : await sql`SELECT * FROM products ORDER BY product_name`;
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;
    try {
    const result = await sql`SELECT * FROM products WHERE product_id = ${id}`;
    if (result.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result[0]);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
    try {
    const { product_name, cat_number, supplier, price_in_last_order } = req.body;
    const result = await sql`
      INSERT INTO products (product_name, cat_number, supplier, price_in_last_order)
      VALUES (${product_name}, ${cat_number || ''}, ${supplier || ''}, ${price_in_last_order || null})
        RETURNING *;
    `;
    await syncProductDocument(result[0].product_id);
    res.status(201).json(result[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { product_name, cat_number, supplier, price_in_last_order } = req.body;
  const parsedId = Number(id);
  try {
    const result = await sql`
      UPDATE products
      SET product_name = ${product_name}, cat_number = ${cat_number || ''}, supplier = ${supplier || ''}, price_in_last_order = ${price_in_last_order || null}
        WHERE product_id = ${parsedId}
        RETURNING *;
    `;
    if (result.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    await syncProductDocument(parsedId);
    res.json(result[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const parsedId = Number(id);
    try {
    const result = await sql`
      DELETE FROM products
      WHERE product_id = ${parsedId}
        RETURNING *;
    `;
    if (result.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
