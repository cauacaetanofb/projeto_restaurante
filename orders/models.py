from django.conf import settings
from django.db import models
from cards.models import Card
from products.models import Product


class Order(models.Model):
    atendente = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='orders_atendidos',
        verbose_name='Atendente'
    )
    card = models.ForeignKey(
        Card,
        on_delete=models.SET_NULL,
        null=True,
        related_name='orders',
        verbose_name='Cartão'
    )
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='Total')
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Pedido'
        verbose_name_plural = 'Pedidos'
        ordering = ['-criado_em']

    def __str__(self):
        return f'Pedido #{self.id} - R$ {self.total}'


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items', verbose_name='Pedido')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, verbose_name='Produto')
    quantidade = models.PositiveIntegerField(default=1, verbose_name='Quantidade')
    preco_unitario = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Preço Unitário')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Subtotal')

    class Meta:
        verbose_name = 'Item do Pedido'
        verbose_name_plural = 'Itens do Pedido'

    def save(self, *args, **kwargs):
        self.subtotal = self.preco_unitario * self.quantidade
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.quantidade}x {self.product} = R$ {self.subtotal}'
