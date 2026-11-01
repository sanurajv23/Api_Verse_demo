// Sprint 1 uses a browser-only demo store, NOT a database or an auth provider.
export const STORAGE_KEY = 'api-verse-sprint1-v1';
export const uid = () => Math.random().toString(36).slice(2, 10);
export const now = () => new Date().toISOString();

export function seedData() {
  return {
    projects: [
      {
        id: 'milta', name: 'Milta POS', description: 'Point-of-sale API verification project',
        baseUrl: 'https://staging.example.com/api', owner: 'owner@demo.test', createdAt: '2026-10-01',
        endpoints: [
          { id: 'e1', method: 'POST', path: '/auth/login', summary: 'Authenticate user login' },
          { id: 'e2', method: 'GET', path: '/products', summary: 'List inventory products' },
          { id: 'e3', method: 'POST', path: '/products', summary: 'Create a product' },
          { id: 'e4', method: 'GET', path: '/orders', summary: 'View sales orders' },
          { id: 'e5', method: 'POST', path: '/orders', summary: 'Create a sale order' }
        ],
        requirements: [
          { id: 'r1', text: 'Staff must be able to log in to the system.', mappingId: 'e1', suggestionId: '', source: 'Sample PRD' },
          { id: 'r2', text: 'The system should display available products.', mappingId: 'e2', suggestionId: '', source: 'Sample PRD' },
          { id: 'r3', text: 'Cashiers must create sales orders.', mappingId: 'e5', suggestionId: '', source: 'Sample PRD' },
          { id: 'r4', text: 'Customers can request a refund.', mappingId: '', suggestionId: '', source: 'Sample PRD' }
        ],
        cases: [], runs: [], profiles: [{ id: 'a1', name: 'Staging — No auth', type: 'None' }],
        members: [
          { id: 'm1', email: 'owner@demo.test', role: 'Owner', status: 'Active' },
          { id: 'm2', email: 'arish@demo.test', role: 'Analyst', status: 'Active' }
        ]
      }
    ]
  };
}

export function loadData() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return stored && Array.isArray(stored.projects) ? stored : seedData();
  } catch { return seedData(); }
}
export function saveData(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
export function coverage(project) {
  const total = project.requirements.length;
  const mapped = project.requirements.filter(r => r.mappingId).length;
  return { total, mapped, missing: total - mapped, percent: total ? Math.round(mapped / total * 100) : 0 };
}
export function expectedStatus(method) { return ({ POST: 201, DELETE: 204 })[method] || 200; }

// Supports small OpenAPI and Postman JSON examples; not full schema validation.
export function extractEndpoints(raw) {
  let doc;
  try { doc = JSON.parse(raw); } catch { throw new Error('Import a valid OpenAPI or Postman JSON file.'); }
  const result = [];
  if (doc.paths && typeof doc.paths === 'object') {
    Object.entries(doc.paths).forEach(([path, verbs]) => {
      Object.entries(verbs || {}).forEach(([method, definition]) => {
        if (!['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) return;
        result.push({ id: uid(), method: method.toUpperCase(), path, summary: definition?.summary || definition?.operationId || path });
      });
    });
  } else if (doc.info && Array.isArray(doc.item)) {
    function walk(items) {
      items.forEach(item => {
        if (item.item) return walk(item.item);
        const method = (item.request?.method || 'GET').toUpperCase();
        const path = '/' + (item.request?.url?.path || []).join('/');
        if (path !== '/') result.push({ id: uid(), method, path, summary: item.name || path });
      });
    }
    walk(doc.item);
  } else throw new Error('No OpenAPI paths or Postman item list found.');
  if (!result.length) throw new Error('No supported endpoints found in this file.');
  return result;
}

export function extractRequirements(filename, raw) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (!['txt', 'md', 'csv', 'json'].includes(ext)) throw new Error('Sprint 1 supports TXT, MD, CSV and JSON. PDF/DOCX parsing comes later.');
  let lines;
  if (ext === 'json') {
    let data; try { data = JSON.parse(raw); } catch { throw new Error('Requirements JSON is invalid.'); }
    const arr = Array.isArray(data) ? data : data.requirements;
    if (!Array.isArray(arr)) throw new Error('JSON must contain a list of requirements.');
    lines = arr.map(item => typeof item === 'string' ? item : (item.text || item.description || ''));
  } else lines = raw.split(/\r?\n/).map(x => x.replace(/^[-*#\s\d.]+/, '').replace(/^"|"$/g, ''));
  return lines.map(x => x.trim()).filter(x => x.length > 8).slice(0, 150).map(text => ({ id: uid(), text, mappingId: '', suggestionId: '', source: filename }));
}

const STOP = new Set('the and for with from this that shall should able must have into api system user users can will be is are an a to of by on in as at data all'.split(' '));
const tokens = str => new Set((str || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w.length > 2 && !STOP.has(w)));
export function suggestion(req, endpoints) {
  const a = tokens(req.text); let best = null; let score = 0;
  for (const end of endpoints) {
    const b = tokens(end.path + ' ' + end.summary);
    const n = [...a].filter(x => b.has(x)).length;
    if (n > score) { score = n; best = end.id; }
  }
  return score ? best : '';
}

function quoteCsv(value) { return '"' + String(value ?? '').replace(/"/g, '""') + '"'; }
export function csv(rows) { return rows.map(row => row.map(quoteCsv).join(',')).join('\r\n'); }
export function download(name, text, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type: mime }); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
