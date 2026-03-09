# Precious2: Luxury Unified Storefront & DBaaS Backend

This repository contains the advanced, unified codebase for **Precious Chic Nails** (Frontend) and the **SuperBase** (Backend).

## Latest Enhancements
- **Support Liaison (Live Chat):** A real-time support system where users can message admins/workers from their "Vault" (Dashboard), and admins can reply from a central command center.
- **Dynamic System Config:** Manage the public support email and other global parameters directly from the Admin Panel.
- **Improved Checkout:** Includes a mandatory Phone Number field for better delivery coordination, saved directly into the order registry.
- **Boutique Inventory 2.0:** 
  - Multi-image product gallery support.
  - Custom category creation and persistence.
  - Fully responsive, luxury curation interface.
- **Backend Stability:** Fixed 500 errors and tracking save issues via automatic schema migrations and optimized large-data handling.

## Repository Structure
- `preciousnails/`: React + TypeScript + Tailwind CSS (Vite) storefront.
- `superbase/`: FastAPI + SQLAlchemy Python backend with dynamic multi-tenant schema support.

## Quick Start

### 1. Backend (SuperBase)
```bash
cd superbase
pip install -r requirements.txt
python main.py
```
*Default port: 7777*

### 2. Frontend (PreciousNails)
```bash
cd preciousnails
npm install
npm run dev -- --port 3456 --host
```
*Default port: 3456*

---
Built for the Precious brand with a focus on high-end aesthetics and robust automated logistics.
