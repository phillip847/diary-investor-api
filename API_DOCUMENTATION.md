# Admin CMS API Documentation

## Authentication
All admin endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

## Article Management

### 1. Create New Article
**POST** `/api/articles`
```json
{
  "title": "Article Title",
  "subtitle": "Short description",
  "category": "Namibia",
  "tags": ["investing", "stocks"],
  "thumbnail": "https://example.com/image.jpg",
  "thumbnailAlt": "Image description",
  "content": "<p>Rich text content</p>",
  "featured": false,
  "status": "draft",
  "slug": "article-title"
}
```
- `slug` is auto-generated from title if not provided
- `publishDate` is auto-set when status changes to "published"

### 2. Get All Articles (with filters)
**GET** `/api/articles?category=Namibia&status=published&search=keyword&featured=true&limit=10&offset=0`

Response:
```json
{
  "rows": [...],
  "count": 100
}
```

### 3. Get Single Article
**GET** `/api/articles/:id`
**GET** `/api/articles/slug/:slug`

### 4. Update Article
**PUT** `/api/articles/:id`
```json
{
  "title": "Updated Title",
  "status": "published"
}
```

### 5. Delete Article
**DELETE** `/api/articles/:id`

### 6. Get Categories List
**GET** `/api/articles/meta/categories`

Returns:
```json
[
  "Namibia",
  "South Africa",
  "Global Markets",
  "Crypto",
  "Investing Guides",
  "Housing & Personal Finance",
  "Business & Entrepreneurship"
]
```

## Static Pages Management

### 1. Get All Pages
**GET** `/api/pages`

### 2. Get Single Page
**GET** `/api/pages/:page`

Available pages: `about`, `contact`, `newsletter`, `book-session`, `tools`

### 3. Update Page Content
**PUT** `/api/pages/:page`
```json
{
  "content": {
    "title": "About Us",
    "body": "<p>Page content</p>",
    "images": ["url1", "url2"]
  }
}
```

## Admin Dashboard

### 1. Get Dashboard Stats
**GET** `/api/admin/stats`

Returns:
```json
{
  "totalArticles": 50,
  "publishedArticles": 40,
  "draftArticles": 10,
  "featuredArticles": 5,
  "totalUsers": 100
}
```

### 2. Preview Article
**GET** `/api/admin/articles/:id/preview`

### 3. Bulk Update Articles
**POST** `/api/admin/articles/bulk-update`
```json
{
  "ids": ["id1", "id2"],
  "updates": {
    "status": "published"
  }
}
```

### 4. Bulk Delete Articles
**DELETE** `/api/admin/articles/bulk-delete`
```json
{
  "ids": ["id1", "id2"]
}
```

## Article Workflow

1. **Create Draft**: POST `/api/articles` with `status: "draft"`
2. **Save Changes**: PUT `/api/articles/:id`
3. **Preview**: GET `/api/admin/articles/:id/preview`
4. **Publish**: PUT `/api/articles/:id` with `status: "published"`
5. **Feature**: PUT `/api/articles/:id` with `featured: true`

## Article Display Logic

- **Hero Section**: Articles with `featured: true` and `status: "published"`
- **Latest Feed**: All published articles sorted by `publishDate` (descending)
- **Category Pages**: Filter by `category` parameter

## Field Validations

### Article
- `title`: Required
- `category`: Required, must be one of the predefined categories
- `content`: Required
- `status`: "draft" or "published"
- `slug`: Unique, auto-generated from title

### Static Page
- `page`: Required, must be one of: about, contact, newsletter, book-session, tools
- `content`: Required (flexible schema)
