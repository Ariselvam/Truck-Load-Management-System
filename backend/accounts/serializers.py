from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.db import transaction
from datetime import date
import re
from .models import Driver

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=6)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone_number', 'role', 'password', 'date_joined']
        read_only_fields = ['id', 'date_joined']

    def validate_email(self, value):
        if not value:
            raise serializers.ValidationError("Email is required.")
        email_regex = r'^[^@]+@[^@]+\.[^@]+$'
        if not re.match(email_regex, value):
            raise serializers.ValidationError("Enter a valid email address.")
        
        user_id = self.instance.id if self.instance else None
        if User.objects.filter(email=value).exclude(id=user_id).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data['password'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data.pop('password'))
        return super().update(instance, validated_data)


class DriverSerializer(serializers.ModelSerializer):
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='user',
        required=False,
        allow_null=True
    )
    user_details = UserSerializer(source='user', read_only=True)

    class Meta:
        model = Driver
        fields = ['id', 'user_id', 'user_details', 'license_number', 'license_expiry', 'phone_number', 'status', 'experience_years']
        read_only_fields = ['id']

    def validate_license_number(self, value):
        if not re.match(r'^[A-Z0-9-]{5,20}$', value, re.IGNORECASE):
            raise serializers.ValidationError("License number must be alphanumeric and between 5 to 20 characters.")
        
        driver_id = self.instance.id if self.instance else None
        if Driver.objects.filter(license_number=value).exclude(id=driver_id).exists():
            raise serializers.ValidationError("A driver with this license number already exists.")
        return value.upper()

    def validate_license_expiry(self, value):
        if value <= date.today():
            raise serializers.ValidationError("License expiry date must be in the future.")
        return value

    def validate_experience_years(self, value):
        if value < 0:
            raise serializers.ValidationError("Experience years cannot be negative.")
        return value


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=6)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'phone_number', 'role']

    def validate_email(self, value):
        if not value:
            raise serializers.ValidationError("Email is required.")
        email_regex = r'^[^@]+@[^@]+\.[^@]+$'
        if not re.match(email_regex, value):
            raise serializers.ValidationError("Enter a valid email address.")
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_role(self, value):
        if value == 'driver':
            raise serializers.ValidationError("Drivers must register through the driver registration endpoint.")
        return value

    def create(self, validated_data):
        validated_data['password'] = make_password(validated_data['password'])
        return super().create(validated_data)


class DriverRegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    first_name = serializers.CharField(max_length=150, required=False, default='')
    last_name = serializers.CharField(max_length=150, required=False, default='')
    phone_number = serializers.CharField(max_length=20, required=False, default='')
    license_number = serializers.CharField(max_length=50)
    license_expiry = serializers.DateField()
    experience_years = serializers.IntegerField(default=0)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username is already taken.")
        return value

    def validate_email(self, value):
        email_regex = r'^[^@]+@[^@]+\.[^@]+$'
        if not re.match(email_regex, value):
            raise serializers.ValidationError("Enter a valid email address.")
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email is already registered.")
        return value

    def validate_license_number(self, value):
        if not re.match(r'^[A-Z0-9-]{5,20}$', value, re.IGNORECASE):
            raise serializers.ValidationError("License number must be alphanumeric and between 5 to 20 characters.")
        if Driver.objects.filter(license_number=value).exists():
            raise serializers.ValidationError("A driver with this license number already exists.")
        return value.upper()

    def validate_license_expiry(self, value):
        if value <= date.today():
            raise serializers.ValidationError("License expiry date must be in the future.")
        return value

    def validate_experience_years(self, value):
        if value < 0:
            raise serializers.ValidationError("Experience years cannot be negative.")
        return value

    def create(self, validated_data):
        with transaction.atomic():
            user = User.objects.create(
                username=validated_data['username'],
                email=validated_data['email'],
                password=make_password(validated_data['password']),
                first_name=validated_data.get('first_name', ''),
                last_name=validated_data.get('last_name', ''),
                phone_number=validated_data.get('phone_number', ''),
                role='driver'
            )
            driver = Driver.objects.create(
                user=user,
                license_number=validated_data['license_number'],
                license_expiry=validated_data['license_expiry'],
                phone_number=validated_data.get('phone_number', ''),
                status='active',
                experience_years=validated_data.get('experience_years', 0)
            )
            return driver


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=6)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value
