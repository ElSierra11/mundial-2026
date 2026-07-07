import urllib.request
import urllib.error

url = "https://mundial-backend-h960.onrender.com/"
print(f"Requesting: {url} with a 120-second timeout...")
try:
    with urllib.request.urlopen(url, timeout=120) as response:
        html = response.read().decode('utf-8')
        print(f"Status Code: {response.status}")
        print("Headers:")
        for k, v in response.getheaders():
            print(f"  {k}: {v}")
        print("Body:")
        print(html[:500])
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code} - {e.reason}")
    print("Headers:")
    for k, v in e.headers.items():
        print(f"  {k}: {v}")
    try:
        body = e.read().decode('utf-8')
        print("Body:")
        print(body[:500])
    except Exception as read_err:
        print(f"Could not read error body: {read_err}")
except Exception as e:
    print(f"General error: {e}")
