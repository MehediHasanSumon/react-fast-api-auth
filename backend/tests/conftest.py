import pytest
from typing import Generator
from sqlalchemy.orm import Session
from app.db.session import engine
from app.db.seeds import run_seeds


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Ensure database is seeded with system roles, permissions, and users for test runs."""
    run_seeds()


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Provide a transactional database session for tests that rolls back automatically."""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()

