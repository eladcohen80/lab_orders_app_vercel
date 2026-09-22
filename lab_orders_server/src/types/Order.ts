export type Order = {
  order_id: number;
  order_date: Date;
  description: string;
  cat_number: string;
  quote_number: string;
  po_number: string;
  supplier: string;
  budget: string;
  amount: number;
  price: number;
  currency: string;
  total_price_nis: number;
  status: 'received' | 'pending' | 'canceled';
  comments: string;
}
