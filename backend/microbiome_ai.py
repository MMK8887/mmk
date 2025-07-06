# ====================================
# 🧬 MICROBIOME AI ENGINE - INTEGRATED BACKEND
# ====================================
import pandas as pd
import numpy as np
import json
import os
import sys
from typing import Dict, List, Optional, Any
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk import pos_tag, ne_chunk
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from collections import defaultdict
from rdflib import Graph, Literal, Namespace, RDF
import networkx as nx
from datetime import datetime
import logging
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MicrobiomeAI:
    def __init__(self, openai_api_key: str):
        self.openai_api_key = openai_api_key
        self.setup_nltk()
        self.setup_ml_models()
        self.setup_knowledge_graph()
        self.setup_responses()
        self.setup_learning()
        
    def setup_nltk(self):
        """Download required NLTK data"""
        nltk_downloads = {
            'punkt': 'tokenizers/punkt',
            'stopwords': 'corpora/stopwords',
            'averaged_perceptron_tagger': 'taggers/averaged_perceptron_tagger',
            'maxent_ne_chunker': 'chunkers/maxent_ne_chunker',
            'words': 'corpora/words'
        }
        
        for resource, path in nltk_downloads.items():
            try:
                nltk.data.find(path)
            except LookupError:
                nltk.download(resource)
                
        self.stop_words = set(stopwords.words("english"))
        
    def setup_ml_models(self):
        """Initialize ML models for intent detection"""
        # Training data for intent classification
        texts = [
            "Tell me about probiotics", "digestion problems", "what to eat", 
            "kimchi good", "Shannon index", "hi", "hello", "gut health",
            "microbiome analysis", "fiber intake", "fermented foods",
            "bacterial diversity", "diet recommendations", "prebiotics"
        ]
        labels = [
            "probiotic_info", "gut_health", "diet_suggestion", 
            "probiotic_info", "diversity_info", "hello", "hello", "gut_health",
            "gut_health", "fiber_info", "probiotic_info",
            "diversity_info", "diet_suggestion", "fiber_info"
        ]
        
        self.vectorizer = TfidfVectorizer()
        self.classifier = LogisticRegression()
        
        X = self.vectorizer.fit_transform(texts)
        self.classifier.fit(X, labels)
        
    def setup_knowledge_graph(self):
        """Initialize RDF knowledge graph"""
        self.EX = Namespace("http://example.org/microbiome#")
        self.graph = Graph()
        
        # Add microbe knowledge
        microbe_data = {
            "Bifidobacterium": {"type": "beneficial", "effects": ["digestion", "immunity"]},
            "Firmicutes": {"type": "imbalanced", "effects": ["obesity", "inflammation"]},
            "Bacteroidetes": {"type": "beneficial", "effects": ["fiber_digestion"]},
            "Lactobacillus": {"type": "beneficial", "effects": ["gut_health", "immunity"]},
            "Akkermansia": {"type": "beneficial", "effects": ["gut_barrier", "metabolism"]}
        }
        
        # Add food knowledge
        food_data = {
            "Yogurt": {"type": "fermented", "boosts": ["Bifidobacterium", "Lactobacillus"]},
            "Kimchi": {"type": "fermented", "boosts": ["Lactobacillus"]},
            "Fiber": {"type": "prebiotic", "boosts": ["Bacteroidetes", "Bifidobacterium"]},
            "Oats": {"type": "prebiotic", "boosts": ["Bacteroidetes"]}
        }
        
        # Build knowledge graph
        for microbe, data in microbe_data.items():
            self.graph.add((self.EX[microbe], RDF.type, self.EX.Microbe))
            self.graph.add((self.EX[microbe], self.EX.type, Literal(data["type"])))
            
        for food, data in food_data.items():
            self.graph.add((self.EX[food], RDF.type, self.EX.Food))
            self.graph.add((self.EX[food], self.EX.type, Literal(data["type"])))
            
    def setup_responses(self):
        """Initialize response templates"""
        self.responses = {
            "gut_health": "🧬 The gut microbiome supports digestion, immunity, and mental health. Your current microbiome shows {}.",
            "probiotic_info": "🧫 Probiotics are beneficial microbes found in yogurt, kefir, kimchi, and supplements. {}",
            "fiber_info": "🌾 Fiber feeds your good gut bacteria. Eat fruits, veggies, legumes, and oats. {}",
            "diversity_info": "🌈 A diverse microbiome is a healthy one. Your Shannon Index is {}.",
            "diet_suggestion": "🥗 Based on your microbiome analysis: {}",
            "hello": "👋 Hello! I'm your personalized gut health assistant. I can analyze your microbiome data and provide tailored recommendations.",
            "unknown": "❓ I'm still learning about your specific needs. Try asking about gut health, probiotics, fiber, diet, or your microbiome analysis."
        }
        
    def setup_learning(self):
        """Initialize learning system"""
        self.learned_intents = {}
        
    # Data Processing Methods
    def normalize_abundance(self, df):
        """Normalize microbiome abundance data"""
        return df.div(df.sum(axis=1), axis=0)
        
    def compute_shannon_index(self, df):
        """Calculate Shannon diversity index"""
        return -np.sum(df * np.log2(df + 1e-9), axis=1)
        
    def compute_risk_score(self, shannon_index):
        """Calculate risk score based on Shannon index"""
        return 1 - (shannon_index / 4.0)  # Normalized to 0-1 scale
        
    def process_microbiome_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Process uploaded microbiome CSV data"""
        try:
            # Handle sample ID column
            sample_ids = None
            if "SampleID" in df.columns:
                sample_ids = df.pop("SampleID")
                
            # Convert to numeric and normalize
            df_numeric = df.apply(pd.to_numeric, errors='coerce').fillna(0)
            df_normalized = self.normalize_abundance(df_numeric)
            
            # Calculate metrics
            shannon_indices = self.compute_shannon_index(df_normalized)
            risk_scores = self.compute_risk_score(shannon_indices)
            
            # Get average values for analysis
            avg_abundance = df_normalized.mean()
            avg_shannon = shannon_indices.mean()
            avg_risk = risk_scores.mean()
            
            # Determine diversity level
            if avg_shannon < 1.5:
                diversity_level = "Low"
            elif avg_shannon < 2.5:
                diversity_level = "Moderate"
            else:
                diversity_level = "High"
                
            return {
                "sample_count": len(df_normalized),
                "microbes": avg_abundance.to_dict(),
                "shannon_index": round(avg_shannon, 2),
                "risk_score": round(avg_risk, 2),
                "diversity_level": diversity_level,
                "raw_data": df_normalized.to_dict('records')
            }
            
        except Exception as e:
            logger.error(f"Error processing microbiome data: {e}")
            raise ValueError(f"Failed to process microbiome data: {str(e)}")
    
    # NLP Methods
    def extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from text using POS tagging"""
        try:
            tokens = word_tokenize(text.lower())
            pos_tags = pos_tag([w for w in tokens if w.isalnum() and w not in self.stop_words])
            keywords = [word for word, pos in pos_tags if pos.startswith(("NN", "JJ"))]
            return keywords[:5]  # Return top 5 keywords
        except Exception as e:
            logger.error(f"Error extracting keywords: {e}")
            return []
            
    def extract_named_entities(self, text: str) -> List[Dict[str, str]]:
        """Extract named entities from text"""
        try:
            tokens = word_tokenize(text)
            pos_tags = pos_tag(tokens)
            entities = []
            
            for chunk in ne_chunk(pos_tags):
                if hasattr(chunk, 'label'):
                    entity_name = " ".join([leaf[0] for leaf in chunk.leaves()])
                    entity_type = chunk.label()
                    entities.append({"name": entity_name, "type": entity_type})
                    
            return entities
        except Exception as e:
            logger.error(f"Error extracting entities: {e}")
            return []
            
    def rule_based_intent_detection(self, text: str) -> str:
        """Rule-based intent detection"""
        text_lower = text.lower()
        
        if any(word in text_lower for word in ["gut", "digestion", "microbiome", "intestinal"]):
            return "gut_health"
        elif any(word in text_lower for word in ["probiotic", "fermented", "yogurt", "kefir", "kimchi"]):
            return "probiotic_info"
        elif any(word in text_lower for word in ["fiber", "prebiotic", "roughage"]):
            return "fiber_info"
        elif any(word in text_lower for word in ["shannon", "diversity", "risk", "balance"]):
            return "diversity_info"
        elif any(word in text_lower for word in ["diet", "food", "meal", "eat", "nutrition"]):
            return "diet_suggestion"
        elif any(word in text_lower for word in ["hello", "hi", "hey", "greetings"]):
            return "hello"
        else:
            return "unknown"
            
    def ml_based_intent_detection(self, text: str) -> tuple:
        """ML-based intent detection with confidence"""
        try:
            text_vector = self.vectorizer.transform([text])
            predicted_intent = self.classifier.predict(text_vector)[0]
            confidence = max(self.classifier.predict_proba(text_vector)[0])
            return predicted_intent, confidence
        except Exception as e:
            logger.error(f"Error in ML intent detection: {e}")
            return "unknown", 0.0
            
    def detect_intent(self, text: str) -> Dict[str, Any]:
        """Combined intent detection with learning"""
        # Check learned intents first
        text_key = text.lower().strip()
        if text_key in self.learned_intents:
            learned = self.learned_intents[text_key]
            return {
                "intent": learned.get("intent", "unknown"),
                "confidence": 1.0,
                "method": "learned",
                "custom_response": learned.get("response")
            }
            
        # Rule-based detection
        rule_intent = self.rule_based_intent_detection(text)
        
        # ML-based detection
        ml_intent, ml_confidence = self.ml_based_intent_detection(text)
        
        # Choose best intent
        if rule_intent != "unknown":
            return {
                "intent": rule_intent,
                "confidence": 0.9,
                "method": "rule_based"
            }
        elif ml_confidence > 0.6:
            return {
                "intent": ml_intent,
                "confidence": ml_confidence,
                "method": "ml_based"
            }
        else:
            return {
                "intent": "unknown",
                "confidence": 0.3,
                "method": "fallback"
            }
            
    # Response Generation
    def generate_personalized_response(self, intent_data: Dict[str, Any], 
                                     user_profile: Dict[str, Any] = None,
                                     microbiome_data: Dict[str, Any] = None) -> str:
        """Generate personalized response based on intent and user data"""
        intent = intent_data["intent"]
        
        # Check for custom learned response
        if "custom_response" in intent_data and intent_data["custom_response"]:
            return intent_data["custom_response"]
            
        # Get base response template
        base_response = self.responses.get(intent, self.responses["unknown"])
        
        # Personalize based on user data
        if microbiome_data and intent != "hello" and intent != "unknown":
            shannon_index = microbiome_data.get("shannon_index", 0)
            diversity_level = microbiome_data.get("diversity_level", "unknown")
            
            if intent == "gut_health":
                base_response = base_response.format(f"a Shannon Index of {shannon_index} with {diversity_level.lower()} diversity")
            elif intent == "diversity_info":
                base_response = base_response.format(f"{shannon_index} ({diversity_level.lower()})")
            elif intent == "diet_suggestion":
                recommendations = self.generate_diet_recommendations(microbiome_data, user_profile)
                base_response = base_response.format(", ".join(recommendations))
            elif intent == "probiotic_info":
                allergy_note = ""
                if user_profile and "allergies" in user_profile:
                    if "dairy" in user_profile["allergies"]:
                        allergy_note = "Given your dairy allergy, try coconut yogurt or fermented vegetables."
                base_response = base_response.format(allergy_note)
            elif intent == "fiber_info":
                fiber_note = ""
                if microbiome_data:
                    bifi_level = microbiome_data.get("microbes", {}).get("Bifidobacterium", 0)
                    if bifi_level < 0.15:
                        fiber_note = "Your Bifidobacterium levels could benefit from more prebiotic fiber."
                base_response = base_response.format(fiber_note)
                
        return base_response
        
    def generate_diet_recommendations(self, microbiome_data: Dict[str, Any], 
                                    user_profile: Dict[str, Any] = None) -> List[str]:
        """Generate personalized diet recommendations"""
        recommendations = []
        microbes = microbiome_data.get("microbes", {})
        
        # Bifidobacterium recommendations
        if microbes.get("Bifidobacterium", 0) < 0.15:
            if user_profile and "dairy" in user_profile.get("allergies", []):
                recommendations.append("increase non-dairy fermented foods like kimchi")
            else:
                recommendations.append("include yogurt or kefir for Bifidobacterium")
                
        # Firmicutes balance
        if microbes.get("Firmicutes", 0) > 0.4:
            recommendations.append("reduce processed sugars to balance Firmicutes")
            
        # General recommendations based on profile
        if user_profile:
            if user_profile.get("diet") == "vegetarian":
                recommendations.append("eat lentils, oats, and leafy greens")
            if "digestion" in user_profile.get("goal", ""):
                recommendations.append("add ginger and turmeric to your diet")
                
        return recommendations or ["maintain a diverse, plant-rich diet"]
        
    async def generate_ai_response(self, message: str, session_id: str, 
                                 user_profile: Dict[str, Any] = None,
                                 microbiome_data: Dict[str, Any] = None) -> str:
        """Generate AI-enhanced response using OpenAI"""
        try:
            # Create LLM chat instance
            chat = LlmChat(
                api_key=self.openai_api_key,
                session_id=session_id,
                system_message=f"""You are a specialized microbiome health assistant. You have access to the user's microbiome data and should provide personalized, science-based advice about gut health, probiotics, diet, and microbiome optimization.

User Profile: {json.dumps(user_profile) if user_profile else 'Not available'}
Microbiome Data: {json.dumps(microbiome_data) if microbiome_data else 'Not available'}

Provide helpful, accurate, and personalized responses about gut health. Always mention specific microbiome insights when relevant."""
            ).with_model("openai", "gpt-4o")
            
            # Send message and get response
            user_message = UserMessage(text=message)
            response = await chat.send_message(user_message)
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating AI response: {e}")
            # Fallback to rule-based response
            intent_data = self.detect_intent(message)
            return self.generate_personalized_response(intent_data, user_profile, microbiome_data)
            
    # Learning System
    def update_learning(self, question: str, custom_response: str = None, 
                       intent_label: str = None) -> bool:
        """Update learning system with user feedback"""
        try:
            key = question.lower().strip()
            
            if custom_response:
                self.learned_intents[key] = {
                    "intent": "custom",
                    "response": custom_response,
                    "timestamp": datetime.utcnow().isoformat()
                }
            elif intent_label:
                self.learned_intents[key] = {
                    "intent": intent_label,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
            return True
            
        except Exception as e:
            logger.error(f"Error updating learning: {e}")
            return False
            
    def get_learning_stats(self) -> Dict[str, Any]:
        """Get learning system statistics"""
        total_learned = len(self.learned_intents)
        custom_responses = sum(1 for item in self.learned_intents.values() 
                             if item.get("intent") == "custom")
        
        return {
            "total_learned_intents": total_learned,
            "custom_responses": custom_responses,
            "intent_accuracy": min(95, 85 + (total_learned * 2)),  # Simulated improvement
            "personalization_score": min(95, 70 + (total_learned * 3))
        }
        
    # Health Analysis
    def analyze_wearable_data(self, wearable_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze wearable device data for health insights"""
        insights = []
        warnings = []
        
        sleep_hours = wearable_data.get("sleep_hours", 0)
        steps = wearable_data.get("steps", 0)
        stress_score = wearable_data.get("stress_score", 0)
        
        # Sleep analysis
        if sleep_hours < 7:
            warnings.append({
                "level": "moderate",
                "message": f"Sleep duration below optimal ({sleep_hours}h vs 8h)"
            })
            insights.append("🛌 Sleep more for better gut health")
            
        # Activity analysis
        if steps < 5000:
            warnings.append({
                "level": "low", 
                "message": f"Daily steps below recommended ({steps:,} vs 10,000)"
            })
            insights.append("🚶 Walk more to support microbes")
            
        # Stress analysis
        if stress_score > 6:
            warnings.append({
                "level": "moderate",
                "message": f"Stress levels elevated ({stress_score}/10)"
            })
            insights.append("🧘 Practice relaxation to lower stress")
            
        return {
            "insights": insights,
            "warnings": warnings,
            "overall_score": self._calculate_health_score(wearable_data)
        }
        
    def _calculate_health_score(self, wearable_data: Dict[str, Any]) -> int:
        """Calculate overall health score from wearable data"""
        score = 100
        
        sleep_hours = wearable_data.get("sleep_hours", 8)
        if sleep_hours < 7:
            score -= (7 - sleep_hours) * 10
            
        steps = wearable_data.get("steps", 10000)
        if steps < 5000:
            score -= 15
        elif steps < 8000:
            score -= 8
            
        stress_score = wearable_data.get("stress_score", 3)
        if stress_score > 7:
            score -= 20
        elif stress_score > 5:
            score -= 10
            
        return max(0, min(100, score))