from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

User = get_user_model()


class EmailOrUsernameBackend(ModelBackend):
    """Permite login com email ou username."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None

        # Tenta por username primeiro
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            # Tenta por email (usa filter para evitar erro com duplicatas)
            user = User.objects.filter(email__iexact=username).first()
            if user is None:
                return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
