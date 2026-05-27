import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AIRCRAFT_TYPE_PROFILES,
  B737_PROFILE,
  F70_100_PROFILE,
  FDAP_MTOW_THRESHOLD_KG,
  getAircraftTypeProfile,
  isProductionReady,
  profileExceedsFdapThreshold,
  tryGetAircraftTypeProfile,
} from '../src/index.js';

describe('AircraftTypeProfile registry', () => {
  it('contains F70/100 and B737', () => {
    assert.equal(AIRCRAFT_TYPE_PROFILES.length >= 2, true);
    assert.ok(AIRCRAFT_TYPE_PROFILES.includes(F70_100_PROFILE));
    assert.ok(AIRCRAFT_TYPE_PROFILES.includes(B737_PROFILE));
  });

  it('all profile ids are unique', () => {
    const ids = AIRCRAFT_TYPE_PROFILES.map((p) => p.id);
    const unique = new Set(ids);
    assert.equal(unique.size, ids.length);
  });

  it('getAircraftTypeProfile resolves known ids', () => {
    assert.equal(getAircraftTypeProfile(F70_100_PROFILE.id), F70_100_PROFILE);
    assert.equal(getAircraftTypeProfile(B737_PROFILE.id), B737_PROFILE);
  });

  it('tryGetAircraftTypeProfile returns undefined for unknown ids', () => {
    assert.equal(tryGetAircraftTypeProfile('NOT_A_TYPE'), undefined);
  });

  it('getAircraftTypeProfile throws on unknown id', () => {
    assert.throws(
      () => getAircraftTypeProfile('NOT_A_TYPE' as unknown as typeof F70_100_PROFILE.id),
      /Unknown AircraftTypeProfile/,
    );
  });
});

describe('F70/100 profile (production-ready)', () => {
  it('has all critical operational facts populated', () => {
    assert.equal(F70_100_PROFILE.status, 'production-ready');
    assert.equal(isProductionReady(F70_100_PROFILE), true);
    assert.equal(F70_100_PROFILE.manufacturerFacts.engineDesignation, 'Rolls-Royce Tay Mk.620-15');
    assert.equal(F70_100_PROFILE.manufacturerFacts.hydraulicSystemsCount, 3);
    assert.equal(F70_100_PROFILE.operationalProfile.oei?.bankIntoLiveEngineDeg, 5);
    assert.equal(F70_100_PROFILE.operationalProfile.maxFuelAsymmetryKgEnroute, 1000);
    assert.equal(F70_100_PROFILE.operationalProfile.decisionFramework, 'T-DODAR');
  });

  it('all 3 variants exceed the FDAP threshold (audit §3.4)', () => {
    for (const v of F70_100_PROFILE.manufacturerFacts.variants) {
      assert.ok(
        v.mtowKg > FDAP_MTOW_THRESHOLD_KG,
        `${v.label} MTOW ${v.mtowKg} must exceed ${FDAP_MTOW_THRESHOLD_KG}`,
      );
    }
    assert.equal(profileExceedsFdapThreshold(F70_100_PROFILE), true);
  });
});

describe('B737 profile (preview)', () => {
  it('is marked preview with pending-source flags set', () => {
    assert.equal(B737_PROFILE.status, 'preview');
    assert.equal(isProductionReady(B737_PROFILE), false);
    assert.equal(B737_PROFILE.operationalProfile.pendingPrimarySource, true);
    assert.equal(B737_PROFILE.aiCalibration.pendingPrimarySource, true);
  });

  it('has public manufacturer facts populated', () => {
    assert.match(B737_PROFILE.manufacturerFacts.engineDesignation, /CFM56-7B/);
    assert.ok(B737_PROFILE.manufacturerFacts.variants.length >= 1);
  });

  it('omits operational technique (refuses to fabricate)', () => {
    assert.equal(B737_PROFILE.operationalProfile.oei, undefined);
    assert.equal(B737_PROFILE.operationalProfile.maxFuelAsymmetryKgEnroute, undefined);
    assert.equal(B737_PROFILE.operationalProfile.takeoffFlapPolicy, undefined);
  });

  it('omits AI technicalFactsBlock (refuses to invent)', () => {
    assert.equal(B737_PROFILE.aiCalibration.technicalFactsBlock, undefined);
  });
});
