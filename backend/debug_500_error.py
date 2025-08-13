#!/usr/bin/env python3
"""
Simple test script to debug the exact 500 error
"""
import requests
import json
import time

def test_ai_improvement():
    print("🔍 Testing AI Improvement Endpoint...")
    print("=" * 60)
    
    # Test data
    test_data = {
        "resumeText": "Software Developer with 3 years experience in Python, JavaScript, React. Built web applications using Flask, MongoDB. Experience in machine learning projects with TensorFlow and scikit-learn. Strong background in data analysis and visualization.",
        "jobDescription": "We are looking for a Senior Full Stack Developer with 5+ years experience in Java, Python, React, Node.js, AWS, Docker, Kubernetes, RESTful APIs, Microservices, CI/CD pipelines, and cloud computing. Must have experience with database design, system architecture, and agile development methodologies.",
        "resumeTitle": "Test Resume for AI Analysis"
    }
    
    url = "http://localhost:5000/api/ai/improve-uploaded-resume"
    
    print(f"🎯 Target URL: {url}")
    print(f"📄 Resume length: {len(test_data['resumeText'])} characters")
    print(f"📋 Job description length: {len(test_data['jobDescription'])} characters")
    print()
    
    try:
        print("📡 Making request WITHOUT authentication (should get 401)...")
        start_time = time.time()
        
        response = requests.post(
            url, 
            json=test_data,
            timeout=30,
            headers={'Content-Type': 'application/json'}
        )
        
        end_time = time.time()
        request_time = end_time - start_time
        
        print(f"⏱️  Request took: {request_time:.2f} seconds")
        print(f"📊 Status Code: {response.status_code}")
        print(f"📨 Response Headers: Content-Type: {response.headers.get('Content-Type')}")
        print()
        
        if response.status_code == 401:
            print("✅ SUCCESS: Got expected 401 (Authentication required)")
            try:
                error_response = response.json()
                print(f"📝 Response: {json.dumps(error_response, indent=2)}")
            except:
                print(f"📝 Raw Response: {response.text[:500]}...")
                
        elif response.status_code == 500:
            print("❌ ERROR: 500 Internal Server Error")
            print("💡 This indicates a server-side code issue")
            try:
                error_response = response.json()
                print(f"📝 Error Response: {json.dumps(error_response, indent=2)}")
            except:
                print(f"📝 Raw Error Response: {response.text[:1000]}...")
                
        elif response.status_code == 200:
            print("⚠️  UNEXPECTED: Got 200 without authentication")
            try:
                success_response = response.json()
                print(f"📝 Response: {json.dumps(success_response, indent=2)}")
            except:
                print(f"📝 Raw Response: {response.text[:500]}...")
                
        else:
            print(f"🤔 UNEXPECTED STATUS: {response.status_code}")
            print(f"📝 Response: {response.text[:500]}...")
            
    except requests.exceptions.ConnectionError:
        print("❌ CONNECTION ERROR: Cannot connect to http://localhost:5000")
        print("💡 Make sure the Flask backend server is running")
        
    except requests.exceptions.Timeout:
        print("⏰ TIMEOUT ERROR: Request took longer than 30 seconds")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ REQUEST ERROR: {e}")
        
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("🔍 Analysis:")
    print("• 401 = Expected (no auth token)")
    print("• 500 = Server error (code issue)")
    print("• 200 = Unexpected success")
    print("• Connection error = Server not running")

if __name__ == "__main__":
    test_ai_improvement()
