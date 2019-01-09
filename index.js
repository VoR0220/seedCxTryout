const http = require('http');
const WebSocket = require('ws');
const utils = require('./src/utilities');

console.log('node.js application starting...');

// Idea: Have the websocket requests and apis come from a config file. Makes this way more flexible. 

// Plan of attack: Need to create a pub sub model where all my sockets read the message and automatically update to a store like Redis
// I then just read the Redis keys as they update at a set interval. 

var coinbase = new WebSocket('wss://ws-feed.pro.coinbase.com');

coinbase.on('open', () => {
    console.log("Client has connected to the coinbase server");
    var subscriptionMsg = JSON.stringify({
        "type": "subscribe",
        "product_ids": [
            "BTC-USD"
        ],
        "channels": [
            {
                "name": "ticker",
                "product_ids": [
                    "BTC-USD"
                ]
            }
        ]
    });
    coinbase.send(subscriptionMsg);
})

coinbase.on('message', (data) => {
    utils.inputPriceToRedis(JSON.parse(data), "coinbase");
    //console.log(`Coinbase log: ${Date.now()}: ${data}`);
})

var gemini = new WebSocket("wss://api.gemini.com/v1/marketdata/btcusd/?top_of_book=true");

gemini.on('open', () => {
    console.log("Client has connected to gemini server");
})

gemini.on('message', (data) => {
    utils.inputPriceToRedis(JSON.parse(data), "gemini");
    //console.log(`Gemini log: ${Date.now()}: ${data}`);
})

var bitfinex = new WebSocket("wss://api.bitfinex.com/ws");

bitfinex.on('open', () => {
    console.log("Connected to bitfinex");
    bitfinex.send(JSON.stringify({
        "event": "subscribe",
        "channel": "ticker",
        "symbol": "btcusd"
    }));
})

bitfinex.on('message', (data) => {
    utils.inputPriceToRedis(JSON.parse(data), "bitfinex");
    //console.log(`Bitfinex log: ${Date.now()}: ${data}`);
})

async function GetMaxPrice() {
    const coinbasePrice = await getAsync('coinbase');
    const geminiPrice = await getAsync('gemini');
    const bitfinexPrice = await getAsync('bitfinex');
    return _.max([coinbasePrice, geminiPrice, bitfinexPrice]);
}

/*var svr = http.createServer(async (req, resp) => {
    
});


svr.listen(9000, function () {
    console.log('Node HTTP server is listening');
    let opts = { format: '%s%v', code: 'USD', symbol: '$' }
    while(true) {
        console.log("> Best: ", formatCurrency(GetMaxPrice(), opts));
    }
});*/
const wss = new WebSocket.Server({ port: 8080 });

// Broadcast to all.
wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(data) {
        // Broadcast to everyone else.
        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    });
});

