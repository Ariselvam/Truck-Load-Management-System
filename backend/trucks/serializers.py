from rest_framework import serializers
import re
from .models import Truck
from accounts.models import Driver
from accounts.serializers import DriverSerializer

class TruckSerializer(serializers.ModelSerializer):
    current_driver_id = serializers.PrimaryKeyRelatedField(
        queryset=Driver.objects.all(),
        source='current_driver',
        required=False,
        allow_null=True
    )
    driver_details = DriverSerializer(source='current_driver', read_only=True)

    class Meta:
        model = Truck
        fields = ['id', 'license_plate', 'model', 'make', 'capacity_tons', 'status', 'current_driver_id', 'driver_details']
        read_only_fields = ['id']

    def validate_license_plate(self, value):
        if not re.match(r'^[A-Z0-9\s-]{4,15}$', value, re.IGNORECASE):
            raise serializers.ValidationError("License plate must be alphanumeric and between 4 to 15 characters (spaces and dashes allowed).")
        
        truck_id = self.instance.id if self.instance else None
        if Truck.objects.filter(license_plate=value).exclude(id=truck_id).exists():
            raise serializers.ValidationError("A truck with this license plate already exists.")
        return value.upper()

    def validate_capacity_tons(self, value):
        if value <= 0:
            raise serializers.ValidationError("Capacity must be greater than 0 tons.")
        return value

    def validate(self, attrs):
        current_driver = attrs.get('current_driver')
        if current_driver:
            # Check if driver is active
            if current_driver.status == 'inactive':
                raise serializers.ValidationError({"current_driver_id": "Cannot assign an inactive driver to a truck."})
            
            # Check if driver is already assigned to another truck
            truck_id = self.instance.id if self.instance else None
            other_trucks = Truck.objects.filter(current_driver=current_driver)
            if truck_id:
                other_trucks = other_trucks.exclude(id=truck_id)
            if other_trucks.exists():
                raise serializers.ValidationError({"current_driver_id": "This driver is already assigned to another truck."})
                
        return attrs
