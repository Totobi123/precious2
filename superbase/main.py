import os
import secrets
import asyncio
import smtplib
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from email.message import EmailMessage
from contextlib import asynccontextmanager

import aiosmtplib
from fastapi import FastAPI, Depends, HTTPException, status, Header, Request, Path, Response
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import text, create_engine, MetaData, Table, Column, Integer, String, JSON, DateTime, Boolean, ForeignKey, desc, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import IntegrityError, ProgrammingError
from pydantic import BaseModel, EmailStr, Field
from passlib.context import CryptContext
import uvicorn

# --- CONFIGURATION ---
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres")
SECRET_KEY = os.getenv("SECRET_KEY", "SUPER_SECRET_KEY_FOR_JWT_12345")
ALGORITHM = "HS256"
PORT = 7777

# Admin Default Credentials
ADMIN_PASS = "Titobilove123@"

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
Base = declarative_base()

# --- DATABASE MODELS ---

class SystemSetting(Base):
    __tablename__ = "system_settings"
    __table_args__ = {"schema": "public"}
    id = Column(Integer, primary_key=True)
    active_smtp_user = Column(String, default="ceo@genxflow.shop")
    smtp_password = Column(String, default="Titobilove123@")
    smtp_host = Column(String, default="mail.privateemail.com")
    smtp_port = Column(Integer, default=465)
    from_name = Column(String, default="Precious Chic Nails")
    support_email = Column(String, default="support@preciouschinails.com")
    otp_subject = Column(String, default="Your Verification Code")
    otp_body_template = Column(String, default="Hello, your code is {otp}.")
    admin_route = Column(String, default="admin")

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "public"}
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    api_key = Column(String, unique=True, index=True, nullable=False)
    schema_name = Column(String, unique=True, nullable=False)
    is_verified = Column(Boolean, default=False)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# --- DATABASE SETUP ---
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def init_db():
    async with engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS public"))
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(SystemSetting))
        if not res.scalar():
            db.add(SystemSetting())
            await db.commit()
    print("Database & System Settings Initialized.")

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def check_admin(authorization: str = Header(...)):
    api_key = authorization.replace("Bearer ", "")
    if api_key != ADMIN_PASS:
        raise HTTPException(status_code=401, detail="Unauthorized Admin Access")
    return True

# --- SCHEMAS ---
class UserSignup(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class AdminSettingsUpdate(BaseModel):
    active_smtp_user: Optional[str] = None
    from_name: Optional[str] = None
    support_email: Optional[str] = None
    otp_subject: Optional[str] = None
    otp_body_template: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_password: Optional[str] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="Superbase DBaaS", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- HELPERS FOR DYNAMIC SCHEMA ---

async def ensure_columns(schema: str, table: str, payload: Dict[str, Any], db: AsyncSession):
    """Dynamically adds missing columns to a table."""
    for k, v in payload.items():
        t = "TEXT"
        if isinstance(v, int): t = "INTEGER"
        elif isinstance(v, float): t = "FLOAT"
        elif isinstance(v, bool): t = "BOOLEAN"
        
        try:
            # Check if column exists
            check_q = text(f"SELECT column_name FROM information_schema.columns WHERE table_schema = '{schema}' AND table_name = '{table}' AND column_name = '{k}'")
            res = await db.execute(check_q)
            if not res.fetchone():
                # Add column
                await db.execute(text(f"ALTER TABLE {schema}.\"{table}\" ADD COLUMN \"{k}\" {t}"))
                await db.commit()
        except Exception as e:
            print(f"Migration error for {k}: {e}")

# --- ENDPOINTS ---

@app.get("/api/admin/settings")
async def get_admin_settings(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemSetting))
    return res.scalar()

@app.post("/api/admin/settings")
async def update_admin_settings(data: AdminSettingsUpdate, admin: bool = Depends(check_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemSetting))
    s = res.scalar()
    for k, v in data.dict(exclude_unset=True).items():
        setattr(s, k, v)
    await db.commit()
    return {"message": "Settings updated"}

@app.get("/api/admin/users")
async def list_users(admin: bool = Depends(check_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User))
    return [{"id": u.id, "email": u.email, "schema": u.schema_name, "is_verified": u.is_verified, "full_name": u.full_name, "created_at": u.created_at} for u in res.scalars()]

@app.post("/auth/signup")
async def signup(user_data: UserSignup, db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT id FROM public.users WHERE email = :email"), {"email": user_data.email})
    if result.fetchone(): raise HTTPException(status_code=400, detail="Email already registered")
    
    schema_name = f"tenant_{secrets.token_hex(4)}"
    api_key = f"db_{secrets.token_urlsafe(32)}"
    new_user = User(email=user_data.email, hashed_password=pwd_context.hash(user_data.password), api_key=api_key, schema_name=schema_name, full_name=user_data.full_name)
    db.add(new_user)
    await db.commit()
    await db.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema_name}"))
    await db.commit()
    return {"message": "User registered", "schema": schema_name}

@app.post("/auth/login")
async def login(data: UserSignup, db: AsyncSession = Depends(get_db)): # Reuse schema
    result = await db.execute(text("SELECT * FROM public.users WHERE email = :email"), {"email": data.email})
    user = result.fetchone()
    if not user or not pwd_context.verify(data.password, user.hashed_password): raise HTTPException(status_code=401)
    return {"api_key": user.api_key, "email": user.email}

@app.post("/v1/data/{table_name}")
async def insert_data(table_name: str, payload: Dict[str, Any], authorization: str = Header(...), db: AsyncSession = Depends(get_db)):
    api_key = authorization.replace("Bearer ", "")
    schema = "public" if api_key == "db_O5-MqWO_USRwGc_f3RQVycl_47DFmnCvA4KfOuo1Ypw" else (await db.execute(text("SELECT schema_name FROM public.users WHERE api_key = :key"), {"key": api_key})).fetchone()[0]
    
    # Ensure table and columns
    cols = []
    for k, v in payload.items():
        t = "TEXT"
        if isinstance(v, int): t = "INTEGER"
        elif isinstance(v, float): t = "FLOAT"
        elif isinstance(v, bool): t = "BOOLEAN"
        cols.append(f"\"{k}\" {t}")
        if isinstance(v, (dict, list)): payload[k] = json.dumps(v)
        
    await db.execute(text(f"CREATE TABLE IF NOT EXISTS {schema}.\"{table_name}\" (id SERIAL PRIMARY KEY, {', '.join(cols)}, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"))
    await db.commit()
    
    # Double check all columns exist (for existing tables)
    await ensure_columns(schema, table_name, payload, db)
    
    keys, ph = [f"\"{k}\"" for k in payload.keys()], [f":{k}" for k in payload.keys()]
    query = f"INSERT INTO {schema}.\"{table_name}\" ({', '.join(keys)}) VALUES ({', '.join(ph)}) RETURNING id"
    res = await db.execute(text(query), payload)
    await db.commit()
    return {"id": res.fetchone()[0], "message": "Saved"}

@app.get("/v1/data/{table_name}")
async def fetch_data(request: Request, table_name: str, authorization: str = Header(...), db: AsyncSession = Depends(get_db)):
    api_key = authorization.replace("Bearer ", "")
    schema = "public" if api_key == "db_O5-MqWO_USRwGc_f3RQVycl_47DFmnCvA4KfOuo1Ypw" else (await db.execute(text("SELECT schema_name FROM public.users WHERE api_key = :key"), {"key": api_key})).fetchone()[0]
    
    p = dict(request.query_params)
    q = f"SELECT * FROM {schema}.\"{table_name}\""
    if p: q += " WHERE " + " AND ".join([f"\"{k}\" = :{k}" for k in p.keys()])
    q += " ORDER BY id DESC"
    
    try:
        res = await db.execute(text(q), p)
        rows = []
        for r in res.fetchall():
            d = dict(r._mapping)
            for k, v in d.items():
                if isinstance(v, str):
                    try:
                        parsed = json.loads(v)
                        if isinstance(parsed, (dict, list)): d[k] = parsed
                    except: pass
            rows.append(d)
        return rows
    except Exception: return []

@app.patch("/v1/data/{table_name}/{id}")
async def update_data(table_name: str, id: int, payload: Dict[str, Any], authorization: str = Header(...), db: AsyncSession = Depends(get_db)):
    api_key = authorization.replace("Bearer ", "")
    schema = "public" if api_key == "db_O5-MqWO_USRwGc_f3RQVycl_47DFmnCvA4KfOuo1Ypw" else (await db.execute(text("SELECT schema_name FROM public.users WHERE api_key = :key"), {"key": api_key})).fetchone()[0]
    
    # Ensure columns exist before updating
    await ensure_columns(schema, table_name, payload, db)
    
    set_clause = []
    for k, v in payload.items():
        if isinstance(v, (dict, list)): v = json.dumps(v)
        set_clause.append(f"\"{k}\" = :{k}")
        payload[k] = v
        
    payload["id_param"] = id
    query = f"UPDATE {schema}.\"{table_name}\" SET {', '.join(set_clause)} WHERE id = :id_param"
    await db.execute(text(query), payload)
    await db.commit()
    return {"message": "Updated"}

@app.delete("/v1/data/{table_name}/{id}")
async def delete_data(table_name: str, id: int, authorization: str = Header(...), db: AsyncSession = Depends(get_db)):
    api_key = authorization.replace("Bearer ", "")
    schema = "public" if api_key == "db_O5-MqWO_USRwGc_f3RQVycl_47DFmnCvA4KfOuo1Ypw" else (await db.execute(text("SELECT schema_name FROM public.users WHERE api_key = :key"), {"key": api_key})).fetchone()[0]
    await db.execute(text(f"DELETE FROM {schema}.\"{table_name}\" WHERE id = :id"), {"id": id})
    await db.commit()
    return {"message": "Deleted"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
