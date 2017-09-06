<img src="http://s7d1.scene7.com/is/image/officedepot/945143_p_lb120_white_3?$OD-Dynamic$&wid=200&hei=200" align="right" alt="tested with LB120" />

# awox-smartlight
Control Awox smartlight from nodejs

[![NPM](https://nodei.co/npm/awox-smartligth.png?compact=true)](https://nodei.co/npm/awox-smartlight/)

This will allow you to control Awox smartlight from nodejs or the command-line. I have only tested with [SML-C9](http://www.awox.com/awox_product/smartlight-c9-mesh-2/) bulbs.

## command-line

You can install it for your system with this:

```
npm i -g awox-smartlight
```

Now, you can use it like this:

```
Usage: awoxlight <COMMAND>

Commands:
  scan                                      Scan for lightbulbs
  on <mac>                                  Turn on lightbulb
  off <mac>                                 Turn off lightbulb
  temp <mac> <color>                        Set the color-temperature of the
                                            lightbulb (for those that support
                                            it)
  hex <mac> <color>                         Set color of lightbulb using hex
                                            color (for those that support it)
  hsb <mac> <hue> <saturation> <brightness> Set color of lightbulb using HSB
                                            color (for those that support it)
  details <ip>                              Get details about the device

Options:
  -?, --help  Show help                                                [boolean]

Examples:
  awoxlight scan -?     Get more detailed help with `scan` command
  awoxlight on -?       Get more detailed help with `on` command
  awoxlight off -?      Get more detailed help with `off` command
  awoxlight temp -?     Get more detailed help with `temp` command
  awoxlight hex -?      Get more detailed help with `hex` command
  awoxlight hsb -?      Get more detailed help with `hsb` command
  awoxlight details -?  Get more detailed help with `details` command
```

## sound

Kyle Dixon made [a cool beat-match script](https://github.com/konsumer/tplink-lightbulb/wiki/Beatmatch) for syncing lights to music.

## library

You can install it in your project like this:

```
npm i -S awox-smartlight
```

Include it in your project like this:

```js
const AwoxSmartLight = require('awox-smartlight')
```

or for ES6:

```js
import AwoxSmartLight from 'awox-smartlight'
```
