import requests
import sys
import time
import random
import string

BASE_URL = "http://127.0.0.1:5000"

def get_random_string(length=8):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

def test_auth_flow():
    session = requests.Session()
    username = f"user_{get_random_string()}"
    email = f"{username}@test.com"
    password = "password123"

    print(f"Testing with User: {username}, Email: {email}")

    # 1. Signup
    print("[1] Testing Signup...")
    signup_url = f"{BASE_URL}/signup" # routes/auth.py defines /signup directly on auth_bp?
    # auth_bp is registered with no url_prefix? 
    # Let's check app.py: app.register_blueprint(auth_bp) (default prefix is / usually or none?)
    # auth.py: auth_bp = Blueprint('auth', __name__)
    # It has no url_prefix in `Blueprint` call.
    # In app.py: app.register_blueprint(auth_bp) -> means routes are at /
    # So /signup is correct.
    
    # Wait, in auth.py: @auth_bp.route('/signup'...)
    # Yes.
    
    response = session.post(f"{BASE_URL}/signup", json={
        'username': username,
        'email': email,
        'password': password
    })
    
    if response.status_code == 200 and response.json().get('success'):
        print("PASS: Signup successful")
    else:
        print(f"FAIL: Signup failed. Status: {response.status_code}, Body: {response.text}")
        return False

    # 2. Login
    print("[2] Testing Login...")
    response = session.post(f"{BASE_URL}/login", json={
        'email': email,
        'password': password
    })
    
    if response.status_code == 200 and response.json().get('success'):
        print("PASS: Login successful")
    else:
        print(f"FAIL: Login failed. Status: {response.status_code}, Body: {response.text}")
        return False

    # 3. Access Protected Route
    print("[3] Testing Protected Route (/dashboard)...")
    # Dashboard route is @dashboard_bp.route('/dashboard')
    # Blueprint: dashboard_bp = Blueprint('dashboard', __name__)
    # Registered: app.register_blueprint(dashboard_bp)
    # The route is likely /dashboard.
    response = session.get(f"{BASE_URL}/dashboard")
    
    # If successful, it should return HTML (200 OK)
    if response.status_code == 200 and "<html" in response.text.lower():
        print("PASS: Dashboard access successful")
    else:
        print(f"FAIL: Dashboard access failed. Status: {response.status_code}")
        # print(response.text[:200])
        return False

    # 4. Logout (GET)
    print("[4] Testing Logout (GET)...")
    response = session.get(f"{BASE_URL}/logout", allow_redirects=False)
    
    # Needs to redirect
    if response.status_code == 302:
        print("PASS: Logout redirect successful")
    else:
        print(f"FAIL: Logout did not redirect. Status: {response.status_code}")
        return False
        
    # Check if session is cleared
    print("[5] Verifying Session Cleared...")
    response = session.get(f"{BASE_URL}/dashboard", allow_redirects=False)
    if response.status_code != 200: # Should be 302 (redirect to login) or 401
         print(f"PASS: access denied as expected (Status: {response.status_code})")
    else:
         print("FAIL: Still can access dashboard after logout!")
         return False

    print("\nALL TESTS PASSED!")
    return True

if __name__ == "__main__":
    try:
        if test_auth_flow():
            sys.exit(0)
        else:
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        print("CRITICAL: Connection refused. Is the server running?")
        sys.exit(1)
