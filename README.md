# 📚 Little Library — Preschool Book & Resource Catalog

A web application for managing a preschool library and teacher resource inventory. Teachers can search for books, see which shelf they belong on, and check them out. Admins manage the book inventory, teacher resources, and shelf layout. Supports barcode scanning (ISBN) to quickly add and look up books.

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

## Default Admin Login

- Username: `admin`
- Password: `admin123`

## Librarian Workflows

### 📚 Book Management

| Workflow | Page | Description |
|----------|------|-------------|
| Add a book | `/books/add` | Scan an ISBN (camera or USB scanner) to auto-fill from Open Library, or enter details manually |
| Edit a book | `/books/[id]/edit` | Update title, author, category, qualifier, cover image, and copy count |
| Delete a book | `/books/[id]` | Remove a book from the catalog |
| Browse & search books | `/books` | Filter by category, search by title/author/ISBN |
| View book details | `/books/[id]` | See cover, metadata, shelf location, availability, and full checkout history |

### 🔄 Book Circulation

| Workflow | Page | Description |
|----------|------|-------------|
| Check out a book | `/checkout` | Scan or search for a book, select a teacher, and confirm checkout |
| Return a book | `/checkin` | Scan ISBN or select from active checkouts to check in |

### 📦 Teacher Resources

| Workflow | Page | Description |
|----------|------|-------------|
| Browse & search resources | `/resources` | Filter by theme (resource category), search by name |
| View resource details | `/resources/[id]` | See quantity, bin location, availability, and checkout history |
| Check out resources | `/resources/checkout` | Select resource by shelf, bin, and item; assign to a teacher |
| Return resources | `/resources/checkin` | Select from active resource checkouts to return |

### 🗄️ Shelves & Room Layout

| Workflow | Page | Description |
|----------|------|-------------|
| Create / delete shelves | `/admin/shelves` | Add book shelves with named sections linked to categories |
| Add Book Shelf or Resource Shelf | `/admin/shelves/layout` | Choose shelf type when adding from the layout editor |
| Arrange room layout | `/admin/shelves/layout` | Drag-and-drop shelves and room fixtures (doors, windows, rugs, tables) |
| View interactive room map | `/` | Homepage shows positioned shelves color-coded by availability |

### 📂 Categories & Organization

| Workflow | Page | Description |
|----------|------|-------------|
| Manage book categories | `/admin/shelves` | Add or delete book categories (e.g., Animals, Weather) |
| Manage resource themes | `/admin/resources` | Add or delete resource themes (e.g., Fall, Winter) |
| Manage bins | `/admin/resources` | Add, label, or remove bins on resource shelves |

### 👩‍🏫 Teachers & Submissions

| Workflow | Page | Description |
|----------|------|-------------|
| Manage teachers | `/admin/teachers` | Add new teachers and view their active checkouts |
| Review book submissions | `/admin/submissions` | Approve (assign category) or reject teacher-submitted books |
| Submit a book suggestion | `/books/submit` | Teachers scan or enter a book to suggest for the library |

### 🏠 Homepage Dashboard

| Workflow | Page | Description |
|----------|------|-------------|
| Room overview | `/` | Interactive library map with availability-based shelf coloring (green = all available, amber = some checked out, red = all checked out) |
| Quick actions | `/` | One-click access to checkout, check-in, and book submission |
| Global search | `/` | Search bar to find books by title, author, or ISBN |

## 📱 Production Setup (Laptop + Phone Scanning)

This section covers running the app on a school laptop so phones on the same WiFi can scan barcodes. Mobile browsers require HTTPS for camera access, so a one-time certificate setup is needed.

### Prerequisites

- Node.js installed on the laptop
- All devices (laptop + phones) on the **same WiFi network**
- [mkcert](https://github.com/FiloSottile/mkcert/releases) for trusted local SSL certs

---

### Step 1 — Install mkcert

Download `mkcert-v*-windows-amd64.exe` from the [releases page](https://github.com/FiloSottile/mkcert/releases), rename it to `mkcert.exe`, and place it in `C:\Windows\System32`.

Then install the local certificate authority:

```powershell
mkcert -install
```

---

### Step 2 — Find the laptop's IP address

```powershell
ipconfig
```

Look for **IPv4 Address** under your WiFi adapter (e.g. `192.168.1.50`). You'll use this in the next step and in `.env`.

> **Tip:** Set a static IP or DHCP reservation on your router so this address never changes.

---

### Step 3 — Generate SSL certificates

From the project root:

```powershell
mkcert -key-file certs/key.pem -cert-file certs/cert.pem 192.168.1.50 localhost 127.0.0.1
```

Replace `192.168.1.50` with the actual laptop IP from Step 2. The `certs/` folder is already in `.gitignore`.

---

### Step 4 — Configure environment

In `.env`, set `NEXTAUTH_URL` to the HTTPS address:

```
NEXTAUTH_URL=https://192.168.1.50:3000
```

---

### Step 5 — Build and start the production server

```powershell
npm run build
npm run start:prod
```

The server will print the network URL at startup:

```
✅ Preschool Library — HTTPS server running

   Local:   https://localhost:3000
   Network: https://192.168.1.50:3000  ← use this URL on phones
```

An HTTP redirect also runs on port 3001, so `http://` links auto-upgrade to HTTPS.

---

### Step 6 — Set up phones (once per device)

To avoid browser security warnings, install the mkcert root CA on each phone:

1. Find the root CA file on the laptop:
   ```powershell
   mkcert -CAROOT
   # opens the folder — find rootCA.pem
   ```
2. Email or AirDrop `rootCA.pem` to the phone
3. Open the file on the phone → install as a trusted certificate
   - **iOS:** Settings → General → VPN & Device Management → install profile
   - **Android:** Settings → Security → Install from storage

After installing, navigate to `https://192.168.1.50:3000` — the browser should show no warnings and the camera scanner will work.

---

### Auto-start on Windows boot (optional)

Use [PM2](https://pm2.keymetrics.io/) to keep the server running and restart it automatically:

```powershell
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup    # follow the printed command to enable Windows auto-start
```

To check status or restart:

```powershell
pm2 status
pm2 restart preschool-library
pm2 logs preschool-library
```

---

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
| `npm run start:prod` | Start production HTTPS server (requires certs — see above) |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed sample data |
| `npm run db:reset` | Reset database |
| `npm run db:studio` | Open Prisma Studio |


## Troubleshooting

- **Copilot CLI 408 / timeout errors**: If Copilot CLI fails with `CAPIError 408`, stop using Copilot for validation or dev-server checks. Run the app and tests manually in the terminal instead.
- **Copilot CLI auth / fetch failed**: If you see `Error during sign-in: fetch failed`, restart WSL (`wsl --shutdown`) and re-run `copilot login`, or authenticate using the GitHub CLI (`gh auth login`) and retry.
- **Ports already in use (3000 / 3001)**: Kill existing processes before restarting dev servers:
  ```bash
  lsof -i :3000
  lsof -i :3001
  kill -9 <PID>
  ```

## QA Test Checklist

### Lost/Damaged Tracking & Resource Status (Apr 2026)

**As Librarian (admin)**
- [ ] `/admin/resources` → Resources tab → all resources listed with status badges (Available / Damaged / Lost)
- [ ] Mark a resource as **Lost** → confirmation modal appears → status updates to "Lost" badge
- [ ] Mark a resource as **Damaged** → optional note prompt → status updates to "Damaged" badge
- [ ] **Restore** a lost/damaged resource → status returns to "Available"
- [ ] Filter bar (All / Available / Damaged / Lost) correctly filters the resource list
- [ ] `/books/[id]` → use +/− steppers to mark individual copies as lost or damaged
- [ ] Lost + damaged copy counts correctly reduce available count shown on the book card

**As Teacher (checkout)**
- [ ] Try checking out a **lost** resource → blocked with a clear error message
- [ ] Try checking out a **damaged** resource → blocked with a clear error message
- [ ] Try checking out a book where all copies are lost/damaged → checkout blocked
- [ ] `/browse` → books with lost/damaged copies show correct count badges and accurate available count
- [ ] Books added within the last 30 days show a **"New"** badge on their card
