from django.urls import path
from . import views

urlpatterns = [
    path('api/cards/my/', views.api_my_card, name='api_my_card'),
    path('api/cards/balance/', views.api_check_balance, name='api_check_balance'),
    path('api/cards/balance/add/', views.api_add_balance, name='api_add_balance'),
    path('api/cards/balance/remove/', views.api_remove_balance, name='api_remove_balance'),
    path('api/cards/temp/create/', views.api_create_temp_card, name='api_create_temp_card'),
    path('api/cards/client/add/', views.api_client_add_balance, name='api_client_add_balance'),
    path('api/cards/client/<int:client_id>/transactions/', views.api_client_transactions, name='api_client_transactions'),
    path('api/cards/my/transactions/', views.api_my_transactions, name='api_my_transactions'),
    path('api/cards/search-cpf/', views.api_search_by_cpf, name='api_search_by_cpf'),
    path('api/cards/block/', views.api_block_card, name='api_block_card'),
    path('api/cards/transfer/', views.api_transfer_balance, name='api_transfer_balance'),
    # Asaas
    path('api/asaas/create-payment/', views.api_asaas_create_payment, name='api_asaas_create_payment'),
    path('api/asaas/webhook/', views.api_asaas_webhook, name='api_asaas_webhook'),
    path('api/asaas/check-payment/<int:recarga_id>/', views.api_asaas_check_payment, name='api_asaas_check_payment'),
]
