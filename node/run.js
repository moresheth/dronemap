	// https://github.com/voodootikigod/node-serialport
var serialport      = require('serialport'),
	socketIo        = require('socket.io'),
	arDrone         = require('ar-drone'),

	drone,
	droneInterval   = 100, // ms
	droneUpdated    = 0, // ms since epoch
	droneEnv = {
		x: 0,
		y: 0,
		z: 0,
		yaw: 0,
		pitch: 0,
		roll: 0,
		alt: 0
	},

	firefly,
	fireflySerial   = '/dev/tty.FireFly-E2C0-SPP',

	io,

	points = [
		[80,80,80],
		[80,80,-80],
		[80,-80,-80],
		[-80,-80,-80],
		[-80,-80,80],
		[-80,80,80]
	];

init();

//setTimeout( dostuff, 10000);

function dostuff() {
	console.log('dostuff');
	io.sockets.emit('points', points);
}

// TODO: Give drone predetermined path.

// =========================================================

function init() {
	socketInit();
	fireflyInit();
	droneInit();
}

// ========================== AR.Drone ==========================

function droneInit() {
	drone = arDrone.createClient();
	drone.config('general:navdata_demo', 'FALSE');
	drone.on('navdata', droneData );
}

function droneData(data) {
	var now     = new Date().getTime(),
		elapsed = now - droneUpdated,
		dat     = data && data.demo;
	// We only update after 100ms, and if we have data.
	if ( !dat || elapsed < droneInterval ) return;
	// Save this now as the updated time.
	droneUpdated = now;
	// Now update our environment settings.
	// mm/s for velocity - translate to cm/ms
	droneEnv.x += ( dat.xVelocity / 10000 * elapsed );
	droneEnv.y += ( dat.yVelocity / 10000 * elapsed );
	droneEnv.z += ( dat.zVelocity / 10000 * elapsed );
	droneEnv.yaw = dat.clockwiseDegrees;
	droneEnv.pitch = dat.frontBackDegrees;
	droneEnv.roll = dat.leftRightDegrees;
	droneEnv.alt = dat.altitudeMeters / 100;
}

// ========================== Socket.io ==========================

function socketInit() {
	io = socketIo.listen(8080);
	io.sockets.on('connection', socketConnect);
}

function socketConnect(socket) {
	console.log('socketConnect');
	socket.emit('points', points);
}

// ========================== Firefly (Arduino Bluetooth) ==========================

function fireflyInit() {
	firefly = new serialport.SerialPort( fireflySerial, { 
		baudrate: 57600,
		parser: serialport.parsers.readline("\n") 
	});
	firefly.on('open', fireflyOpen);
	firefly.on('error', fireflyError);
}

function fireflyOpen() {
	console.log('firefly open');
	firefly.on('data', fireflyData );
}

function fireflyError(e) {
	console.log('firefly error', e);
}

function fireflyData(data) {
	console.log('firefly: '+data);
	var obj = json(data);
	// TODO: translate this data into a point.
	// var point = [90,90,90];
	// TODO: send that point data.
	// io.sockets.emit('points', [point]);
}

// ========================== Utility Functions ==========================

function json(data) {
	var obj = {};
	try {
		obj = JSON.parse( data );
	} catch (e) {
		console.log( 'error parsing: ' + data );
	}
	return obj;
}
