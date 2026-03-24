from django.urls import path
from . import views

urlpatterns = [
    path('api/orders/create/', views.api_create_order, name='api_create_order'),
]
