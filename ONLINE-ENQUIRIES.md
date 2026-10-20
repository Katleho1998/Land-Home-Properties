# Online enquiry integration

All shared website enquiry forms expose a delivery choice: WhatsApp or Submit online.
Online submission is visibly marked Coming soon and disabled until durable storage exists.
Contact details are retained in form memory while switching choices. No online success is simulated.

Integration points:
- `app/enquiry-delivery.ts`: feature flag and browser transport.
- `netlify/functions/enquiries.mjs`: server endpoint, currently returns 503 without reading or storing the request body.
- `app/modern-forms.tsx`: shared forms and confirmation UI.

Before enabling:
1. Implement server-side field and consent validation, abuse controls, and duplicate-safe database writes.
2. Map enquiry types and property references to the shared CRM lead records.
3. Store a server-generated receipt, creation time and consent record.
4. Return `{ "accepted": true, "reference": "<stored enquiry ID>" }` only after successful durable persistence.
5. Add idempotent retries so network interruptions cannot create duplicate enquiries.
6. Update the privacy notice, test failure and retry behaviour, then enable `onlineEnquiriesEnabled`.

The existing browser-only sample CRM is not the online submission destination.
