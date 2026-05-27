from rest_framework import serializers
from .models import Holiday

class HolidaySerializer(serializers.ModelSerializer):
    day = serializers.SerializerMethodField()

    class Meta:
        model = Holiday
        fields = ["id", "name", "date", "day", "type", "is_processed", "created_at", "updated_at"]

    def get_day(self, obj):
        return obj.date.strftime("%A")