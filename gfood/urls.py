from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from accounts import views as accounts_views
import os

urlpatterns = [
    # PWA: Service Worker e Manifest precisam ficar na raiz
    path('sw.js', serve, {'document_root': os.path.join(settings.BASE_DIR, 'static'), 'path': 'sw.js'}, name='sw'),
    path('manifest.json', serve, {'document_root': os.path.join(settings.BASE_DIR, 'static'), 'path': 'manifest.json'}, name='manifest'),
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
