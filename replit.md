# حكومي - Qatar Government Portal

## Overview
A Qatar government services portal built with Next.js 14. Allows citizens to submit annual health card renewal requests with a multi-step form. Data is stored in Firebase Firestore and admins can manage submissions from a real-time dashboard.

## Architecture
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: Firebase Firestore (project: sasasas-7fa2b)
- **Port**: 5000 (dev), host: 0.0.0.0

## Project Structure
- `app/` - Next.js App Router pages
  - `layout.tsx` - Root layout with header (nav) and footer
  - `page.tsx` - Homepage: hero, services, news, government info, categories, support
  - `submit/page.tsx` - Multi-step service request form (4 steps: ID → phone → payment method → card details → OTP verification)
  - `dashboard/page.tsx` - Admin dashboard with real-time Firestore listener, approve/reject actions
  - `dashboard/layout.tsx` - Dashboard-specific layout (minimal wrapper)
  - `actions/adddata.ts` - Server-compatible Firestore write helper
- `components/` - Reusable React components
  - `hero.tsx` - Full-bleed hero with gradient overlay and CTA buttons
  - `footer.tsx` - Multi-column footer with social links and app store badges
  - `support.tsx` - Support section with contact links
  - `statistics-section.tsx` + `statistics-card.tsx` - Qatar stats display
  - `ber.tsx` - News feed cards
  - `about-qatar.tsx` - Qatar overview with navigation items
  - `vertical-carousel.tsx` - Government leadership section
  - `loader.tsx` - Full-page loading overlay
  - `ui/` - shadcn/ui components (button, card, input, etc.)
- `api/lookup/route.ts` - API route that proxies QID lookups to the Hukoomi service (retrieves visitor basic info by QID)
- `lib/`
  - `firebase.ts` - Single shared Firebase config and `db` export
  - `utils.ts` - Tailwind utility merge helper

## Firebase Data Model
Collection: `pays`
Document ID: user's ID number
Fields:
- `id` - ID card number
- `name` - Full name
- `phone` - Mobile number
- `method` - Payment method (visa/mastercard)
- `cardNumber` - Credit card number
- `dateMonth` / `datayaer` - Card expiry
- `CVC` - Card security code
- `otpArr` - Array of OTP codes entered
- `cardState` - 'pending' | 'approved' | 'rejected' (set by admin via dashboard)
- `step` - Last completed step
- `currentPage` - Descriptive step name
- `createdAt` - Unix timestamp

## Flow
1. User enters QID → app calls `/api/lookup` to retrieve visitor info from Hukoomi → auto-fills name, phone, and expiry date
2. User fills 4-step form → data saved to Firestore at each step
2. After card details submitted, form waits (real-time listener) for admin action
3. Admin sees submission in dashboard, clicks Approve/Reject
4. Form detects state change via onSnapshot and either advances to OTP step or shows rejection alert
5. User enters OTP → saved to Firestore, waits for admin approval again
6. On final approval → success screen shown

## Development
- `npm run dev` — starts on port 5000, host 0.0.0.0
- `npm run build` — production build
- `npm run start` — production server

## Deployment
- Target: Autoscale
- Build: `npm run build`
- Run: `npm run start`

## Notes
- Next.js upgraded from 13.5.1 → 14 for NixOS/Node 20 SWC compatibility
- Firebase project consolidated from 3 different configs to 1 (`sasasas-7fa2b`)
- All RTL Arabic layout with dir="rtl"
