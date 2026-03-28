# Copilot Instructions — Preschool Library Catalog

## Build & Run Commands

```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Type-check + production build (runs prisma generate first)
npm run lint             # ESLint
npm run db:migrate       # Run Prisma migrations
npm run db:seed          # Seed database with sample data (npx tsx prisma/seed.ts)
npm run db:reset         # Reset database and re-run migrations
npm run db:studio        # Open Prisma Studio GUI
```

## Architecture

- **Framework:** Next.js 14 (App Router) with TypeScript
- **Database:** SQLite via Prisma ORM (schema at `prisma/schema.prisma`)
- **Styling:** Tailwind CSS (no component library — custom components in `src/components/`)
- **Auth:** NextAuth.js v4 with credentials provider — admin-only login, teachers select name from dropdown

### Data Flow

API routes (`src/app/api/`) use the Prisma singleton from `src/lib/prisma.ts`. All pages are client components that fetch data from these API routes. There is no server-side rendering of data — pages use `useEffect` + `fetch`.

### Key Models & Relationships

- **Book** → belongs to a **Category**, has many **Checkouts**
- **Shelf** → has many **ShelfSections**, each linking a shelf position to a **Category**
- **Checkout** → links a **Book** to a **Teacher** with timestamps (checkedOutAt, returnedAt)
- **BookSubmission** → teacher-submitted book pending admin approval (status: pending/approved/rejected). On approval, a **Book** record is created from the submission.
- **User** — admin accounts only (separate from Teacher)

### Barcode Scanning

`src/components/BarcodeScanner.tsx` supports two input methods:
1. Camera scanning via `html5-qrcode` library
2. USB barcode scanner detection (listens for rapid keystroke patterns)

ISBN lookup uses the free Open Library API (`src/lib/openlibrary.ts`).

### Email Notifications

`src/lib/email.ts` uses `nodemailer` with Gmail SMTP to notify admins of new book submissions. Email sending is optional — if `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and `ADMIN_EMAIL` env vars are not set, it silently skips.

## Conventions

- Pages that use `useSearchParams()` must wrap their content in a `<Suspense>` boundary (Next.js 14 static export requirement)
- API routes return availability computed from active checkouts (`where: { returnedAt: null }`)
- The `BookForm` component is shared between add (`/books/add`) and edit (`/books/[id]/edit`) pages
- Admin credentials default to `admin` / `admin123` (seeded via `prisma/seed.ts`)
- Database file lives at `prisma/dev.db` — included in `.gitignore`

## Environment Variables

Defined in `.env` (not committed):
- `DATABASE_URL` — SQLite connection string (`file:./dev.db`)
- `NEXTAUTH_SECRET` — Session signing secret
- `NEXTAUTH_URL` — Base URL for NextAuth (`http://localhost:3000`)
- `GMAIL_USER` — Gmail address for sending notifications (optional)
- `GMAIL_APP_PASSWORD` — Gmail App Password (optional, see https://myaccount.google.com/apppasswords)
- `ADMIN_EMAIL` — Email address to receive submission notifications (optional)
