
import os
import django
import datetime

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'attendstack_backend.settings')
django.setup()

from employees.models import Employee
from attendance.models import AttendanceRecord

def delete_attendance_for_employee(employee_id, start_date, end_date):
    try:
        employee = Employee.objects.get(employee_id=employee_id)
    except Employee.DoesNotExist:
        print(f"Employee with ID {employee_id} not found.")
        return

    records_to_delete = AttendanceRecord.objects.filter(
        employee=employee,
        date__gte=start_date,
        date__lte=end_date
    )
    
    count = records_to_delete.count()
    records_to_delete.delete()
    print(f"Deleted {count} attendance records for {employee.full_name} from {start_date} to {end_date}.")


if __name__ == '__main__':
    # Employee details
    employee_id = 'EMP-00001'
    
    # Date range for deletion
    start_date = datetime.date(2026, 1, 1)
    end_date = datetime.date(2026, 4, 30)
    
    delete_attendance_for_employee(employee_id, start_date, end_date)