from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import User


class LoginForm(forms.Form):
    username = forms.CharField(
        label='Usuário',
        widget=forms.TextInput(attrs={
            'class': 'input',
            'placeholder': 'Seu usuário'
        })
    )
    password = forms.CharField(
        label='Senha',
        widget=forms.PasswordInput(attrs={
            'class': 'input',
            'placeholder': 'Sua senha'
        })
    )


class ClienteRegisterForm(UserCreationForm):
    first_name = forms.CharField(
        label='Nome Completo',
        widget=forms.TextInput(attrs={
            'class': 'input',
            'placeholder': 'Seu nome completo'
        })
    )
    cpf = forms.CharField(
        label='CPF',
        widget=forms.TextInput(attrs={
            'class': 'input',
            'placeholder': '000.000.000-00'
        })
    )
    telefone = forms.CharField(
        label='Telefone',
        widget=forms.TextInput(attrs={
            'class': 'input',
            'placeholder': '(00) 00000-0000'
        })
    )
    email = forms.EmailField(
        label='E-mail',
        widget=forms.EmailInput(attrs={
            'class': 'input',
            'placeholder': 'seu@email.com'
        })
    )
    username = forms.CharField(
        label='Usuário',
        widget=forms.TextInput(attrs={
            'class': 'input',
            'placeholder': 'Escolha um nome de usuário'
        })
    )
    password1 = forms.CharField(
        label='Senha',
        widget=forms.PasswordInput(attrs={
            'class': 'input',
            'placeholder': 'Crie uma senha'
        })
    )
    password2 = forms.CharField(
        label='Confirmar Senha',
        widget=forms.PasswordInput(attrs={
            'class': 'input',
            'placeholder': 'Confirme sua senha'
        })
    )

    class Meta:
        model = User
        fields = ['first_name', 'username', 'email', 'cpf', 'telefone', 'password1', 'password2']

    def save(self, commit=True):
        user = super().save(commit=False)
        user.user_type = 'cliente'
        if commit:
            user.save()
        return user


class StaffUserForm(UserCreationForm):
    first_name = forms.CharField(
        label='Nome',
        widget=forms.TextInput(attrs={'class': 'input', 'placeholder': 'Nome'})
    )
    username = forms.CharField(
        label='Usuário',
        widget=forms.TextInput(attrs={'class': 'input', 'placeholder': 'Usuário'})
    )
    user_type = forms.ChoiceField(
        label='Tipo',
        choices=[('admin', 'Administrador'), ('balcao', 'Balcão'), ('caixa', 'Caixa')],
        widget=forms.Select(attrs={'class': 'select'})
    )
    password1 = forms.CharField(
        label='Senha',
        widget=forms.PasswordInput(attrs={'class': 'input', 'placeholder': 'Senha'})
    )
    password2 = forms.CharField(
        label='Confirmar Senha',
        widget=forms.PasswordInput(attrs={'class': 'input', 'placeholder': 'Confirmar'})
    )

    class Meta:
        model = User
        fields = ['first_name', 'username', 'user_type', 'password1', 'password2']
