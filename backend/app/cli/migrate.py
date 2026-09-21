#!/usr/bin/env python3
import os
import sys
import subprocess

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


def get_alembic_bin():
    alembic_bin = os.path.join(BASE_DIR, "venv", "bin", "alembic")
    if not os.path.exists(alembic_bin):
        alembic_bin = "alembic"
    return alembic_bin


def run_migrate():
    """Apply all pending migrations to the PostgreSQL database."""
    print(f"{YELLOW}[MIGRATE]{RESET} Applying migrations to PostgreSQL (alembic upgrade head)...")
    alembic_bin = get_alembic_bin()
    cmd = [alembic_bin, "upgrade", "head"]
    res = subprocess.run(cmd, cwd=BASE_DIR, capture_output=True, text=True)
    if res.returncode == 0:
        print(res.stdout)
        print(f"{GREEN}[SUCCESS] All migrations successfully applied to database!{RESET}")
    else:
        print(f"{RED}[ERROR] Migration failed:{RESET}")
        print(res.stderr or res.stdout)
        if "password authentication failed" in (res.stderr + res.stdout):
            print(f"\n{YELLOW}[HINT] PostgreSQL password authentication failed.{RESET}")
            print(f"Please check your credentials in {BOLD}backend/.env{RESET} (POSTGRES_USER, POSTGRES_PASSWORD)")
        elif "database" in (res.stderr + res.stdout) and "does not exist" in (res.stderr + res.stdout):
            print(f"\n{YELLOW}[HINT] Database does not exist yet.{RESET}")
            print(f"Run {BOLD}python3 make db:create{RESET} to create the database first.")
        sys.exit(res.returncode)


def run_rollback():
    """Rollback the last applied migration."""
    print(f"{YELLOW}[MIGRATE:ROLLBACK]{RESET} Rolling back previous migration (alembic downgrade -1)...")
    alembic_bin = get_alembic_bin()
    cmd = [alembic_bin, "downgrade", "-1"]
    res = subprocess.run(cmd, cwd=BASE_DIR, capture_output=True, text=True)
    if res.returncode == 0:
        print(res.stdout)
        print(f"{GREEN}[SUCCESS] Rollback completed successfully!{RESET}")
    else:
        print(f"{RED}[ERROR] Rollback failed:{RESET}")
        print(res.stderr or res.stdout)
        if "password authentication failed" in (res.stderr + res.stdout):
            print(f"\n{YELLOW}[HINT] PostgreSQL password authentication failed.{RESET}")
            print(f"Please configure your POSTGRES_PASSWORD in {BOLD}backend/.env{RESET}.")
        elif "database" in (res.stderr + res.stdout) and "does not exist" in (res.stderr + res.stdout):
            print(f"\n{YELLOW}[HINT] Database does not exist yet.{RESET}")
        sys.exit(res.returncode)


def run_status():
    """Show current revision and history."""
    print(f"{BLUE}[MIGRATION STATUS]{RESET} Checking database revision and history...")
    alembic_bin = get_alembic_bin()
    print(f"\n{BOLD}Current Live Database Revision:{RESET}")
    res = subprocess.run([alembic_bin, "current"], cwd=BASE_DIR, capture_output=True, text=True)
    if res.returncode == 0:
        print(res.stdout.strip() or "No migrations applied yet (base).")
    else:
        if "password authentication failed" in (res.stderr + res.stdout):
            print(f"{YELLOW}[NOTICE] Could not connect to PostgreSQL (authentication failed).{RESET}")
            print(f"Please configure your POSTGRES_PASSWORD in {BOLD}backend/.env{RESET}.")
        else:
            print(f"{RED}Error connecting to DB:{RESET} {res.stderr.strip() or res.stdout.strip()}")

    print(f"\n{BOLD}Migration History (from disk):{RESET}")
    subprocess.run([alembic_bin, "history", "--verbose"], cwd=BASE_DIR)


def show_help():
    print(f"""
{BLUE}{BOLD}===================================================================={RESET}
{GREEN}{BOLD}       Access & User Management System - Migration Runner           {RESET}
{BLUE}{BOLD}===================================================================={RESET}

{BOLD}Usage:{RESET}
  {CYAN}python3 migrate{RESET}            Apply all pending migrations (alembic upgrade head)
  {CYAN}python3 migrate rollback{RESET}   Rollback the last migration (alembic downgrade -1)
  {CYAN}python3 migrate status{RESET}     Show current version and history

{BLUE}{BOLD}===================================================================={RESET}
""")


def main():
    if len(sys.argv) > 1:
        arg = sys.argv[1].strip()
        if arg in ("rollback", ":rollback", "down"):
            run_rollback()
        elif arg in ("status", ":status"):
            run_status()
        elif arg in ("help", "--help", "-h"):
            show_help()
        else:
            print(f"{RED}[ERROR] Unknown argument '{arg}'.{RESET}")
            show_help()
            sys.exit(1)
    else:
        run_migrate()


if __name__ == "__main__":
    main()
