# Feature Gating System - MemoryLane

This document describes the freemium feature gating system implemented in MemoryLane.

## Overview

MemoryLane uses a freemium model with two tiers:
- **Free Tier**: Limited features to encourage upgrades
- **Premium Tier**: Unlimited access to all features

## Free Tier Limits

| Feature | Free Tier Limit | Premium Tier |
|---------|----------------|--------------|
| Children | 1 child | Unlimited |
| Memories | 20 per child per month | Unlimited |
| Storage | 50MB total | Unlimited |
| Contributors | Owner only (0 contributors) | Unlimited |
| Auto Monthly Summaries | Manual only | Automatic |
| Auto Backup | Manual only | Automatic weekly |

## Implementation

### Subscription Utility (`utils/subscription.js`)

The subscription utility provides:
- `getSubscriptionTier()` - Get user's current tier ('free' or 'premium')
- `isPremium()` - Check if user has premium
- `getSubscriptionLimits()` - Get limits for current tier
- `canAddChild()` - Check if user can add another child
- `canAddMemory()` - Check if user can add another memory
- `canAddContributor()` - Check if user can add contributors
- `canUseAutoMonthlySummaries()` - Check if auto summaries are available
- `canUseAutoBackup()` - Check if auto backup is available
- `canAddStorage()` - Check if user has storage space

### Feature Gates

#### 1. Children Limit
- **Location**: `screens/AddChildScreen.js`
- **Check**: Before adding a child
- **Action**: Shows upgrade prompt if limit reached

#### 2. Memory Limit
- **Location**: `utils/storage.js` (addMemoryNew function)
- **Check**: Before adding a memory (counts current month's memories)
- **Action**: Shows upgrade prompt if limit reached

#### 3. Contributors
- **Location**: `utils/invitations.js` (sendInvitation function)
- **Check**: Before sending invitation
- **Action**: Shows upgrade prompt if trying to add contributors on free tier

#### 4. Auto Backup
- **Location**: `screens/SettingsScreen.js`
- **Check**: When enabling auto backup toggle
- **Action**: Shows upgrade prompt if not premium

#### 5. Auto Monthly Summaries
- **Location**: `utils/autoMonthlySummary.js` (can be gated)
- **Check**: Before sending automatic summaries
- **Action**: Only sends if premium (manual generation still works)

## Premium Screen

The Premium screen (`screens/PremiumScreen.js`) displays:
- Current subscription status
- Feature comparison (Free vs Premium)
- Upgrade button
- Premium feature list

## Upgrade Prompts

Upgrade prompts appear when:
1. User tries to add a 2nd child (free tier limit)
2. User tries to add 21st memory in a month (free tier limit)
3. User tries to add a contributor (premium feature)
4. User tries to enable auto backup (premium feature)

All prompts include:
- Clear explanation of the limit
- "Cancel" button
- "Upgrade" button that navigates to Premium screen

## Setting Premium Status

For testing or admin purposes, use:
```javascript
import { setSubscriptionTier } from './utils/subscription';

// Set user to premium
await setSubscriptionTier('premium');

// Set user back to free
await setSubscriptionTier('free');
```

## Subscription Status Storage

Subscription tier is stored in Firestore:
- Collection: `users`
- Document: `{userId}`
- Field: `subscriptionTier` ('free' or 'premium')
- Default: 'free' for new users

## Future Integration

To integrate with a payment provider (RevenueCat, Stripe, etc.):

1. Update `setSubscriptionTier()` to be called after successful payment
2. Add subscription status sync from payment provider
3. Add subscription expiration checks
4. Add subscription renewal handling

## Testing

To test feature gates:
1. Create a new user (defaults to free tier)
2. Try adding a 2nd child - should show upgrade prompt
3. Add 20 memories in a month - 21st should show upgrade prompt
4. Try adding a contributor - should show upgrade prompt
5. Try enabling auto backup - should show upgrade prompt
6. Set user to premium: `await setSubscriptionTier('premium')`
7. All limits should be removed

