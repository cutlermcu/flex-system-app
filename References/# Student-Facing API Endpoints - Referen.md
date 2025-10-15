# Student-Facing API Endpoints - Reference Guide

## Overview
These 3 new endpoints provide everything needed for the student dashboard. They all require authentication and automatically filter data based on the student's grade and permissions.

---

## 1. Get Upcoming Flex Dates

**Endpoint:** `GET /api/flex-dates/upcoming`

**Authentication:** Required (student, teacher, or admin)

**What it does:** 
- Returns all flex dates in the next 7 days for students
- Returns all future flex dates (up to 1 year) for teachers/admins
- Includes the user's registration status for each date
- Shows total sessions and students registered per date

**Response Example:**
```json
{
  "flexDates": [
    {
      "id": "uuid",
      "date": "2025-10-15",
      "flex_type": "ACCESS",
      "duration_minutes": 90,
      "selection_deadline": "2025-10-14T14:00:00Z",
      "is_locked": false,
      "total_sessions": 42,
      "students_registered": 720,
      "my_registration": {
        "id": "uuid",
        "status": "selected",
        "session": {
          "id": "uuid",
          "title": "Math Tutoring",
          "room_number": "203",
          "teacher": { "name": "Sarah Johnson" }
        }
      }
    }
  ],
  "today": "2025-10-10"
}
```

**Use in Frontend:**
```typescript
// Fetch upcoming flex dates
const response = await fetch('/api/flex-dates/upcoming');
const data = await response.json();

// data.flexDates is an array of flex dates with registration status
// data.today is the current date for comparison
```

---

## 2. Get Available Sessions for a Date

**Endpoint:** `GET /api/sessions/available?date=YYYY-MM-DD`

**Authentication:** Required (student, teacher, or admin)

**Query Parameters:**
- `date` (required) - The flex date in YYYY-MM-DD format

**What it does:**
- Returns all sessions for the specified date
- Students only see sessions for their grade level
- Teachers/admins see all sessions
- Includes enrollment counts and capacity info
- Shows if user is already registered
- Indicates if session is full
- Includes deadline status

**Response Example:**
```json
{
  "flexDate": {
    "id": "uuid",
    "date": "2025-10-15",
    "flex_type": "ACCESS",
    "duration_minutes": 90,
    "selection_deadline": "2025-10-14T14:00:00Z",
    "is_locked": false
  },
  "sessions": [
    {
      "id": "uuid",
      "title": "Math Tutoring - Algebra Review",
      "long_description": "Open tutoring for algebra topics...",
      "room_number": "203",
      "capacity": 15,
      "allowed_grades": [9, 10, 11, 12],
      "teacher": {
        "name": "Sarah Johnson",
        "email": "sjohnson@school.edu"
      },
      "enrolled": 8,
      "is_full": false,
      "my_registration": null
    },
    {
      "id": "uuid",
      "title": "Science Lab Makeup",
      "long_description": "Make up missed lab work...",
      "room_number": "105",
      "capacity": 20,
      "allowed_grades": [10, 11, 12],
      "teacher": {
        "name": "Mike Thompson",
        "email": "mthompson@school.edu"
      },
      "enrolled": 20,
      "is_full": true,
      "my_registration": null
    }
  ],
  "myCurrentRegistration": {
    "id": "uuid",
    "status": "selected",
    "session": {
      "id": "uuid",
      "title": "Math Tutoring - Algebra Review",
      "room_number": "203",
      "teacher": { "name": "Sarah Johnson" }
    }
  },
  "canSelect": true
}
```

**Use in Frontend:**
```typescript
// Fetch available sessions for a specific date
const date = '2025-10-15';
const response = await fetch(`/api/sessions/available?date=${date}`);
const data = await response.json();

// data.sessions - array of all available sessions
// data.myCurrentRegistration - student's current selection (if any)
// data.canSelect - boolean indicating if deadline has passed
```

---

## 3. Get User's Notifications

**Endpoint:** `GET /api/notifications/my-notifications`

**Authentication:** Required (student)

**Query Parameters (optional):**
- `unread_only=true` - Only return unread notifications
- `limit=50` - Maximum number of notifications to return (default: 50)

**What it does:**
- Returns all notifications for the logged-in student
- Includes unread count
- Shows full session details for removal/lock notifications
- Sorted by newest first

**Response Example:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "removed",
      "message": "You have been removed from Math Tutoring. Please select another session.",
      "read": false,
      "flex_date": "2025-10-15",
      "created_at": "2025-10-13T10:30:00Z",
      "session": {
        "id": "uuid",
        "title": "Math Tutoring",
        "room_number": "203",
        "teacher": { "name": "Sarah Johnson" }
      }
    },
    {
      "id": "uuid",
      "type": "locked",
      "message": "You have been locked to Chemistry Test Prep. You cannot change this selection.",
      "read": true,
      "flex_date": "2025-10-17",
      "created_at": "2025-10-12T09:15:00Z",
      "session": {
        "id": "uuid",
        "title": "Chemistry Test Prep",
        "room_number": "220",
        "teacher": { "name": "Tom Martinez" }
      }
    }
  ],
  "unread_count": 1
}
```

**Use in Frontend:**
```typescript
// Fetch all notifications
const response = await fetch('/api/notifications/my-notifications');
const data = await response.json();

// data.notifications - array of notifications
// data.unread_count - number of unread notifications (for badge)

// Fetch only unread notifications
const unreadResponse = await fetch('/api/notifications/my-notifications?unread_only=true');
```

---

## 4. Mark Notifications as Read

**Endpoint:** `PATCH /api/notifications/my-notifications`

**Authentication:** Required (student)

**Request Body:**
```json
// Option 1: Mark specific notification as read
{
  "notification_id": "uuid"
}

// Option 2: Mark all notifications as read
{
  "mark_all_read": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

**Use in Frontend:**
```typescript
// Mark single notification as read
await fetch('/api/notifications/my-notifications', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ notification_id: 'uuid' })
});

// Mark all as read
await fetch('/api/notifications/my-notifications', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mark_all_read: true })
});
```

---

## Complete Student Flow Example

Here's how these APIs work together for a complete student experience:

```typescript
// 1. Student logs in and sees upcoming flex days
const upcomingResponse = await fetch('/api/flex-dates/upcoming');
const { flexDates } = await upcomingResponse.json();

// 2. Student checks notifications
const notifResponse = await fetch('/api/notifications/my-notifications');
const { notifications, unread_count } = await notifResponse.json();

// 3. Student clicks on a specific flex date
const selectedDate = '2025-10-15';
const sessionsResponse = await fetch(`/api/sessions/available?date=${selectedDate}`);
const { sessions, myCurrentRegistration, canSelect } = await sessionsResponse.json();

// 4. Student selects a session (using existing API)
await fetch('/api/registrations/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ session_id: 'selected-session-uuid' })
});

// 5. Student marks notifications as read
await fetch('/api/notifications/my-notifications', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mark_all_read: true })
});
```

---

## Data Filtering & Security

All these endpoints are protected by Row Level Security:

- **Students** only see:
  - Flex dates within 7 days
  - Sessions for their grade level
  - Their own notifications
  - Their own registrations

- **Teachers** see:
  - All future flex dates
  - All sessions
  - Cannot access student notifications

- **Admins** see:
  - Everything
  - All dates, all sessions, all data

---

## Error Handling

All endpoints return standard HTTP status codes:

- `200` - Success
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (doesn't have permission)
- `404` - Not found
- `400` - Bad request (validation error)
- `500` - Server error

**Error Response Format:**
```json
{
  "error": "Error message here"
}
```

---

## Testing These Endpoints

You can test these now with tools like:

### Using curl:
```bash
# Get upcoming flex dates (requires authentication cookie)
curl http://localhost:3000/api/flex-dates/upcoming

# Get sessions for a date
curl "http://localhost:3000/api/sessions/available?date=2025-10-15"

# Get notifications
curl http://localhost:3000/api/notifications/my-notifications
```

### Using Postman:
1. Import the endpoints
2. Make sure you're logged in (cookies are set)
3. Send requests

### Using Browser DevTools:
```javascript
// In browser console (after logging in)
fetch('/api/flex-dates/upcoming')
  .then(r => r.json())
  .then(console.log);
```

---

## What's Next?

With these 3 APIs completed, you now have everything needed to build the student dashboard:

✅ **Get upcoming flex days** → Show list of upcoming flex periods  
✅ **Get available sessions** → Show sessions student can select  
✅ **Get notifications** → Show notification bell with unread count  
✅ **Register for session** → Already built (`POST /api/registrations/create`)  
✅ **Cancel registration** → Already built (`DELETE /api/registrations/[id]`)

**You can now build the complete student frontend!**