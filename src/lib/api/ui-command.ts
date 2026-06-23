'use client';

import { fetchAPI } from './client';

export type UiCommandResponse = {
  status?: string;
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
  };
  results?: unknown[];
};

type UiCommandPayload = {
  device_id: string;
  action: string;
  params?: Record<string, unknown>;
};

export async function executeUiCommand(
  projectId: string,
  payload: UiCommandPayload,
): Promise<UiCommandResponse> {
  const pid = projectId.trim();
  if (!pid) throw new Error('PROJECT_REQUIRED');

  const deviceId = payload.device_id.trim();
  if (!deviceId) throw new Error('DEVICE_ID_REQUIRED');

  const action = payload.action.trim();
  if (!action) throw new Error('COMMAND_REQUIRED');

  const params =
    payload.params && typeof payload.params === 'object' && !Array.isArray(payload.params)
      ? payload.params
      : {};

  return fetchAPI<UiCommandResponse>(
    `/api/brain/projects/${encodeURIComponent(pid)}/actions/ui-command`,
    {
      method: 'POST',
      body: JSON.stringify({
        device_id: deviceId,
        action,
        params,
      }),
    },
  );
}
