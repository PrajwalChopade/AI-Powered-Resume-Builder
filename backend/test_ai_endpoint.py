#!/usr/bin/env python3
"""
Test script for AI Resume Improvement API endpoint
"""
import requests
import json

# Test data
test_data = {
    "resumeText": "Software Developer with 3 years experience in Python, JavaScript, React. Built web applications using Flask, MongoDB. Experience in machine learning projects.",
    "jobDescription": "We are looking for a Full Stack Developer with experience in Java, Python, React, Node.js, AWS, Docker, Kubernetes, RESTful APIs, Microservices, and CI/CD pipelines.",
    "resumeTitle": "Test Resume"
}

# Test without authentication first (should fail)
print("🧪 Testing AI Improvement Endpoint...")
print("=" * 50)

try:
    # Test endpoint
    url = "http://localhost:5000/api/ai/improve-uploaded-resume"
    
    print(f"📡 Making request to: {url}")
    print(f"📄 Resume text length: {len(test_data['resumeText'])} characters")
    print(f"📋 Job description length: {len(test_data['jobDescription'])} characters")
    
    # Make request without auth (expected to fail with 401)
    response = requests.post(url, json=test_data, timeout=60)
    
    print(f"📊 Response Status: {response.status_code}")
    print(f"📨 Response Headers: {dict(response.headers)}")
    
    if response.status_code == 401:
        print("✅ Expected 401 - Authentication required (this is correct)")
        response_data = response.json()
        print(f"📝 Response: {json.dumps(response_data, indent=2)}")
    elif response.status_code == 500:
        print("❌ 500 Error - Server error occurred")
        try:
            error_data = response.json()
            print(f"📝 Error Response: {json.dumps(error_data, indent=2)}")
        except:
            print(f"📝 Raw Response: {response.text}")
    else:
        print(f"🤔 Unexpected status code: {response.status_code}")
        try:
            response_data = response.json()
            print(f"📝 Response: {json.dumps(response_data, indent=2)}")
        except:
            print(f"📝 Raw Response: {response.text}")
            
except requests.exceptions.ConnectionError:
    print("❌ Connection Error - Make sure the backend server is running on port 5000")
except requests.exceptions.Timeout:
    print("⏰ Timeout Error - Request took longer than 60 seconds")
except Exception as e:
    print(f"❌ Unexpected Error: {e}")

print("\n" + "=" * 50)
print("💡 Note: This test expects a 401 error because we're not sending an auth token.")
print("💡 To test with authentication, you need to:")
print("   1. Login through the frontend")
print("   2. Get the JWT token from localStorage")
print("   3. Add 'Authorization: Bearer <token>' header")
