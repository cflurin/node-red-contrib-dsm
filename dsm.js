"use strict";
module.exports = function(RED) {
  
  function DsmNode(n) {
    RED.nodes.createNode(this, n);
    
    this.sm_config = n.sm_config;   
    this.sm_set;
    this.sm = {};
    this.timeout = {};
    this.obj = {};
    
    var node = this;
    var context = this.context();
    var global = this.context().global;
    var flow = this.context().flow;
    
    var sm = this.sm;
    var timeout = this.timeout;
    var obj = this.obj;
    var sm_set = this.sm_set;
    var sta = {fill:"grey",shape:"dot",text:"dsm undefined"};
    var output;
    
    if (this.sm_config) {
      sm = JSON.parse(this.sm_config);
      set_dsm(sm);
      context.set('sm', sm);
      sm_set = true;
    } else {
      sm = context.get('sm');
      if (typeof sm === "undefined") {
        sm_set = false;
      } else {
        set_dsm(sm);
        sm_set = true;
        if (typeof sm.currentState !== "undefined") {
          sta = {fill:"green",shape:"dot",text:sm.currentState};
        } else {
          sta = {};
        }
      }
    }
    
    node.status(sta);
    
    this.on('input', function(msg) {
      var sm_on_input = {};
      output = false;
      
      sm = context.get('sm');
      if (typeof sm === "undefined") {
        sm_set = false;
      } else {
        sm_on_input = RED.util.cloneMessage(sm);
        sm_set = true;
      }
            
      process_input(msg);
      
      if (sm_set) {
        const globalOutput = sm.globalOutput || false;
        const flowOutput = sm.flowOutput || false;
        if (globalOutput && sm.currentState) {
          global.set(globalOutput, sm.currentState);
        }
        if (flowOutput && sm.currentState) {
          flow.set(flowOutput, sm.currentState);
        }
        // save sm if modified
        if (!RED.util.compareObjects(sm, sm_on_input)) {
          context.set('sm', sm);
        }
      }
      
      node.status(sta);
      
      if (output) {
        if (sm.data) {
          msg.data = sm.data;
        }
        node.send(msg);
      }
    });
          
    this.on('close', function(removed, done) {
      // removed not used
      if (Object.keys(timeout).length > 0) {
        for (var k in timeout) {
          clearTimeout(timeout[k]);
        }
      }
      done();
    });
      
    /**
    * dsm specific functions
    **/
    
    function process_input(msg) {      
      switch (msg.topic) {
        case "set":
          if (typeof msg.payload !== "object") {
            sta = {fill:"red",shape:"ring",text:"invalid payload, not an object"};
          } else {
            sm = msg.payload;
            set_dsm(sm);
            sm_set = true;
            if (sm.states && sm.currentState) {
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
            if (typeof sm.methods !== "undefined") {
                if (sm.methods.onBeforeTransition) {
                    process_method(msg, sm, "onBeforeTransition");
                }
            }
            
            const triggerInput = sm.triggerInput || "topic";
            const method = RED.util.getMessageProperty(msg,triggerInput);
            
            if (sm.states) {
              process_tran(msg, sm, method); 
            }
            
            if (typeof sm.methods !== "undefined") {
              if (sm.methods[method]) {
                process_method(msg, sm, method);
              } else if (sm.methods.default) {
                process_method(msg, sm, "default");
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
    }
    
    function set_dsm(sm) {
      if (sm.currentState) {
        sta = {fill:"green",shape:"dot",text:sm.currentState};
      } else {
        sta = {};
      }
      
      if (typeof sm.methods !== "undefined" && sm.methods.init) {
        var stmnt = sm.methods.init;
        
        if (typeof stmnt === "string") {
          execute(null, sm, stmnt);
        } else if (Array.isArray(stmnt)) {
          execute(null, sm, stmnt.join(''));
        }
      }
            
      /* experimental 'sm.trans' is not used
      sm.trans = [];
      if (sm.states) {
        Object.keys(sm.states).forEach(function(key) {
          Object.keys(sm.states[key]).forEach(function(s) {
            if (sm.trans.indexOf(s) < 0) sm.trans.push(s);
          });
        });
      }
      */
    }
    
    function process_tran(msg, sm, method) {
      const triggerInput = sm.triggerInput || "topic";
      const stateOutput = sm.stateOutput || "topic";
      const preStateOutput = sm.preStateOutput || "preState";
      const state = sm.currentState;
      const tran = RED.util.getMessageProperty(msg,triggerInput);
      
      if (typeof sm.states[state] === "undefined") {
        sta = {fill:"red",shape:"ring",text:"state undefined"};
      } else {
        if (sm.states[state][tran]) {
          output = true;
          sm.preState = sm.currentState;
          RED.util.setMessageProperty(msg,preStateOutput,sm.preState);
                    
          sm.currentState = sm.states[state][tran];
          RED.util.setMessageProperty(msg,stateOutput,sm.currentState);
          sta = {fill:"green",shape:"dot",text:sm.currentState};
        }
      }
    }
    
    function process_method(msg, sm, method) {
      var stmnt = sm.methods[method];
      
      if (typeof stmnt === "string") {
        execute(msg, sm, stmnt);
      } else if (Array.isArray(stmnt)) {
        execute(msg, sm, stmnt.join(''));
      } else { // build in methods
        var param;
        if (typeof sm.data !== "undefined" && typeof sm.data[stmnt.param] !== "undefined") {
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
          case "watchdog":
            process_watchdog(msg, sm, method, stmnt, param);
            break;
          case "resetTimer":
            process_resetTimer(msg, sm, method, stmnt, param);
            break;
        }
      }
    }
   
    function process_timer(msg, sm, method, stmnt, param) {
      if (timeout[method]) {
        clearTimeout(timeout[method]);
      }
      
      parse_methods(msg, sm, method, stmnt);
            
      timeout[method] = setTimeout(function() {
        if (typeof sm.send !== "undefined" && sm.send[method]) {
          msg.payload = sm.send[method];
          node.send(msg);
        } else if (typeof sm.do !== "undefined" && sm.do[method]) {
          execute(msg, sm, sm.do[method]);
        } else {
          node.send(msg);
        }
        node.status(sta);
        timeout[method] = null;
      }, param);
        
      output = false;
    }
    
    function process_watchdog(msg, sm, method, stmnt, param) {
      if (timeout[method]) {
        clearTimeout(timeout[method]);
      }
      
      parse_methods(msg, sm, method, stmnt);
      
      timeout[method] = setTimeout(function() {
        if (typeof sm.send !== "undefined" && sm.send[method]) {
          msg.payload = sm.send[method];
          node.send(msg);
        } else if (typeof sm.do !== "undefined" && sm.do[method]) {
          execute(msg, sm, sm.do[method]);
        } else {
          node.send(msg);
        }
        node.status(sta);
        timeout[method] = null;
      }, param);
        
      output = false;
    }
    
    function process_resetTimer(msg, sm, method, stmnt, param) {
      if (timeout[param]) {
        clearTimeout(timeout[param]);
      }
      
      parse_methods(msg, sm, method, stmnt);
    
      if (typeof sm.send !== "undefined" && sm.send[method]) {
        msg.payload = sm.send[method];
        node.send(msg);
      } else if (typeof sm.do !== "undefined" && sm.do[method]) {
        execute(msg, sm, sm.do[method]);
      }
      
      output = false;
    }
    
    function parse_methods(msg, sm, method, stmnt) {
      if (stmnt.send) {
        if (!sm.send) sm.send = {};
        if (typeof stmnt.send === "string") {
          sm.send[method] = stmnt.send;
        } else {
          if (typeof stmnt.send.get === "string") {
            sm.send[method] = execute(msg, sm, stmnt.send.get);
          } else {
            if (Array.isArray(stmnt.send.get)) {
              sm.send[method] = execute(msg, sm, stmnt.send.get.join(''));
            }
          }
        }
      } else if (stmnt.do) {
        if (!sm.do) sm.do = {}; 
        if (typeof stmnt.do === "string") {
          sm.do[method] = stmnt.do;
        } else if (Array.isArray(stmnt.do)) {
          sm.do[method] = stmnt.do.join('');
        }
      }
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
          sta[prop] = execute(msg, sm, status[prop].get);
        } else {
          if (Array.isArray(status[prop].get)) {
            sta[prop] = execute(msg, sm, status[prop].get.join(''));
          }    
        }
      }
    }
    
    function execute(msg, sm, stmnt) {
      try {
        return eval(stmnt);
      } catch(err) {
        node.error(err);
        node.error(stmnt);
      }
    }
    
    function resume(trigger, msg) {
      const triggerInput = sm.triggerInput || "topic";
      msg[triggerInput] = trigger;
      //node.warn(triggerInput+ ' '+msg[triggerInput]);
      node.emit('input', msg);
    }
    
    /**
    * utility functions
    **/
    
    // return "YYYY-MM-DDThh:mm:ss.sss"   
    function timestamp() {
      var d = new Date();
      return d.getFullYear() +
        '-' + pad(d.getMonth() + 1) +
        '-' + pad(d.getDate()) +
        'T' + pad(d.getHours()) +
        ':' + pad(d.getMinutes()) +
        ':' + pad(d.getSeconds()) +
        '.' + (d.getMilliseconds() / 1000).toFixed(3).slice(2, 5);
    }
    
    function pad(number) {
      if (number < 10) {
        return '0' + number;
      }
      return number;
    }

  }
  RED.nodes.registerType("dsm",DsmNode);
};
