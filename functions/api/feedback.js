const jsonResponse = (status, payload) => new Response(JSON.stringify(payload), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  }
});

export async function onRequestPost(context) {
  try {
    const flowUrl = context.env.FEEDBACK_FLOW_URL;
    if (!flowUrl) {
      return jsonResponse(503, { error: 'Service de feedback non configuré.' });
    }

    let payload;
    try {
      payload = await context.request.json();
    } catch (error) {
      return jsonResponse(400, { error: 'Requête invalide.' });
    }

    const body = String(payload?.body || '').trim();
    if (body.length < 3) {
      return jsonResponse(400, { error: 'Le message est trop court.' });
    }
    if (body.length > 4000) {
      return jsonResponse(400, { error: 'Le message est trop long.' });
    }

    const flowResponse = await fetch(flowUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'sleconte@komatsu.fr',
        subject: 'DASHBOARD REVIEW',
        body,
        source: 'Dashboard WIP',
        page: String(payload?.page || ''),
        createdAt: new Date().toISOString()
      })
    });

    if (!flowResponse.ok) {
      console.error('Power Automate feedback flow failed', flowResponse.status);
      return jsonResponse(502, { error: 'Le service d’envoi a refusé le message.' });
    }

    return jsonResponse(200, { ok: true });
  } catch (error) {
    console.error('Feedback endpoint error', error);
    return jsonResponse(500, { error: 'Erreur serveur pendant l’envoi du feedback.' });
  }
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return jsonResponse(405, { error: 'Méthode non autorisée.' });
  }
  return onRequestPost(context);
}
