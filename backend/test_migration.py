#!/usr/bin/env python3
"""
Backend Migration Test Script
Tests if the Python backend is properly configured
"""

import sys
import os

def test_imports():
    """Test if all required modules can be imported"""
    try:
        import flask
        import flask_cors
        import PyPDF2
        import google.generativeai as genai
        import bcrypt
        import jwt
        import pymongo
        from bson import ObjectId
        print("SUCCESS: All required Python modules are available")
        return True
    except ImportError as e:
        print(f"ERROR: Missing Python module: {e}")
        return False

def test_environment():
    """Test if environment variables are set"""
    from dotenv import load_dotenv
    load_dotenv()
    
    gemini_key = os.getenv('GEMINI_API_KEY') or os.getenv('REACT_APP_GEMINI_API_KEY')
    jwt_secret = os.getenv('JWT_SECRET')
    mongodb_uri = os.getenv('MONGODB_URI')
    
    if gemini_key:
        print(f"SUCCESS: GEMINI_API_KEY is configured: {gemini_key[:10]}...")
    else:
        print("ERROR: GEMINI_API_KEY is missing")
        return False
        
    if jwt_secret:
        print(f"SUCCESS: JWT_SECRET is configured")
    else:
        print("WARNING: JWT_SECRET is missing (will use default)")
    
    if mongodb_uri:
        print(f"SUCCESS: MONGODB_URI is configured: {mongodb_uri[:30]}...")
    else:
        print("ERROR: MONGODB_URI is missing")
        return False
    
    return True

def test_mongodb_connection():
    """Test MongoDB connection"""
    try:
        from dotenv import load_dotenv
        from pymongo import MongoClient
        
        load_dotenv()
        mongodb_uri = os.getenv('MONGODB_URI')
        
        if not mongodb_uri:
            print("ERROR: MONGODB_URI not found")
            return False
            
        client = MongoClient(mongodb_uri)
        # Test connection
        client.admin.command('ping')
        print("SUCCESS: MongoDB connection successful")
        client.close()
        return True
        
    except Exception as e:
        print(f"ERROR: MongoDB connection failed: {e}")
        return False

def test_app_import():
    """Test if the Flask app can be imported"""
    try:
        from app import app
        print("SUCCESS: Flask app imports successfully")
        return True
    except ImportError as e:
        print(f"ERROR: Failed to import Flask app: {e}")
        return False

def main():
    print("Python Backend Migration Test")
    print("=" * 40)
    
    success = True
    
    if not test_imports():
        success = False
        print("\nInstall missing modules with: pip install -r requirements.txt")
    
    if not test_environment():
        success = False
        print("\nCheck your .env file configuration")
    
    if not test_mongodb_connection():
        success = False
        print("\nCheck your MongoDB connection and credentials")
    
    if not test_app_import():
        success = False
    
    print("=" * 40)
    if success:
        print("SUCCESS: Migration completed successfully!")
        print("Database: MongoDB Atlas")
        print("You can now run: npm start")
    else:
        print("ERROR: Migration has issues that need to be resolved")
    
    return 0 if success else 1

if __name__ == '__main__':
    sys.exit(main())
