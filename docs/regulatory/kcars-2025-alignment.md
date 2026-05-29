# KCARs 2025 alignment — review of the gazetted Legal Notices

**Source.** Reviewed the gazetted KCARs 2025 Legal Notices supplied on the shared drive (owner: the KCARs drafting account; Kenya Gazette Supplements, Legislative Supplements of 6 March 2026). Primary instrument read in full for this pass: **L.N. 42 — The Civil Aviation (Air Operator Certification and Administration) Regulations, 2025**. Cross-checked LN subjects/numbers against the gazetted titles and Kenya Law.

**Status:** corrective measures below are implemented in code and locked by tests. Items marked ❓ remain to confirm against the specific gazetted notice.

---

## 1. What was corrected

### 1.1 Third Schedule (LN 42) — restructured to the gazette ✅ (functional)

The OM Cross-Reference Matrix export and the compliance view were built on an inaccurate model (`§2.1 = 34 OM clauses; §2.2 = 12 mandatory training topics`). The gazetted Third Schedule (rr. 30(1) and 31(2), "Operations Manual") actually has **four** CONTENTS sub-sections:

| Section | Title                            | Clauses               |
| ------- | -------------------------------- | --------------------- |
| §2.1    | General                          | **39** (2.1.1–2.1.39) |
| §2.2    | Aircraft operating information   | **13** (2.2.1–2.2.13) |
| §2.3    | Routes, aerodromes and heliports | **6** (2.3.1–2.3.6)   |
| §2.4    | Training                         | **3** (2.4.1–2.4.3)   |
|         | **Total**                        | **61**                |

All 61 clause subjects are now transcribed from the gazette into `packages/ontology/src/kcars-2025.ts` (`THIRD_SCHEDULE_SECTIONS`), replacing the placeholder/`pendingPrimarySource` model. Notable anchors:

- **§2.1.2** — Flight & duty time limitations and rest schemes (FTL is an OM-content requirement; numeric limits come from the operator's approved scheme).
- **§2.1.25** — Stabilised approach procedure (operator sets gate heights; the regulation does not prescribe values). _(Was already correct.)_
- **§2.1.30** — CFIT/GPWS avoidance **and upset prevention & recovery (UPRT)**.
- **§2.1.35** — Carriage of dangerous goods.
- **§2.2.4** — **Flight-planning data** — _not_ CRM. The prior model mislabelled §2.2.4 as "CRM". CRM training belongs under **§2.4.1** (flight crew training programme), which is where it is now mapped.

Consumers updated to the new structure: the exports assembler (`@dnca/exports` now iterates all four sections and reports per-section + overall totals), the OM-matrix print page, the compliance page, the demo OM mappings (`§2.2.4 → §2.4.1`), the regulatory cross-reference (CRM → §2.4.1), and the AI system prompt's OM-content description. Locked by `packages/ontology/test/third-schedule.test.ts`.

### 1.2 Legal-Notice subject corrections ✅

Verified LN→subject against the gazetted titles:

| LN          | Gazetted subject                                          | Was in code                               | Action                                                                                 |
| ----------- | --------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------- |
| **42/2026** | Air Operator Certification & Administration               | ✅ correct                                | confirmed (read in full); effective 6 Mar 2026                                         |
| **30/2026** | **Air Traffic Services**                                  | "Safety Management & ATS"                 | corrected → ATS (Safety Management is **LN 32**)                                       |
| **31/2026** | **Security** (AVSEC)                                      | "Aviation Security & Personnel Licensing" | dropped Personnel Licensing (LN 50); confirmed LN 31 = Security via Kenya Law ✅       |
| 29/2026     | Operation of Aircraft — **CAT** — Aeroplanes              | ✅                                        | confirmed via Kenya Law (distinct from LN 47 = General Aviation); effective 3 Mar 2026 |
| 37/2026     | Airworthiness                                             | ✅ (date 3 Mar)                           | confirmed via Kenya Law; **date corrected → 6 Mar 2026**                               |
| 40/2026     | Unmanned Aircraft Systems                                 | ✅ (date 3 Mar)                           | confirmed via Kenya Law; **date corrected → 6 Mar 2026**                               |
| 41/2026     | **Certification, Licensing & Registration of Aerodromes** | "Aerodromes" (date 3 Mar)                 | confirmed via Kenya Law; title broadened; **date corrected → 6 Mar 2026**              |

Other gazetted notices seen on the drive (for reference): LN 18 Communication Procedures · LN 20 Approved Maintenance Organizations · LN 21 Environmental Protection (Aircraft Noise) · LN 23 Aircraft Nationality & Registration Marks · LN 24 CORSIA · LN 32 Safety Management · LN 47 Operation of Aircraft (General Aviation — Aeroplanes) · LN 50 Personnel Licensing.

### 1.3 Reg 17(3) and Reg 84 — confirmed verbatim ✅

- **Reg 17(3)** (LN 42): _"An Operator shall submit the proposed policy or procedure manual to the Authority at least thirty days prior to the date of intended implementation."_ — matches the platform's `REG_17_3` and the 30-day submission-deadline logic exactly.
- **Reg 84** = "Saving and Transitional Provision" (LN 42, Part XI; Reg 83 revokes L.N. 92/2018). Confirms the Reg 84 transition anchor; effective date 6 Mar 2026 ⇒ unextended deadline 2027-03-06 (already in code).
- **Reg 82 / Sixth Schedule penalties — verified verbatim ✅** (this pass). From the LN 42 gazette: a contravention of an **"A" provision** is liable to a fine **not exceeding one million shillings** per offence and/or imprisonment **not exceeding one year**; a **"B" provision**, a fine **not exceeding two million shillings** per offence and/or imprisonment **not exceeding three years**. The hardcoded `SIXTH_SCHEDULE_PENALTIES` values (A: 1,000,000 / 1 yr · B: 2,000,000 / 3 yr) match exactly — marked `primarySourceVerified: true` and locked by `instruments.test.ts`.

### 1.5 FDAP / >27,000 kg — also stated in LN 42 ✅ (this pass)

The Flight Data Analysis Programme requirement is cited in code as `REG_56_2 → LN 29`. Reading LN 42 in full shows the same requirement stated **verbatim in LN 42**: an operator of an aeroplane with MTOM **in excess of 27 000 kg** _"shall establish and maintain a flight data analysis programme as part of its safety management system"_ (under the "Safety Programme and Management System" regulation, sub-para (2)). Added `REG_FDAP_LN42` and a note on `REG_56_2`: the binding citation for DNCA's AOC holders may be **LN 42** rather than (or in addition to) LN 29. The exact LN 42 regulation number could not be pinned from the flattened OCR — ❓ confirm the number before relying on it in an export.

### 1.6 Primary-source reconciliation — all seven binding notices now confirmed ✅ (via Kenya Law)

The supplied gazette PDFs on the drive are **LN 18, 20, 21, 23, 24, 32, 40, 42, 47, 50** — which covers **LN 40 & 42** of the binding set but not LN 29/30/31/37/41. Those five were confirmed instead against the **official Kenya Law record** (the Akoma-Ntoso URN, `new.kenyalaw.org/akn/ke/act/ln/2026/...`), which is authoritative. All seven binding instruments now carry an `authoritativeUrl` and `primarySourceVerified: true`. Confirmed titles/dates:

| LN  | Confirmed official title                                            | Effective      | Was in code                    |
| --- | ------------------------------------------------------------------- | -------------- | ------------------------------ |
| 29  | Operation of Aircraft for **Commercial Air Transport — Aeroplanes** | 2026-03-03     | "Operations" (broadened)       |
| 30  | Air Traffic Services                                                | 2026-03-03     | ✅ correct                     |
| 31  | **Security**                                                        | 2026-03-03     | "Aviation Security"            |
| 37  | Airworthiness                                                       | **2026-03-06** | ❌ date was 03-03 → fixed      |
| 40  | Unmanned Aircraft Systems                                           | **2026-03-06** | ❌ date was 03-03 → fixed      |
| 41  | **Certification, Licensing and Registration of Aerodromes**         | **2026-03-06** | "Aerodromes" + ❌ date → fixed |
| 42  | Air Operator Certification & Administration                         | 2026-03-06     | ✅ correct                     |

**Bug fixed:** LN 37/40/41 effective dates were 2026-03-03 in code; the gazette batches them at **2026-03-06**. (LN 29/30/31 are correctly 3 Mar; the later operational set — 44/45/47/48/49/51 — is 25 Mar.) LN 29 is the **CAT-aeroplane** operations regulation, distinct from LN 47 (General Aviation — Aeroplanes), and is the operational home of the FDAP / FDR / HF-checklist regs.

### 1.4 Personnel Licensing (LN 50) — currency cadences verified ✅

Read LN 50 (Personnel Licensing) in full and checked the FCTS currency catalogue:

- **Class 1 medical** is **age-dependent**: 12 months under 40; **6 months at 40+** (and 6 months at 60+ in multi-crew CAT). The catalogue had a flat 12-month cycle — kept as the under-40 baseline, documented the age-split in `notes`, re-sourced to LN 50, and added `class1MedicalValidityMonths(age)` (12 <40, else 6) for deriving the window. (Class 2/PPL is 48/24/12 months — not modelled; FCTS tracks Class 1.)
- **ELP** (reg 8): Level 4 → re-evaluate every **3 years**, Level 5 → **6 years**, Level 6 → lifetime. The catalogue already matched; re-sourced to LN 50 reg 8 + Second Schedule.
- **Recent experience** (reg 11): LN 50 **delegates** the specifics to the Authority/operator; the FCTS 90-day / 3-take-offs-and-landings value is the ICAO/FAA standard the scheme adopts — noted as such.

## 2. Fatigue Management / FTL — still draft

Only a _stakeholder-comments matrix_ for the **Civil Aviation (Fatigue Management) Regulations** is present (no gazetted notice), consistent with the earlier finding that the FTL/FRMS instrument is not yet in force. The FCTS correctly does not assert FTL limits; no change needed. (Relevant to the sister rostering product, not this one.)

### 1.7 LN 29 read in full — operational sub-regulations corrected ✅ (this pass)

The gazetted **LN 29 of 2026** PDF (Kenya Gazette Supp. No. 40, 3 Mar 2026) was supplied and read. Three operational citations the platform carried were **wrong — they were the repealed LN 126/2018 numbers** and did not match the gazette:

| Topic                              | Was (LN 126/2018 numbering) | Correct (gazetted LN 29/2026)                                                                                                                                                                      |
| ---------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Human Factors in checklist design  | reg 32(3) & 38(3)           | **reg 15(2)** — _"the design and utilization of checklist … shall observe human factors principles"_                                                                                               |
| FDAP / >27,000 kg                  | "LN 29 reg 56(2)"           | **LN 42** (Safety Programme & Management System reg, sub-para (2)); LN 29 reg 56 is _en-route one engine inoperative_. LN 29 reg 6(2)(a) carries a parallel >27,000 kg aircraft-tracking threshold |
| FDR post-event retention (60 days) | "LN 29 reg 18(3)(i)"        | **LN 29 reg 87** preserves flight-recorder records and cross-refers the period to the **Aircraft Accident & Incidents Investigation Regulations**; LN 29 reg 18 is _threshold crossing height_     |

Corrected in `kcars-2025.ts` (`REG_15_2`, `REG_FDAP_LN42`, `REG_87_FLIGHT_RECORDER`; old `REG_32_3`/`REG_38_3`/`REG_56_2`/`REG_18_3_I` removed), the AI system prompt, the domain cross-reference matrix, **and CLAUDE.md's "Things you must not get wrong" list** (which itself carried the 2018 numbers). LN 29 is now fully `primarySourceVerified`.

## 3. Remaining ❓

1. Exact **LN 42 regulation number** for the FDAP/SMS clause (§1.5) — couldn't be pinned from the flattened OCR (the LN 42 PDF text is OCR-flattened; the substance is verbatim-confirmed).
2. ~~LN 29 operational sub-numbers (HF / FDAP / FDR)~~ ✅ **done** — LN 29 read in full (§1.7); CLAUDE.md corrected.
3. ~~LN 29/30/31/37/41 subjects, numbers, dates~~ ✅ **done** — confirmed via Kenya Law (§1.6).
4. ~~Sixth Schedule penalty band values (Reg 82)~~ ✅ **done** — see §1.3.
5. ~~Personnel Licensing (LN 50) currency cadences~~ ✅ **done** — see §1.4.

## Source files (shared drive)

- `L. N. 42 The Civil Aviation (Air Operator Certification and Administration) Regulations, 2025` (read in full)
- `L.N. 32 … (Safety Management) Regulations, 2025`; `L. N. 50 … (Personnel Licensing) Regulations, 2025`; `L.N. 47 … (Operation of Aircraft – General Aviation – Aeroplanes)`; `L.N. 40 … (Unmanned Aircraft Systems)` — titles cross-checked
- `Matrix For Stakeholder Comments … (Fatigue Management) Regulations` — confirms FTL still draft
