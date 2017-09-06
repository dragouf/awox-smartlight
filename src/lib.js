"use strict";
var noble = require('noble');

module.exports = class AwoxSmartLight {
  constructor (lampMac) { /*"d03972b84926"*/
    this.lampMac = lampMac
  }

  private const SEQUENCE_ON = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0A, 0x01, 0x01, 0x00, 0x28, 0x0D];
  private const SEQUENCE_OFF = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0A, 0x01, 0x00, 0x01, 0x28, 0x0D];
  private const SEQUENCE_BRIGHNTESS = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0C, 0x01, 0x00, 0xEC, 0x15, 0x0D];
  private const SEQUENCE_WHITE = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0E, 0x01, 0x00, 0x14, 0x3F, 0x0D];
  private const SEQUENCE_RGB = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0D, 0x06, 0x01, 0x00, 0x00, 0x00, 0x20, 0x30, 0xF8, 0x78, 0x0D];

  private lightCommand(command) {
    noble.on('stateChange', function(state) {
      if (state === 'poweredOn') {
        console.log('start scanning');
        noble.startScanning();
      } else {
        console.log('stop scanning');
        noble.stopScanning();
      }
    });

    noble.on('discover', function(peripheral) {
        if(peripheral.id == this.lampMac) {
            noble.stopScanning();
            console.log('Found device with local name: ' + peripheral.advertisement.localName);
            peripheral.connect(function(error) {
              console.log('connected to peripheral: ' + peripheral.uuid);
              peripheral.discoverServices(['fff0'], function(error, services) {
                console.log(services.length, 'service uuid:', services[0].uuid);
                services[0].discoverCharacteristics(['fff1'], function(error, characteristics) {
                    console.log(characteristics.length, 'characteristic:', characteristics[0].uuid);
                    characteristics[0].write(new Buffer(command), true, function(error) {
                    console.log('command sent');
                    peripheral.disconnect();
                });
              });
            });

            peripheral.on('disconnect', function() {
              console.log("disconnected", peripheral.advertisement.localName);
              platform.exit(0);
            });
          });
        }
    });
  }

  public lightOn() {
    lightCommand(SEQUENCE_ON);
  }

  public lightOff() {
    lightCommand(SEQUENCE_OFF);
  }

  public lightBrightness(intensity) {
    SEQUENCE_BRIGHNTESS[8] = intensity;
    SEQUENCE_BRIGHNTESS[10] = checksum(SEQUENCE_BRIGHNTESS);
    lightCommand(SEQUENCE_BRIGHNTESS);
  }

  public lightBrightness(intensity) {
    SEQUENCE_BRIGHNTESS[8] = intensity;
    SEQUENCE_BRIGHNTESS[10] = checksum(SEQUENCE_BRIGHNTESS);
    lightCommand(SEQUENCE_BRIGHNTESS);
  }

  public lightWhite(temperature) {
    SEQUENCE_WHITE[8] = temperature;
    SEQUENCE_WHITE[10] = checksum(SEQUENCE_WHITE);
    lightCommand(SEQUENCE_WHITE);
  }

  public lightRgb(r, g, b, special) {
    SEQUENCE_RGB[8] = special ? 0x02 : 0x01;
    SEQUENCE_RGB[9] = r;
    SEQUENCE_RGB[10] = g;
    SEQUENCE_RGB[11] = b;
    //SEQUENCE_RGB[14] = rand() % 256;
    SEQUENCE_RGB[15] = checksum(SEQUENCE_RGB);
    lightCommand(SEQUENCE_RGB);
  }

  private checksum(command) {
      var sum = 0;
      for (let i = 1; i+2 < command.length; i++)
          sum += command[i];
      return sum + 85;
  }
}
