
#define OUTPUT__BAUD_RATE 57600
#define OUTPUT__DATA_INTERVAL 100  // in milliseconds
#define STATUS_LED_PIN 13  // Pin number of status LED

boolean output_stream_on = false;
unsigned long now;
unsigned long timestamp;

// I don't know enough about this language to do this the correct way.
int pingPins[] = {2,3,4,5};
long int durations[] = {0, 0, 0, 0};
long int distances[] = {0, 0, 0, 0};
int pings = 4;

void setup()
{
  // Init serial output
  Serial.begin( OUTPUT__BAUD_RATE );
  // Init status LED
  pinMode( STATUS_LED_PIN, OUTPUT );
  digitalWrite( STATUS_LED_PIN, LOW );
  // Init each Ping sensor.
  for (int i = 0; i < pings; i++) {
    pinMode( pingPins[i], OUTPUT );
  }
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

long getPing(int index)
{
  pinMode( pingPins[index], OUTPUT );
  digitalWrite( pingPins[index], LOW );
  delayMicroseconds(2);
  digitalWrite( pingPins[index], HIGH );
  delayMicroseconds(5);
  digitalWrite( pingPins[index], LOW );
  pinMode( pingPins[index], INPUT );
  durations[index] = pulseIn( pingPins[index], HIGH );
  distances[index] = microsecondsToCentimeters( durations[index] );
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
  if ( output_stream_on ) return;
  // Take readings from each sensor.
  readSensors();
  // Now send that.
  sendSensorData();
}

void readSensors()
{
  for (int i = 0; i < pings; i++) {
    getPing(i);
  }
}

void sendSensorData()
{
  // String-building JSON.
  static char dtostrfbuffer[15];
  String str = "{\"pings\":[";
  for (int i = 0; i < pings; i++) {
    if ( i != 0 ) str += ",";
    str += dtostrf( distances[i], 4, 2, dtostrfbuffer);
  }
  str += "]}";
  Serial.println( str );
}

