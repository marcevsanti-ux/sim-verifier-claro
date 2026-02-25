import { lookupSIM } from '../../lib/lookup';

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query parameter q' });
  const result = lookupSIM(q.trim());
  return res.status(200).json(result);
}
