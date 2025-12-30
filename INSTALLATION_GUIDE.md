# Xplora - Minimal Update Package

## What This Package Contains

**ONLY 3 Files - Minimal Changes to Fix Netlify & Add Mapbox Layout**

1. `netlify.toml` - Fixed Netlify configuration
2. `components/Layout/MapChatLayout.tsx` - NEW Mapbox-style layout component  
3. `components/Layout/WebOverlayLayout.tsx` - Updated to use MapChatLayout

## Installation Instructions

### Step 1: Backup Your Current Project
```bash
# Make a backup just in case
cp -r your-project your-project-backup
```

### Step 2: Copy Files to Your Project

Copy the 3 files from this package to your project:

```
your-project/
├── netlify.toml                              ← Replace this file
└── components/
    └── Layout/
        ├── MapChatLayout.tsx                 ← NEW file (create)
        └── WebOverlayLayout.tsx              ← Replace this file
```

**Detailed:**

1. **netlify.toml** → Copy to your project root (replace existing)
2. **MapChatLayout.tsx** → Copy to `components/Layout/MapChatLayout.tsx` (new file)
3. **WebOverlayLayout.tsx** → Copy to `components/Layout/WebOverlayLayout.tsx` (replace existing)

### Step 3: Install Dependencies (Same as Before)

```bash
cd your-project
npm install --legacy-peer-deps
```

### Step 4: Run the App

```bash
npm run web      # Test web version
npm run android  # Test Android
npm run ios      # Test iOS
```

## What Changed

### 1. netlify.toml (Fixes Netlify Deployment)

**Changed:**
- Node version: 18 → 20 (required for latest Expo)
- Added SPA routing redirects (fixes 404 errors on refresh)
- Added caching headers (improves performance)
- Added security headers

**Why:** Your Netlify builds were failing due to outdated Node and missing routing config.

### 2. MapChatLayout.tsx (NEW - Mapbox-Style Layout)

**What it does:**
- **Web:** Creates collapsible chat sidebar (420px) on the left, map on right
- **Native:** Creates floating chat button that opens full-screen modal
- Handles platform-specific layouts automatically
- Smooth animations with React Native Reanimated

**Why:** Provides the Mapbox-style integrated layout you requested.

### 3. WebOverlayLayout.tsx (Updated Integration)

**Changed:**
- Now uses the new MapChatLayout component
- Integrates chat and map into single view for web

**Why:** Connects the new layout to your existing web setup.

## What DIDN'T Change

✅ Your package.json (all dependencies stay the same)
✅ Your Expo SDK 54 setup
✅ Your app.config.js
✅ Your existing map screen
✅ Your existing chat screen
✅ All other components
✅ All services, hooks, contexts
✅ Everything else!

## Layout Preview

### Web (Mapbox-Style)
```
┌───────────────────────────────────────┐
│  Chat Panel  │      Map View          │
│   (420px)    │                        │
│              │                        │
│  Messages    │   Your existing        │
│  Input       │   map screen with      │
│              │   all features         │
│  [<] Toggle  │                        │
└───────────────────────────────────────┘
```

### Native (Modal Overlay)
```
┌───────────────────────────────────────┐
│        Full-Screen Map                │
│                                       │
│  [💬]  ← Floating chat button         │
│                                       │
│  (Tap to open full-screen chat)       │
│                                       │
│  Your existing map with all features  │
└───────────────────────────────────────┘
```

## Deploy to Netlify

Now your Netlify deployment will work:

### Option 1: Automatic (GitHub)
1. Push your code to GitHub
2. Connect repository to Netlify
3. Netlify auto-detects configuration from netlify.toml
4. Add environment variables in Netlify dashboard:
   - EXPO_PUBLIC_SUPABASE_URL
   - EXPO_PUBLIC_SUPABASE_ANON_KEY
   - EXPO_PUBLIC_MAPBOX_TOKEN
   - EXPO_PUBLIC_WEBHOOK_URL
5. Deploy!

### Option 2: Manual Build
```bash
npm run build:web
# Upload the 'dist' folder to Netlify
```

## Troubleshooting

### Issue: "Cannot find module MapChatLayout"
**Solution:** Make sure you created the file at the exact path:
`components/Layout/MapChatLayout.tsx`

### Issue: Netlify still failing
**Solution:** 
1. Check Node version is set to 20 in netlify.toml
2. Clear Netlify cache and rebuild
3. Verify all environment variables are set

### Issue: Chat not showing on web
**Solution:** 
1. Make sure WebOverlayLayout.tsx is properly updated
2. Check browser console for errors
3. Verify imports are correct

### Issue: App crashes on native
**Solution:**
1. Clear cache: `expo start -c`
2. Reinstall dependencies: `rm -rf node_modules && npm install --legacy-peer-deps`

## Testing Checklist

- [ ] Web: Chat sidebar appears on left
- [ ] Web: Can collapse/expand chat
- [ ] Web: Map takes full remaining space
- [ ] Native: Map shows full screen
- [ ] Native: Floating chat button appears
- [ ] Native: Chat modal opens/closes
- [ ] All existing features still work
- [ ] Netlify build succeeds

## Support

If you have any issues:
1. Check the file paths are correct
2. Make sure you didn't modify the file contents
3. Verify all 3 files were copied
4. Try clearing cache and rebuilding

## Summary

**3 files changed. Everything else stays the same.**

Your working Expo SDK 54 setup is completely preserved. Just Netlify fixes + new Mapbox-style layout!

Enjoy! 🎉
