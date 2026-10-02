"""add packages and package relationships

Revision ID: 0002_packages
Revises: 0001_initial
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_packages"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


PACKAGE_ROWS = [
    ("Standard", "A flexible course of general physiotherapy sessions.", 4, 300.00),
    ("Recovery Plus", "Extended rehabilitation support for recovery and mobility.", 8, 560.00),
    ("Athlete Care", "Sports rehabilitation and return-to-activity programme.", 6, 450.00),
    ("Wellness Maintenance", "Ongoing preventive physiotherapy and mobility care.", 3, 210.00),
]


def upgrade():
    op.create_table(
        "packages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("session_count", sa.Integer(), nullable=False),
        sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.UniqueConstraint("name"),
    )
    op.create_index("ix_packages_name", "packages", ["name"], unique=True)
    op.add_column("patients", sa.Column("package_id", sa.Integer(), nullable=True))
    op.create_index("ix_patients_package_id", "patients", ["package_id"], unique=False)
    op.create_foreign_key("fk_patients_package_id_packages", "patients", "packages", ["package_id"], ["id"])
    op.add_column("invoices", sa.Column("package_id", sa.Integer(), nullable=True))
    op.create_index("ix_invoices_package_id", "invoices", ["package_id"], unique=False)
    op.create_foreign_key("fk_invoices_package_id_packages", "invoices", "packages", ["package_id"], ["id"])

    packages = sa.table(
        "packages",
        sa.column("name", sa.String),
        sa.column("description", sa.Text),
        sa.column("session_count", sa.Integer),
        sa.column("price", sa.Numeric),
        sa.column("active", sa.Boolean),
    )
    for name, description, session_count, price in PACKAGE_ROWS:
        op.get_bind().execute(
            sa.insert(packages).from_select(
                ["name", "description", "session_count", "price", "active"],
                sa.select(
                    sa.literal(name), sa.literal(description), sa.literal(session_count), sa.literal(price), sa.literal(True)
                ).where(~sa.exists(sa.select(1).select_from(packages).where(packages.c.name == name))),
            )
        )

    # Best effort: existing patient labels are linked by case-insensitive package name.
    op.execute(
        """
        UPDATE patients
        SET package_id = packages.id
        FROM packages
        WHERE patients.package_id IS NULL
          AND lower(trim(patients.package)) = lower(packages.name)
        """
    )
    # Existing package invoice descriptions are linked when they include a package name.
    op.execute(
        """
        UPDATE invoices
        SET package_id = packages.id
        FROM packages
        WHERE invoices.package_id IS NULL
          AND lower(invoices.service) LIKE '%' || lower(packages.name) || '%'
        """
    )


def downgrade():
    op.drop_constraint("fk_invoices_package_id_packages", "invoices", type_="foreignkey")
    op.drop_index("ix_invoices_package_id", table_name="invoices")
    op.drop_column("invoices", "package_id")
    op.drop_constraint("fk_patients_package_id_packages", "patients", type_="foreignkey")
    op.drop_index("ix_patients_package_id", table_name="patients")
    op.drop_column("patients", "package_id")
    op.drop_index("ix_packages_name", table_name="packages")
    op.drop_table("packages")
