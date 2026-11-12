import express from 'express';
import PageView from '../models/PageView.js';
import { geoFromHeaders } from '../utils/geo.js';

// Public page-view beacon. Accepts text/plain JSON so browsers send it
// without a CORS preflight. Always answers 204, even for ignored hits.
const router = express.Router();

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|monitor/i;

const deviceFrom = (ua = '') => {
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
};

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

const SITE_HOSTS = new Set(
  ['diaryofan-investor.vercel.app', 'localhost', hostOf(process.env.FRONTEND_URL || '')].filter(Boolean)
);

router.post('/', express.text({ type: '*/*', limit: '2kb' }), async (req, res) => {
  res.status(204).end();
  try {
    const ua = req.get('user-agent') || '';
    if (!ua || BOT_RE.test(ua)) return;

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const path = String(body.path || '').split('?')[0].slice(0, 300);
    if (!path.startsWith('/') || path.startsWith('/admin')) return;

    const referrer = hostOf(body.referrer);
    const slug = path.match(/^\/articles\/([^/]+)\/?$/)?.[1];

    await PageView.create({
      path,
      articleSlug: slug ? decodeURIComponent(slug) : undefined,
      referrer: SITE_HOSTS.has(referrer) ? '' : referrer,
      device: deviceFrom(ua),
      visitorId: typeof body.visitorId === 'string' ? body.visitorId.slice(0, 64) : undefined,
      ...geoFromHeaders(req),
    });
  } catch {
    // Tracking must never break the site; ignore malformed hits.
  }
});

export default router;
