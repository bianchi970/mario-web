'use client';

import { useState } from 'react';
import type { Device } from '@/lib/hub-types';
import { AUTOMATION_COPY } from './automation-copy';

type TriggerType = 'schedule' | 'motion' | 'manual';
type ActionType = 'turn_on' | 'turn_off';

interface WizardState {
  triggerType: TriggerType | null;
  // schedule
  scheduleTime: string; // HH:MM
  scheduleDays: boolean[]; // [lun, mar, mer, gio, ven, sab, dom]
  // motion
  motionDeviceId: string;
  motionValue: boolean; // true=rilevato, false=assente
  // action
  actionType: ActionType | null;
  actionDeviceId: string;
  // name
  name: string;
}

interface Props {
  devices: Device[];
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

function buildAutoName(state: WizardState, devices: Device[]): string {
  const action = state.actionType === 'turn_on' ? 'Accendi' : 'Spegni';
  const actionDev = devices.find((d) => d.id === state.actionDeviceId)?.name ?? 'Dispositivo';

  if (state.triggerType === 'schedule') {
    return `${action} ${actionDev} alle ${state.scheduleTime || '00:00'}`;
  }
  if (state.triggerType === 'motion') {
    const motionDev = devices.find((d) => d.id === state.motionDeviceId)?.name ?? 'Sensore';
    return `Movimento ${motionDev} → ${action} ${actionDev}`;
  }
  if (state.triggerType === 'manual') {
    return `Manuale → ${action} ${actionDev}`;
  }
  return 'Nuova Automazione';
}

function buildCron(time: string, days: boolean[]): string {
  const [hh, mm] = time.split(':').map(Number);
  const h = isNaN(hh) ? 0 : hh;
  const m = isNaN(mm) ? 0 : mm;

  // ISO: 1=Mon … 7=Sun, but cron uses 0=Sun 1=Mon … 6=Sat
  // our days array: index 0=Mon … 6=Sun
  const selected = days
    .map((on, i) => (on ? (i + 1) % 7 : null)) // Mon→1, …, Sat→6, Sun→0
    .filter((v): v is number => v !== null);

  if (selected.length === 7 || selected.length === 0) {
    return `${m} ${h} * * *`;
  }
  if (
    selected.length === 5 &&
    [1, 2, 3, 4, 5].every((v) => selected.includes(v))
  ) {
    return `${m} ${h} * * 1-5`;
  }
  return `${m} ${h} * * ${selected.join(',')}`;
}

function buildPayload(state: WizardState): Record<string, unknown> {
  const actions = state.actionDeviceId && state.actionType
    ? [{ device_id: state.actionDeviceId, command: state.actionType }]
    : [];

  if (state.triggerType === 'schedule') {
    const cron = buildCron(state.scheduleTime, state.scheduleDays);
    return {
      name: state.name,
      trigger_type: 'schedule',
      trigger: { type: 'schedule', cron },
      actions,
      conditions: [],
    };
  }

  if (state.triggerType === 'motion') {
    return {
      name: state.name,
      trigger_type: 'device_state',
      trigger: {
        type: 'device_state',
        device_id: state.motionDeviceId,
        property: 'motion',
        operator: 'eq',
        value: state.motionValue,
      },
      actions,
      conditions: [],
    };
  }

  // manual
  return {
    name: state.name,
    trigger_type: 'bus_event',
    trigger: { type: 'bus_event', event: 'manual_trigger' },
    actions,
    conditions: [],
  };
}

function isStepValid(step: number, state: WizardState, devices: Device[]): boolean {
  if (step === 1) return !!state.triggerType;
  if (step === 2) {
    if (state.triggerType === 'schedule') return !!state.scheduleTime;
    if (state.triggerType === 'motion') return !!state.motionDeviceId;
    return true; // manual — no extra input
  }
  if (step === 3) return !!state.actionType && !!state.actionDeviceId;
  if (step === 4) return state.name.trim().length > 0;
  return false;
}

// Motion sensors: devices with motion in capability_timing or capabilities
function motionDevices(devices: Device[]): Device[] {
  return devices.filter(
    (d) =>
      d.capability_timing?.motion === 'realtime' ||
      d.capabilities.includes('motion'),
  );
}

// Switchable devices: relay, switch
function switchDevices(devices: Device[]): Device[] {
  return devices.filter(
    (d) =>
      d.type === 'switch_relay' ||
      d.type.includes('switch') ||
      d.capabilities.includes('switch'),
  );
}

export default function AutomationWizard({ devices, onSave, onClose }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<WizardState>({
    triggerType: null,
    scheduleTime: '23:00',
    scheduleDays: [true, true, true, true, true, true, true],
    motionDeviceId: '',
    motionValue: true,
    actionType: null,
    actionDeviceId: '',
    name: '',
  });

  function update(patch: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...patch }));
  }

  function handleNext() {
    if (step === 2 && state.triggerType === 'manual') {
      // skip to step 3
      setStep(3);
      return;
    }
    setStep((s) => s + 1);
  }

  function handleBack() {
    if (step === 3 && state.triggerType === 'manual') {
      setStep(1);
      return;
    }
    setStep((s) => s - 1);
  }

  // Auto-fill name when reaching step 4
  function handleNextToStep4() {
    const autoName = buildAutoName(state, devices);
    update({ name: autoName });
    setStep(4);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload(state);
      await onSave(payload);
    } catch {
      setError(AUTOMATION_COPY.saveError);
      setSaving(false);
    }
  }

  const sensors = motionDevices(devices);
  const switches = switchDevices(devices);
  const valid = isStepValid(step, state, devices);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-0 md:p-4">
      <div className="w-full max-w-sm bg-hub-surface rounded-t-2xl md:rounded-2xl border border-hub-border shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-hub-border">
          <span className="font-semibold text-hub-text">{AUTOMATION_COPY.wizardTitle}</span>
          <button onClick={onClose} className="text-hub-muted hover:text-hub-text text-lg leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4 min-h-[200px]">
          {/* Step 1 — Trigger type */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-hub-text">{AUTOMATION_COPY.step1Title}</p>
              {(
                [
                  { key: 'schedule', label: AUTOMATION_COPY.triggerSchedule, icon: '🕐' },
                  { key: 'motion', label: AUTOMATION_COPY.triggerMotion, icon: '🚶' },
                  { key: 'manual', label: AUTOMATION_COPY.triggerManual, icon: '✋' },
                ] as const
              ).map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => update({ triggerType: key })}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left text-sm transition-colors ${
                    state.triggerType === key
                      ? 'border-hub-accent bg-hub-accent/10 text-hub-accent'
                      : 'border-hub-border text-hub-text hover:bg-hub-border/30'
                  }`}
                >
                  <span className="text-xl">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Step 2 — Event details */}
          {step === 2 && state.triggerType === 'schedule' && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-hub-text">{AUTOMATION_COPY.step2Title}</p>
              <div>
                <label className="text-xs text-hub-muted block mb-1">Orario</label>
                <input
                  type="time"
                  value={state.scheduleTime}
                  onChange={(e) => update({ scheduleTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-hub-border bg-hub-bg text-hub-text text-sm focus:outline-none focus:border-hub-accent"
                />
              </div>
              <div>
                <label className="text-xs text-hub-muted block mb-2">Giorni</label>
                <div className="flex gap-1">
                  {AUTOMATION_COPY.days.map((day, i) => (
                    <button
                      key={day}
                      onClick={() => {
                        const next = [...state.scheduleDays];
                        next[i] = !next[i];
                        update({ scheduleDays: next });
                      }}
                      className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                        state.scheduleDays[i]
                          ? 'bg-hub-accent text-white'
                          : 'bg-hub-border/30 text-hub-muted'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && state.triggerType === 'motion' && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-hub-text">{AUTOMATION_COPY.step2Title}</p>
              {sensors.length === 0 ? (
                <p className="text-xs text-hub-muted">Nessun sensore di movimento disponibile.</p>
              ) : (
                <div className="space-y-2">
                  {sensors.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => update({ motionDeviceId: d.id })}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-colors ${
                        state.motionDeviceId === d.id
                          ? 'border-hub-accent bg-hub-accent/10 text-hub-accent'
                          : 'border-hub-border text-hub-text hover:bg-hub-border/30'
                      }`}
                    >
                      <span>{d.name}</span>
                      {d.room_id && <span className="text-xs text-hub-muted">{d.room_id}</span>}
                    </button>
                  ))}
                </div>
              )}
              {state.motionDeviceId && (
                <div>
                  <label className="text-xs text-hub-muted block mb-2">Quando il movimento è</label>
                  <div className="flex gap-2">
                    {(
                      [
                        { value: true, label: 'Rilevato' },
                        { value: false, label: 'Assente' },
                      ] as const
                    ).map(({ value, label }) => (
                      <button
                        key={String(value)}
                        onClick={() => update({ motionValue: value })}
                        className={`flex-1 py-2 rounded-lg border text-sm transition-colors ${
                          state.motionValue === value
                            ? 'border-hub-accent bg-hub-accent/10 text-hub-accent'
                            : 'border-hub-border text-hub-muted hover:bg-hub-border/30'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Action */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-hub-text">{AUTOMATION_COPY.step3Title}</p>
              <div className="flex gap-2">
                {(
                  [
                    { key: 'turn_on', label: AUTOMATION_COPY.actionTurnOn, icon: '💡' },
                    { key: 'turn_off', label: AUTOMATION_COPY.actionTurnOff, icon: '🌑' },
                  ] as const
                ).map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => update({ actionType: key })}
                    className={`flex-1 flex flex-col items-center gap-1 px-3 py-3 rounded-lg border text-xs transition-colors ${
                      state.actionType === key
                        ? 'border-hub-accent bg-hub-accent/10 text-hub-accent'
                        : 'border-hub-border text-hub-text hover:bg-hub-border/30'
                    }`}
                  >
                    <span className="text-xl">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>

              {state.actionType && (
                <div className="space-y-2">
                  <p className="text-xs text-hub-muted">Quale dispositivo?</p>
                  {switches.length === 0 ? (
                    <p className="text-xs text-hub-muted">Nessun dispositivo controllabile.</p>
                  ) : (
                    switches.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => update({ actionDeviceId: d.id })}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-colors ${
                          state.actionDeviceId === d.id
                            ? 'border-hub-accent bg-hub-accent/10 text-hub-accent'
                            : 'border-hub-border text-hub-text hover:bg-hub-border/30'
                        }`}
                      >
                        <span>{d.name}</span>
                        {d.room_id && <span className="text-xs text-hub-muted">{d.room_id}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4 — Name */}
          {step === 4 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-hub-text">{AUTOMATION_COPY.step4Title}</p>
              <input
                type="text"
                value={state.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Nome automazione"
                className="w-full px-3 py-2 rounded-lg border border-hub-border bg-hub-bg text-hub-text text-sm focus:outline-none focus:border-hub-accent"
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="flex-1 py-2 rounded-lg border border-hub-border text-hub-text text-sm hover:bg-hub-border/30 transition-colors"
            >
              {AUTOMATION_COPY.back}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-hub-border text-hub-muted text-sm hover:bg-hub-border/30 transition-colors"
            >
              {AUTOMATION_COPY.cancel}
            </button>
          )}

          {step < 4 ? (
            <button
              disabled={!valid}
              onClick={step === 3 ? handleNextToStep4 : handleNext}
              className="flex-1 py-2 rounded-lg bg-hub-accent text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {AUTOMATION_COPY.next}
            </button>
          ) : (
            <button
              disabled={!valid || saving}
              onClick={handleSave}
              className="flex-1 py-2 rounded-lg bg-hub-accent text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {saving ? 'Salvataggio…' : AUTOMATION_COPY.save}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
