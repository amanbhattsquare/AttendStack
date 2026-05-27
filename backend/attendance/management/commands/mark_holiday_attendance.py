from django.core.management.base import BaseCommand
from django.utils import timezone
from employees.models import Employee
from attendance.models import AttendanceRecord, AttendanceStatus
from holidays.models import Holiday

class Command(BaseCommand):
    help = 'Marks attendance as HOLIDAY for all employees on a company holiday.'

    def handle(self, *args, **options):
        today = timezone.now().date()
        
        try:
            holiday = Holiday.objects.get(date=today)
        except Holiday.DoesNotExist:
            self.stdout.write(self.style.SUCCESS(f'Today ({today}) is not a holiday.'))
            return

        if holiday.is_processed:
            self.stdout.write(self.style.WARNING(f'Holiday {holiday.name} has already been processed.'))
            return

        employees = Employee.objects.all()
        for employee in employees:
            AttendanceRecord.objects.update_or_create(
                employee=employee,
                date=today,
                defaults={
                    'status': AttendanceStatus.HOLIDAY,
                    'is_paid': True,
                }
            )

        holiday.is_processed = True
        holiday.save()

        self.stdout.write(self.style.SUCCESS(f'Successfully marked attendance as HOLIDAY for all employees on {holiday.name}.'))