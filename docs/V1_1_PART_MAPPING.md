# F-22 Explorer v1.1 — Part Mapping Report (70-Part Catalog → NLM CC-BY 4.0 GLB + Cutaway Internals)

Every one of the **71** part IDs in `src/content/parts/*.json` (`70` selectable physical parts + `1` root container `f22-airframe`) maps to either a split node in `public/models/f22-raptor-nlm.glb` (33 parts, including `nose-gear-doors` & `main-gear-doors`) or a non-colliding parametric internal/cutaway mesh in `src/scene/f22Geometry.ts` (37 parts). **Zero parts in the Part Tree select nothing** (verified in `tests/glb-integrity.test.ts` and `tests/model-collisions.test.ts` with 0 SAT collisions across `explode = 0..1`).

| # | v1.0 Part ID | v1.1 Source | Notes |
| :-: | :--- | :--- | :--- |
| 1 | `f22-airframe` | **Root assembly** | Root container; geometry labeled `APPROXIMATE` (third-party CC-BY 4.0 model, not verified against drawings) |
| 2 | `radome` | **GLB mesh** | `Object_161` (`Gray_nose`) |
| 3 | `forward-fuselage` | **GLB mesh** | `Object_163`, `157`, `103`, `105`, `113` |
| 4 | `center-fuselage` | **GLB mesh** | Split from `Object_93`, `159`, `99` (`\|x\| <= 1.85`, forward of FS 12 m) |
| 5 | `aft-fuselage` | **GLB mesh** | Split from `Object_93`, `159`, `99` + `Object_107`, `117`, `123` |
| 6 | `tail-booms` | **GLB mesh** | `Object_119`, `109`, `115` |
| 7 | `canopy` | **GLB mesh** | `Object_41` (`Glass`) + `Object_43` (`Cabin_black` frame), aft hinge `[0, 1.68, -3.76]` |
| 8 | `cockpit-tub` | **GLB mesh** | `Object_91` (`Cabin_black`) |
| 9 | `intake-caret-left` | **GLB mesh** | Left split of `Object_95`, `153` (`Air_tube`) |
| 10 | `intake-caret-right` | **GLB mesh** | Right split of `Object_95`, `153` (`Air_tube`) |
| 11 | `wing-left` | **GLB mesh** | Left split of `Object_93`, `101` (`x < -1.85`) |
| 12 | `wing-right` | **GLB mesh** | Right split of `Object_93`, `101` (`x > 1.85`) |
| 13 | `vertical-stabilizer-left` | **GLB mesh** | Left split of `Object_111` |
| 14 | `vertical-stabilizer-right` | **GLB mesh** | Right split of `Object_111` |
| 15 | `rudder-left` | **GLB mesh** | `Object_73` (pre-split rudder) |
| 16 | `rudder-right` | **GLB mesh** | `Object_70` (pre-split rudder) |
| 17 | `stabilator-left` | **GLB mesh** | `Object_121` (pre-split stabilator) |
| 18 | `stabilator-right` | **GLB mesh** | `Object_151` (pre-split stabilator) |
| 19 | `flaperon-left` | **GLB mesh** | `Object_76` (pre-split flaperon) |
| 20 | `flaperon-right` | **GLB mesh** | `Object_82` (pre-split flaperon) |
| 21 | `aileron-left` | **GLB mesh** | `Object_79` (pre-split aileron) |
| 22 | `aileron-right` | **GLB mesh** | `Object_85` (pre-split aileron) |
| 23 | `nozzle-2d-left` | **GLB mesh** | `Object_87` (exit `x = -0.74, y = 0.90, z = +6.26`) |
| 24 | `nozzle-2d-right` | **GLB mesh** | `Object_45` (exit `x = +0.74, y = 0.90, z = +6.26`) |
| 25 | `nose-landing-gear` | **GLB mesh** | Nose strut/wheel group (`Object_5`..`38`, tires decimated) |
| 26 | `nose-gear-doors` | **GLB mesh** | `Object_171`, `173`, `175`, `97` |
| 27 | `main-landing-gear-left` | **GLB mesh** | Left main strut/wheel group (`Object_47`..`57` + split `53`) |
| 28 | `main-landing-gear-right` | **GLB mesh** | Right main strut/wheel group (`Object_59`..`67` + split `53`) |
| 29 | `main-gear-doors` | **GLB mesh** | `Object_125`, `127`, `129`, `131`, `133` |
| 30 | `main-weapons-bay` | **GLB mesh** | `Object_135`, `137` |
| 31 | `main-bay-doors` | **GLB mesh** | `Object_165`, `169` (replaced by animated doors when open) |
| 32 | `side-weapons-bay-left` | **GLB mesh** | `Object_139`..`143` |
| 33 | `side-weapons-bay-right` | **GLB mesh** | `Object_145`..`149` |
| 34 | `side-bay-doors` | **GLB mesh** | `Object_155`, `167` (replaced by animated doors when open) |
| 35 | `lef-left` | **Parametric fallback** | Hidden inside wing when assembled; revealed in explode / X-ray |
| 36 | `lef-right` | **Parametric fallback** | Hidden inside wing when assembled; revealed in explode / X-ray |
| 37 | `engine-f119-left` | **Parametric fallback** | Internal turbofan cutaway core (expanded in Item 5) |
| 38 | `engine-f119-right` | **Parametric fallback** | Internal turbofan cutaway core (expanded in Item 5) |
| 39 | `apu-bay` | **Parametric fallback** | Internal APU bay (revealed in explode / X-ray) |
| 40 | `fuel-tanks` | **Parametric fallback** | Internal fuel cell block (expanded in Item 5) |
| 41 | `avionics-bay` | **Parametric fallback** | Internal avionics / AN/APG-77 bay (revealed in explode / X-ray) |
| 42 | `m61a2-cannon` | **Parametric fallback** | Internal right-wing-root cannon (revealed in explode / X-ray) |
| 43 | `aces-ii-seat` | **Parametric fallback** | Internal ejection seat + `CockpitDetail` headrest/handle |
| 44 | `cockpit-displays-hud` | **Parametric + `CockpitDetail`** | Code One sourced 6-LCD + HUD + ICP detail in seat view |
| 45 | `hotas-controls` | **Parametric + `CockpitDetail`** | Animated stick + dual throttles in seat view |
| 46 | `internal-ordnance-display` | **Parametric + `WeaponsBaysDetail`** | USAF/NAVAIR-scaled AIM-120 / AIM-9X / GBU-32 / 2×BRU-61 SDBs |
| 47 | `refueling-receptacle` | **Parametric internal** | Dorsal UARRSI boom receptacle |
| 48–61 | `f119-{fan,hpc,combustor,hpt,lpt,augmentor,nozzle-flaps}-{left,right}` (14) | **Parametric cutaway** | Sequential F119-PW-100 axial stages (`ASSUMED` geometry, fetch-verified `SOURCED` existence) |
| 62–65 | `fuel-tank-{forward,aft,wing-left,wing-right}` (4) | **Parametric internal** | Individual fuselage & integral wing fuel cells (`ASSUMED` geometry) |
| 66 | `an-apg-77-radar` | **Parametric internal** | AN/APG-77 X-band AESA array behind radome (internals `NOT_PUBLICLY_DISCLOSED`) |
| 67 | `tail-hook` | **Parametric internal** | Ventral emergency arresting tailhook between engine nacelles |
| 68 | `gun-port-door` | **Parametric internal** | Retractable stealth M61A2 cannon muzzle door |
| 69 | `pitot-air-data-probes` | **Parametric internal** | Forward nose-chine air data & pitot-static sensors |
| 70 | `iff-comm-antennas` | **Parametric internal** | Conformal dorsal IFF & CNI antenna apertures (waveforms `NOT_PUBLICLY_DISCLOSED`) |
| 71 | `canopy-actuator` | **Parametric internal** | Aft-hinged single-piece canopy drive actuator & latch mechanism |

*(70 selectable leaf/section hitboxes + 1 root `f22-airframe` = 71 total entries in `ALL_COMPONENTS`.)*
