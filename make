#!/usr/bin/env python3
import os
import sys
import subprocess

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
VENV_PYTHON = os.path.join(BACKEND_DIR, "venv", "bin", "python")

if not os.path.exists(VENV_PYTHON):
    VENV_PYTHON = sys.executable

backend_make = os.path.join(BACKEND_DIR, "app", "cli", "make.py")
cmd = [VENV_PYTHON, backend_make] + sys.argv[1:]

env = os.environ.copy()
env["PYTHONPATH"] = BACKEND_DIR

res = subprocess.run(cmd, cwd=BACKEND_DIR, env=env)
sys.exit(res.returncode)
