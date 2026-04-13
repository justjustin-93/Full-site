# Sugar City Sweeps - Product Requirements Document

## Latest Updates (July 2025)
- Fixed games grid layout: proper responsive grid (5 per row on desktop)
- Fixed 3 broken game images (Panda Master, Orion Stars, Game Vault)  
- Added comprehensive dashboard content styles (games, deposit, withdraw, settings, support, admin, modals)
- Improved download button styling with gold gradient
- Fixed fallback avatar colors (dark bg + gold text instead of magenta)
- Fixed missing `string` import in backend for game credential generation

## Overview
Sugar City Sweeps is a sweepstakes/fish game lobby platform that allows users to select games, purchase credits, and access game platforms.

## Architecture
- **Frontend**: React.js with Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Payments**: Stripe (integrated), Crypto QR, Cash App, Chime (manual)

## User Personas
1. **Players**: Register, verify age (18+), select games, purchase credits, play
2. **Admins**: Manage games, users, transactions, set game accounts

## Core Requirements

### Authentication
- [x] User registration with email/password
- [x] Age verification checkbox (18+ requirement)
- [x] JWT-based authentication with httpOnly cookies
- [x] Brute force protection (5 attempts = 15 min lockout)
- [x] Admin role support

### Game Lobby
- [x] Display active games in grid layout
- [x] Game card with logo, name, game tag input, play button
- [x] Fallback avatar images when external logos fail
- [x] Game selection opens payment modal

### Payments
- [x] 5 credit packages: $10, $20, $50, $100, $200 (with bonus credits)
- [x] Stripe checkout integration
- [x] Crypto QR code payment option
- [x] Cash App payment instructions
- [x] Chime payment instructions
- [x] Transaction tracking in database

### Admin Panel
- [x] Dashboard with stats (users, payments, revenue)
- [x] Games management (CRUD)
- [x] Users management with:
  - View all users
  - Age verification status
  - Game accounts (account names per game)
  - Universal game password
  - Add credits functionality
- [x] Transaction history view

## What's Been Implemented

### January 2026 - Initial Build
- Full authentication system with age verification
- Candy-themed UI with animated background
- 5 default games seeded (Fire Kirin, Panda Master, Milky Way, Game Vault, Ultra Panda)
- Payment modal with 4 methods
- Admin panel with dashboard, games, users, transactions
- User game accounts management

## Design Theme
- **Fonts**: Baloo 2, Fredoka, Nunito
- **Colors**: 
  - Primary Pink: #ff69b4, #ff1493
  - Cyan: #00d4ff
  - Dark Background: #0d0d1a
- **Animations**: Floating candy shapes, sparkles

## Prioritized Backlog

### P0 (Critical)
- [ ] Set up actual payment routing (Cash App, Chime, Crypto destinations)
- [ ] Add real game logo images

### P1 (High Priority)
- [ ] User cashout/withdrawal system
- [ ] Full KYC verification (ID upload, admin approval)
- [ ] Game security key integration for token generation

### P2 (Medium Priority)
- [ ] Email notifications (registration, payment confirmation)
- [ ] Password reset functionality
- [ ] User profile page
- [ ] Transaction receipts/exports

### Future Enhancements
- [ ] Mobile app version
- [ ] Real-time credits sync with game platforms
- [ ] Referral program
- [ ] VIP/loyalty tiers

## API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/refresh

### Games
- GET /api/games (public, active only)
- GET /api/games/all (admin)
- POST /api/games (admin)
- PUT /api/games/:id (admin)
- DELETE /api/games/:id (admin)

### Payments
- GET /api/packages
- POST /api/checkout/create
- GET /api/checkout/status/:session_id
- POST /api/webhook/stripe
- GET /api/payment/crypto-info
- GET /api/user/transactions
- POST /api/admin/payments/manual (admin)

### Admin
- GET /api/admin/stats
- GET /api/admin/users
- PUT /api/admin/users/:id
- GET /api/admin/transactions
