from datetime import datetime, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db, settings
from ..models import User
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2 = OAuth2PasswordBearer(tokenUrl="auth/login")
def current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)):
    try: email = jwt.decode(token, settings.secret_key, algorithms=["HS256"]).get("sub")
    except JWTError: email = None
    user = db.scalar(select(User).where(User.email == email)) if email else None
    if not user or not user.active: raise HTTPException(status_code=401, detail="Invalid or expired session")
    return user
def admin(user: User = Depends(current_user)):
    if user.role != "admin": raise HTTPException(status_code=403, detail="Administrator access required")
    return user
def billing_user(user: User = Depends(current_user)):
    if user.role != "admin": raise HTTPException(status_code=403, detail="Billing is restricted to administrators")
    return user
def authenticate_user(form, db):
    user = db.scalar(select(User).where(User.email == form.username))
    if not user or not pwd.verify(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    return user
def create_access_token(email: str):
    expires = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": email, "exp": expires}, settings.secret_key, algorithm="HS256")
