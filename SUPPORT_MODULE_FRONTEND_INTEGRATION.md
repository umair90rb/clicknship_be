# Support Module - Frontend Integration Documentation

> **Complete API Documentation for Feedback, Support Cases, and Feature Requests**
>
> Target Stack: React + TypeScript + TanStack Query v5 + React Hook Form

---

## Table of Contents

1. [Module Overview](#1-module-overview)
2. [Authentication](#2-authentication)
3. [Feedback API](#3-feedback-api)
4. [Support Cases API](#4-support-cases-api)
5. [Feature Requests API](#5-feature-requests-api)
6. [Admin API](#6-admin-api)
7. [File Attachments](#7-file-attachments)
8. [TypeScript Interfaces](#8-typescript-interfaces)
9. [Enums](#9-enums)
10. [Error Handling](#10-error-handling)
11. [State Management](#11-state-management)
12. [UI Mapping Guidance](#12-ui-mapping-guidance)
13. [Example API Calls](#13-example-api-calls)

---

## 1. Module Overview

The Support module provides three main features:

| Feature | Description | User Role |
|---------|-------------|-----------|
| **Feedback** | Star ratings (1-5) with category and description | Tenant Users |
| **Support Cases** | Issue tickets with priority, status tracking, attachments | Tenant Users |
| **Feature Requests** | Product improvement suggestions with attachments | Tenant Users |

**Key Characteristics:**
- Data stored in **Master Database** (cross-tenant)
- All endpoints require JWT authentication
- Attachments use S3 presigned URLs
- Admin endpoints for platform-wide management

---

## 2. Authentication

All Support module endpoints require JWT authentication.

**Headers Required:**
```typescript
{
  'Authorization': 'Bearer <jwt_token>',
  'Content-Type': 'application/json'
}
```

**Base URL:**
```
/api/v1
```

---

## 3. Feedback API

### Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/support/feedback/create` | Submit feedback | JWT |
| POST | `/support/feedback/list` | List tenant's feedback | JWT |
| GET | `/support/feedback/stats` | Get feedback statistics | JWT |

### Create Feedback

**POST** `/support/feedback/create`

**Request Body:**
```typescript
interface CreateFeedbackDto {
  stars: number;           // Required: 1-5 (integer)
  description: string;     // Required: non-empty string
  category: FeedbackCategory; // Required: enum value
}
```

**Validation Rules:**
| Field | Constraint |
|-------|------------|
| `stars` | Integer, Min: 1, Max: 5 |
| `description` | Non-empty string |
| `category` | Must be valid enum value |

**Response:**
```typescript
{
  data: {
    id: string;
    tenantId: string;
    userId: number;
    userEmail: string;
    userPhone: string | null;
    stars: number;
    description: string;
    category: string;
    createdAt: string;
    updatedAt: string;
  }
}
```

### List Feedback

**POST** `/support/feedback/list`

**Request Body:**
```typescript
interface ListFeedbackDto {
  skip?: number;              // Default: 0
  take?: number;              // Default: 100
  category?: FeedbackCategory; // Filter by category
  stars?: number;             // Filter by star rating (1-5)
  tenantId?: string;          // Admin only: filter by tenant
}
```

**Response:**
```typescript
{
  data: Feedback[];
  meta: {
    total: number;
    skip: number;
    take: number;
    category?: string;
    stars?: number;
  }
}
```

### Feedback Statistics

**GET** `/support/feedback/stats`

**Response:**
```typescript
{
  data: {
    total: number;
    averageStars: number | null;
    byCategory: {
      category: string;
      _count: number;
    }[];
  }
}
```

---

## 4. Support Cases API

### Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/support/cases/create` | Create support case | JWT |
| POST | `/support/cases/:id/confirm-attachments` | Confirm uploaded files | JWT |
| GET | `/support/cases/:id` | Get case by ID | JWT |
| POST | `/support/cases/list` | List tenant's cases | JWT |

### Create Support Case

**POST** `/support/cases/create`

**Request Body:**
```typescript
interface CreateSupportCaseDto {
  title: string;                    // Required: non-empty
  description: string;              // Required: non-empty
  priority?: SupportCasePriority;   // Optional: defaults to 'medium'
  attachments?: CreateAttachmentMetadataDto[]; // Optional: file metadata
}

interface CreateAttachmentMetadataDto {
  fileName: string;    // Required
  fileType: FileType;  // 'image' | 'audio' | 'video'
  mimeType: string;    // e.g., 'image/jpeg'
  fileSize: number;    // Bytes, Min: 1
}
```

**Response:**
```typescript
{
  data: {
    id: string;
    tenantId: string;
    userId: number;
    userEmail: string;
    userPhone: string | null;
    title: string;
    description: string;
    priority: string;
    status: string;              // Default: 'open'
    adminNotes: string | null;
    resolvedAt: string | null;
    createdAt: string;
    updatedAt: string;
    attachments: [];
  },
  attachmentUploadUrls: {
    uploadUrl: string;           // S3 presigned PUT URL
    key: string;                 // S3 object key
    metadata: CreateAttachmentMetadataDto;
  }[]
}
```

### Confirm Attachments

After uploading files to S3, confirm the attachments.

**POST** `/support/cases/:id/confirm-attachments`

**Request Body:**
```typescript
interface ConfirmAttachmentsBodyDto {
  attachments: ConfirmAttachmentUploadDto[];
}

interface ConfirmAttachmentUploadDto {
  key: string;         // S3 key from create response
  fileName: string;
  fileType: FileType;
  mimeType: string;
  fileSize: number;
}
```

**Response:** Same as Get Support Case

### Get Support Case

**GET** `/support/cases/:id`

**Response:**
```typescript
{
  data: {
    id: string;
    tenantId: string;
    userId: number;
    userEmail: string;
    userPhone: string | null;
    title: string;
    description: string;
    priority: string;
    status: string;
    adminNotes: string | null;
    resolvedAt: string | null;
    createdAt: string;
    updatedAt: string;
    attachments: {
      id: string;
      fileName: string;
      fileType: string;
      mimeType: string;
      fileSize: number;
      downloadUrl: string;   // S3 presigned GET URL
    }[];
  }
}
```

### List Support Cases

**POST** `/support/cases/list`

**Request Body:**
```typescript
interface ListSupportCasesDto {
  skip?: number;                    // Default: 0
  take?: number;                    // Default: 100
  status?: SupportCaseStatus;       // Filter by status
  priority?: SupportCasePriority;   // Filter by priority
  tenantId?: string;                // Admin only
  title?: string;                   // Search by title (case-insensitive)
}
```

**Response:**
```typescript
{
  data: SupportCase[];
  meta: {
    total: number;
    skip: number;
    take: number;
    status?: string;
    priority?: string;
    title?: string;
  }
}
```

---

## 5. Feature Requests API

### Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/support/feature-requests/create` | Create feature request | JWT |
| POST | `/support/feature-requests/:id/confirm-attachments` | Confirm uploaded files | JWT |
| GET | `/support/feature-requests/:id` | Get request by ID | JWT |
| POST | `/support/feature-requests/list` | List tenant's requests | JWT |

### Create Feature Request

**POST** `/support/feature-requests/create`

**Request Body:**
```typescript
interface CreateFeatureRequestDto {
  title: string;                    // Required: non-empty
  description: string;              // Required: non-empty
  attachments?: CreateAttachmentMetadataDto[]; // Optional
}
```

**Response:**
```typescript
{
  data: {
    id: string;
    tenantId: string;
    userId: number;
    userEmail: string;
    userPhone: string | null;
    title: string;
    description: string;
    status: string;              // Default: 'submitted'
    adminNotes: string | null;
    createdAt: string;
    updatedAt: string;
    attachments: [];
  },
  attachmentUploadUrls: {
    uploadUrl: string;
    key: string;
    metadata: CreateAttachmentMetadataDto;
  }[]
}
```

### Confirm Attachments

**POST** `/support/feature-requests/:id/confirm-attachments`

Same as Support Cases confirm attachments.

### Get Feature Request

**GET** `/support/feature-requests/:id`

**Response:**
```typescript
{
  data: {
    id: string;
    tenantId: string;
    userId: number;
    userEmail: string;
    userPhone: string | null;
    title: string;
    description: string;
    status: string;
    adminNotes: string | null;
    createdAt: string;
    updatedAt: string;
    attachments: {
      id: string;
      fileName: string;
      fileType: string;
      mimeType: string;
      fileSize: number;
      downloadUrl: string;
    }[];
  }
}
```

### List Feature Requests

**POST** `/support/feature-requests/list`

**Request Body:**
```typescript
interface ListFeatureRequestsDto {
  skip?: number;                     // Default: 0
  take?: number;                     // Default: 100
  status?: FeatureRequestStatus;     // Filter by status
  tenantId?: string;                 // Admin only
  title?: string;                    // Search by title (case-insensitive)
}
```

---

## 6. Admin API

Admin endpoints for platform-wide management.

### Feedback Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/support/feedback/list` | List all feedback (cross-tenant) |
| GET | `/admin/support/feedback/stats` | Get global feedback stats |

### Support Cases Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/support/cases/list` | List all cases (cross-tenant) |
| GET | `/admin/support/cases/:id` | Get case details |
| PATCH | `/admin/support/cases/:id/status` | Update case status |
| DELETE | `/admin/support/cases/:id` | Delete case |

**Update Status:**
```typescript
interface UpdateSupportCaseStatusDto {
  status: SupportCaseStatus;  // Required
  adminNotes?: string;        // Optional
}
```

### Feature Requests Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/support/feature-requests/list` | List all requests (cross-tenant) |
| GET | `/admin/support/feature-requests/:id` | Get request details |
| PATCH | `/admin/support/feature-requests/:id/status` | Update request status |
| DELETE | `/admin/support/feature-requests/:id` | Delete request |

**Update Status:**
```typescript
interface UpdateFeatureRequestStatusDto {
  status: FeatureRequestStatus;  // Required
  adminNotes?: string;           // Optional
}
```

### Attachments Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| DELETE | `/admin/support/attachments/:id` | Delete attachment |

---

## 7. File Attachments

### Upload Flow

1. **Create with attachment metadata** - Include file info in create request
2. **Receive presigned URLs** - Backend returns S3 upload URLs
3. **Upload to S3** - PUT file directly to S3 using presigned URL
4. **Confirm upload** - Call confirm endpoint with S3 keys

### Supported File Types

```typescript
enum FileType {
  image = 'image',
  audio = 'audio',
  video = 'video',
}
```

### Upload Example

```typescript
// Step 1: Create with attachment metadata
const createResponse = await api.post('/support/cases/create', {
  title: 'Bug Report',
  description: 'App crashes on login',
  priority: 'high',
  attachments: [
    {
      fileName: 'screenshot.png',
      fileType: 'image',
      mimeType: 'image/png',
      fileSize: 150000,
    }
  ]
});

// Step 2: Upload to S3
for (const upload of createResponse.attachmentUploadUrls) {
  await fetch(upload.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': upload.metadata.mimeType,
    },
  });
}

// Step 3: Confirm attachments
await api.post(`/support/cases/${createResponse.data.id}/confirm-attachments`, {
  attachments: createResponse.attachmentUploadUrls.map(u => ({
    key: u.key,
    fileName: u.metadata.fileName,
    fileType: u.metadata.fileType,
    mimeType: u.metadata.mimeType,
    fileSize: u.metadata.fileSize,
  }))
});
```

---

## 8. TypeScript Interfaces

### Complete Type Definitions

```typescript
// ============ Feedback ============

interface Feedback {
  id: string;
  tenantId: string;
  userId: number;
  userEmail: string;
  userPhone: string | null;
  stars: number;
  description: string;
  category: FeedbackCategory;
  createdAt: string;
  updatedAt: string;
}

interface FeedbackStats {
  total: number;
  averageStars: number | null;
  byCategory: {
    category: FeedbackCategory;
    _count: number;
  }[];
}

// ============ Support Case ============

interface SupportCase {
  id: string;
  tenantId: string;
  userId: number;
  userEmail: string;
  userPhone: string | null;
  title: string;
  description: string;
  priority: SupportCasePriority;
  status: SupportCaseStatus;
  adminNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
}

// ============ Feature Request ============

interface FeatureRequest {
  id: string;
  tenantId: string;
  userId: number;
  userEmail: string;
  userPhone: string | null;
  title: string;
  description: string;
  status: FeatureRequestStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
}

// ============ Attachment ============

interface Attachment {
  id: string;
  fileName: string;
  fileType: FileType;
  mimeType: string;
  fileSize: number;
  downloadUrl?: string;  // Present when fetching single item
}

interface AttachmentUploadInfo {
  uploadUrl: string;
  key: string;
  metadata: {
    fileName: string;
    fileType: FileType;
    mimeType: string;
    fileSize: number;
  };
}

// ============ Create DTOs ============

interface CreateFeedbackDto {
  stars: number;
  description: string;
  category: FeedbackCategory;
}

interface CreateSupportCaseDto {
  title: string;
  description: string;
  priority?: SupportCasePriority;
  attachments?: CreateAttachmentMetadataDto[];
}

interface CreateFeatureRequestDto {
  title: string;
  description: string;
  attachments?: CreateAttachmentMetadataDto[];
}

interface CreateAttachmentMetadataDto {
  fileName: string;
  fileType: FileType;
  mimeType: string;
  fileSize: number;
}

// ============ List DTOs ============

interface ListFeedbackDto {
  skip?: number;
  take?: number;
  category?: FeedbackCategory;
  stars?: number;
  tenantId?: string;
}

interface ListSupportCasesDto {
  skip?: number;
  take?: number;
  status?: SupportCaseStatus;
  priority?: SupportCasePriority;
  tenantId?: string;
  title?: string;
}

interface ListFeatureRequestsDto {
  skip?: number;
  take?: number;
  status?: FeatureRequestStatus;
  tenantId?: string;
  title?: string;
}

// ============ Update DTOs ============

interface UpdateSupportCaseStatusDto {
  status: SupportCaseStatus;
  adminNotes?: string;
}

interface UpdateFeatureRequestStatusDto {
  status: FeatureRequestStatus;
  adminNotes?: string;
}

// ============ Confirm Attachments ============

interface ConfirmAttachmentUploadDto {
  key: string;
  fileName: string;
  fileType: FileType;
  mimeType: string;
  fileSize: number;
}

interface ConfirmAttachmentsBodyDto {
  attachments: ConfirmAttachmentUploadDto[];
}

// ============ Response Types ============

interface ApiResponse<T> {
  data: T;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    skip: number;
    take: number;
    [key: string]: any;
  };
}

interface CreateWithAttachmentsResponse<T> {
  data: T;
  attachmentUploadUrls: AttachmentUploadInfo[];
}
```

---

## 9. Enums

### FeedbackCategory

```typescript
enum FeedbackCategory {
  feature = 'feature',        // Feature-related feedback
  module = 'module',          // Module-specific feedback
  general = 'general',        // General feedback
  ui_ux = 'ui_ux',           // UI/UX feedback
  performance = 'performance' // Performance feedback
}
```

### SupportCaseStatus

```typescript
enum SupportCaseStatus {
  open = 'open',                 // Newly created
  in_progress = 'in_progress',   // Being worked on
  pending_info = 'pending_info', // Awaiting user input
  resolved = 'resolved',         // Issue resolved
  closed = 'closed'              // Case closed
}
```

**Status Flow:**
```
open → in_progress → pending_info ↔ in_progress → resolved → closed
```

### SupportCasePriority

```typescript
enum SupportCasePriority {
  low = 'low',
  medium = 'medium',     // Default
  high = 'high',
  critical = 'critical'
}
```

### FeatureRequestStatus

```typescript
enum FeatureRequestStatus {
  submitted = 'submitted',           // Initial state
  under_review = 'under_review',     // Being evaluated
  planned = 'planned',               // Accepted, planned for development
  in_development = 'in_development', // Currently being built
  completed = 'completed',           // Feature released
  rejected = 'rejected'              // Not accepted
}
```

**Status Flow:**
```
submitted → under_review → planned → in_development → completed
                        ↘ rejected
```

### FileType

```typescript
enum FileType {
  image = 'image',
  audio = 'audio',
  video = 'video'
}
```

---

## 10. Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}
```

### Common Errors

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Bad Request | Validation failed |
| 401 | Unauthorized | Missing/invalid token |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Server error |

### Validation Errors (400)

```typescript
// Stars out of range
{
  statusCode: 400,
  message: ["stars must not be greater than 5", "stars must not be less than 1"],
  error: "Bad Request"
}

// Missing required field
{
  statusCode: 400,
  message: ["title should not be empty"],
  error: "Bad Request"
}

// Invalid enum value
{
  statusCode: 400,
  message: ["category must be a valid enum value"],
  error: "Bad Request"
}
```

### Not Found Errors (404)

```typescript
// Support case not found
{
  statusCode: 404,
  message: "Support case not found"
}

// Feature request not found
{
  statusCode: 404,
  message: "Feature request not found"
}

// Attachment not found
{
  statusCode: 404,
  message: "Attachment not found"
}
```

### Frontend Error Mapping

```typescript
const errorMessages: Record<string, string> = {
  'Support case not found': 'This support case no longer exists',
  'Feature request not found': 'This feature request no longer exists',
  'Attachment not found': 'This file no longer exists',
  'stars must not be greater than 5': 'Rating must be between 1 and 5 stars',
  'title should not be empty': 'Please enter a title',
  'description should not be empty': 'Please provide a description',
};
```

---

## 11. State Management

### Cache Configuration (TanStack Query)

| Data | Cache Time | Stale Time | Notes |
|------|------------|------------|-------|
| Feedback List | 5 min | 2 min | Changes infrequently |
| Feedback Stats | 5 min | 2 min | Aggregate data |
| Support Cases List | 2 min | 30 sec | Status changes often |
| Support Case Detail | 2 min | 30 sec | May have updates |
| Feature Requests List | 5 min | 2 min | Changes less often |
| Feature Request Detail | 5 min | 2 min | May have updates |

### Query Keys

```typescript
const queryKeys = {
  feedback: {
    all: ['feedback'] as const,
    list: (filters?: ListFeedbackDto) => ['feedback', 'list', filters] as const,
    stats: (tenantId?: string) => ['feedback', 'stats', tenantId] as const,
  },
  supportCases: {
    all: ['support-cases'] as const,
    list: (filters?: ListSupportCasesDto) => ['support-cases', 'list', filters] as const,
    detail: (id: string) => ['support-cases', 'detail', id] as const,
  },
  featureRequests: {
    all: ['feature-requests'] as const,
    list: (filters?: ListFeatureRequestsDto) => ['feature-requests', 'list', filters] as const,
    detail: (id: string) => ['feature-requests', 'detail', id] as const,
  },
};
```

### Invalidation Rules

```typescript
// After creating feedback
queryClient.invalidateQueries({ queryKey: queryKeys.feedback.all });

// After creating/updating support case
queryClient.invalidateQueries({ queryKey: queryKeys.supportCases.all });

// After status update
queryClient.invalidateQueries({
  queryKey: queryKeys.supportCases.detail(id)
});
queryClient.invalidateQueries({
  queryKey: queryKeys.supportCases.list()
});

// After confirming attachments
queryClient.invalidateQueries({
  queryKey: queryKeys.supportCases.detail(id)
});
```

### Optimistic Updates

**Recommended for:**
- Status changes (support cases, feature requests)

**NOT recommended for:**
- Creating new items (need server-generated ID)
- File uploads (async process)

---

## 12. UI Mapping Guidance

### User-Facing Screens

| Screen | Endpoints | Description |
|--------|-----------|-------------|
| **Feedback Form** | POST `/support/feedback/create` | Star rating + description + category |
| **Feedback History** | POST `/support/feedback/list` | User's submitted feedback |
| **My Support Cases** | POST `/support/cases/list` | List of user's tickets |
| **Create Support Case** | POST `/support/cases/create` | Form with attachments |
| **Support Case Detail** | GET `/support/cases/:id` | View case + attachments |
| **My Feature Requests** | POST `/support/feature-requests/list` | List of suggestions |
| **Create Feature Request** | POST `/support/feature-requests/create` | Form with attachments |
| **Feature Request Detail** | GET `/support/feature-requests/:id` | View request + status |

### Admin Screens

| Screen | Endpoints | Description |
|--------|-----------|-------------|
| **All Feedback** | POST `/admin/support/feedback/list` | Cross-tenant feedback |
| **Feedback Dashboard** | GET `/admin/support/feedback/stats` | Stats + charts |
| **Support Queue** | POST `/admin/support/cases/list` | All open cases |
| **Case Management** | PATCH `/admin/support/cases/:id/status` | Update status + notes |
| **Feature Requests Board** | POST `/admin/support/feature-requests/list` | Kanban by status |
| **Request Review** | PATCH `/admin/support/feature-requests/:id/status` | Accept/reject |

### Component Suggestions

```typescript
// Feedback Form
- Star rating component (1-5 stars)
- Category dropdown (FeedbackCategory enum)
- Description textarea
- Submit button

// Support Case Form
- Title input
- Description textarea (rich text optional)
- Priority select (SupportCasePriority enum)
- File upload dropzone (image/audio/video)
- Submit button with loading state

// Support Case Card
- Title, status badge, priority badge
- Created date, resolved date
- Attachment count indicator
- Click to view details

// Status Badge Colors
const statusColors = {
  // Support Cases
  open: 'blue',
  in_progress: 'yellow',
  pending_info: 'orange',
  resolved: 'green',
  closed: 'gray',
  // Feature Requests
  submitted: 'blue',
  under_review: 'yellow',
  planned: 'purple',
  in_development: 'cyan',
  completed: 'green',
  rejected: 'red',
};

// Priority Badge Colors
const priorityColors = {
  low: 'gray',
  medium: 'blue',
  high: 'orange',
  critical: 'red',
};
```

---

## 13. Example API Calls

### Axios Setup

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Feedback Hooks

```typescript
// Submit feedback
export const useSubmitFeedback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateFeedbackDto) => {
      const { data } = await api.post('/support/feedback/create', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
  });
};

// List feedback
export const useFeedbackList = (filters: ListFeedbackDto) => {
  return useQuery({
    queryKey: ['feedback', 'list', filters],
    queryFn: async () => {
      const { data } = await api.post('/support/feedback/list', filters);
      return data;
    },
  });
};

// Feedback stats
export const useFeedbackStats = () => {
  return useQuery({
    queryKey: ['feedback', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/support/feedback/stats');
      return data.data;
    },
  });
};
```

### Support Case Hooks

```typescript
// Create support case with attachments
export const useCreateSupportCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dto,
      files,
    }: {
      dto: CreateSupportCaseDto;
      files?: File[];
    }) => {
      // Prepare attachment metadata
      const attachments = files?.map((file) => ({
        fileName: file.name,
        fileType: getFileType(file.type) as FileType,
        mimeType: file.type,
        fileSize: file.size,
      }));

      // Create case with metadata
      const { data: createResponse } = await api.post('/support/cases/create', {
        ...dto,
        attachments,
      });

      // Upload files to S3
      if (createResponse.attachmentUploadUrls?.length) {
        await Promise.all(
          createResponse.attachmentUploadUrls.map(
            (upload: AttachmentUploadInfo, index: number) =>
              fetch(upload.uploadUrl, {
                method: 'PUT',
                body: files![index],
                headers: {
                  'Content-Type': upload.metadata.mimeType,
                },
              })
          )
        );

        // Confirm attachments
        await api.post(
          `/support/cases/${createResponse.data.id}/confirm-attachments`,
          {
            attachments: createResponse.attachmentUploadUrls.map(
              (u: AttachmentUploadInfo) => ({
                key: u.key,
                fileName: u.metadata.fileName,
                fileType: u.metadata.fileType,
                mimeType: u.metadata.mimeType,
                fileSize: u.metadata.fileSize,
              })
            ),
          }
        );
      }

      return createResponse.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-cases'] });
    },
  });
};

// Helper function
function getFileType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'image'; // fallback
}

// List support cases
export const useSupportCases = (filters: ListSupportCasesDto) => {
  return useQuery({
    queryKey: ['support-cases', 'list', filters],
    queryFn: async () => {
      const { data } = await api.post('/support/cases/list', filters);
      return data;
    },
  });
};

// Get support case detail
export const useSupportCase = (id: string) => {
  return useQuery({
    queryKey: ['support-cases', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get(`/support/cases/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
};
```

### Admin Hooks

```typescript
// Update support case status
export const useUpdateCaseStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      dto,
    }: {
      id: string;
      dto: UpdateSupportCaseStatusDto;
    }) => {
      const { data } = await api.patch(`/admin/support/cases/${id}/status`, dto);
      return data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['support-cases'] });
      queryClient.invalidateQueries({
        queryKey: ['support-cases', 'detail', id],
      });
    },
  });
};

// Update feature request status
export const useUpdateFeatureRequestStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      dto,
    }: {
      id: string;
      dto: UpdateFeatureRequestStatusDto;
    }) => {
      const { data } = await api.patch(
        `/admin/support/feature-requests/${id}/status`,
        dto
      );
      return data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
      queryClient.invalidateQueries({
        queryKey: ['feature-requests', 'detail', id],
      });
    },
  });
};

// Delete support case
export const useDeleteSupportCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/admin/support/cases/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-cases'] });
    },
  });
};
```

### React Hook Form Example

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const supportCaseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

type SupportCaseFormData = z.infer<typeof supportCaseSchema>;

function CreateSupportCaseForm() {
  const createCase = useCreateSupportCase();
  const [files, setFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SupportCaseFormData>({
    resolver: zodResolver(supportCaseSchema),
    defaultValues: {
      priority: 'medium',
    },
  });

  const onSubmit = async (data: SupportCaseFormData) => {
    await createCase.mutateAsync({
      dto: data,
      files,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} placeholder="Title" />
      {errors.title && <span>{errors.title.message}</span>}

      <textarea {...register('description')} placeholder="Description" />
      {errors.description && <span>{errors.description.message}</span>}

      <select {...register('priority')}>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="critical">Critical</option>
      </select>

      <input
        type="file"
        multiple
        accept="image/*,audio/*,video/*"
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
      />

      <button type="submit" disabled={createCase.isPending}>
        {createCase.isPending ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

---

## Summary

| Entity | User Endpoints | Admin Endpoints |
|--------|----------------|-----------------|
| **Feedback** | 3 (create, list, stats) | 2 (list, stats) |
| **Support Cases** | 4 (create, confirm, get, list) | 4 (list, get, status, delete) |
| **Feature Requests** | 4 (create, confirm, get, list) | 4 (list, get, status, delete) |
| **Attachments** | - | 1 (delete) |

**Total: 22 endpoints**

---

*Generated: December 2024*
*API Version: v1*
*Base URL: /api/v1*
