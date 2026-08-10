const server = Bun.serve({
  hostname: '0.0.0.0',
  port: 3001,
  fetch() { return new Response('ok') }
});
console.log('Server running on', server.url);