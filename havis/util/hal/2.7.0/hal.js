/*
 * This javascript library provides a wrapper for the HaVIS Application Suite Client IOService and 
 * System service to send JSON-RPCs via direct calls
 */
var hal = {
    replacedWebSockets: {},
    serviceListener: {},
    socketListener: null,
    socketErrorListener: null,
    addSocketListener: function (callback) {
        hal.socketListener = callback;
        if (typeof LocalSocket != "undefined") {
            callback();
        }
    },
    addServiceListener: function (service, callback) {
        hal.serviceListener[service] = callback;
        if (typeof LocalSocket != "undefined") {
            var result = hal.exec(service, {}, undefined, service);
            callback(service, result.status.length == 0);
        }
    },
    addSocketErrorListener: function (callback) {
        hal.socketErrorListener = callback;
    },
    buildResponse: function (res, key) {
        //If response has any errors, map code to Exception
        if (res.error) {
            var error = {
                "status": "",
                "result": res.error.message
            };
            switch (res.error.code) {
                case -32000:
                    error.status = "ValidationException";
                    break;
                case -32001:
                    error.status = "DeviceException";
                    break;
                default:
                    error.status = "ImplementationException";
            }
            return error;
        } else {
            if (key) {
                //If service is requested, result must be null. There is no key then.
                if (res.result) {
                    //Return wrapped result
                    return {
                        "status": "",
                        "result": res.result[key]
                    };
                } else {
                    return {
                        "status": "",
                        "result": res.result
                    };
                }
            }
            //Return unwrapped result
            else {
                return {
                    "status": "",
                    "result": res.result
                };
            }
        }
    },

    /**
     * Executes a JSON RPC
     * If LocalSocket object is used, the call is synchronous, else the call is asynchronous
     * @returns {status, result} Result of the synchronous call or empty status and result.
     * @params method, params, callback, key
     */
    exec: function (method, params, callback, key) {
        var id = hal.uid();
        var req = {
            "id": id,
            "method": method,
            "params": params,
            "jsonrpc": "2.0"
        };
        if (typeof LocalSocket == "undefined") {
            Socket.callbacks[id] = {
                "callback": callback,
                "key": key
            };
            Socket.connection.send(JSON.stringify(req));
            return {
                "status": "",
                "result": ""
            };
        } else {
            var res = JSON.parse(LocalSocket.send(JSON.stringify(req)));
            return this.buildResponse(res, key);
        }
    },

    /**
     * Generates a GUID string.
     * @returns {String} The generated GUID.
     * @example 12345678-abcd-efab-cdef-87654321
     */
    uid: function () {
        function uidPart(delimiter) {
            //Math.random generates a random float. ToString generates hex, 
            //Add zeros to get the minimum length and build substring to remove 0.
            var part = (Math.random().toString(16) + "000000000").substr(2, 8);
            if (delimiter) {
                return "-" + part.substr(0, 4) + "-" + part.substr(4, 4);
            } else {
                return part;
            }
        }
        return uidPart(false) + uidPart(true) + uidPart(true) + uidPart(false);
    },

    createWebSocket: function (url) {
        if (typeof LocalSocket != "undefined" && hal.exec("channel.hasChannel", {}).result.hasChannel == true) {
            var replacedWebSocket = new WebSocketReplacement(url);
            hal.replacedWebSockets[replacedWebSocket.uuid] = replacedWebSocket;
            return replacedWebSocket;
        } else {
            return new WebSocket(url);
        }
    }
};

//Compatibility to version < 1.7.0
if (typeof System == "undefined") {
    var System = {
        //Initialize necessary objects
        init: function () {
            this.Config = {
                getConfig: function (callback) {
                    var response = hal.exec("config.getConfig", {}, callback);
                    if (typeof LocalSocket != "undefined") {
                        if (typeof callback != "undefined") {
                            callback(response);
                        }
                        return response;
                    }
                },
                getSupportedProperties: function (path, callback) {
                    var response = hal.exec("config.getSupportedProperties", {
                        "path": path
                    }, callback);
                    if (typeof LocalSocket != "undefined") {
                        if (typeof callback != "undefined") {
                            callback(response);
                        }
                    }
                    return response;
                },
                getSupportedValues: function (property, callback) {
                    var response = hal.exec("config.getSupportedValues", {
                        "property": property
                    }, callback);
                    if (typeof LocalSocket != "undefined") {
                        if (typeof callback != "undefined") {
                            callback(response);
                        }
                        return response;
                    }

                },
                setConfig: function (config, callback) {
                    var response = hal.exec("config.setConfig", {
                        "config": config
                    }, callback);
                    if (typeof LocalSocket != "undefined") {
                        if (typeof callback != "undefined") {
                            callback(response);
                        }
                        return response;
                    }
                }
            };
            this.View = {
                evaluateJavascript: function (js, callback) {
                    if (typeof LocalSocket == "undefined") {
                        var response = hal.exec("view.evaluateJavascript", {
                            "javascript": js
                        }, callback);
                    } else {
                        var response = {
                            "status": "",
                            "result": eval(js)
                        };
                        if (typeof callback != "undefined") {
                            callback(response);
                        }
                        return response;
                    }
                }
            };
        }
    };
}

//Compatibility to version < 1.7.0
if (typeof Service == "undefined") {
    var Service = {
        init: function () {
            if (hal.exec("display", {}, undefined, "display").status.length == 0) {
                this.Display = {
                    getDisplayResolution: function (callback) {
                        var response = hal.exec("display.getDisplayResolution", {}, callback, "displayResolution");
                        if (typeof LocalSocket != "undefined") {
                            if (typeof callback != "undefined") {
                                callback(response);
                            }
                            return response;
                        }
                    }
                };
            }
            if (hal.exec("barcode", {}, undefined, "barcode").status.length == 0) {
                this.Barcode = {
                    barcodeScan: function (callback) {
                        var response = hal.exec("barcode.barcodeScan", {}, callback);
                        if (typeof LocalSocket != "undefined") {
                            if (typeof callback != "undefined") {
                                callback(response);
                            }
                            return response;
                        }
                    }
                };
            }
            if (hal.exec("capabilities", {}, undefined, "capabilities").status.length == 0) {
                this.Capabilities = {
                    getCapabilities: function (callback) {
                        var response = hal.exec("capabilities.getCapabilities", {}, callback);
                        if (typeof LocalSocket != "undefined") {
                            if (typeof callback != "undefined") {
                                callback(response);
                            }
                            return response;
                        }
                    },
                    getCapability: function (capability, callback) {
                        var response = hal.exec("capabilities.getCapability", {
                            "capability": capability
                        }, callback);
                        if (typeof LocalSocket != "undefined") {
                            if (typeof callback != "undefined") {
                                callback(response);
                            }
                            return response;
                        }
                    }
                };
            }
            if (hal.exec("keyboard", {}, undefined, "keyboard").status.length == 0) {
                this.Keyboard = {
                    eventCallBack: null,
                    getKeyEvents: function (callback) {
                        var response = hal.exec("keyboard.getKeyEvents", {}, callback);
                        if (typeof LocalSocket != "undefined") {
                            if (typeof callback != "undefined") {
                                callback(response);
                            }
                            return response;
                        }
                    },
                    subscribeKeyEvent: function (event, callback) {
                        var response = hal.exec("keyboard.subscribeKeyEvent", {
                            "event": event
                        });
                        if (typeof LocalSocket != "undefined") {
                            if (typeof callback != "undefined") {
                                callback(response);
                            }
                            return response;
                        }
                    },
                    unsubscribeKeyEvent: function (event, callback) {
                        var response = hal.exec("keyboard.unsubscribeKeyEvent", {
                            "event": event
                        });
                        if (typeof LocalSocket != "undefined") {
                            if (typeof callback != "undefined") {
                                callback(response);
                            }
                            return response;
                        }
                    },
                    notifyKeyEvent: {
                        connect: function (callback) {
                            if (typeof LocalSocket != "undefined") {
                                Service.Keyboard.eventCallBack = callback;
                                if ((typeof LocalSocket.notifyKeyEvent != "undefined") && (LocalSocket.notifyKeyEvent != null)) {
                                    LocalSocket.notifyKeyEvent.connect(Service.Keyboard.eventCallBack);
                                 }
                            } else {
                                Socket.eventCallbacks.push(callback);
                            }
                        }
                    }
                };
            }

            if (hal.exec("c1g2", {}, undefined, "c1g2").status.length == 0) {
                this.C1G2 = {
                    tagInventory: function (callback) {
                        var response = hal.exec("c1g2.tagInventory", {}, callback, "tags");
                        if (typeof LocalSocket != "undefined") {
                            if (typeof callback != "undefined") {
                                callback(response);
                            }
                            return response;
                        }
                    },
                    executeTagOperation: function (operations, filter, callback) {
                        var response = hal.exec("c1g2.executeTagOperation", {
                            "operations": operations,
                            "filter": filter
                        }, callback, "executeResults");
                        if (typeof LocalSocket != "undefined") {
                            if (typeof callback != "undefined") {
                                callback(response);
                            }
                            return response;
                        }
                    }
                };
            }
        }
    };
}

//Switch between browser, which are capable of websocket, and the AS-Client
if (typeof LocalSocket == "undefined") {
    //Not used if LocalSocket object used
    var Socket = {
        retryTimer: 50,
        isOpen: false,
        reinit: false,
        //Map of callbacks stored
        callbacks: {},
        //Map Callbacks for key event, which must be connected
        eventCallbacks: [],
        webSocketAddress: "ws://localhost:80",
        properties: null,
        connection: null,
        create: function (webSocketAddress) {
            if (typeof webSocketAddress != "undefined") {
                Socket.webSocketAddress = webSocketAddress;
            }
            if (Socket.webSocketAddress == null) {
                return;
            }
            if (Socket.isOpen == false) {
                Socket.connection = new WebSocket(Socket.webSocketAddress);
                Socket.connection.onopen = Socket.onopen;
                Socket.connection.onclose = Socket.onclose;
                Socket.connection.onerror = Socket.onerror;
                Socket.connection.onmessage = Socket.onmessage;
            } else {
                Socket.connection.close();
                Socket.reinit = true;
            }
        },
        onopen: function () {
            //Send properties. Result must be handled in callback.
            Socket.isOpen = true;
            Service.init();
            System.init();
            if (hal.socketListener != null) {
                hal.socketListener();
            }
        },
        onclose: function () {
            Socket.isOpen = false;
            if (Socket.reinit == true) {
                Socket.create(Socket.webSocketAddress);
                Socket.reinit = false;
            }
        },
        onerror: function (error) {
            if (typeof hal.socketErrorListener != "undefined" && hal.socketErrorListener != null) {
                Socket.webSocketAddress = hal.socketErrorListener(Socket.webSocketAddress);
                Socket.reinit = true;
            } else {
                if (Socket.retryTimer <= 200) {
                    setTimeout(function () {
                        Socket.onerror(error);
                    }, Socket.retryTimer);
                    Socket.retryTimer *= 2;
                }
            }
        },
        onmessage: function (e) {
            var jsonResponse = JSON.parse(e.data);
            if (Socket.callbacks.hasOwnProperty(jsonResponse.id)) {
                if (typeof Socket.callbacks[jsonResponse.id].callback != "undefined") {
                    Socket.callbacks[jsonResponse.id].callback(hal.buildResponse(jsonResponse, Socket.callbacks[jsonResponse.id].key));
                } else {
                    //Handle the result of a service request
                    var key = Socket.callbacks[jsonResponse.id].key;
                    var active = false;
                    switch (key) {
                        case "c1g2":
                            if (typeof jsonResponse.error != "undefined") {
                                Service.C1G2 = null;
                            } else {
                                active = true;
                            }
                            if (typeof hal.serviceListener.c1g2 != "undefined") {
                                hal.serviceListener.c1g2(key, active);
                            }
                            break;
                        case "display":
                            if (typeof jsonResponse.error != "undefined") {
                                Service.Display = null;
                            } else {
                                active = true;
                            }
                            if (typeof hal.serviceListener.display != "undefined") {
                                hal.serviceListener.display(key, active);
                            }
                            break;
                        case "keyboard":
                            if (typeof jsonResponse.error != "undefined") {
                                Service.Keyboard = null;
                            } else {
                                active = true;
                            }
                            if (typeof hal.serviceListener.keyboard != "undefined") {
                                hal.serviceListener.keyboard(key, active);
                            }
                            break;
                        case "barcode":
                            if (typeof jsonResponse.error != "undefined") {
                                Service.Barcode = null;
                            } else {
                                active = true;
                            }
                            if (typeof hal.serviceListener.barcode != "undefined") {
                                hal.serviceListener.barcode(key, active);
                            }
                            break;
                        case "capabilities":
                            if (typeof jsonResponse.error != "undefined") {
                                Service.Capabilities = null;
                            } else {
                                active = true;
                            }
                            if (typeof hal.serviceListener.capabilities != "undefined") {
                                hal.serviceListener.capabilities(key, active);
                            }
                            break;
                    }
                }
            } else if (jsonResponse.id == "Service.notifyKeyEvent") {
                var callback;
                for (callback in Socket.eventCallbacks) {
                    if (Socket.eventCallbacks.hasOwnProperty(callback)) {
                        Socket.eventCallbacks[callback](jsonResponse.result.key);
                    }
                }
            }
        }
    };
    Socket.create();
} else {
    if (hal.exec("channel.hasChannel", {}).result.hasChannel == true) {
        //Websocket replacement to exchange the websocket implementation of Qt
        var WebSocketReplacement = function (url) {
            this.onopen = null;
            this.onclose = null;
            this.onerror = null;
            this.onmessage = null;
            this.isOpened = false;
            var uuid = hal.exec("channel.open", {
                "url": url
            }).result;
            this.uuid = uuid;
            this.send = function (msg) {
                hal.exec("channel.send", {
                    "uuid": this.uuid,
                    "msg": msg
                });
            };
            this.close = function () {
                hal.exec("channel.close", {
                    "uuid": this.uuid
                });
            };
        };
        //Connect Websocket messages
        var onChannelOpen = function (uuid) {
            if (hal.replacedWebSockets.hasOwnProperty(uuid)) {
                if (hal.replacedWebSockets[uuid].onopen != null) {
                    hal.replacedWebSockets[uuid].onopen();
                }
            }
        };
        var onChannelClose = function (uuid, closeEvent) {
            if (hal.replacedWebSockets.hasOwnProperty(uuid)) {
                if (hal.replacedWebSockets[uuid].onclose != null) {
                    hal.replacedWebSockets[uuid].onclose(closeEvent);
                }
            }
        };
        var onChannelMessage = function (uuid, msgEvent) {
            if (hal.replacedWebSockets.hasOwnProperty(uuid)) {
                if (hal.replacedWebSockets[uuid].onmessage != null) {
                    hal.replacedWebSockets[uuid].onmessage(msgEvent);
                }
            }
        };
        var onChannelError = function (uuid, errorEvent) {
            if (hal.replacedWebSockets.hasOwnProperty(uuid)) {
                if (hal.replacedWebSockets[uuid].onerror != null) {
                    hal.replacedWebSockets[uuid].onerror(errorEvent);
                }
            }
        };
        LocalSocket.onChannelOpen.connect(onChannelOpen);
        LocalSocket.onChannelClose.connect(onChannelClose);
        LocalSocket.onChannelMessage.connect(onChannelMessage);
        LocalSocket.onChannelError.connect(onChannelError);
    }
    if (typeof System != "undefined") {
        System.init();
    }
    if (typeof Service != "undefined") {
        Service.init();
    }

}
