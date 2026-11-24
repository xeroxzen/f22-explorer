# F-22 Raptor — Reference Geometry & Parametric Stations (Phase 1)

> **IP & Asset Hygiene:** All 3D geometry in Phase 2+ will be built procedurally/parametrically in TypeScript from public dimensions and proportions. Public 3-view drawings and USAF public-domain photographs are used strictly as measurement references; **no copyrighted drawings, meshes, textures, or manufacturer trademarks are committed or redistributed**.

---

## 1. Coordinate System Convention

We use a standard right-handed Three.js coordinate system in **meters**:

- **`+X` (Starboard / Right):** Lateral span axis. `X = 0` is aircraft centerline; wingtips lie at `X = ±6.78 m` (`wingspan = 13.56 m`).
- **`+Y` (Up):** Vertical axis. `Y = 0.00 m` is the hangar floor (tire contact plane when gear is extended). Top of vertical tails sits at `Y = 5.08 m`.
- **`+Z` (Aft) / Fuselage Station (`FS`):**
  - `FS 0.00 m` = Radome nose tip (`Z = -9.46 m`).
  - `FS 9.46 m` = Mid-length datum (`Z = 0.00 m`).
  - `FS 18.92 m` = Aft extremity of tail booms / 2D nozzles (`Z = +9.46 m`).
  - Mapping formula: `z = FS - 9.46` (keeps aircraft centered around the hangar origin `[0, 1.8, 0]` for clean orbit framing).

---

## 2. Master Envelope Dimensions

| Dimension | Value (m) | Confidence | Label | Source / Basis |
| --- | --- | --- | --- | --- |
| Overall Length (`FS 0.00` → `FS 18.92`) | `18.92` | **HIGH** | `SOURCED` | USAF Fact Sheet (`62 ft 1 in`) |
| Overall Wingspan (`X = -6.78` → `+6.78`) | `13.56` | **HIGH** | `SOURCED` | USAF Fact Sheet (`44 ft 6 in`) |
| Overall Height (ground to tail tip) | `5.08` | **HIGH** | `SOURCED` | USAF Fact Sheet (`16 ft 8 in`) |
| Wing Planform Area | `78.04 m²` | **HIGH** | `SOURCED` | Lockheed Martin / USAF public data (`840 sq ft`) |
| Wing Leading-Edge Sweep | `42.0°` | **HIGH** | `SOURCED` | Lockheed Martin / NASA-AIAA public literature |
| Wing Trailing-Edge Sweep | `-17.0°` (forward) | **MEDIUM** | `APPROXIMATE` | Public 3-view planform alignment (parallel to empennage edges) |
| Vertical Tail Outward Cant Angle | `28.0°` | **HIGH** | `SOURCED` | Public aerodynamic references / stealth shaping literature |
| Horizontal Stabilator Span | `8.80` | **MEDIUM** | `APPROXIMATE` | Measured proportionally from public 3-view (~65% of wingspan) |
| Fuselage Ground Clearance (belly) | `1.15` | **MEDIUM** | `ASSUMED` | Proportioned from USAF hangar photos with gear extended |
| Main Landing Gear Track | `3.23` | **MEDIUM** | `APPROXIMATE` | Secondary reference (`10 ft 7 in`) |
| Landing Gear Wheelbase | `6.40` | **LOW** | `ASSUMED` | Proportioned from public side-view (`FS 4.30` nose to `FS 10.70` main) |

---

## 3. Fuselage Stations (`FS`) Breakdown

| Station Range (`FS`, m) | Scene `Z` Range (m) | Section / Feature | Approx. Cross-Section (W × H, m) | Confidence | Basis |
| --- | --- | --- | --- | --- | --- |
| `0.00 – 2.30` | `-9.46` → `-7.16` | Radome (chined diamond nose cone) | `0.00 → 1.45 W`, `0.00 → 1.10 H` | **MEDIUM** | Public 3-view proportion (~12% length) |
| `2.30 – 3.40` | `-7.16` → `-6.06` | Forward Avionics Bay & Nose Gear Forward Bulkhead | `1.45 → 1.90 W`, `1.10 → 1.35 H` | **MEDIUM** | Public cutaway & 3-view proportions |
| `3.40 – 6.40` | `-6.06` → `-3.06` | Forward Fuselage & Cockpit Tub (canopy span `FS 3.20–6.60`) | `1.90 → 2.40 W`, `1.35 → 1.85 H` (incl. canopy crown `Y ≈ 3.45`) | **MEDIUM** | Public side-profile & cockpit photos |
| `5.90 – 7.40` | `-3.56` → `-2.06` | Caret Air Intake Lips (left & right, canted outward) | Each `~1.05 W × 0.85 H`, outer edge `|X| ≈ 1.95` | **MEDIUM** | Public front/top 3-view proportions |
| `6.40 – 12.60` | `-3.06` → `+3.14` | Center Fuselage (S-ducts, internal fuel, main & side weapons bays) | `3.60 → 4.10 W`, `1.55 H` | **MEDIUM** | Public 3-view & weapons-bay open photos |
| `7.10 – 11.40` | `-2.36` → `+1.94` | Main Centerline Weapons Bay (ventral) | `~2.10 W × 4.30 L × 0.75 D` | **MEDIUM** | Sized to house 6 × AIM-120 (`3.66 m` length) with clearance |
| `7.20 – 10.60` | `-2.26` → `+1.14` | Side Weapons Bays (left & right, below intake shoulders) | Each `~0.55 W × 3.40 L × 0.50 D` | **MEDIUM** | Sized to house 1 × AIM-9 (`~3.02 m` length) + trapeze rail |
| `12.60 – 16.90` | `+3.14` → `+7.44` | Aft Fuselage & Twin Engine Bays (F119-PW-100) | `3.90 → 3.40 W`, `1.45 H`, engine centers at `|X| ≈ 0.82` | **MEDIUM** | Public 3-view & twin-nozzle spacing |
| `16.90 – 18.45` | `+7.44` → `+8.99` | 2D Convergent-Divergent Thrust-Vectoring Nozzles | Each `~1.15 W × 0.72 H × 1.55 L` | **MEDIUM** | Public rear-quarter photos & PW F119 geometry |
| `16.90 – 18.92` | `+7.44` → `+9.46` | Aft Tail Booms (flanking nozzles, supporting stabilators) | Outer `|X| ≈ 1.70`, tapering to `FS 18.92` | **MEDIUM** | Public top/side 3-view proportions |

---

## 4. Wing & Empennage Reference Geometry

| Surface | Root Station (`FS`, m) | Spanwise Extent (`|X|`, m) | Sweep / Cant | Confidence | Basis |
| --- | --- | --- | --- | --- | --- |
| Main Wing (each side) | `FS 6.60 – 14.22` (centerline root chord `9.85 m`, exposed root chord `7.62 m`, tip chord `1.67 m`; trapezoidal area `78.13 m²`, within 0.2% of `78.04 m²`) | `1.85 → 6.78` | `42°` LE sweep, `-17°` TE sweep, slight anhedral (`~-1.5°` `ASSUMED`) | **HIGH** (span/sweep), **MEDIUM** (chords) | USAF span + area (`78.04 m²`) + NASA/VT 42° sweep |
| Leading-Edge Flaps (LEF) | Along wing LE (`|X| = 2.15 → 6.55`) | `4.40 m` span | `42°` hinge line | **MEDIUM** | Public planform & high-AoA photos |
| Flaperons (inboard TE) | Along inboard TE (`|X| = 2.05 → 4.45`) | `2.40 m` span | `-17°` hinge line | **MEDIUM** | Public top/bottom planform photos |
| Ailerons (outboard TE) | Along outboard TE (`|X| = 4.55 → 6.55`) | `2.00 m` span | `-17°` hinge line | **MEDIUM** | Public top/bottom planform photos |
| Vertical Stabilizers (2 ×) | `FS 13.00 – 16.90` | Root `|X| = 1.45` → Tip `|X| = 2.85`, `Y = 2.45 → 5.08` (`atan2(1.40, 2.63) = 28.0°`) | `28°` outward cant, `~42°` LE sweep | **HIGH** (cant/height), **MEDIUM** (chord) | Public 3-view & height (`5.08 m`) |
| Rudders (2 ×) | Trailing 30% of vertical stabilizers | Full fin height (`~2.4 m`) | Parallel to fin TE | **MEDIUM** | Public side-profile photos |
| Horizontal Stabilators (2 ×) | `FS 14.90 – 18.70` (all-moving pivot at `FS 16.50`) | `1.70 → 4.40` | `~42°` LE sweep, `-17°` TE sweep | **MEDIUM** | Public top-view proportions |

---

## 5. Collision & Clearance Design Rules (for Phase 2)

1. **Assembled State (`explode = 0`):** Adjacent parts must maintain explicit non-overlapping parametric clearances (≥ `5 mm` tolerance in `checkPartIntersections()`), with internal assemblies (engines, weapons bays, fuel tanks, cockpit tub, avionics) recessed cleanly inside fuselage cavities.
2. **Exploded State (`explode ∈ (0, 1]`):** Every exploding part moves along a monotonic radial/axial vector away from the aircraft centerline datum `[0, 1.8, 0]` so inner assemblies clear outer skins without intersecting neighbors at any intermediate `explode` value.
