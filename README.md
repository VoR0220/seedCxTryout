# seedCxTryout

This is a written assessment for a potential job. It reads from a config file to connectsto Gemini, Coinbase and Bitfinex which via websocket, pushes the new data up into a Redis cache and from there tracks and emits a console log on price changes as well as logs an average best every 30 seconds. A few unit tests are written in Mocha/Chai. It's a very sparse set up but written to be extendable. 

To run this, start up Redis (I used Homebrew so it's as easy as `brew services start redis` for me, I suppose Docker would also do the trick here), and run `node index.js`. 

I wanted to make this work in typescript (this may take a hour or 2 of configuring), tried to add another exchange (tried binance and bittrex...their documentation and api design is horrendous) and may do it later today but for now I'm turning this in as is.