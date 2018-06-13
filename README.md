# node-red-contrib-dsm
A dynamic state machine node based on the [Finite state machine](https://en.wikipedia.org/wiki/Finite-state_machine) model.

The `dsm` node is a pure Node.js package for Node Red, it doesn't use any external libraries and there is no config node. The dsm configuration is set programmatically e.g. using an inject node. 

#### Principle of operation [Source Wikipedia]
*A finite-state machine (FSM) is an abstract machine that can be in exactly one of a finite number of states at any given time. The FSM can change from one state to another in response to some external inputs; the change from one state to another is called a transition. A FSM is defined by a list of its states, its initial state, and the conditions for each transition.*

## Usage

At start the node configuration is empty, the behaviour is defined with an input JSON object:

```js
topic: "set"
payload:
{
    "triggerInput": "topic",
    "stateOutput": "payload",
    "globalOutput": "my_global_var",
    "flowOutput": "my_flow_var",
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

`triggerInput`, `stateOutput`, `globalOutput`and `flowOutput`can be omitted.

`triggerInput` and `stateOutput` default `topic`.

`globalOutput` and `flowOutput` default `false`.

If `globalOutput` or  `flowlOutput` is defined, the corresponding variable is additionally set.

When the node receives a trigger with a transition it will change from one state to another:

```js
topic: "transition"
payload: any
```

##  Examples

### Door

![dsn1](https://user-images.githubusercontent.com/5056710/41049308-e9fa0dc8-69b0-11e8-8b0a-0c27109ec324.jpeg)

#### Configuration

```js
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

```js
[{"id":"8b02669f.7ddd98","type":"debug","z":"57ef434a.058a6c","name":"","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","x":510,"y":940,"wires":[]},{"id":"68c0e2d5.3b798c","type":"inject","z":"57ef434a.058a6c","name":"open","topic":"open","payload":"your open payload","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":110,"y":940,"wires":[["3b0c292.2da33d6"]]},{"id":"cc79a219.ec7d6","type":"inject","z":"57ef434a.058a6c","name":"set","topic":"set","payload":"{\"currentState\":\"closed\",\"states\":{\"opened\":{\"close\":\"closed\",\"stop\":\"stopped\"},\"closed\":{\"open\":\"opened\",\"stop\":\"stopped\"},\"stopped\":{\"open\":\"opened\",\"close\":\"closed\"}}}","payloadType":"json","repeat":"","crontab":"","once":true,"onceDelay":0.1,"x":110,"y":880,"wires":[["3b0c292.2da33d6"]]},{"id":"fae17b11.e48a88","type":"inject","z":"57ef434a.058a6c","name":"close","topic":"close","payload":"your close payload","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":110,"y":980,"wires":[["3b0c292.2da33d6"]]},{"id":"3b0c292.2da33d6","type":"dsm","z":"57ef434a.058a6c","name":"door","x":310,"y":940,"wires":[["8b02669f.7ddd98"]]},{"id":"caac460e.2942c8","type":"inject","z":"57ef434a.058a6c","name":"stop","topic":"stop","payload":"your stop payload","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":110,"y":1020,"wires":[["3b0c292.2da33d6"]]}]
```

### Garage door

![dsn2](https://user-images.githubusercontent.com/5056710/41049656-b68dd748-69b1-11e8-820b-84ff3c9015c3.jpeg)

#### Configuration

```js
{
    "triggerInput": "topic",
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

```js
[{"id":"57c5962f.77f1c8","type":"inject","z":"57ef434a.058a6c","name":"set","topic":"set","payload":"{\"triggerInput\":\"topic\",\"stateOutput\":\"payload\",\"currentState\":\"closed\",\"states\":{\"opened\":{\"click\":\"closing\"},\"closed\":{\"click\":\"opening\"},\"opening\":{\"limit_switch\":\"opened\",\"click\":\"opening_stopped\"},\"closing\":{\"limit_switch\":\"closed\",\"click\":\"closing_stopped\"},\"opening_stopped\":{\"click\":\"closing\"},\"closing_stopped\":{\"click\":\"opening\"}}}","payloadType":"json","repeat":"","crontab":"","once":true,"onceDelay":0.1,"x":90,"y":640,"wires":[["1501e603.fdbeba"]]},{"id":"1501e603.fdbeba","type":"dsm","z":"57ef434a.058a6c","name":"garage door","x":250,"y":680,"wires":[["468070c4.8247","2125cea7.329542"]]},{"id":"468070c4.8247","type":"debug","z":"57ef434a.058a6c","name":"","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"false","x":430,"y":740,"wires":[]},{"id":"4744a8a3.28aec8","type":"inject","z":"57ef434a.058a6c","name":"click","topic":"click","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":90,"y":680,"wires":[["1501e603.fdbeba"]]},{"id":"379cd28e.34076e","type":"link in","z":"57ef434a.058a6c","name":"from timer","links":["4c183a20.342304"],"x":115,"y":720,"wires":[["1501e603.fdbeba"]]},{"id":"4c183a20.342304","type":"link out","z":"57ef434a.058a6c","name":"to dsm","links":["379cd28e.34076e"],"x":775,"y":740,"wires":[]},{"id":"5a467385.1c0bcc","type":"comment","z":"57ef434a.058a6c","name":"motor simulation","info":"","x":440,"y":640,"wires":[]},{"id":"2125cea7.329542","type":"change","z":"57ef434a.058a6c","name":"","rules":[{"t":"set","p":"payload","pt":"msg","to":"payload = \"opening\" or payload = \"closing\" ? payload : \"reset\"","tot":"jsonata"}],"action":"","property":"","from":"","to":"","reg":false,"x":440,"y":680,"wires":[["23d5eb3e.3f4fa4"]]},{"id":"23d5eb3e.3f4fa4","type":"trigger","z":"57ef434a.058a6c","op1":"","op2":"limit_switch","op1type":"nul","op2type":"str","duration":"5","extend":false,"units":"s","reset":"reset","bytopic":"topic","name":"","x":620,"y":680,"wires":[["77a5a197.e301e"]]},{"id":"77a5a197.e301e","type":"change","z":"57ef434a.058a6c","name":"","rules":[{"t":"set","p":"topic","pt":"msg","to":"payload","tot":"msg"}],"action":"","property":"","from":"","to":"","reg":false,"x":640,"y":740,"wires":[["4c183a20.342304"]]}]
```

For more examples have a look at the [Wiki](https://github.com/cflurin/node-red-contrib-dsm/wiki)
