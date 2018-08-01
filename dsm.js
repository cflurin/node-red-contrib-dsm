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
    var sta = {fill:"grey",shape:"dot",text:"dsm undefined"};
    var output;

    if (this.sm_config) {
      sm = JSON.parse(this.sm_config);
      set_dsm(sm);
      context.set('sm', sm);
      sm_set = true;
    }
    
    node.status(sta);
    
    this.on('input', function(msg) {
      output = false;
      
      sm = context.get('sm');
      if (typeof sm === "undefined") {
        sm_set = false;
      } else {
        sm_set = true;
      }
      
      switch (msg.topic) {
        case "set":
          if (typeof msg.payload !== "object") {
            sta = {fill:"red",shape:"ring",text:"invalid payload, not an object"};
          } else {
            sm = msg.payload;
            set_dsm(sm);
            sm_set = true;
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
            sta = {fill:"red",shape:"ring",text:"dsm undefined"};
          } else {
            const triggerInput = sm.triggerInput || "topic";
            const method = RED.util.getMessageProperty(msg,triggerInput);
            
            if (typeof sm.methods !== "undefined") {
                if (sm.methods.onBeforeTransition) {
                    process_method(msg, sm, "onBeforeTransition");
                }
            }
            
            if (sm.states) {
              process_tran(msg, sm, method); 
            }
            
            if (typeof sm.methods !== "undefined") {
              if (sm.methods[method]) {
                process_method(msg, sm, method);
              }
              if (sm.methods.onTransition) {
                process_method(msg, sm, "onTransition");
              }
              if (sm.methods.onAfterTransition) {
                process_method(msg, sm, "onAfterTransition");
              }
              if (sm.methods.status) {
                process_status(msg, sm, sm.methods.status);
              }
              /* experimental
              if (sm.methods[sm.currentState]) {
                 process_method(msg, sm, sm.currentState);
              }
              */
            }
          }
      }
      
      if(sm_set) {
        const globalOutput = sm.globalOutput || false;
        const flowOutput = sm.flowOutput || false;
        if (globalOutput) {
          global.set(globalOutput, sm.currentState);
        }
        if (flowOutput) {
          flow.set(flowOutput, sm.currentState);
        }
        context.set('sm', sm);
      }
      
      node.status(sta);
      
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
      }
      sta = {fill:"grey",shape:"dot",text:"dsm ready"};
    }
    
    function process_tran(msg, sm, method) {
      const triggerInput = sm.triggerInput || "topic";
      const stateOutput = sm.stateOutput || "topic";
      const state = sm.currentState;
      const tran = RED.util.getMessageProperty(msg,triggerInput);
      
      if (typeof sm.states[state] === "undefined") {
        sta = {fill:"red",shape:"ring",text:state+" undefined"};
      } else {
        if (sm.states[state][tran]) {
          output = true;
          sm.currentState = sm.states[state][tran];
          RED.util.setMessageProperty(msg,stateOutput,sm.currentState);
          sta = {fill:"green",shape:"dot",text:sm.currentState};
        } else {
          if(sm.trans.indexOf(tran) > -1) {
            sta = {fill:"green",shape:"dot",text:sm.currentState};
          } else {
            if (sm.methods && !sm.methods[method]) {
              sta = {fill:"yellow",shape:"ring",text:tran+" undefined"};
            }
          }
        }
      }
    }
    
    function process_method(msg, sm, method) {
      var stmnt = sm.methods[method];
      
      if (typeof stmnt === "string") {
        eval(stmnt);
      } else {
        if (Array.isArray(stmnt)) {
          eval(stmnt.join(''));
        } else { // build in methods
          var param;
          if (typeof(sm.data) !== "undefined" && typeof sm.data[stmnt.param] !== "undefined") {
            param = sm.data[stmnt.param];
          } else {
            param = stmnt.param;
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
              output = true;
              break;
            case "timer":
              process_timer(msg, sm, method, stmnt, param);
              break;
            case "resetTimer":
              if (sm.timeout && sm.timeout[param]) {
                clearTimeout(sm.timeout[param]);
              }
              break;
            case "watchdog":
              if (!sm.timeout) {
                sm.timeout = {};
              }
              if (sm.timeout[method]) {
                clearTimeout(sm.timeout[method]);
              }
              sm.timeout[method] = setTimeout(function() {
                node.send(msg)
              }, param);
                
              output = false;
              break;
          }
        }
      }
    }
    
    function process_timer(msg, sm, method, stmnt, param) {     
      if (!sm.send) sm.send = {}; 
      if (stmnt.send) {
        if (typeof stmnt.send === "string") {
          sm.send[method] = stmnt.send;
        } else {
          if (typeof stmnt.send.get == "string") {
            sm.send[method] = eval(stmnt.send.get);
          } else {
            if (Array.isArray(sm.send.get)) {
              sm.send[method] = eval(stmnt.send.get.join(''));
            }
          }
        }
      }
      
      if (!sm.timeout) sm.timeout = {};
      sm.timeout[method] = setTimeout(function() {
        if (sm.send[method]) {
            msg.payload = sm.send[method];
        }
        node.send(msg)
      }, param);
        
      output = false;
    }

    function process_status(msg, sm, status) {
      if (status.fill) {
        process_property(msg, sm, status, 'fill');
      }        
      if (status.shape) {
        process_property(msg, sm, status, 'shape');
      }
      if (status.text) {
        process_property(msg, sm, status, 'text');
      }
    }
    
    function process_property(msg, sm, status, prop) {
      if (typeof status[prop] === "string") {
        sta[prop] = status[prop];
      } else {
        if (typeof status[prop].get ===  "string") {
          sta[prop] = eval(status[prop].get);
        } else {
          if (Array.isArray(status[prop].get)) {
            sta[prop] = eval(status[prop].get.join(''));
          }    
        }
      }
    }
    
  }
  RED.nodes.registerType("dsm",DsmNode);
};
