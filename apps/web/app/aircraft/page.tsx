import Link from 'next/link';
import {
  AIRCRAFT_TYPE_PROFILES,
  F70_100_PROFILE_ID,
  FDAP_MTOW_THRESHOLD_KG,
  profileExceedsFdapThreshold,
  tryGetAircraftTypeProfile,
  type AircraftTypeProfile,
} from '@dnca/domain';
import { TypeSwitcher } from './_components/type-switcher';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ typeId?: string }>;
}

export default async function AircraftPage({ searchParams }: PageProps) {
  const { typeId } = await searchParams;
  const profile =
    (typeId ? tryGetAircraftTypeProfile(typeId) : tryGetAircraftTypeProfile(F70_100_PROFILE_ID)) ??
    tryGetAircraftTypeProfile(F70_100_PROFILE_ID)!;
  const isProduction = profile.status === 'production-ready';

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">
            {profile.shortLabel} — {profile.longLabel}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-700">
            Aircraft type profile rendered from{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5">@dnca/domain</code>'s{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5">AircraftTypeProfile</code> (ADR
            0006). Manufacturer facts are public spec data; operational profile and AI calibration
            are operator OM-B / TRI-TRE territory.
          </p>
        </div>
        <TypeSwitcher
          selected={profile.id}
          options={AIRCRAFT_TYPE_PROFILES.map((p) => ({
            id: p.id,
            label: p.shortLabel,
            status: p.status,
          }))}
        />
      </header>

      <StatusBanner profile={profile} />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
          Mass variants
        </h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-navy-900 text-white">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Variant</th>
                <th className="px-4 py-2 text-right font-medium">MTOW (kg)</th>
                <th className="px-4 py-2 text-right font-medium">MLW (kg)</th>
                <th className="px-4 py-2 text-right font-medium">MZFW (kg)</th>
                <th className="px-4 py-2 text-right font-medium">FDAP?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {profile.manufacturerFacts.variants.map((v) => {
                const fdap = v.mtowKg > FDAP_MTOW_THRESHOLD_KG;
                return (
                  <tr key={v.key} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <div className="font-medium">{v.label}</div>
                      {v.notes ? <div className="text-[10px] text-slate-500">{v.notes}</div> : null}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {v.mtowKg.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-500">
                      {v.mlwKg !== undefined ? v.mlwKg.toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-500">
                      {v.mzfwKg !== undefined ? v.mzfwKg.toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {fdap ? (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">
                          Mandatory
                        </span>
                      ) : (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                          N/A
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
            FDAP threshold: MTOW &gt; {FDAP_MTOW_THRESHOLD_KG.toLocaleString()} kg per KCARs Reg
            56(2).
            {profileExceedsFdapThreshold(profile)
              ? ' At least one variant of this type qualifies.'
              : ' No variant qualifies (FDAP optional).'}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Fact label="Engine" value={profile.manufacturerFacts.engineDesignation} />
        <Fact label="APU" value={profile.manufacturerFacts.apuDesignation ?? '— (not populated)'} />
        <Fact
          label="Hydraulic systems"
          value={
            profile.manufacturerFacts.hydraulicSystemsCount !== undefined
              ? `${profile.manufacturerFacts.hydraulicSystemsCount} independent`
              : '— (pending primary source)'
          }
        />
        <Fact
          label="Approach speeds"
          value={profile.operationalProfile.approachSpeedSource ?? '— (pending primary source)'}
          note={
            isProduction && profile.operationalProfile.approachSpeedSource
              ? 'No paper speed cards when active.'
              : undefined
          }
        />
        <Fact
          label="OEI technique"
          value={
            profile.operationalProfile.oei
              ? `${profile.operationalProfile.oei.technique} with ${profile.operationalProfile.oei.bankIntoLiveEngineDeg}° bank into the live engine`
              : '— (pending primary source)'
          }
        />
        <Fact
          label="Max fuel asymmetry"
          value={
            profile.operationalProfile.maxFuelAsymmetryKgEnroute !== undefined
              ? `${profile.operationalProfile.maxFuelAsymmetryKgEnroute.toLocaleString()} kg en-route`
              : '— (pending primary source)'
          }
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
          Takeoff flap policy
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-700">
          {profile.operationalProfile.takeoffFlapPolicy ? (
            <ul className="space-y-2">
              <li>
                Flaps <strong>{profile.operationalProfile.takeoffFlapPolicy.default}</strong> —
                default
              </li>
              <li>
                Flaps <strong>{profile.operationalProfile.takeoffFlapPolicy.performance}</strong> —
                performance
              </li>
              <li>
                Flaps <strong>{profile.operationalProfile.takeoffFlapPolicy.reserved}</strong> —
                reserved
              </li>
              <li className="rounded bg-red-50 px-3 py-2 text-red-800">
                Flaps{' '}
                <strong>
                  {profile.operationalProfile.takeoffFlapPolicy.prohibitedOnContaminatedRunway}
                </strong>{' '}
                is <strong>PROHIBITED</strong> on contaminated runways
              </li>
              {!profile.operationalProfile.takeoffFlapPolicy.tocwsAlertsOnFlapZero ? (
                <li className="text-xs text-slate-600">
                  TOCWS does not alert for Flaps 0 (a valid configuration). EICAS confirmation
                  discipline is mandatory.
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="text-slate-500">
              Takeoff flap policy not yet populated for this profile. Operator OM-B / AFM required.
            </p>
          )}
          {profile.operationalProfile.landingFlaps &&
          profile.operationalProfile.landingFlaps.length > 0 ? (
            <div className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-600">
              Landing flaps: {profile.operationalProfile.landingFlaps.join(' or ')}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function StatusBanner({ profile }: { profile: AircraftTypeProfile }) {
  if (profile.status === 'production-ready') {
    return (
      <div className="rounded border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
        <strong>Production-ready.</strong> Used as the primary type calibration for JAK and I-Fly
        deployments. AI assessment generation produces fully-anchored questions; KCAA-aligned
        exports cite type-specific operational sources.
      </div>
    );
  }
  return (
    <div className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      <strong>Preview profile.</strong> Manufacturer facts are populated from public spec; the
      operational profile and AI calibration are pending population by a TRI/TRE qualified on type.
      Promote to production-ready during Phase 1 of an operator deployment.
    </div>
  );
}

function Fact({ label, value, note }: { label: string; value: string; note?: string | undefined }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-navy-900">{value}</div>
      {note ? <div className="mt-1 text-xs text-slate-600">{note}</div> : null}
    </div>
  );
}
