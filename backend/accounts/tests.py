from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from datetime import date, timedelta
from .models import Driver

User = get_user_model()

class AuthTests(APITestCase):
    def setUp(self):
        self.register_url = reverse('auth_register')
        self.driver_register_url = reverse('auth_driver_register')
        self.login_url = reverse('auth_login')
        self.driver_login_url = reverse('auth_driver_login')
        self.logout_url = reverse('auth_logout')
        self.change_password_url = reverse('auth_change_password')
        self.forgot_password_url = reverse('auth_forgot_password')

    def test_user_registration_success(self):
        data = {
            "username": "shipper1",
            "email": "shipper1@example.com",
            "password": "securepassword",
            "first_name": "John",
            "last_name": "Doe",
            "phone_number": "1234567890",
            "role": "shipper"
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.filter(username="shipper1").count(), 1)
        user = User.objects.get(username="shipper1")
        self.assertEqual(user.role, "shipper")
        self.assertTrue(user.check_password("securepassword"))

    def test_user_registration_invalid_email(self):
        data = {
            "username": "shipper2",
            "email": "invalidemail",
            "password": "securepassword",
            "role": "shipper"
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_user_registration_duplicate_username(self):
        User.objects.create_user(username="taken", email="taken@example.com", password="password")
        data = {
            "username": "taken",
            "email": "new@example.com",
            "password": "securepassword",
            "role": "shipper"
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_registration_prevent_driver_role(self):
        data = {
            "username": "driver1",
            "email": "driver1@example.com",
            "password": "securepassword",
            "role": "driver"
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("role", response.data)

    def test_driver_registration_success(self):
        future_date = (date.today() + timedelta(days=365)).strftime("%Y-%m-%d")
        data = {
            "username": "drivertest",
            "email": "drivertest@example.com",
            "password": "securepassword",
            "first_name": "Driver",
            "last_name": "One",
            "phone_number": "0987654321",
            "license_number": "TX-12345-AB",
            "license_expiry": future_date,
            "experience_years": 5
        }
        response = self.client.post(self.driver_register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Driver.objects.filter(license_number="TX-12345-AB").count(), 1)
        driver = Driver.objects.get(license_number="TX-12345-AB")
        self.assertEqual(driver.user.role, "driver")
        self.assertEqual(driver.status, "active")

    def test_driver_registration_expired_license(self):
        past_date = (date.today() - timedelta(days=5)).strftime("%Y-%m-%d")
        data = {
            "username": "drivertest2",
            "email": "drivertest2@example.com",
            "password": "securepassword",
            "license_number": "TX-99999-AB",
            "license_expiry": past_date
        }
        response = self.client.post(self.driver_register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("license_expiry", response.data)

    def test_login_and_logout(self):
        # Create user
        User.objects.create_user(username="shipperuser", email="shipperuser@example.com", password="correct_password", role="shipper")
        
        # Success Login
        login_data = {"username": "shipperuser", "password": "correct_password"}
        response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        
        access_token = response.data["access"]
        refresh_token = response.data["refresh"]

        # Logout (blacklist refresh token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        logout_data = {"refresh": refresh_token}
        logout_response = self.client.post(self.logout_url, logout_data, format='json')
        self.assertEqual(logout_response.status_code, status.HTTP_205_RESET_CONTENT)

    def test_change_password(self):
        user = User.objects.create_user(username="user1", email="user1@example.com", password="oldpassword", role="shipper")
        
        login_data = {"username": "user1", "password": "oldpassword"}
        login_response = self.client.post(self.login_url, login_data, format='json')
        access_token = login_response.data["access"]
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        change_data = {"old_password": "oldpassword", "new_password": "newpassword"}
        response = self.client.post(self.change_password_url, change_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify old password fails and user can login with new
        user.refresh_from_db()
        self.assertTrue(user.check_password("newpassword"))
