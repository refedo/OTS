from django.shortcuts import render
from django.views.generic import ListView, DetailView
from django.utils import timezone
from .models import Project
from datetime import date
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.shortcuts import get_object_or_404
import json

class ProjectTimelineView(ListView):
    model = Project
    template_name = 'core/project_timeline.html'
    context_object_name = 'projects'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        projects = context['projects']
        today = timezone.now().date()
        
        for project in projects:
            timeline_events = []
            
            # Add project events
            if project.contract_date:
                timeline_events.append({
                    'date': project.contract_date,
                    'event': 'Contract Signed',
                    'category': 'contract',
                    'building': None,
                    'completed': project.contract_date <= today
                })
            
            if project.down_payment_date:
                timeline_events.append({
                    'date': project.down_payment_date,
                    'event': 'Down Payment',
                    'category': 'payment',
                    'building': None,
                    'completed': project.down_payment_date <= today
                })
            
            # Add building events
            for building in project.buildings.all():
                # Design Phase
                if building.design_start_date:
                    timeline_events.append({
                        'date': building.design_start_date,
                        'event': f'Design Start',
                        'category': 'design',
                        'building': building.name,
                        'completed': building.design_start_date <= today
                    })
                if building.design_end_date:
                    timeline_events.append({
                        'date': building.design_end_date,
                        'event': f'Design End',
                        'category': 'design',
                        'building': building.name,
                        'completed': building.design_end_date <= today
                    })
                
                # Shop Drawing Phase
                if building.shop_drawing_start_date:
                    timeline_events.append({
                        'date': building.shop_drawing_start_date,
                        'event': f'Shop Drawing Start',
                        'category': 'shop_drawing',
                        'building': building.name,
                        'completed': building.shop_drawing_start_date <= today
                    })
                if building.shop_drawing_end_date:
                    timeline_events.append({
                        'date': building.shop_drawing_end_date,
                        'event': f'Shop Drawing End',
                        'category': 'shop_drawing',
                        'building': building.name,
                        'completed': building.shop_drawing_end_date <= today
                    })
                
                # Production Phase
                if building.production_start_date:
                    timeline_events.append({
                        'date': building.production_start_date,
                        'event': f'Production Start',
                        'category': 'production',
                        'building': building.name,
                        'completed': building.production_start_date <= today
                    })
                if building.production_end_date:
                    timeline_events.append({
                        'date': building.production_end_date,
                        'event': f'Production End',
                        'category': 'production',
                        'building': building.name,
                        'completed': building.production_end_date <= today
                    })
                
                # Erection Phase - only add if project is erectable AND building is erection applicable
                if project.erectable and building.erection_applicable:
                    if building.erection_start_date:
                        timeline_events.append({
                            'date': building.erection_start_date,
                            'event': f'Erection Start',
                            'category': 'erection',
                            'building': building.name,
                            'completed': building.erection_start_date <= today
                        })
                    if building.erection_end_date:
                        timeline_events.append({
                            'date': building.erection_end_date,
                            'event': f'Erection End',
                            'category': 'erection',
                            'building': building.name,
                            'completed': building.erection_end_date <= today
                        })
            
            # Sort events by date
            timeline_events.sort(key=lambda x: x['date'])
            project.timeline_events = timeline_events
            
            # Calculate project status
            all_buildings_completed = True
            any_building_started = False
            
            for building in project.buildings.all():
                if building.production_start_date and building.production_start_date <= today:
                    any_building_started = True
                if not (building.production_end_date and building.production_end_date <= today):
                    all_buildings_completed = False
            
            if not any_building_started:
                project.status = 'Not Started'
                project.status_class = 'not-started'
            elif all_buildings_completed:
                project.status = 'Completed'
                project.status_class = 'completed'
            else:
                project.status = 'In Progress'
                project.status_class = 'in-progress'
        
        return context

@require_POST
def update_project_erectable(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    data = json.loads(request.body)
    project.erectable = data.get('erectable', False)
    project.save()
    
    # If not erectable, clear erection dates and subcontractor
    if not project.erectable:
        for building in project.buildings.all():
            building.erection_start_date = None
            building.erection_end_date = None
            building.erection_applicable = False
            building.subcontractor_name = ''
            building.save()
    
    return JsonResponse({'status': 'success'})
