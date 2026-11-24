# F-22 Raptor — Hierarchical Parts List (45 Parts, Phase 1)

Every part below maps 1:1 to a validated JSON file in `src/content/parts/` and forms a single rooted tree (`f22-airframe` → major sections → components).

| # | ID | Name | Parent | Section | Label | Confidence | Primary Sources |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `f22-airframe` | F-22 Raptor Airframe | *(root)* | Airframe | `SOURCED` | HIGH | USAF Fact Sheet, Lockheed Martin |
| 2 | `forward-fuselage` | Forward Fuselage | `f22-airframe` | Forward Fuselage & Cockpit | `SOURCED` | MEDIUM | USAF Fact Sheet, Lockheed Martin |
| 3 | `radome` | Nose Radome | `forward-fuselage` | Forward Fuselage & Cockpit | `SOURCED` | MEDIUM | USAF Fact Sheet, Lockheed Martin |
| 4 | `nose-avionics-bay` | Forward Avionics & Radar Bay | `forward-fuselage` | Forward Fuselage & Cockpit | `SOURCED` | MEDIUM | USAF Fact Sheet, Air & Space Forces Mag |
| 5 | `cockpit-tub` | Cockpit Pressure Tub | `forward-fuselage` | Forward Fuselage & Cockpit | `SOURCED` | MEDIUM | Lockheed Martin, Air & Space Forces Mag |
| 6 | `canopy` | Gold-Tinted Polycarbonate Canopy | `cockpit-tub` | Forward Fuselage & Cockpit | `SOURCED` | MEDIUM | Lockheed Martin, Jane's |
| 7 | `aces-ii-seat` | ACES II Ejection Seat | `cockpit-tub` | Forward Fuselage & Cockpit | `SOURCED` | HIGH | Collins Aerospace, USAF Fact Sheet |
| 8 | `cockpit-displays-hud` | Glass Cockpit Displays & HUD | `cockpit-tub` | Forward Fuselage & Cockpit | `SOURCED` | MEDIUM | Lockheed Martin, Air & Space Forces Mag |
| 9 | `hotas-controls` | HOTAS Side-Stick & Throttles | `cockpit-tub` | Forward Fuselage & Cockpit | `SOURCED` | MEDIUM | Lockheed Martin, Air & Space Forces Mag |
| 10 | `center-fuselage` | Center Fuselage Structure | `f22-airframe` | Center Fuselage & Intakes | `SOURCED` | MEDIUM | Lockheed Martin, Jane's |
| 11 | `intake-left` | Left Caret Air Intake & S-Duct | `center-fuselage` | Center Fuselage & Intakes | `SOURCED` | MEDIUM | Lockheed Martin, NASA/AIAA |
| 12 | `intake-right` | Right Caret Air Intake & S-Duct | `center-fuselage` | Center Fuselage & Intakes | `SOURCED` | MEDIUM | Lockheed Martin, NASA/AIAA |
| 13 | `internal-fuel-tanks` | Internal Fuel Tanks | `center-fuselage` | Center Fuselage & Intakes | `SOURCED` | MEDIUM | USAF Fact Sheet |
| 14 | `refueling-receptacle` | Dorsal Aerial Refueling Receptacle | `center-fuselage` | Center Fuselage & Intakes | `SOURCED` | MEDIUM | USAF Public Affairs / DVIDS |
| 15 | `apu-bay` | Auxiliary Power Unit (APU) | `center-fuselage` | Center Fuselage & Intakes | `SOURCED` | MEDIUM | Honeywell Aerospace |
| 16 | `main-weapons-bay` | Main Centerline Weapons Bay | `center-fuselage` | Weapons Bays & Gun | `SOURCED` | MEDIUM | USAF Fact Sheet, Air & Space Forces Mag |
| 17 | `main-bay-doors` | Main Weapons Bay Doors | `main-weapons-bay` | Weapons Bays & Gun | `SOURCED` | MEDIUM | USAF Public Affairs / DVIDS |
| 18 | `internal-ordnance-display` | Internal Carriage Overview (AIM-120 / JDAM) | `main-weapons-bay` | Weapons Bays & Gun | `SOURCED` | MEDIUM | USAF Fact Sheet |
| 19 | `side-weapons-bay-left` | Left Side Weapons Bay | `center-fuselage` | Weapons Bays & Gun | `SOURCED` | MEDIUM | USAF Fact Sheet, Air & Space Forces Mag |
| 20 | `side-weapons-bay-right` | Right Side Weapons Bay | `center-fuselage` | Weapons Bays & Gun | `SOURCED` | MEDIUM | USAF Fact Sheet, Air & Space Forces Mag |
| 21 | `side-bay-doors` | Side Weapons Bay Doors & Trapeze Rails | `center-fuselage` | Weapons Bays & Gun | `SOURCED` | MEDIUM | USAF Public Affairs / DVIDS |
| 22 | `m61a2-cannon` | M61A2 20 mm Vulcan Cannon | `center-fuselage` | Weapons Bays & Gun | `SOURCED` | HIGH | USAF Fact Sheet, Air & Space Forces Mag |
| 23 | `wing-left` | Left Main Wing | `center-fuselage` | Wings & Control Surfaces | `SOURCED` | HIGH | USAF Fact Sheet, Lockheed Martin |
| 24 | `wing-right` | Right Main Wing | `center-fuselage` | Wings & Control Surfaces | `SOURCED` | HIGH | USAF Fact Sheet, Lockheed Martin |
| 25 | `lef-left` | Left Leading-Edge Flap | `wing-left` | Wings & Control Surfaces | `SOURCED` | MEDIUM | Lockheed Martin, NASA/AIAA |
| 26 | `lef-right` | Right Leading-Edge Flap | `wing-right` | Wings & Control Surfaces | `SOURCED` | MEDIUM | Lockheed Martin, NASA/AIAA |
| 27 | `flaperon-left` | Left Inboard Flaperon | `wing-left` | Wings & Control Surfaces | `SOURCED` | MEDIUM | Lockheed Martin, NASA/AIAA |
| 28 | `flaperon-right` | Right Inboard Flaperon | `wing-right` | Wings & Control Surfaces | `SOURCED` | MEDIUM | Lockheed Martin, NASA/AIAA |
| 29 | `aileron-left` | Left Outboard Aileron | `wing-left` | Wings & Control Surfaces | `SOURCED` | MEDIUM | Lockheed Martin, NASA/AIAA |
| 30 | `aileron-right` | Right Outboard Aileron | `wing-right` | Wings & Control Surfaces | `SOURCED` | MEDIUM | Lockheed Martin, NASA/AIAA |
| 31 | `aft-fuselage` | Aft Fuselage & Engine Nacelles | `f22-airframe` | Aft Fuselage & Empennage | `SOURCED` | MEDIUM | Lockheed Martin, Jane's |
| 32 | `tail-booms` | Aft Tail Booms | `aft-fuselage` | Aft Fuselage & Empennage | `SOURCED` | MEDIUM | Lockheed Martin, NASA/AIAA |
| 33 | `vertical-stabilizer-left` | Left Canted Vertical Stabilizer | `aft-fuselage` | Aft Fuselage & Empennage | `SOURCED` | HIGH | USAF Fact Sheet, NASA/AIAA |
| 34 | `vertical-stabilizer-right` | Right Canted Vertical Stabilizer | `aft-fuselage` | Aft Fuselage & Empennage | `SOURCED` | HIGH | USAF Fact Sheet, NASA/AIAA |
| 35 | `rudder-left` | Left Rudder | `vertical-stabilizer-left` | Aft Fuselage & Empennage | `SOURCED` | MEDIUM | Lockheed Martin, NASA/AIAA |
| 36 | `rudder-right` | Right Rudder | `vertical-stabilizer-right` | Aft Fuselage & Empennage | `SOURCED` | MEDIUM | Lockheed Martin, NASA/AIAA |
| 37 | `stabilator-left` | Left All-Moving Stabilator | `tail-booms` | Aft Fuselage & Empennage | `SOURCED` | MEDIUM | Lockheed Martin, NASA/AIAA |
| 38 | `stabilator-right` | Right All-Moving Stabilator | `tail-booms` | Aft Fuselage & Empennage | `SOURCED` | MEDIUM | Lockheed Martin, NASA/AIAA |
| 39 | `engine-f119-left` | Left F119-PW-100 Turbofan Engine | `aft-fuselage` | Propulsion | `SOURCED` | HIGH | USAF Fact Sheet, Pratt & Whitney |
| 40 | `engine-f119-right` | Right F119-PW-100 Turbofan Engine | `aft-fuselage` | Propulsion | `SOURCED` | HIGH | USAF Fact Sheet, Pratt & Whitney |
| 41 | `nozzle-2d-left` | Left 2D Thrust-Vectoring Nozzle | `engine-f119-left` | Propulsion | `SOURCED` | HIGH | Pratt & Whitney |
| 42 | `nozzle-2d-right` | Right 2D Thrust-Vectoring Nozzle | `engine-f119-right` | Propulsion | `SOURCED` | HIGH | Pratt & Whitney |
| 43 | `nose-landing-gear` | Nose Landing Gear & Bay Doors | `forward-fuselage` | Landing Gear | `SOURCED` | MEDIUM | USAF Public Affairs, Jane's |
| 44 | `main-landing-gear-left` | Left Main Landing Gear & Bay Doors | `center-fuselage` | Landing Gear | `SOURCED` | MEDIUM | USAF Public Affairs, Jane's |
| 45 | `main-landing-gear-right` | Right Main Landing Gear & Bay Doors | `center-fuselage` | Landing Gear | `SOURCED` | MEDIUM | USAF Public Affairs, Jane's |
