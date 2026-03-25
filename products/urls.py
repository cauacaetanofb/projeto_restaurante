from django.urls import path
from . import views

urlpatterns = [
    path('api/products/', views.api_list_products, name='api_list_products'),
    path('api/products/all/', views.api_all_products, name='api_all_products'),
    path('api/products/create/', views.api_create_product, name='api_create_product'),
    path('api/products/<int:product_id>/update/', views.api_update_product, name='api_update_product'),
    path('api/products/<int:product_id>/delete/', views.api_delete_product, name='api_delete_product'),
]
