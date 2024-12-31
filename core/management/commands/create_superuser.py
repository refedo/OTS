from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Creates a superuser'

    def handle(self, *args, **options):
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser(
                username='admin',
                email='walid.dami@yahoo.com',
                password='admin123'
            )
            self.stdout.write(self.style.SUCCESS('Superuser created successfully'))
