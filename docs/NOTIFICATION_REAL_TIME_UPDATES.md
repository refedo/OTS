# Real-Time Notification Updates Guide

## Overview
The notification system now supports real-time badge updates without requiring page refreshes, providing a seamless user experience.

---

## Architecture

### NotificationContext
The notification system uses React Context for centralized state management.

```typescript
// src/contexts/NotificationContext.tsx
interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  decrementUnreadCount: () => void;
  resetUnreadCount: () => void;
}
```

### Key Features
1. **Automatic Polling**: Fetches unread count every 30 seconds
2. **Centralized State**: Single source of truth for notification count
3. **Optimized Updates**: Only re-renders when count changes
4. **Easy Integration**: Simple hook-based API

---

## Usage

### In a Component
```typescript
import { useNotifications } from '@/contexts/NotificationContext';

function MyComponent() {
  const { unreadCount, refreshUnreadCount } = useNotifications();
  
  return (
    <div>
      <span>Unread: {unreadCount}</span>
      <button onClick={refreshUnreadCount}>Refresh</button>
    </div>
  );
}
```

### In a Layout
```typescript
import { NotificationProvider } from '@/contexts/NotificationContext';

export default function Layout({ children }) {
  return (
    <NotificationProvider>
      {children}
    </NotificationProvider>
  );
}
```

---

## How It Works

### 1. Initial Load
- NotificationProvider mounts
- Fetches initial unread count from API
- Starts 30-second polling interval

### 2. User Actions
When a user marks a notification as read:
```typescript
// In NotificationPanel.tsx
const markAsRead = async (id: string) => {
  await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
  refreshUnreadCount(); // Updates badge immediately
};
```

### 3. Automatic Updates
- Every 30 seconds, context fetches latest count
- All components using `useNotifications()` update automatically
- Badge displays across all pages stay synchronized

---

## API Endpoint

### GET /api/notifications
```typescript
// Request
GET /api/notifications?isRead=false&limit=1

// Response
{
  "notifications": [...],
  "unreadCount": 5,
  "total": 1
}
```

The context only needs the `unreadCount` field for badge updates.

---

## Components Using Context

### 1. NotificationBell
```typescript
// src/components/NotificationBell.tsx
const { unreadCount } = useNotifications();

return (
  <Button>
    <Bell />
    {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
  </Button>
);
```

### 2. AppSidebar
```typescript
// src/components/app-sidebar.tsx
const { unreadCount } = useNotifications();

return (
  <Link href="/notifications">
    Notifications
    {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
  </Link>
);
```

### 3. NotificationPanel
```typescript
// src/components/NotificationPanel.tsx
const { refreshUnreadCount } = useNotifications();

const markAsRead = async (id: string) => {
  // ... mark as read
  refreshUnreadCount(); // Update badge
};
```

---

## Performance Considerations

### Polling Interval
- **Default**: 30 seconds
- **Rationale**: Balance between real-time updates and server load
- **Customizable**: Change in `NotificationContext.tsx`

```typescript
// To change polling interval
const interval = setInterval(refreshUnreadCount, 60000); // 60 seconds
```

### API Optimization
- Uses `limit=1` to minimize data transfer
- Only fetches count, not full notification list
- Caches result until next poll or manual refresh

### Memory Management
- Cleans up interval on unmount
- No memory leaks
- Efficient re-renders with React Context

---

## Troubleshooting

### Badge Not Updating
1. Check if NotificationProvider wraps the component
2. Verify API endpoint is accessible
3. Check browser console for errors
4. Ensure polling interval is running

### Multiple Providers
- Only one NotificationProvider should exist per page
- Nested providers will create separate contexts
- Use a single provider at the layout level

### Stale Count
- Click refresh button to force update
- Check if API is returning correct count
- Verify mark-as-read endpoint is working

---

## Migration from Old System

### Before (Local State)
```typescript
// Old approach - each component fetches separately
const [unreadCount, setUnreadCount] = useState(0);

useEffect(() => {
  fetchUnreadCount();
  const interval = setInterval(fetchUnreadCount, 30000);
  return () => clearInterval(interval);
}, []);
```

### After (Context)
```typescript
// New approach - shared state
const { unreadCount } = useNotifications();
// That's it! No polling, no cleanup needed
```

### Benefits
- ✅ No duplicate API calls
- ✅ Consistent state across components
- ✅ Easier to maintain
- ✅ Better performance

---

## Future Enhancements

### WebSocket Support (Planned v1.3.0)
```typescript
// Future implementation
const ws = new WebSocket('wss://api.example.com/notifications');
ws.onmessage = (event) => {
  const { unreadCount } = JSON.parse(event.data);
  setUnreadCount(unreadCount);
};
```

### Benefits of WebSocket
- Instant updates (no polling delay)
- Lower server load
- Better user experience
- Real-time notifications

---

## Best Practices

### 1. Always Wrap with Provider
```typescript
// ✅ Good
<NotificationProvider>
  <AppSidebar />
  <MainContent />
</NotificationProvider>

// ❌ Bad - components won't have access
<AppSidebar />
<MainContent />
```

### 2. Use Hook Correctly
```typescript
// ✅ Good - inside component
function MyComponent() {
  const { unreadCount } = useNotifications();
  return <div>{unreadCount}</div>;
}

// ❌ Bad - outside component
const { unreadCount } = useNotifications();
function MyComponent() {
  return <div>{unreadCount}</div>;
}
```

### 3. Refresh After Actions
```typescript
// ✅ Good - refresh after marking as read
const markAsRead = async (id) => {
  await api.markAsRead(id);
  refreshUnreadCount();
};

// ❌ Bad - no refresh, badge stays stale
const markAsRead = async (id) => {
  await api.markAsRead(id);
};
```

---

## Testing

### Manual Testing
1. Open two browser tabs with the application
2. Mark a notification as read in tab 1
3. Wait up to 30 seconds
4. Verify badge updates in tab 2

### Automated Testing
```typescript
import { render, waitFor } from '@testing-library/react';
import { NotificationProvider } from '@/contexts/NotificationContext';

test('updates badge count', async () => {
  const { getByText } = render(
    <NotificationProvider>
      <NotificationBell />
    </NotificationProvider>
  );
  
  await waitFor(() => {
    expect(getByText('5')).toBeInTheDocument();
  });
});
```

---

## Summary

The real-time notification system provides:
- ✅ Automatic badge updates every 30 seconds
- ✅ Immediate updates after user actions
- ✅ Consistent state across all components
- ✅ Optimized performance with minimal API calls
- ✅ Easy integration with simple hook API

For questions or issues, refer to the main documentation or contact the development team.

---

**Last Updated**: December 9, 2024  
**Version**: 1.2.0
