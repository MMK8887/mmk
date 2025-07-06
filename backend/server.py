from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import pandas as pd
import json
import io
import sys

# Add current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from microbiome_ai import MicrobiomeAI

# Load environment variables
ROOT_DIR = Path(__file__).parent
from dotenv import load_dotenv
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize Microbiome AI
openai_api_key = os.environ.get('OPENAI_API_KEY')
if not openai_api_key:
    raise ValueError("OPENAI_API_KEY not found in environment variables")

microbiome_ai = MicrobiomeAI(openai_api_key)

# Create the main app
app = FastAPI(title="Microbiome AI Assistant", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
class ChatMessage(BaseModel):
    message: str
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_profile: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    message: str
    response: str
    intent: str
    keywords: List[str]
    entities: List[Dict[str, str]]
    confidence: float
    recommendations: List[str] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    method: str = "ai_enhanced"

class UserProfile(BaseModel):
    user_id: str
    diet: Optional[str] = None
    allergies: List[str] = []
    goal: Optional[str] = None
    age: Optional[int] = None
    conditions: List[str] = []

class WearableData(BaseModel):
    user_id: str
    sleep_hours: float
    steps: int
    stress_score: int
    heart_rate: Optional[int] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class LearningFeedback(BaseModel):
    message_id: str
    message: str
    is_correct: bool
    custom_response: Optional[str] = None
    correct_intent: Optional[str] = None

class MicrobiomeAnalysis(BaseModel):
    user_id: str
    sample_count: int
    microbes: Dict[str, float]
    shannon_index: float
    risk_score: float
    diversity_level: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API Endpoints
@api_router.get("/")
async def root():
    return {"message": "Microbiome AI Assistant API is running!", "version": "1.0.0"}

@api_router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(chat_data: ChatMessage):
    """Main chat endpoint with AI-enhanced responses"""
    try:
        # Extract keywords and entities
        keywords = microbiome_ai.extract_keywords(chat_data.message)
        entities = microbiome_ai.extract_named_entities(chat_data.message)
        
        # Detect intent
        intent_data = microbiome_ai.detect_intent(chat_data.message)
        
        # Get user's microbiome data if available
        microbiome_data = None
        if chat_data.user_profile and "user_id" in chat_data.user_profile:
            microbiome_doc = await db.microbiome_analysis.find_one(
                {"user_id": chat_data.user_profile["user_id"]},
                sort=[("timestamp", -1)]
            )
            if microbiome_doc:
                microbiome_data = {
                    "microbes": microbiome_doc["microbes"],
                    "shannon_index": microbiome_doc["shannon_index"],
                    "diversity_level": microbiome_doc["diversity_level"]
                }
        
        # Generate AI-enhanced response
        ai_response = await microbiome_ai.generate_ai_response(
            chat_data.message, 
            chat_data.session_id,
            chat_data.user_profile,
            microbiome_data
        )
        
        # Generate recommendations
        recommendations = []
        if microbiome_data and intent_data["intent"] in ["diet_suggestion", "gut_health"]:
            recommendations = microbiome_ai.generate_diet_recommendations(
                microbiome_data, 
                chat_data.user_profile
            )
        
        # Create response object
        response = ChatResponse(
            message=chat_data.message,
            response=ai_response,
            intent=intent_data["intent"],
            keywords=keywords,
            entities=entities,
            confidence=intent_data["confidence"],
            recommendations=recommendations,
            method=intent_data.get("method", "ai_enhanced")
        )
        
        # Save chat history to database
        await db.chat_history.insert_one(response.dict())
        
        return response
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")

@api_router.post("/upload-microbiome")
async def upload_microbiome_data(
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    """Upload and process microbiome CSV data"""
    try:
        # Validate file type
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are allowed")
        
        # Read CSV data
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # Process microbiome data
        analysis_result = microbiome_ai.process_microbiome_data(df)
        
        # Create analysis document
        analysis_doc = MicrobiomeAnalysis(
            user_id=user_id,
            **analysis_result
        )
        
        # Save to database
        await db.microbiome_analysis.insert_one(analysis_doc.dict())
        
        return {
            "message": "Microbiome data uploaded and analyzed successfully",
            "analysis": analysis_result
        }
        
    except Exception as e:
        logger.error(f"Error uploading microbiome data: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@api_router.post("/user-profile")
async def save_user_profile(profile: UserProfile):
    """Save or update user profile"""
    try:
        # Update or insert profile
        await db.user_profiles.update_one(
            {"user_id": profile.user_id},
            {"$set": profile.dict()},
            upsert=True
        )
        
        return {"message": "User profile saved successfully"}
        
    except Exception as e:
        logger.error(f"Error saving user profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/user-profile/{user_id}")
async def get_user_profile(user_id: str):
    """Get user profile by ID"""
    try:
        profile = await db.user_profiles.find_one({"user_id": user_id})
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        # Remove MongoDB ObjectId
        profile.pop('_id', None)
        return profile
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/wearable-data")
async def save_wearable_data(wearable: WearableData):
    """Save wearable device data"""
    try:
        await db.wearable_data.insert_one(wearable.dict())
        
        # Analyze the data
        analysis = microbiome_ai.analyze_wearable_data(wearable.dict())
        
        return {
            "message": "Wearable data saved successfully",
            "analysis": analysis
        }
        
    except Exception as e:
        logger.error(f"Error saving wearable data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/wearable-data/{user_id}")
async def get_latest_wearable_data(user_id: str):
    """Get latest wearable data for user"""
    try:
        wearable_data = await db.wearable_data.find_one(
            {"user_id": user_id},
            sort=[("timestamp", -1)]
        )
        
        if not wearable_data:
            return {"message": "No wearable data found", "data": None}
        
        # Remove MongoDB ObjectId
        wearable_data.pop('_id', None)
        
        # Analyze the data
        analysis = microbiome_ai.analyze_wearable_data(wearable_data)
        
        return {
            "data": wearable_data,
            "analysis": analysis
        }
        
    except Exception as e:
        logger.error(f"Error getting wearable data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/feedback")
async def submit_feedback(feedback: LearningFeedback):
    """Submit feedback for learning system"""
    try:
        # Update learning system
        success = microbiome_ai.update_learning(
            feedback.message,
            feedback.custom_response,
            feedback.correct_intent
        )
        
        if success:
            # Save feedback to database
            feedback_doc = feedback.dict()
            feedback_doc["timestamp"] = datetime.utcnow()
            await db.learning_feedback.insert_one(feedback_doc)
            
            return {"message": "Feedback submitted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to process feedback")
        
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/learning-stats")
async def get_learning_stats():
    """Get learning system statistics"""
    try:
        stats = microbiome_ai.get_learning_stats()
        
        # Add database stats
        total_feedback = await db.learning_feedback.count_documents({})
        total_chats = await db.chat_history.count_documents({})
        
        stats.update({
            "total_feedback_received": total_feedback,
            "total_conversations": total_chats
        })
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting learning stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/microbiome-analysis/{user_id}")
async def get_microbiome_analysis(user_id: str):
    """Get latest microbiome analysis for user"""
    try:
        analysis = await db.microbiome_analysis.find_one(
            {"user_id": user_id},
            sort=[("timestamp", -1)]
        )
        
        if not analysis:
            raise HTTPException(status_code=404, detail="No microbiome analysis found")
        
        # Remove MongoDB ObjectId
        analysis.pop('_id', None)
        return analysis
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting microbiome analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/chat-history/{session_id}")
async def get_chat_history(session_id: str, limit: int = 50):
    """Get chat history for a session"""
    try:
        history = await db.chat_history.find(
            {"session_id": session_id}
        ).sort("timestamp", 1).limit(limit).to_list(length=limit)
        
        # Remove MongoDB ObjectIds
        for item in history:
            item.pop('_id', None)
            
        return {"history": history}
        
    except Exception as e:
        logger.error(f"Error getting chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/health-dashboard/{user_id}")
async def get_health_dashboard(user_id: str):
    """Get comprehensive health dashboard data"""
    try:
        # Get latest data from all sources
        profile = await db.user_profiles.find_one({"user_id": user_id})
        microbiome = await db.microbiome_analysis.find_one(
            {"user_id": user_id}, 
            sort=[("timestamp", -1)]
        )
        wearable = await db.wearable_data.find_one(
            {"user_id": user_id}, 
            sort=[("timestamp", -1)]
        )
        
        # Remove ObjectIds
        for item in [profile, microbiome, wearable]:
            if item:
                item.pop('_id', None)
        
        # Get learning stats
        learning_stats = microbiome_ai.get_learning_stats()
        
        # Analyze wearable data if available
        wearable_analysis = None
        if wearable:
            wearable_analysis = microbiome_ai.analyze_wearable_data(wearable)
        
        return {
            "user_profile": profile,
            "microbiome_analysis": microbiome,
            "wearable_data": wearable,
            "wearable_analysis": wearable_analysis,
            "learning_stats": learning_stats
        }
        
    except Exception as e:
        logger.error(f"Error getting health dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)