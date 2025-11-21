# Admin Panel - Car Dealership Management

Next.js admin panel with Laravel backend authentication.

## Setup

1. **Install dependencies** (if not already done):
```bash
cd adminpanel
npm install
```

2. **Configure environment**:
The `.env.local` file is already configured to point to your Laravel backend:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

3. **Run the development server**:
```bash
npm run dev
```

The admin panel will be available at: `http://localhost:3001`

## Features

### Authentication
- **Login Page**: `/login`
- Connects to Laravel Sanctum backend at `/api/login`
- Stores JWT token in localStorage
- Automatic redirect to dashboard on successful login
- Auto-logout on 401 responses

### Dashboard
- **Dashboard Page**: `/dashboard`
- Protected route (requires authentication)
- Displays user info
- Statistics cards
- Quick actions

## File Structure

```
adminpanel/
├── app/
│   ├── login/
│   │   └── page.js          # Login page
│   ├── dashboard/
│   │   └── page.js          # Dashboard (protected)
│   ├── layout.js            # Root layout with AuthProvider
│   ├── page.js              # Home (redirects to login)
│   └── globals.css          # Global styles
├── contexts/
│   └── AuthContext.js       # Authentication context
├── lib/
│   └── api.js               # Axios API client
└── .env.local               # Environment variables
```

## Authentication Flow

### Login
1. User enters email and password
2. POST request to `/api/login`
3. Backend returns token and user data
4. Token stored in localStorage
5. Redirect to `/dashboard`

### API Requests
All API requests automatically include the bearer token:
```javascript
Authorization: Bearer {token}
```

### Logout
- Clears token and user data from localStorage
- Redirects to `/login`

## Backend Integration

Make sure your Laravel backend has these endpoints:

### POST `/api/login`
**Request**:
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response**:
```json
{
  "token": "1|xxxxx",
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com"
  }
}
```

### CORS Configuration
Ensure your Laravel backend allows requests from `http://localhost:3001`:

In `config/cors.php`:
```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => ['http://localhost:3001'],
'supports_credentials' => true,
```

## Usage

### Default Login Credentials
Use the credentials from your Laravel `users` table.

To create a test user in Laravel:
```bash
php artisan tinker
>>> \App\Models\User::create(['name' => 'Admin', 'email' => 'admin@test.com', 'password' => bcrypt('password')]);
```

Then login with:
- Email: `admin@test.com`
- Password: `password`

## Development

### Start development server
```bash
npm run dev
```

### Build for production
```bash
npm run build
npm start
```

## API Client (`lib/api.js`)

The API client is pre-configured with:
- Base URL from environment variable
- Automatic token injection
- 401 error handling
- Credentials support

Example usage:
```javascript
import api from '@/lib/api';

// GET request
const messages = await api.get('/messages');

// POST request
const result = await api.post('/messages', { ... });
```

## Authentication Context (`contexts/AuthContext.js`)

Provides:
- `user`: Current user object
- `loading`: Loading state
- `login(email, password)`: Login function
- `logout()`: Logout function

Example usage:
```javascript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, login, logout } = useAuth();

  return (
    <div>
      {user ? (
        <p>Welcome {user.name}</p>
      ) : (
        <button onClick={() => login(email, password)}>Login</button>
      )}
    </div>
  );
}
```

## Next Steps

1. Add more dashboard features
2. Create message management pages
3. Add vehicle listing pages
4. Implement appointment management
5. Add user settings page

## Troubleshooting

### "Network Error" on login
- Check if Laravel backend is running on `http://localhost:8000`
- Verify CORS is configured correctly
- Check `.env.local` has correct `NEXT_PUBLIC_API_URL`

### 401 Unauthorized
- Token may have expired
- Check if Sanctum is configured correctly in Laravel
- Verify token is being sent in requests (check Network tab)

### Login page redirects back
- Check if `AuthContext` is properly wrapping the app
- Verify `localStorage` is working in browser
- Check browser console for errors
