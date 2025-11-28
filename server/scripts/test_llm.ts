import fetch from 'node-fetch';

async function run() {
    try {
        const res = await fetch('http://localhost:3000/api/test-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Hello from automated test. Please respond briefly.' }),
        });
        const json = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', json);
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
}

run();
