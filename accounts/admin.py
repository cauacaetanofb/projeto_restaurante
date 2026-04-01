from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, PasswordResetCode


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'user_type', 'is_active')
    list_filter = ('user_type', 'is_active', 'is_staff')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'cpf')

    fieldsets = UserAdmin.fieldsets + (
        ('Informações Extras', {
            'fields': ('user_type', 'cpf', 'telefone'),
        }),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Informações Extras', {
            'fields': ('user_type', 'cpf', 'telefone'),
        }),
    )


@admin.register(PasswordResetCode)
class PasswordResetCodeAdmin(admin.ModelAdmin):
    list_display = ('email', 'code', 'criado_em', 'usado')
    list_filter = ('usado',)
    search_fields = ('email',)
