# Prototype — Frozen Reference

This directory contains the original single-file React artifact that captured the working prototype of the Fokker 70/100 Flight Crew Training Suite.

**Source:** https://claude.ai/public/artifacts/fe7eaec3-a6b5-4589-96da-d84f0790b69b

## Status: FROZEN

This is a frozen reference implementation. **Do not modify** files in this directory as part of the production rebuild. Treat it as a behavioural specification of the intended UX and data model.

## Known limitations (carry over for production fix)

- Uses `window.storage` (browser-local) for persistence — production must replace with backend API
- Mixed single-competency exercise mapping via regex heuristic — production must implement per-exercise multi-competency CBTA grading per ICAO Doc 9868
- Hardcoded stabilised approach gates (1,000 ft IMC / 500 ft VMC) — must become per-operator configuration
- Direct `fetch` to `api.anthropic.com` from the browser — production must proxy through backend with rate limiting, schema validation, and audit logging
- "N/A" treatment of medical/licence for in-training pilots is incorrect — these are required regardless of training phase
- XSS surface in unescaped string interpolation — must HTML-escape in production
- Hardcoded model identifier `claude-sonnet-4-20250514` (legacy) — production should use the pinned models per CLAUDE.md

See `/CLAUDE.md` for full production rebuild specifications.
