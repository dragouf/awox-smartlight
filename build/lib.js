"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var noble = require('noble');

var SEQUENCE_ON = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0A, 0x01, 0x01, 0x00, 0x28, 0x0D];
var SEQUENCE_OFF = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0A, 0x01, 0x00, 0x01, 0x28, 0x0D];
var SEQUENCE_BRIGHNTESS = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0C, 0x01, 0x00, 0xEC, 0x15, 0x0D];
var SEQUENCE_WHITE = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0E, 0x01, 0x00, 0x14, 0x3F, 0x0D];
var SEQUENCE_RGB = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0D, 0x06, 0x01, 0x00, 0x00, 0x00, 0x20, 0x30, 0xF8, 0x78, 0x0D];

module.exports = function () {
  function AwoxSmartLight(lampMac) {
    _classCallCheck(this, AwoxSmartLight);

    /*"d03972b84926"*/
    this.lampMac = lampMac;
  }

  _createClass(AwoxSmartLight, [{
    key: '_lightCommand',
    value: function _lightCommand(command) {
      noble.on('stateChange', function (state) {
        if (state === 'poweredOn') {
          console.log('start scanning');
          noble.startScanning();
        } else {
          console.log('stop scanning');
          noble.stopScanning();
        }
      });

      noble.on('discover', function (peripheral) {
        console.log("found peripherical with id:", peripheral.id, ". and name: ", peripheral.advertisement.localName);
        if (peripheral.id == this.lampMac) {
          noble.stopScanning();
          peripheral.connect(function (error) {
            console.log('connected to peripheral: ' + peripheral.uuid);
            peripheral.discoverServices(['fff0'], function (error, services) {
              console.log(services.length, 'service uuid:', services[0].uuid);
              services[0].discoverCharacteristics(['fff1'], function (error, characteristics) {
                console.log(characteristics.length, 'characteristic:', characteristics[0].uuid);
                characteristics[0].write(new Buffer(command), true, function (error) {
                  console.log('command sent');
                  peripheral.disconnect();
                });
              });
            });

            peripheral.on('disconnect', function () {
              console.log("disconnected", peripheral.advertisement.localName);
              platform.exit(0);
            });
          });
        }
      });
    }
  }, {
    key: 'lightOn',
    value: function lightOn() {
      this._lightCommand(SEQUENCE_ON);
    }
  }, {
    key: 'lightOff',
    value: function lightOff() {
      this._lightCommand(SEQUENCE_OFF);
    }
  }, {
    key: 'lightBrightness',
    value: function lightBrightness(intensity) {
      SEQUENCE_BRIGHNTESS[8] = intensity;
      SEQUENCE_BRIGHNTESS[10] = this._checksum(SEQUENCE_BRIGHNTESS);
      this._lightCommand(SEQUENCE_BRIGHNTESS);
    }
  }, {
    key: 'lightBrightness',
    value: function lightBrightness(intensity) {
      SEQUENCE_BRIGHNTESS[8] = intensity;
      SEQUENCE_BRIGHNTESS[10] = this._checksum(SEQUENCE_BRIGHNTESS);
      this._lightCommand(SEQUENCE_BRIGHNTESS);
    }
  }, {
    key: 'lightWhite',
    value: function lightWhite(temperature) {
      SEQUENCE_WHITE[8] = temperature;
      SEQUENCE_WHITE[10] = this._checksum(SEQUENCE_WHITE);
      this._lightCommand(SEQUENCE_WHITE);
    }
  }, {
    key: 'lightRgb',
    value: function lightRgb(r, g, b, special) {
      SEQUENCE_RGB[8] = special ? 0x02 : 0x01;
      SEQUENCE_RGB[9] = r;
      SEQUENCE_RGB[10] = g;
      SEQUENCE_RGB[11] = b;
      //SEQUENCE_RGB[14] = rand() % 256;
      SEQUENCE_RGB[15] = this._checksum(SEQUENCE_RGB);
      this._lightCommand(SEQUENCE_RGB);
    }
  }, {
    key: '_checksum',
    value: function _checksum(command) {
      var sum = 0;
      for (var i = 1; i + 2 < command.length; i++) {
        sum += command[i];
      }return sum + 85;
    }
  }]);

  return AwoxSmartLight;
}();

