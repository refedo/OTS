from django.core.management.base import BaseCommand
from core.models import Project
from datetime import date, timedelta
import random

class Command(BaseCommand):
    help = 'Creates sample projects for testing'

    def handle(self, *args, **options):
        # Sample data
        client_names = ['ABC Industries', 'XYZ Corporation', 'Global Builders', 'Tech Structures', 'Modern Construction']
        project_managers = ['John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis', 'David Wilson']
        subcontractors = ['Fast Erectors Ltd', 'Pro Build Co', 'Steel Masters', 'Construction Experts', 'Build Right Inc']
        paint_types = ['Epoxy', 'Polyurethane', 'Zinc Rich', 'Alkyd', 'Acrylic']
        
        # Create 5 sample projects
        for i in range(1, 6):
            # Generate dates
            contract_date = date.today() - timedelta(days=random.randint(30, 180))
            down_payment_date = contract_date + timedelta(days=random.randint(5, 15))
            planned_start = contract_date + timedelta(days=random.randint(20, 40))
            planned_end = planned_start + timedelta(days=random.randint(90, 180))
            
            # Create project
            project = Project.objects.create(
                estimation_number=f'EST-{i:03d}',
                project_number=f'PRJ-{i:03d}',
                name=f'Sample Project {i}',
                project_manager=random.choice(project_managers),
                client_name=random.choice(client_names),
                contract_date=contract_date,
                down_payment_date=down_payment_date,
                planned_start_date=planned_start,
                planned_end_date=planned_end,
                structure_type=random.choice(['INDUSTRIAL', 'COMMERCIAL', 'WAREHOUSE']),
                number_of_structures=random.randint(1, 5),
                erection_subcontractor=random.choice(subcontractors),
                
                # Payment information
                down_payment=random.randint(50000, 200000),
                down_payment_ack=random.choice([True, False]),
                payment_2=random.randint(100000, 300000),
                payment_2_ack=random.choice([True, False]),
                payment_3=random.randint(100000, 300000),
                payment_3_ack=random.choice([True, False]),
                
                # Commercial terms
                incoterm=random.choice(['EXW', 'FOB', 'CIF']),
                scope_of_work=f'Sample scope of work for project {i}',
                project_nature=random.choice(['NEW', 'EXPANSION', 'RENOVATION']),
                
                # Technical details
                contractual_tonnage=random.randint(100, 1000),
                engineering_tonnage=random.randint(100, 1000),
                galvanized=random.choice([True, False]),
                galvanization_microns=random.randint(50, 100) if random.choice([True, False]) else None,
                area=random.randint(1000, 5000),
                m2_per_ton=random.uniform(10.0, 20.0),
                
                # Paint details
                paint_coat_1=random.choice(paint_types),
                coat_1_microns=random.randint(50, 100),
                coat_1_liters_needed=random.uniform(100.0, 500.0),
                
                paint_coat_2=random.choice(paint_types),
                coat_2_microns=random.randint(50, 100),
                coat_2_liters_needed=random.uniform(100.0, 500.0),
                
                # Welding details
                welding_process=random.choice(['SMAW', 'GMAW', 'FCAW']),
                welding_wire_aws_class=f'E{random.randint(60, 70)}XX',
                pqr_no=f'PQR-{random.randint(100, 999)}',
                wps_no=f'WPS-{random.randint(100, 999)}',
                standard_code=f'STD-{random.randint(100, 999)}'
            )
            
            self.stdout.write(self.style.SUCCESS(f'Successfully created project "{project.name}"'))
