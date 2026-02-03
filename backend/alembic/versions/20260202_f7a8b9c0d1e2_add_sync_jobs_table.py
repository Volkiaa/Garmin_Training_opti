"""add sync_jobs table

Revision ID: f7a8b9c0d1e2
Revises: 20260202_e5f6a1b2c3d4_add_override_garmin
Create Date: 2026-02-02 22:45:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "f7a8b9c0d1e2"
down_revision = "e5f6a1b2c3d4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS sync_jobs CASCADE")
    op.execute("DROP TYPE IF EXISTS syncstatusenum CASCADE")
    op.execute("DROP TYPE IF EXISTS triggeredbyenum CASCADE")

    sync_status_enum = postgresql.ENUM(
        "pending", "running", "completed", "failed", name="syncstatusenum"
    )
    sync_status_enum.create(op.get_bind())

    triggered_by_enum = postgresql.ENUM(
        "manual", "hourly", "daily", name="triggeredbyenum"
    )
    triggered_by_enum.create(op.get_bind())

    op.create_table(
        "sync_jobs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "running",
                "completed",
                "failed",
                name="syncstatusenum",
                native_enum=False,
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("activities_found", sa.Integer(), nullable=True),
        sa.Column("activities_synced", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "triggered_by",
            sa.Enum(
                "manual", "hourly", "daily", name="triggeredbyenum", native_enum=False
            ),
            nullable=False,
        ),
        sa.Column("next_scheduled_run", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes
    op.create_index(
        op.f("ix_sync_jobs_started_at"), "sync_jobs", ["started_at"], unique=False
    )
    op.create_index(op.f("ix_sync_jobs_status"), "sync_jobs", ["status"], unique=False)
    op.create_index(
        op.f("ix_sync_jobs_triggered_by"), "sync_jobs", ["triggered_by"], unique=False
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index(op.f("ix_sync_jobs_triggered_by"), table_name="sync_jobs")
    op.drop_index(op.f("ix_sync_jobs_status"), table_name="sync_jobs")
    op.drop_index(op.f("ix_sync_jobs_started_at"), table_name="sync_jobs")

    # Drop table
    op.drop_table("sync_jobs")

    # Drop enum types
    postgresql.ENUM(name="syncstatusenum").drop(op.get_bind())
    postgresql.ENUM(name="triggeredbyenum").drop(op.get_bind())
