// Netlify Function — busca dinâmica de aeroportos (mundo todo), usando o endpoint de "places" da Duffel.
// Usa o mesmo DUFFEL_API_KEY que já está configurado.

exports.handler = async function (event) {
  const query = event.queryStringParameters?.query;

  if (!query || query.trim().length < 2) {
    return { statusCode: 200, body: JSON.stringify({ airports: [] }) };
  }

  const DUFFEL_TOKEN = process.env.DUFFEL_API_KEY;

  if (!DUFFEL_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Chave da Duffel não configurada no servidor' }) };
  }

  try {
    const response = await fetch(`https://api.duffel.com/places/suggestions?query=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${DUFFEL_TOKEN}`,
        'Duffel-Version': 'v2',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: data.errors?.[0]?.message || 'Erro na busca de aeroportos' }) };
    }

    const airports = (data.data || [])
      .filter(place => place.iata_code) // só lugares que têm código IATA (aeroportos e cidades com aeroporto)
      .slice(0, 8)
      .map(place => ({
        city: place.city_name ? `${place.name}, ${place.city_name}` : place.name,
        code: place.iata_code,
      }));

    return { statusCode: 200, body: JSON.stringify({ airports }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao contatar a Duffel' }) };
  }
};
