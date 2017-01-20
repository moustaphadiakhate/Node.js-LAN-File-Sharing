var express = require('express');
var formidable = require('formidable');
var http = require('http');
var path = require('path');
var fs = require('fs');
var os = require('os');
var app = express();

//Port
var port = normalizePort(process.env.PORT || '8080');

var getAddresses = function () {
    //Credit: http://stackoverflow.com/a/10756441/3257963
    
    var interfaces = os.networkInterfaces();
    //console.log("interfaces",interfaces);
    var addresses = [];
    for (var k in interfaces) {
        for (var k2 in interfaces[k]) {
            var address = interfaces[k][k2];
            if (address.family === 'IPv4' && !address.internal) {
                addresses.push(address.address);
            }
        }
    }
    
    return addresses;
}

var filePath = path.join(__dirname, 'files');
var publicPath = path.join(__dirname, 'public');

//For index. Basically app.get('/',...);
app.use(express.static(publicPath));

//For downloading files
app.use('/f',express.static(filePath));
 
app.post('/', function(req, res) {
    
    var form = new formidable.IncomingForm();
    
    form.parse(req);
    
    form.on('fileBegin', function (name, file){
        
        var fileName = file.name;
        var splitted = fileName.split(".");
        var extension, name;
        if(splitted.length > 1) {
            extension = splitted[splitted.length-1];
            name = "";
            for (var i = 0; i < splitted.length-1; i++) {
                name += splitted[i];
            }
        } else {
            extension = "";
            name = fileName;
        }
        
        //For not overwriting files.
        var i = 0;
        while(fs.existsSync(path.join(filePath, fileName))){
            fileName = name + " dup" + (i++) + "." + extension;
        }
        
        file.path = path.join(filePath, fileName);
        file.finalName = fileName;
        
    });
    
    form.on('file', function (name, file){
        //console.log('Uploaded ' + file.finalName);
        res.redirect('/?success=' + encodeURIComponent(file.finalName));
    });
    
    form.on('error', function(err) {
        res.redirect('/?error=1');
    });
    
    var progress = 0;
    
    form.on('progress', function(bytesReceived, bytesExpected) {
        //TODO: connect to UI when writing the electron app.
        var temp = bytesReceived * 100 / bytesExpected;
        if (temp > (progress + 10)) {
            progress = Math.floor(temp);
            console.log("Progress: "+Math.floor(progress)+"%");
        }
    });

});

app.get('/info',function(req, res) {

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE'); // If needed
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,contenttype'); // If needed
    res.setHeader('Access-Control-Allow-Credentials', true); // If needed
    
    fs.readdir(filePath, (err, files) => {
        
        var fileList = [];
        if (files) {
            fileList = files.filter(function (fileName) {
                return !(fileName[0] == '.' || fileName == "index.html");
            });
        }
        
        res.json({"addresses":getAddresses(),"port":port,"fileList":fileList});
    })
    
});



/*******************************************************/



// catch 404
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// development error handler
app.use(function(err, req, res, next) {
    console.log(err);
    res.status(err.status || 500).send({ error: err });
});

/* */

function normalizePort(val) {
    var port = parseInt(val, 10);
    
    if (isNaN(port)) {
        // named pipe
        return val;
    }
    
    if (port >= 0) {
        // port number
        return port;
    }
    
    return false;
}

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }
    
    var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;
    
    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
        console.error(bind + ' requires elevated privileges');
        process.exit(1);
        break;
        case 'EADDRINUSE':
        console.error(bind + ' is already in use');
        process.exit(1);
        break;
        default:
        throw error;
    }
}

function onListening() {
    var addr = server.address();
    
    if(typeof addr === 'string'){
        console.log('Listening on pipe ' + addr);
    } else {
        var addresses = getAddresses();
        addresses.forEach(function (address) {
            console.log('Listening on ' + address + ':' + addr.port);
        });
    }
}


app.set('port', port);

var server = http.createServer(app);
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);