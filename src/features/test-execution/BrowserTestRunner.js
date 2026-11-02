/**
 * Small browser-based API test runner prototype.
 * This is a frontend prototype. Browser CORS rules may block some APIs.
 */

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function makeResult(testCase, values = {}) {
  return {
    testCaseId: testCase.id,
    testName: testCase.name,
    endpoint: values.endpoint || '',
    method: values.method || '',
    expectedStatus: Number(testCase.expectedStatus ?? testCase.expected),
    actualStatus: values.actualStatus ?? null,
    result: values.result || 'ERROR',
    durationMs: values.durationMs ?? 0,
    message: values.message || '',
    responsePreview: values.responsePreview || '',
    finishedAt: new Date().toISOString(),
  };
}

function getAuthenticationHeaders(profile) {
  if (!profile) return {};

  // A profile can provide a ready-to-use header value, for example:
  // { headerName: 'Authorization', headerValue: 'Bearer <token>' }
  const headerName = profile.headerName || 'Authorization';
  const headerValue = profile.headerValue || profile.token || '';

  if (!headerValue) return {};

  const prefix = profile.prefix || '';
  return { [headerName]: `${prefix}${headerValue}` };
}

function buildRequestUrl(baseUrl, path) {
  const cleanBase = String(baseUrl || '').trim().replace(/\/+$/, '');
  const cleanPath = String(path || '').trim().replace(/^\/+/, '');
  if (!cleanBase) throw new Error('The selected environment does not have a base URL.');
  return `${cleanBase}/${cleanPath}`;
}

async function readResponsePreview(response) {
  try {
    const text = await response.text();
    return text.length > 1200 ? `${text.slice(0, 1200)}…` : text;
  } catch {
    return 'Response body could not be read.';
  }
}

/**
 * Executes selected test cases one by one in the browser.
 * @param {Object} options
 * @param {Array} options.testCases
 * @param {Array} options.endpoints
 * @param {string} options.baseUrl
 * @param {Object|null} options.authProfile
 * @param {number} [options.timeoutMs=10000]
 * @param {Function} [options.onProgress]
 * @returns {Promise<Array>} execution results
 */
export async function runBrowserTests({
  testCases = [],
  endpoints = [],
  baseUrl,
  authProfile = null,
  timeoutMs = 10000,
  onProgress,
}) {
  const results = [];

  for (let index = 0; index < testCases.length; index += 1) {
    const testCase = testCases[index];
    const endpoint = endpoints.find((item) => item.id === testCase.endpointId);

    if (testCase.enabled === false) {
      const skipped = makeResult(testCase, {
        result: 'SKIPPED',
        message: 'This test case is disabled.',
      });
      results.push(skipped);
      if (onProgress) onProgress(skipped, index + 1, testCases.length);
      continue;
    }

    if (!endpoint) {
      const skipped = makeResult(testCase, {
        result: 'SKIPPED',
        message: 'The related endpoint could not be found.',
      });
      results.push(skipped);
      if (onProgress) onProgress(skipped, index + 1, testCases.length);
      continue;
    }

    const method = String(endpoint.method || 'GET').toUpperCase();
    const path = endpoint.path || '';
    const startedAt = Date.now();
    const controller = new AbortController();
    let didTimeout = false;
    const timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeoutMs);

    try {
      const url = buildRequestUrl(baseUrl, path);
      const headers = {
        Accept: 'application/json',
        ...getAuthenticationHeaders(authProfile),
      };

      const requestOptions = {
        method,
        headers,
        signal: controller.signal,
        // Credentials are not sent automatically by this prototype.
        credentials: 'omit',
      };

      const requestBody = String(testCase.requestBody || '').trim();
      if (!['GET', 'HEAD'].includes(method) && requestBody) {
        headers['Content-Type'] = 'application/json';
        requestOptions.body = requestBody;
      }

      const response = await fetch(url, requestOptions);
      const responsePreview = await readResponsePreview(response);
      const durationMs = Date.now() - startedAt;
      const expectedStatus = Number(testCase.expectedStatus ?? testCase.expected);
      const passed = response.status === expectedStatus;

      results.push(makeResult(testCase, {
        endpoint: path,
        method,
        actualStatus: response.status,
        result: passed ? 'PASSED' : 'FAILED',
        durationMs,
        message: passed
          ? 'Actual status matches the expected status.'
          : `Expected ${expectedStatus}, but received ${response.status}.`,
        responsePreview,
      }));
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      let message = error?.message || 'The request could not be completed.';

      if (didTimeout || error?.name === 'AbortError') {
        message = `Request timed out after ${timeoutMs / 1000} seconds.`;
      } else if (error instanceof TypeError) {
        message = 'Network or CORS error. Check the URL and whether the API allows browser requests.';
      }

      results.push(makeResult(testCase, {
        endpoint: path,
        method,
        result: 'ERROR',
        durationMs,
        message,
      }));
    } finally {
      clearTimeout(timeoutId);
    }

    if (onProgress) onProgress(results[results.length - 1], index + 1, testCases.length);
  }

  return results;
}

export { MUTATING_METHODS };
