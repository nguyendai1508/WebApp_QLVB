const http = require('http');
http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        console.log("--- RECEIVED FROM EXTENSION ---");
        try {
            const data = JSON.parse(body);
            console.log(data);
        } catch(e) {
            console.log(body);
        }
        console.log("-------------------------------");
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end('OK');
    });
}).listen(8080, () => console.log('Spy Server Listening on 8080...'));
