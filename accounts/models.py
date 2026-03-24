from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
import random
import string


class User(AbstractUser):
    USER_TYPE_CHOICES = (
        ('admin', 'Administrador'),
        ('balcao', 'Balcão'),
        ('caixa', 'Caixa'),
        ('cliente', 'Cliente'),
    )

    user_type = models.CharField(
        max_length=10,
        choices=USER_TYPE_CHOICES,
        default='cliente',
        verbose_name='Tipo de Usuário'
    )
    cpf = models.CharField(max_length=14, blank=True, verbose_name='CPF')
    telefone = models.CharField(max_length=15, blank=True, verbose_name='Telefone')

    class Meta:
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'

    def __str__(self):
        return f'{self.get_full_name() or self.username} ({self.get_user_type_display()})'


class PasswordResetCode(models.Model):
    email = models.EmailField()
    code = models.CharField(max_length=6)
    criado_em = models.DateTimeField(auto_now_add=True)
    usado = models.BooleanField(default=False)

    def is_expired(self):
        return (timezone.now() - self.criado_em).total_seconds() > 900  # 15 min

    @staticmethod
    def generate_code():
        return ''.join(random.choices(string.digits, k=6))

    class Meta:
        ordering = ['-criado_em']

    def __str__(self):
        return f'{self.email} - {self.code}'
