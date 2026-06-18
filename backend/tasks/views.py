from django.db.models import Count
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import UserRole
from employees.models import Employee
from .models import Task, TaskStatus
from .serializers import (
    EmployeeTaskStatusSerializer,
    TaskSerializer,
    task_priority_choices,
    task_status_choices,
)


class TaskPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    pagination_class = TaskPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "title",
        "description",
        "assignee__full_name",
        "assignee__employee_id",
        "assignee__department",
        "department",
        "project_category",
    ]
    ordering_fields = ["created_at", "updated_at", "due_date", "priority", "status"]
    ordering = ["status", "due_date", "-created_at"]

    def _is_admin_or_hr(self, user):
        return user.role in (UserRole.SUPER_ADMIN, UserRole.HR) or user.is_staff

    def _current_employee(self):
        employee = Employee.objects.filter(email__iexact=self.request.user.email).first()
        if employee is None and self.request.user.employee_id:
            employee = Employee.objects.filter(employee_id=self.request.user.employee_id).first()
        if employee is None:
            raise NotFound("No employee profile is linked to this login account.")
        return employee

    def _validate_assignee_scope(self, assignee):
        user = self.request.user
        if user.is_superuser:
            return

        manager_employee = Employee.objects.filter(email__iexact=user.email).first()
        if (
            manager_employee
            and manager_employee.organization_id
            and assignee.organization_id == manager_employee.organization_id
        ):
            return

        raise PermissionDenied("You can assign tasks only to employees in your organization.")

    def get_queryset(self):
        queryset = Task.objects.select_related("assignee", "assigned_by").all()
        user = self.request.user

        if not self._is_admin_or_hr(user):
            employee = self._current_employee()
            queryset = queryset.filter(assignee=employee)
        elif not user.is_superuser:
            employee = Employee.objects.filter(email__iexact=user.email).first()
            if employee and employee.organization_id:
                queryset = queryset.filter(assignee__organization=employee.organization)
            else:
                queryset = queryset.none()

        params = self.request.query_params
        status_filter = params.get("status")
        priority = params.get("priority")
        assignee = params.get("assignee")
        department = params.get("department")
        project_category = params.get("project_category")
        due_from = params.get("due_from")
        due_to = params.get("due_to")

        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        if priority:
            queryset = queryset.filter(priority=priority.upper())
        if assignee and self._is_admin_or_hr(user):
            queryset = queryset.filter(assignee_id=assignee)
        if department:
            queryset = queryset.filter(department__iexact=department)
        if project_category:
            queryset = queryset.filter(project_category__icontains=project_category)
        if due_from:
            queryset = queryset.filter(due_date__gte=due_from)
        if due_to:
            queryset = queryset.filter(due_date__lte=due_to)

        return queryset

    def perform_create(self, serializer):
        if not self._is_admin_or_hr(self.request.user):
            raise PermissionDenied("Only Admin or HR users can assign tasks.")
        self._validate_assignee_scope(serializer.validated_data["assignee"])
        serializer.save(assigned_by=self.request.user)

    def perform_update(self, serializer):
        if not self._is_admin_or_hr(self.request.user):
            raise PermissionDenied("Employees can update task status only.")
        assignee = serializer.validated_data.get("assignee", serializer.instance.assignee)
        self._validate_assignee_scope(assignee)
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        if not self._is_admin_or_hr(request.user):
            raise PermissionDenied("Only Admin or HR users can delete tasks.")
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        task = self.get_object()
        user = request.user

        if self._is_admin_or_hr(user):
            allowed_fields = {"status", "employee_notes", "employee_attachment"}
        else:
            employee = self._current_employee()
            if task.assignee_id != employee.id:
                raise PermissionDenied("You can update only your assigned tasks.")
            if task.status == TaskStatus.CANCELLED:
                raise ValidationError({"detail": "Cancelled tasks cannot be updated by employees."})
            allowed_fields = {"status", "employee_notes", "employee_attachment"}

        unexpected = set(request.data.keys()) - allowed_fields
        if unexpected:
            raise ValidationError({"detail": "Only status, employee notes, and employee attachment can be updated here."})

        serializer = EmployeeTaskStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        task.status = serializer.validated_data["status"]
        if "employee_notes" in serializer.validated_data:
            task.employee_notes = serializer.validated_data["employee_notes"]
        if "employee_attachment" in serializer.validated_data:
            task.employee_attachment = serializer.validated_data["employee_attachment"]
        task.save(update_fields=["status", "employee_notes", "employee_attachment", "completed_at", "updated_at"])

        return Response(TaskSerializer(task, context={"request": request}).data)

    @action(detail=False, methods=["get"], url_path="choices")
    def choices(self, request):
        return Response(
            {
                "statuses": task_status_choices(),
                "priorities": task_priority_choices(),
            }
        )

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        queryset = self.get_queryset()
        counts = queryset.values("status").annotate(total=Count("id"))
        by_status = {row["status"]: row["total"] for row in counts}
        overdue = queryset.filter(
            due_date__isnull=False,
            due_date__lt=timezone.localdate(),
        ).exclude(status__in=[TaskStatus.COMPLETED, TaskStatus.CLOSED, TaskStatus.CANCELLED])

        return Response(
            {
                "total": queryset.count(),
                "pending": by_status.get(TaskStatus.PENDING, 0),
                "todo": by_status.get(TaskStatus.TODO, 0),
                "in_progress": by_status.get(TaskStatus.IN_PROGRESS, 0),
                "on_hold": by_status.get(TaskStatus.ON_HOLD, 0),
                "completed": by_status.get(TaskStatus.COMPLETED, 0),
                "closed": by_status.get(TaskStatus.CLOSED, 0),
                "cancelled": by_status.get(TaskStatus.CANCELLED, 0),
                "overdue": overdue.count(),
            },
            status=status.HTTP_200_OK,
        )
