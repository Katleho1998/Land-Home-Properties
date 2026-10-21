# Public website languages

The header selector switches between English (`en`), Afrikaans (`af`) and Sesotho (`st`). The preference is saved under `lh-language`; changing it updates the document language and subscribed components without reloading or resetting form/search state. English remains the server-rendered default. Browser storage being unavailable does not prevent switching.

`app/translations.ts` contains the interface translations. `app/i18n.tsx` provides the locale store, copy lookup and known dynamic templates. Add both translations whenever adding public interface copy. Components subscribe with `useLocale()` and render labels with `t`/`tNode`; preserve IDs, URLs, option values, field names and backend enums. Do not translate visitor-entered text, addresses, property references or owner-written descriptions. Listing descriptions remain in the language entered in the CRM; automatic translation of that content is not implemented.

The AI endpoint validates the language against the three supported codes and instructs OpenAI to reply in that language. Existing conversation messages remain as originally sent. This requires deploying the updated Netlify function as well as the frontend. Model-generated wording is not guaranteed to be error-free.

Form choices retain canonical values for CRM submission. The preferred contact language follows the site language until explicitly changed by the visitor. Form validation and reviewed predefined choices use translated labels. WhatsApp/email enquiry payloads retain the existing canonical English field labels for staff; visitor text is unchanged. Native date/number picker chrome may follow the visitor's browser language.

## Verification

- `node scripts/test-languages.cjs`: renders all public routes in each language with local fixtures; checks translated copy, stable form values, gallery/search/calculator output, persistence and blocked-storage behavior. Checks static translation coverage.
- `node scripts/test-ai.mjs`: validates language handling and server instructions using mocked upstream calls, without spending API credits.
- `node node_modules/typescript/bin/tsc --noEmit`
- `node node_modules/vite/bin/vite.js build --config vite.preview.config.ts`

The component checks do not replace native-speaker review or mobile browser QA. In this session the browser security policy prevented inspection of the localhost page; no live OpenAI calls or production CRM submissions were made.
