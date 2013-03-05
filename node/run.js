	// https://github.com/voodootikigod/node-serialport
var serialport      = require('serialport'),
	firefly;


init();


function init() {
	firefly = new serialport.SerialPort('/dev/tty.FireFly-E2C0-SPP', { 
		baudrate: 57600,
		parser: serialport.parsers.readline("\n") 
	});

	firefly.on('open', function() {

		console.log('firefly open');

		firefly.on('data', handleRazor );

	});

	firefly.on('error', function(e) {
		console.log('firefly error', e);
	});
}


function json(data) {
	var obj = {};
	try {
		obj = JSON.parse( data );
	} catch (e) {
		console.log( 'error parsing: ' + data );
	}
	return obj;
}

function handleRazor(data) {
	console.log('firefly: '+data);
	var obj = json(data);
}
