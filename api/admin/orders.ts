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

export default async function handler(req: any, res: any) {
  if (!ensureAdmin(req, res)) return;

  const { method } = req;

  if (method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ data });
    } catch (err: any) {
      console.error('[admin/orders] GET error', err.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (method === 'PUT') {
    const { id, payload } = req.body || {};
    if (!id || !payload) {
      return res.status(400).json({ error: 'Missing id or payload' });
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .update(payload)
        .eq('id', id)
        .select();
      if (error) throw error;
      return res.status(200).json({ data });
    } catch (err: any) {
      console.error('[admin/orders] PUT error', err.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

