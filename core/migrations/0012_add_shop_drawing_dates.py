# Generated by Django 5.1.4 on 2024-12-31 16:54

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_remove_number_of_structures_field'),
    ]

    operations = [
        migrations.AddField(
            model_name='building',
            name='shop_drawing_end_date',
            field=models.DateField(blank=True, null=True, verbose_name='Shop Drawing End Date'),
        ),
        migrations.AddField(
            model_name='building',
            name='shop_drawing_start_date',
            field=models.DateField(blank=True, null=True, verbose_name='Shop Drawing Start Date'),
        ),
    ]
