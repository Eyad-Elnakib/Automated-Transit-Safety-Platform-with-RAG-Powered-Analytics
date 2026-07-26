# Driver Monitoring Dashboard

Full-stack React + Tailwind frontend with a Node.js + Express + MongoDB backend for managing drivers.

---

## Folder Structure

```
Dashboard/
├── backend/          ← Express + Mongoose API
│   ├── models/
│   │   └── Driver.js
│   ├── routes/
│   │   └── drivers.js
│   ├── .env
│   ├── package.json
│   ├── seed.js       ← seed script (loads 8 sample drivers)
│   └── server.js
└── frontend/         ← Vite + React + Tailwind
    └── src/
        ├── api/
        │   └── driversApi.js   ← fetch wrappers for all CRUD calls
        ├── features/drivers/
        │   ├── AddDriverPage.jsx
        │   ├── DriverDetailsPage.jsx
        │   ├── DriversPage.jsx     ← View / Edit / Delete buttons per row
        │   └── EditDriverPage.jsx
        └── ...
```

---

## Prerequisites

- **Node.js** ≥ 18
- **MongoDB** running locally on port 27017 (or update `MONGO_URI` in `backend/.env`)

---

## Backend Setup

```bash
cd Dashboard/backend
npm install
npm run seed      # optional — seeds 8 sample drivers
npm run dev       # starts on http://localhost:5000
```

### REST API

| Method | Endpoint              | Description                        |
|--------|-----------------------|------------------------------------|
| GET    | /api/drivers          | List all drivers                   |
| GET    | /api/drivers/:id      | Get a single driver (by MongoDB _id) |
| POST   | /api/drivers          | Create driver `{ id, name }`       |
| PUT    | /api/drivers/:id      | Update driver `{ id, name }`       |
| DELETE | /api/drivers/:id      | Delete driver                      |

> `avgScore` and `totalTrips` are **read-only** — they default to `0` on creation and are managed by the system.

---

## Frontend Setup

```bash
cd Dashboard/frontend
npm install
npm run dev       # starts on http://localhost:5173
```

Vite proxies all `/api/*` requests to `http://localhost:5000`, so no CORS issues during development.

---

## CRUD Flow

| Action | Where |
|--------|-------|
| **Create** | Drivers page → "Add Driver" button → form → POST /api/drivers |
| **Read** | Drivers page lists all drivers fetched from GET /api/drivers |
| **Update** | Each row → "Edit" button → pre-filled form → PUT /api/drivers/:id |
| **Delete** | Each row → "Delete" button → confirmation modal → DELETE /api/drivers/:id |
| **View** | Each row → "View" button → driver detail page |
