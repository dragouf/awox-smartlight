"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var nobleExtended = require('noble-extended');

var HEADER = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01];
var TAIL = [0x0D];

var SEQUENCE_ON = HEADER.concat([0x0A, 0x01, 0x01, 0x00, 0x28], TAIL);
var SEQUENCE_OFF = HEADER.concat([0x0A, 0x01, 0x00, 0x01, 0x28], TAIL);
var SEQUENCE_BRIGHNTESS = HEADER.concat([0x0C, 0x01, 0x00, 0xEC]);
var SEQUENCE_WHITE = HEADER.concat([0x0E, 0x01, 0x00, 0x14]);
var SEQUENCE_WHITE_RESET = HEADER.concat([0x0D, 0x06, 0x02, 0x20, 0x30, 0x40, 0x50, 0x60]);
var SEQUENCE_RGB = HEADER.concat([0x0D, 0x06, 0x01, 0x00, 0x00, 0x00, 0x20, 0x30, 0xF8]);

module.exports = function () {
  function AwoxSmartLight(lampMac, logger) {
    _classCallCheck(this, AwoxSmartLight);

    /*"d03972b84926"*/
    this.isScanning = false;
    this.lampMac = lampMac;
    this.timeout = null;
    this.logger = logger || console.log;
    this.commandsQueue = [];
    this.lightCommandDebounce = this._debounce(this._lightCommand.bind(this), 1000);
  }

  _createClass(AwoxSmartLight, [{
    key: "_lightCommand",
    value: function _lightCommand() {
      var _this = this;

      if (this.commandsQueue.length === 0) {
        this.logger("No command to send...");
        return;
      }

      var noble = new nobleExtended.Noble(nobleExtended.bindings);

      this.isScanning = true;
      // if nothing is done after 6s stop everything
      //this.timeout = setTimeout(this._onTimeOut.bind(this, noble), 6000);

      // wait for ble device before to start scanning for lamp
      noble.on('stateChange', function (state) {
        return _this._onStateChange(state, noble);
      });

      // then try to send command
      noble.on('discover', function (peripheral) {
        return _this._onPeripheralDiscover(peripheral, noble);
      });

      // start noble for scanning
      noble.start();
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
      // value
      SEQUENCE_BRIGHNTESS[8] = Math.floor(intensity * 9 + 2);
      // random
      SEQUENCE_BRIGHNTESS[9] = Math.floor(Math.random() * 0xFF) >>> 0;
      // checksum
      SEQUENCE_BRIGHNTESS.push(this._checksum(SEQUENCE_BRIGHNTESS));

      this.commandsQueue.push(SEQUENCE_BRIGHNTESS.concat(TAIL));
      this.lightCommandDebounce();
    }
  }, {
    key: "lightWhite",
    value: function lightWhite(temperature) {
      // value
      SEQUENCE_WHITE[8] = Math.floor(temperature * 9 + 2);
      // random
      SEQUENCE_WHITE[9] = Math.floor(Math.random() * 0xFF) >>> 0;
      // checksum
      SEQUENCE_WHITE.push(this._checksum(SEQUENCE_WHITE));
      this.commandsQueue.push(SEQUENCE_WHITE.concat(TAIL));
      this.lightCommandDebounce();
    }
  }, {
    key: "lightWhiteReset",
    value: function lightWhiteReset() {
      // random
      SEQUENCE_WHITE_RESET.push(Math.floor(Math.random() * 0xFF) >>> 0);
      // checksum
      SEQUENCE_WHITE_RESET.push(this._checksum(SEQUENCE_WHITE_RESET));
      this.commandsQueue.push(SEQUENCE_WHITE_RESET.concat(TAIL));
      this.lightCommandDebounce();
    }
  }, {
    key: "lightRgb",
    value: function lightRgb(r, g, b, special) {
      SEQUENCE_RGB[8] = special ? 0x02 : 0x01;
      // RGB values
      SEQUENCE_RGB[9] = r;
      SEQUENCE_RGB[10] = g;
      SEQUENCE_RGB[11] = b;
      // random
      SEQUENCE_RGB[14] = Math.floor(Math.random() * 0xFF) >>> 0;

      SEQUENCE_RGB.push(this._checksum(SEQUENCE_RGB));
      this.commandsQueue.push(SEQUENCE_RGB.concat(TAIL));
      this.lightCommandDebounce();
    }
  }, {
    key: "_checksum",
    value: function _checksum(data) {
      return data.slice(1).reduce(function (a, b) {
        return a + b;
      }) + 85 & 0xFF;
    }
  }, {
    key: "_onPeripheralDiscover",
    value: function _onPeripheralDiscover(peripheral, noble) {
      var _this2 = this;

      var lampMac = this.lampMac;
      if (peripheral.id.trim().toLowerCase() == lampMac.trim().toLowerCase()) {
        this.logger("found lamp with id:", peripheral.id, ". and name: ", peripheral.advertisement.localName);
        this.isScanning = false;
        noble.stopScanning();
        peripheral.connect(function (error) {
          if (error) {
            _this2.logger('connected to peripheral: ' + peripheral.uuid + ' with error ' + error);
            return;
          }

          _this2.logger('connected to peripheral: ' + peripheral.uuid);

          peripheral.discoverServices(['fff0'], function (error, services) {
            if (error) {
              _this2.logger('cant find service...');
              _this2.logger('the following error occured:' + error);
              if (_this2.commandsQueue.length === 0) peripheral.disconnect();
              return;
            }

            if (!services || services.length === 0) {
              _this2.logger('cant find service...');
              if (_this2.commandsQueue.length === 0) peripheral.disconnect();
              return;
            }

            _this2.logger('found service fff0...');

            services[0].discoverCharacteristics(['fff1'], function (error, characteristics) {
              if (error) {
                _this2.logger('cant find characteristic...');
                _this2.logger('the following error occured:' + error);
                if (_this2.commandsQueue.length === 0) peripheral.disconnect();
                return;
              }

              if (!characteristics || characteristics.length === 0) {
                _this2.logger('cant find characteristic...');
                if (_this2.commandsQueue.length === 0) peripheral.disconnect();
                return;
              }

              _this2.logger('found characteristic fff1');

              var command = null;
              var commandCharacteristic = characteristics[0];
              while (command = _this2.commandsQueue.shift()) {
                _this2.logger('command:' + command);
                commandCharacteristic.write(new Buffer(command), false, function (error) {
                  if (error) {
                    _this2.logger('cant send command');
                    _this2.logger('the following error occured:' + error);
                  } else {
                    _this2.logger('command sent');
                  }

                  if (_this2.commandsQueue.length === 0) peripheral.disconnect();
                });
              }
            });
          });
        });

        peripheral.on('disconnect', function () {
          _this2.logger("disconnected", peripheral.advertisement.localName);
          clearTimeout(_this2.timeout);
          peripheral.removeAllListeners();
          noble.removeAllListeners();
          noble.stop();
        });
      }
    }
  }, {
    key: "_onStateChange",
    value: function _onStateChange(state, noble) {
      if (state === 'poweredOn') {
        this.logger('start scanning');
        noble.startScanning();
      } else {
        this.logger('State change to ' + state + '. Stop scanning');
        noble.stopScanning();
      }
    }
  }, {
    key: "_onTimeOut",
    value: function _onTimeOut(noble) {
      this.isScanning = false;
      this.logger("timeout trying to connect to smartlight...");
      noble.stopScanning();
      noble.removeAllListeners();
      noble.stop();
      //delete this.noble;
    }
  }, {
    key: "_debounce",
    value: function _debounce(func, wait, immediate) {
      var _this3 = this,
          _arguments = arguments;

      var timeout;
      return function () {
        var context = _this3,
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

