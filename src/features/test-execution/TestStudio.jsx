import React, { useMemo, useState } from 'react';
import ManualTestCaseEditor from './ManualTestCaseEditor.jsx';
import RunConfirmationDialog from './RunConfirmationDialog.jsx';
import { runBrowserTests } from './BrowserTestRunner.js';

const METHOD_ORDER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function StatusBadge({ value }) {
  const status = String(value || 'NOT RUN').toUpperCase();
  const className = status === 'PASSED' ? 'passed'
    : status === 'FAILED' ? 'failed'
      : status === 'ERROR' ? 'error'
        : status === 'SKIPPED' ? 'skipped' : 'idle';
  return <span className={`te-status te-status-${className}`}>{status}</span>;
}

function MethodBadge({ method }) {
  const value = String(method || 'GET').toUpperCase();
  return <span className={`te-method te-method-${value.toLowerCase()}`}>{value}</span>;
}

function getEndpoint(endpoints, endpointId) {
  return endpoints.find((endpoint) => endpoint.id === endpointId);
}

function getEndpointTag(endpoint) {
  if (!endpoint) return 'Other';
  if (endpoint.tag) return endpoint.tag;
  if (Array.isArray(endpoint.tags) && endpoint.tags.length > 0) return endpoint.tags[0];
  if (endpoint.group) return endpoint.group;
  return endpoint.path?.split('/').filter(Boolean)[0] || 'Other';
}

function normalizeTestCase(testCase) {
  return {
    ...testCase,
    expectedStatus: Number(testCase.expectedStatus ?? testCase.expected ?? 200),
    requestBody: testCase.requestBody || '',
    scenarioType: testCase.scenarioType || 'Positive',
    enabled: testCase.enabled !== false,
  };
}

export default function TestStudio({
  initialEndpoints = [],
  initialTestCases = [],
  environments = [],
  authProfiles = [],
  onTestCasesChange,
  onRunComplete,
}) {
  const [testCases, setTestCases] = useState(() => initialTestCases.map(normalizeTestCase));
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('ALL');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState('cases');

  const tags = useMemo(() => {
    return [...new Set(initialEndpoints.map(getEndpointTag))].sort();
  }, [initialEndpoints]);

  const filteredCases = useMemo(() => {
    const query = search.trim().toLowerCase();
    return testCases.filter((testCase) => {
      const endpoint = getEndpoint(initialEndpoints, testCase.endpointId);
      const searchText = [
        testCase.name,
        testCase.scenarioType,
        endpoint?.method,
        endpoint?.path,
        getEndpointTag(endpoint),
      ].join(' ').toLowerCase();
      const matchesSearch = !query || searchText.includes(query);
      const matchesTag = tagFilter === 'ALL' || (endpoint?.tag || 'Other') === tagFilter;
      return matchesSearch && matchesTag;
    });
  }, [testCases, initialEndpoints, search, tagFilter]);

  const groupedCases = useMemo(() => {
    return filteredCases.reduce((groups, testCase) => {
      const endpoint = getEndpoint(initialEndpoints, testCase.endpointId);
      const tag = getEndpointTag(endpoint);
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push(testCase);
      return groups;
    }, {});
  }, [filteredCases, initialEndpoints]);

  const latestByCaseId = useMemo(() => {
    const map = {};
    results.forEach((result) => { map[result.testCaseId] = result; });
    return map;
  }, [results]);

  const resultCounts = useMemo(() => results.reduce((counts, result) => {
    const key = result.result.toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, { passed: 0, failed: 0, error: 0, skipped: 0 }), [results]);

  const updateCases = (nextCases) => {
    setTestCases(nextCases);
    onTestCasesChange?.(nextCases);
  };

  const openCreateEditor = () => {
    setEditingCase(null);
    setEditorOpen(true);
  };

  const openEditEditor = (testCase) => {
    setEditingCase(testCase);
    setEditorOpen(true);
  };

  const saveTestCase = (formData) => {
    const existing = testCases.some((item) => item.id === formData.id);
    const savedCase = {
      ...formData,
      id: formData.id || (globalThis.crypto?.randomUUID?.() || `case-${Date.now()}`),
    };
    const nextCases = existing
      ? testCases.map((item) => item.id === savedCase.id ? savedCase : item)
      : [...testCases, savedCase];

    updateCases(nextCases);
    setEditorOpen(false);
    setEditingCase(null);
    setNotice(existing ? 'Test case updated.' : 'Manual test case added.');
  };

  const deleteTestCase = (testCase) => {
    const confirmed = window.confirm(`Delete "${testCase.name}"?`);
    if (!confirmed) return;
    updateCases(testCases.filter((item) => item.id !== testCase.id));
    setSelectedIds((current) => current.filter((id) => id !== testCase.id));
    setNotice('Test case deleted.');
  };

  const toggleSelected = (id) => {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  };

  const selectAllVisible = () => {
    const visibleIds = filteredCases.map((item) => item.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((current) => current.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((current) => [...new Set([...current, ...visibleIds])]);
    }
  };

  const startSelectedRun = () => {
    if (selectedIds.length === 0) {
      setNotice('Select at least one test case before running.');
      return;
    }
    setConfirmationOpen(true);
  };

  const confirmRun = async ({ environment, authProfile }) => {
    const selectedCases = testCases.filter((item) => selectedIds.includes(item.id));
    setConfirmationOpen(false);
    setIsRunning(true);
    setActiveTab('results');
    setProgress({ completed: 0, total: selectedCases.length });
    setNotice('');

    try {
      const runResults = await runBrowserTests({
        testCases: selectedCases,
        endpoints: initialEndpoints,
        baseUrl: environment.baseUrl,
        authProfile,
        timeoutMs: 10000,
        onProgress: (_result, completed, total) => setProgress({ completed, total }),
      });
      setResults(runResults);
      onRunComplete?.(runResults, { environment, authProfile });
      setNotice('Browser test run completed. Review the results below.');
    } catch (error) {
      setNotice(error?.message || 'The test run could not be completed.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="te-page">
      <header className="te-page-header">
        <div>
          <span className="te-eyebrow">API-VERSE / TEST EXECUTION</span>
          <h1>Test Studio</h1>
          <p>Review endpoint scenarios, create manual tests and run selected cases.</p>
        </div>
        <div className="te-header-actions">
          <button className="te-button te-button-secondary" type="button" onClick={openCreateEditor}>＋ Manual test</button>
          <button className="te-button te-button-primary" type="button" onClick={startSelectedRun} disabled={isRunning}>▶ Run selected ({selectedIds.length})</button>
        </div>
      </header>

      <section className="te-summary-grid" aria-label="Test execution counters">
        <div className="te-summary-card"><span>Total test cases</span><strong>{testCases.length}</strong></div>
        <div className="te-summary-card"><span>Passed</span><strong className="te-count-passed">{resultCounts.passed}</strong></div>
        <div className="te-summary-card"><span>Failed</span><strong className="te-count-failed">{resultCounts.failed}</strong></div>
        <div className="te-summary-card"><span>Errors / skipped</span><strong>{resultCounts.error + resultCounts.skipped}</strong></div>
      </section>

      <div className="te-toolbar">
        <div className="te-search-wrap">
          <span aria-hidden="true">⌕</span>
          <input aria-label="Search test cases" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search test case or endpoint..." />
        </div>
        <select aria-label="Filter by endpoint tag" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
          <option value="ALL">All endpoint tags</option>
          {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
        </select>
        <button className="te-button te-button-quiet" type="button" onClick={selectAllVisible}>
          {filteredCases.length > 0 && filteredCases.every((item) => selectedIds.includes(item.id)) ? 'Clear selection' : 'Select visible'}
        </button>
      </div>

      {notice && <div className="te-notice" role="status">{notice}</div>}

      <div className="te-tabs" role="tablist" aria-label="Test Studio sections">
        <button type="button" role="tab" aria-selected={activeTab === 'cases'} className={activeTab === 'cases' ? 'active' : ''} onClick={() => setActiveTab('cases')}>Test cases</button>
        <button type="button" role="tab" aria-selected={activeTab === 'results'} className={activeTab === 'results' ? 'active' : ''} onClick={() => setActiveTab('results')}>Latest run results</button>
      </div>

      {activeTab === 'cases' ? (
        <div className="te-content-card">
          {Object.keys(groupedCases).length === 0 ? (
            <div className="te-empty-state">
              <span>◇</span>
              <h3>No test cases found</h3>
              <p>Create a manual test case or change your search and filter.</p>
              <button className="te-button te-button-primary" type="button" onClick={openCreateEditor}>Create manual test</button>
            </div>
          ) : Object.entries(groupedCases).map(([tag, groupCases]) => (
            <section className="te-endpoint-group" key={tag}>
              <div className="te-group-heading"><span className="te-group-dot" />{tag}<span>{groupCases.length} test case{groupCases.length === 1 ? '' : 's'}</span></div>
              <div className="te-table-scroll">
                <table className="te-table">
                  <thead>
                    <tr>
                      <th className="te-check-cell"><span className="te-visually-hidden">Select</span></th>
                      <th>Test scenario</th>
                      <th>Endpoint</th>
                      <th>Expected</th>
                      <th>Actual</th>
                      <th>Result</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupCases.map((testCase) => {
                      const endpoint = getEndpoint(initialEndpoints, testCase.endpointId);
                      const result = latestByCaseId[testCase.id];
                      return (
                        <tr key={testCase.id}>
                          <td className="te-check-cell"><input type="checkbox" checked={selectedIds.includes(testCase.id)} onChange={() => toggleSelected(testCase.id)} aria-label={`Select ${testCase.name}`} /></td>
                          <td><strong>{testCase.name}</strong><small className="te-subtext">{testCase.scenarioType || 'Manual'} scenario</small></td>
                          <td>{endpoint ? <><MethodBadge method={endpoint.method} /><span className="te-path">{endpoint.path}</span></> : <span className="te-muted">Endpoint unavailable</span>}</td>
                          <td><span className="te-code">{testCase.expectedStatus}</span></td>
                          <td><span className="te-code">{result?.actualStatus ?? '—'}</span></td>
                          <td><StatusBadge value={result?.result || 'NOT RUN'} /></td>
                          <td><div className="te-row-actions">
                            <button type="button" onClick={() => openEditEditor(testCase)}>Edit</button>
                            <button type="button" className="te-delete-action" onClick={() => deleteTestCase(testCase)}>Delete</button>
                          </div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="te-content-card">
          <div className="te-results-heading">
            <div><h2>Latest browser run</h2><p>{results.length ? `${results.length} request(s) completed` : 'No test run has been completed yet.'}</p></div>
            {isRunning && <span className="te-running-label">Running {progress.completed} of {progress.total}…</span>}
          </div>
          {isRunning && <div className="te-progress-track"><span style={{ width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%` }} /></div>}
          {results.length === 0 ? <div className="te-empty-state compact"><span>◷</span><h3>No execution results</h3><p>Select test cases and start a run to view expected and actual responses.</p></div> : (
            <div className="te-table-scroll">
              <table className="te-table">
                <thead><tr><th>Test case</th><th>Endpoint</th><th>Expected</th><th>Actual</th><th>Result</th><th>Latency</th><th>Message / response</th></tr></thead>
                <tbody>{results.map((result) => (
                  <tr key={`${result.testCaseId}-${result.finishedAt}`}>
                    <td><strong>{result.testName}</strong></td>
                    <td><span className="te-code">{result.method} {result.endpoint}</span></td>
                    <td>{result.expectedStatus}</td>
                    <td>{result.actualStatus ?? '—'}</td>
                    <td><StatusBadge value={result.result} /></td>
                    <td>{result.durationMs} ms</td>
                    <td className="te-message-cell"><span>{result.message}</span>{result.responsePreview && <details className="te-response-details"><summary>View response</summary><pre>{result.responsePreview}</pre></details>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="te-footer-note"><strong>Prototype note:</strong> Runs are sent from the browser. Some APIs may reject browser requests because of CORS settings. The current runner does not save results to a backend.</div>

      <ManualTestCaseEditor
        open={editorOpen}
        endpoints={initialEndpoints}
        initialValue={editingCase}
        onCancel={() => { setEditorOpen(false); setEditingCase(null); }}
        onSave={saveTestCase}
      />

      <RunConfirmationDialog
        open={confirmationOpen}
        selectedTestCases={testCases.filter((item) => selectedIds.includes(item.id))}
        endpoints={initialEndpoints}
        environments={environments}
        authProfiles={authProfiles}
        onCancel={() => setConfirmationOpen(false)}
        onConfirm={confirmRun}
      />
    </div>
  );
}
