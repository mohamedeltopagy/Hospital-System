import http from 'http';

const postData = JSON.stringify({
  patients: [
    { id: 1, name: "Ahmed", expectedDuration: 15 },
    { id: 2, name: "Ali", expectedDuration: 30 },
    { id: 3, name: "Sara", expectedDuration: 20 },
    { id: 4, name: "Mona", expectedDuration: 45 },
    { id: 5, name: "Khaled", expectedDuration: 10 },
    { id: 6, name: "Omar", expectedDuration: 25 },
    { id: 7, name: "Nour", expectedDuration: 15 },
    { id: 8, name: "Hassan", expectedDuration: 40 }
  ]
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/optimize-schedule',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log("PSO Result:", JSON.parse(data));
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();
