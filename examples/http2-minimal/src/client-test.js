import http2 from "node:http2"
import fs from 'node:fs'

const client = http2.connect('http://localhost:3000');
client.on('error', (err) => console.error(err));

const req = client.request({ ':path': '/testProc' });

req.on('response', (headers, flags) => {
  for (const name in headers) {
    console.log(`${name}: ${headers[name]}`);
  }
});

req.setEncoding('utf8');
let data = '';
req.on('data', (chunk) => { data += chunk; });
req.on('end', () => {
  console.log(`\n${data}`);
  client.close();
});
req.end(); 