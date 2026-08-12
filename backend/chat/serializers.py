from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Conversation, ConversationMember, Message, Attachment

User = get_user_model()


class UserMinimalSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    profile_photo_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'name', 'role', 'employee_id', 'is_active', 'status', 'profile_photo_url']

    def get_name(self, obj):
        full_name = f"{getattr(obj, 'first_name', '')} {getattr(obj, 'last_name', '')}".strip()
        return full_name if full_name else obj.email

    def get_status(self, obj):
        if not obj.is_active:
            return "INACTIVE"
        try:
            from employees.models import Employee
            emp = Employee.objects.filter(email=obj.email).first()
            if emp:
                return emp.status
        except Exception:
            pass
        return "ACTIVE"

    def get_profile_photo_url(self, obj):
        request = self.context.get('request')
        # 1. Check employee profile_photo (primary source)
        try:
            from employees.models import Employee
            emp = Employee.objects.filter(email=obj.email).first()
            if emp and emp.profile_photo:
                if request:
                    return request.build_absolute_uri(emp.profile_photo.url)
                return emp.profile_photo.url
        except Exception:
            pass
        # 2. Fall back to User.avatar
        try:
            if obj.avatar:
                if request:
                    return request.build_absolute_uri(obj.avatar.url)
                return obj.avatar.url
        except Exception:
            pass
        return None


class AttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = ['id', 'file', 'file_url', 'file_type', 'file_size', 'created_at']
        read_only_fields = ['id', 'file_url', 'created_at']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class MessageSerializer(serializers.ModelSerializer):
    sender = UserMinimalSerializer(read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    acknowledged_count = serializers.SerializerMethodField()
    is_acknowledged_by_me = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 'content',
            'message_type', 'is_edited', 'is_deleted',
            'is_announcement', 'pinned', 'target_type',
            'department_target', 'requires_acknowledgement',
            'acknowledged_count', 'is_acknowledged_by_me',
            'created_at', 'attachments'
        ]
        read_only_fields = ['id', 'conversation', 'sender', 'is_edited', 'is_deleted', 'created_at']

    def get_acknowledged_count(self, obj):
        return obj.acknowledged_by.count()

    def get_is_acknowledged_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.acknowledged_by.filter(id=request.user.id).exists()
        return False


class ConversationMemberSerializer(serializers.ModelSerializer):
    user = UserMinimalSerializer(read_only=True)

    class Meta:
        model = ConversationMember
        fields = ['id', 'user', 'role', 'joined_at']


class ConversationSerializer(serializers.ModelSerializer):
    members = ConversationMemberSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'type', 'name', 'display_name',
            'avatar', 'created_at', 'updated_at',
            'members', 'last_message', 'unread_count'
        ]

    def get_avatar(self, obj):
        request = self.context.get('request')
        if obj.type == Conversation.ConversationType.GROUP:
            if obj.avatar:
                return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url
            return None
        if request and request.user and request.user.is_authenticated:
            other_member = obj.members.exclude(user=request.user).first()
            if other_member and other_member.user:
                try:
                    from employees.models import Employee
                    emp = Employee.objects.filter(email=other_member.user.email).first()
                    if emp and emp.profile_photo:
                        return request.build_absolute_uri(emp.profile_photo.url) if request else emp.profile_photo.url
                except Exception:
                    pass
                if getattr(other_member.user, 'avatar', None):
                    return request.build_absolute_uri(other_member.user.avatar.url) if request else other_member.user.avatar.url
        return None

    def get_last_message(self, obj):
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            return MessageSerializer(last_msg, context=self.context).data
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return 0
        member = obj.members.filter(user=request.user).first()
        if not member or not member.last_read_message:
            return obj.messages.count()
        return obj.messages.filter(created_at__gt=member.last_read_message.created_at).count()

    def get_display_name(self, obj):
        request = self.context.get('request')
        if obj.type == Conversation.ConversationType.GROUP:
            return obj.name or "Group Chat"
        if request and request.user and request.user.is_authenticated:
            other_member = obj.members.exclude(user=request.user).first()
            if other_member and other_member.user:
                first_name = getattr(other_member.user, 'first_name', '')
                last_name = getattr(other_member.user, 'last_name', '')
                name = f"{first_name} {last_name}".strip()
                return name if name else other_member.user.email
        return obj.name or "Direct Message"


class CreateDirectConversationSerializer(serializers.Serializer):
    target_user_id = serializers.CharField()


class CreateGroupConversationSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    member_ids = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=False
    )
