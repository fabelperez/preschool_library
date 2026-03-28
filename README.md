# 📚 Little Library — Preschool Book Catalog

A web application for managing a preschool library. Teachers can search for books, see which shelf they belong on, and check them out. Admins manage the book inventory and shelf layout. Supports barcode scanning (ISBN) to quickly add and look up books.

## Quick Start

```bash
# Install dependencies
npm install

# Set up the database
npm run db:migrate
npm run db:seed

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Features

- **Library Layout** — Visual grid of shelves, sections, and categories with availability badges
- **Book Management** — Add books via barcode scan (camera or USB scanner) with auto-fill from Open Library API
- **Search** — Find books by title, author, or ISBN; results show shelf location and availability
- **Checkout/Check-in** — Teachers select their name and check out available books; check in by scanning the barcode
- **Admin Panel** — Manage shelves, sections, categories, and teachers (login required)

## Default Admin Login

- Username: `admin`
- Password: `admin123`

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- SQLite + Prisma ORM
- Tailwind CSS
- NextAuth.js v4
- html5-qrcode (barcode scanning)
- Open Library API (ISBN lookup)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed sample data |
| `npm run db:reset` | Reset database |
| `npm run db:studio` | Open Prisma Studio |
