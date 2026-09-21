#!/usr/bin/env python3
import os
import sys
import re
import subprocess
from datetime import datetime

# ANSI Colors
BOLD = "\033[1m"
RESET = "\033[0m"
BLUE = "\033[1;34m"
GREEN = "\033[1;32m"
YELLOW = "\033[1;33m"
CYAN = "\033[1;36m"
RED = "\033[1;31m"
GRAY = "\033[0;90m"

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, BASE_DIR)


def pluralize(word: str) -> str:
    """Pluralize snake_case table name."""
    if word.endswith("y") and not word.endswith(("ay", "ey", "oy", "uy")):
        return word[:-1] + "ies"
    elif word.endswith(("s", "sh", "ch", "x", "z")):
        return word + "es"
    return word + "s"


def to_pascal_case(name: str) -> str:
    """Convert snake_case or table_name to PascalCase."""
    parts = name.replace("-", "_").split("_")
    return "".join(p.capitalize() for p in parts)


def to_snake_case(name: str) -> str:
    """Convert PascalCase or mixed to snake_case."""
    s1 = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", s1).lower()


def make_table(table_spec: str):
    """
    Generate a new SQLAlchemy model file and register it in models/__init__.py
    Usage: python3 make table:<name>
    """
    raw_name = table_spec.split(":", 1)[1] if ":" in table_spec else table_spec
    raw_name = raw_name.strip()
    if not raw_name:
        print(f"{RED}[ERROR] Missing table name. Example: python3 make table:user{RESET}")
        sys.exit(1)

    module_name = to_snake_case(raw_name)
    class_name = to_pascal_case(raw_name)
    table_name = pluralize(module_name)

    models_dir = os.path.join(BASE_DIR, "app", "models")
    os.makedirs(models_dir, exist_ok=True)
    target_file = os.path.join(models_dir, f"{module_name}.py")

    if os.path.exists(target_file):
        print(f"{YELLOW}[WARNING] Model file already exists at {target_file}{RESET}")
        print(f"Skipping file generation to avoid overwriting existing code.")
        return

    # Specific templates based on common application models
    if module_name == "user":
        columns_code = """    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="staff", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)"""
        extra_imports = "from sqlalchemy import Column, String, Boolean"
    elif module_name == "session":
        columns_code = """    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_token = Column(String(255), unique=True, index=True, nullable=False)
    refresh_token = Column(String(500), unique=True, index=True, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)

    user = relationship("User", back_populates="sessions")"""
        extra_imports = "from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey\nfrom sqlalchemy.orm import relationship"
    else:
        columns_code = f"""    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String(255), nullable=False, index=True)
    status = Column(String(50), default="active", nullable=False)
    description = Column(Text, nullable=True)"""
        extra_imports = "from sqlalchemy import Column, String, Text"

    file_content = f"""import uuid
{extra_imports}
from app.db.base import Base, TimestampMixin


class {class_name}(Base, TimestampMixin):
    \"\"\"
    {class_name} SQLAlchemy model for the '{table_name}' table.
    \"\"\"
    __tablename__ = "{table_name}"

{columns_code}

    def __repr__(self) -> str:
        return f"<{class_name} id={{self.id}}>"
"""

    with open(target_file, "w", encoding="utf-8") as f:
        f.write(file_content)

    print(f"{GREEN}[SUCCESS] Created model file:{RESET} app/models/{module_name}.py")
    print(f"  • Model Class: {BOLD}{class_name}{RESET}")
    print(f"  • Table Name:  {BOLD}{table_name}{RESET}")

    # Register in app/models/__init__.py
    init_file = os.path.join(models_dir, "__init__.py")
    register_in_models_init(init_file, module_name, class_name)

    print(f"\n{CYAN}Next Step:{RESET} Run {BOLD}python3 make migrations{RESET} to generate database migration.")


def register_in_models_init(init_file: str, module_name: str, class_name: str):
    """Ensure model is imported and registered in __all__ in app/models/__init__.py"""
    if not os.path.exists(init_file):
        with open(init_file, "w", encoding="utf-8") as f:
            f.write(f"from app.db.base import Base\nfrom app.models.{module_name} import {class_name}\n\n__all__ = [\"Base\", \"{class_name}\"]\n")
        print(f"{GREEN}✓ Registered {class_name} in app/models/__init__.py{RESET}")
        return

    with open(init_file, "r", encoding="utf-8") as f:
        content = f.read()

    import_stmt = f"from app.models.{module_name} import {class_name}"
    if import_stmt in content:
        return

    # Add import statement
    lines = content.splitlines()
    insert_idx = 0
    for i, line in enumerate(lines):
        if line.startswith("from app.models"):
            insert_idx = i + 1
        elif line.startswith("from app.db.base") and insert_idx == 0:
            insert_idx = i + 1

    lines.insert(insert_idx, import_stmt)
    new_content = "\n".join(lines)

    # Add to __all__
    if "__all__" in new_content:
        new_content = re.sub(
            r"__all__\s*=\s*\[(.*?)\]",
            lambda m: f"__all__ = [{m.group(1).rstrip()}, \"{class_name}\"]" if f'"{class_name}"' not in m.group(1) else m.group(0),
            new_content,
            flags=re.DOTALL,
        )
    else:
        new_content += f'\n__all__ = ["Base", "{class_name}"]\n'

    with open(init_file, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"{GREEN}✓ Registered {class_name} in app/models/__init__.py for automatic migrations{RESET}")


def make_migrations(message: str = None):
    """
    Run alembic revision --autogenerate to create database migration
    """
    if not message:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        message = f"auto_migration_{timestamp}"

    # Clean message for slug
    msg_slug = re.sub(r"[^a-zA-Z0-9_]+", "_", message.strip().lower()).strip("_")

    print(f"{YELLOW}[MIGRATIONS]{RESET} Detecting database model changes and generating revision...")
    alembic_bin = os.path.join(BASE_DIR, "venv", "bin", "alembic")
    if not os.path.exists(alembic_bin):
        alembic_bin = "alembic"

    cmd = [alembic_bin, "revision", "--autogenerate", "-m", msg_slug]
    try:
        res = subprocess.run(cmd, cwd=BASE_DIR, capture_output=True, text=True)
        if res.returncode == 0:
            print(res.stdout)
            print(f"{GREEN}[SUCCESS] Migration revision generated successfully!{RESET}")
            print(f"\n{CYAN}Next Step:{RESET} Run {BOLD}python3 migrate{RESET} to apply changes to PostgreSQL.")
        else:
            print(f"{RED}[ERROR] Alembic migration failed:{RESET}")
            print(res.stderr or res.stdout)
            if "password authentication failed" in (res.stderr + res.stdout):
                print(f"\n{YELLOW}[HINT] PostgreSQL password authentication failed.{RESET}")
                print(f"Please update your password in {BOLD}backend/.env{RESET} (e.g. POSTGRES_PASSWORD=yourpassword)")
            elif "database" in (res.stderr + res.stdout) and "does not exist" in (res.stderr + res.stdout):
                print(f"\n{YELLOW}[HINT] Database does not exist yet.{RESET}")
                print(f"Run {BOLD}python3 make db:create{RESET} to create the database first.")
            sys.exit(res.returncode)
    except Exception as e:
        print(f"{RED}[ERROR] Could not execute alembic: {e}{RESET}")
        sys.exit(1)


def create_database():
    """
    Connect to PostgreSQL and create hospital_db if not exists
    """
    from app.core.config import settings
    import psycopg

    print(f"{YELLOW}[DB:CREATE]{RESET} Creating database '{settings.POSTGRES_DB}' on PostgreSQL...")
    try:
        with psycopg.connect(
            host=settings.POSTGRES_SERVER,
            port=settings.POSTGRES_PORT,
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            dbname="postgres",
            autocommit=True,
        ) as conn:
            with conn.cursor() as cur:
                cur.execute(f"SELECT 1 FROM pg_database WHERE datname = '{settings.POSTGRES_DB}';")
                if cur.fetchone():
                    print(f"{GREEN}✓ Database '{settings.POSTGRES_DB}' already exists.{RESET}")
                else:
                    cur.execute(f"CREATE DATABASE {settings.POSTGRES_DB};")
                    print(f"{GREEN}✓ Database '{settings.POSTGRES_DB}' created successfully!{RESET}")
    except Exception as e:
        print(f"{RED}[ERROR] Could not create database: {e}{RESET}")
        print(f"Check your database credentials in backend/.env")
        sys.exit(1)


def show_help():
    """Display CLI commands help banner."""
    print(f"""
{BLUE}{BOLD}===================================================================={RESET}
{GREEN}{BOLD}    Access & User Management System - Database & Model CLI Tool       {RESET}
{BLUE}{BOLD}===================================================================={RESET}

{BOLD}Available Commands:{RESET}

  {CYAN}python3 make table:<name>{RESET}
      Generate a new SQLAlchemy model file in app/models/<name>.py
      and register it automatically in app/models/__init__.py.
      {GRAY}Examples: python3 make table:user
                python3 make table:doctor
                python3 make table:appointment
                python3 make table:department{RESET}

  {CYAN}python3 make migrations [message]{RESET}
      Inspect models and generate a new Alembic migration revision.
      {GRAY}Example:  python3 make migrations "create users table"{RESET}

  {CYAN}python3 migrate{RESET}
      Apply all pending migrations to the PostgreSQL database.
      {GRAY}Alias:    python3 make migrate{RESET}

  {CYAN}python3 migrate:rollback{RESET}
      Rollback the last applied migration.
      {GRAY}Alias:    python3 make rollback{RESET}

  {CYAN}python3 migrate:status{RESET}
      Show current migration version and revision history.
      {GRAY}Alias:    python3 make status{RESET}

  {CYAN}python3 make seed{RESET}
      Seed initial sample data (admin user, roles, permissions).
      {GRAY}Alias:    python3 seed{RESET}

  {CYAN}python3 make db:create{RESET}
      Create the PostgreSQL database if it does not exist.

  {CYAN}python3 make help{RESET}
      Display this command reference guide.

{BLUE}{BOLD}===================================================================={RESET}
""")


def main():
    if len(sys.argv) < 2:
        show_help()
        sys.exit(0)

    arg = sys.argv[1].strip()

    if arg.startswith("table:") or arg.startswith("model:"):
        make_table(arg)
    elif arg in ("migrations", "make:migrations", "migration"):
        msg = sys.argv[2] if len(sys.argv) > 2 else None
        make_migrations(msg)
    elif arg in ("migrate", "migrate:up"):
        # Delegate to migrate CLI
        from app.cli.migrate import run_migrate
        run_migrate()
    elif arg in ("rollback", "migrate:rollback", "migrate:down"):
        from app.cli.migrate import run_rollback
        run_rollback()
    elif arg in ("status", "migrate:status"):
        from app.cli.migrate import run_status
        run_status()
    elif arg in ("seed", "db:seed"):
        from app.db.seeds import run_seeds
        run_seeds()
    elif arg == "db:create":
        create_database()
    elif arg in ("help", "--help", "-h"):
        show_help()
    else:
        print(f"{RED}[ERROR] Unknown command '{arg}'.{RESET}")
        print(f"Run {BOLD}python3 make help{RESET} to view all available commands.")
        sys.exit(1)


if __name__ == "__main__":
    main()
