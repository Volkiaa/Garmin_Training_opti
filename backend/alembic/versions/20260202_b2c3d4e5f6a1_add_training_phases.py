"""add training phases table

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2026-02-02 18:46:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b2c3d4e5f6a1"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "training_phases",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("phase_type", sa.String(50), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("target_event_id", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["target_event_id"], ["events.id"], ondelete="SET NULL"
        ),
    )
    op.create_index(
        op.f("ix_phases_dates"),
        "training_phases",
        ["start_date", "end_date"],
        unique=False,
    )
    op.create_index(
        op.f("ix_phases_event"), "training_phases", ["target_event_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_phases_event"), table_name="training_phases")
    op.drop_index(op.f("ix_phases_dates"), table_name="training_phases")
    op.drop_table("training_phases")
