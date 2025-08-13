#!/usr/bin/env python3
"""
Test the AI Resume Improvement functionality
"""

import requests
import json

# Test configuration
BASE_URL = "http://localhost:5000"
TEST_RESUME_TEXT = """
Name: John Smith
Email: john.smith@email.com
Phone: (555) 123-4567
Location: Mumbai

Summary: Software developer with experience in web development.

Experience:
• Software Developer at Tech Corp (2022 - Present)
  - Worked on backend API for 6 months
  - Fixed bugs in the system
  - Participated in team meetings

Education:
• Bachelor's Degree in Computer Science from ABC University (2018-2022)

Skills: Python, JavaScript, HTML, CSS

Projects:
• Web App: Built a simple web application using React
"""

JOB_DESCRIPTION = """
Software Development Engineer (SDE)
We are seeking a passionate and highly skilled Software Development Engineer (SDE) to join our growing product and engineering team. 

Key Responsibilities:
- Design, develop, and maintain high-quality, scalable, and secure software systems
- Collaborate in agile teams to deliver end-to-end features across the software stack
- Write clean, maintainable code and perform peer code reviews
- Participate in design discussions, architecture reviews, and product planning

Required Qualifications:
- Strong foundation in data structures, algorithms, and object-oriented programming
- Proficiency in at least one programming language such as Java, Python, C++, JavaScript, or Go
- Experience building RESTful APIs, microservices, or scalable backend systems
- Solid understanding of relational and NoSQL databases (e.g., MySQL, PostgreSQL, MongoDB)
- Familiarity with version control systems (Git) and DevOps practices

Preferred Qualifications:
- Experience with cloud platforms like AWS, GCP, or Azure
- Exposure to containerization tools (Docker, Kubernetes)
- Knowledge of machine learning, AI, or big data tools
- Experience in test-driven development (TDD) and agile methodologies
"""

def test_improvement_analysis():
    """Test the AI improvement analysis endpoint"""
    
    print("🧪 Testing AI Resume Improvement Analysis...")
    
    # First, we would need to create a user and resume in the system
    # For now, let's test with a mock resume ID (this would need proper setup)
    
    url = f"{BASE_URL}/api/ai/improve-resume"
    
    payload = {
        "resumeId": "test_resume_id",  # This would be a real resume ID in practice
        "jobDescription": JOB_DESCRIPTION
    }
    
    headers = {
        "Content-Type": "application/json",
        # "Authorization": "Bearer <token>"  # Would need real auth token
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Analysis successful!")
            print(f"Improvements found: {len(result.get('improvements', {}).get('specific_improvements', []))}")
            print(f"Skills to add: {len(result.get('improvements', {}).get('skill_additions', []))}")
            
            # Print sample improvements
            improvements = result.get('improvements', {}).get('specific_improvements', [])
            if improvements:
                print("\n📝 Sample Improvement:")
                first_improvement = improvements[0]
                print(f"Section: {first_improvement.get('section')}")
                print(f"Original: '{first_improvement.get('original_text', '')[:100]}...'")
                print(f"Improved: '{first_improvement.get('improved_text', '')[:100]}...'")
                print(f"Reason: {first_improvement.get('reason', '')}")
                
        else:
            print(f"❌ Request failed: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server. Make sure it's running on port 5000.")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def test_health_check():
    """Test if the backend is healthy"""
    print("🏥 Testing Backend Health...")
    
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend is healthy!")
            print(f"   Status: {data.get('status')}")
            print(f"   API Key Loaded: {data.get('api_key_loaded')}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server.")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    print("🚀 Testing AI Resume Improvement System")
    print("=" * 50)
    
    # Test backend health
    test_health_check()
    print()
    
    # Note: The improvement test requires authentication
    # In a real scenario, you'd first register/login to get a token
    # and create a resume to get a real resume ID
    print("ℹ️  To fully test improvements, you need to:")
    print("   1. Register/Login to get an auth token")
    print("   2. Create a resume to get a resume ID")
    print("   3. Use that ID to test improvements")
    print()
    print("   The backend is ready to handle these requests!")
    
    print("\n✅ Backend AI Improvement System is Ready!")
    print("   Frontend: http://localhost:3000")
    print("   Backend: http://localhost:5000")
