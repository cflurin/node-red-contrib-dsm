"use strict";
module.exports = function(RED) {
  
  function DsmNode(config) {
    RED.nodes.createNode(this, config);
   
    var sm = {};
    var sta = {};
    var output;
    var node = this;
    
    this.on('input', function(msg) {
      var context = this.context();
      output = false;
      
      if (typeof context.keys()[0] === "undefined") {
        sta = {fill:"red", text:"dsm undefined"};
      } else {
        sm = context.get('sm');
        sta = {fill:"green", text:"dsm set"};
      }
      
      switch (msg.topic) {
        case "set":
          if (typeof msg.payload === "object") {
            set_dsm(msg);
          } else {
            sta = {fill:"red", text:"invalid payload, not an object"};
          }
          break;
        default:
          if (sta.text === "dsm set") {
            const triggerInput = sm.triggerInput || "topic";
            const method = RED.util.getMessageProperty(msg,triggerInput);
            if (sm.states) {
              msg = process_tran(msg);
            } else {
              sta = {fill:"yellow", text:"no states"}; 
            }
            
            if (typeof sm.methods !== "undefined") {
              output = true;
              msg = process_method(msg, method);
            }
          }
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
        if (sm.data) {
          msg.data = sm.data;
        }
        node.send(msg);
      }
    });
    
    function set_dsm(msg) {
      var trans = [];
      const stateOutput = sm.stateOutput || "topic";
      
      sm = msg.payload;
      
      if(sm.states) {
        output = true;
        RED.util.setMessageProperty(msg,stateOutput,sm.currentState);
        Object.keys(sm.states).forEach(function(key) {
          Object.keys(sm.states[key]).forEach(function(s) {
            if (trans.indexOf(s) < 0) trans.push(s);
          });
        });
        sm.trans = trans;
        sta = {fill:"green", text:sm.currentState};
      } else {
        sta = {fill:"yellow", text:"no states"}; 
      }
      
      if (typeof sm.methods !== "undefined") {
        msg = process_method(msg, "set");
      }
    }
    
    function process_tran(msg) {
      const triggerInput = sm.triggerInput || "topic";
      const stateOutput = sm.stateOutput || "topic";
      const state = sm.currentState;
      const tran = RED.util.getMessageProperty(msg,triggerInput);
      
      if (typeof sm.states[state] === "undefined") {
        sta = {fill:"red", text:state+" undefined"};
      } else {
        if (sm.states[state][tran]) {
          output = true;
          sm.currentState = sm.states[state][tran];
          RED.util.setMessageProperty(msg,stateOutput,sm.currentState);
          sta = {fill:"green", text:sm.currentState};
        } else {
          sta.fill = "yellow";
          if(sm.trans.indexOf(tran) > -1) {
              sta.text = state+" unchanged";
          } else {
              sta.text = tran+" rejected";
          }
        }
      }
      return (msg);
    }
    
    function process_method(msg, method) {
      if (sm.methods[method]) {
        eval(sm.methods[method]);
        sta.text = sta.text+" - "+method;
      }
      return (msg);
    }
    
  }
  RED.nodes.registerType("dsm",DsmNode);
};
