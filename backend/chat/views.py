from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import get_user_model
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import Conversation, ConversationMember, Message, Attachment
from .serializers import (
    ConversationSerializer,
    MessageSerializer,
    CreateDirectConversationSerializer,
    CreateGroupConversationSerializer,
    UserMinimalSerializer,
    AttachmentSerializer
)

User = get_user_model()


class MessagePagination(PageNumberPagination):
    page_size = 30
    page_size_query_param = 'page_size'
    max_page_size = 100


class ConversationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return Conversation.objects.filter(
            members__user=self.request.user
        ).distinct().order_by('-updated_at')

    @action(detail=False, methods=['post'], url_path='direct')
    def create_direct(self, request):
        serializer = CreateDirectConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_user_id = serializer.validated_data['target_user_id']

        if target_user_id == request.user.id:
            return Response(
                {"error": "You cannot start a direct chat with yourself."},
                status=status.HTTP_400_BAD_REQUEST
            )

        target_user = get_object_or_404(User, id=target_user_id)

        # Check if direct conversation already exists between these 2 users
        existing_conv = Conversation.objects.filter(
            type=Conversation.ConversationType.DIRECT,
            members__user=request.user
        ).filter(
            members__user=target_user
        ).annotate(
            member_count=Count('members')
        ).filter(member_count=2).first()

        if existing_conv:
            return Response(
                ConversationSerializer(existing_conv, context={'request': request}).data,
                status=status.HTTP_200_OK
            )

        # Create new direct conversation
        conv = Conversation.objects.create(type=Conversation.ConversationType.DIRECT)
        ConversationMember.objects.create(conversation=conv, user=request.user)
        ConversationMember.objects.create(conversation=conv, user=target_user)

        return Response(
            ConversationSerializer(conv, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['post'], url_path='group')
    def create_group(self, request):
        serializer = CreateGroupConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        name = serializer.validated_data['name']
        member_ids = serializer.validated_data['member_ids']

        if request.user.id not in member_ids:
            member_ids.append(request.user.id)

        users = User.objects.filter(id__in=member_ids)
        conv = Conversation.objects.create(
            type=Conversation.ConversationType.GROUP,
            name=name
        )

        for u in users:
            role = ConversationMember.Role.ADMIN if u.id == request.user.id else ConversationMember.Role.MEMBER
            ConversationMember.objects.create(conversation=conv, user=u, role=role)

        return Response(
            ConversationSerializer(conv, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['get'], url_path='messages')
    def get_messages(self, request, pk=None):
        conversation = self.get_object()
        messages = conversation.messages.all().order_by('-created_at')
        
        paginator = MessagePagination()
        page = paginator.paginate_queryset(messages, request)
        if page is not None:
            serializer = MessageSerializer(page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)

        serializer = MessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='send-message')
    def send_message(self, request, pk=None):
        conversation = self.get_object()
        content = request.data.get('content', '')
        message_type = request.data.get('message_type', Message.MessageType.TEXT)
        files = request.FILES.getlist('files')

        if not content and not files:
            return Response(
                {"error": "Message content or attachment is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Auto detect type if files attached
        if files and message_type == Message.MessageType.TEXT:
            first_file = files[0]
            if first_file.content_type.startswith('image/'):
                message_type = Message.MessageType.IMAGE
            elif first_file.content_type.startswith('video/'):
                message_type = Message.MessageType.VIDEO
            else:
                message_type = Message.MessageType.FILE

        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=content,
            message_type=message_type
        )

        for f in files:
            Attachment.objects.create(
                message=message,
                file=f,
                file_type=f.content_type,
                file_size=f.size
            )

        conversation.save()  # Triggers auto_now for updated_at

        # Also update sender's last_read_message
        member = conversation.members.filter(user=request.user).first()
        if member:
            member.last_read_message = message
            member.save(update_fields=['last_read_message'])

        msg_data = MessageSerializer(message, context={'request': request}).data

        # Broadcast via Channel Layer to room group safely
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"chat_{conversation.id}",
                    {
                        "type": "chat.message",
                        "message": msg_data
                    }
                )
        except Exception as e:
            import logging
            logging.warning(f"Failed to broadcast WS message: {e}")

        return Response(msg_data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='read')
    def mark_read(self, request, pk=None):
        conversation = self.get_object()
        latest_message = conversation.messages.order_by('-created_at').first()
        if latest_message:
            member = conversation.members.filter(user=request.user).first()
            if member:
                member.last_read_message = latest_message
                member.save(update_fields=['last_read_message'])
        return Response({"status": "read marked"}, status=status.HTTP_200_OK)


class ChatUserViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserMinimalSerializer

    def get_queryset(self):
        queryset = User.objects.exclude(id=self.request.user.id).filter(is_active=True)
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(employee_id__icontains=search)
            )
        return queryset.order_by('first_name', 'last_name', 'email')
