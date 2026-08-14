from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import get_user_model
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from employees.models import Employee
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

        # Enforce active user & employee status check via Employee model lookup by email
        emp = Employee.objects.filter(email=target_user.email).first()
        if not target_user.is_active or (emp and emp.status in ['INACTIVE', 'TERMINATED']):
            return Response(
                {"error": "You can only start a chat with active team members."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if direct conversation already exists between these 2 users
        existing_conv = Conversation.objects.filter(
            type=Conversation.ConversationType.DIRECT,
            members__user=request.user
        ).filter(
            members__user=target_user
        ).first()

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
        # Only Admins and HR Managers are authorized to create group chats
        user_role = getattr(request.user, 'role', '')
        is_admin_or_hr = user_role in ['SUPER_ADMIN', 'HR'] or request.user.is_staff or request.user.is_superuser
        if not is_admin_or_hr:
            return Response(
                {"error": "Only Administrators and HR Managers are authorized to create group chats."},
                status=status.HTTP_403_FORBIDDEN
            )

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
        messages = conversation.messages.filter(is_deleted=False).order_by('-created_at')
        
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
                from django.core.serializers.json import DjangoJSONEncoder
                import json
                clean_msg_data = json.loads(json.dumps(msg_data, cls=DjangoJSONEncoder))
                async_to_sync(channel_layer.group_send)(
                    f"chat_{conversation.id}",
                    {
                        "type": "chat.message",
                        "message": clean_msg_data
                    }
                )
        except Exception as e:
            import logging
            logging.warning(f"Failed to broadcast WS message: {e}")

        return Response(msg_data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post', 'delete'], url_path='delete-message')
    def delete_message(self, request, pk=None):
        conversation = self.get_object()
        message_id = request.data.get('message_id') or request.query_params.get('message_id')
        if not message_id:
            return Response(
                {"error": "message_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        message = get_object_or_404(Message, id=message_id, conversation=conversation)

        is_sender = (message.sender == request.user)
        is_admin = conversation.members.filter(
            user=request.user,
            role=ConversationMember.Role.ADMIN
        ).exists()

        if not (is_sender or is_admin):
            return Response(
                {"error": "You do not have permission to delete this message."},
                status=status.HTTP_403_FORBIDDEN
            )

        message.is_deleted = True
        message.content = "This message was deleted"
        message.save()

        # Delete physical files from storage disk before removing database attachment entries
        attachments = list(message.attachments.all())
        for attachment in attachments:
            if attachment.file:
                try:
                    attachment.file.delete(save=False)
                except Exception as e:
                    import logging
                    logging.warning(f"Failed to delete storage file for attachment {attachment.id}: {e}")
            attachment.delete()

        msg_data = MessageSerializer(message, context={'request': request}).data

        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                from django.core.serializers.json import DjangoJSONEncoder
                import json
                async_to_sync(channel_layer.group_send)(
                    f"chat_{conversation.id}",
                    {
                        "type": "chat.message_deleted",
                        "message_id": str(message.id),
                        "conversation_id": str(conversation.id)
                    }
                )
        except Exception as e:
            import logging
            logging.warning(f"Failed to broadcast WS message deletion: {e}")

        return Response(msg_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='read')
    def mark_read(self, request, pk=None):
        conversation = self.get_object()
        latest_message = conversation.messages.filter(is_deleted=False).order_by('-created_at').first()
        if latest_message:
            member = conversation.members.filter(user=request.user).first()
            if member:
                member.last_read_message = latest_message
                member.save(update_fields=['last_read_message'])
        return Response({"status": "read marked"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='clear')
    def clear_chat(self, request, pk=None):
        conversation = self.get_object()
        messages = conversation.messages.all()
        for msg in messages:
            msg.is_deleted = True
            msg.content = "This message was cleared"
            msg.save()
            for attachment in list(msg.attachments.all()):
                if attachment.file:
                    try:
                        attachment.file.delete(save=False)
                    except Exception:
                        pass
                attachment.delete()
        return Response({"status": "Chat cleared successfully"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='announcement')
    def send_announcement(self, request):
        user_role = getattr(request.user, 'role', '')
        is_admin_or_hr = user_role in ['SUPER_ADMIN', 'HR'] or request.user.is_staff or request.user.is_superuser
        if not is_admin_or_hr:
            return Response(
                {"error": "Only Administrators and HR Managers are authorized to send announcements."},
                status=status.HTTP_403_FORBIDDEN
            )

        content = request.data.get('content', '')
        target_type = request.data.get('target_type', 'EVERYONE')
        department_target = request.data.get('department_target', '')
        pinned = request.data.get('pinned', True)
        requires_ack = request.data.get('requires_acknowledgement', False)

        # Get or create company announcements group (handle old emoji name too)
        conv = Conversation.objects.filter(
            type=Conversation.ConversationType.GROUP,
            name__in=["Company Announcements", "\U0001f4e2 Company Announcements"]
        ).first()

        if conv and conv.name != "Company Announcements":
            conv.name = "Company Announcements"
            conv.save(update_fields=["name"])

        if not conv:
            conv = Conversation.objects.create(
                type=Conversation.ConversationType.GROUP,
                name="Company Announcements"
            )
            ConversationMember.objects.create(
                conversation=conv,
                user=request.user,
                role=ConversationMember.Role.ADMIN
            )
            # Add all active users to company announcements
            active_users = User.objects.filter(is_active=True).exclude(id=request.user.id)
            for u in active_users:
                ConversationMember.objects.create(conversation=conv, user=u)
        else:
            # Ensure sender is in member list
            if not conv.members.filter(user=request.user).exists():
                ConversationMember.objects.create(conversation=conv, user=request.user, role=ConversationMember.Role.ADMIN)

        message = Message.objects.create(
            conversation=conv,
            sender=request.user,
            content=content,
            message_type=Message.MessageType.TEXT,
            is_announcement=True,
            pinned=pinned,
            target_type=target_type,
            department_target=department_target,
            requires_acknowledgement=requires_ack
        )
        conv.save()
        msg_data = MessageSerializer(message, context={'request': request}).data
        return Response(msg_data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='acknowledge')
    def acknowledge_announcement(self, request, pk=None):
        message = get_object_or_404(Message, id=pk)
        message.acknowledged_by.add(request.user)
        return Response({"status": "acknowledged"}, status=status.HTTP_200_OK)



class ChatUserViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserMinimalSerializer

    def get_queryset(self):
        # Base active users queryset
        queryset = User.objects.exclude(id=self.request.user.id).filter(is_active=True)

        # Scope by Organization: Match employees in the same company
        current_emp = Employee.objects.filter(email=self.request.user.email).first()
        if current_emp and current_emp.organization_id:
            org_emails = Employee.objects.filter(
                organization=current_emp.organization,
                status='ACTIVE'
            ).values_list('email', flat=True)
            queryset = queryset.filter(email__in=org_emails)
        else:
            # Fallback: Exclude emails belonging to inactive or terminated employees
            inactive_emails = Employee.objects.filter(
                status__in=['INACTIVE', 'TERMINATED']
            ).values_list('email', flat=True)
            queryset = queryset.exclude(email__in=inactive_emails)

        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(employee_id__icontains=search)
            )
        return queryset.order_by('first_name', 'last_name', 'email')
