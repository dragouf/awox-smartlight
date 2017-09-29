"use strict";
var nobleExtended = require('../../noble');

const SEQUENCE_ON = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0A, 0x01, 0x01, 0x00, 0x28, 0x0D];
const SEQUENCE_OFF = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0A, 0x01, 0x00, 0x01, 0x28, 0x0D];
const SEQUENCE_BRIGHNTESS = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0C, 0x01, 0x00, 0xEC, 0x15, 0x0D];
const SEQUENCE_WHITE = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0E, 0x01, 0x00, 0x14, 0x3F, 0x0D];
const SEQUENCE_RGB = [0xAA, 0x0A, 0xFC, 0x3A, 0x86, 0x01, 0x0D, 0x06, 0x01, 0x00, 0x00, 0x00, 0x20, 0x30, 0xF8, 0x78, 0x0D];

module.exports = class AwoxSmartLight {
  constructor (lampMac, logger) { /*"d03972b84926"*/
    this.isScanning = false;
    this.lampMac = lampMac;
    this.timeout = null;
    this.logger = logger || console.log;
    this.commandsQueue = [];
    this.lightCommandDebounce = this._debounce(this._lightCommand.bind(this), 1000);
  }

  _lightCommand() {
    if(this.commandsQueue.length === 0) {
      this.logger("No command to send...");
      return;
    }

    var noble = new nobleExtended.Noble(nobleExtended.bindings);

    this.isScanning = true;
    // if nothing is done after 6s stop everything
    //this.timeout = setTimeout(this._onTimeOut.bind(this, noble), 6000);

    // wait for ble device before to start scanning for lamp
    noble.on('stateChange', (state) => this._onStateChange(state, noble));

    // then try to send command
    noble.on('discover', (peripheral) => this._onPeripheralDiscover(peripheral, noble));

    // start noble for scanning
    noble.start();
  }

  lightOn() {
    this.commandsQueue.push(SEQUENCE_ON);
    this.lightCommandDebounce();
  }

  lightOff() {
    this.commandsQueue.push(SEQUENCE_OFF);
    this.lightCommandDebounce();
  }

  lightBrightness(intensity) {
    SEQUENCE_BRIGHNTESS[8] = intensity;
    SEQUENCE_BRIGHNTESS[10] = this._checksum(SEQUENCE_BRIGHNTESS);
    this.commandsQueue.push(SEQUENCE_BRIGHNTESS);
    this.lightCommandDebounce();
  }

  lightWhite(temperature) {
    SEQUENCE_WHITE[8] = temperature;
    SEQUENCE_WHITE[10] = this._checksum(SEQUENCE_WHITE);
    this.commandsQueue.push(SEQUENCE_WHITE);
    this.lightCommandDebounce();
  }

  lightRgb(r, g, b, special) {
    SEQUENCE_RGB[8] = special ? 0x02 : 0x01;
    SEQUENCE_RGB[9] = r;
    SEQUENCE_RGB[10] = g;
    SEQUENCE_RGB[11] = b;
    //SEQUENCE_RGB[14] = rand() % 256;
    SEQUENCE_RGB[15] = this._checksum(SEQUENCE_RGB);
    this.commandsQueue.push(SEQUENCE_RGB);
    this.lightCommandDebounce();
  }

  _checksum(command) {
      var sum = 0;
      for (let i = 1; i+2 < command.length; i++)
          sum += command[i];
      return sum + 85;
  }

  _onPeripheralDiscover(peripheral, noble) {
      var lampMac = this.lampMac;
      if(peripheral.id.trim().toLowerCase() == lampMac.trim().toLowerCase()) {
          this.logger("found lamp with id:", peripheral.id, ". and name: ", peripheral.advertisement.localName);
          this.isScanning = false;
          noble.stopScanning();
          peripheral.connect((error) => {
              if(error) {
                this.logger('connected to peripheral: ' + peripheral.uuid + ' with error ' + error);
                return;
              }

              this.logger('connected to peripheral: ' + peripheral.uuid);

              peripheral.discoverServices(['fff0'], (error, services) => {
                if(error) {
                  this.logger('cant find service...');
                  this.logger('the following error occured:' + error);
                  if(this.commandsQueue.length === 0)
                    peripheral.disconnect();
                  return;
                }

                if(!services || services.length === 0){
                  this.logger('cant find service...');
                  if(this.commandsQueue.length === 0)
                    peripheral.disconnect();
                  return;
                }

                this.logger('found service fff0...');

                services[0].discoverCharacteristics(['fff1'], (error, characteristics) => {
                    if(error) {
                      this.logger('cant find characteristic...');
                      this.logger('the following error occured:' + error);
                      if(this.commandsQueue.length === 0)
                        peripheral.disconnect();
                      return;
                    }

                    if(!characteristics || characteristics.length === 0) {
                      this.logger('cant find characteristic...');
                      if(this.commandsQueue.length === 0)
                        peripheral.disconnect();
                      return;
                    }

                    this.logger('found characteristic fff1');

                    var command = null;
                    var commandCharacteristic = characteristics[0];
                    while(command = this.commandsQueue.shift()) {
                        this.logger('command:' + command);
                        commandCharacteristic.write(new Buffer(command), false, (error) => {
                            if(error) {
                              this.logger('cant send command');
                              this.logger('the following error occured:' + error);
                            } else {
                              this.logger('command sent');
                            }

                            if(this.commandsQueue.length === 0)
                              peripheral.disconnect();
                        });
                    }
                });
              });
          });

          peripheral.on('disconnect', () => {
              this.logger("disconnected", peripheral.advertisement.localName);
              clearTimeout(this.timeout);
              peripheral.removeAllListeners();
              noble.removeAllListeners();
              noble.stop();
          });
      }
  }

  _onStateChange(state, noble) {
      if (state === 'poweredOn') {
        this.logger('start scanning');
        noble.startScanning();
      } else {
        this.logger('State change to ' + state + '. Stop scanning');
        noble.stopScanning();
      }
  }

  _onTimeOut(noble) {
    this.isScanning = false;
    this.logger("timeout trying to connect to smartlight...");
    noble.stopScanning();
    noble.removeAllListeners();
    noble.stop();
    //delete this.noble;
  }

  _debounce(func, wait, immediate) {
  	var timeout;
  	return () => {
  		var context = this, args = arguments;
  		var later = () => {
  			timeout = null;
  			if (!immediate)
          func.apply(context, args);
  		};
  		var callNow = immediate && !timeout;
  		clearTimeout(timeout);
  		timeout = setTimeout(later, wait);
  		if (callNow) func.apply(context, args);
  	};
  }
}
