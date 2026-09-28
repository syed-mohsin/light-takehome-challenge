# Development guidance — v0

Keep the implementation simple, declarative, and easy to follow. These are directional guidelines; add structure when it makes the code clearer.

## Frontend

- Keep components small and focused. Separate presentational components from containers where useful: presentational components receive data and callbacks; containers coordinate data and behavior.
- Move complex frontend logic and state coordination into focused hooks, even when a hook is used only once. Keep component rendering declarative and easy to scan.
- Establish a small design system. Reuse fundamental components and shared tokens for colors, spacing, typography, and other recurring styles.
- Prefer styles colocated with JSX, using Tailwind utility classes that reference shared tokens where helpful. Avoid repeated literal style values. Minimize separate stylesheets; reserve CSS files for shared tokens, global base styles, or styling that clearly needs them.
- Use Zod wherever runtime validation is needed. Maintain TypeScript type safety, infer types from schemas where appropriate, and avoid duplicating schema definitions as handwritten types.
- Keep layouts responsive and usable on mobile.
- Design loading, empty, and error states alongside the successful state. Keep controls keyboard accessible and give charts readable labels, units, and text summaries.

## Backend

- Keep route handlers and server functions lightweight. They should validate input, call a service, and map the result to a response. Router-level error handling belongs here when appropriate.
- Keep backend business logic in services, outside the router layer.
- Use Zod for runtime validation of request inputs and external data. Reuse schemas where the contract is shared and keep service inputs and outputs typed.

## Domain and data

- Keep aggregation, pricing, and simulation math in pure, typed functions. Hooks coordinate frontend state; services coordinate backend workflows.
- Preserve energy as integer Wh during calculations and convert to kWh or currency at the presentation boundary.
- Preserve source timestamps and offsets. Keep reporting periods, missing-data behavior, units, rates, and carbon assumptions explicit; never silently treat missing intervals as zero.
- Describe simulations as scenarios rather than forecasts. Do not infer appliance causes, solar self-consumption, export credits, or carbon impact without the data and assumptions needed to support them.

## AI-generated insights

- Calculate all metrics deterministically before calling an LLM. Use the model to explain and prioritize verified facts, not to perform source-of-truth arithmetic.
- Validate structured model output with Zod and provide a useful deterministic fallback when the model is unavailable or returns invalid output.
- Keep prompts concise and versionable, cache results using the relevant data and prompt versions, and keep API credentials server-side.

## Testing and verification

- Test consequential behavior: CSV validation and aggregation, Wh-to-kWh conversion, pricing, reporting-period boundaries, and simulation invariants.
- Prefer tests against public behavior and domain rules over tests that mirror implementation details.
- Before completing a change, run the relevant formatter/linter, type checks, tests, and production build. Check responsive and accessible behavior for meaningful UI changes.
