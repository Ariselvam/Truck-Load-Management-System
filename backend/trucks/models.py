from django.db import models
from accounts.models import Driver

class Truck(models.Model):
    STATUS_CHOICES = (
        ('available', 'Available'),
        ('maintenance', 'Maintenance'),
        ('busy', 'Busy'),
    )
    license_plate = models.CharField(max_length=20, unique=True)
    model = models.CharField(max_length=100)
    make = models.CharField(max_length=100)
    capacity_tons = models.DecimalField(max_digits=5, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    current_driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='trucks')

    def __str__(self):
        return f"{self.make} {self.model} ({self.license_plate}) - {self.status}"
