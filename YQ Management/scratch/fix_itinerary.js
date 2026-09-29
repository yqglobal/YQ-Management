const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/pages/dashboard/service-desk.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace itinerary access with visitSteps
content = content.replace(
  `const hasItinerary = industry.uiFlags.showItinerary && Array.isArray(v.itinerary) && v.itinerary.length > 0;`,
  `const hasItinerary = industry.uiFlags.showItinerary && Array.isArray(v.visitSteps) && v.visitSteps.length > 0;`
);

content = content.replace(
  `{hasItinerary && <ItineraryProgress itinerary={v.itinerary} />}`,
  `{hasItinerary && <ItineraryProgress itinerary={v.visitSteps} />}`
);

content = content.replace(
  `{industry.uiFlags.showItinerary && Array.isArray(selectedVisit.itinerary) && selectedVisit.itinerary.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1.5">Patient Journey</div>
                    <ItineraryProgress itinerary={selectedVisit.itinerary} />
                  </div>
                )}`,
  `{industry.uiFlags.showItinerary && Array.isArray(selectedVisit.visitSteps) && selectedVisit.visitSteps.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1.5">Patient Journey</div>
                    <ItineraryProgress itinerary={selectedVisit.visitSteps} />
                  </div>
                )}`
);

// Update ItineraryProgress component
content = content.replace(
  `{stop.label || \`Stop \${idx + 1}\`}`,
  `{stop.name || stop.label || \`Stop \${idx + 1}\`}`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log("ItineraryProgress updated");
