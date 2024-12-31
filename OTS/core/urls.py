from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    path('timeline/', views.ProjectTimelineView.as_view(), name='project_timeline'),
    path('api/project/<int:project_id>/update-erectable/', views.update_project_erectable, name='update_project_erectable'),
]
