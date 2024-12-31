# Generated by Django 5.1.4 on 2024-12-31 13:41

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_project_erectable'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProductionLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('production_date', models.DateField(verbose_name='Production Date')),
                ('quantity_produced', models.IntegerField(verbose_name='Quantity Produced')),
                ('notes', models.TextField(blank=True, verbose_name='Notes')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('building', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='production_logs', to='core.building')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='production_logs', to='core.project')),
                ('raw_data', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='production_logs', to='core.rawdata')),
            ],
            options={
                'verbose_name': 'Production Log',
                'verbose_name_plural': 'Production Logs',
                'ordering': ['-production_date', 'project', 'building'],
            },
        ),
    ]
