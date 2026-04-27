import requests

url = "http://localhost:8000/api/auth/register/step1"
payload = {
    "username": "test_new_company2",
    "email": "test2@example.com",
    "mobile": "+1987654321",
    "password": "securepassword123",
    "full_name": "Test User",
    "role": "logistics_manager",
    "company_id": None,
    "company_name": "Test New Company",
    "assigned_node_ids": []
}

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
