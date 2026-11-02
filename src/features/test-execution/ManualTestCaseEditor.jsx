import React, { useEffect, useState } from 'react';

const EMPTY_FORM = {
  name: '',
  endpointId: '',
  scenarioType: 'Positive',
  expectedStatus: '200',
  requestBody: '',
};

function validateForm(form) {
  const errors = {};
  const expectedStatus = Number(form.expectedStatus);

  if (!form.name.trim()) errors.name = 'Enter a test case name.';
  if (!form.endpointId) errors.endpointId = 'Select an API endpoint.';
  if (!Number.isInteger(expectedStatus) || expectedStatus < 100 || expectedStatus > 599) {
    errors.expectedStatus = 'Enter a whole HTTP status code from 100 to 599.';
  }

  if (form.requestBody.trim()) {
    try {
      JSON.parse(form.requestBody);
    } catch {
      errors.requestBody = 'The request body must contain valid JSON.';
    }
  }

  return errors;
}

export default function ManualTestCaseEditor({
  open,
  endpoints = [],
  initialValue = null,
  onSave,
  onCancel,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(initialValue ? {
        name: initialValue.name || '',
        endpointId: initialValue.endpointId || '',
        scenarioType: initialValue.scenarioType || 'Positive',
        expectedStatus: String(initialValue.expectedStatus ?? 200),
        requestBody: initialValue.requestBody || '',
      } : {
        ...EMPTY_FORM,
        endpointId: endpoints[0]?.id || '',
      });
      setErrors({});
    }
  }, [open, initialValue, endpoints]);

  if (!open) return null;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationErrors = validateForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    onSave?.({
      ...initialValue,
      ...form,
      expectedStatus: Number(form.expectedStatus),
      enabled: initialValue?.enabled ?? true,
    });
  };

  return (
    <div className="te-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel?.();
    }}>
      <section className="te-modal" role="dialog" aria-modal="true" aria-labelledby="te-editor-title">
        <div className="te-modal-heading">
          <div>
            <span className="te-eyebrow">TEST CASE MANAGEMENT</span>
            <h2 id="te-editor-title">{initialValue ? 'Edit test case' : 'Create manual test case'}</h2>
            <p>Add the scenario and expected response for this endpoint.</p>
          </div>
          <button className="te-icon-button" type="button" onClick={onCancel} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="te-modal-body">
            <label className="te-field">
              <span>Test case name <b>*</b></span>
              <input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="e.g. Create product successfully" />
              {errors.name && <small className="te-error-text">{errors.name}</small>}
            </label>

            <div className="te-form-grid">
              <label className="te-field">
                <span>API endpoint <b>*</b></span>
                <select value={form.endpointId} onChange={(event) => updateField('endpointId', event.target.value)}>
                  <option value="">Select endpoint</option>
                  {endpoints.map((endpoint) => (
                    <option value={endpoint.id} key={endpoint.id}>{endpoint.method} {endpoint.path}</option>
                  ))}
                </select>
                {errors.endpointId && <small className="te-error-text">{errors.endpointId}</small>}
              </label>

              <label className="te-field">
                <span>Scenario type</span>
                <select value={form.scenarioType} onChange={(event) => updateField('scenarioType', event.target.value)}>
                  <option>Positive</option>
                  <option>Negative</option>
                  <option>Boundary</option>
                  <option>Security</option>
                </select>
              </label>
            </div>

            <label className="te-field te-status-field">
              <span>Expected HTTP status <b>*</b></span>
              <input type="number" min="100" max="599" step="1" value={form.expectedStatus} onChange={(event) => updateField('expectedStatus', event.target.value)} />
              {errors.expectedStatus && <small className="te-error-text">{errors.expectedStatus}</small>}
              <small>Use a valid HTTP status code between 100 and 599.</small>
            </label>

            <label className="te-field">
              <span>JSON request body <small>(optional)</small></span>
              <textarea className="te-code-input" rows="7" spellCheck="false" value={form.requestBody} onChange={(event) => updateField('requestBody', event.target.value)} placeholder={'{\n  "name": "Sample product",\n  "price": 2500\n}'} />
              {errors.requestBody && <small className="te-error-text">{errors.requestBody}</small>}
              <small>For GET and HEAD requests, the browser runner does not send a request body.</small>
            </label>
          </div>

          <div className="te-modal-actions">
            <button className="te-button te-button-secondary" type="button" onClick={onCancel}>Cancel</button>
            <button className="te-button te-button-primary" type="submit">{initialValue ? 'Save changes' : 'Save test case'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
