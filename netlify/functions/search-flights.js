// Netlify Function — roda no servidor da Netlify, nunca no navegador.
// O token da Duffel fica seguro numa variável de ambiente, nunca aparece no código.

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  const { origin, destination, departureDate } = JSON.parse(event.body || '{}');

  if (!origin || !departureDate) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Origem e data de partida são obrigatórios' }) };
  }

  const DUFFEL_TOKEN = process.env.DUFFEL_API_KEY; // configurado no painel da Netlify, nunca aqui no código

  if (!DUFFEL_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Chave da Duffel não configurada no servidor' }) };
  }

  try {
    const duffelResponse = await fetch('https://api.duffel.com/air/offer_requests?return_offers=true', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DUFFEL_TOKEN}`,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          slices: [
            {
              origin: origin,
              destination: destination || undefined,
              departure_date: departureDate,
            },
          ],
          passengers: [{ type: 'adult' }],
          cabin_class: 'economy',
        },
      }),
    });

    const data = await duffelResponse.json();

    if (!duffelResponse.ok) {
      return {
        statusCode: duffelResponse.status,
        body: JSON.stringify({ error: data.errors?.[0]?.message || 'Erro na busca' }),
      };
    }

    // Simplifica a resposta pro formato que o app já usa
    const offers = (data.data?.offers || []).slice(0, 10).map((offer) => ({
      origin: offer.slices[0]?.origin?.iata_code,
      destination: offer.slices[0]?.destination?.iata_code,
      airline: offer.owner?.name,
      depart: offer.slices[0]?.segments?.[0]?.departing_at,
      price: parseFloat(offer.total_amount),
      currency: offer.total_currency,
      // offer.id é o que permite criar o pedido de reserva depois (fluxo de checkout da Duffel,
      // ou trocar por um deep-link de afiliado do Travelpayouts/Skyscanner Partners aqui).
      offerId: offer.id,
      bookingUrl: null, // preencher aqui quando a rota de checkout/afiliado estiver pronta
    }));

    return { statusCode: 200, body: JSON.stringify({ offers }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao contatar a Duffel' }) };
  }
};
