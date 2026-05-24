import { useState, useEffect } from "react";
import { Users, BookOpen, Calendar, Shield, ClipboardCheck, Plane, AlertTriangle, CheckCircle, Clock, FileText, Award, Brain, Plus, X, Edit2, ChevronRight, Activity, Layers, Target, Wrench, MessageSquare, Compass, Briefcase, Sparkles, TrendingUp } from "lucide-react";

// ─── CONSTANTS ──────────────────────────────────────────────────────────
const OPERATORS = ["JAK", "I-Fly"];
const FLEETS = ["F70", "F100", "F70 HGW (5Y-MMB)"];
const ROLES = ["Captain", "First Officer"];
const BASES = ["HKJK", "HKEL", "HKML", "HKKI", "HTDA"];
const GRADES = ["AS", "S", "MS", "BS"];

const CURRENCIES = [
  { k: "medical", l: "Class 1 Medical", m: 12, cat: "Personal" },
  { k: "licence", l: "ATPL/CPL", m: 60, cat: "Personal" },
  { k: "typeRating", l: "F70/100 Type Rating", m: 12, cat: "Type" },
  { k: "opc", l: "OPC", m: 6, cat: "Type" },
  { k: "lpc", l: "LPC", m: 12, cat: "Type" },
  { k: "lineCheck", l: "Line Check", m: 12, cat: "Operational" },
  { k: "recurrentGround", l: "Recurrent Ground", m: 12, cat: "Operational" },
  { k: "crm", l: "CRM/TEM", m: 12, cat: "Operational" },
  { k: "dg", l: "Dangerous Goods", m: 24, cat: "Operational" },
  { k: "security", l: "Aviation Security", m: 24, cat: "Operational" },
  { k: "sep", l: "SEP (Wet/Dry Drill)", m: 12, cat: "Safety" },
  { k: "rvsm", l: "RVSM", m: 36, cat: "Special" },
  { k: "egpws", l: "EGPWS/TAWS", m: 36, cat: "Special" },
  { k: "windshearUprt", l: "Windshear/UPRT", m: 36, cat: "Special" },
];

const ITR_PHASES = [
  { id: "gs", title: "Ground School", days: 15, hrs: 105, detail: "Systems, performance, mass & balance, ops procedures, regs, Human Factors. Day 15 PM: internal exam (80% pass) + KCAA TTR." },
  { id: "fbt", title: "Fixed Base Trainer", days: 3, hrs: 12, detail: "Cockpit familiarisation, normal procedures, flows, scan technique." },
  { id: "ffs", title: "Full Flight Simulator", days: 9, hrs: 36, detail: "9 sessions × 4 hr at SimAero Dinard FR-101 (EASA Level C). FFS 9 = Progress Check (not Skills Test)." },
  { id: "skill", title: "Skills Test", days: 1, hrs: 4, detail: "KCAA Skills Test in FFS. Pass → type rating issued." },
  { id: "base", title: "Base Training", days: 1, hrs: 2, detail: "Mandatory on aircraft post-Skills Test (Level C sim — ZFTT not available). Min. 6 take-off/landings." },
  { id: "lifus", title: "LIFUS", days: 30, hrs: 100, detail: "100 hrs / 20 sectors line flying under supervision. Line Check on completion." },
];

const RECURRENT = [
  { id: "rg", title: "Recurrent Ground (Annual)", cycle: "12-month", hrs: 24, detail: "3-day refresher. Systems coverage rotates on triennial matrix (Yr1: PFCS/HYD/ENG; Yr2: ELEC/PNEUM/FUEL; Yr3: AVIONICS/AUTOFLT/PROT)." },
  { id: "opcr", title: "OPC", cycle: "6-month", hrs: 4, detail: "Operator Proficiency Check in FFS. Emergency & abnormal handling." },
  { id: "lpcr", title: "LPC", cycle: "12-month", hrs: 4, detail: "Licence Proficiency Check. Combined with OPC where SOP permits." },
  { id: "lc", title: "Line Check", cycle: "12-month", hrs: 2, detail: "Route check by TRE/LCE during normal line ops." },
  { id: "crmr", title: "CRM/TEM Recurrent", cycle: "12-month", hrs: 6, detail: "Threat & Error Management, T-DODAR, comms, leadership, automation management." },
  { id: "sepr", title: "SEP Drill", cycle: "12-month", hrs: 4, detail: "Wet drill (raft/slide) one year, dry drill alternate. Door & exit ops, evacuation, smoke/fire, decompression." },
  { id: "dgr", title: "Dangerous Goods", cycle: "24-month", hrs: 4, detail: "ICAO Doc 9284 / IATA DGR Cat 10." },
  { id: "secr", title: "Aviation Security", cycle: "24-month", hrs: 4, detail: "AVSEC programme per KCARs Security & ICAO Annex 17." },
];

const MODULES = [
  {
    id: "reg",
    title: "Regulatory Compliance",
    icon: Shield,
    color: "blue",
    sections: [
      { h: "KCARs 2025 — Primary Framework", b: "LN 29/2026 (Operations — Aeroplanes, 03 Mar 2026); LN 42/2026 (AOC, 06 Mar 2026); LN 30/31/37/40/41 of 2026. Third Schedule of LN 42/2026 is the binding OM content list." },
      { h: "FAA Cross-Reference", b: "14 CFR Part 121 (Operating Requirements — Domestic/Flag/Supplemental); Part 61 (Certification); Part 117 (Flight & Duty Limits). AC 120-51E (CRM); AC 120-71B (SOPs)." },
      { h: "EASA Cross-Reference", b: "Part-CAT (Commercial Air Transport); Part-ORO (Organisation Requirements); Part-FCL (Flight Crew Licensing); Part-ARO. CS-FSTD(A) for simulator qualification." },
      { h: "ICAO Anchor", b: "Annex 1 (Personnel Licensing) Amdt 49; Annex 6 Part I (Ops); Doc 9868 PANS-TRG (training); Doc 9859 SMS." },
      { h: "Key Binding Items", b: "Reg 32(3)/38(3) — HF in checklist design (no memory items beyond defined memory drills). Reg 56(2) — FDAP mandatory >27,000 kg MTOW (F70/F100 qualify). Reg 17(3) — 30-day pre-implementation submission. Sixth Schedule: A-class up to KSh 1M / 1 yr; B-class up to KSh 2M / 3 yrs." },
    ],
  },
  {
    id: "roles",
    title: "Roles & Responsibilities",
    icon: Users,
    color: "blue",
    sections: [
      { h: "Pilot-in-Command (PIC)", b: "Final authority. Safe conduct of flight, compliance with regs & OM, command decisions, weather/fuel/MEL, fitness assessment of crew, defect reporting, ASR filing." },
      { h: "Co-Pilot / First Officer", b: "Support PIC, monitor & cross-check, PF/PM duties per SOP rotation, radio comms when PM, ready to assume command if PIC incapacitated." },
      { h: "Pilot Flying (PF)", b: "Aircraft trajectory, thrust, configuration, autoflight mode control, FMS programming when PIC, calls for checklist & configuration changes." },
      { h: "Pilot Monitoring (PM)", b: "Monitor & cross-check PF actions, comms, checklist reading, FMS entries when PF is PIC, callouts (deviations, configuration, altitude, speed), challenge-and-response." },
      { h: "Senior Cabin Crew Member (SCCM)", b: "Cabin safety, pax briefings, cabin secure report, communication with flight deck per sterile cockpit rule, emergency leadership in cabin." },
      { h: "Cabin Crew Member (CCM)", b: "Pre-flight checks of safety equipment, pax safety, emergency drills, comms with SCCM and flight deck via interphone." },
    ],
  },
  {
    id: "safety",
    title: "Safety & Emergency Procedures",
    icon: AlertTriangle,
    color: "amber",
    sections: [
      { h: "Engine Failure / Fire", b: "PPAA: Power (set on live), Pitch (FD/attitude), Attitude (5° bank into live engine), Airspeed (V2 → V2+10). Confirm affected engine before any shutdown. Memory drill where applicable, then QRH." },
      { h: "Rejected Take-Off", b: "Below V1: max braking, idle thrust, speedbrake, reverse (where avail). PF: 'STOP, MY CONTROL'. PM: monitor decel, call 'REVERSE GREEN/AMBER', ATC notify." },
      { h: "Rapid Decompression", b: "Don oxygen masks (memory drill), establish comms, emergency descent to MEA/10,000 ft. PA to pax. Squawk 7700 if comms lost. Divert as required." },
      { h: "Smoke / Fire / Fumes", b: "Memory drill: oxygen masks 100%, smoke goggles, crew comms re-established. Identify source (electrical/AC/galley). QRH. Land at nearest suitable. Smoke removal per QRH." },
      { h: "Windshear", b: "PWS alert: TOGA, max thrust, pitch toward stick shaker, retract speedbrake, do not change configuration. Recovery on stick shaker boundary. Reactive: same response. PF announces, PM monitors." },
      { h: "GPWS / EGPWS", b: "PULL UP / TERRAIN: max thrust (TOGA), pitch up to stick shaker, wings level, gear/flap as is, speedbrake retracted. Maintain until terrain clearance assured." },
      { h: "TCAS RA", b: "Follow RA promptly even if conflicting with ATC. Disconnect AP if RA requires manual response. PM advises ATC 'TCAS RA'. Resume normal ops on 'CLEAR OF CONFLICT'." },
      { h: "Evacuation", b: "PIC initiates. Parking brake, fuel cut, fire handles, batteries off as time permits. Evacuation command via PA & cabin alert. SCCM coordinates exit usage." },
    ],
  },
  {
    id: "systems",
    title: "Aircraft Systems & Troubleshooting",
    icon: Wrench,
    color: "blue",
    sections: [
      { h: "Powerplant — RR Tay Mk.620-15", b: "Both F70 and F100 use the same engine variant. Bypass turbofan, FADEC-controlled. Reverse thrust available. EICAS engine page. Trouble: N1/N2 split, EGT trend, vib indications — refer QRH ENG section." },
      { h: "APU — AlliedSignal GTCP36-150-RR", b: "Provides bleed & elec power on ground and up to flight ceiling per AFM. Auto-shutdown logic on fault. ECAM/EICAS APU page for monitoring." },
      { h: "Hydraulics — Three Independent Systems", b: "Systems 1, 2, 3 — each pressurised by engine-driven pumps with electric standby. Cross-supply via PTU. Single-system loss: check QRH for affected services. Dual loss: emergency configuration." },
      { h: "Flight Controls", b: "Hydraulically powered with mechanical reversion on some surfaces. Elevator, aileron, rudder, spoilers, flaps, slats. Flap config: 0 / 8 / 15 / 25 / 42." },
      { h: "Takeoff Flap Selection", b: "Flaps 0 = standard/default. Flaps 8 = performance-dictated (short field, high temp/altitude, contaminated cleanup not allowed). Flaps 15 = reserved (very short, windshear). CONTAMINATED RUNWAY: Flaps 0 prohibited. TOCWS does NOT alert for Flaps 0 (valid config) — discipline on EICAS confirmation is mandatory." },
      { h: "Electrical", b: "AC generators on each engine + APU gen. Battery backup. TRUs for DC. Essential bus prioritisation in fault scenarios." },
      { h: "Pneumatics & Air-Con", b: "Bleed from engines or APU. Two packs. Trim air. Pressurisation controlled by CPC with manual reversion." },
      { h: "Avionics — VMA Speed System", b: "Approach speeds derived from VMA on PFD (Vref + additives). No paper speed cards required during approach if VMA active." },
      { h: "Fuel System", b: "Wing tanks + centre tank. Cross-feed, jettison (where fitted). Refuel/defuel panel. Imbalance limits per QRH." },
    ],
  },
  {
    id: "crm",
    title: "CRM, TEM & Decision-Making",
    icon: MessageSquare,
    color: "blue",
    sections: [
      { h: "Threat & Error Management (TEM)", b: "Threats: external events that increase complexity (weather, ATC, terrain, traffic). Errors: crew action/inaction. UAS: undesired aircraft state. Detect → mitigate → recover. Brief threats during pre-flight." },
      { h: "T-DODAR Decision Framework", b: "Time available — Diagnose problem — Options consider — Decide course — Act & Allocate tasks — Review outcome. Apply for non-time-critical decisions. For time-critical: memory drill first, then T-DODAR." },
      { h: "Communication", b: "Closed-loop comms. Standard callouts. Sterile cockpit below 10,000 ft. Briefings: dep, arrival, threat. Assertive PM challenge: 'CAPTAIN, I AM CONCERNED... I AM UNCOMFORTABLE... THIS IS UNSAFE'." },
      { h: "Leadership & Followership", b: "PIC authority balanced with crew input. FO assertion duty. Authority gradient management. Workload distribution." },
      { h: "Situational Awareness", b: "Aviate-Navigate-Communicate priority. Mental model of aircraft state, position, plan, threats. SA loss indicators: ambiguity, fixation, confusion, no one flying." },
      { h: "Automation Management", b: "FMA awareness. Mode confusion mitigation. 'WHAT IS IT DOING? WHY IS IT DOING THAT? WHAT WILL IT DO NEXT?' Reversion levels: full auto → managed → selected → manual." },
      { h: "Fatigue & Human Performance", b: "Recognition of fatigue. Crew rest. Nutrition. Hydration. WOCL (Window of Circadian Low). Self & cross monitoring." },
    ],
  },
  {
    id: "ops",
    title: "Flight Planning & Operations",
    icon: Compass,
    color: "blue",
    sections: [
      { h: "Pre-Flight Planning", b: "Route validation, fuel calculation (taxi + trip + contingency 5%/3% reduced + alternate + final reserve 30 min + extra), W&B with current load, NOTAMs, METAR/TAF dep/dest/alt, MEL/CDL check, performance for runway/conditions." },
      { h: "Departure", b: "Pre-flight inspection, cockpit prep, FMS programming, briefing (SID, threats, EFP), pushback, engine start, taxi, before-takeoff checks, line-up, takeoff." },
      { h: "Climb", b: "Initial climb to acceleration altitude (typically 1,500 ft AAL or noise abatement profile), clean-up, climb thrust, FL change requests, top of climb." },
      { h: "Cruise", b: "Cruise altitude management, fuel monitoring (cross-check planned vs actual), weather avoidance, ETP/PNR computations, ETOPS not applicable (F70/100 non-ETOPS)." },
      { h: "Descent & Approach", b: "TOD calc (3:1 rule + corrections), descent planning, approach briefing (STAR, approach chart, missed approach, threats), configuration management, energy management." },
      { h: "Stabilised Approach Gate", b: "Operator-defined per OM-B (KCARs 2025 LN 42/2026 §2.1.25 — gate flexibility). JAK/I-Fly: stabilised by 1,000 ft AAL IMC / 500 ft AAL VMC. If not stabilised → mandatory go-around." },
      { h: "Landing & Roll-Out", b: "Vref + additives via VMA, threshold crossing height, flare technique, touchdown zone, reverse thrust per SOP, autobrake/manual braking, taxi clearance." },
      { h: "Post-Flight", b: "Parking, shutdown checklist, technical log entries (defects, DMI), refuelling supervision if required, debrief." },
    ],
  },
  {
    id: "custsvc",
    title: "Customer Service",
    icon: Briefcase,
    color: "amber",
    sections: [
      { h: "Pax Welcome & PA", b: "Welcome PA pre-departure: greeting, flight info, route, weather/flight time, in-flight service overview, safety reminder. Cultural sensitivity. Multilingual where appropriate (English/Kiswahili for JAK/I-Fly Kenyan ops)." },
      { h: "In-Flight Updates", b: "Top-of-climb PA: cruise altitude, ETA, weather en-route. Mid-flight: significant points, weather updates, turbulence advisories. Pre-descent: 10–15 min before TOD, weather at destination, expected approach, connections info." },
      { h: "Service Recovery", b: "Delays, diversions, technical issues: honest, empathetic communication. Provide what info you have, avoid speculation. Escalate to ops/customer service team for compensation/rebooking." },
      { h: "Special Categories", b: "UMNRs, PRMs, medical pax, infants, VIPs — coordinate with cabin crew. Brief PIC of any special handling pre-flight." },
      { h: "Complaint Handling", b: "Listen, acknowledge, apologise where appropriate without admitting liability, document, refer. Pax feedback loop into ops/training via ASR system where safety-relevant." },
      { h: "Brand & Professionalism", b: "Uniform standards, grooming, demeanour. Crew represent the airline at every touchpoint." },
    ],
  },
  {
    id: "assess",
    title: "Assessment & Evaluation",
    icon: Target,
    color: "blue",
    sections: [
      { h: "Grading Scale (AS / S / MS / BS)", b: "AS — Above Standard: consistently exceeds required standard. S — Standard: meets required standard. MS — Minimum Standard: meets but needs reinforcement; remedial training advised. BS — Below Standard: does not meet standard; mandatory remedial training & re-check." },
      { h: "Knowledge — Written Exams", b: "Ground school internal exam: 80% pass mark. KCAA TTR (Type Technical Rating) written. Recurrent: knowledge checks per module." },
      { h: "Skills — Simulator", b: "FFS 9 (Progress Check) — instructor confirms readiness for Skills Test. Skills Test — KCAA-approved syllabus, examined by TRE. OPC/LPC — recurrent skill checks." },
      { h: "Operational Competence — Line", b: "LIFUS sectors signed off by Line Training Captain. Line Check by LCE at LIFUS completion and annually thereafter." },
      { h: "Effectiveness Metrics", b: "First-time pass rates, deviation reports, ASR trends, FDAP exceedances, recurrent failure rates. Reviewed by Training Manager + Safety quarterly." },
      { h: "Documentation", b: "Each session: lesson plan, brief, exercise log, debrief notes, grade, sign-off. Records retained per KCARs (typically 5 years; some items lifetime of licence)." },
    ],
  },
];

// ─── SEED DATA ──────────────────────────────────────────────────────────
const today = new Date();
const offsetDate = (months) => {
  const d = new Date(today);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

const seedPilots = [
  {
    id: "p1", name: "Capt. James Mwangi", licence: "KCAA/ATPL/2241", role: "Captain",
    operator: "JAK", fleet: "F70 HGW (5Y-MMB)", base: "HKJK", phase: "Line",
    currencies: {
      medical: offsetDate(8), licence: offsetDate(48), typeRating: offsetDate(9), opc: offsetDate(4),
      lpc: offsetDate(9), lineCheck: offsetDate(7), recurrentGround: offsetDate(8), crm: offsetDate(8),
      dg: offsetDate(20), security: offsetDate(18), sep: offsetDate(7), rvsm: offsetDate(28),
      egpws: offsetDate(28), windshearUprt: offsetDate(28),
    },
  },
  {
    id: "p2", name: "F/O Sarah Akinyi", licence: "KCAA/CPL/4118", role: "First Officer",
    operator: "JAK", fleet: "F70", base: "HKJK", phase: "Line",
    currencies: {
      medical: offsetDate(10), licence: offsetDate(52), typeRating: offsetDate(10), opc: offsetDate(1),
      lpc: offsetDate(10), lineCheck: offsetDate(11), recurrentGround: offsetDate(2), crm: offsetDate(2),
      dg: offsetDate(20), security: offsetDate(15), sep: offsetDate(1), rvsm: offsetDate(30),
      egpws: offsetDate(30), windshearUprt: offsetDate(30),
    },
  },
  {
    id: "p3", name: "Capt. David Otieno", licence: "KCAA/ATPL/1987", role: "Captain",
    operator: "I-Fly", fleet: "F100", base: "HKEL", phase: "Recurrent Due",
    currencies: {
      medical: offsetDate(-1), licence: offsetDate(40), typeRating: offsetDate(2), opc: offsetDate(-1),
      lpc: offsetDate(2), lineCheck: offsetDate(3), recurrentGround: offsetDate(1), crm: offsetDate(1),
      dg: offsetDate(12), security: offsetDate(10), sep: offsetDate(0), rvsm: offsetDate(20),
      egpws: offsetDate(20), windshearUprt: offsetDate(20),
    },
  },
  {
    id: "p4", name: "F/O Brian Kipchoge", licence: "KCAA/CPL/4521", role: "First Officer",
    operator: "I-Fly", fleet: "F100", base: "HKML", phase: "ITR — FFS",
    currencies: {
      medical: offsetDate(11), licence: offsetDate(58), typeRating: "—", opc: "—",
      lpc: "—", lineCheck: "—", recurrentGround: "—", crm: offsetDate(11),
      dg: offsetDate(22), security: offsetDate(22), sep: offsetDate(11), rvsm: offsetDate(34),
      egpws: offsetDate(34), windshearUprt: offsetDate(34),
    },
  },
];

// ─── HELPERS ────────────────────────────────────────────────────────────
const daysUntil = (dateStr) => {
  if (!dateStr || dateStr === "—") return null;
  const d = new Date(dateStr);
  const diff = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
};

const statusOf = (dateStr) => {
  const d = daysUntil(dateStr);
  if (d === null) return { s: "na", l: "N/A", c: "bg-slate-300 text-slate-700" };
  if (d < 0) return { s: "exp", l: "Expired", c: "bg-red-600 text-white" };
  if (d <= 30) return { s: "warn", l: `${d}d`, c: "bg-red-100 text-red-800 border border-red-300" };
  if (d <= 90) return { s: "caut", l: `${d}d`, c: "bg-amber-100 text-amber-800 border border-amber-300" };
  return { s: "ok", l: "Current", c: "bg-emerald-100 text-emerald-800 border border-emerald-300" };
};

const overallStatus = (pilot) => {
  const statuses = Object.values(pilot.currencies).map(statusOf);
  if (statuses.some((s) => s.s === "exp")) return { l: "Expired", c: "bg-red-600 text-white" };
  if (statuses.some((s) => s.s === "warn")) return { l: "Action Required", c: "bg-red-100 text-red-800 border border-red-300" };
  if (statuses.some((s) => s.s === "caut")) return { l: "Caution", c: "bg-amber-100 text-amber-800 border border-amber-300" };
  return { l: "Current", c: "bg-emerald-100 text-emerald-800 border border-emerald-300" };
};

// ─── COMPONENT ──────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [pilots, setPilots] = useState(seedPilots);
  const [loaded, setLoaded] = useState(false);
  const [selectedPilot, setSelectedPilot] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [filterOp, setFilterOp] = useState("All");
  const [filterFleet, setFilterFleet] = useState("All");
  const [moduleOpen, setModuleOpen] = useState(null);
  const [assessTopic, setAssessTopic] = useState("");
  const [assessQs, setAssessQs] = useState([]);
  const [assessLoading, setAssessLoading] = useState(false);
  const [assessAnswers, setAssessAnswers] = useState({});
  const [assessSubmitted, setAssessSubmitted] = useState(false);
  const [assessHistory, setAssessHistory] = useState([]);
  const [trainingMode, setTrainingMode] = useState("itr");

  // Load persistent data
  useEffect(() => {
    (async () => {
      try {
        const p = await window.storage.get("fokker_pilots");
        if (p?.value) setPilots(JSON.parse(p.value));
      } catch {}
      try {
        const h = await window.storage.get("fokker_assess_history");
        if (h?.value) setAssessHistory(JSON.parse(h.value));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  // Persist pilots
  useEffect(() => {
    if (loaded) window.storage.set("fokker_pilots", JSON.stringify(pilots)).catch(() => {});
  }, [pilots, loaded]);

  // Persist assessment history
  useEffect(() => {
    if (loaded) window.storage.set("fokker_assess_history", JSON.stringify(assessHistory)).catch(() => {});
  }, [assessHistory, loaded]);

  const filteredPilots = pilots.filter((p) =>
    (filterOp === "All" || p.operator === filterOp) &&
    (filterFleet === "All" || p.fleet === filterFleet)
  );

  // Stats for dashboard
  const stats = {
    total: pilots.length,
    captains: pilots.filter((p) => p.role === "Captain").length,
    fos: pilots.filter((p) => p.role === "First Officer").length,
    expired: pilots.filter((p) => overallStatus(p).l === "Expired").length,
    action: pilots.filter((p) => overallStatus(p).l === "Action Required").length,
    caution: pilots.filter((p) => overallStatus(p).l === "Caution").length,
    current: pilots.filter((p) => overallStatus(p).l === "Current").length,
    jak: pilots.filter((p) => p.operator === "JAK").length,
    ifly: pilots.filter((p) => p.operator === "I-Fly").length,
  };

  // AI assessment generation
  const generateAssessment = async () => {
    if (!assessTopic) return;
    setAssessLoading(true);
    setAssessQs([]);
    setAssessAnswers({});
    setAssessSubmitted(false);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{
            role: "user",
            content: `You are a Type Rating Examiner for Fokker 70/100 aircraft, generating training assessment questions for airline pilots operating under KCARs 2025 (Kenya Civil Aviation Regulations) with FAA/EASA cross-reference. Topic: "${assessTopic}". Generate exactly 5 challenging multiple-choice questions appropriate for ATPL/CPL-holder F70/100 type-rated pilots. Each question must have 4 options. Use accurate technical detail: RR Tay Mk.620-15 engines, AlliedSignal GTCP36-150-RR APU, three independent hydraulic systems, VMA-based approach speeds, takeoff flap configurations (0 default, 8 perf, 15 reserved, 0 prohibited on contaminated runways), TOCWS does not alert for Flaps 0, OEI PPAA technique with 5° bank into live engine, T-DODAR decision framework, grading AS/S/MS/BS, FFS 9 = Progress Check (not Skills Test). Respond ONLY with valid JSON array, no preamble, no markdown fences. Schema: [{"question":"...","options":["a","b","c","d"],"correctIndex":0,"explanation":"..."}]`
          }]
        })
      });
      const data = await r.json();
      const text = data.content?.find((b) => b.type === "text")?.text || "";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const qs = JSON.parse(cleaned);
      setAssessQs(qs);
    } catch (e) {
      console.error(e);
      alert("Failed to generate questions. Please try again.");
    }
    setAssessLoading(false);
  };

  const submitAssessment = () => {
    let correct = 0;
    assessQs.forEach((q, i) => {
      if (assessAnswers[i] === q.correctIndex) correct++;
    });
    const score = Math.round((correct / assessQs.length) * 100);
    const record = { topic: assessTopic, score, date: new Date().toISOString(), total: assessQs.length, correct };
    setAssessHistory([record, ...assessHistory].slice(0, 20));
    setAssessSubmitted(true);
  };

  const addPilot = (data) => {
    const newP = {
      id: `p${Date.now()}`,
      ...data,
      currencies: CURRENCIES.reduce((acc, c) => {
        acc[c.k] = data.phase === "ITR — Ground" || data.phase === "ITR — FFS" ? "—" : offsetDate(c.m - 1);
        return acc;
      }, {}),
    };
    setPilots([...pilots, newP]);
    setShowAdd(false);
  };

  const updateCurrency = (pilotId, key, value) => {
    setPilots(pilots.map((p) => p.id === pilotId ? { ...p, currencies: { ...p.currencies, [key]: value } } : p));
  };

  const deletePilot = (id) => {
    if (confirm("Remove this pilot record?")) {
      setPilots(pilots.filter((p) => p.id !== id));
      setSelectedPilot(null);
    }
  };

  // ─── RENDER ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header */}
      <header className="bg-slate-900 text-white border-b-4 border-amber-500">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded">
              <Plane className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Fokker 70/100 Flight Crew Training Suite</h1>
              <p className="text-xs text-slate-300">JAK · I-Fly · KCARs 2025 compliant · ICAO Annex 1 & 6 · FAA Part 121 / EASA Part-CAT cross-referenced</p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-300">
            <div>DN Consultancy Aviation</div>
            <div>Capt. Dan Moi Ng'ong'a — TRI/TRE</div>
          </div>
        </div>
        {/* Nav */}
        <nav className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {[
            { id: "dashboard", l: "Dashboard", i: Activity },
            { id: "pilots", l: "Pilots", i: Users },
            { id: "training", l: "Training Programmes", i: Layers },
            { id: "currency", l: "Currency Tracker", i: Calendar },
            { id: "library", l: "Knowledge Library", i: BookOpen },
            { id: "assess", l: "AI Assessments", i: Brain },
            { id: "compliance", l: "Compliance", i: Shield },
          ].map((t) => {
            const Icon = t.i;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  tab === t.id ? "border-amber-500 text-amber-500" : "border-transparent text-slate-300 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.l}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* ─── DASHBOARD ─── */}
        {tab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Total Pilots" value={stats.total} sub={`${stats.captains} CPT · ${stats.fos} FO`} color="blue" />
              <StatCard icon={CheckCircle} label="Current" value={stats.current} sub="All currencies valid" color="emerald" />
              <StatCard icon={Clock} label="Caution / Action" value={stats.caution + stats.action} sub="≤ 90 days to expiry" color="amber" />
              <StatCard icon={AlertTriangle} label="Expired" value={stats.expired} sub="Immediate remediation" color="red" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-700" /> Fleet Distribution</h3>
                <div className="space-y-2">
                  <DistRow label="JAK (Jubba Airways)" v={stats.jak} t={stats.total} c="bg-blue-700" />
                  <DistRow label="I-Fly Air Solutions" v={stats.ifly} t={stats.total} c="bg-amber-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><Award className="w-4 h-4 text-blue-700" /> Crew Status</h3>
                <div className="space-y-2">
                  <DistRow label="Current" v={stats.current} t={stats.total} c="bg-emerald-500" />
                  <DistRow label="Caution" v={stats.caution} t={stats.total} c="bg-amber-500" />
                  <DistRow label="Action Required" v={stats.action} t={stats.total} c="bg-red-400" />
                  <DistRow label="Expired" v={stats.expired} t={stats.total} c="bg-red-700" />
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-blue-700" /> Quick Actions</h3>
                <div className="space-y-2">
                  <button onClick={() => { setTab("pilots"); setShowAdd(true); }} className="w-full text-left px-3 py-2 text-sm bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-700" />Add new pilot</button>
                  <button onClick={() => setTab("assess")} className="w-full text-left px-3 py-2 text-sm bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 flex items-center gap-2"><Brain className="w-4 h-4 text-blue-700" />Generate assessment</button>
                  <button onClick={() => setTab("library")} className="w-full text-left px-3 py-2 text-sm bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-700" />Browse knowledge library</button>
                  <button onClick={() => setTab("currency")} className="w-full text-left px-3 py-2 text-sm bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-700" />Review currency matrix</button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 text-white px-5 py-3">
                <h3 className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Expiring Soon (next 90 days)</h3>
              </div>
              <div className="divide-y divide-slate-200">
                {pilots.flatMap((p) =>
                  Object.entries(p.currencies)
                    .map(([k, v]) => ({ pilot: p, key: k, date: v, status: statusOf(v), label: CURRENCIES.find((c) => c.k === k)?.l || k }))
                    .filter((r) => r.status.s === "warn" || r.status.s === "caut" || r.status.s === "exp")
                )
                  .sort((a, b) => daysUntil(a.date) - daysUntil(b.date))
                  .slice(0, 10)
                  .map((r, i) => (
                    <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer" onClick={() => { setSelectedPilot(r.pilot); setTab("pilots"); }}>
                      <div>
                        <div className="font-medium text-sm">{r.pilot.name}</div>
                        <div className="text-xs text-slate-600">{r.pilot.operator} · {r.pilot.fleet} · {r.label}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-600">{r.date}</span>
                        <span className={`text-xs px-2 py-1 rounded ${r.status.c}`}>{r.status.l}</span>
                      </div>
                    </div>
                  ))}
                {pilots.flatMap((p) => Object.values(p.currencies).map(statusOf)).filter((s) => s.s !== "ok" && s.s !== "na").length === 0 && (
                  <div className="px-5 py-8 text-center text-slate-500 text-sm">All crew currencies are within normal validity. ✓</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── PILOTS ─── */}
        {tab === "pilots" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2 items-center">
                <select value={filterOp} onChange={(e) => setFilterOp(e.target.value)} className="px-3 py-2 text-sm border border-slate-300 rounded bg-white">
                  <option>All</option>
                  {OPERATORS.map((o) => <option key={o}>{o}</option>)}
                </select>
                <select value={filterFleet} onChange={(e) => setFilterFleet(e.target.value)} className="px-3 py-2 text-sm border border-slate-300 rounded bg-white">
                  <option>All</option>
                  {FLEETS.map((f) => <option key={f}>{f}</option>)}
                </select>
                <span className="text-sm text-slate-600">{filteredPilots.length} pilot{filteredPilots.length !== 1 && "s"}</span>
              </div>
              <button onClick={() => setShowAdd(true)} className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 text-sm rounded flex items-center gap-2"><Plus className="w-4 h-4" />Add Pilot</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPilots.map((p) => {
                const st = overallStatus(p);
                return (
                  <div key={p.id} onClick={() => setSelectedPilot(p)} className="bg-white rounded-lg border border-slate-200 p-4 hover:border-blue-700 hover:shadow-md cursor-pointer transition">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-slate-900">{p.name}</h4>
                        <p className="text-xs text-slate-600">{p.licence}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${st.c}`}>{st.l}</span>
                    </div>
                    <div className="text-xs space-y-1 text-slate-700">
                      <div className="flex justify-between"><span>Role:</span><span className="font-medium">{p.role}</span></div>
                      <div className="flex justify-between"><span>Operator:</span><span className="font-medium">{p.operator}</span></div>
                      <div className="flex justify-between"><span>Fleet:</span><span className="font-medium">{p.fleet}</span></div>
                      <div className="flex justify-between"><span>Base:</span><span className="font-medium">{p.base}</span></div>
                      <div className="flex justify-between"><span>Phase:</span><span className="font-medium text-blue-700">{p.phase}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
            {filteredPilots.length === 0 && (
              <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">No pilots match the current filters.</div>
            )}
          </div>
        )}

        {/* ─── TRAINING PROGRAMMES ─── */}
        {tab === "training" && (
          <div>
            <div className="flex gap-2 mb-5">
              <button onClick={() => setTrainingMode("itr")} className={`px-4 py-2 text-sm font-medium rounded ${trainingMode === "itr" ? "bg-blue-700 text-white" : "bg-white border border-slate-300 text-slate-700"}`}>Initial Type Rating (ITR)</button>
              <button onClick={() => setTrainingMode("rec")} className={`px-4 py-2 text-sm font-medium rounded ${trainingMode === "rec" ? "bg-blue-700 text-white" : "bg-white border border-slate-300 text-slate-700"}`}>Recurrent</button>
            </div>

            {trainingMode === "itr" && (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-300 rounded p-4 text-sm">
                  <p className="font-semibold text-amber-900 mb-1">ITR Programme Overview</p>
                  <p className="text-amber-900">15-day ground school (105 hrs / 94 hr minimum) → 3 FBT lessons → 9 FFS sessions × 4 hr (SimAero Dinard FR-101, EASA Level C) → KCAA Skills Test → Base Training on actual aircraft (mandatory post-Skills Test per ICAO Doc 9868 §4.5.1; ZFTT not available at Level C) → LIFUS 100 hrs / 20 sectors → Line Check. Grading scale: AS / S / MS / BS. Internal exam pass mark: 80%.</p>
                </div>
                {ITR_PHASES.map((p, i) => (
                  <div key={p.id} className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-700 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">{i + 1}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-slate-900">{p.title}</h4>
                          <div className="text-xs text-slate-600">{p.days} day{p.days > 1 && "s"} · {p.hrs} hrs</div>
                        </div>
                        <p className="text-sm text-slate-700">{p.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {trainingMode === "rec" && (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-300 rounded p-4 text-sm">
                  <p className="font-semibold text-amber-900 mb-1">Recurrent Programme Overview</p>
                  <p className="text-amber-900">Cyclic recurrent training maintains type-rating currency, operational competence, and regulatory compliance. Triennial systems coverage rotates across three years to ensure complete syllabus coverage per ICAO Annex 6.</p>
                </div>
                {RECURRENT.map((r) => (
                  <div key={r.id} className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-semibold text-slate-900">{r.title}</h4>
                      <div className="flex gap-2 text-xs">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{r.cycle}</span>
                        <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded">{r.hrs} hrs</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700">{r.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── CURRENCY TRACKER ─── */}
        {tab === "currency" && (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="text-left px-3 py-3 sticky left-0 bg-slate-900 z-10">Pilot</th>
                    {CURRENCIES.map((c) => (
                      <th key={c.k} className="text-center px-2 py-3 font-medium">{c.l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pilots.map((p) => (
                    <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-3 py-2 sticky left-0 bg-white border-r border-slate-200">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-slate-500">{p.operator} · {p.fleet}</div>
                      </td>
                      {CURRENCIES.map((c) => {
                        const st = statusOf(p.currencies[c.k]);
                        return (
                          <td key={c.k} className="px-2 py-2 text-center">
                            <span className={`inline-block px-2 py-1 rounded text-[10px] ${st.c}`}>{st.l}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap gap-4">
              <span><span className="inline-block w-3 h-3 rounded bg-emerald-500 mr-1 align-middle"></span>Current (&gt; 90 days)</span>
              <span><span className="inline-block w-3 h-3 rounded bg-amber-500 mr-1 align-middle"></span>Caution (≤ 90 days)</span>
              <span><span className="inline-block w-3 h-3 rounded bg-red-400 mr-1 align-middle"></span>Action (≤ 30 days)</span>
              <span><span className="inline-block w-3 h-3 rounded bg-red-700 mr-1 align-middle"></span>Expired</span>
              <span><span className="inline-block w-3 h-3 rounded bg-slate-300 mr-1 align-middle"></span>N/A (in-training)</span>
            </div>
          </div>
        )}

        {/* ─── KNOWLEDGE LIBRARY ─── */}
        {tab === "library" && (
          <div>
            {!moduleOpen && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {MODULES.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button key={m.id} onClick={() => setModuleOpen(m)} className="bg-white rounded-lg border border-slate-200 p-5 text-left hover:border-blue-700 hover:shadow-md transition">
                      <div className={`w-10 h-10 rounded ${m.color === "amber" ? "bg-amber-500" : "bg-blue-700"} flex items-center justify-center mb-3`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-semibold text-slate-900 mb-1">{m.title}</h4>
                      <p className="text-xs text-slate-600">{m.sections.length} sections</p>
                    </button>
                  );
                })}
              </div>
            )}

            {moduleOpen && (
              <div>
                <button onClick={() => setModuleOpen(null)} className="text-sm text-blue-700 hover:underline mb-4 flex items-center gap-1">← Back to library</button>
                <div className="bg-slate-900 text-white rounded-t-lg px-5 py-4">
                  <h2 className="text-xl font-bold flex items-center gap-2"><moduleOpen.icon className="w-5 h-5 text-amber-500" />{moduleOpen.title}</h2>
                </div>
                <div className="bg-white rounded-b-lg border border-t-0 border-slate-200 divide-y divide-slate-200">
                  {moduleOpen.sections.map((s, i) => (
                    <div key={i} className="p-5">
                      <h4 className="font-semibold text-blue-800 mb-2">{s.h}</h4>
                      <p className="text-sm text-slate-700 leading-relaxed">{s.b}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── ASSESSMENTS ─── */}
        {tab === "assess" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-lg border border-slate-200 p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Brain className="w-5 h-5 text-blue-700" />AI-Generated Knowledge Check</h3>
                <p className="text-sm text-slate-600 mb-3">Enter a topic; the system generates 5 multiple-choice questions calibrated for F70/100 type-rated crew. Pass mark: 80%.</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={assessTopic}
                    onChange={(e) => setAssessTopic(e.target.value)}
                    placeholder="e.g. Rejected take-off procedures, RR Tay engine, T-DODAR..."
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded"
                  />
                  <button onClick={generateAssessment} disabled={!assessTopic || assessLoading} className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white px-4 py-2 text-sm rounded">
                    {assessLoading ? "Generating..." : "Generate"}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Engine fire on take-off", "Stabilised approach", "Hydraulic system architecture", "CRM & T-DODAR", "Takeoff flap selection", "VMA speed system", "RVSM operations"].map((t) => (
                    <button key={t} onClick={() => setAssessTopic(t)} className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700">{t}</button>
                  ))}
                </div>
              </div>

              {assessQs.length > 0 && (
                <div className="bg-white rounded-lg border border-slate-200 p-5">
                  <h4 className="font-semibold mb-3">Assessment: {assessTopic}</h4>
                  {assessQs.map((q, qi) => (
                    <div key={qi} className="mb-5 pb-5 border-b border-slate-200 last:border-0 last:mb-0 last:pb-0">
                      <p className="font-medium text-sm mb-2">{qi + 1}. {q.question}</p>
                      <div className="space-y-1">
                        {q.options.map((opt, oi) => {
                          const isSelected = assessAnswers[qi] === oi;
                          const isCorrect = assessSubmitted && oi === q.correctIndex;
                          const isWrong = assessSubmitted && isSelected && oi !== q.correctIndex;
                          return (
                            <button
                              key={oi}
                              disabled={assessSubmitted}
                              onClick={() => setAssessAnswers({ ...assessAnswers, [qi]: oi })}
                              className={`w-full text-left text-sm px-3 py-2 rounded border transition ${
                                isCorrect ? "bg-emerald-50 border-emerald-500 text-emerald-900" :
                                isWrong ? "bg-red-50 border-red-500 text-red-900" :
                                isSelected ? "bg-blue-50 border-blue-500" :
                                "bg-slate-50 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {String.fromCharCode(65 + oi)}. {opt}
                            </button>
                          );
                        })}
                      </div>
                      {assessSubmitted && (
                        <p className="mt-2 text-xs bg-slate-100 p-2 rounded text-slate-700"><strong>Explanation:</strong> {q.explanation}</p>
                      )}
                    </div>
                  ))}
                  {!assessSubmitted && (
                    <button
                      onClick={submitAssessment}
                      disabled={Object.keys(assessAnswers).length < assessQs.length}
                      className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white px-4 py-2 text-sm rounded"
                    >
                      Submit Assessment
                    </button>
                  )}
                  {assessSubmitted && (
                    <div className={`p-4 rounded ${
                      (Object.entries(assessAnswers).filter(([i, v]) => v === assessQs[i].correctIndex).length / assessQs.length) >= 0.8
                        ? "bg-emerald-50 border border-emerald-300" : "bg-red-50 border border-red-300"
                    }`}>
                      <div className="font-semibold">
                        Score: {Object.entries(assessAnswers).filter(([i, v]) => v === assessQs[i].correctIndex).length} / {assessQs.length} —
                        {" "}{Math.round(Object.entries(assessAnswers).filter(([i, v]) => v === assessQs[i].correctIndex).length / assessQs.length * 100)}%
                        {" "}{(Object.entries(assessAnswers).filter(([i, v]) => v === assessQs[i].correctIndex).length / assessQs.length) >= 0.8 ? "✓ PASS" : "✗ FAIL (remedial)"}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-blue-700" />Assessment History</h3>
              {assessHistory.length === 0 ? (
                <p className="text-sm text-slate-500">No assessments yet.</p>
              ) : (
                <div className="space-y-2">
                  {assessHistory.map((h, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded border border-slate-200">
                      <div className="flex justify-between items-start">
                        <div className="text-sm font-medium flex-1">{h.topic}</div>
                        <span className={`text-xs px-2 py-1 rounded ${h.score >= 80 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{h.score}%</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{new Date(h.date).toLocaleString()} · {h.correct}/{h.total}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── COMPLIANCE ─── */}
        {tab === "compliance" && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Shield className="w-5 h-5 text-blue-700" />Regulatory Framework Cross-Reference</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-left px-3 py-2">Domain</th>
                      <th className="text-left px-3 py-2">KCARs 2025 (Kenya)</th>
                      <th className="text-left px-3 py-2">FAA</th>
                      <th className="text-left px-3 py-2">EASA</th>
                      <th className="text-left px-3 py-2">ICAO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {[
                      ["Operations", "LN 29/2026", "14 CFR Part 121", "Part-CAT", "Annex 6 Pt I"],
                      ["AOC & OM Content", "LN 42/2026 (3rd Sch)", "Part 119/121 Subpart G", "Part-ORO", "Doc 8335"],
                      ["Crew Licensing", "LN 31/2026", "14 CFR Part 61", "Part-FCL", "Annex 1 Amdt 49"],
                      ["Training & Checking", "LN 42/2026 §2.2", "121 Subpart N/O", "Part-ORO.FC", "Doc 9868 PANS-TRG"],
                      ["FDAP / FOQA", "Reg 56(2)", "AC 120-82", "ORO.AOC.130", "Doc 10000"],
                      ["SMS", "LN 30/2026", "Part 5", "ORO.GEN.200", "Annex 19 / Doc 9859"],
                      ["Fatigue Management", "Pending KCARs", "Part 117", "ORO.FTL", "Doc 9966"],
                      ["CRM", "LN 42/2026 §2.2.4", "AC 120-51E", "ORO.FC.115", "Doc 9683"],
                    ].map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        {r.map((c, j) => <td key={j} className="px-3 py-2">{c}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-slate-200 p-5">
                <h4 className="font-semibold mb-2">Key Binding Provisions</h4>
                <ul className="text-sm text-slate-700 space-y-2 list-disc pl-5">
                  <li>LN 42/2026 Third Schedule §2.1 (34 clauses) + §2.2 (12 mandatory topics) — binding OM content list</li>
                  <li>Reg 17(3): 30-day pre-implementation submission to KCAA mandatory</li>
                  <li>Reg 32(3) & 38(3): Human Factors principles binding for checklist design</li>
                  <li>Reg 56(2): FDAP mandatory for aircraft &gt;27,000 kg MTOW (F70 &amp; F100 qualify)</li>
                  <li>Reg 18(3)(i): FDR post-event retention 60 days</li>
                  <li>Reg 84: 12-month transition window (~06 Mar 2027) unless extended by Cabinet Secretary</li>
                </ul>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-5">
                <h4 className="font-semibold mb-2">Penalty Schedule (Sixth Schedule)</h4>
                <ul className="text-sm text-slate-700 space-y-2 list-disc pl-5">
                  <li><strong>A-class offences:</strong> up to KSh 1,000,000 fine and/or 1 year imprisonment</li>
                  <li><strong>B-class offences:</strong> up to KSh 2,000,000 fine and/or 3 years imprisonment</li>
                  <li>Compliance is high-stakes — manuals, currency, and crew records must remain current</li>
                </ul>
                <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900">
                  KCAA Advisory Circulars (e.g. CAA-AC-OPS022A 2018, CAA-M-OPS022 2018) remain as subordinate guidance only. Where AC and KCARs 2025 conflict, the regulation prevails.
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── PILOT DETAIL MODAL ─── */}
      {selectedPilot && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPilot(null)}>
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-start rounded-t-lg sticky top-0">
              <div>
                <h3 className="text-lg font-bold">{selectedPilot.name}</h3>
                <p className="text-xs text-slate-300">{selectedPilot.licence} · {selectedPilot.role} · {selectedPilot.operator} · {selectedPilot.fleet}</p>
              </div>
              <button onClick={() => setSelectedPilot(null)} className="text-slate-300 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Field label="Base" value={selectedPilot.base} />
                <Field label="Phase" value={selectedPilot.phase} />
                <Field label="Role" value={selectedPilot.role} />
                <Field label="Operator" value={selectedPilot.operator} />
              </div>

              {["Personal", "Type", "Operational", "Safety", "Special"].map((cat) => (
                <div key={cat}>
                  <h4 className="font-semibold text-blue-800 mb-2 text-sm">{cat}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {CURRENCIES.filter((c) => c.cat === cat).map((c) => {
                      const st = statusOf(selectedPilot.currencies[c.k]);
                      return (
                        <div key={c.k} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                          <div>
                            <div className="text-sm font-medium">{c.l}</div>
                            <input
                              type="date"
                              value={selectedPilot.currencies[c.k] === "—" ? "" : selectedPilot.currencies[c.k]}
                              onChange={(e) => {
                                const newV = e.target.value || "—";
                                updateCurrency(selectedPilot.id, c.k, newV);
                                setSelectedPilot({ ...selectedPilot, currencies: { ...selectedPilot.currencies, [c.k]: newV } });
                              }}
                              className="text-xs border border-slate-300 rounded px-1 mt-1"
                            />
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${st.c}`}>{st.l}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button onClick={() => deletePilot(selectedPilot.id)} className="px-4 py-2 text-sm bg-red-50 text-red-700 border border-red-300 rounded hover:bg-red-100">Remove Pilot</button>
                <button onClick={() => setSelectedPilot(null)} className="px-4 py-2 text-sm bg-blue-700 text-white rounded hover:bg-blue-800">Done</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD PILOT MODAL ─── */}
      {showAdd && <AddPilotModal onClose={() => setShowAdd(false)} onAdd={addPilot} />}
    </div>
  );
}

// ─── SUB-COMPONENTS ─────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }) {
  const colors = {
    blue: "bg-blue-700",
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
    red: "bg-red-600",
  };
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-3">
      <div className={`${colors[color]} w-12 h-12 rounded flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-xs text-slate-600 font-medium">{label}</div>
        <div className="text-[10px] text-slate-500">{sub}</div>
      </div>
    </div>
  );
}

function DistRow({ label, v, t, c }) {
  const pct = t > 0 ? (v / t) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1"><span>{label}</span><span className="font-medium">{v}</span></div>
      <div className="h-2 bg-slate-100 rounded overflow-hidden"><div className={c} style={{ width: `${pct}%`, height: "100%" }}></div></div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="bg-slate-50 p-2 rounded border border-slate-200">
      <div className="text-[10px] text-slate-500 uppercase">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function AddPilotModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    name: "", licence: "", role: "First Officer", operator: "JAK",
    fleet: "F70", base: "HKJK", phase: "Line",
  });
  const submit = () => {
    if (!form.name || !form.licence) return alert("Name and licence required");
    onAdd(form);
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="bg-slate-900 text-white px-5 py-3 flex justify-between items-center rounded-t-lg">
          <h3 className="font-bold">Add Pilot</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Capt. / F/O Full Name" />
          <Input label="Licence Number" value={form.licence} onChange={(v) => setForm({ ...form, licence: v })} placeholder="KCAA/ATPL/####" />
          <Select label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={ROLES} />
          <Select label="Operator" value={form.operator} onChange={(v) => setForm({ ...form, operator: v })} options={OPERATORS} />
          <Select label="Fleet" value={form.fleet} onChange={(v) => setForm({ ...form, fleet: v })} options={FLEETS} />
          <Select label="Base" value={form.base} onChange={(v) => setForm({ ...form, base: v })} options={BASES} />
          <Select label="Phase" value={form.phase} onChange={(v) => setForm({ ...form, phase: v })} options={["ITR — Ground", "ITR — FFS", "Skills Test", "Base Training", "LIFUS", "Line", "Recurrent Due"]} />
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded">Cancel</button>
            <button onClick={submit} className="flex-1 px-4 py-2 text-sm bg-blue-700 text-white rounded hover:bg-blue-800">Add Pilot</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-xs text-slate-600 block mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 text-sm border border-slate-300 rounded" />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-xs text-slate-600 block mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}
