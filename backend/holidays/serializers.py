from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from .models import Holiday

class HolidaySerializer(serializers.ModelSerializer):
    day = serializers.SerializerMethodField()

    class Meta:
        model = Holiday
        fields = ["id", "name", "date", "day", "type", "created_at", "updated_at"]

    def get_day(self, obj):
        return obj.date.strftime("%A")

    def validate_date(self, value):
        # Check if a holiday with the same date already exists
        if Holiday.objects.filter(date=value).exists():
            raise ValidationError("A holiday with this date already exists.")
        return value