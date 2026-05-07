"""ticket settings: add ticket_header, ticket_footer, ticket_show_logo, ticket_show_iva, ticket_printer_name to business_settings

Revision ID: 20260507001006
Revises: 20260506001005
Create Date: 2026-05-07 00:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision: str = "20260507001006"
down_revision: str | None = "20260506001005"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    op.add_column("business_settings", sa.Column("ticket_header", sa.Text(), nullable=True))
    op.add_column("business_settings", sa.Column("ticket_footer", sa.Text(), nullable=True))
    op.add_column("business_settings", sa.Column("ticket_show_logo", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("business_settings", sa.Column("ticket_show_iva", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("business_settings", sa.Column("ticket_printer_name", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("business_settings", "ticket_printer_name")
    op.drop_column("business_settings", "ticket_show_iva")
    op.drop_column("business_settings", "ticket_show_logo")
    op.drop_column("business_settings", "ticket_footer")
    op.drop_column("business_settings", "ticket_header")
