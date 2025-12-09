# Newsletter API Quick Reference

## 📬 Public Endpoints

### Subscribe to Newsletter
```http
POST /api/newsletter/subscribe
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe"
}
```

### List All Newsletters
```http
GET /api/newsletter/list
```

### Get Single Newsletter
```http
GET /api/newsletter/:id
```

## 🔐 Admin Endpoints (Require JWT Token)

### Upload Newsletter
```http
POST /api/newsletter/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

FormData:
- file: [PDF file]
- title: "Newsletter Title"
- description: "Description"
- issueDate: "2024-01-15" (optional)
```

### Send Newsletter to Subscribers
```http
POST /api/newsletter/:id/send
Authorization: Bearer <token>
```

### Delete Newsletter
```http
DELETE /api/newsletter/:id
Authorization: Bearer <token>
```

### Get All Subscribers
```http
GET /api/newsletter
Authorization: Bearer <token>
```

## 📝 Response Examples

### Subscribe Response
```json
{
  "message": "Newsletter subscription successful",
  "subscriber": {
    "_id": "...",
    "email": "user@example.com",
    "name": "John Doe",
    "status": "active",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

### List Newsletters Response
```json
[
  {
    "_id": "...",
    "title": "Monthly Newsletter - January 2024",
    "description": "Market insights and tips",
    "fileName": "newsletter-jan.pdf",
    "fileSize": 2048576,
    "issueDate": "2024-01-15T00:00:00.000Z",
    "status": "published",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
]
```

### Upload Response
```json
{
  "message": "Newsletter uploaded successfully",
  "newsletter": {
    "_id": "...",
    "title": "Monthly Newsletter - January 2024",
    "description": "Market insights",
    "fileUrl": "data:application/pdf;base64,...",
    "fileName": "newsletter-jan.pdf",
    "fileSize": 2048576,
    "issueDate": "2024-01-15T00:00:00.000Z",
    "status": "published"
  }
}
```

### Send Response
```json
{
  "message": "Newsletter sent to 150 subscribers"
}
```

## ⚠️ Error Responses

### Duplicate Email
```json
{
  "error": "Email already subscribed"
}
```

### Invalid File Type
```json
{
  "error": "Only PDF files are allowed"
}
```

### Unauthorized
```json
{
  "error": "Access denied"
}
```

### Not Found
```json
{
  "error": "Newsletter not found"
}
```

## 🔑 Authentication

Get JWT token:
```http
POST /api/auth
Content-Type: application/json

{
  "username": "admin",
  "password": "your-password"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Use token in subsequent requests:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📊 Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `404` - Not Found
- `500` - Server Error

## 🎯 Common Use Cases

### 1. User Subscribes
```javascript
await axios.post('/api/newsletter/subscribe', {
  email: 'user@example.com',
  name: 'John Doe'
});
```

### 2. Admin Uploads Newsletter
```javascript
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('title', 'January 2024 Newsletter');
formData.append('description', 'Monthly market insights');

await axios.post('/api/newsletter/upload', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
    'Authorization': `Bearer ${token}`
  }
});
```

### 3. Display Newsletter Archive
```javascript
const newsletters = await axios.get('/api/newsletter/list');
// Display newsletters in UI
```

### 4. Send to Subscribers
```javascript
await axios.post(`/api/newsletter/${newsletterId}/send`, {}, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## 🔧 Validation Rules

### Email
- Required
- Must be valid email format
- Must be unique

### PDF Upload
- File type: PDF only
- Max size: 10MB
- Required for upload

### Title
- Required for upload
- String type

## 📧 Email Notifications

### Welcome Email
- Sent automatically on subscription
- Subject: "Welcome to Diary of an Investor Newsletter"

### Newsletter Notification
- Sent when admin triggers send
- Subject: "New Newsletter: [Title]"
- Includes link to view newsletter
