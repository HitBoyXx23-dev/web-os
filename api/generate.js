import { sendImage } from '../lib/generate.js';

export default function handler(req, res) {
  return sendImage(req, res);
}
