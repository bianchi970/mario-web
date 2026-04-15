export const SCENARIO_COPY = {
  pageTitle: 'Scenari',
  createTitle: 'Crea scenario da linguaggio naturale',
  createExample: 'Esempio: alle 22 chiudi le tapparelle zona notte',
  createPlaceholder: 'Scrivi lo scenario...',
  createButton: 'Crea scenario',
  creatingButton: 'Creazione...',
  successPrefix: 'Scenario creato:',
  genericError: 'Creazione scenario fallita.',
  invalidJson: 'Il Brain ha risposto con un formato non valido.',
  authRequired: 'Autenticazione richiesta.',
  noActiveProject: 'Nessun progetto attivo disponibile.',
  projectNotFound: 'Il progetto selezionato non esiste.',
  upstreamUnavailable: 'Brain non raggiungibile.',
  forbiddenPayload: 'Il client ha bloccato un payload scenario non consentito.',
  legacyPathRemoved: 'Il client ha bloccato un percorso scenario legacy non piu supportato.',
  toggleFailed: 'Aggiornamento scenario fallito.',
  deleteFailed: 'Eliminazione scenario fallita.',
  unexpectedError: 'Errore imprevisto.',
  listTitle: 'Scenari salvati',
  listDescription: 'Elenco reale dal sistema.',
  listRefresh: 'Aggiorna lista',
  listRefreshing: 'Aggiornamento...',
  listName: 'Nome',
  listStatus: 'Stato',
  listTrigger: 'Attivazione',
  listUpdated: 'Aggiornato',
  listActions: 'Azioni',
  listEnabled: 'Attivo',
  listDisabled: 'Disattivo',
  listEnable: 'Abilita',
  listDisable: 'Disabilita',
  listDelete: 'Elimina',
  listEmpty: 'Nessuno scenario salvato.',
  confirmationTitle: 'Conferma richiesta',
  confirmationMissingPrefix: 'Il Brain non ha salvato nulla. Mancano:',
  confirmationOriginalText: 'Testo originale',
  confirmationOutcomePlaceholder: 'es. chiudi le tapparelle zona notte',
  confirmationSending: 'Invio...',
  confirmationButton: 'Conferma e crea',
  confirmationTime: 'Orario',
  confirmationOutcome: 'Azione da eseguire',
  auditTitle: 'Audit scenari',
  auditDescription: 'Esiti reali del Brain.',
  auditLastUpdated: 'Ultimo aggiornamento:',
  auditRefresh: 'Aggiorna audit',
  auditRefreshing: 'Aggiornamento...',
  auditScenario: 'Scenario',
  auditStatus: 'Stato',
  auditReason: 'Motivo',
  auditWhen: 'Quando',
  auditEmpty: 'Nessun evento audit disponibile. Aggiorna quando il Brain ha eseguito o bloccato uno scenario.',
  statusTriggered: 'Attivato',
  statusSkipped: 'Saltato',
  statusBlocked: 'Bloccato',
  statusExecuted: 'Eseguito',
  reasonPolicyBlocked: 'Bloccato da policy',
  reasonConflictingActions: 'Azioni in conflitto',
  reasonConditionFalse: 'Condizione non soddisfatta',
  reasonUnknown: 'Motivo non disponibile.',
  auditFailed: 'Impossibile recuperare gli esiti del Brain.',
  listFailed: 'Impossibile recuperare la lista scenari.',
  confirmationUnknownField: 'campo richiesto',
} as const;

export function formatScenarioError(error: string | undefined) {
  if (!error) return SCENARIO_COPY.genericError;
  if (error === 'invalid_json') return SCENARIO_COPY.invalidJson;
  if (error === 'AUTH_REQUIRED') return SCENARIO_COPY.authRequired;
  if (error === 'NO_ACTIVE_PROJECT') return SCENARIO_COPY.noActiveProject;
  if (error === 'PROJECT_NOT_FOUND') return SCENARIO_COPY.projectNotFound;
  if (error === 'UPSTREAM_UNAVAILABLE') return SCENARIO_COPY.upstreamUnavailable;
  if (error.startsWith('forbidden_client_payload:')) return SCENARIO_COPY.forbiddenPayload;
  if (error.startsWith('legacy_raw_scenarios_removed:')) return SCENARIO_COPY.legacyPathRemoved;
  if (error === 'toggle_failed' || error === 'scenario_update_failed') return SCENARIO_COPY.toggleFailed;
  if (error === 'delete_failed' || error === 'scenario_delete_failed') return SCENARIO_COPY.deleteFailed;
  if (error === 'scenario_audit_failed') return SCENARIO_COPY.auditFailed;
  if (error === 'scenario_list_failed') return SCENARIO_COPY.listFailed;
  return SCENARIO_COPY.genericError;
}

export function formatScenarioStatus(status?: string | null) {
  if (!status) return '-';

  const labels: Record<string, string> = {
    triggered: SCENARIO_COPY.statusTriggered,
    skipped: SCENARIO_COPY.statusSkipped,
    blocked: SCENARIO_COPY.statusBlocked,
    executed: SCENARIO_COPY.statusExecuted,
  };

  return labels[status] || status;
}

export function formatScenarioReason(reason?: string | null) {
  if (!reason) return '-';

  const labels: Record<string, string> = {
    policy_forbidden_action: SCENARIO_COPY.reasonPolicyBlocked,
    conflicting_device_actions: SCENARIO_COPY.reasonConflictingActions,
    condition_false: SCENARIO_COPY.reasonConditionFalse,
  };

  return labels[reason] || SCENARIO_COPY.reasonUnknown;
}
