export function GET() {
  return Response.json({ status: 'ok', service: 'saldo-claro-api' }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

export function HEAD() {
  return new Response(null, { status: 200, headers: { 'Cache-Control': 'no-store' } })
}
