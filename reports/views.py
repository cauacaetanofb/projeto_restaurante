from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.db.models import Sum, Count
from django.db.models.functions import TruncDate
from datetime import timedelta
from django.utils import timezone

from orders.models import Order, OrderItem
from cards.models import Transaction


@login_required
def api_sales_report(request):
    if request.user.user_type != 'admin':
        return JsonResponse({'error': 'Sem permissão'}, status=403)

    period = request.GET.get('period', 'today')
    now = timezone.now()

    if period == 'today':
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == 'week':
        start = now - timedelta(days=7)
    elif period == 'month':
        start = now - timedelta(days=30)
    else:
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    orders = Order.objects.filter(criado_em__gte=start)
    transactions = Transaction.objects.filter(criado_em__gte=start)

    # Totais de vendas
    totals = orders.aggregate(
        total_vendas=Sum('total'),
        total_pedidos=Count('id')
    )

    # Total de depósitos
    depositos = transactions.filter(tipo='deposito').aggregate(
        total=Sum('valor'),
        count=Count('id')
    )

    # Vendas por dia
    daily = orders.annotate(
        dia=TruncDate('criado_em')
    ).values('dia').annotate(
        total=Sum('total'),
        pedidos=Count('id')
    ).order_by('dia')

    # Produtos mais vendidos
    top_products = OrderItem.objects.filter(
        order__criado_em__gte=start
    ).values(
        'product__nome'
    ).annotate(
        total_qty=Sum('quantidade'),
        total_valor=Sum('subtotal')
    ).order_by('-total_qty')[:10]

    # Valor por método de pagamento (depósitos)
    metodo_labels = dict(Transaction.METODO_CHOICES)
    por_metodo = transactions.filter(tipo='deposito').values('metodo').annotate(
        total=Sum('valor'),
        count=Count('id')
    ).order_by('-total')

    # Depósitos separados por origem
    depositos_app = transactions.filter(tipo='deposito', origem='app').aggregate(
        total=Sum('valor'), count=Count('id')
    )
    depositos_caixa = transactions.filter(tipo='deposito', origem='caixa').aggregate(
        total=Sum('valor'), count=Count('id')
    )
    por_metodo_app = transactions.filter(tipo='deposito', origem='app').values('metodo').annotate(
        total=Sum('valor'), count=Count('id')
    ).order_by('-total')
    por_metodo_caixa = transactions.filter(tipo='deposito', origem='caixa').values('metodo').annotate(
        total=Sum('valor'), count=Count('id')
    ).order_by('-total')

    # Total de retiradas
    retiradas = transactions.filter(tipo='retirada').aggregate(
        total=Sum('valor'),
        count=Count('id')
    )

    # Total pago via saldo (pagamentos)
    pagamentos_saldo = transactions.filter(tipo='pagamento').aggregate(
        total=Sum('valor'),
        count=Count('id')
    )

    return JsonResponse({
        'period': period,
        'total_vendas': str(totals['total_vendas'] or 0),
        'total_pedidos': totals['total_pedidos'],
        'total_depositos': str(depositos['total'] or 0),
        'total_depositos_count': depositos['count'],
        'total_retiradas': str(retiradas['total'] or 0),
        'total_retiradas_count': retiradas['count'],
        'total_pagamentos_saldo': str(pagamentos_saldo['total'] or 0),
        'total_pagamentos_count': pagamentos_saldo['count'],
        'depositos_app': {
            'total': str(depositos_app['total'] or 0),
            'count': depositos_app['count'],
            'por_metodo': [
                {'metodo': metodo_labels.get(m['metodo'], m['metodo']), 'total': str(m['total']), 'count': m['count']}
                for m in por_metodo_app
            ],
        },
        'depositos_caixa': {
            'total': str(depositos_caixa['total'] or 0),
            'count': depositos_caixa['count'],
            'por_metodo': [
                {'metodo': metodo_labels.get(m['metodo'], m['metodo']), 'total': str(m['total']), 'count': m['count']}
                for m in por_metodo_caixa
            ],
        },
        'daily': [
            {
                'dia': d['dia'].strftime('%d/%m/%Y') if d['dia'] else '',
                'total': str(d['total']),
                'pedidos': d['pedidos']
            }
            for d in daily
        ],
        'top_products': [
            {
                'nome': p['product__nome'],
                'quantidade': p['total_qty'],
                'valor': str(p['total_valor'])
            }
            for p in top_products
        ],
        'por_metodo': [
            {
                'metodo': metodo_labels.get(m['metodo'], m['metodo']),
                'total': str(m['total']),
                'count': m['count']
            }
            for m in por_metodo
        ],
    })


@login_required
def api_caixa_daily_report(request):
    """Relatório diário simplificado para o caixa."""
    if request.user.user_type not in ['admin', 'caixa']:
        return JsonResponse({'error': 'Sem permissão'}, status=403)

    now = timezone.now()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    orders = Order.objects.filter(criado_em__gte=start)
    transactions = Transaction.objects.filter(criado_em__gte=start)

    # Totais de vendas
    totals = orders.aggregate(
        total_vendas=Sum('total'),
        total_pedidos=Count('id')
    )

    # Depósitos APENAS do caixa (presenciais)
    metodo_labels = dict(Transaction.METODO_CHOICES)
    dep_caixa = transactions.filter(tipo='deposito', origem='caixa')
    depositos_por_metodo = dep_caixa.values('metodo').annotate(
        total=Sum('valor'),
        count=Count('id')
    ).order_by('-total')

    # Total de depósitos do caixa
    depositos = dep_caixa.aggregate(
        total=Sum('valor'),
        count=Count('id')
    )

    # Top produtos do dia
    top_products = OrderItem.objects.filter(
        order__criado_em__gte=start
    ).values(
        'product__nome'
    ).annotate(
        total_qty=Sum('quantidade'),
        total_valor=Sum('subtotal')
    ).order_by('-total_qty')[:10]

    return JsonResponse({
        'data': now.strftime('%d/%m/%Y'),
        'total_vendas': str(totals['total_vendas'] or 0),
        'total_pedidos': totals['total_pedidos'],
        'total_depositos': str(depositos['total'] or 0),
        'total_depositos_count': depositos['count'],
        'por_metodo': [
            {
                'metodo': metodo_labels.get(m['metodo'], m['metodo']),
                'total': str(m['total']),
                'count': m['count']
            }
            for m in depositos_por_metodo
        ],
        'top_products': [
            {
                'nome': p['product__nome'],
                'quantidade': p['total_qty'],
                'valor': str(p['total_valor'])
            }
            for p in top_products
        ],
    })

