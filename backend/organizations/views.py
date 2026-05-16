from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from accounts.models import User, UserRole
from rest_framework import viewsets
from .models import Organization
from .serializers import OrganizationSerializer, AdministratorSerializer
from employees.models import Employee

class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer

class AdministratorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Employee.objects.filter(designation='Administrator')
    serializer_class = AdministratorSerializer
    permission_classes = [IsAdminUser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        try:
            with transaction.atomic():
                # Create the Organization
                organization = Organization.objects.create(name=validated_data["name"])

                # Create the Admin User
                admin_user = User.objects.create_user(
                            email=validated_data["admin_email"],
                            password=validated_data["admin_password"],
                            role=UserRole.HR,
                        )

                # Create the Employee record for the admin
                Employee.objects.create(
                    organization=organization,
                    full_name=validated_data["admin_full_name"],
                    email=validated_data["admin_email"],
                    designation="Administrator",
                    # Add other required fields for Employee model with default or dummy values
                    employee_id=f"ADM-{organization.id}",
                    phone="0000000000",
                    aadhaar_number="000000000000",
                    joining_date="2024-01-01",
                    department="Management",
                    annual_salary=0,
                    bank_name="Default Bank",
                    bank_account_number="0000000000",
                    tax_id="0000000000",
                )

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )