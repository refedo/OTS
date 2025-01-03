# Generated by Django 5.1.4 on 2024-12-31 13:26

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_building_rawdata'),
    ]

    operations = [
        migrations.AddField(
            model_name='building',
            name='calculated_tonnage',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name='Calculated Tonnage'),
        ),
        migrations.AddField(
            model_name='building',
            name='design_end_date',
            field=models.DateField(blank=True, null=True, verbose_name='Design End Date'),
        ),
        migrations.AddField(
            model_name='building',
            name='design_start_date',
            field=models.DateField(blank=True, null=True, verbose_name='Design Start Date'),
        ),
        migrations.AddField(
            model_name='building',
            name='designer_name',
            field=models.CharField(blank=True, max_length=100, null=True, verbose_name='Designer Name'),
        ),
        migrations.AddField(
            model_name='building',
            name='erection_applicable',
            field=models.BooleanField(default=True, verbose_name='Erection Applicable'),
        ),
        migrations.AddField(
            model_name='building',
            name='erection_end_date',
            field=models.DateField(blank=True, null=True, verbose_name='Erection End Date'),
        ),
        migrations.AddField(
            model_name='building',
            name='erection_start_date',
            field=models.DateField(blank=True, null=True, verbose_name='Erection Start Date'),
        ),
        migrations.AddField(
            model_name='building',
            name='production_end_date',
            field=models.DateField(blank=True, null=True, verbose_name='Production End Date'),
        ),
        migrations.AddField(
            model_name='building',
            name='production_start_date',
            field=models.DateField(blank=True, null=True, verbose_name='Production Start Date'),
        ),
        migrations.AddField(
            model_name='building',
            name='subcontractor_name',
            field=models.CharField(blank=True, max_length=100, verbose_name='Subcontractor Name'),
        ),
    ]
