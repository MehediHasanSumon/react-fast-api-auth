# Access & User Management System

A full-stack, enterprise-grade User, Role, and Permission Management platform built with a **FastAPI (Python) backend**, **PostgreSQL database**, **SQLAlchemy ORM**, **Alembic migrations**, and a modern **React 19 + TypeScript + Tailwind CSS** frontend adhering to a Preline UI-inspired design system.

---

## 🚀 Key Features

### Frontend (React 19 + TypeScript + Vite)
- **Design System**: Preline UI-inspired Tailwind CSS design tokens.
- **Theme Modes**: Full Light, Dark, and System theme synchronization.
- **Modular Component Library**: Reusable form controls (`Input`, `Select`, `Textarea`, `Checkbox`), `Dialog`, `Accordion`, `Alert`, and `Button`.
- **Strict Validation**: React Hook Form + Zod schema validation with required field indicators (`*`) and accessible inline error feedback.
- **Routing & Views**:
  - User, Role & Permission Management (`/users`, `/roles`, `/permissions`)
  - Complete Authentication Suite (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/verify-otp`, `/two-factor`, etc.)
  - Dedicated Status/Error Pages (`/400`, `/401`, `/403`, `/404`, `/405`, `/408`, `/409`, `/419`, `/422`, `/429`, `/500`, `/502`, `/503`, `/504`)
- **State Management**: Redux Toolkit slices.

### Backend (FastAPI + Python 3.14)
- **FastAPI**: Modern asynchronous REST API with auto-generated OpenAPI docs.
- **PostgreSQL & SQLAlchemy 2.0**: Relational database with connection pooling and `TimestampMixin`.
- **Alembic Migrations**: Fully integrated database migrations with auto-generation and versioning.
- **Custom CLI Tooling**: Artisan/Laravel-style commands (`make table:<name>`, `make migrations`, `migrate`).
- **Interactive Documentation**: Swagger UI at `/docs` and ReDoc at `/redoc`.

---

## ⚡ Quick Start

### 1. Run Everything Concurrently
To start both React (frontend) and FastAPI (backend) concurrently with one command:
```bash
./run.sh
```
*(If ports are occupied, use `./run.sh --kill` to automatically free ports `8000` and `5173`)*

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API & Health**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
- **Swagger Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🛠️ Database CLI Commands

Run these commands directly from the **project root** or from `backend/`:

```bash
# Generate a new SQLAlchemy Model and auto-register it
python3 make table:user
python3 make table:session

# Generate a new Alembic migration revision
python3 make migrations
python3 make migrations "create user table"

# Apply all pending migrations to PostgreSQL
python3 migrate

# Rollback the last migration
python3 migrate rollback

# Check live migration status & history
python3 migrate status

# Seed initial database records (admin user, roles, permissions)
python3 make seed

# Create PostgreSQL database
python3 make db:create

# Show CLI help reference
python3 make help
```

---

## 📁 Project Structure

```text
hospital/
├── backend/
│   ├── alembic/              # Alembic migration configurations & versions
│   ├── app/
│   │   ├── api/v1/           # API router and endpoints (auth, users, roles, permissions)
│   │   ├── cli/              # make and migrate CLI command engine
│   │   ├── core/             # Settings, CORS, and Pydantic configuration
│   │   ├── db/               # SQLAlchemy Base, Session, and Seeders
│   │   ├── models/           # Database models (User, Session, Role, Permission)
│   │   ├── schemas/          # Pydantic schemas (camelCase aliases)
│   │   └── main.py           # FastAPI entrypoint application
│   ├── requirements.txt      # Pinned Python dependencies
│   ├── .env.example          # Backend environment template
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/       # UI primitive components & Management modals
│   │   ├── pages/            # Auth pages, Error pages, Users, Roles, Permissions
│   │   ├── store/            # Redux store and slices
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── make                      # Root CLI make command wrapper
├── migrate                   # Root CLI migrate command wrapper
├── run.sh                    # Full stack development server runner
├── .gitignore                # Comprehensive Git ignore rules
└── GEMINI.md                 # Project architecture & design system rules
```
