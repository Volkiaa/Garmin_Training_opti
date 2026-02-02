"""extend computed metrics for v2

Revision ID: d4e5f6a1b2c3
Revises: c3d4e5f6a1b2
Create Date: 2026-02-02 19:10:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "d4e5f6a1b2c3"
down_revision = "c3d4e5f6a1b2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "computed_metrics",
        sa.Column(
            "algorithm_version", sa.String(10), server_default="v1", nullable=False
        ),
    )
    op.add_column(
        "computed_metrics",
        sa.Column(
            "sport_specific", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
    )
    op.add_column(
        "computed_metrics", sa.Column("acwr_penalty", sa.Float(), nullable=True)
    )
    op.add_column(
        "computed_metrics", sa.Column("sleep_trend", sa.Float(), nullable=True)
    )
    op.add_column(
        "computed_metrics", sa.Column("event_modifier", sa.Float(), nullable=True)
    )
    op.create_index(
        op.f("ix_computed_metrics_algo_version"),
        "computed_metrics",
        ["algorithm_version"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_computed_metrics_algo_version"), table_name="computed_metrics"
    )
    op.drop_column("computed_metrics", "event_modifier")
    op.drop_column("computed_metrics", "sleep_trend")
    op.drop_column("computed_metrics", "acwr_penalty")
    op.drop_column("computed_metrics", "sport_specific")
    op.drop_column("computed_metrics", "algorithm_version")
