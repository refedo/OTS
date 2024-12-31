from django.contrib import admin
from .models import Project, Building, RawData, ProductionLog

class BuildingInline(admin.StackedInline):
    model = Building
    extra = 0
    fields = (
        'name', 'calculated_tonnage', 'subcontractor_name', 'designer_name',
        ('design_start_date', 'design_end_date'),
        ('shop_drawing_start_date', 'shop_drawing_end_date'),
        ('production_start_date', 'production_end_date'),
        'erection_applicable',
        ('erection_start_date', 'erection_end_date')
    )
    readonly_fields = ('calculated_tonnage',)
    show_change_link = True

    def get_fields(self, request, obj=None):
        fields = list(super().get_fields(request, obj))
        # If project is not erectable, remove erection-related fields
        if obj and not obj.erectable:
            fields = [f for f in fields if f not in ('erection_applicable', 'erection_start_date', 'erection_end_date')]
        return fields

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('project_number', 'name', 'client_name', 'contract_amount', 'down_payment', 'contract_date', 'number_of_structures')
    list_filter = ('contract_date', 'down_payment_date')
    search_fields = ('project_number', 'name', 'client_name')
    readonly_fields = ('down_payment', 'number_of_structures')
    inlines = [BuildingInline]
    change_form_template = 'admin/core/project/change_form.html'
    
    class Media:
        js = ('admin/js/jquery.init.js',)  # Ensure jQuery is loaded
    
    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if not obj.erectable:
            # Clear erection-related fields when not erectable
            for building in obj.buildings.all():
                building.erection_start_date = None
                building.erection_end_date = None
                building.erection_applicable = False
                building.subcontractor_name = ''
                building.save()

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if obj:
            # Add JavaScript to handle erectable changes
            class CustomForm(form):
                class Media:
                    js = ('admin/js/jquery.init.js',)
        else:
            CustomForm = form
        return CustomForm

    fieldsets = (
        ('Project Information', {
            'fields': (
                'estimation_number',
                'project_number',
                'name',
                'client_name',
                'project_manager',
                'area',
                'contractual_tonnage',
                'erectable'
            )
        }),
        ('Project Dates', {
            'fields': (
                'contract_date',
                'down_payment_date'
            )
        }),
        ('Commercial Terms', {
            'fields': (
                'incoterm',
                'scope_of_work',
                'project_nature'
            )
        }),
        ('Technical Details', {
            'fields': (
                'structure_type',
                'number_of_structures',
                'erection_subcontractor',
                'engineering_tonnage',
                'm2_per_ton'
            )
        }),
        ('Coating Details', {
            'fields': (
                'galvanized',
                'galvanization_microns',
                ('paint_coat_1', 'coat_1_microns', 'coat_1_liters_needed'),
                ('paint_coat_2', 'coat_2_microns', 'coat_2_liters_needed'),
                ('paint_coat_3', 'coat_3_microns', 'coat_3_liters_needed'),
                ('paint_coat_4', 'coat_4_microns', 'coat_4_liters_needed'),
                'top_coat_ral_number'
            ),
            'classes': ('collapse',)
        }),
        ('Welding Details', {
            'fields': (
                'welding_process',
                'welding_wire_aws_class',
                'pqr_no',
                'wps_no',
                'standard_code'
            ),
            'classes': ('collapse',)
        }),
        ('Payment Schedule', {
            'fields': (
                'contract_amount',
                'down_payment_percentage',
                'down_payment',
                'down_payment_ack',
                'payment_2',
                'payment_2_ack',
                'payment_3',
                'payment_3_ack',
                'payment_4',
                'payment_4_ack',
                'payment_5',
                'payment_5_ack',
                'preliminary_retention',
                'ho_retention'
            )
        })
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
                'designer_name',
                'subcontractor_name',
                'calculated_tonnage'
            )
        }),
        ('Design Phase', {
            'fields': (
                ('design_start_date', 'design_end_date'),
            )
        }),
        ('Shop Drawing Phase', {
            'fields': (
                ('shop_drawing_start_date', 'shop_drawing_end_date'),
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
        })
    )

    def get_fieldsets(self, request, obj=None):
        fieldsets = list(super().get_fieldsets(request, obj))
        # If project is not erectable, remove Erection Phase fieldset
        if obj and not obj.project.erectable:
            fieldsets = [fs for fs in fieldsets if fs[0] != 'Erection Phase']
        return fieldsets

@admin.register(RawData)
class RawDataAdmin(admin.ModelAdmin):
    list_display = ('project', 'building', 'assembly_mark', 'part_mark', 'quantity', 'net_weight_all')
    list_filter = ('project', 'building')
    search_fields = ('assembly_mark', 'part_mark', 'name')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(ProductionLog)
class ProductionLogAdmin(admin.ModelAdmin):
    list_display = ('project', 'building', 'production_date', 'quantity_produced')
    list_filter = ('project', 'building', 'production_date')
    search_fields = ('notes',)
    readonly_fields = ('created_at', 'updated_at')
