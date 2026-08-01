from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import (
    UserViewSet, DriverViewSet, RegisterView, DriverRegisterView,
    LoginView, DriverLoginView, LogoutView, ChangePasswordView, ForgotPasswordView
)
from trucks.views import TruckViewSet
from loads.views import LoadViewSet, BookingViewSet

# Register ViewSets with DRF DefaultRouter
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'drivers', DriverViewSet, basename='driver')
router.register(r'trucks', TruckViewSet, basename='truck')
router.register(r'loads', LoadViewSet, basename='load')
router.register(r'bookings', BookingViewSet, basename='booking')

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Authentication Endpoints
    path('api/auth/register/', RegisterView.as_view(), name='auth_register'),
    path('api/auth/driver/register/', DriverRegisterView.as_view(), name='auth_driver_register'),
    path('api/auth/login/', LoginView.as_view(), name='auth_login'),
    path('api/auth/driver/login/', DriverLoginView.as_view(), name='auth_driver_login'),
    path('api/auth/logout/', LogoutView.as_view(), name='auth_logout'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/change-password/', ChangePasswordView.as_view(), name='auth_change_password'),
    path('api/auth/forgot-password/', ForgotPasswordView.as_view(), name='auth_forgot_password'),
    
    # CRUD API Routes
    path('api/', include(router.urls)),
]
