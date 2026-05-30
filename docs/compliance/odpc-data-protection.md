# ODPC registration & data-protection pack (Kenya DPA 2019)

DNCA is the **data controller** for the flight-crew training data the platform holds (CLAUDE.md §"Data and retention"). This pack is the working artefact for registering with the **Office of the Data Protection Commissioner (ODPC)** under the **Data Protection Act, No. 24 of 2019** and the **Data Protection (General) Regulations, 2021**, and for running the platform compliantly thereafter.

> Sources: ODPC guidance on registration of controllers/processors; DPA No. 24 of 2019; Data Protection (General) Regulations 2021. Figures below were checked against ODPC/DPA public guidance (2024–2025); confirm the current fee schedule on the ODPC portal before paying, as fees are periodically revised.

## 1. Does DNCA have to register?

Registration is **mandatory** for a controller/processor that meets **either** limb:

- annual turnover/revenue **above KES 5,000,000**, **or**
- **more than 10 employees**;

and **regardless of size** for entities in named sensitive sectors. Aviation training is not itself a named mandatory sector, but the platform processes **health data** (Class 1 medical certificate status) and licence data, so registration is the prudent and expected posture even below threshold.

**Tier (drives the fee):**

| Tier        | Turnover / headcount                    |
| ----------- | --------------------------------------- |
| Micro/Small | KES 5M turnover, 1–50 employees         |
| Medium      | > KES 5M and < KES 50M, 51–99 employees |
| Large       | > KES 50M                               |

**Action — Capt. Ng'ong'a to confirm DNCA's turnover and headcount** so the correct tier and fee are selected. (Indicative: registration certificate valid **24 months**; renew **≥ 30 days before expiry**; indicative fees KES 4,000 register / KES 2,000 renew — verify current schedule.)

## 2. Controller / processor posture per deployment

- For DNCA's own books, assessments and training IP: **DNCA is controller**.
- For an **operator deployment** (JAK, I-Fly), the operator is typically the controller of _its_ crew's personal data and **DNCA acts as processor** under a written processing agreement (DPA §42). **Flag for Capt. Ng'ong'a / legal:** confirm controller vs processor (or joint-controller) per operator and paper it; the platform's multi-tenant isolation (Postgres RLS) supports either reading.

## 3. Records of Processing Activities (RoPA)

| Activity                    | Personal data                         | Special category?              | Purpose                       | Lawful basis (DPA §30)                          | Retention                          | Recipients                         |
| --------------------------- | ------------------------------------- | ------------------------------ | ----------------------------- | ----------------------------------------------- | ---------------------------------- | ---------------------------------- |
| Pilot identity & licence    | Name, licence no., ELP, passport/visa | No                             | Crew records, KCAA compliance | Legal obligation / legitimate interest          | 5 yr min; some lifetime of licence | KCAA (inspection)                  |
| Medical certificate status  | Class 1 medical validity/dates        | **Yes — health**               | Currency/fitness tracking     | Legal obligation; explicit consent where needed | 5 yr min                           | KCAA                               |
| Training & checking records | Sessions, CBTA grades, sign-offs      | No                             | Competence assurance          | Legal obligation                                | 5 yr min                           | KCAA                               |
| Currency tracking           | Computed statuses, expiries           | derived (incl. health-derived) | Operational control           | Legal obligation / legitimate interest          | rolling                            | operator HoT/AM                    |
| Audit log                   | actor, action, before/after, IP       | No                             | Accountability (DPA §31)      | Legal obligation                                | retained, append-only              | ODPC/KCAA on request               |
| AI assessment generation    | **No real pilot PII in prompts**      | n/a                            | Training content              | legitimate interest                             | prompt+response logged             | none external beyond Anthropic API |

Note: the platform stores **only currency dates/status for medicals, not clinical detail** — data minimisation by design. Demo/test environments use synthetic data only (Capt. Alpha One pattern); **no real pilot data leaves production**.

## 4. Data-subject rights (DPA §§ 26, 34–40)

Access, rectification, erasure, restriction, objection, portability. The platform supports these operationally today:

- **Access / portability:** the Pilot Training File export (PDF + machine-readable) is a subject-access response for a pilot's full record.
- **Rectification:** corrections create new append-only rows; the audit log preserves history (rectification ≠ deletion of the audit trail).
- **Erasure:** balanced against the **5-year statutory retention** for training records — erasure requests on retained regulatory records are refused with a documented lawful-retention basis until the period lapses.

## 5. DPIA

Processing **health data** (medical certificate status) is high-risk, so a **Data Protection Impact Assessment** is required before go-live, and must be **submitted to ODPC ~60 days before** the processing begins. The DPIA should cover: medical-status processing, multi-tenant isolation (RLS), the audit log, cross-border hosting, and the AI proxy (which carries no real PII). **Action:** draft DPIA before the first production operator cutover.

## 6. Personal-data breach runbook (DPA §43)

1. **Detect & contain.** On suspected breach, capture scope from the append-only audit log (which records actor, action, before/after, IP, time — immutable, so it is reliable forensic evidence).
2. **Notify the Data Commissioner without undue delay, within 72 hours** of becoming aware, where the breach risks data-subject rights/freedoms.
3. Where DNCA is a **processor** for an operator, notify that operator (controller) **within 48 hours**.
4. **Notify affected data subjects** where there is real risk of harm.
5. Record the breach, effects and remedial action in the breach register (retain).

## 7. Cross-border / residency

Host operator data **in-region** — AWS af-south-1 (Cape Town) or Azure South Africa North (ADR) — and treat transfers outside Kenya as restricted under DPA §§ 48–49 (adequacy / appropriate safeguards / consent). Keep the AI proxy free of real PII so model-provider calls are not a personal-data transfer.

## 8. How the platform already supports compliance

| DPA obligation               | Platform feature                                                               |
| ---------------------------- | ------------------------------------------------------------------------------ |
| Accountability (§31)         | Append-only audit log; UPDATE/DELETE rejected at the DB                        |
| Security (§41)               | RLS multi-tenant isolation; auth fails closed; rate limiting; non-leaky errors |
| Minimisation                 | Medical _status_ only, not clinical detail; synthetic demo data                |
| Subject access / portability | Pilot Training File + Crew Currency exports                                    |
| Records of processing        | This RoPA (§3)                                                                 |
| Observability of access      | Tenant/actor-tagged access logs (`docs/operations/observability.md`)           |

## 9. Open actions for Capt. Ng'ong'a / legal

1. Confirm DNCA turnover + headcount → registration tier; register on the ODPC portal.
2. Paper controller/processor agreements per operator deployment.
3. Approve and submit the DPIA ~60 days before the first production cutover.
4. Appoint a contact person / (where required) a Data Protection Officer for ODPC correspondence.
