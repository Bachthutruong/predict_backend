# Backend Deployment Guide

## CORS Fix Applied

The backend has been updated to fix the CORS error. The changes include:

1. **Removed trailing slash** from the default frontend URL
2. **Enhanced CORS configuration** to handle multiple origins
3. **Automatic trailing slash removal** when comparing origins

## Updated Files

- `src/server.ts` - Updated CORS configuration
- `env.example` - Updated default frontend URL

## Environment Variables

Make sure to set these environment variables in your deployment platform:

```bash
# Server Configuration
PORT=5001
NODE_ENV=production

# Frontend URL (for CORS) - NO TRAILING SLASH
FRONTEND_URL=https://predict-frontend-six.vercel.app

# Database
MONGODB_URI=your_mongodb_connection_string

# JWT Secret
JWT_SECRET=your_jwt_secret_key

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Deployment Steps

### 1. Build the project
```bash
npm run build
```

### 2. Deploy to Render (or your preferred platform)

1. Push the code to your Git repository
2. Create a new Web Service on Render
3. Connect your repository
4. Set the build command: `npm run build`
5. Set the start command: `npm start`
6. Add all environment variables from the list above

### 3. Update Frontend API URL

Make sure your frontend is calling the correct backend URL:
- Backend URL: `https://predict-backend-63un.onrender.com`
- Make sure there's no extra space or character in the URL

## Testing

After deployment, test the CORS fix by:

1. Opening your frontend application
2. Trying to login/register
3. Checking the browser console for CORS errors
4. Verifying API calls are successful

## Common Issues

1. **Still getting CORS errors**: Check that `FRONTEND_URL` environment variable is set correctly without trailing slash
2. **API calls failing**: Verify the backend URL in frontend doesn't have extra spaces or characters
3. **Environment variables not loading**: Make sure all required environment variables are set in your deployment platform

## Supported Origins

The backend now supports these origins:
- `https://predict-frontend-six.vercel.app`
- `http://localhost:3000`
- `http://localhost:5173`
- Any URL set in `FRONTEND_URL` environment variable

All origins are automatically checked with and without trailing slashes. 