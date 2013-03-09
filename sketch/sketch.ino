
#define OUTPUT__BAUD_RATE 57600
#define OUTPUT__DATA_INTERVAL 100  // in milliseconds
#define STATUS_LED_PIN 13  // Pin number of status LED

boolean output_stream_on = false;
unsigned long now;
unsigned long timestamp;

int pingPin = 4;
long int duration = 0;
long int distance = 0;

void setup()
{
  // Init serial output
  Serial.begin( OUTPUT__BAUD_RATE );
  // Init status LED
  pinMode( STATUS_LED_PIN, OUTPUT );
  digitalWrite( STATUS_LED_PIN, LOW );
  // Init Ping sensor.
  pinMode( pingPin, OUTPUT );
  // Give sensors enough time to collect data
  delay(20);
  // For update timer.
  timestamp = millis();
  // Go ahead and try to start sending data.
  turn_output_stream_on();
}

void loop()
{
  if ( Serial.available() >= 2 ) readSerialMessage();
  sendData();
}

// =========== Functions ===========

long microsecondsToInches( long microseconds )
{
  return microseconds / 74 / 2;
}

long microsecondsToCentimeters( long microseconds )
{
  return microseconds / 29 / 2;
}

long getPing()
{
  pinMode( pingPin, OUTPUT );
  digitalWrite( pingPin, LOW );
  delayMicroseconds(2);
  digitalWrite( pingPin, HIGH );
  delayMicroseconds(5);
  digitalWrite( pingPin, LOW );
  pinMode( pingPin, INPUT );
  duration = pulseIn( pingPin, HIGH );
  distance = microsecondsToCentimeters( duration );
}

void turn_output_stream_on()
{
  output_stream_on = true;
  digitalWrite( STATUS_LED_PIN, HIGH);
}

void turn_output_stream_off()
{
  output_stream_on = false;
  digitalWrite( STATUS_LED_PIN, LOW);
}

// This is mostly so we know when the bluetooth connects and disconnects.
void readSerialMessage()
{
  // Only listening for control messages.
  if ( Serial.read() != '#' ) return;
  int command = Serial.read();
  if ( command == 's' ) sendSynch();
  if ( command == 'C' ) turn_output_stream_on();
  if ( command == 'D' ) turn_output_stream_off();
}

// Blocks until another byte is available on serial port
char readChar()
{
  while (Serial.available() < 1) { } // Block
  return Serial.read();
}

void sendSynch()
{
  // Read ID
  byte id[2];
  id[0] = readChar();
  id[1] = readChar();

  // Reply with synch message
  Serial.print("#SYNCH");
  Serial.write(id, 2);
  Serial.println();
}

void sendData()
{
  now = millis();
  // Exit out if we're not past the interval.
  if ( ( now - timestamp ) < OUTPUT__DATA_INTERVAL ) return;
  // Only do this if we're sending data.
  if ( !output_stream_on ) return;
  // Take readings from sensor.
  getPing();
  // Now send that.
  sendSensorData();
}

void sendSensorData()
{
  // String-building JSON.
  static char dtostrfbuffer[15];
  String str = "{\"ping\":";
  str += distance;
  str += "}";
  Serial.println( str );
}

