const express = require('express'),
  bodyParser = require('body-parser'),
  path = require('path');
    
const https = require("https"),
  fs = require("fs");

const options = {
  key: fs.readFileSync("./Excel-sdmx/certs/server.key"),
  cert: fs.readFileSync("./Excel-sdmx/certs/server.crt")
};

const app = express();

require('./models/index')(app);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(express.static(path.join(__dirname, './Excel-sdmx/dist')));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const datasets = require('./controllers/datasets.js');

app.post('/datasets', datasets.createDataset);
app.get('/datasets', datasets.getDatasets);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, './Excel-sdmx/dist/index.html'));
});

app.listen(process.env.PORT, process.env.IP);

https.createServer(options, app).listen(8081);