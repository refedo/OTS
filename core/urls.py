from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    path('timeline/', views.ProjectTimelineView.as_view(), name='project_timeline'),
]
