# node-red-contrib-dsm
A dynamic state machine node based on the [Finite state machine](https://en.wikipedia.org/wiki/Finite-state_machine) model.

The `dsm` node is a pure Node.js package for Node Red, it doesn't use any external libraries. The dsm behaviour  is defined in a JSON format and can be optianally set/modified programmatically e.g. using an inject node. 

#### Principle of operation [Wikipedia]
*A finite-state machine (FSM) is an abstract machine that can be in exactly one of a finite number of states at any given time. The FSM can change from one state to another in response to some external inputs; the change from one state to another is called a transition. A FSM is defined by a list of its states, its initial state, and the conditions for each transition.*

## Usage

The `dsm` properties can be defined in the `edit dsm node` window or by an input JSON object:

![dsmconf](https://user-images.githubusercontent.com/5056710/42732001-ca361a6e-8818-11e8-8b24-c121ddbda784.jpeg)

#### JSON object:

```
topic: "set"
payload:
{
    "triggerInput": "topic",
    "stateOutput": "current",
    "preStateOutput": "previous",
    "globalOutput": "my_global_var",
    "flowOutput": "my_flow_var",
    "preState": null,
    "currentState": "state1",
    "states": {
        "state1": {
            "transition2": "state2"
        },
        "state2": {
            "transition1": "state1",
            "transition3": "state3"
        },
        "state3": {
            "transition1": "state1",
            "transition2": "state2"
        }
    }
}
```

`triggerInput`, `stateOutput`, `preStateOutput`, `globalOutput` and `flowOutput` can be omitted.

`triggerInput` and `stateOutput` default `topic`.

`preStateOutput` default `preState`

`globalOutput` and `flowOutput` default `false`.

If `globalOutput` or  `flowlOutput` is defined, the corresponding variable is additionally set.

When the node receives a trigger with a transition it will change from one state to another:

```
topic: "transition"
payload: any
```

### Data and methods

In addition to states and transitions a `dsm` can also contain arbitrary data and methods.

#### Example:

```
{
    "stateOutput": "payload",
    "currentState": "one_state",
    "states": {
        "recursive": "one_state"
    },
    "data": {
        "delay": 2000
    },
    "methods": {
        "setDelay": "sm.data.delay = msg.payload;",
        "getDelay": "msg.delay = sm.data.delay;",
        "default": "msg.payload = 'method undefined'"
    }
}
```

Methods can be any valid javascript statements. If the method name is the same as the transition name, both the transition and the method are processed.

The method `default` is executed when no method is found in the methods list.

To simplify editing methods can be defined as an array of comma separated strings:

```
"onTransition" : [
    "if (sm.data.indoor > sm.data.outdoor) {",
        "msg.payload = 'indoor > outdoor';",
    "} else if (sm.data.indoor < sm.data.outdoor) {",
        "msg.payload = 'indoor < outdoor';",
    "} else {",
        "msg.payload = 'indoor = outdoor';",
    "}"
]
```

### General purpose methods

* `init`
* `onBeforeTransition`
* `onTransition` 
* `onAfterTransition` 
* `status` defines an arbitrary status

The general purpose methods are executed independently even without states.
The `init` method is executed when the dsm is deployed respectively when the dsm is set. `init`  can be used to initialize values. 

#### Example:

```
}
    "methods": {
        "onTransition": "msg.payload = {'sid': global.get('xiaomi_name')[msg.payload]};",
        "status": {
            "fill": "green",
            "shape": "ring",
            "text": {
                "get": "JSON.stringify(msg.payload)"
            }
        }
    }
}
```


### Build-in methods

To simplify the configuration build-in methods are available.

* setData
* getData
* timer
* resetTimer
* watchdog

### Configuration Examples

#### setData and getData

```
{
    "data": {
        "temperature": 0,
        "humidity": 0,
        "pressure": 0,
        "co2": 0
    },
    "methods": {
        "temperature": {
            "name": "setData"
        },
        "humidity": {
            "name": "setData"
        },
        "pressure": {
            "name": "setData"
        },
        "co2": {
            "name": "setData"
        },
        "getData": {
            "name": "getData"
        }
    }
}
```

#### timer and watchdog

```
{
    "data": {
        "delay1": 2000,
        "delay2": 3000
    },
    "methods": {
        "timer1": {
            "name": "timer",
            "param": "delay1"
        },
        "timer2": {
            "name": "timer",
            "param": "delay2",
            "do": "node.status({});"
        },
        "timer3": {
            "name": "timer",
            "param": 5000,
            "send": "toilet window timeout"
        },
        "resetTimer3": {
            "name": "resetTimer",
            "param": "timer3"
        },
        "watchdog1": {
            "name": "watchdog",
            "param": 5000,
            "send": {
                "get": "msg.payload.name+' timeout';"
            }
        }
    }
}
```

`timer`and `watchdog` param in milliseconds.

`do` executes a statement.

`send` sets msg.payload - either to a string or when using `get` to the result of a statement - and send the msg.

##  Examples

### Door

![door-7 2](https://user-images.githubusercontent.com/5056710/43066264-7c5db476-8e64-11e8-8a7f-076ca58d4d19.png)
#### Configuration

```
{
    "currentState": "closed",
    "states": {
        "opened": {
            "close": "closed",
            "stop": "stopped"
        },
        "closed": {
            "open": "opened",
            "stop": "stopped"
        },
        "stopped": {
            "open": "opened",
            "close": "closed"
        }
    }
}
```

#### Flow

```
[{"id":"8b02669f.7ddd98","type":"debug","z":"57ef434a.058a6c","name":"","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","x":430,"y":1680,"wires":[]},{"id":"68c0e2d5.3b798c","type":"inject","z":"57ef434a.058a6c","name":"open","topic":"open","payload":"your open payload","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":90,"y":1640,"wires":[["3b0c292.2da33d6"]]},{"id":"fae17b11.e48a88","type":"inject","z":"57ef434a.058a6c","name":"close","topic":"close","payload":"your close payload","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":90,"y":1680,"wires":[["3b0c292.2da33d6"]]},{"id":"3b0c292.2da33d6","type":"dsm","z":"57ef434a.058a6c","name":"door","sm_config":"{\n    \"currentState\": \"closed\",\n    \"states\": {\n        \"opened\": {\n            \"close\": \"closed\",\n            \"stop\": \"stopped\"\n        },\n        \"closed\": {\n            \"open\": \"opened\",\n            \"stop\": \"stopped\"\n        },\n        \"stopped\": {\n            \"open\": \"opened\",\n            \"close\": \"closed\"\n        }\n    }\n}","x":260,"y":1680,"wires":[["8b02669f.7ddd98"]]},{"id":"caac460e.2942c8","type":"inject","z":"57ef434a.058a6c","name":"stop","topic":"stop","payload":"your stop payload","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":90,"y":1720,"wires":[["3b0c292.2da33d6"]]}]
```

### Garage door

![garade_door-7 2](https://user-images.githubusercontent.com/5056710/43066538-3bfcdd2a-8e65-11e8-97d2-13d7b298c473.png)

#### Configuration

```
{
    "stateOutput": "payload",
    "currentState": "closed",
    "states": {
        "opened": {
            "click": "closing"
        },
        "closed": {
            "click": "opening"
        },
        "opening": {
            "limit_switch": "opened",
            "click": "opening_stopped"
        },
        "closing": {
            "limit_switch": "closed",
            "click": "closing_stopped"
        },
        "opening_stopped": {
            "click": "closing"
        },
        "closing_stopped": {
            "click": "opening"
        }
    }
}
```

#### Flow

```
[{"id":"1501e603.fdbeba","type":"dsm","z":"57ef434a.058a6c","name":"garage door","sm_config":"{\n    \"stateOutput\": \"payload\",\n    \"globalOutput\": \"garage_door_state\",\n    \"currentState\": \"closed\",\n    \"states\": {\n        \"opened\": {\n            \"click\": \"closing\"\n        },\n        \"closed\": {\n            \"click\": \"opening\"\n        },\n        \"opening\": {\n            \"limit_switch\": \"opened\",\n            \"click\": \"opening_stopped\"\n        },\n        \"closing\": {\n            \"limit_switch\": \"closed\",\n            \"click\": \"closing_stopped\"\n        },\n        \"opening_stopped\": {\n            \"click\": \"closing\"\n        },\n        \"closing_stopped\": {\n            \"click\": \"opening\"\n        }\n    }\n}","x":260,"y":1240,"wires":[["2125cea7.329542"]]},{"id":"4744a8a3.28aec8","type":"inject","z":"57ef434a.058a6c","name":"click","topic":"click","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":90,"y":1240,"wires":[["1501e603.fdbeba"]]},{"id":"379cd28e.34076e","type":"link in","z":"57ef434a.058a6c","name":"to timer","links":["4c183a20.342304"],"x":115,"y":1280,"wires":[["1501e603.fdbeba"]]},{"id":"4c183a20.342304","type":"link out","z":"57ef434a.058a6c","name":"from dsm","links":["379cd28e.34076e"],"x":535,"y":1340,"wires":[]},{"id":"5a467385.1c0bcc","type":"comment","z":"57ef434a.058a6c","name":"motor simulation","info":"","x":440,"y":1200,"wires":[]},{"id":"2125cea7.329542","type":"change","z":"57ef434a.058a6c","name":"","rules":[{"t":"set","p":"payload","pt":"msg","to":"payload = \"opening\" or payload = \"closing\" ? payload : \"reset\"","tot":"jsonata"}],"action":"","property":"","from":"","to":"","reg":false,"x":440,"y":1240,"wires":[["23d5eb3e.3f4fa4"]]},{"id":"23d5eb3e.3f4fa4","type":"trigger","z":"57ef434a.058a6c","op1":"","op2":"limit_switch","op1type":"nul","op2type":"str","duration":"3","extend":false,"units":"s","reset":"reset","bytopic":"topic","name":"","x":320,"y":1340,"wires":[["77a5a197.e301e"]]},{"id":"77a5a197.e301e","type":"change","z":"57ef434a.058a6c","name":"topic","rules":[{"t":"set","p":"topic","pt":"msg","to":"payload","tot":"msg"}],"action":"","property":"","from":"","to":"","reg":false,"x":450,"y":1340,"wires":[["4c183a20.342304"]]}]
```

For more examples have a look at the [Wiki](https://github.com/cflurin/node-red-contrib-dsm/wiki)
