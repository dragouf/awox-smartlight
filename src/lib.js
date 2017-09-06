"use strict";
const noble = require('noble');

const SEQUENCE_ON = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0A, 0x01, 0x01, 0x00, 0x28, 0x0D];
const SEQUENCE_OFF = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0A, 0x01, 0x00, 0x01, 0x28, 0x0D];
const SEQUENCE_BRIGHNTESS = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0C, 0x01, 0x00, 0xEC, 0x15, 0x0D];
const SEQUENCE_WHITE = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0E, 0x01, 0x00, 0x14, 0x3F, 0x0D];
const SEQUENCE_RGB = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0D, 0x06, 0x01, 0x00, 0x00, 0x00, 0x20, 0x30, 0xF8, 0x78, 0x0D];

module.exports = class AwoxSmartLight {
  constructor (lampMac) { /*"d03972b84926"*/
    this.lampMac = lampMac
  }

  _lightCommand(command) {
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
       console.log("found peripherical with id:", peripheral.id, ". and name: ", peripheral.advertisement.localName);
        if(peripheral.id == this.lampMac) {
            noble.stopScanning();
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

  lightOn() {
    this._lightCommand(SEQUENCE_ON);
  }

  lightOff() {
    this._lightCommand(SEQUENCE_OFF);
  }

  lightBrightness(intensity) {
    SEQUENCE_BRIGHNTESS[8] = intensity;
    SEQUENCE_BRIGHNTESS[10] = this._checksum(SEQUENCE_BRIGHNTESS);
    this._lightCommand(SEQUENCE_BRIGHNTESS);
  }

  lightBrightness(intensity) {
    SEQUENCE_BRIGHNTESS[8] = intensity;
    SEQUENCE_BRIGHNTESS[10] = this._checksum(SEQUENCE_BRIGHNTESS);
    this._lightCommand(SEQUENCE_BRIGHNTESS);
  }

  lightWhite(temperature) {
    SEQUENCE_WHITE[8] = temperature;
    SEQUENCE_WHITE[10] = this._checksum(SEQUENCE_WHITE);
    this._lightCommand(SEQUENCE_WHITE);
  }

  lightRgb(r, g, b, special) {
    SEQUENCE_RGB[8] = special ? 0x02 : 0x01;
    SEQUENCE_RGB[9] = r;
    SEQUENCE_RGB[10] = g;
    SEQUENCE_RGB[11] = b;
    //SEQUENCE_RGB[14] = rand() % 256;
    SEQUENCE_RGB[15] = this._checksum(SEQUENCE_RGB);
    this._lightCommand(SEQUENCE_RGB);
  }

  _checksum(command) {
      var sum = 0;
      for (let i = 1; i+2 < command.length; i++)
          sum += command[i];
      return sum + 85;
  }
}
