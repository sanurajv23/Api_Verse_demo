import React, { useEffect, useMemo, useState } from 'react';
import { MUTATING_METHODS } from './BrowserTestRunner.js';

export default function RunConfirmationDialog({
  open,
  selectedTestCases = [],
  endpoints = [],
  environments = [],
  authProfiles = [],
  onConfirm,
  onCancel,
}) {
  const [environmentId, setEnvironmentId] = useState('');
  const [profileId, setProfileId] = useState('');
  const [allowWriteOperations, setAllowWriteOperations] = useState(false);

  useEffect(() => {
    if (open) {
      setEnvironmentId(environments[0]?.id || '');
      setProfileId(authProfiles[0]?.id || '');
      setAllowWriteOperations(false);
    }
  }, [open, environments, authProfiles]);

  const operationCounts = useMemo(() => {
    return selectedTestCases.reduce((counts, testCase) => {
      const endpoint = endpoints.find((item) => item.id === testCase.endpointId);
      const method = String(endpoint?.method || '').toUpperCase();
      if (MUTATING_METHODS.has(method)) counts.write += 1;
      else counts.read += 1;
      return counts;
    }, { read: 0, write: 0 });
  }, [selectedTestCases, endpoints]);

  if (!open) return null;

  const selectedEnvironment = environments.find((item) => item.id === environmentId);
  const selectedProfile = authProfiles.find((item) => item.id === profileId) || null;
  const hasWriteOperations = operationCounts.write > 0;
  const canRun = Boolean(selectedEnvironment?.baseUrl) && (!hasWriteOperations || allowWriteOperations);

  return (
    <div className="te-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel?.();
    }}>
      <section className="te-modal te-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="te-confirm-title">
        <div className="te-modal-heading">
          <div>
            <span className="te-eyebrow">TEST EXECUTION</span>
            <h2 id="te-confirm-title">Confirm test run</h2>
            <p>Review the target and selected operations before sending requests.</p>
          </div>
          <button className="te-icon-button" type="button" onClick={onCancel} aria-label="Close">×</button>
        </div>

        <div className="te-modal-body">
          <div className="te-run-summary">
            <div><strong>{selectedTestCases.length}</strong><span>Selected tests</span></div>
            <div><strong>{operationCounts.read}</strong><span>Read-only</span></div>
            <div><strong>{operationCounts.write}</strong><span>Write operations</span></div>
          </div>

          <label className="te-field">
            <span>Target environment <b>*</b></span>
            <select value={environmentId} onChange={(event) => setEnvironmentId(event.target.value)}>
              {environments.map((environment) => (
                <option key={environment.id} value={environment.id}>{environment.name}</option>
              ))}
            </select>
            {selectedEnvironment?.baseUrl && <small className="te-mono">{selectedEnvironment.baseUrl}</small>}
            {!selectedEnvironment?.baseUrl && <small className="te-error-text">This environment needs a base URL before requests can run.</small>}
          </label>

          <label className="te-field">
            <span>Run as authentication profile</span>
            <select value={profileId} onChange={(event) => setProfileId(event.target.value)}>
              <option value="">No authentication profile</option>
              {authProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.name}</option>
              ))}
            </select>
          </label>

          {hasWriteOperations && (
            <label className="te-write-warning">
              <input type="checkbox" checked={allowWriteOperations} onChange={(event) => setAllowWriteOperations(event.target.checked)} />
              <span>
                <strong>Allow write operations</strong>
                <small>This selection includes POST, PUT, PATCH or DELETE requests. I understand these requests may change data in the selected environment.</small>
              </span>
            </label>
          )}

          <div className="te-info-note">
            <strong>Browser runner prototype</strong>
            <span>Each request has a 10-second timeout. The browser may block cross-origin requests if the API does not allow CORS.</span>
          </div>
        </div>

        <div className="te-modal-actions">
          <button className="te-button te-button-secondary" type="button" onClick={onCancel}>Cancel</button>
          <button className="te-button te-button-primary" type="button" disabled={!canRun} onClick={() => onConfirm?.({ environment: selectedEnvironment, authProfile: selectedProfile })}>Confirm and run</button>
        </div>
      </section>
    </div>
  );
}
