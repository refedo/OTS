document.addEventListener('DOMContentLoaded', function() {
    // Function to update erection visibility
    function updateErectionVisibility(projectId, isErectable) {
        // Update timeline events
        const erectionEvents = document.querySelectorAll(`.project-${projectId} .timeline-event.erection`);
        erectionEvents.forEach(event => {
            event.style.display = isErectable ? 'block' : 'none';
        });

        // Update form fields if we're on the admin page
        const erectionFields = document.querySelectorAll('.field-erection_start_date, .field-erection_end_date, .field-erection_applicable');
        erectionFields.forEach(field => {
            field.style.display = isErectable ? 'block' : 'none';
        });

        // Update subcontractor name field if it exists
        const subcontractorFields = document.querySelectorAll('.field-subcontractor_name');
        subcontractorFields.forEach(field => {
            if (!isErectable) {
                const input = field.querySelector('input');
                if (input) {
                    input.value = '';
                }
            }
            field.style.display = isErectable ? 'block' : 'none';
        });
    }

    // Listen for changes to the erectable checkbox
    const erectableCheckbox = document.querySelector('#id_erectable');
    if (erectableCheckbox) {
        erectableCheckbox.addEventListener('change', function() {
            const projectId = window.location.pathname.split('/')[3]; // Get project ID from URL
            updateErectionVisibility(projectId, this.checked);
            
            // Send AJAX request to update the server
            fetch(`/api/project/${projectId}/update-erectable/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                body: JSON.stringify({
                    erectable: this.checked
                })
            });
        });
    }
});
