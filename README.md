# Care Plan Generator - MVP v0.5

A minimal viable product for automatically generating care plans based on patient information using LLM (GPT-4).

## Tech Stack

- **Frontend**: React + Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL 16
- **Queue**: Redis + BullMQ
- **Real-time**: SSE (Server-Sent Events) + Redis Pub/Sub
- **LLM**: OpenAI GPT-4
- **Deployment**: Docker + Docker Compose

## Project Structure

```
CarePlan/
├── frontend/          # Next.js frontend application
├── backend/           # Express.js backend API
├── docker-compose.yml # Docker orchestration configuration
├── .env.example       # Environment variables example
└── README.md
```

## Database Design

- **patients** - Patient information
- **providers** - Provider information
- **orders** - Order information (including diagnosis, medication, etc.)
- **care_plans** - Care plans (1:1 relationship with orders)

## Status Flow

Care Plan generation status:

- `pending` → Pending
- `processing` → Processing
- `completed` → Completed
- `failed` → Failed

## Quick Start

### Prerequisites

- Docker Desktop (Windows)
- OpenAI API Key

### Step 1: Configure Environment Variables

Copy `.env.example` to `.env` and fill in your OpenAI API Key:

```bash
copy .env.example .env
```

Edit the `.env` file:

```
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

### Step 2: Start All Services

Run in the project root directory:

```bash
docker-compose up --build
```

This will start five containers:

- **PostgreSQL** (port 5432) - Database
- **Redis** (port 6379) - Message queue and Pub/Sub
- **Backend** (port 3001) - API service + SSE
- **Worker** - Background job processor for LLM calls
- **Frontend** (port 3000) - Web interface

### Step 3: Access the Application

Open your browser and visit:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api/orders

## Mock Data

The database will automatically import the following mock data during initialization:

### Providers

- Dr. Sarah Johnson (NPI: 1234567890)
- Dr. Michael Chen (NPI: 2345678901)
- Dr. Emily Rodriguez (NPI: 3456789012)

### Patients

- John Smith (MRN: 000001)
- Mary Williams (MRN: 000002)
- Robert Brown (MRN: 000003)

### Orders

Includes 2 example orders with complete patient records and pending care plans to be generated.

## Feature Description

### 1. View Order List

The main page displays all orders, including:

- Patient information (MRN, name)
- Provider information
- Medication name
- Care Plan status

### 2. Create New Order

Click the "New Order" button and fill out the form:

- Patient information (name, MRN, primary diagnosis)
- Provider information (name, NPI)
- Medication information
- Additional diagnoses
- Medication history
- Patient medical records

After submission, the system will:

1. Create or associate patient/provider
2. Create order and enqueue job to Redis
3. Worker picks up job and calls LLM to generate care plan
4. Real-time status updates via SSE

### 3. View Care Plan

Click the "View" button on an order to see:

- **pending**: Waiting for generation
- **processing**: Generating (shows loading animation)
- **completed**: Displays full care plan
- **failed**: Shows error message

### 4. Download Care Plan

Care plans with `completed` status can be downloaded as text files.

## API Endpoints

### GET /api/orders

Get all orders (including patient, provider, care plan information)

### GET /api/orders/:id

Get single order details

### POST /api/orders

Create new order and generate care plan

Request body example:

```json
{
  "firstName": "John",
  "lastName": "Smith",
  "mrn": "000001",
  "providerName": "Dr. Sarah Johnson",
  "providerNpi": "1234567890",
  "primaryDiagnosis": "G70.00",
  "medicationName": "IVIG",
  "additionalDiagnosis": ["I10", "K21.9"],
  "medicationHistory": [
    "Pyridostigmine 60 mg PO q6h PRN",
    "Prednisone 10 mg PO daily"
  ],
  "patientRecords": "Complete patient medical records..."
}
```

## Stop Services

```bash
docker-compose down
```

Keep database data:

```bash
docker-compose down
```

Clear all data (including database):

```bash
docker-compose down -v
```

## Development Notes

### Local Development (without Docker)

#### Backend

```bash
cd backend
npm install
npm run dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

Requires local PostgreSQL installation and manual execution of `init.sql` script.

## Limitations and Future Improvements

This is a **minimal MVP**, does not include:

- ❌ Data validation
- ❌ Duplicate checking
- ❌ Comprehensive error handling
- ❌ Test cases
- ❌ User authentication
- ❌ Permission management

Implemented in v0.5:

- ✅ Queue system (Redis + BullMQ)
- ✅ Worker processes
- ✅ Real-time updates (SSE + Redis Pub/Sub)

## Troubleshooting

### Port Occupied

If ports 3000, 3001, or 5432 are occupied, modify the port mappings in `docker-compose.yml`.

### LLM Call Failed

Check if `OPENAI_API_KEY` in `.env` file is correct.

### Database Connection Failed

Ensure PostgreSQL container health check passes before starting backend service (dependency relationship is configured in `docker-compose`).

### View Logs

```bash
docker-compose logs backend
docker-compose logs worker
docker-compose logs frontend
docker-compose logs postgres
docker-compose logs redis
```

## License

MIT
