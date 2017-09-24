"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SEQUENCE_ON = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0A, 0x01, 0x01, 0x00, 0x28, 0x0D];
var SEQUENCE_OFF = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0A, 0x01, 0x00, 0x01, 0x28, 0x0D];
var SEQUENCE_BRIGHNTESS = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0C, 0x01, 0x00, 0xEC, 0x15, 0x0D];
var SEQUENCE_WHITE = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0E, 0x01, 0x00, 0x14, 0x3F, 0x0D];
var SEQUENCE_RGB = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0D, 0x06, 0x01, 0x00, 0x00, 0x00, 0x20, 0x30, 0xF8, 0x78, 0x0D];

module.exports = function () {
  function AwoxSmartLight(lampMac, logger) {
    _classCallCheck(this, AwoxSmartLight);

    /*"d03972b84926"*/
    this.isScanning = false;
    this.lampMac = lampMac;
    this.timeout = null;
    this.logger = logger || console.log;
    this.commandsQueue = [];
    this.lightCommandDebounce = this._debounce(this._lightCommand, 1000);
  }

  _createClass(AwoxSmartLight, [{
    key: "_lightCommand",
    value: function _lightCommand() {
      if (this.commandsQueue.length === 0) {
        this.logger("No command to send...");
        return;
      }

      this.noble = require('noble-extended');
      this.isScanning = true;
      // if nothing is done after 6s stop everything
      this.timeout = setTimeout(this._onTimeOut.bind(this), 6000);

      // wait for ble device before to start scanning for lamp
      this.noble.on('stateChange', this._onStateChange.bind(this));

      // then try to send command
      this.noble.on('discover', this._onPeripheralDiscover.bind(this));

      // start noble for scanning
      this.noble.start();
    }
  }, {
    key: "lightOn",
    value: function lightOn() {
      this.commandsQueue.push(SEQUENCE_ON);
      this.lightCommandDebounce();
    }
  }, {
    key: "lightOff",
    value: function lightOff() {
      this.commandsQueue.push(SEQUENCE_OFF);
      this.lightCommandDebounce();
    }
  }, {
    key: "lightBrightness",
    value: function lightBrightness(intensity) {
      SEQUENCE_BRIGHNTESS[8] = intensity;
      SEQUENCE_BRIGHNTESS[10] = this._checksum(SEQUENCE_BRIGHNTESS);
      this.commandsQueue.push(SEQUENCE_BRIGHNTESS);
      this.lightCommandDebounce();
    }
  }, {
    key: "lightWhite",
    value: function lightWhite(temperature) {
      SEQUENCE_WHITE[8] = temperature;
      SEQUENCE_WHITE[10] = this._checksum(SEQUENCE_WHITE);
      this.commandsQueue.push(SEQUENCE_WHITE);
      this.lightCommandDebounce();
    }
  }, {
    key: "lightRgb",
    value: function lightRgb(r, g, b, special) {
      SEQUENCE_RGB[8] = special ? 0x02 : 0x01;
      SEQUENCE_RGB[9] = r;
      SEQUENCE_RGB[10] = g;
      SEQUENCE_RGB[11] = b;
      //SEQUENCE_RGB[14] = rand() % 256;
      SEQUENCE_RGB[15] = this._checksum(SEQUENCE_RGB);
      this.commandsQueue.push(SEQUENCE_RGB);
      this.lightCommandDebounce();
    }
  }, {
    key: "_checksum",
    value: function _checksum(command) {
      var sum = 0;
      for (var i = 1; i + 2 < command.length; i++) {
        sum += command[i];
      }return sum + 85;
    }
  }, {
    key: "_onPeripheralDiscover",
    value: function _onPeripheralDiscover(peripheral) {
      var _this = this;

      var lampMac = this.lampMac;
      if (peripheral.id.trim().toLowerCase() == lampMac.trim().toLowerCase()) {
        this.logger("found lamp with id:", peripheral.id, ". and name: ", peripheral.advertisement.localName);
        this.isScanning = false;
        this.noble.stopScanning();
        peripheral.connect(function (error) {
          if (error) {
            _this.logger('connected to peripheral: ' + peripheral.uuid + ' with error ' + error);
            return;
          }

          _this.logger('connected to peripheral: ' + peripheral.uuid);

          peripheral.discoverServices(['fff0'], function (error, services) {
            if (error) {
              _this.logger('cant find service...');
              _this.logger('the following error occured:' + error);
              return;
            }

            if (!services || services.length === 0) {
              _this.logger('cant find service...');
              return;
            }

            _this.logger('found service fff0...');

            services[0].discoverCharacteristics(['fff1'], function (error, characteristics) {
              if (error) {
                _this.logger('cant find characteristic...');
                _this.logger('the following error occured:' + error);
                return;
              }

              if (!characteristics || characteristics.length === 0) {
                _this.logger('cant find characteristic...');
                return;
              }

              _this.logger('found characteristic fff1');

              var command = null;
              var commandCharacteristic = characteristics[0];
              while (command = _this.commandsQueue.shift()) {
                _this.logger('command:' + command);
                commandCharacteristic.write(new Buffer(command), true, function (error) {
                  if (error) {
                    _this.logger('cant send command');
                    _this.logger('the following error occured:' + error);
                  } else {
                    //this.logger('command sent');
                  }

                  if (_this.commandsQueue.length === 0) peripheral.disconnect();
                });
              }
            });
          });
        });

        peripheral.on('disconnect', function () {
          _this.logger("disconnected", peripheral.advertisement.localName);
          clearTimeout(_this.timeout);
          peripheral.removeAllListeners();
          _this.noble.removeAllListeners();
          _this.noble.stop();
          delete _this.noble;
        });
      }
    }
  }, {
    key: "_onStateChange",
    value: function _onStateChange(state) {
      if (state === 'poweredOn') {
        this.logger('start scanning');
        this.noble.startScanning();
      } else {
        this.logger('State change to ' + state + '. Stop scanning');
        this.noble.stopScanning();
      }
    }
  }, {
    key: "_onTimeOut",
    value: function _onTimeOut() {
      this.isScanning = false;
      this.logger("timeout trying to connect to smartlight...");
      this.noble.stopScanning();
      this.noble.removeAllListeners();
      this.noble.stop();
      //delete this.noble;
    }
  }, {
    key: "_debounce",
    value: function _debounce(func, wait, immediate) {
      var _this2 = this,
          _arguments = arguments;

      var timeout;
      return function () {
        var context = _this2,
            args = _arguments;
        var later = function later() {
          timeout = null;
          if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
      };
    }
  }]);

  return AwoxSmartLight;
}();

