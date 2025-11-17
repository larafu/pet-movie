# Post-Review Restoration Plan

This document tracks all features and content removed for Creem payment provider compliance review that need to be restored after approval.

**Status**: Pending Creem Approval
**Created**: 2025-11-17
**Last Updated**: 2025-11-17

---

## Overview

To comply with Creem payment provider review requirements, we temporarily removed certain marketing content and features that could be perceived as misleading or unverifiable during the beta testing phase. These features should be restored once the platform is approved and has real user data.

---

## 1. Landing Page Statistics (PRIORITY: HIGH)

### Removed Content

**English (`src/config/locale/messages/en/landing.json`)**:
- Hero section stats:
  - "50K+ Movies Created"
  - "15K+ Happy Pet Parents"
  - "8min Avg. Processing Time"
- Stats section:
  - "50K+ Pet Movies Created"
  - "15K+ Happy Pet Parents"
  - "4.9★ Average Rating"

**Chinese (`src/config/locale/messages/zh/landing.json`)**:
- Hero section stats:
  - "50K+ 已创作影片"
  - "15K+ 满意用户"
  - "8分钟 平均处理时间"
- Stats section:
  - "50K+ 已创作宠物电影"
  - "15K+ 满意的宠物家长"
  - "4.9★ 平均评分"

### Restoration Action
- **When**: After approval + accumulating real user data
- **Replace with**: Actual statistics from database queries
- **Data sources**:
  - Total movies: `SELECT COUNT(*) FROM ai_task WHERE status = 'SUCCESS'`
  - Total users: `SELECT COUNT(*) FROM user`
  - Average rating: Implement rating system first
  - Average processing time: Calculate from `ai_task.createdAt` and completion time

### Files to Modify
```
src/config/locale/messages/en/landing.json (lines ~88-106, ~276-297)
src/config/locale/messages/zh/landing.json (lines ~93-111, ~281-300)
```

---

## 2. Customer Testimonials (PRIORITY: HIGH)

### Removed Content

All 6 fake testimonials removed from both English and Chinese versions:

1. **Sarah Johnson** - "金毛主人" - Testimonial about Max's first year movie
2. **Michael Chen** - "三只猫的铲屎官" - Testimonial about organizing cat photos
3. **Emma Rodriguez** - "救助犬倡导者" - Testimonial about shelter dog adoption stories
4. **David Park** - "柯基 Instagram 网红" - Testimonial about content creation
5. **Lisa Anderson** - "资深宠物主人" - Memorial movie testimonial
6. **Tom Wilson** - "新晋铲屎官" - Weekly updates testimonial

### Restoration Action
- **When**: After approval + collecting real user reviews
- **Replace with**: Actual user testimonials (with permission)
- **Implementation**:
  1. Add review/testimonial collection feature
  2. Request permission from users to use their feedback
  3. Implement testimonial management in admin panel
  4. Store in database (`testimonial` table - may need to create)

### Files to Modify
```
src/config/locale/messages/en/landing.json (testimonials section)
src/config/locale/messages/zh/landing.json (testimonials section)
```

### Database Schema Addition Needed
```typescript
export const testimonial = pgTable('testimonial', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('userId').references(() => user.id),
  name: text('name').notNull(),
  role: text('role'),
  quote: text('quote').notNull(),
  image: text('image'),
  approved: boolean('approved').default(false),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});
```

---

## 3. Navigation and Marketing Copy (PRIORITY: MEDIUM)

### Removed Content

**Navigation Links Removed**:
- English: "Pricing" link with `/pricing` URL
- Chinese: "价格" link with `/pricing` URL

**Marketing Copy Changes**:
- "Coming Soon" → "Beta Testing"
- "即将上线" → "Beta 测试"
- "Get Early Bird Discount Now" → "Try Free Beta"
- "立即购买享早鸟优惠" → "免费试用 Beta"
- All `/pricing` URLs in hero → Changed to `/sign-up`
- "10,000+ pet parents" → Removed number claim

### Restoration Action
- **When**: After approval + launching paid plans
- **Restore**:
  - Add back "Pricing" navigation link
  - Change beta language back to commercial language
  - Update CTAs to point to `/pricing` instead of `/sign-up`
  - Update announcement URLs from `/sign-up` to `/pricing`

### Files to Modify
```
src/config/locale/messages/en/landing.json (navigation, hero section)
src/config/locale/messages/zh/landing.json (navigation, hero section)
src/themes/default/blocks/hero.tsx (URL routing logic)
```

---

## 4. Pricing Page Content (PRIORITY: MEDIUM)

### Modified Content

**FAQ Changes**:
- "What's included in free plan?" → "What's included in free Beta?"
- "免费计划包含什么？" → "免费 Beta 测试包含什么？"
- Answer changed from subscription description to one-time 5 credits trial

### Restoration Action
- **When**: After approval + launching paid subscriptions
- **Restore**:
  - Update FAQ to reflect actual subscription plans
  - Remove beta-specific language
  - Add detailed pricing tier comparisons
  - Enable recurring subscription purchases

### Files to Modify
```
src/config/locale/messages/en/landing.json (FAQ section)
src/config/locale/messages/zh/landing.json (FAQ section)
src/config/locale/messages/en/pricing.json
src/config/locale/messages/zh/pricing.json
```

---

## 5. Logo and Branding (PRIORITY: LOW)

### Changes Made

Simplified logo structure:
- Before: Separate `logo-light.png` and `logo-dark.png` for theme switching
- After: Single `logo.png` for both themes

### Restoration Action (OPTIONAL)
- **When**: Design refresh or if theme-specific logos are needed
- **Consideration**: Current single logo works fine; only restore if there's a design reason

### Files to Modify
```
src/config/locale/messages/en/landing.json (brand.logoLight, brand.logoDark)
src/config/locale/messages/zh/landing.json (brand.logoLight, brand.logoDark)
public/logo-light.png (create if needed)
public/logo-dark.png (create if needed)
```

---

## 6. Features Added for Compliance (KEEP THESE)

These features were added during Creem compliance work and should be **retained**:

### Early Bird Promotion System ✅ KEEP
- **File**: `src/app/api/discount/validate/route.ts`
- **Purpose**: Discount code validation
- **Codes**:
  - `EARLYBIRD70`: 70% discount (3折) until 2025-11-24
  - `LAUNCH50`: 50% discount (5折)

### Early Bird Countdown Timer ✅ KEEP
- **File**: `src/themes/default/blocks/pricing.tsx`
- **Purpose**: Countdown timer for early bird promotion (Nov 16-24, 2025)
- **Features**:
  - Real-time countdown display
  - Automatic price calculation with 70% discount
  - Warning message about feature development status

### Smart URL Routing ✅ KEEP
- **File**: `src/themes/default/blocks/hero.tsx`
- **Purpose**: Redirect logged-in users from `/sign-up` to `/ai-video-generator`
- **Function**: `getButtonUrl()`

### Super Admin Unlimited Credits ✅ KEEP
- **Files**:
  - `src/shared/services/rbac.ts` - `isSuperAdmin()` function
  - `src/app/api/ai/generate/route.ts` - Skip credit checks
  - `src/shared/models/ai_task.ts` - `skipCreditConsumption` option
  - `src/shared/blocks/generator/video.tsx` - Frontend validation skip
- **Purpose**: Allow testing without credit limitations

---

## 7. Database Schema Changes

### Current Schema Status
No schema changes were made specifically for Creem compliance.

### Future Schema Additions Needed
After approval, consider adding:

1. **Testimonial Management**:
   ```sql
   CREATE TABLE testimonial (
     id TEXT PRIMARY KEY,
     user_id TEXT REFERENCES user(id),
     name TEXT NOT NULL,
     role TEXT,
     quote TEXT NOT NULL,
     image TEXT,
     approved BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. **User Reviews/Ratings**:
   ```sql
   CREATE TABLE review (
     id TEXT PRIMARY KEY,
     user_id TEXT REFERENCES user(id),
     ai_task_id TEXT REFERENCES ai_task(id),
     rating INTEGER CHECK (rating >= 1 AND rating <= 5),
     comment TEXT,
     approved BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

---

## Implementation Checklist

### Phase 1: Immediate (After Creem Approval)
- [ ] Restore "Pricing" navigation link
- [ ] Update marketing language from "Beta" to "Live"
- [ ] Enable pricing page prominently
- [ ] Review and update FAQ content

### Phase 2: With Real Data (1-2 weeks after launch)
- [ ] Implement review/rating collection system
- [ ] Add testimonial submission and approval workflow
- [ ] Replace fake statistics with real database queries
- [ ] Create admin dashboard for managing testimonials

### Phase 3: Feature Enhancement (1 month+ after launch)
- [ ] Implement comprehensive review system
- [ ] Add user rating feature for generated content
- [ ] Create public testimonial showcase
- [ ] Add social proof widgets with real data

---

## Testing Notes

Before restoration:
1. Verify Creem payment integration is stable
2. Ensure sufficient real user data exists for statistics
3. Have real testimonials collected and approved
4. Test pricing page with actual payment flow
5. Verify all marketing claims are accurate and verifiable

---

## Contact & Approval

**Review Required By**: Creem Payment Compliance Team
**Expected Approval Date**: TBD
**Responsible Developer**: David Bert
**Email**: support@petmovie.ai

---

## Appendix: Git References

**Compliance Changes Commit**: 6690bf6 (and unstaged changes)
**Key Modified Files**:
- `src/config/locale/messages/en/landing.json`
- `src/config/locale/messages/zh/landing.json`
- `src/config/locale/messages/en/pricing.json`
- `src/config/locale/messages/zh/pricing.json`
- `src/themes/default/blocks/hero.tsx`
- `src/themes/default/blocks/pricing.tsx`

**New Features Added**:
- `src/app/api/discount/validate/route.ts`

---

## Notes

- All removed content is stored in git history (commit before 6690bf6)
- Current changes are staged but not committed as of 2025-11-17
- Marketing claims should only be restored when backed by real data
- Prioritize user trust and transparency over aggressive marketing
