from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (request.user.role == 'admin' or request.user.is_staff)

class IsShipper(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'shipper'

class IsCarrier(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'carrier'

class IsDriver(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'driver'

class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Admin gets full access
        if request.user and (request.user.role == 'admin' or request.user.is_staff):
            return True
        
        # User details check
        if hasattr(obj, 'username'): # Standard User object
            return obj == request.user
            
        # Driver check
        if hasattr(obj, 'user'): # Driver profile
            return obj.user == request.user

        # Load check
        if hasattr(obj, 'shipper'):
            return obj.shipper == request.user
            
        # Booking check
        if hasattr(obj, 'load') and hasattr(obj, 'driver'):
            # If load shipper, driver, or a carrier is request.user
            return (
                obj.load.shipper == request.user or 
                obj.driver.user == request.user or 
                request.user.role == 'carrier'
            )

            
        return False
