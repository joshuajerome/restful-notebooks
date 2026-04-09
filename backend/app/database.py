from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = "sqlite:///postit.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    _migrate(engine)


def _migrate(eng):
    """Add missing columns to existing tables (simple migration without Alembic)."""
    import logging

    logger = logging.getLogger(__name__)
    with eng.connect() as conn:
        # Check request_history for new columns
        try:
            result = conn.execute(
                __import__("sqlalchemy").text("PRAGMA table_info(request_history)")
            )
            existing = {row[1] for row in result}

            migrations = {
                "workspace_name": "ALTER TABLE request_history ADD COLUMN workspace_name VARCHAR(255) DEFAULT ''",
                "notebook_name": "ALTER TABLE request_history ADD COLUMN notebook_name VARCHAR(255) DEFAULT ''",
            }

            for col, sql in migrations.items():
                if col not in existing:
                    conn.execute(__import__("sqlalchemy").text(sql))
                    conn.commit()
                    logger.info("Migration: added column %s to request_history", col)
        except Exception as e:
            logger.debug("Migration check skipped: %s", e)
