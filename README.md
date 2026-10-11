# Shanghai 3D Visualized Travel Planning Intelligent Agent

A 3D-visualized travel planning intelligent agent powered by **RAG** and an **LLM Agent**, with an interactive WebGL map and dynamic route rendering. Users describe their trip in natural language; the agent grounds its answers on a curated travel knowledge base, calls external map tools, and renders the generated itinerary and routes on an interactive 3D-style map.

> **Demo video:** _link will be added here after the screen recording is uploaded to YouTube._

---

## Overview

Planning a multi-day city trip usually means switching between chatbots, maps, reviews and transport apps. This project unifies them into one workflow:

```
Natural-language request
        │
        ▼
LLM Agent ──► tools: nearby search · route calculation · weather · knowledge base
        │
        ▼
RAG layer (FAISS + Chinese embeddings, multi-query retrieval + de-duplication)
        │
        ▼
Structured itinerary (Pydantic) ──► interactive map & dynamic path visualization
```

The project sits at the intersection of **AI applications** (retrieval augmentation, tool-calling agents) and **digital-media visualization** (real-time WebGL maps and animated path rendering).

---

## Key Features

### AI & Agent

- **RAG-enhanced generation.** Answers and itineraries are grounded on a local travel knowledge base (PDF/TXT) instead of relying on parametric memory alone, which reduces fabricated recommendations.
- **Multi-query retrieval with de-duplication.** The standalone RAG service issues several complementary search queries (attractions, food/transport, tips), then merges and de-duplicates the retrieved chunks.
- **Tool-calling Agent.** Based on LangChain's tool-calling agent, it autonomously chooses among four tools — nearby-place search, driving-route calculation, knowledge-base search and live weather — with an iteration cap and forced early stopping for responsive, bounded execution.
- **Structured output.** Itineraries are parsed into Pydantic schemas, giving the frontend predictable day-by-day data to render.
- **Streaming & multi-turn memory.** Responses are streamed token by token; conversation history is kept in Redis with an automatic in-memory fallback when Redis is unavailable.

### Digital-Media Visualization

- **Interactive WebGL map.** Built with React Three Fiber / Three.js together with MapLibre GL, including coordinate-system conversion (WGS84 ↔ GCJ-02) for accurate rendering in China.
- **Dynamic path visualization.** Generated routes and itineraries are drawn and animated directly on the map.
- **Polished, page-based experience.** A multi-page SPA (welcome, AI chat, onboarding, map planning, pre-trip preparation) with GSAP and Framer Motion animation.

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| 3D / Maps | Three.js, React Three Fiber, Drei, MapLibre GL |
| Animation | GSAP, Framer Motion |
| Backend | FastAPI, Uvicorn, Pydantic, Loguru |
| Agent / RAG | LangChain (LCEL), FAISS, sentence-transformers |
| Embeddings | BAAI/bge-small-zh-v1.5 (Chinese), all-MiniLM-L6-v2 |
| LLM | Doubao via Volcengine Ark (OpenAI-compatible API) |
| Database | MySQL 8 + SQLAlchemy 2 (SQLite fallback) |
| Cache / Memory | Redis 7 (in-memory fallback) |
| Deployment | Docker, Docker Compose, Nginx |

---

## Quantitative Results

Observed on a local development setup with CPU-based embeddings:

- **Static / knowledge Q&A:** end-to-end response typically within **~8 s**.
- **Complex agent tasks** (tool calls + itinerary generation): typically **8–15 s**.
- Retrieval is tuned to a small **top-k** (2–3 chunks) for fast lookup.
- The agent is bounded to **≤ 3 iterations** and stops as soon as a tool result is available, limiting worst-case latency.

> These figures are measured from the author's local environment and vary with hardware, network and the LLM provider.

---

## Project Structure

```
.
├── backend/                 # FastAPI main service
│   ├── app/
│   │   ├── main.py          # App entry, lifespan, CORS
│   │   ├── api/             # Chat & plan routes
│   │   ├── core/            # Config, database, Redis client
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # rag_chain.py, agent.py, memory.py
│   │   └── utils/           # AMap (Gaode) API client
│   ├── data/faiss_index/    # Generated at runtime (git-ignored)
│   ├── models/              # Embedding-model cache (git-ignored)
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                # React + Vite single-page app
│   ├── src/
│   │   ├── components/      # Pages, Map3D, chat, pre-trip prep
│   │   ├── lib/             # API clients, routing, path planning
│   │   └── App.tsx
│   ├── public/images/       # Attraction images
│   ├── Dockerfile
│   └── package.json
│
├── rag-service/             # Standalone RAG knowledge service
│   ├── data/                # Source knowledge PDFs / TXT
│   ├── main.py
│   └── requirements.txt
│
├── docker/
│   └── nginx.conf           # Reverse proxy / rate limiting
├── docker-compose.yml       # One-command orchestration
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- API credentials: a **Volcengine Ark (Doubao)** API key and an **AMap (Gaode)** web-service key.

### Option A — Run with Docker Compose

```bash
# 1. Provide your credentials
cp .env.example .env
#   edit .env and fill in DOUBAO_API_KEY, DOUBAO_MODEL and AMAP_KEY

# 2. Start all services
docker compose up -d

# 3. Open the app
#   Frontend:        http://localhost:8080
#   API docs:        http://localhost:8080/api/docs
```

Stop with `docker compose down`.

### Option B — Run locally

**Backend**

```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows (use venv/bin/activate on macOS/Linux)
pip install -r requirements.txt

cp .env.example .env             # then fill in your API keys
uvicorn app.main:app --reload --port 8001
# API docs: http://localhost:8001/docs
```

**Frontend**

```bash
cd frontend
npm install

cp .env.example .env             # then fill in your API keys
npm run dev
# App: http://localhost:3000
```

**Standalone RAG service (optional)**

```bash
cd rag-service
pip install -r requirements.txt
python main.py                   # builds the FAISS index from ./data on startup
```

---

## API Endpoints

Base path: `/api/v1`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat` | Conversational chat with RAG and memory |
| POST | `/chat/agent` | Agent chat with automatic tool calling |
| POST | `/chat/plan` | Generate a structured itinerary |
| DELETE | `/chat/history` | Clear session history |
| GET | `/health` | Health check |

The `X-Session-Id` header identifies a conversation session for multi-turn memory.

---

## License

Released under the [MIT License](LICENSE).
