from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('shipper', 'Shipper'),
        ('carrier', 'Carrier'),
        ('driver', 'Driver'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='shipper')
    phone_number = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.role})"

class Driver(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('on_trip', 'On Trip'),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='driver_profile', null=True, blank=True)
    license_number = models.CharField(max_length=50, unique=True)
    license_expiry = models.DateField()
    phone_number = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    experience_years = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Driver {self.license_number} - {self.status}"
