from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Truck
from accounts.models import Driver
from datetime import date

User = get_user_model()

class TruckAPITests(APITestCase):
    def setUp(self):
        # Create users of different roles
        self.admin = User.objects.create_user(username="admin", email="admin@example.com", password="password", role="admin")
        self.carrier = User.objects.create_user(username="carrier", email="carrier@example.com", password="password", role="carrier")
        self.shipper = User.objects.create_user(username="shipper", email="shipper@example.com", password="password", role="shipper")
        self.driver_user = User.objects.create_user(username="driveruser", email="driver@example.com", password="password", role="driver")
        
        # Create a driver profile
        self.driver_profile = Driver.objects.create(
            user=self.driver_user,
            license_number="NY-98765-XX",
            license_expiry=date.today() + timedelta(days=200),
            phone_number="1234567890",
            status="active"
        )
        
        # Helper function to get bearer token credentials
        def get_auth_header(user):
            refresh = RefreshToken.for_user(user)
            return f'Bearer {refresh.access_token}'

        self.admin_auth = get_auth_header(self.admin)
        self.carrier_auth = get_auth_header(self.carrier)
        self.shipper_auth = get_auth_header(self.shipper)
        self.driver_auth = get_auth_header(self.driver_user)

        self.list_create_url = reverse('truck-list')

    def test_create_truck_unauthenticated(self):
        data = {
            "license_plate": "NY-1234-AB",
            "model": "Actros",
            "make": "Mercedes-Benz",
            "capacity_tons": 25.0
        }
        response = self.client.post(self.list_create_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_truck_unauthorized_role(self):
        # Shipper role cannot create truck
        self.client.credentials(HTTP_AUTHORIZATION=self.shipper_auth)
        data = {
            "license_plate": "NY-1234-AB",
            "model": "Actros",
            "make": "Mercedes-Benz",
            "capacity_tons": 25.0
        }
        response = self.client.post(self.list_create_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_truck_authorized_carrier(self):
        self.client.credentials(HTTP_AUTHORIZATION=self.carrier_auth)
        data = {
            "license_plate": "NY-1234-AB",
            "model": "Actros",
            "make": "Mercedes-Benz",
            "capacity_tons": 25.0,
            "current_driver_id": self.driver_profile.id
        }
        response = self.client.post(self.list_create_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Truck.objects.count(), 1)
        truck = Truck.objects.get(license_plate="NY-1234-AB")
        self.assertEqual(truck.current_driver, self.driver_profile)

    def test_create_truck_invalid_plate(self):
        self.client.credentials(HTTP_AUTHORIZATION=self.carrier_auth)
        data = {
            "license_plate": "???", # Invalid plate format
            "model": "Actros",
            "make": "Mercedes-Benz",
            "capacity_tons": 25.0
        }
        response = self.client.post(self.list_create_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("license_plate", response.data)

    def test_create_truck_invalid_capacity(self):
        self.client.credentials(HTTP_AUTHORIZATION=self.carrier_auth)
        data = {
            "license_plate": "NY-1234-AB",
            "model": "Actros",
            "make": "Mercedes-Benz",
            "capacity_tons": -5.0 # Capacity must be > 0
        }
        response = self.client.post(self.list_create_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("capacity_tons", response.data)

    def test_list_and_search_trucks(self):
        # Create a few trucks
        Truck.objects.create(license_plate="PLATE1", model="Actros", make="Mercedes", capacity_tons=10.0)
        Truck.objects.create(license_plate="PLATE2", model="F-150", make="Ford", capacity_tons=2.0)
        
        self.client.credentials(HTTP_AUTHORIZATION=self.shipper_auth)
        
        # Test listing
        response = self.client.get(self.list_create_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

        # Test search
        search_response = self.client.get(f"{self.list_create_url}?search=Ford")
        self.assertEqual(search_response.status_code, status.HTTP_200_OK)
        self.assertEqual(search_response.data["results"][0]["license_plate"], "PLATE2")

        # Test capacity filter
        filter_response = self.client.get(f"{self.list_create_url}?min_capacity=5.0")
        self.assertEqual(filter_response.status_code, status.HTTP_200_OK)
        self.assertEqual(filter_response.data["count"], 1)
        self.assertEqual(filter_response.data["results"][0]["license_plate"], "PLATE1")

# Helper to import timedelta since it wasn't explicitly imported
from datetime import timedelta
