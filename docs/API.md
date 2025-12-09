# API Documentation

## Base URL

```
http://localhost:5000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "data": null
}
```

## Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "storage_quota": 5368709120,
      "storage_used": 0,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    "token": "jwt_token_here"
  },
  "message": "User registered successfully"
}
```

#### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "jwt_token_here"
  },
  "message": "Login successful"
}
```

#### Get Profile (Protected)
```http
GET /api/auth/profile
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "storage_quota": 5368709120,
    "storage_used": 1048576,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Update Profile (Protected)
```http
PUT /api/auth/profile
```

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

#### Change Password (Protected)
```http
POST /api/auth/change-password
```

**Request Body:**
```json
{
  "oldPassword": "oldpass123",
  "newPassword": "newpass123"
}
```

---

### Files

#### Upload File (Protected)
```http
POST /api/files/upload
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
```
file: <file>
folderId: <uuid> (optional)
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "folder_id": null,
    "name": "file_123456_abc.pdf",
    "original_name": "document.pdf",
    "path": "./uploads/file_123456_abc.pdf",
    "size": 1048576,
    "mime_type": "application/pdf",
    "extension": "pdf",
    "hash": "sha256_hash",
    "version": 1,
    "is_deleted": false,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "File uploaded successfully"
}
```

**Errors:**
- 400: No file uploaded
- 413: File too large
- 400: Storage quota exceeded

#### Get Files (Protected)
```http
GET /api/files?folderId=<uuid>&page=1&limit=20&sortBy=created_at&sortOrder=desc
```

**Query Parameters:**
- `folderId` (optional): Filter by folder
- `page` (default: 1): Page number
- `limit` (default: 20): Items per page
- `sortBy` (default: created_at): Sort field
- `sortOrder` (default: desc): asc or desc

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "original_name": "document.pdf",
        "size": 1048576,
        "mime_type": "application/pdf",
        "created_at": "2024-01-01T00:00:00Z",
        ...
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

#### Search Files (Protected)
```http
GET /api/files/search?q=<search_term>&page=1&limit=20
```

**Query Parameters:**
- `q` (required): Search term
- `page` (default: 1): Page number
- `limit` (default: 20): Items per page

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [ ... ],
    "pagination": { ... }
  }
}
```

#### Get File Details (Protected)
```http
GET /api/files/:id
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "original_name": "document.pdf",
    ...
  }
}
```

#### Download File (Protected)
```http
GET /api/files/:id/download
```

**Response:**
- File download stream
- Content-Disposition header with filename

#### Delete File (Protected)
```http
DELETE /api/files/:id
```

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "File deleted successfully"
}
```

#### Rename File (Protected)
```http
PUT /api/files/:id/rename
```

**Request Body:**
```json
{
  "name": "new-filename.pdf"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "original_name": "new-filename.pdf",
    ...
  },
  "message": "File renamed successfully"
}
```

---

## Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `413` - Payload Too Large
- `500` - Internal Server Error

## Error Codes

### Authentication Errors
- `No token provided` - Missing Authorization header
- `Invalid or expired token` - Token is invalid
- `User not found or inactive` - User doesn't exist

### Validation Errors
- `Validation failed` - Input validation error
- `Invalid credentials` - Wrong email/password
- `User already exists with this email` - Email taken

### File Errors
- `No file uploaded` - Missing file in upload
- `File too large` - Exceeds MAX_FILE_SIZE
- `Storage quota exceeded` - User out of storage
- `File not found` - File doesn't exist

## Rate Limiting

Currently no rate limiting. Production should implement:
- Authentication: 5 requests/minute
- File upload: 10 requests/minute
- Other endpoints: 100 requests/minute

## CORS

Configured to allow requests from:
- `http://localhost:5173` (development)

## File Upload Limits

- Max file size: 100MB (configurable)
- Max files per request: 10
- Allowed MIME types: See backend config

## Examples

### cURL Examples

**Register:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"pass123","name":"Test User"}'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"pass123"}'
```

**Upload File:**
```bash
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/file.pdf"
```

**Get Files:**
```bash
curl http://localhost:5000/api/files \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Download File:**
```bash
curl http://localhost:5000/api/files/FILE_ID/download \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o downloaded_file.pdf
```

### JavaScript/Axios Examples

**Login:**
```javascript
import axios from 'axios';

const login = async () => {
  const response = await axios.post('http://localhost:5000/api/auth/login', {
    email: 'user@test.com',
    password: 'pass123'
  });

  const { token } = response.data.data;
  localStorage.setItem('token', token);
};
```

**Upload File:**
```javascript
const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('token');

  const response = await axios.post(
    'http://localhost:5000/api/files/upload',
    formData,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    }
  );

  return response.data.data;
};
```
