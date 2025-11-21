# 🧪 Testing Cache Improvements - Step by Step Guide

## Prerequisites
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Keep it open while testing

---

## ✅ Test 1: Dashboard Cache (5 minutes)

### Steps:
1. Navigate to Dashboard (`/`)
2. Note the API call to `/api/v1/admin/stats`
3. Switch to another tab (like Gmail) and come back
4. **Expected:** NO new API call to `/api/v1/admin/stats`
5. Wait on dashboard for 5+ minutes
6. **Expected:** Automatic polling call every 5 minutes

### What to Check:
- [ ] Initial load makes 1 call
- [ ] Tab switching doesn't trigger calls (was broken before)
- [ ] Automatic refresh every 5 minutes
- [ ] Data stays cached between tab switches

---

## ✅ Test 2: Prefetch on Hover

### Steps:
1. Go to Dashboard
2. Open Network tab and clear it (🚫 icon)
3. **Hover** over "Salons" link in sidebar (DON'T CLICK)
4. Watch Network tab
5. **Expected:** See API call to `/api/v1/admin/salons` while hovering
6. Now **click** "Salons" link
7. **Expected:** Page loads INSTANTLY with no loading spinner

### What to Check:
- [ ] Hovering triggers prefetch API call
- [ ] Clicking after hover = instant load (0ms)
- [ ] No duplicate API calls on click
- [ ] Try with other links: Users, Appointments, Services

**Visual Proof:**
```
Before: Hover → Click → Loading Spinner → Wait 1s → Page loads
After:  Hover (prefetch) → Click → Page loads INSTANTLY ⚡
```

---

## ✅ Test 3: Optimistic Updates (Toggle Salon Status)

### Steps:
1. Go to Salons page (`/salons`)
2. Find any salon with toggle button
3. Click the "Active/Inactive" toggle
4. **Watch the UI carefully**
5. **Expected:** UI updates INSTANTLY (no loading spinner)
6. If API fails, it should rollback automatically

### What to Check:
- [ ] Toggle switches immediately (no delay)
- [ ] No loading spinner shows
- [ ] If you're fast enough to see Network tab, API call happens in background
- [ ] Status persists after page refresh

**Console Check:**
Open Console and you should see the optimistic update working:
```javascript
// UI updates immediately, then API confirms
```

---

## ✅ Test 4: Real-Time Updates (Pending Salons)

### Steps:
1. Open Pending Salons page (`/pending-salons`)
2. Keep it open
3. From backend or another browser, submit a new salon request
4. **Expected:** New request appears in the list WITHOUT refreshing
5. **Expected:** Toast notification appears
6. Check Network tab: Should see NO full page refetch

### What to Check:
- [ ] New salon appears automatically
- [ ] No full list refetch (check Network tab)
- [ ] Cache updated directly via Supabase real-time
- [ ] Badge count updates in sidebar

**Before vs After:**
```
Before: New submission → Full refetch of entire list (wasteful)
After:  New submission → Direct cache insertion (efficient)
```

---

## ✅ Test 5: Filter Changes (Appointments)

### Steps:
1. Go to Appointments page (`/appointments`)
2. Clear Network tab
3. Select "Pending" from status filter
4. Note the API call with `?status=pending`
5. Select "Confirmed" status
6. **Expected:** New API call with `?status=confirmed`
7. Switch back to "Pending"
8. **Expected:** 
   - If less than 30 seconds: Uses cached data (no call)
   - If more than 30 seconds: Fresh API call

### What to Check:
- [ ] Each filter triggers appropriate API call
- [ ] Recent filters (<30s) use cache
- [ ] Stale filters (>30s) refetch data
- [ ] No loading spinner for cached filters

---

## ✅ Test 6: Polling (Pending Salons & Appointments)

### Steps:
1. Open Pending Salons page
2. Clear Network tab
3. Leave page open and watch Network tab
4. **Expected:** API call to `/api/v1/admin/vendor-requests` every 30 seconds
5. Now go to Appointments page (with a filter selected)
6. **Expected:** API call every 2 minutes

### What to Check:
- [ ] Pending Salons: Poll every 30 seconds
- [ ] Appointments: Poll every 2 minutes
- [ ] Polling stops when you leave the page
- [ ] Polling resumes when you return

**Network Tab Pattern:**
```
Time 0:00 - Initial load
Time 0:30 - Automatic poll (Pending Salons)
Time 1:00 - Automatic poll
Time 1:30 - Automatic poll
```

---

## ✅ Test 7: Cache Duration Check

### Steps:
1. Go to Users page
2. Note the timestamp of API call
3. Navigate away and come back within 10 minutes
4. **Expected:** No new API call (using cache)
5. Wait 10+ minutes and navigate back
6. **Expected:** Fresh API call

### What to Check:
Different pages have different cache times:
- [ ] Users: 10 minutes
- [ ] Services: 10 minutes
- [ ] System Config: 15 minutes
- [ ] Salons: 5 minutes
- [ ] Appointments: 2 minutes

---

## ✅ Test 8: Network Reconnection

### Steps:
1. Load any page (Dashboard)
2. Turn off your internet/WiFi
3. Wait 5 seconds
4. Turn internet back on
5. **Expected:** Automatic refetch of data

### What to Check:
- [ ] Page automatically refetches when reconnected
- [ ] No manual refresh needed
- [ ] Data updates without user action

---

## ✅ Test 9: Notification Bell Prefetch

### Steps:
1. Be on any page
2. Clear Network tab
3. Hover over the notification bell icon (top right)
4. **Expected:** API call to `/api/v1/admin/vendor-requests`
5. Click the bell
6. **Expected:** Instant navigation to Pending Salons (no spinner)

### What to Check:
- [ ] Hover triggers prefetch
- [ ] Click = instant page load
- [ ] No duplicate API calls

---

## 🔍 Quick Visual Checks

### Network Tab Should Show:
```
✅ Fewer API calls overall (~75% reduction)
✅ No duplicate calls on tab switch
✅ Prefetch calls on hover
✅ Polling intervals visible
✅ Optimistic updates happen before API confirms
```

### Redux DevTools (Optional):
Install Redux DevTools extension and watch:
1. Actions dispatched
2. Cache state updates
3. Optimistic updates and rollbacks

---

## 🚨 What to Watch For (Problems)

### Red Flags:
❌ **API call on every tab switch** → Dashboard refetchOnFocus broke  
❌ **Loading spinner on hover+click** → Prefetch not working  
❌ **Full refetch on real-time update** → Manual cache update failed  
❌ **No automatic polls** → pollingInterval not configured  
❌ **Slow toggles** → Optimistic update missing  

---

## 📊 Performance Comparison

### Before Improvements:
- Dashboard: API call every tab switch
- Pending Salons: Full refetch on Supabase event
- Toggles: Loading spinner, wait for API
- Navigation: Loading spinner every time
- Filters: Always fetch (even if just changed)

### After Improvements:
- Dashboard: Cached 5 min, polls automatically
- Pending Salons: Direct cache update, no refetch
- Toggles: Instant UI update, API in background
- Navigation: Instant (prefetched)
- Filters: Smart cache (30s fresh, then refetch)

---

## 🎯 Success Criteria

You'll know it's working when:
- ✅ Pages feel **instant** after hover
- ✅ Toggles respond **immediately**
- ✅ Real-time updates appear **without refresh**
- ✅ Tab switching **doesn't trigger API calls**
- ✅ Network tab shows **75% fewer requests**
- ✅ Loading spinners are **rare**

---

## 🛠️ Debug Commands

If something seems off, open Console and run:

```javascript
// Check RTK Query cache state
console.log(window.store.getState())

// Check all cached endpoints
Object.keys(window.store.getState()).filter(k => k.includes('Api'))

// Force invalidate cache for testing
window.store.dispatch(salonApi.util.invalidateTags(['Salons']))
```

---

## 📝 Testing Checklist Summary

Run through all tests and check off:

- [ ] Dashboard cache (5min, no refetch on tab switch)
- [ ] Prefetch on hover (all nav links)
- [ ] Optimistic updates (salon toggle, appointment status)
- [ ] Real-time updates (pending salons)
- [ ] Filter cache handling (30s fresh data)
- [ ] Polling intervals (30s pending, 2min appointments)
- [ ] Cache durations (10min users, 15min config)
- [ ] Network reconnection (auto refetch)
- [ ] Notification bell prefetch

---

**If all tests pass: Your cache is BULLETPROOF! 🎉**
