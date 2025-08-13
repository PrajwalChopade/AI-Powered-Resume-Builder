#!/usr/bin/env python3
"""
Python Backend Runner
Starts the Flask server for the resume analyzer application
"""

import os
import sys

if __name__ == '__main__':
    try:
        from app import app
        
        # Get port from environment or default to 5000
        port = int(os.getenv('PORT', 5000))
        
        print(f"Starting Python Flask server on port {port}...")
        print("Backend endpoints available:")
        print("  - GET /health - Health check")
        print("  - POST /api/auth/register - User registration")
        print("  - POST /api/auth/login - User login")
        print("  - POST /api/ats/evaluate - ATS resume evaluation")
        print("  - POST /api/ai/analyze-resume - AI resume analysis (auth required)")
        print("  - POST /api/ai/test-key - Test API key (auth required)")
        print("  - GET /api/resumes - Get user resumes (auth required)")
        print("  - POST /api/resumes - Save resume (auth required)")
        print()
        print("Database: Using MongoDB for data storage")
        
        # Start the Flask server
        app.run(debug=True, host='0.0.0.0', port=port)
        
    except ImportError as e:
        print(f"ERROR: Error importing app: {e}")
        print("Please make sure you have installed the requirements:")
        print("pip install -r requirements.txt")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"ERROR: Server error: {e}")
        sys.exit(1)
