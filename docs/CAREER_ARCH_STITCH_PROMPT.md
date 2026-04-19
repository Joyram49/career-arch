# ============================================================

# JOBSPHERE — COMPLETE UI DESIGN PROMPT FOR GOOGLE STITCH

# A Glassdoor-Clone Job Portal Platform

# ============================================================

# HOW TO USE THIS FILE->

# Copy each section's prompt block into Google Stitch one at a time

# Start with "Global Design System" first, then do each page/section

# ============================================================

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# PROMPT 01 — GLOBAL DESIGN SYSTEM & BRAND IDENTITY

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Design a complete design system for a professional job portal platform called
JobSphere — a modern alternative to Glassdoor. The platform connects job seekers
(talent) with organizations (employers), managed by an admin.

BRAND PERSONALITY:

- Professional, trustworthy, modern
- Empowering for job seekers, efficient for employers
- Clean and data-rich, not corporate or stiff
- Similar energy to: Linear, Notion, Vercel — clean with purpose

COLOR PALETTE:

- Primary: Deep Navy #1a1a2e (brand, CTAs, nav)
- Secondary: Sky Blue #0ea5e9 (links, highlights, active states)
- Accent: Emerald #10b981 (success, verified badges, hired status)
- Warning: Amber #f59e0b (pending, review status)
- Danger: Red #ef4444 (rejected, error, urgent)
- Background: #f8fafc (page bg), #ffffff (cards), #f1f5f9 (input bg)
- Text Primary: #0f172a, Text Secondary: #64748b, Text Muted: #94a3b8
- Border: #e2e8f0

TYPOGRAPHY:

- Headings: Inter or Plus Jakarta Sans — Bold, tight letter-spacing
- Body: Inter — Regular 16px, 1.6 line height
- Labels/Caps: 12px uppercase, letter-spacing 0.08em
- Code/Monospace: JetBrains Mono

COMPONENT LIBRARY (design all these base components):

- Buttons: Primary (navy fill), Secondary (outline), Ghost, Destructive,
  Icon-only, Loading state
- Input fields: Default, Focus, Error, Disabled, with label + helper text
- Badges: Free (gray), Basic (blue), Premium (amber/gold), Hired (green),
  Rejected (red), Pending (yellow), Remote (teal)
- Cards: Job card, Company card, Application card, Stat card
- Avatars: User avatar, Company logo (square rounded), Initials fallback
- Navigation: Top navbar, Sidebar nav, Mobile bottom nav
- Dropdowns, Modals, Toasts/Alerts, Skeletons, Empty states
- Data table with sort/filter
- Tabs, Steppers, Progress bars
- Tags/Chips for skills

LAYOUT SYSTEM:

- 12-column grid, 1280px max-width container
- 8pt spacing system (4, 8, 12, 16, 24, 32, 48, 64, 96)
- Border radius: sm=4px, md=8px, lg=12px, xl=16px, 2xl=24px, full=9999px
- Shadows: sm (card), md (dropdown), lg (modal), none (flat UI default)

DESIGN ALL IN: Desktop (1440px), Tablet (768px), Mobile (375px)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# PROMPT 02 — PUBLIC LANDING PAGE (Home)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Design the public landing page for JobSphere job portal.

NAVBAR (sticky, white bg with bottom border on scroll):

- Left: JobSphere logo (navy wordmark + briefcase icon)
- Center: Navigation links — "Find Jobs", "Companies", "Salary Guide", "For
  Employers"
- Right: "Sign In" (ghost button) + "Get Started" (primary navy button)
- Mobile: hamburger menu

HERO SECTION (full-width, ~520px tall):

- Background: Deep navy (#1a1a2e) with subtle dot-grid pattern
- Headline (56px bold white): "Find the Job That Moves You Forward"
- Subheadline (20px, slate-300): "Search 50,000+ jobs from verified companies.
  Get matched, apply fast, land offers."
- Large search bar component (white bg, pill shape, 600px wide centered):
  - Left: location pin icon + "Job title, keyword..." placeholder
  - Middle: vertical divider
  - Right: "Location" placeholder + search CTA button (sky blue)
- Below search: Popular tags row — "Remote", "Full-time", "Engineering",
  "Design", "Marketing", "Finance"
- Social proof below: "Join 2.4M+ professionals" with 5 avatar stack + star
  rating

STATS BAR (white bg, border top and bottom):

- 4 stat blocks centered with dividers: "50,000+ Jobs" | "12,000+ Companies" |
  "2.4M+ Users" | "89% Hire Rate"

FEATURED JOBS SECTION:

- Section heading: "Latest Opportunities" with "View All" link right-aligned
- 3-column job card grid (4 cards total showing): Each card: Company logo
  (40px), Company name + "Verified" badge, Job title (bold 18px), Location +
  Remote tag, Salary range, Skills tags (3 max), "Applied X days ago" + "Apply
  Now" button
  - Hover: subtle lift shadow + sky blue border-left accent

HOW IT WORKS (3-step):

- Light gray background section
- 3 cards side by side with icon, step number, title, description
- Step 1: "Create Profile" — upload resume, add skills
- Step 2: "Choose Plan" — Free, Basic, or Premium
- Step 3: "Apply & Get Hired" — one-click apply, track status

SUBSCRIPTION PLANS SECTION:

- Heading: "Choose Your Plan" with subtitle "Upgrade anytime, cancel anytime"
- 3 pricing cards side by side: FREE card (gray border): $0/month — 10
  applications, 5 saved jobs, basic profile BASIC card (blue border, "Popular"
  badge): $9.99/month — 50 applications, 25 saved jobs, standard visibility
  PREMIUM card (amber border, "Best Value" badge): $24.99/month — Unlimited
  applications, featured profile, AI resume tips, priority listings
- Toggle: Monthly / Yearly (with 20% discount label)

TOP COMPANIES SECTION:

- "Trusted by Leading Companies" heading
- 2-row logo carousel (8 company logos, gray-scaled, hover to color)
- Below: "Are you hiring? Post a job →" CTA for organizations

TESTIMONIALS:

- 2-column grid, 3 testimonials
- Quote, user avatar, name, job title, company name, star rating

FOOTER:

- Dark navy background (#0f172a)
- 4-column: Logo+tagline | Job Seekers links | Employers links | Company links
- Bottom bar: Copyright | Privacy Policy | Terms | Cookie Settings
- Social icons: LinkedIn, Twitter/X, Facebook, Instagram

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# PROMPT 03 — JOB SEARCH & LISTING PAGE

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Design the job search and listing results page for JobSphere.

LAYOUT: 2-column — left sidebar (280px) + right results (flex grow), full height

TOP SEARCH BAR (full width, white bg with border-bottom):

- Sticky at top below navbar
- Keyword input (with search icon) + Location input (with pin icon) + "Search"
  button
- Active filter chips below: "Full-time ×" "Remote ×" "Engineering ×" — "Clear
  all" link

LEFT SIDEBAR FILTERS (280px, white bg, thin right border):

- Section header: "Filter Jobs"
- Filter groups (each collapsible with chevron): JOB TYPE: Checkboxes —
  Full-time, Part-time, Contract, Internship, Freelance, Remote EXPERIENCE:
  Checkboxes — Entry Level, Mid Level, Senior, Lead/Principal SALARY RANGE: Dual
  handle range slider — $0 to $300k+ LOCATION: Text input with autocomplete +
  distance radius dropdown COMPANY SIZE: 1-10, 11-50, 51-200, 201-1000, 1000+
  INDUSTRY: Multi-select dropdown — Technology, Finance, Healthcare, etc. DATE
  POSTED: Radio — Any time, Last 24 hours, Last week, Last month REQUIRED PLAN:
  FREE only / Basic+ / Premium (shows badge next to label)
- "Apply Filters" primary button + "Reset" ghost link at bottom

RIGHT PANEL:

- Results header: "2,847 jobs found" (left) + Sort dropdown "Most Recent"
  (right) + List/Grid toggle
- Job cards list (full width): Each card (white bg, border, rounded-lg, hover
  border-blue):
  - Left: Company logo (48px rounded square)
  - Middle: Job title (bold 16px, clickable navy), Company name + Verified
    badge, Location + Remote tag row, Skills chips row (3-4 skill tags)
  - Right column: Salary range (bold), Posted date (muted), Plan badge
    (FREE/BASIC/PREMIUM), "Save" heart icon + "Apply" button (sky blue)
  - Card bottom bar: Application count ("47 applied") + closing date if exists
- Pagination at bottom: Previous | 1 2 3 ... 8 9 | Next

EMPTY STATE (when no results):

- Centered illustration of magnifying glass + briefcase
- "No jobs match your filters" heading
- "Try adjusting your search terms or removing some filters" subtext
- "Clear All Filters" button

MOBILE: filters collapse into a "Filters" modal sheet triggered by a bottom
sticky bar

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# PROMPT 04 — JOB DETAIL PAGE

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Design the job detail page for JobSphere.

LAYOUT: 2-column — main content (70%) + right sticky sidebar (30%)

BREADCRUMB: Home > Engineering > Senior Backend Engineer

JOB HEADER CARD (white bg, full width, prominent):

- Left: Company logo (72px, rounded-lg), Company name + "Verified" badge
- Job title: 28px bold, navy — "Senior Backend Engineer"
- Meta row: 📍 New York, NY | 🌐 Remote Friendly | 💼 Full-time | 🎓 Senior
  Level | ⏰ Posted 3 days ago
- Salary: "$120,000 – $160,000 / year" in large emerald text with salary icon
- Plan Required badge: "BASIC PLAN REQUIRED" in blue badge
- Action row: "Apply Now" (large primary button) + "Save Job" (heart outline) +
  "Share" (icon)
- Stats chips: "47 applicants" | "12 days left" | "3 vacancies"

MAIN CONTENT TABS: Overview | Requirements | Company | Reviews

TAB: OVERVIEW

- About the Role (rich text): Multi-paragraph job description
- Key Responsibilities (bulleted list with checkmark icons)
- What We Offer (benefits grid): Health Insurance, Remote Work, Stock Options,
  Learning Budget, 401k, Unlimited PTO — each as a small card with icon

TAB: REQUIREMENTS

- Required Skills (skill chips, highlighted in blue)
- Preferred Skills (skill chips, gray)
- Experience Required: "5+ years"
- Education: "Bachelor's degree in Computer Science or equivalent"
- Screening Questions section (if any)

TAB: COMPANY

- Company banner/cover image
- Logo, name, "Verified Employer" badge
- Industry, Company size, Founded year, Website link
- Company description paragraph
- Office locations map placeholder
- "View all jobs at this company →" link

RIGHT STICKY SIDEBAR:

- Apply box card (white, border, shadow-md):
  - Salary range prominent
  - Job type + Location
  - "Apply Now" full-width primary button
  - "Save for later" ghost button with heart icon
  - Divider + "Share this job" with LinkedIn, Twitter, Copy link icons
- Similar Jobs section (3 compact cards below):
  - Company logo (32px) + Job title + Salary + "View" link

BOTTOM: Related Jobs section (4-column grid of job cards)

APPLY MODAL (triggered by Apply Now):

- Modal header: "Apply for Senior Backend Engineer at TechCorp"
- Step indicator: 1 Profile → 2 Resume → 3 Questions → 4 Review
- Step 1: Auto-filled profile preview with "Edit" link
- Step 2: Resume upload (drag & drop, shows existing resume with option to
  upload new)
- Step 3: Optional cover letter textarea + screening questions
- Step 4: Review all details before submitting
- Bottom: "Back" + "Next" / "Submit Application" buttons
- Success state: Green checkmark animation, confirmation message, "Track
  Application →" link

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# PROMPT 05 — AUTH PAGES (Sign Up, Login, Reset Password, 2FA)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Design all authentication pages for JobSphere. All auth pages share the same
split-screen layout.

LAYOUT: Left panel (55%) = illustration/branding, Right panel (45%) = form

LEFT PANEL (all auth pages):

- Navy background (#1a1a2e)
- JobSphere logo (white) top-left
- Central illustration: abstract geometric shapes representing career growth /
  connections
- Bottom: Quote or tagline — "Your next opportunity is one application away"
- Decorative dots grid or mesh pattern subtle in background

---

PAGE A: USER REGISTRATION Right panel content:

- "Create your account" heading + "Join 2.4M+ professionals"
- Google OAuth button (white border button, Google icon)
- LinkedIn OAuth button
- "Or continue with email" divider
- Form fields: First Name + Last Name (side by side), Email, Password (with
  strength meter bar), Confirm Password
- Password requirements checklist (shows green checks as user types): 8+ chars,
  uppercase, number, special char
- Terms checkbox: "I agree to Terms of Service and Privacy Policy"
- "Create Account" primary button (full width)
- "Already have an account? Sign in" link
- "Are you an employer? Register your company →" text link below

---

PAGE B: ORGANIZATION REGISTRATION Right panel:

- "Post jobs and find top talent" heading
- "Join 12,000+ companies on JobSphere"
- Form: Company Name, Work Email, Password, Confirm Password
- Note card (blue bg): "Your account will be reviewed and approved by our team
  (1-2 business days)"
- Terms checkbox
- "Create Organization Account" button
- "Already registered? Sign in" link

---

PAGE C: LOGIN Right panel:

- "Welcome back" heading + subtitle
- Email + Password fields
- Show/hide password toggle on password field
- "Remember me" checkbox (left) + "Forgot password?" link (right)
- "Sign In" primary button
- Divider "or"
- Google + LinkedIn OAuth buttons
- "Don't have an account? Sign up" link
- User type toggle at top: "Job Seeker | Employer | Admin" tabs

---

PAGE D: FORGOT PASSWORD Right panel:

- Back arrow link "← Back to login"
- Lock icon (large, centered, navy)
- "Forgot your password?" heading
- "Enter your email and we'll send you a reset link" subtext
- Email input field
- "Send Reset Link" button
- "Check your email" success state: Green envelope icon + instructions + "Resend
  email" link (with 60s countdown)

---

PAGE E: RESET PASSWORD Right panel:

- Shield icon
- "Create new password" heading
- New Password field with strength meter
- Confirm Password field
- Password requirements list with live validation
- "Reset Password" button
- Success state: Green checkmark + "Password changed! Redirecting to login..."

---

PAGE F: EMAIL VERIFICATION

- Centered card (not split layout, centered on page)
- Large envelope icon (animated: flap opens)
- "Check your email" heading
- "We sent a verification link to <john@email.com>"
- "Resend verification email" link with countdown timer
- "Wrong email? Change email address" link

---

PAGE G: TWO-FACTOR AUTHENTICATION (2FA OTP Entry)

- Centered modal-style card
- Shield/lock icon
- "Two-Factor Authentication" heading
- "Enter the 6-digit code from your authenticator app"
- 6 individual digit input boxes (auto-advance on type)
- 60-second countdown timer with progress ring
- "Resend code" link
- "Verify Code" button
- "Lost access to your authenticator? Use backup code" text link

---

PAGE H: 2FA SETUP PAGE (Settings flow)

- Step 1: QR Code display card (centered, white bg, with download QR option)
- "Scan this code with Google Authenticator or Authy"
- Manual entry code below: "ABCD EFGH IJKL MNOP" (monospace, copy button)
- Step 2: Verify OTP input (same 6-box style)
- Step 3: Backup codes screen — 8 codes in 2-column grid, copy all button,
  download button, "I've saved my codes" checkbox to proceed

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# PROMPT 06 — PRICING / SUBSCRIPTION PLANS PAGE

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Design the subscription plans and pricing page for JobSphere job seekers.

PAGE HEADER:

- "Choose Your Plan" centered headline (40px bold)
- "Unlock more opportunities. Upgrade anytime, cancel anytime." subtext
- Monthly / Yearly toggle (pill style, yearly shows "Save 20%" badge in green)

PLANS SECTION (3 pricing cards, horizontally centered, max 960px):

FREE CARD (gray border, standard size):

- Badge: "FREE FOREVER" in gray pill
- Plan name: "Free" (32px bold)
- Price: "$0 / month"
- Subtext: "For getting started"
- Divider
- Feature list with checkmark icons: ✓ Apply to Free-tier jobs (10/month) ✓ 5
  saved jobs ✓ Basic profile ✓ Email notifications ✗ Basic/Premium jobs (grayed
  out) ✗ Application analytics ✗ Priority visibility
- "Current Plan" gray button (or "Get Started Free")

BASIC CARD (blue border, slightly elevated, "Most Popular" badge in blue):

- Badge: "MOST POPULAR" in sky blue pill
- Plan name: "Basic" (32px bold)
- Price: "$9.99 / month" (large) + "$7.99/mo billed yearly" below
- "For active job seekers"
- Feature list: ✓ Everything in Free ✓ Apply to Free + Basic jobs (50/month) ✓
  25 saved jobs ✓ Standard profile visibility ✓ Basic application analytics ✓
  Profile badge ✗ Premium jobs ✗ AI resume tips ✗ Priority in search
- "Upgrade to Basic" primary sky blue button

PREMIUM CARD (amber/gold gradient border, larger, "Best Value" badge):

- Badge: "BEST VALUE" in amber pill
- Plan name: "Premium" (32px bold) with ✨ sparkle icon
- Price: "$24.99 / month" + "$19.99/mo yearly"
- "For serious job hunters"
- Feature list: ✓ Everything in Basic ✓ Apply to ALL jobs (Unlimited) ✓
  Unlimited saved jobs ✓ Featured profile in search results ✓ Advanced
  application analytics ✓ AI-powered resume tips ✓ Priority in recruiter
  searches ✓ Premium profile badge ✓ Exclusive Premium-only jobs
- "Upgrade to Premium" amber/gold button

COMPARISON TABLE (below cards):

- Full feature matrix table with all 3 plans in columns
- Row groups: Applications, Profile, Visibility, Analytics, Support
- Checkmarks vs X marks, with some cells showing quantity values

FAQ SECTION:

- 5-6 accordion FAQ items: "Can I switch plans anytime?" / "What happens when I
  cancel?" / "Is there a free trial?" / "Which jobs require a paid plan?" / "How
  do I get a refund?" / "What payment methods are accepted?"

STRIPE PAYMENT MODAL (triggered by upgrade button):

- Modal with plan summary at top
- Stripe card element (card number, expiry, CVC)
- Promo code field with "Apply" button
- Order summary: plan name, billing cycle, subtotal, any discount, total
- "Upgrade Now — $9.99/month" confirm button
- Padlock icon + "Secured by Stripe" text
- Cancel link

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# PROMPT 07 — USER DASHBOARD (Job Seeker)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Design the complete job seeker dashboard for JobSphere. The user is logged in.

LAYOUT: Fixed left sidebar (240px, navy bg) + Main content area (flex grow,
light gray bg)

LEFT SIDEBAR NAVIGATION:

- Top: User avatar (40px) + name + "Premium" gold badge
- Nav items with icons: 📊 Overview (active state: sky blue bg pill) 📋 My
  Applications 🔖 Saved Jobs 👤 My Profile 💳 Subscription 🔔 Notifications
  (with unread count badge) ⚙️ Settings 🚪 Sign Out (bottom, danger color)

---

PAGE: OVERVIEW DASHBOARD

Welcome banner: "Good morning, John 👋 You have 3 new interview invitations!"

STATS ROW (4 stat cards):

- "Applications Sent" — 28 | +5 this week
- "Interview Invites" — 3 | 2 pending response
- "Profile Views" — 147 | ↑ 23% this week
- "Saved Jobs" — 12 | 8 new since last visit

APPLICATION PIPELINE (horizontal Kanban-style):

- 5 columns: Applied | Under Review | Shortlisted | Interview | Offer/Hired
- Each column has count badge
- Job cards inside each column (company logo, job title, date)
- Color-coded left border by status

RECENT ACTIVITY FEED (right panel):

- Timeline list: "TechCorp viewed your application" | "Interview scheduled with
  Acme Inc." | "New job match: Senior Dev at Stripe"

RECOMMENDED JOBS (based on profile):

- "You might like these" section
- 3 horizontal job cards with "Apply" + "Save" actions

---

PAGE: MY APPLICATIONS

Filter bar: All | Pending | Under Review | Shortlisted | Interview | Offered |
Rejected | Withdrawn

Data table columns:

- Company (logo + name)
- Job Title (clickable)
- Applied Date
- Status (colored badge)
- Last Updated
- Actions (View | Withdraw)

Application detail drawer (slides from right when row clicked):

- Job title + company header
- Status timeline stepper (Applied → Reviewed → Shortlisted → Interviewed →
  Decision)
- Cover letter preview (collapsed)
- Resume used (filename + download)
- Notes from organization (if shared)
- "Withdraw Application" danger button

---

PAGE: SAVED JOBS

Grid of job cards (same as search results but with "Unsave" heart + "Apply Now"
button) Sort: Recently Saved | Salary | Deadline Filter: By plan required |
Remote | Full-time Empty state: "No saved jobs yet. Explore jobs →"

---

PAGE: MY PROFILE

Split layout: Preview panel (left, 35%) + Edit form (right, 65%)

Profile preview (as recruiters see it):

- Cover/banner area (uploadable gradient)
- Avatar (large, 96px, uploadable) + name + headline
- Location, experience years, LinkedIn/GitHub links
- Skills chips
- "Premium" badge if premium user

Edit form sections:

- Basic Info: First name, Last name, Phone, Location
- Professional: Headline, Summary (textarea with char count)
- Resume: Current resume filename + upload new button (drag drop zone)
- Avatar: Upload/crop/remove
- Skills: Tag input with autocomplete
- Social Links: LinkedIn, GitHub, Portfolio URL
- Experience: Add/edit/remove jobs inline
- "Save Changes" sticky bottom bar

---

PAGE: SUBSCRIPTION

Current Plan card:

- Plan name + badge + "Active" green badge
- Next billing date + amount
- "Upgrade" (if free/basic) or "Manage Billing" button
- "Cancel Subscription" text link (danger)

Plan comparison (condensed version of pricing page)

Payment History table:

- Date | Description | Amount | Status (Succeeded/Failed) | Invoice download
  button

Upgrade prompts:

- "You've used 8/10 applications this month" progress bar
- "Upgrade to Basic to apply to 50 jobs/month" CTA card

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# PROMPT 08 — ORGANIZATION DASHBOARD

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Design the complete organization (employer) dashboard for JobSphere.

LAYOUT: Fixed left sidebar (240px, dark slate #1e293b) + Main content

LEFT SIDEBAR:

- Top: Company logo (40px) + Company name + "Approved" green badge (or "Pending
  Approval" amber badge)
- Nav items: 📊 Dashboard 💼 My Jobs ➕ Post a Job 📥 Applications 💰 Incentives
  🏢 Company Profile 💳 Billing ⚙️ Settings 🚪 Sign Out

---

PAGE: ORGANIZATION OVERVIEW DASHBOARD

Top: "Welcome back, TechCorp 👋"

STATS ROW (4 cards):

- Active Job Listings: 8 | 2 expiring soon
- Total Applications: 234 | +47 this week
- Interviews Scheduled: 12 | 5 this week
- Successful Hires: 3 | $150 incentive due

QUICK ACTIONS ROW:

- "Post New Job" (primary button with + icon)
- "View All Applications"
- "Pay Pending Incentives" (amber badge if any pending)

JOBS PERFORMANCE TABLE:

- Columns: Job Title | Status | Applications | Views | Days Active | Actions
- Status badges: Published (green) | Draft (gray) | Closed (red) | Archived
  (slate)
- Actions: Edit | View Applications | Close | Archive

RECENT APPLICATIONS (right panel):

- 5 most recent applicants with avatar, name, job they applied to, time, quick
  "Review" button

---

PAGE: MY JOBS

TABS: All | Published | Drafts | Closed | Archived (each with count)

Filter bar: Search by title | Filter by type | Filter by date

JOB CARDS (list view): Each card:

- Job title (bold) + Plan required badge + Status badge
- Meta: Full-time | Remote | $120k-$160k | Senior
- Stats: 47 applications | 1,240 views | Closes in 8 days
- Actions row: "View Applications" | "Edit" | "Close" | "Duplicate" | "Delete"
  (icon)

Empty state for Drafts: "You have no drafts. Start creating a job →"

---

PAGE: POST A JOB (Multi-step form)

Step indicator at top: 1 Basics → 2 Details → 3 Requirements → 4 Review &
Publish

STEP 1 — JOB BASICS:

- Job Title (text input)
- Job Type: Full-time | Part-time | Contract | Internship | Freelance (radio
  card group)
- Location (text input) + "This is a remote position" checkbox
- Salary Range: Min input — Max input + Currency dropdown + "Don't specify"
  checkbox
- Category (dropdown): Engineering, Design, Marketing, Finance, etc.
- Number of Vacancies (number input)
- Application Deadline (date picker)
- Required Subscription Plan: Free | Basic | Premium (radio card group with plan
  descriptions)

STEP 2 — JOB DETAILS:

- Job Description (TipTap rich text editor with toolbar: B I U | bullets |
  headers | links)
- Responsibilities (rich text editor)
- What We Offer / Benefits (tag input: Health Insurance, Remote Work, etc.)

STEP 3 — REQUIREMENTS:

- Required Skills (tag input with autocomplete)
- Preferred Skills (tag input)
- Experience Level: Entry | Mid | Senior | Lead (segmented control)
- Education requirement (dropdown)
- Screening Questions (add up to 5 custom questions)

STEP 4 — REVIEW:

- Full preview of the job as it will appear to candidates
- "Publish Now" (green button) + "Save as Draft" (outline button)
- Note: "This job will require BASIC plan or above to apply"

---

PAGE: APPLICATIONS (Per Job)

Header: "Applications for Senior Backend Engineer" with back arrow

KANBAN BOARD VIEW:

- 5 columns: Applied | Under Review | Shortlisted | Interview Scheduled | Final
  Decision
- Each column: count chip + scrollable candidate cards
- Candidate card: Avatar + Name + Experience + Applied date + "Quick View" on
  hover

LIST VIEW TOGGLE:

- Table: Avatar+Name | Experience | Applied | Status | Resume | Actions
- Row click → Application detail side panel

APPLICATION DETAIL SIDE PANEL (slides from right):

- Candidate name, avatar, headline
- Applied date + Status dropdown (can update status)
- Links: LinkedIn profile, Portfolio
- Resume preview/download button
- Cover letter (expandable)
- Screening question answers
- Internal notes textarea (org-only)
- Status update buttons: "Move to Shortlist" | "Schedule Interview" | "Make
  Offer" | "Hire" | "Reject"
- "HIRE" button triggers confirmation modal: "Marking as Hired will trigger a
  $50 platform incentive due within 7 days. Proceed?"

---

PAGE: INCENTIVES

Banner (amber): "You have 2 pending incentive payments — Due in 5 days"

TABLE: Candidate | Job | Hire Date | Amount | Due Date | Status | Action

- Status badges: Pending (amber) | Paid (green) | Overdue (red) | Waived (gray)
- Action: "Pay $50" (button for pending) | "View Receipt" (for paid)

Pay Incentive Modal:

- Summary: "Hiring incentive for John Doe — Senior Backend Engineer"
- Amount: $50.00
- Stripe card element (use saved payment method or add new)
- "Pay $50 Now" confirm button

Incentive history section below with all past payments

---

PAGE: COMPANY PROFILE

Preview panel (left) + Edit form (right) — same pattern as user profile

Fields: Company Name, Logo upload, Cover/banner upload, Website, Industry
(dropdown), Company Size (dropdown), Founded Year, Description (rich text),
Location, Country, LinkedIn URL, Twitter URL

"How your company appears to candidates" preview on left

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# PROMPT 09 — ADMIN DASHBOARD

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Design the complete admin dashboard for JobSphere platform management.

LAYOUT: Fixed left sidebar (260px, very dark navy #0f172a) + Main content

LEFT SIDEBAR:

- Top: "JobSphere Admin" logo + "Super Admin" role badge (red)
- Nav sections:

  PLATFORM 📊 Overview 📈 Analytics

  USERS & ORGS 👥 Users 🏢 Organizations

  CONTENT 💼 Jobs 📋 Applications

  PAYMENTS 💳 Subscriptions 💰 Incentives 📑 Transactions

  SYSTEM ⚙️ Settings 🛡️ Audit Log 🚪 Sign Out

---

PAGE: ADMIN OVERVIEW

Top row — PLATFORM STATS (6 cards in 3+3 grid): Row 1: Total Users (24,847) |
Total Organizations (1,204) | Active Jobs (5,842) Row 2: Revenue MRR ($48,290) |
Pending Incentives ($2,400) | New This Week (143 users)

Each stat card: Large number, label, sparkline mini chart, trend % badge (↑
green / ↓ red)

CHARTS ROW (2 charts side by side):

- Left: "User Registrations" — 30-day line chart (sky blue line)
- Right: "Revenue Breakdown" — Donut chart: Free (gray) / Basic (blue) / Premium
  (amber) + total center

PENDING ACTIONS TABLE (urgent items for admin):

- Organizations awaiting approval (pending badge + "Approve" | "Reject" buttons)
- Reported job listings (flagged badge + "Review" | "Remove" buttons)
- Dispute incentives (disputed badge + "Resolve" | "Waive" buttons)

RECENT ACTIVITY LOG:

- Timeline feed: "New org registered: Acme Corp" | "Job takedown requested" |
  "User reported content" with timestamps

---

PAGE: USERS MANAGEMENT

FILTER BAR: Search by name/email | Filter by Role | Filter by Plan | Filter by
Status | Date range

DATA TABLE:

- Columns: Avatar+Name | Email | Plan Badge | Joined Date | Last Login | Status
  (Active/Suspended) | Actions
- Actions dropdown: View Profile | Send Email | Suspend | Activate | Delete

USER DETAIL MODAL:

- Full profile info
- Subscription history
- Application history (all jobs applied to)
- Login history
- "Suspend Account" red button + "Send Warning Email" button

---

PAGE: ORGANIZATIONS MANAGEMENT

TABS: All | Pending Approval | Approved | Suspended

TABLE: Logo+Name | Email | Industry | Jobs Posted | Total Hires | Joined |
Approval Status | Actions

- "Approve" green button for pending orgs
- "Suspend" button for active
- View all jobs/applications for that org

ORGANIZATION DETAIL MODAL:

- Company profile info
- Jobs posted (list)
- Incentive payment history
- "Approve" | "Suspend" | "Delete" actions

---

PAGE: JOBS MANAGEMENT

FILTER BAR: Search by title | Organization | Status | Plan Required | Date

TABLE: Job Title | Organization | Status Badge | Plan Required | Applications |
Views | Posted Date | Actions

- Actions: View | Takedown | Archive

"Takedown" modal with reason field (Policy violation, Spam, Duplicate, etc.)

---

PAGE: SUBSCRIPTIONS

TABS: Active | Cancelled | Past Due | All

TABLE: User | Plan | Started | Renewal Date | Amount | Status | Stripe Sub ID

- "Cancel Subscription" admin override action
- Stats at top: Active Basic (count + MRR) | Active Premium (count + MRR) |
  Total Churn Rate

---

PAGE: INCENTIVES (Admin view)

Stats: Total Pending ($X) | Total Paid this month ($X) | Overdue count (X)

TABLE: Organization | Candidate | Job | Amount | Status | Due Date | Paid Date |
Action

- "Waive" button for any incentive (with reason modal)
- "Mark as Paid" override
- Export to CSV button

---

PAGE: TRANSACTIONS

Timeline/table of all platform payments:

- Subscription payments + Incentive payments combined
- Columns: Date | Type (Subscription/Incentive) | User/Org | Amount | Status |
  Stripe ID | Receipt
- Filter by: type, status, date range, amount range
- Revenue summary cards at top: Today | This Month | All Time

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# PROMPT 10 — COMPANIES DIRECTORY PAGE

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Design the companies directory and company detail pages for JobSphere.

COMPANIES LISTING PAGE:

- Hero: "Explore Top Companies" heading + search input "Search by company name
  or industry"
- Filter row: Industry (dropdown) | Size (dropdown) | Location (dropdown) |
  "Actively Hiring" toggle
- Grid (3 columns): Company cards Each card: Logo (64px) | Company name +
  Verified badge | Industry tag | Location | Company size | "X open jobs" green
  chip | Star rating (if reviews) | "View Company" button

COMPANY DETAIL PAGE:

COVER BANNER (full width, company bg color or gradient) with company logo (96px,
white card, centered or left)

COMPANY HEADER:

- Company name (32px bold) + "Verified Employer" badge
- Industry | Location | Founded | Company size | Website link
- "X open jobs" (green link)
- Follow company button (bell icon)

TABS: Overview | Jobs | Reviews | Salaries

TAB: OVERVIEW

- About section (company description rich text)
- Benefits grid (icons: Health, Remote, Stock, PTO, etc.)
- Photo gallery (grid of company culture photos)
- Employee count breakdown (office locations if multiple)

TAB: JOBS

- Same job cards as search page but filtered to this company
- "View All Jobs" button if more than 6

TAB: REVIEWS (future feature placeholder)

- Rating summary: Overall 4.2/5 with breakdown bars (Culture, WLB, Compensation,
  Management)
- Review cards: anonymous, role, rating, pros/cons

TAB: SALARIES (future feature placeholder)

- Salary ranges by role in table format

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# PROMPT 11 — NOTIFICATIONS & SETTINGS PAGES

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NOTIFICATIONS PAGE (User):

- Header: "Notifications" + "Mark all as read" link
- Filter tabs: All | Applications | Jobs | Account | Billing
- Notification list items: Each item: Icon (colored by type) | Message text |
  Time | "Unread" blue dot Types:
  - Green checkmark: "Your application was shortlisted at TechCorp"
  - Calendar: "Interview scheduled — Friday 3pm with Acme Inc."
  - Briefcase: "New job match: Senior Dev at Stripe ($130k)"
  - Bell: "Your profile was viewed by 12 recruiters this week"
  - Credit card: "Subscription renewed — $9.99 charged"
  - Warning: "Your application was rejected at Meta"
- Empty state: Bell icon + "You're all caught up!"

SETTINGS PAGE (User):

- Left nav: Profile | Account | Password | Notifications | Privacy | Billing |
  Danger Zone

SETTINGS: ACCOUNT

- Email address (with "Change" button → modal with confirm password)
- Phone number
- Timezone, Language
- "Delete Account" danger zone at bottom

SETTINGS: PASSWORD

- Current password field
- New password + strength meter
- Confirm new password
- "Update Password" button

SETTINGS: NOTIFICATIONS

- Toggle groups: Email Notifications: Application updates | New job matches |
  Profile views | Weekly digest Push Notifications: (same categories) Frequency:
  Immediately | Daily digest | Weekly digest

SETTINGS: PRIVACY

- Profile visibility: Public | Registered users only | Hidden
- Who can see my resume: Everyone | Verified companies only | Nobody
- "Show me in recruiter searches" toggle

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# PROMPT 12 — MOBILE DESIGN (All key screens)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Design the mobile (375px width) versions of all key screens.

MOBILE NAVIGATION:

- Top: Logo left + notification bell right + profile avatar right
- Bottom tab bar (5 tabs): Home | Search | Apply+ (center, raised navy button) |
  Applications | Profile

MOBILE SCREENS TO DESIGN:

1. Landing/Home — condensed hero with search, 2-col job grid
2. Job Search — full-screen filters as bottom sheet, job list cards
3. Job Detail — stacked layout, sticky "Apply" button at bottom
4. Login — single column form, social login at top
5. Register — single column, step-by-step flow
6. User Dashboard — stat cards (2x2 grid), application status list
7. My Applications — status filter chips + list view (no table)
8. Profile page — avatar + edit sections stacked
9. Notifications — full-screen list
10. Apply Flow — full-screen step-by-step modal

MOBILE-SPECIFIC PATTERNS:

- Filter bottom sheet: pulls up from bottom, 80% height, handle bar at top,
  scrollable filter options, "Apply (X)" sticky button
- Job card: Full width, horizontal layout (logo left, info right), "Save" heart
  top-right corner
- Application status: Horizontal scroll pill chips for status filter
- Profile avatar: Centered with edit overlay on tap
- Bottom floating action button for "Post Job" in org dashboard

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# PROMPT 13 — EMPTY STATES, ERROR PAGES & ONBOARDING

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EMPTY STATES (design each as a component):

- No jobs found: magnifying glass illustration + "No results" + "Adjust filters"
- No applications: empty inbox illustration + "Start applying to track here"
- No saved jobs: heart/bookmark illustration + "Save jobs to review later"
- No notifications: bell illustration + "You're all caught up!"
- No companies found: building illustration + "No companies match your search"
- Organization: No jobs posted: + icon + "Post your first job to start hiring"
- Organization: No applications yet: empty funnel + "Applications will appear
  here"

ERROR PAGES: 404 PAGE:

- Large "404" number (decorative, navy gradient)
- "Page not found" heading
- "The page you're looking for doesn't exist or has been moved"
- "Go back home" primary button + "Search jobs" secondary button
- Subtle briefcase/path illustration

500 PAGE:

- "Something went wrong" heading
- "We're working to fix it" subtext
- "Try again" button + "Go home" link
- Subtle server/cloud illustration

UNAUTHORIZED PAGE (403):

- Lock icon
- "Access Denied" heading
- "This page requires a higher subscription plan"
- "Upgrade to Premium" CTA button

MAINTENANCE PAGE:

- Clock/wrench illustration
- "We'll be back soon" heading
- Estimated downtime text
- Status page link

USER ONBOARDING FLOW (new user, 4 steps): Step 1 WELCOME: "Welcome to JobSphere,
John! Let's set up your profile" Step 2 PROFILE: Quick profile setup — headline,
location, experience years Step 3 SKILLS: Tag input for skills "What are you
skilled in?" Step 4 RESUME: "Upload your resume to apply faster" — drag drop
zone + skip option Final: "You're all set! 🎉 Here are jobs that match your
profile" → redirects to search with pre-filled filters

ORG ONBOARDING FLOW (new organization, approved): Step 1: "Welcome to JobSphere
for Employers!" Step 2: Company profile setup — logo, description, industry Step
3: "Post your first job" with mini form preview Step 4: Connect payment method
(for incentives) Final: "You're ready to hire! View your dashboard →"
