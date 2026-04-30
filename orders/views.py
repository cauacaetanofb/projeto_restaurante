from decimal import Decimal
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
import json

from .models import Order, OrderItem
from cards.models import Card, Transaction
from products.models import Product


@login_required
@require_POST
def api_create_order(request):
    """Cria pedido, debita saldo do cartão."""
    if request.user.user_type not in ['admin', 'balcao', 'caixa']:
        return JsonResponse({'error': 'Sem permissão'}, status=403)

    data = json.loads(request.body)
    qr_data = data.get('qr_data', '')
    items = data.get('items', [])

    if not items:
        return JsonResponse({'error': 'Carrinho vazio'}, status=400)

    try:
        card = Card.objects.get(qr_code_data=qr_data)
    except Card.DoesNotExist:
        return JsonResponse({'error': 'Cartão não encontrado'}, status=404)

    # Calcula total
    total = Decimal('0')
    order_items = []
    for item in items:
        try:
            product = Product.objects.get(id=item['product_id'], disponivel=True)
        except Product.DoesNotExist:
            return JsonResponse({'error': f'Produto {item.get("product_id")} não encontrado'}, status=404)
        qtd = int(item.get('quantidade', 1))
        subtotal = product.preco * qtd
        total += subtotal
        order_items.append((product, qtd, subtotal))

    # Verifica saldo
    if card.saldo < total:
        return JsonResponse({
            'error': f'Saldo insuficiente. Saldo: R$ {card.saldo}, Total: R$ {total}'
        }, status=400)

    # Cria pedido
    order = Order.objects.create(
        atendente=request.user,
        card=card,
        total=total,
    )
    for product, qtd, subtotal in order_items:
        OrderItem.objects.create(
            order=order,
            product=product,
            quantidade=qtd,
            preco_unitario=product.preco,
            subtotal=subtotal,
        )

    # Debita saldo
    card.saldo -= total
    card.save()

    # Registra transação
    nomes = ', '.join([f'{qtd}x {p.nome}' for p, qtd, _ in order_items])
    cpf = card.cpf or (card.user.cpf if card.user else '')
    Transaction.objects.create(
        card=card,
        tipo='pagamento',
        valor=total,
        metodo='saldo',
        cpf_cliente=cpf,
        descricao=f'Pedido #{order.id}: {nomes}',
        operador=request.user,
        order=order,
    )

    return JsonResponse({
        'success': True,
        'order_id': order.id,
        'total': str(total),
        'novo_saldo': str(card.saldo),
    })
