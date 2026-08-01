from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from datetime import date
from .models import Load, Booking
from accounts.models import Driver
from trucks.models import Truck
from accounts.serializers import UserSerializer, DriverSerializer
from trucks.serializers import TruckSerializer

User = get_user_model()

class LoadSerializer(serializers.ModelSerializer):
    shipper_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='shipper',
        required=True
    )
    shipper_details = UserSerializer(source='shipper', read_only=True)

    class Meta:
        model = Load
        fields = [
            'id', 'shipper_id', 'shipper_details', 'origin', 'destination', 
            'weight_tons', 'dimensions', 'status', 'price', 'pickup_date', 'delivery_date'
        ]
        read_only_fields = ['id']

    def validate_shipper_id(self, value):
        if value.role != 'shipper':
            raise serializers.ValidationError("Only users with role 'shipper' can be assigned as load owners.")
        return value

    def validate_weight_tons(self, value):
        if value <= 0:
            raise serializers.ValidationError("Weight must be greater than 0 tons.")
        return value

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than 0.")
        return value

    def validate(self, attrs):
        pickup = attrs.get('pickup_date')
        delivery = attrs.get('delivery_date')
        
        # Check date order
        if pickup and delivery and delivery < pickup:
            raise serializers.ValidationError({"delivery_date": "Delivery date cannot be before pickup date."})
        
        # Check origin/destination
        origin = attrs.get('origin')
        destination = attrs.get('destination')
        if origin and destination and origin.strip().lower() == destination.strip().lower():
            raise serializers.ValidationError({"destination": "Origin and destination cannot be identical."})
            
        return attrs


class BookingSerializer(serializers.ModelSerializer):
    load_id = serializers.PrimaryKeyRelatedField(
        queryset=Load.objects.all(),
        source='load',
        required=True
    )
    driver_id = serializers.PrimaryKeyRelatedField(
        queryset=Driver.objects.all(),
        source='driver',
        required=True
    )
    truck_id = serializers.PrimaryKeyRelatedField(
        queryset=Truck.objects.all(),
        source='truck',
        required=True
    )
    
    load_details = LoadSerializer(source='load', read_only=True)
    driver_details = DriverSerializer(source='driver', read_only=True)
    truck_details = TruckSerializer(source='truck', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'load_id', 'driver_id', 'truck_id', 
            'load_details', 'driver_details', 'truck_details', 
            'booking_date', 'status', 'actual_delivery_date'
        ]
        read_only_fields = ['id', 'booking_date', 'actual_delivery_date']

    def validate_load_id(self, value):
        booking_id = self.instance.id if self.instance else None
        # Check if load is already booked by another booking
        if Booking.objects.filter(load=value).exclude(id=booking_id).exists():
            raise serializers.ValidationError("This load has already been booked.")
        
        if not booking_id and value.status != 'pending':
            raise serializers.ValidationError("Only loads with 'pending' status can be booked.")
        return value

    def validate_driver_id(self, value):
        booking_id = self.instance.id if self.instance else None
        if not booking_id and value.status != 'active':
            raise serializers.ValidationError("Driver is currently busy, inactive, or on trip.")
        return value

    def validate_truck_id(self, value):
        booking_id = self.instance.id if self.instance else None
        if not booking_id and value.status != 'available':
            raise serializers.ValidationError("Truck is currently busy, in maintenance, or unavailable.")
        return value

    def create(self, validated_data):
        with transaction.atomic():
            load = validated_data['load']
            driver = validated_data['driver']
            truck = validated_data['truck']

            # Set initial accepted status
            load.status = 'accepted'
            load.save()

            driver.status = 'on_trip'
            driver.save()

            truck.status = 'busy'
            truck.save()

            booking = Booking.objects.create(status='accepted', **validated_data)
            return booking

    def update(self, instance, validated_data):
        new_status = validated_data.get('status', instance.status)

        with transaction.atomic():
            instance.load.status = new_status
            instance.load.save()

            if new_status == 'completed':
                instance.driver.status = 'active'
                instance.driver.save()

                instance.truck.status = 'available'
                instance.truck.save()

                instance.actual_delivery_date = timezone.now()
            elif new_status == 'cancelled':
                instance.load.status = 'pending'
                instance.load.save()

                instance.driver.status = 'active'
                instance.driver.save()

                instance.truck.status = 'available'
                instance.truck.save()
            elif new_status in ['accepted', 'loading', 'in_transit', 'unloading']:
                instance.driver.status = 'on_trip'
                instance.driver.save()

                instance.truck.status = 'busy'
                instance.truck.save()

            booking = super().update(instance, validated_data)
            return booking

