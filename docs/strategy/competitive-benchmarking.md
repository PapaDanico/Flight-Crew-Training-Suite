# Competitive benchmarking — Fokker 70/100 Flight Crew Training Suite

**Audience:** Capt. Dan Ng'ong'a / DNCA strategy.
**Scope:** Where the FCTS sits against global solutions in **training-records management, CBTA/competency grading, currency/expiry tracking, OM/document control, and KCAA audit evidence** — _not_ crew rostering (that is the sister product, Ratiba).
**Status:** Strategy input; not a regulatory determination.

---

## 1. What the FCTS actually is (for positioning)

A multi-tenant, **type-specific (F70/100)**, **KCARs-2025-anchored** training-records platform: pilot currency across a 23-item catalogue, **ICAO Doc 9868 CBTA grading of all 8 competencies per exercise**, session sign-off, append-only audit trail, KCAA-formatted exports (Crew Currency Snapshot, Pilot Training File, OM Cross-Reference Matrix), schema-validated AI assessment generation, and a planned OM version-control + Reg 17(3) KCAA submission flow. Delivered **forward-deployed** (bespoke per operator) rather than as generic SaaS.

## 2. The landscape it competes in

| Segment                                       | Representative systems                                                                                                          | Character                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Training management systems (ATO/airline)** | **Mint TMS**, **CAE** (CAE Rise — EBT/CBTA analytics), Lufthansa Aviation Training, training modules inside **AIMS** / **Leon** | Mature recurrent scheduling, sim-slot booking, instructor management, EBT analytics. Generic across types; heavyweight.      |
| **Quality / compliance / competency**         | **Ideagen** (AQD, Coruson, Q-Pulse), **Centrik** (Comply365)                                                                    | Centrik is the closest all-rounder: training + currency + compliance + manuals for many operators. Strong SMS/QA pedigree.   |
| **OM / document control**                     | **Web Manuals**, **Comply365**, **Vistair (DocuNet)**, **Yonder**                                                               | Own per-page revision control, LEP, controlled distribution, e-sign. This is the turf of the FCTS's planned document module. |
| **CBTA / EBT specialists**                    | **CAE Rise**, Airbus competency analytics, OEM EBT programmes                                                                   | Deep data-driven competency analytics, grading trend models.                                                                 |

## 3. Feature benchmark

Legend: ● strong · ◐ partial/planned · ○ absent

| Capability                                                                 | FCTS (today + planned)             | TMS (Mint/CAE)       | Compliance (Ideagen/Centrik) | Doc control (Web Manuals/Vistair) |
| -------------------------------------------------------------------------- | ---------------------------------- | -------------------- | ---------------------------- | --------------------------------- |
| **F70/100 type depth** (Tay, 3 hyd systems, flap convention, PPAA, VMA)    | ● **(unique)**                     | ○ (generic)          | ○                            | ○                                 |
| **KCARs-2025 / East-African regulatory fit**                               | ● **(unique)**                     | ○                    | ◐ (configurable)             | ◐                                 |
| Currency / expiry tracking (23-item, status thresholds)                    | ●                                  | ●                    | ●                            | ○                                 |
| **CBTA — all 8 competencies per exercise (Doc 9868)**                      | ● (correct multi-competency model) | ● (CAE Rise deepest) | ◐                            | ○                                 |
| EBT / biometric trend analytics                                            | ○                                  | ●                    | ◐                            | ○                                 |
| Recurrent **scheduling & sim-slot booking**                                | ○ (gap)                            | ●                    | ◐                            | ○                                 |
| **Append-only audit trail** (inspector reconstruction)                     | ● (Postgres triggers, ADR 0003)    | ◐                    | ●                            | ●                                 |
| **KCAA-formatted exports / evidence packs**                                | ● **(differentiator)**             | ◐                    | ◐                            | ◐                                 |
| OM **version control + LEP + diff**                                        | ◐ (planned)                        | ○                    | ◐                            | ●                                 |
| **Reg 17(3) KCAA submission workflow** (30-day, transmittal, version lock) | ◐ (planned) **(unique)**           | ○                    | ○                            | ◐                                 |
| Schema-validated **AI assessment generation**                              | ● (novel)                          | ◐                    | ○                            | ○                                 |
| Multi-tenant w/ row-level isolation                                        | ● (RLS)                            | ●                    | ●                            | ●                                 |
| Price / time-to-value (sub-scale operator)                                 | ● (lean, bespoke)                  | ○ (enterprise)       | ◐                            | ◐                                 |

## 4. Where the FCTS wins

1. **Type + regulator specificity.** No global TMS speaks F70/100 _and_ KCARs 2025. For a KCAA AOC holder flying Fokkers, a generic CAE/Mint deployment needs heavy configuration and still won't carry the type knowledge or the KCAA-formatted evidence. This is a genuine moat in the niche.
2. **Audit-grade by construction.** Append-only audit + KCAA-presentation exports + the OM cross-reference matrix target exactly what a KCAA inspector asks for. The incumbents treat audit as a module; here it is the spine.
3. **CBTA done correctly.** All-8-competency-per-exercise grading (replacing the prototype's regex heuristic) matches Doc 9868 better than many bolt-on grading screens.
4. **AI assessment generation** with schema validation + audit logging is ahead of the typical TMS quizzing tool.
5. **Forward-deployed economics.** Available at a scale and price the enterprise TMS vendors don't serve.

## 5. Where the FCTS is exposed — and the closing move

| Gap vs incumbents                              | Risk                                                                     | Closing move                                                                                                                                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No recurrent scheduling / sim-slot booking** | TMS buyers expect the calendar that turns "expiring" into a booked slot. | Add a lightweight training-scheduling view that consumes currency expiries and books OPC/LPC/sim slots; integrate with the operator's sim provider calendar. (This is also the natural seam to **Ratiba** — see §6.) |
| **No EBT/biometric trend analytics**           | CAE Rise-class analytics are the high end of CBTA.                       | Aggregate the 8-competency grades you already capture into per-pilot and fleet trend views; full EBT analytics later.                                                                                                |
| **Document control breadth**                   | Web Manuals/Vistair own controlled distribution + e-sign.                | Keep scope to OM **version control + LEP + diff + KCAA submission** (regulator-workflow-aware), not general DMS; integrate rather than compete on distribution.                                                      |
| **Single-type today**                          | Growth needs more types.                                                 | The `AircraftTypeProfile` plug-in (ADR 0006) already generalises this — promote profiles from preview to production per operator.                                                                                    |

## 6. "Distinct yet integrated" — FCTS × Ratiba

Keep two products on one shared crew/currency spine:

- **FCTS owns** type rating, OPC/LPC, medical, SEP, CRM, DGR **currency** and CBTA records → **publishes currency/expiry events**.
- **Ratiba owns** roster, FDP, rest, pairings, IROP → **consumes** those events to block assignments when a qualification is expired.
- **One canonical** `pilot_id` / `operator_id` ontology, and the **same RLS + append-only audit + ODPC/DPA posture** in both.

The recurrent-scheduling gap in §5 is precisely the handshake point: FCTS surfaces "OPC due in 30 days," Ratiba reserves the duty-free window and the sim slot. Build the event contract once.

## 7. Using anonymised operator data to test the FCTS

A real operator's anonymised crew-currency dataset is valuable for testing the dashboard, status thresholds, and exports at realistic scale — but under CLAUDE.md ("generalised demo data only") and Kenya DPA 2019 it cannot be the shipped demo seed. Adopted approach:

- **Shippable demo seed = synthetic.** `packages/domain/src/fixtures.ts` now generates a deterministic ~24-pilot establishment (NATO-phonetic names, realistic expiry clustering) modelled on the _shape_ of real data but containing no real-derived values.
- **Internal regression only = pseudonymised.** `packages/domain/test/internal/` holds a data-minimised, pseudonymised subset used solely to lock `statusFor()` behaviour against a real-world expiry distribution. It is never exported or seeded.

This gives realistic testing and demos while keeping real personal data out of shippable artifacts.
