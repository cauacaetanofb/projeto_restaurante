from django.urls import path
from . import views

urlpatterns = [
    path('api/reports/sales/', views.api_sales_report, name='api_sales_report'),
    path('api/reports/daily/', views.api_caixa_daily_report, name='api_caixa_daily_report'),
    path('api/reports/transactions/', views.api_all_transactions, name='api_all_transactions'),
]
