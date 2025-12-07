# diary-investor-api

Content Management System API for Diary of an Investor

## Features

### Article Management
- Create, edit, delete articles
- Rich text editor support
- Categories: Namibia, South Africa, Global Markets, Crypto, Investing Guides, Housing & Personal Finance, Business & Entrepreneurship
- Tags system
- Featured articles for hero section
- Draft/Published workflow
- Auto-generated slugs
- Search and filtering
- Bulk operations

### Static Pages
- About, Contact, Newsletter, Book Session, Tools
- Flexible content structure
- Admin-only editing

### Admin Features
- Dashboard statistics
- Article preview
- Bulk update/delete
- JWT authentication

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Seed static pages
npm run seed:pages

# Start development server
npm run dev
```

## Documentation

- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [Admin Guide](./ADMIN_GUIDE.md) - How to use the CMS

## API Endpoints

### Articles
- `GET /api/articles` - List articles (with filters)
- `GET /api/articles/:id` - Get article by ID
- `GET /api/articles/slug/:slug` - Get article by slug
- `POST /api/articles` - Create article (admin)
- `PUT /api/articles/:id` - Update article (admin)
- `DELETE /api/articles/:id` - Delete article (admin)
- `GET /api/articles/meta/categories` - Get categories

### Static Pages
- `GET /api/pages` - List all pages
- `GET /api/pages/:page` - Get page content
- `PUT /api/pages/:page` - Update page (admin)

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/articles/:id/preview` - Preview article
- `POST /api/admin/articles/bulk-update` - Bulk update
- `DELETE /api/admin/articles/bulk-delete` - Bulk delete

### Auth
- `POST /api/auth` - Get JWT token
