"""Script to create a viewer user for testing."""
# ruff: noqa: E402

import sys
import os
from sqlmodel import Session

# Add the app directory to the path so we can import from it
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

# Force correct DB path relative to the root of the repo
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../techconnect.db'))
os.environ['DATABASE_URL'] = f"sqlite:///{db_path}"

from core.database import get_engine, create_db_and_tables
from core.security import hash_password, normalize_email
from models import AuthUser

def create_viewer():
    # Make sure all tables are created (especially if AuthUser was added recently)
    create_db_and_tables()
    engine = get_engine()
    with Session(engine) as session:
        email = normalize_email("viewer@techconnect.local")
        
        # Check if viewer already exists
        from sqlmodel import select
        existing = session.exec(select(AuthUser).where(AuthUser.email == email)).first()
        if existing:
            print(f"Viewer user already exists: {email}")
            return
            
        user = AuthUser(
            email=email,
            password_hash=hash_password("viewerpassword"),
            full_name="Viewer Tester",
            is_active=True,
            is_admin=False, # Viewer role!
        )
        session.add(user)
        session.commit()
        print(f"Created viewer user:\\n  Email: {email}\\n  Password: viewerpassword")

if __name__ == "__main__":
    create_viewer()
