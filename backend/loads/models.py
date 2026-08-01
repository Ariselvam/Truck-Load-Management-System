from django.db import models
from django.contrib.auth import get_user_model
from accounts.models import Driver
from trucks.models import Truck

User = get_user_model()

class Load(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('loading', 'Loading'),
        ('in_transit', 'In Transit'),
        ('unloading', 'Unloading'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    shipper = models.ForeignKey(User, on_delete=models.CASCADE, related_name='loads')
    origin = models.CharField(max_length=255)
    destination = models.CharField(max_length=255)
    weight_tons = models.DecimalField(max_digits=5, decimal_places=2)
    dimensions = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    pickup_date = models.DateField()
    delivery_date = models.DateField()

    def __str__(self):
        return f"Load {self.id}: {self.origin} -> {self.destination} ({self.status})"


class Booking(models.Model):
    STATUS_CHOICES = (
        ('accepted', 'Accepted'),
        ('loading', 'Loading'),
        ('in_transit', 'In Transit'),
        ('unloading', 'Unloading'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    load = models.OneToOneField(Load, on_delete=models.CASCADE, related_name='booking')
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='bookings')
    truck = models.ForeignKey(Truck, on_delete=models.CASCADE, related_name='bookings')
    booking_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='accepted')
    actual_delivery_date = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Booking {self.id} for Load {self.load.id} - {self.status}"

