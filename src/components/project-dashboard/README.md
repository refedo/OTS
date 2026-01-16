# Project Dashboard Components

This directory contains all components for the **Single Project Dashboard** module.

## Components

### Core Components

- **`SingleProjectDashboard.tsx`** — Main dashboard orchestrator that fetches data and renders all widgets
- **`ProjectHeader.tsx`** — Project summary header with key information

### Widget Components

- **`WPSStatusWidget.tsx`** — Welding Procedure Specifications tracking
- **`ITPStatusWidget.tsx`** — Inspection & Test Plans tracking
- **`ProductionProgressWidget.tsx`** — Production metrics with charts
- **`QCProgressWidget.tsx`** — Quality Control inspection statistics
- **`BuildingsStatusWidget.tsx`** — Per-building status breakdown
- **`DocumentationStatusWidget.tsx`** — Document tracking by category
- **`TasksOverviewWidget.tsx`** — Project tasks with filtering

## Usage

### Import Individual Components
```tsx
import { ProjectHeader } from '@/components/project-dashboard/ProjectHeader';
import { WPSStatusWidget } from '@/components/project-dashboard/WPSStatusWidget';
```

### Import from Barrel
```tsx
import { 
  ProjectHeader, 
  WPSStatusWidget,
  ITPStatusWidget 
} from '@/components/project-dashboard';
```

### Use Main Dashboard
```tsx
import { SingleProjectDashboard } from '@/components/project-dashboard';

export default function Page() {
  return <SingleProjectDashboard />;
}
```

## Widget Props Pattern

All widgets follow a consistent props pattern:

```tsx
interface WidgetProps {
  data: WidgetDataType;      // Data from API
  onRefresh?: () => void;    // Optional refresh callback
  projectId?: string;        // Optional project ID for navigation
  // ... widget-specific props
}
```

## Common Features

All widgets include:
- ✅ Collapsible functionality
- ✅ Refresh button
- ✅ Loading states
- ✅ Error handling
- ✅ Responsive design
- ✅ Consistent styling

## Adding a New Widget

See `docs/SINGLE_PROJECT_DASHBOARD.md` for detailed instructions on adding new widgets.

Quick steps:
1. Create widget component in this directory
2. Create corresponding API endpoint
3. Add TypeScript interface
4. Import and use in `SingleProjectDashboard.tsx`
5. Export from `index.ts`

## Related Files

- **Types:** `src/lib/types/project-dashboard.ts`
- **API Routes:** `src/app/api/projects/[projectId]/`
- **Page:** `src/app/projects-dashboard/page.tsx`
- **Documentation:** `docs/SINGLE_PROJECT_DASHBOARD.md`

## Support

For questions or issues, refer to the main documentation or contact the development team.
