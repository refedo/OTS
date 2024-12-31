from django.shortcuts import render
from django.views.generic import ListView, DetailView
from django.utils import timezone
from .models import Project
from datetime import date

# Create your views here.

class ProjectTimelineView(ListView):
    model = Project
    template_name = 'core/project_timeline.html'
    context_object_name = 'projects'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        projects = context['projects']
        
        # Define all possible stages in order
        stages = [
            ('contract', 'Contract Signed', 'contract_date'),
            ('payment', 'Down Payment', 'down_payment_date'),
            ('design', 'Design Start', 'design_start_date'),
            ('design', 'Shop Drawings Approval', 'shop_drawing_approval_date'),
            ('production', 'Production Start', 'production_start_date'),
            ('quality', 'QC Inspection', 'qc_inspection_date'),
            ('actual', 'Project Completion', 'actual_end_date'),
        ]
        
        # Prepare timeline data for each project
        for project in projects:
            project.timeline_events = []
            
            # Add all stages, even if date is not set
            for category, event_name, date_field in stages:
                date_value = getattr(project, date_field)
                project.timeline_events.append({
                    'date': date_value,
                    'event': event_name,
                    'category': category,
                    'status': 'completed' if date_value else 'pending',
                    'order': stages.index((category, event_name, date_field))  # Keep original order
                })
            
            # Sort events by order (no date sorting needed since we want to keep the defined order)
            project.timeline_events.sort(key=lambda x: x['order'])
            
            # Calculate project status
            today = timezone.now().date()
            if not project.actual_start_date:
                project.status = 'Not Started'
                project.status_class = 'not-started'
            elif not project.actual_end_date:
                project.status = 'In Progress'
                project.status_class = 'in-progress'
                if project.planned_end_date and today > project.planned_end_date:
                    project.status = 'Delayed'
                    project.status_class = 'delayed'
            else:
                project.status = 'Completed'
                project.status_class = 'completed'
        
        return context
