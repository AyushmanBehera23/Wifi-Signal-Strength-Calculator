# Wi-Fi Signal Analyzer

A privacy-first local Wi-Fi diagnostic tool for macOS. Scan nearby networks, view signal strength in dBm, analyze estimated channel congestion, and get channel recommendations — all on your Mac, no cloud required.

## Quick Start

### Prerequisites

- macOS 13 Ventura or later
- Python 3.11+
- Node.js 18+ and npm
- Wi-Fi adapter enabled
- Location Services enabled for Terminal (required on macOS 13+ for full scan data)

### 1. Start the backend agent

```sh
cd backend
./start_agent.sh
```

The agent starts at `http://127.0.0.1:8000`. It binds to loopback only — no external network access.

### 2. Start the frontend

In a new terminal window:

```sh
cd frontend
npm install   # first time only
npm run dev
```

Open **http://localhost:5173** in your browser.

### 3. Run your first scan

Click **"Start a local scan"** on the landing page. The agent reads nearby Wi-Fi networks from macOS and returns normalized results.

---

## Project Structure

```
WEB-APP-WIFI-Signal-Detect/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entrypoint
│   │   ├── api/                 # REST + WebSocket routes
│   │   ├── scanner/             # macOS Wi-Fi scanner adapter
│   │   ├── analysis/            # Signal, congestion, overlap, recommendations
│   │   ├── database/            # SQLite storage (aiosqlite + SQLAlchemy)
│   │   └── schemas/             # Pydantic data models
│   ├── tests/                   # Scanner fixtures and unit tests
│   ├── requirements.txt
│   └── start_agent.sh
├── frontend/
│   └── src/
│       ├── pages/               # 7 routes: /, /dashboard, /networks, /channels, /history, /settings, /help
│       ├── components/          # Charts, network table, status badges, drawers
│       ├── services/            # API client + WebSocket client
│       ├── hooks/               # useAgentStatus, useScan, useWebSocket
│       └── types/               # TypeScript mirrors of Pydantic schemas
├── docs/
│   ├── setup-macos.md
│   ├── architecture.md
│   └── analysis-methodology.md
└── README.md
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Agent status and scanner capability |
| GET | `/api/capabilities` | Supported fields, bands, scanner source |
| POST | `/api/scan` | Start a Wi-Fi scan |
| GET | `/api/scans/latest` | Latest completed scan |
| GET | `/api/networks` | Network list with filters and pagination |
| GET | `/api/networks/{bssid}` | History for a specific BSSID |
| GET | `/api/channels` | Channel occupancy, overlap, and congestion |
| GET | `/api/recommendations` | Band-specific recommendations with explanations |
| GET | `/api/history` | Paginated scan history |
| DELETE | `/api/history?confirm=true` | Delete all local scan history |
| WS | `/ws` | Real-time scan events |

## Privacy

- Scan data stays on your Mac in a local SQLite database
- The agent binds to `127.0.0.1` only — not accessible from other devices
- No cloud account, no remote transmission by default
- BSSID and SSID values are treated as sensitive local data

## macOS Permissions

On macOS 13+, go to **System Settings → Privacy & Security → Location Services** and enable access for **Terminal** to get full scan data including BSSID values.

See [docs/setup-macos.md](docs/setup-macos.md) for complete setup instructions.

## Limitations

- Scan estimates are derived from visible networks only
- Hidden networks (not broadcasting SSIDs) are not counted
- Non-Wi-Fi interference (Bluetooth, microwave) is not detected
- Actual airtime utilization is not measured by macOS scanning APIs
- Channel recommendations are estimates, not performance guarantees

See [docs/analysis-methodology.md](docs/analysis-methodology.md) for the full methodology.
