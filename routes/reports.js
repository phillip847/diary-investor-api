import express from 'express';
import Article from '../models/Article.js';
import PageView from '../models/PageView.js';
import SessionBooking from '../models/SessionBooking.js';
import { Subscriber, NewsletterIssue } from '../models/Newsletter.js';
import NewsletterSend from '../models/NewsletterSend.js';
import { authenticateToken, requireReviewer } from '../middleware/auth.js';
import { countryName, regionName } from '../utils/geo.js';

// Dashboard reports for editors and admins. Every figure is scoped to the
// same date range so the numbers on the page always agree.
const router = express.Router();
router.use(authenticateToken, requireReviewer);

// Namibia is UTC+2 all year, so buckets use a fixed offset.
const TZ = '+02:00';
const OFFSET_MS = 2 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const RANGES = [7, 30, 90, 365];
const MAX_CUSTOM_DAYS = 3 * 366;

const unitFor = (days) => (days <= 31 ? 'day' : days <= 120 ? 'week' : 'month');

// Start of the bucket containing `date`, in local (UTC+2) wall-clock terms.
function truncate(date, unit) {
  const local = new Date(date.getTime() + OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  if (unit === 'week') local.setUTCDate(local.getUTCDate() - ((local.getUTCDay() + 6) % 7)); // Monday
  if (unit === 'month') local.setUTCDate(1);
  return local;
}

const keyOf = (local) => local.toISOString().slice(0, 10);

function bucketKeys(from, to, unit) {
  const keys = [];
  const cursor = truncate(from, unit);
  const end = truncate(to, unit);
  while (cursor <= end) {
    keys.push(keyOf(cursor));
    if (unit === 'day') cursor.setUTCDate(cursor.getUTCDate() + 1);
    else if (unit === 'week') cursor.setUTCDate(cursor.getUTCDate() + 7);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
}

const bucketExpr = (field, unit) => ({
  $dateToString: {
    format: '%Y-%m-%d',
    timezone: TZ,
    date: { $dateTrunc: { date: `$${field}`, unit, timezone: TZ, ...(unit === 'week' && { startOfWeek: 'monday' }) } },
  },
});

// Count documents per bucket, filling empty buckets with zero.
async function countSeries(Model, match, field, unit, keys) {
  const rows = await Model.aggregate([
    { $match: match },
    { $group: { _id: bucketExpr(field, unit), n: { $sum: 1 } } },
  ]);
  const byKey = Object.fromEntries(rows.map(r => [r._id, r.n]));
  return keys.map(key => ({ key, value: byKey[key] || 0 }));
}

async function topBy(Model, match, field, limit, emptyLabel) {
  const rows = await Model.aggregate([
    { $match: match },
    { $group: { _id: `$${field}`, value: { $sum: 1 } } },
    { $sort: { value: -1, _id: 1 } },
    { $limit: limit },
  ]);
  return rows.map(r => ({ label: r._id || emptyLabel, value: r.value }));
}

const between = (from, to) => ({ $gte: from, $lte: to });

// UTC instant of local (UTC+2) midnight at the start of a YYYY-MM-DD date.
function localMidnight(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || '');
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]) - OFFSET_MS;
  return Number.isNaN(t) || keyOf(new Date(t + OFFSET_MS)) !== ymd ? null : new Date(t);
}

// Either a preset (?days=7|30|90|365) or a custom ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive).
function resolveRange(query) {
  const now = new Date();
  if (query.from || query.to) {
    const start = localMidnight(query.from);
    const endDay = localMidnight(query.to);
    if (!start || !endDay) throw Object.assign(new Error('Dates must be valid and written as YYYY-MM-DD.'), { status: 400 });
    if (start > endDay) throw Object.assign(new Error('The start date must be on or before the end date.'), { status: 400 });
    if (start > now) throw Object.assign(new Error('The start date is in the future.'), { status: 400 });
    const days = Math.round((endDay - start) / DAY) + 1;
    if (days > MAX_CUSTOM_DAYS) throw Object.assign(new Error('Custom ranges can be at most three years.'), { status: 400 });
    const endOfDay = new Date(endDay.getTime() + DAY - 1);
    return { days, custom: true, from: start, to: endOfDay < now ? endOfDay : now };
  }
  const days = RANGES.includes(Number(query.days)) ? Number(query.days) : 30;
  // Start at local midnight so "last 7 days" means 7 whole calendar days.
  const from = new Date(truncate(new Date(now.getTime() - (days - 1) * DAY), 'day').getTime() - OFFSET_MS);
  return { days, custom: false, from, to: now };
}

// Newsletter sends in range: the send log, plus older sends made before the
// log existed (those only recorded a success count).
async function newsletterReport(from, to, unit, keys) {
  const [sends, loggedIssues, failures] = await Promise.all([
    NewsletterSend.find({ createdAt: between(from, to) }).select('-recipients').sort({ createdAt: -1 }).lean(),
    NewsletterSend.distinct('issue'),
    NewsletterSend.aggregate([
      { $match: { createdAt: between(from, to), failed: { $gt: 0 } } },
      { $sort: { createdAt: -1 } },
      { $unwind: '$recipients' },
      { $match: { 'recipients.status': 'failed' } },
      { $limit: 100 },
      { $project: { _id: 0, email: '$recipients.email', error: '$recipients.error', title: 1, sentAt: '$createdAt' } },
    ]),
  ]);
  const legacy = await NewsletterIssue.find({ sentAt: between(from, to), _id: { $nin: loggedIssues } })
    .select('title sentAt sentCount').lean();

  const history = [
    ...sends.map(s => ({
      id: String(s._id), title: s.title, sentAt: s.createdAt, sentBy: s.sentBy || null,
      total: s.total, sent: s.sent, failed: s.failed,
    })),
    ...legacy.map(i => ({
      id: String(i._id), title: i.title, sentAt: i.sentAt, sentBy: null,
      total: null, sent: i.sentCount || 0, failed: null, legacy: true,
    })),
  ].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

  const series = Object.fromEntries(keys.map(k => [k, { key: k, sent: 0, failed: 0 }]));
  for (const h of history) {
    const bucket = series[keyOf(truncate(new Date(h.sentAt), unit))];
    if (!bucket) continue;
    bucket.sent += h.sent;
    bucket.failed += h.failed || 0;
  }

  const sent = history.reduce((n, h) => n + h.sent, 0);
  const failed = history.reduce((n, h) => n + (h.failed || 0), 0);
  const tracked = history.filter(h => !h.legacy);
  const trackedSent = tracked.reduce((n, h) => n + h.sent, 0);
  return {
    sends: history.length,
    sent,
    failed,
    // Success rate only counts sends where failures were recorded.
    successRate: tracked.length && trackedSent + failed ? Math.round((trackedSent / (trackedSent + failed)) * 1000) / 10 : null,
    series: Object.values(series),
    history: history.slice(0, 50),
    failures,
  };
}

// Views and unique visitors per group, largest audience first.
const audienceBy = (match, id, limit, extra = {}) => PageView.aggregate([
  { $match: match },
  { $group: { _id: id, views: { $sum: 1 }, ids: { $addToSet: '$visitorId' }, ...extra } },
  { $project: { views: 1, visitors: { $size: '$ids' }, city: 1 } },
  { $sort: { visitors: -1, views: -1, _id: 1 } },
  { $limit: limit },
]);

// Views per hour of day (0-23) or ISO weekday (1-7), local time.
async function viewsBy(match, op, size, first) {
  const rows = await PageView.aggregate([
    { $match: match },
    { $group: { _id: { [op]: { date: '$createdAt', timezone: TZ } }, n: { $sum: 1 } } },
  ]);
  const byKey = Object.fromEntries(rows.map(r => [r._id, r.n]));
  return Array.from({ length: size }, (_, i) => ({ key: String(i + first), value: byKey[i + first] || 0 }));
}

router.get('/', async (req, res) => {
  try {
    const { days, custom, from, to } = resolveRange(req.query);
    const unit = unitFor(days);
    const prevFrom = new Date(from.getTime() - days * DAY);
    const keys = bucketKeys(from, to, unit);

    const inRange = { createdAt: between(from, to) };
    const published = { status: 'published', publishDate: between(from, to) };

    const [
      views, prevViews, visitorRows, trafficRows, topPages, articleRows, referrers, devices,
      countryRows, regionRows, locatedViews, byHour, byWeekday,
      publishedCount, publishedSeries, submittedCount, pendingNow, reviewRows, byCategory, byAuthor,
      newSubscribers, subscriberSeries, totalSubscribers, newsletters,
      bookings, bookingSeries, bookingsByStatus,
    ] = await Promise.all([
      PageView.countDocuments(inRange),
      PageView.countDocuments({ createdAt: { $gte: prevFrom, $lt: from } }),
      PageView.aggregate([{ $match: { ...inRange, visitorId: { $ne: null } } }, { $group: { _id: '$visitorId' } }, { $count: 'n' }]),
      PageView.aggregate([
        { $match: inRange },
        { $group: { _id: bucketExpr('createdAt', unit), views: { $sum: 1 }, visitors: { $addToSet: '$visitorId' } } },
      ]),
      topBy(PageView, inRange, 'path', 10, '/'),
      topBy(PageView, { ...inRange, articleSlug: { $ne: null } }, 'articleSlug', 10, ''),
      topBy(PageView, inRange, 'referrer', 8, 'Direct / unknown'),
      topBy(PageView, inRange, 'device', 3, 'desktop'),
      audienceBy({ ...inRange, country: { $exists: true } }, '$country', 12),
      audienceBy(
        { ...inRange, country: { $exists: true } },
        { country: '$country', region: '$region' },
        12,
        { city: { $first: '$city' } },
      ),
      PageView.countDocuments({ ...inRange, country: { $exists: true } }),
      viewsBy(inRange, '$hour', 24, 0),
      viewsBy(inRange, '$isoDayOfWeek', 7, 1),

      Article.countDocuments(published),
      countSeries(Article, published, 'publishDate', unit, keys),
      Article.countDocuments({ submittedAt: between(from, to) }),
      Article.countDocuments({ status: 'pending' }),
      Article.aggregate([
        { $match: { reviewedAt: between(from, to), submittedAt: { $ne: null } } },
        { $group: { _id: null, avgMs: { $avg: { $subtract: ['$reviewedAt', '$submittedAt'] } }, n: { $sum: 1 } } },
      ]),
      topBy(Article, published, 'category', 8, 'Uncategorised'),
      topBy(Article, published, 'authorName', 8, 'Unassigned'),

      Subscriber.countDocuments(inRange),
      countSeries(Subscriber, inRange, 'createdAt', unit, keys),
      Subscriber.countDocuments({ status: 'active' }),
      newsletterReport(from, to, unit, keys),

      SessionBooking.countDocuments(inRange),
      countSeries(SessionBooking, inRange, 'createdAt', unit, keys),
      topBy(SessionBooking, inRange, 'status', 4, 'pending'),
    ]);

    // Attach titles to the most-read articles.
    const slugs = articleRows.map(r => r.label);
    const titles = Object.fromEntries(
      (await Article.find({ slug: { $in: slugs } }).select('slug title').lean()).map(a => [a.slug, a.title])
    );
    const topArticles = articleRows.map(r => ({ label: titles[r.label] || r.label, slug: r.label, value: r.value }));

    const traffic = Object.fromEntries(trafficRows.map(r => [r._id, r]));
    const review = reviewRows[0];

    res.json({
      range: { days, custom, unit, from, to, buckets: keys },
      traffic: {
        views,
        previousViews: prevViews,
        visitors: visitorRows[0]?.n || 0,
        series: keys.map(key => ({
          key,
          views: traffic[key]?.views || 0,
          visitors: (traffic[key]?.visitors || []).filter(Boolean).length,
        })),
        topPages,
        topArticles,
        referrers,
        devices,
        located: locatedViews,
        countries: countryRows.map(r => ({ code: r._id, label: countryName(r._id), visitors: r.visitors, views: r.views })),
        regions: regionRows.map(r => ({
          label: [regionName(r._id.country, r._id.region, r.city), countryName(r._id.country)].filter(Boolean).join(', '),
          country: r._id.country,
          visitors: r.visitors,
          views: r.views,
        })),
        byHour,
        byWeekday,
      },
      content: {
        published: publishedCount,
        submitted: submittedCount,
        pendingNow,
        reviewed: review?.n || 0,
        avgReviewHours: review ? Math.round((review.avgMs / 3600000) * 10) / 10 : null,
        publishedSeries,
        byCategory,
        byAuthor,
      },
      audience: {
        newSubscribers,
        totalSubscribers,
        subscriberSeries,
        bookings,
        bookingSeries,
        bookingsByStatus,
      },
      newsletters,
    });
  } catch (error) {
    if (!error.status) console.error(error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

export default router;
