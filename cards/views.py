import base64
import io
import qrcode
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
import json

from .models import Card, Transaction


def generate_qr_base64(data_str):
    """Gera QR Code em base64 para exibir no frontend."""
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(data_str)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


@login_required
def api_my_card(request):
    """Retorna o cartão do cliente logado."""
    if request.user.user_type not in ('cliente', 'admin'):
        return JsonResponse({'error': 'Sem permissão'}, status=403)
    card, created = Card.objects.get_or_create(user=request.user)
    qr_b64 = generate_qr_base64(str(card.qr_code_data))
    return JsonResponse({
        'card': {
            'id': card.id,
            'saldo': str(card.saldo),
            'qr_code_data': str(card.qr_code_data),
            'qr_code_image': qr_b64,
        }
    })


@login_required
def api_check_balance(request):
    """Consulta saldo por QR code data (UUID)."""
    qr_data = request.GET.get('qr_data', '')
    try:
        card = Card.objects.get(qr_code_data=qr_data)
        nome = card.nome if card.is_temporary else (card.user.get_full_name() if card.user else 'N/A')
        return JsonResponse({
            'card': {
                'id': card.id,
                'nome': nome,
                'saldo': str(card.saldo),
                'qr_code_data': str(card.qr_code_data),
                'is_temporary': card.is_temporary,
            }
        })
    except Card.DoesNotExist:
        return JsonResponse({'error': 'Cartão não encontrado'}, status=404)


@login_required
@require_POST
def api_add_balance(request):
    """Adiciona saldo ao cartão (caixa/admin)."""
    data = json.loads(request.body)
    qr_data = data.get('qr_data', '')
    valor = data.get('valor', 0)
    metodo = data.get('metodo', 'dinheiro')
    try:
        valor = float(valor)
        if valor <= 0:
            return JsonResponse({'error': 'Valor deve ser positivo'}, status=400)
    except (ValueError, TypeError):
        return JsonResponse({'error': 'Valor inválido'}, status=400)

    try:
        card = Card.objects.get(qr_code_data=qr_data)
        card.saldo += round(valor, 2)
        card.save()
        Transaction.objects.create(
            card=card,
            tipo='deposito',
            valor=round(valor, 2),
            metodo=metodo,
            origem='caixa',
            descricao=f'Recarga presencial via {dict(Transaction.METODO_CHOICES).get(metodo, metodo)}',
            operador=request.user,
        )
        return JsonResponse({'success': True, 'novo_saldo': str(card.saldo)})
    except Card.DoesNotExist:
        return JsonResponse({'error': 'Cartão não encontrado'}, status=404)


@login_required
@require_POST
def api_remove_balance(request):
    """Remove saldo do cartão."""
    if request.user.user_type not in ['admin', 'caixa']:
        return JsonResponse({'error': 'Sem permissão'}, status=403)
    data = json.loads(request.body)
    qr_data = data.get('qr_data', '')
    valor = data.get('valor', 0)
    metodo = data.get('metodo', 'dinheiro')
    try:
        valor = float(valor)
        if valor <= 0:
            return JsonResponse({'error': 'Valor deve ser positivo'}, status=400)
    except (ValueError, TypeError):
        return JsonResponse({'error': 'Valor inválido'}, status=400)

    try:
        card = Card.objects.get(qr_code_data=qr_data)
        if float(card.saldo) < valor:
            return JsonResponse({'error': 'Saldo insuficiente'}, status=400)
        card.saldo -= round(valor, 2)
        card.save()
        Transaction.objects.create(
            card=card,
            tipo='retirada',
            valor=round(valor, 2),
            metodo=metodo,
            descricao='Retirada de saldo',
            operador=request.user,
        )
        return JsonResponse({'success': True, 'novo_saldo': str(card.saldo)})
    except Card.DoesNotExist:
        return JsonResponse({'error': 'Cartão não encontrado'}, status=404)


@login_required
@require_POST
def api_create_temp_card(request):
    """Caixa cria cartão temporário vinculado a QR físico com saldo inicial."""
    if request.user.user_type not in ['admin', 'caixa']:
        return JsonResponse({'error': 'Sem permissão'}, status=403)
    data = json.loads(request.body)
    nome = data.get('nome', '')
    cpf = data.get('cpf', '')
    telefone = data.get('telefone', '')
    qr_data = data.get('qr_data', '')
    valor = data.get('valor', 0)
    metodo = data.get('metodo', 'dinheiro')
    if not nome:
        return JsonResponse({'error': 'Nome é obrigatório'}, status=400)

    try:
        valor = float(valor)
        if valor <= 0:
            return JsonResponse({'error': 'Valor deve ser positivo'}, status=400)
    except (ValueError, TypeError):
        return JsonResponse({'error': 'Valor inválido'}, status=400)

    # Se o QR de um cartão físico foi escaneado, vincular a ele
    card = None
    if qr_data:
        try:
            card = Card.objects.get(qr_code_data=qr_data)
            # Atualizar como temporário com dados do cliente
            card.is_temporary = True
            card.nome = nome
            card.cpf = cpf
            card.telefone = telefone
            card.saldo += round(valor, 2)
            card.save()
        except Card.DoesNotExist:
            return JsonResponse({'error': 'QR Code do cartão físico não encontrado'}, status=404)
    else:
        card = Card.objects.create(
            is_temporary=True,
            nome=nome,
            cpf=cpf,
            telefone=telefone,
            saldo=round(valor, 2),
        )

    # Registrar depósito inicial
    Transaction.objects.create(
        card=card,
        tipo='deposito',
        valor=round(valor, 2),
        metodo=metodo,
        origem='caixa',
        descricao=f'Recarga presencial — novo cartão para {nome}',
        operador=request.user,
    )

    qr_b64 = generate_qr_base64(str(card.qr_code_data))
    return JsonResponse({
        'success': True,
        'card': {
            'id': card.id,
            'nome': card.nome,
            'saldo': str(card.saldo),
            'qr_code_data': str(card.qr_code_data),
            'qr_code_image': qr_b64,
        }
    })


@login_required
@require_POST
def api_client_add_balance(request):
    """Cliente adiciona saldo ao próprio cartão."""
    if request.user.user_type not in ('cliente', 'admin'):
        return JsonResponse({'error': 'Sem permissão'}, status=403)
    data = json.loads(request.body)
    valor = data.get('valor', 0)
    metodo = data.get('metodo', 'pix')
    try:
        valor = float(valor)
        if valor <= 0:
            return JsonResponse({'error': 'Valor deve ser positivo'}, status=400)
    except (ValueError, TypeError):
        return JsonResponse({'error': 'Valor inválido'}, status=400)

    card, _ = Card.objects.get_or_create(user=request.user)
    card.saldo += round(valor, 2)
    card.save()
    Transaction.objects.create(
        card=card,
        tipo='deposito',
        valor=round(valor, 2),
        metodo=metodo,
        origem='app',
        descricao=f'Recarga pelo app via {dict(Transaction.METODO_CHOICES).get(metodo, metodo)}',
        operador=request.user,
    )
    return JsonResponse({'success': True, 'novo_saldo': str(card.saldo)})


@login_required
def api_client_transactions(request, client_id):
    """Admin: retorna transações de um cliente."""
    if request.user.user_type != 'admin':
        return JsonResponse({'error': 'Sem permissão'}, status=403)
    try:
        card = Card.objects.get(user_id=client_id)
    except Card.DoesNotExist:
        return JsonResponse({'transactions': []})

    tipo_labels = dict(Transaction.TIPO_CHOICES)
    metodo_labels = dict(Transaction.METODO_CHOICES)

    txns = card.transactions.all()[:50]
    data = []
    for t in txns:
        data.append({
            'id': t.id,
            'tipo': t.tipo,
            'tipo_label': tipo_labels.get(t.tipo, t.tipo),
            'valor': str(t.valor),
            'metodo': t.metodo,
            'metodo_label': metodo_labels.get(t.metodo, t.metodo),
            'descricao': t.descricao,
            'data': t.criado_em.strftime('%d/%m/%Y %H:%M'),
        })
    return JsonResponse({'transactions': data, 'saldo': str(card.saldo)})


@login_required
def api_my_transactions(request):
    """Cliente: retorna suas próprias transações."""
    if request.user.user_type not in ('cliente', 'admin'):
        return JsonResponse({'error': 'Sem permissão'}, status=403)
    try:
        card = Card.objects.get(user=request.user)
    except Card.DoesNotExist:
        return JsonResponse({'transactions': [], 'saldo': '0.00'})

    tipo_labels = dict(Transaction.TIPO_CHOICES)
    metodo_labels = dict(Transaction.METODO_CHOICES)

    txns = card.transactions.all()[:100]
    data = []
    for t in txns:
        data.append({
            'id': t.id,
            'tipo': t.tipo,
            'tipo_label': tipo_labels.get(t.tipo, t.tipo),
            'valor': str(t.valor),
            'metodo': t.metodo,
            'metodo_label': metodo_labels.get(t.metodo, t.metodo),
            'descricao': t.descricao,
            'data': t.criado_em.strftime('%d/%m/%Y %H:%M'),
        })
    return JsonResponse({'transactions': data, 'saldo': str(card.saldo)})

