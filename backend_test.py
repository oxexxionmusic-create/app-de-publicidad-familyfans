#!/usr/bin/env python3
"""
Backend API Testing for Family Fans Mony Platform
Tests authentication flows and core API endpoints
"""

import requests
import sys
import json
from datetime import datetime

class FamilyFansMoneyAPITester:
    def __init__(self, base_url="https://influencer-fund-pay.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.advertiser_token = None
        self.creator_token = None
        self.fan_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        # For file uploads, remove Content-Type header
        if files:
            headers.pop('Content-Type', None)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, headers=headers, timeout=10)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text[:200]}")
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login with provided credentials"""
        print("\n🔐 Testing Admin Authentication...")
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "edrianttrejol@gmail.com", "password": "Sportox@22"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   Admin role: {response.get('user', {}).get('role')}")
            return True
        return False

    def test_user_registration(self):
        """Test user registration for different roles"""
        print("\n👥 Testing User Registration...")
        
        # Test advertiser registration
        success, response = self.run_test(
            "Register Advertiser",
            "POST",
            "auth/register",
            200,
            data={
                "email": "anunciante@test.com",
                "password": "test123456",
                "name": "Test Advertiser",
                "role": "advertiser"
            }
        )
        if success and 'token' in response:
            self.advertiser_token = response['token']
        
        # Test creator registration
        success, response = self.run_test(
            "Register Creator",
            "POST",
            "auth/register",
            200,
            data={
                "email": "creador@test.com",
                "password": "test123456",
                "name": "Test Creator",
                "role": "creator"
            }
        )
        if success and 'token' in response:
            self.creator_token = response['token']
        
        # Test fan registration
        success, response = self.run_test(
            "Register Fan",
            "POST",
            "auth/register",
            200,
            data={
                "email": "fan@test.com",
                "password": "test123456",
                "name": "Test Fan",
                "role": "fan"
            }
        )
        if success and 'token' in response:
            self.fan_token = response['token']

    def test_auth_me_endpoints(self):
        """Test /auth/me endpoint for all user types"""
        print("\n🔍 Testing Auth Me Endpoints...")
        
        if self.admin_token:
            self.run_test("Admin Auth Me", "GET", "auth/me", 200, token=self.admin_token)
        
        if self.advertiser_token:
            self.run_test("Advertiser Auth Me", "GET", "auth/me", 200, token=self.advertiser_token)
        
        if self.creator_token:
            self.run_test("Creator Auth Me", "GET", "auth/me", 200, token=self.creator_token)
        
        if self.fan_token:
            self.run_test("Fan Auth Me", "GET", "auth/me", 200, token=self.fan_token)

    def test_admin_endpoints(self):
        """Test admin-specific endpoints"""
        print("\n⚙️ Testing Admin Endpoints...")
        
        if not self.admin_token:
            print("❌ No admin token available, skipping admin tests")
            return
        
        # Test admin stats
        self.run_test("Admin Stats", "GET", "admin/stats", 200, token=self.admin_token)
        
        # Test admin settings
        self.run_test("Admin Settings Get", "GET", "admin/settings", 200, token=self.admin_token)
        
        # Test admin users list
        self.run_test("Admin Users List", "GET", "admin/users", 200, token=self.admin_token)

    def test_public_endpoints(self):
        """Test public endpoints that don't require authentication"""
        print("\n🌐 Testing Public Endpoints...")
        
        # Test rankings
        self.run_test("Public Rankings", "GET", "rankings", 200)
        
        # Test explore creators
        self.run_test("Explore Creators", "GET", "explore/creators", 200)

    def test_campaign_flow(self):
        """Test campaign creation and listing"""
        print("\n📢 Testing Campaign Flow...")
        
        if not self.advertiser_token:
            print("❌ No advertiser token available, skipping campaign tests")
            return
        
        # Test campaign listing
        self.run_test("List Campaigns", "GET", "campaigns", 200, token=self.advertiser_token)
        
        # Test available campaigns for creators
        if self.creator_token:
            self.run_test("Available Campaigns", "GET", "campaigns/available", 200, token=self.creator_token)

    def test_deposit_flow(self):
        """Test deposit listing"""
        print("\n💰 Testing Deposit Flow...")
        
        if self.advertiser_token:
            self.run_test("List Deposits (Advertiser)", "GET", "deposits", 200, token=self.advertiser_token)
        
        if self.admin_token:
            self.run_test("List Deposits (Admin)", "GET", "deposits", 200, token=self.admin_token)

    def test_unauthorized_access(self):
        """Test that protected endpoints reject unauthorized access"""
        print("\n🚫 Testing Unauthorized Access...")
        
        # Test admin endpoint without token
        self.run_test("Admin Stats Unauthorized", "GET", "admin/stats", 401)
        
        # Test user endpoint without token
        self.run_test("Auth Me Unauthorized", "GET", "auth/me", 401)

    def print_summary(self):
        """Print test summary"""
        print(f"\n📊 Test Summary:")
        print(f"   Tests run: {self.tests_run}")
        print(f"   Tests passed: {self.tests_passed}")
        print(f"   Tests failed: {self.tests_run - self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"   - {test}")
        
        return self.tests_passed == self.tests_run

def main():
    print("🚀 Starting Family Fans Mony Backend API Tests")
    print("=" * 60)
    
    tester = FamilyFansMoneyAPITester()
    
    # Run all tests
    tester.test_admin_login()
    tester.test_user_registration()
    tester.test_auth_me_endpoints()
    tester.test_admin_endpoints()
    tester.test_public_endpoints()
    tester.test_campaign_flow()
    tester.test_deposit_flow()
    tester.test_unauthorized_access()
    
    # Print summary
    success = tester.print_summary()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())