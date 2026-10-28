import { sendImage } from '../lib/generate.js';
import { readJson, sendMoss } from '../lib/moss.js';

export default async function handler(req, res) {
  if (req.method === 'POST') req.body = await readJson(req);
  const style = String((req.body && req.body.style) || req.query?.style || '');
  if (style === 'moss') return sendMoss(req, res);
  return sendImage(req, res);
}
