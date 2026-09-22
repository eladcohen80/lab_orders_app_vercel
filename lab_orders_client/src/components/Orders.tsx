import { checkOrderManagementAuthorization, deleteOrder, getOrders, updateOrder } from '../services/orderService';
import type { Order } from '../types/Order';
import { FileSpreadsheet } from 'lucide-react';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import './Orders.css';

type SortKey = 'order_date' | 'description' | 'supplier' | 'budget' | 'status';
type SortDirection = 'ascending' | 'descending';
const ORDERS_PER_PAGE = 50;

export default function Orders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [message, setMessage] = useState<string>('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('order_date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('descending');
    const [exportFromDate, setExportFromDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    function getErrorMessage(error: unknown, fallback: string) {
        return error instanceof Error ? error.message : fallback;
    }

    function handleSort(nextSortKey: SortKey) {
        if (sortKey === nextSortKey) {
            setSortDirection((currentDirection) => currentDirection === 'ascending' ? 'descending' : 'ascending');
            setCurrentPage(0);
            return;
        }

        setSortKey(nextSortKey);
        setSortDirection('ascending');
        setCurrentPage(0);
    }

    function getSortIndicator(column: SortKey) {
        if (sortKey !== column) {
            return '';
        }

        return sortDirection === 'ascending' ? ' ↑' : ' ↓';
    }

    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const filteredOrders = orders.filter((order) => {
        const matchesDate = !exportFromDate || String(order.order_date).slice(0, 10) >= exportFromDate;
        const matchesSearch = !normalizedSearchTerm || [
            order.description,
            order.cat_number,
            order.quote_number,
            order.po_number,
            order.supplier,
            order.budget,
            order.currency,
            order.comments,
            order.status,
            order.order_date,
        ].some((value) => String(value ?? '').toLowerCase().includes(normalizedSearchTerm));
        return matchesDate && matchesSearch;
    });

    const sortedOrders = [...filteredOrders].sort((firstOrder, secondOrder) => {
        let comparison: number;

        if (sortKey === 'order_date') {
            comparison = new Date(firstOrder.order_date).getTime() - new Date(secondOrder.order_date).getTime();
        } else if (sortKey === 'status') {
            comparison = firstOrder.status.localeCompare(secondOrder.status);
        } else {
            comparison = firstOrder[sortKey].localeCompare(secondOrder[sortKey]);
        }

        return sortDirection === 'ascending' ? comparison : -comparison;
    });

    const totalPages = Math.ceil(sortedOrders.length / ORDERS_PER_PAGE);
    const visibleOrders = sortedOrders.slice(
        currentPage * ORDERS_PER_PAGE,
        (currentPage + 1) * ORDERS_PER_PAGE,
    );

    async function handleDelete(order: Order) {
        if (!order.order_id) {
            return;
        }

        try {
            await checkOrderManagementAuthorization();

            if (!window.confirm(`Delete order: ${order.description}?`)) {
                return;
            }

            await deleteOrder(order.order_id);
            setOrders((currentOrders) => currentOrders.filter((item) => item.order_id !== order.order_id));
            setSelectedOrder(null);
        } catch (error: unknown) {
            setMessage(getErrorMessage(error, 'Failed to delete order.'));
        }
    }

    function startEditing(order: Order) {
        setEditingOrder({
            ...order,
            order_date: new Date(order.order_date).toISOString().split('T')[0],
            status: order.status,
        });
    }

    function handleEditChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
        if (!editingOrder) {
            return;
        }

        const { name, value, type } = event.target;
        setEditingOrder({
            ...editingOrder,
            [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value,
        });
    }

    function handleExport() {
        const ordersToExport = exportFromDate
            ? orders.filter((order) => String(order.order_date).slice(0, 10) >= exportFromDate)
            : orders;
        if (ordersToExport.length === 0) {
            setMessage(exportFromDate ? 'No orders were found from the selected date.' : 'No orders were found.');
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(ordersToExport.map((order) => ({
            'Order ID': order.order_id ?? '',
            Date: String(order.order_date).slice(0, 10),
            Description: order.description,
            'Cat #': order.cat_number,
            'Quote #': order.quote_number,
            'PO #': order.po_number,
            Supplier: order.supplier,
            Budget: order.budget,
            Amount: order.amount,
            Price: order.price,
            Currency: order.currency,
            'Total (NIS)': order.total_price_nis,
            Status: order.status,
            Comments: order.comments,
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
        XLSX.writeFile(workbook, exportFromDate ? `orders-from-${exportFromDate}.xlsx` : 'all-orders.xlsx');
        setMessage('');
    }

    async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!editingOrder?.order_id) {
            return;
        }

        try {
            await updateOrder(editingOrder);
            setOrders((currentOrders) => currentOrders.map((order) =>
                order.order_id === editingOrder.order_id ? editingOrder : order,
            ));
            setSelectedOrder(editingOrder);
            setEditingOrder(null);
            setMessage('');
        } catch (error: unknown) {
            setMessage(getErrorMessage(error, 'Failed to update order.'));
        }
    }

    useEffect(() => {
        setIsLoading(true);
        void getOrders()
            .then((data) => {
                setOrders(data);
                setMessage('');
            })
            .catch((error: unknown) => {
                setMessage(getErrorMessage(error, 'Failed to load orders.'));
                setOrders([]);
            })
            .finally(() => setIsLoading(false));
    }, []);

    return (
        <div className="orders-container">
            <div className="orders-title-row">
                <h2>Orders List</h2>
                <label className="list-search" aria-label="Search orders">
                    <input
                        type="search"
                        value={searchTerm}
                        onChange={(event) => {
                            setSearchTerm(event.target.value);
                            setCurrentPage(0);
                        }}
                        placeholder="Search orders"
                    />
                </label>
                <div className="orders-export" aria-label="Export orders to Excel">
                    <label htmlFor="export-from-date">From date</label>
                    <input
                        id="export-from-date"
                        type="date"
                        value={exportFromDate}
                        onChange={(event) => setExportFromDate(event.target.value)}
                    />
                    <span className="export-action-label">
                        <span>Export</span>
                        <button
                            type="button"
                            className="export-button"
                            onClick={handleExport}
                            title="Export orders to Excel"
                            aria-label="Export orders to Excel"
                        >
                            <FileSpreadsheet size={21} aria-hidden="true" />
                        </button>
                    </span>
                </div>
            </div>
            {message && <p className="error-message">{message}</p>}
            {isLoading ? (
                <p className="loading-state" role="status" aria-live="polite">
                    Loading<span className="loading-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
                </p>
            ) : filteredOrders.length === 0 && !message ? (
                <p className="no-orders">No orders match the selected filters.</p>
            ) : (
                <div className="orders-list">
                    <div className="order-header" role="row">
                        <button type="button" className="sort-button" onClick={() => handleSort('order_date')} aria-sort={sortKey === 'order_date' ? sortDirection : 'none'}>Date{getSortIndicator('order_date')}</button>
                        <button type="button" className="sort-button" onClick={() => handleSort('description')} aria-sort={sortKey === 'description' ? sortDirection : 'none'}>Description{getSortIndicator('description')}</button>
                        <button type="button" className="sort-button" onClick={() => handleSort('supplier')} aria-sort={sortKey === 'supplier' ? sortDirection : 'none'}>Supplier{getSortIndicator('supplier')}</button>
                        <button type="button" className="sort-button" onClick={() => handleSort('budget')} aria-sort={sortKey === 'budget' ? sortDirection : 'none'}>Budget{getSortIndicator('budget')}</button>
                        <span className="column-header">Total price(ILS)</span>
                        <button type="button" className="sort-button" onClick={() => handleSort('status')} aria-sort={sortKey === 'status' ? sortDirection : 'none'}>Status{getSortIndicator('status')}</button>
                        <span className="actions-header">Actions</span>
                    </div>
                    {visibleOrders.map((order) => (
                        <article className="order-row" key={order.order_id}>
                                <time className="order-date" dateTime={String(order.order_date)}>
                                {new Date(order.order_date).toLocaleDateString()}
                            </time>
                            <p className="order-description">{order.description || `Order #${order.order_id}`}</p>
                            <span className="order-supplier">{order.supplier || 'No supplier'}</span>
                            <span className="order-budget">{order.budget || '-'}</span>
                            <span className="order-total">
                                {Number.isFinite(Number(order.total_price_nis))
                                    ? `₪${Number(order.total_price_nis).toLocaleString('en-US')}`
                                    : '-'}
                            </span>
                            <span className={`order-status order-status-${order.status}`}>
                                {order.status}
                            </span>
                            <div className="order-actions">
                                <button type="button" className="details-button" onClick={() => setSelectedOrder(order)}>
                                    Details
                                </button>
                                <button type="button" className="delete-button" onClick={() => handleDelete(order)}>
                                    Delete
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <nav className="orders-pagination" aria-label="Orders pages">
                    <button
                        type="button"
                        className="pagination-button"
                        onClick={() => setCurrentPage((page) => page - 1)}
                        disabled={currentPage === 0}
                    >
                        Previous
                    </button>
                    <span className="pagination-status">
                        Page {currentPage + 1} of {totalPages}
                    </span>
                    <button
                        type="button"
                        className="pagination-button"
                        onClick={() => setCurrentPage((page) => page + 1)}
                        disabled={currentPage === totalPages - 1}
                    >
                        Next 50
                    </button>
                </nav>
            )}

            {selectedOrder && (
                <div className="order-modal-backdrop" role="presentation" onMouseDown={() => { setSelectedOrder(null); setEditingOrder(null); }}>
                    <section className="order-modal" role="dialog" aria-modal="true" aria-labelledby="order-details-title" onMouseDown={(event) => event.stopPropagation()}>
                        <div className="order-modal-header">
                            <h3 id="order-details-title">{editingOrder ? 'Update Order' : 'Order Details'}</h3>
                            <button type="button" className="close-button" aria-label="Close order details" onClick={() => { setSelectedOrder(null); setEditingOrder(null); }}>
                                Close
                            </button>
                        </div>
                        {editingOrder ? (
                            <form className="order-edit-form" onSubmit={handleUpdate}>
                                <label>Date<input type="date" name="order_date" value={String(editingOrder.order_date)} onChange={handleEditChange} required /></label>
                                <label>Description<input type="text" name="description" value={editingOrder.description} onChange={handleEditChange} required /></label>
                                <label>Supplier<input type="text" name="supplier" value={editingOrder.supplier} onChange={handleEditChange} /></label>
                                <label>Cat #<input type="text" name="cat_number" value={editingOrder.cat_number} onChange={handleEditChange} /></label>
                                <label>Quote #<input type="text" name="quote_number" value={editingOrder.quote_number} onChange={handleEditChange} /></label>
                                <label>PO #<input type="text" name="po_number" value={editingOrder.po_number} onChange={handleEditChange} /></label>
                                <label>Budget<input type="text" name="budget" value={editingOrder.budget} onChange={handleEditChange} /></label>
                                <label>Amount<input type="number" name="amount" value={editingOrder.amount} onChange={handleEditChange} /></label>
                                <label>Price<input type="number" name="price" value={editingOrder.price} onChange={handleEditChange} /></label>
                                <label>Currency<select name="currency" value={editingOrder.currency} onChange={handleEditChange}><option value="">Select Currency</option><option value="ILS">ILS</option><option value="USD">USD</option><option value="Euro">Euro</option></select></label>
                                <label>Total (NIS)<input type="number" name="total_price_nis" value={editingOrder.total_price_nis} onChange={handleEditChange} /></label>
                                <fieldset className="status-field">
                                    <legend>Status</legend>
                                    {(['pending', 'received', 'canceled'] as const).map((status) => (
                                        <label key={status} className="status-option">
                                            <input type="radio" name="status" value={status} checked={editingOrder.status === status} onChange={() => setEditingOrder({ ...editingOrder, status })} />
                                            {status}
                                        </label>
                                    ))}
                                </fieldset>
                                <label className="comments-field">Comments<textarea name="comments" value={editingOrder.comments} onChange={handleEditChange} rows={3} /></label>
                                <div className="order-edit-actions"><button type="button" className="close-button" onClick={() => setEditingOrder(null)}>Cancel</button><button type="submit" className="update-button">Save Changes</button></div>
                            </form>
                        ) : (
                            <>
                                <dl className="order-details">
                                    <div className="order-detail-primary"><dt>Date</dt><dd>{new Date(selectedOrder.order_date).toLocaleDateString()}</dd></div>
                                    <div className="order-detail-primary order-detail-description"><dt>Description</dt><dd>{selectedOrder.description || '-'}</dd></div>
                                    <div><dt>Supplier</dt><dd>{selectedOrder.supplier || '-'}</dd></div>
                                    <div><dt>Cat #</dt><dd>{selectedOrder.cat_number || '-'}</dd></div>
                                    <div><dt>Quote #</dt><dd>{selectedOrder.quote_number || '-'}</dd></div>
                                    <div><dt>PO #</dt><dd>{selectedOrder.po_number || '-'}</dd></div>
                                    <div><dt>Budget</dt><dd>{selectedOrder.budget || '-'}</dd></div>
                                    <div><dt>Amount</dt><dd>{selectedOrder.amount}</dd></div>
                                    <div><dt>Price</dt><dd>{selectedOrder.price} {selectedOrder.currency}</dd></div>
                                    <div><dt>Total (NIS)</dt><dd>{selectedOrder.total_price_nis}</dd></div>
                                    <div className="order-detail-status"><dt>Status</dt><dd><span className={`order-status order-status-${selectedOrder.status}`}>{selectedOrder.status}</span></dd></div>
                                    <div className="order-detail-comments"><dt>Comments</dt><dd>{selectedOrder.comments || '-'}</dd></div>
                                </dl>
                                <div className="order-edit-actions"><button type="button" className="update-button" onClick={() => startEditing(selectedOrder)}>Update Order</button></div>
                            </>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}


