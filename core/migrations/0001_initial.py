# Generated by Django 5.1.4 on 2024-12-31 12:33

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Project',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('estimation_number', models.CharField(default='EST-000', max_length=20, unique=True, verbose_name='Estimation #')),
                ('project_number', models.CharField(max_length=20, unique=True, verbose_name='Project #')),
                ('name', models.CharField(max_length=200, verbose_name='Project Name')),
                ('project_manager', models.CharField(blank=True, max_length=100, null=True, verbose_name='Project Manager')),
                ('client_name', models.CharField(max_length=200, verbose_name='Client Name')),
                ('contract_date', models.DateField(blank=True, null=True, verbose_name='Contract Date')),
                ('down_payment_date', models.DateField(blank=True, null=True, verbose_name='Down Payment Date')),
                ('planned_start_date', models.DateField(blank=True, null=True, verbose_name='Planned Start Date')),
                ('planned_end_date', models.DateField(blank=True, null=True, verbose_name='Planned End Date')),
                ('actual_start_date', models.DateField(blank=True, null=True, verbose_name='Actual Start Date')),
                ('actual_end_date', models.DateField(blank=True, null=True, verbose_name='Actual End Date')),
                ('structure_type', models.CharField(choices=[('INDUSTRIAL', 'Industrial Building'), ('COMMERCIAL', 'Commercial Building'), ('RESIDENTIAL', 'Residential Building'), ('WAREHOUSE', 'Warehouse'), ('OTHER', 'Other')], default='INDUSTRIAL', max_length=50, verbose_name='Structure Type')),
                ('number_of_structures', models.IntegerField(default=1, verbose_name='No. of structures')),
                ('erection_subcontractor', models.CharField(blank=True, max_length=100, verbose_name='Erection Subcontractor')),
                ('down_payment', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Down Payment')),
                ('down_payment_ack', models.BooleanField(default=False, verbose_name='Down Payment Ack')),
                ('payment_2', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Payment 2')),
                ('payment_2_ack', models.BooleanField(default=False, verbose_name='Payment 2 Ack')),
                ('payment_3', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Payment 3')),
                ('payment_3_ack', models.BooleanField(default=False, verbose_name='Payment 3 Ack')),
                ('payment_4', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Payment 4')),
                ('payment_4_ack', models.BooleanField(default=False, verbose_name='Payment 4 Ack')),
                ('payment_5', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Payment 5')),
                ('payment_5_ack', models.BooleanField(default=False, verbose_name='Payment 5 Ack')),
                ('preliminary_retention', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Preliminary Retention')),
                ('ho_retention', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='H.O Retention')),
                ('incoterm', models.CharField(choices=[('EXW', 'Ex Works'), ('FOB', 'Free on Board'), ('CIF', 'Cost, Insurance, and Freight'), ('DDP', 'Delivered Duty Paid')], default='EXW', max_length=20, verbose_name='Incoterm')),
                ('scope_of_work', models.TextField(default='', verbose_name='Scope of Work')),
                ('project_nature', models.CharField(choices=[('NEW', 'New Construction'), ('EXPANSION', 'Expansion'), ('RENOVATION', 'Renovation'), ('MAINTENANCE', 'Maintenance')], default='NEW', max_length=20, verbose_name='Project Nature')),
                ('contractual_tonnage', models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name='Contractual Tonnage')),
                ('engineering_tonnage', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Engineering Tonnage')),
                ('galvanized', models.BooleanField(default=False, verbose_name='Galvanized')),
                ('galvanization_microns', models.IntegerField(blank=True, null=True, verbose_name='Galvanization Microns')),
                ('area', models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name='Area')),
                ('m2_per_ton', models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name='m2/Ton')),
                ('paint_coat_1', models.CharField(blank=True, max_length=100, null=True, verbose_name='Paint Coat 1')),
                ('coat_1_microns', models.IntegerField(blank=True, null=True, verbose_name='Coat 1 - Microns')),
                ('coat_1_liters_needed', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Liters Needed')),
                ('paint_coat_2', models.CharField(blank=True, max_length=100, null=True, verbose_name='Paint Coat 2')),
                ('coat_2_microns', models.IntegerField(blank=True, null=True, verbose_name='Coat 2 - Microns')),
                ('coat_2_liters_needed', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Liters Needed')),
                ('paint_coat_3', models.CharField(blank=True, max_length=100, null=True, verbose_name='Paint Coat 3')),
                ('coat_3_microns', models.IntegerField(blank=True, null=True, verbose_name='Coat 3 - Microns')),
                ('coat_3_liters_needed', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Liters Needed')),
                ('paint_coat_4', models.CharField(blank=True, max_length=100, null=True, verbose_name='Paint Coat 4')),
                ('coat_4_microns', models.IntegerField(blank=True, null=True, verbose_name='Coat 4 - Microns')),
                ('coat_4_liters_needed', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Liters Needed')),
                ('top_coat_ral_number', models.CharField(blank=True, max_length=20, null=True, verbose_name='Top Coat RAL Number')),
                ('welding_process', models.CharField(choices=[('SMAW', 'Shielded Metal Arc Welding'), ('GMAW', 'Gas Metal Arc Welding'), ('FCAW', 'Flux Cored Arc Welding'), ('SAW', 'Submerged Arc Welding')], default='SMAW', max_length=20, verbose_name='Welding Process')),
                ('welding_wire_aws_class', models.CharField(default='', max_length=50, verbose_name='Welding Wire AWS Class')),
                ('pqr_no', models.CharField(default='', max_length=50, verbose_name='PQR NO')),
                ('wps_no', models.CharField(default='', max_length=50, verbose_name='WPS NO')),
                ('standard_code', models.CharField(default='', max_length=50, verbose_name='Standard Code')),
            ],
            options={
                'verbose_name': 'Project',
                'verbose_name_plural': 'Projects',
            },
        ),
    ]
