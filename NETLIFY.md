# Deploying Land & Home to Netlify

This repository supports two build targets. `npm run build` retains the original Vinext/Sites build. Netlify must use `npm run build:netlify`, which runs the genuine Next.js compiler and produces `.next` for Netlify's Next.js adapter.

`netlify.toml` sets the Netlify command, publish directory and Node 22. The GitHub repository root already contains `package.json`; leave Netlify's base directory blank. Do not set it to `website`.

After pushing the configuration, retry the deploy with a cleared build cache. Keep the Next.js integration enabled. Do not change the publish directory to `dist`: that is a different runtime's output.

Local verification: TypeScript can be checked with `npx tsc --noEmit`. Build with `npm run build:netlify`. The sandboxed Windows build check encountered an OS access-denied error while resolving the project's directory, before compilation; successful Linux/Netlify compilation remains to be confirmed.

Hosting does not add a shared database. The CRM still stores sample data in each browser. Public form submissions are not yet delivered to a central company inbox, and CRM publication does not distribute listings to other visitors. Authentication, shared storage and the server API remain required before real operational use.
