# Quick Start Guide

## Fastest Startup Method (3 Steps)

### 1. Configure OpenAI API Key

```powershell
cd d:\CarePlan
copy .env.example .env
```

Then edit the `.env` file and enter your OpenAI API Key:

```
OPENAI_API_KEY=sk-your-actual-key-here
```

### 2. Start All Services

```powershell
docker-compose up --build
```

Wait for all containers to start (about 1-2 minutes).

### 3. Open Browser

Visit http://localhost:3000

## Testing Process

1. **View Existing Orders** - The page will display 2 preloaded example orders
2. **Click "View"** - View order details and care plan status
3. **Click "New Order"** - Create a new order
4. **Fill Out Form** - Enter patient and provider information
5. **Submit** - Backend will call GPT-4 to generate care plan
6. **Wait for Generation** - Status will change from pending → processing → completed
7. **View and Download** - Click "View" to see the complete care plan, click "Download" to download the text file

## Example Data (Can Be Copied Directly)

### New Order Example

```
First Name: Alice
Last Name: Johnson
MRN: 000004
Provider Name: Dr. Sarah Johnson
Provider NPI: 1234567890
Primary Diagnosis: G70.00
Medication Name: IVIG
Additional Diagnosis: I10, K21.9
Medication History:
Pyridostigmine 60 mg PO q6h PRN
Prednisone 10 mg PO daily
Lisinopril 10 mg PO daily

Patient Records:
Name: Alice Johnson
MRN: 000004
DOB: 1982-04-15 (Age 43)
Sex: Female
Weight: 68 kg
Allergies: None known
Medication: IVIG

Primary diagnosis: Generalized myasthenia gravis (AChR antibody positive)
Secondary diagnoses: Hypertension, GERD

Recent history:
Progressive muscle weakness over 3 weeks. Neurology recommends IVIG therapy.
```

## Stop Services

Press `Ctrl+C` to stop, then run:

```powershell
docker-compose down
```

## Common Issues

**Q: Care plan always shows "processing"?**
A: Check backend logs `docker-compose logs backend`, confirm OpenAI API Key is correct.

**Q: Frontend cannot connect to backend?**
A: Confirm backend container is running `docker ps`, check if port 3001 is accessible.

**Q: Want to start over?**
A: Run `docker-compose down -v` to clear all data, then `docker-compose up --build` again.
