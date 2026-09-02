# Project Tracker & Digital Team Management Platform

A high-quality, production-ready Project Tracker and Team Management System custom-tailored for managing 40–50 team members (students & employees) working on diverse digital projects (web apps, mobile apps, BMS, podcast/media, social media, research, etc.).

---

## 🏗️ Technical Architecture

- **Backend**: Node.js + Express + TypeScript
- **Database**: MongoDB / MongoDB Atlas + Mongoose ODM (NoSQL)
- **Frontend**: React 18 + Vite + Vanilla CSS System (Design Tokens)
- **State Management**: Zustand (Auth & UI) + TanStack Query (Server State)
- **Authentication**: JWT (Access Token in-memory + Refresh Token httpOnly Cookie)
- **Security**: Server-side RBAC, strict Zod validation, magic-byte file validation, security headers via Helmet

---

## 👥 Role & Permissions Model

1. **Admin**: Org-wide control, user management, project creation, global dashboard.
2. **Project Lead**: Single primary lead per project. Manages milestones, tasks, member assignments, and project status.
3. **Team Member**: Executing assigned tasks, updating task status (TODO → IN_PROGRESS → REVIEW), adding comments & attachments.

---

## 🛠️ Project Setup

### Prerequisites
- Node.js (v18+)
- MongoDB or MongoDB Atlas cluster

### Backend Setup
```bash
cd backend
npm install
# Set DATABASE_URL in .env (e.g., mongodb+srv://<user>:<password>@cluster0.../project_tracker?retryWrites=true&w=majority)
npm run seed     # Seeds initial admin, student users, and project data
npm run dev      # Starts development server on http://localhost:3001
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev      # Starts frontend dev server on http://localhost:5173
```

---

## 📁 Repository Structure

```
├── backend/
│   ├── src/
│   │   ├── config/          # Environment & MongoDB configuration
│   │   ├── models/          # Mongoose NoSQL Schemas & Models
│   │   ├── middlewares/     # Auth, RBAC, Validation, Error middlewares
│   │   ├── modules/         # Auth, Users, Projects, Milestones, Tasks, etc.
│   │   └── utils/           # API response helpers, Logger, Seed helper
│   └── uploads/             # Server file uploads
├── frontend/
│   ├── src/
│   │   ├── components/      # Shared UI design system components
│   │   ├── store/           # Zustand stores (Auth, UI)
│   │   ├── pages/           # Admin, Lead, and Member views
│   │   └── services/        # Fetch wrapper with JWT injection
```
