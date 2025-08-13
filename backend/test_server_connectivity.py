import requests
import json

def test_server():
    base_url = "http://127.0.0.1:5000"
    
    print("Testing server connectivity...")
    
    # Test 1: Basic connectivity
    try:
        response = requests.get(f"{base_url}/api/test", timeout=10)
        print(f"✅ Basic test: Status {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"❌ Basic test failed: {e}")
        return False
    
    # Test 2: Debug endpoint
    test_data = {
        "resumeText": "Software Engineer with JavaScript and React experience",
        "jobDescription": "Looking for a Software Engineer with JavaScript, React, and Python skills"
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/ai/debug-improve-uploaded-resume", 
            json=test_data,
            timeout=30
        )
        print(f"✅ Debug endpoint: Status {response.status_code}")
        if response.status_code == 200:
            print("✅ DEBUG ENDPOINT WORKING!")
            result = response.json()
            print(f"Keys in response: {list(result.keys())}")
        else:
            print(f"❌ Debug endpoint error: {response.text}")
    except Exception as e:
        print(f"❌ Debug test failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    test_server()
