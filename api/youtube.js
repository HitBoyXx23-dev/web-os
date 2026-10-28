import { sendYouTube } from '../lib/youtube.js';

export default function handler(req, res) {
  return sendYouTube(req, res);
}
