import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET as string;

const ensureAdmin = (req: any, res: any): boolean => {
  const auth = req.headers.authorization || '';
  const [, token] = auth.split(' ');
  if (!token || !ADMIN_JWT_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  try {
    const decoded: any = jwt.verify(token, ADMIN_JWT_SECRET);
    if (decoded.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return false;
    }
    return true;
  } catch {
    res.status(401).json({ error: 'Invalid token' });
    return false;
  }
};

const allowedTables = new Set([
  'batteries',
  'inverters',
  'solar_panels',
  'ev_chargers',
  'heat_pumps',
  'kits',
  'products',
]);

export default async function handler(req: any, res: any) {
  if (!ensureAdmin(req, res)) return;

  const { method } = req;

  if (method === 'GET') {
    const { table } = req.query;
    if (table && !allowedTables.has(String(table))) {
      return res.status(400).json({ error: 'Invalid table' });
    }

    try {
      if (table) {
        const { data, error } = await supabaseAdmin.from(String(table)).select('*');
        if (error) throw error;
        return res.status(200).json({ data });
      }

      const tables = Array.from(allowedTables);
      const results = await Promise.all(
        tables.map((t) => supabaseAdmin.from(t).select('*')),
      );
      const combined = tables.reduce(
        (acc, t, i) => ({
          ...acc,
          [t]: results[i].data || [],
        }),
        {} as Record<string, any[]>,
      );
      return res.status(200).json({ data: combined });
    } catch (err: any) {
      console.error('[admin/products] GET error', err.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (method === 'POST') {
    const { table, payload } = req.body || {};
    if (!table || !allowedTables.has(String(table))) {
      return res.status(400).json({ error: 'Invalid table' });
    }
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    try {
      const { data, error } = await supabaseAdmin.from(String(table)).insert([payload]).select();
      if (error) throw error;
      return res.status(201).json({ data });
    } catch (err: any) {
      console.error('[admin/products] POST error', err.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (method === 'PUT') {
    const { table, id, payload } = req.body || {};
    if (!table || !allowedTables.has(String(table))) {
      return res.status(400).json({ error: 'Invalid table' });
    }
    if (!id) {
      return res.status(400).json({ error: 'Missing id' });
    }
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    try {
      const { data, error } = await supabaseAdmin
        .from(String(table))
        .update(payload)
        .eq('id', id)
        .select();
      if (error) throw error;
      return res.status(200).json({ data });
    } catch (err: any) {
      console.error('[admin/products] PUT error', err.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (method === 'DELETE') {
    const { table, id } = req.body || {};
    if (!table || !allowedTables.has(String(table))) {
      return res.status(400).json({ error: 'Invalid table' });
    }
    if (!id) {
      return res.status(400).json({ error: 'Missing id' });
    }
    try {
      const { error } = await supabaseAdmin.from(String(table)).delete().eq('id', id);
      if (error) throw error;
      return res.status(204).end();
    } catch (err: any) {
      console.error('[admin/products] DELETE error', err.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

