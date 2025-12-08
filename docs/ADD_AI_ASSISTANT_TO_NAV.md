# Adding AI Assistant to Navigation Menu

## Quick Guide

To add the AI Assistant link to your main navigation menu, follow these steps:

## Step 1: Locate Your Navigation Component

Common locations:
- `src/components/Navbar.tsx`
- `src/components/Sidebar.tsx`
- `src/components/Navigation.tsx`
- `src/app/layout.tsx`

## Step 2: Add the AI Assistant Link

### Example for Sidebar Navigation

```tsx
import { Bot } from 'lucide-react';

// Add to your navigation items array
const navItems = [
  // ... existing items
  {
    name: 'AI Assistant',
    href: '/ai-assistant',
    icon: Bot,
    description: 'Operation Focal Point - AI Operations Assistant'
  },
];
```

### Example for Top Navigation

```tsx
<nav>
  {/* ... existing links */}
  <Link 
    href="/ai-assistant"
    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
  >
    <Bot className="w-5 h-5" />
    <span>AI Assistant</span>
  </Link>
</nav>
```

## Step 3: Add Icon Import

If using lucide-react icons:

```tsx
import { Bot, MessageSquare, Sparkles } from 'lucide-react';
```

Recommended icons:
- `Bot` - Robot icon (most appropriate)
- `MessageSquare` - Chat bubble
- `Sparkles` - AI/magic effect

## Step 4: Add Badge (Optional)

Show "New" or "AI" badge:

```tsx
<Link href="/ai-assistant" className="relative">
  <Bot className="w-5 h-5" />
  <span>AI Assistant</span>
  <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
    New
  </span>
</Link>
```

## Example: Complete Sidebar Item

```tsx
{
  name: 'AI Assistant',
  href: '/ai-assistant',
  icon: Bot,
  badge: 'AI',
  badgeColor: 'bg-gradient-to-r from-blue-500 to-purple-500 text-white',
  description: 'Get AI-powered insights and assistance',
  category: 'Tools',
}
```

## Styling Recommendations

### Gradient Effect (Modern Look)
```tsx
<Link 
  href="/ai-assistant"
  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all"
>
  <Bot className="w-5 h-5" />
  <span className="font-medium">AI Assistant</span>
</Link>
```

### Subtle Highlight
```tsx
<Link 
  href="/ai-assistant"
  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
>
  <Bot className="w-5 h-5" />
  <span>AI Assistant</span>
</Link>
```

## Role-Based Access (Optional)

If you want to restrict access to certain roles:

```tsx
{session.role === 'Admin' || session.role === 'Manager' ? (
  <Link href="/ai-assistant">
    <Bot className="w-5 h-5" />
    <span>AI Assistant</span>
  </Link>
) : null}
```

## Mobile Navigation

For mobile responsive menus:

```tsx
<div className="md:hidden">
  <Link 
    href="/ai-assistant"
    className="block px-4 py-3 text-gray-700 hover:bg-gray-100"
  >
    <div className="flex items-center gap-3">
      <Bot className="w-5 h-5" />
      <div>
        <p className="font-medium">AI Assistant</p>
        <p className="text-xs text-gray-500">Get AI-powered help</p>
      </div>
    </div>
  </Link>
</div>
```

## Quick Access Button (Alternative)

Add a floating action button for quick access:

```tsx
// Add to your main layout
<Link
  href="/ai-assistant"
  className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all z-50"
  title="AI Assistant"
>
  <Bot className="w-6 h-6" />
</Link>
```

## Testing

After adding the link:
1. ✅ Click the link to verify it navigates to `/ai-assistant`
2. ✅ Check that the icon displays correctly
3. ✅ Test on mobile devices
4. ✅ Verify active state styling works
5. ✅ Ensure proper authentication is enforced

## Common Issues

### Issue: Link doesn't work
- Check that the route is `/ai-assistant` (no trailing slash)
- Verify the page file exists at `src/app/ai-assistant/page.tsx`

### Issue: Icon not showing
- Ensure lucide-react is installed
- Check import statement
- Try a different icon

### Issue: Styling conflicts
- Check for conflicting CSS classes
- Use more specific selectors
- Verify Tailwind classes are correct

---

**Tip**: Place the AI Assistant link in a prominent position in your navigation for easy access!
