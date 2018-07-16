"use strict";
module.exports = function(RED) {
  
  function DsmNode(n) {
    RED.nodes.createNode(this, n);
    
    this.sm_config = n.sm_config;   
    this.sm_set;
    this.sm = {};
    
    var node = this;
    var context = this.context();
    var global = this.context().global;
    var flow = this.context().flow;
    
    var sm = this.sm;
    var sm_set = this.sm_set;
    var sta = {};
    var output;

    if (this.sm_config) {
      sm = JSON.parse(this.sm_config);
      set_dsm(sm);
      context.set('sm', sm);
      this.status({fill:sta.fill,shape:"dot",text:sta.text});
      sm_set = true;
    }
    
    this.on('input', function(msg) {
      output = false;
      
      if (typeof context.keys()[0] === "undefined") {
        sm_set = false;
      } else {
        sm = context.get('sm');
        sm_set = true;
      }
      
      switch (msg.topic) {
        case "set":
          if (typeof msg.payload !== "object") {
            sta = {fill:"red", text:"invalid payload, not an object"};
          } else {
            sm = msg.payload;
            set_dsm(sm);
            if(sm.states) {
              const stateOutput = sm.stateOutput || "topic";
              RED.util.setMessageProperty(msg,stateOutput,sm.currentState);
            }
            if (typeof sm.methods !== "undefined" && sm.methods.set) {
              process_method(msg, sm, "set");
            }
          }
          break;
        default:
          if (!sm_set) {
            sta = {fill:"red", text:"dsm undefined"};
          } else {
            const triggerInput = sm.triggerInput || "topic";
            const method = RED.util.getMessageProperty(msg,triggerInput);
            
            if (sm.states) {
              process_tran(msg, sm);
            } else {
              sta = {fill:"yellow", text:"no states"}; 
            }
            
            if (typeof sm.methods !== "undefined") {
              if (sm.methods[method]) {
                process_method(msg, sm, method);
              }
              if (sm.methods.onTransition) {
                process_method(msg, sm, "onTransition");
              }
              /* experimental
              if (sm.methods[sm.currentState]) {
                 process_method(msg, sm, sm.currentState);
              }
              */
            }
          }
      }
      
      const globalOutput = sm.globalOutput || false;
      const flowOutput = sm.flowOutput || false;
      if (globalOutput) {
        global.set(globalOutput, sm.currentState);
      }
      if (flowOutput) {
        flow.set(flowOutput, sm.currentState);
      }
      context.set('sm', sm);
      node.status({fill:sta.fill,shape:"dot",text:sta.text});
      
      if (output) {
        if (sm.data) {
          msg.data = sm.data;
        }
        node.send(msg);
      }
    });
    
    function set_dsm(sm) {
      var trans = [];
      
      if (sm.states) {
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
    }
    
    function process_tran(msg, sm) {
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
    }
    
    function process_method(msg, sm, method) {
      var stmnt = sm.methods[method];
      output = true;
      
      sta.text += " - "+method;
      output = true;
      
      if (typeof stmnt === "string") {
        eval(sm.methods[method]);
      } else {
        var param;
        if (typeof(sm.data) !== "undefined" && typeof sm.data[stmnt.param] !== "undefined") {
          param = sm.data[stmnt.param];
        } else {
          param = Number(stmnt.param);
        }
        
        switch (stmnt.name) {
          case "setData":
            const triggerInput = sm.triggerInput || "topic";
            const name = RED.util.getMessageProperty(msg,triggerInput);
            sm.data[name] = msg.payload;
            output = false;
            break;
          case "getData":
            msg.payload = sm.data;
            break;
          case "timer":
            setTimeout(function() {
              node.send(msg)}, param);
            sta.text += ", "+param;
            output = false;
            break;
          case "watchdog":
            if (!sm.timeout) {
              sm.timeout = {};
            }
            if (sm.timeout[method]) {
               clearTimeout(sm.timeout[method]);
            }
            
            sm.timeout[method] = setTimeout(function() {
              node.send(msg)}, param);
              
            sta.text += ", "+param;
            output = false;
            break;
        }
      }
    }
  }
  RED.nodes.registerType("dsm",DsmNode);
};
