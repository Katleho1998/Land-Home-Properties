# Land & Home frontend — 20 October 2026

## What changed

- Preserved the full-screen family video, navigation overlay and quick property search.
- Replaced repetitive homepage sections with a four-intent service selector, illustrative catalogue, personal-service section, seller appraisal journey, local-area links, FAQ and contact destination.
- Reused the existing shadcn/ui Radix Tabs and Accordion components.
- Added official React Bits SpotlightCard source, stylesheet and upstream licence; customised the cards to the olive/cream brand.
- Added direct call, WhatsApp, email and map links with the owner-confirmed number, email and address.
- Added mobile contact actions and reduced-motion styling. Removed the empty testimonial placeholder.
- Enquiry and appraisal forms now prepare a message in memory, with an explicit WhatsApp/email handoff. Visitors review and send themselves. Nothing is automatically transmitted.
- The local CRM demonstration is preserved through an optional, unchecked sample-copy control. A shared lead database remains a separate implementation phase.
- Updated privacy wording to describe the actual handoff and optional local sample storage.

## Contact details

071 603 4542 · hello@landhomeproperties.co.za

62 Piet Retief Street, Ficksburg, 9730

Visits are by arrangement until opening hours are supplied. The telephone number is used for WhatsApp links; account availability needs verification by the business. No test messages were sent.

## Validation

TypeScript and the frontend-only Vinext production build passed. `node scripts/test-enquiry.cjs` checks the contact route, message encoding, field whitelist and optional CRM behaviour. The existing CRM boundary test remains available.

The Windows Next.js native compiler still encounters access denied while resolving this checkout, before compilation. The Netlify build therefore needs verification on its Linux runner.

The local Vite server reported ready, but browser and direct HTTP requests timed out in this session. Visual, mobile, keyboard and full form-flow browser QA remain unverified. Do not interpret compilation as proof that those checks passed.

## Preview and deployment

Use `npm run dev:frontend` for the frontend-only preview on port 5174, without the Workers emulator. The existing Sites build is unchanged. Netlify continues to use `npm run build:netlify` and `.next`, as configured in netlify.toml.

The catalogue still contains labelled illustrative properties. Replace these with verified instructions before presenting them as live offers. Shared CRM storage, authentication, lead delivery and compliance verification are not completed by this design update.

## Sources

- https://ui.shadcn.com/docs/components/accordion
- https://ui.shadcn.com/docs/components/tabs
- https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/Components/SpotlightCard

React Bits licensing is included beside its component under `components/react-bits/LICENSE.md`.
