from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import date, timedelta
from .models import Load, Booking
from accounts.models import Driver
from trucks.models import Truck

User = get_user_model()

class LoadAndBookingAPITests(APITestCase):
    def setUp(self):
        # Create users
        self.admin = User.objects.create_user(username="admin", email="admin@example.com", password="password", role="admin")
        self.shipper = User.objects.create_user(username="shipper", email="shipper@example.com", password="password", role="shipper")
        self.carrier = User.objects.create_user(username="carrier", email="carrier@example.com", password="password", role="carrier")
        self.driver_user = User.objects.create_user(username="driveruser", email="driver@example.com", password="password", role="driver")
        
        # Create Driver Profile
        self.driver_profile = Driver.objects.create(
            user=self.driver_user,
            license_number="CA-54321-YY",
            license_expiry=date.today() + timedelta(days=300),
            phone_number="1122334455",
            status="active"
        )
        
        # Create Truck
        self.truck = Truck.objects.create(
            license_plate="TX-888-ZZ",
            model="FH16",
            make="Volvo",
            capacity_tons=30.0,
            status="available"
        )

        # Helpers for JWT Token
        def get_auth_header(user):
            refresh = RefreshToken.for_user(user)
            return f'Bearer {refresh.access_token}'

        self.shipper_auth = get_auth_header(self.shipper)
        self.carrier_auth = get_auth_header(self.carrier)
        self.driver_auth = get_auth_header(self.driver_user)
        self.admin_auth = get_auth_header(self.admin)

        self.load_list_url = reverse('load-list')
        self.booking_list_url = reverse('booking-list')

    def test_create_load_valid(self):
        self.client.credentials(HTTP_AUTHORIZATION=self.shipper_auth)
        data = {
            "shipper_id": self.shipper.id,
            "origin": "Dallas, TX",
            "destination": "Houston, TX",
            "weight_tons": 15.5,
            "dimensions": "40x8x8 ft",
            "price": 1200.0,
            "pickup_date": (date.today() + timedelta(days=2)).strftime("%Y-%m-%d"),
            "delivery_date": (date.today() + timedelta(days=3)).strftime("%Y-%m-%d")
        }
        response = self.client.post(self.load_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Load.objects.count(), 1)
        load = Load.objects.first()
        self.assertEqual(load.status, "pending")

    def test_create_load_invalid_identical_locations(self):
        self.client.credentials(HTTP_AUTHORIZATION=self.shipper_auth)
        data = {
            "shipper_id": self.shipper.id,
            "origin": "Dallas, TX",
            "destination": "Dallas, TX", # identical
            "weight_tons": 10.0,
            "price": 500.0,
            "pickup_date": date.today().strftime("%Y-%m-%d"),
            "delivery_date": date.today().strftime("%Y-%m-%d")
        }
        response = self.client.post(self.load_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("destination", response.data)




    def test_booking_creation_and_state_transition(self):
        # Create a pending load
        load = Load.objects.create(
            shipper=self.shipper,
            origin="Dallas",
            destination="Austin",
            weight_tons=10.0,
            price=600.0,
            pickup_date=date.today(),
            delivery_date=date.today() + timedelta(days=1)
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=self.carrier_auth)
        
        booking_data = {
            "load_id": load.id,
            "driver_id": self.driver_profile.id,
            "truck_id": self.truck.id
        }
        
        response = self.client.post(self.booking_list_url, booking_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Booking.objects.count(), 1)
        
        # Verify model status updates (State Transitions)
        load.refresh_from_db()
        self.assertEqual(load.status, "accepted")
        
        self.driver_profile.refresh_from_db()
        self.assertEqual(self.driver_profile.status, "on_trip")
        
        self.truck.refresh_from_db()
        self.assertEqual(self.truck.status, "busy")

    def test_complete_booking_transitions(self):
        load = Load.objects.create(
            shipper=self.shipper, origin="Dallas", destination="Austin", 
            weight_tons=10.0, price=600.0, pickup_date=date.today(), delivery_date=date.today()
        )
        # Create booking directly using serializer or view
        booking = Booking.objects.create(
            load=load, driver=self.driver_profile, truck=self.truck, status="accepted"
        )
        # Manually lock load, driver, truck to busy/on_trip
        load.status = 'accepted'; load.save()
        self.driver_profile.status = 'on_trip'; self.driver_profile.save()
        self.truck.status = 'busy'; self.truck.save()
        
        self.client.credentials(HTTP_AUTHORIZATION=self.carrier_auth)
        booking_detail_url = reverse('booking-detail', args=[booking.id])
        
        # Update status to completed
        update_data = {"status": "completed"}
        response = self.client.patch(booking_detail_url, update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check transitions
        load.refresh_from_db()
        self.assertEqual(load.status, "completed")
        
        self.driver_profile.refresh_from_db()
        self.assertEqual(self.driver_profile.status, "active")
        
        self.truck.refresh_from_db()
        self.assertEqual(self.truck.status, "available")
        
        booking.refresh_from_db()
        self.assertIsNotNone(booking.actual_delivery_date)

