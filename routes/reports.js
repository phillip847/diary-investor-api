import express from 'express';
import Article from '../models/Article.js';
import PageView from '../models/PageView.js';
import SessionBooking from '../models/SessionBooking.js';
import { Subscriber, NewsletterIssue } from '../models/Newsletter.js';
import { authenticateToken, requireReviewer } from '../middleware/auth.js';

// Dashboard reports for editors and admins. Every figure is scoped to the
// same date range so the numbers on the page always agree.
const router = express.Router();
router.use(authenticateToken, requireReviewer);

// Namibia is UTC+2 all year, so buckets use a fixed offset.
const TZ = '+02:00';
const OFFSET_MS = 2 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const RANGES = [7, 30, 90, 365];

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

router.get('/', async (req, res) => {
  try {
    const days = RANGES.includes(Number(req.query.days)) ? Number(req.query.days) : 30;
    const unit = unitFor(days);
    const to = new Date();
    // Start at local midnight so "last 7 days" means 7 whole calendar days.
    const from = new Date(truncate(new Date(to.getTime() - (days - 1) * DAY), 'day').getTime() - OFFSET_MS);
    const prevFrom = new Date(from.getTime() - days * DAY);
    const keys = bucketKeys(from, to, unit);

    const inRange = { createdAt: between(from, to) };
    const published = { status: 'published', publishDate: between(from, to) };

    const [
      views, prevViews, visitorRows, trafficRows, topPages, articleRows, referrers, devices,
      publishedCount, publishedSeries, submittedCount, pendingNow, reviewRows, byCategory, byAuthor,
      newSubscribers, subscriberSeries, totalSubscribers, sentRows,
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
      NewsletterIssue.aggregate([
        { $match: { sentAt: between(from, to) } },
        { $group: { _id: null, issues: { $sum: 1 }, emails: { $sum: '$sentCount' } } },
      ]),

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
    const sent = sentRows[0];

    res.json({
      range: { days, unit, from, to, buckets: keys },
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
        newslettersSent: sent?.issues || 0,
        emailsSent: sent?.emails || 0,
        bookings,
        bookingSeries,
        bookingsByStatus,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
