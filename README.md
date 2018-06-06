# node-red-contrib-dsm
A dynamic state machine node based on the [Finite state machine](https://en.wikipedia.org/wiki/Finite-state_machine) model.

The `dsm` node is a pure Node.js package and doesn't use any external libraries.,there is also no config node. The dsm configuration is set programmatically e.g. using a inject node and can be modified as needed. 

### Principal of operation [Source Wikipedia]
*A finite-state machine (FSM) is an abstract machine that can be in exactly one of a finite number of states at any given time. The FSM can change from one state to another in response to some external inputs; the change from one state to another is called a transition. A FSM is defined by a list of its states, its initial state, and the conditions for each transition.*

###  Example

![dsn1](https://user-images.githubusercontent.com/5056710/41049308-e9fa0dc8-69b0-11e8-8b0a-0c27109ec324.jpeg)
