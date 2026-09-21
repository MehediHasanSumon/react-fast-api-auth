# Access & User Management - Backend API

FastAPI-based high performance backend service for Access & User Management with PostgreSQL database, SQLAlchemy ORM, and Alembic migrations.

## Features
- **FastAPI**: Modern, fast (high-performance) web framework.
- **PostgreSQL & SQLAlchemy 2.0**: Type-safe ORM models with `TimestampMixin` and connection pooling.
- **Alembic Migrations**: Full migration tracking with automated revision generation.
- **Custom CLI Tooling**: `python3 make table:<name>`, `python3 make migrations`, `python3 migrate`.
- **Pydantic v2**: Type validation & serialization with camelCase alias support matching the frontend.
- **CORS Configured**: Ready for frontend communication (`http://localhost:5173`).
- **Interactive Documentation**: Swagger UI at `/docs` and ReDoc at `/redoc`.

---

## Database Configuration & CLI Commands

You can execute these commands from the **project root** or from inside `backend/`:

### 1. Generate Models (`make table:<name>`)
Automatically creates an SQLAlchemy model in `app/models/<name>.py` and registers it in `app/models/__init__.py`:
```bash
python3 make table:user
python3 make table:session
```

### 2. Generate Migrations (`make migrations`)
Inspects all registered SQLAlchemy models against the current database schema and creates an Alembic migration:
```bash
python3 make migrations
# Or with a custom message:
python3 make migrations "create user table"
```

### 3. Run Migrations (`migrate`)
Applies all pending migrations to the PostgreSQL database:
```bash
python3 migrate
# Or:
python3 make migrate
```

### 4. Rollback Migrations (`migrate:rollback`)
Rolls back the most recent migration:
```bash
python3 migrate rollback
# Or:
python3 make rollback
```

### 5. Check Migration Status (`migrate:status`)
Displays live database revision status and revision history from disk:
```bash
python3 migrate status
# Or:
python3 make status
```

### 6. Seed Database (`make seed`)
Populates the database with initial admin user, roles, and permissions:
```bash
python3 make seed
```

### 7. Create Database (`make db:create`)
Creates the PostgreSQL database (`hospital_db`) if it doesn't already exist:
```bash
python3 make db:create
```

---

## Getting Started

### 1. Setup PostgreSQL Credentials
Edit `backend/.env` with your PostgreSQL password and user credentials:
```ini
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password_here
POSTGRES_DB=hospital_db
```

### 2. Run Development Server
From the project root:
```bash
./run.sh
```
Or manually:
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## API Documentation Links
Once the server is running on `http://localhost:8000`:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **OpenAPI Schema**: [http://localhost:8000/api/v1/openapi.json](http://localhost:8000/api/v1/openapi.json)
- **Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
- **Users List / Create**: [http://localhost:8000/api/v1/users/](http://localhost:8000/api/v1/users/)
