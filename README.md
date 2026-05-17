
# THE SPACESHIP — Personal Mission Tracker (by SADMAN)

A futuristic dashboard to log daily performance telemetry (Study, Skills, Health, Discipline, Real Talk), calculate synergy scores, sync to Firebase Realtime Database, and visualize progress with analytics bar charts.

## Features
- **Commander Auth** (Email/Password via Firebase Auth)
- **Daily Logs** with instant calculations + animated progress rings
- **Manual Sync** to Firebase Realtime Database (cloud storage per day)
- **Weekly Logs** (latest 7 days table + average + best day)
- **Analytics** (dynamic **bar chart** with toggles + range selector)
- **Settings**
  - Logout
  - Clear today inputs (local only)
  - Clear local cache
  - Export cloud logs (JSON / CSV)
  - Delete today’s cloud log

---

## Tech Stack
- HTML, CSS, JavaScript
- Firebase v8 (Auth + Realtime Database)
- Chart.js v4

---

## Project Structure
```txt
.
├── index.html
├── style.css
└── script.js
```

---

## Setup (Local)
1. Download/clone this repo.
2. Open `index.html` in a browser  
   - Recommended: use a local server (avoids some browser restrictions).
   - Example (VS Code): install **Live Server** and click “Go Live”.

---

## Firebase Setup
This project uses:
- Firebase Authentication (Email/Password)
- Firebase Realtime Database

### 1) Create Firebase Project
1. Go to https://console.firebase.google.com/
2. Create a new project
3. Add a **Web App**
4. Copy your Firebase config into `script.js`:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

### 2) Enable Authentication
Firebase Console → **Authentication** → **Sign-in method** → enable:
- **Email/Password**

### 3) Create Realtime Database
Firebase Console → **Realtime Database** → Create Database  
Start in **locked mode** (recommended), then set rules.

---

## Security (Important)
### Realtime Database Rules (Per-user isolation)
Firebase Console → Realtime Database → **Rules**:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

This ensures:
- Users can only read/write their own logs under `users/<uid>/...`
- Nobody can delete/overwrite other users’ data

### If this dashboard is ONLY for you
Lock database access to your UID:

```json
{
  "rules": {
    ".read": "auth != null && auth.uid === 'PUT_YOUR_UID_HERE'",
    ".write": "auth != null && auth.uid === 'PUT_YOUR_UID_HERE'"
  }
}
```

### API Key on GitHub — Is it risky?
Firebase web API keys are typically public, but you must protect your project by:
- Using strict DB rules
- Restricting your API key to your domain (below)
- (Recommended) enabling Firebase **App Check**

### Restrict API Key (Recommended)
Google Cloud Console → **APIs & Services → Credentials → API key**
- Set **Application restrictions** → **HTTP referrers**
- Add your domains, e.g.:
  - `https://yourname.github.io/*`
  - `https://yourdomain.com/*`

### App Check (Recommended)
Firebase Console → **App Check**
- Enable App Check for Web (reCAPTCHA v3)
- Enforce for **Realtime Database** to reduce abuse.

---

## Data Model
Logs are stored per user per day:

```txt
users/{uid}/logs/{YYYY-MM-DD} = {
  overall: number,
  study: number,
  skill: number,
  health: number,
  discipline: number,
  realtalk: number
}
```

---

## Deployment (GitHub Pages)
1. Push to GitHub.
2. Go to Repo → **Settings** → **Pages**
3. Select branch (e.g. `main`) and root folder
4. Your site will be available at:
   `https://<username>.github.io/<repo>/`

After deploying, restrict your API key to that domain.

---

## Notes
- This is a frontend-only app. Source code is visible to anyone who can access the website.
- To prevent public signups, remove the “Initialize New Commander” button or lock DB rules to your UID.

---

## License
Choose one:
- **All Rights Reserved** (default if you don’t add a license)
- Or add an open-source license (MIT, Apache-2.0, etc.)

---

## Author
**SADMAN**  
Built for personal growth tracking — “The Spaceship” mission control.
```
