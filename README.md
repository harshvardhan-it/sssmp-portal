# शासकीय शिक्षक संगठन मध्यप्रदेश (SSSMP Portal)
### Digital Membership Registration & Management Portal
**पंजीयन क्रमांक: 01/01/01/38865**

A professional, responsive React + TypeScript + Tailwind CSS web portal built for **शासकीय शिक्षक संगठन मध्यप्रदेश**, faithfully reproducing the visual identity, typography, layout, and user experience of the reference design.

---

## 🏗️ Monorepo Project Structure

```text
sssmp-portal/
├── backend/                   # Reserved Node.js + Express + TypeScript + MongoDB workspace
│   ├── .gitkeep
│   └── README.md
├── frontend/                  # React + Vite + TypeScript web application
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── icons.svg
│   │   └── logo.jpg           # Official organization emblem
│   ├── src/
│   │   ├── assets/            # hero.png, logo.jpg
│   │   ├── components/        # layout, home, registration, admin
│   │   ├── contexts/          # LanguageContext (i18n), AuthContext, CarouselContext
│   │   ├── data/              # MP districts/blocks, notices, leadership, gallery
│   │   ├── locales/           # hi.json (Hindi default), en.json (English)
│   │   ├── pages/             # Home, About, Leadership, Notices, Gallery, Contact, Register, Login, Admin
│   │   ├── routes/            # AppRoutes.tsx
│   │   ├── types/             # TypeScript definitions
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── storage/                   # Local storage directory
│   └── uploads/               # Future local development uploads
│       └── .gitkeep
├── .env.example               # Safe template for frontend & backend environment variables
├── .gitignore                 # Root gitignore excluding build outputs, node_modules, and uploads
└── README.md
```

---

## 🚀 Getting Started

### 1. Environment Configuration
Copy `.env.example` to create your local `.env`:
```bash
cp .env.example .env
```

### 2. Frontend Development
Run the frontend independently using its own workspace:
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

### 3. Production Build & Verification
```bash
cd frontend
npm run build
```

---

## 🎨 Visual Identity & Design System
- **Primary Navy**: `#102F50`
- **Emerald Green**: `#049B70`
- **Notice Red**: `#E52528`
- **Cream Background**: `#FAF9F5` with subtle dotted patterns
- **Typography**: Dual bilingual support (Hindi default / English toggle) using Google Fonts *Noto Sans Devanagari* and *Inter*.
- **Original Logo**: Official organization emblem featuring the golden wreath, book, flame, and registration ribbon.

---

## 📋 Features & Implemented Routes

### 1. Public Pages
| Route | Page | Description |
|---|---|---|
| `/#/` | **मुख पृष्ठ (Home)** | Top navy information bar, hero carousel, 2 subscription plans, 4-step registration process, objectives, live statistics, notice board. |
| `/#/about` | **संगठन परिचय (About)** | Organization mission, core values, working domains, and statutory background. |
| `/#/leadership` | **संगठन नेतृत्व (Leadership)** | Executive hierarchy across State and Divisional levels with configurable roles. |
| `/#/notices` | **सूचनाएँ व परिपत्र (Notices)** | Filterable circulars, government orders, and downloadable sample PDFs. |
| `/#/gallery` | **चित्र दीर्घा (Gallery)** | Photo gallery with category tags and interactive image viewer modal. |
| `/#/contact` | **संपर्क सूत्र (Contact)** | State headquarters address, phone, emails, and online teacher inquiry form. |

### 2. Membership Registration (`/#/register`)
- **3-Step Wizard**:
  - **Step 1: व्यक्तिगत विवरण (Personal Info)**: Full Name, Father's/Husband's Name, DOB, Gender, 10-digit Mobile, Email, Address.
  - **Step 2: पदस्थापना विवरण (Posting & Institution)**: District & dependent Block dropdown (configurable MP dataset), School Name, Designation, Employee Code.
  - **Step 3: सदस्यता व सुरक्षा (Subscription & Account)**: Exactly **TWO** plans:
    - **मासिक सदस्यता (Monthly Subscription)**: ₹10 (1 month)
    - **वार्षिक सदस्यता (Yearly Subscription)**: ₹120 (12 months)
    - Password creation, confirmation, review summary, and statutory terms checkbox.
- **Success Screen & Digital ID**: Generates a demo registration number (`SSSMP2025XXXX`) and an authentic, printable **Digital Membership ID Card (E-CARD)**.

### 3. Member Login (`/#/login`)
- Registration ID & 10-digit mobile number
- Password with show/hide toggle & forgot password prompt
- Session Security (10 minutes) notice box
- Demo quick-fill button (`SSSMP2025001` / `9876543210`)
- Verified digital membership card view and download.

### 4. Administrator Portal (`/#/admin/login` & `/#/admin/dashboard`)
- Multi-Level Scope: STATE > DISTRICT > BLOCK > MEMBER hierarchy.
- Overview Metrics: Total members, Monthly subscriptions, Yearly subscriptions, Active members, Pending registrations, Demo revenue.
- Carousel & Media Manager: Add, activate/deactivate, reorder slides.
- Data Table: Search, District filter, Plan filter, Status filter, Pagination, Member Detail Modal, and 1-click Approval action.
