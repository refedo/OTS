# Generated by Django 5.1.4 on 2024-12-31 13:01

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_auto_20241231_1600'),
    ]

    operations = [
        migrations.AlterField(
            model_name='project',
            name='area',
            field=models.DecimalField(decimal_places=2, max_digits=10, verbose_name='Area'),
        ),
        migrations.AlterField(
            model_name='project',
            name='contractual_tonnage',
            field=models.DecimalField(decimal_places=2, max_digits=10, verbose_name='Contractual Tonnage'),
        ),
        migrations.AlterField(
            model_name='project',
            name='estimation_number',
            field=models.CharField(max_length=20, unique=True, verbose_name='Estimation #'),
        ),
        migrations.AlterField(
            model_name='project',
            name='incoterm',
            field=models.CharField(choices=[('EXW', 'Ex Works'), ('FOB', 'Free on Board'), ('CIF', 'Cost, Insurance, and Freight'), ('DDP', 'Delivered Duty Paid')], max_length=20, verbose_name='Incoterm'),
        ),
        migrations.AlterField(
            model_name='project',
            name='m2_per_ton',
            field=models.DecimalField(decimal_places=2, max_digits=10, verbose_name='m2/Ton'),
        ),
        migrations.AlterField(
            model_name='project',
            name='number_of_structures',
            field=models.IntegerField(verbose_name='No. of structures'),
        ),
        migrations.AlterField(
            model_name='project',
            name='pqr_no',
            field=models.CharField(max_length=50, verbose_name='PQR NO'),
        ),
        migrations.AlterField(
            model_name='project',
            name='project_nature',
            field=models.CharField(choices=[('NEW', 'New Construction'), ('EXPANSION', 'Expansion'), ('RENOVATION', 'Renovation'), ('MAINTENANCE', 'Maintenance')], max_length=20, verbose_name='Project Nature'),
        ),
        migrations.AlterField(
            model_name='project',
            name='scope_of_work',
            field=models.TextField(verbose_name='Scope of Work'),
        ),
        migrations.AlterField(
            model_name='project',
            name='standard_code',
            field=models.CharField(max_length=50, verbose_name='Standard Code'),
        ),
        migrations.AlterField(
            model_name='project',
            name='structure_type',
            field=models.CharField(choices=[('INDUSTRIAL', 'Industrial Building'), ('COMMERCIAL', 'Commercial Building'), ('RESIDENTIAL', 'Residential Building'), ('WAREHOUSE', 'Warehouse'), ('OTHER', 'Other')], max_length=50, verbose_name='Structure Type'),
        ),
        migrations.AlterField(
            model_name='project',
            name='welding_process',
            field=models.CharField(choices=[('SMAW', 'Shielded Metal Arc Welding'), ('GMAW', 'Gas Metal Arc Welding'), ('FCAW', 'Flux Cored Arc Welding'), ('SAW', 'Submerged Arc Welding')], max_length=20, verbose_name='Welding Process'),
        ),
        migrations.AlterField(
            model_name='project',
            name='welding_wire_aws_class',
            field=models.CharField(max_length=50, verbose_name='Welding Wire AWS Class'),
        ),
        migrations.AlterField(
            model_name='project',
            name='wps_no',
            field=models.CharField(max_length=50, verbose_name='WPS NO'),
        ),
    ]
