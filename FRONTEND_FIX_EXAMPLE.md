# Frontend Fix for Newsletter Admin API

## Problem
The frontend is getting a 401 Unauthorized error when calling `/api/admin/newsletter` because it's not sending the JWT token.

## Solution
The frontend request needs to include the Authorization header with the JWT token.

## Example Fix for newsletterSlice.js

```javascript
// Before (causing 401 error)
const response = await fetch('/api/admin/newsletter');

// After (with proper authentication)
const token = localStorage.getItem('token'); // or however you store the token
const response = await fetch('/api/admin/newsletter', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## For Redux Toolkit Query
```javascript
// In your API slice
export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/admin',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token; // or however you store the token
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getNewsletters: builder.query({
      query: () => '/newsletter',
    }),
  }),
});
```

## Key Points
1. The endpoint `/api/admin/newsletter` is working correctly
2. It requires admin authentication (JWT token)
3. Token must be sent as `Authorization: Bearer <token>`
4. Make sure the user is logged in as admin before making the request