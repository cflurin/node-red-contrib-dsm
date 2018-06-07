"use strict";
module.exports = function(RED) {
  
  function DsmNode(config) {
    RED.nodes.createNode(this, config);
      
    this.on('input', function(msg) {
    
      var triggerInput, stateOutput;
      var sm = {};
      var sta = {};
      var trans = [];
      var context = this.context();

      if (msg.topic === "set") {
          sm = msg.payload;
          stateOutput = sm.stateOutput || "topic";
          RED.util.setMessageProperty(msg,stateOutput,sm.currentState);
          Object.keys(sm.states).forEach(function(key) {
              Object.keys(sm.states[key]).forEach(function(s) {
                  if (trans.indexOf(s) < 0) trans.push(s);
              });
          });
          sm.trans = trans;
          sta = {fill:"green", text:sm.currentState};
      } else {  
          if (typeof context.keys()[0] === "undefined") {
              msg = null;
              sta = {fill:"red", text:"dsm undefined."};
          } else {
              sm = context.get('sm');
              triggerInput = sm.triggerInput || "topic";
              stateOutput = sm.stateOutput || "topic";
              const state = sm.currentState;
              const tran = RED.util.getMessageProperty(msg,triggerInput);
              if (typeof sm.states[state] === "undefined") {
                  msg = null;
                  sta = {fill:"red", text:state+" undefined."};
              } else {
                  if (sm.states[state][tran]) {
                      sm.currentState = sm.states[state][tran];
                      //this.warn(`${ state } -> ${ tran } -> ${ sm.currentState }`);
                      RED.util.setMessageProperty(msg,stateOutput,sm.currentState);
                      sta = {fill:"green", text:sm.currentState};
                  } else {
                      msg = null;
                      sta.fill = "yellow";
                      if(sm.trans.indexOf(tran) > -1) {
                          sta.text = state+" unchanged.";
                      } else {
                          sta.text = tran+" rejected.";
                      }
                  }
              }
          }
      }

      context.set('sm', sm);
      this.status({fill:sta.fill,shape:"dot",text:sta.text});
      this.send(msg);
    });
  }
  RED.nodes.registerType("dsm",DsmNode);    
}
