import jwt from 'jsonwebtoken';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;

if (!ADMIN_PASSWORD || !ADMIN_JWT_SECRET) {
  console.warn('[admin/login] ADMIN_PASSWORD or ADMIN_JWT_SECRET is not configured');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ADMIN_PASSWORD || !ADMIN_JWT_SECRET) {
    return res.status(500).json({ error: 'Admin auth is not configured' });
  }

  const { password } = req.body || {};

  if (typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'Password is required' });
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    {
      role: 'admin',
      iat: Math.floor(Date.now() / 1000),
    },
    ADMIN_JWT_SECRET,
    { expiresIn: '8h' },
  );

  return res.status(200).json({ token });
}

