/**
 * Cart line id is either product UUID or `productId-timestamp` for kits.
 * Strip trailing `-<digits>` (timestamp suffix) to recover catalog product id.
 */
export function cartLineIdToProductId(lineId: string): string {
  const s = String(lineId || '');
  const m = s.match(/^(.*)-(\d{10,})$/);
  return m ? m[1] : s;
}

/** Orders that still need warehouse allocation (not cancelled / completed / refunded). */
export function orderCountsTowardStockDemand(order: {
  status?: string;
  order_status?: string;
}): boolean {
  const st = String(order.status || '').toLowerCase();
  const os = String(order.order_status || '').toLowerCase();
  if (os === 'cancelled' || st === 'cancelled') return false;
  if (os === 'in_transit' || os === 'delivered') return false;
  if (['delivered', 'expired', 'failed', 'refunded', 'shipped'].includes(st)) return false;
  return true;
}

export type StockDemandRow = {
  productId: string;
  displayName: string;
  orderedQty: number;
  stockQty: number;
  shortageQty: number;
  missingFromCatalog: boolean;
};

export function aggregateStockDemand(
  orders: any[],
  getStock: (productId: string) => { stock: number; found: boolean; name?: string }
): StockDemandRow[] {
  const qtyByProduct = new Map<string, { qty: number; sampleName: string }>();

  for (const o of orders || []) {
    if (!orderCountsTowardStockDemand(o)) continue;
    const items: any[] = Array.isArray(o.items) ? o.items : [];
    for (const it of items) {
      const pid = cartLineIdToProductId(it.id);
      const q = Math.max(1, Math.floor(Number(it.quantity) || 1));
      const name = typeof it.name === 'string' ? it.name : String(it.name?.en || it.name?.da || pid);
      const prev = qtyByProduct.get(pid);
      if (prev) prev.qty += q;
      else qtyByProduct.set(pid, { qty: q, sampleName: name });
    }
  }

  const rows: StockDemandRow[] = [];
  for (const [productId, { qty, sampleName }] of qtyByProduct) {
    const { stock, found, name } = getStock(productId);
    const stockQty = found ? stock : 0;
    const shortageQty = Math.max(0, qty - stockQty);
    rows.push({
      productId,
      displayName: name || sampleName,
      orderedQty: qty,
      stockQty,
      shortageQty,
      missingFromCatalog: !found,
    });
  }

  rows.sort((a, b) => b.shortageQty - a.shortageQty || b.orderedQty - a.orderedQty);
  return rows;
}
