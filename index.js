const fs = require('fs');
const WebSocket = require('ws');
const utils = require('./src/utilities');

console.log('node.js application starting...');

var Exchange = function(name, url, subscriptionMsg) {
    let subMsg = JSON.stringify(subscriptionMsg);
    let ws = new WebSocket(url);
    ws.on('open', () => {
        if (subMsg !== null || subMsg !== undefined) {
            ws.send(subMsg);
        }
    });

    ws.on('message', (data) => {
        // for debugging
        //console.log(`${name} log: ${Date.now()}: ${data}`);
        utils.inputPriceToRedis(JSON.parse(data), name);
    })
}

var jsonObj = JSON.parse(fs.readFileSync('config.json'));

 jsonObj["exchanges"].forEach(xchange => {
    new Exchange(xchange.name, xchange.url, xchange.subscriptionMsg);
});

// every 30 seconds get the avg best price
setInterval(async() => {
    await utils.getAvgBestPrice();
}, 30 * 1000);