#!/usr/bin/env python3
import requests
import json
import unittest
import os
import sys
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.strip().split('=')[1].strip('"\'')
    except Exception as e:
        logger.error(f"Error reading backend URL: {e}")
        return None

# Base URL for API
BASE_URL = f"{get_backend_url()}/api"
TEST_USER_ID = "USER_001"
TEST_SESSION_ID = "TEST_SESSION_001"

class MicrobiomeAIBackendTests(unittest.TestCase):
    """Test suite for Microbiome AI Assistant backend API"""

    def setUp(self):
        """Set up test case"""
        logger.info(f"Using API base URL: {BASE_URL}")
        self.session = requests.Session()
        self.message_ids = []  # Store message IDs for feedback tests
        
    # Class variables to store message IDs between tests
    message_id_1 = None
    message_id_2 = None

    def test_01_health_check(self):
        """Test API health check endpoint"""
        logger.info("Testing API health check...")
        response = self.session.get(f"{BASE_URL}/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("message", data)
        self.assertIn("version", data)
        logger.info(f"Health check response: {data}")

    def test_02_chat_gut_health(self):
        """Test chat endpoint with gut health query"""
        logger.info("Testing chat endpoint with gut health query...")
        payload = {
            "message": "Hello, I need help with my gut health",
            "session_id": TEST_SESSION_ID,
            "user_profile": {
                "user_id": TEST_USER_ID,
                "diet": "omnivore",
                "allergies": ["dairy"],
                "goal": "improve digestion",
                "age": 35,
                "conditions": ["IBS"]
            }
        }
        response = self.session.post(f"{BASE_URL}/chat", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Validate response structure
        self.assertIn("id", data)
        self.assertIn("message", data)
        self.assertIn("response", data)
        self.assertIn("intent", data)
        self.assertIn("keywords", data)
        self.assertIn("entities", data)
        self.assertIn("confidence", data)
        
        # Store message ID for feedback test
        self.message_ids.append(data["id"])
        
        # Check intent detection
        self.assertEqual(data["intent"], "gut_health")
        logger.info(f"Chat response intent: {data['intent']}")
        logger.info(f"Chat response: {data['response'][:100]}...")
        
        # Make the message ID available for other tests
        MicrobiomeAIBackendTests.message_id_1 = data["id"]

    def test_03_chat_probiotics(self):
        """Test chat endpoint with probiotics query"""
        logger.info("Testing chat endpoint with probiotics query...")
        payload = {
            "message": "What probiotics should I take?",
            "session_id": TEST_SESSION_ID,
            "user_profile": {
                "user_id": TEST_USER_ID,
                "diet": "omnivore",
                "allergies": ["dairy"],
                "goal": "improve digestion",
                "age": 35,
                "conditions": ["IBS"]
            }
        }
        response = self.session.post(f"{BASE_URL}/chat", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Store message ID for feedback test
        self.message_ids.append(data["id"])
        
        # Check intent detection
        self.assertIn(data["intent"], ["probiotic_info", "gut_health"])
        logger.info(f"Chat response intent: {data['intent']}")
        logger.info(f"Chat response: {data['response'][:100]}...")
        
        # Make the message ID available for other tests
        MicrobiomeAIBackendTests.message_id_2 = data["id"]

    def test_04_chat_microbiome_diversity(self):
        """Test chat endpoint with microbiome diversity query"""
        logger.info("Testing chat endpoint with microbiome diversity query...")
        payload = {
            "message": "How do I improve my microbiome diversity?",
            "session_id": TEST_SESSION_ID,
            "user_profile": {
                "user_id": TEST_USER_ID,
                "diet": "omnivore",
                "allergies": ["dairy"],
                "goal": "improve digestion",
                "age": 35,
                "conditions": ["IBS"]
            }
        }
        response = self.session.post(f"{BASE_URL}/chat", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Store message ID for feedback test
        self.message_ids.append(data["id"])
        
        # Check intent detection
        self.assertIn(data["intent"], ["diversity_info", "gut_health", "diet_suggestion"])
        logger.info(f"Chat response intent: {data['intent']}")
        logger.info(f"Chat response: {data['response'][:100]}...")

    def test_05_chat_fiber_intake(self):
        """Test chat endpoint with fiber intake query"""
        logger.info("Testing chat endpoint with fiber intake query...")
        payload = {
            "message": "Tell me about fiber intake",
            "session_id": TEST_SESSION_ID,
            "user_profile": {
                "user_id": TEST_USER_ID,
                "diet": "omnivore",
                "allergies": ["dairy"],
                "goal": "improve digestion",
                "age": 35,
                "conditions": ["IBS"]
            }
        }
        response = self.session.post(f"{BASE_URL}/chat", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Store message ID for feedback test
        self.message_ids.append(data["id"])
        
        # Check intent detection
        self.assertIn(data["intent"], ["fiber_info", "diet_suggestion"])
        logger.info(f"Chat response intent: {data['intent']}")
        logger.info(f"Chat response: {data['response'][:100]}...")

    def test_06_positive_feedback(self):
        """Test feedback system with positive feedback"""
        if not hasattr(self.__class__, 'message_id_1') or not self.__class__.message_id_1:
            self.skipTest("No message IDs available for feedback test")
            
        logger.info("Testing feedback system with positive feedback...")
        payload = {
            "message_id": self.__class__.message_id_1,
            "message": "Hello, I need help with my gut health",
            "is_correct": True,
            "custom_response": None,
            "correct_intent": "gut_health"
        }
        response = self.session.post(f"{BASE_URL}/feedback", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("message", data)
        logger.info(f"Positive feedback response: {data}")

    def test_07_negative_feedback(self):
        """Test feedback system with negative feedback"""
        if not hasattr(self.__class__, 'message_id_2') or not self.__class__.message_id_2:
            self.skipTest("No message IDs available for feedback test")
            
        logger.info("Testing feedback system with negative feedback...")
        payload = {
            "message_id": self.__class__.message_id_2,
            "message": "What probiotics should I take?",
            "is_correct": False,
            "custom_response": "For someone with dairy allergies, I recommend non-dairy probiotics like kimchi, sauerkraut, or probiotic supplements that are dairy-free.",
            "correct_intent": "probiotic_info"
        }
        response = self.session.post(f"{BASE_URL}/feedback", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("message", data)
        logger.info(f"Negative feedback response: {data}")

    def test_08_learning_stats(self):
        """Test learning stats endpoint"""
        logger.info("Testing learning stats endpoint...")
        response = self.session.get(f"{BASE_URL}/learning-stats")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Validate response structure
        self.assertIn("total_learned_intents", data)
        self.assertIn("custom_responses", data)
        self.assertIn("intent_accuracy", data)
        self.assertIn("personalization_score", data)
        self.assertIn("total_feedback_received", data)
        self.assertIn("total_conversations", data)
        
        logger.info(f"Learning stats: {data}")

    def test_09_health_dashboard(self):
        """Test health dashboard endpoint"""
        logger.info("Testing health dashboard endpoint...")
        response = self.session.get(f"{BASE_URL}/health-dashboard/{TEST_USER_ID}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Validate response structure
        self.assertIn("user_profile", data)
        self.assertIn("learning_stats", data)
        
        # These might be None if no data exists yet
        self.assertIn("microbiome_analysis", data)
        self.assertIn("wearable_data", data)
        
        logger.info(f"Health dashboard response keys: {data.keys()}")

    def test_10_chat_history(self):
        """Test chat history endpoint"""
        logger.info("Testing chat history endpoint...")
        response = self.session.get(f"{BASE_URL}/chat-history/{TEST_SESSION_ID}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Validate response structure
        self.assertIn("history", data)
        
        # Check if we have chat history from our previous tests
        if len(data["history"]) > 0:
            logger.info(f"Chat history contains {len(data['history'])} entries")
            self.assertIn("message", data["history"][0])
            self.assertIn("response", data["history"][0])
        else:
            logger.info("Chat history is empty")

    def test_11_user_profile(self):
        """Test user profile endpoints"""
        # Create a test profile
        logger.info("Testing user profile endpoints...")
        profile_data = {
            "user_id": TEST_USER_ID,
            "diet": "vegetarian",
            "allergies": ["gluten", "dairy"],
            "goal": "improve gut health",
            "age": 40,
            "conditions": ["IBS", "anxiety"]
        }
        
        # Save profile
        response = self.session.post(f"{BASE_URL}/user-profile", json=profile_data)
        self.assertEqual(response.status_code, 200)
        
        # Get profile
        response = self.session.get(f"{BASE_URL}/user-profile/{TEST_USER_ID}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Validate profile data
        self.assertEqual(data["user_id"], TEST_USER_ID)
        self.assertEqual(data["diet"], "vegetarian")
        self.assertListEqual(data["allergies"], ["gluten", "dairy"])
        self.assertEqual(data["goal"], "improve gut health")
        self.assertEqual(data["age"], 40)
        self.assertListEqual(data["conditions"], ["IBS", "anxiety"])
        
        logger.info(f"User profile response: {data}")

    def test_12_wearable_data(self):
        """Test wearable data endpoints"""
        logger.info("Testing wearable data endpoints...")
        wearable_data = {
            "user_id": TEST_USER_ID,
            "sleep_hours": 6.5,
            "steps": 8500,
            "stress_score": 7,
            "heart_rate": 72
        }
        
        # Save wearable data
        response = self.session.post(f"{BASE_URL}/wearable-data", json=wearable_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("message", data)
        self.assertIn("analysis", data)
        
        # Get wearable data
        response = self.session.get(f"{BASE_URL}/wearable-data/{TEST_USER_ID}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Validate wearable data
        self.assertIn("data", data)
        self.assertIn("analysis", data)
        
        if data["data"]:
            self.assertEqual(data["data"]["user_id"], TEST_USER_ID)
            self.assertEqual(data["data"]["sleep_hours"], 6.5)
            self.assertEqual(data["data"]["steps"], 8500)
            self.assertEqual(data["data"]["stress_score"], 7)
            self.assertEqual(data["data"]["heart_rate"], 72)
        
        logger.info(f"Wearable data response: {data}")

if __name__ == "__main__":
    logger.info("Starting Microbiome AI Assistant backend API tests")
    unittest.main(verbosity=2)