import {Request, Response} from "express";
import sql from '../db';
import { AuthRequest } from "../middleware/authMiddleware";
import { deleteDocumentBySourceKey, syncSupplierDocument } from "../services/ragSyncService";

export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const result = await sql`SELECT * FROM suppliers`;
    res.json(result);
  }
    catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  } 
}
  export const getSupplierById = async (req: Request, res: Response) => {
    const { id } = req.params;  
    try {
        const result = await sql`SELECT * FROM suppliers WHERE supplier_id = ${id}`;
        if (result.length === 0) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        res.json(result[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  export const createSupplier = async (req: AuthRequest, res: Response) => {
    try {
      const { supplier_name, contact_person, email, phone } = req.body;
      if (!supplier_name) {
        return res.status(400).json({ error: 'Missing supplier name' });
      }
      const result = await sql`
        INSERT INTO suppliers (supplier_name, contact_person, email, phone)
        VALUES (${supplier_name}, ${contact_person}, ${email}, ${phone})
        RETURNING *`;
        await syncSupplierDocument(result[0].supplier_id);
        res.status(201).json({ message: 'Supplier created successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
    }

    export const updateSupplier = async (req: AuthRequest, res: Response) => {
      const { id } = req.params;
      const { supplier_name, contact_person, email, phone } = req.body;
      if (!supplier_name) {
        return res.status(400).json({ error: 'Missing supplier name' });
      } 
      const parsedId = Number(id);
      try {
        const result = await sql`UPDATE suppliers SET supplier_name = ${supplier_name}, contact_person = ${contact_person}, email = ${email}, phone = ${phone} WHERE supplier_id = ${parsedId} RETURNING *`;
        if (result.length === 0) {
          return res.status(404).json({ error: 'Supplier not found' });
        }
        await syncSupplierDocument(parsedId);
        res.json({ message: 'Supplier updated successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    export const deleteSupplier = async (req: AuthRequest, res: Response) => {
      const { id } = req.params;
      const parsedId = Number(id);
        try {
            const result = await sql`DELETE FROM suppliers WHERE supplier_id = ${parsedId}`;
            if (result.length === 0) {
                return res.status(404).json({ error: 'Supplier not found' });
            }
            await deleteDocumentBySourceKey(`supplier:${parsedId}`);
            res.json({ message: 'Supplier deleted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

