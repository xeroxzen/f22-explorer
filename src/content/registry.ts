import f22Airframe from './parts/f22-airframe.json';
import forwardFuselage from './parts/forward-fuselage.json';
import radome from './parts/radome.json';
import noseAvionicsBay from './parts/nose-avionics-bay.json';
import cockpitTub from './parts/cockpit-tub.json';
import canopy from './parts/canopy.json';
import acesIiSeat from './parts/aces-ii-seat.json';
import cockpitDisplaysHud from './parts/cockpit-displays-hud.json';
import hotasControls from './parts/hotas-controls.json';
import centerFuselage from './parts/center-fuselage.json';
import intakeLeft from './parts/intake-left.json';
import intakeRight from './parts/intake-right.json';
import internalFuelTanks from './parts/internal-fuel-tanks.json';
import refuelingReceptacle from './parts/refueling-receptacle.json';
import apuBay from './parts/apu-bay.json';
import mainWeaponsBay from './parts/main-weapons-bay.json';
import mainBayDoors from './parts/main-bay-doors.json';
import internalOrdnanceDisplay from './parts/internal-ordnance-display.json';
import sideWeaponsBayLeft from './parts/side-weapons-bay-left.json';
import sideWeaponsBayRight from './parts/side-weapons-bay-right.json';
import sideBayDoors from './parts/side-bay-doors.json';
import m61a2Cannon from './parts/m61a2-cannon.json';
import wingLeft from './parts/wing-left.json';
import wingRight from './parts/wing-right.json';
import lefLeft from './parts/lef-left.json';
import lefRight from './parts/lef-right.json';
import flaperonLeft from './parts/flaperon-left.json';
import flaperonRight from './parts/flaperon-right.json';
import aileronLeft from './parts/aileron-left.json';
import aileronRight from './parts/aileron-right.json';
import aftFuselage from './parts/aft-fuselage.json';
import tailBooms from './parts/tail-booms.json';
import verticalStabilizerLeft from './parts/vertical-stabilizer-left.json';
import verticalStabilizerRight from './parts/vertical-stabilizer-right.json';
import rudderLeft from './parts/rudder-left.json';
import rudderRight from './parts/rudder-right.json';
import stabilatorLeft from './parts/stabilator-left.json';
import stabilatorRight from './parts/stabilator-right.json';
import engineF119Left from './parts/engine-f119-left.json';
import engineF119Right from './parts/engine-f119-right.json';
import nozzle2dLeft from './parts/nozzle-2d-left.json';
import nozzle2dRight from './parts/nozzle-2d-right.json';
import noseLandingGear from './parts/nose-landing-gear.json';
import mainLandingGearLeft from './parts/main-landing-gear-left.json';
import mainLandingGearRight from './parts/main-landing-gear-right.json';
import f119FanLeft from './parts/f119-fan-left.json';
import f119FanRight from './parts/f119-fan-right.json';
import f119HpcLeft from './parts/f119-hpc-left.json';
import f119HpcRight from './parts/f119-hpc-right.json';
import f119CombustorLeft from './parts/f119-combustor-left.json';
import f119CombustorRight from './parts/f119-combustor-right.json';
import f119HptLeft from './parts/f119-hpt-left.json';
import f119HptRight from './parts/f119-hpt-right.json';
import f119LptLeft from './parts/f119-lpt-left.json';
import f119LptRight from './parts/f119-lpt-right.json';
import f119AugmentorLeft from './parts/f119-augmentor-left.json';
import f119AugmentorRight from './parts/f119-augmentor-right.json';
import f119NozzleFlapsLeft from './parts/f119-nozzle-flaps-left.json';
import f119NozzleFlapsRight from './parts/f119-nozzle-flaps-right.json';
import fuelTankForward from './parts/fuel-tank-forward.json';
import fuelTankAft from './parts/fuel-tank-aft.json';
import fuelTankWingLeft from './parts/fuel-tank-wing-left.json';
import fuelTankWingRight from './parts/fuel-tank-wing-right.json';
import anApg77Radar from './parts/an-apg-77-radar.json';
import tailHook from './parts/tail-hook.json';
import gunPortDoor from './parts/gun-port-door.json';
import pitotAirDataProbes from './parts/pitot-air-data-probes.json';
import iffCommAntennas from './parts/iff-comm-antennas.json';
import canopyActuator from './parts/canopy-actuator.json';
import noseGearDoors from './parts/nose-gear-doors.json';
import mainGearDoors from './parts/main-gear-doors.json';
import {
  validateComponentContent,
  validatePartsHierarchy,
  type ComponentContent,
} from './schema.js';

const RAW_COMPONENTS: readonly [string, unknown][] = [
  ['parts/f22-airframe.json', f22Airframe],
  ['parts/forward-fuselage.json', forwardFuselage],
  ['parts/radome.json', radome],
  ['parts/nose-avionics-bay.json', noseAvionicsBay],
  ['parts/cockpit-tub.json', cockpitTub],
  ['parts/canopy.json', canopy],
  ['parts/aces-ii-seat.json', acesIiSeat],
  ['parts/cockpit-displays-hud.json', cockpitDisplaysHud],
  ['parts/hotas-controls.json', hotasControls],
  ['parts/center-fuselage.json', centerFuselage],
  ['parts/intake-left.json', intakeLeft],
  ['parts/intake-right.json', intakeRight],
  ['parts/internal-fuel-tanks.json', internalFuelTanks],
  ['parts/refueling-receptacle.json', refuelingReceptacle],
  ['parts/apu-bay.json', apuBay],
  ['parts/main-weapons-bay.json', mainWeaponsBay],
  ['parts/main-bay-doors.json', mainBayDoors],
  ['parts/internal-ordnance-display.json', internalOrdnanceDisplay],
  ['parts/side-weapons-bay-left.json', sideWeaponsBayLeft],
  ['parts/side-weapons-bay-right.json', sideWeaponsBayRight],
  ['parts/side-bay-doors.json', sideBayDoors],
  ['parts/m61a2-cannon.json', m61a2Cannon],
  ['parts/wing-left.json', wingLeft],
  ['parts/wing-right.json', wingRight],
  ['parts/lef-left.json', lefLeft],
  ['parts/lef-right.json', lefRight],
  ['parts/flaperon-left.json', flaperonLeft],
  ['parts/flaperon-right.json', flaperonRight],
  ['parts/aileron-left.json', aileronLeft],
  ['parts/aileron-right.json', aileronRight],
  ['parts/aft-fuselage.json', aftFuselage],
  ['parts/tail-booms.json', tailBooms],
  ['parts/vertical-stabilizer-left.json', verticalStabilizerLeft],
  ['parts/vertical-stabilizer-right.json', verticalStabilizerRight],
  ['parts/rudder-left.json', rudderLeft],
  ['parts/rudder-right.json', rudderRight],
  ['parts/stabilator-left.json', stabilatorLeft],
  ['parts/stabilator-right.json', stabilatorRight],
  ['parts/engine-f119-left.json', engineF119Left],
  ['parts/engine-f119-right.json', engineF119Right],
  ['parts/nozzle-2d-left.json', nozzle2dLeft],
  ['parts/nozzle-2d-right.json', nozzle2dRight],
  ['parts/nose-landing-gear.json', noseLandingGear],
  ['parts/main-landing-gear-left.json', mainLandingGearLeft],
  ['parts/main-landing-gear-right.json', mainLandingGearRight],
  ['parts/f119-fan-left.json', f119FanLeft],
  ['parts/f119-fan-right.json', f119FanRight],
  ['parts/f119-hpc-left.json', f119HpcLeft],
  ['parts/f119-hpc-right.json', f119HpcRight],
  ['parts/f119-combustor-left.json', f119CombustorLeft],
  ['parts/f119-combustor-right.json', f119CombustorRight],
  ['parts/f119-hpt-left.json', f119HptLeft],
  ['parts/f119-hpt-right.json', f119HptRight],
  ['parts/f119-lpt-left.json', f119LptLeft],
  ['parts/f119-lpt-right.json', f119LptRight],
  ['parts/f119-augmentor-left.json', f119AugmentorLeft],
  ['parts/f119-augmentor-right.json', f119AugmentorRight],
  ['parts/f119-nozzle-flaps-left.json', f119NozzleFlapsLeft],
  ['parts/f119-nozzle-flaps-right.json', f119NozzleFlapsRight],
  ['parts/fuel-tank-forward.json', fuelTankForward],
  ['parts/fuel-tank-aft.json', fuelTankAft],
  ['parts/fuel-tank-wing-left.json', fuelTankWingLeft],
  ['parts/fuel-tank-wing-right.json', fuelTankWingRight],
  ['parts/an-apg-77-radar.json', anApg77Radar],
  ['parts/tail-hook.json', tailHook],
  ['parts/gun-port-door.json', gunPortDoor],
  ['parts/pitot-air-data-probes.json', pitotAirDataProbes],
  ['parts/iff-comm-antennas.json', iffCommAntennas],
  ['parts/canopy-actuator.json', canopyActuator],
  ['parts/nose-gear-doors.json', noseGearDoors],
  ['parts/main-gear-doors.json', mainGearDoors],
];

export const ALL_COMPONENTS: readonly ComponentContent[] = RAW_COMPONENTS.map(
  ([file, raw]) => validateComponentContent(raw, file)
);

validatePartsHierarchy(ALL_COMPONENTS);

export const COMPONENT_BY_ID: Readonly<Record<string, ComponentContent>> =
  Object.fromEntries(ALL_COMPONENTS.map((c) => [c.id, c]));

export function getComponentContent(id: string): ComponentContent | null {
  return COMPONENT_BY_ID[id] ?? null;
}

export function getChildComponents(parentId: string | null): readonly ComponentContent[] {
  return ALL_COMPONENTS.filter((c) => c.parentId === parentId);
}
