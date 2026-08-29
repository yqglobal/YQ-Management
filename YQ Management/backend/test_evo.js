

async function testEvo() {
  const url = 'http://localhost:8080/message/sendText/test_instance';
  const payload = {
    number: '919474808461',
    options: { delay: 0, presence: 'composing' },
    text: 'Test message',
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: process.env.EVOLUTION_API_KEY || 'test' },
    body: JSON.stringify(payload)
  });

  const txt = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', txt);
}

testEvo();
