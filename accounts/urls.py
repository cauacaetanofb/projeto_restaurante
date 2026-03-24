from django.urls import path
from . import views

urlpatterns = [
    path('api/staff/', views.api_list_staff, name='api_list_staff'),
    path('api/staff/create/', views.api_create_staff, name='api_create_staff'),
    path('api/staff/<int:user_id>/update/', views.api_update_staff, name='api_update_staff'),
    path('api/staff/<int:user_id>/delete/', views.api_delete_staff, name='api_delete_staff'),
    path('api/clients/', views.api_list_clients, name='api_list_clients'),
    path('api/clients/<int:client_id>/update/', views.api_update_client, name='api_update_client'),
    path('api/clients/<int:client_id>/delete/', views.api_delete_client, name='api_delete_client'),
    path('api/profile/', views.api_my_profile, name='api_my_profile'),
    path('api/profile/update/', views.api_update_my_profile, name='api_update_my_profile'),
    path('api/forgot-password/', views.api_forgot_password, name='api_forgot_password'),
    path('api/reset-password/', views.api_verify_reset_code, name='api_verify_reset_code'),
]
