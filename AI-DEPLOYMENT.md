# AI assistant on Netlify

Set `OPENAI_API_KEY` as a secret in Netlify, available to Functions in Production.
Use a replacement for any key previously disclosed. Never commit the value.
Optional `OPENAI_MODEL` overrides the default `gpt-4.1-mini`.

The deploy includes `netlify/functions/property-assistant.mjs`, invoked at
`/.netlify/functions/property-assistant`. No additional npm packages are required.
Local Vite preview does not run Netlify Functions; its chat will show a fallback.

After deploying:

1. Confirm the function appears in Netlify and the deploy log accepts its rate-limit rule (8 requests per IP/domain per 60 seconds).
2. Open the floating finder on the production domain and ask about office hours.
3. Ask about Bethlehem; it should say coming soon.
4. Ask for available properties; it must explain that live inventory is not connected.
5. Test WhatsApp brief handoff and clearing the conversation.
6. Check API usage/billing in OpenAI and configure project controls for your expected usage.

Rate limiting mitigates bursts; it is not a global spending cap. Origin validation
blocks browser cross-origin requests but is not authentication. A public assistant
can still be used by automated clients. Review usage after launch.

The assistant does not receive private CRM records, save leads, confirm bookings,
or access live inventory. Guided property previews remain separate. Chat messages
are sent to OpenAI with `store:false`; this does not imply zero provider retention.
The interface discloses this before sending.

Local verification: `node scripts/test-ai.mjs`, `node scripts/test-enquiry.cjs`,
`node scripts/test-crm.cjs`, and `npx tsc --noEmit`.

Sources:
- https://developers.openai.com/api/docs/guides/text
- https://docs.netlify.com/build/functions/api/
- https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/
