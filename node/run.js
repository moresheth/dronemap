	// https://github.com/voodootikigod/node-serialport
var serialport      = require('serialport'),
	socketIo        = require('socket.io'),

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

	points = [],
	// These are measured distances in cm between sensors and drone unit.
	pingsOffset = [
		{x:0,y:0,z:0},
		{x:0,y:0,z:0},
		{x:0,y:0,z:0},
		{x:0,y:0,z:0}
	];

init();

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
	// Now update our environment settings.
	// TODO: What's the units on this velocity?
	droneEnv.x += ( dat.xVelocity * elapsed );
	droneEnv.y += ( dat.yVelocity * elapsed );
	droneEnv.z += ( dat.zVelocity * elapsed );
	droneEnv.yaw = dat.clockwiseDegrees;
	droneEnv.pitch = dat.frontBackDegrees;
	droneEnv.roll = dat.leftRightDegrees;
	droneEnv.alt = dat.altitudeMeters / 100;
}

// ========================== Socket.io ==========================

function socketInit() {
	io = socketIo.listen(80);
	io.sockets.on('connection', socketConnect);
}

function socketConnect(socket) {
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
