# Frontend Integration Examples

## React/Redux Example (Based on Your Code)

### Redux Slice (Complete)
```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Async Thunks
export const uploadNewsletter = createAsyncThunk(
  'newsletter/upload',
  async (formData) => {
    const response = await axios.post(
      `${API_BASE_URL}/api/newsletter/upload`,
      formData,
      {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.data;
  }
);

export const fetchNewsletters = createAsyncThunk(
  'newsletter/fetchAll',
  async () => {
    const response = await axios.get(`${API_BASE_URL}/api/newsletter/list`);
    return response.data;
  }
);

export const fetchSingleNewsletter = createAsyncThunk(
  'newsletter/fetchSingle',
  async (id) => {
    const response = await axios.get(`${API_BASE_URL}/api/newsletter/${id}`);
    return response.data;
  }
);

export const sendNewsletterToSubscribers = createAsyncThunk(
  'newsletter/send',
  async (id) => {
    const response = await axios.post(
      `${API_BASE_URL}/api/newsletter/${id}/send`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.data;
  }
);

export const deleteNewsletter = createAsyncThunk(
  'newsletter/delete',
  async (id) => {
    await axios.delete(`${API_BASE_URL}/api/newsletter/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return id;
  }
);

export const subscribeToNewsletter = createAsyncThunk(
  'newsletter/subscribe',
  async ({ email, name }) => {
    const response = await axios.post(
      `${API_BASE_URL}/api/newsletter/subscribe`,
      { email, name }
    );
    return response.data;
  }
);

// Slice
const newsletterSlice = createSlice({
  name: 'newsletter',
  initialState: {
    newsletters: [],
    currentNewsletter: null,
    loading: false,
    error: null,
    uploadSuccess: false,
    subscribeSuccess: false,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.uploadSuccess = false;
      state.subscribeSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Upload Newsletter
      .addCase(uploadNewsletter.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadNewsletter.fulfilled, (state, action) => {
        state.loading = false;
        state.uploadSuccess = true;
        state.newsletters.unshift(action.payload.newsletter);
      })
      .addCase(uploadNewsletter.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Fetch Newsletters
      .addCase(fetchNewsletters.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNewsletters.fulfilled, (state, action) => {
        state.loading = false;
        state.newsletters = action.payload;
      })
      .addCase(fetchNewsletters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Fetch Single Newsletter
      .addCase(fetchSingleNewsletter.fulfilled, (state, action) => {
        state.currentNewsletter = action.payload;
      })
      // Subscribe
      .addCase(subscribeToNewsletter.fulfilled, (state) => {
        state.subscribeSuccess = true;
      })
      .addCase(subscribeToNewsletter.rejected, (state, action) => {
        state.error = action.error.message;
      })
      // Delete
      .addCase(deleteNewsletter.fulfilled, (state, action) => {
        state.newsletters = state.newsletters.filter(
          n => n._id !== action.payload
        );
      });
  },
});

export const { clearError, clearSuccess } = newsletterSlice.actions;
export default newsletterSlice.reducer;
```

### Upload Component
```javascript
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { uploadNewsletter, clearSuccess } from './newsletterSlice';

function NewsletterUpload() {
  const dispatch = useDispatch();
  const { loading, uploadSuccess, error } = useSelector(state => state.newsletter);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    file: null
  });

  const handleFileChange = (e) => {
    setFormData({ ...formData, file: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const data = new FormData();
    data.append('file', formData.file);
    data.append('title', formData.title);
    data.append('description', formData.description);
    
    await dispatch(uploadNewsletter(data));
  };

  React.useEffect(() => {
    if (uploadSuccess) {
      setFormData({ title: '', description: '', file: null });
      setTimeout(() => dispatch(clearSuccess()), 3000);
    }
  }, [uploadSuccess, dispatch]);

  return (
    <div className="newsletter-upload">
      <h2>Upload Newsletter</h2>
      
      {uploadSuccess && (
        <div className="alert alert-success">
          Newsletter uploaded successfully!
        </div>
      )}
      
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
        
        <div className="form-group">
          <label>PDF File *</label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            required
          />
          {formData.file && (
            <small>{formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)</small>
          )}
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Uploading...' : 'Upload Newsletter'}
        </button>
      </form>
    </div>
  );
}

export default NewsletterUpload;
```

### Newsletter List Component
```javascript
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNewsletters, deleteNewsletter, sendNewsletterToSubscribers } from './newsletterSlice';

function NewsletterList({ isAdmin = false }) {
  const dispatch = useDispatch();
  const { newsletters, loading } = useSelector(state => state.newsletter);

  useEffect(() => {
    dispatch(fetchNewsletters());
  }, [dispatch]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this newsletter?')) {
      await dispatch(deleteNewsletter(id));
    }
  };

  const handleSend = async (id) => {
    if (window.confirm('Send this newsletter to all subscribers?')) {
      await dispatch(sendNewsletterToSubscribers(id));
      alert('Newsletter sent successfully!');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="newsletter-list">
      <h2>Newsletter Archive</h2>
      
      {newsletters.length === 0 ? (
        <p>No newsletters available yet.</p>
      ) : (
        <div className="newsletters">
          {newsletters.map(newsletter => (
            <div key={newsletter._id} className="newsletter-card">
              <h3>{newsletter.title}</h3>
              <p>{newsletter.description}</p>
              <small>
                {new Date(newsletter.issueDate).toLocaleDateString()}
                {' • '}
                {(newsletter.fileSize / 1024 / 1024).toFixed(2)} MB
              </small>
              
              <div className="actions">
                <a 
                  href={`/newsletter/${newsletter._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View PDF
                </a>
                
                {isAdmin && (
                  <>
                    <button onClick={() => handleSend(newsletter._id)}>
                      Send to Subscribers
                    </button>
                    <button 
                      onClick={() => handleDelete(newsletter._id)}
                      className="btn-danger"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NewsletterList;
```

### Newsletter Viewer Component
```javascript
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSingleNewsletter } from './newsletterSlice';

function NewsletterViewer() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { currentNewsletter, loading } = useSelector(state => state.newsletter);

  useEffect(() => {
    dispatch(fetchSingleNewsletter(id));
  }, [dispatch, id]);

  if (loading) return <div>Loading...</div>;
  if (!currentNewsletter) return <div>Newsletter not found</div>;

  return (
    <div className="newsletter-viewer">
      <div className="newsletter-header">
        <h1>{currentNewsletter.title}</h1>
        <p>{currentNewsletter.description}</p>
        <small>
          Published: {new Date(currentNewsletter.issueDate).toLocaleDateString()}
        </small>
      </div>
      
      <div className="pdf-container">
        <iframe
          src={currentNewsletter.fileUrl}
          title={currentNewsletter.title}
          width="100%"
          height="800px"
          style={{ border: 'none' }}
        />
      </div>
      
      <div className="download-section">
        <a 
          href={currentNewsletter.fileUrl}
          download={currentNewsletter.fileName}
          className="btn-download"
        >
          Download PDF
        </a>
      </div>
    </div>
  );
}

export default NewsletterViewer;
```

### Subscription Form Component
```javascript
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { subscribeToNewsletter, clearSuccess } from './newsletterSlice';

function NewsletterSubscribe() {
  const dispatch = useDispatch();
  const { subscribeSuccess, error } = useSelector(state => state.newsletter);
  
  const [formData, setFormData] = useState({
    email: '',
    name: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await dispatch(subscribeToNewsletter(formData));
  };

  React.useEffect(() => {
    if (subscribeSuccess) {
      setFormData({ email: '', name: '' });
      setTimeout(() => dispatch(clearSuccess()), 5000);
    }
  }, [subscribeSuccess, dispatch]);

  return (
    <div className="newsletter-subscribe">
      <h3>Subscribe to Our Newsletter</h3>
      <p>Get the latest investment insights delivered to your inbox.</p>
      
      {subscribeSuccess && (
        <div className="alert alert-success">
          Thank you for subscribing! Check your email for confirmation.
        </div>
      )}
      
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Your Name (optional)"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        
        <input
          type="email"
          placeholder="Your Email *"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        
        <button type="submit">Subscribe</button>
      </form>
    </div>
  );
}

export default NewsletterSubscribe;
```

## Vanilla JavaScript Example

```javascript
// Upload Newsletter
async function uploadNewsletter(file, title, description) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  formData.append('description', description);

  const response = await fetch('http://localhost:3001/api/newsletter/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: formData
  });

  return await response.json();
}

// Fetch Newsletters
async function fetchNewsletters() {
  const response = await fetch('http://localhost:3001/api/newsletter/list');
  return await response.json();
}

// Subscribe
async function subscribe(email, name) {
  const response = await fetch('http://localhost:3001/api/newsletter/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, name })
  });

  return await response.json();
}
```

## CSS Styling Example

```css
.newsletter-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  background: white;
}

.newsletter-card h3 {
  margin-top: 0;
  color: #333;
}

.newsletter-card .actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.newsletter-card button,
.newsletter-card a {
  padding: 8px 16px;
  border-radius: 4px;
  text-decoration: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.newsletter-card a {
  background: #007bff;
  color: white;
}

.newsletter-card button {
  background: #28a745;
  color: white;
}

.newsletter-card .btn-danger {
  background: #dc3545;
}

.newsletter-subscribe {
  background: #f8f9fa;
  padding: 30px;
  border-radius: 8px;
  max-width: 500px;
  margin: 0 auto;
}

.newsletter-subscribe form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.newsletter-subscribe input {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.newsletter-subscribe button {
  padding: 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.alert {
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 15px;
}

.alert-success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.alert-error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}
```
