# Source verification — FCTS regulatory & reference data

**Purpose.** Apply the same web-based fact-check that surfaced errors in the sister rostering project's documents (wrong ICAO codes, "/2025" Legal-Notice citations) to the **FCTS's own** regulatory references and airport codes. Net result: the FCTS is **substantially cleaner** than the source CMS documents — it gets the things the CMS docs got wrong — with a small number of refinements and items legitimately pending primary source.

**Status:** verification input; the domain owner (Capt. Ng'ong'a) confirms anything marked "pending primary source" against the gazette.

Legend: ✅ verified · ⚠️ refine · ❓ pending primary source.

---

## 1. ICAO airport codes — clean

The only airport codes in FCTS source are crew **base** codes in the fixtures (`packages/domain/src/fixtures.ts`). Checked against airport registries:

| Code (FCTS) | Airport                              | Verdict        |
| ----------- | ------------------------------------ | -------------- |
| HKJK        | Nairobi, Jomo Kenyatta International | ✅             |
| HKNW        | Nairobi, Wilson                      | ✅             |
| HKMO        | Mombasa, Moi International           | ✅             |
| HKML        | Malindi                              | ✅             |
| **HKEL**    | **Eldoret International**            | ✅ **correct** |

**Notable contrast:** the sister CMS handover used **HKED** for Eldoret (wrong — correct is **HKEL**) and also mis-coded Mogadishu (HCMO→**HCMM**), Zanzibar (HZZO→**HTZA**), Hargeisa (HCGB→**HCMH**), and Galkayo (HCGD→**HCMR**). The FCTS does **not** carry any of those errors. The synthetic-cohort generator added on this branch deliberately uses the correct `HKEL`. If FCTS later ingests a destination/aerodrome table (for Aerodrome Qualification), seed it from **ICAO DOC 7910 / the AIP**, and do not import the CMS handover's airport list without correcting those five codes first.

## 2. KCARs 2025 citations — correct year, sound mapping, some subjects pending

FCTS cites the regulations as **Legal Notices of 2026** (`packages/ontology/src/kcars-2025.ts`). This matches Kenya Law, which gazettes the **Civil Aviation Regulations "2025" as Legal Notices of 2026** (e.g. LN 2026/29 = Operation of Aircraft – CAT Aeroplanes; LN 2026/30 = Air Traffic Services; LN 2026/37 = Airworthiness). The sister CMS docs cited "L.N. 42/**2025**" — wrong year — and attributed FTL to LN 42; **FCTS makes neither error.**

| FCTS reference                                                                                                           | Check                                                                                                                                               | Verdict                                                                        |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Regs gazetted as **LN … of 2026**                                                                                        | Matches Kenya Law's 2026 LN series                                                                                                                  | ✅                                                                             |
| **LN 29/2026** = Operations (Aeroplanes)                                                                                 | Kenya Law LN 2026/29 = "Operation of Aircraft for Commercial Air Transport – Aeroplanes"                                                            | ✅                                                                             |
| **LN 37/2026** = Airworthiness                                                                                           | Kenya Law LN 2026/37 = "Airworthiness"                                                                                                              | ✅                                                                             |
| **LN 30/2026** = "Safety Management & ATS"                                                                               | Kenya Law LN 2026/30 = "Air Traffic Services"; the **ATS** half is confirmed, the **SMS** attribution to LN 30 is not                               | ⚠️ confirm the SMS instrument number                                           |
| **LN 41/2026** = Aerodromes                                                                                              | Not surfaced in open search                                                                                                                         | ❓ confirm title/number                                                        |
| **LN 42/2026** = Air Operator Certification & Admin; Third Schedule = OM content list (§2.1 34 clauses / §2.2 12 topics) | Consistent with CLAUDE.md; LN 42 title not independently surfaced in open search. The code already marks clause **subjects** `pendingPrimarySource` | ❓ confirm LN 42 title + populate Third-Schedule subjects from the gazette PDF |
| **Reg 84** transition deadline `2027-03-06` (= LN 42 effective 2026-03-06 + 12 months)                                   | Matches CLAUDE.md "~06 March 2027"                                                                                                                  | ✅                                                                             |
| **Reg 56(2)** FDAP > 27,000 kg under LN 29                                                                               | Plausible (ops reg); both F70 (37,995 kg) and F100 (44,450 kg) qualify                                                                              | ✅                                                                             |

**FTL note.** Kenya's **Fatigue Management Regulations 2025** were reported as _awaiting gazettement_. The FCTS is a **training-records** platform and (correctly) does **not** implement or assert FTL/FDP limits — so the FTL-currency risk that affects the rostering project does **not** apply here. Keep it that way: if any FTL figure ever appears in FCTS, it must come from the operator's approved scheme, not a default.

## 3. Aircraft type facts — match the authoritative list

`packages/domain/src/aircraft.ts` (`AIRCRAFT_FACTS`) checked against manufacturer spec and CLAUDE.md:

| Fact                      | FCTS value                  | Verdict                             |
| ------------------------- | --------------------------- | ----------------------------------- |
| Engine                    | RR Tay Mk.620-15            | ✅                                  |
| APU                       | AlliedSignal GTCP36-150-RR  | ✅                                  |
| Hydraulic systems         | 3                           | ✅                                  |
| F70 MTOW / F70-HGW / F100 | 37,995 / 39,915 / 44,450 kg | ✅ (CMS doc had F70 38,100 — minor) |
| Fokker production end     | 1997 (bankruptcy Mar 1996)  | ✅                                  |

## 4. Currency cadences — correct (and better than the CMS doc)

| Item            | FCTS (`currency-catalog.ts`) | Check                                                     | Verdict                           |
| --------------- | ---------------------------- | --------------------------------------------------------- | --------------------------------- |
| **OPC**         | 6 months                     | Conventional OPC = 6-monthly                              | ✅                                |
| **LPC**         | 12 months                    | Conventional LPC = annual                                 | ✅                                |
| Class 1 medical | **12 months (flat)**         | ICAO: 12 mo if < 40, **6 mo if ≥ 40** (6-monthly over 60) | ⚠️ consider age-adjusted validity |

The sister CMS handover was internally inconsistent on OPC vs LPC (looked swapped); the **FCTS catalogue has them the right way round.** The one refinement: the medical cycle is a flat 12 months. ICAO makes it age-dependent (6-monthly from age 40). The catalogue comment already notes cycle values are operator-configurable defaults, so this is a precision refinement, not a defect — but for crew over 40 a flat 12-month cycle would under-alert. Recommended: make `class1Medical` validity age-aware (derive from `pilot.dateOfBirth`, which already exists on the `Pilot` type) when computing `validTo`.

## 5. Summary

| Area                                                           | FCTS state                                                                 |
| -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| ICAO airport codes                                             | ✅ clean (correct HKEL etc.; none of the CMS doc's 5 errors)               |
| KCARs LN year (of 2026)                                        | ✅ correct (CMS docs were wrong)                                           |
| LN 29 / 37 / Reg 84 / Reg 56(2)                                | ✅ verified                                                                |
| LN 30 "SMS" half, LN 41, LN 42 title + Third-Schedule subjects | ❓ pending primary source (already flagged `pendingPrimarySource` in code) |
| Type facts (engine/APU/hydraulics/MTOW)                        | ✅ verified                                                                |
| OPC/LPC cadence                                                | ✅ correct                                                                 |
| Class 1 medical cadence                                        | ⚠️ make age-aware (≥40 ⇒ 6-monthly)                                        |

**Action items for the domain owner:** confirm the LN 30 SMS attribution, LN 41/42 titles, and populate the Third-Schedule clause subjects from the gazetted PDF (drop them into `docs/regulatory/` and the `buildSectionClauses` known-lists). Engineering item: age-aware medical validity.

## Sources

- Eldoret HKEL/ELD — [Wikipedia](https://en.wikipedia.org/wiki/Eldoret_International_Airport), [SKYbrary](https://skybrary.aero/airports/hkel)
- Mogadishu HCMM, Zanzibar HTZA, Hargeisa HCMH, Galkayo HCMR — [Aden Adde (Wikipedia)](https://en.wikipedia.org/wiki/Aden_Adde_International_Airport), [Abeid Amani Karume (Wikipedia)](https://en.wikipedia.org/wiki/Abeid_Amani_Karume_International_Airport), [Hargeisa (Wikipedia)](https://en.wikipedia.org/wiki/Hargeisa_Airport), [Galkayo HCMR (Universal)](https://www.universalweather.com/airports/HCMR-GLK-ABDULLAHI-YUSUF-AIRPORT-GALKAYO-MUDUG-SOMALIA/)
- Kenya CARs 2025 = Legal Notices of 2026 — [KCAA published regs 2025](https://www.kcaa.or.ke/published-regs-2025), [Kenya Law LN 2026/29](https://new.kenyalaw.org/akn/ke/act/ln/2026/29/eng@2026-03-03)
- Class 1 medical validity (12 mo < 40 / 6 mo ≥ 40) — [Medical certifications for pilots (Wikipedia)](https://en.wikipedia.org/wiki/Medical_certifications_for_pilots)
- Fokker production end 1997 — [Wikipedia: Fokker](https://en.wikipedia.org/wiki/Fokker)
