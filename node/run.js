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

	points = [];

init();

// =========================================================

function init() {
	socketInit();
	fireflyInit();
	droneInit();
	// After everything has started, take a trip.
	setTimeout( fly, 15000);
}

function fly() {
	drone.takeoff();
	drone
		.after(5000, function() {
			this.front(0.2);
			this.clockwise(0.5);
			this.up(0.2);
		})
		.after(3000, function() {
			this.stop();
			this.land();
		});
}

// ========================== AR.Drone ==========================

function droneInit() {
	drone = arDrone.createClient();
	drone.disableEmergency();
	drone.config('general:navdata_demo', 'FALSE');
	drone.config('general:navdata_options','NAVDATA_OPTION_FULL_MASK');
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
	droneEnv.alt = dat.altitudeMeters * 100;
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
	var obj = json(data),
		// Just the new data, for sending to already connected clients.
		thesePoints = [],
		// Translate this data into a point.
		// Adding on the ping offset for height argument. This should be a different setting.
		point = plot( obj.ping, droneEnv.yaw, 10, droneEnv.x, droneEnv.y, droneEnv.alt ),
		// Now plot the ground point.
		ground = [ round( droneEnv.x, 1 ), round( droneEnv.y, 1 ), 0 ];
	// If we already have that point, don't bother.
	if ( !has( points, point ) ) {
		points.push( point );
		thesePoints.push( point );
	}
	if ( !has( points, ground ) ) {
		points.push( ground );
		thesePoints.push( ground );
	}
	// Don't send anything if we have no data.
	if ( thesePoints.length > 0 ) {
		console.log(thesePoints);
		// Send that point data to all clients.
		io.sockets.emit( 'points', thesePoints );
	}
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

function sind(d) {
	return Math.sin( Math.PI*d / 180.0 );
}

function cosd(d) {
	return Math.cos( Math.PI*d / 180.0 );
}

function tand(d) {
	return Math.tan( Math.PI*d / 180.0 );
}

function plot( distance, angle, height, xo, yo, zo ) {
	var x = round( ( cosd( angle ) * distance ) + xo, 1 ),
		y = round( ( sind( angle ) * distance ) + yo, 1 ),
		z = round( height + zo, 1 );
	return [ x, y, z ];
}

function round( num, decimalPlaces ) {
	return Math.round( num * decimalPlaces * 10 ) / ( decimalPlaces * 10 );
}

function has( arr, el ) {
	for (var i=0,l=arr.length;i<l;i++) {
		if ( arr[i][0] === el[0] && arr[i][1] === el[1] && arr[i][2] === el[2] ) return true;
	}
	return false;
}
