#!/usr/bin/env node
const createApp = require('./scripts/create-app');
createApp().then(dirName => console.log(`Created in ${ dirName }`)).catch(console.log);
