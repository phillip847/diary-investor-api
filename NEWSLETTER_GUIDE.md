# Newsletter Management Guide

## Overview
The newsletter system allows you to:
- Collect email subscriptions
- Upload newsletter PDFs
- Send notifications to subscribers
- Manage newsletter archives

## Setup

### 1. Run Migration (First Time Only)
If you have existing newsletter subscribers:
```bash
npm run migrate:newsletter
```

### 2. Install Dependencies
```bash
npm install
```

## Features

### Subscription Management

**Subscribe to Newsletter**
```javascript
POST /api/newsletter/subscribe
{
  "email": "user@example.com",
  "name": "John Doe"  // optional
}
```
- Automatically sends welcome email
- Prevents duplicate subscriptions
- Validates email format

### Newsletter Upload (Admin)

**Upload Newsletter PDF**
```javascript
POST /api/newsletter/upload
Headers: { Authorization: "Bearer <token>" }
Content-Type: multipart/form-data

FormData:
- file: PDF file (max 10MB)
- title: "Monthly Newsletter - January 2024"
- description: "Market insights and investment tips"
- issueDate: "2024-01-15" (optional)
```

**Response:**
```json
{
  "message": "Newsletter uploaded successfully",
  "newsletter": {
    "_id": "...",
    "title": "Monthly Newsletter - January 2024",
    "fileName": "newsletter-jan-2024.pdf",
    "fileSize": 2048576,
    "issueDate": "2024-01-15T00:00:00.000Z"
  }
}
```

### Newsletter Distribution

**Send to All Subscribers**
```javascript
POST /api/newsletter/:id/send
Headers: { Authorization: "Bearer <token>" }
```
- Sends email to all active subscribers
- Includes link to view newsletter
- Returns count of emails sent

### Newsletter Retrieval

**List All Newsletters**
```javascript
GET /api/newsletter/list
```
Returns all published newsletters (without file data for performance).

**Get Single Newsletter**
```javascript
GET /api/newsletter/:id
```
Returns newsletter with full file data (base64 encoded PDF).

### Newsletter Management (Admin)

**Delete Newsletter**
```javascript
DELETE /api/newsletter/:id
Headers: { Authorization: "Bearer <token>" }
```

**Get All Subscribers**
```javascript
GET /api/newsletter
Headers: { Authorization: "Bearer <token>" }
```

## Frontend Integration

### Upload Newsletter Example
```javascript
const uploadNewsletter = async (file, title, description) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  formData.append('description', description);

  const response = await axios.post(
    `${API_URL}/api/newsletter/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return response.data;
};
```

### Display Newsletter List
```javascript
const fetchNewsletters = async () => {
  const response = await axios.get(`${API_URL}/api/newsletter/list`);
  return response.data;
};

// Display in UI
newsletters.map(newsletter => (
  <div key={newsletter._id}>
    <h3>{newsletter.title}</h3>
    <p>{newsletter.description}</p>
    <small>{new Date(newsletter.issueDate).toLocaleDateString()}</small>
    <a href={`/newsletter/${newsletter._id}`}>Read</a>
  </div>
));
```

### View Newsletter PDF
```javascript
const viewNewsletter = async (id) => {
  const response = await axios.get(`${API_URL}/api/newsletter/${id}`);
  const newsletter = response.data;
  
  // Display PDF in iframe or download
  const iframe = document.createElement('iframe');
  iframe.src = newsletter.fileUrl;
  document.body.appendChild(iframe);
};
```

## Email Notifications

### Welcome Email
Sent automatically when user subscribes:
- Subject: "Welcome to Diary of an Investor Newsletter"
- Contains welcome message

### Newsletter Notification
Sent when admin triggers send:
- Subject: "New Newsletter: [Title]"
- Contains link to view newsletter
- Sent to all active subscribers

## File Storage

Newsletters are stored as base64-encoded PDFs in MongoDB:
- Max file size: 10MB
- Format: PDF only
- Stored in `fileUrl` field as data URI

## Testing

Run the test suite:
```bash
npm run test:newsletter
```

Make sure to:
1. Update admin credentials in test file
2. Have server running on port 3001
3. Optionally add a test PDF file

## Security

- Upload endpoint requires JWT authentication
- Only admins can upload/delete newsletters
- Email validation prevents invalid subscriptions
- File type validation (PDF only)
- File size limit (10MB)

## Best Practices

1. **Newsletter Titles**: Use descriptive titles with dates
2. **File Size**: Keep PDFs under 5MB for better performance
3. **Testing**: Always preview before sending to subscribers
4. **Scheduling**: Upload newsletters before sending notifications
5. **Backup**: Keep original PDF files as backup

## Troubleshooting

**Upload fails with "Only PDF files are allowed"**
- Ensure file is actually a PDF
- Check file MIME type is `application/pdf`

**Email not sending**
- Verify SendGrid API key in .env
- Check SendGrid account status
- Review email logs in SendGrid dashboard

**File too large**
- Compress PDF before uploading
- Current limit is 10MB
- Consider external storage for larger files

## Future Enhancements

Potential improvements:
- Cloud storage integration (S3, Cloudinary)
- Newsletter templates
- Scheduled sending
- Subscriber segments
- Analytics tracking
- Unsubscribe functionality
