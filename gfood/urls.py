from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from accounts import views as accounts_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', accounts_views.login_view, name='home'),
    path('login/', accounts_views.login_view, name='login'),
    path('register/', accounts_views.register_view, name='register'),
    path('logout/', accounts_views.logout_view, name='logout'),
    path('dashboard/', accounts_views.dashboard_view, name='dashboard'),
    path('', include('accounts.urls')),
    path('', include('products.urls')),
    path('', include('cards.urls')),
    path('', include('orders.urls')),
    path('', include('reports.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
