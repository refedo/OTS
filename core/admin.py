from django.contrib import admin
from .models import Project, Building, RawData, ProductionLog

class BuildingInline(admin.TabularInline):
    model = Building
    extra = 0  # Don't show empty forms
    fields = ('name', 'designer_name', 'subcontractor_name', 'calculated_tonnage', 
              'design_start_date', 'design_end_date', 
              'production_start_date', 'production_end_date')
    readonly_fields = ('calculated_tonnage',)
    show_change_link = True  # Allows clicking through to the full building detail

    def get_formset(self, request, obj=None, **kwargs):
        formset = super().get_formset(request, obj, **kwargs)
        formset.request = request
        return formset

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('id', 'project_number', 'estimation_number', 'name', 'client_name', 'structure_type', 'project_nature', 'erectable')
    list_filter = ('structure_type', 'project_nature', 'galvanized', 'erectable')
    search_fields = ('project_number', 'estimation_number', 'name', 'client_name')
    readonly_fields = ('id', 'actual_start_date')
    inlines = [BuildingInline]
    
    fieldsets = (
        ('Project Identification', {
            'fields': (
                'id',
                'estimation_number',
                'project_number',
                'name',
                'project_manager',
                'client_name',
                'erectable'
            )
        }),
        ('Project Timeline', {
            'fields': (
                'contract_date',
                'down_payment_date',
                'design_start_date',
                'shop_drawing_approval_date',
                'production_start_date',
                'qc_inspection_date',
                'planned_start_date',
                'planned_end_date',
                'actual_start_date',
                'actual_end_date'
            )
        }),
        ('Structure Information', {
            'fields': (
                'structure_type',
                'number_of_structures',
                'erection_subcontractor'
            )
        }),
        ('Financial Information', {
            'classes': ('collapse',),
            'fields': (
                ('down_payment', 'down_payment_ack'),
                ('payment_2', 'payment_2_ack'),
                ('payment_3', 'payment_3_ack'),
                ('payment_4', 'payment_4_ack'),
                ('payment_5', 'payment_5_ack'),
                'preliminary_retention',
                'ho_retention'
            )
        }),
        ('Commercial Terms', {
            'fields': (
                'incoterm',
                'scope_of_work',
                'project_nature'
            )
        }),
        ('Technical Specifications', {
            'classes': ('collapse',),
            'fields': (
                'contractual_tonnage',
                'engineering_tonnage',
                'galvanized',
                'galvanization_microns',
                'area',
                'm2_per_ton'
            )
        }),
        ('Paint System', {
            'classes': ('collapse',),
            'fields': (
                ('paint_coat_1', 'coat_1_microns', 'coat_1_liters_needed'),
                ('paint_coat_2', 'coat_2_microns', 'coat_2_liters_needed'),
                ('paint_coat_3', 'coat_3_microns', 'coat_3_liters_needed'),
                ('paint_coat_4', 'coat_4_microns', 'coat_4_liters_needed'),
                'top_coat_ral_number'
            )
        }),
        ('Welding Information', {
            'classes': ('collapse',),
            'fields': (
                'welding_process',
                'welding_wire_aws_class',
                'pqr_no',
                'wps_no',
                'standard_code'
            )
        }),
    )

@admin.register(Building)
class BuildingAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'designer_name', 'calculated_tonnage', 'design_start_date', 'production_start_date')
    list_filter = ('project', 'erection_applicable')
    search_fields = ('name', 'project__project_number', 'designer_name', 'subcontractor_name')
    autocomplete_fields = ['project']
    readonly_fields = ('calculated_tonnage',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'project',
                'name',
                'calculated_tonnage',
            )
        }),
        ('Responsible Parties', {
            'fields': (
                'designer_name',
                'subcontractor_name',
            )
        }),
        ('Design Phase', {
            'fields': (
                ('design_start_date', 'design_end_date'),
            )
        }),
        ('Production Phase', {
            'fields': (
                ('production_start_date', 'production_end_date'),
            )
        }),
        ('Erection Phase', {
            'fields': (
                'erection_applicable',
                ('erection_start_date', 'erection_end_date'),
            )
        }),
    )

@admin.register(RawData)
class RawDataAdmin(admin.ModelAdmin):
    list_display = ('project', 'building', 'part_designation', 'assembly_mark', 'part_mark', 'quantity', 'revision_number')
    list_filter = ('project', 'building', 'grade', 'revision_number')
    search_fields = ('part_designation', 'assembly_mark', 'part_mark', 'project__project_number')
    autocomplete_fields = ['project', 'building']
    
    readonly_fields = ('net_area_all', 'net_weight_all', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Project Information', {
            'fields': (
                'project',
                'building',
            )
        }),
        ('Part Identification', {
            'fields': (
                'log_designation',
                'part_designation',
                'assembly_mark',
                'sub_assembly_mark',
                'part_mark',
                'revision_number',
            )
        }),
        ('Part Details', {
            'fields': (
                'quantity',
                'name',
                'profile',
                'grade',
                'length',
            )
        }),
        ('Calculations', {
            'fields': (
                'net_area_single',
                'net_area_all',
                'single_part_weight',
                'net_weight_all',
            )
        }),
        ('Tracking', {
            'classes': ('collapse',),
            'fields': (
                'created_at',
                'updated_at',
            )
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # Editing an existing object
            return self.readonly_fields
        return ('created_at', 'updated_at')  # For new objects

@admin.register(ProductionLog)
class ProductionLogAdmin(admin.ModelAdmin):
    list_display = ('project', 'building', 'raw_data', 'production_date', 'quantity_produced')
    list_filter = ('project', 'building', 'production_date')
    search_fields = ('project__project_number', 'building__name', 'raw_data__part_mark')
    autocomplete_fields = ['project', 'building', 'raw_data']
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Production Information', {
            'fields': (
                'project',
                'building',
                'raw_data',
                'production_date',
                'quantity_produced',
            )
        }),
        ('Additional Information', {
            'fields': (
                'notes',
            )
        }),
        ('Tracking', {
            'classes': ('collapse',),
            'fields': (
                'created_at',
                'updated_at',
            )
        }),
    )
