from rest_framework import viewsets, filters, permissions
from .models import Truck
from .serializers import TruckSerializer
from accounts.permissions import IsAdmin, IsCarrier

class TruckViewSet(viewsets.ModelViewSet):
    queryset = Truck.objects.all().order_by('-id')
    serializer_class = TruckSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['license_plate', 'model', 'make']
    ordering_fields = ['id', 'capacity_tons', 'status']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdmin | IsCarrier]
        else: # list, retrieve
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        status = self.request.query_params.get('status')
        min_capacity = self.request.query_params.get('min_capacity')
        max_capacity = self.request.query_params.get('max_capacity')
        
        if status:
            queryset = queryset.filter(status=status)
        if min_capacity:
            try:
                queryset = queryset.filter(capacity_tons__gte=float(min_capacity))
            except ValueError:
                pass
        if max_capacity:
            try:
                queryset = queryset.filter(capacity_tons__lte=float(max_capacity))
            except ValueError:
                pass
        return queryset
