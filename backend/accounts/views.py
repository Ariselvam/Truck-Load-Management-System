from rest_framework import viewsets, status, generics, permissions, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.shortcuts import get_object_or_404


from .models import Driver
from .serializers import (
    UserSerializer, DriverSerializer, 
    RegisterSerializer, DriverRegisterSerializer, 
    ChangePasswordSerializer
)
from .permissions import IsAdmin, IsCarrier, IsDriver, IsOwnerOrAdmin

User = get_user_model()

# --- Authentication Views ---

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class DriverRegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = DriverRegisterSerializer(data=request.data)
        if serializer.is_valid():
            driver = serializer.save()
            # Serialize the response
            driver_data = DriverSerializer(driver).data
            return Response(driver_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        user = User.objects.get(username=request.data.get('username'))
        if user.role == 'driver':
            return Response(
                {"detail": "Drivers must log in through the driver login endpoint."},
                status=status.HTTP_403_FORBIDDEN
            )

        token_data = serializer.validated_data
        response_data = {
            "access": token_data["access"],
            "refresh": token_data["refresh"],
            "user": UserSerializer(user).data
        }
        return Response(response_data, status=status.HTTP_200_OK)


class DriverLoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        user = User.objects.get(username=request.data.get('username'))
        if user.role != 'driver':
            return Response(
                {"detail": "Only driver accounts can log in here."},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            driver = user.driver_profile
        except Driver.DoesNotExist:
            return Response(
                {"detail": "No driver profile exists for this account."},
                status=status.HTTP_404_NOT_FOUND
            )

        token_data = serializer.validated_data
        response_data = {
            "access": token_data["access"],
            "refresh": token_data["refresh"],
            "user": UserSerializer(user).data,
            "driver": DriverSerializer(driver).data
        }
        return Response(response_data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response({"detail": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)
            
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"detail": "Successfully logged out."}, status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.password = make_password(serializer.validated_data['new_password'])
            user.save()
            return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"email": "This field is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate email exists
        if not User.objects.filter(email=email).exists():
            return Response({"detail": "User with this email address does not exist."}, status=status.HTTP_404_NOT_FOUND)
        
        # In a real app, send reset link. Here, we mock the success.
        return Response(
            {"detail": "A password reset link has been successfully generated and sent to your email address."},
            status=status.HTTP_200_OK
        )


# --- CRUD Profile ViewSets ---

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-id')
    serializer_class = UserSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['id', 'username', 'date_joined']

    def get_permissions(self):
        if self.action in ['list', 'create', 'destroy']:
            permission_classes = [IsAdmin]
        else: # retrieve, update, partial_update
            permission_classes = [IsOwnerOrAdmin]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        return queryset


class DriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.all().order_by('-id')
    serializer_class = DriverSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['license_number', 'phone_number', 'user__username', 'user__email']
    ordering_fields = ['id', 'experience_years', 'license_expiry']

    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            permission_classes = [IsAdmin | IsCarrier]
        elif self.action == 'list':
            permission_classes = [IsAdmin | IsCarrier]
        else: # retrieve, update, partial_update
            permission_classes = [IsOwnerOrAdmin]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        status = self.request.query_params.get('status')
        experience_years = self.request.query_params.get('experience_years')
        
        if status:
            queryset = queryset.filter(status=status)
        if experience_years:
            try:
                queryset = queryset.filter(experience_years=int(experience_years))
            except ValueError:
                pass
        return queryset
