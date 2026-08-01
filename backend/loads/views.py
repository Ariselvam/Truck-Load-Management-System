from rest_framework import viewsets, filters, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from .models import Load, Booking
from .serializers import LoadSerializer, BookingSerializer
from accounts.models import Driver
from trucks.models import Truck
from accounts.permissions import IsAdmin, IsShipper, IsCarrier, IsOwnerOrAdmin

class LoadViewSet(viewsets.ModelViewSet):
    """
    API ViewSet for managing Loads with query optimization (`select_related`)
    and role-based permissions.
    """
    queryset = Load.objects.select_related('shipper').all().order_by('-id')
    serializer_class = LoadSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['origin', 'destination', 'dimensions']
    ordering_fields = ['id', 'price', 'weight_tons', 'pickup_date']

    def get_permissions(self):
        if self.action == 'create':
            permission_classes = [IsAdmin | IsShipper]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsOwnerOrAdmin]
        else: # list, retrieve
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        status_param = self.request.query_params.get('status')
        shipper_id = self.request.query_params.get('shipper_id')
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        min_weight = self.request.query_params.get('min_weight')
        max_weight = self.request.query_params.get('max_weight')
 

        if status_param:
            queryset = queryset.filter(status=status_param)
        if shipper_id:
            queryset = queryset.filter(shipper_id=shipper_id)
        if min_price:
            try:
                queryset = queryset.filter(price__gte=float(min_price))
            except ValueError:
                pass
        if max_price:
            try:
                queryset = queryset.filter(price__lte=float(max_price))
            except ValueError:
                pass
        if min_weight:
            try:
                queryset = queryset.filter(weight_tons__gte=float(min_weight))
            except ValueError:
                pass
        if max_weight:
            try:
                queryset = queryset.filter(weight_tons__lte=float(max_weight))
            except ValueError:
                pass
        return queryset


class BookingViewSet(viewsets.ModelViewSet):
    """
    API ViewSet for managing Bookings with query optimization (`select_related`),
    custom status workflow, driver load acceptance, nearby load discovery, and driver stats.
    """
    queryset = Booking.objects.select_related(
        'load', 'load__shipper', 'driver', 'driver__user', 'truck'
    ).all().order_by('-id')
    serializer_class = BookingSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['load__origin', 'load__destination', 'driver__license_number', 'truck__license_plate']
    ordering_fields = ['id', 'booking_date']

    def get_permissions(self):
        if self.action in ['create', 'accept_load']:
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy', 'update_status']:
            permission_classes = [permissions.IsAuthenticated]
        else: # list, retrieve, nearby_loads, driver_stats
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        status_param = self.request.query_params.get('status')
        driver_id = self.request.query_params.get('driver_id')
        truck_id = self.request.query_params.get('truck_id')
        load_id = self.request.query_params.get('load_id')

        if status_param:
            queryset = queryset.filter(status=status_param)
        if driver_id:
            queryset = queryset.filter(driver_id=driver_id)
        if truck_id:
            queryset = queryset.filter(truck_id=truck_id)
        if load_id:
            queryset = queryset.filter(load_id=load_id)

        # Drivers see only their assigned bookings
        user = self.request.user
        if user.is_authenticated and user.role == 'driver':
            queryset = queryset.filter(driver__user=user)
        # Shippers see bookings for their loads
        elif user.is_authenticated and user.role == 'shipper':
            queryset = queryset.filter(load__shipper=user)

        return queryset

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def accept_load(self, request):
        """
        Allows an active driver to accept a pending load.
        Automatically assigns an available truck if not explicitly provided.
        """
        user = request.user
        if user.role != 'driver':
            return Response({"detail": "Only drivers can accept loads."}, status=status.HTTP_403_FORBIDDEN)

        try:
            driver = user.driver_profile
        except Driver.DoesNotExist:
            return Response({"detail": "Driver profile not found."}, status=status.HTTP_404_NOT_FOUND)

        if driver.status != 'active':
            return Response({"detail": "You already have an active load trip or are inactive."}, status=status.HTTP_400_BAD_REQUEST)

        load_id = request.data.get('load_id')
        if not load_id:
            return Response({"detail": "load_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            load = Load.objects.get(id=load_id)
        except Load.DoesNotExist:
            return Response({"detail": "Load not found."}, status=status.HTTP_404_NOT_FOUND)

        if load.status != 'pending':
            return Response({"detail": "This load is no longer available for booking."}, status=status.HTTP_400_BAD_REQUEST)

        # Get or assign an available truck
        truck_id = request.data.get('truck_id')
        if truck_id:
            try:
                truck = Truck.objects.get(id=truck_id, status='available')
            except Truck.DoesNotExist:
                return Response({"detail": "Selected truck is unavailable."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            truck = Truck.objects.filter(status='available').first()
            if not truck:
                # Create a default fallback truck for demonstration if none available
                truck = Truck.objects.create(
                    capacity_tons=load.weight_tons + 5,
                    license_plate=f"TRK-{driver.id:03d}-AUTO",
                    model='Volvo FH16',
                    make='Volvo',
                    status='available'
                )


        with transaction.atomic():
            load.status = 'accepted'
            load.save()

            driver.status = 'on_trip'
            driver.save()

            truck.status = 'busy'
            truck.save()

            booking = Booking.objects.create(
                load=load,
                driver=driver,
                truck=truck,
                status='accepted'
            )

        serializer = BookingSerializer(booking)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def update_status(self, request, pk=None):
        """
        Updates booking & load status through lifecycle:
        accepted -> loading -> in_transit -> unloading -> completed
        """
        booking = self.get_object()
        new_status = request.data.get('status')
        valid_statuses = ['accepted', 'loading', 'in_transit', 'unloading', 'completed', 'cancelled']

        if new_status not in valid_statuses:
            return Response({"detail": f"Invalid status. Choose from: {valid_statuses}"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            booking.status = new_status
            booking.load.status = new_status
            booking.load.save()

            if new_status == 'completed':
                booking.actual_delivery_date = timezone.now()
                booking.driver.status = 'active'
                booking.driver.save()
                booking.truck.status = 'available'
                booking.truck.save()
            elif new_status == 'cancelled':
                booking.load.status = 'pending'
                booking.load.save()
                booking.driver.status = 'active'
                booking.driver.save()
                booking.truck.status = 'available'
                booking.truck.save()
            else:
                booking.driver.status = 'on_trip'
                booking.driver.save()
                booking.truck.status = 'busy'
                booking.truck.save()

            booking.save()

        serializer = BookingSerializer(booking)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def nearby_loads(self, request):
        """
        Finds available pending loads originating from or near the driver's last unloading location.
        """
        user = request.user
        if user.role != 'driver':
            return Response({"detail": "Only drivers can view nearby loads."}, status=status.HTTP_403_FORBIDDEN)

        try:
            driver = user.driver_profile
        except Driver.DoesNotExist:
            return Response({"detail": "Driver profile not found."}, status=status.HTTP_404_NOT_FOUND)

        # Get last completed load for driver
        last_booking = Booking.objects.filter(
            driver=driver, status='completed'
        ).select_related('load').order_by('-actual_delivery_date', '-id').first()

        pending_loads = Load.objects.select_related('shipper').filter(status='pending')

        if last_booking and last_booking.load.destination:
            last_location = last_booking.load.destination.strip()
            # Match loads originating from or containing the last destination city
            matched_loads = pending_loads.filter(origin__icontains=last_location)
            if matched_loads.exists():
                serializer = LoadSerializer(matched_loads, many=True)
                return Response({
                    "last_unloading_location": last_location,
                    "matched_count": matched_loads.count(),
                    "loads": serializer.data
                })

        # Fallback to all available pending loads
        serializer = LoadSerializer(pending_loads, many=True)
        return Response({
            "last_unloading_location": last_booking.load.destination if last_booking else "None",
            "matched_count": pending_loads.count(),
            "loads": serializer.data
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def driver_stats(self, request):
        """
        Calculates driver earnings, completed trips count, active booking info, and recent history.
        """
        user = request.user
        if user.role != 'driver':
            return Response({"detail": "Only drivers can access driver statistics."}, status=status.HTTP_403_FORBIDDEN)

        try:
            driver = user.driver_profile
        except Driver.DoesNotExist:
            return Response({"detail": "Driver profile not found."}, status=status.HTTP_404_NOT_FOUND)

        completed_bookings = Booking.objects.filter(driver=driver, status='completed').select_related('load')
        total_earnings = completed_bookings.aggregate(total=Sum('load__price'))['total'] or 0.00
        completed_trips_count = completed_bookings.count()

        # Check for active trip
        active_booking = Booking.objects.filter(
            driver=driver, status__in=['accepted', 'loading', 'in_transit', 'unloading']
        ).select_related('load', 'truck').first()

        active_booking_data = BookingSerializer(active_booking).data if active_booking else None

        return Response({
            "total_earnings": float(total_earnings),
            "completed_trips_count": completed_trips_count,
            "driver_status": driver.status,
            "active_booking": active_booking_data
        })

    def perform_destroy(self, instance):
        with transaction.atomic():
            load = instance.load
            driver = instance.driver
            truck = instance.truck

            load.status = 'pending'
            load.save()

            driver.status = 'active'
            driver.save()

            truck.status = 'available'
            truck.save()

            instance.delete()
