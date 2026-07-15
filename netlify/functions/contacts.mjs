/**
 * Netlify Function — proxies contact sign-ups to the Resend API.
 *
 * Triggered by a POST to /.netlify/functions/contacts.
 * The netlify.toml redirects /api/contacts → this function.
 */
export const handler = async (event) => {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  // --- CORS preflight --------------------------------------------------
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY env var is not set');
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured for sign-ups' }) };
  }

  // --- Parse body ------------------------------------------------------
  let body;
  try {
    body = JSON.parse(event.body ?? '');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const email = body?.email?.trim();
  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email is required' }) };
  }

  // --- Forward to Resend -----------------------------------------------
  try {
    const apiRes = await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        first_name: body.first_name ?? '',
        last_name:  body.last_name ?? '',
        unsubscribed: false,
      }),
    });

    const data = await apiRes.json();
    return {
      statusCode: apiRes.status,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('Resend API error:', err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Failed to reach contact service' }),
    };
  }
};
