from django.core.management.base import BaseCommand
from core.models import Building, Timeline

class Command(BaseCommand):
    help = 'Creates Timeline objects for Buildings that do not have them'

    def handle(self, *args, **options):
        buildings_without_timeline = Building.objects.filter(timeline__isnull=True)
        created_count = 0
        
        for building in buildings_without_timeline:
            Timeline.objects.create(
                building=building,
                erection_applicable=building.project.erectable
            )
            created_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {created_count} Timeline objects'
            )
        )
