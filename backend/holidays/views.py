from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from attendance.permissions import IsAdminOrReadOnly
from .models import Holiday
from .serializers import HolidaySerializer

class HolidayViewSet(viewsets.ModelViewSet):
    queryset = Holiday.objects.all()
    serializer_class = HolidaySerializer
    permission_classes = [IsAdminOrReadOnly]
