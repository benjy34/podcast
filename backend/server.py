from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import hashlib
import jwt
import json
import aiofiles
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT and Password settings
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Create the main app without a prefix
app = FastAPI()

@app.get("/ping")
async def ping():
    try:
        await db.command("ping")
        return {"message": "MongoDB connection successful!"}
    except Exception as e:
        return {"error": str(e)}
# Mount static files for serving audio
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    username: str
    password_hash: str
    role: str  # 'podcaster' or 'listener'
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: str
    username: str
    password: str
    role: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    role: str
    created_at: datetime

class Podcast(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    creator_id: str
    cover_image: Optional[str] = None
    category: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PodcastCreate(BaseModel):
    title: str
    description: str
    category: str

class Episode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    podcast_id: str
    title: str
    description: str
    audio_file: str
    duration: Optional[int] = None  # in seconds
    created_at: datetime = Field(default_factory=datetime.utcnow)

class EpisodeCreate(BaseModel):
    title: str
    description: str

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

# Authentication routes
@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and create user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        username=user_data.username,
        password_hash=hashed_password,
        role=user_data.role
    )
    
    await db.users.insert_one(user.dict())
    return UserResponse(**user.dict())

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(**user)
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return UserResponse(**current_user.dict())

# Podcast routes
@api_router.post("/podcasts", response_model=Podcast)
async def create_podcast(podcast_data: PodcastCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "podcaster":
        raise HTTPException(status_code=403, detail="Only podcasters can create podcasts")
    
    podcast = Podcast(
        title=podcast_data.title,
        description=podcast_data.description,
        creator_id=current_user.id,
        category=podcast_data.category
    )
    
    await db.podcasts.insert_one(podcast.dict())
    return podcast

@api_router.get("/podcasts", response_model=List[Podcast])
async def get_podcasts():
    podcasts = await db.podcasts.find().to_list(1000)
    return [Podcast(**podcast) for podcast in podcasts]

@api_router.get("/podcasts/my", response_model=List[Podcast])
async def get_my_podcasts(current_user: User = Depends(get_current_user)):
    if current_user.role != "podcaster":
        raise HTTPException(status_code=403, detail="Only podcasters can view their podcasts")
    
    podcasts = await db.podcasts.find({"creator_id": current_user.id}).to_list(1000)
    return [Podcast(**podcast) for podcast in podcasts]

@api_router.get("/podcasts/{podcast_id}", response_model=Podcast)
async def get_podcast(podcast_id: str):
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    return Podcast(**podcast)

# Episode routes
@api_router.post("/podcasts/{podcast_id}/episodes")
async def create_episode(
    podcast_id: str,
    title: str = Form(...),
    description: str = Form(...),
    audio_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "podcaster":
        raise HTTPException(status_code=403, detail="Only podcasters can upload episodes")
    
    # Check if podcast exists and user owns it
    podcast = await db.podcasts.find_one({"id": podcast_id, "creator_id": current_user.id})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found or not owned by user")
    
    # Save audio file
    file_extension = audio_file.filename.split('.')[-1]
    if file_extension.lower() not in ['mp3', 'wav', 'ogg']:
        raise HTTPException(status_code=400, detail="Only MP3, WAV, and OGG files are supported")
    
    filename = f"{str(uuid.uuid4())}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await audio_file.read()
        await f.write(content)
    
    episode = Episode(
        podcast_id=podcast_id,
        title=title,
        description=description,
        audio_file=filename
    )
    
    await db.episodes.insert_one(episode.dict())
    return episode

@api_router.get("/podcasts/{podcast_id}/episodes", response_model=List[Episode])
async def get_episodes(podcast_id: str):
    episodes = await db.episodes.find({"podcast_id": podcast_id}).to_list(1000)
    return [Episode(**episode) for episode in episodes]

@api_router.get("/episodes", response_model=List[Episode])
async def get_all_episodes():
    episodes = await db.episodes.find().to_list(1000)
    return [Episode(**episode) for episode in episodes]

@api_router.get("/episodes/{episode_id}", response_model=Episode)
async def get_episode(episode_id: str):
    episode = await db.episodes.find_one({"id": episode_id})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    return Episode(**episode)

# Search routes
@api_router.get("/search")
async def search(q: str):
    # Search in podcast titles and descriptions
    podcast_results = await db.podcasts.find({
        "$or": [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"category": {"$regex": q, "$options": "i"}}
        ]
    }).to_list(50)
    
    # Search in episode titles and descriptions
    episode_results = await db.episodes.find({
        "$or": [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}}
        ]
    }).to_list(50)
    
    return {
        "podcasts": [Podcast(**podcast) for podcast in podcast_results],
        "episodes": [Episode(**episode) for episode in episode_results]
    }

# Add root endpoint
@app.get("/")
async def root():
    return {"message": "PodcastHub API is running!"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
