import base64
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from .models import Product, Category


def _image_to_base64(image_file):
    """Converte um arquivo de imagem para string base64 com data URI."""
    if not image_file:
        return None
    content = image_file.read()
    content_type = getattr(image_file, 'content_type', 'image/jpeg')
    b64 = base64.b64encode(content).decode('utf-8')
    return f'data:{content_type};base64,{b64}'


def _get_product_image(product):
    """Retorna a URL da imagem do produto (base64 ou media URL)."""
    if product.imagem_base64:
        return product.imagem_base64
    if product.imagem:
        return product.imagem.url
    return None


@login_required
def api_list_products(request):
    products = Product.objects.filter(disponivel=True).select_related('categoria')
    data = []
    for p in products:
        data.append({
            'id': p.id,
            'nome': p.nome,
            'descricao': p.descricao,
            'preco': str(p.preco),
            'categoria': p.categoria.nome if p.categoria else 'Sem categoria',
            'categoria_id': p.categoria_id,
            'imagem': _get_product_image(p),
            'disponivel': p.disponivel,
        })
    return JsonResponse({'products': data})


@login_required
def api_all_products(request):
    """Lista todos os produtos (inclusive indisponíveis) para admin."""
    if request.user.user_type != 'admin':
        return JsonResponse({'error': 'Sem permissão'}, status=403)
    products = Product.objects.all().select_related('categoria')
    data = []
    for p in products:
        data.append({
            'id': p.id,
            'nome': p.nome,
            'descricao': p.descricao,
            'preco': str(p.preco),
            'categoria': p.categoria.nome if p.categoria else 'Sem categoria',
            'categoria_id': p.categoria_id,
            'disponivel': p.disponivel,
            'imagem': _get_product_image(p),
        })
    return JsonResponse({'products': data})


@login_required
@require_POST
def api_create_product(request):
    if request.user.user_type != 'admin':
        return JsonResponse({'error': 'Sem permissão'}, status=403)
    nome = request.POST.get('nome', '')
    descricao = request.POST.get('descricao', '')
    preco = request.POST.get('preco', '0')
    categoria_nome = request.POST.get('categoria', '')
    imagem = request.FILES.get('imagem')

    categoria = None
    if categoria_nome:
        categoria, _ = Category.objects.get_or_create(nome=categoria_nome)

    # Converter imagem para base64
    imagem_base64 = _image_to_base64(imagem)

    product = Product.objects.create(
        nome=nome,
        descricao=descricao,
        preco=preco,
        categoria=categoria,
        imagem_base64=imagem_base64,
    )
    return JsonResponse({
        'success': True,
        'product': {
            'id': product.id,
            'nome': product.nome,
            'preco': str(product.preco),
            'categoria': categoria.nome if categoria else 'Sem categoria',
            'disponivel': product.disponivel,
            'imagem': _get_product_image(product),
        }
    })


@login_required
@require_POST
def api_update_product(request, product_id):
    if request.user.user_type != 'admin':
        return JsonResponse({'error': 'Sem permissão'}, status=403)
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return JsonResponse({'error': 'Produto não encontrado'}, status=404)

    product.nome = request.POST.get('nome', product.nome)
    product.descricao = request.POST.get('descricao', product.descricao)
    product.preco = request.POST.get('preco', product.preco)
    disponivel = request.POST.get('disponivel')
    if disponivel is not None:
        product.disponivel = disponivel == 'true'

    categoria_nome = request.POST.get('categoria', '')
    if categoria_nome:
        categoria, _ = Category.objects.get_or_create(nome=categoria_nome)
        product.categoria = categoria

    # Atualizar imagem se enviada
    imagem = request.FILES.get('imagem')
    if imagem:
        product.imagem_base64 = _image_to_base64(imagem)

    product.save()
    return JsonResponse({'success': True})


@login_required
@require_POST
def api_delete_product(request, product_id):
    if request.user.user_type != 'admin':
        return JsonResponse({'error': 'Sem permissão'}, status=403)
    try:
        Product.objects.get(id=product_id).delete()
        return JsonResponse({'success': True})
    except Product.DoesNotExist:
        return JsonResponse({'error': 'Produto não encontrado'}, status=404)
