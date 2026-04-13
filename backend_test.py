#!/usr/bin/env python3
"""
Sugar City Sweeps - Backend API Testing Suite
Tests all critical endpoints for the sweepstakes platform
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Tuple

class SugarCitySweepsAPITester:
    def __init__(self, base_url: str = "https://wah-lah.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session = requests.Session()
        self.admin_token = None
        self.user_token = None
        self.test_user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Test credentials from /app/memory/test_credentials.md
        self.admin_email = "admin@sugarcitysweeps.com"
        self.admin_password = "SugarCity2024!"
        
        print(f"🍬 Sugar City Sweeps API Tester")
        print(f"🔗 Testing against: {self.base_url}")
        print("=" * 60)

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Dict = None, headers: Dict = None, cookies: Dict = None) -> Tuple[bool, Dict]:
        """Run a single API test with detailed logging"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        
        # Prepare headers
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
            
        self.tests_run += 1
        print(f"\n🔍 Test {self.tests_run}: {name}")
        print(f"   {method} {endpoint}")
        
        try:
            # Make request - only pass cookies if explicitly provided
            request_kwargs = {'headers': test_headers}
            if cookies is not None:
                request_kwargs['cookies'] = cookies
            if data is not None:
                request_kwargs['json'] = data
                
            if method == 'GET':
                response = self.session.get(url, **request_kwargs)
            elif method == 'POST':
                response = self.session.post(url, **request_kwargs)
            elif method == 'PUT':
                response = self.session.put(url, **request_kwargs)
            elif method == 'DELETE':
                response = self.session.delete(url, **request_kwargs)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            # Check status code
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"   ✅ PASS - Status: {response.status_code}")
                
                # Try to parse JSON response
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(response_data) <= 5:
                        print(f"   📄 Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {"raw_response": response.text[:200]}
            else:
                print(f"   ❌ FAIL - Expected {expected_status}, got {response.status_code}")
                print(f"   📄 Response: {response.text[:300]}")
                self.failed_tests.append({
                    "test": name,
                    "endpoint": endpoint,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}
                
        except Exception as e:
            print(f"   ❌ FAIL - Exception: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "endpoint": endpoint,
                "error": str(e)
            })
            return False, {}

    def test_root_endpoint(self) -> bool:
        """Test API root endpoint"""
        success, response = self.run_test(
            "API Root",
            "GET",
            "/",
            200
        )
        return success

    def test_admin_login(self) -> bool:
        """Test admin login and store cookies"""
        # Make login request and let session handle cookies automatically
        url = f"{self.api_url}/auth/login"
        response = self.session.post(url, json={
            "email": self.admin_email,
            "password": self.admin_password
        }, headers={'Content-Type': 'application/json'})
        
        self.tests_run += 1
        print(f"\n🔍 Test {self.tests_run}: Admin Login")
        print(f"   POST /auth/login")
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get("role") == "admin":
                    self.tests_passed += 1
                    print(f"   ✅ PASS - Status: {response.status_code}")
                    print(f"   🔑 Admin authenticated: {data.get('name', 'Unknown')}")
                    print(f"   🍪 Cookies stored: {len(self.session.cookies)} cookies")
                    return True
                else:
                    print(f"   ❌ FAIL - Wrong role: {data.get('role')}")
                    return False
            except:
                print(f"   ❌ FAIL - Invalid JSON response")
                return False
        else:
            print(f"   ❌ FAIL - Status: {response.status_code}")
            print(f"   📄 Response: {response.text[:200]}")
            return False

    def test_auth_me(self) -> bool:
        """Test /auth/me endpoint"""
        success, response = self.run_test(
            "Get Current User Info",
            "GET",
            "/auth/me", 
            200
        )
        
        if success and response.get("email") == self.admin_email:
            print(f"   👤 User info retrieved: {response.get('name')} ({response.get('role')})")
            return True
        return success

    def test_user_registration(self) -> bool:
        """Test user registration"""
        test_email = f"testuser_{datetime.now().strftime('%H%M%S')}@test.com"
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "/auth/register",
            200,
            data={
                "email": test_email,
                "password": "TestPass123!",
                "name": "Test User",
                "age_verified": True
            }
        )
        
        if success and response.get("id"):
            self.test_user_id = response.get("id")
            print(f"   👤 User registered: {response.get('name')} (ID: {self.test_user_id})")
            return True
        return success

    def test_games_endpoint(self) -> bool:
        """Test games endpoint - should return 7 games"""
        success, response = self.run_test(
            "Get Games List",
            "GET",
            "/games",
            200
        )
        
        if success:
            games_count = len(response) if isinstance(response, list) else 0
            print(f"   🎮 Games found: {games_count}")
            
            if games_count == 7:
                print(f"   ✅ Correct number of games (7)")
                return True
            else:
                print(f"   ⚠️  Expected 7 games, found {games_count}")
                return False
        return success

    def test_amoe_status(self) -> bool:
        """Test AMOE status endpoint"""
        success, response = self.run_test(
            "AMOE Status Check",
            "GET",
            "/amoe/status",
            200
        )
        
        if success and "eligible" in response:
            print(f"   🎁 AMOE eligible: {response.get('eligible')}")
            return True
        return success

    def test_amoe_claim(self) -> bool:
        """Test AMOE daily claim"""
        success, response = self.run_test(
            "AMOE Daily Claim",
            "POST",
            "/amoe/claim-daily",
            200  # or 400 if already claimed
        )
        
        if success:
            print(f"   🎁 AMOE claim result: {response.get('message', 'Success')}")
            return True
        elif response.get("status_code") == 400:
            print(f"   🎁 AMOE claim (already claimed today): OK")
            return True
        return success

    def test_payment_crypto_info(self) -> bool:
        """Test crypto payment info"""
        success, response = self.run_test(
            "Crypto Payment Info",
            "GET",
            "/payment/crypto-info",
            200
        )
        
        if success and response.get("btc_address"):
            print(f"   ₿ BTC Address: {response.get('btc_address')[:20]}...")
            return True
        return success

    def test_payment_card_info(self) -> bool:
        """Test card payment info"""
        success, response = self.run_test(
            "Card Payment Info", 
            "GET",
            "/payment/card-info",
            200
        )
        
        if success and response.get("tag"):
            print(f"   💳 Payment Tag: {response.get('tag')}")
            return True
        return success

    def test_admin_users(self) -> bool:
        """Test admin users endpoint"""
        success, response = self.run_test(
            "Admin - Get Users",
            "GET",
            "/admin/users",
            200
        )
        
        if success:
            users_count = len(response) if isinstance(response, list) else 0
            print(f"   👥 Users found: {users_count}")
            return True
        return success

    def test_admin_stats(self) -> bool:
        """Test admin stats endpoint"""
        success, response = self.run_test(
            "Admin - Dashboard Stats",
            "GET", 
            "/admin/stats",
            200
        )
        
        if success and "total_users" in response:
            print(f"   📊 Stats - Users: {response.get('total_users')}, Revenue: ${response.get('total_revenue', 0)}")
            return True
        return success

    def test_admin_transactions(self) -> bool:
        """Test admin transactions endpoint"""
        success, response = self.run_test(
            "Admin - Get Transactions",
            "GET",
            "/admin/transactions", 
            200
        )
        
        if success:
            tx_count = len(response) if isinstance(response, list) else 0
            print(f"   💰 Transactions found: {tx_count}")
            return True
        return success

    def test_user_logout(self) -> bool:
        """Test logout endpoint"""
        success, response = self.run_test(
            "User Logout",
            "POST",
            "/auth/logout",
            200
        )
        return success

    def run_all_tests(self) -> bool:
        """Run all backend API tests"""
        print("🚀 Starting Sugar City Sweeps Backend API Tests\n")
        
        # Core API Tests
        tests = [
            ("API Root", self.test_root_endpoint),
            ("Admin Login", self.test_admin_login),
            ("Auth Me", self.test_auth_me),
            ("User Registration", self.test_user_registration),
            ("Games List (7 games)", self.test_games_endpoint),
            ("AMOE Status", self.test_amoe_status),
            ("AMOE Claim", self.test_amoe_claim),
            ("Crypto Payment Info", self.test_payment_crypto_info),
            ("Card Payment Info", self.test_payment_card_info),
            ("Admin Users", self.test_admin_users),
            ("Admin Stats", self.test_admin_stats),
            ("Admin Transactions", self.test_admin_transactions),
            ("User Logout", self.test_user_logout),
        ]
        
        # Run tests
        for test_name, test_func in tests:
            try:
                test_func()
            except Exception as e:
                print(f"   ❌ FAIL - Exception in {test_name}: {str(e)}")
                self.failed_tests.append({
                    "test": test_name,
                    "error": str(e)
                })
        
        # Print summary
        print("\n" + "=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Tests Passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Tests Failed: {len(self.failed_tests)}")
        
        if self.failed_tests:
            print("\n🚨 FAILED TESTS:")
            for i, failure in enumerate(self.failed_tests, 1):
                print(f"{i}. {failure.get('test', 'Unknown')}")
                if 'endpoint' in failure:
                    print(f"   Endpoint: {failure['endpoint']}")
                if 'expected' in failure and 'actual' in failure:
                    print(f"   Expected: {failure['expected']}, Got: {failure['actual']}")
                if 'error' in failure:
                    print(f"   Error: {failure['error']}")
                if 'response' in failure:
                    print(f"   Response: {failure['response'][:100]}...")
                print()
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📊 Success Rate: {success_rate:.1f}%")
        
        return len(self.failed_tests) == 0

def main():
    """Main test runner"""
    tester = SugarCitySweepsAPITester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⏹️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Fatal error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())