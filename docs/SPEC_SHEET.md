# F-22 Raptor — Sourced Specification Sheet (Phase 1)

> **Policy:** Public sources only, honestly labeled. Classified parameters (exact radar cross-section, avionics internals, radar performance, detailed engine maps, flight-control law gains, and exact control-surface mechanical limits) are **never fabricated** and are explicitly marked `NOT_PUBLICLY_DISCLOSED`.

---

## 1. Source Hierarchy

Every value in this repository is cited using the following strict precedence order:

1. **Tier 1 — Official USAF & Prime Contractor Public Material**
   - **[USAF-FS]** U.S. Air Force Official Fact Sheet: *F-22 Raptor* (`af.mil/About-Us/Fact-Sheets/Display/Article/104506/f-22-raptor/`)
   - **[LM-PUB]** Lockheed Martin Public Product Overview: *F-22 Raptor* (`lockheedmartin.com`)
   - **[PW-F119]** Pratt & Whitney / RTX Public Engine Material: *F119 Engine* (`prattwhitney.com` / `rtx.com`)
2. **Tier 2 — Government Reports & Public Technical Literature**
   - **[DVIDS]** Defense Visual Information Distribution Service / USAF Public Affairs releases (`dvidshub.net`)
   - **[NASA-AIAA]** Public NASA / AIAA / DTIC technical abstracts and academic aerodynamic studies (e.g., wind-tunnel & OpenVSP fighter planform references)
   - **[OEM-SUB]** Sub-tier OEM public product pages: Collins Aerospace (*ACES II Ejection Seat*), Honeywell Aerospace (*Auxiliary Power Units*)
3. **Tier 3 — Reputable Aerospace References**
   - **[ASFM]** *Air & Space Forces Magazine* USAF Almanac (*F-22 Raptor* aircraft profile)
   - **[JANE-REF]** Reputable defense/aerospace reference compilations (e.g., *Jane's All the World's Aircraft* / *Forecast International* F119 summary)

---

## 2. General Characteristics & Dimensions

| Specification | Value | Unit | Label | Primary Source | Notes |
| --- | --- | --- | --- | --- | --- |
| Primary Function | Air dominance, multi-role fighter | — | `SOURCED` | [USAF-FS] | Air-to-air and air-to-ground capability |
| Crew | 1 | pilot | `SOURCED` | [USAF-FS] | Single-seat glass cockpit |
| Length | 18.92 (62 ft 1 in) | m | `SOURCED` | [USAF-FS], [LM-PUB] | Exact metric conversion of 62 ft 1 in; see §8 Conflicts |
| Wingspan | 13.56 (44 ft 6 in) | m | `SOURCED` | [USAF-FS], [LM-PUB] | Trapezoidal / clipped-diamond planform |
| Height | 5.08 (16 ft 8 in) | m | `SOURCED` | [USAF-FS], [LM-PUB] | Measured to top of outward-canted vertical tails |
| Wing Area | 78.04 (840 sq ft) | m² | `SOURCED` | [LM-PUB], [DVIDS] | Public manufacturer & USAF reference |
| Wing Leading-Edge Sweep | 42 | deg | `SOURCED` | [LM-PUB], [NASA-AIAA] | Planform edge alignment for low observability |
| Vertical Tail Cant Angle | 28 | deg | `SOURCED` | [NASA-AIAA], [JANE-REF] | Outward cant from vertical to avoid 90° corner reflectors |
| Main Landing Gear Track | 3.23 (10 ft 7 in) | m | `APPROXIMATE` | [JANE-REF] | Secondary reference; exact USAF drawing not published |
| Landing Gear Wheelbase | ~6.4 | m | `ASSUMED` | Derived from public 3-view proportions | Official wheelbase omitted from unclassified USAF fact sheet |

---

## 3. Weights & Fuel

| Specification | Value | Unit | Label | Primary Source | Notes |
| --- | --- | --- | --- | --- | --- |
| Empty Weight | 19,700 (43,340 lb) | kg | `SOURCED` | [USAF-FS] | Standard empty operating weight |
| Maximum Takeoff Weight | 38,000 (83,500 lb) | kg | `SOURCED` | [USAF-FS] | Maximum gross takeoff weight |
| Internal Fuel Capacity | ~8,200 (18,000 lb) | kg | `SOURCED` | [USAF-FS] | Fuselage and wing integral tanks |
| Fuel Capacity w/ 2 External Tanks | ~11,900 (26,000 lb) | kg | `SOURCED` | [USAF-FS] | Two 600-gallon underwing drop tanks (non-stealth ferry) |
| Airframe Materials Breakdown | ~39% Ti, ~24% composites, ~16% Al, ~1% thermoplastics | % weight | `APPROXIMATE` | [LM-PUB], [JANE-REF] | See §8 Conflicts for block variations |

---

## 4. Performance Class (Public Figures Only)

| Specification | Value | Unit | Label | Primary Source | Notes |
| --- | --- | --- | --- | --- | --- |
| Maximum Speed | Mach 2 class | Mach | `SOURCED` | [USAF-FS] | Publicly stated class; exact Vmax not officially disclosed (see §8) |
| Supercruise Speed | Mach 1.5+ (without afterburner) | Mach | `SOURCED` | [USAF-FS], [LM-PUB] | Sustained supersonic cruise on dry military power |
| Service Ceiling | Above 15,240 (50,000+ ft) | m | `SOURCED` | [USAF-FS] | Press estimates cite 65,000+ ft (see §8) |
| Ferry Range | >2,960 (>1,600 nmi / >1,850 mi) | km | `SOURCED` | [USAF-FS] | With two external wing fuel tanks |
| Combat Radius | Not publicly disclosed | — | `NOT_PUBLICLY_DISCLOSED` | [USAF-FS] | Exact mission radius classified; press cites ~500+ mi class |
| G-Load Limit | Not publicly disclosed | — | `NOT_PUBLICLY_DISCLOSED` | [USAF-FS] | Exact structural envelope not disclosed in USAF fact sheet |

---

## 5. Propulsion — Twin Pratt & Whitney F119-PW-100

| Specification | Value | Unit | Label | Primary Source | Notes |
| --- | --- | --- | --- | --- | --- |
| Engine Model & Count | 2 × Pratt & Whitney F119-PW-100 | — | `SOURCED` | [USAF-FS], [PW-F119] | Twin-spool, low-bypass augmented turbofan |
| Thrust Class (Afterburning) | 35,000+ lbf class (~156+ kN) per engine | lbf / kN | `SOURCED` | [USAF-FS], [PW-F119] | Exact rated sea-level static thrust not officially published |
| Dry (Military) Thrust Class | ~22,000–26,000 lbf (~98–116 kN) | lbf / kN | `APPROXIMATE` | [JANE-REF] | Unofficial public reference range supporting supercruise |
| Compressor / Turbine Stages | 3-stage fan, 6-stage HPC, 1-stage HPT, 1-stage LPT | stages | `SOURCED` | [PW-F119], [JANE-REF] | Counter-rotating twin-spool architecture |
| Bypass Ratio | ~0.3:1 | ratio | `APPROXIMATE` | [JANE-REF] | Low bypass ratio typical of supercruise fighter turbofans |
| 2D Thrust Vectoring Range | ±20 (pitch axis) | deg | `SOURCED` | [PW-F119] | Convergent-divergent rectangular stealth nozzles |
| Engine Control | Dual-redundant FADEC | — | `SOURCED` | [PW-F119] | Integrated with aircraft flight control system |
| Auxiliary Power Unit (APU) | Honeywell gas-turbine APU | — | `SOURCED` | [OEM-SUB] | Provides ground electrical/pneumatic power for self-start |
| Exact EGT / SFC / Compressor Maps | Not publicly disclosed | — | `NOT_PUBLICLY_DISCLOSED` | [PW-F119] | Phase 4 engine start model will use `ASSUMED` educational curves |

---

## 6. Crew, Cockpit & Escape System (Public Overview)

| Specification | Value | Unit | Label | Primary Source | Notes |
| --- | --- | --- | --- | --- | --- |
| Canopy | Frameless one-piece polycarbonate with conductive gold/ITO tint | — | `SOURCED` | [LM-PUB], [JANE-REF] | Shielding prevents radar waves entering the cockpit cavity |
| Ejection Seat | Collins Aerospace ACES II | — | `SOURCED` | [OEM-SUB], [USAF-FS] | Zero-zero third-generation ejection seat |
| Cockpit Displays | Glass cockpit: wide-angle HUD + 4 color liquid-crystal MFDs + ICP | — | `SOURCED` | [LM-PUB], [ASFM] | Generic educational schematic only; real symbology is classified |
| Flight Controls | Side-stick controller + dual throttles (HOTAS) | — | `SOURCED` | [LM-PUB], [ASFM] | Digital fly-by-wire integrated with thrust vectoring |

---

## 7. Internal Weapons Carriage & Avionics (Public Overview Only)

| Specification | Value | Unit | Label | Primary Source | Notes |
| --- | --- | --- | --- | --- | --- |
| Internal Gun | 1 × M61A2 20 mm 6-barrel rotary cannon (480 rounds) | — | `SOURCED` | [USAF-FS], [ASFM] | Mounted internally above right wing root behind flush door |
| Main (Centerline) Weapons Bay | 6 × AIM-120 AMRAAM (air-to-air) OR 2 × AIM-120 + 2 × 1,000 lb GBU-32 JDAM / 8 × GBU-39 SDB (air-to-ground) | — | `SOURCED` | [USAF-FS], [ASFM] | Pneumatic ejection launchers (e.g., LAU-142/A) |
| Side Weapons Bays (2 ×) | 1 × AIM-9 Sidewinder per side bay (2 total) | — | `SOURCED` | [USAF-FS], [ASFM] | Located beside engine intakes; trapeze extension rail |
| Radar System | AN/APG-77 AESA radar (public designation only) | — | `SOURCED` | [USAF-FS], [ASFM] | Range, modes, and T/R count are `NOT_PUBLICLY_DISCLOSED` |
| Radar Cross Section (RCS) | Not publicly disclosed | m² / dBsm | `NOT_PUBLICLY_DISCLOSED` | [USAF-FS] | Never fabricated; stealth shaping explained qualitatively only |
| Avionics Internals & EW Suite | Integrated avionics & EW (public overview only) | — | `NOT_PUBLICLY_DISCLOSED` | [USAF-FS] | Internal architecture, frequencies, and software classified |

---

## 8. Recorded Source Conflicts & Resolution

| Parameter | Conflicting Sources | Chosen Value & Reasoning |
| --- | --- | --- |
| **Overall Length** | USAF Fact Sheet gives `62 ft 1 in (18.9 m)` (exact imperial conversion = `18.923 m`); some USAF/DVIDS summaries print `18.90 m` while Lockheed Martin / Milavia print `18.92 m`. | **`18.92 m`** (`SOURCED`). Matches exact conversion of `62 ft 1 in = 745 in = 18.923 m` rounded to 2 decimal places. |
| **Service Ceiling** | USAF Fact Sheet states `Above 50,000 feet (15,240 m)`; multiple aerospace press outlets cite `65,000+ ft`. | **`Above 50,000 ft (15,240 m)`** (`SOURCED` to Tier 1 USAF Fact Sheet). Press figure noted as unverified secondary estimate only. |
| **Maximum Speed & Supercruise** | USAF Fact Sheet states `Mach 2 class with supercruise capability` (USAF/LM summaries cite `Mach 1.5+` supercruise); secondary press cites `Mach 2.25` max / `Mach 1.82` supercruise. | **`Mach 2 class` / `Mach 1.5+ supercruise`** (`SOURCED` to Tier 1 USAF Fact Sheet). Secondary figures are not treated as official specs. |
| **Composite Weight Share** | Lockheed Martin historical materials breakdown cites `~39% Ti, ~24% composites, ~16% Al, ~1% thermoplastics`; some later summaries quote `24%–35%` composites depending on whether doors/fairings are counted. | **`~39% titanium, ~24% composites, ~16% aluminum`** (`APPROXIMATE`), noting the 24–35% composite range across production summaries. |
| **Control Surface Deflection Limits** | Exact mechanical/software deflection limits are classified by DoD; academic wind-tunnel/OpenVSP papers test illustrative ranges (e.g., ±20°–30°). | **Actual limits marked `NOT_PUBLICLY_DISCLOSED`** in specs; interactive animation ranges in `docs/INTERACTION_MAP.md` explicitly labeled `ASSUMED` (except 2D nozzle vectoring `±20°`, which is `SOURCED` from Pratt & Whitney). |
