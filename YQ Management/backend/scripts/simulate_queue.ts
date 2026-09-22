import axios from 'axios';
import * as crypto from 'crypto';

// Configuration injected via CLI args or environment
const API_URL = process.env.API_URL || 'https://api.qmova.yqbuddy.com';
const TOKEN = process.env.TOKEN;
const TENANT_ID = process.env.TENANT_ID;

if (!TOKEN || !TENANT_ID) {
  console.error("Error: TOKEN and TENANT_ID environment variables must be provided.");
  console.error("Usage: TOKEN=your_jwt TENANT_ID=tenant_id npx ts-node scripts/simulate_queue.ts");
  process.exit(1);
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  }
});

function getRandomPhone() {
  return `+1${crypto.randomInt(1000000000, 9999999999)}`;
}

async function runSimulation() {
  console.log(`Starting Queue Simulation on ${API_URL}...`);
  console.log(`Target Tenant: ${TENANT_ID}`);

  try {
    // 1. Fetch Locations and Services
    const locationRes = await api.get(`/locations?tenantId=${TENANT_ID}`);
    const locations = locationRes.data;
    if (!locations || locations.length === 0) {
      throw new Error("No locations found for this tenant.");
    }
    const location = locations[0];
    console.log(`Using Location: ${location.name} (${location.id})`);

    const serviceRes = await api.get(`/service?locationId=${location.id}`);
    const services = serviceRes.data;
    if (!services || services.length === 0) {
      throw new Error("No services found in this location.");
    }
    const service = services[0];
    const queue = service.queues?.length > 0 ? service.queues[0] : null;
    
    if (!queue) {
      throw new Error(`Service ${service.name} has no active queues.`);
    }

    console.log(`Using Service: ${service.name} | Queue: ${queue.name}`);

    // 2. Simulate Walk-In Check-In (with Enterprise Party Size)
    console.log("--- Simulating Walk-in ---");
    const walkInPhone = getRandomPhone();
    console.log(`Joining queue with phone: ${walkInPhone}, party size: 3...`);
    const joinRes = await api.post(`/visits/multiple`, {
      customerName: "Simulation Walk-in",
      phone: walkInPhone,
      language: "en",
      bookings: [{
        serviceId: service.id,
        queueId: queue.id,
        accompanyingGuests: 2 // 1 + 2 = 3 party size
      }]
    });
    
    const visitId = joinRes.data[0].id;
    console.log(`Successfully created Walk-in Visit: ${visitId}`);

    // 3. Simulate Operator Tags
    console.log(`--- Tagging Visit ${visitId} ---`);
    await api.patch(`/visits/${visitId}/tags`, {
      tags: ["VIP", "Simulation"]
    });
    console.log(`Successfully applied tags.`);

    // 4. Simulate Service Flow
    console.log(`--- Starting Service ---`);
    await api.post(`/visits/${visitId}/start`);
    console.log(`Visit is now IN_SERVICE.`);

    console.log(`--- Completing Service ---`);
    await api.post(`/visits/${visitId}/complete`);
    console.log(`Visit is now COMPLETED.`);

    console.log("✅ Simulation completed successfully!");

  } catch (error: any) {
    console.error("❌ Simulation Failed:", error.response?.data || error.message);
  }
}

runSimulation();
