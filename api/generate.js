import { sendImage } from '../lib/generate.js';
import { isHorde, readJson, sendMoss } from '../lib/moss.js';

export default async function handler(req, res) {
  if (req.method === 'POST') req.body = await readJson(req);
  const style = String((req.body && req.body.style) || req.query?.style || '');
  if (isHorde(style)) return sendMoss(req, res);
  return sendImage(req, res);
}
