# F-22 Raptor — Interaction & Articulation Map (Phase 1)

This document defines which parts explode during disassembly, which assemblies open/close, and which surfaces articulate, along with their motion ranges and provenance labels.

---

## 1. Disassembly / Exploded View (`explode ∈ [0, 1]`)

Every part in the 45-part hierarchy belongs to an explode tier so that moving the Explode slider from `0%` to `100%` separates outer skins, control surfaces, doors, and internal bays cleanly along non-colliding vectors:

| Group | Parts | Explode Direction (`[dx, dy, dz]` meters at `explode = 1`) | Notes |
| --- | --- | --- | --- |
| **Core Spine (Anchor)** | `center-fuselage` | `[0, 0, 0]` | Structural reference anchor |
| **Forward Fuselage** | `forward-fuselage`, `nose-avionics-bay`, `radome` | `[0, 0, -2.5]` → `[0, 0, -4.5]` → `[0, 0, -6.2]` | Staggered forward along `-Z` |
| **Cockpit Stack** | `cockpit-tub`, `aces-ii-seat`, `cockpit-displays-hud`, `hotas-controls`, `canopy` | Upward `+Y` (`+1.6` → `+3.8`) + forward `-Z` (`-2.5`) | Canopy lifts highest so seat & panel are unobstructed |
| **Intakes & Fuel / APU** | `intake-left/right`, `internal-fuel-tanks`, `refueling-receptacle`, `apu-bay` | Intakes outward `±X` (`±2.4`); fuel/refueling upward `+Y` (`+1.8` / `+2.8`); APU upward/aft | Keeps center bay clear |
| **Weapons Bays & Gun** | `main-weapons-bay`, `main-bay-doors`, `internal-ordnance-display`, `side-weapons-bay-left/right`, `side-bay-doors`, `m61a2-cannon` | Main bay & ordnance downward `-Y` (`-1.8` / `-2.9` / `-3.6`); side bays outward `±X` (`±3.2`) + `-Y`; gun outward `+X` (`+2.2`) + `+Y` | Separates ventral & lateral carriage cleanly |
| **Wings & Wing Surfaces** | `wing-left/right`, `lef-left/right`, `flaperon-left/right`, `aileron-left/right` | Wings outward `±X` (`±3.2`); LEFs outward + forward; flaperons/ailerons outward + aft | Zero wing-to-surface overlap |
| **Aft Fuselage & Empennage** | `aft-fuselage`, `tail-booms`, `vertical-stabilizer-left/right`, `rudder-left/right`, `stabilator-left/right` | Aft `+Z` (`+2.6` → `+4.2`), fins outward/upward, stabilators outward/aft | Reveals twin F119 engine bays |
| **Propulsion** | `engine-f119-left/right`, `nozzle-2d-left/right` | Engines aft `+Z` (`+4.8`) + slight `±X` (`±1.1`); nozzles further aft (`+6.8`) | Clear view of twin-spool core & 2D nozzles |
| **Landing Gear** | `nose-landing-gear`, `main-landing-gear-left/right` | Downward `-Y` (`-1.8`) + forward/outward | Keeps gear bays visible |

---

## 2. Opening & Retracting Assemblies

| Assembly | Part ID(s) | Motion Type | Range | Label | Source / Reasoning |
| --- | --- | --- | --- | --- | --- |
| **Canopy** | `canopy` | Aft-hinged upward clamshell rotation | `0°` (closed) → `38°` (open) | `ASSUMED` | Visual proportion from USAF ramp/cockpit-open photos; exact angle not published |
| **Main Weapons Bay Doors** | `main-bay-doors` | Bi-fold / twin outward-swinging ventral doors | `0°` (flush) → `90°` (open) | `ASSUMED` | Standard vertical-clearance open position seen in USAF bay-open photos |
| **Side Weapons Bay Doors** | `side-bay-doors` | Side-hinged outward opening + AIM-9 trapeze rail extension | Doors `0° → 95°`, rail `0° → 25°` | `ASSUMED` | Based on public USAF side-bay launch photos |
| **M61A2 Gun Port Door** | `m61a2-cannon` | Flush dorsal fairing door above right wing root | `0°` (flush) → `45°` (open) | `ASSUMED` | Opens only during firing/inspection to preserve LO shaping |
| **Aerial Refueling Door** | `refueling-receptacle` | Dorsal spine clamshell door | `0°` (flush) → `40°` (open) | `ASSUMED` | Based on USAF KC-135/KC-46 boom refueling photos |
| **Nose Landing Gear** | `nose-landing-gear` | Forward-retracting strut + bay doors | `0°` (extended) → `90°` (retracted) | `ASSUMED` | Standard tricycle retraction kinematics |
| **Main Landing Gear** | `main-landing-gear-left`, `main-landing-gear-right` | Forward/inward-retracting struts + bay doors | `0°` (extended) → `90°` (retracted) | `ASSUMED` | Standard F-22 main gear bay kinematics |

---

## 3. Articulating Control Surfaces & Nozzles

> **Note:** Exact DoD flight-control mechanical limits are `NOT_PUBLICLY_DISCLOSED`. All aerodynamic surface deflection ranges below are explicitly labeled `ASSUMED` for the educational control-stick widget; only the F119 2D thrust-vectoring pitch range (`±20°`) is `SOURCED`.

| Surface | Part ID(s) | Driver Axis (Control Stick / Throttle) | Motion Range | Label | Source / Reasoning |
| --- | --- | --- | --- | --- | --- |
| **2D Thrust-Vectoring Nozzles** | `nozzle-2d-left`, `nozzle-2d-right` | Pitch stick (symmetric) & roll assist (differential) | `±20°` pitch | `SOURCED` | Pratt & Whitney F119 public specification |
| **Horizontal Stabilators** | `stabilator-left`, `stabilator-right` | Pitch stick (symmetric) + Roll stick (differential) | `±25°` | `ASSUMED` | Representative educational range; exact DoD limit classified |
| **Ailerons** | `aileron-left`, `aileron-right` | Roll stick (differential) | `±25°` | `ASSUMED` | Representative educational range; exact DoD limit classified |
| **Flaperons** | `flaperon-left`, `flaperon-right` | Roll stick (differential) + Flaps/high-lift (symmetric) | `-20°` (up) to `+30°` (down) | `ASSUMED` | Representative educational range; exact DoD limit classified |
| **Leading-Edge Flaps (LEF)** | `lef-left`, `lef-right` | Automatic / pitch-coupled high-AoA schedule | `0°` to `+30°` (down) | `ASSUMED` | Representative educational range; exact DoD limit classified |
| **Twin Rudders** | `rudder-left`, `rudder-right` | Yaw pedals (symmetric) + Airbrake (split outward) | `±30°` | `ASSUMED` | Representative educational range; split-rudder speedbrake function is public |
