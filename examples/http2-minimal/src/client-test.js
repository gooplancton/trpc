import http2 from 'node:http2';

const client = http2.connect('http://localhost:3000');
client.on('error', (err) => console.error(err));

const req = client.request({
  ':path': '/testSub',
  ':method': 'POST',
});

req.write(JSON.stringify({ test: "hi"}), "utf-8");
req.end();

req.on('response', (headers, flags) => {
  for (const name in headers) {
    console.log(`${name}: ${headers[name]}`);
  }
});

req.setEncoding('utf8');
let data = '';
req.on('data', (chunk) => {
  data += chunk;
});
req.on('end', () => {
  console.log(`\n${data}`);
  client.close();
});
req.end();