"""add events table

Revision ID: a1b2c3d4e5f6
Revises: bd7d79f99083
Create Date: 2026-02-02 18:45:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "bd7d79f99083"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("distance", sa.String(50), nullable=True),
        sa.Column("priority", sa.String(1), server_default="B", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
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
    op.create_index(op.f("ix_events_date"), "events", ["event_date"], unique=False)
    op.create_index(
        op.f("ix_events_priority"),
        "events",
        ["priority"],
        unique=False,
        postgresql_where=sa.text("priority IN ('A', 'B')"),
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_events_priority"), table_name="events")
    op.drop_index(op.f("ix_events_date"), table_name="events")
    op.drop_table("events")
