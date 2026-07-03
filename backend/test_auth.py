import urllib.request
import json

url = "http://127.0.0.1:8000/api/auth/google"
data = json.dumps({"token": "mock_test@demo.com_Testuser", "email": "", "name": ""}).encode()
req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")

try:
    with urllib.request.urlopen(req, timeout=5) as resp:
        result = json.loads(resp.read())
        print("SUCCESS:", json.dumps(result, indent=2, ensure_ascii=False))
except Exception as e:
    print("ERROR:", e)
