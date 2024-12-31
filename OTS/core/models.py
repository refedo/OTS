from django.db import models
from django.utils import timezone

# Create your models here.

class Project(models.Model):
    STRUCTURE_TYPE_CHOICES = [
        ('INDUSTRIAL', 'Industrial Building'),
        ('COMMERCIAL', 'Commercial Building'),
        ('RESIDENTIAL', 'Residential Building'),
        ('WAREHOUSE', 'Warehouse'),
        ('OTHER', 'Other'),
    ]

    INCOTERM_CHOICES = [
        ('EXW', 'Ex Works'),
        ('FOB', 'Free on Board'),
        ('CIF', 'Cost, Insurance, and Freight'),
        ('DDP', 'Delivered Duty Paid'),
    ]

    PROJECT_NATURE_CHOICES = [
        ('NEW', 'New Construction'),
        ('EXPANSION', 'Expansion'),
        ('RENOVATION', 'Renovation'),
        ('MAINTENANCE', 'Maintenance'),
    ]

    WELDING_PROCESS_CHOICES = [
        ('SMAW', 'Shielded Metal Arc Welding'),
        ('GMAW', 'Gas Metal Arc Welding'),
        ('FCAW', 'Flux Cored Arc Welding'),
        ('SAW', 'Submerged Arc Welding'),
    ]

    # ID field will be created automatically by Django
    
    # Basic Project Information
    estimation_number = models.CharField('Estimation #', max_length=20, unique=True)
    project_number = models.CharField('Project #', max_length=20, unique=True)
    name = models.CharField('Project Name', max_length=200)
    project_manager = models.CharField('Project Manager', max_length=100, null=True, blank=True)
    client_name = models.CharField('Client Name', max_length=200)
    erectable = models.BooleanField('Erectable', default=True, help_text='Check if this project includes erection scope')

    # Project Dates
    contract_date = models.DateField('Contract Date', null=True, blank=True)
    down_payment_date = models.DateField('Down Payment Date', null=True, blank=True)

    # Project Details
    structure_type = models.CharField('Structure Type', max_length=50, choices=STRUCTURE_TYPE_CHOICES)
    @property
    def number_of_structures(self):
        """Calculate number of structures based on number of buildings."""
        return self.buildings.count()
    erection_subcontractor = models.CharField('Erection Subcontractor', max_length=100, blank=True)

    # Payment Information
    contract_amount = models.DecimalField('Contract Amount', max_digits=12, decimal_places=2, default=0)
    down_payment_percentage = models.DecimalField('Down Payment %', max_digits=5, decimal_places=2, default=20, help_text='Enter percentage (e.g., 20 for 20%)')
    down_payment = models.DecimalField('Down Payment Amount', max_digits=12, decimal_places=2, default=0, editable=False)
    down_payment_ack = models.BooleanField('Down Payment Ack', default=False)
    payment_2 = models.DecimalField('Payment 2', max_digits=10, decimal_places=2, null=True, blank=True, default=0)
    payment_2_ack = models.BooleanField('Payment 2 Ack', default=False)
    payment_3 = models.DecimalField('Payment 3', max_digits=10, decimal_places=2, null=True, blank=True, default=0)
    payment_3_ack = models.BooleanField('Payment 3 Ack', default=False)
    payment_4 = models.DecimalField('Payment 4', max_digits=10, decimal_places=2, null=True, blank=True, default=0)
    payment_4_ack = models.BooleanField('Payment 4 Ack', default=False)
    payment_5 = models.DecimalField('Payment 5', max_digits=10, decimal_places=2, null=True, blank=True, default=0)
    payment_5_ack = models.BooleanField('Payment 5 Ack', default=False)

    # Retention Information
    preliminary_retention = models.DecimalField('Preliminary Retention', max_digits=10, decimal_places=2, null=True, blank=True, default=0)
    ho_retention = models.DecimalField('H.O Retention', max_digits=10, decimal_places=2, null=True, blank=True, default=0)

    # Commercial Terms
    incoterm = models.CharField('Incoterm', max_length=20, choices=INCOTERM_CHOICES)
    scope_of_work = models.TextField('Scope of Work')
    project_nature = models.CharField('Project Nature', max_length=20, choices=PROJECT_NATURE_CHOICES)

    # Technical Details
    contractual_tonnage = models.DecimalField('Contractual Tonnage', max_digits=10, decimal_places=2, default=0)
    engineering_tonnage = models.DecimalField('Engineering Tonnage', max_digits=10, decimal_places=2, null=True, blank=True, default=0)
    galvanized = models.BooleanField('Galvanized', default=False)
    galvanization_microns = models.IntegerField('Galvanization Microns', null=True, blank=True, default=0)
    area = models.DecimalField('Area', max_digits=10, decimal_places=2, default=0)
    m2_per_ton = models.DecimalField('m2/Ton', max_digits=10, decimal_places=2, default=0)

    # Paint Details
    paint_coat_1 = models.CharField('Paint Coat 1', max_length=100, null=True, blank=True, default='')
    coat_1_microns = models.IntegerField('Coat 1 - Microns', null=True, blank=True, default=0)
    coat_1_liters_needed = models.DecimalField('Liters Needed', max_digits=10, decimal_places=2, null=True, blank=True, default=0)

    paint_coat_2 = models.CharField('Paint Coat 2', max_length=100, null=True, blank=True, default='')
    coat_2_microns = models.IntegerField('Coat 2 - Microns', null=True, blank=True, default=0)
    coat_2_liters_needed = models.DecimalField('Liters Needed', max_digits=10, decimal_places=2, null=True, blank=True, default=0)

    paint_coat_3 = models.CharField('Paint Coat 3', max_length=100, null=True, blank=True, default='')
    coat_3_microns = models.IntegerField('Coat 3 - Microns', null=True, blank=True, default=0)
    coat_3_liters_needed = models.DecimalField('Liters Needed', max_digits=10, decimal_places=2, null=True, blank=True, default=0)

    paint_coat_4 = models.CharField('Paint Coat 4', max_length=100, null=True, blank=True, default='')
    coat_4_microns = models.IntegerField('Coat 4 - Microns', null=True, blank=True, default=0)
    coat_4_liters_needed = models.DecimalField('Liters Needed', max_digits=10, decimal_places=2, null=True, blank=True, default=0)

    top_coat_ral_number = models.CharField('Top Coat RAL Number', max_length=20, null=True, blank=True, default='')

    # Welding Details
    welding_process = models.CharField('Welding Process', max_length=20, choices=WELDING_PROCESS_CHOICES)
    welding_wire_aws_class = models.CharField('Welding Wire AWS Class', max_length=50, default='')
    pqr_no = models.CharField('PQR NO', max_length=50, default='')
    wps_no = models.CharField('WPS NO', max_length=50, default='')
    standard_code = models.CharField('Standard Code', max_length=50, default='')

    def __str__(self):
        return f"{self.project_number} - {self.name}"

    def save(self, *args, **kwargs):
        # If project is not erectable, ensure erection fields are cleared
        if not self.erectable:
            self.erection_start_date = None
            self.erection_end_date = None
            self.erection_applicable = False
            self.subcontractor_name = ''
            
            # Clear erection fields for all buildings
            for building in self.buildings.all():
                building.erection_start_date = None
                building.erection_end_date = None
                building.erection_applicable = False
                building.subcontractor_name = ''
                building.save()
        
        # Calculate down payment amount based on percentage
        if self.contract_amount and self.down_payment_percentage:
            self.down_payment = (self.contract_amount * self.down_payment_percentage) / 100
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = 'Project'
        verbose_name_plural = 'Projects'

class Building(models.Model):
    # Relations
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='buildings')
    
    # Basic Information
    name = models.CharField('Building Name', max_length=100)
    
    # Responsible Parties
    subcontractor_name = models.CharField('Subcontractor Name', max_length=100, blank=True, default='')
    designer_name = models.CharField('Designer Name', max_length=100, null=True, blank=True, default='')
    
    # Tonnage
    calculated_tonnage = models.DecimalField('Calculated Tonnage', max_digits=10, decimal_places=2, default=0)

    # Design Phase
    design_start_date = models.DateField('Design Start Date', null=True, blank=True)
    design_end_date = models.DateField('Design End Date', null=True, blank=True)
    
    # Shop Drawing Phase
    shop_drawing_start_date = models.DateField('Shop Drawing Start Date', null=True, blank=True)
    shop_drawing_end_date = models.DateField('Shop Drawing End Date', null=True, blank=True)
    
    # Production Phase
    production_start_date = models.DateField('Production Start Date', null=True, blank=True)
    production_end_date = models.DateField('Production End Date', null=True, blank=True)
    
    # Erection Phase
    erection_applicable = models.BooleanField('Erection Applicable', default=True)
    erection_start_date = models.DateField('Erection Start Date', null=True, blank=True)
    erection_end_date = models.DateField('Erection End Date', null=True, blank=True)

    def save(self, *args, **kwargs):
        # Set erection_applicable based on project's erectable flag
        if not self.pk:  # Only on creation
            self.erection_applicable = self.project.erectable
        super().save(*args, **kwargs)

    def update_tonnage(self):
        """Calculate total tonnage from related raw data entries"""
        total_weight = self.raw_data.aggregate(
            total=models.Sum('net_weight_all')
        )['total'] or 0
        self.calculated_tonnage = total_weight / 1000  # Convert from kg to tonnes
        self.save()

    def __str__(self):
        return f"{self.project.project_number} - {self.name}"

    class Meta:
        verbose_name = 'Building'
        verbose_name_plural = 'Buildings'
        unique_together = ['project', 'name']

class RawData(models.Model):
    # Project and Building References
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='raw_data')
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='raw_data')
    
    # Part Identification
    log_designation = models.CharField('Log Designation', max_length=100)
    part_designation = models.CharField('Part Designation', max_length=100)
    assembly_mark = models.CharField('Assembly Mark', max_length=100)
    sub_assembly_mark = models.CharField('Sub-Assembly Mark', max_length=100, blank=True, default='')
    part_mark = models.CharField('Part Mark', max_length=100)
    
    # Part Details
    quantity = models.IntegerField('Quantity', default=0)
    name = models.CharField('Name', max_length=200)
    profile = models.CharField('Profile', max_length=100)
    grade = models.CharField('Grade', max_length=50)
    length = models.DecimalField('Length (mm)', max_digits=10, decimal_places=2, default=0)
    
    # Area Calculations
    net_area_single = models.DecimalField('Net Area (m²) for one', max_digits=10, decimal_places=2, default=0)
    net_area_all = models.DecimalField('Net Area (m²) for all', max_digits=10, decimal_places=2, default=0)
    
    # Weight Calculations
    single_part_weight = models.DecimalField('Single Part Weight', max_digits=10, decimal_places=2, default=0)
    net_weight_all = models.DecimalField('Net Weight (kg) for all', max_digits=10, decimal_places=2, default=0)
    
    # Revision
    revision_number = models.CharField('Revision #', max_length=20, default='')
    
    # Timestamps for tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.project.project_number} - {self.part_designation}"
    
    def save(self, *args, **kwargs):
        # Auto-calculate total area and weight
        self.net_area_all = self.net_area_single * self.quantity
        self.net_weight_all = self.single_part_weight * self.quantity
        super().save(*args, **kwargs)
        # Update building tonnage
        self.building.update_tonnage()
    
    def delete(self, *args, **kwargs):
        building = self.building
        super().delete(*args, **kwargs)
        # Update building tonnage after deletion
        building.update_tonnage()
    
    class Meta:
        verbose_name = 'Raw Data'
        verbose_name_plural = 'Raw Data'
        ordering = ['project', 'building', 'assembly_mark', 'part_mark']

class ProductionLog(models.Model):
    # References
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='production_logs')
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='production_logs')
    raw_data = models.ForeignKey(RawData, on_delete=models.CASCADE, related_name='production_logs')
    
    # Production Details
    production_date = models.DateField('Production Date')
    quantity_produced = models.IntegerField('Quantity Produced', default=0)
    
    # Optional Notes
    notes = models.TextField('Notes', blank=True, default='')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update project's actual start date if this is the first production log
        if not self.project.actual_start_date:
            earliest_log = ProductionLog.objects.filter(project=self.project).order_by('production_date').first()
            if earliest_log:
                self.project.actual_start_date = earliest_log.production_date
                self.project.save()
    
    class Meta:
        verbose_name = 'Production Log'
        verbose_name_plural = 'Production Logs'
        ordering = ['-production_date', 'project', 'building']

    def __str__(self):
        return f"{self.project.project_number} - {self.building.name} - {self.raw_data.part_mark} ({self.production_date})"
