# Generated by Django 5.1.4 on 2024-12-31 16:21

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_project_design_start_date_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='project',
            name='actual_end_date',
        ),
        migrations.RemoveField(
            model_name='project',
            name='actual_start_date',
        ),
        migrations.RemoveField(
            model_name='project',
            name='design_start_date',
        ),
        migrations.RemoveField(
            model_name='project',
            name='planned_end_date',
        ),
        migrations.RemoveField(
            model_name='project',
            name='planned_start_date',
        ),
        migrations.RemoveField(
            model_name='project',
            name='production_start_date',
        ),
        migrations.RemoveField(
            model_name='project',
            name='qc_inspection_date',
        ),
        migrations.RemoveField(
            model_name='project',
            name='shop_drawing_approval_date',
        ),
    ]
