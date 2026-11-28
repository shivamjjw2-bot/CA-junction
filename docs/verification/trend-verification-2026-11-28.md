# Trend Analysis verification — 28 November 2026

Status: INCOMPLETE. This is not an error-free certification.

- Inventory: 114 published free previous-year question papers across 16 subjects.
- 36 had persisted completed analysis results at inventory time. These are not independent source-accuracy certifications.
- Offline source inspection: 24 downloaded files; 23 readable, one encrypted; 90 not checked by this run.
- The encrypted file is Final Advanced Auditing, Assurance and Professional Ethics, May 2025. It opens with an empty password but contains PDF encryption settings unsupported by the current document pipeline. Original material was not modified.
- The remaining source download batch was blocked by automatic approval review after unrelated Visual Studio telemetry was detected. Offline inspection of already downloaded files completed.
- Direct live API test: HTTP 403 Cloudflare Access denied page, reference a617dca9bad1fd38-SIN. This is an edge-access block, not a Trend Analysis JSON response. No authentication or firewall rules were weakened.
- Thirteen automated suites passed: checkpoint, PDF, pipeline, choices, observed failure, core, all-subject patterns, instruction audit, streaming, rules recovery, focused question repair verification runner and nested-choice normalization.
- Actual Taxation January 2025 page 8 and Advanced Accounting May 2024 pages 12–14 were visually checked for shared marks and OR boundaries. Tests use source-checked replacements with mock model transport; these are not a full live-model accuracy test.

## Signed-in all-paper verification

Open /trend-verification after signing in as an approved admin. Run all papers / resume enumerates all levels and subjects, then uses the existing authenticated endpoint sequentially. It reuses existing saved results, pauses on 401/403/429, and offers a JSON export. Pending work stays pending; processed means API processing completed, not independent educational review. No new privileged server endpoint, bypass, key or database permission is introduced.

## Outstanding acceptance work

- Run the signed-in 114-paper verification; review every remaining failed or pending row.
- Supply an unencrypted copy of the affected Audit paper.
- Compare all returned question references, page numbers, marks, choices and chapter classifications with original sources, including numerical tables, formulas and mixed chapters.
- Verify PDF/CSV exports and mobile/desktop signed-in operation with actual results.
- Confirm runtime causes for any persistent 502 using Cloudflare logs.
