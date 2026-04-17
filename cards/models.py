import uuid
from django.conf import settings
from django.db import models


class Card(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='card',
        verbose_name='Usuário'
    )
    qr_code_data = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    saldo = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='Saldo')
    is_temporary = models.BooleanField(default=False, verbose_name='Temporário')
    bloqueado = models.BooleanField(default=False, verbose_name='Bloqueado')
    motivo_bloqueio = models.CharField(max_length=255, blank=True, verbose_name='Motivo do Bloqueio')
    nome = models.CharField(max_length=200, blank=True, verbose_name='Nome')
    cpf = models.CharField(max_length=14, blank=True, verbose_name='CPF')
    telefone = models.CharField(max_length=15, blank=True, verbose_name='Telefone')
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Cartão'
        verbose_name_plural = 'Cartões'

    def __str__(self):
        if self.is_temporary:
            return f'Cartão Temporário - {self.nome} (R$ {self.saldo})'
        return f'Cartão de {self.user} (R$ {self.saldo})'


class Transaction(models.Model):
    TIPO_CHOICES = (
        ('deposito', 'Depósito'),
        ('pagamento', 'Pagamento'),
        ('retirada', 'Retirada'),
    )
    METODO_CHOICES = (
        ('dinheiro', 'Dinheiro'),
        ('pix', 'PIX'),
        ('credito', 'Cartão de Crédito'),
        ('debito', 'Cartão de Débito'),
        ('saldo', 'Saldo do Cartão'),
        ('outro', 'Outro'),
    )
    ORIGEM_CHOICES = (
        ('app', 'App (Cliente)'),
        ('caixa', 'Caixa (Presencial)'),
    )

    card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name='transactions', verbose_name='Cartão')
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES, verbose_name='Tipo')
    valor = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Valor')
    metodo = models.CharField(max_length=10, choices=METODO_CHOICES, default='dinheiro', verbose_name='Método')
    origem = models.CharField(max_length=10, choices=ORIGEM_CHOICES, default='app', verbose_name='Origem')
    cpf_cliente = models.CharField(max_length=14, blank=True, verbose_name='CPF do Cliente')
    descricao = models.CharField(max_length=255, blank=True, verbose_name='Descrição')
    operador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name='Operador'
    )
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='transactions',
        verbose_name='Pedido'
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Transação'
        verbose_name_plural = 'Transações'
        ordering = ['-criado_em']

    def __str__(self):
        return f'{self.get_tipo_display()} - R$ {self.valor} ({self.get_metodo_display()})'


class Recarga(models.Model):
    STATUS_CHOICES = (
        ('pendente', 'Pendente'),
        ('pago', 'Pago'),
        ('vencido', 'Vencido'),
    )

    card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name='recargas', verbose_name='Cartão')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, verbose_name='Usuário')
    valor = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Valor')
    asaas_payment_id = models.CharField(max_length=100, unique=True, verbose_name='ID Pagamento Asaas')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pendente', verbose_name='Status')
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Recarga'
        verbose_name_plural = 'Recargas'
        ordering = ['-criado_em']

    def __str__(self):
        return f'Recarga R$ {self.valor} - {self.get_status_display()} ({self.asaas_payment_id})'
