"use strict";
module.exports = function(RED) {
  
  function DsmNode(config) {
    RED.nodes.createNode(this, config);
   
    var sm = {};
    var sta = {};
    var output = true;
    var node = this;
    
    this.on('input', function(msg) {
      const topic = msg.topic.toLowerCase();
      var context = this.context();

      if (typeof context.keys()[0] === "undefined") {
        sta = {fill:"red", text:"dsm undefined."};
      } else {
        sm = context.get('sm');
        sta = {fill:"green", text:"dsm set"};
      }
      
      switch (topic) {
        case "set":
          sm = msg.payload;
          set_dsm(msg);
          break;
        case "getdata":
          if (sta.text === "dsm set") {
            msg.data = sm.data;
          }
          sta = {fill:"grey", text:"getData"};
          break;
        default:
          if (sta.text === "dsm set") {
            const triggerInput = sm.triggerInput || "topic";
            msg = process_tran(msg);
            if (typeof sm.methods !== "undefined") {
              msg = process_method(msg, RED.util.getMessageProperty(msg,triggerInput));
            }
          } else {
            output = false;
          }
      }
      
      if (sm.data && msg) {
        msg.data = sm.data;
      }
      
      const globalOutput = sm.globalOutput || false;
      const flowOutput = sm.flowOutput || false;
      if (globalOutput) {
        this.context().global.set(globalOutput, sm.currentState);
      }
      if (flowOutput) {
        this.context().flow.set(flowOutput, sm.currentState);
      }
      context.set('sm', sm);
      this.status({fill:sta.fill,shape:"dot",text:sta.text});
      
      if (output) {
        node.send(msg);
      }
    });
    
    function set_dsm(msg) {
      var trans = [];
      const stateOutput = sm.stateOutput || "topic";
      
      if(sm.states) {
        RED.util.setMessageProperty(msg,stateOutput,sm.currentState);
        Object.keys(sm.states).forEach(function(key) {
          Object.keys(sm.states[key]).forEach(function(s) {
            if (trans.indexOf(s) < 0) trans.push(s);
          });
        });
        sm.trans = trans;
        sta = {fill:"green", text:sm.currentState};
      } else {
        sta = {fill:"grey", text:"data"};
      }
      
      if (typeof sm.methods !== "undefined") {
        msg = process_method(msg, msg.topic);
      }
    }
    
    function process_tran(msg) {
      if (!sm.states) {
        output = false;
        sta = {fill:"yellow", text:"no states."}; 
      } else {
        const triggerInput = sm.triggerInput || "topic";
        const stateOutput = sm.stateOutput || "topic";
        const state = sm.currentState;
        const tran = RED.util.getMessageProperty(msg,triggerInput);
        if (typeof sm.states[state] === "undefined") {
          output = false;
          sta = {fill:"red", text:state+" undefined."};
        } else {
          if (sm.states[state][tran]) {
            sm.currentState = sm.states[state][tran];
            RED.util.setMessageProperty(msg,stateOutput,sm.currentState);
            sta = {fill:"green", text:sm.currentState};
          } else {
            output = false;
            sta.fill = "yellow";
            if(sm.trans.indexOf(tran) > -1) {
                sta.text = state+" unchanged.";
            } else {
                sta.text = tran+" rejected.";
            }
          }
        }
      }
      return (msg);
    }
    
    function process_method(msg, method) {
      if (sm.methods[method]) {
        output = true;
        eval(sm.methods[method]);
        sta = {fill:"grey", text:"method "+method};
      }
      return (msg);
    }
    
  }
  RED.nodes.registerType("dsm",DsmNode);
};
