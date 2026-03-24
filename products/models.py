from django.db import models


class Category(models.Model):
    nome = models.CharField(max_length=100, verbose_name='Nome')

    class Meta:
        verbose_name = 'Categoria'
        verbose_name_plural = 'Categorias'
        ordering = ['nome']

    def __str__(self):
        return self.nome


class Product(models.Model):
    nome = models.CharField(max_length=200, verbose_name='Nome')
    descricao = models.TextField(blank=True, verbose_name='Descrição', max_length=500)
    preco = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Preço')
    categoria = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='produtos',
        verbose_name='Categoria'
    )
    imagem = models.ImageField(upload_to='produtos/', blank=True, null=True, verbose_name='Imagem')
    disponivel = models.BooleanField(default=True, verbose_name='Disponível')
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Produto'
        verbose_name_plural = 'Produtos'
        ordering = ['categoria', 'nome']

    def __str__(self):
        return f'{self.nome} - R$ {self.preco}'
