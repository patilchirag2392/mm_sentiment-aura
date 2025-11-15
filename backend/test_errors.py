import requests
import json

BASE_URL = "http://localhost:8000"

def test_normal_request():
    """Test a normal request."""
    print("\n1. Testing normal request...")
    response = requests.post(
        f"{BASE_URL}/api/process_text",
        json={"text": "I am happy!"}
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)[:200]}...")

def test_invalid_endpoint():
    """Test 404 error handling."""
    print("\n2. Testing 404 error...")
    response = requests.get(f"{BASE_URL}/api/nonexistent")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")

def test_invalid_data():
    """Test validation error."""
    print("\n3. Testing validation error...")
    response = requests.post(
        f"{BASE_URL}/api/process_text",
        json={"text": ""}  # empty text should fail validation
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")

def test_health_check():
    """Test health check with error handling info."""
    print("\n4. Testing health check...")
    response = requests.get(f"{BASE_URL}/api/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

if __name__ == "__main__":
    print("Testing Error Handling...")
    print("=" * 50)
    
    try:
        test_health_check()
        test_normal_request()
        test_invalid_data()
        test_invalid_endpoint()
    except Exception as e:
        print(f"Test failed: {e}")
    
    print("\n" + "=" * 50)
    print("Error handling tests complete!")