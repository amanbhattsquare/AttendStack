from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from employees.models import Employee
from organizations.models import Organization
from .models import Project, Task


class CompanyOwnerWorkspaceTests(APITestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_hr(
            email="owner@northstar.example",
            password="StrongPass123!",
            first_name="Maya",
            last_name="Singh",
        )
        self.organization = Organization.objects.create(name="Northstar Labs", owner=self.owner)
        self.employee = Employee.objects.create(
            organization=self.organization,
            full_name="Arjun Patel",
            email="arjun@northstar.example",
            phone="9876543210",
        )
        self.client.force_authenticate(self.owner)

    def test_company_owner_without_employee_profile_can_create_project_and_assign_task(self):
        project_response = self.client.post(
            reverse("tasks:project-list"),
            {"name": "Launch plan", "key": "LAUNCH", "status": "ACTIVE", "color": "#4f46e5"},
            format="json",
        )

        self.assertEqual(project_response.status_code, status.HTTP_201_CREATED, project_response.data)
        project = Project.objects.get(pk=project_response.data["id"])
        self.assertEqual(project.organization, self.organization)
        self.assertIsNone(project.owner)
        self.assertEqual(project.created_by, self.owner)

        employees_response = self.client.get("/api/v1/employees/")
        self.assertEqual(employees_response.status_code, status.HTTP_200_OK)
        self.assertEqual(employees_response.data["results"][0]["id"], str(self.employee.id))

        task_response = self.client.post(
            reverse("tasks:task-list"),
            {
                "title": "Prepare launch copy",
                "project": str(project.id),
                "assignee": str(self.employee.id),
                "assignees": [str(self.employee.id)],
                "priority": "HIGH",
                "status": "TODO",
            },
            format="json",
        )

        self.assertEqual(task_response.status_code, status.HTTP_201_CREATED, task_response.data)
        task = Task.objects.get(pk=task_response.data["id"])
        self.assertEqual(task.assignee, self.employee)
        self.assertEqual(task.assigned_by, self.owner)
