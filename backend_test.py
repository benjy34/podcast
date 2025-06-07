import requests
import unittest
import uuid
import os
import time
from datetime import datetime

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://625b12f0-45d8-4d0f-a715-a761448444da.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"

class PodcastHubAPITester(unittest.TestCase):
    def setUp(self):
        self.test_user_podcaster = {
            "email": f"podcaster_{uuid.uuid4()}@test.com",
            "username": f"podcaster_{uuid.uuid4()}",
            "password": "TestPassword123!",
            "role": "podcaster"
        }
        
        self.test_user_listener = {
            "email": f"listener_{uuid.uuid4()}@test.com",
            "username": f"listener_{uuid.uuid4()}",
            "password": "TestPassword123!",
            "role": "listener"
        }
        
        self.podcaster_token = None
        self.listener_token = None
        self.podcast_id = None
        self.episode_id = None

    def test_01_root_endpoint(self):
        """Test the root endpoint"""
        print("\n🔍 Testing root endpoint...")
        response = requests.get(f"{BACKEND_URL}/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("message", response.json())
        print("✅ Root endpoint test passed")

    def test_02_register_podcaster(self):
        """Test podcaster registration"""
        print("\n🔍 Testing podcaster registration...")
        response = requests.post(
            f"{API_URL}/auth/register",
            json=self.test_user_podcaster
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("id", response.json())
        self.assertEqual(response.json()["role"], "podcaster")
        print("✅ Podcaster registration test passed")

    def test_03_register_listener(self):
        """Test listener registration"""
        print("\n🔍 Testing listener registration...")
        response = requests.post(
            f"{API_URL}/auth/register",
            json=self.test_user_listener
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("id", response.json())
        self.assertEqual(response.json()["role"], "listener")
        print("✅ Listener registration test passed")

    def test_04_login_podcaster(self):
        """Test podcaster login"""
        print("\n🔍 Testing podcaster login...")
        response = requests.post(
            f"{API_URL}/auth/login",
            json={
                "email": self.test_user_podcaster["email"],
                "password": self.test_user_podcaster["password"]
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertIn("user", data)
        self.assertEqual(data["user"]["role"], "podcaster")
        
        # Save token for later tests
        self.podcaster_token = data["access_token"]
        print("✅ Podcaster login test passed")

    def test_05_login_listener(self):
        """Test listener login"""
        print("\n🔍 Testing listener login...")
        response = requests.post(
            f"{API_URL}/auth/login",
            json={
                "email": self.test_user_listener["email"],
                "password": self.test_user_listener["password"]
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertIn("user", data)
        self.assertEqual(data["user"]["role"], "listener")
        
        # Save token for later tests
        self.listener_token = data["access_token"]
        print("✅ Listener login test passed")

    def test_06_get_current_user(self):
        """Test getting current user info"""
        print("\n🔍 Testing get current user info...")
        if not self.podcaster_token:
            self.fail("No podcaster token available")
            
        response = requests.get(
            f"{API_URL}/auth/me",
            headers={"Authorization": f"Bearer {self.podcaster_token}"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["email"], self.test_user_podcaster["email"])
        print("✅ Get current user test passed")

    def test_07_create_podcast(self):
        """Test creating a podcast"""
        print("\n🔍 Testing podcast creation...")
        if not self.podcaster_token:
            self.fail("No podcaster token available")
            
        podcast_data = {
            "title": f"Test Podcast {uuid.uuid4()}",
            "description": "This is a test podcast created by the API tester",
            "category": "Technology"
        }
        
        response = requests.post(
            f"{API_URL}/podcasts",
            json=podcast_data,
            headers={"Authorization": f"Bearer {self.podcaster_token}"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("id", data)
        self.assertEqual(data["title"], podcast_data["title"])
        
        # Save podcast ID for later tests
        self.podcast_id = data["id"]
        print("✅ Create podcast test passed")

    def test_08_get_podcasts(self):
        """Test getting all podcasts"""
        print("\n🔍 Testing get all podcasts...")
        response = requests.get(f"{API_URL}/podcasts")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json(), list)
        print("✅ Get all podcasts test passed")

    def test_09_get_my_podcasts(self):
        """Test getting podcaster's podcasts"""
        print("\n🔍 Testing get my podcasts...")
        if not self.podcaster_token:
            self.fail("No podcaster token available")
            
        response = requests.get(
            f"{API_URL}/podcasts/my",
            headers={"Authorization": f"Bearer {self.podcaster_token}"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json(), list)
        if self.podcast_id:
            # Check if our created podcast is in the list
            podcast_ids = [p["id"] for p in response.json()]
            self.assertIn(self.podcast_id, podcast_ids)
        print("✅ Get my podcasts test passed")

    def test_10_get_podcast_by_id(self):
        """Test getting a podcast by ID"""
        print("\n🔍 Testing get podcast by ID...")
        if not self.podcast_id:
            self.fail("No podcast ID available")
            
        response = requests.get(f"{API_URL}/podcasts/{self.podcast_id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], self.podcast_id)
        print("✅ Get podcast by ID test passed")

    def test_11_search(self):
        """Test search functionality"""
        print("\n🔍 Testing search functionality...")
        if not self.podcast_id:
            self.fail("No podcast ID available")
            
        # Get the podcast title to search for
        response = requests.get(f"{API_URL}/podcasts/{self.podcast_id}")
        self.assertEqual(response.status_code, 200)
        search_term = response.json()["title"].split()[0]  # Use first word of title
        
        response = requests.get(f"{API_URL}/search?q={search_term}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("podcasts", data)
        self.assertIn("episodes", data)
        
        # Check if our podcast is in the search results
        podcast_ids = [p["id"] for p in data["podcasts"]]
        self.assertIn(self.podcast_id, podcast_ids)
        print("✅ Search test passed")

    def test_12_listener_cannot_create_podcast(self):
        """Test that listeners cannot create podcasts"""
        print("\n🔍 Testing listener cannot create podcast...")
        if not self.listener_token:
            self.fail("No listener token available")
            
        podcast_data = {
            "title": f"Test Podcast {uuid.uuid4()}",
            "description": "This should fail",
            "category": "Technology"
        }
        
        response = requests.post(
            f"{API_URL}/podcasts",
            json=podcast_data,
            headers={"Authorization": f"Bearer {self.listener_token}"}
        )
        self.assertEqual(response.status_code, 403)  # Forbidden
        print("✅ Listener cannot create podcast test passed")

    def test_13_get_episodes(self):
        """Test getting episodes for a podcast"""
        print("\n🔍 Testing get episodes for podcast...")
        if not self.podcast_id:
            self.fail("No podcast ID available")
            
        response = requests.get(f"{API_URL}/podcasts/{self.podcast_id}/episodes")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json(), list)
        print("✅ Get episodes test passed")

    def test_14_get_all_episodes(self):
        """Test getting all episodes"""
        print("\n🔍 Testing get all episodes...")
        response = requests.get(f"{API_URL}/episodes")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json(), list)
        print("✅ Get all episodes test passed")

def run_tests():
    # Create a test suite
    suite = unittest.TestSuite()
    
    # Add tests in order
    test_loader = unittest.TestLoader()
    test_names = [
        'test_01_root_endpoint',
        'test_02_register_podcaster',
        'test_03_register_listener',
        'test_04_login_podcaster',
        'test_05_login_listener',
        'test_06_get_current_user',
        'test_07_create_podcast',
        'test_08_get_podcasts',
        'test_09_get_my_podcasts',
        'test_10_get_podcast_by_id',
        'test_11_search',
        'test_12_listener_cannot_create_podcast',
        'test_13_get_episodes',
        'test_14_get_all_episodes'
    ]
    
    for test_name in test_names:
        suite.addTest(PodcastHubAPITester(test_name))
    
    # Run the tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print(f"\n📊 Tests passed: {result.testsRun - len(result.errors) - len(result.failures)}/{result.testsRun}")
    
    return len(result.errors) + len(result.failures) == 0

if __name__ == "__main__":
    run_tests()
