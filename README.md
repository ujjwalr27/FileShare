# FileShare - File Sharing Application with ML Features

A modern file sharing application built with React, Node.js, Express, PostgreSQL, and Machine Learning capabilities.

## Features

### Current Features (MVP)
- ✅ User authentication (register/login with JWT)
- ✅ File upload/download
- ✅ File management (view, delete, rename)
- ✅ File search functionality
- ✅ Storage quota management
- ✅ Activity logging
- ✅ Responsive UI with TailwindCSS

### Planned Features
- 📁 Folder management
- 🔗 File sharing with links (password-protected, expiring links)
- 🤖 ML-powered features:
  - Auto-categorization
  - Semantic search
  - PII detection
  - Image classification

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- Zustand (state management)
- React Router (routing)
- Axios (HTTP client)
- React Hot Toast (notifications)
- Lucide React (icons)

### Backend
- Node.js with Express.js
- TypeScript
- PostgreSQL (database)
- JWT (authentication)
- Multer (file upload)
- Bcrypt (password hashing)

### Future ML Stack
- Python with FastAPI
- Sentence Transformers (semantic search)
- spaCy (NER/PII detection)
- MobileNetV2 (image classification)

## Prerequisites

- Node.js 18+ (download from [nodejs.org](https://nodejs.org))
- PostgreSQL 15+ (download from [postgresql.org](https://www.postgresql.org/download/))
- npm or yarn package manager
- 8GB RAM minimum
- 10GB+ free disk space

## Installation & Setup

### 1. Clone or Navigate to Project

```bash
cd c:\Users\uk187\Desktop\ALLprojects\fileshare
```

### 2. Setup PostgreSQL Database

1. Start PostgreSQL service
2. Create a new database:

```sql
CREATE DATABASE fileshare;
```

3. Run the migration to create tables:

```bash
# Connect to PostgreSQL
psql -U postgres -d fileshare

# Run the migration file
\i database/migrations/001_initial_schema.sql
```

Alternatively, you can use a PostgreSQL GUI like pgAdmin or DBeaver to run the SQL file.

### 3. Setup Backend

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file
copy .env.example .env
```

Edit the [.env](backend\.env) file with your database credentials:

```env
NODE_ENV=development
PORT=5000
HOST=localhost

# Database - UPDATE THESE
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fileshare
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# JWT Secret - CHANGE THIS
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# File Upload
MAX_FILE_SIZE=104857600
UPLOAD_DIR=./uploads

# Storage Quotas (in bytes)
DEFAULT_USER_QUOTA=5368709120
ADMIN_USER_QUOTA=53687091200

# CORS
CORS_ORIGIN=http://localhost:5173
```

### 4. Setup Frontend

```bash
# Navigate to frontend (from project root)
cd frontend

# Install dependencies
npm install
```

### 5. Start the Application

**Option A: Run Backend and Frontend Separately**

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

**Option B: Run Both Together (from project root)**

```bash
# First install root dependencies
npm install

# Then run both
npm run dev
```

### 6. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

## Project Structure

```
fileshare/
├── backend/                    # Node.js backend
│   ├── src/
│   │   ├── config/            # Configuration files
│   │   ├── controllers/       # Route controllers
│   │   ├── middlewares/       # Express middlewares
│   │   ├── models/            # Database models (future)
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── types/             # TypeScript types
│   │   ├── utils/             # Utility functions
│   │   └── server.ts          # Entry point
│   ├── uploads/               # File storage
│   ├── .env                   # Environment variables
│   └── package.json
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   ├── store/             # Zustand stores
│   │   ├── types/             # TypeScript types
│   │   ├── utils/             # Utilities
│   │   ├── App.tsx            # Main App component
│   │   └── main.tsx           # Entry point
│   └── package.json
│
├── database/
│   └── migrations/            # SQL migrations
│
├── ml-service/                # Python ML service (future)
│
└── docs/                      # Documentation
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)
- `PUT /api/auth/profile` - Update profile (protected)
- `POST /api/auth/change-password` - Change password (protected)

### Files
- `POST /api/files/upload` - Upload file (protected)
- `GET /api/files` - Get user files (protected)
- `GET /api/files/search?q=query` - Search files (protected)
- `GET /api/files/:id` - Get file details (protected)
- `GET /api/files/:id/download` - Download file (protected)
- `DELETE /api/files/:id` - Delete file (protected)
- `PUT /api/files/:id/rename` - Rename file (protected)

## Usage Guide

### 1. Register an Account
1. Navigate to http://localhost:5173/register
2. Enter your name, email, and password
3. Click "Register"

### 2. Upload Files
1. Log in to your account
2. Click "Upload File" button
3. Select a file from your computer
4. File will be uploaded and appear in your file list

### 3. Download Files
1. Click the download icon next to any file
2. File will be downloaded to your default downloads folder

### 4. Delete Files
1. Click the trash icon next to any file
2. Confirm deletion
3. File will be soft-deleted and storage will be freed

### 5. Search Files
1. Enter a search term in the search box
2. Click "Search"
3. Matching files will be displayed

## Database Schema

### Users Table
- Stores user information
- Tracks storage quota and usage
- Handles authentication

### Files Table
- Stores file metadata
- Tracks file ownership
- Supports versioning

### File Versions Table
- Maintains file history
- Allows file recovery

### Shares Table
- Manages file sharing links (future)
- Supports password protection and expiration

### Activity Logs Table
- Tracks user actions
- Audit trail for compliance

### File Metadata Table
- Stores ML-generated metadata (future)
- Categories, tags, summaries

## Development

### Build for Production

Backend:
```bash
cd backend
npm run build
npm start
```

Frontend:
```bash
cd frontend
npm run build
npm run preview
```

### Environment Variables

See [backend/.env.example](backend\.env.example) for all available environment variables.

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check database credentials in .env
- Verify database exists: `psql -U postgres -l`

### File Upload Issues
- Check `MAX_FILE_SIZE` in .env
- Ensure `uploads/` directory exists and is writable
- Verify file type is in allowed MIME types

### Port Already in Use
- Backend (5000): Change `PORT` in backend/.env
- Frontend (5173): Change port in [frontend/vite.config.ts](frontend\vite.config.ts)

### Storage Quota Exceeded
- Check your storage usage in dashboard
- Delete unnecessary files
- Contact admin to increase quota (for future admin panel)

## Security Notes

- Change `JWT_SECRET` in production
- Use HTTPS in production
- Never commit `.env` files
- Implement rate limiting for production
- Use strong passwords
- Regular database backups

## Performance Optimization (8GB RAM)

- Files are streamed, not loaded in memory
- Database connection pooling
- Lazy loading for frontend
- Pagination for file lists
- Efficient file hashing

## Future Enhancements

1. **Folder Management**
   - Create/delete folders
   - Move files between folders
   - Folder sharing

2. **File Sharing**
   - Generate shareable links
   - Password protection
   - Link expiration
   - Download limits

3. **ML Features** (Resource-optimized)
   - Semantic search with small models
   - Auto-categorization
   - Duplicate detection
   - PII detection
   - Image classification

4. **Admin Panel**
   - User management
   - Storage management
   - System analytics

5. **Additional Features**
   - File preview
   - Trash/Recycle bin
   - File comments
   - Activity timeline
   - Email notifications

