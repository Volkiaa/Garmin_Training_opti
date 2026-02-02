"""add weekly metrics table

Revision ID: c3d4e5f6a1b2
Revises: b2c3d4e5f6a1
Create Date: 2026-02-02 18:47:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "c3d4e5f6a1b2"
down_revision = "b2c3d4e5f6a1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "weekly_metrics",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("week_start", sa.Date(), nullable=False),
        sa.Column("week_end", sa.Date(), nullable=False),
        sa.Column("total_volume_hours", sa.Float(), nullable=True),
        sa.Column("total_load", sa.Float(), nullable=True),
        sa.Column(
            "volume_by_discipline",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "intensity_distribution",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("avg_readiness", sa.Float(), nullable=True),
        sa.Column("avg_hrv", sa.Float(), nullable=True),
        sa.Column("avg_sleep_hours", sa.Float(), nullable=True),
        sa.Column("avg_acwr", sa.Float(), nullable=True),
        sa.Column("activity_count", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("week_start"),
    )
    op.create_index(
        op.f("ix_weekly_metrics_date"), "weekly_metrics", ["week_start"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_weekly_metrics_date"), table_name="weekly_metrics")
    op.drop_table("weekly_metrics")
