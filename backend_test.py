#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class FamilyFansMoneyAPITester:
    def __init__(self, base_url="https://influencer-fund-pay.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_base = f"{base_url}/api"
        self.admin_token = None
        self.creator_token = None
        self.fan_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, files=None):
        """Run a single API test"""
        url = f"{self.api_base}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for multipart/form-data
                    test_headers.pop('Content-Type', None)
                    response = requests.post(url, data=data, files=files, headers=test_headers)
                else:
                    response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                if files:
                    test_headers.pop('Content-Type', None)
                    response = requests.put(url, data=data, files=files, headers=test_headers)
                else:
                    response = requests.put(url, json=data, headers=test_headers)

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
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "edrianttrejol@gmail.com", "password": "Sportox@22"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   Admin token obtained: {self.admin_token[:20]}...")
            return True
        return False

    def test_register_creator(self):
        """Register a test creator with referral code"""
        success, response = self.run_test(
            "Register Creator with Referral",
            "POST",
            "auth/register",
            200,
            data={
                "email": "new_test@test.com",
                "password": "test123456",
                "name": "Test Creator",
                "role": "creator",
                "referral_code": ""  # Will be empty for first user
            }
        )
        if success and 'token' in response:
            self.creator_token = response['token']
            print(f"   Creator token obtained: {self.creator_token[:20]}...")
            return True
        return False

    def test_register_fan(self):
        """Register a test fan"""
        success, response = self.run_test(
            "Register Fan",
            "POST",
            "auth/register",
            200,
            data={
                "email": "fan_test@test.com",
                "password": "test123456",
                "name": "Test Fan",
                "role": "fan"
            }
        )
        if success and 'token' in response:
            self.fan_token = response['token']
            return True
        return False

    def test_auth_me(self, token, role_name):
        """Test /auth/me endpoint"""
        headers = {'Authorization': f'Bearer {token}'}
        success, response = self.run_test(
            f"Get {role_name} Profile",
            "GET",
            "auth/me",
            200,
            headers=headers
        )
        return success

    def test_referrals_api(self):
        """Test referrals API"""
        if not self.creator_token:
            return False
        
        headers = {'Authorization': f'Bearer {self.creator_token}'}
        success, response = self.run_test(
            "Get Referral Info",
            "GET",
            "referrals",
            200,
            headers=headers
        )
        return success

    def test_admin_wallet(self):
        """Test admin wallet API"""
        if not self.admin_token:
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "Admin Wallet",
            "GET",
            "admin/wallet",
            200,
            headers=headers
        )
        return success

    def test_admin_stats(self):
        """Test admin stats API"""
        if not self.admin_token:
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "Admin Stats",
            "GET",
            "admin/stats",
            200,
            headers=headers
        )
        return success

    def test_admin_users(self):
        """Test admin users API"""
        if not self.admin_token:
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "Admin Users List",
            "GET",
            "admin/users",
            200,
            headers=headers
        )
        return success

    def test_level_requests(self):
        """Test level requests API"""
        if not self.creator_token:
            return False
        
        headers = {'Authorization': f'Bearer {self.creator_token}'}
        success, response = self.run_test(
            "Level Requests List",
            "GET",
            "creator/level-requests",
            200,
            headers=headers
        )
        return success

    def test_ranking_boards(self):
        """Test ranking boards API"""
        success, response = self.run_test(
            "Ranking Boards List",
            "GET",
            "ranking-boards",
            200
        )
        return success

    def test_campaigns_available(self):
        """Test available campaigns for creator"""
        if not self.creator_token:
            return False
        
        headers = {'Authorization': f'Bearer {self.creator_token}'}
        success, response = self.run_test(
            "Available Campaigns",
            "GET",
            "campaigns/available",
            200,
            headers=headers
        )
        return success

    def test_profile_photo_upload(self):
        """Test profile photo upload endpoint"""
        if not self.creator_token:
            return False
        
        headers = {'Authorization': f'Bearer {self.creator_token}'}
        # Create a dummy file for testing
        files = {'photo': ('test.jpg', b'fake_image_data', 'image/jpeg')}
        success, response = self.run_test(
            "Profile Photo Upload",
            "POST",
            "auth/profile-photo",
            200,
            headers=headers,
            files=files
        )
        return success

    def test_creator_profile_save(self):
        """Test creator profile save"""
        if not self.creator_token:
            return False
        
        headers = {'Authorization': f'Bearer {self.creator_token}'}
        form_data = {
            'content_type': 'videos',
            'region': 'LATAM',
            'gender': 'male',
            'phone': '+57123456789',
            'country': 'Colombia',
            'creator_level': 'standard',
            'niche': 'humor',
            'avg_views': '1000',
            'followers': '5000'
        }
        success, response = self.run_test(
            "Save Creator Profile",
            "POST",
            "auth/creator-profile",
            200,
            data=form_data,
            headers=headers,
            files={}
        )
        return success

def main():
    print("🚀 Starting Family Fans Mony API Tests")
    print("=" * 50)
    
    tester = FamilyFansMoneyAPITester()
    
    # Test sequence
    tests = [
        ("Admin Login", tester.test_admin_login),
        ("Register Creator", tester.test_register_creator),
        ("Register Fan", tester.test_register_fan),
        ("Admin Profile", lambda: tester.test_auth_me(tester.admin_token, "Admin") if tester.admin_token else False),
        ("Creator Profile", lambda: tester.test_auth_me(tester.creator_token, "Creator") if tester.creator_token else False),
        ("Fan Profile", lambda: tester.test_auth_me(tester.fan_token, "Fan") if tester.fan_token else False),
        ("Referrals API", tester.test_referrals_api),
        ("Admin Wallet", tester.test_admin_wallet),
        ("Admin Stats", tester.test_admin_stats),
        ("Admin Users", tester.test_admin_users),
        ("Level Requests", tester.test_level_requests),
        ("Ranking Boards", tester.test_ranking_boards),
        ("Available Campaigns", tester.test_campaigns_available),
        ("Creator Profile Save", tester.test_creator_profile_save),
        ("Profile Photo Upload", tester.test_profile_photo_upload),
    ]
    
    print(f"Running {len(tests)} test scenarios...\n")
    
    for test_name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            tester.failed_tests.append(f"{test_name}: Exception - {e}")
    
    # Print results
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS")
    print("=" * 50)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%")
    
    if tester.failed_tests:
        print("\n❌ FAILED TESTS:")
        for failure in tester.failed_tests:
            print(f"  - {failure}")
    
    print(f"\n🔗 Backend URL: {tester.base_url}")
    print(f"🔗 API Base: {tester.api_base}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())