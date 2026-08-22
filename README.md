🌍 GlobeTrotter — Empowering Personalized Travel Planning
GlobeTrotter helps travelers design personalized itineraries, track budgets in real time, visualize their journey on a calendar, and share their plans with the world.

📖 Overview
GlobeTrotter transforms the way people plan trips — from a single form into a complete, end-to-end journey:
Signup → Dashboard → Create Trip → Add Cities & Activities → Set Dates → Calculate Budget → View Timeline → Share → Copy Trip
Built as a relational, data-driven application (not a static prototype), every screen reads and writes real data through Supabase, so changes to an itinerary propagate live across the budget, calendar, and trip summary views.

✨ Features
Core 
🔐 Authentication — Email/password signup & login via Supabase Auth
🏠 Dashboard — Upcoming trips, popular destinations, quick actions
🧳 Trip Management — Create, edit, delete, and list trips with status (upcoming / ongoing / completed)
🗺️ Itinerary Builder — Add multi-city stops, assign dates, add activities per stop, reorder stops
🔍 City & Activity Search — Filter cities by country/cost/popularity; filter activities by category/cost
💰 Budget & Cost Breakdown — Automatically calculated totals, category-wise breakdown, per-day cost, over-budget warnings
📅 Calendar / Timeline View — Month grid and vertical timeline, with schedule-conflict detection
🔗 Sharing — Public/private toggle, shareable read-only itinerary link, "Copy Trip" to duplicate someone else's plan
👤 User Profile — Editable personal info, saved destinations
🗄️ Relational Database — Fully normalized schema in PostgreSQL (via Supabase) with Row-Level Security

Enhancements 
Drag-and-drop itinerary reordering
Automatic trip duration & budget calculation
Search filters and sorting
Loading, empty, and error states throughout
Form validation (dates, required fields, email format)
Fully responsive layout (mobile → desktop)

Stretch Goal 
⚡ Smart Budget Optimization — flags over-budget trips and suggests cost-saving swaps
🛠️ Tech Stack
Layer	Technology
Frontend	React + Vite + TypeScript
Routing	React Router DOM
Styling	Tailwind CSS
Backend / Database	Supabase (PostgreSQL, Auth, Row-Level Security)

🗄️ Database Schema
The application uses a fully relational schema built and secured in Supabase:

auth.users
   │
   ├── profiles            (1:1 — user details)
   │
   └── trips               (1:many — user's trips)
          │
          ├── trip_stops       (1:many — cities visited, ordered, dated)
          │      │
          │      └── itinerary_items   (1:many — day-wise activities, cost, time)
          │
          └── community_posts (optional — trip-linked community sharing)

cities             (reference catalog — 15 seeded destinations)
   │
   └── activities_catalog   (reference catalog — 18 seeded activities, linked to cities)

📂 Project Structure
src/
├── components/       # Reusable UI components
├── context/          # Auth context, global state
├── lib/              # Supabase client, helper utilities
├── pages/            # Route-level pages (Dashboard, TripView, Explore, etc.)
├── types/            # TypeScript types (database.ts mirrors Supabase schema)
├── App.tsx
└── main.tsx

supabase/
└── migrations/       # SQL migration files (schema + RLS policies)
