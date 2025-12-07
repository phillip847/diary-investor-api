# Admin CMS Guide

## Setup

1. Run the seed script to initialize static pages:
```bash
npm run seed:pages
```

## Article Management

### Creating a New Article

1. **POST** `/api/articles` with:
   - `title` (required)
   - `subtitle` (optional short description)
   - `category` (required - select from dropdown)
   - `tags` (array of strings)
   - `thumbnail` (image URL)
   - `thumbnailAlt` (image description)
   - `content` (rich text HTML)
   - `featured` (true/false)
   - `status` ("draft" or "published")
   - `slug` (auto-generated or custom)

2. Article is saved as draft by default
3. Slug is auto-generated from title if not provided

### Article Workflow

```
Create → Save as Draft → Preview → Publish → Feature (optional)
```

1. **Draft**: `POST /api/articles` with `status: "draft"`
2. **Edit**: `PUT /api/articles/:id`
3. **Preview**: `GET /api/admin/articles/:id/preview`
4. **Publish**: `PUT /api/articles/:id` with `status: "published"`
   - `publishDate` is automatically set
5. **Feature**: `PUT /api/articles/:id` with `featured: true`
   - Featured articles appear in Hero section

### Article List View

**GET** `/api/articles` with query parameters:
- `search` - Search in title/subtitle
- `category` - Filter by category
- `status` - Filter by draft/published
- `limit` - Items per page (default: 10)
- `offset` - Pagination offset

Response includes:
- Article title
- Category
- Status
- Published date
- ID for edit/delete

### Categories

Available categories:
- Namibia
- South Africa
- Global Markets
- Crypto
- Investing Guides
- Housing & Personal Finance
- Business & Entrepreneurship

Get list: **GET** `/api/articles/meta/categories`

### Bulk Operations

**Update multiple articles:**
```json
POST /api/admin/articles/bulk-update
{
  "ids": ["id1", "id2"],
  "updates": { "status": "published" }
}
```

**Delete multiple articles:**
```json
DELETE /api/admin/articles/bulk-delete
{
  "ids": ["id1", "id2"]
}
```

## Static Pages Management

### Available Pages
- About
- Contact
- Newsletter
- Book Session
- Tools

### Editing Pages

**GET** `/api/pages/:page` - Get current content
**PUT** `/api/pages/:page` - Update content

Example:
```json
{
  "content": {
    "title": "About Us",
    "body": "<h1>Welcome</h1><p>Content here</p>",
    "images": ["url1", "url2"],
    "customField": "any value"
  }
}
```

The `content` field is flexible and can contain any structure.

## Display Logic

### Hero Section
Shows articles where:
- `featured: true`
- `status: "published"`

### Latest Feed
Shows all published articles sorted by `publishDate` (newest first)

### Category Pages
Filter articles by category parameter

## Authentication

All admin endpoints require JWT token:
```
Authorization: Bearer <your-token>
```

Get token from: **POST** `/api/auth`

## Dashboard Stats

**GET** `/api/admin/stats` returns:
- Total articles
- Published articles
- Draft articles
- Featured articles
- Total users

## Tips

1. Always save as draft first
2. Use preview before publishing
3. Set featured toggle for hero articles
4. Slug is auto-generated but can be customized
5. Publish date is set automatically when publishing
6. Use tags for better article organization
7. Always add thumbnail alt text for accessibility
