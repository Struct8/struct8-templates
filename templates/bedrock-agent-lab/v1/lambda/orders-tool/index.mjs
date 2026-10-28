// Built by lambda-src/build.mjs from lambda-src/orders-tool/index.mjs.
// Edit the source there and build again; a change made here is lost.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res, err2) => function __init() {
  if (err2) throw err2[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e6) {
    throw err2 = [e6], e6;
  }
};
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e6) {
    throw mod = 0, e6;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/@smithy/core/dist-es/submodules/client/middleware-stack/MiddlewareStack.js
var getAllAliases, getMiddlewareNameWithAliases, constructStack, stepWeights, priorityWeights;
var init_MiddlewareStack = __esm({
  "node_modules/@smithy/core/dist-es/submodules/client/middleware-stack/MiddlewareStack.js"() {
    getAllAliases = /* @__PURE__ */ __name((name, aliases) => {
      const _aliases = [];
      if (name) {
        _aliases.push(name);
      }
      if (aliases) {
        for (const alias of aliases) {
          _aliases.push(alias);
        }
      }
      return _aliases;
    }, "getAllAliases");
    getMiddlewareNameWithAliases = /* @__PURE__ */ __name((name, aliases) => {
      return `${name || "anonymous"}${aliases && aliases.length > 0 ? ` (a.k.a. ${aliases.join(",")})` : ""}`;
    }, "getMiddlewareNameWithAliases");
    constructStack = /* @__PURE__ */ __name(() => {
      let absoluteEntries = [];
      let relativeEntries = [];
      let identifyOnResolve = false;
      const entriesNameSet = /* @__PURE__ */ new Set();
      const sort = /* @__PURE__ */ __name((entries) => entries.sort((a6, b6) => stepWeights[b6.step] - stepWeights[a6.step] || priorityWeights[b6.priority || "normal"] - priorityWeights[a6.priority || "normal"]), "sort");
      const removeByName = /* @__PURE__ */ __name((toRemove) => {
        let isRemoved = false;
        const filterCb = /* @__PURE__ */ __name((entry) => {
          const aliases = getAllAliases(entry.name, entry.aliases);
          if (aliases.includes(toRemove)) {
            isRemoved = true;
            for (const alias of aliases) {
              entriesNameSet.delete(alias);
            }
            return false;
          }
          return true;
        }, "filterCb");
        absoluteEntries = absoluteEntries.filter(filterCb);
        relativeEntries = relativeEntries.filter(filterCb);
        return isRemoved;
      }, "removeByName");
      const removeByReference = /* @__PURE__ */ __name((toRemove) => {
        let isRemoved = false;
        const filterCb = /* @__PURE__ */ __name((entry) => {
          if (entry.middleware === toRemove) {
            isRemoved = true;
            for (const alias of getAllAliases(entry.name, entry.aliases)) {
              entriesNameSet.delete(alias);
            }
            return false;
          }
          return true;
        }, "filterCb");
        absoluteEntries = absoluteEntries.filter(filterCb);
        relativeEntries = relativeEntries.filter(filterCb);
        return isRemoved;
      }, "removeByReference");
      const cloneTo = /* @__PURE__ */ __name((toStack) => {
        absoluteEntries.forEach((entry) => {
          toStack.add(entry.middleware, { ...entry });
        });
        relativeEntries.forEach((entry) => {
          toStack.addRelativeTo(entry.middleware, { ...entry });
        });
        toStack.identifyOnResolve?.(stack.identifyOnResolve());
        return toStack;
      }, "cloneTo");
      const expandRelativeMiddlewareList = /* @__PURE__ */ __name((from) => {
        const expandedMiddlewareList = [];
        from.before.forEach((entry) => {
          if (entry.before.length === 0 && entry.after.length === 0) {
            expandedMiddlewareList.push(entry);
          } else {
            expandedMiddlewareList.push(...expandRelativeMiddlewareList(entry));
          }
        });
        expandedMiddlewareList.push(from);
        from.after.reverse().forEach((entry) => {
          if (entry.before.length === 0 && entry.after.length === 0) {
            expandedMiddlewareList.push(entry);
          } else {
            expandedMiddlewareList.push(...expandRelativeMiddlewareList(entry));
          }
        });
        return expandedMiddlewareList;
      }, "expandRelativeMiddlewareList");
      const getMiddlewareList = /* @__PURE__ */ __name((debug = false) => {
        const normalizedAbsoluteEntries = [];
        const normalizedRelativeEntries = [];
        const normalizedEntriesNameMap = {};
        absoluteEntries.forEach((entry) => {
          const normalizedEntry = {
            ...entry,
            before: [],
            after: []
          };
          for (const alias of getAllAliases(normalizedEntry.name, normalizedEntry.aliases)) {
            normalizedEntriesNameMap[alias] = normalizedEntry;
          }
          normalizedAbsoluteEntries.push(normalizedEntry);
        });
        relativeEntries.forEach((entry) => {
          const normalizedEntry = {
            ...entry,
            before: [],
            after: []
          };
          for (const alias of getAllAliases(normalizedEntry.name, normalizedEntry.aliases)) {
            normalizedEntriesNameMap[alias] = normalizedEntry;
          }
          normalizedRelativeEntries.push(normalizedEntry);
        });
        normalizedRelativeEntries.forEach((entry) => {
          if (entry.toMiddleware) {
            const toMiddleware = normalizedEntriesNameMap[entry.toMiddleware];
            if (toMiddleware === void 0) {
              if (debug) {
                return;
              }
              throw new Error(`${entry.toMiddleware} is not found when adding ${getMiddlewareNameWithAliases(entry.name, entry.aliases)} middleware ${entry.relation} ${entry.toMiddleware}`);
            }
            if (entry.relation === "after") {
              toMiddleware.after.push(entry);
            }
            if (entry.relation === "before") {
              toMiddleware.before.push(entry);
            }
          }
        });
        const mainChain = sort(normalizedAbsoluteEntries).map(expandRelativeMiddlewareList).reduce((wholeList, expandedMiddlewareList) => {
          wholeList.push(...expandedMiddlewareList);
          return wholeList;
        }, []);
        return mainChain;
      }, "getMiddlewareList");
      const stack = {
        add: /* @__PURE__ */ __name((middleware, options = {}) => {
          const { name, override, aliases: _aliases } = options;
          const entry = {
            step: "initialize",
            priority: "normal",
            middleware,
            ...options
          };
          const aliases = getAllAliases(name, _aliases);
          if (aliases.length > 0) {
            if (aliases.some((alias) => entriesNameSet.has(alias))) {
              if (!override)
                throw new Error(`Duplicate middleware name '${getMiddlewareNameWithAliases(name, _aliases)}'`);
              for (const alias of aliases) {
                const toOverrideIndex = absoluteEntries.findIndex((entry2) => entry2.name === alias || entry2.aliases?.some((a6) => a6 === alias));
                if (toOverrideIndex === -1) {
                  continue;
                }
                const toOverride = absoluteEntries[toOverrideIndex];
                if (toOverride.step !== entry.step || entry.priority !== toOverride.priority) {
                  throw new Error(`"${getMiddlewareNameWithAliases(toOverride.name, toOverride.aliases)}" middleware with ${toOverride.priority} priority in ${toOverride.step} step cannot be overridden by "${getMiddlewareNameWithAliases(name, _aliases)}" middleware with ${entry.priority} priority in ${entry.step} step.`);
                }
                absoluteEntries.splice(toOverrideIndex, 1);
              }
            }
            for (const alias of aliases) {
              entriesNameSet.add(alias);
            }
          }
          absoluteEntries.push(entry);
        }, "add"),
        addRelativeTo: /* @__PURE__ */ __name((middleware, options) => {
          const { name, override, aliases: _aliases } = options;
          const entry = {
            middleware,
            ...options
          };
          const aliases = getAllAliases(name, _aliases);
          if (aliases.length > 0) {
            if (aliases.some((alias) => entriesNameSet.has(alias))) {
              if (!override)
                throw new Error(`Duplicate middleware name '${getMiddlewareNameWithAliases(name, _aliases)}'`);
              for (const alias of aliases) {
                const toOverrideIndex = relativeEntries.findIndex((entry2) => entry2.name === alias || entry2.aliases?.some((a6) => a6 === alias));
                if (toOverrideIndex === -1) {
                  continue;
                }
                const toOverride = relativeEntries[toOverrideIndex];
                if (toOverride.toMiddleware !== entry.toMiddleware || toOverride.relation !== entry.relation) {
                  throw new Error(`"${getMiddlewareNameWithAliases(toOverride.name, toOverride.aliases)}" middleware ${toOverride.relation} "${toOverride.toMiddleware}" middleware cannot be overridden by "${getMiddlewareNameWithAliases(name, _aliases)}" middleware ${entry.relation} "${entry.toMiddleware}" middleware.`);
                }
                relativeEntries.splice(toOverrideIndex, 1);
              }
            }
            for (const alias of aliases) {
              entriesNameSet.add(alias);
            }
          }
          relativeEntries.push(entry);
        }, "addRelativeTo"),
        clone: /* @__PURE__ */ __name(() => cloneTo(constructStack()), "clone"),
        use: /* @__PURE__ */ __name((plugin) => {
          plugin.applyToStack(stack);
        }, "use"),
        remove: /* @__PURE__ */ __name((toRemove) => {
          if (typeof toRemove === "string")
            return removeByName(toRemove);
          else
            return removeByReference(toRemove);
        }, "remove"),
        removeByTag: /* @__PURE__ */ __name((toRemove) => {
          let isRemoved = false;
          const filterCb = /* @__PURE__ */ __name((entry) => {
            const { tags, name, aliases: _aliases } = entry;
            if (tags && tags.includes(toRemove)) {
              const aliases = getAllAliases(name, _aliases);
              for (const alias of aliases) {
                entriesNameSet.delete(alias);
              }
              isRemoved = true;
              return false;
            }
            return true;
          }, "filterCb");
          absoluteEntries = absoluteEntries.filter(filterCb);
          relativeEntries = relativeEntries.filter(filterCb);
          return isRemoved;
        }, "removeByTag"),
        concat: /* @__PURE__ */ __name((from) => {
          const cloned = cloneTo(constructStack());
          cloned.use(from);
          cloned.identifyOnResolve(identifyOnResolve || cloned.identifyOnResolve() || (from.identifyOnResolve?.() ?? false));
          return cloned;
        }, "concat"),
        applyToStack: cloneTo,
        identify: /* @__PURE__ */ __name(() => {
          return getMiddlewareList(true).map((mw) => {
            const step = mw.step ?? mw.relation + " " + mw.toMiddleware;
            return getMiddlewareNameWithAliases(mw.name, mw.aliases) + " - " + step;
          });
        }, "identify"),
        identifyOnResolve(toggle) {
          if (typeof toggle === "boolean")
            identifyOnResolve = toggle;
          return identifyOnResolve;
        },
        resolve: /* @__PURE__ */ __name((handler2, context) => {
          for (const middleware of getMiddlewareList().map((entry) => entry.middleware).reverse()) {
            handler2 = middleware(handler2, context);
          }
          if (identifyOnResolve) {
            console.log(stack.identify());
          }
          return handler2;
        }, "resolve")
      };
      return stack;
    }, "constructStack");
    stepWeights = {
      initialize: 5,
      serialize: 4,
      build: 3,
      finalizeRequest: 2,
      deserialize: 1
    };
    priorityWeights = {
      high: 3,
      normal: 2,
      low: 1
    };
  }
});

// node_modules/@smithy/types/dist-es/endpoint.js
var EndpointURLScheme;
var init_endpoint = __esm({
  "node_modules/@smithy/types/dist-es/endpoint.js"() {
    (function(EndpointURLScheme2) {
      EndpointURLScheme2["HTTP"] = "http";
      EndpointURLScheme2["HTTPS"] = "https";
    })(EndpointURLScheme || (EndpointURLScheme = {}));
  }
});

// node_modules/@smithy/types/dist-es/extensions/checksum.js
var AlgorithmId;
var init_checksum = __esm({
  "node_modules/@smithy/types/dist-es/extensions/checksum.js"() {
    (function(AlgorithmId2) {
      AlgorithmId2["MD5"] = "md5";
      AlgorithmId2["CRC32"] = "crc32";
      AlgorithmId2["CRC32C"] = "crc32c";
      AlgorithmId2["SHA1"] = "sha1";
      AlgorithmId2["SHA256"] = "sha256";
    })(AlgorithmId || (AlgorithmId = {}));
  }
});

// node_modules/@smithy/types/dist-es/extensions/index.js
var init_extensions = __esm({
  "node_modules/@smithy/types/dist-es/extensions/index.js"() {
    init_checksum();
  }
});

// node_modules/@smithy/types/dist-es/middleware.js
var SMITHY_CONTEXT_KEY;
var init_middleware = __esm({
  "node_modules/@smithy/types/dist-es/middleware.js"() {
    SMITHY_CONTEXT_KEY = "__smithy_context";
  }
});

// node_modules/@smithy/types/dist-es/profile.js
var IniSectionType;
var init_profile = __esm({
  "node_modules/@smithy/types/dist-es/profile.js"() {
    (function(IniSectionType2) {
      IniSectionType2["PROFILE"] = "profile";
      IniSectionType2["SSO_SESSION"] = "sso-session";
      IniSectionType2["SERVICES"] = "services";
    })(IniSectionType || (IniSectionType = {}));
  }
});

// node_modules/@smithy/types/dist-es/index.js
var init_dist_es = __esm({
  "node_modules/@smithy/types/dist-es/index.js"() {
    init_endpoint();
    init_extensions();
    init_middleware();
    init_profile();
  }
});

// node_modules/@smithy/core/dist-es/submodules/transport/getSmithyContext.js
var getSmithyContext;
var init_getSmithyContext = __esm({
  "node_modules/@smithy/core/dist-es/submodules/transport/getSmithyContext.js"() {
    init_dist_es();
    getSmithyContext = /* @__PURE__ */ __name((context) => context[SMITHY_CONTEXT_KEY] || (context[SMITHY_CONTEXT_KEY] = {}), "getSmithyContext");
  }
});

// node_modules/@smithy/core/dist-es/submodules/transport/hasOwn.js
function hasOwn(o4, k6) {
  return Object.prototype.hasOwnProperty.call(o4, k6);
}
var init_hasOwn = __esm({
  "node_modules/@smithy/core/dist-es/submodules/transport/hasOwn.js"() {
    __name(hasOwn, "hasOwn");
  }
});

// node_modules/@smithy/core/dist-es/submodules/transport/httpRequest.js
function cloneQuery(query) {
  return Object.keys(query).reduce((carry, paramName) => {
    const param = query[paramName];
    return {
      ...carry,
      [paramName]: Array.isArray(param) ? [...param] : param
    };
  }, {});
}
var HttpRequest;
var init_httpRequest = __esm({
  "node_modules/@smithy/core/dist-es/submodules/transport/httpRequest.js"() {
    HttpRequest = class _HttpRequest {
      static {
        __name(this, "HttpRequest");
      }
      method;
      protocol;
      hostname;
      port;
      path;
      query;
      headers;
      username;
      password;
      fragment;
      body;
      constructor(options) {
        this.method = options.method || "GET";
        this.hostname = options.hostname || "localhost";
        this.port = options.port;
        this.query = options.query || {};
        this.headers = options.headers || {};
        this.body = options.body;
        this.protocol = options.protocol ? options.protocol.slice(-1) !== ":" ? `${options.protocol}:` : options.protocol : "https:";
        this.path = options.path ? options.path.charAt(0) !== "/" ? `/${options.path}` : options.path : "/";
        this.username = options.username;
        this.password = options.password;
        this.fragment = options.fragment;
      }
      static clone(request) {
        const cloned = new _HttpRequest({
          ...request,
          headers: { ...request.headers }
        });
        if (cloned.query) {
          cloned.query = cloneQuery(cloned.query);
        }
        return cloned;
      }
      static isInstance(request) {
        if (!request) {
          return false;
        }
        const req = request;
        return "method" in req && "protocol" in req && "hostname" in req && "path" in req && typeof req["query"] === "object" && typeof req["headers"] === "object";
      }
      clone() {
        return _HttpRequest.clone(this);
      }
    };
    __name(cloneQuery, "cloneQuery");
  }
});

// node_modules/@smithy/core/dist-es/submodules/transport/httpResponse.js
var HttpResponse;
var init_httpResponse = __esm({
  "node_modules/@smithy/core/dist-es/submodules/transport/httpResponse.js"() {
    HttpResponse = class {
      static {
        __name(this, "HttpResponse");
      }
      statusCode;
      reason;
      headers;
      body;
      constructor(options) {
        this.statusCode = options.statusCode;
        this.reason = options.reason;
        this.headers = options.headers || {};
        this.body = options.body;
      }
      static isInstance(response) {
        if (!response)
          return false;
        const resp = response;
        return typeof resp.statusCode === "number" && typeof resp.headers === "object";
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/transport/isValidHostLabel.js
var VALID_HOST_LABEL_REGEX, isValidHostLabel;
var init_isValidHostLabel = __esm({
  "node_modules/@smithy/core/dist-es/submodules/transport/isValidHostLabel.js"() {
    VALID_HOST_LABEL_REGEX = new RegExp(`^(?!.*-$)(?!-)[a-zA-Z0-9-]{1,63}$`);
    isValidHostLabel = /* @__PURE__ */ __name((value, allowSubDomains = false) => {
      if (!allowSubDomains) {
        return VALID_HOST_LABEL_REGEX.test(value);
      }
      const labels = value.split(".");
      for (const label of labels) {
        if (!isValidHostLabel(label)) {
          return false;
        }
      }
      return true;
    }, "isValidHostLabel");
  }
});

// node_modules/@smithy/core/dist-es/submodules/transport/isValidHostname.js
function isValidHostname(hostname) {
  const hostPattern = /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/;
  return hostPattern.test(hostname);
}
var init_isValidHostname = __esm({
  "node_modules/@smithy/core/dist-es/submodules/transport/isValidHostname.js"() {
    __name(isValidHostname, "isValidHostname");
  }
});

// node_modules/@smithy/core/dist-es/submodules/transport/normalizeProvider.js
var normalizeProvider;
var init_normalizeProvider = __esm({
  "node_modules/@smithy/core/dist-es/submodules/transport/normalizeProvider.js"() {
    normalizeProvider = /* @__PURE__ */ __name((input) => {
      if (typeof input === "function")
        return input;
      const promisified = Promise.resolve(input);
      return () => promisified;
    }, "normalizeProvider");
  }
});

// node_modules/@smithy/core/dist-es/submodules/transport/parseQueryString.js
function parseQueryString(querystring) {
  const query = {};
  querystring = querystring.replace(/^\?/, "");
  if (querystring) {
    for (const pair of querystring.split("&")) {
      let [key, value = null] = pair.split("=");
      key = decodeURIComponent(key);
      if (value) {
        value = decodeURIComponent(value);
      }
      if (!(key in query)) {
        query[key] = value;
      } else if (Array.isArray(query[key])) {
        query[key].push(value);
      } else {
        query[key] = [query[key], value];
      }
    }
  }
  return query;
}
var init_parseQueryString = __esm({
  "node_modules/@smithy/core/dist-es/submodules/transport/parseQueryString.js"() {
    __name(parseQueryString, "parseQueryString");
  }
});

// node_modules/@smithy/core/dist-es/submodules/transport/parseUrl.js
var parseUrl;
var init_parseUrl = __esm({
  "node_modules/@smithy/core/dist-es/submodules/transport/parseUrl.js"() {
    init_parseQueryString();
    parseUrl = /* @__PURE__ */ __name((url) => {
      if (typeof url === "string") {
        return parseUrl(new URL(url));
      }
      const { hostname, pathname, port, protocol, search } = url;
      let query;
      if (search) {
        query = parseQueryString(search);
      }
      return {
        hostname,
        port: port ? parseInt(port) : void 0,
        protocol,
        path: pathname,
        query
      };
    }, "parseUrl");
  }
});

// node_modules/@smithy/core/dist-es/submodules/transport/toEndpointV1.js
var toEndpointV1;
var init_toEndpointV1 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/transport/toEndpointV1.js"() {
    init_hasOwn();
    init_parseUrl();
    toEndpointV1 = /* @__PURE__ */ __name((endpoint) => {
      if (typeof endpoint === "object") {
        if ("url" in endpoint) {
          const v1Endpoint = parseUrl(endpoint.url);
          if (endpoint.headers) {
            v1Endpoint.headers = {};
            for (const name in endpoint.headers) {
              if (!hasOwn(endpoint.headers, name))
                continue;
              v1Endpoint.headers[name.toLowerCase()] = endpoint.headers[name].join(", ");
            }
          }
          return v1Endpoint;
        }
        return endpoint;
      }
      return parseUrl(endpoint);
    }, "toEndpointV1");
  }
});

// node_modules/@smithy/core/dist-es/submodules/transport/index.js
var init_transport = __esm({
  "node_modules/@smithy/core/dist-es/submodules/transport/index.js"() {
    init_getSmithyContext();
    init_hasOwn();
    init_httpRequest();
    init_httpResponse();
    init_isValidHostLabel();
    init_isValidHostname();
    init_normalizeProvider();
    init_parseUrl();
    init_toEndpointV1();
  }
});

// node_modules/@smithy/core/dist-es/submodules/client/smithy-client/client.js
var Client;
var init_client = __esm({
  "node_modules/@smithy/core/dist-es/submodules/client/smithy-client/client.js"() {
    init_MiddlewareStack();
    Client = class {
      static {
        __name(this, "Client");
      }
      config;
      middlewareStack = constructStack();
      initConfig;
      handlers;
      constructor(config) {
        this.config = config;
        const { protocol, protocolSettings } = config;
        if (protocolSettings) {
          if (typeof protocol === "function") {
            config.protocol = new protocol(protocolSettings);
          }
        }
      }
      send(command6, optionsOrCb, cb) {
        const options = typeof optionsOrCb !== "function" ? optionsOrCb : void 0;
        const callback = typeof optionsOrCb === "function" ? optionsOrCb : cb;
        const useHandlerCache = options === void 0 && this.config.cacheMiddleware === true;
        let handler2;
        if (useHandlerCache) {
          if (!this.handlers) {
            this.handlers = /* @__PURE__ */ new WeakMap();
          }
          const handlers = this.handlers;
          if (handlers.has(command6.constructor)) {
            handler2 = handlers.get(command6.constructor);
          } else {
            handler2 = command6.resolveMiddleware(this.middlewareStack, this.config, options);
            handlers.set(command6.constructor, handler2);
          }
        } else {
          delete this.handlers;
          handler2 = command6.resolveMiddleware(this.middlewareStack, this.config, options);
        }
        if (callback) {
          handler2(command6).then((result) => callback(null, result.output), (err2) => callback(err2)).catch(() => {
          });
        } else {
          return handler2(command6).then((result) => result.output);
        }
      }
      destroy() {
        this.config?.requestHandler?.destroy?.();
        delete this.handlers;
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/schema/deref.js
var deref;
var init_deref = __esm({
  "node_modules/@smithy/core/dist-es/submodules/schema/deref.js"() {
    deref = /* @__PURE__ */ __name((schemaRef) => {
      if (typeof schemaRef === "function") {
        return schemaRef();
      }
      return schemaRef;
    }, "deref");
  }
});

// node_modules/@smithy/core/dist-es/submodules/schema/schemas/operation.js
var operation;
var init_operation = __esm({
  "node_modules/@smithy/core/dist-es/submodules/schema/schemas/operation.js"() {
    operation = /* @__PURE__ */ __name((namespace, name, traits, input, output) => ({
      name,
      namespace,
      traits,
      input,
      output
    }), "operation");
  }
});

// node_modules/@smithy/core/dist-es/submodules/schema/middleware/schemaDeserializationMiddleware.js
var schemaDeserializationMiddleware, findHeader;
var init_schemaDeserializationMiddleware = __esm({
  "node_modules/@smithy/core/dist-es/submodules/schema/middleware/schemaDeserializationMiddleware.js"() {
    init_transport();
    init_operation();
    schemaDeserializationMiddleware = /* @__PURE__ */ __name((config) => (next, context) => async (args) => {
      const { response } = await next(args);
      const { operationSchema } = getSmithyContext(context);
      const [, ns, n4, t2, i6, o4] = operationSchema ?? [];
      try {
        const parsed = await config.protocol.deserializeResponse(operation(ns, n4, t2, i6, o4), {
          ...config,
          ...context
        }, response);
        return {
          response,
          output: parsed
        };
      } catch (error) {
        Object.defineProperty(error, "$response", {
          value: response,
          enumerable: false,
          writable: false,
          configurable: false
        });
        if (!("$metadata" in error)) {
          const hint = `Deserialization error: to see the raw response, inspect the hidden field {error}.$response on this object.`;
          try {
            error.message += "\n  " + hint;
          } catch (ignored) {
            if (!context.logger || context.logger?.constructor?.name === "NoOpLogger") {
              console.warn(hint);
            } else {
              context.logger?.warn?.(hint);
            }
          }
          if (typeof error.$responseBodyText !== "undefined") {
            if (error.$response) {
              error.$response.body = error.$responseBodyText;
            }
          }
          try {
            if (HttpResponse.isInstance(response)) {
              const { headers = {}, statusCode } = response;
              const headerEntries = Object.entries(headers);
              error.$metadata = {
                httpStatusCode: statusCode,
                requestId: findHeader(/^x-[\w-]+-request-?id$/, headerEntries),
                extendedRequestId: findHeader(/^x-[\w-]+-id-2$/, headerEntries),
                cfId: findHeader(/^x-[\w-]+-cf-id$/, headerEntries)
              };
            }
          } catch (ignored) {
          }
        }
        throw error;
      }
    }, "schemaDeserializationMiddleware");
    findHeader = /* @__PURE__ */ __name((pattern, headers) => {
      return (headers.find(([k6]) => {
        return k6.match(pattern);
      }) || [void 0, void 0])[1];
    }, "findHeader");
  }
});

// node_modules/@smithy/core/dist-es/submodules/schema/middleware/schemaSerializationMiddleware.js
var schemaSerializationMiddleware;
var init_schemaSerializationMiddleware = __esm({
  "node_modules/@smithy/core/dist-es/submodules/schema/middleware/schemaSerializationMiddleware.js"() {
    init_transport();
    init_operation();
    schemaSerializationMiddleware = /* @__PURE__ */ __name((config) => (next, context) => async (args) => {
      const { operationSchema } = getSmithyContext(context);
      const [, ns, n4, t2, i6, o4] = operationSchema ?? [];
      const endpoint = context.endpointV2 ? async () => toEndpointV1(context.endpointV2) : config.endpoint;
      const request = await config.protocol.serializeRequest(operation(ns, n4, t2, i6, o4), args.input, {
        ...config,
        ...context,
        endpoint
      });
      return next({
        ...args,
        request
      });
    }, "schemaSerializationMiddleware");
  }
});

// node_modules/@smithy/core/dist-es/submodules/schema/middleware/getSchemaSerdePlugin.js
function getSchemaSerdePlugin(config) {
  return {
    applyToStack: /* @__PURE__ */ __name((commandStack) => {
      commandStack.add(schemaSerializationMiddleware(config), serializerMiddlewareOption);
      commandStack.add(schemaDeserializationMiddleware(config), deserializerMiddlewareOption);
      config.protocol.setSerdeContext(config);
    }, "applyToStack")
  };
}
var deserializerMiddlewareOption, serializerMiddlewareOption;
var init_getSchemaSerdePlugin = __esm({
  "node_modules/@smithy/core/dist-es/submodules/schema/middleware/getSchemaSerdePlugin.js"() {
    init_schemaDeserializationMiddleware();
    init_schemaSerializationMiddleware();
    deserializerMiddlewareOption = {
      name: "deserializerMiddleware",
      step: "deserialize",
      tags: ["DESERIALIZER"],
      override: true
    };
    serializerMiddlewareOption = {
      name: "serializerMiddleware",
      step: "serialize",
      tags: ["SERIALIZER"],
      override: true
    };
    __name(getSchemaSerdePlugin, "getSchemaSerdePlugin");
  }
});

// node_modules/@smithy/core/dist-es/submodules/schema/schemas/translateTraits.js
function translateTraits(indicator) {
  if (typeof indicator === "object") {
    return indicator;
  }
  indicator = indicator | 0;
  if (traitsCache[indicator]) {
    return traitsCache[indicator];
  }
  const traits = {};
  let i6 = 0;
  for (const trait of [
    "httpLabel",
    "idempotent",
    "idempotencyToken",
    "sensitive",
    "httpPayload",
    "httpResponseCode",
    "httpQueryParams"
  ]) {
    if ((indicator >> i6++ & 1) === 1) {
      traits[trait] = 1;
    }
  }
  return traitsCache[indicator] = traits;
}
var traitsCache;
var init_translateTraits = __esm({
  "node_modules/@smithy/core/dist-es/submodules/schema/schemas/translateTraits.js"() {
    traitsCache = [];
    __name(translateTraits, "translateTraits");
  }
});

// node_modules/@smithy/core/dist-es/submodules/schema/schemas/NormalizedSchema.js
function member(memberSchema, memberName) {
  if (memberSchema instanceof NormalizedSchema) {
    return Object.assign(memberSchema, {
      memberName,
      _isMemberSchema: true
    });
  }
  const internalCtorAccess = NormalizedSchema;
  return new internalCtorAccess(memberSchema, memberName);
}
var anno, simpleSchemaCacheN, simpleSchemaCacheS, NormalizedSchema, isMemberSchema, isStaticSchema;
var init_NormalizedSchema = __esm({
  "node_modules/@smithy/core/dist-es/submodules/schema/schemas/NormalizedSchema.js"() {
    init_deref();
    init_translateTraits();
    anno = {
      it: /* @__PURE__ */ Symbol.for("@smithy/nor-struct-it"),
      ns: /* @__PURE__ */ Symbol.for("@smithy/ns")
    };
    simpleSchemaCacheN = [];
    simpleSchemaCacheS = {};
    NormalizedSchema = class _NormalizedSchema {
      static {
        __name(this, "NormalizedSchema");
      }
      ref;
      memberName;
      static symbol = /* @__PURE__ */ Symbol.for("@smithy/nor");
      symbol = _NormalizedSchema.symbol;
      name;
      schema;
      _isMemberSchema;
      traits;
      memberTraits;
      normalizedTraits;
      constructor(ref, memberName) {
        this.ref = ref;
        this.memberName = memberName;
        const traitStack = [];
        let _ref = ref;
        let schema = ref;
        this._isMemberSchema = false;
        while (isMemberSchema(_ref)) {
          traitStack.push(_ref[1]);
          _ref = _ref[0];
          schema = deref(_ref);
          this._isMemberSchema = true;
        }
        if (traitStack.length > 0) {
          this.memberTraits = {};
          for (let i6 = traitStack.length - 1; i6 >= 0; --i6) {
            const traitSet = traitStack[i6];
            Object.assign(this.memberTraits, translateTraits(traitSet));
          }
        } else {
          this.memberTraits = 0;
        }
        if (schema instanceof _NormalizedSchema) {
          const computedMemberTraits = this.memberTraits;
          Object.assign(this, schema);
          this.memberTraits = Object.assign({}, computedMemberTraits, schema.getMemberTraits(), this.getMemberTraits());
          this.normalizedTraits = void 0;
          this.memberName = memberName ?? schema.memberName;
          return;
        }
        this.schema = deref(schema);
        if (isStaticSchema(this.schema)) {
          this.name = `${this.schema[1]}#${this.schema[2]}`;
          this.traits = this.schema[3];
        } else {
          this.name = this.memberName ?? String(schema);
          this.traits = 0;
        }
        if (this._isMemberSchema && !memberName) {
          throw new Error(`@smithy/core/schema - NormalizedSchema member init ${this.getName(true)} missing member name.`);
        }
      }
      static [Symbol.hasInstance](lhs) {
        const isPrototype = this.prototype.isPrototypeOf(lhs);
        if (!isPrototype && typeof lhs === "object" && lhs !== null) {
          const ns = lhs;
          return ns.symbol === this.symbol;
        }
        return isPrototype;
      }
      static of(ref) {
        const keyAble = typeof ref === "function" || typeof ref === "object" && ref !== null;
        if (typeof ref === "number") {
          if (simpleSchemaCacheN[ref]) {
            return simpleSchemaCacheN[ref];
          }
        } else if (typeof ref === "string") {
          if (simpleSchemaCacheS[ref]) {
            return simpleSchemaCacheS[ref];
          }
        } else if (keyAble) {
          if (ref[anno.ns]) {
            return ref[anno.ns];
          }
        }
        const sc = deref(ref);
        if (sc instanceof _NormalizedSchema) {
          return sc;
        }
        if (isMemberSchema(sc)) {
          const [ns2, traits] = sc;
          if (ns2 instanceof _NormalizedSchema) {
            Object.assign(ns2.getMergedTraits(), translateTraits(traits));
            return ns2;
          }
          throw new Error(`@smithy/core/schema - may not init unwrapped member schema=${JSON.stringify(ref, null, 2)}.`);
        }
        const ns = new _NormalizedSchema(sc);
        if (keyAble) {
          return ref[anno.ns] = ns;
        }
        if (typeof sc === "string") {
          return simpleSchemaCacheS[sc] = ns;
        }
        if (typeof sc === "number") {
          return simpleSchemaCacheN[sc] = ns;
        }
        return ns;
      }
      getSchema() {
        const sc = this.schema;
        if (Array.isArray(sc) && sc[0] === 0) {
          return sc[4];
        }
        return sc;
      }
      getName(withNamespace = false) {
        const { name } = this;
        const short = !withNamespace && name && name.includes("#");
        return short ? name.split("#")[1] : name || void 0;
      }
      getMemberName() {
        return this.memberName;
      }
      isMemberSchema() {
        return this._isMemberSchema;
      }
      isListSchema() {
        const sc = this.getSchema();
        return typeof sc === "number" ? sc >= 64 && sc < 128 : sc[0] === 1;
      }
      isMapSchema() {
        const sc = this.getSchema();
        return typeof sc === "number" ? sc >= 128 && sc <= 255 : sc[0] === 2;
      }
      isStructSchema() {
        const sc = this.getSchema();
        if (typeof sc !== "object") {
          return false;
        }
        const id = sc[0];
        return id === 3 || id === -3 || id === 4;
      }
      isUnionSchema() {
        const sc = this.getSchema();
        if (typeof sc !== "object") {
          return false;
        }
        return sc[0] === 4;
      }
      isBlobSchema() {
        const sc = this.getSchema();
        return sc === 21 || sc === 42;
      }
      isTimestampSchema() {
        const sc = this.getSchema();
        return typeof sc === "number" && sc >= 4 && sc <= 7;
      }
      isUnitSchema() {
        return this.getSchema() === "unit";
      }
      isDocumentSchema() {
        return this.getSchema() === 15;
      }
      isStringSchema() {
        return this.getSchema() === 0;
      }
      isBooleanSchema() {
        return this.getSchema() === 2;
      }
      isNumericSchema() {
        return this.getSchema() === 1;
      }
      isBigIntegerSchema() {
        return this.getSchema() === 17;
      }
      isBigDecimalSchema() {
        return this.getSchema() === 19;
      }
      isStreaming() {
        const { streaming } = this.getMergedTraits();
        return !!streaming || this.getSchema() === 42;
      }
      isIdempotencyToken() {
        return !!this.getMergedTraits().idempotencyToken;
      }
      getMergedTraits() {
        return this.normalizedTraits ?? (this.normalizedTraits = {
          ...this.getOwnTraits(),
          ...this.getMemberTraits()
        });
      }
      getMemberTraits() {
        return translateTraits(this.memberTraits);
      }
      getOwnTraits() {
        return translateTraits(this.traits);
      }
      getKeySchema() {
        const [isDoc, isMap] = [this.isDocumentSchema(), this.isMapSchema()];
        if (!isDoc && !isMap) {
          throw new Error(`@smithy/core/schema - cannot get key for non-map: ${this.getName(true)}`);
        }
        const schema = this.getSchema();
        const memberSchema = isDoc ? 15 : schema[4] ?? 0;
        return member([memberSchema, 0], "key");
      }
      getValueSchema() {
        const sc = this.getSchema();
        const [isDoc, isMap, isList] = [this.isDocumentSchema(), this.isMapSchema(), this.isListSchema()];
        const memberSchema = typeof sc === "number" ? 63 & sc : sc && typeof sc === "object" && (isMap || isList) ? sc[3 + sc[0]] : isDoc ? 15 : void 0;
        if (memberSchema != null) {
          return member([memberSchema, 0], isMap ? "value" : "member");
        }
        throw new Error(`@smithy/core/schema - ${this.getName(true)} has no value member.`);
      }
      getMemberSchema(memberName) {
        const struct = this.getSchema();
        if (this.isStructSchema() && struct[4].includes(memberName)) {
          const i6 = struct[4].indexOf(memberName);
          const memberSchema = struct[5][i6];
          return member(isMemberSchema(memberSchema) ? memberSchema : [memberSchema, 0], memberName);
        }
        if (this.isDocumentSchema()) {
          return member([15, 0], memberName);
        }
        throw new Error(`@smithy/core/schema - ${this.getName(true)} has no member=${memberName}.`);
      }
      getMemberSchemas() {
        const buffer = {};
        try {
          for (const [k6, v2] of this.structIterator()) {
            buffer[k6] = v2;
          }
        } catch (ignored) {
        }
        return buffer;
      }
      getEventStreamMember() {
        if (this.isStructSchema()) {
          for (const [memberName, memberSchema] of this.structIterator()) {
            if (memberSchema.isStreaming() && memberSchema.isStructSchema()) {
              return memberName;
            }
          }
        }
        return "";
      }
      *structIterator() {
        if (this.isUnitSchema()) {
          return;
        }
        if (!this.isStructSchema()) {
          throw new Error("@smithy/core/schema - cannot iterate non-struct schema.");
        }
        const struct = this.getSchema();
        const z2 = struct[4].length;
        let it = struct[anno.it];
        if (it && z2 === it.length) {
          yield* it;
          return;
        }
        it = Array(z2);
        for (let i6 = 0; i6 < z2; ++i6) {
          const k6 = struct[4][i6];
          const v2 = member([struct[5][i6], 0], k6);
          yield it[i6] = [k6, v2];
        }
        struct[anno.it] = it;
      }
    };
    __name(member, "member");
    isMemberSchema = /* @__PURE__ */ __name((sc) => Array.isArray(sc) && sc.length === 2, "isMemberSchema");
    isStaticSchema = /* @__PURE__ */ __name((sc) => Array.isArray(sc) && sc.length >= 5, "isStaticSchema");
  }
});

// node_modules/@smithy/core/dist-es/submodules/schema/TypeRegistry.js
var TypeRegistry;
var init_TypeRegistry = __esm({
  "node_modules/@smithy/core/dist-es/submodules/schema/TypeRegistry.js"() {
    TypeRegistry = class _TypeRegistry {
      static {
        __name(this, "TypeRegistry");
      }
      namespace;
      schemas;
      exceptions;
      static registries = /* @__PURE__ */ new Map();
      constructor(namespace, schemas = /* @__PURE__ */ new Map(), exceptions = /* @__PURE__ */ new Map()) {
        this.namespace = namespace;
        this.schemas = schemas;
        this.exceptions = exceptions;
        if (!_TypeRegistry.registries.has(namespace)) {
          _TypeRegistry.registries.set(namespace, this);
        }
      }
      static for(namespace) {
        return _TypeRegistry.registries.get(namespace) ?? new _TypeRegistry(namespace);
      }
      copyFrom(other) {
        const { schemas, exceptions } = this;
        for (const [k6, v2] of other.schemas) {
          if (!schemas.has(k6)) {
            schemas.set(k6, v2);
          }
        }
        for (const [k6, v2] of other.exceptions) {
          if (!exceptions.has(k6)) {
            exceptions.set(k6, v2);
          }
        }
      }
      register(shapeId, schema) {
        const qualifiedName = this.normalizeShapeId(shapeId);
        for (const r6 of [this, _TypeRegistry.for(qualifiedName.split("#")[0])]) {
          if (!r6.schemas.has(qualifiedName)) {
            r6.schemas.set(qualifiedName, schema);
          }
        }
      }
      getSchema(shapeId) {
        const id = this.normalizeShapeId(shapeId);
        if (!this.schemas.has(id)) {
          if (!shapeId.includes("#")) {
            const suffix = "#" + shapeId;
            const candidates = [];
            for (const [shapeId2, schema] of this.schemas.entries()) {
              if (shapeId2.endsWith(suffix)) {
                candidates.push(schema);
              }
            }
            if (candidates.length === 1) {
              return candidates[0];
            }
          }
          throw new Error(`@smithy/core/schema - schema not found for ${id}`);
        }
        return this.schemas.get(id);
      }
      registerError(es, ctor) {
        const $error = es;
        const ns = $error[1];
        const qualifiedName = ns + "#" + $error[2];
        if (!ctor.hasOwnProperty?.("shapeId")) {
          ctor.shapeId = qualifiedName;
        }
        for (const r6 of [this, _TypeRegistry.for(ns)]) {
          if (!r6.schemas.has(qualifiedName) && !r6.exceptions.has($error)) {
            r6.schemas.set(qualifiedName, $error);
            r6.exceptions.set($error, ctor);
          }
        }
      }
      getErrorCtor(es) {
        const $error = es;
        if (this.exceptions.has($error)) {
          return this.exceptions.get($error);
        }
        const registry = _TypeRegistry.for($error[1]);
        return registry.exceptions.get($error);
      }
      getBaseException() {
        for (const exceptionKey of this.exceptions.keys()) {
          if (Array.isArray(exceptionKey)) {
            const [, ns, name] = exceptionKey;
            const id = ns + "#" + name;
            if (id.startsWith("smithy.ts.sdk.synthetic.") && id.endsWith("ServiceException")) {
              return exceptionKey;
            }
          }
        }
        return void 0;
      }
      find(predicate) {
        for (const schema of this.schemas.values()) {
          if (predicate(schema)) {
            return schema;
          }
        }
        return void 0;
      }
      clear() {
        this.schemas.clear();
        this.exceptions.clear();
      }
      normalizeShapeId(shapeId) {
        if (shapeId.includes("#")) {
          return shapeId;
        }
        return this.namespace + "#" + shapeId;
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/schema/index.js
var init_schema = __esm({
  "node_modules/@smithy/core/dist-es/submodules/schema/index.js"() {
    init_deref();
    init_getSchemaSerdePlugin();
    init_NormalizedSchema();
    init_translateTraits();
    init_TypeRegistry();
  }
});

// node_modules/@smithy/core/dist-es/submodules/client/smithy-client/schemaLogFilter.js
function schemaLogFilter(schema, data) {
  if (data == null) {
    return data;
  }
  const ns = NormalizedSchema.of(schema);
  if (ns.getMergedTraits().sensitive) {
    return SENSITIVE_STRING;
  }
  if (ns.isListSchema()) {
    const isSensitive = !!ns.getValueSchema().getMergedTraits().sensitive;
    if (isSensitive) {
      return SENSITIVE_STRING;
    }
  } else if (ns.isMapSchema()) {
    const isSensitive = !!ns.getKeySchema().getMergedTraits().sensitive || !!ns.getValueSchema().getMergedTraits().sensitive;
    if (isSensitive) {
      return SENSITIVE_STRING;
    }
  } else if (ns.isStructSchema() && typeof data === "object") {
    const object = data;
    const newObject = {};
    for (const [member2, memberNs] of ns.structIterator()) {
      if (object[member2] != null) {
        newObject[member2] = schemaLogFilter(memberNs, object[member2]);
      }
    }
    return newObject;
  }
  return data;
}
var SENSITIVE_STRING;
var init_schemaLogFilter = __esm({
  "node_modules/@smithy/core/dist-es/submodules/client/smithy-client/schemaLogFilter.js"() {
    init_schema();
    SENSITIVE_STRING = "***SensitiveInformation***";
    __name(schemaLogFilter, "schemaLogFilter");
  }
});

// node_modules/@smithy/core/dist-es/submodules/client/smithy-client/command.js
var operationEventStreamMarker, Command, ClassBuilder;
var init_command = __esm({
  "node_modules/@smithy/core/dist-es/submodules/client/smithy-client/command.js"() {
    init_dist_es();
    init_MiddlewareStack();
    init_schemaLogFilter();
    init_schema();
    operationEventStreamMarker = /* @__PURE__ */ Symbol.for("@smithy/op-event-stream");
    Command = class {
      static {
        __name(this, "Command");
      }
      middlewareStack = constructStack();
      schema;
      static classBuilder() {
        return new ClassBuilder();
      }
      resolveMiddlewareWithContext(clientStack, configuration, options, { middlewareFn, clientName, commandName, inputFilterSensitiveLog, outputFilterSensitiveLog, smithyContext, additionalContext, CommandCtor }) {
        for (const mw of middlewareFn.bind(this)(CommandCtor, clientStack, configuration, options)) {
          this.middlewareStack.use(mw);
        }
        const stack = clientStack.concat(this.middlewareStack);
        const { logger: logger2 } = configuration;
        const additionalSmithyContext = additionalContext[SMITHY_CONTEXT_KEY];
        const handlerExecutionContext = {
          logger: logger2,
          clientName,
          commandName,
          inputFilterSensitiveLog,
          outputFilterSensitiveLog,
          ...additionalContext,
          [SMITHY_CONTEXT_KEY]: {
            ...additionalSmithyContext,
            commandInstance: this,
            ...smithyContext,
            ...options?.metricsRecorder === void 0 ? {} : { metricsRecorder: options.metricsRecorder }
          }
        };
        const { requestHandler } = configuration;
        let requestOptions = options ?? {};
        if (requestOptions.metricsRecorder) {
          requestOptions = { ...requestOptions };
          delete requestOptions.metricsRecorder;
        }
        let isEventStream;
        const schema = this.schema;
        const marker = schema?.[operationEventStreamMarker];
        if (marker !== void 0) {
          isEventStream = marker;
        } else if (schema) {
          if (Array.isArray(schema) && schema[0] === 9) {
            const [, , , , input$, output$] = schema;
            isEventStream = schema[operationEventStreamMarker] = Boolean(NormalizedSchema.of(input$).getEventStreamMember() || NormalizedSchema.of(output$).getEventStreamMember());
          }
        }
        if (isEventStream) {
          requestOptions = {
            isEventStream,
            ...requestOptions
          };
        }
        return stack.resolve((request) => requestHandler.handle(request.request, requestOptions), handlerExecutionContext);
      }
    };
    ClassBuilder = class {
      static {
        __name(this, "ClassBuilder");
      }
      _init = /* @__PURE__ */ __name(() => {
      }, "_init");
      _ep = {};
      _middlewareFn = /* @__PURE__ */ __name(() => [], "_middlewareFn");
      _commandName = "";
      _clientName = "";
      _additionalContext = {};
      _smithyContext = {};
      _inputFilterSensitiveLog = void 0;
      _outputFilterSensitiveLog = void 0;
      _serializer = null;
      _deserializer = null;
      _operationSchema;
      init(cb) {
        this._init = cb;
      }
      ep(endpointParameterInstructions) {
        this._ep = endpointParameterInstructions;
        return this;
      }
      m(middlewareSupplier) {
        this._middlewareFn = middlewareSupplier;
        return this;
      }
      s(service, operation2, smithyContext = {}) {
        this._smithyContext = {
          service,
          operation: operation2,
          ...smithyContext
        };
        return this;
      }
      c(additionalContext = {}) {
        this._additionalContext = additionalContext;
        return this;
      }
      n(clientName, commandName) {
        this._clientName = clientName;
        this._commandName = commandName;
        return this;
      }
      f(inputFilter = (_) => _, outputFilter = (_) => _) {
        this._inputFilterSensitiveLog = inputFilter;
        this._outputFilterSensitiveLog = outputFilter;
        return this;
      }
      ser(serializer) {
        this._serializer = serializer;
        return this;
      }
      de(deserializer) {
        this._deserializer = deserializer;
        return this;
      }
      sc(operation2) {
        this._operationSchema = operation2;
        this._smithyContext.operationSchema = operation2;
        return this;
      }
      build() {
        const closure = this;
        let CommandRef;
        return CommandRef = class extends Command {
          static {
            __name(this, "CommandRef");
          }
          input;
          static getEndpointParameterInstructions() {
            return closure._ep;
          }
          constructor(...[input]) {
            super();
            this.input = input ?? {};
            closure._init(this);
            this.schema = closure._operationSchema;
          }
          resolveMiddleware(stack, configuration, options) {
            const op = closure._operationSchema;
            const input = op?.[4] ?? op?.input;
            const output = op?.[5] ?? op?.output;
            return this.resolveMiddlewareWithContext(stack, configuration, options, {
              CommandCtor: CommandRef,
              middlewareFn: closure._middlewareFn,
              clientName: closure._clientName,
              commandName: closure._commandName,
              inputFilterSensitiveLog: closure._inputFilterSensitiveLog ?? (op ? schemaLogFilter.bind(null, input) : (_) => _),
              outputFilterSensitiveLog: closure._outputFilterSensitiveLog ?? (op ? schemaLogFilter.bind(null, output) : (_) => _),
              smithyContext: closure._smithyContext,
              additionalContext: closure._additionalContext
            });
          }
          serialize = closure._serializer;
          deserialize = closure._deserializer;
        };
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/client/smithy-client/create-aggregated-client.js
var createAggregatedClient;
var init_create_aggregated_client = __esm({
  "node_modules/@smithy/core/dist-es/submodules/client/smithy-client/create-aggregated-client.js"() {
    createAggregatedClient = /* @__PURE__ */ __name((commands5, Client2, options) => {
      for (const [command6, CommandCtor] of Object.entries(commands5)) {
        const methodImpl = /* @__PURE__ */ __name(async function(args, optionsOrCb, cb) {
          const command7 = new CommandCtor(args);
          if (typeof optionsOrCb === "function") {
            this.send(command7, optionsOrCb);
          } else if (typeof cb === "function") {
            if (typeof optionsOrCb !== "object")
              throw new Error(`Expected http options but got ${typeof optionsOrCb}`);
            this.send(command7, optionsOrCb || {}, cb);
          } else {
            return this.send(command7, optionsOrCb);
          }
        }, "methodImpl");
        const methodName = (command6[0].toLowerCase() + command6.slice(1)).replace(/Command$/, "");
        Client2.prototype[methodName] = methodImpl;
      }
      const { paginators = {}, waiters = {} } = options ?? {};
      for (const [paginatorName, paginatorFn] of Object.entries(paginators)) {
        if (Client2.prototype[paginatorName] === void 0) {
          Client2.prototype[paginatorName] = function(commandInput = {}, paginationConfiguration, ...rest) {
            return paginatorFn({
              ...paginationConfiguration,
              client: this
            }, commandInput, ...rest);
          };
        }
      }
      for (const [waiterName, waiterFn] of Object.entries(waiters)) {
        if (Client2.prototype[waiterName] === void 0) {
          Client2.prototype[waiterName] = async function(commandInput = {}, waiterConfiguration, ...rest) {
            let config = waiterConfiguration;
            if (typeof waiterConfiguration === "number") {
              config = {
                maxWaitTime: waiterConfiguration
              };
            }
            return waiterFn({
              ...config,
              client: this
            }, commandInput, ...rest);
          };
        }
      }
    }, "createAggregatedClient");
  }
});

// node_modules/@smithy/core/dist-es/submodules/client/smithy-client/exceptions.js
var ServiceException, decorateServiceException;
var init_exceptions = __esm({
  "node_modules/@smithy/core/dist-es/submodules/client/smithy-client/exceptions.js"() {
    ServiceException = class _ServiceException extends Error {
      static {
        __name(this, "ServiceException");
      }
      static shapeId = "smithy.ts.sdk.synthetic.nonamespace.client#ServiceException";
      $fault;
      $response;
      $retryable;
      $metadata;
      constructor(options) {
        super(options.message);
        Object.setPrototypeOf(this, Object.getPrototypeOf(this).constructor.prototype);
        this.name = options.name;
        this.$fault = options.$fault;
        this.$metadata = options.$metadata;
      }
      static isInstance(value) {
        if (!value)
          return false;
        const candidate = value;
        return _ServiceException.prototype.isPrototypeOf(candidate) || Boolean(candidate.$fault) && Boolean(candidate.$metadata) && (candidate.$fault === "client" || candidate.$fault === "server");
      }
      static [Symbol.hasInstance](instance) {
        if (!instance)
          return false;
        const candidate = instance;
        if (this === _ServiceException) {
          return _ServiceException.isInstance(instance);
        }
        if (_ServiceException.isInstance(instance)) {
          if (this.prototype.isPrototypeOf(instance)) {
            return true;
          }
          const targetId = Object.prototype.hasOwnProperty.call(this, "shapeId") ? this.shapeId : void 0;
          let candidateHasShapeId = false;
          if (targetId) {
            let proto = Object.getPrototypeOf(candidate);
            while (proto && proto !== Object.prototype) {
              const ctor = proto.constructor;
              const candidateId = ctor !== _ServiceException && Object.prototype.hasOwnProperty.call(ctor, "shapeId") ? ctor?.shapeId : void 0;
              if (candidateId) {
                candidateHasShapeId = true;
                if (candidateId === targetId) {
                  return true;
                }
              }
              proto = Object.getPrototypeOf(proto);
            }
          }
          if (targetId && candidateHasShapeId) {
            return false;
          }
          const targetName = this.name;
          if (targetName && targetName.length >= 6) {
            if (candidate.name === targetName) {
              return true;
            }
            let proto = Object.getPrototypeOf(candidate);
            while (proto && proto !== Object.prototype) {
              const ctorName = proto.constructor?.name;
              if (ctorName && ctorName !== "Error" && ctorName === targetName) {
                return true;
              }
              proto = Object.getPrototypeOf(proto);
            }
          }
        }
        return false;
      }
    };
    decorateServiceException = /* @__PURE__ */ __name((exception, additions = {}) => {
      Object.entries(additions).filter(([, v2]) => v2 !== void 0).forEach(([k6, v2]) => {
        if (exception[k6] == void 0 || exception[k6] === "") {
          exception[k6] = v2;
        }
      });
      const message = exception.message || exception.Message || "UnknownError";
      exception.message = message;
      delete exception.Message;
      return exception;
    }, "decorateServiceException");
  }
});

// node_modules/@smithy/core/dist-es/submodules/client/smithy-client/defaults-mode.js
var loadConfigsForDefaultMode;
var init_defaults_mode = __esm({
  "node_modules/@smithy/core/dist-es/submodules/client/smithy-client/defaults-mode.js"() {
    loadConfigsForDefaultMode = /* @__PURE__ */ __name((mode) => {
      switch (mode) {
        case "standard":
          return {
            retryMode: "standard",
            connectionTimeout: 3100
          };
        case "in-region":
          return {
            retryMode: "standard",
            connectionTimeout: 1100
          };
        case "cross-region":
          return {
            retryMode: "standard",
            connectionTimeout: 3100
          };
        case "mobile":
          return {
            retryMode: "standard",
            connectionTimeout: 3e4
          };
        default:
          return {};
      }
    }, "loadConfigsForDefaultMode");
  }
});

// node_modules/@smithy/core/dist-es/submodules/client/smithy-client/emitWarningIfUnsupportedVersion.js
var warningEmitted, emitWarningIfUnsupportedVersion;
var init_emitWarningIfUnsupportedVersion = __esm({
  "node_modules/@smithy/core/dist-es/submodules/client/smithy-client/emitWarningIfUnsupportedVersion.js"() {
    warningEmitted = false;
    emitWarningIfUnsupportedVersion = /* @__PURE__ */ __name((version) => {
      if (version && !warningEmitted && parseInt(version.substring(1, version.indexOf("."))) < 16) {
        warningEmitted = true;
      }
    }, "emitWarningIfUnsupportedVersion");
  }
});

// node_modules/@smithy/core/dist-es/submodules/client/smithy-client/extensions/checksum.js
var knownAlgorithms, getChecksumConfiguration, resolveChecksumRuntimeConfig;
var init_checksum2 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/client/smithy-client/extensions/checksum.js"() {
    init_transport();
    init_dist_es();
    knownAlgorithms = Object.values(AlgorithmId);
    getChecksumConfiguration = /* @__PURE__ */ __name((runtimeConfig) => {
      const checksumAlgorithms = [];
      for (const id in AlgorithmId) {
        if (!hasOwn(AlgorithmId, id))
          continue;
        const algorithmId = AlgorithmId[id];
        if (runtimeConfig[algorithmId] === void 0) {
          continue;
        }
        checksumAlgorithms.push({
          algorithmId: /* @__PURE__ */ __name(() => algorithmId, "algorithmId"),
          checksumConstructor: /* @__PURE__ */ __name(() => runtimeConfig[algorithmId], "checksumConstructor")
        });
      }
      for (const [id, ChecksumCtor] of Object.entries(runtimeConfig.checksumAlgorithms ?? {})) {
        checksumAlgorithms.push({
          algorithmId: /* @__PURE__ */ __name(() => id, "algorithmId"),
          checksumConstructor: /* @__PURE__ */ __name(() => ChecksumCtor, "checksumConstructor")
        });
      }
      return {
        addChecksumAlgorithm(algo) {
          runtimeConfig.checksumAlgorithms = runtimeConfig.checksumAlgorithms ?? {};
          const id = algo.algorithmId();
          const ctor = algo.checksumConstructor();
          if (knownAlgorithms.includes(id)) {
            runtimeConfig.checksumAlgorithms[id.toUpperCase()] = ctor;
          } else {
            runtimeConfig.checksumAlgorithms[id] = ctor;
          }
          checksumAlgorithms.push(algo);
        },
        checksumAlgorithms() {
          return checksumAlgorithms;
        }
      };
    }, "getChecksumConfiguration");
    resolveChecksumRuntimeConfig = /* @__PURE__ */ __name((clientConfig) => {
      const runtimeConfig = {};
      clientConfig.checksumAlgorithms().forEach((checksumAlgorithm) => {
        const id = checksumAlgorithm.algorithmId();
        if (knownAlgorithms.includes(id)) {
          runtimeConfig[id] = checksumAlgorithm.checksumConstructor();
        }
      });
      return runtimeConfig;
    }, "resolveChecksumRuntimeConfig");
  }
});

// node_modules/@smithy/core/dist-es/submodules/client/smithy-client/extensions/retry.js
var getRetryConfiguration, resolveRetryRuntimeConfig;
var init_retry = __esm({
  "node_modules/@smithy/core/dist-es/submodules/client/smithy-client/extensions/retry.js"() {
    getRetryConfiguration = /* @__PURE__ */ __name((runtimeConfig) => {
      return {
        setRetryStrategy(retryStrategy) {
          runtimeConfig.retryStrategy = retryStrategy;
        },
        retryStrategy() {
          return runtimeConfig.retryStrategy;
        }
      };
    }, "getRetryConfiguration");
    resolveRetryRuntimeConfig = /* @__PURE__ */ __name((retryStrategyConfiguration) => {
      const runtimeConfig = {};
      runtimeConfig.retryStrategy = retryStrategyConfiguration.retryStrategy();
      return runtimeConfig;
    }, "resolveRetryRuntimeConfig");
  }
});

// node_modules/@smithy/core/dist-es/submodules/client/smithy-client/extensions/defaultExtensionConfiguration.js
var getDefaultExtensionConfiguration, resolveDefaultRuntimeConfig2;
var init_defaultExtensionConfiguration = __esm({
  "node_modules/@smithy/core/dist-es/submodules/client/smithy-client/extensions/defaultExtensionConfiguration.js"() {
    init_checksum2();
    init_retry();
    getDefaultExtensionConfiguration = /* @__PURE__ */ __name((runtimeConfig) => {
      return Object.assign(getChecksumConfiguration(runtimeConfig), getRetryConfiguration(runtimeConfig));
    }, "getDefaultExtensionConfiguration");
    resolveDefaultRuntimeConfig2 = /* @__PURE__ */ __name((config) => {
      return Object.assign(resolveChecksumRuntimeConfig(config), resolveRetryRuntimeConfig(config));
    }, "resolveDefaultRuntimeConfig");
  }
});

// node_modules/@smithy/core/dist-es/submodules/client/smithy-client/get-value-from-text-node.js
var getValueFromTextNode;
var init_get_value_from_text_node = __esm({
  "node_modules/@smithy/core/dist-es/submodules/client/smithy-client/get-value-from-text-node.js"() {
    init_transport();
    getValueFromTextNode = /* @__PURE__ */ __name((obj) => {
      const textNodeName = "#text";
      for (const key in obj) {
        if (!hasOwn(obj, key))
          continue;
        if (obj[key][textNodeName] !== void 0) {
          obj[key] = obj[key][textNodeName];
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          obj[key] = getValueFromTextNode(obj[key]);
        }
      }
      return obj;
    }, "getValueFromTextNode");
  }
});

// node_modules/@smithy/core/dist-es/submodules/client/smithy-client/NoOpLogger.js
var NoOpLogger;
var init_NoOpLogger = __esm({
  "node_modules/@smithy/core/dist-es/submodules/client/smithy-client/NoOpLogger.js"() {
    NoOpLogger = class {
      static {
        __name(this, "NoOpLogger");
      }
      trace() {
      }
      debug() {
      }
      info() {
      }
      warn() {
      }
      error() {
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/client/smithy-client/client-command-builder.js
function makeBuilder(common, service, name, ep) {
  return /* @__PURE__ */ __name(function makeCommand(added, plugins, op, $, smithyContext = {}) {
    const epMerged = Object.assign({}, common, added);
    return Command.classBuilder().ep(epMerged).m(function(CommandCtor, clientStack, config, options) {
      const list = plugins.call(this, CommandCtor, clientStack, config, options);
      list.unshift(ep(config, CommandCtor.getEndpointParameterInstructions()));
      return list;
    }).s(service, op, smithyContext).n(name, op.charAt(0).toUpperCase() + op.slice(1) + "Command").sc($).build();
  }, "makeCommand");
}
var init_client_command_builder = __esm({
  "node_modules/@smithy/core/dist-es/submodules/client/smithy-client/client-command-builder.js"() {
    init_command();
    __name(makeBuilder, "makeBuilder");
  }
});

// node_modules/@smithy/core/dist-es/submodules/client/index.js
var init_client2 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/client/index.js"() {
    init_transport();
    init_transport();
    init_client();
    init_command();
    init_create_aggregated_client();
    init_defaults_mode();
    init_emitWarningIfUnsupportedVersion();
    init_exceptions();
    init_defaultExtensionConfiguration();
    init_get_value_from_text_node();
    init_NoOpLogger();
    init_client_command_builder();
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/emitWarningIfUnsupportedVersion.js
var state, emitWarningIfUnsupportedVersion2;
var init_emitWarningIfUnsupportedVersion2 = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/emitWarningIfUnsupportedVersion.js"() {
    state = {
      warningEmitted: false
    };
    emitWarningIfUnsupportedVersion2 = /* @__PURE__ */ __name((version) => {
      if (version && !state.warningEmitted) {
        if (process.env.AWS_SDK_JS_NODE_VERSION_SUPPORT_WARNING_DISABLED === "true") {
          state.warningEmitted = true;
          return;
        }
        const userMajorVersion = parseInt(version.substring(1, version.indexOf(".")));
        const vv = 22;
        if (userMajorVersion < vv) {
          state.warningEmitted = true;
          process.emitWarning(`NodeVersionSupportWarning: The AWS SDK for JavaScript (v3)
versions published after the first week of January 2027
will require node >=${vv}. You are running node ${version}.

To continue receiving updates to AWS services, bug fixes,
and security updates please upgrade to node >=${vv}.

More information can be found at: https://a.co/c895JFp`);
        }
      }
    }, "emitWarningIfUnsupportedVersion");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/setCredentialFeature.js
function setCredentialFeature(credentials, feature, value) {
  if (!credentials.$source) {
    credentials.$source = {};
  }
  credentials.$source[feature] = value;
  return credentials;
}
var init_setCredentialFeature = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/setCredentialFeature.js"() {
    __name(setCredentialFeature, "setCredentialFeature");
  }
});

// node_modules/@smithy/core/dist-es/submodules/retry/middleware-retry/isStreamingPayload/isStreamingPayload.js
import { Readable } from "node:stream";
var isStreamingPayload;
var init_isStreamingPayload = __esm({
  "node_modules/@smithy/core/dist-es/submodules/retry/middleware-retry/isStreamingPayload/isStreamingPayload.js"() {
    isStreamingPayload = /* @__PURE__ */ __name((request) => request?.body instanceof Readable || typeof ReadableStream !== "undefined" && request?.body instanceof ReadableStream, "isStreamingPayload");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/is-array-buffer/is-array-buffer.js
var isArrayBuffer;
var init_is_array_buffer = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/is-array-buffer/is-array-buffer.js"() {
    isArrayBuffer = /* @__PURE__ */ __name((arg) => typeof ArrayBuffer === "function" && arg instanceof ArrayBuffer || Object.prototype.toString.call(arg) === "[object ArrayBuffer]", "isArrayBuffer");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/util-buffer-from/buffer-from.js
var fromArrayBuffer, fromString;
var init_buffer_from = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/util-buffer-from/buffer-from.js"() {
    init_is_array_buffer();
    fromArrayBuffer = /* @__PURE__ */ __name((input, offset = 0, length = input.byteLength - offset) => {
      if (!isArrayBuffer(input)) {
        throw new TypeError(`The "input" argument must be ArrayBuffer. Received type ${typeof input} (${input})`);
      }
      return Buffer.from(input, offset, length);
    }, "fromArrayBuffer");
    fromString = /* @__PURE__ */ __name((input, encoding) => {
      if (typeof input !== "string") {
        throw new TypeError(`The "input" argument must be of type string. Received type ${typeof input} (${input})`);
      }
      return encoding ? Buffer.from(input, encoding) : Buffer.from(input);
    }, "fromString");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/util-base64/fromBase64.js
var BASE64_REGEX, fromBase64;
var init_fromBase64 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/util-base64/fromBase64.js"() {
    init_buffer_from();
    BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;
    fromBase64 = /* @__PURE__ */ __name((input) => {
      if (input.length * 3 % 4 !== 0) {
        throw new TypeError(`Incorrect padding on base64 string.`);
      }
      if (!BASE64_REGEX.exec(input)) {
        throw new TypeError(`Invalid base64 string.`);
      }
      const buffer = fromString(input, "base64");
      return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    }, "fromBase64");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/util-utf8/fromUtf8.js
var fromUtf8;
var init_fromUtf8 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/util-utf8/fromUtf8.js"() {
    init_buffer_from();
    fromUtf8 = /* @__PURE__ */ __name((input) => {
      const buf = fromString(input, "utf8");
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength / Uint8Array.BYTES_PER_ELEMENT);
    }, "fromUtf8");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/util-base64/toBase64.js
var toBase64;
var init_toBase64 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/util-base64/toBase64.js"() {
    init_buffer_from();
    init_fromUtf8();
    toBase64 = /* @__PURE__ */ __name((_input) => {
      let input;
      if (typeof _input === "string") {
        input = fromUtf8(_input);
      } else {
        input = _input;
      }
      if (typeof input !== "object" || typeof input.byteOffset !== "number" || typeof input.byteLength !== "number") {
        throw new Error("@smithy/util-base64: toBase64 encoder function only accepts string | Uint8Array.");
      }
      return fromArrayBuffer(input.buffer, input.byteOffset, input.byteLength).toString("base64");
    }, "toBase64");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/util-stream/blob/Uint8ArrayBlobAdapter.js
function bindUint8ArrayBlobAdapter(toUtf83, fromUtf83, toBase643, fromBase642) {
  return class Uint8ArrayBlobAdapter2 extends Uint8Array {
    static {
      __name(this, "Uint8ArrayBlobAdapter");
    }
    static fromString(source, encoding = "utf-8") {
      if (typeof source === "string") {
        if (encoding === "base64") {
          return Uint8ArrayBlobAdapter2.mutate(fromBase642(source));
        }
        return Uint8ArrayBlobAdapter2.mutate(fromUtf83(source));
      }
      throw new Error(`Unsupported conversion from ${typeof source} to Uint8ArrayBlobAdapter.`);
    }
    static mutate(source) {
      Object.setPrototypeOf(source, Uint8ArrayBlobAdapter2.prototype);
      return source;
    }
    transformToString(encoding = "utf-8") {
      if (encoding === "base64") {
        return toBase643(this);
      }
      return toUtf83(this);
    }
  };
}
var init_Uint8ArrayBlobAdapter = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/util-stream/blob/Uint8ArrayBlobAdapter.js"() {
    __name(bindUint8ArrayBlobAdapter, "bindUint8ArrayBlobAdapter");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/util-utf8/toUtf8.js
var toUtf8;
var init_toUtf8 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/util-utf8/toUtf8.js"() {
    init_buffer_from();
    toUtf8 = /* @__PURE__ */ __name((input) => {
      if (typeof input === "string") {
        return input;
      }
      if (typeof input !== "object" || typeof input.byteOffset !== "number" || typeof input.byteLength !== "number") {
        throw new Error("@smithy/util-utf8: toUtf8 encoder function only accepts string | Uint8Array.");
      }
      return fromArrayBuffer(input.buffer, input.byteOffset, input.byteLength).toString("utf8");
    }, "toUtf8");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/uuid/v4.js
function bindV4(getRandomValues2) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return () => crypto.randomUUID();
  }
  return () => {
    const rnds = new Uint8Array(16);
    getRandomValues2(rnds);
    rnds[6] = rnds[6] & 15 | 64;
    rnds[8] = rnds[8] & 63 | 128;
    return decimalToHex[rnds[0]] + decimalToHex[rnds[1]] + decimalToHex[rnds[2]] + decimalToHex[rnds[3]] + "-" + decimalToHex[rnds[4]] + decimalToHex[rnds[5]] + "-" + decimalToHex[rnds[6]] + decimalToHex[rnds[7]] + "-" + decimalToHex[rnds[8]] + decimalToHex[rnds[9]] + "-" + decimalToHex[rnds[10]] + decimalToHex[rnds[11]] + decimalToHex[rnds[12]] + decimalToHex[rnds[13]] + decimalToHex[rnds[14]] + decimalToHex[rnds[15]];
  };
}
var decimalToHex;
var init_v4 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/uuid/v4.js"() {
    decimalToHex = Array.from({ length: 256 }, (_, i6) => i6.toString(16).padStart(2, "0"));
    __name(bindV4, "bindV4");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/parse-utils.js
var expectNumber, MAX_FLOAT, expectFloat32, expectLong, expectShort, expectByte, expectSizedInt, castInt, strictParseDouble, strictParseFloat32, NUMBER_REGEX, parseNumber, strictParseShort, strictParseByte, stackTraceWarning, logger;
var init_parse_utils = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/parse-utils.js"() {
    expectNumber = /* @__PURE__ */ __name((value) => {
      if (value === null || value === void 0) {
        return void 0;
      }
      if (typeof value === "string") {
        const parsed = parseFloat(value);
        if (!Number.isNaN(parsed)) {
          if (String(parsed) !== String(value)) {
            logger.warn(stackTraceWarning(`Expected number but observed string: ${value}`));
          }
          return parsed;
        }
      }
      if (typeof value === "number") {
        return value;
      }
      throw new TypeError(`Expected number, got ${typeof value}: ${value}`);
    }, "expectNumber");
    MAX_FLOAT = Math.ceil(2 ** 127 * (2 - 2 ** -23));
    expectFloat32 = /* @__PURE__ */ __name((value) => {
      const expected = expectNumber(value);
      if (expected !== void 0 && !Number.isNaN(expected) && expected !== Infinity && expected !== -Infinity) {
        if (Math.abs(expected) > MAX_FLOAT) {
          throw new TypeError(`Expected 32-bit float, got ${value}`);
        }
      }
      return expected;
    }, "expectFloat32");
    expectLong = /* @__PURE__ */ __name((value) => {
      if (value === null || value === void 0) {
        return void 0;
      }
      if (Number.isInteger(value) && !Number.isNaN(value)) {
        return value;
      }
      throw new TypeError(`Expected integer, got ${typeof value}: ${value}`);
    }, "expectLong");
    expectShort = /* @__PURE__ */ __name((value) => expectSizedInt(value, 16), "expectShort");
    expectByte = /* @__PURE__ */ __name((value) => expectSizedInt(value, 8), "expectByte");
    expectSizedInt = /* @__PURE__ */ __name((value, size) => {
      const expected = expectLong(value);
      if (expected !== void 0 && castInt(expected, size) !== expected) {
        throw new TypeError(`Expected ${size}-bit integer, got ${value}`);
      }
      return expected;
    }, "expectSizedInt");
    castInt = /* @__PURE__ */ __name((value, size) => {
      switch (size) {
        case 32:
          return Int32Array.of(value)[0];
        case 16:
          return Int16Array.of(value)[0];
        case 8:
          return Int8Array.of(value)[0];
      }
    }, "castInt");
    strictParseDouble = /* @__PURE__ */ __name((value) => {
      if (typeof value == "string") {
        return expectNumber(parseNumber(value));
      }
      return expectNumber(value);
    }, "strictParseDouble");
    strictParseFloat32 = /* @__PURE__ */ __name((value) => {
      if (typeof value == "string") {
        return expectFloat32(parseNumber(value));
      }
      return expectFloat32(value);
    }, "strictParseFloat32");
    NUMBER_REGEX = /(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)|(-?Infinity)|(NaN)/g;
    parseNumber = /* @__PURE__ */ __name((value) => {
      const matches = value.match(NUMBER_REGEX);
      if (matches === null || matches[0].length !== value.length) {
        throw new TypeError(`Expected real number, got implicit NaN`);
      }
      return parseFloat(value);
    }, "parseNumber");
    strictParseShort = /* @__PURE__ */ __name((value) => {
      if (typeof value === "string") {
        return expectShort(parseNumber(value));
      }
      return expectShort(value);
    }, "strictParseShort");
    strictParseByte = /* @__PURE__ */ __name((value) => {
      if (typeof value === "string") {
        return expectByte(parseNumber(value));
      }
      return expectByte(value);
    }, "strictParseByte");
    stackTraceWarning = /* @__PURE__ */ __name((message) => {
      return String(new TypeError(message).stack || message).split("\n").slice(0, 5).filter((s3) => !s3.includes("stackTraceWarning")).join("\n");
    }, "stackTraceWarning");
    logger = {
      warn: console.warn
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/date-utils.js
function dateToUtcString(date2) {
  const year2 = date2.getUTCFullYear();
  const month = date2.getUTCMonth();
  const dayOfWeek = date2.getUTCDay();
  const dayOfMonthInt = date2.getUTCDate();
  const hoursInt = date2.getUTCHours();
  const minutesInt = date2.getUTCMinutes();
  const secondsInt = date2.getUTCSeconds();
  const dayOfMonthString = dayOfMonthInt < 10 ? `0${dayOfMonthInt}` : `${dayOfMonthInt}`;
  const hoursString = hoursInt < 10 ? `0${hoursInt}` : `${hoursInt}`;
  const minutesString = minutesInt < 10 ? `0${minutesInt}` : `${minutesInt}`;
  const secondsString = secondsInt < 10 ? `0${secondsInt}` : `${secondsInt}`;
  return `${DAYS[dayOfWeek]}, ${dayOfMonthString} ${MONTHS[month]} ${year2} ${hoursString}:${minutesString}:${secondsString} GMT`;
}
var DAYS, MONTHS, RFC3339, parseRfc3339DateTime, RFC3339_WITH_OFFSET, parseRfc3339DateTimeWithOffset, IMF_FIXDATE, RFC_850_DATE, ASC_TIME, parseRfc7231DateTime, parseEpochTimestamp, buildDate, parseTwoDigitYear, FIFTY_YEARS_IN_MILLIS, adjustRfc850Year, parseMonthByShortName, DAYS_IN_MONTH, validateDayOfMonth, isLeapYear, parseDateValue, parseMilliseconds, parseOffsetToMilliseconds, stripLeadingZeroes;
var init_date_utils = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/date-utils.js"() {
    init_parse_utils();
    DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    __name(dateToUtcString, "dateToUtcString");
    RFC3339 = new RegExp(/^(\d{4})-(\d{2})-(\d{2})[tT](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?[zZ]$/);
    parseRfc3339DateTime = /* @__PURE__ */ __name((value) => {
      if (value === null || value === void 0) {
        return void 0;
      }
      if (typeof value !== "string") {
        throw new TypeError("RFC-3339 date-times must be expressed as strings");
      }
      const match = RFC3339.exec(value);
      if (!match) {
        throw new TypeError("Invalid RFC-3339 date-time value");
      }
      const [_, yearStr, monthStr, dayStr, hours, minutes, seconds, fractionalMilliseconds] = match;
      const year2 = strictParseShort(stripLeadingZeroes(yearStr));
      const month = parseDateValue(monthStr, "month", 1, 12);
      const day = parseDateValue(dayStr, "day", 1, 31);
      return buildDate(year2, month, day, { hours, minutes, seconds, fractionalMilliseconds });
    }, "parseRfc3339DateTime");
    RFC3339_WITH_OFFSET = new RegExp(/^(\d{4})-(\d{2})-(\d{2})[tT](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(([-+]\d{2}:\d{2})|[zZ])$/);
    parseRfc3339DateTimeWithOffset = /* @__PURE__ */ __name((value) => {
      if (value === null || value === void 0) {
        return void 0;
      }
      if (typeof value !== "string") {
        throw new TypeError("RFC-3339 date-times must be expressed as strings");
      }
      const match = RFC3339_WITH_OFFSET.exec(value);
      if (!match) {
        throw new TypeError("Invalid RFC-3339 date-time value");
      }
      const [_, yearStr, monthStr, dayStr, hours, minutes, seconds, fractionalMilliseconds, offsetStr] = match;
      const year2 = strictParseShort(stripLeadingZeroes(yearStr));
      const month = parseDateValue(monthStr, "month", 1, 12);
      const day = parseDateValue(dayStr, "day", 1, 31);
      const date2 = buildDate(year2, month, day, { hours, minutes, seconds, fractionalMilliseconds });
      if (offsetStr.toUpperCase() != "Z") {
        date2.setTime(date2.getTime() - parseOffsetToMilliseconds(offsetStr));
      }
      return date2;
    }, "parseRfc3339DateTimeWithOffset");
    IMF_FIXDATE = new RegExp(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))? GMT$/);
    RFC_850_DATE = new RegExp(/^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\d{2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2}) (\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))? GMT$/);
    ASC_TIME = new RegExp(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( [1-9]|\d{2}) (\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))? (\d{4})$/);
    parseRfc7231DateTime = /* @__PURE__ */ __name((value) => {
      if (value === null || value === void 0) {
        return void 0;
      }
      if (typeof value !== "string") {
        throw new TypeError("RFC-7231 date-times must be expressed as strings");
      }
      let match = IMF_FIXDATE.exec(value);
      if (match) {
        const [_, dayStr, monthStr, yearStr, hours, minutes, seconds, fractionalMilliseconds] = match;
        return buildDate(strictParseShort(stripLeadingZeroes(yearStr)), parseMonthByShortName(monthStr), parseDateValue(dayStr, "day", 1, 31), { hours, minutes, seconds, fractionalMilliseconds });
      }
      match = RFC_850_DATE.exec(value);
      if (match) {
        const [_, dayStr, monthStr, yearStr, hours, minutes, seconds, fractionalMilliseconds] = match;
        return adjustRfc850Year(buildDate(parseTwoDigitYear(yearStr), parseMonthByShortName(monthStr), parseDateValue(dayStr, "day", 1, 31), {
          hours,
          minutes,
          seconds,
          fractionalMilliseconds
        }));
      }
      match = ASC_TIME.exec(value);
      if (match) {
        const [_, monthStr, dayStr, hours, minutes, seconds, fractionalMilliseconds, yearStr] = match;
        return buildDate(strictParseShort(stripLeadingZeroes(yearStr)), parseMonthByShortName(monthStr), parseDateValue(dayStr.trimLeft(), "day", 1, 31), { hours, minutes, seconds, fractionalMilliseconds });
      }
      throw new TypeError("Invalid RFC-7231 date-time value");
    }, "parseRfc7231DateTime");
    parseEpochTimestamp = /* @__PURE__ */ __name((value) => {
      if (value === null || value === void 0) {
        return void 0;
      }
      let valueAsDouble;
      if (typeof value === "number") {
        valueAsDouble = value;
      } else if (typeof value === "string") {
        valueAsDouble = strictParseDouble(value);
      } else if (typeof value === "object" && value.tag === 1) {
        valueAsDouble = value.value;
      } else {
        throw new TypeError("Epoch timestamps must be expressed as floating point numbers or their string representation");
      }
      if (Number.isNaN(valueAsDouble) || valueAsDouble === Infinity || valueAsDouble === -Infinity) {
        throw new TypeError("Epoch timestamps must be valid, non-Infinite, non-NaN numerics");
      }
      return new Date(Math.round(valueAsDouble * 1e3));
    }, "parseEpochTimestamp");
    buildDate = /* @__PURE__ */ __name((year2, month, day, time2) => {
      const adjustedMonth = month - 1;
      validateDayOfMonth(year2, adjustedMonth, day);
      return new Date(Date.UTC(year2, adjustedMonth, day, parseDateValue(time2.hours, "hour", 0, 23), parseDateValue(time2.minutes, "minute", 0, 59), parseDateValue(time2.seconds, "seconds", 0, 60), parseMilliseconds(time2.fractionalMilliseconds)));
    }, "buildDate");
    parseTwoDigitYear = /* @__PURE__ */ __name((value) => {
      const thisYear = (/* @__PURE__ */ new Date()).getUTCFullYear();
      const valueInThisCentury = Math.floor(thisYear / 100) * 100 + strictParseShort(stripLeadingZeroes(value));
      if (valueInThisCentury < thisYear) {
        return valueInThisCentury + 100;
      }
      return valueInThisCentury;
    }, "parseTwoDigitYear");
    FIFTY_YEARS_IN_MILLIS = 50 * 365 * 24 * 60 * 60 * 1e3;
    adjustRfc850Year = /* @__PURE__ */ __name((input) => {
      if (input.getTime() - (/* @__PURE__ */ new Date()).getTime() > FIFTY_YEARS_IN_MILLIS) {
        return new Date(Date.UTC(input.getUTCFullYear() - 100, input.getUTCMonth(), input.getUTCDate(), input.getUTCHours(), input.getUTCMinutes(), input.getUTCSeconds(), input.getUTCMilliseconds()));
      }
      return input;
    }, "adjustRfc850Year");
    parseMonthByShortName = /* @__PURE__ */ __name((value) => {
      const monthIdx = MONTHS.indexOf(value);
      if (monthIdx < 0) {
        throw new TypeError(`Invalid month: ${value}`);
      }
      return monthIdx + 1;
    }, "parseMonthByShortName");
    DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    validateDayOfMonth = /* @__PURE__ */ __name((year2, month, day) => {
      let maxDays = DAYS_IN_MONTH[month];
      if (month === 1 && isLeapYear(year2)) {
        maxDays = 29;
      }
      if (day > maxDays) {
        throw new TypeError(`Invalid day for ${MONTHS[month]} in ${year2}: ${day}`);
      }
    }, "validateDayOfMonth");
    isLeapYear = /* @__PURE__ */ __name((year2) => {
      return year2 % 4 === 0 && (year2 % 100 !== 0 || year2 % 400 === 0);
    }, "isLeapYear");
    parseDateValue = /* @__PURE__ */ __name((value, type, lower, upper) => {
      const dateVal = strictParseByte(stripLeadingZeroes(value));
      if (dateVal < lower || dateVal > upper) {
        throw new TypeError(`${type} must be between ${lower} and ${upper}, inclusive`);
      }
      return dateVal;
    }, "parseDateValue");
    parseMilliseconds = /* @__PURE__ */ __name((value) => {
      if (value === null || value === void 0) {
        return 0;
      }
      return strictParseFloat32("0." + value) * 1e3;
    }, "parseMilliseconds");
    parseOffsetToMilliseconds = /* @__PURE__ */ __name((value) => {
      const directionStr = value[0];
      let direction = 1;
      if (directionStr == "+") {
        direction = 1;
      } else if (directionStr == "-") {
        direction = -1;
      } else {
        throw new TypeError(`Offset direction, ${directionStr}, must be "+" or "-"`);
      }
      const hour = Number(value.substring(1, 3));
      const minute = Number(value.substring(4, 6));
      return direction * (hour * 60 + minute) * 60 * 1e3;
    }, "parseOffsetToMilliseconds");
    stripLeadingZeroes = /* @__PURE__ */ __name((value) => {
      let idx = 0;
      while (idx < value.length - 1 && value.charAt(idx) === "0") {
        idx++;
      }
      if (idx === 0) {
        return value;
      }
      return value.slice(idx);
    }, "stripLeadingZeroes");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/lazy-json.js
var LazyJsonString;
var init_lazy_json = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/lazy-json.js"() {
    LazyJsonString = /* @__PURE__ */ __name(function LazyJsonString2(val) {
      const str = Object.assign(new String(val), {
        deserializeJSON() {
          return JSON.parse(String(val));
        },
        toString() {
          return String(val);
        },
        toJSON() {
          return String(val);
        }
      });
      return str;
    }, "LazyJsonString");
    LazyJsonString.from = (object) => {
      if (object && typeof object === "object" && (object instanceof LazyJsonString || "deserializeJSON" in object)) {
        return object;
      } else if (typeof object === "string" || Object.getPrototypeOf(object) === String.prototype) {
        return LazyJsonString(String(object));
      }
      return LazyJsonString(JSON.stringify(object));
    };
    LazyJsonString.fromObject = LazyJsonString.from;
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/quote-header.js
function quoteHeader(part) {
  if (part.includes(",") || part.includes('"')) {
    part = `"${part.replace(/"/g, '\\"')}"`;
  }
  return part;
}
var init_quote_header = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/quote-header.js"() {
    __name(quoteHeader, "quoteHeader");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/schema-serde-lib/schema-date-utils.js
function range(v2, min, max) {
  const _v = Number(v2);
  if (_v < min || _v > max) {
    throw new Error(`Value ${_v} out of range [${min}, ${max}]`);
  }
}
var ddd, mmm, time, date, year, RFC3339_WITH_OFFSET2, IMF_FIXDATE2, RFC_850_DATE2, ASC_TIME2, months, _parseEpochTimestamp, _parseRfc3339DateTimeWithOffset, _parseRfc7231DateTime;
var init_schema_date_utils = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/schema-serde-lib/schema-date-utils.js"() {
    ddd = `(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:[ne|u?r]?s?day)?`;
    mmm = `(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)`;
    time = `(\\d?\\d):(\\d{2}):(\\d{2})(?:\\.(\\d+))?`;
    date = `(\\d?\\d)`;
    year = `(\\d{4})`;
    RFC3339_WITH_OFFSET2 = new RegExp(/^(\d{4})-(\d\d)-(\d\d)[tT](\d\d):(\d\d):(\d\d)(\.(\d+))?(([-+]\d\d:\d\d)|[zZ])$/);
    IMF_FIXDATE2 = new RegExp(`^${ddd}, ${date} ${mmm} ${year} ${time} GMT$`);
    RFC_850_DATE2 = new RegExp(`^${ddd}, ${date}-${mmm}-(\\d\\d) ${time} GMT$`);
    ASC_TIME2 = new RegExp(`^${ddd} ${mmm} ( [1-9]|\\d\\d) ${time} ${year}$`);
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    _parseEpochTimestamp = /* @__PURE__ */ __name((value) => {
      if (value == null) {
        return void 0;
      }
      let num = NaN;
      if (typeof value === "number") {
        num = value;
      } else if (typeof value === "string") {
        if (!/^-?\d*\.?\d+$/.test(value)) {
          throw new TypeError(`parseEpochTimestamp - numeric string invalid.`);
        }
        num = Number.parseFloat(value);
      } else if (typeof value === "object" && value.tag === 1) {
        num = value.value;
      }
      if (isNaN(num) || Math.abs(num) === Infinity) {
        throw new TypeError("Epoch timestamps must be valid finite numbers.");
      }
      return new Date(Math.round(num * 1e3));
    }, "_parseEpochTimestamp");
    _parseRfc3339DateTimeWithOffset = /* @__PURE__ */ __name((value) => {
      if (value == null) {
        return void 0;
      }
      if (typeof value !== "string") {
        throw new TypeError("RFC3339 timestamps must be strings");
      }
      const matches = RFC3339_WITH_OFFSET2.exec(value);
      if (!matches) {
        throw new TypeError(`Invalid RFC3339 timestamp format ${value}`);
      }
      const [, yearStr, monthStr, dayStr, hours, minutes, seconds, , ms, offsetStr] = matches;
      range(monthStr, 1, 12);
      range(dayStr, 1, 31);
      range(hours, 0, 23);
      range(minutes, 0, 59);
      range(seconds, 0, 60);
      const date2 = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr), Number(hours), Number(minutes), Number(seconds), Number(ms) ? Math.round(parseFloat(`0.${ms}`) * 1e3) : 0));
      date2.setUTCFullYear(Number(yearStr));
      if (offsetStr.toUpperCase() != "Z") {
        const [, sign2, offsetH, offsetM] = /([+-])(\d\d):(\d\d)/.exec(offsetStr) || [void 0, "+", 0, 0];
        const scalar = sign2 === "-" ? 1 : -1;
        date2.setTime(date2.getTime() + scalar * (Number(offsetH) * 60 * 60 * 1e3 + Number(offsetM) * 60 * 1e3));
      }
      return date2;
    }, "_parseRfc3339DateTimeWithOffset");
    _parseRfc7231DateTime = /* @__PURE__ */ __name((value) => {
      if (value == null) {
        return void 0;
      }
      if (typeof value !== "string") {
        throw new TypeError("RFC7231 timestamps must be strings.");
      }
      let day;
      let month;
      let year2;
      let hour;
      let minute;
      let second;
      let fraction;
      let matches;
      if (matches = IMF_FIXDATE2.exec(value)) {
        [, day, month, year2, hour, minute, second, fraction] = matches;
      } else if (matches = RFC_850_DATE2.exec(value)) {
        [, day, month, year2, hour, minute, second, fraction] = matches;
        year2 = (Number(year2) + 1900).toString();
      } else if (matches = ASC_TIME2.exec(value)) {
        [, month, day, hour, minute, second, fraction, year2] = matches;
      }
      if (year2 && second) {
        const timestamp = Date.UTC(Number(year2), months.indexOf(month), Number(day), Number(hour), Number(minute), Number(second), fraction ? Math.round(parseFloat(`0.${fraction}`) * 1e3) : 0);
        range(day, 1, 31);
        range(hour, 0, 23);
        range(minute, 0, 59);
        range(second, 0, 60);
        const date2 = new Date(timestamp);
        date2.setUTCFullYear(Number(year2));
        return date2;
      }
      throw new TypeError(`Invalid RFC7231 date-time value ${value}.`);
    }, "_parseRfc7231DateTime");
    __name(range, "range");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/split-every.js
function splitEvery(value, delimiter, numDelimiters) {
  if (numDelimiters <= 0 || !Number.isInteger(numDelimiters)) {
    throw new Error("Invalid number of delimiters (" + numDelimiters + ") for splitEvery.");
  }
  const segments = value.split(delimiter);
  if (numDelimiters === 1) {
    return segments;
  }
  const compoundSegments = [];
  let currentSegment = "";
  for (let i6 = 0; i6 < segments.length; i6++) {
    if (currentSegment === "") {
      currentSegment = segments[i6];
    } else {
      currentSegment += delimiter + segments[i6];
    }
    if ((i6 + 1) % numDelimiters === 0) {
      compoundSegments.push(currentSegment);
      currentSegment = "";
    }
  }
  if (currentSegment !== "") {
    compoundSegments.push(currentSegment);
  }
  return compoundSegments;
}
var init_split_every = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/split-every.js"() {
    __name(splitEvery, "splitEvery");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/split-header.js
var splitHeader;
var init_split_header = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/split-header.js"() {
    splitHeader = /* @__PURE__ */ __name((value) => {
      const z2 = value.length;
      const values = [];
      let withinQuotes = false;
      let prevChar = void 0;
      let anchor = 0;
      for (let i6 = 0; i6 < z2; ++i6) {
        const char = value[i6];
        switch (char) {
          case `"`:
            if (prevChar !== "\\") {
              withinQuotes = !withinQuotes;
            }
            break;
          case ",":
            if (!withinQuotes) {
              values.push(value.slice(anchor, i6));
              anchor = i6 + 1;
            }
            break;
          default:
        }
        prevChar = char;
      }
      values.push(value.slice(anchor));
      return values.map((v2) => {
        v2 = v2.trim();
        const z3 = v2.length;
        if (z3 < 2) {
          return v2;
        }
        if (v2[0] === `"` && v2[z3 - 1] === `"`) {
          v2 = v2.slice(1, z3 - 1);
        }
        return v2.replace(/\\"/g, '"');
      });
    }, "splitHeader");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/value/NumericValue.js
var format, NumericValue;
var init_NumericValue = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/value/NumericValue.js"() {
    format = /^-?((0|[1-9]\d*)(\.\d+)?|\.\d+)([eE][+-]?\d+)?$/;
    NumericValue = class _NumericValue {
      static {
        __name(this, "NumericValue");
      }
      string;
      type;
      constructor(string, type) {
        this.string = string;
        this.type = type;
        if (!format.test(string)) {
          throw new Error(`@smithy/core/serde - NumericValue string must conform to the Smithy bigDecimal format. Received: "${string}"`);
        }
      }
      toString() {
        return this.string;
      }
      static [Symbol.hasInstance](object) {
        if (!object || typeof object !== "object") {
          return false;
        }
        const _nv = object;
        return _NumericValue.prototype.isPrototypeOf(object) || _nv.type === "bigDecimal" && format.test(_nv.string);
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/util-hex-encoding/hex-encoding.js
function fromHex(encoded) {
  if (encoded.length % 2 !== 0) {
    throw new Error("Hex encoded strings must have an even number length");
  }
  const out = new Uint8Array(encoded.length / 2);
  for (let i6 = 0; i6 < encoded.length; i6 += 2) {
    const encodedByte = encoded.slice(i6, i6 + 2).toLowerCase();
    if (encodedByte in HEX_TO_SHORT) {
      out[i6 / 2] = HEX_TO_SHORT[encodedByte];
    } else {
      throw new Error(`Cannot decode unrecognized sequence ${encodedByte} as hexadecimal`);
    }
  }
  return out;
}
function toHex(bytes) {
  let out = "";
  for (let i6 = 0; i6 < bytes.byteLength; i6++) {
    out += SHORT_TO_HEX[bytes[i6]];
  }
  return out;
}
var SHORT_TO_HEX, HEX_TO_SHORT;
var init_hex_encoding = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/util-hex-encoding/hex-encoding.js"() {
    SHORT_TO_HEX = {};
    HEX_TO_SHORT = {};
    for (let i6 = 0; i6 < 256; i6++) {
      let encodedByte = i6.toString(16).toLowerCase();
      if (encodedByte.length === 1) {
        encodedByte = `0${encodedByte}`;
      }
      SHORT_TO_HEX[i6] = encodedByte;
      HEX_TO_SHORT[encodedByte] = i6;
    }
    __name(fromHex, "fromHex");
    __name(toHex, "toHex");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/util-body-length/calculateBodyLength.js
import { ReadStream, fstatSync, lstatSync } from "node:fs";
var calculateBodyLength;
var init_calculateBodyLength = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/util-body-length/calculateBodyLength.js"() {
    calculateBodyLength = /* @__PURE__ */ __name((body) => {
      if (!body) {
        return 0;
      }
      if (typeof body === "string") {
        return Buffer.byteLength(body);
      } else if (typeof body.byteLength === "number") {
        return body.byteLength;
      } else if (typeof body.size === "number") {
        return body.size;
      } else if (typeof body.start === "number" && typeof body.end === "number") {
        return body.end + 1 - body.start;
      } else if (body instanceof ReadStream) {
        if (body.path != null) {
          return lstatSync(body.path).size;
        } else if (typeof body.fd === "number") {
          return fstatSync(body.fd).size;
        }
      }
      throw new Error(`Body Length computation failed for ${body}`);
    }, "calculateBodyLength");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/util-utf8/toUint8Array.js
var toUint8Array;
var init_toUint8Array = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/util-utf8/toUint8Array.js"() {
    init_fromUtf8();
    toUint8Array = /* @__PURE__ */ __name((data) => {
      if (data instanceof Uint8Array) {
        return data;
      }
      if (typeof data === "string") {
        return fromUtf8(data);
      }
      if (ArrayBuffer.isView(data)) {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength / Uint8Array.BYTES_PER_ELEMENT);
      }
      return new Uint8Array(data);
    }, "toUint8Array");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/concatBytes.js
function concatBytes(arrays, length) {
  if (length === void 0) {
    length = 0;
    for (const bytes of arrays) {
      length += bytes.byteLength;
    }
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const buf of arrays) {
    result.set(buf, offset);
    offset += buf.byteLength;
  }
  return result;
}
var init_concatBytes = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/concatBytes.js"() {
    __name(concatBytes, "concatBytes");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/property-provider/ProviderError.js
var ProviderError;
var init_ProviderError = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/property-provider/ProviderError.js"() {
    ProviderError = class _ProviderError extends Error {
      static {
        __name(this, "ProviderError");
      }
      name = "ProviderError";
      tryNextLink;
      constructor(message, options = true) {
        let logger2;
        let tryNextLink = true;
        if (typeof options === "boolean") {
          logger2 = void 0;
          tryNextLink = options;
        } else if (options != null && typeof options === "object") {
          logger2 = options.logger;
          tryNextLink = options.tryNextLink ?? true;
        }
        super(message);
        this.tryNextLink = tryNextLink;
        Object.setPrototypeOf(this, _ProviderError.prototype);
        logger2?.debug?.(`@smithy/property-provider ${tryNextLink ? "->" : "(!)"} ${message}`);
      }
      static from(error, options = true) {
        return Object.assign(new this(error.message, options), error);
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/property-provider/CredentialsProviderError.js
var CredentialsProviderError;
var init_CredentialsProviderError = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/property-provider/CredentialsProviderError.js"() {
    init_ProviderError();
    CredentialsProviderError = class _CredentialsProviderError extends ProviderError {
      static {
        __name(this, "CredentialsProviderError");
      }
      name = "CredentialsProviderError";
      constructor(message, options = true) {
        super(message, options);
        Object.setPrototypeOf(this, _CredentialsProviderError.prototype);
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/property-provider/TokenProviderError.js
var TokenProviderError;
var init_TokenProviderError = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/property-provider/TokenProviderError.js"() {
    init_ProviderError();
    TokenProviderError = class _TokenProviderError extends ProviderError {
      static {
        __name(this, "TokenProviderError");
      }
      name = "TokenProviderError";
      constructor(message, options = true) {
        super(message, options);
        Object.setPrototypeOf(this, _TokenProviderError.prototype);
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/property-provider/chain.js
var chain;
var init_chain = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/property-provider/chain.js"() {
    init_ProviderError();
    chain = /* @__PURE__ */ __name((...providers) => async () => {
      if (providers.length === 0) {
        throw new ProviderError("No providers in chain");
      }
      let lastProviderError;
      for (const provider of providers) {
        try {
          const credentials = await provider();
          return credentials;
        } catch (err2) {
          lastProviderError = err2;
          if (err2?.tryNextLink) {
            continue;
          }
          throw err2;
        }
      }
      throw lastProviderError;
    }, "chain");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/property-provider/fromValue.js
var fromValue;
var init_fromValue = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/property-provider/fromValue.js"() {
    fromValue = /* @__PURE__ */ __name((staticValue) => () => Promise.resolve(staticValue), "fromValue");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/property-provider/memoize.js
var memoize;
var init_memoize = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/property-provider/memoize.js"() {
    memoize = /* @__PURE__ */ __name((provider, isExpired, requiresRefresh) => {
      let resolved;
      let pending;
      let hasResult;
      let isConstant = false;
      const coalesceProvider = /* @__PURE__ */ __name(async () => {
        if (!pending) {
          pending = provider();
        }
        try {
          resolved = await pending;
          hasResult = true;
          isConstant = false;
        } finally {
          pending = void 0;
        }
        return resolved;
      }, "coalesceProvider");
      if (isExpired === void 0) {
        return async (options) => {
          if (!hasResult || options?.forceRefresh) {
            resolved = await coalesceProvider();
          }
          return resolved;
        };
      }
      return async (options) => {
        if (!hasResult || options?.forceRefresh) {
          resolved = await coalesceProvider();
        }
        if (isConstant) {
          return resolved;
        }
        if (requiresRefresh && !requiresRefresh(resolved)) {
          isConstant = true;
          return resolved;
        }
        if (isExpired(resolved)) {
          await coalesceProvider();
          return resolved;
        }
        return resolved;
      };
    }, "memoize");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/util-config-provider/booleanSelector.js
var booleanSelector;
var init_booleanSelector = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/util-config-provider/booleanSelector.js"() {
    booleanSelector = /* @__PURE__ */ __name((obj, key, type) => {
      if (!(key in obj))
        return void 0;
      if (obj[key] === "true")
        return true;
      if (obj[key] === "false")
        return false;
      throw new Error(`Cannot load ${type} "${key}". Expected "true" or "false", got ${obj[key]}.`);
    }, "booleanSelector");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/util-config-provider/types.js
var SelectorType;
var init_types = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/util-config-provider/types.js"() {
    (function(SelectorType2) {
      SelectorType2["ENV"] = "env";
      SelectorType2["CONFIG"] = "shared config entry";
    })(SelectorType || (SelectorType = {}));
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/getHomeDir.js
import { homedir } from "node:os";
import { sep } from "node:path";
var homeDirCache, getHomeDirCacheKey, getHomeDir;
var init_getHomeDir = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/getHomeDir.js"() {
    homeDirCache = {};
    getHomeDirCacheKey = /* @__PURE__ */ __name(() => {
      if (process && process.geteuid) {
        return `${process.geteuid()}`;
      }
      return "DEFAULT";
    }, "getHomeDirCacheKey");
    getHomeDir = /* @__PURE__ */ __name(() => {
      const { HOME, USERPROFILE, HOMEPATH, HOMEDRIVE = `C:${sep}` } = process.env;
      if (HOME)
        return HOME;
      if (USERPROFILE)
        return USERPROFILE;
      if (HOMEPATH)
        return `${HOMEDRIVE}${HOMEPATH}`;
      const homeDirCacheKey = getHomeDirCacheKey();
      if (!homeDirCache[homeDirCacheKey])
        homeDirCache[homeDirCacheKey] = homedir();
      return homeDirCache[homeDirCacheKey];
    }, "getHomeDir");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/getProfileName.js
var ENV_PROFILE, DEFAULT_PROFILE, getProfileName;
var init_getProfileName = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/getProfileName.js"() {
    ENV_PROFILE = "AWS_PROFILE";
    DEFAULT_PROFILE = "default";
    getProfileName = /* @__PURE__ */ __name((init) => init.profile || process.env[ENV_PROFILE] || DEFAULT_PROFILE, "getProfileName");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/getSSOTokenFilepath.js
import { createHash } from "node:crypto";
import { join } from "node:path";
var getSSOTokenFilepath;
var init_getSSOTokenFilepath = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/getSSOTokenFilepath.js"() {
    init_getHomeDir();
    getSSOTokenFilepath = /* @__PURE__ */ __name((id) => {
      const hasher = createHash("sha1");
      const cacheName = hasher.update(id).digest("hex");
      return join(getHomeDir(), ".aws", "sso", "cache", `${cacheName}.json`);
    }, "getSSOTokenFilepath");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/getSSOTokenFromFile.js
import { readFile } from "node:fs/promises";
var tokenIntercept, getSSOTokenFromFile;
var init_getSSOTokenFromFile = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/getSSOTokenFromFile.js"() {
    init_getSSOTokenFilepath();
    tokenIntercept = {};
    getSSOTokenFromFile = /* @__PURE__ */ __name(async (id) => {
      if (tokenIntercept[id]) {
        return tokenIntercept[id];
      }
      const ssoTokenFilepath = getSSOTokenFilepath(id);
      const ssoTokenText = await readFile(ssoTokenFilepath, "utf8");
      return JSON.parse(ssoTokenText);
    }, "getSSOTokenFromFile");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/constants.js
var CONFIG_PREFIX_SEPARATOR;
var init_constants = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/constants.js"() {
    CONFIG_PREFIX_SEPARATOR = ".";
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/getConfigData.js
var getConfigData;
var init_getConfigData = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/getConfigData.js"() {
    init_dist_es();
    init_constants();
    getConfigData = /* @__PURE__ */ __name((data) => Object.entries(data).filter(([key]) => {
      const indexOfSeparator = key.indexOf(CONFIG_PREFIX_SEPARATOR);
      if (indexOfSeparator === -1) {
        return false;
      }
      return Object.values(IniSectionType).includes(key.substring(0, indexOfSeparator));
    }).reduce((acc, [key, value]) => {
      const indexOfSeparator = key.indexOf(CONFIG_PREFIX_SEPARATOR);
      const updatedKey = key.substring(0, indexOfSeparator) === IniSectionType.PROFILE ? key.substring(indexOfSeparator + 1) : key;
      acc[updatedKey] = value;
      return acc;
    }, {
      ...data.default && { default: data.default }
    }), "getConfigData");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/getConfigFilepath.js
import { join as join2 } from "node:path";
var ENV_CONFIG_PATH, getConfigFilepath;
var init_getConfigFilepath = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/getConfigFilepath.js"() {
    init_getHomeDir();
    ENV_CONFIG_PATH = "AWS_CONFIG_FILE";
    getConfigFilepath = /* @__PURE__ */ __name(() => process.env[ENV_CONFIG_PATH] || join2(getHomeDir(), ".aws", "config"), "getConfigFilepath");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/getCredentialsFilepath.js
import { join as join3 } from "node:path";
var ENV_CREDENTIALS_PATH, getCredentialsFilepath;
var init_getCredentialsFilepath = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/getCredentialsFilepath.js"() {
    init_getHomeDir();
    ENV_CREDENTIALS_PATH = "AWS_SHARED_CREDENTIALS_FILE";
    getCredentialsFilepath = /* @__PURE__ */ __name(() => process.env[ENV_CREDENTIALS_PATH] || join3(getHomeDir(), ".aws", "credentials"), "getCredentialsFilepath");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/parseIni.js
var prefixKeyRegex, profileNameBlockList, parseIni;
var init_parseIni = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/parseIni.js"() {
    init_dist_es();
    init_constants();
    prefixKeyRegex = /^([\w-]+)\s(["'])?([\w-@+.%:/]+)\2$/;
    profileNameBlockList = ["__proto__", "profile __proto__"];
    parseIni = /* @__PURE__ */ __name((iniData) => {
      const map = {};
      let currentSection;
      let currentSubSection;
      for (const iniLine of iniData.split(/\r?\n/)) {
        const trimmedLine = iniLine.split(/(^|\s)[;#]/)[0].trim();
        const isSection = trimmedLine[0] === "[" && trimmedLine[trimmedLine.length - 1] === "]";
        if (isSection) {
          currentSection = void 0;
          currentSubSection = void 0;
          const sectionName = trimmedLine.substring(1, trimmedLine.length - 1);
          const matches = prefixKeyRegex.exec(sectionName);
          if (matches) {
            const [, prefix, , name] = matches;
            if (Object.values(IniSectionType).includes(prefix)) {
              currentSection = [prefix, name].join(CONFIG_PREFIX_SEPARATOR);
            }
          } else {
            currentSection = sectionName;
          }
          if (profileNameBlockList.includes(sectionName)) {
            throw new Error(`Found invalid profile name "${sectionName}"`);
          }
        } else if (currentSection) {
          const indexOfEqualsSign = trimmedLine.indexOf("=");
          if (![0, -1].includes(indexOfEqualsSign)) {
            const [name, value] = [
              trimmedLine.substring(0, indexOfEqualsSign).trim(),
              trimmedLine.substring(indexOfEqualsSign + 1).trim()
            ];
            if (value === "") {
              currentSubSection = name;
            } else {
              if (currentSubSection && iniLine.trimStart() === iniLine) {
                currentSubSection = void 0;
              }
              map[currentSection] = map[currentSection] || {};
              const key = currentSubSection ? [currentSubSection, name].join(CONFIG_PREFIX_SEPARATOR) : name;
              map[currentSection][key] = value;
            }
          }
        }
      }
      return map;
    }, "parseIni");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/readFile.js
import { readFile as fsReadFile } from "node:fs/promises";
var filePromises, fileIntercept, readFile2;
var init_readFile = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/readFile.js"() {
    filePromises = {};
    fileIntercept = {};
    readFile2 = /* @__PURE__ */ __name((path, options) => {
      if (fileIntercept[path] !== void 0) {
        return fileIntercept[path];
      }
      if (!filePromises[path] || options?.ignoreCache) {
        filePromises[path] = fsReadFile(path, "utf8");
      }
      return filePromises[path];
    }, "readFile");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/loadSharedConfigFiles.js
import { join as join4 } from "node:path";
var swallowError, loadSharedConfigFiles;
var init_loadSharedConfigFiles = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/loadSharedConfigFiles.js"() {
    init_getConfigData();
    init_getConfigFilepath();
    init_getCredentialsFilepath();
    init_getHomeDir();
    init_parseIni();
    init_readFile();
    init_constants();
    swallowError = /* @__PURE__ */ __name(() => ({}), "swallowError");
    loadSharedConfigFiles = /* @__PURE__ */ __name(async (init = {}) => {
      const { filepath = getCredentialsFilepath(), configFilepath = getConfigFilepath() } = init;
      const homeDir = getHomeDir();
      const relativeHomeDirPrefix = "~/";
      let resolvedFilepath = filepath;
      if (filepath.startsWith(relativeHomeDirPrefix)) {
        resolvedFilepath = join4(homeDir, filepath.slice(2));
      }
      let resolvedConfigFilepath = configFilepath;
      if (configFilepath.startsWith(relativeHomeDirPrefix)) {
        resolvedConfigFilepath = join4(homeDir, configFilepath.slice(2));
      }
      const parsedFiles = await Promise.all([
        readFile2(resolvedConfigFilepath, {
          ignoreCache: init.ignoreCache
        }).then(parseIni).then(getConfigData).catch(swallowError),
        readFile2(resolvedFilepath, {
          ignoreCache: init.ignoreCache
        }).then(parseIni).catch(swallowError)
      ]);
      return {
        configFile: parsedFiles[0],
        credentialsFile: parsedFiles[1]
      };
    }, "loadSharedConfigFiles");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/getSsoSessionData.js
var getSsoSessionData;
var init_getSsoSessionData = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/getSsoSessionData.js"() {
    init_dist_es();
    init_loadSharedConfigFiles();
    getSsoSessionData = /* @__PURE__ */ __name((data) => Object.entries(data).filter(([key]) => key.startsWith(IniSectionType.SSO_SESSION + CONFIG_PREFIX_SEPARATOR)).reduce((acc, [key, value]) => ({ ...acc, [key.substring(key.indexOf(CONFIG_PREFIX_SEPARATOR) + 1)]: value }), {}), "getSsoSessionData");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/loadSsoSessionData.js
var swallowError2, loadSsoSessionData;
var init_loadSsoSessionData = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/loadSsoSessionData.js"() {
    init_getConfigFilepath();
    init_getSsoSessionData();
    init_parseIni();
    init_readFile();
    swallowError2 = /* @__PURE__ */ __name(() => ({}), "swallowError");
    loadSsoSessionData = /* @__PURE__ */ __name(async (init = {}) => readFile2(init.configFilepath ?? getConfigFilepath()).then(parseIni).then(getSsoSessionData).catch(swallowError2), "loadSsoSessionData");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/mergeConfigFiles.js
var mergeConfigFiles;
var init_mergeConfigFiles = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/mergeConfigFiles.js"() {
    mergeConfigFiles = /* @__PURE__ */ __name((...files) => {
      const merged = {};
      for (const file of files) {
        for (const [key, values] of Object.entries(file)) {
          if (merged[key] !== void 0) {
            Object.assign(merged[key], values);
          } else {
            merged[key] = values;
          }
        }
      }
      return merged;
    }, "mergeConfigFiles");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/parseKnownFiles.js
var parseKnownFiles;
var init_parseKnownFiles = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/parseKnownFiles.js"() {
    init_loadSharedConfigFiles();
    init_mergeConfigFiles();
    parseKnownFiles = /* @__PURE__ */ __name(async (init) => {
      const parsedFiles = await loadSharedConfigFiles(init);
      return mergeConfigFiles(parsedFiles.configFile, parsedFiles.credentialsFile);
    }, "parseKnownFiles");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/externalDataInterceptor.js
var externalDataInterceptor;
var init_externalDataInterceptor = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/shared-ini-file-loader/externalDataInterceptor.js"() {
    init_getSSOTokenFromFile();
    init_readFile();
    externalDataInterceptor = {
      getFileRecord() {
        return fileIntercept;
      },
      interceptFile(path, contents) {
        fileIntercept[path] = Promise.resolve(contents);
      },
      getTokenRecord() {
        return tokenIntercept;
      },
      interceptToken(id, contents) {
        tokenIntercept[id] = contents;
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/node-config-provider/getSelectorName.js
function getSelectorName(functionString) {
  try {
    const constants = new Set(Array.from(functionString.match(/([A-Z_]){3,}/g) ?? []));
    constants.delete("CONFIG");
    constants.delete("CONFIG_PREFIX_SEPARATOR");
    constants.delete("ENV");
    return [...constants].join(", ");
  } catch (ignored) {
    return functionString;
  }
}
var init_getSelectorName = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/node-config-provider/getSelectorName.js"() {
    __name(getSelectorName, "getSelectorName");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/node-config-provider/fromEnv.js
var fromEnv;
var init_fromEnv = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/node-config-provider/fromEnv.js"() {
    init_CredentialsProviderError();
    init_getSelectorName();
    fromEnv = /* @__PURE__ */ __name((envVarSelector, options) => async () => {
      try {
        const config = envVarSelector(process.env, options);
        if (config === void 0) {
          throw new Error();
        }
        return config;
      } catch (e6) {
        throw new CredentialsProviderError(e6.message || `Not found in ENV: ${getSelectorName(envVarSelector.toString())}`, { logger: options?.logger });
      }
    }, "fromEnv");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/node-config-provider/fromSharedConfigFiles.js
var fromSharedConfigFiles;
var init_fromSharedConfigFiles = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/node-config-provider/fromSharedConfigFiles.js"() {
    init_CredentialsProviderError();
    init_getProfileName();
    init_loadSharedConfigFiles();
    init_getSelectorName();
    fromSharedConfigFiles = /* @__PURE__ */ __name((configSelector, { preferredFile = "config", ...init } = {}) => async () => {
      const profile = getProfileName(init);
      const { configFile, credentialsFile } = await loadSharedConfigFiles(init);
      const profileFromCredentials = credentialsFile[profile] || {};
      const profileFromConfig = configFile[profile] || {};
      const mergedProfile = preferredFile === "config" ? { ...profileFromCredentials, ...profileFromConfig } : { ...profileFromConfig, ...profileFromCredentials };
      try {
        const cfgFile = preferredFile === "config" ? configFile : credentialsFile;
        const configValue = configSelector(mergedProfile, cfgFile);
        if (configValue === void 0) {
          throw new Error();
        }
        return configValue;
      } catch (e6) {
        throw new CredentialsProviderError(e6.message || `Not found in config files w/ profile [${profile}]: ${getSelectorName(configSelector.toString())}`, { logger: init.logger });
      }
    }, "fromSharedConfigFiles");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/node-config-provider/fromStatic.js
var isFunction, fromStatic;
var init_fromStatic = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/node-config-provider/fromStatic.js"() {
    init_fromValue();
    isFunction = /* @__PURE__ */ __name((func) => typeof func === "function", "isFunction");
    fromStatic = /* @__PURE__ */ __name((defaultValue) => isFunction(defaultValue) ? async () => await defaultValue() : fromValue(defaultValue), "fromStatic");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/node-config-provider/configLoader.js
var loadConfig;
var init_configLoader = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/node-config-provider/configLoader.js"() {
    init_chain();
    init_memoize();
    init_fromEnv();
    init_fromSharedConfigFiles();
    init_fromStatic();
    loadConfig = /* @__PURE__ */ __name(({ environmentVariableSelector, configFileSelector, default: defaultValue }, configuration = {}) => {
      const { signingName, logger: logger2 } = configuration;
      const envOptions = { signingName, logger: logger2 };
      return memoize(chain(fromEnv(environmentVariableSelector, envOptions), fromSharedConfigFiles(configFileSelector, configuration), fromStatic(defaultValue)));
    }, "loadConfig");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/config-resolver/endpointsConfig/NodeUseDualstackEndpointConfigOptions.js
var ENV_USE_DUALSTACK_ENDPOINT, CONFIG_USE_DUALSTACK_ENDPOINT, NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS;
var init_NodeUseDualstackEndpointConfigOptions = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/config-resolver/endpointsConfig/NodeUseDualstackEndpointConfigOptions.js"() {
    init_booleanSelector();
    init_types();
    ENV_USE_DUALSTACK_ENDPOINT = "AWS_USE_DUALSTACK_ENDPOINT";
    CONFIG_USE_DUALSTACK_ENDPOINT = "use_dualstack_endpoint";
    NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env2) => booleanSelector(env2, ENV_USE_DUALSTACK_ENDPOINT, SelectorType.ENV), "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => booleanSelector(profile, CONFIG_USE_DUALSTACK_ENDPOINT, SelectorType.CONFIG), "configFileSelector"),
      default: false
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/config-resolver/endpointsConfig/NodeUseFipsEndpointConfigOptions.js
var ENV_USE_FIPS_ENDPOINT, CONFIG_USE_FIPS_ENDPOINT, NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS;
var init_NodeUseFipsEndpointConfigOptions = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/config-resolver/endpointsConfig/NodeUseFipsEndpointConfigOptions.js"() {
    init_booleanSelector();
    init_types();
    ENV_USE_FIPS_ENDPOINT = "AWS_USE_FIPS_ENDPOINT";
    CONFIG_USE_FIPS_ENDPOINT = "use_fips_endpoint";
    NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env2) => booleanSelector(env2, ENV_USE_FIPS_ENDPOINT, SelectorType.ENV), "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => booleanSelector(profile, CONFIG_USE_FIPS_ENDPOINT, SelectorType.CONFIG), "configFileSelector"),
      default: false
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/defaults-mode/constants.js
var AWS_EXECUTION_ENV, AWS_REGION_ENV, AWS_DEFAULT_REGION_ENV, ENV_IMDS_DISABLED, DEFAULTS_MODE_OPTIONS, IMDS_REGION_PATH, IMDS_TOKEN_PATH, X_AWS_EC2_METADATA_TOKEN, X_AWS_EC2_METADATA_TOKEN_TTL;
var init_constants2 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/defaults-mode/constants.js"() {
    AWS_EXECUTION_ENV = "AWS_EXECUTION_ENV";
    AWS_REGION_ENV = "AWS_REGION";
    AWS_DEFAULT_REGION_ENV = "AWS_DEFAULT_REGION";
    ENV_IMDS_DISABLED = "AWS_EC2_METADATA_DISABLED";
    DEFAULTS_MODE_OPTIONS = ["in-region", "cross-region", "mobile", "standard", "legacy"];
    IMDS_REGION_PATH = "/latest/meta-data/placement/region";
    IMDS_TOKEN_PATH = "/latest/api/token";
    X_AWS_EC2_METADATA_TOKEN = "x-aws-ec2-metadata-token";
    X_AWS_EC2_METADATA_TOKEN_TTL = "x-aws-ec2-metadata-token-ttl-seconds";
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/config-resolver/regionConfig/getInstanceMetadataRegion.js
var TIMEOUT_MS, NEG_CACHE_TTL_MS, negativeCacheUntil, getInstanceMetadataRegion, cacheNegativeAndReturnUndefined, resolveImdsEndpoint, imdsRequest;
var init_getInstanceMetadataRegion = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/config-resolver/regionConfig/getInstanceMetadataRegion.js"() {
    init_constants2();
    TIMEOUT_MS = 1e3;
    NEG_CACHE_TTL_MS = 6e4;
    negativeCacheUntil = 0;
    getInstanceMetadataRegion = /* @__PURE__ */ __name(async () => {
      if (process.env[ENV_IMDS_DISABLED]) {
        return void 0;
      }
      if (Date.now() < negativeCacheUntil) {
        return void 0;
      }
      try {
        const endpoint = resolveImdsEndpoint();
        const token = (await imdsRequest({
          ...endpoint,
          path: IMDS_TOKEN_PATH,
          method: "PUT",
          headers: {
            [X_AWS_EC2_METADATA_TOKEN_TTL]: "21600"
          }
        })).toString();
        const region = (await imdsRequest({
          ...endpoint,
          path: IMDS_REGION_PATH,
          method: "GET",
          headers: {
            [X_AWS_EC2_METADATA_TOKEN]: token
          }
        })).toString().trim();
        return region || cacheNegativeAndReturnUndefined();
      } catch {
        return cacheNegativeAndReturnUndefined();
      }
    }, "getInstanceMetadataRegion");
    cacheNegativeAndReturnUndefined = /* @__PURE__ */ __name(() => {
      negativeCacheUntil = Date.now() + NEG_CACHE_TTL_MS;
      return void 0;
    }, "cacheNegativeAndReturnUndefined");
    resolveImdsEndpoint = /* @__PURE__ */ __name(() => {
      const envEndpoint = process.env.AWS_EC2_METADATA_SERVICE_ENDPOINT;
      if (envEndpoint) {
        const url = new URL(envEndpoint);
        return {
          hostname: url.hostname.replace(/^\[(.+)]$/, "$1"),
          port: url.port ? Number(url.port) : void 0
        };
      }
      if (process.env.AWS_EC2_METADATA_SERVICE_ENDPOINT_MODE === "IPv6") {
        return { hostname: "fd00:ec2::254" };
      }
      return { hostname: "169.254.169.254" };
    }, "resolveImdsEndpoint");
    imdsRequest = /* @__PURE__ */ __name(async (options) => {
      const { request } = await import("node:http");
      return new Promise((resolve, reject) => {
        const req = request({
          hostname: options.hostname,
          port: options.port,
          path: options.path,
          method: options.method,
          headers: options.headers,
          timeout: TIMEOUT_MS,
          signal: AbortSignal.timeout(TIMEOUT_MS)
        });
        req.on("error", (err2) => {
          reject(err2);
          req.destroy();
        });
        req.on("timeout", () => {
          reject(new Error("TimeoutError from instance metadata service"));
          req.destroy();
        });
        req.on("response", (res) => {
          const { statusCode = 400 } = res;
          if (statusCode < 200 || statusCode >= 300) {
            reject(Object.assign(new Error("Error response received from instance metadata service"), { statusCode }));
            req.destroy();
            return;
          }
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => {
            resolve(Buffer.concat(chunks));
            req.destroy();
          });
        });
        req.end();
      });
    }, "imdsRequest");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/config-resolver/regionConfig/config.js
var REGION_ENV_NAME, REGION_INI_NAME, NODE_REGION_CONFIG_OPTIONS, NODE_REGION_CONFIG_FILE_OPTIONS;
var init_config = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/config-resolver/regionConfig/config.js"() {
    init_getInstanceMetadataRegion();
    REGION_ENV_NAME = "AWS_REGION";
    REGION_INI_NAME = "region";
    NODE_REGION_CONFIG_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env2) => env2[REGION_ENV_NAME], "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => profile[REGION_INI_NAME], "configFileSelector"),
      default: /* @__PURE__ */ __name(async () => {
        const region = await getInstanceMetadataRegion();
        if (region) {
          return region;
        }
        throw new Error("Region is missing");
      }, "default")
    };
    NODE_REGION_CONFIG_FILE_OPTIONS = {
      preferredFile: "credentials"
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/config-resolver/regionConfig/checkRegion.js
var validRegions, checkRegion;
var init_checkRegion = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/config-resolver/regionConfig/checkRegion.js"() {
    init_transport();
    validRegions = /* @__PURE__ */ new Set();
    checkRegion = /* @__PURE__ */ __name((region, check = isValidHostLabel) => {
      if (!validRegions.has(region) && !check(region)) {
        if (region === "*") {
          console.warn(`@smithy/config-resolver WARN - Please use the caller region instead of "*". See "sigv4a" in https://github.com/aws/aws-sdk-js-v3/blob/main/supplemental-docs/CLIENTS.md.`);
        } else {
          throw new Error(`Region not accepted: region="${region}" is not a valid hostname component.`);
        }
      } else {
        validRegions.add(region);
      }
    }, "checkRegion");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/config-resolver/regionConfig/isFipsRegion.js
var isFipsRegion;
var init_isFipsRegion = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/config-resolver/regionConfig/isFipsRegion.js"() {
    isFipsRegion = /* @__PURE__ */ __name((region) => typeof region === "string" && (region.startsWith("fips-") || region.endsWith("-fips")), "isFipsRegion");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/config-resolver/regionConfig/getRealRegion.js
var getRealRegion;
var init_getRealRegion = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/config-resolver/regionConfig/getRealRegion.js"() {
    init_isFipsRegion();
    getRealRegion = /* @__PURE__ */ __name((region) => isFipsRegion(region) ? ["fips-aws-global", "aws-fips"].includes(region) ? "us-east-1" : region.replace(/fips-(dkr-|prod-)?|-fips/, "") : region, "getRealRegion");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/config-resolver/regionConfig/resolveRegionConfig.js
var resolveRegionConfig;
var init_resolveRegionConfig = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/config-resolver/regionConfig/resolveRegionConfig.js"() {
    init_checkRegion();
    init_getRealRegion();
    init_isFipsRegion();
    resolveRegionConfig = /* @__PURE__ */ __name((input) => {
      const { region, useFipsEndpoint } = input;
      if (!region) {
        throw new Error("Region is missing");
      }
      return Object.assign(input, {
        region: /* @__PURE__ */ __name(async () => {
          const providedRegion = typeof region === "function" ? await region() : region;
          const realRegion = getRealRegion(providedRegion);
          checkRegion(realRegion);
          return realRegion;
        }, "region"),
        useFipsEndpoint: /* @__PURE__ */ __name(async () => {
          const providedRegion = typeof region === "string" ? region : await region();
          if (isFipsRegion(providedRegion)) {
            return true;
          }
          return typeof useFipsEndpoint !== "function" ? Promise.resolve(!!useFipsEndpoint) : useFipsEndpoint();
        }, "useFipsEndpoint")
      });
    }, "resolveRegionConfig");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/defaults-mode/defaultsModeConfig.js
var AWS_DEFAULTS_MODE_ENV, AWS_DEFAULTS_MODE_CONFIG, NODE_DEFAULTS_MODE_CONFIG_OPTIONS;
var init_defaultsModeConfig = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/defaults-mode/defaultsModeConfig.js"() {
    AWS_DEFAULTS_MODE_ENV = "AWS_DEFAULTS_MODE";
    AWS_DEFAULTS_MODE_CONFIG = "defaults_mode";
    NODE_DEFAULTS_MODE_CONFIG_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env2) => {
        return env2[AWS_DEFAULTS_MODE_ENV];
      }, "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => {
        return profile[AWS_DEFAULTS_MODE_CONFIG];
      }, "configFileSelector"),
      default: "legacy"
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/defaults-mode/resolveDefaultsModeConfig.js
var resolveDefaultsModeConfig, resolveNodeDefaultsModeAuto, inferPhysicalRegion;
var init_resolveDefaultsModeConfig = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/defaults-mode/resolveDefaultsModeConfig.js"() {
    init_config();
    init_getInstanceMetadataRegion();
    init_configLoader();
    init_memoize();
    init_constants2();
    init_defaultsModeConfig();
    resolveDefaultsModeConfig = /* @__PURE__ */ __name(({ region = loadConfig(NODE_REGION_CONFIG_OPTIONS), defaultsMode = loadConfig(NODE_DEFAULTS_MODE_CONFIG_OPTIONS) } = {}) => memoize(async () => {
      const mode = typeof defaultsMode === "function" ? await defaultsMode() : defaultsMode;
      switch (mode?.toLowerCase()) {
        case "auto":
          return resolveNodeDefaultsModeAuto(region);
        case "in-region":
        case "cross-region":
        case "mobile":
        case "standard":
        case "legacy":
          return Promise.resolve(mode?.toLocaleLowerCase());
        case void 0:
          return Promise.resolve("legacy");
        default:
          throw new Error(`Invalid parameter for "defaultsMode", expect ${DEFAULTS_MODE_OPTIONS.join(", ")}, got ${mode}`);
      }
    }), "resolveDefaultsModeConfig");
    resolveNodeDefaultsModeAuto = /* @__PURE__ */ __name(async (clientRegion) => {
      if (clientRegion) {
        const resolvedRegion = typeof clientRegion === "function" ? await clientRegion() : clientRegion;
        const inferredRegion = await inferPhysicalRegion();
        if (!inferredRegion) {
          return "standard";
        }
        if (resolvedRegion === inferredRegion) {
          return "in-region";
        } else {
          return "cross-region";
        }
      }
      return "standard";
    }, "resolveNodeDefaultsModeAuto");
    inferPhysicalRegion = /* @__PURE__ */ __name(async () => {
      if (process.env[AWS_EXECUTION_ENV] && (process.env[AWS_REGION_ENV] || process.env[AWS_DEFAULT_REGION_ENV])) {
        return process.env[AWS_REGION_ENV] ?? process.env[AWS_DEFAULT_REGION_ENV];
      }
      return getInstanceMetadataRegion();
    }, "inferPhysicalRegion");
  }
});

// node_modules/@smithy/core/dist-es/submodules/config/index.js
var init_config2 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/config/index.js"() {
    init_ProviderError();
    init_CredentialsProviderError();
    init_TokenProviderError();
    init_chain();
    init_booleanSelector();
    init_types();
    init_getProfileName();
    init_getSSOTokenFilepath();
    init_getSSOTokenFromFile();
    init_constants();
    init_loadSsoSessionData();
    init_parseKnownFiles();
    init_externalDataInterceptor();
    init_configLoader();
    init_NodeUseDualstackEndpointConfigOptions();
    init_NodeUseFipsEndpointConfigOptions();
    init_config();
    init_resolveRegionConfig();
    init_resolveDefaultsModeConfig();
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/middleware-endpoint/adaptors/getEndpointUrlConfig.js
var ENV_ENDPOINT_URL, CONFIG_ENDPOINT_URL, getEndpointUrlConfig;
var init_getEndpointUrlConfig = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/middleware-endpoint/adaptors/getEndpointUrlConfig.js"() {
    init_config2();
    ENV_ENDPOINT_URL = "AWS_ENDPOINT_URL";
    CONFIG_ENDPOINT_URL = "endpoint_url";
    getEndpointUrlConfig = /* @__PURE__ */ __name((serviceId) => ({
      environmentVariableSelector: /* @__PURE__ */ __name((env2) => {
        const serviceSuffixParts = serviceId.split(" ").map((w2) => w2.toUpperCase());
        const serviceEndpointUrl = env2[[ENV_ENDPOINT_URL, ...serviceSuffixParts].join("_")];
        if (serviceEndpointUrl)
          return serviceEndpointUrl;
        const endpointUrl = env2[ENV_ENDPOINT_URL];
        if (endpointUrl)
          return endpointUrl;
        return void 0;
      }, "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile, config) => {
        if (profile.services) {
          const servicesSectionKey = ["services", profile.services].join(CONFIG_PREFIX_SEPARATOR);
          if (!config || !config[servicesSectionKey]) {
            throw new Error(`The services section "${profile.services}" specified in the profile is not present in the shared configuration file.`);
          }
          const servicesSection = config[servicesSectionKey];
          const servicePrefixParts = serviceId.split(" ").map((w2) => w2.toLowerCase());
          const endpointUrl2 = servicesSection[[servicePrefixParts.join("_"), CONFIG_ENDPOINT_URL].join(CONFIG_PREFIX_SEPARATOR)];
          if (endpointUrl2)
            return endpointUrl2;
        }
        const endpointUrl = profile[CONFIG_ENDPOINT_URL];
        if (endpointUrl)
          return endpointUrl;
        return void 0;
      }, "configFileSelector"),
      default: void 0
    }), "getEndpointUrlConfig");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/middleware-endpoint/adaptors/getIgnoreConfiguredEndpointUrls.js
var ENV_IGNORE_CONFIGURED_ENDPOINT_URLS, CONFIG_IGNORE_CONFIGURED_ENDPOINT_URLS, ignoreConfiguredEndpointUrlsConfigSelectors;
var init_getIgnoreConfiguredEndpointUrls = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/middleware-endpoint/adaptors/getIgnoreConfiguredEndpointUrls.js"() {
    init_config2();
    ENV_IGNORE_CONFIGURED_ENDPOINT_URLS = "AWS_IGNORE_CONFIGURED_ENDPOINT_URLS";
    CONFIG_IGNORE_CONFIGURED_ENDPOINT_URLS = "ignore_configured_endpoint_urls";
    ignoreConfiguredEndpointUrlsConfigSelectors = {
      environmentVariableSelector: /* @__PURE__ */ __name((env2) => booleanSelector(env2, ENV_IGNORE_CONFIGURED_ENDPOINT_URLS, SelectorType.ENV), "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => booleanSelector(profile, CONFIG_IGNORE_CONFIGURED_ENDPOINT_URLS, SelectorType.CONFIG), "configFileSelector"),
      default: false
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/middleware-endpoint/adaptors/getEndpointFromConfig.js
var getEndpointFromConfig;
var init_getEndpointFromConfig = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/middleware-endpoint/adaptors/getEndpointFromConfig.js"() {
    init_config2();
    init_getEndpointUrlConfig();
    init_getIgnoreConfiguredEndpointUrls();
    getEndpointFromConfig = /* @__PURE__ */ __name(async (serviceId) => {
      const ignore = await loadConfig(ignoreConfiguredEndpointUrlsConfigSelectors)();
      if (ignore) {
        return void 0;
      }
      return loadConfig(getEndpointUrlConfig(serviceId ?? ""))();
    }, "getEndpointFromConfig");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/middleware-endpoint/service-customizations/s3.js
var resolveParamsForS3, DOMAIN_PATTERN, IP_ADDRESS_PATTERN, DOTS_PATTERN, isDnsCompatibleBucketName, isArnBucketName;
var init_s3 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/middleware-endpoint/service-customizations/s3.js"() {
    resolveParamsForS3 = /* @__PURE__ */ __name(async (endpointParams) => {
      const bucket = endpointParams?.Bucket || "";
      if (typeof endpointParams.Bucket === "string") {
        endpointParams.Bucket = bucket.replace(/#/g, encodeURIComponent("#")).replace(/\?/g, encodeURIComponent("?"));
      }
      if (isArnBucketName(bucket)) {
        if (endpointParams.ForcePathStyle === true) {
          throw new Error("Path-style addressing cannot be used with ARN buckets");
        }
      } else if (!isDnsCompatibleBucketName(bucket) || bucket.indexOf(".") !== -1 && !String(endpointParams.Endpoint).startsWith("http:") || bucket.toLowerCase() !== bucket || bucket.length < 3) {
        endpointParams.ForcePathStyle = true;
      }
      if (endpointParams.DisableMultiRegionAccessPoints) {
        endpointParams.disableMultiRegionAccessPoints = true;
        endpointParams.DisableMRAP = true;
      }
      return endpointParams;
    }, "resolveParamsForS3");
    DOMAIN_PATTERN = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
    IP_ADDRESS_PATTERN = /(\d+\.){3}\d+/;
    DOTS_PATTERN = /\.\./;
    isDnsCompatibleBucketName = /* @__PURE__ */ __name((bucketName) => DOMAIN_PATTERN.test(bucketName) && !IP_ADDRESS_PATTERN.test(bucketName) && !DOTS_PATTERN.test(bucketName), "isDnsCompatibleBucketName");
    isArnBucketName = /* @__PURE__ */ __name((bucketName) => {
      const [arn, partition2, service, , , bucket] = bucketName.split(":");
      const isArn = arn === "arn" && bucketName.split(":").length >= 6;
      const isValidArn = Boolean(isArn && partition2 && service && bucket);
      if (isArn && !isValidArn) {
        throw new Error(`Invalid ARN: ${bucketName} was an invalid ARN.`);
      }
      return isValidArn;
    }, "isArnBucketName");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/middleware-endpoint/service-customizations/index.js
var init_service_customizations = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/middleware-endpoint/service-customizations/index.js"() {
    init_s3();
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/middleware-endpoint/adaptors/createConfigValueProvider.js
var createConfigValueProvider;
var init_createConfigValueProvider = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/middleware-endpoint/adaptors/createConfigValueProvider.js"() {
    createConfigValueProvider = /* @__PURE__ */ __name((configKey, canonicalEndpointParamKey, config, isClientContextParam = false) => {
      const configProvider = /* @__PURE__ */ __name(async () => {
        let configValue;
        if (isClientContextParam) {
          const clientContextParams = config.clientContextParams;
          const nestedValue = clientContextParams?.[configKey];
          configValue = nestedValue ?? config[configKey] ?? config[canonicalEndpointParamKey];
        } else {
          configValue = config[configKey] ?? config[canonicalEndpointParamKey];
        }
        if (typeof configValue === "function") {
          return configValue();
        }
        return configValue;
      }, "configProvider");
      if (configKey === "credentialScope" || canonicalEndpointParamKey === "CredentialScope") {
        return async () => {
          const credentials = typeof config.credentials === "function" ? await config.credentials() : config.credentials;
          const configValue = credentials?.credentialScope ?? credentials?.CredentialScope;
          return configValue;
        };
      }
      if (configKey === "accountId" || canonicalEndpointParamKey === "AccountId") {
        return async () => {
          const credentials = typeof config.credentials === "function" ? await config.credentials() : config.credentials;
          const configValue = credentials?.accountId ?? credentials?.AccountId;
          return configValue;
        };
      }
      if (configKey === "endpoint" || canonicalEndpointParamKey === "endpoint") {
        return async () => {
          if (config.isCustomEndpoint === false) {
            return void 0;
          }
          const endpoint = await configProvider();
          if (endpoint && typeof endpoint === "object") {
            if ("url" in endpoint) {
              return endpoint.url.href;
            }
            if ("hostname" in endpoint) {
              const { protocol, hostname, port, path } = endpoint;
              return `${protocol}//${hostname}${port ? ":" + port : ""}${path}`;
            }
          }
          return endpoint;
        };
      }
      return configProvider;
    }, "createConfigValueProvider");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/middleware-endpoint/adaptors/toEndpointV1.js
var init_toEndpointV12 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/middleware-endpoint/adaptors/toEndpointV1.js"() {
    init_transport();
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/middleware-endpoint/adaptors/getEndpointFromInstructions.js
function bindGetEndpointFromInstructions(getEndpointFromConfig2) {
  return async (commandInput, instructionsSupplier, clientConfig, context) => {
    if (!clientConfig.isCustomEndpoint && !clientConfig.ignoreConfiguredEndpointUrls) {
      let endpointFromConfig;
      if (clientConfig.serviceConfiguredEndpoint) {
        endpointFromConfig = await clientConfig.serviceConfiguredEndpoint();
      } else {
        endpointFromConfig = await getEndpointFromConfig2(clientConfig.serviceId);
      }
      if (endpointFromConfig) {
        clientConfig.endpoint = () => Promise.resolve(toEndpointV1(endpointFromConfig));
        clientConfig.isCustomEndpoint = true;
        context?.logger?.debug?.(`@smithy/core/endpoints - resolved endpoint from config: ${endpointFromConfig}`);
      }
    }
    const endpointParams = await resolveParams(commandInput, instructionsSupplier, clientConfig);
    if (typeof clientConfig.endpointProvider !== "function") {
      throw new Error("config.endpointProvider is not set.");
    }
    const endpoint = clientConfig.endpointProvider(endpointParams, context);
    if (clientConfig.isCustomEndpoint && clientConfig.endpoint) {
      const customEndpoint = await clientConfig.endpoint();
      if (customEndpoint?.headers) {
        endpoint.headers ??= {};
        for (const [name, value] of Object.entries(customEndpoint.headers)) {
          endpoint.headers[name] = Array.isArray(value) ? value : [value];
        }
      }
    }
    return endpoint;
  };
}
var resolveParams;
var init_getEndpointFromInstructions = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/middleware-endpoint/adaptors/getEndpointFromInstructions.js"() {
    init_service_customizations();
    init_createConfigValueProvider();
    init_toEndpointV12();
    __name(bindGetEndpointFromInstructions, "bindGetEndpointFromInstructions");
    resolveParams = /* @__PURE__ */ __name(async (commandInput, instructionsSupplier, clientConfig) => {
      const endpointParams = {};
      const instructions = instructionsSupplier?.getEndpointParameterInstructions?.() || {};
      for (const [name, instruction] of Object.entries(instructions)) {
        switch (instruction.type) {
          case "staticContextParams":
            endpointParams[name] = instruction.value;
            break;
          case "contextParams":
            endpointParams[name] = commandInput[instruction.name];
            break;
          case "clientContextParams":
          case "builtInParams":
            endpointParams[name] = await createConfigValueProvider(instruction.name, name, clientConfig, instruction.type !== "builtInParams")();
            break;
          case "operationContextParams":
            endpointParams[name] = instruction.get(commandInput);
            break;
          default:
            throw new Error("Unrecognized endpoint parameter instruction: " + JSON.stringify(instruction));
        }
      }
      if (Object.keys(instructions).length === 0) {
        Object.assign(endpointParams, clientConfig);
      }
      if (String(clientConfig.serviceId).toLowerCase() === "s3") {
        await resolveParamsForS3(endpointParams);
      }
      return endpointParams;
    }, "resolveParams");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/middleware-endpoint/endpointMiddleware.js
function setFeature(context, feature, value) {
  if (!context.__smithy_context) {
    context.__smithy_context = { features: {} };
  } else if (!context.__smithy_context.features) {
    context.__smithy_context.features = {};
  }
  context.__smithy_context.features[feature] = value;
}
function bindEndpointMiddleware(getEndpointFromConfig2) {
  const getEndpointFromInstructions2 = bindGetEndpointFromInstructions(getEndpointFromConfig2);
  return ({ config, instructions }) => {
    return (next, context) => async (args) => {
      if (config.isCustomEndpoint) {
        setFeature(context, "ENDPOINT_OVERRIDE", "N");
      }
      const endpoint = await getEndpointFromInstructions2(args.input, {
        getEndpointParameterInstructions() {
          return instructions;
        }
      }, { ...config }, context);
      context.endpointV2 = endpoint;
      context.authSchemes = endpoint.properties?.authSchemes;
      const authScheme = context.authSchemes?.[0];
      if (authScheme) {
        context["signing_region"] = authScheme.signingRegion;
        context["signing_service"] = authScheme.signingName;
        const smithyContext = getSmithyContext(context);
        const httpAuthOption = smithyContext?.selectedHttpAuthScheme?.httpAuthOption;
        if (httpAuthOption) {
          httpAuthOption.signingProperties = Object.assign(httpAuthOption.signingProperties || {}, {
            signing_region: authScheme.signingRegion,
            signingRegion: authScheme.signingRegion,
            signing_service: authScheme.signingName,
            signingName: authScheme.signingName,
            signingRegionSet: authScheme.signingRegionSet
          }, authScheme.properties);
        }
      }
      return next({
        ...args
      });
    };
  };
}
var init_endpointMiddleware = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/middleware-endpoint/endpointMiddleware.js"() {
    init_transport();
    init_getEndpointFromInstructions();
    __name(setFeature, "setFeature");
    __name(bindEndpointMiddleware, "bindEndpointMiddleware");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/middleware-endpoint/getEndpointPlugin.js
function bindGetEndpointPlugin(getEndpointFromConfig2) {
  const endpointMiddleware2 = bindEndpointMiddleware(getEndpointFromConfig2);
  return (config, instructions) => ({
    applyToStack: /* @__PURE__ */ __name((clientStack) => {
      clientStack.addRelativeTo(endpointMiddleware2({
        config,
        instructions
      }), endpointMiddlewareOptions);
    }, "applyToStack")
  });
}
var serializerMiddlewareOption2, endpointMiddlewareOptions;
var init_getEndpointPlugin = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/middleware-endpoint/getEndpointPlugin.js"() {
    init_endpointMiddleware();
    serializerMiddlewareOption2 = {
      name: "serializerMiddleware",
      step: "serialize",
      tags: ["SERIALIZER"],
      override: true
    };
    endpointMiddlewareOptions = {
      step: "serialize",
      tags: ["ENDPOINT_PARAMETERS", "ENDPOINT_V2", "ENDPOINT"],
      name: "endpointV2Middleware",
      override: true,
      relation: "before",
      toMiddleware: serializerMiddlewareOption2.name
    };
    __name(bindGetEndpointPlugin, "bindGetEndpointPlugin");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/middleware-endpoint/resolveEndpointConfig.js
function bindResolveEndpointConfig(getEndpointFromConfig2) {
  return (input) => {
    const tls = input.tls ?? true;
    const { endpoint, useDualstackEndpoint, useFipsEndpoint } = input;
    const customEndpointProvider = endpoint != null ? async () => toEndpointV1(await normalizeProvider(endpoint)()) : void 0;
    const isCustomEndpoint = !!endpoint;
    const resolvedConfig = Object.assign(input, {
      endpoint: customEndpointProvider,
      tls,
      isCustomEndpoint,
      useDualstackEndpoint: normalizeProvider(useDualstackEndpoint ?? false),
      useFipsEndpoint: normalizeProvider(useFipsEndpoint ?? false),
      ignoreConfiguredEndpointUrls: !!input.ignoreConfiguredEndpointUrls
    });
    let configuredEndpointPromise = void 0;
    resolvedConfig.serviceConfiguredEndpoint = async () => {
      if (input.serviceId && !configuredEndpointPromise) {
        configuredEndpointPromise = getEndpointFromConfig2(input.serviceId);
      }
      return configuredEndpointPromise;
    };
    return resolvedConfig;
  };
}
var init_resolveEndpointConfig = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/middleware-endpoint/resolveEndpointConfig.js"() {
    init_transport();
    init_toEndpointV12();
    __name(bindResolveEndpointConfig, "bindResolveEndpointConfig");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/bdd/BinaryDecisionDiagram.js
var BinaryDecisionDiagram;
var init_BinaryDecisionDiagram = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/bdd/BinaryDecisionDiagram.js"() {
    BinaryDecisionDiagram = class _BinaryDecisionDiagram {
      static {
        __name(this, "BinaryDecisionDiagram");
      }
      nodes;
      root;
      conditions;
      results;
      constructor(bdd6, root6, conditions, results) {
        this.nodes = bdd6;
        this.root = root6;
        this.conditions = conditions;
        this.results = results;
      }
      static from(bdd6, root6, conditions, results) {
        return new _BinaryDecisionDiagram(bdd6, root6, conditions, results);
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/cache/EndpointCache.js
var EndpointCache;
var init_EndpointCache = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/cache/EndpointCache.js"() {
    EndpointCache = class {
      static {
        __name(this, "EndpointCache");
      }
      capacity;
      data = /* @__PURE__ */ new Map();
      parameters = [];
      constructor({ size, params }) {
        this.capacity = size ?? 50;
        if (params) {
          this.parameters = params;
        }
      }
      get(endpointParams, resolver) {
        const key = this.hash(endpointParams);
        if (key === false) {
          return resolver();
        }
        if (!this.data.has(key)) {
          if (this.data.size > this.capacity + 10) {
            const keys = this.data.keys();
            let i6 = 0;
            while (true) {
              const { value, done } = keys.next();
              this.data.delete(value);
              if (done || ++i6 > 10) {
                break;
              }
            }
          }
          this.data.set(key, resolver());
        }
        return this.data.get(key);
      }
      size() {
        return this.data.size;
      }
      hash(endpointParams) {
        let buffer = "";
        const { parameters } = this;
        if (parameters.length === 0) {
          return false;
        }
        for (const param of parameters) {
          const raw = endpointParams[param];
          const val = raw == null ? "\0" : String(raw);
          if (val.includes("|;")) {
            return false;
          }
          buffer += val + "|;";
        }
        return buffer;
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/types/EndpointError.js
var EndpointError;
var init_EndpointError = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/types/EndpointError.js"() {
    EndpointError = class extends Error {
      static {
        __name(this, "EndpointError");
      }
      constructor(message) {
        super(message);
        this.name = "EndpointError";
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/types/index.js
var init_types2 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/types/index.js"() {
    init_EndpointError();
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/debug/debugId.js
var debugId;
var init_debugId = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/debug/debugId.js"() {
    debugId = "endpoints";
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/debug/toDebugString.js
function toDebugString(input) {
  if (typeof input !== "object" || input == null) {
    return input;
  }
  if ("ref" in input) {
    return `$${toDebugString(input.ref)}`;
  }
  if ("fn" in input) {
    return `${input.fn}(${(input.argv || []).map(toDebugString).join(", ")})`;
  }
  return JSON.stringify(input, null, 2);
}
var init_toDebugString = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/debug/toDebugString.js"() {
    __name(toDebugString, "toDebugString");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/debug/index.js
var init_debug = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/debug/index.js"() {
    init_debugId();
    init_toDebugString();
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/utils/customEndpointFunctions.js
var customEndpointFunctions;
var init_customEndpointFunctions = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/utils/customEndpointFunctions.js"() {
    customEndpointFunctions = {};
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/booleanEquals.js
var booleanEquals;
var init_booleanEquals = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/booleanEquals.js"() {
    booleanEquals = /* @__PURE__ */ __name((value1, value2) => value1 === value2, "booleanEquals");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/coalesce.js
function coalesce(...args) {
  for (const arg of args) {
    if (arg != null) {
      return arg;
    }
  }
  return void 0;
}
var init_coalesce = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/coalesce.js"() {
    __name(coalesce, "coalesce");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/getAttrPathList.js
var getAttrPathList;
var init_getAttrPathList = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/getAttrPathList.js"() {
    init_types2();
    getAttrPathList = /* @__PURE__ */ __name((path) => {
      const parts = path.split(".");
      const pathList = [];
      for (const part of parts) {
        const squareBracketIndex = part.indexOf("[");
        if (squareBracketIndex !== -1) {
          if (part.indexOf("]") !== part.length - 1) {
            throw new EndpointError(`Path: '${path}' does not end with ']'`);
          }
          const arrayIndex = part.slice(squareBracketIndex + 1, -1);
          if (Number.isNaN(parseInt(arrayIndex))) {
            throw new EndpointError(`Invalid array index: '${arrayIndex}' in path: '${path}'`);
          }
          if (squareBracketIndex !== 0) {
            pathList.push(part.slice(0, squareBracketIndex));
          }
          pathList.push(arrayIndex);
        } else {
          pathList.push(part);
        }
      }
      return pathList;
    }, "getAttrPathList");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/getAttr.js
var getAttr;
var init_getAttr = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/getAttr.js"() {
    init_types2();
    init_getAttrPathList();
    getAttr = /* @__PURE__ */ __name((value, path) => getAttrPathList(path).reduce((acc, index) => {
      if (typeof acc !== "object") {
        throw new EndpointError(`Index '${index}' in '${path}' not found in '${JSON.stringify(value)}'`);
      } else if (Array.isArray(acc)) {
        const i6 = parseInt(index);
        return acc[i6 < 0 ? acc.length + i6 : i6];
      }
      return acc[index];
    }, value), "getAttr");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/isSet.js
var isSet;
var init_isSet = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/isSet.js"() {
    isSet = /* @__PURE__ */ __name((value) => value != null, "isSet");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/ite.js
function ite(condition, trueValue, falseValue) {
  return condition ? trueValue : falseValue;
}
var init_ite = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/ite.js"() {
    __name(ite, "ite");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/not.js
var not;
var init_not = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/not.js"() {
    not = /* @__PURE__ */ __name((value) => !value, "not");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/isIpAddress.js
var IP_V4_REGEX, isIpAddress;
var init_isIpAddress = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/isIpAddress.js"() {
    IP_V4_REGEX = new RegExp(`^(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}$`);
    isIpAddress = /* @__PURE__ */ __name((value) => IP_V4_REGEX.test(value) || value.startsWith("[") && value.endsWith("]"), "isIpAddress");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/parseURL.js
var DEFAULT_PORTS, parseURL;
var init_parseURL = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/parseURL.js"() {
    init_dist_es();
    init_isIpAddress();
    DEFAULT_PORTS = {
      [EndpointURLScheme.HTTP]: 80,
      [EndpointURLScheme.HTTPS]: 443
    };
    parseURL = /* @__PURE__ */ __name((value) => {
      const whatwgURL = (() => {
        try {
          if (value instanceof URL) {
            return value;
          }
          if (typeof value === "object" && "hostname" in value) {
            const { hostname: hostname2, port, protocol: protocol2 = "", path = "", query = {} } = value;
            const url = new URL(`${protocol2}//${hostname2}${port ? `:${port}` : ""}${path}`);
            url.search = Object.entries(query).map(([k6, v2]) => `${k6}=${v2}`).join("&");
            return url;
          }
          return new URL(value);
        } catch (ignored) {
          return null;
        }
      })();
      if (!whatwgURL) {
        console.error(`Unable to parse ${JSON.stringify(value)} as a whatwg URL.`);
        return null;
      }
      const urlString = whatwgURL.href;
      const { host, hostname, pathname, protocol, search } = whatwgURL;
      if (search) {
        return null;
      }
      const scheme = protocol.slice(0, -1);
      if (!Object.values(EndpointURLScheme).includes(scheme)) {
        return null;
      }
      const isIp = isIpAddress(hostname);
      const inputContainsDefaultPort = urlString.includes(`${host}:${DEFAULT_PORTS[scheme]}`) || typeof value === "string" && value.includes(`${host}:${DEFAULT_PORTS[scheme]}`);
      const authority = `${host}${inputContainsDefaultPort ? `:${DEFAULT_PORTS[scheme]}` : ``}`;
      return {
        scheme,
        authority,
        path: pathname,
        normalizedPath: pathname.endsWith("/") ? pathname : `${pathname}/`,
        isIp
      };
    }, "parseURL");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/split.js
function split(value, delimiter, limit) {
  if (limit === 1) {
    return [value];
  }
  if (value === "") {
    return [""];
  }
  const parts = value.split(delimiter);
  if (limit === 0) {
    return parts;
  }
  return parts.slice(0, limit - 1).concat(parts.slice(1).join(delimiter));
}
var init_split = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/split.js"() {
    __name(split, "split");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/stringEquals.js
var stringEquals;
var init_stringEquals = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/stringEquals.js"() {
    stringEquals = /* @__PURE__ */ __name((value1, value2) => value1 === value2, "stringEquals");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/substring.js
var substring;
var init_substring = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/substring.js"() {
    substring = /* @__PURE__ */ __name((input, start, stop, reverse) => {
      if (input == null || start >= stop || input.length < stop || /[^\u0000-\u007f]/.test(input)) {
        return null;
      }
      if (!reverse) {
        return input.substring(start, stop);
      }
      return input.substring(input.length - stop, input.length - start);
    }, "substring");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/uriEncode.js
var uriEncode;
var init_uriEncode = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/uriEncode.js"() {
    uriEncode = /* @__PURE__ */ __name((value) => encodeURIComponent(value).replace(/[!*'()]/g, (c6) => `%${c6.charCodeAt(0).toString(16).toUpperCase()}`), "uriEncode");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/index.js
var init_lib = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/lib/index.js"() {
    init_booleanEquals();
    init_coalesce();
    init_getAttr();
    init_isSet();
    init_transport();
    init_ite();
    init_not();
    init_parseURL();
    init_split();
    init_stringEquals();
    init_substring();
    init_uriEncode();
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/utils/endpointFunctions.js
var endpointFunctions;
var init_endpointFunctions = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/utils/endpointFunctions.js"() {
    init_lib();
    endpointFunctions = {
      booleanEquals,
      coalesce,
      getAttr,
      isSet,
      isValidHostLabel,
      ite,
      not,
      parseURL,
      split,
      stringEquals,
      substring,
      uriEncode
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/utils/evaluateTemplate.js
var evaluateTemplate;
var init_evaluateTemplate = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/utils/evaluateTemplate.js"() {
    init_lib();
    evaluateTemplate = /* @__PURE__ */ __name((template, options) => {
      const evaluatedTemplateArr = [];
      const { referenceRecord, endpointParams } = options;
      let currentIndex = 0;
      while (currentIndex < template.length) {
        const openingBraceIndex = template.indexOf("{", currentIndex);
        if (openingBraceIndex === -1) {
          evaluatedTemplateArr.push(template.slice(currentIndex));
          break;
        }
        evaluatedTemplateArr.push(template.slice(currentIndex, openingBraceIndex));
        const closingBraceIndex = template.indexOf("}", openingBraceIndex);
        if (closingBraceIndex === -1) {
          evaluatedTemplateArr.push(template.slice(openingBraceIndex));
          break;
        }
        if (template[openingBraceIndex + 1] === "{" && template[closingBraceIndex + 1] === "}") {
          evaluatedTemplateArr.push(template.slice(openingBraceIndex + 1, closingBraceIndex));
          currentIndex = closingBraceIndex + 2;
        }
        const parameterName = template.substring(openingBraceIndex + 1, closingBraceIndex);
        if (parameterName.includes("#")) {
          const [refName, attrName] = parameterName.split("#");
          evaluatedTemplateArr.push(getAttr(referenceRecord[refName] ?? endpointParams[refName], attrName));
        } else {
          evaluatedTemplateArr.push(referenceRecord[parameterName] ?? endpointParams[parameterName]);
        }
        currentIndex = closingBraceIndex + 1;
      }
      return evaluatedTemplateArr.join("");
    }, "evaluateTemplate");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/utils/getReferenceValue.js
var getReferenceValue;
var init_getReferenceValue = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/utils/getReferenceValue.js"() {
    getReferenceValue = /* @__PURE__ */ __name(({ ref }, options) => {
      return options.referenceRecord[ref] ?? options.endpointParams[ref];
    }, "getReferenceValue");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/utils/evaluateExpression.js
var evaluateExpression, callFunction, group;
var init_evaluateExpression = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/utils/evaluateExpression.js"() {
    init_types2();
    init_customEndpointFunctions();
    init_endpointFunctions();
    init_evaluateTemplate();
    init_getReferenceValue();
    evaluateExpression = /* @__PURE__ */ __name((obj, keyName, options) => {
      if (typeof obj === "string") {
        return evaluateTemplate(obj, options);
      } else if (obj["fn"]) {
        return group.callFunction(obj, options);
      } else if (obj["ref"]) {
        return getReferenceValue(obj, options);
      }
      throw new EndpointError(`'${keyName}': ${String(obj)} is not a string, function or reference.`);
    }, "evaluateExpression");
    callFunction = /* @__PURE__ */ __name(({ fn, argv }, options) => {
      const evaluatedArgs = Array(argv.length);
      for (let i6 = 0; i6 < evaluatedArgs.length; ++i6) {
        const arg = argv[i6];
        if (typeof arg === "boolean" || typeof arg === "number") {
          evaluatedArgs[i6] = arg;
        } else {
          evaluatedArgs[i6] = group.evaluateExpression(arg, "arg", options);
        }
      }
      const namespaceSeparatorIndex = fn.indexOf(".");
      if (namespaceSeparatorIndex !== -1) {
        const namespaceFunctions = customEndpointFunctions[fn.slice(0, namespaceSeparatorIndex)];
        const customFunction = namespaceFunctions?.[fn.slice(namespaceSeparatorIndex + 1)];
        if (typeof customFunction === "function") {
          return customFunction(...evaluatedArgs);
        }
      }
      const callable = endpointFunctions[fn];
      if (typeof callable === "function") {
        return callable(...evaluatedArgs);
      }
      throw new Error(`function ${fn} not loaded in endpointFunctions.`);
    }, "callFunction");
    group = {
      evaluateExpression,
      callFunction
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/utils/callFunction.js
var init_callFunction = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/utils/callFunction.js"() {
    init_evaluateExpression();
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/utils/evaluateCondition.js
var evaluateCondition;
var init_evaluateCondition = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/utils/evaluateCondition.js"() {
    init_debug();
    init_types2();
    init_callFunction();
    evaluateCondition = /* @__PURE__ */ __name((condition, options) => {
      const { assign } = condition;
      if (assign && assign in options.referenceRecord) {
        throw new EndpointError(`'${assign}' is already defined in Reference Record.`);
      }
      const value = callFunction(condition, options);
      options.logger?.debug?.(`${debugId} evaluateCondition: ${toDebugString(condition)} = ${toDebugString(value)}`);
      const result = value === "" ? true : !!value;
      if (assign != null) {
        return { result, toAssign: { name: assign, value } };
      }
      return { result };
    }, "evaluateCondition");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/utils/getEndpointHeaders.js
var getEndpointHeaders;
var init_getEndpointHeaders = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/utils/getEndpointHeaders.js"() {
    init_types2();
    init_evaluateExpression();
    getEndpointHeaders = /* @__PURE__ */ __name((headers, options) => Object.entries(headers ?? {}).reduce((acc, [headerKey, headerVal]) => {
      acc[headerKey] = headerVal.map((headerValEntry) => {
        const processedExpr = evaluateExpression(headerValEntry, "Header value entry", options);
        if (typeof processedExpr !== "string") {
          throw new EndpointError(`Header '${headerKey}' value '${processedExpr}' is not a string`);
        }
        return processedExpr;
      });
      return acc;
    }, {}), "getEndpointHeaders");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/utils/getEndpointProperties.js
var getEndpointProperties, getEndpointProperty, group2;
var init_getEndpointProperties = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/utils/getEndpointProperties.js"() {
    init_types2();
    init_evaluateTemplate();
    getEndpointProperties = /* @__PURE__ */ __name((properties, options) => Object.entries(properties).reduce((acc, [propertyKey, propertyVal]) => {
      acc[propertyKey] = group2.getEndpointProperty(propertyVal, options);
      return acc;
    }, {}), "getEndpointProperties");
    getEndpointProperty = /* @__PURE__ */ __name((property, options) => {
      if (Array.isArray(property)) {
        return property.map((propertyEntry) => getEndpointProperty(propertyEntry, options));
      }
      switch (typeof property) {
        case "string":
          return evaluateTemplate(property, options);
        case "object":
          if (property === null) {
            throw new EndpointError(`Unexpected endpoint property: ${property}`);
          }
          return group2.getEndpointProperties(property, options);
        case "boolean":
          return property;
        default:
          throw new EndpointError(`Unexpected endpoint property type: ${typeof property}`);
      }
    }, "getEndpointProperty");
    group2 = {
      getEndpointProperty,
      getEndpointProperties
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/utils/getEndpointUrl.js
var getEndpointUrl;
var init_getEndpointUrl = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/utils/getEndpointUrl.js"() {
    init_types2();
    init_evaluateExpression();
    getEndpointUrl = /* @__PURE__ */ __name((endpointUrl, options) => {
      const expression = evaluateExpression(endpointUrl, "Endpoint URL", options);
      if (typeof expression === "string") {
        try {
          return new URL(expression);
        } catch (error) {
          console.error(`Failed to construct URL with ${expression}`, error);
          throw error;
        }
      }
      throw new EndpointError(`Endpoint URL must be a string, got ${typeof expression}`);
    }, "getEndpointUrl");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/decideEndpoint.js
var RESULT, decideEndpoint;
var init_decideEndpoint = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/util-endpoints/decideEndpoint.js"() {
    init_types2();
    init_evaluateCondition();
    init_evaluateExpression();
    init_getEndpointHeaders();
    init_getEndpointProperties();
    init_getEndpointUrl();
    RESULT = 1e8;
    decideEndpoint = /* @__PURE__ */ __name((bdd6, options) => {
      const { nodes: nodes6, root: root6, results, conditions } = bdd6;
      let ref = root6;
      const referenceRecord = {};
      const closure = {
        referenceRecord,
        endpointParams: options.endpointParams,
        logger: options.logger
      };
      while (ref !== 1 && ref !== -1 && ref < RESULT) {
        const node_i = 3 * (Math.abs(ref) - 1);
        const [condition_i, highRef, lowRef] = [nodes6[node_i], nodes6[node_i + 1], nodes6[node_i + 2]];
        const [fn, argv, assign] = conditions[condition_i];
        const evaluation = evaluateCondition({ fn, assign, argv }, closure);
        if (evaluation.toAssign) {
          const { name, value } = evaluation.toAssign;
          referenceRecord[name] = value;
        }
        ref = ref >= 0 === evaluation.result ? highRef : lowRef;
      }
      if (ref >= RESULT) {
        const result = results[ref - RESULT];
        if (result[0] === -1) {
          const [, errorExpression] = result;
          throw new EndpointError(evaluateExpression(errorExpression, "Error", closure));
        }
        const [url, properties, headers] = result;
        return {
          url: getEndpointUrl(url, closure),
          properties: getEndpointProperties(properties, closure),
          headers: getEndpointHeaders(headers ?? {}, closure)
        };
      }
      throw new EndpointError(`No matching endpoint.`);
    }, "decideEndpoint");
  }
});

// node_modules/@smithy/core/dist-es/submodules/endpoints/index.js
var getEndpointFromInstructions, resolveEndpointConfig, endpointMiddleware, getEndpointPlugin;
var init_endpoints = __esm({
  "node_modules/@smithy/core/dist-es/submodules/endpoints/index.js"() {
    init_getEndpointFromConfig();
    init_getEndpointFromInstructions();
    init_endpointMiddleware();
    init_getEndpointPlugin();
    init_resolveEndpointConfig();
    init_BinaryDecisionDiagram();
    init_EndpointCache();
    init_decideEndpoint();
    init_isIpAddress();
    init_transport();
    init_customEndpointFunctions();
    init_getEndpointFromInstructions();
    getEndpointFromInstructions = bindGetEndpointFromInstructions(getEndpointFromConfig);
    resolveEndpointConfig = bindResolveEndpointConfig(getEndpointFromConfig);
    endpointMiddleware = bindEndpointMiddleware(getEndpointFromConfig);
    getEndpointPlugin = bindGetEndpointPlugin(getEndpointFromConfig);
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/util-stream/stream-type-check.js
var isReadableStream, isBlob;
var init_stream_type_check = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/util-stream/stream-type-check.js"() {
    isReadableStream = /* @__PURE__ */ __name((stream) => typeof ReadableStream === "function" && (stream?.constructor?.name === ReadableStream.name || stream instanceof ReadableStream), "isReadableStream");
    isBlob = /* @__PURE__ */ __name((blob) => {
      return typeof Blob === "function" && (blob?.constructor?.name === Blob.name || blob instanceof Blob);
    }, "isBlob");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/util-utf8/fromUtf8.browser.js
var fromUtf82;
var init_fromUtf8_browser = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/util-utf8/fromUtf8.browser.js"() {
    fromUtf82 = /* @__PURE__ */ __name((input) => new TextEncoder().encode(input), "fromUtf8");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/util-base64/constants-for-browser.js
var chars, alphabetByEncoding, alphabetByValue, bitsPerLetter, bitsPerByte, maxLetterValue;
var init_constants_for_browser = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/util-base64/constants-for-browser.js"() {
    chars = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/`;
    alphabetByEncoding = Object.entries(chars).reduce((acc, [i6, c6]) => {
      acc[c6] = Number(i6);
      return acc;
    }, {});
    alphabetByValue = chars.split("");
    bitsPerLetter = 6;
    bitsPerByte = 8;
    maxLetterValue = 63;
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/util-base64/toBase64.browser.js
function toBase642(_input) {
  let input;
  if (typeof _input === "string") {
    input = fromUtf82(_input);
  } else {
    input = _input;
  }
  const isArrayLike = typeof input === "object" && typeof input.length === "number";
  const isUint8Array = typeof input === "object" && typeof input.byteOffset === "number" && typeof input.byteLength === "number";
  if (!isArrayLike && !isUint8Array) {
    throw new Error("@smithy/util-base64: toBase64 encoder function only accepts string | Uint8Array.");
  }
  let str = "";
  for (let i6 = 0; i6 < input.length; i6 += 3) {
    let bits = 0;
    let bitLength = 0;
    for (let j6 = i6, limit = Math.min(i6 + 3, input.length); j6 < limit; j6++) {
      bits |= input[j6] << (limit - j6 - 1) * bitsPerByte;
      bitLength += bitsPerByte;
    }
    const bitClusterCount = Math.ceil(bitLength / bitsPerLetter);
    bits <<= bitClusterCount * bitsPerLetter - bitLength;
    for (let k6 = 1; k6 <= bitClusterCount; k6++) {
      const offset = (bitClusterCount - k6) * bitsPerLetter;
      str += alphabetByValue[(bits & maxLetterValue << offset) >> offset];
    }
    str += "==".slice(0, 4 - bitClusterCount);
  }
  return str;
}
var init_toBase64_browser = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/util-base64/toBase64.browser.js"() {
    init_fromUtf8_browser();
    init_constants_for_browser();
    __name(toBase642, "toBase64");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/util-utf8/toUtf8.browser.js
var toUtf82;
var init_toUtf8_browser = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/util-utf8/toUtf8.browser.js"() {
    toUtf82 = /* @__PURE__ */ __name((input) => {
      if (typeof input === "string") {
        return input;
      }
      if (typeof input !== "object" || typeof input.byteOffset !== "number" || typeof input.byteLength !== "number") {
        throw new Error("@smithy/util-utf8: toUtf8 encoder function only accepts string | Uint8Array.");
      }
      return new TextDecoder("utf-8").decode(input);
    }, "toUtf8");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/util-stream/stream-collector.browser.js
async function collectBlob(blob) {
  return blob.arrayBuffer().then((ab) => new Uint8Array(ab));
}
async function collectReadableStream(stream) {
  const chunks = [];
  const reader = stream.getReader();
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (value) {
      chunks.push(value);
      length += value.length;
    }
    if (done) {
      break;
    }
  }
  return concatBytes(chunks, length);
}
var streamCollector;
var init_stream_collector_browser = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/util-stream/stream-collector.browser.js"() {
    init_concatBytes();
    init_stream_type_check();
    streamCollector = /* @__PURE__ */ __name(async (stream) => {
      if (isBlob(stream)) {
        return collectBlob(stream);
      }
      return collectReadableStream(stream);
    }, "streamCollector");
    __name(collectBlob, "collectBlob");
    __name(collectReadableStream, "collectReadableStream");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/util-stream/sdk-stream-mixin.browser.js
var ERR_MSG_STREAM_HAS_BEEN_TRANSFORMED, sdkStreamMixin, isBlobInstance;
var init_sdk_stream_mixin_browser = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/util-stream/sdk-stream-mixin.browser.js"() {
    init_toBase64_browser();
    init_hex_encoding();
    init_toUtf8_browser();
    init_stream_collector_browser();
    init_stream_type_check();
    ERR_MSG_STREAM_HAS_BEEN_TRANSFORMED = "The stream has already been transformed.";
    sdkStreamMixin = /* @__PURE__ */ __name((stream) => {
      if (!isBlobInstance(stream) && !isReadableStream(stream)) {
        const name = stream?.__proto__?.constructor?.name || stream;
        throw new Error(`Unexpected stream implementation, expect Blob or ReadableStream, got ${name}`);
      }
      let transformed = false;
      const transformToByteArray = /* @__PURE__ */ __name(async () => {
        if (transformed) {
          throw new Error(ERR_MSG_STREAM_HAS_BEEN_TRANSFORMED);
        }
        transformed = true;
        return await streamCollector(stream);
      }, "transformToByteArray");
      const blobToWebStream = /* @__PURE__ */ __name((blob) => {
        if (typeof blob.stream !== "function") {
          throw new Error("Cannot transform payload Blob to web stream. Please make sure the Blob.stream() is polyfilled.\nIf you are using React Native, this API is not yet supported, see: https://react-native.canny.io/feature-requests/p/fetch-streaming-body");
        }
        return blob.stream();
      }, "blobToWebStream");
      return Object.assign(stream, {
        transformToByteArray,
        transformToString: /* @__PURE__ */ __name(async (encoding) => {
          const buf = await transformToByteArray();
          if (encoding === "base64") {
            return toBase642(buf);
          } else if (encoding === "hex") {
            return toHex(buf);
          } else if (encoding === void 0 || encoding === "utf8" || encoding === "utf-8") {
            return toUtf82(buf);
          } else if (typeof TextDecoder === "function") {
            return new TextDecoder(encoding).decode(buf);
          } else {
            throw new Error("TextDecoder is not available, please make sure polyfill is provided.");
          }
        }, "transformToString"),
        transformToWebStream: /* @__PURE__ */ __name(() => {
          if (transformed) {
            throw new Error(ERR_MSG_STREAM_HAS_BEEN_TRANSFORMED);
          }
          transformed = true;
          if (isBlobInstance(stream)) {
            return blobToWebStream(stream);
          } else if (isReadableStream(stream)) {
            return stream;
          } else {
            throw new Error(`Cannot transform payload to web stream, got ${stream}`);
          }
        }, "transformToWebStream")
      });
    }, "sdkStreamMixin");
    isBlobInstance = /* @__PURE__ */ __name((stream) => typeof Blob === "function" && stream instanceof Blob, "isBlobInstance");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/util-stream/stream-collector.js
import { Writable } from "node:stream";
var streamCollector2, Collector;
var init_stream_collector = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/util-stream/stream-collector.js"() {
    init_concatBytes();
    init_stream_collector_browser();
    init_stream_type_check();
    streamCollector2 = /* @__PURE__ */ __name((stream) => {
      if (isBlob(stream)) {
        return collectBlob(stream);
      }
      if (isReadableStream(stream)) {
        return collectReadableStream(stream);
      }
      return new Promise((resolve, reject) => {
        const collector = new Collector();
        const nodeStream = stream;
        nodeStream.pipe(collector);
        nodeStream.on("error", (err2) => {
          collector.end();
          reject(err2);
        });
        collector.on("error", reject);
        collector.on("finish", function() {
          const bytes = concatBytes(this.bufferedBytes);
          resolve(bytes);
        });
      });
    }, "streamCollector");
    Collector = class extends Writable {
      static {
        __name(this, "Collector");
      }
      bufferedBytes = [];
      _write(chunk, encoding, callback) {
        this.bufferedBytes.push(chunk);
        callback();
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/util-stream/sdk-stream-mixin.js
import { Readable as Readable2 } from "node:stream";
var ERR_MSG_STREAM_HAS_BEEN_TRANSFORMED2, sdkStreamMixin2;
var init_sdk_stream_mixin = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/util-stream/sdk-stream-mixin.js"() {
    init_buffer_from();
    init_sdk_stream_mixin_browser();
    init_stream_collector();
    ERR_MSG_STREAM_HAS_BEEN_TRANSFORMED2 = "The stream has already been transformed.";
    sdkStreamMixin2 = /* @__PURE__ */ __name((stream) => {
      if (!(stream instanceof Readable2)) {
        try {
          return sdkStreamMixin(stream);
        } catch (ignored) {
          const name = stream?.__proto__?.constructor?.name || stream;
          throw new Error(`Unexpected stream implementation, expect Stream.Readable instance, got ${name}`);
        }
      }
      let transformed = false;
      const transformToByteArray = /* @__PURE__ */ __name(async () => {
        if (transformed) {
          throw new Error(ERR_MSG_STREAM_HAS_BEEN_TRANSFORMED2);
        }
        transformed = true;
        return await streamCollector2(stream);
      }, "transformToByteArray");
      return Object.assign(stream, {
        transformToByteArray,
        transformToString: /* @__PURE__ */ __name(async (encoding) => {
          const buf = await transformToByteArray();
          if (encoding === void 0 || Buffer.isEncoding(encoding)) {
            return fromArrayBuffer(buf.buffer, buf.byteOffset, buf.byteLength).toString(encoding);
          } else {
            const decoder = new TextDecoder(encoding);
            return decoder.decode(buf);
          }
        }, "transformToString"),
        transformToWebStream: /* @__PURE__ */ __name(() => {
          if (transformed) {
            throw new Error(ERR_MSG_STREAM_HAS_BEEN_TRANSFORMED2);
          }
          if (stream.readableFlowing !== null) {
            throw new Error("The stream has been consumed by other callbacks.");
          }
          if (typeof Readable2.toWeb !== "function") {
            throw new Error("Readable.toWeb() is not supported. Please ensure a polyfill is available.");
          }
          transformed = true;
          return Readable2.toWeb(stream);
        }, "transformToWebStream")
      });
    }, "sdkStreamMixin");
  }
});

// node_modules/@smithy/core/dist-es/submodules/serde/index.js
import { getRandomValues } from "node:crypto";
var Uint8ArrayBlobAdapter, _getRandomValues, v4, generateIdempotencyToken;
var init_serde = __esm({
  "node_modules/@smithy/core/dist-es/submodules/serde/index.js"() {
    init_fromBase64();
    init_toBase64();
    init_Uint8ArrayBlobAdapter();
    init_fromUtf8();
    init_toUtf8();
    init_v4();
    init_date_utils();
    init_lazy_json();
    init_quote_header();
    init_schema_date_utils();
    init_split_every();
    init_split_header();
    init_NumericValue();
    init_hex_encoding();
    init_calculateBodyLength();
    init_toUint8Array();
    init_is_array_buffer();
    init_sdk_stream_mixin();
    init_stream_collector();
    init_transport();
    Uint8ArrayBlobAdapter = class extends bindUint8ArrayBlobAdapter(toUtf8, fromUtf8, toBase64, fromBase64) {
      static {
        __name(this, "Uint8ArrayBlobAdapter");
      }
    };
    _getRandomValues = getRandomValues;
    v4 = bindV4(_getRandomValues);
    generateIdempotencyToken = v4;
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/collect-stream-body.js
var collectBody;
var init_collect_stream_body = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/collect-stream-body.js"() {
    init_serde();
    collectBody = /* @__PURE__ */ __name(async (streamBody = new Uint8Array(), context) => {
      if (streamBody instanceof Uint8Array) {
        return Uint8ArrayBlobAdapter.mutate(streamBody);
      }
      if (!streamBody) {
        return Uint8ArrayBlobAdapter.mutate(new Uint8Array());
      }
      const fromContext = context.streamCollector(streamBody);
      return Uint8ArrayBlobAdapter.mutate(await fromContext);
    }, "collectBody");
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/extended-encode-uri-component.js
function extendedEncodeURIComponent(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function(c6) {
    return "%" + c6.charCodeAt(0).toString(16).toUpperCase();
  });
}
var init_extended_encode_uri_component = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/extended-encode-uri-component.js"() {
    __name(extendedEncodeURIComponent, "extendedEncodeURIComponent");
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/SerdeContext.js
var SerdeContext;
var init_SerdeContext = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/SerdeContext.js"() {
    SerdeContext = class {
      static {
        __name(this, "SerdeContext");
      }
      serdeContext;
      setSerdeContext(serdeContext) {
        this.serdeContext = serdeContext;
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/checksum/crc32/Crc32Js.js
var CRC32_TABLE, ONES, Crc32Js;
var init_Crc32Js = __esm({
  "node_modules/@smithy/core/dist-es/submodules/checksum/crc32/Crc32Js.js"() {
    CRC32_TABLE = new Uint32Array(256);
    for (let i6 = 0; i6 < 256; ++i6) {
      let c6 = i6;
      for (let j6 = 0; j6 < 8; ++j6) {
        c6 = c6 & 1 ? 3988292384 ^ c6 >>> 1 : c6 >>> 1;
      }
      CRC32_TABLE[i6] = c6 >>> 0;
    }
    ONES = 4294967295;
    Crc32Js = class {
      static {
        __name(this, "Crc32Js");
      }
      digestLength = 4;
      checksum = ONES;
      update(data) {
        for (let i6 = 0; i6 < data.length; ++i6) {
          this.checksum = this.checksum >>> 8 ^ CRC32_TABLE[(this.checksum ^ data[i6]) & 255];
        }
      }
      digestSync() {
        return (this.checksum ^ ONES) >>> 0;
      }
      async digest() {
        const value = this.digestSync();
        const out = new Uint8Array(4);
        new DataView(out.buffer).setUint32(0, value, false);
        return out;
      }
      reset() {
        this.checksum = ONES;
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/checksum/crc32/Crc32Node.js
import * as zlib from "node:zlib";
function buildNativeClass(nativeCrc32) {
  return class Crc32Node {
    static {
      __name(this, "Crc32Node");
    }
    digestLength = 4;
    value = 0;
    update(data) {
      this.value = nativeCrc32(data, this.value);
    }
    digestSync() {
      return this.value >>> 0;
    }
    async digest() {
      const out = new Uint8Array(4);
      new DataView(out.buffer).setUint32(0, this.digestSync(), false);
      return out;
    }
    reset() {
      this.value = 0;
    }
  };
}
var zlibCrc32, Crc32Node;
var init_Crc32Node = __esm({
  "node_modules/@smithy/core/dist-es/submodules/checksum/crc32/Crc32Node.js"() {
    init_Crc32Js();
    zlibCrc32 = typeof zlib.crc32 === "function" ? zlib.crc32 : void 0;
    Crc32Node = zlibCrc32 ? buildNativeClass(zlibCrc32) : Crc32Js;
    __name(buildNativeClass, "buildNativeClass");
  }
});

// node_modules/@smithy/core/dist-es/submodules/checksum/sha256/Sha256Js.js
var BLOCK, DIGEST_LENGTH, MAX_HASHABLE_LENGTH, Sha256Js, INIT, K;
var init_Sha256Js = __esm({
  "node_modules/@smithy/core/dist-es/submodules/checksum/sha256/Sha256Js.js"() {
    init_serde();
    BLOCK = 64;
    DIGEST_LENGTH = 32;
    MAX_HASHABLE_LENGTH = 2 ** 53 - 1;
    Sha256Js = class _Sha256Js {
      static {
        __name(this, "Sha256Js");
      }
      digestLength = DIGEST_LENGTH;
      state = Int32Array.from(INIT);
      w;
      buffer = new Uint8Array(64);
      bufferLength = 0;
      bytesHashed = 0;
      finished = false;
      inner;
      outer;
      constructor(secret) {
        if (secret) {
          const key = _Sha256Js.normalizeKey(secret);
          this.inner = new _Sha256Js();
          this.outer = new _Sha256Js();
          const { inner, outer } = this;
          const pad = new Uint8Array(BLOCK * 2);
          for (let i6 = 0; i6 < BLOCK; ++i6) {
            pad[i6] = 54 ^ key[i6];
            pad[i6 + BLOCK] = 92 ^ key[i6];
          }
          inner.update(pad.subarray(0, BLOCK));
          outer.update(pad.subarray(BLOCK));
        }
      }
      update(data) {
        if (this.finished) {
          throw new Error("Attempted to update an already finished HMAC.");
        }
        if (this.inner) {
          this.inner.update(data);
          return;
        }
        const chunk = toUint8Array(data);
        let position = 0;
        let { byteLength } = chunk;
        this.bytesHashed += byteLength;
        if (this.bytesHashed * 8 > MAX_HASHABLE_LENGTH) {
          throw new Error("Cannot hash more than 2^53 - 1 bits");
        }
        while (byteLength > 0) {
          this.buffer[this.bufferLength++] = chunk[position++];
          byteLength--;
          if (this.bufferLength === BLOCK) {
            this.hashBuffer();
            this.bufferLength = 0;
          }
        }
      }
      async digest() {
        const { inner, outer } = this;
        if (inner && outer) {
          if (this.finished) {
            throw new Error("Attempted to digest an already finished HMAC.");
          }
          this.finished = true;
          const innerDigest = inner.digestSync();
          outer.update(innerDigest);
          return outer.digestSync();
        }
        return this.digestSync();
      }
      reset() {
        this.state = Int32Array.from(INIT);
        this.buffer = new Uint8Array(64);
        this.bufferLength = 0;
        this.bytesHashed = 0;
      }
      digestSync() {
        const state2 = this.state.slice();
        const buffer = this.buffer.slice();
        let bufferLength = this.bufferLength;
        const bitsHashed = this.bytesHashed * 8;
        const bufferView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        bufferView.setUint8(bufferLength++, 128);
        if ((bufferLength - 1) % BLOCK >= BLOCK - 8) {
          for (let i6 = bufferLength; i6 < BLOCK; ++i6) {
            bufferView.setUint8(i6, 0);
          }
          this.hashBufferWith(state2, buffer);
          bufferLength = 0;
        }
        for (let i6 = bufferLength; i6 < BLOCK - 8; ++i6) {
          bufferView.setUint8(i6, 0);
        }
        bufferView.setUint32(BLOCK - 8, Math.floor(bitsHashed / 4294967296), false);
        bufferView.setUint32(BLOCK - 4, bitsHashed, false);
        this.hashBufferWith(state2, buffer);
        const out = new Uint8Array(DIGEST_LENGTH);
        for (let i6 = 0; i6 < 8; ++i6) {
          out[i6 * 4] = state2[i6] >>> 24 & 255;
          out[i6 * 4 + 1] = state2[i6] >>> 16 & 255;
          out[i6 * 4 + 2] = state2[i6] >>> 8 & 255;
          out[i6 * 4 + 3] = state2[i6] >>> 0 & 255;
        }
        return out;
      }
      static normalizeKey(secret) {
        const key = toUint8Array(secret);
        if (key.byteLength > BLOCK) {
          const h6 = new _Sha256Js();
          h6.update(key);
          const out = h6.digestSync();
          const padded = new Uint8Array(BLOCK);
          padded.set(out);
          return padded;
        }
        if (key.byteLength < BLOCK) {
          const padded = new Uint8Array(BLOCK);
          padded.set(key);
          return padded;
        }
        return key;
      }
      hashBuffer() {
        this.hashBufferWith(this.state, this.buffer);
      }
      hashBufferWith(state2, buffer) {
        const w2 = this.w ??= new Int32Array(64);
        let s0 = state2[0], s1 = state2[1], s22 = state2[2], s3 = state2[3], s4 = state2[4], s5 = state2[5], s6 = state2[6], s7 = state2[7];
        for (let i6 = 0; i6 < BLOCK; ++i6) {
          if (i6 < 16) {
            w2[i6] = (buffer[i6 * 4] & 255) << 24 | (buffer[i6 * 4 + 1] & 255) << 16 | (buffer[i6 * 4 + 2] & 255) << 8 | buffer[i6 * 4 + 3] & 255;
          } else {
            let u2 = w2[i6 - 2];
            const t12 = (u2 >>> 17 | u2 << 15) ^ (u2 >>> 19 | u2 << 13) ^ u2 >>> 10;
            u2 = w2[i6 - 15];
            const t22 = (u2 >>> 7 | u2 << 25) ^ (u2 >>> 18 | u2 << 14) ^ u2 >>> 3;
            w2[i6] = (t12 + w2[i6 - 7] | 0) + (t22 + w2[i6 - 16] | 0);
          }
          const t1 = (((s4 >>> 6 | s4 << 26) ^ (s4 >>> 11 | s4 << 21) ^ (s4 >>> 25 | s4 << 7)) + (s4 & s5 ^ ~s4 & s6) | 0) + (s7 + (K[i6] + w2[i6] | 0) | 0) | 0;
          const t2 = ((s0 >>> 2 | s0 << 30) ^ (s0 >>> 13 | s0 << 19) ^ (s0 >>> 22 | s0 << 10)) + (s0 & s1 ^ s0 & s22 ^ s1 & s22) | 0;
          s7 = s6;
          s6 = s5;
          s5 = s4;
          s4 = s3 + t1 | 0;
          s3 = s22;
          s22 = s1;
          s1 = s0;
          s0 = t1 + t2 | 0;
        }
        state2[0] += s0;
        state2[1] += s1;
        state2[2] += s22;
        state2[3] += s3;
        state2[4] += s4;
        state2[5] += s5;
        state2[6] += s6;
        state2[7] += s7;
      }
    };
    INIT = new Int32Array([
      1779033703,
      3144134277,
      1013904242,
      2773480762,
      1359893119,
      2600822924,
      528734635,
      1541459225
    ]);
    K = new Int32Array([
      1116352408,
      1899447441,
      3049323471,
      3921009573,
      961987163,
      1508970993,
      2453635748,
      2870763221,
      3624381080,
      310598401,
      607225278,
      1426881987,
      1925078388,
      2162078206,
      2614888103,
      3248222580,
      3835390401,
      4022224774,
      264347078,
      604807628,
      770255983,
      1249150122,
      1555081692,
      1996064986,
      2554220882,
      2821834349,
      2952996808,
      3210313671,
      3336571891,
      3584528711,
      113926993,
      338241895,
      666307205,
      773529912,
      1294757372,
      1396182291,
      1695183700,
      1986661051,
      2177026350,
      2456956037,
      2730485921,
      2820302411,
      3259730800,
      3345764771,
      3516065817,
      3600352804,
      4094571909,
      275423344,
      430227734,
      506948616,
      659060556,
      883997877,
      958139571,
      1322822218,
      1537002063,
      1747873779,
      1955562222,
      2024104815,
      2227730452,
      2361852424,
      2428436474,
      2756734187,
      3204031479,
      3329325298
    ]);
  }
});

// node_modules/@smithy/core/dist-es/submodules/checksum/sha256/Sha256Node.js
import { createHash as createHash2, createHmac } from "node:crypto";
function buildNativeClass2() {
  return class Sha256Node {
    static {
      __name(this, "Sha256Node");
    }
    digestLength = 32;
    secret;
    hash;
    isHmac;
    finished = false;
    constructor(secret) {
      this.secret = secret;
      this.isHmac = !!secret;
      this.hash = this.createHash();
    }
    update(data) {
      if (this.finished) {
        throw new Error("Attempted to update an already finished hash.");
      }
      this.hash.update(data);
    }
    async digest() {
      let buf;
      if (this.isHmac) {
        this.finished = true;
        buf = this.hash.digest();
      } else {
        buf = this.hash.copy().digest();
      }
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    reset() {
      this.hash = this.createHash();
      this.finished = false;
    }
    createHash() {
      return this.secret ? createHmac("sha256", toBuffer(this.secret)) : createHash2("sha256");
    }
  };
}
function toBuffer(data) {
  if (typeof data === "string") {
    return data;
  }
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  return Buffer.from(data);
}
var hasNativeCrypto, Sha256Node;
var init_Sha256Node = __esm({
  "node_modules/@smithy/core/dist-es/submodules/checksum/sha256/Sha256Node.js"() {
    init_Sha256Js();
    hasNativeCrypto = (() => {
      try {
        createHash2("sha256");
        return true;
      } catch {
        return false;
      }
    })();
    Sha256Node = hasNativeCrypto ? buildNativeClass2() : Sha256Js;
    __name(buildNativeClass2, "buildNativeClass");
    __name(toBuffer, "toBuffer");
  }
});

// node_modules/@smithy/core/dist-es/submodules/checksum/index.js
var init_checksum3 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/checksum/index.js"() {
    init_Crc32Node();
    init_Sha256Node();
  }
});

// node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-codec/Int64.js
function negate(bytes) {
  for (let i6 = 0; i6 < 8; i6++) {
    bytes[i6] ^= 255;
  }
  for (let i6 = 7; i6 > -1; i6--) {
    bytes[i6]++;
    if (bytes[i6] !== 0)
      break;
  }
}
var Int64;
var init_Int64 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-codec/Int64.js"() {
    init_serde();
    Int64 = class _Int64 {
      static {
        __name(this, "Int64");
      }
      bytes;
      constructor(bytes) {
        this.bytes = bytes;
        if (bytes.byteLength !== 8) {
          throw new Error("Int64 buffers must be exactly 8 bytes");
        }
      }
      static fromNumber(number) {
        if (number > 9223372036854776e3 || number < -9223372036854776e3) {
          throw new Error(`${number} is too large (or, if negative, too small) to represent as an Int64`);
        }
        const bytes = new Uint8Array(8);
        for (let i6 = 7, remaining = Math.abs(Math.round(number)); i6 > -1 && remaining > 0; i6--, remaining /= 256) {
          bytes[i6] = remaining;
        }
        if (number < 0) {
          negate(bytes);
        }
        return new _Int64(bytes);
      }
      valueOf() {
        const bytes = this.bytes.slice(0);
        const negative = bytes[0] & 128;
        if (negative) {
          negate(bytes);
        }
        return parseInt(toHex(bytes), 16) * (negative ? -1 : 1);
      }
      toString() {
        return String(this.valueOf());
      }
    };
    __name(negate, "negate");
  }
});

// node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-codec/HeaderMarshaller.js
var HeaderMarshaller, HEADER_VALUE_TYPE, BOOLEAN_TAG, BYTE_TAG, SHORT_TAG, INT_TAG, LONG_TAG, BINARY_TAG, STRING_TAG, TIMESTAMP_TAG, UUID_TAG, UUID_PATTERN, MAX_HEADER_VALUE_BYTES;
var init_HeaderMarshaller = __esm({
  "node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-codec/HeaderMarshaller.js"() {
    init_transport();
    init_serde();
    init_Int64();
    HeaderMarshaller = class {
      static {
        __name(this, "HeaderMarshaller");
      }
      toUtf8;
      fromUtf8;
      constructor(toUtf83, fromUtf83) {
        this.toUtf8 = toUtf83;
        this.fromUtf8 = fromUtf83;
      }
      format(headers) {
        const chunks = [];
        for (const headerName in headers) {
          if (!hasOwn(headers, headerName))
            continue;
          const bytes = this.fromUtf8(headerName);
          if (bytes.byteLength > 255) {
            throw new Error(`@smithy/core/event-streams - header name exceeds 255 bytes: ${bytes.byteLength}`);
          }
          chunks.push(Uint8Array.from([bytes.byteLength]), bytes, this.formatHeaderValue(headers[headerName]));
        }
        const out = new Uint8Array(chunks.reduce((carry, bytes) => carry + bytes.byteLength, 0));
        let position = 0;
        for (const chunk of chunks) {
          out.set(chunk, position);
          position += chunk.byteLength;
        }
        return out;
      }
      formatHeaderValue(header) {
        switch (header.type) {
          case "boolean":
            return Uint8Array.from([header.value ? 0 : 1]);
          case "byte":
            return Uint8Array.from([2, header.value]);
          case "short":
            const shortView = new DataView(new ArrayBuffer(3));
            shortView.setUint8(0, 3);
            shortView.setInt16(1, header.value, false);
            return new Uint8Array(shortView.buffer);
          case "integer":
            const intView = new DataView(new ArrayBuffer(5));
            intView.setUint8(0, 4);
            intView.setInt32(1, header.value, false);
            return new Uint8Array(intView.buffer);
          case "long":
            const longBytes = new Uint8Array(9);
            longBytes[0] = 5;
            longBytes.set(header.value.bytes, 1);
            return longBytes;
          case "binary":
            if (header.value.byteLength > MAX_HEADER_VALUE_BYTES) {
              throw new Error(`@smithy/core/event-streams - header value (binary) exceeds ${MAX_HEADER_VALUE_BYTES} bytes: ${header.value.byteLength}`);
            }
            const binView = new DataView(new ArrayBuffer(3 + header.value.byteLength));
            binView.setUint8(0, 6);
            binView.setUint16(1, header.value.byteLength, false);
            const binBytes = new Uint8Array(binView.buffer);
            binBytes.set(header.value, 3);
            return binBytes;
          case "string":
            const utf8Bytes = this.fromUtf8(header.value);
            if (utf8Bytes.byteLength > MAX_HEADER_VALUE_BYTES) {
              throw new Error(`@smithy/core/event-streams - header value (string) exceeds ${MAX_HEADER_VALUE_BYTES} bytes: ${utf8Bytes.byteLength}`);
            }
            const strView = new DataView(new ArrayBuffer(3 + utf8Bytes.byteLength));
            strView.setUint8(0, 7);
            strView.setUint16(1, utf8Bytes.byteLength, false);
            const strBytes = new Uint8Array(strView.buffer);
            strBytes.set(utf8Bytes, 3);
            return strBytes;
          case "timestamp":
            const tsBytes = new Uint8Array(9);
            tsBytes[0] = 8;
            tsBytes.set(Int64.fromNumber(header.value.valueOf()).bytes, 1);
            return tsBytes;
          case "uuid":
            if (!UUID_PATTERN.test(header.value)) {
              throw new Error(`Invalid UUID received: ${header.value}`);
            }
            const uuidBytes = new Uint8Array(17);
            uuidBytes[0] = 9;
            uuidBytes.set(fromHex(header.value.replace(/-/g, "")), 1);
            return uuidBytes;
        }
      }
      parse(headers) {
        const out = {};
        let position = 0;
        while (position < headers.byteLength) {
          const nameLength = headers.getUint8(position++);
          const name = this.toUtf8(new Uint8Array(headers.buffer, headers.byteOffset + position, nameLength));
          position += nameLength;
          switch (headers.getUint8(position++)) {
            case 0:
              out[name] = {
                type: BOOLEAN_TAG,
                value: true
              };
              break;
            case 1:
              out[name] = {
                type: BOOLEAN_TAG,
                value: false
              };
              break;
            case 2:
              out[name] = {
                type: BYTE_TAG,
                value: headers.getInt8(position++)
              };
              break;
            case 3:
              out[name] = {
                type: SHORT_TAG,
                value: headers.getInt16(position, false)
              };
              position += 2;
              break;
            case 4:
              out[name] = {
                type: INT_TAG,
                value: headers.getInt32(position, false)
              };
              position += 4;
              break;
            case 5:
              out[name] = {
                type: LONG_TAG,
                value: new Int64(new Uint8Array(headers.buffer, headers.byteOffset + position, 8))
              };
              position += 8;
              break;
            case 6:
              const binaryLength = headers.getUint16(position, false);
              position += 2;
              out[name] = {
                type: BINARY_TAG,
                value: new Uint8Array(headers.buffer, headers.byteOffset + position, binaryLength)
              };
              position += binaryLength;
              break;
            case 7:
              const stringLength = headers.getUint16(position, false);
              position += 2;
              out[name] = {
                type: STRING_TAG,
                value: this.toUtf8(new Uint8Array(headers.buffer, headers.byteOffset + position, stringLength))
              };
              position += stringLength;
              break;
            case 8:
              out[name] = {
                type: TIMESTAMP_TAG,
                value: new Date(new Int64(new Uint8Array(headers.buffer, headers.byteOffset + position, 8)).valueOf())
              };
              position += 8;
              break;
            case 9:
              const uuidBytes = new Uint8Array(headers.buffer, headers.byteOffset + position, 16);
              position += 16;
              out[name] = {
                type: UUID_TAG,
                value: `${toHex(uuidBytes.subarray(0, 4))}-${toHex(uuidBytes.subarray(4, 6))}-${toHex(uuidBytes.subarray(6, 8))}-${toHex(uuidBytes.subarray(8, 10))}-${toHex(uuidBytes.subarray(10))}`
              };
              break;
            default:
              throw new Error(`Unrecognized header type tag`);
          }
        }
        return out;
      }
    };
    (function(HEADER_VALUE_TYPE3) {
      HEADER_VALUE_TYPE3[HEADER_VALUE_TYPE3["boolTrue"] = 0] = "boolTrue";
      HEADER_VALUE_TYPE3[HEADER_VALUE_TYPE3["boolFalse"] = 1] = "boolFalse";
      HEADER_VALUE_TYPE3[HEADER_VALUE_TYPE3["byte"] = 2] = "byte";
      HEADER_VALUE_TYPE3[HEADER_VALUE_TYPE3["short"] = 3] = "short";
      HEADER_VALUE_TYPE3[HEADER_VALUE_TYPE3["integer"] = 4] = "integer";
      HEADER_VALUE_TYPE3[HEADER_VALUE_TYPE3["long"] = 5] = "long";
      HEADER_VALUE_TYPE3[HEADER_VALUE_TYPE3["byteArray"] = 6] = "byteArray";
      HEADER_VALUE_TYPE3[HEADER_VALUE_TYPE3["string"] = 7] = "string";
      HEADER_VALUE_TYPE3[HEADER_VALUE_TYPE3["timestamp"] = 8] = "timestamp";
      HEADER_VALUE_TYPE3[HEADER_VALUE_TYPE3["uuid"] = 9] = "uuid";
    })(HEADER_VALUE_TYPE || (HEADER_VALUE_TYPE = {}));
    BOOLEAN_TAG = "boolean";
    BYTE_TAG = "byte";
    SHORT_TAG = "short";
    INT_TAG = "integer";
    LONG_TAG = "long";
    BINARY_TAG = "binary";
    STRING_TAG = "string";
    TIMESTAMP_TAG = "timestamp";
    UUID_TAG = "uuid";
    UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
    MAX_HEADER_VALUE_BYTES = 32767;
  }
});

// node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-codec/splitMessage.js
function splitMessage({ byteLength, byteOffset, buffer }) {
  if (byteLength < MINIMUM_MESSAGE_LENGTH) {
    throw new Error("Provided message too short to accommodate event stream message overhead");
  }
  const view = new DataView(buffer, byteOffset, byteLength);
  const messageLength = view.getUint32(0, false);
  if (byteLength !== messageLength) {
    throw new Error("Reported message length does not match received message length");
  }
  const headerLength = view.getUint32(PRELUDE_MEMBER_LENGTH, false);
  const expectedPreludeChecksum = view.getUint32(PRELUDE_LENGTH, false);
  const expectedMessageChecksum = view.getUint32(byteLength - CHECKSUM_LENGTH, false);
  const checksummer = new Crc32Node();
  checksummer.update(new Uint8Array(buffer, byteOffset, PRELUDE_LENGTH));
  if (expectedPreludeChecksum !== checksummer.digestSync()) {
    throw new Error(`The prelude checksum specified in the message (${expectedPreludeChecksum}) does not match the calculated CRC32 checksum (${checksummer.digestSync()})`);
  }
  checksummer.update(new Uint8Array(buffer, byteOffset + PRELUDE_LENGTH, byteLength - (PRELUDE_LENGTH + CHECKSUM_LENGTH)));
  if (expectedMessageChecksum !== checksummer.digestSync()) {
    throw new Error(`The message checksum (${checksummer.digestSync()}) did not match the expected value of ${expectedMessageChecksum}`);
  }
  return {
    headers: new DataView(buffer, byteOffset + PRELUDE_LENGTH + CHECKSUM_LENGTH, headerLength),
    body: new Uint8Array(buffer, byteOffset + PRELUDE_LENGTH + CHECKSUM_LENGTH + headerLength, messageLength - headerLength - (PRELUDE_LENGTH + CHECKSUM_LENGTH + CHECKSUM_LENGTH))
  };
}
var PRELUDE_MEMBER_LENGTH, PRELUDE_LENGTH, CHECKSUM_LENGTH, MINIMUM_MESSAGE_LENGTH;
var init_splitMessage = __esm({
  "node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-codec/splitMessage.js"() {
    init_checksum3();
    PRELUDE_MEMBER_LENGTH = 4;
    PRELUDE_LENGTH = PRELUDE_MEMBER_LENGTH * 2;
    CHECKSUM_LENGTH = 4;
    MINIMUM_MESSAGE_LENGTH = PRELUDE_LENGTH + CHECKSUM_LENGTH * 2;
    __name(splitMessage, "splitMessage");
  }
});

// node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-codec/EventStreamCodec.js
var EventStreamCodec;
var init_EventStreamCodec = __esm({
  "node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-codec/EventStreamCodec.js"() {
    init_checksum3();
    init_HeaderMarshaller();
    init_splitMessage();
    EventStreamCodec = class {
      static {
        __name(this, "EventStreamCodec");
      }
      headerMarshaller;
      messageBuffer;
      isEndOfStream;
      constructor(toUtf83, fromUtf83) {
        this.headerMarshaller = new HeaderMarshaller(toUtf83, fromUtf83);
        this.messageBuffer = [];
        this.isEndOfStream = false;
      }
      feed(message) {
        this.messageBuffer.push(this.decode(message));
      }
      endOfStream() {
        this.isEndOfStream = true;
      }
      getMessage() {
        const message = this.messageBuffer.pop();
        const isEndOfStream = this.isEndOfStream;
        return {
          getMessage() {
            return message;
          },
          isEndOfStream() {
            return isEndOfStream;
          }
        };
      }
      getAvailableMessages() {
        const messages = this.messageBuffer;
        this.messageBuffer = [];
        const isEndOfStream = this.isEndOfStream;
        return {
          getMessages() {
            return messages;
          },
          isEndOfStream() {
            return isEndOfStream;
          }
        };
      }
      encode({ headers: rawHeaders, body }) {
        const headers = this.headerMarshaller.format(rawHeaders);
        const length = headers.byteLength + body.byteLength + 16;
        const out = new Uint8Array(length);
        const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
        const checksum = new Crc32Node();
        view.setUint32(0, length, false);
        view.setUint32(4, headers.byteLength, false);
        checksum.update(out.subarray(0, 8));
        view.setUint32(8, checksum.digestSync(), false);
        out.set(headers, 12);
        out.set(body, headers.byteLength + 12);
        checksum.update(out.subarray(8, length - 4));
        view.setUint32(length - 4, checksum.digestSync(), false);
        return out;
      }
      decode(message) {
        const { headers, body } = splitMessage(message);
        return { headers: this.headerMarshaller.parse(headers), body };
      }
      formatHeaders(rawHeaders) {
        return this.headerMarshaller.format(rawHeaders);
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-codec/MessageDecoderStream.js
var MessageDecoderStream;
var init_MessageDecoderStream = __esm({
  "node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-codec/MessageDecoderStream.js"() {
    MessageDecoderStream = class {
      static {
        __name(this, "MessageDecoderStream");
      }
      options;
      constructor(options) {
        this.options = options;
      }
      [Symbol.asyncIterator]() {
        return this.asyncIterator();
      }
      async *asyncIterator() {
        for await (const bytes of this.options.inputStream) {
          const decoded = this.options.decoder.decode(bytes);
          yield decoded;
        }
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-codec/MessageEncoderStream.js
var MessageEncoderStream;
var init_MessageEncoderStream = __esm({
  "node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-codec/MessageEncoderStream.js"() {
    MessageEncoderStream = class {
      static {
        __name(this, "MessageEncoderStream");
      }
      options;
      constructor(options) {
        this.options = options;
      }
      [Symbol.asyncIterator]() {
        return this.asyncIterator();
      }
      async *asyncIterator() {
        for await (const msg of this.options.messageStream) {
          const encoded = this.options.encoder.encode(msg);
          yield encoded;
        }
        if (this.options.includeEndFrame) {
          yield new Uint8Array(0);
        }
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-codec/SmithyMessageDecoderStream.js
var SmithyMessageDecoderStream;
var init_SmithyMessageDecoderStream = __esm({
  "node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-codec/SmithyMessageDecoderStream.js"() {
    SmithyMessageDecoderStream = class {
      static {
        __name(this, "SmithyMessageDecoderStream");
      }
      options;
      constructor(options) {
        this.options = options;
      }
      [Symbol.asyncIterator]() {
        return this.asyncIterator();
      }
      async *asyncIterator() {
        for await (const message of this.options.messageStream) {
          const deserialized = await this.options.deserializer(message);
          if (deserialized === void 0)
            continue;
          yield deserialized;
        }
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-codec/SmithyMessageEncoderStream.js
var SmithyMessageEncoderStream;
var init_SmithyMessageEncoderStream = __esm({
  "node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-codec/SmithyMessageEncoderStream.js"() {
    SmithyMessageEncoderStream = class {
      static {
        __name(this, "SmithyMessageEncoderStream");
      }
      options;
      constructor(options) {
        this.options = options;
      }
      [Symbol.asyncIterator]() {
        return this.asyncIterator();
      }
      async *asyncIterator() {
        for await (const chunk of this.options.inputStream) {
          const payloadBuf = this.options.serializer(chunk);
          yield payloadBuf;
        }
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-serde-universal/getChunkedStream.js
function getChunkedStream(source) {
  let currentMessageTotalLength = 0;
  let currentMessagePendingLength = 0;
  let currentMessage = null;
  let messageLengthBuffer = null;
  const allocateMessage = /* @__PURE__ */ __name((size) => {
    if (typeof size !== "number") {
      throw new Error("Attempted to allocate an event message where size was not a number: " + size);
    }
    currentMessageTotalLength = size;
    currentMessagePendingLength = 4;
    currentMessage = new Uint8Array(size);
    const currentMessageView = new DataView(currentMessage.buffer);
    currentMessageView.setUint32(0, size, false);
  }, "allocateMessage");
  const iterator = /* @__PURE__ */ __name(async function* () {
    const sourceIterator = source[Symbol.asyncIterator]();
    while (true) {
      const { value, done } = await sourceIterator.next();
      if (done) {
        if (!currentMessageTotalLength) {
          return;
        } else if (currentMessageTotalLength === currentMessagePendingLength) {
          yield currentMessage;
        } else {
          throw new Error("Truncated event message received.");
        }
        return;
      }
      const chunkLength = value.length;
      let currentOffset = 0;
      while (currentOffset < chunkLength) {
        if (!currentMessage) {
          const bytesRemaining = chunkLength - currentOffset;
          if (!messageLengthBuffer) {
            messageLengthBuffer = new Uint8Array(4);
          }
          const numBytesForTotal = Math.min(4 - currentMessagePendingLength, bytesRemaining);
          messageLengthBuffer.set(value.slice(currentOffset, currentOffset + numBytesForTotal), currentMessagePendingLength);
          currentMessagePendingLength += numBytesForTotal;
          currentOffset += numBytesForTotal;
          if (currentMessagePendingLength < 4) {
            break;
          }
          allocateMessage(new DataView(messageLengthBuffer.buffer).getUint32(0, false));
          messageLengthBuffer = null;
        }
        const numBytesToWrite = Math.min(currentMessageTotalLength - currentMessagePendingLength, chunkLength - currentOffset);
        currentMessage.set(value.slice(currentOffset, currentOffset + numBytesToWrite), currentMessagePendingLength);
        currentMessagePendingLength += numBytesToWrite;
        currentOffset += numBytesToWrite;
        if (currentMessageTotalLength && currentMessageTotalLength === currentMessagePendingLength) {
          yield currentMessage;
          currentMessage = null;
          currentMessageTotalLength = 0;
          currentMessagePendingLength = 0;
        }
      }
    }
  }, "iterator");
  return {
    [Symbol.asyncIterator]: iterator
  };
}
var init_getChunkedStream = __esm({
  "node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-serde-universal/getChunkedStream.js"() {
    __name(getChunkedStream, "getChunkedStream");
  }
});

// node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-serde-universal/getUnmarshalledStream.js
function getUnmarshalledStream(source, options) {
  const messageUnmarshaller = getMessageUnmarshaller(options.deserializer, options.toUtf8);
  return {
    [Symbol.asyncIterator]: async function* () {
      for await (const chunk of source) {
        const message = options.eventStreamCodec.decode(chunk);
        const type = await messageUnmarshaller(message);
        if (type === void 0)
          continue;
        yield type;
      }
    }
  };
}
function getMessageUnmarshaller(deserializer, toUtf83) {
  return async function(message) {
    const { value: messageType } = message.headers[":message-type"];
    if (messageType === "error") {
      const unmodeledError = new Error(message.headers[":error-message"].value || "UnknownError");
      unmodeledError.name = message.headers[":error-code"].value;
      throw unmodeledError;
    } else if (messageType === "exception") {
      const code = message.headers[":exception-type"].value;
      const exception = { [code]: message };
      const deserializedException = await deserializer(exception);
      if (deserializedException.$unknown) {
        const error = new Error(toUtf83(message.body));
        error.name = code;
        throw error;
      }
      throw deserializedException[code];
    } else if (messageType === "event") {
      const event = {
        [message.headers[":event-type"].value]: message
      };
      const deserialized = await deserializer(event);
      if (deserialized.$unknown)
        return;
      return deserialized;
    } else {
      throw Error(`Unrecognizable event type: ${message.headers[":event-type"].value}`);
    }
  };
}
var init_getUnmarshalledStream = __esm({
  "node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-serde-universal/getUnmarshalledStream.js"() {
    __name(getUnmarshalledStream, "getUnmarshalledStream");
    __name(getMessageUnmarshaller, "getMessageUnmarshaller");
  }
});

// node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-serde-universal/EventStreamMarshaller.js
var EventStreamMarshaller, eventStreamSerdeProvider;
var init_EventStreamMarshaller = __esm({
  "node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-serde-universal/EventStreamMarshaller.js"() {
    init_EventStreamCodec();
    init_MessageDecoderStream();
    init_MessageEncoderStream();
    init_SmithyMessageDecoderStream();
    init_SmithyMessageEncoderStream();
    init_getChunkedStream();
    init_getUnmarshalledStream();
    EventStreamMarshaller = class {
      static {
        __name(this, "EventStreamMarshaller");
      }
      eventStreamCodec;
      utfEncoder;
      constructor({ utf8Encoder, utf8Decoder }) {
        this.eventStreamCodec = new EventStreamCodec(utf8Encoder, utf8Decoder);
        this.utfEncoder = utf8Encoder;
      }
      deserialize(body, deserializer) {
        const inputStream = getChunkedStream(body);
        return new SmithyMessageDecoderStream({
          messageStream: new MessageDecoderStream({ inputStream, decoder: this.eventStreamCodec }),
          deserializer: getMessageUnmarshaller(deserializer, this.utfEncoder)
        });
      }
      serialize(inputStream, serializer) {
        return new MessageEncoderStream({
          messageStream: new SmithyMessageEncoderStream({ inputStream, serializer }),
          encoder: this.eventStreamCodec,
          includeEndFrame: true
        });
      }
    };
    eventStreamSerdeProvider = /* @__PURE__ */ __name((options) => new EventStreamMarshaller(options), "eventStreamSerdeProvider");
  }
});

// node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-serde/EventStreamMarshaller.js
import { Readable as Readable3 } from "node:stream";
async function* readableToIterable(readStream) {
  let streamEnded = false;
  let generationEnded = false;
  const records = new Array();
  readStream.on("error", (err2) => {
    if (!streamEnded) {
      streamEnded = true;
    }
    if (err2) {
      throw err2;
    }
  });
  readStream.on("data", (data) => {
    records.push(data);
  });
  readStream.on("end", () => {
    streamEnded = true;
  });
  while (!generationEnded) {
    const value = await new Promise((resolve) => setTimeout(() => resolve(records.shift()), 0));
    if (value) {
      yield value;
    }
    generationEnded = streamEnded && records.length === 0;
  }
}
var EventStreamMarshaller2, eventStreamSerdeProvider2;
var init_EventStreamMarshaller2 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-serde/EventStreamMarshaller.js"() {
    init_EventStreamMarshaller();
    EventStreamMarshaller2 = class {
      static {
        __name(this, "EventStreamMarshaller");
      }
      universalMarshaller;
      constructor({ utf8Encoder, utf8Decoder }) {
        this.universalMarshaller = new EventStreamMarshaller({
          utf8Decoder,
          utf8Encoder
        });
      }
      deserialize(body, deserializer) {
        const bodyIterable = typeof body[Symbol.asyncIterator] === "function" ? body : readableToIterable(body);
        return this.universalMarshaller.deserialize(bodyIterable, deserializer);
      }
      serialize(input, serializer) {
        return Readable3.from(this.universalMarshaller.serialize(input, serializer));
      }
    };
    eventStreamSerdeProvider2 = /* @__PURE__ */ __name((options) => new EventStreamMarshaller2(options), "eventStreamSerdeProvider");
    __name(readableToIterable, "readableToIterable");
  }
});

// node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-serde/utils.js
var readableStreamToIterable, iterableToReadableStream;
var init_utils = __esm({
  "node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-serde/utils.js"() {
    readableStreamToIterable = /* @__PURE__ */ __name((readableStream) => ({
      [Symbol.asyncIterator]: async function* () {
        const reader = readableStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done)
              return;
            yield value;
          }
        } finally {
          reader.releaseLock();
        }
      }
    }), "readableStreamToIterable");
    iterableToReadableStream = /* @__PURE__ */ __name((asyncIterable) => {
      const iterator = asyncIterable[Symbol.asyncIterator]();
      return new ReadableStream({
        async pull(controller) {
          const { done, value } = await iterator.next();
          if (done) {
            return controller.close();
          }
          controller.enqueue(value);
        }
      });
    }, "iterableToReadableStream");
  }
});

// node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-serde-config-resolver/EventStreamSerdeConfig.js
var resolveEventStreamSerdeConfig;
var init_EventStreamSerdeConfig = __esm({
  "node_modules/@smithy/core/dist-es/submodules/event-streams/eventstream-serde-config-resolver/EventStreamSerdeConfig.js"() {
    resolveEventStreamSerdeConfig = /* @__PURE__ */ __name((input) => Object.assign(input, {
      eventStreamMarshaller: input.eventStreamSerdeProvider(input)
    }), "resolveEventStreamSerdeConfig");
  }
});

// node_modules/@smithy/core/dist-es/submodules/event-streams/EventStreamSerde.js
var EventStreamSerde;
var init_EventStreamSerde = __esm({
  "node_modules/@smithy/core/dist-es/submodules/event-streams/EventStreamSerde.js"() {
    init_transport();
    init_schema();
    init_serde();
    EventStreamSerde = class {
      static {
        __name(this, "EventStreamSerde");
      }
      marshaller;
      serializer;
      deserializer;
      serdeContext;
      defaultContentType;
      compositeErrorRegistry;
      constructor({ marshaller, serializer, deserializer, serdeContext, defaultContentType, compositeErrorRegistry }) {
        this.marshaller = marshaller;
        this.serializer = serializer;
        this.deserializer = deserializer;
        this.serdeContext = serdeContext;
        this.defaultContentType = defaultContentType;
        this.compositeErrorRegistry = compositeErrorRegistry;
      }
      async serializeEventStream({ eventStream, requestSchema, initialRequest, initialMessageType }) {
        const marshaller = this.marshaller;
        const eventStreamMember = requestSchema.getEventStreamMember();
        const unionSchema = requestSchema.getMemberSchema(eventStreamMember);
        const serializer = this.serializer;
        const defaultContentType = this.defaultContentType;
        const initialRequestMarker = /* @__PURE__ */ Symbol("initialRequestMarker");
        const eventStreamIterable = {
          async *[Symbol.asyncIterator]() {
            if (initialRequest) {
              const headers = {
                ":event-type": { type: "string", value: initialMessageType ?? "initial-request" },
                ":message-type": { type: "string", value: "event" },
                ":content-type": { type: "string", value: defaultContentType }
              };
              serializer.write(requestSchema, initialRequest);
              const body = serializer.flush();
              yield {
                [initialRequestMarker]: true,
                headers,
                body
              };
            }
            for await (const page of eventStream) {
              yield page;
            }
          }
        };
        return marshaller.serialize(eventStreamIterable, (event) => {
          if (event[initialRequestMarker]) {
            return {
              headers: event.headers,
              body: event.body
            };
          }
          let unionMember = "";
          for (const key in event) {
            if (!hasOwn(event, key))
              continue;
            if (key !== "__type") {
              unionMember = key;
              break;
            }
          }
          const { additionalHeaders, body, eventType, explicitPayloadContentType } = this.writeEventBody(unionMember, unionSchema, event);
          const headers = {
            ":event-type": { type: "string", value: eventType },
            ":message-type": { type: "string", value: "event" },
            ":content-type": { type: "string", value: explicitPayloadContentType ?? defaultContentType },
            ...additionalHeaders
          };
          return {
            headers,
            body
          };
        });
      }
      async deserializeEventStream({ response, responseSchema, initialResponseContainer, initialMessageType }) {
        const marshaller = this.marshaller;
        const eventStreamMember = responseSchema.getEventStreamMember();
        const unionSchema = responseSchema.getMemberSchema(eventStreamMember);
        const memberSchemas = unionSchema.getMemberSchemas();
        const initialResponseMarker = /* @__PURE__ */ Symbol("initialResponseMarker");
        const asyncIterable = marshaller.deserialize(response.body, async (event) => {
          let unionMember = "";
          for (const key in event) {
            if (!hasOwn(event, key))
              continue;
            if (key !== "__type") {
              unionMember = key;
              break;
            }
          }
          const body = event[unionMember].body;
          if (unionMember === (initialMessageType ?? "initial-response")) {
            const dataObject = await this.deserializer.read(responseSchema, body);
            delete dataObject[eventStreamMember];
            return {
              [initialResponseMarker]: true,
              ...dataObject
            };
          } else if (unionMember in memberSchemas) {
            const eventStreamSchema = memberSchemas[unionMember];
            if (eventStreamSchema.isStructSchema()) {
              const out = {};
              let hasBindings = false;
              for (const [name, member2] of eventStreamSchema.structIterator()) {
                const { eventHeader, eventPayload } = member2.getMergedTraits();
                hasBindings = hasBindings || Boolean(eventHeader || eventPayload);
                if (eventPayload) {
                  if (member2.isBlobSchema()) {
                    out[name] = body;
                  } else if (member2.isStringSchema()) {
                    out[name] = (this.serdeContext?.utf8Encoder ?? toUtf8)(body);
                  } else if (member2.isStructSchema()) {
                    out[name] = await this.deserializer.read(member2, body);
                  }
                } else if (eventHeader) {
                  const value = event[unionMember].headers[name]?.value;
                  if (value != null) {
                    if (member2.isNumericSchema()) {
                      if (value && typeof value === "object" && "bytes" in value) {
                        out[name] = BigInt(value.toString());
                      } else {
                        out[name] = Number(value);
                      }
                    } else {
                      out[name] = value;
                    }
                  }
                }
              }
              return {
                [unionMember]: await this.readEventMember(eventStreamSchema, body, hasBindings, out)
              };
            }
            return {
              [unionMember]: await this.deserializer.read(eventStreamSchema, body)
            };
          } else {
            return {
              $unknown: event
            };
          }
        });
        const asyncIterator = asyncIterable[Symbol.asyncIterator]();
        const firstEvent = await asyncIterator.next();
        if (firstEvent.done) {
          return asyncIterable;
        }
        if (firstEvent.value?.[initialResponseMarker]) {
          if (!responseSchema) {
            throw new Error("@smithy::core/protocols - initial-response event encountered in event stream but no response schema given.");
          }
          for (const key in firstEvent.value) {
            if (!hasOwn(firstEvent.value, key))
              continue;
            initialResponseContainer[key] = firstEvent.value[key];
          }
        }
        return {
          async *[Symbol.asyncIterator]() {
            if (!firstEvent?.value?.[initialResponseMarker]) {
              yield firstEvent.value;
            }
            while (true) {
              const { done, value } = await asyncIterator.next();
              if (done) {
                break;
              }
              yield value;
            }
          }
        };
      }
      async readEventMember(eventStreamSchema, body, hasBindings, out) {
        let ErrCtor;
        const staticStructuralSchema = eventStreamSchema.getSchema();
        if (Array.isArray(staticStructuralSchema) && staticStructuralSchema[0] === -3) {
          const namespace = staticStructuralSchema[1];
          const nsRegistry = TypeRegistry.for(namespace);
          this.compositeErrorRegistry?.copyFrom(nsRegistry);
          ErrCtor = (this.compositeErrorRegistry ?? nsRegistry)?.getErrorCtor(staticStructuralSchema);
        }
        const dataObject = hasBindings ? out : body.byteLength === 0 ? {} : await this.deserializer.read(eventStreamSchema, body);
        if (ErrCtor) {
          const message = dataObject.message ?? dataObject.Message ?? "Unknown";
          const metadata = {};
          const $fault = eventStreamSchema.getMergedTraits().error;
          if ($fault) {
            metadata.$fault = $fault;
          }
          return Object.assign(new ErrCtor({}), metadata, {
            message
          }, dataObject);
        }
        return dataObject;
      }
      writeEventBody(unionMember, unionSchema, event) {
        const serializer = this.serializer;
        let eventType = unionMember;
        let explicitPayloadMember = null;
        let explicitPayloadContentType;
        const isKnownSchema = (() => {
          const struct = unionSchema.getSchema();
          return struct[4].includes(unionMember);
        })();
        const additionalHeaders = {};
        if (!isKnownSchema) {
          const [type, value] = event[unionMember];
          eventType = type;
          serializer.write(15, value);
        } else {
          const eventSchema = unionSchema.getMemberSchema(unionMember);
          if (eventSchema.isStructSchema()) {
            for (const [memberName, memberSchema] of eventSchema.structIterator()) {
              const { eventHeader, eventPayload } = memberSchema.getMergedTraits();
              if (eventPayload) {
                explicitPayloadMember = memberName;
              } else if (eventHeader) {
                const value = event[unionMember][memberName];
                let type = "binary";
                if (memberSchema.isNumericSchema()) {
                  if ((-2) ** 31 <= value && value <= 2 ** 31 - 1) {
                    type = "integer";
                  } else {
                    type = "long";
                  }
                } else if (memberSchema.isTimestampSchema()) {
                  type = "timestamp";
                } else if (memberSchema.isStringSchema()) {
                  type = "string";
                } else if (memberSchema.isBooleanSchema()) {
                  type = "boolean";
                }
                if (value != null) {
                  additionalHeaders[memberName] = {
                    type,
                    value
                  };
                  delete event[unionMember][memberName];
                }
              }
            }
            if (explicitPayloadMember !== null) {
              const payloadSchema = eventSchema.getMemberSchema(explicitPayloadMember);
              if (payloadSchema.isBlobSchema()) {
                explicitPayloadContentType = "application/octet-stream";
              } else if (payloadSchema.isStringSchema()) {
                explicitPayloadContentType = "text/plain";
              }
              serializer.write(payloadSchema, event[unionMember][explicitPayloadMember]);
            } else {
              serializer.write(eventSchema, event[unionMember]);
            }
          } else if (eventSchema.isUnitSchema()) {
            serializer.write(eventSchema, {});
          } else {
            throw new Error("@smithy/core/event-streams - non-struct member not supported in event stream union.");
          }
        }
        const messageSerialization = serializer.flush() ?? new Uint8Array();
        const body = typeof messageSerialization === "string" ? (this.serdeContext?.utf8Decoder ?? fromUtf8)(messageSerialization) : messageSerialization;
        return {
          body,
          eventType,
          explicitPayloadContentType,
          additionalHeaders
        };
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/event-streams/index.js
var event_streams_exports = {};
__export(event_streams_exports, {
  EventStreamCodec: () => EventStreamCodec,
  EventStreamMarshaller: () => EventStreamMarshaller2,
  EventStreamSerde: () => EventStreamSerde,
  HeaderMarshaller: () => HeaderMarshaller,
  Int64: () => Int64,
  MessageDecoderStream: () => MessageDecoderStream,
  MessageEncoderStream: () => MessageEncoderStream,
  SmithyMessageDecoderStream: () => SmithyMessageDecoderStream,
  SmithyMessageEncoderStream: () => SmithyMessageEncoderStream,
  UniversalEventStreamMarshaller: () => EventStreamMarshaller,
  eventStreamSerdeProvider: () => eventStreamSerdeProvider2,
  getChunkedStream: () => getChunkedStream,
  getMessageUnmarshaller: () => getMessageUnmarshaller,
  getUnmarshalledStream: () => getUnmarshalledStream,
  iterableToReadableStream: () => iterableToReadableStream,
  readableStreamToIterable: () => readableStreamToIterable,
  resolveEventStreamSerdeConfig: () => resolveEventStreamSerdeConfig,
  universalEventStreamSerdeProvider: () => eventStreamSerdeProvider
});
var init_event_streams = __esm({
  "node_modules/@smithy/core/dist-es/submodules/event-streams/index.js"() {
    init_EventStreamCodec();
    init_HeaderMarshaller();
    init_Int64();
    init_MessageDecoderStream();
    init_MessageEncoderStream();
    init_SmithyMessageDecoderStream();
    init_SmithyMessageEncoderStream();
    init_EventStreamMarshaller2();
    init_utils();
    init_EventStreamMarshaller();
    init_getChunkedStream();
    init_getUnmarshalledStream();
    init_EventStreamSerdeConfig();
    init_EventStreamSerde();
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/HttpProtocol.js
var HttpProtocol;
var init_HttpProtocol = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/HttpProtocol.js"() {
    init_transport();
    init_schema();
    init_transport();
    init_SerdeContext();
    HttpProtocol = class extends SerdeContext {
      static {
        __name(this, "HttpProtocol");
      }
      options;
      compositeErrorRegistry;
      constructor(options) {
        super();
        this.options = options;
        this.compositeErrorRegistry = new TypeRegistry(options.defaultNamespace);
        for (const etr of options.errorTypeRegistries ?? []) {
          this.compositeErrorRegistry.copyFrom(etr);
        }
      }
      getRequestType() {
        return HttpRequest;
      }
      getResponseType() {
        return HttpResponse;
      }
      setSerdeContext(serdeContext) {
        this.serdeContext = serdeContext;
        this.serializer.setSerdeContext(serdeContext);
        this.deserializer.setSerdeContext(serdeContext);
        if (this.getPayloadCodec()) {
          this.getPayloadCodec().setSerdeContext(serdeContext);
        }
      }
      updateServiceEndpoint(request, endpoint) {
        if ("url" in endpoint) {
          request.protocol = endpoint.url.protocol;
          request.hostname = endpoint.url.hostname;
          request.port = endpoint.url.port ? Number(endpoint.url.port) : void 0;
          request.path = endpoint.url.pathname;
          request.fragment = endpoint.url.hash || void 0;
          request.username = endpoint.url.username || void 0;
          request.password = endpoint.url.password || void 0;
          if (!request.query) {
            request.query = {};
          }
          for (const [k6, v2] of endpoint.url.searchParams.entries()) {
            request.query[k6] = v2;
          }
          if (endpoint.headers) {
            for (const name in endpoint.headers) {
              if (!hasOwn(endpoint.headers, name))
                continue;
              request.headers[name] = endpoint.headers[name].join(", ");
            }
          }
          return request;
        } else {
          request.protocol = endpoint.protocol;
          request.hostname = endpoint.hostname;
          request.port = endpoint.port ? Number(endpoint.port) : void 0;
          request.path = endpoint.path;
          request.query = {
            ...endpoint.query
          };
          if (endpoint.headers) {
            for (const name in endpoint.headers) {
              if (!hasOwn(endpoint.headers, name))
                continue;
              request.headers[name] = endpoint.headers[name];
            }
          }
          return request;
        }
      }
      setHostPrefix(request, operationSchema, input) {
        if (this.serdeContext?.disableHostPrefix) {
          return;
        }
        const inputNs = NormalizedSchema.of(operationSchema.input);
        const opTraits = translateTraits(operationSchema.traits ?? {});
        if (opTraits.endpoint) {
          let hostPrefix = opTraits.endpoint?.[0];
          if (typeof hostPrefix === "string") {
            for (const [name, member2] of inputNs.structIterator()) {
              if (!member2.getMergedTraits().hostLabel) {
                continue;
              }
              const replacement = input[name];
              if (typeof replacement !== "string") {
                throw new Error(`@smithy/core/schema - ${name} in input must be a string as hostLabel.`);
              }
              hostPrefix = hostPrefix.replace(`{${name}}`, replacement);
            }
            request.hostname = hostPrefix + request.hostname;
            if (!isValidHostname(request.hostname)) {
              throw new Error(`[${request.hostname}] is not a valid hostname.`);
            }
          }
        }
      }
      deserializeMetadata(output) {
        return {
          httpStatusCode: output.statusCode,
          requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
          extendedRequestId: output.headers["x-amz-id-2"],
          cfId: output.headers["x-amz-cf-id"]
        };
      }
      resolveError(name, namespaces, registries) {
        const defaultErrorSchema = [-3, "", "Error", 0, [], [], 0];
        let schema;
        for (const registry of registries) {
          for (const ns of namespaces) {
            try {
              if (ns === "*") {
                schema = registry.getSchema(name);
              } else {
                schema = registry.getSchema(ns + "#" + name);
              }
              const errorCtor = registry.getErrorCtor(schema);
              if (errorCtor) {
                return [schema, errorCtor, "modeled"];
              } else {
                const syntheticErrorSchema = registry.getBaseException();
                if (syntheticErrorSchema) {
                  const syntheticErrorCtor = registry.getErrorCtor(syntheticErrorSchema);
                  if (syntheticErrorCtor) {
                    return [schema, syntheticErrorCtor, "synthetic"];
                  }
                }
              }
            } catch (ignored) {
            }
          }
        }
        for (const registry of registries) {
          const syntheticErrorSchema = registry.getBaseException();
          if (syntheticErrorSchema) {
            const syntheticErrorCtor = registry.getErrorCtor(syntheticErrorSchema);
            if (syntheticErrorCtor) {
              return [syntheticErrorSchema, syntheticErrorCtor, "synthetic"];
            }
          }
        }
        return [defaultErrorSchema, Error, "native"];
      }
      async serializeEventStream({ eventStream, requestSchema, initialRequest }) {
        const eventStreamSerde = await this.loadEventStreamCapability();
        return eventStreamSerde.serializeEventStream({
          eventStream,
          requestSchema,
          initialRequest
        });
      }
      async deserializeEventStream({ response, responseSchema, initialResponseContainer }) {
        const eventStreamSerde = await this.loadEventStreamCapability();
        return eventStreamSerde.deserializeEventStream({
          response,
          responseSchema,
          initialResponseContainer
        });
      }
      async loadEventStreamCapability() {
        const { EventStreamSerde: EventStreamSerde2, eventStreamSerdeProvider: eventStreamSerdeProvider3 } = await Promise.resolve().then(() => (init_event_streams(), event_streams_exports));
        const marshaller = this.resolveEventStreamMarshaller(eventStreamSerdeProvider3);
        return new EventStreamSerde2({
          marshaller,
          serializer: this.serializer,
          deserializer: this.deserializer,
          serdeContext: this.serdeContext,
          defaultContentType: this.getDefaultContentType(),
          compositeErrorRegistry: this.compositeErrorRegistry
        });
      }
      getDefaultContentType() {
        throw new Error(`@smithy/core/protocols - ${this.constructor.name} getDefaultContentType() implementation missing.`);
      }
      async deserializeHttpMessage(schema, context, response, arg4, arg5) {
        void schema;
        void context;
        void response;
        void arg4;
        void arg5;
        return [];
      }
      getEventStreamMarshaller() {
        const context = this.serdeContext;
        if (!context.eventStreamMarshaller) {
          throw new Error("@smithy/core - HttpProtocol: eventStreamMarshaller missing in serdeContext.");
        }
        return context.eventStreamMarshaller;
      }
      resolveEventStreamMarshaller(importedProvider) {
        const context = this.serdeContext;
        if (context.eventStreamMarshaller) {
          return context.eventStreamMarshaller;
        }
        return importedProvider(this.serdeContext);
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/HttpBindingProtocol.js
var HttpBindingProtocol;
var init_HttpBindingProtocol = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/HttpBindingProtocol.js"() {
    init_transport();
    init_schema();
    init_serde();
    init_transport();
    init_HttpProtocol();
    init_collect_stream_body();
    init_extended_encode_uri_component();
    HttpBindingProtocol = class extends HttpProtocol {
      static {
        __name(this, "HttpBindingProtocol");
      }
      async serializeRequest(operationSchema, _input, context) {
        const input = _input && typeof _input === "object" ? _input : {};
        const serializer = this.serializer;
        const query = {};
        const headers = {};
        const endpoint = await context.endpoint();
        const ns = NormalizedSchema.of(operationSchema?.input);
        const payloadMemberNames = [];
        const payloadMemberSchemas = [];
        let hasNonHttpBindingMember = false;
        let payload;
        const request = new HttpRequest({
          protocol: "",
          hostname: "",
          port: void 0,
          path: "",
          fragment: void 0,
          query,
          headers,
          body: void 0
        });
        if (endpoint) {
          this.updateServiceEndpoint(request, endpoint);
          this.setHostPrefix(request, operationSchema, input);
          const opTraits = translateTraits(operationSchema.traits);
          if (opTraits.http) {
            request.method = opTraits.http[0];
            const [path, search] = opTraits.http[1].split("?");
            if (request.path == "/") {
              request.path = path;
            } else {
              request.path += path;
            }
            const traitSearchParams = new URLSearchParams(search ?? "");
            for (const [key, value] of traitSearchParams) {
              query[key] = value;
            }
          }
        }
        for (const [memberName, memberNs] of ns.structIterator()) {
          const memberTraits = memberNs.getMergedTraits() ?? {};
          const inputMemberValue = input[memberName];
          if (inputMemberValue == null && !memberNs.isIdempotencyToken()) {
            if (memberTraits.httpLabel) {
              if (request.path.includes(`{${memberName}+}`) || request.path.includes(`{${memberName}}`)) {
                throw new Error(`No value provided for input HTTP label: ${memberName}.`);
              }
            }
            continue;
          }
          if (memberTraits.httpPayload) {
            const isStreaming = memberNs.isStreaming();
            if (isStreaming) {
              const isEventStream = memberNs.isStructSchema();
              if (isEventStream) {
                if (input[memberName]) {
                  payload = await this.serializeEventStream({
                    eventStream: input[memberName],
                    requestSchema: ns
                  });
                }
              } else {
                payload = inputMemberValue;
              }
            } else {
              serializer.write(memberNs, inputMemberValue);
              payload = serializer.flush();
            }
          } else if (memberTraits.httpLabel) {
            serializer.write(memberNs, inputMemberValue);
            const replacement = serializer.flush();
            if (request.path.includes(`{${memberName}+}`)) {
              request.path = request.path.replace(`{${memberName}+}`, replacement.split("/").map(extendedEncodeURIComponent).join("/"));
            } else if (request.path.includes(`{${memberName}}`)) {
              request.path = request.path.replace(`{${memberName}}`, extendedEncodeURIComponent(replacement));
            }
          } else if (memberTraits.httpHeader) {
            serializer.write(memberNs, inputMemberValue);
            headers[memberTraits.httpHeader.toLowerCase()] = String(serializer.flush());
          } else if (typeof memberTraits.httpPrefixHeaders === "string") {
            for (const key in inputMemberValue) {
              if (!hasOwn(inputMemberValue, key))
                continue;
              const val = inputMemberValue[key];
              const amalgam = memberTraits.httpPrefixHeaders + key;
              serializer.write([memberNs.getValueSchema(), { httpHeader: amalgam }], val);
              headers[amalgam.toLowerCase()] = serializer.flush();
            }
          } else if (memberTraits.httpQuery || memberTraits.httpQueryParams) {
            this.serializeQuery(memberNs, inputMemberValue, query);
          } else {
            hasNonHttpBindingMember = true;
            payloadMemberNames.push(memberName);
            payloadMemberSchemas.push(memberNs);
          }
        }
        if (hasNonHttpBindingMember && input) {
          const [namespace, name] = (ns.getName(true) ?? "#Unknown").split("#");
          const requiredMembers = ns.getSchema()[6];
          const payloadSchema = [
            3,
            namespace,
            name,
            ns.getMergedTraits(),
            payloadMemberNames,
            payloadMemberSchemas,
            void 0
          ];
          if (requiredMembers) {
            payloadSchema[6] = requiredMembers;
          } else {
            payloadSchema.pop();
          }
          serializer.write(payloadSchema, input);
          payload = serializer.flush();
        }
        request.headers = headers;
        request.query = query;
        request.body = payload;
        return request;
      }
      serializeQuery(ns, data, query) {
        const serializer = this.serializer;
        const traits = ns.getMergedTraits();
        if (traits.httpQueryParams) {
          for (const key in data) {
            if (!hasOwn(data, key))
              continue;
            if (!(key in query)) {
              const val = data[key];
              const valueSchema = ns.getValueSchema();
              Object.assign(valueSchema.getMergedTraits(), {
                ...traits,
                httpQuery: key,
                httpQueryParams: void 0
              });
              this.serializeQuery(valueSchema, val, query);
            }
          }
          return;
        }
        if (ns.isListSchema()) {
          const sparse = !!ns.getMergedTraits().sparse;
          const buffer = [];
          for (const item of data) {
            serializer.write([ns.getValueSchema(), traits], item);
            const serializable = serializer.flush();
            if (sparse || serializable !== void 0) {
              buffer.push(serializable);
            }
          }
          query[traits.httpQuery] = buffer;
        } else {
          serializer.write([ns, traits], data);
          query[traits.httpQuery] = serializer.flush();
        }
      }
      async deserializeResponse(operationSchema, context, response) {
        const deserializer = this.deserializer;
        const ns = NormalizedSchema.of(operationSchema.output);
        const dataObject = {};
        if (response.statusCode >= 300) {
          const bytes = await collectBody(response.body, context);
          if (bytes.byteLength > 0) {
            Object.assign(dataObject, await deserializer.read(15, bytes));
          }
          await this.handleError(operationSchema, context, response, dataObject, this.deserializeMetadata(response));
          throw new Error("@smithy/core/protocols - HTTP Protocol error handler failed to throw.");
        }
        for (const header in response.headers) {
          if (!hasOwn(response.headers, header))
            continue;
          const value = response.headers[header];
          delete response.headers[header];
          response.headers[header.toLowerCase()] = value;
        }
        const nonHttpBindingMembers = await this.deserializeHttpMessage(ns, context, response, dataObject);
        if (nonHttpBindingMembers.length) {
          const bytes = await collectBody(response.body, context);
          if (bytes.byteLength > 0) {
            const dataFromBody = await deserializer.read(ns, bytes);
            for (const member2 of nonHttpBindingMembers) {
              if (dataFromBody[member2] != null) {
                dataObject[member2] = dataFromBody[member2];
              }
            }
          }
        } else if (nonHttpBindingMembers.discardResponseBody) {
          await collectBody(response.body, context);
        }
        dataObject.$metadata = this.deserializeMetadata(response);
        return dataObject;
      }
      async deserializeHttpMessage(schema, context, response, arg4, arg5) {
        let dataObject;
        if (arg4 instanceof Set) {
          dataObject = arg5;
        } else {
          dataObject = arg4;
        }
        let discardResponseBody = true;
        const deserializer = this.deserializer;
        const ns = NormalizedSchema.of(schema);
        const nonHttpBindingMembers = [];
        for (const [memberName, memberSchema] of ns.structIterator()) {
          const memberTraits = memberSchema.getMemberTraits();
          if (memberTraits.httpPayload) {
            discardResponseBody = false;
            const isStreaming = memberSchema.isStreaming();
            if (isStreaming) {
              const isEventStream = memberSchema.isStructSchema();
              if (isEventStream) {
                dataObject[memberName] = await this.deserializeEventStream({
                  response,
                  responseSchema: ns
                });
              } else {
                dataObject[memberName] = sdkStreamMixin2(response.body);
              }
            } else if (response.body) {
              const bytes = await collectBody(response.body, context);
              if (bytes.byteLength > 0) {
                dataObject[memberName] = await deserializer.read(memberSchema, bytes);
              }
            }
          } else if (memberTraits.httpHeader) {
            const key = String(memberTraits.httpHeader).toLowerCase();
            const value = response.headers[key];
            if (null != value) {
              if (memberSchema.isListSchema()) {
                const headerListValueSchema = memberSchema.getValueSchema();
                headerListValueSchema.getMergedTraits().httpHeader = key;
                let sections;
                if (headerListValueSchema.isTimestampSchema() && headerListValueSchema.getSchema() === 4) {
                  sections = splitEvery(value, ",", 2);
                } else {
                  sections = splitHeader(value);
                }
                const list = [];
                for (const section of sections) {
                  list.push(await deserializer.read(headerListValueSchema, section.trim()));
                }
                dataObject[memberName] = list;
              } else {
                dataObject[memberName] = await deserializer.read(memberSchema, value);
              }
            }
          } else if (memberTraits.httpPrefixHeaders !== void 0) {
            dataObject[memberName] = {};
            for (const header in response.headers) {
              if (!hasOwn(response.headers, header))
                continue;
              if (header.startsWith(memberTraits.httpPrefixHeaders)) {
                const value = response.headers[header];
                const valueSchema = memberSchema.getValueSchema();
                valueSchema.getMergedTraits().httpHeader = header;
                dataObject[memberName][header.slice(memberTraits.httpPrefixHeaders.length)] = await deserializer.read(valueSchema, value);
              }
            }
          } else if (memberTraits.httpResponseCode) {
            dataObject[memberName] = response.statusCode;
          } else {
            nonHttpBindingMembers.push(memberName);
          }
        }
        nonHttpBindingMembers.discardResponseBody = discardResponseBody;
        return nonHttpBindingMembers;
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/RpcProtocol.js
var RpcProtocol;
var init_RpcProtocol = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/RpcProtocol.js"() {
    init_transport();
    init_schema();
    init_transport();
    init_HttpProtocol();
    init_collect_stream_body();
    RpcProtocol = class extends HttpProtocol {
      static {
        __name(this, "RpcProtocol");
      }
      async serializeRequest(operationSchema, _input, context) {
        const serializer = this.serializer;
        const query = {};
        const headers = {};
        const endpoint = await context.endpoint();
        const ns = NormalizedSchema.of(operationSchema?.input);
        const schema = ns.getSchema();
        let payload;
        const input = _input && typeof _input === "object" ? _input : {};
        const request = new HttpRequest({
          protocol: "",
          hostname: "",
          port: void 0,
          path: "/",
          fragment: void 0,
          query,
          headers,
          body: void 0
        });
        if (endpoint) {
          this.updateServiceEndpoint(request, endpoint);
          this.setHostPrefix(request, operationSchema, input);
        }
        if (input) {
          const eventStreamMember = ns.getEventStreamMember();
          if (eventStreamMember) {
            if (input[eventStreamMember]) {
              const initialRequest = {};
              for (const [memberName] of ns.structIterator()) {
                if (memberName !== eventStreamMember && input[memberName] != null) {
                  initialRequest[memberName] = input[memberName];
                }
              }
              payload = await this.serializeEventStream({
                eventStream: input[eventStreamMember],
                requestSchema: ns,
                initialRequest
              });
            }
          } else {
            serializer.write(schema, input);
            payload = serializer.flush();
          }
        }
        request.headers = Object.assign(request.headers, headers);
        request.query = query;
        request.body = payload;
        request.method = "POST";
        return request;
      }
      async deserializeResponse(operationSchema, context, response) {
        const deserializer = this.deserializer;
        const ns = NormalizedSchema.of(operationSchema.output);
        const dataObject = {};
        if (this.isErrorResponse(response.statusCode)) {
          const bytes = await collectBody(response.body, context);
          if (bytes.byteLength > 0) {
            Object.assign(dataObject, await deserializer.read(15, bytes));
          }
          await this.handleError(operationSchema, context, response, dataObject, this.deserializeMetadata(response));
          throw new Error("@smithy/core/protocols - RPC Protocol error handler failed to throw.");
        }
        for (const header in response.headers) {
          if (!hasOwn(response.headers, header))
            continue;
          const value = response.headers[header];
          delete response.headers[header];
          response.headers[header.toLowerCase()] = value;
        }
        const eventStreamMember = ns.getEventStreamMember();
        if (eventStreamMember) {
          dataObject[eventStreamMember] = await this.deserializeEventStream({
            response,
            responseSchema: ns,
            initialResponseContainer: dataObject
          });
        } else {
          const bytes = await collectBody(response.body, context);
          if (bytes.byteLength > 0) {
            Object.assign(dataObject, await deserializer.read(ns, bytes));
          }
        }
        dataObject.$metadata = this.deserializeMetadata(response);
        return dataObject;
      }
      isErrorResponse(statusCode) {
        return statusCode >= 300;
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/serde/determineTimestampFormat.js
function determineTimestampFormat(ns, settings) {
  if (settings.timestampFormat.useTrait) {
    if (ns.isTimestampSchema() && (ns.getSchema() === 5 || ns.getSchema() === 6 || ns.getSchema() === 7)) {
      return ns.getSchema();
    }
  }
  const { httpLabel, httpPrefixHeaders, httpHeader, httpQuery } = ns.getMergedTraits();
  const bindingFormat = settings.httpBindings ? typeof httpPrefixHeaders === "string" || Boolean(httpHeader) ? 6 : Boolean(httpQuery) || Boolean(httpLabel) ? 5 : void 0 : void 0;
  return bindingFormat ?? settings.timestampFormat.default;
}
var init_determineTimestampFormat = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/serde/determineTimestampFormat.js"() {
    __name(determineTimestampFormat, "determineTimestampFormat");
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/serde/FromStringShapeDeserializer.js
var FromStringShapeDeserializer;
var init_FromStringShapeDeserializer = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/serde/FromStringShapeDeserializer.js"() {
    init_schema();
    init_serde();
    init_SerdeContext();
    init_determineTimestampFormat();
    FromStringShapeDeserializer = class extends SerdeContext {
      static {
        __name(this, "FromStringShapeDeserializer");
      }
      settings;
      constructor(settings) {
        super();
        this.settings = settings;
      }
      read(_schema, data) {
        const ns = NormalizedSchema.of(_schema);
        if (ns.isListSchema()) {
          return splitHeader(data).map((item) => this.read(ns.getValueSchema(), item));
        }
        if (ns.isBlobSchema()) {
          return (this.serdeContext?.base64Decoder ?? fromBase64)(data);
        }
        if (ns.isTimestampSchema()) {
          const format2 = determineTimestampFormat(ns, this.settings);
          switch (format2) {
            case 5:
              return _parseRfc3339DateTimeWithOffset(data);
            case 6:
              return _parseRfc7231DateTime(data);
            case 7:
              return _parseEpochTimestamp(data);
            default:
              console.warn("Missing timestamp format, parsing value with Date constructor:", data);
              return new Date(data);
          }
        }
        if (ns.isStringSchema()) {
          const mediaType = ns.getMergedTraits().mediaType;
          let intermediateValue = data;
          if (mediaType) {
            if (ns.getMergedTraits().httpHeader) {
              intermediateValue = this.base64ToUtf8(intermediateValue);
            }
            const isJson = mediaType === "application/json" || mediaType.endsWith("+json");
            if (isJson) {
              intermediateValue = LazyJsonString.from(intermediateValue);
            }
            return intermediateValue;
          }
        }
        if (ns.isNumericSchema()) {
          return Number(data);
        }
        if (ns.isBigIntegerSchema()) {
          return BigInt(data);
        }
        if (ns.isBigDecimalSchema()) {
          return new NumericValue(data, "bigDecimal");
        }
        if (ns.isBooleanSchema()) {
          return String(data).toLowerCase() === "true";
        }
        return data;
      }
      base64ToUtf8(base64String) {
        return (this.serdeContext?.utf8Encoder ?? toUtf8)((this.serdeContext?.base64Decoder ?? fromBase64)(base64String));
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/serde/HttpInterceptingShapeDeserializer.js
var HttpInterceptingShapeDeserializer;
var init_HttpInterceptingShapeDeserializer = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/serde/HttpInterceptingShapeDeserializer.js"() {
    init_schema();
    init_serde();
    init_SerdeContext();
    init_FromStringShapeDeserializer();
    HttpInterceptingShapeDeserializer = class extends SerdeContext {
      static {
        __name(this, "HttpInterceptingShapeDeserializer");
      }
      codecDeserializer;
      stringDeserializer;
      constructor(codecDeserializer, codecSettings) {
        super();
        this.codecDeserializer = codecDeserializer;
        this.stringDeserializer = new FromStringShapeDeserializer(codecSettings);
      }
      setSerdeContext(serdeContext) {
        this.stringDeserializer.setSerdeContext(serdeContext);
        this.codecDeserializer.setSerdeContext(serdeContext);
        this.serdeContext = serdeContext;
      }
      read(schema, data) {
        const ns = NormalizedSchema.of(schema);
        const traits = ns.getMergedTraits();
        const toString = this.serdeContext?.utf8Encoder ?? toUtf8;
        if (traits.httpHeader || traits.httpResponseCode) {
          return this.stringDeserializer.read(ns, toString(data));
        }
        if (traits.httpPayload) {
          if (ns.isBlobSchema()) {
            const toBytes = this.serdeContext?.utf8Decoder ?? fromUtf8;
            if (typeof data === "string") {
              return toBytes(data);
            }
            return data;
          } else if (ns.isStringSchema()) {
            if ("byteLength" in data) {
              return toString(data);
            }
            return data;
          }
        }
        return this.codecDeserializer.read(ns, data);
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/serde/ToStringShapeSerializer.js
var ToStringShapeSerializer;
var init_ToStringShapeSerializer = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/serde/ToStringShapeSerializer.js"() {
    init_schema();
    init_serde();
    init_SerdeContext();
    init_determineTimestampFormat();
    ToStringShapeSerializer = class extends SerdeContext {
      static {
        __name(this, "ToStringShapeSerializer");
      }
      settings;
      stringBuffer = "";
      constructor(settings) {
        super();
        this.settings = settings;
      }
      write(schema, value) {
        const ns = NormalizedSchema.of(schema);
        switch (typeof value) {
          case "object":
            if (value === null) {
              this.stringBuffer = "null";
              return;
            }
            if (ns.isTimestampSchema()) {
              if (!(value instanceof Date)) {
                throw new Error(`@smithy/core/protocols - received non-Date value ${value} when schema expected Date in ${ns.getName(true)}`);
              }
              const format2 = determineTimestampFormat(ns, this.settings);
              switch (format2) {
                case 5:
                  this.stringBuffer = value.toISOString().replace(".000Z", "Z");
                  break;
                case 6:
                  this.stringBuffer = dateToUtcString(value);
                  break;
                case 7:
                  this.stringBuffer = String(value.getTime() / 1e3);
                  break;
                default:
                  console.warn("Missing timestamp format, using epoch seconds", value);
                  this.stringBuffer = String(value.getTime() / 1e3);
              }
              return;
            }
            if (ns.isBlobSchema() && "byteLength" in value) {
              this.stringBuffer = (this.serdeContext?.base64Encoder ?? toBase64)(value);
              return;
            }
            if (ns.isListSchema() && Array.isArray(value)) {
              let buffer = "";
              for (const item of value) {
                this.write([ns.getValueSchema(), ns.getMergedTraits()], item);
                const headerItem = this.flush();
                const serialized = ns.getValueSchema().isTimestampSchema() ? headerItem : quoteHeader(headerItem);
                if (buffer !== "") {
                  buffer += ", ";
                }
                buffer += serialized;
              }
              this.stringBuffer = buffer;
              return;
            }
            this.stringBuffer = JSON.stringify(value, null, 2);
            break;
          case "string":
            const mediaType = ns.getMergedTraits().mediaType;
            let intermediateValue = value;
            if (mediaType) {
              const isJson = mediaType === "application/json" || mediaType.endsWith("+json");
              if (isJson) {
                intermediateValue = LazyJsonString.from(intermediateValue);
              }
              if (ns.getMergedTraits().httpHeader) {
                this.stringBuffer = (this.serdeContext?.base64Encoder ?? toBase64)(intermediateValue.toString());
                return;
              }
            }
            this.stringBuffer = value;
            break;
          default:
            if (ns.isIdempotencyToken()) {
              this.stringBuffer = generateIdempotencyToken();
            } else {
              this.stringBuffer = String(value);
            }
        }
      }
      flush() {
        const buffer = this.stringBuffer;
        this.stringBuffer = "";
        return buffer;
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/serde/HttpInterceptingShapeSerializer.js
var HttpInterceptingShapeSerializer;
var init_HttpInterceptingShapeSerializer = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/serde/HttpInterceptingShapeSerializer.js"() {
    init_schema();
    init_ToStringShapeSerializer();
    HttpInterceptingShapeSerializer = class {
      static {
        __name(this, "HttpInterceptingShapeSerializer");
      }
      codecSerializer;
      stringSerializer;
      buffer;
      constructor(codecSerializer, codecSettings, stringSerializer = new ToStringShapeSerializer(codecSettings)) {
        this.codecSerializer = codecSerializer;
        this.stringSerializer = stringSerializer;
      }
      setSerdeContext(serdeContext) {
        this.codecSerializer.setSerdeContext(serdeContext);
        this.stringSerializer.setSerdeContext(serdeContext);
      }
      write(schema, value) {
        const ns = NormalizedSchema.of(schema);
        const traits = ns.getMergedTraits();
        if (traits.httpHeader || traits.httpLabel || traits.httpQuery) {
          this.stringSerializer.write(ns, value);
          this.buffer = this.stringSerializer.flush();
          return;
        }
        return this.codecSerializer.write(ns, value);
      }
      flush() {
        if (this.buffer !== void 0) {
          const buffer = this.buffer;
          this.buffer = void 0;
          return buffer;
        }
        return this.codecSerializer.flush();
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/protocol-http/extensions/httpExtensionConfiguration.js
var getHttpHandlerExtensionConfiguration, resolveHttpHandlerRuntimeConfig;
var init_httpExtensionConfiguration = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/protocol-http/extensions/httpExtensionConfiguration.js"() {
    getHttpHandlerExtensionConfiguration = /* @__PURE__ */ __name((runtimeConfig) => {
      if (runtimeConfig.logger && runtimeConfig.logger.constructor?.name !== "NoOpLogger") {
        runtimeConfig.requestHandler?.updateHttpClientConfig?.(/* @__PURE__ */ Symbol.for("logger"), runtimeConfig.logger);
      }
      return {
        setHttpHandler(handler2) {
          runtimeConfig.requestHandler = handler2;
        },
        httpHandler() {
          return runtimeConfig.requestHandler;
        },
        updateHttpClientConfig(key, value) {
          runtimeConfig.requestHandler?.updateHttpClientConfig(key, value);
        },
        httpHandlerConfigs() {
          return runtimeConfig.requestHandler.httpHandlerConfigs();
        }
      };
    }, "getHttpHandlerExtensionConfiguration");
    resolveHttpHandlerRuntimeConfig = /* @__PURE__ */ __name((httpHandlerExtensionConfiguration) => {
      return {
        requestHandler: httpHandlerExtensionConfiguration.httpHandler()
      };
    }, "resolveHttpHandlerRuntimeConfig");
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/middleware-content-length/contentLengthMiddleware.js
function contentLengthMiddleware(bodyLengthChecker) {
  return (next) => async (args) => {
    const request = args.request;
    if (HttpRequest.isInstance(request)) {
      const { body, headers } = request;
      if (body && Object.keys(headers).map((str) => str.toLowerCase()).indexOf(CONTENT_LENGTH_HEADER) === -1) {
        try {
          const length = bodyLengthChecker(body);
          if (length != null) {
            request.headers = {
              ...request.headers,
              [CONTENT_LENGTH_HEADER]: String(length)
            };
          }
        } catch (ignored) {
        }
      }
    }
    return next({
      ...args,
      request
    });
  };
}
var CONTENT_LENGTH_HEADER, contentLengthMiddlewareOptions, getContentLengthPlugin;
var init_contentLengthMiddleware = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/middleware-content-length/contentLengthMiddleware.js"() {
    init_transport();
    CONTENT_LENGTH_HEADER = "content-length";
    __name(contentLengthMiddleware, "contentLengthMiddleware");
    contentLengthMiddlewareOptions = {
      step: "build",
      tags: ["SET_CONTENT_LENGTH", "CONTENT_LENGTH"],
      name: "contentLengthMiddleware",
      override: true
    };
    getContentLengthPlugin = /* @__PURE__ */ __name((options) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.add(contentLengthMiddleware(options.bodyLengthChecker), contentLengthMiddlewareOptions);
      }, "applyToStack")
    }), "getContentLengthPlugin");
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/util-uri-escape/escape-uri.js
var escapeUri, hexEncode;
var init_escape_uri = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/util-uri-escape/escape-uri.js"() {
    escapeUri = /* @__PURE__ */ __name((uri) => encodeURIComponent(uri).replace(/[!'()*]/g, hexEncode), "escapeUri");
    hexEncode = /* @__PURE__ */ __name((c6) => `%${c6.charCodeAt(0).toString(16).toUpperCase()}`, "hexEncode");
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/querystring-builder/buildQueryString.js
function buildQueryString(query) {
  const parts = [];
  for (let key of Object.keys(query).sort()) {
    const value = query[key];
    key = escapeUri(key);
    if (Array.isArray(value)) {
      for (let i6 = 0, iLen = value.length; i6 < iLen; i6++) {
        parts.push(`${key}=${escapeUri(value[i6])}`);
      }
    } else {
      let qsEntry = key;
      if (value || typeof value === "string") {
        qsEntry += `=${escapeUri(value)}`;
      }
      parts.push(qsEntry);
    }
  }
  return parts.join("&");
}
var init_buildQueryString = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/querystring-builder/buildQueryString.js"() {
    init_escape_uri();
    __name(buildQueryString, "buildQueryString");
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/ConfigurableSerdeContext.js
var SerdeContextConfig;
var init_ConfigurableSerdeContext = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/ConfigurableSerdeContext.js"() {
    SerdeContextConfig = class {
      static {
        __name(this, "SerdeContextConfig");
      }
      serdeContext;
      setSerdeContext(serdeContext) {
        this.serdeContext = serdeContext;
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/UnionSerde.js
var UnionSerde;
var init_UnionSerde = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/UnionSerde.js"() {
    UnionSerde = class {
      static {
        __name(this, "UnionSerde");
      }
      from;
      to;
      keys;
      constructor(from, to) {
        this.from = from;
        this.to = to;
        const keys = Object.keys(this.from);
        const set = new Set(keys);
        set.delete("__type");
        this.keys = set;
      }
      mark(key) {
        this.keys.delete(key);
      }
      hasUnknown() {
        return this.keys.size === 1 && Object.keys(this.to).length === 0;
      }
      writeUnknown() {
        if (this.hasUnknown()) {
          const k6 = this.keys.values().next().value;
          const v2 = this.from[k6];
          this.to.$unknown = [k6, v2];
        }
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/json/detectBufferParsing.js
function detectBufferParsing() {
  if (canParseBuffer === void 0) {
    try {
      if (typeof Buffer !== "function") {
        canParseBuffer = false;
      } else {
        const result = JSON.parse(Buffer.from([123, 125]));
        canParseBuffer = result !== null && typeof result === "object";
      }
    } catch {
      canParseBuffer = false;
    }
  }
  return canParseBuffer;
}
var canParseBuffer;
var init_detectBufferParsing = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/json/detectBufferParsing.js"() {
    __name(detectBufferParsing, "detectBufferParsing");
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/json/jsonReviver.js
function jsonReviver(key, value, context) {
  if (context?.source) {
    const numericString = context.source;
    if (typeof value === "number") {
      const inSafeRange = value <= Number.MAX_SAFE_INTEGER && value >= Number.MIN_SAFE_INTEGER;
      if (inSafeRange) {
        if (isRepresentable(numericString, value)) {
          return value;
        }
        return new NumericValue(numericString, "bigDecimal");
      } else {
        if (isFractionalBigNumeric(numericString)) {
          return new NumericValue(numericString, "bigDecimal");
        }
        if (/[eE]/.test(numericString)) {
          return expandExponentToBigInt(numericString);
        }
        return BigInt(numericString);
      }
    }
  }
  return value;
}
function isFractionalBigNumeric(s3) {
  const dotIndex = s3.indexOf(".");
  if (dotIndex === -1) {
    return false;
  }
  const eIndex = s3.search(/[eE]/);
  if (eIndex === -1) {
    return true;
  }
  const fracDigits = eIndex - dotIndex - 1;
  const exp = parseInt(s3.slice(eIndex + 1), 10);
  return exp < fracDigits;
}
function isRepresentable(numericString, value) {
  if (numericString === String(value)) {
    return true;
  }
  if (Object.is(value, -0)) {
    return true;
  }
  if (/[eE]/.test(numericString)) {
    return expandToDecimal(numericString) === expandToDecimal(String(value));
  }
  const normalized = numericString.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  const canonical = String(value);
  if (normalized === canonical) {
    return true;
  }
  if (/[eE]/.test(canonical)) {
    return normalized === expandToDecimal(canonical);
  }
  return false;
}
function expandToDecimal(s3) {
  const negative = s3.startsWith("-");
  const abs = negative ? s3.slice(1) : s3;
  const eIndex = abs.search(/[eE]/);
  let result;
  if (eIndex === -1) {
    result = abs;
  } else {
    const exp = parseInt(abs.slice(eIndex + 1), 10);
    const mantissa = abs.slice(0, eIndex);
    const dotIndex = mantissa.indexOf(".");
    let digits;
    let intLen;
    if (dotIndex === -1) {
      digits = mantissa;
      intLen = mantissa.length;
    } else {
      digits = mantissa.slice(0, dotIndex) + mantissa.slice(dotIndex + 1);
      intLen = dotIndex;
    }
    digits = digits.replace(/0+$/, "") || "0";
    const newDotPos = intLen + exp;
    if (digits === "0") {
      result = "0";
    } else if (newDotPos <= 0) {
      result = "0." + "0".repeat(-newDotPos) + digits;
    } else if (newDotPos >= digits.length) {
      result = digits + "0".repeat(newDotPos - digits.length);
    } else {
      result = digits.slice(0, newDotPos) + "." + digits.slice(newDotPos);
    }
  }
  if (result.includes(".")) {
    result = result.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  }
  return (negative ? "-" : "") + result;
}
function expandExponentToBigInt(s3) {
  const eIndex = s3.search(/[eE]/);
  const exp = parseInt(s3.slice(eIndex + 1), 10);
  const negative = s3.startsWith("-");
  const mantissa = s3.slice(negative ? 1 : 0, eIndex);
  const dotIndex = mantissa.indexOf(".");
  let digits;
  let shift;
  if (dotIndex === -1) {
    digits = mantissa;
    shift = exp;
  } else {
    digits = mantissa.slice(0, dotIndex) + mantissa.slice(dotIndex + 1);
    const fracDigits = mantissa.length - dotIndex - 1;
    shift = exp - fracDigits;
  }
  digits = digits.replace(/0+$/, "") || "0";
  const result = BigInt(digits) * 10n ** BigInt(shift + (mantissa.replace(".", "").length - digits.length));
  return negative ? -result : result;
}
var init_jsonReviver = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/json/jsonReviver.js"() {
    init_serde();
    __name(jsonReviver, "jsonReviver");
    __name(isFractionalBigNumeric, "isFractionalBigNumeric");
    __name(isRepresentable, "isRepresentable");
    __name(expandToDecimal, "expandToDecimal");
    __name(expandExponentToBigInt, "expandExponentToBigInt");
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/json/needsReviver.js
function needsReviver(schema) {
  const ns = NormalizedSchema.of(schema);
  const raw = ns.getSchema();
  if (Array.isArray(raw) && ns.isStructSchema()) {
    if (REVIVER_SYMBOL in raw) {
      return raw[REVIVER_SYMBOL];
    }
    const result = _check(ns, /* @__PURE__ */ new Set());
    raw[REVIVER_SYMBOL] = result;
    return result;
  }
  return _check(ns, /* @__PURE__ */ new Set());
}
function _check(ns, seen) {
  const raw = ns.getSchema();
  if (seen.has(raw)) {
    return false;
  }
  seen.add(raw);
  if (ns.isBigIntegerSchema() || ns.isBigDecimalSchema()) {
    return true;
  }
  if (ns.isStructSchema()) {
    for (const [, memberSchema] of ns.structIterator()) {
      if (_check(memberSchema, seen)) {
        return true;
      }
    }
  } else if (ns.isListSchema() || ns.isMapSchema()) {
    if (_check(ns.getValueSchema(), seen)) {
      return true;
    }
  } else if (ns.isDocumentSchema()) {
    return true;
  }
  return false;
}
var REVIVER_SYMBOL;
var init_needsReviver = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/json/needsReviver.js"() {
    init_schema();
    REVIVER_SYMBOL = /* @__PURE__ */ Symbol.for("@aws-sdk/reviver");
    __name(needsReviver, "needsReviver");
    __name(_check, "_check");
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/common.js
var collectBodyString;
var init_common = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/common.js"() {
    init_collect_stream_body();
    init_serde();
    collectBodyString = /* @__PURE__ */ __name((streamBody, context) => collectBody(streamBody, context).then((body) => (context?.utf8Encoder ?? toUtf8)(body)), "collectBodyString");
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/json/parseJsonBody.js
async function parseJsonBody(streamBody, context, schema) {
  let parsingInput;
  if (detectBufferParsing() && typeof streamBody?.[Symbol.asyncIterator] === "function") {
    const buffer = await collectBody(streamBody, context);
    if (typeof Buffer === "function") {
      if (Buffer.isBuffer(buffer)) {
        parsingInput = buffer;
      } else {
        parsingInput = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      }
    }
  }
  if (!parsingInput) {
    parsingInput = await collectBodyString(streamBody, context);
  }
  if (parsingInput.length === 0) {
    return {};
  }
  const reviver = schema && needsReviver(schema) ? jsonReviver : void 0;
  try {
    return JSON.parse(parsingInput, reviver);
  } catch (e6) {
    if (e6?.name === "SyntaxError") {
      Object.defineProperty(e6, "$responseBodyText", {
        value: typeof parsingInput === "string" ? parsingInput : parsingInput.toString("utf8")
      });
    }
    throw e6;
  }
}
var findKey, sanitizeErrorCode, loadRestJsonErrorCode, loadJsonRpcErrorCode, loadErrorCode;
var init_parseJsonBody = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/json/parseJsonBody.js"() {
    init_collect_stream_body();
    init_common();
    init_detectBufferParsing();
    init_jsonReviver();
    init_needsReviver();
    __name(parseJsonBody, "parseJsonBody");
    findKey = /* @__PURE__ */ __name((object, key) => Object.keys(object).find((k6) => k6.toLowerCase() === key.toLowerCase()), "findKey");
    sanitizeErrorCode = /* @__PURE__ */ __name((rawValue) => {
      let cleanValue = rawValue;
      if (typeof cleanValue === "number") {
        cleanValue = cleanValue.toString();
      }
      if (cleanValue.indexOf(",") >= 0) {
        cleanValue = cleanValue.split(",")[0];
      }
      if (cleanValue.indexOf(":") >= 0) {
        cleanValue = cleanValue.split(":")[0];
      }
      if (cleanValue.indexOf("#") >= 0) {
        cleanValue = cleanValue.split("#")[1];
      }
      return cleanValue;
    }, "sanitizeErrorCode");
    loadRestJsonErrorCode = /* @__PURE__ */ __name((output, data) => {
      return loadErrorCode(output, data, ["header", "code", "type"]);
    }, "loadRestJsonErrorCode");
    loadJsonRpcErrorCode = /* @__PURE__ */ __name((output, data, queryCompat = false) => {
      return loadErrorCode(output, data, queryCompat ? ["code", "header", "type"] : ["type", "code", "header"]);
    }, "loadJsonRpcErrorCode");
    loadErrorCode = /* @__PURE__ */ __name(({ headers }, data, order) => {
      while (order.length > 0) {
        const location = order.shift();
        switch (location) {
          case "header":
            const headerKey = findKey(headers ?? {}, "x-amzn-errortype");
            if (headerKey !== void 0) {
              return sanitizeErrorCode(headers[headerKey]);
            }
            break;
          case "code":
            const codeKey = findKey(data ?? {}, "code");
            if (codeKey && data[codeKey] !== void 0) {
              return sanitizeErrorCode(data[codeKey]);
            }
            break;
          case "type":
            if (data?.__type !== void 0) {
              return sanitizeErrorCode(data.__type);
            }
            break;
        }
      }
    }, "loadErrorCode");
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/writeKey.js
function writeKey(obj) {
  Object.defineProperty(obj, "__proto__", { value: void 0, writable: true, enumerable: true, configurable: true });
}
var init_writeKey = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/writeKey.js"() {
    __name(writeKey, "writeKey");
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/json/codec-v2/JsonShapeDeserializer2.js
var JsonShapeDeserializer2;
var init_JsonShapeDeserializer2 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/json/codec-v2/JsonShapeDeserializer2.js"() {
    init_determineTimestampFormat();
    init_schema();
    init_serde();
    init_ConfigurableSerdeContext();
    init_UnionSerde();
    init_detectBufferParsing();
    init_jsonReviver();
    init_needsReviver();
    init_parseJsonBody();
    init_writeKey();
    init_transport();
    JsonShapeDeserializer2 = class extends SerdeContextConfig {
      static {
        __name(this, "JsonShapeDeserializer2");
      }
      settings;
      constructor(settings) {
        super();
        this.settings = settings;
      }
      async read(schema, data) {
        const reviver = needsReviver(schema) ? jsonReviver : void 0;
        let parsed;
        if (typeof data === "string") {
          if (data.length === 0) {
            return {};
          }
          parsed = JSON.parse(data, reviver);
        } else if (data instanceof Uint8Array && detectBufferParsing()) {
          if (data.byteLength === 0) {
            return {};
          }
          const buf = Buffer.isBuffer(data) ? data : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
          parsed = JSON.parse(buf, reviver);
        } else {
          parsed = await parseJsonBody(data, this.serdeContext, schema);
        }
        return this._read(schema, parsed);
      }
      readObject(schema, data) {
        return this._read(schema, data);
      }
      _read(schema, value) {
        const isObject = value !== null && typeof value === "object";
        const ns = NormalizedSchema.of(schema);
        if (isObject) {
          if (ns.isStructSchema()) {
            return this._readStruct(ns, value);
          }
          if (Array.isArray(value) && ns.isListSchema()) {
            const listMember = ns.getValueSchema();
            if (this.needsTransform(listMember)) {
              for (let i6 = 0; i6 < value.length; ++i6) {
                value[i6] = this._read(listMember, value[i6]);
              }
            }
            return value;
          }
          if (ns.isMapSchema()) {
            const mapMember = ns.getValueSchema();
            const map = value;
            if (this.needsTransform(mapMember)) {
              for (const k6 in map) {
                if (!hasOwn(map, k6))
                  continue;
                if (k6 === "__proto__") {
                  writeKey(map);
                }
                map[k6] = this._read(mapMember, map[k6]);
              }
            }
            return map;
          }
        }
        if (ns.isBlobSchema() && typeof value === "string") {
          return fromBase64(value);
        }
        const mediaType = ns.getMergedTraits().mediaType;
        if (ns.isStringSchema() && typeof value === "string" && mediaType) {
          const isJson = mediaType === "application/json" || mediaType.endsWith("+json");
          if (isJson) {
            return LazyJsonString.from(value);
          }
          return value;
        }
        if (ns.isTimestampSchema() && value != null) {
          const format2 = determineTimestampFormat(ns, this.settings);
          switch (format2) {
            case 5:
              return parseRfc3339DateTimeWithOffset(value);
            case 6:
              return parseRfc7231DateTime(value);
            case 7:
              return parseEpochTimestamp(value);
            default:
              console.warn("Missing timestamp format, parsing value with Date constructor:", value);
              return new Date(value);
          }
        }
        if (ns.isBigIntegerSchema() && (typeof value === "number" || typeof value === "string")) {
          return BigInt(value);
        }
        if (ns.isBigDecimalSchema() && value != void 0) {
          if (value instanceof NumericValue) {
            return value;
          }
          const untyped = value;
          if (untyped.type === "bigDecimal" && "string" in untyped) {
            return new NumericValue(untyped.string, untyped.type);
          }
          return new NumericValue(String(value), "bigDecimal");
        }
        if (ns.isNumericSchema() && typeof value === "string") {
          switch (value) {
            case "Infinity":
              return Infinity;
            case "-Infinity":
              return -Infinity;
            case "NaN":
              return NaN;
          }
          return value;
        }
        if (ns.isDocumentSchema()) {
          if (isObject) {
            if (Array.isArray(value)) {
              for (let i6 = 0; i6 < value.length; ++i6) {
                const v2 = value[i6];
                if (!(v2 instanceof NumericValue)) {
                  value[i6] = this._read(ns, v2);
                }
              }
            } else {
              const doc = value;
              for (const k6 in doc) {
                if (!hasOwn(doc, k6))
                  continue;
                if (k6 === "__proto__") {
                  writeKey(doc);
                }
                const v2 = doc[k6];
                if (!(v2 instanceof NumericValue)) {
                  doc[k6] = this._read(ns, v2);
                }
              }
            }
          }
        }
        return value;
      }
      _readStruct(ns, record) {
        const union = ns.isUnionSchema();
        const out = {};
        let nameMap;
        const hasType = typeof record.__type === "string";
        const { jsonName } = this.settings;
        if (jsonName && hasType) {
          nameMap = {};
        }
        let unionSerde;
        if (union) {
          unionSerde = new UnionSerde(record, out);
        }
        for (const [memberName, memberSchema] of ns.structIterator()) {
          let fromKey = memberName;
          if (jsonName) {
            fromKey = memberSchema.getMergedTraits().jsonName ?? fromKey;
            if (hasType) {
              nameMap[fromKey] = memberName;
            }
          }
          if (union) {
            unionSerde.mark(fromKey);
          }
          if (record[fromKey] != null) {
            out[memberName] = this._read(memberSchema, record[fromKey]);
          }
        }
        if (union) {
          unionSerde.writeUnknown();
        } else if (hasType) {
          for (const k6 in record) {
            if (!hasOwn(record, k6))
              continue;
            const v2 = record[k6];
            const t2 = jsonName ? nameMap[k6] ?? k6 : k6;
            if (!(t2 in out)) {
              out[t2] = v2;
            }
          }
        }
        return out;
      }
      needsTransform(ns) {
        if (ns.isBlobSchema() || ns.isTimestampSchema() || ns.isBigIntegerSchema() || ns.isBigDecimalSchema() || ns.isNumericSchema()) {
          return true;
        }
        if (ns.isDocumentSchema() || ns.isStructSchema() || ns.isListSchema() || ns.isMapSchema()) {
          return true;
        }
        if (ns.isStringSchema() && ns.getMergedTraits().mediaType) {
          return true;
        }
        return false;
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/json/codec-v2/JsonBytesStringAdapter.js
var JsonBytesStringAdapter, warned;
var init_JsonBytesStringAdapter = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/json/codec-v2/JsonBytesStringAdapter.js"() {
    init_serde();
    JsonBytesStringAdapter = class _JsonBytesStringAdapter extends Uint8Array {
      static {
        __name(this, "JsonBytesStringAdapter");
      }
      string = null;
      static allocUnsafe(bytes) {
        if (typeof Buffer === "function") {
          const buffer = Buffer.allocUnsafe(bytes);
          return new _JsonBytesStringAdapter(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        }
        return new _JsonBytesStringAdapter(bytes);
      }
      toString() {
        return this.s();
      }
      valueOf() {
        return this.s();
      }
      includes(searchString, position) {
        if (typeof searchString === "string") {
          return this.s().includes(searchString, position);
        }
        return Uint8Array.prototype.includes.call(this, searchString, position);
      }
      indexOf(searchString, position) {
        if (typeof searchString === "string") {
          return this.s().indexOf(searchString, position);
        }
        return Uint8Array.prototype.indexOf.call(this, searchString, position);
      }
      lastIndexOf(searchString, position) {
        if (typeof searchString === "string") {
          return this.s().lastIndexOf(searchString, position);
        }
        const fn = Uint8Array.prototype.lastIndexOf;
        if (position !== void 0) {
          return fn.call(this, searchString, position);
        }
        return fn.call(this, searchString);
      }
      startsWith(searchString, position) {
        return this.s().startsWith(searchString, position);
      }
      endsWith(searchString, endPosition) {
        return this.s().endsWith(searchString, endPosition);
      }
      match(regexp) {
        return this.s().match(regexp);
      }
      replace(searchValue, replaceValue) {
        return this.s().replace(searchValue, replaceValue);
      }
      search(regexp) {
        return this.s().search(regexp);
      }
      split(separator, limit) {
        return this.s().split(separator, limit);
      }
      substring(start, end) {
        return this.s().substring(start, end);
      }
      trim() {
        return this.s().trim();
      }
      trimStart() {
        return this.s().trimStart();
      }
      trimEnd() {
        return this.s().trimEnd();
      }
      charAt(pos) {
        return this.s().charAt(pos);
      }
      charCodeAt(index) {
        return this.s().charCodeAt(index);
      }
      padStart(maxLength, fillString) {
        return this.s().padStart(maxLength, fillString);
      }
      padEnd(maxLength, fillString) {
        return this.s().padEnd(maxLength, fillString);
      }
      repeat(count) {
        return this.s().repeat(count);
      }
      toUpperCase() {
        return this.s().toUpperCase();
      }
      toLowerCase() {
        return this.s().toLowerCase();
      }
      s() {
        if (this.string == null) {
          const n4 = Date.now();
          if (n4 > warned + 6e4) {
            console.warn("@aws-sdk/core/protocols - WARN - JsonCodec2: you have called a string method on a Uint8Array request body. It has been automatically converted to string. In a future version this will throw an error.");
            warned = n4;
          }
          this.string = toUtf8(this);
        }
        return this.string;
      }
    };
    warned = 0;
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/json/codec-v2/JsonShapeSerializer2.js
function alloc(size) {
  return JsonBytesStringAdapter.allocUnsafe(size);
}
var encoder, OPEN_BRACE, CLOSE_BRACE, OPEN_BRACKET, CLOSE_BRACKET, QUOTE, COLON, COMMA, BACKSLASH, TRUE, FALSE, NULL, ESCAPE_TABLE, INITIAL_BUFFER_SIZE, JsonShapeSerializer2;
var init_JsonShapeSerializer2 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/json/codec-v2/JsonShapeSerializer2.js"() {
    init_determineTimestampFormat();
    init_schema();
    init_serde();
    init_ConfigurableSerdeContext();
    init_transport();
    init_JsonBytesStringAdapter();
    encoder = new TextEncoder();
    OPEN_BRACE = 123;
    CLOSE_BRACE = 125;
    OPEN_BRACKET = 91;
    CLOSE_BRACKET = 93;
    QUOTE = 34;
    COLON = 58;
    COMMA = 44;
    BACKSLASH = 92;
    TRUE = new Uint8Array([116, 114, 117, 101]);
    FALSE = new Uint8Array([102, 97, 108, 115, 101]);
    NULL = new Uint8Array([110, 117, 108, 108]);
    ESCAPE_TABLE = new Array(128).fill(null);
    ESCAPE_TABLE[8] = "b";
    ESCAPE_TABLE[9] = "t";
    ESCAPE_TABLE[10] = "n";
    ESCAPE_TABLE[12] = "f";
    ESCAPE_TABLE[13] = "r";
    ESCAPE_TABLE[34] = '"';
    ESCAPE_TABLE[92] = "\\";
    for (let i6 = 0; i6 < 32; i6++) {
      if (ESCAPE_TABLE[i6] === null) {
        ESCAPE_TABLE[i6] = "u00" + i6.toString(16).padStart(2, "0");
      }
    }
    INITIAL_BUFFER_SIZE = 2048;
    __name(alloc, "alloc");
    JsonShapeSerializer2 = class _JsonShapeSerializer2 extends SerdeContextConfig {
      static {
        __name(this, "JsonShapeSerializer2");
      }
      settings;
      json;
      i = 0;
      rootSchema;
      rawValue;
      passthrough = false;
      constructor(settings) {
        super();
        this.settings = settings;
        this.json = alloc(INITIAL_BUFFER_SIZE);
      }
      write(schema, value) {
        this.i = 0;
        this.rawValue = value;
        this.rootSchema = NormalizedSchema.of(schema);
        this.passthrough = this.rootSchema.isBlobSchema() || this.rootSchema.isStringSchema();
        if (!this.passthrough) {
          this.writeValue(this.rootSchema, value, void 0);
        }
      }
      writeDiscriminatedDocument(schema, value) {
        this.i = 0;
        this.rootSchema = NormalizedSchema.of(schema);
        const ns = this.rootSchema;
        if (ns.isStructSchema() && value != null && typeof value === "object") {
          this.writeValue(ns, value, void 0);
          const prefix = `"__type":"${ns.getName(true) ?? "Unknown"}",`;
          const z2 = prefix.length;
          this.ensure(z2);
          this.json.copyWithin(1 + z2, 1, this.i);
          encoder.encodeInto(prefix, this.json.subarray(1));
          this.i += z2;
        } else {
          this.writeValue(ns, value, void 0);
        }
      }
      flush() {
        this.rootSchema = void 0;
        const finalPosition = this.i;
        this.i = 0;
        const raw = this.rawValue;
        this.rawValue = void 0;
        if (finalPosition === 0) {
          return raw;
        }
        const result = this.json.subarray(0, finalPosition);
        this.json = alloc(INITIAL_BUFFER_SIZE);
        return result;
      }
      ensure(byteCount) {
        const { i: i6, json } = this;
        if (i6 + byteCount > json.length) {
          let newSize = json.length * 2;
          while (newSize < i6 + byteCount) {
            newSize *= 2;
          }
          const next = alloc(newSize);
          next.set(this.json);
          this.json = next;
        }
      }
      writeAscii(s3) {
        const z2 = s3.length;
        this.ensure(z2);
        let { i: i6, json } = this;
        for (let j6 = 0; j6 < z2; ++j6) {
          json[i6] = s3.charCodeAt(j6);
          i6 += 1;
        }
        this.i = i6;
      }
      writeAsciiQuoted(s3) {
        const z2 = s3.length;
        this.ensure(z2 + 4);
        let { json, i: i6 } = this;
        json[i6++] = QUOTE;
        for (let j6 = 0; j6 < z2; ++j6) {
          json[i6++] = s3.charCodeAt(j6);
        }
        json[i6++] = QUOTE;
        this.i = i6;
      }
      writeJsonString(s3) {
        const z2 = s3.length;
        this.ensure(z2 * 3 + 2);
        this.json[this.i++] = QUOTE;
        for (let j6 = 0; j6 < z2; ++j6) {
          const c6 = s3.charCodeAt(j6);
          if (c6 > 34 && c6 < 92) {
            this.json[this.i++] = c6;
          } else if (c6 < 128) {
            const esc = ESCAPE_TABLE[c6];
            if (esc !== null) {
              this.ensure(esc.length + 1 + (z2 - j6 - 1) * 3 + 1);
              this.json[this.i++] = BACKSLASH;
              for (let k6 = 0; k6 < esc.length; k6++) {
                this.json[this.i++] = esc.charCodeAt(k6);
              }
            } else {
              this.json[this.i++] = c6;
            }
          } else if (c6 >= 55296 && c6 <= 56319) {
            const next = j6 + 1 < z2 ? s3.charCodeAt(j6 + 1) : 0;
            if (next >= 56320 && next <= 57343) {
              this.ensure(4);
              const { written } = encoder.encodeInto(s3.substring(j6, j6 + 2), this.json.subarray(this.i));
              this.i += written;
              ++j6;
            } else {
              this.ensure(6 + (z2 - j6 - 1) * 3 + 1);
              this.writeUnicodeEscape(c6);
            }
          } else if (c6 >= 56320 && c6 <= 57343) {
            this.ensure(6 + (z2 - j6 - 1) * 3 + 1);
            this.writeUnicodeEscape(c6);
          } else {
            let { i: i6, json } = this;
            if (c6 < 2048) {
              json[i6++] = 192 | c6 >> 6;
              json[i6++] = 128 | c6 & 63;
            } else {
              json[i6++] = 224 | c6 >> 12;
              json[i6++] = 128 | c6 >> 6 & 63;
              json[i6++] = 128 | c6 & 63;
            }
            this.i = i6;
          }
        }
        this.json[this.i++] = QUOTE;
      }
      writeUnicodeEscape(code) {
        let { json, i: i6 } = this;
        json[i6++] = BACKSLASH;
        json[i6++] = 117;
        const hex = code.toString(16).padStart(4, "0");
        for (let j6 = 0; j6 < 4; ++j6) {
          json[i6++] = hex.charCodeAt(j6);
        }
        this.i = i6;
      }
      static B64 = (() => {
        const chars2 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        const table = new Uint8Array(64);
        for (let i6 = 0; i6 < 64; ++i6) {
          table[i6] = chars2.charCodeAt(i6);
        }
        return table;
      })();
      writeBase64(data) {
        const b64Len = Math.ceil(data.length / 3) * 4;
        this.ensure(b64Len + 2);
        const json = this.json;
        const B64 = _JsonShapeSerializer2.B64;
        let i6 = this.i;
        json[i6++] = QUOTE;
        const len = data.length;
        const remainder = len % 3;
        const mainLen = len - remainder;
        for (let j6 = 0; j6 < mainLen; j6 += 3) {
          const a6 = data[j6];
          const b6 = data[j6 + 1];
          const c6 = data[j6 + 2];
          json[i6++] = B64[a6 >> 2];
          json[i6++] = B64[(a6 & 3) << 4 | b6 >> 4];
          json[i6++] = B64[(b6 & 15) << 2 | c6 >> 6];
          json[i6++] = B64[c6 & 63];
        }
        if (remainder === 2) {
          const a6 = data[mainLen];
          const b6 = data[mainLen + 1];
          json[i6++] = B64[a6 >> 2];
          json[i6++] = B64[(a6 & 3) << 4 | b6 >> 4];
          json[i6++] = B64[(b6 & 15) << 2];
          json[i6++] = 61;
        } else if (remainder === 1) {
          const a6 = data[mainLen];
          json[i6++] = B64[a6 >> 2];
          json[i6++] = B64[(a6 & 3) << 4];
          json[i6++] = 61;
          json[i6++] = 61;
        }
        json[i6++] = QUOTE;
        this.i = i6;
      }
      writeValue(schema, value, container) {
        if (value == null) {
          if (container?.isStructSchema()) {
            if (value === void 0) {
              const ns2 = NormalizedSchema.of(schema);
              if (ns2.isIdempotencyToken()) {
                this.writeAsciiQuoted(generateIdempotencyToken());
                return;
              }
            }
            return;
          }
          this.ensure(4);
          this.json.set(NULL, this.i);
          this.i += 4;
          return;
        }
        const ns = NormalizedSchema.of(schema);
        const isObject = typeof value === "object";
        if (ns.isStringSchema()) {
          const mediaType = ns.getMergedTraits().mediaType;
          if (mediaType) {
            const isJson = mediaType === "application/json" || mediaType.endsWith("+json");
            if (isJson) {
              this.writeJsonString(LazyJsonString.from(value).toString());
              return;
            }
          }
        }
        if (this.settings.bigNumberAsString && value != null && (ns.isBigIntegerSchema() || ns.isBigDecimalSchema())) {
          const asString = value instanceof NumericValue ? value.string : String(value);
          this.writeAsciiQuoted(asString);
          return;
        }
        if (isObject) {
          if (ns.isStructSchema()) {
            this.writeStruct(ns, value);
            return;
          }
          if (Array.isArray(value) && (ns.isListSchema() || ns.isDocumentSchema())) {
            this.writeList(ns, value, ns.isDocumentSchema());
            return;
          }
          if (ns.isMapSchema()) {
            this.writeMap(ns, value, false);
            return;
          }
          if (value instanceof Uint8Array && (ns.isBlobSchema() || ns.isDocumentSchema())) {
            this.writeBase64(value);
            return;
          }
          if (value instanceof Date && (ns.isTimestampSchema() || ns.isDocumentSchema())) {
            this.writeTimestamp(ns, value);
            return;
          }
          if (value instanceof NumericValue) {
            this.writeAscii(value.string);
            return;
          }
          if (ns.isDocumentSchema()) {
            if (Array.isArray(value)) {
              this.writeList(ns, value, true);
            } else {
              this.writeMap(ns, value, true);
            }
            return;
          }
          const json = JSON.stringify(value);
          this.writeAscii(json);
          return;
        }
        if (typeof value === "string") {
          if (ns.isBlobSchema()) {
            const b64 = (this.serdeContext?.base64Encoder ?? toBase64)(value);
            this.writeAsciiQuoted(b64);
            return;
          }
          this.writeJsonString(value);
          return;
        }
        if (typeof value === "number") {
          if (Math.abs(value) === Infinity || Number.isNaN(value)) {
            this.writeAsciiQuoted(String(value));
            return;
          }
          const numStr = String(value);
          this.writeAscii(numStr);
          return;
        }
        if (typeof value === "boolean") {
          this.ensure(5);
          let { i: i6, json } = this;
          if (value) {
            json.set(TRUE, i6);
            i6 += 4;
          } else {
            json.set(FALSE, i6);
            i6 += 5;
          }
          this.i = i6;
          return;
        }
        if (typeof value === "bigint") {
          this.writeAscii(value.toString());
          return;
        }
        this.writeAscii(String(value));
      }
      writeStruct(ns, value) {
        this.ensure(2);
        this.json[this.i++] = OPEN_BRACE;
        let wroteAny = false;
        const hasType = typeof value.__type === "string";
        let writtenKeys;
        if (hasType) {
          writtenKeys = /* @__PURE__ */ new Set();
        }
        for (const [memberName, memberSchema] of ns.structIterator()) {
          const item = value[memberName];
          if (item == null && !memberSchema.isIdempotencyToken()) {
            continue;
          }
          if (wroteAny) {
            this.ensure(1);
            this.json[this.i++] = COMMA;
          }
          wroteAny = true;
          const targetKey = this.settings.jsonName ? memberSchema.getMergedTraits().jsonName ?? memberName : memberName;
          if (writtenKeys) {
            writtenKeys.add(memberName);
            writtenKeys.add(targetKey);
          }
          this.writeAsciiQuoted(targetKey);
          this.json[this.i++] = COLON;
          this.writeValue(memberSchema, item, ns);
        }
        if (!wroteAny && ns.isUnionSchema()) {
          const { $unknown } = value;
          if (Array.isArray($unknown)) {
            const [k6, v2] = $unknown;
            this.writeAsciiQuoted(k6);
            this.ensure(1);
            this.json[this.i++] = COLON;
            this.writeValue(15, v2, ns);
          }
        } else if (hasType) {
          for (const k6 in value) {
            if (writtenKeys.has(k6)) {
              continue;
            }
            writtenKeys.add(k6);
            const v2 = value[k6];
            if (wroteAny) {
              this.ensure(1);
              this.json[this.i++] = COMMA;
            }
            wroteAny = true;
            this.writeAsciiQuoted(k6);
            this.ensure(1);
            this.json[this.i++] = COLON;
            this.writeValue(15, v2, void 0);
          }
        }
        this.ensure(1);
        this.json[this.i++] = CLOSE_BRACE;
      }
      writeList(ns, value, isDocument) {
        const sparse = !!ns.getMergedTraits().sparse;
        const valueSchema = ns.getValueSchema();
        if (!isDocument) {
          if (valueSchema.isStringSchema() || valueSchema.isNumericSchema() || valueSchema.isBooleanSchema()) {
            let hasSpecials = false;
            for (let i6 = 0; i6 < value.length; ++i6) {
              const v2 = value[i6];
              if (Number.isNaN(v2) || v2 === Infinity || v2 === -Infinity || v2 == null && !sparse) {
                hasSpecials = true;
                break;
              }
            }
            let json;
            if (!hasSpecials) {
              json = JSON.stringify(value);
            } else {
              const out = [];
              for (let i6 = 0; i6 < value.length; ++i6) {
                const v2 = value[i6];
                if (v2 == null && !sparse)
                  continue;
                if (Number.isNaN(v2) || v2 === Infinity || v2 === -Infinity) {
                  out.push(String(v2));
                } else {
                  out.push(v2);
                }
              }
              json = JSON.stringify(out);
            }
            this.ensure(json.length * 3);
            this.i += encoder.encodeInto(json, this.json.subarray(this.i)).written;
            return;
          }
        }
        this.ensure(2);
        this.json[this.i++] = OPEN_BRACKET;
        let wroteFirstItem = false;
        for (let i6 = 0; i6 < value.length; ++i6) {
          const item = value[i6];
          if (isDocument ? item === void 0 : item == null && !sparse) {
            continue;
          }
          if (wroteFirstItem) {
            this.ensure(1);
            this.json[this.i++] = COMMA;
          }
          this.writeValue(valueSchema, item, void 0);
          wroteFirstItem = true;
        }
        this.ensure(1);
        this.json[this.i++] = CLOSE_BRACKET;
      }
      writeMap(ns, value, isDocument) {
        const sparse = !!ns.getMergedTraits().sparse;
        const valueSchema = ns.getValueSchema();
        if (!isDocument) {
          if (valueSchema.isStringSchema() || valueSchema.isNumericSchema() || valueSchema.isBooleanSchema()) {
            let modifications;
            for (const k6 in value) {
              if (!hasOwn(value, k6))
                continue;
              const v2 = value[k6];
              if (Number.isNaN(v2) || v2 === Infinity || v2 === -Infinity) {
                (modifications ??= {})[k6] = v2;
                value[k6] = String(v2);
              } else if (v2 === null && !sparse) {
                (modifications ??= {})[k6] = null;
                value[k6] = void 0;
              }
            }
            const json = JSON.stringify(value);
            if (modifications) {
              Object.assign(value, modifications);
            }
            this.ensure(json.length * 3);
            this.i += encoder.encodeInto(json, this.json.subarray(this.i)).written;
            return;
          }
        }
        this.ensure(2);
        this.json[this.i++] = OPEN_BRACE;
        let first = true;
        for (const k6 in value) {
          if (!hasOwn(value, k6))
            continue;
          const v2 = value[k6];
          if (isDocument ? v2 === void 0 : v2 == null && !sparse) {
            continue;
          }
          if (!first) {
            this.ensure(1);
            this.json[this.i++] = COMMA;
          }
          first = false;
          this.writeJsonString(k6);
          this.ensure(1);
          this.json[this.i++] = COLON;
          this.writeValue(valueSchema, v2, void 0);
        }
        this.ensure(1);
        this.json[this.i++] = CLOSE_BRACE;
      }
      writeTimestamp(ns, value) {
        const format2 = determineTimestampFormat(ns, this.settings);
        switch (format2) {
          case 5: {
            const iso = value.toISOString().replace(".000Z", "Z");
            this.writeAsciiQuoted(iso);
            return;
          }
          case 6: {
            this.writeAsciiQuoted(dateToUtcString(value));
            return;
          }
          case 7: {
            const epochSecs = String(value.getTime() / 1e3);
            this.writeAscii(epochSecs);
            return;
          }
          default: {
            const epochSecs = String(value.getTime() / 1e3);
            this.writeAscii(epochSecs);
            return;
          }
        }
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/json/codec-v2/JsonCodec2.js
var JsonCodec2;
var init_JsonCodec2 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/json/codec-v2/JsonCodec2.js"() {
    init_ConfigurableSerdeContext();
    init_JsonShapeDeserializer2();
    init_JsonShapeSerializer2();
    JsonCodec2 = class extends SerdeContextConfig {
      static {
        __name(this, "JsonCodec2");
      }
      settings;
      constructor(settings) {
        super();
        this.settings = settings;
      }
      createSerializer() {
        const serializer = new JsonShapeSerializer2(this.settings);
        serializer.setSerdeContext(this.serdeContext);
        return serializer;
      }
      createDeserializer() {
        const deserializer = new JsonShapeDeserializer2(this.settings);
        deserializer.setSerdeContext(this.serdeContext);
        return deserializer;
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/protocols/index.js
var init_protocols = __esm({
  "node_modules/@smithy/core/dist-es/submodules/protocols/index.js"() {
    init_collect_stream_body();
    init_extended_encode_uri_component();
    init_HttpBindingProtocol();
    init_RpcProtocol();
    init_FromStringShapeDeserializer();
    init_HttpInterceptingShapeDeserializer();
    init_HttpInterceptingShapeSerializer();
    init_determineTimestampFormat();
    init_transport();
    init_transport();
    init_httpExtensionConfiguration();
    init_contentLengthMiddleware();
    init_escape_uri();
    init_buildQueryString();
    init_transport();
    init_parseJsonBody();
    init_JsonCodec2();
    init_JsonShapeSerializer2();
    init_JsonShapeDeserializer2();
  }
});

// node_modules/@smithy/core/dist-es/submodules/retry/service-error-classification/constants.js
var THROTTLING_ERROR_CODES, TRANSIENT_ERROR_CODES, TRANSIENT_ERROR_STATUS_CODES, NODEJS_TIMEOUT_ERROR_CODES, NODEJS_NETWORK_ERROR_CODES;
var init_constants3 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/retry/service-error-classification/constants.js"() {
    THROTTLING_ERROR_CODES = [
      "BandwidthLimitExceeded",
      "EC2ThrottledException",
      "LimitExceededException",
      "PriorRequestNotComplete",
      "ProvisionedThroughputExceededException",
      "RequestLimitExceeded",
      "RequestThrottled",
      "RequestThrottledException",
      "SlowDown",
      "ThrottledException",
      "Throttling",
      "ThrottlingException",
      "TooManyRequestsException",
      "TransactionInProgressException"
    ];
    TRANSIENT_ERROR_CODES = ["TimeoutError", "RequestTimeout", "RequestTimeoutException"];
    TRANSIENT_ERROR_STATUS_CODES = [500, 502, 503, 504];
    NODEJS_TIMEOUT_ERROR_CODES = ["ECONNRESET", "ECONNREFUSED", "EPIPE", "ETIMEDOUT"];
    NODEJS_NETWORK_ERROR_CODES = ["EHOSTUNREACH", "ENETUNREACH", "ENOTFOUND", "EAI_AGAIN"];
  }
});

// node_modules/@smithy/core/dist-es/submodules/retry/service-error-classification/service-error-classification.js
function isNodeJsHttp2TransientError(error) {
  return error.code === "ERR_HTTP2_STREAM_ERROR" && error.message.includes("NGHTTP2_REFUSED_STREAM");
}
var isRetryableByTrait, isClockSkewCorrectedError, isBrowserNetworkError, isThrottlingError, isTransientError, isServerError;
var init_service_error_classification = __esm({
  "node_modules/@smithy/core/dist-es/submodules/retry/service-error-classification/service-error-classification.js"() {
    init_constants3();
    isRetryableByTrait = /* @__PURE__ */ __name((error) => error?.$retryable !== void 0, "isRetryableByTrait");
    isClockSkewCorrectedError = /* @__PURE__ */ __name((error) => error.$metadata?.clockSkewCorrected, "isClockSkewCorrectedError");
    isBrowserNetworkError = /* @__PURE__ */ __name((error) => {
      const errorMessages = /* @__PURE__ */ new Set([
        "Failed to fetch",
        "NetworkError when attempting to fetch resource",
        "The Internet connection appears to be offline",
        "Load failed",
        "Network request failed"
      ]);
      const isValid = error && error instanceof TypeError;
      if (!isValid) {
        return false;
      }
      return errorMessages.has(error.message);
    }, "isBrowserNetworkError");
    isThrottlingError = /* @__PURE__ */ __name((error) => error.$metadata?.httpStatusCode === 429 || THROTTLING_ERROR_CODES.includes(error.name) || error.$retryable?.throttling == true, "isThrottlingError");
    isTransientError = /* @__PURE__ */ __name((error, depth = 0) => error?.name !== "AbortError" && (isRetryableByTrait(error) || isClockSkewCorrectedError(error) || error.name === "InvalidSignatureException" && error.message?.includes("Signature expired") || TRANSIENT_ERROR_CODES.includes(error.name) || NODEJS_TIMEOUT_ERROR_CODES.includes(error?.code || "") || NODEJS_NETWORK_ERROR_CODES.includes(error?.code || "") || TRANSIENT_ERROR_STATUS_CODES.includes(error.$metadata?.httpStatusCode || 0) || isBrowserNetworkError(error) || isNodeJsHttp2TransientError(error) || error.cause !== void 0 && depth <= 10 && isTransientError(error.cause, depth + 1)), "isTransientError");
    isServerError = /* @__PURE__ */ __name((error) => {
      if (error.$metadata?.httpStatusCode !== void 0) {
        const statusCode = error.$metadata.httpStatusCode;
        if (500 <= statusCode && statusCode <= 599 && !isTransientError(error)) {
          return true;
        }
        return false;
      }
      return false;
    }, "isServerError");
    __name(isNodeJsHttp2TransientError, "isNodeJsHttp2TransientError");
  }
});

// node_modules/@smithy/core/dist-es/submodules/retry/util-retry/constants.js
var MAXIMUM_RETRY_DELAY, INITIAL_RETRY_TOKENS, NO_RETRY_INCREMENT, INVOCATION_ID_HEADER, REQUEST_HEADER;
var init_constants4 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/retry/util-retry/constants.js"() {
    MAXIMUM_RETRY_DELAY = 20 * 1e3;
    INITIAL_RETRY_TOKENS = 500;
    NO_RETRY_INCREMENT = 1;
    INVOCATION_ID_HEADER = "amz-sdk-invocation-id";
    REQUEST_HEADER = "amz-sdk-request";
  }
});

// node_modules/@smithy/core/dist-es/submodules/retry/middleware-retry/parseRetryAfterHeader.js
function parseRetryAfterHeader(response, logger2) {
  if (!HttpResponse.isInstance(response)) {
    return;
  }
  for (const header in response.headers) {
    if (!hasOwn(response.headers, header))
      continue;
    const h6 = header.toLowerCase();
    if (h6 === "retry-after") {
      const retryAfter = response.headers[header];
      let retryAfterSeconds = NaN;
      if (retryAfter.endsWith("GMT")) {
        try {
          const date2 = parseRfc7231DateTime(retryAfter);
          retryAfterSeconds = (date2.getTime() - Date.now()) / 1e3;
        } catch (e6) {
          logger2?.trace?.("Failed to parse retry-after header");
          logger2?.trace?.(e6);
        }
      } else if (retryAfter.match(/ GMT, ((\d+)|(\d+\.\d+))$/)) {
        retryAfterSeconds = Number(retryAfter.match(/ GMT, ([\d.]+)$/)?.[1]);
      } else if (retryAfter.match(/^((\d+)|(\d+\.\d+))$/)) {
        retryAfterSeconds = Number(retryAfter);
      } else if (Date.parse(retryAfter) >= Date.now()) {
        retryAfterSeconds = (Date.parse(retryAfter) - Date.now()) / 1e3;
      }
      if (isNaN(retryAfterSeconds)) {
        return;
      }
      return new Date(Date.now() + retryAfterSeconds * 1e3);
    } else if (h6 === "x-amz-retry-after") {
      const v2 = response.headers[header];
      const backoffMilliseconds = Number(v2);
      if (isNaN(backoffMilliseconds)) {
        logger2?.trace?.(`Failed to parse x-amz-retry-after=${v2}`);
        return;
      }
      return new Date(Date.now() + backoffMilliseconds);
    }
  }
}
var init_parseRetryAfterHeader = __esm({
  "node_modules/@smithy/core/dist-es/submodules/retry/middleware-retry/parseRetryAfterHeader.js"() {
    init_transport();
    init_protocols();
    init_serde();
    __name(parseRetryAfterHeader, "parseRetryAfterHeader");
  }
});

// node_modules/@smithy/core/dist-es/submodules/retry/middleware-retry/util.js
var asSdkError;
var init_util = __esm({
  "node_modules/@smithy/core/dist-es/submodules/retry/middleware-retry/util.js"() {
    asSdkError = /* @__PURE__ */ __name((error) => {
      if (error instanceof Error)
        return error;
      if (error instanceof Object)
        return Object.assign(new Error(), error);
      if (typeof error === "string")
        return new Error(error);
      return new Error(`AWS SDK error wrapper for ${error}`);
    }, "asSdkError");
  }
});

// node_modules/@smithy/core/dist-es/submodules/retry/middleware-retry/retryMiddleware.js
function bindRetryMiddleware(isStreamingPayload2) {
  return (options) => (next, context) => async (args) => {
    let retryStrategy = await options.retryStrategy();
    const maxAttempts = await options.maxAttempts();
    if (isRetryStrategyV2(retryStrategy)) {
      retryStrategy = retryStrategy;
      let retryToken = await retryStrategy.acquireInitialRetryToken((context["partition_id"] ?? "") + (context.__retryLongPoll ? ":longpoll" : ""));
      let lastError = new Error();
      let attempts = 0;
      let totalRetryDelay = 0;
      const { request } = args;
      const isRequest = HttpRequest.isInstance(request);
      if (isRequest) {
        request.headers[INVOCATION_ID_HEADER] = v4();
      }
      while (true) {
        try {
          if (isRequest) {
            request.headers[REQUEST_HEADER] = `attempt=${attempts + 1}; max=${maxAttempts}`;
          }
          const { response, output } = await next(args);
          retryStrategy.recordSuccess(retryToken);
          output.$metadata.attempts = attempts + 1;
          output.$metadata.totalRetryDelay = totalRetryDelay;
          return { response, output };
        } catch (e6) {
          const retryErrorInfo = getRetryErrorInfo(e6, options.logger);
          lastError = asSdkError(e6);
          if (isRequest && isStreamingPayload2(request)) {
            (context.logger instanceof NoOpLogger ? console : context.logger)?.warn("An error was encountered in a non-retryable streaming request.");
            throw lastError;
          }
          try {
            retryToken = await retryStrategy.refreshRetryTokenForRetry(retryToken, retryErrorInfo);
          } catch (ignoredRefreshError) {
            if (!lastError.$metadata) {
              lastError.$metadata = {};
            }
            lastError.$metadata.attempts = attempts + 1;
            lastError.$metadata.totalRetryDelay = totalRetryDelay;
            throw lastError;
          }
          attempts = retryToken.getRetryCount();
          const delay = retryToken.getRetryDelay();
          totalRetryDelay += (retryToken?.$retryLog?.acquisitionDelay ?? 0) + delay;
          if (delay > 0) {
            await cooldown(delay);
          }
        }
      }
    } else {
      retryStrategy = retryStrategy;
      if (retryStrategy?.mode) {
        context.userAgent = [...context.userAgent || [], ["cfg/retry-mode", retryStrategy.mode]];
      }
      return retryStrategy.retry(next, args);
    }
  };
}
function bindGetRetryPlugin(isStreamingPayload2) {
  const retryMiddleware2 = bindRetryMiddleware(isStreamingPayload2);
  return (options) => ({
    applyToStack: /* @__PURE__ */ __name((clientStack) => {
      clientStack.add(retryMiddleware2(options), retryMiddlewareOptions);
    }, "applyToStack")
  });
}
var cooldown, isRetryStrategyV2, getRetryErrorInfo, getRetryErrorType, retryMiddlewareOptions;
var init_retryMiddleware = __esm({
  "node_modules/@smithy/core/dist-es/submodules/retry/middleware-retry/retryMiddleware.js"() {
    init_client2();
    init_protocols();
    init_serde();
    init_service_error_classification();
    init_constants4();
    init_parseRetryAfterHeader();
    init_util();
    __name(bindRetryMiddleware, "bindRetryMiddleware");
    cooldown = /* @__PURE__ */ __name((ms) => new Promise((resolve) => setTimeout(resolve, ms)), "cooldown");
    isRetryStrategyV2 = /* @__PURE__ */ __name((retryStrategy) => typeof retryStrategy.acquireInitialRetryToken !== "undefined" && typeof retryStrategy.refreshRetryTokenForRetry !== "undefined" && typeof retryStrategy.recordSuccess !== "undefined", "isRetryStrategyV2");
    getRetryErrorInfo = /* @__PURE__ */ __name((error, logger2) => {
      const errorInfo = {
        error,
        errorType: getRetryErrorType(error)
      };
      const retryAfterHint = parseRetryAfterHeader(error.$response, logger2);
      if (retryAfterHint) {
        errorInfo.retryAfterHint = retryAfterHint;
      }
      return errorInfo;
    }, "getRetryErrorInfo");
    getRetryErrorType = /* @__PURE__ */ __name((error) => {
      if (isThrottlingError(error))
        return "THROTTLING";
      if (isTransientError(error))
        return "TRANSIENT";
      if (isServerError(error))
        return "SERVER_ERROR";
      return "CLIENT_ERROR";
    }, "getRetryErrorType");
    retryMiddlewareOptions = {
      name: "retryMiddleware",
      tags: ["RETRY"],
      step: "finalizeRequest",
      priority: "high",
      override: true
    };
    __name(bindGetRetryPlugin, "bindGetRetryPlugin");
  }
});

// node_modules/@smithy/core/dist-es/submodules/retry/util-retry/DefaultRateLimiter.js
var DefaultRateLimiter;
var init_DefaultRateLimiter = __esm({
  "node_modules/@smithy/core/dist-es/submodules/retry/util-retry/DefaultRateLimiter.js"() {
    init_service_error_classification();
    DefaultRateLimiter = class _DefaultRateLimiter {
      static {
        __name(this, "DefaultRateLimiter");
      }
      static setTimeoutFn = /* @__PURE__ */ __name((fn, delay) => setTimeout(fn, delay), "setTimeoutFn");
      beta;
      minCapacity;
      minFillRate;
      scaleConstant;
      smooth;
      enabled = false;
      availableTokens = 0;
      lastMaxRate = 0;
      measuredTxRate = 0;
      requestCount = 0;
      fillRate;
      lastThrottleTime;
      lastTimestamp = 0;
      lastTxRateBucket;
      maxCapacity;
      timeWindow = 0;
      constructor(options) {
        this.beta = options?.beta ?? 0.7;
        this.minCapacity = options?.minCapacity ?? 1;
        this.minFillRate = options?.minFillRate ?? 0.5;
        this.scaleConstant = options?.scaleConstant ?? 0.4;
        this.smooth = options?.smooth ?? 0.8;
        this.lastThrottleTime = this.getCurrentTimeInSeconds();
        this.lastTxRateBucket = Math.floor(this.getCurrentTimeInSeconds());
        this.fillRate = this.minFillRate;
        this.maxCapacity = this.minCapacity;
      }
      async getSendToken() {
        return this.acquireTokenBucket(1);
      }
      updateClientSendingRate(response) {
        let calculatedRate;
        this.updateMeasuredRate();
        const retryErrorInfo = response;
        const isThrottling = retryErrorInfo?.errorType === "THROTTLING" || isThrottlingError(retryErrorInfo?.error ?? response);
        if (isThrottling) {
          const rateToUse = !this.enabled ? this.measuredTxRate : Math.min(this.measuredTxRate, this.fillRate);
          this.lastMaxRate = rateToUse;
          this.calculateTimeWindow();
          this.lastThrottleTime = this.getCurrentTimeInSeconds();
          calculatedRate = this.cubicThrottle(rateToUse);
          this.enableTokenBucket();
        } else {
          this.calculateTimeWindow();
          calculatedRate = this.cubicSuccess(this.getCurrentTimeInSeconds());
        }
        const newRate = Math.min(calculatedRate, 2 * this.measuredTxRate);
        this.updateTokenBucketRate(newRate);
      }
      getCurrentTimeInSeconds() {
        return Date.now() / 1e3;
      }
      async acquireTokenBucket(amount) {
        if (!this.enabled) {
          return;
        }
        this.refillTokenBucket();
        while (amount > this.availableTokens) {
          const delay = (amount - this.availableTokens) / this.fillRate * 1e3;
          await new Promise((resolve) => _DefaultRateLimiter.setTimeoutFn(resolve, delay));
          this.refillTokenBucket();
        }
        this.availableTokens = this.availableTokens - amount;
      }
      refillTokenBucket() {
        const timestamp = this.getCurrentTimeInSeconds();
        if (!this.lastTimestamp) {
          this.lastTimestamp = timestamp;
          return;
        }
        const fillAmount = (timestamp - this.lastTimestamp) * this.fillRate;
        this.availableTokens = Math.min(this.maxCapacity, this.availableTokens + fillAmount);
        this.lastTimestamp = timestamp;
      }
      calculateTimeWindow() {
        this.timeWindow = this.getPrecise(Math.pow(this.lastMaxRate * (1 - this.beta) / this.scaleConstant, 1 / 3));
      }
      cubicThrottle(rateToUse) {
        return this.getPrecise(rateToUse * this.beta);
      }
      cubicSuccess(timestamp) {
        return this.getPrecise(this.scaleConstant * Math.pow(timestamp - this.lastThrottleTime - this.timeWindow, 3) + this.lastMaxRate);
      }
      enableTokenBucket() {
        this.enabled = true;
      }
      updateTokenBucketRate(newRate) {
        this.refillTokenBucket();
        this.fillRate = Math.max(newRate, this.minFillRate);
        this.maxCapacity = Math.max(newRate, this.minCapacity);
        this.availableTokens = Math.min(this.availableTokens, this.maxCapacity);
      }
      updateMeasuredRate() {
        const t2 = this.getCurrentTimeInSeconds();
        const timeBucket = Math.floor(t2 * 2) / 2;
        this.requestCount++;
        if (timeBucket > this.lastTxRateBucket) {
          const currentRate = this.requestCount / (timeBucket - this.lastTxRateBucket);
          this.measuredTxRate = this.getPrecise(currentRate * this.smooth + this.measuredTxRate * (1 - this.smooth));
          this.requestCount = 0;
          this.lastTxRateBucket = timeBucket;
        }
      }
      getPrecise(num) {
        return parseFloat(num.toFixed(8));
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/retry/util-retry/retries-2026-config.js
var Retry;
var init_retries_2026_config = __esm({
  "node_modules/@smithy/core/dist-es/submodules/retry/util-retry/retries-2026-config.js"() {
    Retry = class _Retry {
      static {
        __name(this, "Retry");
      }
      static v2026 = typeof process !== "undefined" && process.env?.SMITHY_NEW_RETRIES_2026 === "true";
      static delay() {
        return _Retry.v2026 ? 50 : 100;
      }
      static throttlingDelay() {
        return _Retry.v2026 ? 1e3 : 500;
      }
      static cost() {
        return _Retry.v2026 ? 14 : 5;
      }
      static throttlingCost() {
        return _Retry.v2026 ? 5 : 10;
      }
      static modifiedCostType() {
        return _Retry.v2026 ? "THROTTLING" : "TRANSIENT";
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/retry/util-retry/DefaultRetryBackoffStrategy.js
var DefaultRetryBackoffStrategy;
var init_DefaultRetryBackoffStrategy = __esm({
  "node_modules/@smithy/core/dist-es/submodules/retry/util-retry/DefaultRetryBackoffStrategy.js"() {
    init_constants4();
    init_retries_2026_config();
    DefaultRetryBackoffStrategy = class {
      static {
        __name(this, "DefaultRetryBackoffStrategy");
      }
      x = Retry.delay();
      computeNextBackoffDelay(i6) {
        const b6 = Math.random();
        const r6 = 2;
        const t_i = b6 * Math.min(this.x * r6 ** i6, MAXIMUM_RETRY_DELAY);
        return Math.floor(t_i);
      }
      setDelayBase(delay) {
        this.x = delay;
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/retry/util-retry/DefaultRetryToken.js
var DefaultRetryToken;
var init_DefaultRetryToken = __esm({
  "node_modules/@smithy/core/dist-es/submodules/retry/util-retry/DefaultRetryToken.js"() {
    init_constants4();
    DefaultRetryToken = class {
      static {
        __name(this, "DefaultRetryToken");
      }
      delay;
      count;
      cost;
      longPoll;
      $retryLog = {
        acquisitionDelay: 0
      };
      constructor(delay, count, cost, longPoll) {
        this.delay = delay;
        this.count = count;
        this.cost = cost;
        this.longPoll = longPoll;
      }
      getRetryCount() {
        return this.count;
      }
      getRetryDelay() {
        return Math.min(MAXIMUM_RETRY_DELAY, this.delay);
      }
      getRetryCost() {
        return this.cost;
      }
      isLongPoll() {
        return this.longPoll;
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/retry/util-retry/config.js
var RETRY_MODES, DEFAULT_MAX_ATTEMPTS, DEFAULT_RETRY_MODE;
var init_config3 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/retry/util-retry/config.js"() {
    (function(RETRY_MODES2) {
      RETRY_MODES2["STANDARD"] = "standard";
      RETRY_MODES2["ADAPTIVE"] = "adaptive";
    })(RETRY_MODES || (RETRY_MODES = {}));
    DEFAULT_MAX_ATTEMPTS = 3;
    DEFAULT_RETRY_MODE = RETRY_MODES.STANDARD;
  }
});

// node_modules/@smithy/core/dist-es/submodules/retry/util-retry/StandardRetryStrategy.js
var refusal, StandardRetryStrategy;
var init_StandardRetryStrategy = __esm({
  "node_modules/@smithy/core/dist-es/submodules/retry/util-retry/StandardRetryStrategy.js"() {
    init_DefaultRetryBackoffStrategy();
    init_DefaultRetryToken();
    init_config3();
    init_constants4();
    init_retries_2026_config();
    refusal = {
      incompatible: 1,
      attempts: 2,
      capacity: 3
    };
    StandardRetryStrategy = class {
      static {
        __name(this, "StandardRetryStrategy");
      }
      mode = RETRY_MODES.STANDARD;
      retryBackoffStrategy;
      capacity = INITIAL_RETRY_TOKENS;
      maxAttemptsProvider;
      baseDelay;
      constructor(arg1) {
        if (typeof arg1 === "number") {
          this.maxAttemptsProvider = async () => arg1;
        } else if (typeof arg1 === "function") {
          this.maxAttemptsProvider = arg1;
        } else if (arg1 && typeof arg1 === "object") {
          this.maxAttemptsProvider = async () => arg1.maxAttempts;
          this.baseDelay = arg1.baseDelay;
          this.retryBackoffStrategy = arg1.backoff;
        }
        this.maxAttemptsProvider ??= async () => DEFAULT_MAX_ATTEMPTS;
        this.baseDelay ??= Retry.delay();
        this.retryBackoffStrategy ??= new DefaultRetryBackoffStrategy();
      }
      async acquireInitialRetryToken(retryTokenScope) {
        return new DefaultRetryToken(Retry.delay(), 0, void 0, Retry.v2026 && retryTokenScope.includes(":longpoll"));
      }
      async refreshRetryTokenForRetry(token, errorInfo) {
        const maxAttempts = await this.getMaxAttempts();
        const retryCode = this.retryCode(token, errorInfo, maxAttempts);
        const shouldRetry = retryCode === 0;
        const isLongPoll = token.isLongPoll?.();
        if (shouldRetry || isLongPoll) {
          const errorType = errorInfo.errorType;
          this.retryBackoffStrategy.setDelayBase(errorType === "THROTTLING" ? Retry.throttlingDelay() : this.baseDelay);
          const delayFromErrorType = this.retryBackoffStrategy.computeNextBackoffDelay(token.getRetryCount());
          let retryDelay = delayFromErrorType;
          if (errorInfo.retryAfterHint instanceof Date) {
            retryDelay = Math.max(delayFromErrorType, Math.min(errorInfo.retryAfterHint.getTime() - Date.now(), delayFromErrorType + 5e3));
          }
          if (!shouldRetry) {
            const longPollBackoff = Retry.v2026 && retryCode === refusal.capacity && isLongPoll ? retryDelay : 0;
            if (longPollBackoff > 0) {
              await new Promise((r6) => setTimeout(r6, longPollBackoff));
            }
          } else {
            const capacityCost = this.getCapacityCost(errorType);
            this.capacity -= capacityCost;
            const nextToken = new DefaultRetryToken(0, token.getRetryCount() + 1, capacityCost, token.isLongPoll?.() ?? false);
            await new Promise((r6) => setTimeout(r6, retryDelay));
            nextToken.$retryLog.acquisitionDelay = retryDelay;
            return nextToken;
          }
        }
        throw new Error("No retry token available");
      }
      recordSuccess(token) {
        this.capacity = Math.min(INITIAL_RETRY_TOKENS, this.capacity + (token.getRetryCost() ?? NO_RETRY_INCREMENT));
      }
      getCapacity() {
        return this.capacity;
      }
      async maxAttempts() {
        return this.maxAttemptsProvider();
      }
      async getMaxAttempts() {
        try {
          return await this.maxAttemptsProvider();
        } catch (ignored) {
          console.warn(`Max attempts provider could not resolve. Using default of ${DEFAULT_MAX_ATTEMPTS}`);
          return DEFAULT_MAX_ATTEMPTS;
        }
      }
      retryCode(tokenToRenew, errorInfo, maxAttempts) {
        const attempts = tokenToRenew.getRetryCount() + 1;
        const retryableStatus = this.isRetryableError(errorInfo.errorType) ? 0 : refusal.incompatible;
        const attemptStatus = attempts < maxAttempts ? 0 : refusal.attempts;
        const capacityStatus = this.capacity >= this.getCapacityCost(errorInfo.errorType) ? 0 : refusal.capacity;
        return retryableStatus || attemptStatus || capacityStatus;
      }
      getCapacityCost(errorType) {
        return errorType === Retry.modifiedCostType() ? Retry.throttlingCost() : Retry.cost();
      }
      isRetryableError(errorType) {
        return errorType === "THROTTLING" || errorType === "TRANSIENT";
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/retry/util-retry/AdaptiveRetryStrategy.js
var AdaptiveRetryStrategy;
var init_AdaptiveRetryStrategy = __esm({
  "node_modules/@smithy/core/dist-es/submodules/retry/util-retry/AdaptiveRetryStrategy.js"() {
    init_DefaultRateLimiter();
    init_StandardRetryStrategy();
    init_config3();
    AdaptiveRetryStrategy = class {
      static {
        __name(this, "AdaptiveRetryStrategy");
      }
      mode = RETRY_MODES.ADAPTIVE;
      rateLimiter;
      standardRetryStrategy;
      constructor(maxAttemptsProvider, options) {
        const { rateLimiter } = options ?? {};
        this.rateLimiter = rateLimiter ?? new DefaultRateLimiter();
        this.standardRetryStrategy = options ? new StandardRetryStrategy({
          maxAttempts: typeof maxAttemptsProvider === "number" ? maxAttemptsProvider : 3,
          ...options
        }) : new StandardRetryStrategy(maxAttemptsProvider);
      }
      async acquireInitialRetryToken(retryTokenScope) {
        const token = await this.standardRetryStrategy.acquireInitialRetryToken(retryTokenScope);
        await this.rateLimiter.getSendToken();
        return token;
      }
      async refreshRetryTokenForRetry(tokenToRenew, errorInfo) {
        this.rateLimiter.updateClientSendingRate(errorInfo);
        const token = await this.standardRetryStrategy.refreshRetryTokenForRetry(tokenToRenew, errorInfo);
        await this.rateLimiter.getSendToken();
        return token;
      }
      recordSuccess(token) {
        this.rateLimiter.updateClientSendingRate({});
        this.standardRetryStrategy.recordSuccess(token);
      }
      async maxAttemptsProvider() {
        return this.standardRetryStrategy.maxAttempts();
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/retry/middleware-retry/configurations.js
var ENV_MAX_ATTEMPTS, CONFIG_MAX_ATTEMPTS, NODE_MAX_ATTEMPT_CONFIG_OPTIONS, resolveRetryConfig, ENV_RETRY_MODE, CONFIG_RETRY_MODE, NODE_RETRY_MODE_CONFIG_OPTIONS;
var init_configurations = __esm({
  "node_modules/@smithy/core/dist-es/submodules/retry/middleware-retry/configurations.js"() {
    init_client2();
    init_AdaptiveRetryStrategy();
    init_StandardRetryStrategy();
    init_config3();
    init_retries_2026_config();
    ENV_MAX_ATTEMPTS = "AWS_MAX_ATTEMPTS";
    CONFIG_MAX_ATTEMPTS = "max_attempts";
    NODE_MAX_ATTEMPT_CONFIG_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env2) => {
        const value = env2[ENV_MAX_ATTEMPTS];
        if (!value)
          return void 0;
        const maxAttempt = parseInt(value);
        if (Number.isNaN(maxAttempt)) {
          throw new Error(`Environment variable ${ENV_MAX_ATTEMPTS} mast be a number, got "${value}"`);
        }
        return maxAttempt;
      }, "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => {
        const value = profile[CONFIG_MAX_ATTEMPTS];
        if (!value)
          return void 0;
        const maxAttempt = parseInt(value);
        if (Number.isNaN(maxAttempt)) {
          throw new Error(`Shared config file entry ${CONFIG_MAX_ATTEMPTS} mast be a number, got "${value}"`);
        }
        return maxAttempt;
      }, "configFileSelector"),
      default: DEFAULT_MAX_ATTEMPTS
    };
    resolveRetryConfig = /* @__PURE__ */ __name((input, defaults) => {
      const { retryStrategy, retryMode } = input;
      const { defaultMaxAttempts = DEFAULT_MAX_ATTEMPTS, defaultBaseDelay = Retry.delay() } = defaults ?? {};
      const maxAttemptsProvider = normalizeProvider(input.maxAttempts ?? defaultMaxAttempts);
      let controller = retryStrategy ? Promise.resolve(retryStrategy) : void 0;
      const getDefault = /* @__PURE__ */ __name(async () => {
        const maxAttempts = await maxAttemptsProvider();
        const adaptive = await normalizeProvider(retryMode)() === RETRY_MODES.ADAPTIVE;
        if (adaptive) {
          return new AdaptiveRetryStrategy(maxAttemptsProvider, {
            maxAttempts,
            baseDelay: defaultBaseDelay
          });
        }
        return new StandardRetryStrategy({
          maxAttempts,
          baseDelay: defaultBaseDelay
        });
      }, "getDefault");
      return Object.assign(input, {
        maxAttempts: maxAttemptsProvider,
        retryStrategy: /* @__PURE__ */ __name(() => controller ??= getDefault(), "retryStrategy")
      });
    }, "resolveRetryConfig");
    ENV_RETRY_MODE = "AWS_RETRY_MODE";
    CONFIG_RETRY_MODE = "retry_mode";
    NODE_RETRY_MODE_CONFIG_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env2) => env2[ENV_RETRY_MODE], "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => profile[CONFIG_RETRY_MODE], "configFileSelector"),
      default: DEFAULT_RETRY_MODE
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/retry/index.js
var retryMiddleware, getRetryPlugin;
var init_retry2 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/retry/index.js"() {
    init_isStreamingPayload();
    init_retryMiddleware();
    init_config3();
    init_retries_2026_config();
    init_configurations();
    retryMiddleware = bindRetryMiddleware(isStreamingPayload);
    getRetryPlugin = bindGetRetryPlugin(isStreamingPayload);
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/setFeature.js
function setFeature2(context, feature, value) {
  if (!context.__aws_sdk_context) {
    context.__aws_sdk_context = {
      features: {}
    };
  } else if (!context.__aws_sdk_context.features) {
    context.__aws_sdk_context.features = {};
  }
  context.__aws_sdk_context.features[feature] = value;
}
var init_setFeature = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/setFeature.js"() {
    init_retry2();
    Retry.v2026 ||= typeof process === "object" && process.env?.AWS_NEW_RETRIES_2026 === "true";
    __name(setFeature2, "setFeature");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/middleware-host-header/hostHeaderMiddleware.js
function resolveHostHeaderConfig(input) {
  return input;
}
var hostHeaderMiddleware, hostHeaderMiddlewareOptions, getHostHeaderPlugin;
var init_hostHeaderMiddleware = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/middleware-host-header/hostHeaderMiddleware.js"() {
    init_protocols();
    __name(resolveHostHeaderConfig, "resolveHostHeaderConfig");
    hostHeaderMiddleware = /* @__PURE__ */ __name((options) => (next) => async (args) => {
      if (!HttpRequest.isInstance(args.request))
        return next(args);
      const { request } = args;
      const { handlerProtocol = "" } = options.requestHandler.metadata || {};
      if (handlerProtocol.indexOf("h2") >= 0 && !request.headers[":authority"]) {
        delete request.headers["host"];
        request.headers[":authority"] = request.hostname + (request.port ? ":" + request.port : "");
      } else if (!request.headers["host"]) {
        let host = request.hostname;
        if (request.port != null)
          host += `:${request.port}`;
        request.headers["host"] = host;
      }
      return next(args);
    }, "hostHeaderMiddleware");
    hostHeaderMiddlewareOptions = {
      name: "hostHeaderMiddleware",
      step: "build",
      priority: "low",
      tags: ["HOST"],
      override: true
    };
    getHostHeaderPlugin = /* @__PURE__ */ __name((options) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.add(hostHeaderMiddleware(options), hostHeaderMiddlewareOptions);
      }, "applyToStack")
    }), "getHostHeaderPlugin");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/middleware-logger/loggerMiddleware.js
var loggerMiddleware, loggerMiddlewareOptions, getLoggerPlugin;
var init_loggerMiddleware = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/middleware-logger/loggerMiddleware.js"() {
    loggerMiddleware = /* @__PURE__ */ __name(() => (next, context) => async (args) => {
      try {
        const response = await next(args);
        const { clientName, commandName, logger: logger2, dynamoDbDocumentClientOptions = {} } = context;
        const { overrideInputFilterSensitiveLog, overrideOutputFilterSensitiveLog } = dynamoDbDocumentClientOptions;
        const inputFilterSensitiveLog = overrideInputFilterSensitiveLog ?? context.inputFilterSensitiveLog;
        const outputFilterSensitiveLog = overrideOutputFilterSensitiveLog ?? context.outputFilterSensitiveLog;
        const { $metadata, ...outputWithoutMetadata } = response.output;
        logger2?.info?.({
          clientName,
          commandName,
          input: inputFilterSensitiveLog(args.input),
          output: outputFilterSensitiveLog(outputWithoutMetadata),
          metadata: $metadata
        });
        return response;
      } catch (error) {
        const { clientName, commandName, logger: logger2, dynamoDbDocumentClientOptions = {} } = context;
        const { overrideInputFilterSensitiveLog } = dynamoDbDocumentClientOptions;
        const inputFilterSensitiveLog = overrideInputFilterSensitiveLog ?? context.inputFilterSensitiveLog;
        logger2?.error?.({
          clientName,
          commandName,
          input: inputFilterSensitiveLog(args.input),
          error,
          metadata: error.$metadata
        });
        throw error;
      }
    }, "loggerMiddleware");
    loggerMiddlewareOptions = {
      name: "loggerMiddleware",
      tags: ["LOGGER"],
      step: "initialize",
      override: true
    };
    getLoggerPlugin = /* @__PURE__ */ __name((options) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.add(loggerMiddleware(), loggerMiddlewareOptions);
      }, "applyToStack")
    }), "getLoggerPlugin");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/middleware-recursion-detection/configuration.js
var recursionDetectionMiddlewareOptions;
var init_configuration = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/middleware-recursion-detection/configuration.js"() {
    recursionDetectionMiddlewareOptions = {
      step: "build",
      tags: ["RECURSION_DETECTION", "TRACE_CONTEXT_PROPAGATION"],
      name: "recursionDetectionMiddleware",
      override: true,
      priority: "low"
    };
  }
});

// node_modules/@aws/lambda-invoke-store/dist-es/invoke-store.js
var PROTECTED_KEYS, NO_GLOBAL_AWS_LAMBDA, InvokeStoreBase, InvokeStoreSingle, InvokeStoreMulti, InvokeStore;
var init_invoke_store = __esm({
  "node_modules/@aws/lambda-invoke-store/dist-es/invoke-store.js"() {
    PROTECTED_KEYS = {
      REQUEST_ID: /* @__PURE__ */ Symbol.for("_AWS_LAMBDA_REQUEST_ID"),
      X_RAY_TRACE_ID: /* @__PURE__ */ Symbol.for("_AWS_LAMBDA_X_RAY_TRACE_ID"),
      TENANT_ID: /* @__PURE__ */ Symbol.for("_AWS_LAMBDA_TENANT_ID"),
      TRACEPARENT: /* @__PURE__ */ Symbol.for("_AWS_LAMBDA_TRACEPARENT"),
      TRACESTATE: /* @__PURE__ */ Symbol.for("_AWS_LAMBDA_TRACESTATE"),
      BAGGAGE: /* @__PURE__ */ Symbol.for("_AWS_LAMBDA_BAGGAGE")
    };
    NO_GLOBAL_AWS_LAMBDA = ["true", "1"].includes(process.env?.AWS_LAMBDA_NODEJS_NO_GLOBAL_AWSLAMBDA ?? "");
    if (!NO_GLOBAL_AWS_LAMBDA) {
      globalThis.awslambda = globalThis.awslambda || {};
    }
    InvokeStoreBase = class {
      static {
        __name(this, "InvokeStoreBase");
      }
      static PROTECTED_KEYS = PROTECTED_KEYS;
      isProtectedKey(key) {
        return Object.values(PROTECTED_KEYS).includes(key);
      }
      getRequestId() {
        return this.get(PROTECTED_KEYS.REQUEST_ID) ?? "-";
      }
      getXRayTraceId() {
        return this.get(PROTECTED_KEYS.X_RAY_TRACE_ID);
      }
      getTenantId() {
        return this.get(PROTECTED_KEYS.TENANT_ID);
      }
      getTraceparent() {
        return this.get(PROTECTED_KEYS.TRACEPARENT);
      }
      getTracestate() {
        return this.get(PROTECTED_KEYS.TRACESTATE);
      }
      getBaggage() {
        return this.get(PROTECTED_KEYS.BAGGAGE);
      }
    };
    InvokeStoreSingle = class extends InvokeStoreBase {
      static {
        __name(this, "InvokeStoreSingle");
      }
      currentContext;
      getContext() {
        return this.currentContext;
      }
      hasContext() {
        return this.currentContext !== void 0;
      }
      get(key) {
        return this.currentContext?.[key];
      }
      set(key, value) {
        if (this.isProtectedKey(key)) {
          throw new Error(`Cannot modify protected Lambda context field: ${String(key)}`);
        }
        this.currentContext = this.currentContext || {};
        this.currentContext[key] = value;
      }
      run(context, fn) {
        this.currentContext = context;
        return fn();
      }
    };
    InvokeStoreMulti = class _InvokeStoreMulti extends InvokeStoreBase {
      static {
        __name(this, "InvokeStoreMulti");
      }
      als;
      static async create() {
        const instance = new _InvokeStoreMulti();
        const asyncHooks = await import("node:async_hooks");
        instance.als = new asyncHooks.AsyncLocalStorage();
        return instance;
      }
      getContext() {
        return this.als.getStore();
      }
      hasContext() {
        return this.als.getStore() !== void 0;
      }
      get(key) {
        return this.als.getStore()?.[key];
      }
      set(key, value) {
        if (this.isProtectedKey(key)) {
          throw new Error(`Cannot modify protected Lambda context field: ${String(key)}`);
        }
        const store = this.als.getStore();
        if (!store) {
          throw new Error("No context available");
        }
        store[key] = value;
      }
      run(context, fn) {
        return this.als.run(context, fn);
      }
    };
    (function(InvokeStore2) {
      let instance = null;
      async function getInstanceAsync(forceInvokeStoreMulti) {
        if (!instance) {
          instance = (async () => {
            const isMulti = forceInvokeStoreMulti === true || "AWS_LAMBDA_MAX_CONCURRENCY" in process.env;
            const newInstance = isMulti ? await InvokeStoreMulti.create() : new InvokeStoreSingle();
            if (!NO_GLOBAL_AWS_LAMBDA && globalThis.awslambda?.InvokeStore) {
              return globalThis.awslambda.InvokeStore;
            } else if (!NO_GLOBAL_AWS_LAMBDA && globalThis.awslambda) {
              globalThis.awslambda.InvokeStore = newInstance;
              return newInstance;
            } else {
              return newInstance;
            }
          })();
        }
        return instance;
      }
      __name(getInstanceAsync, "getInstanceAsync");
      InvokeStore2.getInstanceAsync = getInstanceAsync;
      InvokeStore2._testing = process.env.AWS_LAMBDA_BENCHMARK_MODE === "1" ? {
        reset: /* @__PURE__ */ __name(() => {
          instance = null;
          if (globalThis.awslambda?.InvokeStore) {
            delete globalThis.awslambda.InvokeStore;
          }
          globalThis.awslambda = { InvokeStore: void 0 };
        }, "reset")
      } : void 0;
    })(InvokeStore || (InvokeStore = {}));
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/middleware-recursion-detection/recursionDetectionMiddleware.js
function sanitizeTraceHeaders(headers) {
  for (const header of Object.keys(headers)) {
    const lower = header.toLowerCase();
    if (header !== lower && (lower === TRACEPARENT || lower === TRACESTATE || lower === BAGGAGE)) {
      headers[lower] = headers[header];
      delete headers[header];
    }
  }
}
var AWS_LAMBDA_FUNCTION_NAME, _X_AMZN_TRACE_ID, X_AMZN_TRACE_ID, TRACEPARENT, TRACESTATE, BAGGAGE, recursionDetectionMiddleware;
var init_recursionDetectionMiddleware = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/middleware-recursion-detection/recursionDetectionMiddleware.js"() {
    init_invoke_store();
    init_protocols();
    AWS_LAMBDA_FUNCTION_NAME = "AWS_LAMBDA_FUNCTION_NAME";
    _X_AMZN_TRACE_ID = "_X_AMZN_TRACE_ID";
    X_AMZN_TRACE_ID = "X-Amzn-Trace-Id";
    TRACEPARENT = "traceparent";
    TRACESTATE = "tracestate";
    BAGGAGE = "baggage";
    recursionDetectionMiddleware = /* @__PURE__ */ __name(() => (next) => async (args) => {
      const { request } = args;
      if (!HttpRequest.isInstance(request)) {
        return next(args);
      }
      let invokeStore;
      {
        const traceIdHeader = Object.keys(request.headers ?? {}).find((h6) => h6.toLowerCase() === X_AMZN_TRACE_ID.toLowerCase()) ?? X_AMZN_TRACE_ID;
        if (!request.headers.hasOwnProperty(traceIdHeader)) {
          const functionName = process.env[AWS_LAMBDA_FUNCTION_NAME];
          const traceIdFromEnv = process.env[_X_AMZN_TRACE_ID];
          invokeStore ??= await InvokeStore.getInstanceAsync();
          const traceIdFromInvokeStore = invokeStore?.getXRayTraceId();
          const traceId = traceIdFromInvokeStore ?? traceIdFromEnv;
          const nonEmptyString = /* @__PURE__ */ __name((str) => typeof str === "string" && str.length > 0, "nonEmptyString");
          if (nonEmptyString(functionName) && nonEmptyString(traceId)) {
            request.headers[X_AMZN_TRACE_ID] = traceId;
          }
        }
      }
      {
        sanitizeTraceHeaders(request.headers);
        const existingTraceparent = request.headers[TRACEPARENT];
        if (!existingTraceparent) {
          const traceparent = (invokeStore ??= await InvokeStore.getInstanceAsync())?.getTraceparent?.();
          if (traceparent) {
            request.headers[TRACEPARENT] = traceparent;
            const tracestate = invokeStore?.getTracestate?.();
            if (tracestate) {
              request.headers[TRACESTATE] = tracestate;
            }
            const baggage = invokeStore?.getBaggage?.();
            if (baggage) {
              request.headers[BAGGAGE] = baggage;
            }
          }
        }
      }
      return next(args);
    }, "recursionDetectionMiddleware");
    __name(sanitizeTraceHeaders, "sanitizeTraceHeaders");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/middleware-recursion-detection/getRecursionDetectionPlugin.js
var getRecursionDetectionPlugin;
var init_getRecursionDetectionPlugin = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/middleware-recursion-detection/getRecursionDetectionPlugin.js"() {
    init_configuration();
    init_recursionDetectionMiddleware();
    getRecursionDetectionPlugin = /* @__PURE__ */ __name((options) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.add(recursionDetectionMiddleware(), recursionDetectionMiddlewareOptions);
      }, "applyToStack")
    }), "getRecursionDetectionPlugin");
  }
});

// node_modules/@smithy/core/dist-es/legacy-root-exports/middleware-http-auth-scheme/resolveAuthOptions.js
var resolveAuthOptions;
var init_resolveAuthOptions = __esm({
  "node_modules/@smithy/core/dist-es/legacy-root-exports/middleware-http-auth-scheme/resolveAuthOptions.js"() {
    resolveAuthOptions = /* @__PURE__ */ __name((candidateAuthOptions, authSchemePreference) => {
      if (!authSchemePreference || authSchemePreference.length === 0) {
        return candidateAuthOptions;
      }
      const preferredAuthOptions = [];
      for (const preferredSchemeName of authSchemePreference) {
        for (const candidateAuthOption of candidateAuthOptions) {
          const candidateAuthSchemeName = candidateAuthOption.schemeId.split("#")[1];
          if (candidateAuthSchemeName === preferredSchemeName) {
            preferredAuthOptions.push(candidateAuthOption);
          }
        }
      }
      for (const candidateAuthOption of candidateAuthOptions) {
        if (!preferredAuthOptions.find(({ schemeId }) => schemeId === candidateAuthOption.schemeId)) {
          preferredAuthOptions.push(candidateAuthOption);
        }
      }
      return preferredAuthOptions;
    }, "resolveAuthOptions");
  }
});

// node_modules/@smithy/core/dist-es/legacy-root-exports/middleware-http-auth-scheme/httpAuthSchemeMiddleware.js
function convertHttpAuthSchemesToMap(httpAuthSchemes) {
  const map = /* @__PURE__ */ new Map();
  for (const scheme of httpAuthSchemes) {
    map.set(scheme.schemeId, scheme);
  }
  return map;
}
var httpAuthSchemeMiddleware;
var init_httpAuthSchemeMiddleware = __esm({
  "node_modules/@smithy/core/dist-es/legacy-root-exports/middleware-http-auth-scheme/httpAuthSchemeMiddleware.js"() {
    init_transport();
    init_resolveAuthOptions();
    __name(convertHttpAuthSchemesToMap, "convertHttpAuthSchemesToMap");
    httpAuthSchemeMiddleware = /* @__PURE__ */ __name((config, mwOptions) => (next, context) => async (args) => {
      const options = config.httpAuthSchemeProvider(await mwOptions.httpAuthSchemeParametersProvider(config, context, args.input));
      const authSchemePreference = config.authSchemePreference ? await config.authSchemePreference() : [];
      const resolvedOptions = resolveAuthOptions(options, authSchemePreference);
      const authSchemes = convertHttpAuthSchemesToMap(config.httpAuthSchemes);
      const smithyContext = getSmithyContext(context);
      const failureReasons = [];
      for (const option of resolvedOptions) {
        const scheme = authSchemes.get(option.schemeId);
        if (!scheme) {
          failureReasons.push(`HttpAuthScheme \`${option.schemeId}\` was not enabled for this service.`);
          continue;
        }
        const identityProvider = scheme.identityProvider(await mwOptions.identityProviderConfigProvider(config));
        if (!identityProvider) {
          failureReasons.push(`HttpAuthScheme \`${option.schemeId}\` did not have an IdentityProvider configured.`);
          continue;
        }
        const { identityProperties = {}, signingProperties = {} } = option.propertiesExtractor?.(config, context) || {};
        option.identityProperties = Object.assign(option.identityProperties || {}, identityProperties);
        option.signingProperties = Object.assign(option.signingProperties || {}, signingProperties);
        smithyContext.selectedHttpAuthScheme = {
          httpAuthOption: option,
          identity: await identityProvider(option.identityProperties),
          signer: scheme.signer
        };
        break;
      }
      if (!smithyContext.selectedHttpAuthScheme) {
        throw new Error(failureReasons.join("\n"));
      }
      return next(args);
    }, "httpAuthSchemeMiddleware");
  }
});

// node_modules/@smithy/core/dist-es/legacy-root-exports/middleware-http-auth-scheme/getHttpAuthSchemeEndpointRuleSetPlugin.js
var httpAuthSchemeEndpointRuleSetMiddlewareOptions, getHttpAuthSchemeEndpointRuleSetPlugin;
var init_getHttpAuthSchemeEndpointRuleSetPlugin = __esm({
  "node_modules/@smithy/core/dist-es/legacy-root-exports/middleware-http-auth-scheme/getHttpAuthSchemeEndpointRuleSetPlugin.js"() {
    init_httpAuthSchemeMiddleware();
    httpAuthSchemeEndpointRuleSetMiddlewareOptions = {
      step: "serialize",
      tags: ["HTTP_AUTH_SCHEME"],
      name: "httpAuthSchemeMiddleware",
      override: true,
      relation: "before",
      toMiddleware: "endpointV2Middleware"
    };
    getHttpAuthSchemeEndpointRuleSetPlugin = /* @__PURE__ */ __name((config, { httpAuthSchemeParametersProvider, identityProviderConfigProvider }) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.addRelativeTo(httpAuthSchemeMiddleware(config, {
          httpAuthSchemeParametersProvider,
          identityProviderConfigProvider
        }), httpAuthSchemeEndpointRuleSetMiddlewareOptions);
      }, "applyToStack")
    }), "getHttpAuthSchemeEndpointRuleSetPlugin");
  }
});

// node_modules/@smithy/core/dist-es/legacy-root-exports/middleware-http-auth-scheme/index.js
var init_middleware_http_auth_scheme = __esm({
  "node_modules/@smithy/core/dist-es/legacy-root-exports/middleware-http-auth-scheme/index.js"() {
    init_getHttpAuthSchemeEndpointRuleSetPlugin();
  }
});

// node_modules/@smithy/core/dist-es/legacy-root-exports/middleware-http-signing/httpSigningMiddleware.js
var defaultErrorHandler, defaultSuccessHandler, httpSigningMiddleware;
var init_httpSigningMiddleware = __esm({
  "node_modules/@smithy/core/dist-es/legacy-root-exports/middleware-http-signing/httpSigningMiddleware.js"() {
    init_protocols();
    init_transport();
    defaultErrorHandler = /* @__PURE__ */ __name((signingProperties) => (error) => {
      throw error;
    }, "defaultErrorHandler");
    defaultSuccessHandler = /* @__PURE__ */ __name((httpResponse, signingProperties) => {
    }, "defaultSuccessHandler");
    httpSigningMiddleware = /* @__PURE__ */ __name((config) => (next, context) => async (args) => {
      if (!HttpRequest.isInstance(args.request)) {
        return next(args);
      }
      const smithyContext = getSmithyContext(context);
      const scheme = smithyContext.selectedHttpAuthScheme;
      if (!scheme) {
        throw new Error(`No HttpAuthScheme was selected: unable to sign request`);
      }
      const { httpAuthOption: { signingProperties = {} }, identity, signer } = scheme;
      const output = await next({
        ...args,
        request: await signer.sign(args.request, identity, signingProperties)
      }).catch((signer.errorHandler || defaultErrorHandler)(signingProperties));
      (signer.successHandler || defaultSuccessHandler)(output.response, signingProperties);
      return output;
    }, "httpSigningMiddleware");
  }
});

// node_modules/@smithy/core/dist-es/legacy-root-exports/middleware-http-signing/getHttpSigningMiddleware.js
var httpSigningMiddlewareOptions, getHttpSigningPlugin;
var init_getHttpSigningMiddleware = __esm({
  "node_modules/@smithy/core/dist-es/legacy-root-exports/middleware-http-signing/getHttpSigningMiddleware.js"() {
    init_httpSigningMiddleware();
    httpSigningMiddlewareOptions = {
      step: "finalizeRequest",
      tags: ["HTTP_SIGNING"],
      name: "httpSigningMiddleware",
      aliases: ["apiKeyMiddleware", "tokenMiddleware", "awsAuthMiddleware"],
      override: true,
      relation: "after",
      toMiddleware: "retryMiddleware"
    };
    getHttpSigningPlugin = /* @__PURE__ */ __name((config) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.addRelativeTo(httpSigningMiddleware(config), httpSigningMiddlewareOptions);
      }, "applyToStack")
    }), "getHttpSigningPlugin");
  }
});

// node_modules/@smithy/core/dist-es/legacy-root-exports/middleware-http-signing/index.js
var init_middleware_http_signing = __esm({
  "node_modules/@smithy/core/dist-es/legacy-root-exports/middleware-http-signing/index.js"() {
    init_getHttpSigningMiddleware();
  }
});

// node_modules/@smithy/core/dist-es/normalizeProvider.js
var normalizeProvider2;
var init_normalizeProvider2 = __esm({
  "node_modules/@smithy/core/dist-es/normalizeProvider.js"() {
    normalizeProvider2 = /* @__PURE__ */ __name((input) => {
      if (typeof input === "function")
        return input;
      const promisified = Promise.resolve(input);
      return () => promisified;
    }, "normalizeProvider");
  }
});

// node_modules/@smithy/core/dist-es/legacy-root-exports/util-identity-and-auth/DefaultIdentityProviderConfig.js
var DefaultIdentityProviderConfig;
var init_DefaultIdentityProviderConfig = __esm({
  "node_modules/@smithy/core/dist-es/legacy-root-exports/util-identity-and-auth/DefaultIdentityProviderConfig.js"() {
    init_transport();
    DefaultIdentityProviderConfig = class {
      static {
        __name(this, "DefaultIdentityProviderConfig");
      }
      authSchemes = /* @__PURE__ */ new Map();
      constructor(config) {
        for (const key in config) {
          if (!hasOwn(config, key))
            continue;
          const value = config[key];
          if (value !== void 0) {
            this.authSchemes.set(key, value);
          }
        }
      }
      getIdentityProvider(schemeId) {
        return this.authSchemes.get(schemeId);
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/legacy-root-exports/util-identity-and-auth/httpAuthSchemes/noAuth.js
var NoAuthSigner;
var init_noAuth = __esm({
  "node_modules/@smithy/core/dist-es/legacy-root-exports/util-identity-and-auth/httpAuthSchemes/noAuth.js"() {
    NoAuthSigner = class {
      static {
        __name(this, "NoAuthSigner");
      }
      async sign(httpRequest2, identity, signingProperties) {
        return httpRequest2;
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/legacy-root-exports/util-identity-and-auth/httpAuthSchemes/index.js
var init_httpAuthSchemes = __esm({
  "node_modules/@smithy/core/dist-es/legacy-root-exports/util-identity-and-auth/httpAuthSchemes/index.js"() {
    init_noAuth();
  }
});

// node_modules/@smithy/core/dist-es/legacy-root-exports/util-identity-and-auth/memoizeIdentityProvider.js
var createIsIdentityExpiredFunction, EXPIRATION_MS, isIdentityExpired, doesIdentityRequireRefresh, memoizeIdentityProvider;
var init_memoizeIdentityProvider = __esm({
  "node_modules/@smithy/core/dist-es/legacy-root-exports/util-identity-and-auth/memoizeIdentityProvider.js"() {
    createIsIdentityExpiredFunction = /* @__PURE__ */ __name((expirationMs) => /* @__PURE__ */ __name(function isIdentityExpired2(identity) {
      return doesIdentityRequireRefresh(identity) && identity.expiration.getTime() - Date.now() < expirationMs;
    }, "isIdentityExpired"), "createIsIdentityExpiredFunction");
    EXPIRATION_MS = 3e5;
    isIdentityExpired = createIsIdentityExpiredFunction(EXPIRATION_MS);
    doesIdentityRequireRefresh = /* @__PURE__ */ __name((identity) => identity.expiration !== void 0, "doesIdentityRequireRefresh");
    memoizeIdentityProvider = /* @__PURE__ */ __name((provider, isExpired, requiresRefresh) => {
      if (provider === void 0) {
        return void 0;
      }
      const normalizedProvider = typeof provider !== "function" ? async () => Promise.resolve(provider) : provider;
      let resolved;
      let pending;
      let hasResult;
      let isConstant = false;
      const coalesceProvider = /* @__PURE__ */ __name(async (options) => {
        if (!pending) {
          pending = normalizedProvider(options);
        }
        try {
          resolved = await pending;
          hasResult = true;
          isConstant = false;
        } finally {
          pending = void 0;
        }
        return resolved;
      }, "coalesceProvider");
      if (isExpired === void 0) {
        return async (options) => {
          if (!hasResult || options?.forceRefresh) {
            resolved = await coalesceProvider(options);
          }
          return resolved;
        };
      }
      return async (options) => {
        if (!hasResult || options?.forceRefresh) {
          resolved = await coalesceProvider(options);
        }
        if (isConstant) {
          return resolved;
        }
        if (!requiresRefresh(resolved)) {
          isConstant = true;
          return resolved;
        }
        if (isExpired(resolved)) {
          await coalesceProvider(options);
          return resolved;
        }
        return resolved;
      };
    }, "memoizeIdentityProvider");
  }
});

// node_modules/@smithy/core/dist-es/legacy-root-exports/util-identity-and-auth/index.js
var init_util_identity_and_auth = __esm({
  "node_modules/@smithy/core/dist-es/legacy-root-exports/util-identity-and-auth/index.js"() {
    init_DefaultIdentityProviderConfig();
    init_httpAuthSchemes();
    init_memoizeIdentityProvider();
  }
});

// node_modules/@smithy/core/dist-es/index.js
var init_dist_es2 = __esm({
  "node_modules/@smithy/core/dist-es/index.js"() {
    init_middleware_http_auth_scheme();
    init_middleware_http_signing();
    init_normalizeProvider2();
    init_util_identity_and_auth();
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/middleware-user-agent/configurations.js
function isValidUserAgentAppId(appId) {
  if (appId === void 0) {
    return true;
  }
  return typeof appId === "string" && appId.length <= 50;
}
function resolveUserAgentConfig(input) {
  const normalizedAppIdProvider = normalizeProvider2(input.userAgentAppId ?? DEFAULT_UA_APP_ID);
  const { customUserAgent } = input;
  return Object.assign(input, {
    customUserAgent: typeof customUserAgent === "string" ? [[customUserAgent]] : customUserAgent,
    userAgentAppId: /* @__PURE__ */ __name(async () => {
      const appId = await normalizedAppIdProvider();
      if (!isValidUserAgentAppId(appId)) {
        const logger2 = input.logger?.constructor?.name === "NoOpLogger" || !input.logger ? console : input.logger;
        if (typeof appId !== "string") {
          logger2?.warn("userAgentAppId must be a string or undefined.");
        } else if (appId.length > 50) {
          logger2?.warn("The provided userAgentAppId exceeds the maximum length of 50 characters.");
        }
      }
      return appId;
    }, "userAgentAppId")
  });
}
var DEFAULT_UA_APP_ID;
var init_configurations2 = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/middleware-user-agent/configurations.js"() {
    init_dist_es2();
    DEFAULT_UA_APP_ID = void 0;
    __name(isValidUserAgentAppId, "isValidUserAgentAppId");
    __name(resolveUserAgentConfig, "resolveUserAgentConfig");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/util-endpoints/lib/aws/partitions.js
var partitionsInfo;
var init_partitions = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/util-endpoints/lib/aws/partitions.js"() {
    partitionsInfo = {
      "partitions": [
        {
          "id": "aws",
          "outputs": {
            "dnsSuffix": "amazonaws.com",
            "dualStackDnsSuffix": "api.aws",
            "implicitGlobalRegion": "us-east-1",
            "name": "aws",
            "supportsDualStack": true,
            "supportsFIPS": true
          },
          "regionRegex": "^(us|eu|ap|sa|ca|me|af|il|mx)\\-\\w+\\-\\d+$",
          "regions": {
            "af-south-1": {
              "description": "Africa (Cape Town)"
            },
            "ap-east-1": {
              "description": "Asia Pacific (Hong Kong)"
            },
            "ap-east-2": {
              "description": "Asia Pacific (Taipei)"
            },
            "ap-northeast-1": {
              "description": "Asia Pacific (Tokyo)"
            },
            "ap-northeast-2": {
              "description": "Asia Pacific (Seoul)"
            },
            "ap-northeast-3": {
              "description": "Asia Pacific (Osaka)"
            },
            "ap-south-1": {
              "description": "Asia Pacific (Mumbai)"
            },
            "ap-south-2": {
              "description": "Asia Pacific (Hyderabad)"
            },
            "ap-southeast-1": {
              "description": "Asia Pacific (Singapore)"
            },
            "ap-southeast-2": {
              "description": "Asia Pacific (Sydney)"
            },
            "ap-southeast-3": {
              "description": "Asia Pacific (Jakarta)"
            },
            "ap-southeast-4": {
              "description": "Asia Pacific (Melbourne)"
            },
            "ap-southeast-5": {
              "description": "Asia Pacific (Malaysia)"
            },
            "ap-southeast-6": {
              "description": "Asia Pacific (New Zealand)"
            },
            "ap-southeast-7": {
              "description": "Asia Pacific (Thailand)"
            },
            "aws-global": {
              "description": "aws global region"
            },
            "ca-central-1": {
              "description": "Canada (Central)"
            },
            "ca-west-1": {
              "description": "Canada West (Calgary)"
            },
            "eu-central-1": {
              "description": "Europe (Frankfurt)"
            },
            "eu-central-2": {
              "description": "Europe (Zurich)"
            },
            "eu-north-1": {
              "description": "Europe (Stockholm)"
            },
            "eu-south-1": {
              "description": "Europe (Milan)"
            },
            "eu-south-2": {
              "description": "Europe (Spain)"
            },
            "eu-west-1": {
              "description": "Europe (Ireland)"
            },
            "eu-west-2": {
              "description": "Europe (London)"
            },
            "eu-west-3": {
              "description": "Europe (Paris)"
            },
            "il-central-1": {
              "description": "Israel (Tel Aviv)"
            },
            "me-central-1": {
              "description": "Middle East (UAE)"
            },
            "me-south-1": {
              "description": "Middle East (Bahrain)"
            },
            "mx-central-1": {
              "description": "Mexico (Central)"
            },
            "sa-east-1": {
              "description": "South America (Sao Paulo)"
            },
            "us-east-1": {
              "description": "US East (N. Virginia)"
            },
            "us-east-2": {
              "description": "US East (Ohio)"
            },
            "us-west-1": {
              "description": "US West (N. California)"
            },
            "us-west-2": {
              "description": "US West (Oregon)"
            }
          }
        },
        {
          "id": "aws-cn",
          "outputs": {
            "dnsSuffix": "amazonaws.com.cn",
            "dualStackDnsSuffix": "api.amazonwebservices.com.cn",
            "implicitGlobalRegion": "cn-northwest-1",
            "name": "aws-cn",
            "supportsDualStack": true,
            "supportsFIPS": true
          },
          "regionRegex": "^cn\\-\\w+\\-\\d+$",
          "regions": {
            "aws-cn-global": {
              "description": "aws-cn global region"
            },
            "cn-north-1": {
              "description": "China (Beijing)"
            },
            "cn-northwest-1": {
              "description": "China (Ningxia)"
            }
          }
        },
        {
          "id": "aws-eusc",
          "outputs": {
            "dnsSuffix": "amazonaws.eu",
            "dualStackDnsSuffix": "api.amazonwebservices.eu",
            "implicitGlobalRegion": "eusc-de-east-1",
            "name": "aws-eusc",
            "supportsDualStack": true,
            "supportsFIPS": true
          },
          "regionRegex": "^eusc\\-(de)\\-\\w+\\-\\d+$",
          "regions": {
            "eusc-de-east-1": {
              "description": "AWS European Sovereign Cloud (Germany)"
            }
          }
        },
        {
          "id": "aws-iso",
          "outputs": {
            "dnsSuffix": "c2s.ic.gov",
            "dualStackDnsSuffix": "api.aws.ic.gov",
            "implicitGlobalRegion": "us-iso-east-1",
            "name": "aws-iso",
            "supportsDualStack": true,
            "supportsFIPS": true
          },
          "regionRegex": "^us\\-iso\\-\\w+\\-\\d+$",
          "regions": {
            "aws-iso-global": {
              "description": "aws-iso global region"
            },
            "us-iso-east-1": {
              "description": "US ISO East"
            },
            "us-iso-west-1": {
              "description": "US ISO WEST"
            }
          }
        },
        {
          "id": "aws-iso-b",
          "outputs": {
            "dnsSuffix": "sc2s.sgov.gov",
            "dualStackDnsSuffix": "api.aws.scloud",
            "implicitGlobalRegion": "us-isob-east-1",
            "name": "aws-iso-b",
            "supportsDualStack": true,
            "supportsFIPS": true
          },
          "regionRegex": "^us\\-isob\\-\\w+\\-\\d+$",
          "regions": {
            "aws-iso-b-global": {
              "description": "aws-iso-b global region"
            },
            "us-isob-east-1": {
              "description": "US ISOB East (Ohio)"
            },
            "us-isob-west-1": {
              "description": "US ISOB West"
            }
          }
        },
        {
          "id": "aws-iso-e",
          "outputs": {
            "dnsSuffix": "cloud.adc-e.uk",
            "dualStackDnsSuffix": "api.cloud-aws.adc-e.uk",
            "implicitGlobalRegion": "eu-isoe-west-1",
            "name": "aws-iso-e",
            "supportsDualStack": true,
            "supportsFIPS": true
          },
          "regionRegex": "^eu\\-isoe\\-\\w+\\-\\d+$",
          "regions": {
            "aws-iso-e-global": {
              "description": "aws-iso-e global region"
            },
            "eu-isoe-west-1": {
              "description": "EU ISOE West"
            }
          }
        },
        {
          "id": "aws-iso-f",
          "outputs": {
            "dnsSuffix": "csp.hci.ic.gov",
            "dualStackDnsSuffix": "api.aws.hci.ic.gov",
            "implicitGlobalRegion": "us-isof-south-1",
            "name": "aws-iso-f",
            "supportsDualStack": true,
            "supportsFIPS": true
          },
          "regionRegex": "^us\\-isof\\-\\w+\\-\\d+$",
          "regions": {
            "aws-iso-f-global": {
              "description": "aws-iso-f global region"
            },
            "us-isof-east-1": {
              "description": "US ISOF EAST"
            },
            "us-isof-south-1": {
              "description": "US ISOF SOUTH"
            }
          }
        },
        {
          "id": "aws-us-gov",
          "outputs": {
            "dnsSuffix": "amazonaws.com",
            "dualStackDnsSuffix": "api.aws",
            "implicitGlobalRegion": "us-gov-west-1",
            "name": "aws-us-gov",
            "supportsDualStack": true,
            "supportsFIPS": true
          },
          "regionRegex": "^us\\-gov\\-\\w+\\-\\d+$",
          "regions": {
            "aws-us-gov-global": {
              "description": "aws-us-gov global region"
            },
            "us-gov-east-1": {
              "description": "AWS GovCloud (US-East)"
            },
            "us-gov-west-1": {
              "description": "AWS GovCloud (US-West)"
            }
          }
        }
      ],
      "version": "1.1"
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/util-endpoints/lib/aws/partition.js
var selectedPartitionsInfo, selectedUserAgentPrefix, partition, getUserAgentPrefix;
var init_partition = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/util-endpoints/lib/aws/partition.js"() {
    init_partitions();
    selectedPartitionsInfo = partitionsInfo;
    selectedUserAgentPrefix = "";
    partition = /* @__PURE__ */ __name((value) => {
      const { partitions } = selectedPartitionsInfo;
      for (const partition2 of partitions) {
        const { regions, outputs } = partition2;
        for (const [region, regionData] of Object.entries(regions)) {
          if (region === value) {
            return {
              ...outputs,
              ...regionData
            };
          }
        }
      }
      for (const partition2 of partitions) {
        const { regionRegex, outputs } = partition2;
        if (new RegExp(regionRegex).test(value)) {
          return {
            ...outputs
          };
        }
      }
      const DEFAULT_PARTITION = partitions.find((partition2) => partition2.id === "aws");
      if (!DEFAULT_PARTITION) {
        throw new Error("Provided region was not found in the partition array or regex, and default partition with id 'aws' doesn't exist.");
      }
      return {
        ...DEFAULT_PARTITION.outputs
      };
    }, "partition");
    getUserAgentPrefix = /* @__PURE__ */ __name(() => selectedUserAgentPrefix, "getUserAgentPrefix");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/middleware-user-agent/check-features.js
async function checkFeatures(context, config, args) {
  const request = args.request;
  if (request?.headers?.["smithy-protocol"] === "rpc-v2-cbor") {
    setFeature2(context, "PROTOCOL_RPC_V2_CBOR", "M");
  }
  if (typeof config.retryStrategy === "function") {
    const retryStrategy = await config.retryStrategy();
    if (typeof retryStrategy.mode === "string") {
      switch (retryStrategy.mode) {
        case RETRY_MODES.ADAPTIVE:
          setFeature2(context, "RETRY_MODE_ADAPTIVE", "F");
          break;
        case RETRY_MODES.STANDARD:
          setFeature2(context, "RETRY_MODE_STANDARD", "E");
          break;
      }
    }
  }
  if (typeof config.accountIdEndpointMode === "function") {
    const endpointV2 = context.endpointV2;
    if (String(endpointV2?.url?.hostname).match(ACCOUNT_ID_ENDPOINT_REGEX)) {
      setFeature2(context, "ACCOUNT_ID_ENDPOINT", "O");
    }
    switch (await config.accountIdEndpointMode?.()) {
      case "disabled":
        setFeature2(context, "ACCOUNT_ID_MODE_DISABLED", "Q");
        break;
      case "preferred":
        setFeature2(context, "ACCOUNT_ID_MODE_PREFERRED", "P");
        break;
      case "required":
        setFeature2(context, "ACCOUNT_ID_MODE_REQUIRED", "R");
        break;
    }
  }
  const identity = context.__smithy_context?.selectedHttpAuthScheme?.identity;
  if (identity?.$source) {
    const credentials = identity;
    if (credentials.accountId) {
      setFeature2(context, "RESOLVED_ACCOUNT_ID", "T");
    }
    for (const [key, value] of Object.entries(credentials.$source ?? {})) {
      setFeature2(context, key, value);
    }
  }
}
var ACCOUNT_ID_ENDPOINT_REGEX;
var init_check_features = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/middleware-user-agent/check-features.js"() {
    init_retry2();
    init_setFeature();
    ACCOUNT_ID_ENDPOINT_REGEX = /\d{12}\.ddb/;
    __name(checkFeatures, "checkFeatures");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/middleware-user-agent/constants.js
var USER_AGENT, X_AMZ_USER_AGENT, SPACE, UA_NAME_SEPARATOR, UA_NAME_ESCAPE_REGEX, UA_VALUE_ESCAPE_REGEX, UA_ESCAPE_CHAR;
var init_constants5 = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/middleware-user-agent/constants.js"() {
    USER_AGENT = "user-agent";
    X_AMZ_USER_AGENT = "x-amz-user-agent";
    SPACE = " ";
    UA_NAME_SEPARATOR = "/";
    UA_NAME_ESCAPE_REGEX = /[^!$%&'*+\-.^_`|~\w]/g;
    UA_VALUE_ESCAPE_REGEX = /[^!$%&'*+\-.^_`|~\w#]/g;
    UA_ESCAPE_CHAR = "-";
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/middleware-user-agent/encode-features.js
function encodeFeatures(features) {
  let buffer = "";
  for (const key in features) {
    const val = features[key];
    if (buffer.length + val.length + 1 <= BYTE_LIMIT) {
      if (buffer.length) {
        buffer += "," + val;
      } else {
        buffer += val;
      }
      continue;
    }
    break;
  }
  return buffer;
}
var BYTE_LIMIT;
var init_encode_features = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/middleware-user-agent/encode-features.js"() {
    BYTE_LIMIT = 1024;
    __name(encodeFeatures, "encodeFeatures");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/middleware-user-agent/user-agent-middleware.js
var userAgentMiddleware, escapeUserAgent, getUserAgentMiddlewareOptions, getUserAgentPlugin;
var init_user_agent_middleware = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/middleware-user-agent/user-agent-middleware.js"() {
    init_protocols();
    init_partition();
    init_check_features();
    init_constants5();
    init_encode_features();
    userAgentMiddleware = /* @__PURE__ */ __name((options) => (next, context) => async (args) => {
      const { request } = args;
      if (!HttpRequest.isInstance(request)) {
        return next(args);
      }
      const { headers } = request;
      const userAgent = context?.userAgent?.map(escapeUserAgent) || [];
      const defaultUserAgent2 = (await options.defaultUserAgentProvider()).map(escapeUserAgent);
      await checkFeatures(context, options, args);
      const awsContext = context;
      defaultUserAgent2.push(`m/${encodeFeatures(Object.assign({}, context.__smithy_context?.features, awsContext.__aws_sdk_context?.features))}`);
      const customUserAgent = options?.customUserAgent?.map(escapeUserAgent) || [];
      const appId = await options.userAgentAppId();
      if (appId) {
        defaultUserAgent2.push(escapeUserAgent([`app`, `${appId}`]));
      }
      const prefix = getUserAgentPrefix();
      const sdkUserAgentValue = (prefix ? [prefix] : []).concat([...defaultUserAgent2, ...userAgent, ...customUserAgent]).join(SPACE);
      const normalUAValue = [
        ...defaultUserAgent2.filter((section) => section.startsWith("aws-sdk-")),
        ...customUserAgent
      ].join(SPACE);
      if (options.runtime !== "browser") {
        if (normalUAValue) {
          headers[X_AMZ_USER_AGENT] = headers[X_AMZ_USER_AGENT] ? `${headers[USER_AGENT]} ${normalUAValue}` : normalUAValue;
        }
        headers[USER_AGENT] = sdkUserAgentValue;
      } else {
        headers[X_AMZ_USER_AGENT] = sdkUserAgentValue;
      }
      return next({
        ...args,
        request
      });
    }, "userAgentMiddleware");
    escapeUserAgent = /* @__PURE__ */ __name((userAgentPair) => {
      const name = userAgentPair[0].split(UA_NAME_SEPARATOR).map((part) => part.replace(UA_NAME_ESCAPE_REGEX, UA_ESCAPE_CHAR)).join(UA_NAME_SEPARATOR);
      const version = userAgentPair[1]?.replace(UA_VALUE_ESCAPE_REGEX, UA_ESCAPE_CHAR);
      const prefixSeparatorIndex = name.indexOf(UA_NAME_SEPARATOR);
      const prefix = name.substring(0, prefixSeparatorIndex);
      let uaName = name.substring(prefixSeparatorIndex + 1);
      if (prefix === "api") {
        uaName = uaName.toLowerCase();
      }
      return [prefix, uaName, version].filter((item) => item && item.length > 0).reduce((acc, item, index) => {
        switch (index) {
          case 0:
            return item;
          case 1:
            return `${acc}/${item}`;
          default:
            return `${acc}#${item}`;
        }
      }, "");
    }, "escapeUserAgent");
    getUserAgentMiddlewareOptions = {
      name: "getUserAgentMiddleware",
      step: "build",
      priority: "low",
      tags: ["SET_USER_AGENT", "USER_AGENT"],
      override: true
    };
    getUserAgentPlugin = /* @__PURE__ */ __name((config) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.add(userAgentMiddleware(config), getUserAgentMiddlewareOptions);
      }, "applyToStack")
    }), "getUserAgentPlugin");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/util-user-agent-node/getRuntimeUserAgentPair.js
import { versions } from "node:process";
var getRuntimeUserAgentPair;
var init_getRuntimeUserAgentPair = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/util-user-agent-node/getRuntimeUserAgentPair.js"() {
    getRuntimeUserAgentPair = /* @__PURE__ */ __name(() => {
      const runtimesToCheck = ["deno", "bun", "llrt"];
      for (const runtime of runtimesToCheck) {
        if (versions[runtime]) {
          return [`md/${runtime}`, versions[runtime]];
        }
      }
      return ["md/nodejs", versions.node];
    }, "getRuntimeUserAgentPair");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/util-user-agent-node/crt-availability.js
var crtAvailability;
var init_crt_availability = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/util-user-agent-node/crt-availability.js"() {
    crtAvailability = {
      isCrtAvailable: false
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/util-user-agent-node/is-crt-available.js
var isCrtAvailable;
var init_is_crt_available = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/util-user-agent-node/is-crt-available.js"() {
    init_crt_availability();
    isCrtAvailable = /* @__PURE__ */ __name(() => {
      if (crtAvailability.isCrtAvailable) {
        return ["md/crt-avail"];
      }
      return null;
    }, "isCrtAvailable");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/util-user-agent-node/defaultUserAgent.js
import { platform, release } from "node:os";
import { env } from "node:process";
var createDefaultUserAgentProvider;
var init_defaultUserAgent = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/util-user-agent-node/defaultUserAgent.js"() {
    init_getRuntimeUserAgentPair();
    init_is_crt_available();
    createDefaultUserAgentProvider = /* @__PURE__ */ __name(({ serviceId, clientVersion }) => {
      const runtimeUserAgentPair = getRuntimeUserAgentPair();
      return async (config) => {
        const sections = [
          ["aws-sdk-js", clientVersion],
          ["ua", "2.1"],
          [`os/${platform()}`, release()],
          ["lang/js"],
          runtimeUserAgentPair
        ];
        const crtAvailable = isCrtAvailable();
        if (crtAvailable) {
          sections.push(crtAvailable);
        }
        if (serviceId) {
          sections.push([`api/${serviceId}`, clientVersion]);
        }
        if (env.AWS_EXECUTION_ENV) {
          sections.push([`exec-env/${env.AWS_EXECUTION_ENV}`]);
        }
        const appId = await config?.userAgentAppId?.();
        const resolvedUserAgent = appId ? [...sections, [`app/${appId}`]] : [...sections];
        return resolvedUserAgent;
      };
    }, "createDefaultUserAgentProvider");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/util-user-agent-node/nodeAppIdConfigOptions.js
var UA_APP_ID_ENV_NAME, UA_APP_ID_INI_NAME, UA_APP_ID_INI_NAME_DEPRECATED, NODE_APP_ID_CONFIG_OPTIONS;
var init_nodeAppIdConfigOptions = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/util-user-agent-node/nodeAppIdConfigOptions.js"() {
    init_configurations2();
    UA_APP_ID_ENV_NAME = "AWS_SDK_UA_APP_ID";
    UA_APP_ID_INI_NAME = "sdk_ua_app_id";
    UA_APP_ID_INI_NAME_DEPRECATED = "sdk-ua-app-id";
    NODE_APP_ID_CONFIG_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env2) => env2[UA_APP_ID_ENV_NAME], "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => profile[UA_APP_ID_INI_NAME] ?? profile[UA_APP_ID_INI_NAME_DEPRECATED], "configFileSelector"),
      default: DEFAULT_UA_APP_ID
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/util-endpoints/lib/isIpAddress.js
var init_isIpAddress2 = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/util-endpoints/lib/isIpAddress.js"() {
    init_endpoints();
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/util-endpoints/lib/aws/isVirtualHostableS3Bucket.js
var isVirtualHostableS3Bucket;
var init_isVirtualHostableS3Bucket = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/util-endpoints/lib/aws/isVirtualHostableS3Bucket.js"() {
    init_endpoints();
    init_isIpAddress2();
    isVirtualHostableS3Bucket = /* @__PURE__ */ __name((value, allowSubDomains = false) => {
      if (allowSubDomains) {
        for (const label of value.split(".")) {
          if (!isVirtualHostableS3Bucket(label)) {
            return false;
          }
        }
        return true;
      }
      if (!isValidHostLabel(value)) {
        return false;
      }
      if (value.length < 3 || value.length > 63) {
        return false;
      }
      if (value !== value.toLowerCase()) {
        return false;
      }
      if (isIpAddress(value)) {
        return false;
      }
      return true;
    }, "isVirtualHostableS3Bucket");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/util-endpoints/lib/aws/parseArn.js
var ARN_DELIMITER, RESOURCE_DELIMITER, parseArn;
var init_parseArn = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/util-endpoints/lib/aws/parseArn.js"() {
    ARN_DELIMITER = ":";
    RESOURCE_DELIMITER = "/";
    parseArn = /* @__PURE__ */ __name((value) => {
      const segments = value.split(ARN_DELIMITER);
      if (segments.length < 6)
        return null;
      const [arn, partition2, service, region, accountId, ...resourcePath] = segments;
      if (arn !== "arn" || partition2 === "" || service === "" || resourcePath.join(ARN_DELIMITER) === "")
        return null;
      const resourceId = resourcePath.map((resource) => resource.split(RESOURCE_DELIMITER)).flat();
      return {
        partition: partition2,
        service,
        region,
        accountId,
        resourceId
      };
    }, "parseArn");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/util-endpoints/aws.js
var awsEndpointFunctions;
var init_aws = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/util-endpoints/aws.js"() {
    init_endpoints();
    init_isVirtualHostableS3Bucket();
    init_parseArn();
    init_partition();
    awsEndpointFunctions = {
      isVirtualHostableS3Bucket,
      parseArn,
      partition
    };
    customEndpointFunctions.aws = awsEndpointFunctions;
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/region-config-resolver/stsRegionDefaultResolver.js
function stsRegionDefaultResolver(loaderConfig = {}) {
  return loadConfig({
    ...NODE_REGION_CONFIG_OPTIONS,
    async default() {
      if (!warning.silence) {
        console.warn("@aws-sdk - WARN - default STS region of us-east-1 used. See @aws-sdk/credential-providers README and set a region explicitly.");
      }
      return "us-east-1";
    }
  }, { ...NODE_REGION_CONFIG_FILE_OPTIONS, ...loaderConfig });
}
var warning;
var init_stsRegionDefaultResolver = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/region-config-resolver/stsRegionDefaultResolver.js"() {
    init_config2();
    __name(stsRegionDefaultResolver, "stsRegionDefaultResolver");
    warning = {
      silence: false
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/region-config-resolver/extensions.js
var getAwsRegionExtensionConfiguration, resolveAwsRegionExtensionConfiguration;
var init_extensions2 = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/region-config-resolver/extensions.js"() {
    getAwsRegionExtensionConfiguration = /* @__PURE__ */ __name((runtimeConfig) => {
      return {
        setRegion(region) {
          runtimeConfig.region = region;
        },
        region() {
          return runtimeConfig.region;
        }
      };
    }, "getAwsRegionExtensionConfiguration");
    resolveAwsRegionExtensionConfiguration = /* @__PURE__ */ __name((awsRegionExtensionConfiguration) => {
      return {
        region: awsRegionExtensionConfiguration.region()
      };
    }, "resolveAwsRegionExtensionConfiguration");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/client/index.js
var init_client3 = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/client/index.js"() {
    init_emitWarningIfUnsupportedVersion2();
    init_setCredentialFeature();
    init_hostHeaderMiddleware();
    init_loggerMiddleware();
    init_getRecursionDetectionPlugin();
    init_configurations2();
    init_user_agent_middleware();
    init_defaultUserAgent();
    init_nodeAppIdConfigOptions();
    init_aws();
    init_stsRegionDefaultResolver();
    init_extensions2();
  }
});

// node_modules/obliterator/iterator.js
var require_iterator = __commonJS({
  "node_modules/obliterator/iterator.js"(exports, module) {
    function Iterator(next) {
      Object.defineProperty(this, "_next", {
        writable: false,
        enumerable: false,
        value: next
      });
      this.done = false;
    }
    __name(Iterator, "Iterator");
    Iterator.prototype.next = function() {
      if (this.done)
        return { done: true };
      var step = this._next();
      if (step.done)
        this.done = true;
      return step;
    };
    if (typeof Symbol !== "undefined")
      Iterator.prototype[Symbol.iterator] = function() {
        return this;
      };
    Iterator.of = function() {
      var args = arguments, l4 = args.length, i6 = 0;
      return new Iterator(function() {
        if (i6 >= l4)
          return { done: true };
        return { done: false, value: args[i6++] };
      });
    };
    Iterator.empty = function() {
      var iterator = new Iterator(null);
      iterator.done = true;
      return iterator;
    };
    Iterator.is = function(value) {
      if (value instanceof Iterator)
        return true;
      return typeof value === "object" && value !== null && typeof value.next === "function";
    };
    module.exports = Iterator;
  }
});

// node_modules/obliterator/foreach.js
var require_foreach = __commonJS({
  "node_modules/obliterator/foreach.js"(exports, module) {
    var ARRAY_BUFFER_SUPPORT = typeof ArrayBuffer !== "undefined";
    var SYMBOL_SUPPORT = typeof Symbol !== "undefined";
    function forEach(iterable, callback) {
      var iterator, k6, i6, l4, s3;
      if (!iterable)
        throw new Error("obliterator/forEach: invalid iterable.");
      if (typeof callback !== "function")
        throw new Error("obliterator/forEach: expecting a callback.");
      if (Array.isArray(iterable) || ARRAY_BUFFER_SUPPORT && ArrayBuffer.isView(iterable) || typeof iterable === "string" || iterable.toString() === "[object Arguments]") {
        for (i6 = 0, l4 = iterable.length; i6 < l4; i6++)
          callback(iterable[i6], i6);
        return;
      }
      if (typeof iterable.forEach === "function") {
        iterable.forEach(callback);
        return;
      }
      if (SYMBOL_SUPPORT && Symbol.iterator in iterable && typeof iterable.next !== "function") {
        iterable = iterable[Symbol.iterator]();
      }
      if (typeof iterable.next === "function") {
        iterator = iterable;
        i6 = 0;
        while (s3 = iterator.next(), s3.done !== true) {
          callback(s3.value, i6);
          i6++;
        }
        return;
      }
      for (k6 in iterable) {
        if (iterable.hasOwnProperty(k6)) {
          callback(iterable[k6], k6);
        }
      }
      return;
    }
    __name(forEach, "forEach");
    forEach.forEachWithNullKeys = function(iterable, callback) {
      var iterator, k6, i6, l4, s3;
      if (!iterable)
        throw new Error("obliterator/forEachWithNullKeys: invalid iterable.");
      if (typeof callback !== "function")
        throw new Error("obliterator/forEachWithNullKeys: expecting a callback.");
      if (Array.isArray(iterable) || ARRAY_BUFFER_SUPPORT && ArrayBuffer.isView(iterable) || typeof iterable === "string" || iterable.toString() === "[object Arguments]") {
        for (i6 = 0, l4 = iterable.length; i6 < l4; i6++)
          callback(iterable[i6], null);
        return;
      }
      if (iterable instanceof Set) {
        iterable.forEach(function(value) {
          callback(value, null);
        });
        return;
      }
      if (typeof iterable.forEach === "function") {
        iterable.forEach(callback);
        return;
      }
      if (SYMBOL_SUPPORT && Symbol.iterator in iterable && typeof iterable.next !== "function") {
        iterable = iterable[Symbol.iterator]();
      }
      if (typeof iterable.next === "function") {
        iterator = iterable;
        i6 = 0;
        while (s3 = iterator.next(), s3.done !== true) {
          callback(s3.value, null);
          i6++;
        }
        return;
      }
      for (k6 in iterable) {
        if (iterable.hasOwnProperty(k6)) {
          callback(iterable[k6], k6);
        }
      }
      return;
    };
    module.exports = forEach;
  }
});

// node_modules/mnemonist/utils/typed-arrays.js
var require_typed_arrays = __commonJS({
  "node_modules/mnemonist/utils/typed-arrays.js"(exports) {
    var MAX_8BIT_INTEGER = Math.pow(2, 8) - 1;
    var MAX_16BIT_INTEGER = Math.pow(2, 16) - 1;
    var MAX_32BIT_INTEGER = Math.pow(2, 32) - 1;
    var MAX_SIGNED_8BIT_INTEGER = Math.pow(2, 7) - 1;
    var MAX_SIGNED_16BIT_INTEGER = Math.pow(2, 15) - 1;
    var MAX_SIGNED_32BIT_INTEGER = Math.pow(2, 31) - 1;
    exports.getPointerArray = function(size) {
      var maxIndex = size - 1;
      if (maxIndex <= MAX_8BIT_INTEGER)
        return Uint8Array;
      if (maxIndex <= MAX_16BIT_INTEGER)
        return Uint16Array;
      if (maxIndex <= MAX_32BIT_INTEGER)
        return Uint32Array;
      return Float64Array;
    };
    exports.getSignedPointerArray = function(size) {
      var maxIndex = size - 1;
      if (maxIndex <= MAX_SIGNED_8BIT_INTEGER)
        return Int8Array;
      if (maxIndex <= MAX_SIGNED_16BIT_INTEGER)
        return Int16Array;
      if (maxIndex <= MAX_SIGNED_32BIT_INTEGER)
        return Int32Array;
      return Float64Array;
    };
    exports.getNumberType = function(value) {
      if (value === (value | 0)) {
        if (Math.sign(value) === -1) {
          if (value <= 127 && value >= -128)
            return Int8Array;
          if (value <= 32767 && value >= -32768)
            return Int16Array;
          return Int32Array;
        } else {
          if (value <= 255)
            return Uint8Array;
          if (value <= 65535)
            return Uint16Array;
          return Uint32Array;
        }
      }
      return Float64Array;
    };
    var TYPE_PRIORITY = {
      Uint8Array: 1,
      Int8Array: 2,
      Uint16Array: 3,
      Int16Array: 4,
      Uint32Array: 5,
      Int32Array: 6,
      Float32Array: 7,
      Float64Array: 8
    };
    exports.getMinimalRepresentation = function(array, getter) {
      var maxType = null, maxPriority = 0, p4, t2, v2, i6, l4;
      for (i6 = 0, l4 = array.length; i6 < l4; i6++) {
        v2 = getter ? getter(array[i6]) : array[i6];
        t2 = exports.getNumberType(v2);
        p4 = TYPE_PRIORITY[t2.name];
        if (p4 > maxPriority) {
          maxPriority = p4;
          maxType = t2;
        }
      }
      return maxType;
    };
    exports.isTypedArray = function(value) {
      return typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value);
    };
    exports.concat = function() {
      var length = 0, i6, o4, l4;
      for (i6 = 0, l4 = arguments.length; i6 < l4; i6++)
        length += arguments[i6].length;
      var array = new arguments[0].constructor(length);
      for (i6 = 0, o4 = 0; i6 < l4; i6++) {
        array.set(arguments[i6], o4);
        o4 += arguments[i6].length;
      }
      return array;
    };
    exports.indices = function(length) {
      var PointerArray = exports.getPointerArray(length);
      var array = new PointerArray(length);
      for (var i6 = 0; i6 < length; i6++)
        array[i6] = i6;
      return array;
    };
  }
});

// node_modules/mnemonist/utils/iterables.js
var require_iterables = __commonJS({
  "node_modules/mnemonist/utils/iterables.js"(exports) {
    var forEach = require_foreach();
    var typed = require_typed_arrays();
    function isArrayLike(target) {
      return Array.isArray(target) || typed.isTypedArray(target);
    }
    __name(isArrayLike, "isArrayLike");
    function guessLength(target) {
      if (typeof target.length === "number")
        return target.length;
      if (typeof target.size === "number")
        return target.size;
      return;
    }
    __name(guessLength, "guessLength");
    function toArray(target) {
      var l4 = guessLength(target);
      var array = typeof l4 === "number" ? new Array(l4) : [];
      var i6 = 0;
      forEach(target, function(value) {
        array[i6++] = value;
      });
      return array;
    }
    __name(toArray, "toArray");
    function toArrayWithIndices(target) {
      var l4 = guessLength(target);
      var IndexArray = typeof l4 === "number" ? typed.getPointerArray(l4) : Array;
      var array = typeof l4 === "number" ? new Array(l4) : [];
      var indices = typeof l4 === "number" ? new IndexArray(l4) : [];
      var i6 = 0;
      forEach(target, function(value) {
        array[i6] = value;
        indices[i6] = i6++;
      });
      return [array, indices];
    }
    __name(toArrayWithIndices, "toArrayWithIndices");
    exports.isArrayLike = isArrayLike;
    exports.guessLength = guessLength;
    exports.toArray = toArray;
    exports.toArrayWithIndices = toArrayWithIndices;
  }
});

// node_modules/mnemonist/lru-cache.js
var require_lru_cache = __commonJS({
  "node_modules/mnemonist/lru-cache.js"(exports, module) {
    var Iterator = require_iterator();
    var forEach = require_foreach();
    var typed = require_typed_arrays();
    var iterables = require_iterables();
    function LRUCache2(Keys, Values, capacity) {
      if (arguments.length < 2) {
        capacity = Keys;
        Keys = null;
        Values = null;
      }
      this.capacity = capacity;
      if (typeof this.capacity !== "number" || this.capacity <= 0)
        throw new Error("mnemonist/lru-cache: capacity should be positive number.");
      var PointerArray = typed.getPointerArray(capacity);
      this.forward = new PointerArray(capacity);
      this.backward = new PointerArray(capacity);
      this.K = typeof Keys === "function" ? new Keys(capacity) : new Array(capacity);
      this.V = typeof Values === "function" ? new Values(capacity) : new Array(capacity);
      this.size = 0;
      this.head = 0;
      this.tail = 0;
      this.items = {};
    }
    __name(LRUCache2, "LRUCache");
    LRUCache2.prototype.clear = function() {
      this.size = 0;
      this.head = 0;
      this.tail = 0;
      this.items = {};
    };
    LRUCache2.prototype.splayOnTop = function(pointer) {
      var oldHead = this.head;
      if (this.head === pointer)
        return this;
      var previous = this.backward[pointer], next = this.forward[pointer];
      if (this.tail === pointer) {
        this.tail = previous;
      } else {
        this.backward[next] = previous;
      }
      this.forward[previous] = next;
      this.backward[oldHead] = pointer;
      this.head = pointer;
      this.forward[pointer] = oldHead;
      return this;
    };
    LRUCache2.prototype.set = function(key, value) {
      var pointer = this.items[key];
      if (typeof pointer !== "undefined") {
        this.splayOnTop(pointer);
        this.V[pointer] = value;
        return;
      }
      if (this.size < this.capacity) {
        pointer = this.size++;
      } else {
        pointer = this.tail;
        this.tail = this.backward[pointer];
        delete this.items[this.K[pointer]];
      }
      this.items[key] = pointer;
      this.K[pointer] = key;
      this.V[pointer] = value;
      this.forward[pointer] = this.head;
      this.backward[this.head] = pointer;
      this.head = pointer;
    };
    LRUCache2.prototype.setpop = function(key, value) {
      var oldValue = null;
      var oldKey = null;
      var pointer = this.items[key];
      if (typeof pointer !== "undefined") {
        this.splayOnTop(pointer);
        oldValue = this.V[pointer];
        this.V[pointer] = value;
        return { evicted: false, key, value: oldValue };
      }
      if (this.size < this.capacity) {
        pointer = this.size++;
      } else {
        pointer = this.tail;
        this.tail = this.backward[pointer];
        oldValue = this.V[pointer];
        oldKey = this.K[pointer];
        delete this.items[this.K[pointer]];
      }
      this.items[key] = pointer;
      this.K[pointer] = key;
      this.V[pointer] = value;
      this.forward[pointer] = this.head;
      this.backward[this.head] = pointer;
      this.head = pointer;
      if (oldKey) {
        return { evicted: true, key: oldKey, value: oldValue };
      } else {
        return null;
      }
    };
    LRUCache2.prototype.has = function(key) {
      return key in this.items;
    };
    LRUCache2.prototype.get = function(key) {
      var pointer = this.items[key];
      if (typeof pointer === "undefined")
        return;
      this.splayOnTop(pointer);
      return this.V[pointer];
    };
    LRUCache2.prototype.peek = function(key) {
      var pointer = this.items[key];
      if (typeof pointer === "undefined")
        return;
      return this.V[pointer];
    };
    LRUCache2.prototype.forEach = function(callback, scope) {
      scope = arguments.length > 1 ? scope : this;
      var i6 = 0, l4 = this.size;
      var pointer = this.head, keys = this.K, values = this.V, forward = this.forward;
      while (i6 < l4) {
        callback.call(scope, values[pointer], keys[pointer], this);
        pointer = forward[pointer];
        i6++;
      }
    };
    LRUCache2.prototype.keys = function() {
      var i6 = 0, l4 = this.size;
      var pointer = this.head, keys = this.K, forward = this.forward;
      return new Iterator(function() {
        if (i6 >= l4)
          return { done: true };
        var key = keys[pointer];
        i6++;
        if (i6 < l4)
          pointer = forward[pointer];
        return {
          done: false,
          value: key
        };
      });
    };
    LRUCache2.prototype.values = function() {
      var i6 = 0, l4 = this.size;
      var pointer = this.head, values = this.V, forward = this.forward;
      return new Iterator(function() {
        if (i6 >= l4)
          return { done: true };
        var value = values[pointer];
        i6++;
        if (i6 < l4)
          pointer = forward[pointer];
        return {
          done: false,
          value
        };
      });
    };
    LRUCache2.prototype.entries = function() {
      var i6 = 0, l4 = this.size;
      var pointer = this.head, keys = this.K, values = this.V, forward = this.forward;
      return new Iterator(function() {
        if (i6 >= l4)
          return { done: true };
        var key = keys[pointer], value = values[pointer];
        i6++;
        if (i6 < l4)
          pointer = forward[pointer];
        return {
          done: false,
          value: [key, value]
        };
      });
    };
    if (typeof Symbol !== "undefined")
      LRUCache2.prototype[Symbol.iterator] = LRUCache2.prototype.entries;
    LRUCache2.prototype.inspect = function() {
      var proxy = /* @__PURE__ */ new Map();
      var iterator = this.entries(), step;
      while (step = iterator.next(), !step.done)
        proxy.set(step.value[0], step.value[1]);
      Object.defineProperty(proxy, "constructor", {
        value: LRUCache2,
        enumerable: false
      });
      return proxy;
    };
    if (typeof Symbol !== "undefined")
      LRUCache2.prototype[/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")] = LRUCache2.prototype.inspect;
    LRUCache2.from = function(iterable, Keys, Values, capacity) {
      if (arguments.length < 2) {
        capacity = iterables.guessLength(iterable);
        if (typeof capacity !== "number")
          throw new Error("mnemonist/lru-cache.from: could not guess iterable length. Please provide desired capacity as last argument.");
      } else if (arguments.length === 2) {
        capacity = Keys;
        Keys = null;
        Values = null;
      }
      var cache6 = new LRUCache2(Keys, Values, capacity);
      forEach(iterable, function(value, key) {
        cache6.set(key, value);
      });
      return cache6;
    };
    module.exports = LRUCache2;
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/getDateHeader.js
var getDateHeader, getAgeHeader;
var init_getDateHeader = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/getDateHeader.js"() {
    init_protocols();
    getDateHeader = /* @__PURE__ */ __name((response) => HttpResponse.isInstance(response) ? response.headers?.date ?? response.headers?.Date : void 0, "getDateHeader");
    getAgeHeader = /* @__PURE__ */ __name((response) => HttpResponse.isInstance(response) ? response.headers?.age ?? response.headers?.Age : void 0, "getAgeHeader");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/getSkewCorrectedDate.js
var getSkewCorrectedDate;
var init_getSkewCorrectedDate = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/getSkewCorrectedDate.js"() {
    getSkewCorrectedDate = /* @__PURE__ */ __name((systemClockOffset) => new Date(Date.now() + systemClockOffset), "getSkewCorrectedDate");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/getUpdatedSystemClockOffset.js
var getUpdatedSystemClockOffset;
var init_getUpdatedSystemClockOffset = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/getUpdatedSystemClockOffset.js"() {
    getUpdatedSystemClockOffset = /* @__PURE__ */ __name((clockTime, currentSystemClockOffset, timeRequestSent, ageHeader) => {
      if (ageHeader !== void 0) {
        return currentSystemClockOffset;
      }
      const serverTime = Date.parse(clockTime);
      const timeResponseReceived = Date.now();
      if (timeRequestSent !== void 0 && timeResponseReceived - timeRequestSent > 9e5) {
        return currentSystemClockOffset;
      }
      const candidateSkew = timeRequestSent !== void 0 ? serverTime - (timeRequestSent + timeResponseReceived) / 2 : serverTime - timeResponseReceived;
      return candidateSkew;
    }, "getUpdatedSystemClockOffset");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/index.js
var init_utils2 = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/index.js"() {
    init_getDateHeader();
    init_getSkewCorrectedDate();
    init_getUpdatedSystemClockOffset();
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/AwsSdkSigV4Signer.js
var throwSigningPropertyError, hasEventStreamOutput, validateSigningProperties, AwsSdkSigV4Signer;
var init_AwsSdkSigV4Signer = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/AwsSdkSigV4Signer.js"() {
    init_protocols();
    init_dist_es();
    init_utils2();
    throwSigningPropertyError = /* @__PURE__ */ __name((name, property) => {
      if (!property) {
        throw new Error(`Property \`${name}\` is not resolved for AWS SDK SigV4Auth`);
      }
      return property;
    }, "throwSigningPropertyError");
    hasEventStreamOutput = /* @__PURE__ */ __name((signingProperties) => {
      const context = signingProperties.context;
      const eventStream = context?.[SMITHY_CONTEXT_KEY]?.eventStream;
      return eventStream?.output === true;
    }, "hasEventStreamOutput");
    validateSigningProperties = /* @__PURE__ */ __name(async (signingProperties) => {
      const context = throwSigningPropertyError("context", signingProperties.context);
      const config = throwSigningPropertyError("config", signingProperties.config);
      const authScheme = context.endpointV2?.properties?.authSchemes?.[0];
      const signerFunction = throwSigningPropertyError("signer", config.signer);
      const signer = await signerFunction(authScheme);
      const signingRegion = signingProperties?.signingRegion;
      const signingRegionSet = signingProperties?.signingRegionSet;
      const signingName = signingProperties?.signingName;
      return {
        config,
        signer,
        signingRegion,
        signingRegionSet,
        signingName
      };
    }, "validateSigningProperties");
    AwsSdkSigV4Signer = class {
      static {
        __name(this, "AwsSdkSigV4Signer");
      }
      async sign(httpRequest2, identity, signingProperties) {
        if (!HttpRequest.isInstance(httpRequest2)) {
          throw new Error("The request is not an instance of `HttpRequest` and cannot be signed");
        }
        const validatedProps = await validateSigningProperties(signingProperties);
        const { config, signer } = validatedProps;
        let { signingRegion, signingName } = validatedProps;
        const handlerExecutionContext = signingProperties.context;
        if (handlerExecutionContext?.authSchemes?.length ?? 0 > 1) {
          const [first, second] = handlerExecutionContext.authSchemes;
          if (first?.name === "sigv4a" && second?.name === "sigv4") {
            signingRegion = second?.signingRegion ?? signingRegion;
            signingName = second?.signingName ?? signingName;
          }
        }
        const noSkewCorrection = await config.disableClockSkewCorrection?.() === true;
        signingProperties._disableClockSkewCorrection = noSkewCorrection;
        const skipSkewSampling = noSkewCorrection || hasEventStreamOutput(signingProperties);
        signingProperties._skipClockSkewSampling = skipSkewSampling;
        if (!skipSkewSampling) {
          signingProperties._preRequestSystemClockOffset = config.systemClockOffset;
          signingProperties._requestSentAt = Date.now();
        }
        const signedRequest = await signer.sign(httpRequest2, {
          signingDate: noSkewCorrection ? /* @__PURE__ */ new Date() : getSkewCorrectedDate(config.systemClockOffset),
          signingRegion,
          signingService: signingName
        });
        return signedRequest;
      }
      errorHandler(signingProperties) {
        return (error) => {
          const errorException = error;
          if (!signingProperties._skipClockSkewSampling && !signingProperties._disableClockSkewCorrection) {
            const serverTime = errorException.ServerTime ?? getDateHeader(errorException.$response);
            if (serverTime) {
              const config = throwSigningPropertyError("config", signingProperties.config);
              const preRequestOffset = signingProperties._preRequestSystemClockOffset;
              const timeRequestSent = signingProperties._requestSentAt;
              const ageHeader = getAgeHeader(errorException.$response);
              const newOffset = getUpdatedSystemClockOffset(serverTime, config.systemClockOffset, timeRequestSent, ageHeader);
              config.systemClockOffset = newOffset;
              const skewExceedsThreshold = Math.abs(newOffset) >= 24e4;
              const isLocalCorrection = newOffset !== preRequestOffset;
              const isConcurrentCorrection = preRequestOffset !== void 0 && preRequestOffset !== newOffset;
              if (skewExceedsThreshold && (isLocalCorrection || isConcurrentCorrection) && errorException.$metadata) {
                errorException.$metadata.clockSkewCorrected = true;
              }
            }
          }
          throw error;
        };
      }
      successHandler(httpResponse, signingProperties) {
        if (signingProperties._skipClockSkewSampling || signingProperties._disableClockSkewCorrection) {
          return;
        }
        const dateHeader = getDateHeader(httpResponse);
        if (dateHeader) {
          const config = throwSigningPropertyError("config", signingProperties.config);
          const timeRequestSent = signingProperties._requestSentAt;
          const ageHeader = getAgeHeader(httpResponse);
          config.systemClockOffset = getUpdatedSystemClockOffset(dateHeader, config.systemClockOffset, timeRequestSent, ageHeader);
        }
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/AwsSdkSigV4ASigner.js
var AwsSdkSigV4ASigner;
var init_AwsSdkSigV4ASigner = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/AwsSdkSigV4ASigner.js"() {
    init_protocols();
    init_utils2();
    init_AwsSdkSigV4Signer();
    AwsSdkSigV4ASigner = class extends AwsSdkSigV4Signer {
      static {
        __name(this, "AwsSdkSigV4ASigner");
      }
      async sign(httpRequest2, identity, signingProperties) {
        if (!HttpRequest.isInstance(httpRequest2)) {
          throw new Error("The request is not an instance of `HttpRequest` and cannot be signed");
        }
        const { config, signer, signingRegion, signingRegionSet, signingName } = await validateSigningProperties(signingProperties);
        const configResolvedSigningRegionSet = await config.sigv4aSigningRegionSet?.();
        const multiRegionOverride = (configResolvedSigningRegionSet ?? signingRegionSet ?? [signingRegion]).join(",");
        const noSkewCorrection = await config.disableClockSkewCorrection?.() === true;
        signingProperties._disableClockSkewCorrection = noSkewCorrection;
        if (!noSkewCorrection) {
          signingProperties._preRequestSystemClockOffset = config.systemClockOffset;
          signingProperties._requestSentAt = Date.now();
        }
        const signedRequest = await signer.sign(httpRequest2, {
          signingDate: noSkewCorrection ? /* @__PURE__ */ new Date() : getSkewCorrectedDate(config.systemClockOffset),
          signingRegion: multiRegionOverride,
          signingService: signingName
        });
        return signedRequest;
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/getArrayForCommaSeparatedString.js
var getArrayForCommaSeparatedString;
var init_getArrayForCommaSeparatedString = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/getArrayForCommaSeparatedString.js"() {
    getArrayForCommaSeparatedString = /* @__PURE__ */ __name((str) => typeof str === "string" && str.length > 0 ? str.split(",").map((item) => item.trim()) : [], "getArrayForCommaSeparatedString");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/getBearerTokenEnvKey.js
var getBearerTokenEnvKey;
var init_getBearerTokenEnvKey = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/getBearerTokenEnvKey.js"() {
    getBearerTokenEnvKey = /* @__PURE__ */ __name((signingName) => `AWS_BEARER_TOKEN_${signingName.replace(/[\s-]/g, "_").toUpperCase()}`, "getBearerTokenEnvKey");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/NODE_AUTH_SCHEME_PREFERENCE_OPTIONS.js
var NODE_AUTH_SCHEME_PREFERENCE_ENV_KEY, NODE_AUTH_SCHEME_PREFERENCE_CONFIG_KEY, NODE_AUTH_SCHEME_PREFERENCE_OPTIONS;
var init_NODE_AUTH_SCHEME_PREFERENCE_OPTIONS = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/NODE_AUTH_SCHEME_PREFERENCE_OPTIONS.js"() {
    init_getArrayForCommaSeparatedString();
    init_getBearerTokenEnvKey();
    NODE_AUTH_SCHEME_PREFERENCE_ENV_KEY = "AWS_AUTH_SCHEME_PREFERENCE";
    NODE_AUTH_SCHEME_PREFERENCE_CONFIG_KEY = "auth_scheme_preference";
    NODE_AUTH_SCHEME_PREFERENCE_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env2, options) => {
        if (options?.signingName) {
          const bearerTokenKey = getBearerTokenEnvKey(options.signingName);
          if (bearerTokenKey in env2)
            return ["httpBearerAuth"];
        }
        if (!(NODE_AUTH_SCHEME_PREFERENCE_ENV_KEY in env2))
          return void 0;
        return getArrayForCommaSeparatedString(env2[NODE_AUTH_SCHEME_PREFERENCE_ENV_KEY]);
      }, "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => {
        if (!(NODE_AUTH_SCHEME_PREFERENCE_CONFIG_KEY in profile))
          return void 0;
        return getArrayForCommaSeparatedString(profile[NODE_AUTH_SCHEME_PREFERENCE_CONFIG_KEY]);
      }, "configFileSelector"),
      default: []
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/resolveAwsSdkSigV4AConfig.js
var resolveAwsSdkSigV4AConfig, NODE_SIGV4A_CONFIG_OPTIONS;
var init_resolveAwsSdkSigV4AConfig = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/resolveAwsSdkSigV4AConfig.js"() {
    init_dist_es2();
    init_config2();
    resolveAwsSdkSigV4AConfig = /* @__PURE__ */ __name((config) => {
      config.sigv4aSigningRegionSet = normalizeProvider2(config.sigv4aSigningRegionSet);
      return config;
    }, "resolveAwsSdkSigV4AConfig");
    NODE_SIGV4A_CONFIG_OPTIONS = {
      environmentVariableSelector(env2) {
        if (env2.AWS_SIGV4A_SIGNING_REGION_SET) {
          return env2.AWS_SIGV4A_SIGNING_REGION_SET.split(",").map((_) => _.trim());
        }
        throw new ProviderError("AWS_SIGV4A_SIGNING_REGION_SET not set in env.", {
          tryNextLink: true
        });
      },
      configFileSelector(profile) {
        if (profile.sigv4a_signing_region_set) {
          return (profile.sigv4a_signing_region_set ?? "").split(",").map((_) => _.trim());
        }
        throw new ProviderError("sigv4a_signing_region_set not set in profile.", {
          tryNextLink: true
        });
      },
      default: void 0
    };
  }
});

// node_modules/@smithy/signature-v4/dist-es/HeaderFormatter.js
function negate2(bytes) {
  for (let i6 = 0; i6 < 8; i6++) {
    bytes[i6] ^= 255;
  }
  for (let i6 = 7; i6 > -1; i6--) {
    bytes[i6]++;
    if (bytes[i6] !== 0)
      break;
  }
}
var HeaderFormatter, HEADER_VALUE_TYPE2, UUID_PATTERN2, Int642;
var init_HeaderFormatter = __esm({
  "node_modules/@smithy/signature-v4/dist-es/HeaderFormatter.js"() {
    init_serde();
    init_serde();
    HeaderFormatter = class {
      static {
        __name(this, "HeaderFormatter");
      }
      format(headers) {
        const chunks = [];
        for (const headerName in headers) {
          if (!hasOwn(headers, headerName))
            continue;
          const bytes = fromUtf8(headerName);
          chunks.push(Uint8Array.from([bytes.byteLength]), bytes, this.formatHeaderValue(headers[headerName]));
        }
        const out = new Uint8Array(chunks.reduce((carry, bytes) => carry + bytes.byteLength, 0));
        let position = 0;
        for (const chunk of chunks) {
          out.set(chunk, position);
          position += chunk.byteLength;
        }
        return out;
      }
      formatHeaderValue(header) {
        switch (header.type) {
          case "boolean":
            return Uint8Array.from([header.value ? 0 : 1]);
          case "byte":
            return Uint8Array.from([2, header.value]);
          case "short":
            const shortView = new DataView(new ArrayBuffer(3));
            shortView.setUint8(0, 3);
            shortView.setInt16(1, header.value, false);
            return new Uint8Array(shortView.buffer);
          case "integer":
            const intView = new DataView(new ArrayBuffer(5));
            intView.setUint8(0, 4);
            intView.setInt32(1, header.value, false);
            return new Uint8Array(intView.buffer);
          case "long":
            const longBytes = new Uint8Array(9);
            longBytes[0] = 5;
            longBytes.set(header.value.bytes, 1);
            return longBytes;
          case "binary":
            const binView = new DataView(new ArrayBuffer(3 + header.value.byteLength));
            binView.setUint8(0, 6);
            binView.setUint16(1, header.value.byteLength, false);
            const binBytes = new Uint8Array(binView.buffer);
            binBytes.set(header.value, 3);
            return binBytes;
          case "string":
            const utf8Bytes = fromUtf8(header.value);
            const strView = new DataView(new ArrayBuffer(3 + utf8Bytes.byteLength));
            strView.setUint8(0, 7);
            strView.setUint16(1, utf8Bytes.byteLength, false);
            const strBytes = new Uint8Array(strView.buffer);
            strBytes.set(utf8Bytes, 3);
            return strBytes;
          case "timestamp":
            const tsBytes = new Uint8Array(9);
            tsBytes[0] = 8;
            tsBytes.set(Int642.fromNumber(header.value.valueOf()).bytes, 1);
            return tsBytes;
          case "uuid":
            if (!UUID_PATTERN2.test(header.value)) {
              throw new Error(`Invalid UUID received: ${header.value}`);
            }
            const uuidBytes = new Uint8Array(17);
            uuidBytes[0] = 9;
            uuidBytes.set(fromHex(header.value.replace(/-/g, "")), 1);
            return uuidBytes;
        }
      }
    };
    (function(HEADER_VALUE_TYPE3) {
      HEADER_VALUE_TYPE3[HEADER_VALUE_TYPE3["boolTrue"] = 0] = "boolTrue";
      HEADER_VALUE_TYPE3[HEADER_VALUE_TYPE3["boolFalse"] = 1] = "boolFalse";
      HEADER_VALUE_TYPE3[HEADER_VALUE_TYPE3["byte"] = 2] = "byte";
      HEADER_VALUE_TYPE3[HEADER_VALUE_TYPE3["short"] = 3] = "short";
      HEADER_VALUE_TYPE3[HEADER_VALUE_TYPE3["integer"] = 4] = "integer";
      HEADER_VALUE_TYPE3[HEADER_VALUE_TYPE3["long"] = 5] = "long";
      HEADER_VALUE_TYPE3[HEADER_VALUE_TYPE3["byteArray"] = 6] = "byteArray";
      HEADER_VALUE_TYPE3[HEADER_VALUE_TYPE3["string"] = 7] = "string";
      HEADER_VALUE_TYPE3[HEADER_VALUE_TYPE3["timestamp"] = 8] = "timestamp";
      HEADER_VALUE_TYPE3[HEADER_VALUE_TYPE3["uuid"] = 9] = "uuid";
    })(HEADER_VALUE_TYPE2 || (HEADER_VALUE_TYPE2 = {}));
    UUID_PATTERN2 = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
    Int642 = class _Int64 {
      static {
        __name(this, "Int64");
      }
      bytes;
      constructor(bytes) {
        this.bytes = bytes;
        if (bytes.byteLength !== 8) {
          throw new Error("Int64 buffers must be exactly 8 bytes");
        }
      }
      static fromNumber(number) {
        if (number > 9223372036854776e3 || number < -9223372036854776e3) {
          throw new Error(`${number} is too large (or, if negative, too small) to represent as an Int64`);
        }
        const bytes = new Uint8Array(8);
        for (let i6 = 7, remaining = Math.abs(Math.round(number)); i6 > -1 && remaining > 0; i6--, remaining /= 256) {
          bytes[i6] = remaining;
        }
        if (number < 0) {
          negate2(bytes);
        }
        return new _Int64(bytes);
      }
      valueOf() {
        const bytes = this.bytes.slice(0);
        const negative = bytes[0] & 128;
        if (negative) {
          negate2(bytes);
        }
        return parseInt(toHex(bytes), 16) * (negative ? -1 : 1);
      }
      toString() {
        return String(this.valueOf());
      }
    };
    __name(negate2, "negate");
  }
});

// node_modules/@smithy/signature-v4/dist-es/constants.js
var ALGORITHM_QUERY_PARAM, CREDENTIAL_QUERY_PARAM, AMZ_DATE_QUERY_PARAM, SIGNED_HEADERS_QUERY_PARAM, EXPIRES_QUERY_PARAM, SIGNATURE_QUERY_PARAM, TOKEN_QUERY_PARAM, AUTH_HEADER, AMZ_DATE_HEADER, DATE_HEADER, GENERATED_HEADERS, SIGNATURE_HEADER, SHA256_HEADER, TOKEN_HEADER, ALWAYS_UNSIGNABLE_HEADERS, PROXY_HEADER_PATTERN, SEC_HEADER_PATTERN, ALGORITHM_IDENTIFIER, EVENT_ALGORITHM_IDENTIFIER, UNSIGNED_PAYLOAD, MAX_CACHE_SIZE, KEY_TYPE_IDENTIFIER, MAX_PRESIGNED_TTL;
var init_constants6 = __esm({
  "node_modules/@smithy/signature-v4/dist-es/constants.js"() {
    ALGORITHM_QUERY_PARAM = "X-Amz-Algorithm";
    CREDENTIAL_QUERY_PARAM = "X-Amz-Credential";
    AMZ_DATE_QUERY_PARAM = "X-Amz-Date";
    SIGNED_HEADERS_QUERY_PARAM = "X-Amz-SignedHeaders";
    EXPIRES_QUERY_PARAM = "X-Amz-Expires";
    SIGNATURE_QUERY_PARAM = "X-Amz-Signature";
    TOKEN_QUERY_PARAM = "X-Amz-Security-Token";
    AUTH_HEADER = "authorization";
    AMZ_DATE_HEADER = AMZ_DATE_QUERY_PARAM.toLowerCase();
    DATE_HEADER = "date";
    GENERATED_HEADERS = [AUTH_HEADER, AMZ_DATE_HEADER, DATE_HEADER];
    SIGNATURE_HEADER = SIGNATURE_QUERY_PARAM.toLowerCase();
    SHA256_HEADER = "x-amz-content-sha256";
    TOKEN_HEADER = TOKEN_QUERY_PARAM.toLowerCase();
    ALWAYS_UNSIGNABLE_HEADERS = {
      authorization: true,
      "cache-control": true,
      connection: true,
      expect: true,
      from: true,
      "keep-alive": true,
      "max-forwards": true,
      pragma: true,
      referer: true,
      te: true,
      trailer: true,
      "transfer-encoding": true,
      upgrade: true,
      "user-agent": true,
      "x-amzn-trace-id": true
    };
    PROXY_HEADER_PATTERN = /^proxy-/;
    SEC_HEADER_PATTERN = /^sec-/;
    ALGORITHM_IDENTIFIER = "AWS4-HMAC-SHA256";
    EVENT_ALGORITHM_IDENTIFIER = "AWS4-HMAC-SHA256-PAYLOAD";
    UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD";
    MAX_CACHE_SIZE = 50;
    KEY_TYPE_IDENTIFIER = "aws4_request";
    MAX_PRESIGNED_TTL = 60 * 60 * 24 * 7;
  }
});

// node_modules/@smithy/signature-v4/dist-es/getCanonicalQuery.js
var getCanonicalQuery;
var init_getCanonicalQuery = __esm({
  "node_modules/@smithy/signature-v4/dist-es/getCanonicalQuery.js"() {
    init_serde();
    init_protocols();
    init_constants6();
    getCanonicalQuery = /* @__PURE__ */ __name(({ query = {} }) => {
      const keys = [];
      const serialized = {};
      for (const key in query) {
        if (!hasOwn(query, key))
          continue;
        if (key.toLowerCase() === SIGNATURE_HEADER) {
          continue;
        }
        const encodedKey = escapeUri(key);
        keys.push(encodedKey);
        const value = query[key];
        if (typeof value === "string") {
          serialized[encodedKey] = `${encodedKey}=${escapeUri(value)}`;
        } else if (Array.isArray(value)) {
          serialized[encodedKey] = value.slice(0).reduce((encoded, value2) => encoded.concat([`${encodedKey}=${escapeUri(value2)}`]), []).sort().join("&");
        }
      }
      return keys.sort().map((key) => serialized[key]).filter((serialized2) => serialized2).join("&");
    }, "getCanonicalQuery");
  }
});

// node_modules/@smithy/signature-v4/dist-es/utilDate.js
var iso8601, toDate;
var init_utilDate = __esm({
  "node_modules/@smithy/signature-v4/dist-es/utilDate.js"() {
    iso8601 = /* @__PURE__ */ __name((time2) => toDate(time2).toISOString().replace(/\.\d{3}Z$/, "Z"), "iso8601");
    toDate = /* @__PURE__ */ __name((time2) => {
      if (typeof time2 === "number") {
        return new Date(time2 * 1e3);
      }
      if (typeof time2 === "string") {
        if (Number(time2)) {
          return new Date(Number(time2) * 1e3);
        }
        return new Date(time2);
      }
      return time2;
    }, "toDate");
  }
});

// node_modules/@smithy/signature-v4/dist-es/SignatureV4Base.js
var SignatureV4Base;
var init_SignatureV4Base = __esm({
  "node_modules/@smithy/signature-v4/dist-es/SignatureV4Base.js"() {
    init_client2();
    init_protocols();
    init_serde();
    init_getCanonicalQuery();
    init_utilDate();
    SignatureV4Base = class {
      static {
        __name(this, "SignatureV4Base");
      }
      service;
      regionProvider;
      credentialProvider;
      sha256;
      uriEscapePath;
      applyChecksum;
      constructor({ applyChecksum, credentials, region, service, sha256, uriEscapePath = true }) {
        this.service = service;
        this.sha256 = sha256;
        this.uriEscapePath = uriEscapePath;
        this.applyChecksum = typeof applyChecksum === "boolean" ? applyChecksum : true;
        this.regionProvider = normalizeProvider(region);
        this.credentialProvider = normalizeProvider(credentials);
      }
      createCanonicalRequest(request, canonicalHeaders, payloadHash) {
        const sortedHeaders = Object.keys(canonicalHeaders).sort();
        return `${request.method}
${this.getCanonicalPath(request)}
${getCanonicalQuery(request)}
${sortedHeaders.map((name) => `${name}:${canonicalHeaders[name]}`).join("\n")}

${sortedHeaders.join(";")}
${payloadHash}`;
      }
      async createStringToSign(longDate, credentialScope, canonicalRequest, algorithmIdentifier) {
        const hash = new this.sha256();
        hash.update(toUint8Array(canonicalRequest));
        const hashedRequest = await hash.digest();
        return `${algorithmIdentifier}
${longDate}
${credentialScope}
${toHex(hashedRequest)}`;
      }
      getCanonicalPath({ path }) {
        if (this.uriEscapePath) {
          const normalizedPathSegments = [];
          for (const pathSegment of path.split("/")) {
            if (pathSegment?.length === 0)
              continue;
            if (pathSegment === ".")
              continue;
            if (pathSegment === "..") {
              normalizedPathSegments.pop();
            } else {
              normalizedPathSegments.push(pathSegment);
            }
          }
          const normalizedPath = `${path?.startsWith("/") ? "/" : ""}${normalizedPathSegments.join("/")}${normalizedPathSegments.length > 0 && path?.endsWith("/") ? "/" : ""}`;
          const doubleEncoded = escapeUri(normalizedPath);
          return doubleEncoded.replace(/%2F/g, "/");
        }
        return path;
      }
      validateResolvedCredentials(credentials) {
        if (typeof credentials !== "object" || typeof credentials.accessKeyId !== "string" || typeof credentials.secretAccessKey !== "string") {
          throw new Error("Resolved credential object is not valid");
        }
      }
      formatDate(now) {
        const longDate = iso8601(now).replace(/[-:]/g, "");
        return {
          longDate,
          shortDate: longDate.slice(0, 8)
        };
      }
      getCanonicalHeaderList(headers) {
        return Object.keys(headers).sort().join(";");
      }
    };
  }
});

// node_modules/@smithy/signature-v4/dist-es/credentialDerivation.js
var signingKeyCache, cacheQueue, createScope, getSigningKey, hmac;
var init_credentialDerivation = __esm({
  "node_modules/@smithy/signature-v4/dist-es/credentialDerivation.js"() {
    init_serde();
    init_constants6();
    signingKeyCache = {};
    cacheQueue = [];
    createScope = /* @__PURE__ */ __name((shortDate, region, service) => `${shortDate}/${region}/${service}/${KEY_TYPE_IDENTIFIER}`, "createScope");
    getSigningKey = /* @__PURE__ */ __name(async (sha256Constructor, credentials, shortDate, region, service) => {
      const credsHash = await hmac(sha256Constructor, credentials.secretAccessKey, credentials.accessKeyId);
      const cacheKey = `${shortDate}:${region}:${service}:${toHex(credsHash)}:${credentials.sessionToken}`;
      if (cacheKey in signingKeyCache) {
        return signingKeyCache[cacheKey];
      }
      cacheQueue.push(cacheKey);
      while (cacheQueue.length > MAX_CACHE_SIZE) {
        delete signingKeyCache[cacheQueue.shift()];
      }
      let key = `AWS4${credentials.secretAccessKey}`;
      for (const signable of [shortDate, region, service, KEY_TYPE_IDENTIFIER]) {
        key = await hmac(sha256Constructor, key, signable);
      }
      return signingKeyCache[cacheKey] = key;
    }, "getSigningKey");
    hmac = /* @__PURE__ */ __name((ctor, secret, data) => {
      const hash = new ctor(secret);
      hash.update(toUint8Array(data));
      return hash.digest();
    }, "hmac");
  }
});

// node_modules/@smithy/signature-v4/dist-es/getCanonicalHeaders.js
var getCanonicalHeaders;
var init_getCanonicalHeaders = __esm({
  "node_modules/@smithy/signature-v4/dist-es/getCanonicalHeaders.js"() {
    init_constants6();
    getCanonicalHeaders = /* @__PURE__ */ __name(({ headers }, unsignableHeaders, signableHeaders) => {
      const canonical = {};
      for (const headerName of Object.keys(headers).sort()) {
        if (headers[headerName] == void 0) {
          continue;
        }
        const canonicalHeaderName = headerName.toLowerCase();
        if (canonicalHeaderName in ALWAYS_UNSIGNABLE_HEADERS || unsignableHeaders?.has(canonicalHeaderName) || PROXY_HEADER_PATTERN.test(canonicalHeaderName) || SEC_HEADER_PATTERN.test(canonicalHeaderName)) {
          if (!signableHeaders || signableHeaders && !signableHeaders.has(canonicalHeaderName)) {
            continue;
          }
        }
        canonical[canonicalHeaderName] = headers[headerName].replace(/[\r\n]/g, " ").replace(/[ \t]+/g, " ").replace(/^ | $/g, "");
      }
      return canonical;
    }, "getCanonicalHeaders");
  }
});

// node_modules/@smithy/signature-v4/dist-es/getPayloadHash.js
var getPayloadHash;
var init_getPayloadHash = __esm({
  "node_modules/@smithy/signature-v4/dist-es/getPayloadHash.js"() {
    init_serde();
    init_serde();
    init_constants6();
    getPayloadHash = /* @__PURE__ */ __name(async ({ headers, body }, hashConstructor) => {
      for (const headerName in headers) {
        if (!hasOwn(headers, headerName))
          continue;
        if (headerName.toLowerCase() === SHA256_HEADER) {
          return headers[headerName];
        }
      }
      if (body == void 0) {
        return "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
      } else if (typeof body === "string" || ArrayBuffer.isView(body) || isArrayBuffer(body)) {
        const hashCtor = new hashConstructor();
        hashCtor.update(toUint8Array(body));
        return toHex(await hashCtor.digest());
      }
      return UNSIGNED_PAYLOAD;
    }, "getPayloadHash");
  }
});

// node_modules/@smithy/signature-v4/dist-es/headerUtil.js
var hasHeader;
var init_headerUtil = __esm({
  "node_modules/@smithy/signature-v4/dist-es/headerUtil.js"() {
    init_serde();
    hasHeader = /* @__PURE__ */ __name((soughtHeader, headers) => {
      soughtHeader = soughtHeader.toLowerCase();
      for (const headerName in headers) {
        if (!hasOwn(headers, headerName))
          continue;
        if (soughtHeader === headerName.toLowerCase()) {
          return true;
        }
      }
      return false;
    }, "hasHeader");
  }
});

// node_modules/@smithy/signature-v4/dist-es/moveHeadersToQuery.js
var moveHeadersToQuery;
var init_moveHeadersToQuery = __esm({
  "node_modules/@smithy/signature-v4/dist-es/moveHeadersToQuery.js"() {
    init_serde();
    init_protocols();
    moveHeadersToQuery = /* @__PURE__ */ __name((request, options = {}) => {
      const { headers, query = {} } = HttpRequest.clone(request);
      for (const name in headers) {
        if (!hasOwn(headers, name))
          continue;
        const lname = name.toLowerCase();
        if (lname.slice(0, 6) === "x-amz-" && !options.unhoistableHeaders?.has(lname) || options.hoistableHeaders?.has(lname)) {
          query[name] = headers[name];
          delete headers[name];
        }
      }
      return {
        ...request,
        headers,
        query
      };
    }, "moveHeadersToQuery");
  }
});

// node_modules/@smithy/signature-v4/dist-es/prepareRequest.js
var prepareRequest;
var init_prepareRequest = __esm({
  "node_modules/@smithy/signature-v4/dist-es/prepareRequest.js"() {
    init_serde();
    init_protocols();
    init_constants6();
    prepareRequest = /* @__PURE__ */ __name((request) => {
      request = HttpRequest.clone(request);
      for (const headerName in request.headers) {
        if (!hasOwn(request.headers, headerName))
          continue;
        if (GENERATED_HEADERS.indexOf(headerName.toLowerCase()) > -1) {
          delete request.headers[headerName];
        }
      }
      return request;
    }, "prepareRequest");
  }
});

// node_modules/@smithy/signature-v4/dist-es/SignatureV4.js
var SignatureV4;
var init_SignatureV4 = __esm({
  "node_modules/@smithy/signature-v4/dist-es/SignatureV4.js"() {
    init_serde();
    init_HeaderFormatter();
    init_SignatureV4Base();
    init_constants6();
    init_credentialDerivation();
    init_getCanonicalHeaders();
    init_getPayloadHash();
    init_headerUtil();
    init_moveHeadersToQuery();
    init_prepareRequest();
    SignatureV4 = class extends SignatureV4Base {
      static {
        __name(this, "SignatureV4");
      }
      headerFormatter = new HeaderFormatter();
      constructor({ applyChecksum, credentials, region, service, sha256, uriEscapePath = true }) {
        super({
          applyChecksum,
          credentials,
          region,
          service,
          sha256,
          uriEscapePath
        });
      }
      async presign(originalRequest, options = {}) {
        const { signingDate = /* @__PURE__ */ new Date(), expiresIn = 3600, unsignableHeaders, unhoistableHeaders, signableHeaders, hoistableHeaders, signingRegion, signingService } = options;
        const credentials = await this.credentialProvider();
        this.validateResolvedCredentials(credentials);
        const region = signingRegion ?? await this.regionProvider();
        const { longDate, shortDate } = this.formatDate(signingDate);
        if (expiresIn > MAX_PRESIGNED_TTL) {
          return Promise.reject("Signature version 4 presigned URLs must have an expiration date less than one week in the future");
        }
        const scope = createScope(shortDate, region, signingService ?? this.service);
        const request = moveHeadersToQuery(prepareRequest(originalRequest), { unhoistableHeaders, hoistableHeaders });
        if (credentials.sessionToken) {
          request.query[TOKEN_QUERY_PARAM] = credentials.sessionToken;
        }
        request.query[ALGORITHM_QUERY_PARAM] = ALGORITHM_IDENTIFIER;
        request.query[CREDENTIAL_QUERY_PARAM] = `${credentials.accessKeyId}/${scope}`;
        request.query[AMZ_DATE_QUERY_PARAM] = longDate;
        request.query[EXPIRES_QUERY_PARAM] = expiresIn.toString(10);
        const canonicalHeaders = getCanonicalHeaders(request, unsignableHeaders, signableHeaders);
        request.query[SIGNED_HEADERS_QUERY_PARAM] = this.getCanonicalHeaderList(canonicalHeaders);
        request.query[SIGNATURE_QUERY_PARAM] = await this.getSignature(longDate, scope, this.getSigningKey(credentials, region, shortDate, signingService), this.createCanonicalRequest(request, canonicalHeaders, await getPayloadHash(originalRequest, this.sha256)));
        return request;
      }
      async sign(toSign, options) {
        if (typeof toSign === "string") {
          return this.signString(toSign, options);
        } else if (toSign.headers && toSign.payload) {
          return this.signEvent(toSign, options);
        } else if (toSign.message) {
          return this.signMessage(toSign, options);
        } else {
          return this.signRequest(toSign, options);
        }
      }
      async signEvent({ headers, payload }, { signingDate = /* @__PURE__ */ new Date(), priorSignature, signingRegion, signingService, eventStreamCredentials }) {
        const region = signingRegion ?? await this.regionProvider();
        const { shortDate, longDate } = this.formatDate(signingDate);
        const scope = createScope(shortDate, region, signingService ?? this.service);
        const hashedPayload = await getPayloadHash({ headers: {}, body: payload }, this.sha256);
        const hash = new this.sha256();
        hash.update(headers);
        const hashedHeaders = toHex(await hash.digest());
        const stringToSign = [
          EVENT_ALGORITHM_IDENTIFIER,
          longDate,
          scope,
          priorSignature,
          hashedHeaders,
          hashedPayload
        ].join("\n");
        return this.signString(stringToSign, {
          signingDate,
          signingRegion: region,
          signingService,
          eventStreamCredentials
        });
      }
      async signMessage(signableMessage, { signingDate = /* @__PURE__ */ new Date(), signingRegion, signingService, eventStreamCredentials }) {
        const promise = this.signEvent({
          headers: this.headerFormatter.format(signableMessage.message.headers),
          payload: signableMessage.message.body
        }, {
          signingDate,
          signingRegion,
          signingService,
          priorSignature: signableMessage.priorSignature,
          eventStreamCredentials
        });
        return promise.then((signature) => {
          return { message: signableMessage.message, signature };
        });
      }
      async signString(stringToSign, { signingDate = /* @__PURE__ */ new Date(), signingRegion, signingService, eventStreamCredentials } = {}) {
        const credentials = eventStreamCredentials ?? await this.credentialProvider();
        this.validateResolvedCredentials(credentials);
        const region = signingRegion ?? await this.regionProvider();
        const { shortDate } = this.formatDate(signingDate);
        const hash = new this.sha256(await this.getSigningKey(credentials, region, shortDate, signingService));
        hash.update(toUint8Array(stringToSign));
        return toHex(await hash.digest());
      }
      async signRequest(requestToSign, { signingDate = /* @__PURE__ */ new Date(), signableHeaders, unsignableHeaders, signingRegion, signingService } = {}) {
        const credentials = await this.credentialProvider();
        this.validateResolvedCredentials(credentials);
        const region = signingRegion ?? await this.regionProvider();
        const request = prepareRequest(requestToSign);
        const { longDate, shortDate } = this.formatDate(signingDate);
        const scope = createScope(shortDate, region, signingService ?? this.service);
        request.headers[AMZ_DATE_HEADER] = longDate;
        if (credentials.sessionToken) {
          request.headers[TOKEN_HEADER] = credentials.sessionToken;
        }
        const payloadHash = await getPayloadHash(request, this.sha256);
        if (!hasHeader(SHA256_HEADER, request.headers) && this.applyChecksum) {
          request.headers[SHA256_HEADER] = payloadHash;
        }
        const canonicalHeaders = getCanonicalHeaders(request, unsignableHeaders, signableHeaders);
        const signature = await this.getSignature(longDate, scope, this.getSigningKey(credentials, region, shortDate, signingService), this.createCanonicalRequest(request, canonicalHeaders, payloadHash));
        request.headers[AUTH_HEADER] = `${ALGORITHM_IDENTIFIER} Credential=${credentials.accessKeyId}/${scope}, SignedHeaders=${this.getCanonicalHeaderList(canonicalHeaders)}, Signature=${signature}`;
        return request;
      }
      async getSignature(longDate, credentialScope, keyPromise, canonicalRequest) {
        const stringToSign = await this.createStringToSign(longDate, credentialScope, canonicalRequest, ALGORITHM_IDENTIFIER);
        const hash = new this.sha256(await keyPromise);
        hash.update(toUint8Array(stringToSign));
        return toHex(await hash.digest());
      }
      getSigningKey(credentials, region, shortDate, service) {
        return getSigningKey(this.sha256, credentials, shortDate, region, service || this.service);
      }
    };
  }
});

// node_modules/@smithy/signature-v4/dist-es/signature-v4a-container.js
var signatureV4aContainer;
var init_signature_v4a_container = __esm({
  "node_modules/@smithy/signature-v4/dist-es/signature-v4a-container.js"() {
    signatureV4aContainer = {
      SignatureV4a: null
    };
  }
});

// node_modules/@smithy/signature-v4/dist-es/index.js
var init_dist_es3 = __esm({
  "node_modules/@smithy/signature-v4/dist-es/index.js"() {
    init_SignatureV4();
    init_signature_v4a_container();
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/resolveAwsSdkSigV4Config.js
function normalizeCredentialProvider(config, { credentials, credentialDefaultProvider }) {
  let credentialsProvider;
  if (credentials) {
    if (!credentials?.memoized) {
      credentialsProvider = memoizeIdentityProvider(credentials, isIdentityExpired, doesIdentityRequireRefresh);
    } else {
      credentialsProvider = credentials;
    }
  } else {
    if (credentialDefaultProvider) {
      credentialsProvider = normalizeProvider2(credentialDefaultProvider(Object.assign({}, config, {
        parentClientConfig: config
      })));
    } else {
      credentialsProvider = /* @__PURE__ */ __name(async () => {
        throw new Error("@aws-sdk/core::resolveAwsSdkSigV4Config - `credentials` not provided and no credentialDefaultProvider was configured.");
      }, "credentialsProvider");
    }
  }
  credentialsProvider.memoized = true;
  return credentialsProvider;
}
function bindCallerConfig(config, credentialsProvider) {
  if (credentialsProvider.configBound) {
    return credentialsProvider;
  }
  const fn = /* @__PURE__ */ __name(async (options) => credentialsProvider({ ...options, callerClientConfig: config }), "fn");
  fn.memoized = credentialsProvider.memoized;
  fn.configBound = true;
  return fn;
}
var bindResolveAwsSdkSigV4Config;
var init_resolveAwsSdkSigV4Config = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/resolveAwsSdkSigV4Config.js"() {
    init_client3();
    init_dist_es2();
    init_dist_es3();
    bindResolveAwsSdkSigV4Config = /* @__PURE__ */ __name((defaultDisableClockSkewCorrection) => (config) => {
      let inputCredentials = config.credentials;
      let isUserSupplied = !!config.credentials;
      let resolvedCredentials = void 0;
      Object.defineProperty(config, "credentials", {
        set(credentials) {
          if (credentials && credentials !== inputCredentials && credentials !== resolvedCredentials) {
            isUserSupplied = true;
          }
          inputCredentials = credentials;
          const memoizedProvider = normalizeCredentialProvider(config, {
            credentials: inputCredentials,
            credentialDefaultProvider: config.credentialDefaultProvider
          });
          const boundProvider = bindCallerConfig(config, memoizedProvider);
          if (isUserSupplied && !boundProvider.attributed) {
            const isCredentialObject = typeof inputCredentials === "object" && inputCredentials !== null;
            resolvedCredentials = /* @__PURE__ */ __name(async (options) => {
              const creds = await boundProvider(options);
              const attributedCreds = creds;
              if (isCredentialObject && (!attributedCreds.$source || Object.keys(attributedCreds.$source).length === 0)) {
                return setCredentialFeature(attributedCreds, "CREDENTIALS_CODE", "e");
              }
              return attributedCreds;
            }, "resolvedCredentials");
            resolvedCredentials.memoized = boundProvider.memoized;
            resolvedCredentials.configBound = boundProvider.configBound;
            resolvedCredentials.attributed = true;
          } else {
            resolvedCredentials = boundProvider;
          }
        },
        get() {
          return resolvedCredentials;
        },
        enumerable: true,
        configurable: true
      });
      config.credentials = inputCredentials;
      const { signingEscapePath = true, systemClockOffset = config.systemClockOffset || 0, sha256 } = config;
      let signer;
      if (config.signer) {
        signer = normalizeProvider2(config.signer);
      } else if (config.regionInfoProvider) {
        signer = /* @__PURE__ */ __name(() => normalizeProvider2(config.region)().then(async (region) => [
          await config.regionInfoProvider(region, {
            useFipsEndpoint: await config.useFipsEndpoint(),
            useDualstackEndpoint: await config.useDualstackEndpoint()
          }) || {},
          region
        ]).then(([regionInfo, region]) => {
          const { signingRegion, signingService } = regionInfo;
          config.signingRegion = config.signingRegion || signingRegion || region;
          config.signingName = config.signingName || signingService || config.serviceId;
          const params = {
            ...config,
            credentials: config.credentials,
            region: config.signingRegion,
            service: config.signingName,
            sha256,
            uriEscapePath: signingEscapePath
          };
          const SignerCtor = config.signerConstructor || SignatureV4;
          return new SignerCtor(params);
        }), "signer");
      } else {
        signer = /* @__PURE__ */ __name(async (authScheme) => {
          authScheme = Object.assign({}, {
            name: "sigv4",
            signingName: config.signingName || config.defaultSigningName,
            signingRegion: await normalizeProvider2(config.region)(),
            properties: {}
          }, authScheme);
          const signingRegion = authScheme.signingRegion;
          const signingService = authScheme.signingName;
          config.signingRegion = config.signingRegion || signingRegion;
          config.signingName = config.signingName || signingService || config.serviceId;
          const params = {
            ...config,
            credentials: config.credentials,
            region: config.signingRegion,
            service: config.signingName,
            sha256,
            uriEscapePath: signingEscapePath
          };
          const SignerCtor = config.signerConstructor || SignatureV4;
          return new SignerCtor(params);
        }, "signer");
      }
      const resolvedConfig = Object.assign(config, {
        systemClockOffset,
        signingEscapePath,
        signer,
        disableClockSkewCorrection: normalizeProvider2(config.disableClockSkewCorrection ?? defaultDisableClockSkewCorrection)
      });
      return resolvedConfig;
    }, "bindResolveAwsSdkSigV4Config");
    __name(normalizeCredentialProvider, "normalizeCredentialProvider");
    __name(bindCallerConfig, "bindCallerConfig");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/index.js
var init_aws_sdk = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/index.js"() {
    init_AwsSdkSigV4Signer();
    init_AwsSdkSigV4ASigner();
    init_NODE_AUTH_SCHEME_PREFERENCE_OPTIONS();
    init_resolveAwsSdkSigV4AConfig();
    init_resolveAwsSdkSigV4Config();
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/clock-skew-node-config.js
var ENV_DISABLE_CLOCK_SKEW_CORRECTION, CONFIG_DISABLE_CLOCK_SKEW_CORRECTION, NODE_DISABLE_CLOCK_SKEW_CORRECTION_CONFIG_OPTIONS;
var init_clock_skew_node_config = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/clock-skew-node-config.js"() {
    init_config2();
    ENV_DISABLE_CLOCK_SKEW_CORRECTION = "AWS_DISABLE_CLOCK_SKEW_CORRECTION";
    CONFIG_DISABLE_CLOCK_SKEW_CORRECTION = "disable_clock_skew_correction";
    NODE_DISABLE_CLOCK_SKEW_CORRECTION_CONFIG_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env2) => booleanSelector(env2, ENV_DISABLE_CLOCK_SKEW_CORRECTION, SelectorType.ENV), "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => booleanSelector(profile, CONFIG_DISABLE_CLOCK_SKEW_CORRECTION, SelectorType.CONFIG), "configFileSelector"),
      default: false
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/clock-skew-defaults.js
var DEFAULT_DISABLE_CLOCK_SKEW_CORRECTION;
var init_clock_skew_defaults = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/clock-skew-defaults.js"() {
    init_config2();
    init_clock_skew_node_config();
    DEFAULT_DISABLE_CLOCK_SKEW_CORRECTION = loadConfig(NODE_DISABLE_CLOCK_SKEW_CORRECTION_CONFIG_OPTIONS);
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/index.js
var resolveAwsSdkSigV4Config;
var init_httpAuthSchemes2 = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/index.js"() {
    init_aws_sdk();
    init_aws_sdk();
    init_clock_skew_defaults();
    resolveAwsSdkSigV4Config = bindResolveAwsSdkSigV4Config(DEFAULT_DISABLE_CLOCK_SKEW_CORRECTION);
  }
});

// node_modules/@aws-sdk/credential-provider-env/dist-es/fromEnv.js
var ENV_KEY, ENV_SECRET, ENV_SESSION, ENV_EXPIRATION, ENV_CREDENTIAL_SCOPE, ENV_ACCOUNT_ID, fromEnv2;
var init_fromEnv2 = __esm({
  "node_modules/@aws-sdk/credential-provider-env/dist-es/fromEnv.js"() {
    init_client3();
    init_config2();
    ENV_KEY = "AWS_ACCESS_KEY_ID";
    ENV_SECRET = "AWS_SECRET_ACCESS_KEY";
    ENV_SESSION = "AWS_SESSION_TOKEN";
    ENV_EXPIRATION = "AWS_CREDENTIAL_EXPIRATION";
    ENV_CREDENTIAL_SCOPE = "AWS_CREDENTIAL_SCOPE";
    ENV_ACCOUNT_ID = "AWS_ACCOUNT_ID";
    fromEnv2 = /* @__PURE__ */ __name((init) => async () => {
      init?.logger?.debug("@aws-sdk/credential-provider-env - fromEnv");
      const accessKeyId = process.env[ENV_KEY];
      const secretAccessKey = process.env[ENV_SECRET];
      const sessionToken = process.env[ENV_SESSION];
      const expiry = process.env[ENV_EXPIRATION];
      const credentialScope = process.env[ENV_CREDENTIAL_SCOPE];
      const accountId = process.env[ENV_ACCOUNT_ID];
      if (accessKeyId && secretAccessKey) {
        const credentials = {
          accessKeyId,
          secretAccessKey,
          ...sessionToken && { sessionToken },
          ...expiry && { expiration: new Date(expiry) },
          ...credentialScope && { credentialScope },
          ...accountId && { accountId }
        };
        setCredentialFeature(credentials, "CREDENTIALS_ENV_VARS", "g");
        return credentials;
      }
      throw new CredentialsProviderError("Unable to find environment variable credentials.", { logger: init?.logger });
    }, "fromEnv");
  }
});

// node_modules/@aws-sdk/credential-provider-env/dist-es/index.js
var dist_es_exports = {};
__export(dist_es_exports, {
  ENV_ACCOUNT_ID: () => ENV_ACCOUNT_ID,
  ENV_CREDENTIAL_SCOPE: () => ENV_CREDENTIAL_SCOPE,
  ENV_EXPIRATION: () => ENV_EXPIRATION,
  ENV_KEY: () => ENV_KEY,
  ENV_SECRET: () => ENV_SECRET,
  ENV_SESSION: () => ENV_SESSION,
  fromEnv: () => fromEnv2
});
var init_dist_es4 = __esm({
  "node_modules/@aws-sdk/credential-provider-env/dist-es/index.js"() {
    init_fromEnv2();
  }
});

// node_modules/@smithy/credential-provider-imds/dist-es/remoteProvider/ImdsCredentials.js
var isImdsCredentials, fromImdsCredentials;
var init_ImdsCredentials = __esm({
  "node_modules/@smithy/credential-provider-imds/dist-es/remoteProvider/ImdsCredentials.js"() {
    isImdsCredentials = /* @__PURE__ */ __name((arg) => Boolean(arg) && typeof arg === "object" && typeof arg.AccessKeyId === "string" && typeof arg.SecretAccessKey === "string" && typeof arg.Token === "string" && typeof arg.Expiration === "string", "isImdsCredentials");
    fromImdsCredentials = /* @__PURE__ */ __name((creds) => ({
      accessKeyId: creds.AccessKeyId,
      secretAccessKey: creds.SecretAccessKey,
      sessionToken: creds.Token,
      expiration: new Date(creds.Expiration),
      ...creds.AccountId && { accountId: creds.AccountId }
    }), "fromImdsCredentials");
  }
});

// node_modules/@smithy/credential-provider-imds/dist-es/remoteProvider/RemoteProviderInit.js
var DEFAULT_TIMEOUT, DEFAULT_MAX_RETRIES, providerConfigFromInit;
var init_RemoteProviderInit = __esm({
  "node_modules/@smithy/credential-provider-imds/dist-es/remoteProvider/RemoteProviderInit.js"() {
    DEFAULT_TIMEOUT = 1e3;
    DEFAULT_MAX_RETRIES = 0;
    providerConfigFromInit = /* @__PURE__ */ __name(({ maxRetries = DEFAULT_MAX_RETRIES, timeout = DEFAULT_TIMEOUT }) => ({ maxRetries, timeout }), "providerConfigFromInit");
  }
});

// node_modules/@smithy/credential-provider-imds/dist-es/remoteProvider/node-http.js
import node_http from "node:http";
var init_node_http = __esm({
  "node_modules/@smithy/credential-provider-imds/dist-es/remoteProvider/node-http.js"() {
  }
});

// node_modules/@smithy/credential-provider-imds/dist-es/remoteProvider/httpRequest.js
function httpRequest(options) {
  return new Promise((resolve, reject) => {
    const req = node_http.request({
      method: "GET",
      ...options,
      hostname: options.hostname?.replace(/^\[(.+)\]$/, "$1")
    });
    req.on("error", (err2) => {
      reject(Object.assign(new ProviderError("Unable to connect to instance metadata service"), err2));
      req.destroy();
    });
    req.on("timeout", () => {
      reject(new ProviderError("TimeoutError from instance metadata service"));
      req.destroy();
    });
    req.on("response", (res) => {
      const { statusCode = 400 } = res;
      if (statusCode < 200 || 300 <= statusCode) {
        reject(Object.assign(new ProviderError("Error response received from instance metadata service"), { statusCode }));
        req.destroy();
      }
      const chunks = [];
      res.on("data", (chunk) => {
        chunks.push(chunk);
      });
      res.on("end", () => {
        resolve(Buffer.concat(chunks));
        req.destroy();
      });
    });
    req.end();
  });
}
var init_httpRequest2 = __esm({
  "node_modules/@smithy/credential-provider-imds/dist-es/remoteProvider/httpRequest.js"() {
    init_config2();
    init_node_http();
    __name(httpRequest, "httpRequest");
  }
});

// node_modules/@smithy/credential-provider-imds/dist-es/remoteProvider/retry.js
var retry;
var init_retry3 = __esm({
  "node_modules/@smithy/credential-provider-imds/dist-es/remoteProvider/retry.js"() {
    retry = /* @__PURE__ */ __name((toRetry, maxRetries) => {
      let promise = toRetry();
      for (let i6 = 0; i6 < maxRetries; i6++) {
        promise = promise.catch(toRetry);
      }
      return promise;
    }, "retry");
  }
});

// node_modules/@smithy/credential-provider-imds/dist-es/fromContainerMetadata.js
var ENV_CMDS_FULL_URI, ENV_CMDS_RELATIVE_URI, ENV_CMDS_AUTH_TOKEN, fromContainerMetadata, requestFromEcsImds, CMDS_IP, GREENGRASS_HOSTS, GREENGRASS_PROTOCOLS, getCmdsUri;
var init_fromContainerMetadata = __esm({
  "node_modules/@smithy/credential-provider-imds/dist-es/fromContainerMetadata.js"() {
    init_config2();
    init_ImdsCredentials();
    init_RemoteProviderInit();
    init_httpRequest2();
    init_retry3();
    ENV_CMDS_FULL_URI = "AWS_CONTAINER_CREDENTIALS_FULL_URI";
    ENV_CMDS_RELATIVE_URI = "AWS_CONTAINER_CREDENTIALS_RELATIVE_URI";
    ENV_CMDS_AUTH_TOKEN = "AWS_CONTAINER_AUTHORIZATION_TOKEN";
    fromContainerMetadata = /* @__PURE__ */ __name((init = {}) => {
      const { timeout, maxRetries } = providerConfigFromInit(init);
      return () => retry(async () => {
        const requestOptions = await getCmdsUri({ logger: init.logger });
        const credsResponse = JSON.parse(await requestFromEcsImds(timeout, requestOptions));
        if (!isImdsCredentials(credsResponse)) {
          throw new CredentialsProviderError("Invalid response received from instance metadata service.", {
            logger: init.logger
          });
        }
        return fromImdsCredentials(credsResponse);
      }, maxRetries);
    }, "fromContainerMetadata");
    requestFromEcsImds = /* @__PURE__ */ __name(async (timeout, options) => {
      if (process.env[ENV_CMDS_AUTH_TOKEN]) {
        options.headers = {
          ...options.headers,
          Authorization: process.env[ENV_CMDS_AUTH_TOKEN]
        };
      }
      const buffer = await httpRequest({
        ...options,
        timeout
      });
      return buffer.toString();
    }, "requestFromEcsImds");
    CMDS_IP = "169.254.170.2";
    GREENGRASS_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1"]);
    GREENGRASS_PROTOCOLS = /* @__PURE__ */ new Set(["http:", "https:"]);
    getCmdsUri = /* @__PURE__ */ __name(async ({ logger: logger2 }) => {
      if (process.env[ENV_CMDS_RELATIVE_URI]) {
        return {
          hostname: CMDS_IP,
          path: process.env[ENV_CMDS_RELATIVE_URI]
        };
      }
      if (process.env[ENV_CMDS_FULL_URI]) {
        let parsed;
        try {
          parsed = new URL(process.env[ENV_CMDS_FULL_URI]);
        } catch {
          throw new CredentialsProviderError(`${process.env[ENV_CMDS_FULL_URI]} is not a valid container metadata service URL`, { tryNextLink: false, logger: logger2 });
        }
        if (!parsed.hostname || !GREENGRASS_HOSTS.has(parsed.hostname)) {
          throw new CredentialsProviderError(`${parsed.hostname} is not a valid container metadata service hostname`, {
            tryNextLink: false,
            logger: logger2
          });
        }
        if (!parsed.protocol || !GREENGRASS_PROTOCOLS.has(parsed.protocol)) {
          throw new CredentialsProviderError(`${parsed.protocol} is not a valid container metadata service protocol`, {
            tryNextLink: false,
            logger: logger2
          });
        }
        return {
          protocol: parsed.protocol,
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          port: parsed.port ? parseInt(parsed.port, 10) : void 0
        };
      }
      throw new CredentialsProviderError(`The container metadata credential provider cannot be used unless the ${ENV_CMDS_RELATIVE_URI} or ${ENV_CMDS_FULL_URI} environment variable is set`, {
        tryNextLink: false,
        logger: logger2
      });
    }, "getCmdsUri");
  }
});

// node_modules/@smithy/credential-provider-imds/dist-es/error/InstanceMetadataV1FallbackError.js
var InstanceMetadataV1FallbackError;
var init_InstanceMetadataV1FallbackError = __esm({
  "node_modules/@smithy/credential-provider-imds/dist-es/error/InstanceMetadataV1FallbackError.js"() {
    init_config2();
    InstanceMetadataV1FallbackError = class _InstanceMetadataV1FallbackError extends CredentialsProviderError {
      static {
        __name(this, "InstanceMetadataV1FallbackError");
      }
      tryNextLink;
      name = "InstanceMetadataV1FallbackError";
      constructor(message, tryNextLink = true) {
        super(message, tryNextLink);
        this.tryNextLink = tryNextLink;
        Object.setPrototypeOf(this, _InstanceMetadataV1FallbackError.prototype);
      }
    };
  }
});

// node_modules/@smithy/credential-provider-imds/dist-es/config/Endpoint.js
var Endpoint;
var init_Endpoint = __esm({
  "node_modules/@smithy/credential-provider-imds/dist-es/config/Endpoint.js"() {
    (function(Endpoint2) {
      Endpoint2["IPv4"] = "http://169.254.169.254";
      Endpoint2["IPv6"] = "http://[fd00:ec2::254]";
    })(Endpoint || (Endpoint = {}));
  }
});

// node_modules/@smithy/credential-provider-imds/dist-es/config/EndpointConfigOptions.js
var ENV_ENDPOINT_NAME, CONFIG_ENDPOINT_NAME, ENDPOINT_CONFIG_OPTIONS;
var init_EndpointConfigOptions = __esm({
  "node_modules/@smithy/credential-provider-imds/dist-es/config/EndpointConfigOptions.js"() {
    ENV_ENDPOINT_NAME = "AWS_EC2_METADATA_SERVICE_ENDPOINT";
    CONFIG_ENDPOINT_NAME = "ec2_metadata_service_endpoint";
    ENDPOINT_CONFIG_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env2) => env2[ENV_ENDPOINT_NAME], "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => profile[CONFIG_ENDPOINT_NAME], "configFileSelector"),
      default: void 0
    };
  }
});

// node_modules/@smithy/credential-provider-imds/dist-es/config/EndpointMode.js
var EndpointMode;
var init_EndpointMode = __esm({
  "node_modules/@smithy/credential-provider-imds/dist-es/config/EndpointMode.js"() {
    (function(EndpointMode2) {
      EndpointMode2["IPv4"] = "IPv4";
      EndpointMode2["IPv6"] = "IPv6";
    })(EndpointMode || (EndpointMode = {}));
  }
});

// node_modules/@smithy/credential-provider-imds/dist-es/config/EndpointModeConfigOptions.js
var ENV_ENDPOINT_MODE_NAME, CONFIG_ENDPOINT_MODE_NAME, ENDPOINT_MODE_CONFIG_OPTIONS;
var init_EndpointModeConfigOptions = __esm({
  "node_modules/@smithy/credential-provider-imds/dist-es/config/EndpointModeConfigOptions.js"() {
    init_EndpointMode();
    ENV_ENDPOINT_MODE_NAME = "AWS_EC2_METADATA_SERVICE_ENDPOINT_MODE";
    CONFIG_ENDPOINT_MODE_NAME = "ec2_metadata_service_endpoint_mode";
    ENDPOINT_MODE_CONFIG_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env2) => env2[ENV_ENDPOINT_MODE_NAME], "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => profile[CONFIG_ENDPOINT_MODE_NAME], "configFileSelector"),
      default: EndpointMode.IPv4
    };
  }
});

// node_modules/@smithy/credential-provider-imds/dist-es/utils/getInstanceMetadataEndpoint.js
var getInstanceMetadataEndpoint, getFromEndpointConfig, getFromEndpointModeConfig;
var init_getInstanceMetadataEndpoint = __esm({
  "node_modules/@smithy/credential-provider-imds/dist-es/utils/getInstanceMetadataEndpoint.js"() {
    init_config2();
    init_protocols();
    init_Endpoint();
    init_EndpointConfigOptions();
    init_EndpointMode();
    init_EndpointModeConfigOptions();
    getInstanceMetadataEndpoint = /* @__PURE__ */ __name(async () => parseUrl(await getFromEndpointConfig() || await getFromEndpointModeConfig()), "getInstanceMetadataEndpoint");
    getFromEndpointConfig = /* @__PURE__ */ __name(async () => loadConfig(ENDPOINT_CONFIG_OPTIONS)(), "getFromEndpointConfig");
    getFromEndpointModeConfig = /* @__PURE__ */ __name(async () => {
      const endpointMode = await loadConfig(ENDPOINT_MODE_CONFIG_OPTIONS)();
      switch (endpointMode) {
        case EndpointMode.IPv4:
          return Endpoint.IPv4;
        case EndpointMode.IPv6:
          return Endpoint.IPv6;
        default:
          throw new Error(`Unsupported endpoint mode: ${endpointMode}. Select from ${Object.values(EndpointMode)}`);
      }
    }, "getFromEndpointModeConfig");
  }
});

// node_modules/@smithy/credential-provider-imds/dist-es/utils/getExtendedInstanceMetadataCredentials.js
var STATIC_STABILITY_REFRESH_INTERVAL_SECONDS, STATIC_STABILITY_REFRESH_INTERVAL_JITTER_WINDOW_SECONDS, STATIC_STABILITY_DOC_URL, getExtendedInstanceMetadataCredentials;
var init_getExtendedInstanceMetadataCredentials = __esm({
  "node_modules/@smithy/credential-provider-imds/dist-es/utils/getExtendedInstanceMetadataCredentials.js"() {
    STATIC_STABILITY_REFRESH_INTERVAL_SECONDS = 5 * 60;
    STATIC_STABILITY_REFRESH_INTERVAL_JITTER_WINDOW_SECONDS = 5 * 60;
    STATIC_STABILITY_DOC_URL = "https://docs.aws.amazon.com/sdkref/latest/guide/feature-static-credentials.html";
    getExtendedInstanceMetadataCredentials = /* @__PURE__ */ __name((credentials, logger2) => {
      const refreshInterval = STATIC_STABILITY_REFRESH_INTERVAL_SECONDS + Math.floor(Math.random() * STATIC_STABILITY_REFRESH_INTERVAL_JITTER_WINDOW_SECONDS);
      const newExpiration = new Date(Date.now() + refreshInterval * 1e3);
      logger2.warn(`Attempting credential expiration extension due to a credential service availability issue. A refresh of these credentials will be attempted after ${new Date(newExpiration)}.
For more information, please visit: ` + STATIC_STABILITY_DOC_URL);
      const originalExpiration = credentials.originalExpiration ?? credentials.expiration;
      return {
        ...credentials,
        ...originalExpiration ? { originalExpiration } : {},
        expiration: newExpiration
      };
    }, "getExtendedInstanceMetadataCredentials");
  }
});

// node_modules/@smithy/credential-provider-imds/dist-es/utils/staticStabilityProvider.js
var staticStabilityProvider;
var init_staticStabilityProvider = __esm({
  "node_modules/@smithy/credential-provider-imds/dist-es/utils/staticStabilityProvider.js"() {
    init_getExtendedInstanceMetadataCredentials();
    staticStabilityProvider = /* @__PURE__ */ __name((provider, options = {}) => {
      const logger2 = options?.logger || console;
      let pastCredentials;
      return async () => {
        let credentials;
        try {
          credentials = await provider();
          if (credentials.expiration && credentials.expiration.getTime() < Date.now()) {
            credentials = getExtendedInstanceMetadataCredentials(credentials, logger2);
          }
        } catch (e6) {
          if (pastCredentials) {
            logger2.warn("Credential renew failed: ", e6);
            credentials = getExtendedInstanceMetadataCredentials(pastCredentials, logger2);
          } else {
            throw e6;
          }
        }
        pastCredentials = credentials;
        return credentials;
      };
    }, "staticStabilityProvider");
  }
});

// node_modules/@smithy/credential-provider-imds/dist-es/fromInstanceMetadata.js
var IMDS_PATH, IMDS_TOKEN_PATH2, AWS_EC2_METADATA_V1_DISABLED, PROFILE_AWS_EC2_METADATA_V1_DISABLED, X_AWS_EC2_METADATA_TOKEN2, fromInstanceMetadata, getInstanceMetadataProvider, getMetadataToken, getProfile, getCredentialsFromProfile;
var init_fromInstanceMetadata = __esm({
  "node_modules/@smithy/credential-provider-imds/dist-es/fromInstanceMetadata.js"() {
    init_config2();
    init_InstanceMetadataV1FallbackError();
    init_ImdsCredentials();
    init_RemoteProviderInit();
    init_httpRequest2();
    init_retry3();
    init_getInstanceMetadataEndpoint();
    init_staticStabilityProvider();
    IMDS_PATH = "/latest/meta-data/iam/security-credentials/";
    IMDS_TOKEN_PATH2 = "/latest/api/token";
    AWS_EC2_METADATA_V1_DISABLED = "AWS_EC2_METADATA_V1_DISABLED";
    PROFILE_AWS_EC2_METADATA_V1_DISABLED = "ec2_metadata_v1_disabled";
    X_AWS_EC2_METADATA_TOKEN2 = "x-aws-ec2-metadata-token";
    fromInstanceMetadata = /* @__PURE__ */ __name((init = {}) => staticStabilityProvider(getInstanceMetadataProvider(init), { logger: init.logger }), "fromInstanceMetadata");
    getInstanceMetadataProvider = /* @__PURE__ */ __name((init = {}) => {
      let disableFetchToken = false;
      const { logger: logger2, profile } = init;
      const { timeout, maxRetries } = providerConfigFromInit(init);
      const getCredentials2 = /* @__PURE__ */ __name(async (maxRetries2, options) => {
        const isImdsV1Fallback = disableFetchToken || options.headers?.[X_AWS_EC2_METADATA_TOKEN2] == null;
        if (isImdsV1Fallback) {
          let fallbackBlockedFromProfile = false;
          let fallbackBlockedFromProcessEnv = false;
          const configValue = await loadConfig({
            environmentVariableSelector: /* @__PURE__ */ __name((env2) => {
              const envValue = env2[AWS_EC2_METADATA_V1_DISABLED];
              fallbackBlockedFromProcessEnv = !!envValue && envValue !== "false";
              if (envValue === void 0) {
                throw new CredentialsProviderError(`${AWS_EC2_METADATA_V1_DISABLED} not set in env, checking config file next.`, { logger: init.logger });
              }
              return fallbackBlockedFromProcessEnv;
            }, "environmentVariableSelector"),
            configFileSelector: /* @__PURE__ */ __name((profile2) => {
              const profileValue = profile2[PROFILE_AWS_EC2_METADATA_V1_DISABLED];
              fallbackBlockedFromProfile = !!profileValue && profileValue !== "false";
              return fallbackBlockedFromProfile;
            }, "configFileSelector"),
            default: false
          }, {
            profile
          })();
          if (init.ec2MetadataV1Disabled || configValue) {
            const causes = [];
            if (init.ec2MetadataV1Disabled)
              causes.push("credential provider initialization (runtime option ec2MetadataV1Disabled)");
            if (fallbackBlockedFromProfile)
              causes.push(`config file profile (${PROFILE_AWS_EC2_METADATA_V1_DISABLED})`);
            if (fallbackBlockedFromProcessEnv)
              causes.push(`process environment variable (${AWS_EC2_METADATA_V1_DISABLED})`);
            throw new InstanceMetadataV1FallbackError(`AWS EC2 Metadata v1 fallback has been blocked by AWS SDK configuration in the following: [${causes.join(", ")}].`);
          }
        }
        const imdsProfile = (await retry(async () => {
          let profile2;
          try {
            profile2 = await getProfile(options);
          } catch (err2) {
            if (err2.statusCode === 401) {
              disableFetchToken = false;
            }
            throw err2;
          }
          return profile2;
        }, maxRetries2)).trim();
        return retry(async () => {
          let creds;
          try {
            creds = await getCredentialsFromProfile(imdsProfile, options, init);
          } catch (err2) {
            if (err2.statusCode === 401) {
              disableFetchToken = false;
            }
            throw err2;
          }
          return creds;
        }, maxRetries2);
      }, "getCredentials");
      return async () => {
        const endpoint = await getInstanceMetadataEndpoint();
        if (disableFetchToken) {
          logger2?.debug("AWS SDK Instance Metadata", "using v1 fallback (no token fetch)");
          return getCredentials2(maxRetries, { ...endpoint, timeout });
        } else {
          let token;
          try {
            token = (await getMetadataToken({ ...endpoint, timeout })).toString();
          } catch (error) {
            if (error?.statusCode === 400) {
              throw Object.assign(error, {
                message: "EC2 Metadata token request returned error"
              });
            } else if (error.message === "TimeoutError" || [403, 404, 405].includes(error.statusCode)) {
              disableFetchToken = true;
            }
            logger2?.debug("AWS SDK Instance Metadata", "using v1 fallback (initial)");
            return getCredentials2(maxRetries, { ...endpoint, timeout });
          }
          return getCredentials2(maxRetries, {
            ...endpoint,
            headers: {
              [X_AWS_EC2_METADATA_TOKEN2]: token
            },
            timeout
          });
        }
      };
    }, "getInstanceMetadataProvider");
    getMetadataToken = /* @__PURE__ */ __name(async (options) => httpRequest({
      ...options,
      path: IMDS_TOKEN_PATH2,
      method: "PUT",
      headers: {
        "x-aws-ec2-metadata-token-ttl-seconds": "21600"
      }
    }), "getMetadataToken");
    getProfile = /* @__PURE__ */ __name(async (options) => (await httpRequest({ ...options, path: IMDS_PATH })).toString(), "getProfile");
    getCredentialsFromProfile = /* @__PURE__ */ __name(async (profile, options, init) => {
      const credentialsResponse = JSON.parse((await httpRequest({
        ...options,
        path: IMDS_PATH + profile
      })).toString());
      if (!isImdsCredentials(credentialsResponse)) {
        throw new CredentialsProviderError("Invalid response received from instance metadata service.", {
          logger: init.logger
        });
      }
      return fromImdsCredentials(credentialsResponse);
    }, "getCredentialsFromProfile");
  }
});

// node_modules/@smithy/credential-provider-imds/dist-es/index.js
var dist_es_exports2 = {};
__export(dist_es_exports2, {
  DEFAULT_MAX_RETRIES: () => DEFAULT_MAX_RETRIES,
  DEFAULT_TIMEOUT: () => DEFAULT_TIMEOUT,
  ENV_CMDS_AUTH_TOKEN: () => ENV_CMDS_AUTH_TOKEN,
  ENV_CMDS_FULL_URI: () => ENV_CMDS_FULL_URI,
  ENV_CMDS_RELATIVE_URI: () => ENV_CMDS_RELATIVE_URI,
  Endpoint: () => Endpoint,
  fromContainerMetadata: () => fromContainerMetadata,
  fromInstanceMetadata: () => fromInstanceMetadata,
  getInstanceMetadataEndpoint: () => getInstanceMetadataEndpoint,
  httpRequest: () => httpRequest,
  providerConfigFromInit: () => providerConfigFromInit
});
var init_dist_es5 = __esm({
  "node_modules/@smithy/credential-provider-imds/dist-es/index.js"() {
    init_fromContainerMetadata();
    init_fromInstanceMetadata();
    init_RemoteProviderInit();
    init_httpRequest2();
    init_getInstanceMetadataEndpoint();
    init_Endpoint();
  }
});

// node_modules/@smithy/node-http-handler/dist-es/build-abort-error.js
function buildAbortError(abortSignal) {
  const reason = abortSignal && typeof abortSignal === "object" && "reason" in abortSignal ? abortSignal.reason : void 0;
  if (reason) {
    if (reason instanceof Error) {
      const abortError3 = new Error("Request aborted");
      abortError3.name = "AbortError";
      abortError3.cause = reason;
      return abortError3;
    }
    const abortError2 = new Error(String(reason));
    abortError2.name = "AbortError";
    return abortError2;
  }
  const abortError = new Error("Request aborted");
  abortError.name = "AbortError";
  return abortError;
}
var init_build_abort_error = __esm({
  "node_modules/@smithy/node-http-handler/dist-es/build-abort-error.js"() {
    __name(buildAbortError, "buildAbortError");
  }
});

// node_modules/@smithy/node-http-handler/dist-es/constants.js
var NODEJS_TIMEOUT_ERROR_CODES2;
var init_constants7 = __esm({
  "node_modules/@smithy/node-http-handler/dist-es/constants.js"() {
    NODEJS_TIMEOUT_ERROR_CODES2 = ["ECONNRESET", "EPIPE", "ETIMEDOUT"];
  }
});

// node_modules/@smithy/node-http-handler/dist-es/get-transformed-headers.js
var getTransformedHeaders;
var init_get_transformed_headers = __esm({
  "node_modules/@smithy/node-http-handler/dist-es/get-transformed-headers.js"() {
    init_serde();
    getTransformedHeaders = /* @__PURE__ */ __name((headers) => {
      const transformedHeaders = {};
      for (const name in headers) {
        if (!hasOwn(headers, name))
          continue;
        const headerValues = headers[name];
        transformedHeaders[name] = Array.isArray(headerValues) ? headerValues.join(",") : headerValues;
      }
      return transformedHeaders;
    }, "getTransformedHeaders");
  }
});

// node_modules/@smithy/node-http-handler/dist-es/node-https.js
import node_https from "node:https";
var init_node_https = __esm({
  "node_modules/@smithy/node-http-handler/dist-es/node-https.js"() {
  }
});

// node_modules/@smithy/node-http-handler/dist-es/timing.js
var timing;
var init_timing = __esm({
  "node_modules/@smithy/node-http-handler/dist-es/timing.js"() {
    timing = {
      setTimeout: /* @__PURE__ */ __name((cb, ms) => setTimeout(cb, ms), "setTimeout"),
      clearTimeout: /* @__PURE__ */ __name((timeoutId) => clearTimeout(timeoutId), "clearTimeout")
    };
  }
});

// node_modules/@smithy/node-http-handler/dist-es/set-connection-timeout.js
var DEFER_EVENT_LISTENER_TIME, setConnectionTimeout;
var init_set_connection_timeout = __esm({
  "node_modules/@smithy/node-http-handler/dist-es/set-connection-timeout.js"() {
    init_timing();
    DEFER_EVENT_LISTENER_TIME = 1e3;
    setConnectionTimeout = /* @__PURE__ */ __name((request, reject, timeoutInMs = 0) => {
      if (!timeoutInMs) {
        return -1;
      }
      const registerTimeout = /* @__PURE__ */ __name((offset) => {
        const timeoutId = timing.setTimeout(() => {
          request.destroy();
          reject(Object.assign(new Error(`@smithy/node-http-handler - the request socket did not establish a connection with the server within the configured timeout of ${timeoutInMs} ms.`), {
            name: "TimeoutError"
          }));
        }, timeoutInMs - offset);
        const doWithSocket = /* @__PURE__ */ __name((socket2) => {
          if (socket2?.connecting) {
            socket2.on("connect", () => {
              timing.clearTimeout(timeoutId);
            });
          } else {
            timing.clearTimeout(timeoutId);
          }
        }, "doWithSocket");
        if (request.socket) {
          doWithSocket(request.socket);
        } else {
          request.on("socket", doWithSocket);
        }
      }, "registerTimeout");
      if (timeoutInMs < 2e3) {
        registerTimeout(0);
        return 0;
      }
      return timing.setTimeout(registerTimeout.bind(null, DEFER_EVENT_LISTENER_TIME), DEFER_EVENT_LISTENER_TIME);
    }, "setConnectionTimeout");
  }
});

// node_modules/@smithy/node-http-handler/dist-es/set-request-timeout.js
var setRequestTimeout;
var init_set_request_timeout = __esm({
  "node_modules/@smithy/node-http-handler/dist-es/set-request-timeout.js"() {
    init_timing();
    setRequestTimeout = /* @__PURE__ */ __name((req, reject, timeoutInMs = 0, throwOnRequestTimeout, logger2) => {
      if (timeoutInMs) {
        return timing.setTimeout(() => {
          let msg = `@smithy/node-http-handler - [${throwOnRequestTimeout ? "ERROR" : "WARN"}] a request has exceeded the configured ${timeoutInMs} ms requestTimeout.`;
          if (throwOnRequestTimeout) {
            const error = Object.assign(new Error(msg), {
              name: "TimeoutError",
              code: "ETIMEDOUT"
            });
            req.destroy(error);
            reject(error);
          } else {
            msg += ` Init client requestHandler with throwOnRequestTimeout=true to turn this into an error.`;
            logger2?.warn?.(msg);
          }
        }, timeoutInMs);
      }
      return -1;
    }, "setRequestTimeout");
  }
});

// node_modules/@smithy/node-http-handler/dist-es/set-socket-keep-alive.js
var DEFER_EVENT_LISTENER_TIME2, setSocketKeepAlive;
var init_set_socket_keep_alive = __esm({
  "node_modules/@smithy/node-http-handler/dist-es/set-socket-keep-alive.js"() {
    init_timing();
    DEFER_EVENT_LISTENER_TIME2 = 3e3;
    setSocketKeepAlive = /* @__PURE__ */ __name((request, { keepAlive, keepAliveMsecs }, deferTimeMs = DEFER_EVENT_LISTENER_TIME2) => {
      if (keepAlive !== true) {
        return -1;
      }
      const registerListener = /* @__PURE__ */ __name(() => {
        if (request.socket) {
          request.socket.setKeepAlive(keepAlive, keepAliveMsecs || 0);
        } else {
          request.on("socket", (socket2) => {
            socket2.setKeepAlive(keepAlive, keepAliveMsecs || 0);
          });
        }
      }, "registerListener");
      if (deferTimeMs === 0) {
        registerListener();
        return 0;
      }
      return timing.setTimeout(registerListener, deferTimeMs);
    }, "setSocketKeepAlive");
  }
});

// node_modules/@smithy/node-http-handler/dist-es/resolve-default-socket-timeout.js
var resolveDefaultSocketTimeout;
var init_resolve_default_socket_timeout = __esm({
  "node_modules/@smithy/node-http-handler/dist-es/resolve-default-socket-timeout.js"() {
    resolveDefaultSocketTimeout = /* @__PURE__ */ __name((config) => {
      const value = config?.defaultSocketTimeout;
      return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : void 0;
    }, "resolveDefaultSocketTimeout");
  }
});

// node_modules/@smithy/node-http-handler/dist-es/set-socket-timeout.js
var DEFER_EVENT_LISTENER_TIME3, setSocketTimeout;
var init_set_socket_timeout = __esm({
  "node_modules/@smithy/node-http-handler/dist-es/set-socket-timeout.js"() {
    init_timing();
    DEFER_EVENT_LISTENER_TIME3 = 3e3;
    setSocketTimeout = /* @__PURE__ */ __name((request, reject, timeoutInMs = 0, destroyResponseBodyOnTimeout = false) => {
      let response;
      if (destroyResponseBodyOnTimeout) {
        request.once("response", (res) => response = res);
      }
      const registerTimeout = /* @__PURE__ */ __name((offset) => {
        const timeout = timeoutInMs - offset;
        const onTimeout = /* @__PURE__ */ __name(() => {
          const error = Object.assign(new Error(`@smithy/node-http-handler - the request socket timed out after ${timeoutInMs} ms of inactivity (${destroyResponseBodyOnTimeout ? "service default socket timeout" : "configured by client requestHandler"}).`), { name: "TimeoutError" });
          if (destroyResponseBodyOnTimeout) {
            response?.destroy(error);
          }
          request.destroy();
          reject(error);
        }, "onTimeout");
        if (request.socket) {
          request.socket.setTimeout(timeout, onTimeout);
          request.on("close", () => request.socket?.removeListener("timeout", onTimeout));
        } else {
          request.setTimeout(timeout, onTimeout);
        }
      }, "registerTimeout");
      if (0 < timeoutInMs && timeoutInMs < 6e3) {
        registerTimeout(0);
        return 0;
      }
      const deferralId = timing.setTimeout(registerTimeout.bind(null, timeoutInMs === 0 ? 0 : DEFER_EVENT_LISTENER_TIME3), DEFER_EVENT_LISTENER_TIME3);
      if (destroyResponseBodyOnTimeout) {
        request.once("close", () => timing.clearTimeout(deferralId));
        return 0;
      }
      return deferralId;
    }, "setSocketTimeout");
  }
});

// node_modules/@smithy/node-http-handler/dist-es/write-request-body.js
import { Readable as Readable4 } from "node:stream";
async function writeRequestBody(httpRequest2, request, maxContinueTimeoutMs = MIN_WAIT_TIME, externalAgent = false) {
  const headers = request.headers;
  const expect = headers ? headers.Expect || headers.expect : void 0;
  let timeoutId = -1;
  let sendBody = true;
  if (!externalAgent && expect === "100-continue") {
    sendBody = await Promise.race([
      new Promise((resolve) => {
        timeoutId = Number(timing.setTimeout(() => resolve(true), Math.max(MIN_WAIT_TIME, maxContinueTimeoutMs)));
      }),
      new Promise((resolve) => {
        httpRequest2.on("continue", () => {
          timing.clearTimeout(timeoutId);
          resolve(true);
        });
        httpRequest2.on("response", () => {
          timing.clearTimeout(timeoutId);
          resolve(false);
        });
        httpRequest2.on("error", () => {
          timing.clearTimeout(timeoutId);
          resolve(false);
        });
      })
    ]);
  }
  if (sendBody) {
    writeBody(httpRequest2, request.body);
  }
}
function writeBody(httpRequest2, body) {
  if (body instanceof Readable4) {
    body.pipe(httpRequest2);
    return;
  }
  if (body) {
    const isBuffer = Buffer.isBuffer(body);
    const isString = typeof body === "string";
    if (isBuffer || isString) {
      if (isBuffer && body.byteLength === 0) {
        httpRequest2.end();
      } else {
        httpRequest2.end(body);
      }
      return;
    }
    const uint8 = body;
    if (typeof uint8 === "object" && uint8.buffer && typeof uint8.byteOffset === "number" && typeof uint8.byteLength === "number") {
      httpRequest2.end(Buffer.from(uint8.buffer, uint8.byteOffset, uint8.byteLength));
      return;
    }
    httpRequest2.end(Buffer.from(body));
    return;
  }
  httpRequest2.end();
}
var MIN_WAIT_TIME;
var init_write_request_body = __esm({
  "node_modules/@smithy/node-http-handler/dist-es/write-request-body.js"() {
    init_timing();
    MIN_WAIT_TIME = 6e3;
    __name(writeRequestBody, "writeRequestBody");
    __name(writeBody, "writeBody");
  }
});

// node_modules/@smithy/node-http-handler/dist-es/node-http-handler.js
var hAgent, hRequest, NodeHttpHandler;
var init_node_http_handler = __esm({
  "node_modules/@smithy/node-http-handler/dist-es/node-http-handler.js"() {
    init_serde();
    init_protocols();
    init_build_abort_error();
    init_constants7();
    init_get_transformed_headers();
    init_node_https();
    init_set_connection_timeout();
    init_set_request_timeout();
    init_set_socket_keep_alive();
    init_resolve_default_socket_timeout();
    init_set_socket_timeout();
    init_timing();
    init_write_request_body();
    hAgent = void 0;
    hRequest = void 0;
    NodeHttpHandler = class _NodeHttpHandler {
      static {
        __name(this, "NodeHttpHandler");
      }
      config;
      configProvider;
      socketWarningTimestamp = 0;
      externalAgent = false;
      metadata = { handlerProtocol: "http/1.1" };
      static create(instanceOrOptions) {
        if (typeof instanceOrOptions?.handle === "function") {
          return instanceOrOptions;
        }
        return new _NodeHttpHandler(instanceOrOptions);
      }
      static checkSocketUsage(agent, socketWarningTimestamp, logger2 = console) {
        const { sockets, requests, maxSockets } = agent;
        if (typeof maxSockets !== "number" || maxSockets === Infinity) {
          return socketWarningTimestamp;
        }
        const interval = 15e3;
        if (Date.now() - interval < socketWarningTimestamp) {
          return socketWarningTimestamp;
        }
        if (sockets && requests) {
          for (const origin in sockets) {
            if (!hasOwn(sockets, origin))
              continue;
            const socketsInUse = sockets[origin]?.length ?? 0;
            const requestsEnqueued = requests[origin]?.length ?? 0;
            if (socketsInUse >= maxSockets && requestsEnqueued >= 2 * maxSockets) {
              logger2?.warn?.(`@smithy/node-http-handler:WARN - socket usage at capacity=${socketsInUse} and ${requestsEnqueued} additional requests are enqueued.
See https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/node-configuring-maxsockets.html
or increase socketAcquisitionWarningTimeout=(millis) in the NodeHttpHandler config.`);
              return Date.now();
            }
          }
        }
        return socketWarningTimestamp;
      }
      constructor(options) {
        this.configProvider = new Promise((resolve, reject) => {
          if (typeof options === "function") {
            options().then((_options) => {
              resolve(this.resolveDefaultConfig(_options));
            }).catch(reject);
          } else {
            resolve(this.resolveDefaultConfig(options));
          }
        });
      }
      destroy() {
        this.config?.httpAgent?.destroy();
        this.config?.httpsAgent?.destroy();
      }
      async handle(request, { abortSignal, requestTimeout } = {}) {
        if (!this.config) {
          this.config = await this.configProvider;
        }
        const config = this.config;
        const logger2 = config.logger;
        const isSSL = request.protocol === "https:";
        if (!isSSL && !this.config.httpAgent) {
          this.config.httpAgent = await this.config.httpAgentProvider();
        }
        return new Promise((_resolve, _reject) => {
          let writeRequestBodyPromise = void 0;
          let socketWarningTimeoutId = -1;
          let connectionTimeoutId = -1;
          let requestTimeoutId = -1;
          let socketTimeoutId = -1;
          let keepAliveTimeoutId = -1;
          const clearTimeouts = /* @__PURE__ */ __name(() => {
            timing.clearTimeout(socketWarningTimeoutId);
            timing.clearTimeout(connectionTimeoutId);
            timing.clearTimeout(requestTimeoutId);
            timing.clearTimeout(socketTimeoutId);
            timing.clearTimeout(keepAliveTimeoutId);
          }, "clearTimeouts");
          const resolve = /* @__PURE__ */ __name(async (arg) => {
            await writeRequestBodyPromise;
            clearTimeouts();
            _resolve(arg);
          }, "resolve");
          const reject = /* @__PURE__ */ __name(async (arg) => {
            await writeRequestBodyPromise;
            clearTimeouts();
            _reject(arg);
          }, "reject");
          if (abortSignal?.aborted) {
            const abortError = buildAbortError(abortSignal);
            reject(abortError);
            return;
          }
          const headers = request.headers;
          const expectContinue = headers ? (headers.Expect ?? headers.expect) === "100-continue" : false;
          let agent = isSSL ? config.httpsAgent : config.httpAgent;
          if (expectContinue && !this.externalAgent) {
            agent = new (isSSL ? node_https.Agent : hAgent)({
              keepAlive: false,
              maxSockets: Infinity
            });
          }
          socketWarningTimeoutId = timing.setTimeout(() => {
            this.socketWarningTimestamp = _NodeHttpHandler.checkSocketUsage(agent, this.socketWarningTimestamp, logger2);
          }, config.socketAcquisitionWarningTimeout ?? (config.requestTimeout ?? 2e3) + (config.connectionTimeout ?? 1e3));
          const queryString = request.query ? buildQueryString(request.query) : "";
          let auth = void 0;
          if (request.username != null || request.password != null) {
            const username = request.username ?? "";
            const password = request.password ?? "";
            auth = `${username}:${password}`;
          }
          let path = request.path;
          if (queryString) {
            path += `?${queryString}`;
          }
          if (request.fragment) {
            path += `#${request.fragment}`;
          }
          let hostname = request.hostname ?? "";
          if (hostname[0] === "[" && hostname.endsWith("]")) {
            hostname = request.hostname.slice(1, -1);
          } else {
            hostname = request.hostname;
          }
          const nodeHttpsOptions = {
            headers: request.headers,
            host: hostname,
            method: request.method,
            path,
            port: request.port,
            agent,
            auth
          };
          const requestFunc = isSSL ? node_https.request : hRequest;
          const req = requestFunc(nodeHttpsOptions, (res) => {
            const httpResponse = new HttpResponse({
              statusCode: res.statusCode || -1,
              reason: res.statusMessage,
              headers: getTransformedHeaders(res.headers),
              body: res
            });
            resolve({ response: httpResponse });
          });
          req.on("error", (err2) => {
            if (NODEJS_TIMEOUT_ERROR_CODES2.includes(err2.code)) {
              reject(Object.assign(err2, { name: "TimeoutError" }));
            } else {
              reject(err2);
            }
          });
          if (abortSignal) {
            const onAbort = /* @__PURE__ */ __name(() => {
              req.destroy();
              const abortError = buildAbortError(abortSignal);
              reject(abortError);
            }, "onAbort");
            if (typeof abortSignal.addEventListener === "function") {
              const signal = abortSignal;
              signal.addEventListener("abort", onAbort, { once: true });
              req.once("close", () => signal.removeEventListener("abort", onAbort));
            } else {
              abortSignal.onabort = onAbort;
            }
          }
          const effectiveRequestTimeout = requestTimeout ?? config.requestTimeout;
          connectionTimeoutId = setConnectionTimeout(req, reject, config.connectionTimeout);
          requestTimeoutId = setRequestTimeout(req, reject, effectiveRequestTimeout, config.throwOnRequestTimeout, logger2 ?? console);
          const defaultSocketTimeout = config.socketTimeout === void 0 ? resolveDefaultSocketTimeout(config) : void 0;
          if (defaultSocketTimeout) {
            socketTimeoutId = setSocketTimeout(req, reject, defaultSocketTimeout, true);
          } else {
            socketTimeoutId = setSocketTimeout(req, reject, config.socketTimeout);
          }
          const httpAgent = nodeHttpsOptions.agent;
          if (typeof httpAgent === "object" && "keepAlive" in httpAgent) {
            keepAliveTimeoutId = setSocketKeepAlive(req, {
              keepAlive: httpAgent.keepAlive,
              keepAliveMsecs: httpAgent.keepAliveMsecs
            });
          }
          writeRequestBodyPromise = writeRequestBody(req, request, effectiveRequestTimeout, this.externalAgent).catch((e6) => {
            clearTimeouts();
            return _reject(e6);
          });
        });
      }
      updateHttpClientConfig(key, value) {
        this.config = void 0;
        this.configProvider = this.configProvider.then((config) => {
          if (key === /* @__PURE__ */ Symbol.for("logger")) {
            return {
              ...config,
              logger: config.logger ?? value
            };
          }
          return {
            ...config,
            [key]: value
          };
        });
      }
      httpHandlerConfigs() {
        return this.config ?? {};
      }
      resolveDefaultConfig(options) {
        const { requestTimeout, connectionTimeout, socketTimeout, socketAcquisitionWarningTimeout, httpAgent, httpsAgent, throwOnRequestTimeout, logger: logger2 } = options || {};
        const keepAlive = true;
        const maxSockets = 50;
        return {
          connectionTimeout,
          requestTimeout,
          socketTimeout,
          defaultSocketTimeout: resolveDefaultSocketTimeout(options),
          socketAcquisitionWarningTimeout,
          throwOnRequestTimeout,
          httpAgentProvider: /* @__PURE__ */ __name(async () => {
            const node_http2 = await import("node:http");
            const { Agent, request } = node_http2.default ?? node_http2;
            hRequest = request;
            hAgent = Agent;
            if (httpAgent instanceof hAgent || typeof httpAgent?.destroy === "function") {
              this.externalAgent = true;
              return httpAgent;
            }
            return new hAgent({ keepAlive, maxSockets, ...httpAgent });
          }, "httpAgentProvider"),
          httpsAgent: (() => {
            if (httpsAgent instanceof node_https.Agent || typeof httpsAgent?.destroy === "function") {
              this.externalAgent = true;
              return httpsAgent;
            }
            return new node_https.Agent({ keepAlive, maxSockets, ...httpsAgent });
          })(),
          logger: logger2
        };
      }
    };
  }
});

// node_modules/@smithy/node-http-handler/dist-es/index.js
var init_dist_es6 = __esm({
  "node_modules/@smithy/node-http-handler/dist-es/index.js"() {
    init_node_http_handler();
    init_serde();
  }
});

// node_modules/@aws-sdk/credential-provider-http/dist-es/fromHttp/checkUrl.js
var ECS_CONTAINER_HOST, EKS_CONTAINER_HOST_IPv4, EKS_CONTAINER_HOST_IPv6, checkUrl;
var init_checkUrl = __esm({
  "node_modules/@aws-sdk/credential-provider-http/dist-es/fromHttp/checkUrl.js"() {
    init_config2();
    ECS_CONTAINER_HOST = "169.254.170.2";
    EKS_CONTAINER_HOST_IPv4 = "169.254.170.23";
    EKS_CONTAINER_HOST_IPv6 = "[fd00:ec2::23]";
    checkUrl = /* @__PURE__ */ __name((url, logger2) => {
      if (url.protocol === "https:") {
        return;
      }
      if (url.hostname === ECS_CONTAINER_HOST || url.hostname === EKS_CONTAINER_HOST_IPv4 || url.hostname === EKS_CONTAINER_HOST_IPv6) {
        return;
      }
      if (url.hostname.includes("[")) {
        if (url.hostname === "[::1]" || url.hostname === "[0000:0000:0000:0000:0000:0000:0000:0001]") {
          return;
        }
      } else {
        if (url.hostname === "localhost") {
          return;
        }
        const ipComponents = url.hostname.split(".");
        const inRange = /* @__PURE__ */ __name((component) => {
          const num = parseInt(component, 10);
          return 0 <= num && num <= 255;
        }, "inRange");
        if (ipComponents[0] === "127" && inRange(ipComponents[1]) && inRange(ipComponents[2]) && inRange(ipComponents[3]) && ipComponents.length === 4) {
          return;
        }
      }
      throw new CredentialsProviderError(`URL not accepted. It must either be HTTPS or match one of the following:
  - loopback CIDR 127.0.0.0/8 or [::1/128]
  - ECS container host 169.254.170.2
  - EKS container host 169.254.170.23 or [fd00:ec2::23]`, { logger: logger2 });
    }, "checkUrl");
  }
});

// node_modules/@aws-sdk/credential-provider-http/dist-es/fromHttp/requestHelpers.js
function createGetRequest(url) {
  return new HttpRequest({
    protocol: url.protocol,
    hostname: url.hostname,
    port: Number(url.port),
    path: url.pathname,
    query: Array.from(url.searchParams.entries()).reduce((acc, [k6, v2]) => {
      acc[k6] = v2;
      return acc;
    }, {}),
    fragment: url.hash
  });
}
async function getCredentials(response, logger2) {
  const stream = sdkStreamMixin2(response.body);
  const str = await stream.transformToString();
  if (response.statusCode === 200) {
    const parsed = JSON.parse(str);
    if (typeof parsed.AccessKeyId !== "string" || typeof parsed.SecretAccessKey !== "string" || typeof parsed.Token !== "string" || typeof parsed.Expiration !== "string") {
      throw new CredentialsProviderError("HTTP credential provider response not of the required format, an object matching: { AccessKeyId: string, SecretAccessKey: string, Token: string, Expiration: string(rfc3339) }", { logger: logger2 });
    }
    return {
      accessKeyId: parsed.AccessKeyId,
      secretAccessKey: parsed.SecretAccessKey,
      sessionToken: parsed.Token,
      expiration: parseRfc3339DateTime(parsed.Expiration)
    };
  }
  if (response.statusCode >= 400 && response.statusCode < 500) {
    let parsedBody = {};
    try {
      parsedBody = JSON.parse(str);
    } catch (e6) {
    }
    throw Object.assign(new CredentialsProviderError(`Server responded with status: ${response.statusCode}`, { logger: logger2 }), {
      Code: parsedBody.Code,
      Message: parsedBody.Message
    });
  }
  throw new CredentialsProviderError(`Server responded with status: ${response.statusCode}`, { logger: logger2 });
}
var init_requestHelpers = __esm({
  "node_modules/@aws-sdk/credential-provider-http/dist-es/fromHttp/requestHelpers.js"() {
    init_config2();
    init_protocols();
    init_serde();
    init_serde();
    __name(createGetRequest, "createGetRequest");
    __name(getCredentials, "getCredentials");
  }
});

// node_modules/@aws-sdk/credential-provider-http/dist-es/fromHttp/retry-wrapper.js
var retryWrapper;
var init_retry_wrapper = __esm({
  "node_modules/@aws-sdk/credential-provider-http/dist-es/fromHttp/retry-wrapper.js"() {
    retryWrapper = /* @__PURE__ */ __name((toRetry, maxRetries, delayMs) => {
      return async () => {
        for (let i6 = 0; i6 < maxRetries; ++i6) {
          try {
            return await toRetry();
          } catch (e6) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
        return await toRetry();
      };
    }, "retryWrapper");
  }
});

// node_modules/@aws-sdk/credential-provider-http/dist-es/fromHttp/fromHttp.js
import fs from "node:fs/promises";
var AWS_CONTAINER_CREDENTIALS_RELATIVE_URI, DEFAULT_LINK_LOCAL_HOST, AWS_CONTAINER_CREDENTIALS_FULL_URI, AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE, AWS_CONTAINER_AUTHORIZATION_TOKEN, fromHttp, validateToken;
var init_fromHttp = __esm({
  "node_modules/@aws-sdk/credential-provider-http/dist-es/fromHttp/fromHttp.js"() {
    init_client3();
    init_config2();
    init_dist_es6();
    init_checkUrl();
    init_requestHelpers();
    init_retry_wrapper();
    AWS_CONTAINER_CREDENTIALS_RELATIVE_URI = "AWS_CONTAINER_CREDENTIALS_RELATIVE_URI";
    DEFAULT_LINK_LOCAL_HOST = "http://169.254.170.2";
    AWS_CONTAINER_CREDENTIALS_FULL_URI = "AWS_CONTAINER_CREDENTIALS_FULL_URI";
    AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE = "AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE";
    AWS_CONTAINER_AUTHORIZATION_TOKEN = "AWS_CONTAINER_AUTHORIZATION_TOKEN";
    fromHttp = /* @__PURE__ */ __name((options = {}) => {
      options.logger?.debug("@aws-sdk/credential-provider-http - fromHttp");
      let host;
      const relative = options.awsContainerCredentialsRelativeUri ?? process.env[AWS_CONTAINER_CREDENTIALS_RELATIVE_URI];
      const full = options.awsContainerCredentialsFullUri ?? process.env[AWS_CONTAINER_CREDENTIALS_FULL_URI];
      const token = options.awsContainerAuthorizationToken ?? process.env[AWS_CONTAINER_AUTHORIZATION_TOKEN];
      const tokenFile = options.awsContainerAuthorizationTokenFile ?? process.env[AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE];
      const warn = options.logger?.constructor?.name === "NoOpLogger" || !options.logger?.warn ? console.warn : options.logger.warn.bind(options.logger);
      if (relative && full) {
        warn("@aws-sdk/credential-provider-http: you have set both awsContainerCredentialsRelativeUri and awsContainerCredentialsFullUri.");
        warn("awsContainerCredentialsRelativeUri will take precedence.");
      }
      if (token && tokenFile) {
        warn("@aws-sdk/credential-provider-http: you have set both awsContainerAuthorizationToken and awsContainerAuthorizationTokenFile.");
        warn("awsContainerAuthorizationTokenFile will take precedence.");
      }
      if (relative) {
        host = `${DEFAULT_LINK_LOCAL_HOST}${relative}`;
      } else if (full) {
        host = full;
      } else {
        throw new CredentialsProviderError(`No HTTP credential provider host provided.
Set AWS_CONTAINER_CREDENTIALS_FULL_URI or AWS_CONTAINER_CREDENTIALS_RELATIVE_URI.`, { logger: options.logger });
      }
      const url = new URL(host);
      checkUrl(url, options.logger);
      const requestHandler = NodeHttpHandler.create({ connectionTimeout: options.timeout ?? 1e3 });
      const requestTimeout = options.timeout ?? 1e3;
      const provider = retryWrapper(async () => {
        const request = createGetRequest(url);
        if (tokenFile) {
          request.headers.Authorization = validateToken((await fs.readFile(tokenFile)).toString());
        } else if (token) {
          request.headers.Authorization = validateToken(token);
        }
        try {
          const result = await requestHandler.handle(request, { requestTimeout });
          return getCredentials(result.response).then((creds) => setCredentialFeature(creds, "CREDENTIALS_HTTP", "z"));
        } catch (e6) {
          throw new CredentialsProviderError(String(e6), { logger: options.logger });
        }
      }, options.maxRetries ?? 3, options.timeout ?? 1e3);
      return async () => {
        try {
          return await provider();
        } finally {
          requestHandler.destroy?.();
        }
      };
    }, "fromHttp");
    validateToken = /* @__PURE__ */ __name((token) => {
      if (token.includes("\r\n")) {
        throw new CredentialsProviderError("Authorization token contains invalid \\r\\n sequence.");
      }
      return token;
    }, "validateToken");
  }
});

// node_modules/@aws-sdk/credential-provider-http/dist-es/index.js
var dist_es_exports3 = {};
__export(dist_es_exports3, {
  fromHttp: () => fromHttp
});
var init_dist_es7 = __esm({
  "node_modules/@aws-sdk/credential-provider-http/dist-es/index.js"() {
    init_fromHttp();
  }
});

// node_modules/@aws-sdk/credential-provider-sso/dist-es/isSsoProfile.js
var isSsoProfile;
var init_isSsoProfile = __esm({
  "node_modules/@aws-sdk/credential-provider-sso/dist-es/isSsoProfile.js"() {
    isSsoProfile = /* @__PURE__ */ __name((arg) => arg && (typeof arg.sso_start_url === "string" || typeof arg.sso_account_id === "string" || typeof arg.sso_session === "string" || typeof arg.sso_region === "string" || typeof arg.sso_role_name === "string"), "isSsoProfile");
  }
});

// node_modules/@aws-sdk/credential-provider-sso/node_modules/@aws-sdk/token-providers/dist-es/constants.js
var EXPIRE_WINDOW_MS, REFRESH_MESSAGE;
var init_constants8 = __esm({
  "node_modules/@aws-sdk/credential-provider-sso/node_modules/@aws-sdk/token-providers/dist-es/constants.js"() {
    EXPIRE_WINDOW_MS = 5 * 60 * 1e3;
    REFRESH_MESSAGE = `To refresh this SSO session run 'aws sso login' with the corresponding profile.`;
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/auth/httpAuthSchemeProvider.js
function createAwsAuthSigv4HttpAuthOption2(authParameters) {
  return {
    schemeId: "aws.auth#sigv4",
    signingProperties: {
      name: "sso-oauth",
      region: authParameters.region
    },
    propertiesExtractor: /* @__PURE__ */ __name((config, context) => ({
      signingProperties: {
        config,
        context
      }
    }), "propertiesExtractor")
  };
}
function createSmithyApiNoAuthHttpAuthOption(authParameters) {
  return {
    schemeId: "smithy.api#noAuth"
  };
}
var defaultSSOOIDCHttpAuthSchemeParametersProvider, defaultSSOOIDCHttpAuthSchemeProvider, resolveHttpAuthSchemeConfig2;
var init_httpAuthSchemeProvider = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/auth/httpAuthSchemeProvider.js"() {
    init_httpAuthSchemes2();
    init_client2();
    defaultSSOOIDCHttpAuthSchemeParametersProvider = /* @__PURE__ */ __name(async (config, context, input) => {
      return {
        operation: getSmithyContext(context).operation,
        region: await normalizeProvider(config.region)() || (() => {
          throw new Error("expected `region` to be configured for `aws.auth#sigv4`");
        })()
      };
    }, "defaultSSOOIDCHttpAuthSchemeParametersProvider");
    __name(createAwsAuthSigv4HttpAuthOption2, "createAwsAuthSigv4HttpAuthOption");
    __name(createSmithyApiNoAuthHttpAuthOption, "createSmithyApiNoAuthHttpAuthOption");
    defaultSSOOIDCHttpAuthSchemeProvider = /* @__PURE__ */ __name((authParameters) => {
      const options = [];
      switch (authParameters.operation) {
        case "CreateToken":
          {
            options.push(createSmithyApiNoAuthHttpAuthOption(authParameters));
            break;
          }
          ;
        default: {
          options.push(createAwsAuthSigv4HttpAuthOption2(authParameters));
        }
      }
      return options;
    }, "defaultSSOOIDCHttpAuthSchemeProvider");
    resolveHttpAuthSchemeConfig2 = /* @__PURE__ */ __name((config) => {
      const config_0 = resolveAwsSdkSigV4Config(config);
      return Object.assign(config_0, {
        authSchemePreference: normalizeProvider(config.authSchemePreference ?? [])
      });
    }, "resolveHttpAuthSchemeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/endpoint/EndpointParameters.js
var resolveClientEndpointParameters2, commonParams2;
var init_EndpointParameters = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/endpoint/EndpointParameters.js"() {
    resolveClientEndpointParameters2 = /* @__PURE__ */ __name((options) => {
      return Object.assign(options, {
        useDualstackEndpoint: options.useDualstackEndpoint ?? false,
        useFipsEndpoint: options.useFipsEndpoint ?? false,
        defaultSigningName: "sso-oauth"
      });
    }, "resolveClientEndpointParameters");
    commonParams2 = {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/package.json
var package_default2;
var init_package = __esm({
  "node_modules/@aws-sdk/nested-clients/package.json"() {
    package_default2 = {
      name: "@aws-sdk/nested-clients",
      version: "3.997.51",
      description: "Nested clients for AWS SDK packages.",
      homepage: "https://github.com/aws/aws-sdk-js-v3/tree/main/packages/nested-clients",
      license: "Apache-2.0",
      author: {
        name: "AWS SDK for JavaScript Team",
        url: "https://aws.amazon.com/sdk-for-javascript/"
      },
      repository: {
        type: "git",
        url: "https://github.com/aws/aws-sdk-js-v3.git",
        directory: "packages/nested-clients"
      },
      files: [
        "./cognito-identity.d.ts",
        "./cognito-identity.js",
        "./signin.d.ts",
        "./signin.js",
        "./sso-oidc.d.ts",
        "./sso-oidc.js",
        "./sso.d.ts",
        "./sso.js",
        "./sts.d.ts",
        "./sts.js",
        "dist-*/**"
      ],
      sideEffects: false,
      main: "./dist-cjs/index.js",
      module: "./dist-es/index.js",
      browser: {
        "./dist-es/submodules/cognito-identity/runtimeConfig": "./dist-es/submodules/cognito-identity/runtimeConfig.browser",
        "./dist-es/submodules/signin/runtimeConfig": "./dist-es/submodules/signin/runtimeConfig.browser",
        "./dist-es/submodules/sso-oidc/runtimeConfig": "./dist-es/submodules/sso-oidc/runtimeConfig.browser",
        "./dist-es/submodules/sso/runtimeConfig": "./dist-es/submodules/sso/runtimeConfig.browser",
        "./dist-es/submodules/sts/runtimeConfig": "./dist-es/submodules/sts/runtimeConfig.browser"
      },
      types: "./dist-types/index.d.ts",
      typesVersions: {
        "<4.5": {
          "dist-types/*": [
            "dist-types/ts3.4/*"
          ],
          "*": [
            "dist-types/ts3.4/submodules/*/index.d.ts"
          ]
        }
      },
      "react-native": {},
      exports: {
        "./package.json": "./package.json",
        "./sso-oidc": {
          types: "./dist-types/submodules/sso-oidc/index.d.ts",
          module: "./dist-es/submodules/sso-oidc/index.js",
          node: "./dist-cjs/submodules/sso-oidc/index.js",
          import: "./dist-es/submodules/sso-oidc/index.js",
          require: "./dist-cjs/submodules/sso-oidc/index.js"
        },
        "./sts": {
          types: "./dist-types/submodules/sts/index.d.ts",
          module: "./dist-es/submodules/sts/index.js",
          node: "./dist-cjs/submodules/sts/index.js",
          import: "./dist-es/submodules/sts/index.js",
          require: "./dist-cjs/submodules/sts/index.js"
        },
        "./signin": {
          types: "./dist-types/submodules/signin/index.d.ts",
          module: "./dist-es/submodules/signin/index.js",
          node: "./dist-cjs/submodules/signin/index.js",
          import: "./dist-es/submodules/signin/index.js",
          require: "./dist-cjs/submodules/signin/index.js"
        },
        "./cognito-identity": {
          types: "./dist-types/submodules/cognito-identity/index.d.ts",
          module: "./dist-es/submodules/cognito-identity/index.js",
          node: "./dist-cjs/submodules/cognito-identity/index.js",
          import: "./dist-es/submodules/cognito-identity/index.js",
          require: "./dist-cjs/submodules/cognito-identity/index.js"
        },
        "./sso": {
          types: "./dist-types/submodules/sso/index.d.ts",
          module: "./dist-es/submodules/sso/index.js",
          node: "./dist-cjs/submodules/sso/index.js",
          import: "./dist-es/submodules/sso/index.js",
          require: "./dist-cjs/submodules/sso/index.js"
        }
      },
      scripts: {
        build: "concurrently 'yarn:build:types' 'yarn:build:es' && yarn build:cjs",
        "build:cjs": "node ../../scripts/compilation/inline",
        "build:es": "premove dist-es && tsc -p tsconfig.es.json",
        "build:include:deps": 'yarn g:turbo run build -F="$npm_package_name"',
        "build:types": "premove dist-types && tsc -p tsconfig.types.json",
        "build:types:downlevel": "downlevel-dts dist-types dist-types/ts3.4",
        clean: "premove dist-cjs dist-es dist-types",
        lint: "node ../../scripts/validation/submodules-linter.js",
        prebuild: "yarn lint",
        test: "yarn g:vitest run",
        "test:watch": "yarn g:vitest watch"
      },
      dependencies: {
        "@aws-sdk/core": "^3.978.6",
        "@aws-sdk/signature-v4-multi-region": "^3.996.49",
        "@aws-sdk/types": "^3.975.0",
        "@smithy/core": "^3.37.0",
        "@smithy/fetch-http-handler": "^5.8.0",
        "@smithy/node-http-handler": "^4.13.0",
        "@smithy/types": "^4.19.0",
        tslib: "^2.6.2"
      },
      devDependencies: {
        concurrently: "7.0.0",
        "downlevel-dts": "0.10.1",
        premove: "4.0.0",
        typescript: "~7.0.2"
      },
      engines: {
        node: ">=20.0.0"
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/ProtocolLib.js
var ProtocolLib;
var init_ProtocolLib = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/ProtocolLib.js"() {
    init_client2();
    init_schema();
    ProtocolLib = class {
      static {
        __name(this, "ProtocolLib");
      }
      queryCompat;
      errorRegistry;
      constructor(queryCompat = false) {
        this.queryCompat = queryCompat;
      }
      resolveRestContentType(defaultContentType, inputSchema) {
        const members = inputSchema.getMemberSchemas();
        const httpPayloadMember = Object.values(members).find((m4) => {
          return !!m4.getMergedTraits().httpPayload;
        });
        if (httpPayloadMember) {
          const mediaType = httpPayloadMember.getMergedTraits().mediaType;
          if (mediaType) {
            return mediaType;
          } else if (httpPayloadMember.isStringSchema()) {
            return "text/plain";
          } else if (httpPayloadMember.isBlobSchema()) {
            return "application/octet-stream";
          } else {
            return defaultContentType;
          }
        } else if (!inputSchema.isUnitSchema()) {
          const hasBody = Object.values(members).find((m4) => {
            const { httpQuery, httpQueryParams, httpHeader, httpLabel, httpPrefixHeaders } = m4.getMergedTraits();
            const noPrefixHeaders = httpPrefixHeaders === void 0;
            return !httpQuery && !httpQueryParams && !httpHeader && !httpLabel && noPrefixHeaders;
          });
          if (hasBody) {
            return defaultContentType;
          }
        }
      }
      async getErrorSchemaOrThrowBaseException(errorIdentifier, defaultNamespace, response, dataObject, metadata, getErrorSchema) {
        let errorName = errorIdentifier;
        if (errorIdentifier.includes("#")) {
          [, errorName] = errorIdentifier.split("#");
        }
        const errorMetadata = {
          $metadata: metadata,
          $fault: response.statusCode < 500 ? "client" : "server"
        };
        if (!this.errorRegistry) {
          throw new Error("@aws-sdk/core/protocols - error handler not initialized.");
        }
        try {
          const errorSchema = getErrorSchema?.(this.errorRegistry, errorName) ?? this.errorRegistry.getSchema(errorIdentifier);
          return { errorSchema, errorMetadata };
        } catch (e6) {
          dataObject.message = dataObject.message ?? dataObject.Message ?? "UnknownError";
          const synthetic = this.errorRegistry;
          const baseExceptionSchema = synthetic.getBaseException();
          if (baseExceptionSchema) {
            const ErrorCtor = synthetic.getErrorCtor(baseExceptionSchema) ?? Error;
            throw this.decorateServiceException(Object.assign(new ErrorCtor({ name: errorName }), errorMetadata), dataObject);
          }
          const d6 = dataObject;
          const message = d6?.message ?? d6?.Message ?? d6?.Error?.Message ?? d6?.Error?.message;
          throw this.decorateServiceException(Object.assign(new Error(message), {
            name: errorName
          }, errorMetadata), dataObject);
        }
      }
      compose(composite, errorIdentifier, defaultNamespace) {
        let namespace = defaultNamespace;
        if (errorIdentifier.includes("#")) {
          [namespace] = errorIdentifier.split("#");
        }
        const staticRegistry = TypeRegistry.for(namespace);
        const defaultSyntheticRegistry = TypeRegistry.for("smithy.ts.sdk.synthetic." + defaultNamespace);
        composite.copyFrom(staticRegistry);
        composite.copyFrom(defaultSyntheticRegistry);
        this.errorRegistry = composite;
      }
      decorateServiceException(exception, additions = {}) {
        if (this.queryCompat) {
          const msg = exception.Message ?? additions.Message;
          const error = decorateServiceException(exception, additions);
          if (msg) {
            error.message = msg;
          }
          const errorObj = error.Error ?? {};
          errorObj.Type = error.Error?.Type;
          errorObj.Code = error.Error?.Code;
          errorObj.Message = error.Error?.message ?? error.Error?.Message ?? msg;
          error.Error = errorObj;
          const reqId = error.$metadata.requestId;
          if (reqId) {
            error.RequestId = reqId;
          }
          return error;
        }
        return decorateServiceException(exception, additions);
      }
      setQueryCompatError(output, response) {
        const queryErrorHeader = response.headers?.["x-amzn-query-error"];
        if (output !== void 0 && queryErrorHeader != null) {
          const [Code, Type] = queryErrorHeader.split(";");
          const keys = Object.keys(output);
          const Error2 = {
            Code,
            Type
          };
          output.Code = Code;
          output.Type = Type;
          for (let i6 = 0; i6 < keys.length; i6++) {
            const k6 = keys[i6];
            Error2[k6 === "message" ? "Message" : k6] = output[k6];
          }
          delete Error2.__type;
          output.Error = Error2;
        }
      }
      queryCompatOutput(queryCompatErrorData, errorData) {
        if (queryCompatErrorData.Error) {
          errorData.Error = queryCompatErrorData.Error;
        }
        if (queryCompatErrorData.Type) {
          errorData.Type = queryCompatErrorData.Type;
        }
        if (queryCompatErrorData.Code) {
          errorData.Code = queryCompatErrorData.Code;
        }
      }
      findQueryCompatibleError(registry, errorName) {
        try {
          return registry.getSchema(errorName);
        } catch (e6) {
          return registry.find((schema) => NormalizedSchema.of(schema).getMergedTraits().awsQueryError?.[0] === errorName);
        }
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/AwsJsonRpcProtocol.js
var AwsJsonRpcProtocol;
var init_AwsJsonRpcProtocol = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/AwsJsonRpcProtocol.js"() {
    init_protocols();
    init_schema();
    init_ProtocolLib();
    AwsJsonRpcProtocol = class extends RpcProtocol {
      static {
        __name(this, "AwsJsonRpcProtocol");
      }
      serializer;
      deserializer;
      serviceTarget;
      codec;
      mixin;
      awsQueryCompatible;
      constructor({ defaultNamespace, errorTypeRegistries: errorTypeRegistries6, serviceTarget, awsQueryCompatible, jsonCodec }) {
        super({
          defaultNamespace,
          errorTypeRegistries: errorTypeRegistries6
        });
        this.serviceTarget = serviceTarget;
        this.codec = jsonCodec ?? new JsonCodec2({
          timestampFormat: {
            useTrait: true,
            default: 7
          },
          jsonName: false
        });
        this.serializer = this.codec.createSerializer();
        this.deserializer = this.codec.createDeserializer();
        this.awsQueryCompatible = !!awsQueryCompatible;
        this.mixin = new ProtocolLib(this.awsQueryCompatible);
      }
      async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        if (!request.path.endsWith("/")) {
          request.path += "/";
        }
        request.headers["content-type"] = `application/x-amz-json-${this.getJsonRpcVersion()}`;
        request.headers["x-amz-target"] = `${this.serviceTarget}.${operationSchema.name}`;
        if (this.awsQueryCompatible) {
          request.headers["x-amzn-query-mode"] = "true";
        }
        if (deref(operationSchema.input) === "unit" || !request.body) {
          request.body = "{}";
        }
        return request;
      }
      getPayloadCodec() {
        return this.codec;
      }
      async handleError(operationSchema, context, response, dataObject, metadata) {
        const { awsQueryCompatible } = this;
        if (awsQueryCompatible) {
          this.mixin.setQueryCompatError(dataObject, response);
        }
        const errorIdentifier = loadJsonRpcErrorCode(response, dataObject, awsQueryCompatible) ?? "Unknown";
        this.mixin.compose(this.compositeErrorRegistry, errorIdentifier, this.options.defaultNamespace);
        const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorIdentifier, this.options.defaultNamespace, response, dataObject, metadata, awsQueryCompatible ? this.mixin.findQueryCompatibleError : void 0);
        const ns = NormalizedSchema.of(errorSchema);
        const message = dataObject.message ?? dataObject.Message ?? "UnknownError";
        const ErrorCtor = this.compositeErrorRegistry.getErrorCtor(errorSchema) ?? Error;
        const exception = new ErrorCtor({});
        const output = {};
        const errorDeserializer = this.codec.createDeserializer();
        for (const [name, member2] of ns.structIterator()) {
          if (dataObject[name] != null) {
            output[name] = errorDeserializer.readObject(member2, dataObject[name]);
          }
        }
        if (awsQueryCompatible) {
          this.mixin.queryCompatOutput(dataObject, output);
        }
        throw this.mixin.decorateServiceException(Object.assign(exception, errorMetadata, {
          $fault: ns.getMergedTraits().error,
          message
        }, output), dataObject);
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/AwsJson1_0Protocol.js
var AwsJson1_0Protocol;
var init_AwsJson1_0Protocol = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/AwsJson1_0Protocol.js"() {
    init_AwsJsonRpcProtocol();
    AwsJson1_0Protocol = class extends AwsJsonRpcProtocol {
      static {
        __name(this, "AwsJson1_0Protocol");
      }
      constructor({ defaultNamespace, errorTypeRegistries: errorTypeRegistries6, serviceTarget, awsQueryCompatible, jsonCodec }) {
        super({
          defaultNamespace,
          errorTypeRegistries: errorTypeRegistries6,
          serviceTarget,
          awsQueryCompatible,
          jsonCodec
        });
      }
      getShapeId() {
        return "aws.protocols#awsJson1_0";
      }
      getJsonRpcVersion() {
        return "1.0";
      }
      getDefaultContentType() {
        return "application/x-amz-json-1.0";
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/AwsRestJsonProtocol.js
var AwsRestJsonProtocol;
var init_AwsRestJsonProtocol = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/AwsRestJsonProtocol.js"() {
    init_protocols();
    init_schema();
    init_ProtocolLib();
    AwsRestJsonProtocol = class extends HttpBindingProtocol {
      static {
        __name(this, "AwsRestJsonProtocol");
      }
      serializer;
      deserializer;
      codec;
      mixin = new ProtocolLib();
      constructor({ defaultNamespace, errorTypeRegistries: errorTypeRegistries6, jsonCodec }) {
        super({
          defaultNamespace,
          errorTypeRegistries: errorTypeRegistries6
        });
        const settings = {
          timestampFormat: {
            useTrait: true,
            default: 7
          },
          httpBindings: true,
          jsonName: true
        };
        this.codec = jsonCodec ?? new JsonCodec2(settings);
        this.serializer = new HttpInterceptingShapeSerializer(this.codec.createSerializer(), settings);
        this.deserializer = new HttpInterceptingShapeDeserializer(this.codec.createDeserializer(), settings);
      }
      getShapeId() {
        return "aws.protocols#restJson1";
      }
      getPayloadCodec() {
        return this.codec;
      }
      setSerdeContext(serdeContext) {
        this.codec.setSerdeContext(serdeContext);
        super.setSerdeContext(serdeContext);
      }
      async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        const inputSchema = NormalizedSchema.of(operationSchema.input);
        if (!request.headers["content-type"]) {
          const contentType = this.mixin.resolveRestContentType(this.getDefaultContentType(), inputSchema);
          if (contentType) {
            request.headers["content-type"] = contentType;
          }
        }
        if (request.body == null && request.headers["content-type"] === this.getDefaultContentType()) {
          request.body = "{}";
        }
        return request;
      }
      async deserializeResponse(operationSchema, context, response) {
        const output = await super.deserializeResponse(operationSchema, context, response);
        const outputSchema = NormalizedSchema.of(operationSchema.output);
        for (const [name, member2] of outputSchema.structIterator()) {
          if (member2.getMemberTraits().httpPayload && !(name in output)) {
            output[name] = null;
          }
        }
        return output;
      }
      async handleError(operationSchema, context, response, dataObject, metadata) {
        const errorIdentifier = loadRestJsonErrorCode(response, dataObject) ?? "Unknown";
        this.mixin.compose(this.compositeErrorRegistry, errorIdentifier, this.options.defaultNamespace);
        const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorIdentifier, this.options.defaultNamespace, response, dataObject, metadata);
        const ns = NormalizedSchema.of(errorSchema);
        const message = dataObject.message ?? dataObject.Message ?? "UnknownError";
        const ErrorCtor = this.compositeErrorRegistry.getErrorCtor(errorSchema) ?? Error;
        const exception = new ErrorCtor({});
        await this.deserializeHttpMessage(errorSchema, context, response, dataObject);
        const output = {};
        const errorDeserializer = this.codec.createDeserializer();
        for (const [name, member2] of ns.structIterator()) {
          const target = member2.getMergedTraits().jsonName ?? name;
          output[name] = errorDeserializer.readObject(member2, dataObject[target]);
        }
        throw this.mixin.decorateServiceException(Object.assign(exception, errorMetadata, {
          $fault: ns.getMergedTraits().error,
          message
        }, output), dataObject);
      }
      getDefaultContentType() {
        return "application/json";
      }
    };
  }
});

// node_modules/@aws-sdk/xml-builder/dist-es/xml-parser.js
function writeKey2(obj) {
  Object.defineProperty(obj, "__proto__", { value: void 0, writable: true, enumerable: true, configurable: true });
}
function parseXML(xml) {
  const state2 = new AwsXmlParser(xml);
  return state2.parse();
}
var AwsXmlParser;
var init_xml_parser = __esm({
  "node_modules/@aws-sdk/xml-builder/dist-es/xml-parser.js"() {
    __name(writeKey2, "writeKey");
    __name(parseXML, "parseXML");
    AwsXmlParser = class _AwsXmlParser {
      static {
        __name(this, "AwsXmlParser");
      }
      x;
      i = 0;
      z;
      constructor(x2) {
        this.x = x2;
        this.x = x2.replace(/\r\n?/g, "\n");
        this.z = this.x.length;
      }
      parse() {
        const p4 = this;
        const { z: z2 } = p4;
        while (p4.i < z2) {
          p4.trim();
          if (p4.i >= z2) {
            break;
          }
          if (p4.isNext("<?")) {
            p4.readTo("?>");
            p4.trim();
          } else if (p4.isNext("<!--")) {
            p4.readTo("-->");
            p4.trim();
          } else if (p4.isNext("<!DOCTYPE", false)) {
            p4.skipDoctype();
            p4.trim();
          } else if (p4.x[p4.i] === "<") {
            const root6 = p4.parseTag();
            return { [root6.tag]: root6.value };
          } else {
            throw new Error("@aws-sdk XML parse error: unexpected content.");
          }
        }
        throw new Error("@aws-sdk XML parse error: no root element.");
      }
      isNext(s3, caseSensitive = true) {
        const p4 = this;
        if (caseSensitive) {
          return p4.x.startsWith(s3, p4.i);
        }
        return p4.x.toLowerCase().startsWith(s3.toLowerCase(), p4.i);
      }
      readTo(stop) {
        const p4 = this;
        const _i = p4.x.indexOf(stop, p4.i);
        if (_i === -1) {
          throw new Error(`@aws-sdk XML parse error: expected "${stop}" not found.`);
        }
        const result = p4.x.slice(p4.i, _i);
        p4.i = _i + stop.length;
        return result;
      }
      trim() {
        const p4 = this;
        while (p4.i < p4.z && " 	\r\n".includes(p4.x[p4.i])) {
          ++p4.i;
        }
      }
      readAttrValue() {
        const p4 = this;
        const quote = p4.x[p4.i];
        ++p4.i;
        let value = "";
        while (p4.i < p4.z && p4.x[p4.i] !== quote) {
          value += p4.x[p4.i++];
        }
        ++p4.i;
        return p4.decodeEntities(value);
      }
      parseTag() {
        const p4 = this;
        ++p4.i;
        let tag = "";
        while (p4.i < p4.z && !" 	\r\n>/".includes(p4.x[p4.i])) {
          tag += p4.x[p4.i++];
        }
        let hasAttrs = false;
        const attrs = {};
        while (p4.i < p4.z) {
          p4.trim();
          if (">/".includes(p4.x[p4.i])) {
            break;
          }
          let name = "";
          while (p4.i < p4.z && !"= 	\r\n>/?".includes(p4.x[p4.i])) {
            name += p4.x[p4.i++];
          }
          p4.trim();
          if (p4.x[p4.i] !== "=") {
            break;
          }
          ++p4.i;
          p4.trim();
          if (name === "__proto__") {
            writeKey2(attrs);
          }
          attrs[name] = p4.readAttrValue();
          hasAttrs = true;
        }
        if (p4.i >= p4.z) {
          throw new Error("@aws-sdk XML parse error: unexpected end of input.");
        }
        if (p4.x[p4.i] === "/") {
          ++p4.i;
          if (p4.i >= p4.z || p4.x[p4.i] !== ">") {
            throw new Error("@aws-sdk XML parse error: expected > at the end of self-closing tag.");
          }
          ++p4.i;
          return { tag, value: hasAttrs ? attrs : "" };
        }
        if (p4.x[p4.i] !== ">") {
          throw new Error("@aws-sdk XML parse error: expected > at the end of opening tag.");
        }
        ++p4.i;
        const textParts = [];
        const childTags = [];
        let hasElementChild = false;
        while (p4.i < p4.z) {
          if (p4.isNext("</")) {
            break;
          }
          if (p4.x[p4.i] === "<") {
            if (p4.isNext("<!--")) {
              p4.readTo("-->");
            } else if (p4.isNext("<![CDATA[")) {
              p4.i += 9;
              textParts.push(p4.readTo("]]>"));
            } else if (p4.isNext("<?")) {
              p4.readTo("?>");
            } else {
              hasElementChild = true;
              childTags.push(p4.parseTag());
            }
          } else {
            let text = "";
            while (p4.i < p4.z && p4.x[p4.i] !== "<") {
              text += p4.x[p4.i++];
            }
            textParts.push(p4.decodeEntities(text));
          }
        }
        if (!p4.isNext("</")) {
          throw new Error(`@aws-sdk XML parse error: missing closing tag </${tag}>.`);
        }
        p4.i += 2;
        const closeTag = p4.readTo(">").trim();
        if (closeTag !== tag) {
          throw new Error(`@aws-sdk XML parse error: mismatched tags <${tag}> and </${closeTag}>.`);
        }
        if (!hasAttrs && textParts.length === 0 && !hasElementChild) {
          return { tag, value: "" };
        }
        if (!hasAttrs && !hasElementChild) {
          const text = textParts.length === 1 ? textParts[0] : textParts.join("");
          if (text.trim() === "" && text.includes("\n")) {
            return { tag, value: "" };
          }
          return { tag, value: text };
        }
        const obj = {};
        for (const text of textParts) {
          if (text.trim() === "" && text.includes("\n")) {
            continue;
          }
          obj["#text"] = "#text" in obj ? obj["#text"] + text : text;
        }
        for (const child of childTags) {
          if (child.tag === "__proto__") {
            writeKey2(obj);
          }
          if (child.tag in obj) {
            if (Array.isArray(obj[child.tag])) {
              obj[child.tag].push(child.value);
            } else {
              obj[child.tag] = [obj[child.tag], child.value];
            }
          } else {
            obj[child.tag] = child.value;
          }
        }
        for (const [k6, v2] of Object.entries(attrs)) {
          if (k6 === "__proto__") {
            writeKey2(obj);
          }
          obj[k6] = v2;
        }
        return { tag, value: obj };
      }
      static ENTITIES = {
        amp: "&",
        lt: "<",
        gt: ">",
        quot: '"',
        apos: "'"
      };
      skipDoctype() {
        const p4 = this;
        p4.i += 9;
        let depth = 0;
        while (p4.i < p4.z) {
          const c6 = p4.x[p4.i];
          if (c6 === "[") {
            ++depth;
          } else if (c6 === "]") {
            --depth;
          } else if (c6 === ">" && depth === 0) {
            ++p4.i;
            return;
          }
          ++p4.i;
        }
        throw new Error("@aws-sdk XML parse error: unclosed DOCTYPE.");
      }
      decodeEntities(s3) {
        return s3.replace(/&(?:#x([0-9a-fA-F]{1,6})|#(\d{1,7})|([a-zA-Z][a-zA-Z0-9]{0,30}));/g, (_, hex, dec, named) => {
          if (hex) {
            return String.fromCharCode(parseInt(hex, 16));
          }
          if (dec) {
            return String.fromCharCode(parseInt(dec, 10));
          }
          return _AwsXmlParser.ENTITIES[named] ?? "";
        });
      }
    };
  }
});

// node_modules/@aws-sdk/xml-builder/dist-es/index.js
var init_dist_es8 = __esm({
  "node_modules/@aws-sdk/xml-builder/dist-es/index.js"() {
    init_xml_parser();
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/ConfigurableSerdeContext.js
var SerdeContextConfig2;
var init_ConfigurableSerdeContext2 = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/ConfigurableSerdeContext.js"() {
    SerdeContextConfig2 = class {
      static {
        __name(this, "SerdeContextConfig");
      }
      serdeContext;
      setSerdeContext(serdeContext) {
        this.serdeContext = serdeContext;
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/UnionSerde.js
var UnionSerde2;
var init_UnionSerde2 = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/UnionSerde.js"() {
    UnionSerde2 = class {
      static {
        __name(this, "UnionSerde");
      }
      from;
      to;
      keys;
      constructor(from, to) {
        this.from = from;
        this.to = to;
        const keys = Object.keys(this.from);
        const set = new Set(keys);
        set.delete("__type");
        this.keys = set;
      }
      mark(key) {
        this.keys.delete(key);
      }
      hasUnknown() {
        return this.keys.size === 1 && Object.keys(this.to).length === 0;
      }
      writeUnknown() {
        if (this.hasUnknown()) {
          const k6 = this.keys.values().next().value;
          const v2 = this.from[k6];
          this.to.$unknown = [k6, v2];
        }
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/writeKey.js
function writeKey3(obj) {
  Object.defineProperty(obj, "__proto__", { value: void 0, writable: true, enumerable: true, configurable: true });
}
var init_writeKey2 = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/writeKey.js"() {
    __name(writeKey3, "writeKey");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/xml/XmlShapeDeserializer.js
var XmlShapeDeserializer;
var init_XmlShapeDeserializer = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/xml/XmlShapeDeserializer.js"() {
    init_dist_es8();
    init_client2();
    init_protocols();
    init_schema();
    init_serde();
    init_ConfigurableSerdeContext2();
    init_UnionSerde2();
    init_writeKey2();
    XmlShapeDeserializer = class extends SerdeContextConfig2 {
      static {
        __name(this, "XmlShapeDeserializer");
      }
      settings;
      stringDeserializer;
      constructor(settings) {
        super();
        this.settings = settings;
        this.stringDeserializer = new FromStringShapeDeserializer(settings);
      }
      setSerdeContext(serdeContext) {
        this.serdeContext = serdeContext;
        this.stringDeserializer.setSerdeContext(serdeContext);
      }
      read(schema, bytes, key) {
        const ns = NormalizedSchema.of(schema);
        const memberSchemas = ns.getMemberSchemas();
        const isEventPayload = ns.isStructSchema() && ns.isMemberSchema() && !!Object.values(memberSchemas).find((memberNs) => {
          return !!memberNs.getMemberTraits().eventPayload;
        });
        if (isEventPayload) {
          const output = {};
          const memberName = Object.keys(memberSchemas)[0];
          const eventMemberSchema = memberSchemas[memberName];
          if (eventMemberSchema.isBlobSchema()) {
            output[memberName] = bytes;
          } else {
            output[memberName] = this.read(memberSchemas[memberName], bytes);
          }
          return output;
        }
        const xmlString = (this.serdeContext?.utf8Encoder ?? toUtf8)(bytes);
        const parsedObject = this.parseXml(xmlString);
        return this.readSchema(schema, key ? parsedObject[key] : parsedObject);
      }
      readSchema(_schema, value) {
        const ns = NormalizedSchema.of(_schema);
        if (ns.isUnitSchema()) {
          return;
        }
        const traits = ns.getMergedTraits();
        if (ns.isListSchema() && !Array.isArray(value)) {
          return this.readSchema(ns, [value]);
        }
        if (value == null) {
          return value;
        }
        if (typeof value === "object") {
          const flat = !!traits.xmlFlattened;
          if (ns.isListSchema()) {
            const listValue = ns.getValueSchema();
            const buffer2 = [];
            const sourceKey = listValue.getMergedTraits().xmlName ?? "member";
            const source = flat ? value : (value[0] ?? value)[sourceKey];
            if (source == null) {
              return buffer2;
            }
            const sourceArray = Array.isArray(source) ? source : [source];
            for (const v2 of sourceArray) {
              buffer2.push(this.readSchema(listValue, v2));
            }
            return buffer2;
          }
          const buffer = {};
          if (ns.isMapSchema()) {
            const keyNs = ns.getKeySchema();
            const memberNs = ns.getValueSchema();
            let entries;
            if (flat) {
              entries = Array.isArray(value) ? value : [value];
            } else {
              entries = Array.isArray(value.entry) ? value.entry : [value.entry];
            }
            const keyProperty = keyNs.getMergedTraits().xmlName ?? "key";
            const valueProperty = memberNs.getMergedTraits().xmlName ?? "value";
            for (const entry of entries) {
              const key = entry[keyProperty];
              const value2 = entry[valueProperty];
              if (key === "__proto__") {
                writeKey3(buffer);
              }
              buffer[key] = this.readSchema(memberNs, value2);
            }
            return buffer;
          }
          if (ns.isStructSchema()) {
            const union = ns.isUnionSchema();
            let unionSerde;
            if (union) {
              unionSerde = new UnionSerde2(value, buffer);
            }
            for (const [memberName, memberSchema] of ns.structIterator()) {
              const memberTraits = memberSchema.getMergedTraits();
              const xmlObjectKey = !memberTraits.httpPayload ? memberSchema.getMemberTraits().xmlName ?? memberName : memberTraits.xmlName ?? memberSchema.getName();
              if (union) {
                unionSerde.mark(xmlObjectKey);
              }
              if (value[xmlObjectKey] != null) {
                buffer[memberName] = this.readSchema(memberSchema, value[xmlObjectKey]);
              }
            }
            if (union) {
              unionSerde.writeUnknown();
            }
            return buffer;
          }
          if (ns.isDocumentSchema()) {
            return value;
          }
          throw new Error(`@aws-sdk/core/protocols - xml deserializer unhandled schema type for ${ns.getName(true)}`);
        }
        if (ns.isListSchema()) {
          return [];
        }
        if (ns.isMapSchema() || ns.isStructSchema()) {
          return {};
        }
        return this.stringDeserializer.read(ns, value);
      }
      parseXml(xml) {
        if (xml.length) {
          let parsedObj;
          try {
            parsedObj = parseXML(xml);
          } catch (e6) {
            if (e6 && typeof e6 === "object") {
              Object.defineProperty(e6, "$responseBodyText", {
                value: xml
              });
            }
            throw e6;
          }
          const textNodeName = "#text";
          const key = Object.keys(parsedObj)[0];
          const parsedObjToReturn = parsedObj[key];
          if (parsedObjToReturn[textNodeName]) {
            parsedObjToReturn[key] = parsedObjToReturn[textNodeName];
            delete parsedObjToReturn[textNodeName];
          }
          return getValueFromTextNode(parsedObjToReturn);
        }
        return {};
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/query/QueryShapeSerializer.js
var QueryShapeSerializer;
var init_QueryShapeSerializer = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/query/QueryShapeSerializer.js"() {
    init_protocols();
    init_schema();
    init_serde();
    init_serde();
    init_ConfigurableSerdeContext2();
    QueryShapeSerializer = class extends SerdeContextConfig2 {
      static {
        __name(this, "QueryShapeSerializer");
      }
      settings;
      buffer;
      constructor(settings) {
        super();
        this.settings = settings;
      }
      write(schema, value, prefix = "") {
        if (this.buffer === void 0) {
          this.buffer = "";
        }
        const ns = NormalizedSchema.of(schema);
        if (prefix && !prefix.endsWith(".")) {
          prefix += ".";
        }
        if (ns.isBlobSchema()) {
          if (typeof value === "string" || value instanceof Uint8Array) {
            this.writeKey(prefix);
            this.writeValue((this.serdeContext?.base64Encoder ?? toBase64)(value));
          }
        } else if (ns.isBooleanSchema() || ns.isNumericSchema() || ns.isStringSchema()) {
          if (value != null) {
            this.writeKey(prefix);
            this.writeValue(String(value));
          } else if (ns.isIdempotencyToken()) {
            this.writeKey(prefix);
            this.writeValue(generateIdempotencyToken());
          }
        } else if (ns.isBigIntegerSchema()) {
          if (value != null) {
            this.writeKey(prefix);
            this.writeValue(String(value));
          }
        } else if (ns.isBigDecimalSchema()) {
          if (value != null) {
            this.writeKey(prefix);
            this.writeValue(value instanceof NumericValue ? value.string : String(value));
          }
        } else if (ns.isTimestampSchema()) {
          if (value instanceof Date) {
            this.writeKey(prefix);
            const format2 = determineTimestampFormat(ns, this.settings);
            switch (format2) {
              case 5:
                this.writeValue(value.toISOString().replace(".000Z", "Z"));
                break;
              case 6:
                this.writeValue(dateToUtcString(value));
                break;
              case 7:
                this.writeValue(String(value.getTime() / 1e3));
                break;
            }
          }
        } else if (ns.isDocumentSchema()) {
          if (Array.isArray(value)) {
            this.write(64 | 15, value, prefix);
          } else if (value instanceof Date) {
            this.write(4, value, prefix);
          } else if (value instanceof Uint8Array) {
            this.write(21, value, prefix);
          } else if (value && typeof value === "object") {
            this.write(128 | 15, value, prefix);
          } else {
            this.writeKey(prefix);
            this.writeValue(String(value));
          }
        } else if (ns.isListSchema()) {
          if (Array.isArray(value)) {
            if (value.length === 0) {
              if (this.settings.serializeEmptyLists) {
                this.writeKey(prefix);
                this.writeValue("");
              }
            } else {
              const member2 = ns.getValueSchema();
              const flat = this.settings.flattenLists || ns.getMergedTraits().xmlFlattened;
              let i6 = 1;
              for (const item of value) {
                if (item == null) {
                  continue;
                }
                const traits = member2.getMergedTraits();
                const suffix = this.getKey("member", traits.xmlName, traits.ec2QueryName);
                const key = flat ? `${prefix}${i6}` : `${prefix}${suffix}.${i6}`;
                this.write(member2, item, key);
                ++i6;
              }
            }
          }
        } else if (ns.isMapSchema()) {
          if (value && typeof value === "object") {
            const keySchema = ns.getKeySchema();
            const memberSchema = ns.getValueSchema();
            const flat = ns.getMergedTraits().xmlFlattened;
            let i6 = 1;
            for (const k6 in value) {
              const v2 = value[k6];
              if (v2 == null) {
                continue;
              }
              const keyTraits = keySchema.getMergedTraits();
              const keySuffix = this.getKey("key", keyTraits.xmlName, keyTraits.ec2QueryName);
              const key = flat ? `${prefix}${i6}.${keySuffix}` : `${prefix}entry.${i6}.${keySuffix}`;
              const valTraits = memberSchema.getMergedTraits();
              const valueSuffix = this.getKey("value", valTraits.xmlName, valTraits.ec2QueryName);
              const valueKey = flat ? `${prefix}${i6}.${valueSuffix}` : `${prefix}entry.${i6}.${valueSuffix}`;
              this.write(keySchema, k6, key);
              this.write(memberSchema, v2, valueKey);
              ++i6;
            }
          }
        } else if (ns.isStructSchema()) {
          if (value && typeof value === "object") {
            let didWriteMember = false;
            for (const [memberName, member2] of ns.structIterator()) {
              if (value[memberName] == null && !member2.isIdempotencyToken()) {
                continue;
              }
              const traits = member2.getMergedTraits();
              const suffix = this.getKey(memberName, traits.xmlName, traits.ec2QueryName, "struct");
              const key = `${prefix}${suffix}`;
              this.write(member2, value[memberName], key);
              didWriteMember = true;
            }
            if (!didWriteMember && ns.isUnionSchema()) {
              const { $unknown } = value;
              if (Array.isArray($unknown)) {
                const [k6, v2] = $unknown;
                const key = `${prefix}${k6}`;
                this.write(15, v2, key);
              }
            }
          }
        } else if (ns.isUnitSchema()) {
        } else {
          throw new Error(`@aws-sdk/core/protocols - QuerySerializer unrecognized schema type ${ns.getName(true)}`);
        }
      }
      flush() {
        if (this.buffer === void 0) {
          throw new Error("@aws-sdk/core/protocols - QuerySerializer cannot flush with nothing written to buffer.");
        }
        const str = this.buffer;
        delete this.buffer;
        return str;
      }
      getKey(memberName, xmlName, ec2QueryName, keySource) {
        const { ec2, capitalizeKeys } = this.settings;
        if (ec2 && ec2QueryName) {
          return ec2QueryName;
        }
        const key = xmlName ?? memberName;
        if (capitalizeKeys && keySource === "struct") {
          return key[0].toUpperCase() + key.slice(1);
        }
        return key;
      }
      writeKey(key) {
        if (key.endsWith(".")) {
          key = key.slice(0, key.length - 1);
        }
        this.buffer += `&${extendedEncodeURIComponent(key)}=`;
      }
      writeValue(value) {
        this.buffer += extendedEncodeURIComponent(value);
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/query/AwsQueryProtocol.js
var AwsQueryProtocol;
var init_AwsQueryProtocol = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/query/AwsQueryProtocol.js"() {
    init_protocols();
    init_schema();
    init_ProtocolLib();
    init_XmlShapeDeserializer();
    init_QueryShapeSerializer();
    AwsQueryProtocol = class extends RpcProtocol {
      static {
        __name(this, "AwsQueryProtocol");
      }
      options;
      serializer;
      deserializer;
      mixin = new ProtocolLib();
      constructor(options) {
        super({
          defaultNamespace: options.defaultNamespace,
          errorTypeRegistries: options.errorTypeRegistries
        });
        this.options = options;
        const settings = {
          timestampFormat: {
            useTrait: true,
            default: 5
          },
          httpBindings: false,
          xmlNamespace: options.xmlNamespace,
          serviceNamespace: options.defaultNamespace,
          serializeEmptyLists: true
        };
        this.serializer = new QueryShapeSerializer(settings);
        this.deserializer = new XmlShapeDeserializer(settings);
      }
      getShapeId() {
        return "aws.protocols#awsQuery";
      }
      setSerdeContext(serdeContext) {
        this.serializer.setSerdeContext(serdeContext);
        this.deserializer.setSerdeContext(serdeContext);
      }
      getPayloadCodec() {
        throw new Error("AWSQuery protocol has no payload codec.");
      }
      async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        if (!request.path.endsWith("/")) {
          request.path += "/";
        }
        request.headers["content-type"] = "application/x-www-form-urlencoded";
        if (deref(operationSchema.input) === "unit" || !request.body) {
          request.body = "";
        }
        const action = operationSchema.name.split("#")[1] ?? operationSchema.name;
        request.body = `Action=${action}&Version=${this.options.version}` + request.body;
        if (request.body.endsWith("&")) {
          request.body = request.body.slice(-1);
        }
        return request;
      }
      async deserializeResponse(operationSchema, context, response) {
        const deserializer = this.deserializer;
        const ns = NormalizedSchema.of(operationSchema.output);
        const dataObject = {};
        if (response.statusCode >= 300) {
          const bytes2 = await collectBody(response.body, context);
          if (bytes2.byteLength > 0) {
            Object.assign(dataObject, await deserializer.read(15, bytes2));
          }
          await this.handleError(operationSchema, context, response, dataObject, this.deserializeMetadata(response));
        }
        for (const header in response.headers) {
          const value = response.headers[header];
          delete response.headers[header];
          response.headers[header.toLowerCase()] = value;
        }
        const shortName = operationSchema.name.split("#")[1] ?? operationSchema.name;
        const awsQueryResultKey = ns.isStructSchema() && this.useNestedResult() ? shortName + "Result" : void 0;
        const bytes = await collectBody(response.body, context);
        if (bytes.byteLength > 0) {
          Object.assign(dataObject, await deserializer.read(ns, bytes, awsQueryResultKey));
        }
        dataObject.$metadata = this.deserializeMetadata(response);
        return dataObject;
      }
      useNestedResult() {
        return true;
      }
      async handleError(operationSchema, context, response, dataObject, metadata) {
        const errorIdentifier = this.loadQueryErrorCode(response, dataObject) ?? "Unknown";
        this.mixin.compose(this.compositeErrorRegistry, errorIdentifier, this.options.defaultNamespace);
        const errorData = this.loadQueryError(dataObject) ?? {};
        const message = this.loadQueryErrorMessage(dataObject);
        errorData.message = message;
        errorData.Error = {
          Type: errorData.Type,
          Code: errorData.Code,
          Message: message
        };
        const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorIdentifier, this.options.defaultNamespace, response, errorData, metadata, this.mixin.findQueryCompatibleError);
        const ns = NormalizedSchema.of(errorSchema);
        const ErrorCtor = this.compositeErrorRegistry.getErrorCtor(errorSchema) ?? Error;
        const exception = new ErrorCtor({});
        const output = {
          Type: errorData.Error.Type,
          Code: errorData.Error.Code,
          Error: errorData.Error
        };
        for (const [name, member2] of ns.structIterator()) {
          const target = member2.getMergedTraits().xmlName ?? name;
          const value = errorData[target] ?? dataObject[target];
          output[name] = this.deserializer.readSchema(member2, value);
        }
        throw this.mixin.decorateServiceException(Object.assign(exception, errorMetadata, {
          $fault: ns.getMergedTraits().error,
          message
        }, output), dataObject);
      }
      loadQueryErrorCode(output, data) {
        const code = (data.Errors?.[0]?.Error ?? data.Errors?.Error ?? data.Error)?.Code;
        if (code !== void 0) {
          return code;
        }
        if (output.statusCode == 404) {
          return "NotFound";
        }
      }
      loadQueryError(data) {
        return data.Errors?.[0]?.Error ?? data.Errors?.Error ?? data.Error;
      }
      loadQueryErrorMessage(data) {
        const errorData = this.loadQueryError(data);
        return errorData?.message ?? errorData?.Message ?? data.message ?? data.Message ?? "Unknown";
      }
      getDefaultContentType() {
        return "application/x-www-form-urlencoded";
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/index.js
var init_protocols2 = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/index.js"() {
    init_AwsJson1_0Protocol();
    init_AwsRestJsonProtocol();
    init_protocols();
    init_AwsQueryProtocol();
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/endpoint/bdd.js
var k, a, b, c, d, e, f, g, h, i, j, _data, root, r, nodes, bdd;
var init_bdd = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/endpoint/bdd.js"() {
    init_endpoints();
    k = "ref";
    a = -1;
    b = true;
    c = "isSet";
    d = "PartitionResult";
    e = "booleanEquals";
    f = "getAttr";
    g = { [k]: "Endpoint" };
    h = { [k]: d };
    i = {};
    j = [{ [k]: "Region" }];
    _data = {
      conditions: [
        [c, [g]],
        [c, j],
        ["aws.partition", j, d],
        [e, [{ [k]: "UseFIPS" }, b]],
        [e, [{ [k]: "UseDualStack" }, b]],
        [e, [{ fn: f, argv: [h, "supportsDualStack"] }, b]],
        [e, [{ fn: f, argv: [h, "supportsFIPS"] }, b]],
        ["stringEquals", [{ fn: f, argv: [h, "name"] }, "aws-us-gov"]]
      ],
      results: [
        [a],
        [a, "Invalid Configuration: FIPS and custom endpoint are not supported"],
        [a, "Invalid Configuration: Dualstack and custom endpoint are not supported"],
        [g, i],
        ["https://oidc-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", i],
        [a, "FIPS and DualStack are enabled, but this partition does not support one or both"],
        ["https://oidc.{Region}.amazonaws.com", i],
        ["https://oidc-fips.{Region}.{PartitionResult#dnsSuffix}", i],
        [a, "FIPS is enabled but this partition does not support FIPS"],
        ["https://oidc.{Region}.{PartitionResult#dualStackDnsSuffix}", i],
        [a, "DualStack is enabled but this partition does not support DualStack"],
        ["https://oidc.{Region}.{PartitionResult#dnsSuffix}", i],
        [a, "Invalid Configuration: Missing Region"]
      ]
    };
    root = 2;
    r = 1e8;
    nodes = new Int32Array([
      -1,
      1,
      -1,
      0,
      13,
      3,
      1,
      4,
      r + 12,
      2,
      5,
      r + 12,
      3,
      8,
      6,
      4,
      7,
      r + 11,
      5,
      r + 9,
      r + 10,
      4,
      11,
      9,
      6,
      10,
      r + 8,
      7,
      r + 6,
      r + 7,
      5,
      12,
      r + 5,
      6,
      r + 4,
      r + 5,
      3,
      r + 1,
      14,
      4,
      r + 2,
      r + 3
    ]);
    bdd = BinaryDecisionDiagram.from(nodes, root, _data.conditions, _data.results);
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/endpoint/endpointResolver.js
var cache, defaultEndpointResolver;
var init_endpointResolver = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/endpoint/endpointResolver.js"() {
    init_client3();
    init_endpoints();
    init_bdd();
    cache = new EndpointCache({
      size: 50,
      params: ["Endpoint", "Region", "UseDualStack", "UseFIPS"]
    });
    defaultEndpointResolver = /* @__PURE__ */ __name((endpointParams, context = {}) => {
      return cache.get(endpointParams, () => decideEndpoint(bdd, {
        endpointParams,
        logger: context.logger
      }));
    }, "defaultEndpointResolver");
    customEndpointFunctions.aws = awsEndpointFunctions;
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/models/SSOOIDCServiceException.js
var SSOOIDCServiceException;
var init_SSOOIDCServiceException = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/models/SSOOIDCServiceException.js"() {
    init_client2();
    SSOOIDCServiceException = class _SSOOIDCServiceException extends ServiceException {
      static {
        __name(this, "SSOOIDCServiceException");
      }
      static shapeId = "smithy.ts.sdk.synthetic.com.amazonaws.ssooidc#SSOOIDCServiceException";
      constructor(options) {
        super(options);
        Object.setPrototypeOf(this, _SSOOIDCServiceException.prototype);
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/models/errors.js
var AccessDeniedException, AuthorizationPendingException, ExpiredTokenException, InternalServerException, InvalidClientException, InvalidGrantException, InvalidRequestException, InvalidScopeException, SlowDownException, UnauthorizedClientException, UnsupportedGrantTypeException;
var init_errors = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/models/errors.js"() {
    init_SSOOIDCServiceException();
    AccessDeniedException = class _AccessDeniedException extends SSOOIDCServiceException {
      static {
        __name(this, "AccessDeniedException");
      }
      static shapeId = "com.amazonaws.ssooidc#AccessDeniedException";
      name = "AccessDeniedException";
      $fault = "client";
      error;
      reason;
      error_description;
      constructor(opts) {
        super({
          name: "AccessDeniedException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _AccessDeniedException.prototype);
        this.error = opts.error;
        this.reason = opts.reason;
        this.error_description = opts.error_description;
      }
    };
    AuthorizationPendingException = class _AuthorizationPendingException extends SSOOIDCServiceException {
      static {
        __name(this, "AuthorizationPendingException");
      }
      static shapeId = "com.amazonaws.ssooidc#AuthorizationPendingException";
      name = "AuthorizationPendingException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "AuthorizationPendingException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _AuthorizationPendingException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    ExpiredTokenException = class _ExpiredTokenException extends SSOOIDCServiceException {
      static {
        __name(this, "ExpiredTokenException");
      }
      static shapeId = "com.amazonaws.ssooidc#ExpiredTokenException";
      name = "ExpiredTokenException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "ExpiredTokenException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _ExpiredTokenException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    InternalServerException = class _InternalServerException extends SSOOIDCServiceException {
      static {
        __name(this, "InternalServerException");
      }
      static shapeId = "com.amazonaws.ssooidc#InternalServerException";
      name = "InternalServerException";
      $fault = "server";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "InternalServerException",
          $fault: "server",
          ...opts
        });
        Object.setPrototypeOf(this, _InternalServerException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    InvalidClientException = class _InvalidClientException extends SSOOIDCServiceException {
      static {
        __name(this, "InvalidClientException");
      }
      static shapeId = "com.amazonaws.ssooidc#InvalidClientException";
      name = "InvalidClientException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "InvalidClientException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _InvalidClientException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    InvalidGrantException = class _InvalidGrantException extends SSOOIDCServiceException {
      static {
        __name(this, "InvalidGrantException");
      }
      static shapeId = "com.amazonaws.ssooidc#InvalidGrantException";
      name = "InvalidGrantException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "InvalidGrantException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _InvalidGrantException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    InvalidRequestException = class _InvalidRequestException extends SSOOIDCServiceException {
      static {
        __name(this, "InvalidRequestException");
      }
      static shapeId = "com.amazonaws.ssooidc#InvalidRequestException";
      name = "InvalidRequestException";
      $fault = "client";
      error;
      reason;
      error_description;
      constructor(opts) {
        super({
          name: "InvalidRequestException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _InvalidRequestException.prototype);
        this.error = opts.error;
        this.reason = opts.reason;
        this.error_description = opts.error_description;
      }
    };
    InvalidScopeException = class _InvalidScopeException extends SSOOIDCServiceException {
      static {
        __name(this, "InvalidScopeException");
      }
      static shapeId = "com.amazonaws.ssooidc#InvalidScopeException";
      name = "InvalidScopeException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "InvalidScopeException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _InvalidScopeException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    SlowDownException = class _SlowDownException extends SSOOIDCServiceException {
      static {
        __name(this, "SlowDownException");
      }
      static shapeId = "com.amazonaws.ssooidc#SlowDownException";
      name = "SlowDownException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "SlowDownException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _SlowDownException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    UnauthorizedClientException = class _UnauthorizedClientException extends SSOOIDCServiceException {
      static {
        __name(this, "UnauthorizedClientException");
      }
      static shapeId = "com.amazonaws.ssooidc#UnauthorizedClientException";
      name = "UnauthorizedClientException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "UnauthorizedClientException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _UnauthorizedClientException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    UnsupportedGrantTypeException = class _UnsupportedGrantTypeException extends SSOOIDCServiceException {
      static {
        __name(this, "UnsupportedGrantTypeException");
      }
      static shapeId = "com.amazonaws.ssooidc#UnsupportedGrantTypeException";
      name = "UnsupportedGrantTypeException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "UnsupportedGrantTypeException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _UnsupportedGrantTypeException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/schemas/schemas_0.js
var _ADE, _APE, _AT, _CS, _CT, _CTR, _CTRr, _CV, _ETE, _ICE2, _IGE, _IRE, _ISE2, _ISEn, _IT, _RT, _SDE, _UCE, _UGTE, _aT, _c2, _cI, _cS, _cV, _co, _dC, _e2, _eI, _ed, _gT, _h, _hE2, _iT, _r2, _rT, _rU, _s2, _sc, _se2, _tT, n02, _s_registry2, SSOOIDCServiceException$, n0_registry2, AccessDeniedException$, AuthorizationPendingException$, ExpiredTokenException$, InternalServerException$, InvalidClientException$, InvalidGrantException$, InvalidRequestException$, InvalidScopeException$, SlowDownException$, UnauthorizedClientException$, UnsupportedGrantTypeException$, errorTypeRegistries2, AccessToken, ClientSecret, CodeVerifier, IdToken, RefreshToken, CreateTokenRequest$, CreateTokenResponse$, Scopes, CreateToken$;
var init_schemas_0 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/schemas/schemas_0.js"() {
    init_schema();
    init_errors();
    init_SSOOIDCServiceException();
    _ADE = "AccessDeniedException";
    _APE = "AuthorizationPendingException";
    _AT = "AccessToken";
    _CS = "ClientSecret";
    _CT = "CreateToken";
    _CTR = "CreateTokenRequest";
    _CTRr = "CreateTokenResponse";
    _CV = "CodeVerifier";
    _ETE = "ExpiredTokenException";
    _ICE2 = "InvalidClientException";
    _IGE = "InvalidGrantException";
    _IRE = "InvalidRequestException";
    _ISE2 = "InternalServerException";
    _ISEn = "InvalidScopeException";
    _IT = "IdToken";
    _RT = "RefreshToken";
    _SDE = "SlowDownException";
    _UCE = "UnauthorizedClientException";
    _UGTE = "UnsupportedGrantTypeException";
    _aT = "accessToken";
    _c2 = "client";
    _cI = "clientId";
    _cS = "clientSecret";
    _cV = "codeVerifier";
    _co = "code";
    _dC = "deviceCode";
    _e2 = "error";
    _eI = "expiresIn";
    _ed = "error_description";
    _gT = "grantType";
    _h = "http";
    _hE2 = "httpError";
    _iT = "idToken";
    _r2 = "reason";
    _rT = "refreshToken";
    _rU = "redirectUri";
    _s2 = "smithy.ts.sdk.synthetic.com.amazonaws.ssooidc";
    _sc = "scope";
    _se2 = "server";
    _tT = "tokenType";
    n02 = "com.amazonaws.ssooidc";
    _s_registry2 = new TypeRegistry(_s2);
    SSOOIDCServiceException$ = [-3, _s2, "SSOOIDCServiceException", 0, [], []];
    _s_registry2.registerError(SSOOIDCServiceException$, SSOOIDCServiceException);
    n0_registry2 = new TypeRegistry(n02);
    AccessDeniedException$ = [
      -3,
      n02,
      _ADE,
      { [_e2]: _c2, [_hE2]: 400 },
      [_e2, _r2, _ed],
      [0, 0, 0]
    ];
    n0_registry2.registerError(AccessDeniedException$, AccessDeniedException);
    AuthorizationPendingException$ = [
      -3,
      n02,
      _APE,
      { [_e2]: _c2, [_hE2]: 400 },
      [_e2, _ed],
      [0, 0]
    ];
    n0_registry2.registerError(AuthorizationPendingException$, AuthorizationPendingException);
    ExpiredTokenException$ = [
      -3,
      n02,
      _ETE,
      { [_e2]: _c2, [_hE2]: 400 },
      [_e2, _ed],
      [0, 0]
    ];
    n0_registry2.registerError(ExpiredTokenException$, ExpiredTokenException);
    InternalServerException$ = [
      -3,
      n02,
      _ISE2,
      { [_e2]: _se2, [_hE2]: 500 },
      [_e2, _ed],
      [0, 0]
    ];
    n0_registry2.registerError(InternalServerException$, InternalServerException);
    InvalidClientException$ = [
      -3,
      n02,
      _ICE2,
      { [_e2]: _c2, [_hE2]: 401 },
      [_e2, _ed],
      [0, 0]
    ];
    n0_registry2.registerError(InvalidClientException$, InvalidClientException);
    InvalidGrantException$ = [
      -3,
      n02,
      _IGE,
      { [_e2]: _c2, [_hE2]: 400 },
      [_e2, _ed],
      [0, 0]
    ];
    n0_registry2.registerError(InvalidGrantException$, InvalidGrantException);
    InvalidRequestException$ = [
      -3,
      n02,
      _IRE,
      { [_e2]: _c2, [_hE2]: 400 },
      [_e2, _r2, _ed],
      [0, 0, 0]
    ];
    n0_registry2.registerError(InvalidRequestException$, InvalidRequestException);
    InvalidScopeException$ = [
      -3,
      n02,
      _ISEn,
      { [_e2]: _c2, [_hE2]: 400 },
      [_e2, _ed],
      [0, 0]
    ];
    n0_registry2.registerError(InvalidScopeException$, InvalidScopeException);
    SlowDownException$ = [
      -3,
      n02,
      _SDE,
      { [_e2]: _c2, [_hE2]: 400 },
      [_e2, _ed],
      [0, 0]
    ];
    n0_registry2.registerError(SlowDownException$, SlowDownException);
    UnauthorizedClientException$ = [
      -3,
      n02,
      _UCE,
      { [_e2]: _c2, [_hE2]: 400 },
      [_e2, _ed],
      [0, 0]
    ];
    n0_registry2.registerError(UnauthorizedClientException$, UnauthorizedClientException);
    UnsupportedGrantTypeException$ = [
      -3,
      n02,
      _UGTE,
      { [_e2]: _c2, [_hE2]: 400 },
      [_e2, _ed],
      [0, 0]
    ];
    n0_registry2.registerError(UnsupportedGrantTypeException$, UnsupportedGrantTypeException);
    errorTypeRegistries2 = [
      _s_registry2,
      n0_registry2
    ];
    AccessToken = [0, n02, _AT, 8, 0];
    ClientSecret = [0, n02, _CS, 8, 0];
    CodeVerifier = [0, n02, _CV, 8, 0];
    IdToken = [0, n02, _IT, 8, 0];
    RefreshToken = [0, n02, _RT, 8, 0];
    CreateTokenRequest$ = [
      3,
      n02,
      _CTR,
      0,
      [_cI, _cS, _gT, _dC, _co, _rT, _sc, _rU, _cV],
      [0, [() => ClientSecret, 0], 0, 0, 0, [() => RefreshToken, 0], 64 | 0, 0, [() => CodeVerifier, 0]],
      3
    ];
    CreateTokenResponse$ = [
      3,
      n02,
      _CTRr,
      0,
      [_aT, _tT, _eI, _rT, _iT],
      [[() => AccessToken, 0], 0, 1, [() => RefreshToken, 0], [() => IdToken, 0]]
    ];
    Scopes = 64 | 0;
    CreateToken$ = [
      9,
      n02,
      _CT,
      { [_h]: ["POST", "/token", 200] },
      () => CreateTokenRequest$,
      () => CreateTokenResponse$
    ];
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/runtimeConfig.shared.js
var getRuntimeConfig;
var init_runtimeConfig_shared = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/runtimeConfig.shared.js"() {
    init_httpAuthSchemes2();
    init_protocols2();
    init_dist_es2();
    init_checksum3();
    init_client2();
    init_protocols();
    init_serde();
    init_httpAuthSchemeProvider();
    init_endpointResolver();
    init_schemas_0();
    getRuntimeConfig = /* @__PURE__ */ __name((config) => {
      return {
        apiVersion: "2019-06-10",
        base64Decoder: config?.base64Decoder ?? fromBase64,
        base64Encoder: config?.base64Encoder ?? toBase64,
        disableHostPrefix: config?.disableHostPrefix ?? false,
        endpointProvider: config?.endpointProvider ?? defaultEndpointResolver,
        extensions: config?.extensions ?? [],
        httpAuthSchemeProvider: config?.httpAuthSchemeProvider ?? defaultSSOOIDCHttpAuthSchemeProvider,
        httpAuthSchemes: config?.httpAuthSchemes ?? [
          {
            schemeId: "aws.auth#sigv4",
            identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("aws.auth#sigv4"), "identityProvider"),
            signer: new AwsSdkSigV4Signer()
          },
          {
            schemeId: "smithy.api#noAuth",
            identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("smithy.api#noAuth") || (async () => ({})), "identityProvider"),
            signer: new NoAuthSigner()
          }
        ],
        logger: config?.logger ?? new NoOpLogger(),
        protocol: config?.protocol ?? AwsRestJsonProtocol,
        protocolSettings: config?.protocolSettings ?? {
          defaultNamespace: "com.amazonaws.ssooidc",
          errorTypeRegistries: errorTypeRegistries2,
          version: "2019-06-10",
          serviceTarget: "AWSSSOOIDCService"
        },
        serviceId: config?.serviceId ?? "SSO OIDC",
        sha256: config?.sha256 ?? Sha256Node,
        urlParser: config?.urlParser ?? parseUrl,
        utf8Decoder: config?.utf8Decoder ?? fromUtf8,
        utf8Encoder: config?.utf8Encoder ?? toUtf8
      };
    }, "getRuntimeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/runtimeConfig.js
var getRuntimeConfig2;
var init_runtimeConfig = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/runtimeConfig.js"() {
    init_package();
    init_client3();
    init_httpAuthSchemes2();
    init_client2();
    init_config2();
    init_retry2();
    init_serde();
    init_dist_es6();
    init_runtimeConfig_shared();
    getRuntimeConfig2 = /* @__PURE__ */ __name((config) => {
      emitWarningIfUnsupportedVersion(process.version);
      const defaultsMode = resolveDefaultsModeConfig(config);
      const defaultConfigProvider = /* @__PURE__ */ __name(() => defaultsMode().then(loadConfigsForDefaultMode), "defaultConfigProvider");
      const clientSharedValues = getRuntimeConfig(config);
      emitWarningIfUnsupportedVersion2(process.version);
      const loaderConfig = {
        profile: config?.profile,
        logger: clientSharedValues.logger
      };
      return {
        ...clientSharedValues,
        ...config,
        runtime: "node",
        defaultsMode,
        authSchemePreference: config?.authSchemePreference ?? loadConfig(NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, loaderConfig),
        bodyLengthChecker: config?.bodyLengthChecker ?? calculateBodyLength,
        defaultUserAgentProvider: config?.defaultUserAgentProvider ?? createDefaultUserAgentProvider({ serviceId: clientSharedValues.serviceId, clientVersion: package_default2.version }),
        maxAttempts: config?.maxAttempts ?? loadConfig(NODE_MAX_ATTEMPT_CONFIG_OPTIONS, config),
        region: config?.region ?? loadConfig(NODE_REGION_CONFIG_OPTIONS, { ...NODE_REGION_CONFIG_FILE_OPTIONS, ...loaderConfig }),
        requestHandler: NodeHttpHandler.create(config?.requestHandler ?? defaultConfigProvider),
        retryMode: config?.retryMode ?? loadConfig({
          ...NODE_RETRY_MODE_CONFIG_OPTIONS,
          default: /* @__PURE__ */ __name(async () => (await defaultConfigProvider()).retryMode || DEFAULT_RETRY_MODE, "default")
        }, config),
        streamCollector: config?.streamCollector ?? streamCollector2,
        useDualstackEndpoint: config?.useDualstackEndpoint ?? loadConfig(NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
        useFipsEndpoint: config?.useFipsEndpoint ?? loadConfig(NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
        userAgentAppId: config?.userAgentAppId ?? loadConfig(NODE_APP_ID_CONFIG_OPTIONS, loaderConfig)
      };
    }, "getRuntimeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/auth/httpAuthExtensionConfiguration.js
var getHttpAuthExtensionConfiguration, resolveHttpAuthRuntimeConfig;
var init_httpAuthExtensionConfiguration = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/auth/httpAuthExtensionConfiguration.js"() {
    getHttpAuthExtensionConfiguration = /* @__PURE__ */ __name((runtimeConfig) => {
      const _httpAuthSchemes = runtimeConfig.httpAuthSchemes;
      let _httpAuthSchemeProvider = runtimeConfig.httpAuthSchemeProvider;
      let _credentials = runtimeConfig.credentials;
      return {
        setHttpAuthScheme(httpAuthScheme) {
          const index = _httpAuthSchemes.findIndex((scheme) => scheme.schemeId === httpAuthScheme.schemeId);
          if (index === -1) {
            _httpAuthSchemes.push(httpAuthScheme);
          } else {
            _httpAuthSchemes.splice(index, 1, httpAuthScheme);
          }
        },
        httpAuthSchemes() {
          return _httpAuthSchemes;
        },
        setHttpAuthSchemeProvider(httpAuthSchemeProvider) {
          _httpAuthSchemeProvider = httpAuthSchemeProvider;
        },
        httpAuthSchemeProvider() {
          return _httpAuthSchemeProvider;
        },
        setCredentials(credentials) {
          _credentials = credentials;
        },
        credentials() {
          return _credentials;
        }
      };
    }, "getHttpAuthExtensionConfiguration");
    resolveHttpAuthRuntimeConfig = /* @__PURE__ */ __name((config) => {
      return {
        httpAuthSchemes: config.httpAuthSchemes(),
        httpAuthSchemeProvider: config.httpAuthSchemeProvider(),
        credentials: config.credentials()
      };
    }, "resolveHttpAuthRuntimeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/runtimeExtensions.js
var resolveRuntimeExtensions;
var init_runtimeExtensions = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/runtimeExtensions.js"() {
    init_client3();
    init_client2();
    init_protocols();
    init_httpAuthExtensionConfiguration();
    resolveRuntimeExtensions = /* @__PURE__ */ __name((runtimeConfig, extensions) => {
      const extensionConfiguration = Object.assign(getAwsRegionExtensionConfiguration(runtimeConfig), getDefaultExtensionConfiguration(runtimeConfig), getHttpHandlerExtensionConfiguration(runtimeConfig), getHttpAuthExtensionConfiguration(runtimeConfig));
      extensions.forEach((extension) => extension.configure(extensionConfiguration));
      return Object.assign(runtimeConfig, resolveAwsRegionExtensionConfiguration(extensionConfiguration), resolveDefaultRuntimeConfig2(extensionConfiguration), resolveHttpHandlerRuntimeConfig(extensionConfiguration), resolveHttpAuthRuntimeConfig(extensionConfiguration));
    }, "resolveRuntimeExtensions");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/SSOOIDCClient.js
var SSOOIDCClient;
var init_SSOOIDCClient = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/SSOOIDCClient.js"() {
    init_client3();
    init_dist_es2();
    init_client2();
    init_config2();
    init_endpoints();
    init_protocols();
    init_retry2();
    init_schema();
    init_httpAuthSchemeProvider();
    init_EndpointParameters();
    init_runtimeConfig();
    init_runtimeExtensions();
    SSOOIDCClient = class extends Client {
      static {
        __name(this, "SSOOIDCClient");
      }
      config;
      constructor(...[configuration]) {
        const _config_0 = getRuntimeConfig2(configuration || {});
        super(_config_0);
        this.initConfig = _config_0;
        const _config_1 = resolveClientEndpointParameters2(_config_0);
        const _config_2 = resolveUserAgentConfig(_config_1);
        const _config_3 = resolveRetryConfig(_config_2);
        const _config_4 = resolveRegionConfig(_config_3);
        const _config_5 = resolveHostHeaderConfig(_config_4);
        const _config_6 = resolveEndpointConfig(_config_5);
        const _config_7 = resolveHttpAuthSchemeConfig2(_config_6);
        const _config_8 = resolveRuntimeExtensions(_config_7, configuration?.extensions || []);
        this.config = _config_8;
        this.middlewareStack.use(getSchemaSerdePlugin(this.config));
        this.middlewareStack.use(getUserAgentPlugin(this.config));
        this.middlewareStack.use(getRetryPlugin(this.config));
        this.middlewareStack.use(getContentLengthPlugin(this.config));
        this.middlewareStack.use(getHostHeaderPlugin(this.config));
        this.middlewareStack.use(getLoggerPlugin(this.config));
        this.middlewareStack.use(getRecursionDetectionPlugin(this.config));
        this.middlewareStack.use(getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
          httpAuthSchemeParametersProvider: defaultSSOOIDCHttpAuthSchemeParametersProvider,
          identityProviderConfigProvider: /* @__PURE__ */ __name(async (config) => new DefaultIdentityProviderConfig({
            "aws.auth#sigv4": config.credentials
          }), "identityProviderConfigProvider")
        }));
        this.middlewareStack.use(getHttpSigningPlugin(this.config));
      }
      destroy() {
        super.destroy();
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/commandBuilder.js
var command2, _ep02, _mw02;
var init_commandBuilder = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/commandBuilder.js"() {
    init_client2();
    init_endpoints();
    init_EndpointParameters();
    command2 = makeBuilder(commonParams2, "AWSSSOOIDCService", "SSOOIDCClient", getEndpointPlugin);
    _ep02 = {};
    _mw02 = /* @__PURE__ */ __name((Command2, cs, config, o4) => [], "_mw0");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/commands/CreateTokenCommand.js
var CreateTokenCommand;
var init_CreateTokenCommand = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/commands/CreateTokenCommand.js"() {
    init_commandBuilder();
    init_schemas_0();
    CreateTokenCommand = class extends command2(_ep02, _mw02, "CreateToken", CreateToken$) {
      static {
        __name(this, "CreateTokenCommand");
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/SSOOIDC.js
var commands, SSOOIDC;
var init_SSOOIDC = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/SSOOIDC.js"() {
    init_client2();
    init_CreateTokenCommand();
    init_SSOOIDCClient();
    commands = {
      CreateTokenCommand
    };
    SSOOIDC = class extends SSOOIDCClient {
      static {
        __name(this, "SSOOIDC");
      }
    };
    createAggregatedClient(commands, SSOOIDC);
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/commands/index.js
var init_commands = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/commands/index.js"() {
    init_CreateTokenCommand();
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/models/enums.js
var AccessDeniedExceptionReason, InvalidRequestExceptionReason;
var init_enums = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/models/enums.js"() {
    AccessDeniedExceptionReason = {
      KMS_ACCESS_DENIED: "KMS_AccessDeniedException"
    };
    InvalidRequestExceptionReason = {
      KMS_DISABLED_KEY: "KMS_DisabledException",
      KMS_INVALID_KEY_USAGE: "KMS_InvalidKeyUsageException",
      KMS_INVALID_STATE: "KMS_InvalidStateException",
      KMS_KEY_NOT_FOUND: "KMS_NotFoundException"
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/models/models_0.js
var init_models_0 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/models/models_0.js"() {
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/index.js
var sso_oidc_exports = {};
__export(sso_oidc_exports, {
  $Command: () => Command,
  AccessDeniedException: () => AccessDeniedException,
  AccessDeniedException$: () => AccessDeniedException$,
  AccessDeniedExceptionReason: () => AccessDeniedExceptionReason,
  AuthorizationPendingException: () => AuthorizationPendingException,
  AuthorizationPendingException$: () => AuthorizationPendingException$,
  CreateToken$: () => CreateToken$,
  CreateTokenCommand: () => CreateTokenCommand,
  CreateTokenRequest$: () => CreateTokenRequest$,
  CreateTokenResponse$: () => CreateTokenResponse$,
  ExpiredTokenException: () => ExpiredTokenException,
  ExpiredTokenException$: () => ExpiredTokenException$,
  InternalServerException: () => InternalServerException,
  InternalServerException$: () => InternalServerException$,
  InvalidClientException: () => InvalidClientException,
  InvalidClientException$: () => InvalidClientException$,
  InvalidGrantException: () => InvalidGrantException,
  InvalidGrantException$: () => InvalidGrantException$,
  InvalidRequestException: () => InvalidRequestException,
  InvalidRequestException$: () => InvalidRequestException$,
  InvalidRequestExceptionReason: () => InvalidRequestExceptionReason,
  InvalidScopeException: () => InvalidScopeException,
  InvalidScopeException$: () => InvalidScopeException$,
  SSOOIDC: () => SSOOIDC,
  SSOOIDCClient: () => SSOOIDCClient,
  SSOOIDCServiceException: () => SSOOIDCServiceException,
  SSOOIDCServiceException$: () => SSOOIDCServiceException$,
  SlowDownException: () => SlowDownException,
  SlowDownException$: () => SlowDownException$,
  UnauthorizedClientException: () => UnauthorizedClientException,
  UnauthorizedClientException$: () => UnauthorizedClientException$,
  UnsupportedGrantTypeException: () => UnsupportedGrantTypeException,
  UnsupportedGrantTypeException$: () => UnsupportedGrantTypeException$,
  __Client: () => Client,
  errorTypeRegistries: () => errorTypeRegistries2
});
var init_sso_oidc = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/index.js"() {
    init_SSOOIDCClient();
    init_SSOOIDC();
    init_commands();
    init_client2();
    init_schemas_0();
    init_enums();
    init_errors();
    init_models_0();
    init_SSOOIDCServiceException();
  }
});

// node_modules/@aws-sdk/credential-provider-sso/node_modules/@aws-sdk/token-providers/dist-es/getSsoOidcClient.js
var getSsoOidcClient;
var init_getSsoOidcClient = __esm({
  "node_modules/@aws-sdk/credential-provider-sso/node_modules/@aws-sdk/token-providers/dist-es/getSsoOidcClient.js"() {
    getSsoOidcClient = /* @__PURE__ */ __name(async (ssoRegion, init = {}, callerClientConfig) => {
      const { SSOOIDCClient: SSOOIDCClient2 } = await Promise.resolve().then(() => (init_sso_oidc(), sso_oidc_exports));
      const coalesce2 = /* @__PURE__ */ __name((prop) => init.clientConfig?.[prop] ?? init.parentClientConfig?.[prop] ?? callerClientConfig?.[prop], "coalesce");
      const ssoOidcClient = new SSOOIDCClient2(Object.assign({}, init.clientConfig ?? {}, {
        region: ssoRegion ?? init.clientConfig?.region,
        logger: coalesce2("logger"),
        userAgentAppId: coalesce2("userAgentAppId")
      }));
      return ssoOidcClient;
    }, "getSsoOidcClient");
  }
});

// node_modules/@aws-sdk/credential-provider-sso/node_modules/@aws-sdk/token-providers/dist-es/getNewSsoOidcToken.js
var getNewSsoOidcToken;
var init_getNewSsoOidcToken = __esm({
  "node_modules/@aws-sdk/credential-provider-sso/node_modules/@aws-sdk/token-providers/dist-es/getNewSsoOidcToken.js"() {
    init_getSsoOidcClient();
    getNewSsoOidcToken = /* @__PURE__ */ __name(async (ssoToken, ssoRegion, init = {}, callerClientConfig) => {
      const { CreateTokenCommand: CreateTokenCommand2 } = await Promise.resolve().then(() => (init_sso_oidc(), sso_oidc_exports));
      const ssoOidcClient = await getSsoOidcClient(ssoRegion, init, callerClientConfig);
      return ssoOidcClient.send(new CreateTokenCommand2({
        clientId: ssoToken.clientId,
        clientSecret: ssoToken.clientSecret,
        refreshToken: ssoToken.refreshToken,
        grantType: "refresh_token"
      }));
    }, "getNewSsoOidcToken");
  }
});

// node_modules/@aws-sdk/credential-provider-sso/node_modules/@aws-sdk/token-providers/dist-es/validateTokenExpiry.js
var validateTokenExpiry;
var init_validateTokenExpiry = __esm({
  "node_modules/@aws-sdk/credential-provider-sso/node_modules/@aws-sdk/token-providers/dist-es/validateTokenExpiry.js"() {
    init_config2();
    init_constants8();
    validateTokenExpiry = /* @__PURE__ */ __name((token) => {
      if (token.expiration && token.expiration.getTime() < Date.now()) {
        throw new TokenProviderError(`Token is expired. ${REFRESH_MESSAGE}`, false);
      }
    }, "validateTokenExpiry");
  }
});

// node_modules/@aws-sdk/credential-provider-sso/node_modules/@aws-sdk/token-providers/dist-es/validateTokenKey.js
var validateTokenKey;
var init_validateTokenKey = __esm({
  "node_modules/@aws-sdk/credential-provider-sso/node_modules/@aws-sdk/token-providers/dist-es/validateTokenKey.js"() {
    init_config2();
    init_constants8();
    validateTokenKey = /* @__PURE__ */ __name((key, value, forRefresh = false) => {
      if (typeof value === "undefined") {
        throw new TokenProviderError(`Value not present for '${key}' in SSO Token${forRefresh ? ". Cannot refresh" : ""}. ${REFRESH_MESSAGE}`, false);
      }
    }, "validateTokenKey");
  }
});

// node_modules/@aws-sdk/credential-provider-sso/node_modules/@aws-sdk/token-providers/dist-es/writeSSOTokenToFile.js
import { promises as fsPromises } from "node:fs";
var writeFile, writeSSOTokenToFile;
var init_writeSSOTokenToFile = __esm({
  "node_modules/@aws-sdk/credential-provider-sso/node_modules/@aws-sdk/token-providers/dist-es/writeSSOTokenToFile.js"() {
    init_config2();
    ({ writeFile } = fsPromises);
    writeSSOTokenToFile = /* @__PURE__ */ __name((id, ssoToken) => {
      const tokenFilepath = getSSOTokenFilepath(id);
      const tokenString = JSON.stringify(ssoToken, null, 2);
      return writeFile(tokenFilepath, tokenString);
    }, "writeSSOTokenToFile");
  }
});

// node_modules/@aws-sdk/credential-provider-sso/node_modules/@aws-sdk/token-providers/dist-es/fromSso.js
var lastRefreshAttemptTimes, inFlightRefreshes, fromSso;
var init_fromSso = __esm({
  "node_modules/@aws-sdk/credential-provider-sso/node_modules/@aws-sdk/token-providers/dist-es/fromSso.js"() {
    init_config2();
    init_constants8();
    init_getNewSsoOidcToken();
    init_validateTokenExpiry();
    init_validateTokenKey();
    init_writeSSOTokenToFile();
    lastRefreshAttemptTimes = /* @__PURE__ */ new Map();
    inFlightRefreshes = /* @__PURE__ */ new Map();
    fromSso = /* @__PURE__ */ __name((init = {}) => async ({ callerClientConfig } = {}) => {
      init.logger?.debug("@aws-sdk/token-providers - fromSso");
      const profiles = await parseKnownFiles(init);
      const profileName = getProfileName({
        profile: init.profile ?? callerClientConfig?.profile
      });
      const profile = profiles[profileName];
      if (!profile) {
        throw new TokenProviderError(`Profile '${profileName}' could not be found in shared credentials file.`, false);
      } else if (!profile["sso_session"]) {
        throw new TokenProviderError(`Profile '${profileName}' is missing required property 'sso_session'.`);
      }
      const ssoSessionName = profile["sso_session"];
      const inFlightRefresh = inFlightRefreshes.get(ssoSessionName);
      if (inFlightRefresh) {
        return await inFlightRefresh;
      }
      const ssoSessions = await loadSsoSessionData(init);
      const ssoSession = ssoSessions[ssoSessionName];
      if (!ssoSession) {
        throw new TokenProviderError(`Sso session '${ssoSessionName}' could not be found in shared credentials file.`, false);
      }
      for (const ssoSessionRequiredKey of ["sso_start_url", "sso_region"]) {
        if (!ssoSession[ssoSessionRequiredKey]) {
          throw new TokenProviderError(`Sso session '${ssoSessionName}' is missing required property '${ssoSessionRequiredKey}'.`, false);
        }
      }
      const ssoStartUrl = ssoSession["sso_start_url"];
      const ssoRegion = ssoSession["sso_region"];
      let ssoToken;
      try {
        ssoToken = await getSSOTokenFromFile(ssoSessionName);
      } catch (e6) {
        throw new TokenProviderError(`The SSO session token associated with profile=${profileName} was not found or is invalid. ${REFRESH_MESSAGE}`, false);
      }
      validateTokenKey("accessToken", ssoToken.accessToken);
      validateTokenKey("expiresAt", ssoToken.expiresAt);
      const { accessToken, expiresAt } = ssoToken;
      const existingToken = {
        token: accessToken,
        expiration: new Date(expiresAt)
      };
      if (existingToken.expiration.getTime() - Date.now() > EXPIRE_WINDOW_MS) {
        return existingToken;
      }
      const inFlightRefreshAfterReadingToken = inFlightRefreshes.get(ssoSessionName);
      if (inFlightRefreshAfterReadingToken) {
        return await inFlightRefreshAfterReadingToken;
      }
      const lastRefreshAttemptTime = lastRefreshAttemptTimes.get(ssoSessionName) ?? 0;
      if (Date.now() - lastRefreshAttemptTime < 30 * 1e3) {
        validateTokenExpiry(existingToken);
        return existingToken;
      }
      validateTokenKey("clientId", ssoToken.clientId, true);
      validateTokenKey("clientSecret", ssoToken.clientSecret, true);
      validateTokenKey("refreshToken", ssoToken.refreshToken, true);
      const refresh = (async () => {
        try {
          lastRefreshAttemptTimes.set(ssoSessionName, Date.now());
          const newSsoOidcToken = await getNewSsoOidcToken(ssoToken, ssoRegion, init, callerClientConfig);
          validateTokenKey("accessToken", newSsoOidcToken.accessToken);
          validateTokenKey("expiresIn", newSsoOidcToken.expiresIn);
          const newTokenExpiration = new Date(Date.now() + newSsoOidcToken.expiresIn * 1e3);
          try {
            await writeSSOTokenToFile(ssoSessionName, {
              ...ssoToken,
              accessToken: newSsoOidcToken.accessToken,
              expiresAt: newTokenExpiration.toISOString(),
              refreshToken: newSsoOidcToken.refreshToken
            });
          } catch (error) {
          }
          return {
            token: newSsoOidcToken.accessToken,
            expiration: newTokenExpiration
          };
        } catch (error) {
          validateTokenExpiry(existingToken);
          return existingToken;
        }
      })();
      inFlightRefreshes.set(ssoSessionName, refresh);
      try {
        return await refresh;
      } finally {
        inFlightRefreshes.delete(ssoSessionName);
      }
    }, "fromSso");
  }
});

// node_modules/@aws-sdk/credential-provider-sso/node_modules/@aws-sdk/token-providers/dist-es/index.js
var init_dist_es9 = __esm({
  "node_modules/@aws-sdk/credential-provider-sso/node_modules/@aws-sdk/token-providers/dist-es/index.js"() {
    init_fromSso();
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/auth/httpAuthSchemeProvider.js
function createAwsAuthSigv4HttpAuthOption3(authParameters) {
  return {
    schemeId: "aws.auth#sigv4",
    signingProperties: {
      name: "awsssoportal",
      region: authParameters.region
    },
    propertiesExtractor: /* @__PURE__ */ __name((config, context) => ({
      signingProperties: {
        config,
        context
      }
    }), "propertiesExtractor")
  };
}
function createSmithyApiNoAuthHttpAuthOption2(authParameters) {
  return {
    schemeId: "smithy.api#noAuth"
  };
}
var defaultSSOHttpAuthSchemeParametersProvider, defaultSSOHttpAuthSchemeProvider, resolveHttpAuthSchemeConfig3;
var init_httpAuthSchemeProvider2 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/auth/httpAuthSchemeProvider.js"() {
    init_httpAuthSchemes2();
    init_client2();
    defaultSSOHttpAuthSchemeParametersProvider = /* @__PURE__ */ __name(async (config, context, input) => {
      return {
        operation: getSmithyContext(context).operation,
        region: await normalizeProvider(config.region)() || (() => {
          throw new Error("expected `region` to be configured for `aws.auth#sigv4`");
        })()
      };
    }, "defaultSSOHttpAuthSchemeParametersProvider");
    __name(createAwsAuthSigv4HttpAuthOption3, "createAwsAuthSigv4HttpAuthOption");
    __name(createSmithyApiNoAuthHttpAuthOption2, "createSmithyApiNoAuthHttpAuthOption");
    defaultSSOHttpAuthSchemeProvider = /* @__PURE__ */ __name((authParameters) => {
      const options = [];
      switch (authParameters.operation) {
        case "GetRoleCredentials":
          {
            options.push(createSmithyApiNoAuthHttpAuthOption2(authParameters));
            break;
          }
          ;
        default: {
          options.push(createAwsAuthSigv4HttpAuthOption3(authParameters));
        }
      }
      return options;
    }, "defaultSSOHttpAuthSchemeProvider");
    resolveHttpAuthSchemeConfig3 = /* @__PURE__ */ __name((config) => {
      const config_0 = resolveAwsSdkSigV4Config(config);
      return Object.assign(config_0, {
        authSchemePreference: normalizeProvider(config.authSchemePreference ?? [])
      });
    }, "resolveHttpAuthSchemeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/endpoint/EndpointParameters.js
var resolveClientEndpointParameters3, commonParams3;
var init_EndpointParameters2 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/endpoint/EndpointParameters.js"() {
    resolveClientEndpointParameters3 = /* @__PURE__ */ __name((options) => {
      return Object.assign(options, {
        useDualstackEndpoint: options.useDualstackEndpoint ?? false,
        useFipsEndpoint: options.useFipsEndpoint ?? false,
        defaultSigningName: "awsssoportal"
      });
    }, "resolveClientEndpointParameters");
    commonParams3 = {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/endpoint/bdd.js
var k2, a2, b2, c2, d2, e2, f2, g2, h2, i2, j2, _data2, root2, r2, nodes2, bdd2;
var init_bdd2 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/endpoint/bdd.js"() {
    init_endpoints();
    k2 = "ref";
    a2 = -1;
    b2 = true;
    c2 = "isSet";
    d2 = "PartitionResult";
    e2 = "booleanEquals";
    f2 = "getAttr";
    g2 = { [k2]: "Endpoint" };
    h2 = { [k2]: d2 };
    i2 = {};
    j2 = [{ [k2]: "Region" }];
    _data2 = {
      conditions: [
        [c2, [g2]],
        [c2, j2],
        ["aws.partition", j2, d2],
        [e2, [{ [k2]: "UseFIPS" }, b2]],
        [e2, [{ [k2]: "UseDualStack" }, b2]],
        [e2, [{ fn: f2, argv: [h2, "supportsDualStack"] }, b2]],
        [e2, [{ fn: f2, argv: [h2, "supportsFIPS"] }, b2]],
        ["stringEquals", [{ fn: f2, argv: [h2, "name"] }, "aws-us-gov"]]
      ],
      results: [
        [a2],
        [a2, "Invalid Configuration: FIPS and custom endpoint are not supported"],
        [a2, "Invalid Configuration: Dualstack and custom endpoint are not supported"],
        [g2, i2],
        ["https://portal.sso-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", i2],
        [a2, "FIPS and DualStack are enabled, but this partition does not support one or both"],
        ["https://portal.sso.{Region}.amazonaws.com", i2],
        ["https://portal.sso-fips.{Region}.{PartitionResult#dnsSuffix}", i2],
        [a2, "FIPS is enabled but this partition does not support FIPS"],
        ["https://portal.sso.{Region}.{PartitionResult#dualStackDnsSuffix}", i2],
        [a2, "DualStack is enabled but this partition does not support DualStack"],
        ["https://portal.sso.{Region}.{PartitionResult#dnsSuffix}", i2],
        [a2, "Invalid Configuration: Missing Region"]
      ]
    };
    root2 = 2;
    r2 = 1e8;
    nodes2 = new Int32Array([
      -1,
      1,
      -1,
      0,
      13,
      3,
      1,
      4,
      r2 + 12,
      2,
      5,
      r2 + 12,
      3,
      8,
      6,
      4,
      7,
      r2 + 11,
      5,
      r2 + 9,
      r2 + 10,
      4,
      11,
      9,
      6,
      10,
      r2 + 8,
      7,
      r2 + 6,
      r2 + 7,
      5,
      12,
      r2 + 5,
      6,
      r2 + 4,
      r2 + 5,
      3,
      r2 + 1,
      14,
      4,
      r2 + 2,
      r2 + 3
    ]);
    bdd2 = BinaryDecisionDiagram.from(nodes2, root2, _data2.conditions, _data2.results);
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/endpoint/endpointResolver.js
var cache2, defaultEndpointResolver2;
var init_endpointResolver2 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/endpoint/endpointResolver.js"() {
    init_client3();
    init_endpoints();
    init_bdd2();
    cache2 = new EndpointCache({
      size: 50,
      params: ["Endpoint", "Region", "UseDualStack", "UseFIPS"]
    });
    defaultEndpointResolver2 = /* @__PURE__ */ __name((endpointParams, context = {}) => {
      return cache2.get(endpointParams, () => decideEndpoint(bdd2, {
        endpointParams,
        logger: context.logger
      }));
    }, "defaultEndpointResolver");
    customEndpointFunctions.aws = awsEndpointFunctions;
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/models/SSOServiceException.js
var SSOServiceException;
var init_SSOServiceException = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/models/SSOServiceException.js"() {
    init_client2();
    SSOServiceException = class _SSOServiceException extends ServiceException {
      static {
        __name(this, "SSOServiceException");
      }
      static shapeId = "smithy.ts.sdk.synthetic.com.amazonaws.sso#SSOServiceException";
      constructor(options) {
        super(options);
        Object.setPrototypeOf(this, _SSOServiceException.prototype);
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/models/errors.js
var InvalidRequestException2, ResourceNotFoundException2, TooManyRequestsException, UnauthorizedException;
var init_errors2 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/models/errors.js"() {
    init_SSOServiceException();
    InvalidRequestException2 = class _InvalidRequestException extends SSOServiceException {
      static {
        __name(this, "InvalidRequestException");
      }
      static shapeId = "com.amazonaws.sso#InvalidRequestException";
      name = "InvalidRequestException";
      $fault = "client";
      constructor(opts) {
        super({
          name: "InvalidRequestException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _InvalidRequestException.prototype);
      }
    };
    ResourceNotFoundException2 = class _ResourceNotFoundException extends SSOServiceException {
      static {
        __name(this, "ResourceNotFoundException");
      }
      static shapeId = "com.amazonaws.sso#ResourceNotFoundException";
      name = "ResourceNotFoundException";
      $fault = "client";
      constructor(opts) {
        super({
          name: "ResourceNotFoundException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _ResourceNotFoundException.prototype);
      }
    };
    TooManyRequestsException = class _TooManyRequestsException extends SSOServiceException {
      static {
        __name(this, "TooManyRequestsException");
      }
      static shapeId = "com.amazonaws.sso#TooManyRequestsException";
      name = "TooManyRequestsException";
      $fault = "client";
      constructor(opts) {
        super({
          name: "TooManyRequestsException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _TooManyRequestsException.prototype);
      }
    };
    UnauthorizedException = class _UnauthorizedException extends SSOServiceException {
      static {
        __name(this, "UnauthorizedException");
      }
      static shapeId = "com.amazonaws.sso#UnauthorizedException";
      name = "UnauthorizedException";
      $fault = "client";
      constructor(opts) {
        super({
          name: "UnauthorizedException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _UnauthorizedException.prototype);
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/schemas/schemas_0.js
var _ATT, _GRC, _GRCR, _GRCRe, _IRE2, _RC, _RNFE2, _SAKT, _STT, _TMRE, _UE2, _aI, _aKI, _aT2, _ai, _c3, _e3, _ex, _h2, _hE3, _hH2, _hQ, _m2, _rC, _rN, _rn, _s3, _sAK, _sT, _xasbt, n03, _s_registry3, SSOServiceException$, n0_registry3, InvalidRequestException$2, ResourceNotFoundException$2, TooManyRequestsException$, UnauthorizedException$, errorTypeRegistries3, AccessTokenType, SecretAccessKeyType, SessionTokenType, GetRoleCredentialsRequest$, GetRoleCredentialsResponse$, RoleCredentials$, GetRoleCredentials$;
var init_schemas_02 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/schemas/schemas_0.js"() {
    init_schema();
    init_errors2();
    init_SSOServiceException();
    _ATT = "AccessTokenType";
    _GRC = "GetRoleCredentials";
    _GRCR = "GetRoleCredentialsRequest";
    _GRCRe = "GetRoleCredentialsResponse";
    _IRE2 = "InvalidRequestException";
    _RC = "RoleCredentials";
    _RNFE2 = "ResourceNotFoundException";
    _SAKT = "SecretAccessKeyType";
    _STT = "SessionTokenType";
    _TMRE = "TooManyRequestsException";
    _UE2 = "UnauthorizedException";
    _aI = "accountId";
    _aKI = "accessKeyId";
    _aT2 = "accessToken";
    _ai = "account_id";
    _c3 = "client";
    _e3 = "error";
    _ex = "expiration";
    _h2 = "http";
    _hE3 = "httpError";
    _hH2 = "httpHeader";
    _hQ = "httpQuery";
    _m2 = "message";
    _rC = "roleCredentials";
    _rN = "roleName";
    _rn = "role_name";
    _s3 = "smithy.ts.sdk.synthetic.com.amazonaws.sso";
    _sAK = "secretAccessKey";
    _sT = "sessionToken";
    _xasbt = "x-amz-sso_bearer_token";
    n03 = "com.amazonaws.sso";
    _s_registry3 = new TypeRegistry(_s3);
    SSOServiceException$ = [-3, _s3, "SSOServiceException", 0, [], []];
    _s_registry3.registerError(SSOServiceException$, SSOServiceException);
    n0_registry3 = new TypeRegistry(n03);
    InvalidRequestException$2 = [
      -3,
      n03,
      _IRE2,
      { [_e3]: _c3, [_hE3]: 400 },
      [_m2],
      [0]
    ];
    n0_registry3.registerError(InvalidRequestException$2, InvalidRequestException2);
    ResourceNotFoundException$2 = [
      -3,
      n03,
      _RNFE2,
      { [_e3]: _c3, [_hE3]: 404 },
      [_m2],
      [0]
    ];
    n0_registry3.registerError(ResourceNotFoundException$2, ResourceNotFoundException2);
    TooManyRequestsException$ = [
      -3,
      n03,
      _TMRE,
      { [_e3]: _c3, [_hE3]: 429 },
      [_m2],
      [0]
    ];
    n0_registry3.registerError(TooManyRequestsException$, TooManyRequestsException);
    UnauthorizedException$ = [
      -3,
      n03,
      _UE2,
      { [_e3]: _c3, [_hE3]: 401 },
      [_m2],
      [0]
    ];
    n0_registry3.registerError(UnauthorizedException$, UnauthorizedException);
    errorTypeRegistries3 = [
      _s_registry3,
      n0_registry3
    ];
    AccessTokenType = [0, n03, _ATT, 8, 0];
    SecretAccessKeyType = [0, n03, _SAKT, 8, 0];
    SessionTokenType = [0, n03, _STT, 8, 0];
    GetRoleCredentialsRequest$ = [
      3,
      n03,
      _GRCR,
      0,
      [_rN, _aI, _aT2],
      [[0, { [_hQ]: _rn }], [0, { [_hQ]: _ai }], [() => AccessTokenType, { [_hH2]: _xasbt }]],
      3
    ];
    GetRoleCredentialsResponse$ = [
      3,
      n03,
      _GRCRe,
      0,
      [_rC],
      [[() => RoleCredentials$, 0]]
    ];
    RoleCredentials$ = [
      3,
      n03,
      _RC,
      0,
      [_aKI, _sAK, _sT, _ex],
      [0, [() => SecretAccessKeyType, 0], [() => SessionTokenType, 0], 1]
    ];
    GetRoleCredentials$ = [
      9,
      n03,
      _GRC,
      { [_h2]: ["GET", "/federation/credentials", 200] },
      () => GetRoleCredentialsRequest$,
      () => GetRoleCredentialsResponse$
    ];
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/runtimeConfig.shared.js
var getRuntimeConfig3;
var init_runtimeConfig_shared2 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/runtimeConfig.shared.js"() {
    init_httpAuthSchemes2();
    init_protocols2();
    init_dist_es2();
    init_checksum3();
    init_client2();
    init_protocols();
    init_serde();
    init_httpAuthSchemeProvider2();
    init_endpointResolver2();
    init_schemas_02();
    getRuntimeConfig3 = /* @__PURE__ */ __name((config) => {
      return {
        apiVersion: "2019-06-10",
        base64Decoder: config?.base64Decoder ?? fromBase64,
        base64Encoder: config?.base64Encoder ?? toBase64,
        disableHostPrefix: config?.disableHostPrefix ?? false,
        endpointProvider: config?.endpointProvider ?? defaultEndpointResolver2,
        extensions: config?.extensions ?? [],
        httpAuthSchemeProvider: config?.httpAuthSchemeProvider ?? defaultSSOHttpAuthSchemeProvider,
        httpAuthSchemes: config?.httpAuthSchemes ?? [
          {
            schemeId: "aws.auth#sigv4",
            identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("aws.auth#sigv4"), "identityProvider"),
            signer: new AwsSdkSigV4Signer()
          },
          {
            schemeId: "smithy.api#noAuth",
            identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("smithy.api#noAuth") || (async () => ({})), "identityProvider"),
            signer: new NoAuthSigner()
          }
        ],
        logger: config?.logger ?? new NoOpLogger(),
        protocol: config?.protocol ?? AwsRestJsonProtocol,
        protocolSettings: config?.protocolSettings ?? {
          defaultNamespace: "com.amazonaws.sso",
          errorTypeRegistries: errorTypeRegistries3,
          version: "2019-06-10",
          serviceTarget: "SWBPortalService"
        },
        serviceId: config?.serviceId ?? "SSO",
        sha256: config?.sha256 ?? Sha256Node,
        urlParser: config?.urlParser ?? parseUrl,
        utf8Decoder: config?.utf8Decoder ?? fromUtf8,
        utf8Encoder: config?.utf8Encoder ?? toUtf8
      };
    }, "getRuntimeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/runtimeConfig.js
var getRuntimeConfig4;
var init_runtimeConfig2 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/runtimeConfig.js"() {
    init_package();
    init_client3();
    init_httpAuthSchemes2();
    init_client2();
    init_config2();
    init_retry2();
    init_serde();
    init_dist_es6();
    init_runtimeConfig_shared2();
    getRuntimeConfig4 = /* @__PURE__ */ __name((config) => {
      emitWarningIfUnsupportedVersion(process.version);
      const defaultsMode = resolveDefaultsModeConfig(config);
      const defaultConfigProvider = /* @__PURE__ */ __name(() => defaultsMode().then(loadConfigsForDefaultMode), "defaultConfigProvider");
      const clientSharedValues = getRuntimeConfig3(config);
      emitWarningIfUnsupportedVersion2(process.version);
      const loaderConfig = {
        profile: config?.profile,
        logger: clientSharedValues.logger
      };
      return {
        ...clientSharedValues,
        ...config,
        runtime: "node",
        defaultsMode,
        authSchemePreference: config?.authSchemePreference ?? loadConfig(NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, loaderConfig),
        bodyLengthChecker: config?.bodyLengthChecker ?? calculateBodyLength,
        defaultUserAgentProvider: config?.defaultUserAgentProvider ?? createDefaultUserAgentProvider({ serviceId: clientSharedValues.serviceId, clientVersion: package_default2.version }),
        maxAttempts: config?.maxAttempts ?? loadConfig(NODE_MAX_ATTEMPT_CONFIG_OPTIONS, config),
        region: config?.region ?? loadConfig(NODE_REGION_CONFIG_OPTIONS, { ...NODE_REGION_CONFIG_FILE_OPTIONS, ...loaderConfig }),
        requestHandler: NodeHttpHandler.create(config?.requestHandler ?? defaultConfigProvider),
        retryMode: config?.retryMode ?? loadConfig({
          ...NODE_RETRY_MODE_CONFIG_OPTIONS,
          default: /* @__PURE__ */ __name(async () => (await defaultConfigProvider()).retryMode || DEFAULT_RETRY_MODE, "default")
        }, config),
        streamCollector: config?.streamCollector ?? streamCollector2,
        useDualstackEndpoint: config?.useDualstackEndpoint ?? loadConfig(NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
        useFipsEndpoint: config?.useFipsEndpoint ?? loadConfig(NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
        userAgentAppId: config?.userAgentAppId ?? loadConfig(NODE_APP_ID_CONFIG_OPTIONS, loaderConfig)
      };
    }, "getRuntimeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/auth/httpAuthExtensionConfiguration.js
var getHttpAuthExtensionConfiguration2, resolveHttpAuthRuntimeConfig2;
var init_httpAuthExtensionConfiguration2 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/auth/httpAuthExtensionConfiguration.js"() {
    getHttpAuthExtensionConfiguration2 = /* @__PURE__ */ __name((runtimeConfig) => {
      const _httpAuthSchemes = runtimeConfig.httpAuthSchemes;
      let _httpAuthSchemeProvider = runtimeConfig.httpAuthSchemeProvider;
      let _credentials = runtimeConfig.credentials;
      return {
        setHttpAuthScheme(httpAuthScheme) {
          const index = _httpAuthSchemes.findIndex((scheme) => scheme.schemeId === httpAuthScheme.schemeId);
          if (index === -1) {
            _httpAuthSchemes.push(httpAuthScheme);
          } else {
            _httpAuthSchemes.splice(index, 1, httpAuthScheme);
          }
        },
        httpAuthSchemes() {
          return _httpAuthSchemes;
        },
        setHttpAuthSchemeProvider(httpAuthSchemeProvider) {
          _httpAuthSchemeProvider = httpAuthSchemeProvider;
        },
        httpAuthSchemeProvider() {
          return _httpAuthSchemeProvider;
        },
        setCredentials(credentials) {
          _credentials = credentials;
        },
        credentials() {
          return _credentials;
        }
      };
    }, "getHttpAuthExtensionConfiguration");
    resolveHttpAuthRuntimeConfig2 = /* @__PURE__ */ __name((config) => {
      return {
        httpAuthSchemes: config.httpAuthSchemes(),
        httpAuthSchemeProvider: config.httpAuthSchemeProvider(),
        credentials: config.credentials()
      };
    }, "resolveHttpAuthRuntimeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/runtimeExtensions.js
var resolveRuntimeExtensions2;
var init_runtimeExtensions2 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/runtimeExtensions.js"() {
    init_client3();
    init_client2();
    init_protocols();
    init_httpAuthExtensionConfiguration2();
    resolveRuntimeExtensions2 = /* @__PURE__ */ __name((runtimeConfig, extensions) => {
      const extensionConfiguration = Object.assign(getAwsRegionExtensionConfiguration(runtimeConfig), getDefaultExtensionConfiguration(runtimeConfig), getHttpHandlerExtensionConfiguration(runtimeConfig), getHttpAuthExtensionConfiguration2(runtimeConfig));
      extensions.forEach((extension) => extension.configure(extensionConfiguration));
      return Object.assign(runtimeConfig, resolveAwsRegionExtensionConfiguration(extensionConfiguration), resolveDefaultRuntimeConfig2(extensionConfiguration), resolveHttpHandlerRuntimeConfig(extensionConfiguration), resolveHttpAuthRuntimeConfig2(extensionConfiguration));
    }, "resolveRuntimeExtensions");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/SSOClient.js
var SSOClient;
var init_SSOClient = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/SSOClient.js"() {
    init_client3();
    init_dist_es2();
    init_client2();
    init_config2();
    init_endpoints();
    init_protocols();
    init_retry2();
    init_schema();
    init_httpAuthSchemeProvider2();
    init_EndpointParameters2();
    init_runtimeConfig2();
    init_runtimeExtensions2();
    SSOClient = class extends Client {
      static {
        __name(this, "SSOClient");
      }
      config;
      constructor(...[configuration]) {
        const _config_0 = getRuntimeConfig4(configuration || {});
        super(_config_0);
        this.initConfig = _config_0;
        const _config_1 = resolveClientEndpointParameters3(_config_0);
        const _config_2 = resolveUserAgentConfig(_config_1);
        const _config_3 = resolveRetryConfig(_config_2);
        const _config_4 = resolveRegionConfig(_config_3);
        const _config_5 = resolveHostHeaderConfig(_config_4);
        const _config_6 = resolveEndpointConfig(_config_5);
        const _config_7 = resolveHttpAuthSchemeConfig3(_config_6);
        const _config_8 = resolveRuntimeExtensions2(_config_7, configuration?.extensions || []);
        this.config = _config_8;
        this.middlewareStack.use(getSchemaSerdePlugin(this.config));
        this.middlewareStack.use(getUserAgentPlugin(this.config));
        this.middlewareStack.use(getRetryPlugin(this.config));
        this.middlewareStack.use(getContentLengthPlugin(this.config));
        this.middlewareStack.use(getHostHeaderPlugin(this.config));
        this.middlewareStack.use(getLoggerPlugin(this.config));
        this.middlewareStack.use(getRecursionDetectionPlugin(this.config));
        this.middlewareStack.use(getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
          httpAuthSchemeParametersProvider: defaultSSOHttpAuthSchemeParametersProvider,
          identityProviderConfigProvider: /* @__PURE__ */ __name(async (config) => new DefaultIdentityProviderConfig({
            "aws.auth#sigv4": config.credentials
          }), "identityProviderConfigProvider")
        }));
        this.middlewareStack.use(getHttpSigningPlugin(this.config));
      }
      destroy() {
        super.destroy();
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/commandBuilder.js
var command3, _ep03, _mw03;
var init_commandBuilder2 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/commandBuilder.js"() {
    init_client2();
    init_endpoints();
    init_EndpointParameters2();
    command3 = makeBuilder(commonParams3, "SWBPortalService", "SSOClient", getEndpointPlugin);
    _ep03 = {};
    _mw03 = /* @__PURE__ */ __name((Command2, cs, config, o4) => [], "_mw0");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/commands/GetRoleCredentialsCommand.js
var GetRoleCredentialsCommand;
var init_GetRoleCredentialsCommand = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/commands/GetRoleCredentialsCommand.js"() {
    init_commandBuilder2();
    init_schemas_02();
    GetRoleCredentialsCommand = class extends command3(_ep03, _mw03, "GetRoleCredentials", GetRoleCredentials$) {
      static {
        __name(this, "GetRoleCredentialsCommand");
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/SSO.js
var commands2, SSO;
var init_SSO = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/SSO.js"() {
    init_client2();
    init_GetRoleCredentialsCommand();
    init_SSOClient();
    commands2 = {
      GetRoleCredentialsCommand
    };
    SSO = class extends SSOClient {
      static {
        __name(this, "SSO");
      }
    };
    createAggregatedClient(commands2, SSO);
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/commands/index.js
var init_commands2 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/commands/index.js"() {
    init_GetRoleCredentialsCommand();
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/models/models_0.js
var init_models_02 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/models/models_0.js"() {
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/index.js
var init_sso = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/index.js"() {
    init_SSOClient();
    init_SSO();
    init_commands2();
    init_schemas_02();
    init_errors2();
    init_models_02();
  }
});

// node_modules/@aws-sdk/credential-provider-sso/dist-es/loadSso.js
var loadSso_exports = {};
__export(loadSso_exports, {
  GetRoleCredentialsCommand: () => GetRoleCredentialsCommand,
  SSOClient: () => SSOClient
});
var init_loadSso = __esm({
  "node_modules/@aws-sdk/credential-provider-sso/dist-es/loadSso.js"() {
    init_sso();
  }
});

// node_modules/@aws-sdk/credential-provider-sso/dist-es/resolveSSOCredentials.js
var SHOULD_FAIL_CREDENTIAL_CHAIN, resolveSSOCredentials;
var init_resolveSSOCredentials = __esm({
  "node_modules/@aws-sdk/credential-provider-sso/dist-es/resolveSSOCredentials.js"() {
    init_client3();
    init_dist_es9();
    init_config2();
    SHOULD_FAIL_CREDENTIAL_CHAIN = false;
    resolveSSOCredentials = /* @__PURE__ */ __name(async ({ ssoStartUrl, ssoSession, ssoAccountId, ssoRegion, ssoRoleName, ssoClient, clientConfig, parentClientConfig, callerClientConfig, profile, filepath, configFilepath, ignoreCache, logger: logger2 }) => {
      let token;
      const refreshMessage = `To refresh this SSO session run aws sso login with the corresponding profile.`;
      if (ssoSession) {
        try {
          const _token = await fromSso({
            profile,
            filepath,
            configFilepath,
            ignoreCache,
            clientConfig,
            parentClientConfig,
            logger: logger2
          })({ callerClientConfig });
          token = {
            accessToken: _token.token,
            expiresAt: new Date(_token.expiration).toISOString()
          };
        } catch (e6) {
          throw new CredentialsProviderError(e6.message, {
            tryNextLink: SHOULD_FAIL_CREDENTIAL_CHAIN,
            logger: logger2
          });
        }
      } else {
        try {
          token = await getSSOTokenFromFile(ssoStartUrl);
        } catch (e6) {
          throw new CredentialsProviderError(`The SSO session associated with this profile is invalid. ${refreshMessage}`, {
            tryNextLink: SHOULD_FAIL_CREDENTIAL_CHAIN,
            logger: logger2
          });
        }
      }
      if (new Date(token.expiresAt).getTime() - Date.now() <= 0) {
        throw new CredentialsProviderError(`The SSO session associated with this profile has expired. ${refreshMessage}`, {
          tryNextLink: SHOULD_FAIL_CREDENTIAL_CHAIN,
          logger: logger2
        });
      }
      const { accessToken } = token;
      const { SSOClient: SSOClient2, GetRoleCredentialsCommand: GetRoleCredentialsCommand2 } = await Promise.resolve().then(() => (init_loadSso(), loadSso_exports));
      const sso = ssoClient || new SSOClient2(Object.assign({}, clientConfig ?? {}, {
        logger: clientConfig?.logger ?? callerClientConfig?.logger ?? parentClientConfig?.logger,
        region: clientConfig?.region ?? ssoRegion,
        userAgentAppId: clientConfig?.userAgentAppId ?? callerClientConfig?.userAgentAppId ?? parentClientConfig?.userAgentAppId
      }));
      let ssoResp;
      try {
        ssoResp = await sso.send(new GetRoleCredentialsCommand2({
          accountId: ssoAccountId,
          roleName: ssoRoleName,
          accessToken
        }));
      } catch (e6) {
        throw new CredentialsProviderError(e6, {
          tryNextLink: SHOULD_FAIL_CREDENTIAL_CHAIN,
          logger: logger2
        });
      }
      const { roleCredentials: { accessKeyId, secretAccessKey, sessionToken, expiration, credentialScope, accountId } = {} } = ssoResp;
      if (!accessKeyId || !secretAccessKey || !sessionToken || !expiration) {
        throw new CredentialsProviderError("SSO returns an invalid temporary credential.", {
          tryNextLink: SHOULD_FAIL_CREDENTIAL_CHAIN,
          logger: logger2
        });
      }
      const credentials = {
        accessKeyId,
        secretAccessKey,
        sessionToken,
        expiration: new Date(expiration),
        ...credentialScope && { credentialScope },
        ...accountId && { accountId }
      };
      if (ssoSession) {
        setCredentialFeature(credentials, "CREDENTIALS_SSO", "s");
      } else {
        setCredentialFeature(credentials, "CREDENTIALS_SSO_LEGACY", "u");
      }
      return credentials;
    }, "resolveSSOCredentials");
  }
});

// node_modules/@aws-sdk/credential-provider-sso/dist-es/validateSsoProfile.js
var validateSsoProfile;
var init_validateSsoProfile = __esm({
  "node_modules/@aws-sdk/credential-provider-sso/dist-es/validateSsoProfile.js"() {
    init_config2();
    validateSsoProfile = /* @__PURE__ */ __name((profile, logger2) => {
      const { sso_start_url, sso_account_id, sso_region, sso_role_name } = profile;
      if (!sso_start_url || !sso_account_id || !sso_region || !sso_role_name) {
        throw new CredentialsProviderError(`Profile is configured with invalid SSO credentials. Required parameters "sso_account_id", "sso_region", "sso_role_name", "sso_start_url". Got ${Object.keys(profile).join(", ")}
Reference: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html`, { tryNextLink: false, logger: logger2 });
      }
      return profile;
    }, "validateSsoProfile");
  }
});

// node_modules/@aws-sdk/credential-provider-sso/dist-es/fromSSO.js
var fromSSO;
var init_fromSSO = __esm({
  "node_modules/@aws-sdk/credential-provider-sso/dist-es/fromSSO.js"() {
    init_config2();
    init_isSsoProfile();
    init_resolveSSOCredentials();
    init_validateSsoProfile();
    fromSSO = /* @__PURE__ */ __name((init = {}) => async ({ callerClientConfig } = {}) => {
      init.logger?.debug("@aws-sdk/credential-provider-sso - fromSSO");
      const { ssoStartUrl, ssoAccountId, ssoRegion, ssoRoleName, ssoSession } = init;
      const { ssoClient } = init;
      const profileName = getProfileName({
        profile: init.profile ?? callerClientConfig?.profile
      });
      if (!ssoStartUrl && !ssoAccountId && !ssoRegion && !ssoRoleName && !ssoSession) {
        const profiles = await parseKnownFiles(init);
        const profile = profiles[profileName];
        if (!profile) {
          throw new CredentialsProviderError(`Profile ${profileName} was not found.`, { logger: init.logger });
        }
        if (!isSsoProfile(profile)) {
          throw new CredentialsProviderError(`Profile ${profileName} is not configured with SSO credentials.`, {
            logger: init.logger
          });
        }
        if (profile?.sso_session) {
          const ssoSessions = await loadSsoSessionData(init);
          const session = ssoSessions[profile.sso_session];
          const conflictMsg = ` configurations in profile ${profileName} and sso-session ${profile.sso_session}`;
          if (ssoRegion && ssoRegion !== session.sso_region) {
            throw new CredentialsProviderError(`Conflicting SSO region` + conflictMsg, {
              tryNextLink: false,
              logger: init.logger
            });
          }
          if (ssoStartUrl && ssoStartUrl !== session.sso_start_url) {
            throw new CredentialsProviderError(`Conflicting SSO start_url` + conflictMsg, {
              tryNextLink: false,
              logger: init.logger
            });
          }
          profile.sso_region = session.sso_region;
          profile.sso_start_url = session.sso_start_url;
        }
        const { sso_start_url, sso_account_id, sso_region, sso_role_name, sso_session } = validateSsoProfile(profile, init.logger);
        return resolveSSOCredentials({
          ssoStartUrl: sso_start_url,
          ssoSession: sso_session,
          ssoAccountId: sso_account_id,
          ssoRegion: sso_region,
          ssoRoleName: sso_role_name,
          ssoClient,
          clientConfig: init.clientConfig,
          parentClientConfig: init.parentClientConfig,
          callerClientConfig: init.callerClientConfig,
          profile: profileName,
          filepath: init.filepath,
          configFilepath: init.configFilepath,
          ignoreCache: init.ignoreCache,
          logger: init.logger
        });
      } else if (!ssoStartUrl || !ssoAccountId || !ssoRegion || !ssoRoleName) {
        throw new CredentialsProviderError('Incomplete configuration. The fromSSO() argument hash must include "ssoStartUrl", "ssoAccountId", "ssoRegion", "ssoRoleName"', { tryNextLink: false, logger: init.logger });
      } else {
        return resolveSSOCredentials({
          ssoStartUrl,
          ssoSession,
          ssoAccountId,
          ssoRegion,
          ssoRoleName,
          ssoClient,
          clientConfig: init.clientConfig,
          parentClientConfig: init.parentClientConfig,
          callerClientConfig: init.callerClientConfig,
          profile: profileName,
          filepath: init.filepath,
          configFilepath: init.configFilepath,
          ignoreCache: init.ignoreCache,
          logger: init.logger
        });
      }
    }, "fromSSO");
  }
});

// node_modules/@aws-sdk/credential-provider-sso/dist-es/index.js
var dist_es_exports4 = {};
__export(dist_es_exports4, {
  fromSSO: () => fromSSO,
  isSsoProfile: () => isSsoProfile,
  validateSsoProfile: () => validateSsoProfile
});
var init_dist_es10 = __esm({
  "node_modules/@aws-sdk/credential-provider-sso/dist-es/index.js"() {
    init_fromSSO();
    init_isSsoProfile();
    init_validateSsoProfile();
  }
});

// node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveCredentialSource.js
var resolveCredentialSource, setNamedProvider;
var init_resolveCredentialSource = __esm({
  "node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveCredentialSource.js"() {
    init_client3();
    init_config2();
    resolveCredentialSource = /* @__PURE__ */ __name((credentialSource, profileName, logger2) => {
      const sourceProvidersMap = {
        EcsContainer: /* @__PURE__ */ __name(async (options) => {
          const { fromHttp: fromHttp2 } = await Promise.resolve().then(() => (init_dist_es7(), dist_es_exports3));
          const { fromContainerMetadata: fromContainerMetadata2 } = await Promise.resolve().then(() => (init_dist_es5(), dist_es_exports2));
          logger2?.debug("@aws-sdk/credential-provider-ini - credential_source is EcsContainer");
          return async () => chain(fromHttp2(options ?? {}), fromContainerMetadata2(options))().then(setNamedProvider);
        }, "EcsContainer"),
        Ec2InstanceMetadata: /* @__PURE__ */ __name(async (options) => {
          logger2?.debug("@aws-sdk/credential-provider-ini - credential_source is Ec2InstanceMetadata");
          const { fromInstanceMetadata: fromInstanceMetadata2 } = await Promise.resolve().then(() => (init_dist_es5(), dist_es_exports2));
          return async () => fromInstanceMetadata2(options)().then(setNamedProvider);
        }, "Ec2InstanceMetadata"),
        Environment: /* @__PURE__ */ __name(async (options) => {
          logger2?.debug("@aws-sdk/credential-provider-ini - credential_source is Environment");
          const { fromEnv: fromEnv3 } = await Promise.resolve().then(() => (init_dist_es4(), dist_es_exports));
          return async () => fromEnv3(options)().then(setNamedProvider);
        }, "Environment")
      };
      if (credentialSource in sourceProvidersMap) {
        return sourceProvidersMap[credentialSource];
      } else {
        throw new CredentialsProviderError(`Unsupported credential source in profile ${profileName}. Got ${credentialSource}, expected EcsContainer or Ec2InstanceMetadata or Environment.`, { logger: logger2 });
      }
    }, "resolveCredentialSource");
    setNamedProvider = /* @__PURE__ */ __name((creds) => setCredentialFeature(creds, "CREDENTIALS_PROFILE_NAMED_PROVIDER", "p"), "setNamedProvider");
  }
});

// node_modules/@aws-sdk/signature-v4-multi-region/dist-es/signature-v4-crt-container.js
var signatureV4CrtContainer;
var init_signature_v4_crt_container = __esm({
  "node_modules/@aws-sdk/signature-v4-multi-region/dist-es/signature-v4-crt-container.js"() {
    signatureV4CrtContainer = {
      CrtSignerV4: null
    };
  }
});

// node_modules/@aws-sdk/signature-v4-multi-region/dist-es/SignatureV4SignWithCredentials.js
function getCredentialsWithoutSessionToken(credentials) {
  return {
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    expiration: credentials.expiration
  };
}
function setSingleOverride(privateAccess, credentialsWithoutSessionToken) {
  const currentCredentialProvider = privateAccess.credentialProvider;
  privateAccess.credentialProvider = () => {
    privateAccess.credentialProvider = currentCredentialProvider;
    return Promise.resolve(credentialsWithoutSessionToken);
  };
}
var SESSION_TOKEN_QUERY_PARAM, SESSION_TOKEN_HEADER, SignatureV4SignWithCredentials;
var init_SignatureV4SignWithCredentials = __esm({
  "node_modules/@aws-sdk/signature-v4-multi-region/dist-es/SignatureV4SignWithCredentials.js"() {
    init_dist_es3();
    SESSION_TOKEN_QUERY_PARAM = "X-Amz-S3session-Token";
    SESSION_TOKEN_HEADER = SESSION_TOKEN_QUERY_PARAM.toLowerCase();
    SignatureV4SignWithCredentials = class extends SignatureV4 {
      static {
        __name(this, "SignatureV4SignWithCredentials");
      }
      async signWithCredentials(requestToSign, credentials, options) {
        const credentialsWithoutSessionToken = getCredentialsWithoutSessionToken(credentials);
        requestToSign.headers[SESSION_TOKEN_HEADER] = credentials.sessionToken;
        const privateAccess = this;
        setSingleOverride(privateAccess, credentialsWithoutSessionToken);
        return privateAccess.signRequest(requestToSign, options ?? {});
      }
      async presignWithCredentials(requestToSign, credentials, options) {
        const credentialsWithoutSessionToken = getCredentialsWithoutSessionToken(credentials);
        delete requestToSign.headers[SESSION_TOKEN_HEADER];
        requestToSign.headers[SESSION_TOKEN_QUERY_PARAM] = credentials.sessionToken;
        requestToSign.query = requestToSign.query ?? {};
        requestToSign.query[SESSION_TOKEN_QUERY_PARAM] = credentials.sessionToken;
        const privateAccess = this;
        setSingleOverride(privateAccess, credentialsWithoutSessionToken);
        return this.presign(requestToSign, options);
      }
    };
    __name(getCredentialsWithoutSessionToken, "getCredentialsWithoutSessionToken");
    __name(setSingleOverride, "setSingleOverride");
  }
});

// node_modules/@aws-sdk/signature-v4-multi-region/dist-es/SignatureV4MultiRegion.js
var SignatureV4MultiRegion;
var init_SignatureV4MultiRegion = __esm({
  "node_modules/@aws-sdk/signature-v4-multi-region/dist-es/SignatureV4MultiRegion.js"() {
    init_dist_es3();
    init_signature_v4_crt_container();
    init_SignatureV4SignWithCredentials();
    SignatureV4MultiRegion = class {
      static {
        __name(this, "SignatureV4MultiRegion");
      }
      sigv4aSigner;
      sigv4Signer;
      signerOptions;
      static sigv4aDependency() {
        if (typeof signatureV4CrtContainer.CrtSignerV4 === "function") {
          return "crt";
        } else if (typeof signatureV4aContainer.SignatureV4a === "function") {
          return "js";
        }
        return "none";
      }
      constructor(options) {
        this.sigv4Signer = new SignatureV4SignWithCredentials(options);
        this.signerOptions = options;
      }
      async sign(requestToSign, options = {}) {
        if (options.signingRegion === "*") {
          return this.getSigv4aSigner().sign(requestToSign, options);
        }
        return this.sigv4Signer.sign(requestToSign, options);
      }
      async signWithCredentials(requestToSign, credentials, options = {}) {
        if (options.signingRegion === "*") {
          const signer = this.getSigv4aSigner();
          const CrtSignerV4 = signatureV4CrtContainer.CrtSignerV4;
          if (CrtSignerV4 && signer instanceof CrtSignerV4) {
            return signer.signWithCredentials(requestToSign, credentials, options);
          } else {
            throw new Error(`signWithCredentials with signingRegion '*' is only supported when using the CRT dependency @aws-sdk/signature-v4-crt. Please check whether you have installed the "@aws-sdk/signature-v4-crt" package explicitly. You must also register the package by calling [require("@aws-sdk/signature-v4-crt");] or an ESM equivalent such as [import "@aws-sdk/signature-v4-crt";]. For more information please go to https://github.com/aws/aws-sdk-js-v3#functionality-requiring-aws-common-runtime-crt`);
          }
        }
        return this.sigv4Signer.signWithCredentials(requestToSign, credentials, options);
      }
      async presign(originalRequest, options = {}) {
        if (options.signingRegion === "*") {
          const signer = this.getSigv4aSigner();
          const CrtSignerV4 = signatureV4CrtContainer.CrtSignerV4;
          if (CrtSignerV4 && signer instanceof CrtSignerV4) {
            return signer.presign(originalRequest, options);
          } else {
            throw new Error(`presign with signingRegion '*' is only supported when using the CRT dependency @aws-sdk/signature-v4-crt. Please check whether you have installed the "@aws-sdk/signature-v4-crt" package explicitly. You must also register the package by calling [require("@aws-sdk/signature-v4-crt");] or an ESM equivalent such as [import "@aws-sdk/signature-v4-crt";]. For more information please go to https://github.com/aws/aws-sdk-js-v3#functionality-requiring-aws-common-runtime-crt`);
          }
        }
        return this.sigv4Signer.presign(originalRequest, options);
      }
      async presignWithCredentials(originalRequest, credentials, options = {}) {
        if (options.signingRegion === "*") {
          throw new Error("Method presignWithCredentials is not supported for [signingRegion=*].");
        }
        return this.sigv4Signer.presignWithCredentials(originalRequest, credentials, options);
      }
      getSigv4aSigner() {
        if (!this.sigv4aSigner) {
          const CrtSignerV4 = signatureV4CrtContainer.CrtSignerV4;
          const JsSigV4aSigner = signatureV4aContainer.SignatureV4a;
          if (this.signerOptions.runtime === "node") {
            if (!CrtSignerV4 && !JsSigV4aSigner) {
              throw new Error("Neither CRT nor JS SigV4a implementation is available. Please load either @aws-sdk/signature-v4-crt or @aws-sdk/signature-v4a. For more information please go to https://github.com/aws/aws-sdk-js-v3#functionality-requiring-aws-common-runtime-crt");
            }
            if (CrtSignerV4 && typeof CrtSignerV4 === "function") {
              this.sigv4aSigner = new CrtSignerV4({
                ...this.signerOptions,
                signingAlgorithm: 1
              });
            } else if (JsSigV4aSigner && typeof JsSigV4aSigner === "function") {
              this.sigv4aSigner = new JsSigV4aSigner({
                ...this.signerOptions
              });
            } else {
              throw new Error("Available SigV4a implementation is not a valid constructor. Please ensure you've properly imported @aws-sdk/signature-v4-crt or @aws-sdk/signature-v4a.For more information please go to https://github.com/aws/aws-sdk-js-v3#functionality-requiring-aws-common-runtime-crt");
            }
          } else {
            if (!JsSigV4aSigner || typeof JsSigV4aSigner !== "function") {
              throw new Error("JS SigV4a implementation is not available or not a valid constructor. Please check whether you have installed the @aws-sdk/signature-v4a package explicitly. The CRT implementation is not available for browsers. You must also register the package by calling [require('@aws-sdk/signature-v4a');] or an ESM equivalent such as [import '@aws-sdk/signature-v4a';]. For more information please go to https://github.com/aws/aws-sdk-js-v3#using-javascript-non-crt-implementation-of-sigv4a");
            }
            this.sigv4aSigner = new JsSigV4aSigner({
              ...this.signerOptions
            });
          }
        }
        return this.sigv4aSigner;
      }
    };
  }
});

// node_modules/@aws-sdk/signature-v4-multi-region/dist-es/index.js
var init_dist_es11 = __esm({
  "node_modules/@aws-sdk/signature-v4-multi-region/dist-es/index.js"() {
    init_SignatureV4MultiRegion();
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/endpoint/bdd.js
var q, a3, b3, c3, d3, e3, f3, g3, h3, i3, j3, k3, l, m, n, o, p, _data3, root3, r3, nodes3, bdd3;
var init_bdd3 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/endpoint/bdd.js"() {
    init_endpoints();
    q = "ref";
    a3 = -1;
    b3 = true;
    c3 = "isSet";
    d3 = "PartitionResult";
    e3 = "booleanEquals";
    f3 = "stringEquals";
    g3 = "getAttr";
    h3 = "us-east-1";
    i3 = "sigv4";
    j3 = "sts";
    k3 = "https://sts.{Region}.{PartitionResult#dnsSuffix}";
    l = { [q]: "Endpoint" };
    m = { [q]: "Region" };
    n = { [q]: d3 };
    o = {};
    p = [m];
    _data3 = {
      conditions: [
        [c3, [l]],
        [c3, p],
        ["aws.partition", p, d3],
        [e3, [{ [q]: "UseFIPS" }, b3]],
        [e3, [{ [q]: "UseDualStack" }, b3]],
        [f3, [m, "aws-global"]],
        [e3, [{ [q]: "UseGlobalEndpoint" }, b3]],
        [f3, [m, "eu-central-1"]],
        [e3, [{ fn: g3, argv: [n, "supportsDualStack"] }, b3]],
        [e3, [{ fn: g3, argv: [n, "supportsFIPS"] }, b3]],
        [f3, [m, "ap-south-1"]],
        [f3, [m, "eu-north-1"]],
        [f3, [m, "eu-west-1"]],
        [f3, [m, "eu-west-2"]],
        [f3, [m, "eu-west-3"]],
        [f3, [m, "sa-east-1"]],
        [f3, [m, h3]],
        [f3, [m, "us-east-2"]],
        [f3, [m, "us-west-2"]],
        [f3, [m, "us-west-1"]],
        [f3, [m, "ca-central-1"]],
        [f3, [m, "ap-southeast-1"]],
        [f3, [m, "ap-northeast-1"]],
        [f3, [m, "ap-southeast-2"]],
        [f3, [{ fn: g3, argv: [n, "name"] }, "aws-us-gov"]]
      ],
      results: [
        [a3],
        ["https://sts.amazonaws.com", { authSchemes: [{ name: i3, signingName: j3, signingRegion: h3 }] }],
        [k3, { authSchemes: [{ name: i3, signingName: j3, signingRegion: "{Region}" }] }],
        [a3, "Invalid Configuration: FIPS and custom endpoint are not supported"],
        [a3, "Invalid Configuration: Dualstack and custom endpoint are not supported"],
        [l, o],
        ["https://sts-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", o],
        [a3, "FIPS and DualStack are enabled, but this partition does not support one or both"],
        ["https://sts.{Region}.amazonaws.com", o],
        ["https://sts-fips.{Region}.{PartitionResult#dnsSuffix}", o],
        [a3, "FIPS is enabled but this partition does not support FIPS"],
        ["https://sts.{Region}.{PartitionResult#dualStackDnsSuffix}", o],
        [a3, "DualStack is enabled but this partition does not support DualStack"],
        [k3, o],
        [a3, "Invalid Configuration: Missing Region"]
      ]
    };
    root3 = 2;
    r3 = 1e8;
    nodes3 = new Int32Array([
      -1,
      1,
      -1,
      0,
      30,
      3,
      1,
      4,
      r3 + 14,
      2,
      5,
      r3 + 14,
      3,
      25,
      6,
      4,
      24,
      7,
      5,
      r3 + 1,
      8,
      6,
      9,
      r3 + 13,
      7,
      r3 + 1,
      10,
      10,
      r3 + 1,
      11,
      11,
      r3 + 1,
      12,
      12,
      r3 + 1,
      13,
      13,
      r3 + 1,
      14,
      14,
      r3 + 1,
      15,
      15,
      r3 + 1,
      16,
      16,
      r3 + 1,
      17,
      17,
      r3 + 1,
      18,
      18,
      r3 + 1,
      19,
      19,
      r3 + 1,
      20,
      20,
      r3 + 1,
      21,
      21,
      r3 + 1,
      22,
      22,
      r3 + 1,
      23,
      23,
      r3 + 1,
      r3 + 2,
      8,
      r3 + 11,
      r3 + 12,
      4,
      28,
      26,
      9,
      27,
      r3 + 10,
      24,
      r3 + 8,
      r3 + 9,
      8,
      29,
      r3 + 7,
      9,
      r3 + 6,
      r3 + 7,
      3,
      r3 + 3,
      31,
      4,
      r3 + 4,
      r3 + 5
    ]);
    bdd3 = BinaryDecisionDiagram.from(nodes3, root3, _data3.conditions, _data3.results);
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/endpoint/endpointResolver.js
var cache3, defaultEndpointResolver3;
var init_endpointResolver3 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/endpoint/endpointResolver.js"() {
    init_client3();
    init_endpoints();
    init_bdd3();
    cache3 = new EndpointCache({
      size: 50,
      params: ["Endpoint", "Region", "UseDualStack", "UseFIPS", "UseGlobalEndpoint"]
    });
    defaultEndpointResolver3 = /* @__PURE__ */ __name((endpointParams, context = {}) => {
      return cache3.get(endpointParams, () => decideEndpoint(bdd3, {
        endpointParams,
        logger: context.logger
      }));
    }, "defaultEndpointResolver");
    customEndpointFunctions.aws = awsEndpointFunctions;
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/auth/httpAuthSchemeProvider.js
function createAwsAuthSigv4HttpAuthOption4(authParameters) {
  return {
    schemeId: "aws.auth#sigv4",
    signingProperties: {
      name: "sts",
      region: authParameters.region
    },
    propertiesExtractor: /* @__PURE__ */ __name((config, context) => ({
      signingProperties: {
        config,
        context
      }
    }), "propertiesExtractor")
  };
}
function createAwsAuthSigv4aHttpAuthOption(authParameters) {
  return {
    schemeId: "aws.auth#sigv4a",
    signingProperties: {
      name: "sts",
      region: authParameters.region
    },
    propertiesExtractor: /* @__PURE__ */ __name((config, context) => ({
      signingProperties: {
        config,
        context
      }
    }), "propertiesExtractor")
  };
}
function createSmithyApiNoAuthHttpAuthOption3(authParameters) {
  return {
    schemeId: "smithy.api#noAuth"
  };
}
var createEndpointRuleSetHttpAuthSchemeParametersProvider, _defaultSTSHttpAuthSchemeParametersProvider, defaultSTSHttpAuthSchemeParametersProvider, createEndpointRuleSetHttpAuthSchemeProvider, _defaultSTSHttpAuthSchemeProvider, defaultSTSHttpAuthSchemeProvider, resolveHttpAuthSchemeConfig4;
var init_httpAuthSchemeProvider3 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/auth/httpAuthSchemeProvider.js"() {
    init_httpAuthSchemes2();
    init_dist_es11();
    init_client2();
    init_endpoints();
    init_endpointResolver3();
    createEndpointRuleSetHttpAuthSchemeParametersProvider = /* @__PURE__ */ __name((defaultHttpAuthSchemeParametersProvider) => async (config, context, input) => {
      if (!input) {
        throw new Error("Could not find `input` for `defaultEndpointRuleSetHttpAuthSchemeParametersProvider`");
      }
      const defaultParameters = await defaultHttpAuthSchemeParametersProvider(config, context, input);
      const instructionsFn = getSmithyContext(context)?.commandInstance?.constructor?.getEndpointParameterInstructions;
      if (!instructionsFn) {
        throw new Error(`getEndpointParameterInstructions() is not defined on '${context.commandName}'`);
      }
      const endpointParameters = await resolveParams(input, { getEndpointParameterInstructions: instructionsFn }, config);
      return Object.assign(defaultParameters, endpointParameters);
    }, "createEndpointRuleSetHttpAuthSchemeParametersProvider");
    _defaultSTSHttpAuthSchemeParametersProvider = /* @__PURE__ */ __name(async (config, context, input) => {
      return {
        operation: getSmithyContext(context).operation,
        region: await normalizeProvider(config.region)() || (() => {
          throw new Error("expected `region` to be configured for `aws.auth#sigv4`");
        })()
      };
    }, "_defaultSTSHttpAuthSchemeParametersProvider");
    defaultSTSHttpAuthSchemeParametersProvider = createEndpointRuleSetHttpAuthSchemeParametersProvider(_defaultSTSHttpAuthSchemeParametersProvider);
    __name(createAwsAuthSigv4HttpAuthOption4, "createAwsAuthSigv4HttpAuthOption");
    __name(createAwsAuthSigv4aHttpAuthOption, "createAwsAuthSigv4aHttpAuthOption");
    __name(createSmithyApiNoAuthHttpAuthOption3, "createSmithyApiNoAuthHttpAuthOption");
    createEndpointRuleSetHttpAuthSchemeProvider = /* @__PURE__ */ __name((defaultEndpointResolver6, defaultHttpAuthSchemeResolver, createHttpAuthOptionFunctions) => {
      const endpointRuleSetHttpAuthSchemeProvider = /* @__PURE__ */ __name((authParameters) => {
        const endpoint = defaultEndpointResolver6(authParameters);
        const authSchemes = endpoint.properties?.authSchemes;
        if (!authSchemes) {
          return defaultHttpAuthSchemeResolver(authParameters);
        }
        const options = [];
        for (const scheme of authSchemes) {
          const { name: resolvedName, properties = {}, ...rest } = scheme;
          const name = resolvedName.toLowerCase();
          if (resolvedName !== name) {
            console.warn(`HttpAuthScheme has been normalized with lowercasing: '${resolvedName}' to '${name}'`);
          }
          let schemeId;
          if (name === "sigv4a") {
            schemeId = "aws.auth#sigv4a";
            const sigv4Present = authSchemes.find((s3) => {
              const name2 = s3.name.toLowerCase();
              return name2 !== "sigv4a" && name2.startsWith("sigv4");
            });
            if (SignatureV4MultiRegion.sigv4aDependency() === "none" && sigv4Present) {
              continue;
            }
          } else if (name.startsWith("sigv4")) {
            schemeId = "aws.auth#sigv4";
          } else {
            throw new Error(`Unknown HttpAuthScheme found in '@smithy.rules#endpointRuleSet': '${name}'`);
          }
          const createOption = createHttpAuthOptionFunctions[schemeId];
          if (!createOption) {
            throw new Error(`Could not find HttpAuthOption create function for '${schemeId}'`);
          }
          const option = createOption(authParameters);
          option.schemeId = schemeId;
          option.signingProperties = { ...option.signingProperties || {}, ...rest, ...properties };
          options.push(option);
        }
        return options;
      }, "endpointRuleSetHttpAuthSchemeProvider");
      return endpointRuleSetHttpAuthSchemeProvider;
    }, "createEndpointRuleSetHttpAuthSchemeProvider");
    _defaultSTSHttpAuthSchemeProvider = /* @__PURE__ */ __name((authParameters) => {
      const options = [];
      switch (authParameters.operation) {
        case "AssumeRoleWithWebIdentity": {
          options.push(createSmithyApiNoAuthHttpAuthOption3(authParameters));
          options.push(createAwsAuthSigv4aHttpAuthOption(authParameters));
          break;
        }
        default: {
          options.push(createAwsAuthSigv4HttpAuthOption4(authParameters));
          options.push(createAwsAuthSigv4aHttpAuthOption(authParameters));
        }
      }
      return options;
    }, "_defaultSTSHttpAuthSchemeProvider");
    defaultSTSHttpAuthSchemeProvider = createEndpointRuleSetHttpAuthSchemeProvider(defaultEndpointResolver3, _defaultSTSHttpAuthSchemeProvider, {
      "aws.auth#sigv4": createAwsAuthSigv4HttpAuthOption4,
      "aws.auth#sigv4a": createAwsAuthSigv4aHttpAuthOption,
      "smithy.api#noAuth": createSmithyApiNoAuthHttpAuthOption3
    });
    resolveHttpAuthSchemeConfig4 = /* @__PURE__ */ __name((config) => {
      const config_0 = resolveAwsSdkSigV4Config(config);
      const config_1 = resolveAwsSdkSigV4AConfig(config_0);
      return Object.assign(config_1, {
        authSchemePreference: normalizeProvider(config.authSchemePreference ?? [])
      });
    }, "resolveHttpAuthSchemeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/endpoint/EndpointParameters.js
var resolveClientEndpointParameters4, commonParams4;
var init_EndpointParameters3 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/endpoint/EndpointParameters.js"() {
    resolveClientEndpointParameters4 = /* @__PURE__ */ __name((options) => {
      return Object.assign(options, {
        useDualstackEndpoint: options.useDualstackEndpoint ?? false,
        useFipsEndpoint: options.useFipsEndpoint ?? false,
        useGlobalEndpoint: options.useGlobalEndpoint ?? false,
        defaultSigningName: "sts"
      });
    }, "resolveClientEndpointParameters");
    commonParams4 = {
      UseGlobalEndpoint: { type: "builtInParams", name: "useGlobalEndpoint" },
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/models/STSServiceException.js
var STSServiceException;
var init_STSServiceException = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/models/STSServiceException.js"() {
    init_client2();
    STSServiceException = class _STSServiceException extends ServiceException {
      static {
        __name(this, "STSServiceException");
      }
      static shapeId = "smithy.ts.sdk.synthetic.com.amazonaws.sts#STSServiceException";
      constructor(options) {
        super(options);
        Object.setPrototypeOf(this, _STSServiceException.prototype);
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/models/errors.js
var ExpiredTokenException2, MalformedPolicyDocumentException, PackedPolicyTooLargeException, RegionDisabledException, IDPRejectedClaimException, InvalidIdentityTokenException, IDPCommunicationErrorException;
var init_errors3 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/models/errors.js"() {
    init_STSServiceException();
    ExpiredTokenException2 = class _ExpiredTokenException extends STSServiceException {
      static {
        __name(this, "ExpiredTokenException");
      }
      static shapeId = "com.amazonaws.sts#ExpiredTokenException";
      name = "ExpiredTokenException";
      $fault = "client";
      constructor(opts) {
        super({
          name: "ExpiredTokenException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _ExpiredTokenException.prototype);
      }
    };
    MalformedPolicyDocumentException = class _MalformedPolicyDocumentException extends STSServiceException {
      static {
        __name(this, "MalformedPolicyDocumentException");
      }
      static shapeId = "com.amazonaws.sts#MalformedPolicyDocumentException";
      name = "MalformedPolicyDocumentException";
      $fault = "client";
      constructor(opts) {
        super({
          name: "MalformedPolicyDocumentException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _MalformedPolicyDocumentException.prototype);
      }
    };
    PackedPolicyTooLargeException = class _PackedPolicyTooLargeException extends STSServiceException {
      static {
        __name(this, "PackedPolicyTooLargeException");
      }
      static shapeId = "com.amazonaws.sts#PackedPolicyTooLargeException";
      name = "PackedPolicyTooLargeException";
      $fault = "client";
      constructor(opts) {
        super({
          name: "PackedPolicyTooLargeException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _PackedPolicyTooLargeException.prototype);
      }
    };
    RegionDisabledException = class _RegionDisabledException extends STSServiceException {
      static {
        __name(this, "RegionDisabledException");
      }
      static shapeId = "com.amazonaws.sts#RegionDisabledException";
      name = "RegionDisabledException";
      $fault = "client";
      constructor(opts) {
        super({
          name: "RegionDisabledException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _RegionDisabledException.prototype);
      }
    };
    IDPRejectedClaimException = class _IDPRejectedClaimException extends STSServiceException {
      static {
        __name(this, "IDPRejectedClaimException");
      }
      static shapeId = "com.amazonaws.sts#IDPRejectedClaimException";
      name = "IDPRejectedClaimException";
      $fault = "client";
      constructor(opts) {
        super({
          name: "IDPRejectedClaimException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _IDPRejectedClaimException.prototype);
      }
    };
    InvalidIdentityTokenException = class _InvalidIdentityTokenException extends STSServiceException {
      static {
        __name(this, "InvalidIdentityTokenException");
      }
      static shapeId = "com.amazonaws.sts#InvalidIdentityTokenException";
      name = "InvalidIdentityTokenException";
      $fault = "client";
      constructor(opts) {
        super({
          name: "InvalidIdentityTokenException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _InvalidIdentityTokenException.prototype);
      }
    };
    IDPCommunicationErrorException = class _IDPCommunicationErrorException extends STSServiceException {
      static {
        __name(this, "IDPCommunicationErrorException");
      }
      static shapeId = "com.amazonaws.sts#IDPCommunicationErrorException";
      name = "IDPCommunicationErrorException";
      $fault = "client";
      $retryable = {};
      constructor(opts) {
        super({
          name: "IDPCommunicationErrorException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _IDPCommunicationErrorException.prototype);
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/schemas/schemas_0.js
var _A2, _AKI, _AR, _ARI, _ARR, _ARRs, _ARU, _ARWWI, _ARWWIR, _ARWWIRs, _Au, _C2, _CA, _DS, _E, _EI, _ETE2, _IDPCEE, _IDPRCE, _IITE, _K2, _MPDE, _MSTS, _P, _PA, _PAr, _PC, _PCLT, _PCr, _PDT, _PI, _PPS, _PPTLE, _Pr2, _RA2, _RDE, _RSN, _SAK, _SFWIT, _SI2, _SN, _ST, _STS, _STU, _T2, _TC, _TTK, _Ta, _V2, _WIT, _a, _aKST, _aQE2, _c4, _cTT, _e4, _hE4, _m3, _pDLT, _s4, _tLT, n04, _s_registry4, STSServiceException$, n0_registry4, ExpiredTokenException$2, IDPCommunicationErrorException$, IDPRejectedClaimException$, InvalidIdentityTokenException$, MalformedPolicyDocumentException$, PackedPolicyTooLargeException$, RegionDisabledException$, errorTypeRegistries4, accessKeySecretType, clientTokenType, AssumedRoleUser$, AssumeRoleRequest$, AssumeRoleResponse$, AssumeRoleWithWebIdentityRequest$, AssumeRoleWithWebIdentityResponse$, Credentials$, PolicyDescriptorType$, ProvidedContext$, Tag$, policyDescriptorListType, ProvidedContextsListType, tagKeyListType, tagListType, AssumeRole$, AssumeRoleWithWebIdentity$;
var init_schemas_03 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/schemas/schemas_0.js"() {
    init_schema();
    init_errors3();
    init_STSServiceException();
    _A2 = "Arn";
    _AKI = "AccessKeyId";
    _AR = "AssumeRole";
    _ARI = "AssumedRoleId";
    _ARR = "AssumeRoleRequest";
    _ARRs = "AssumeRoleResponse";
    _ARU = "AssumedRoleUser";
    _ARWWI = "AssumeRoleWithWebIdentity";
    _ARWWIR = "AssumeRoleWithWebIdentityRequest";
    _ARWWIRs = "AssumeRoleWithWebIdentityResponse";
    _Au = "Audience";
    _C2 = "Credentials";
    _CA = "ContextAssertion";
    _DS = "DurationSeconds";
    _E = "Expiration";
    _EI = "ExternalId";
    _ETE2 = "ExpiredTokenException";
    _IDPCEE = "IDPCommunicationErrorException";
    _IDPRCE = "IDPRejectedClaimException";
    _IITE = "InvalidIdentityTokenException";
    _K2 = "Key";
    _MPDE = "MalformedPolicyDocumentException";
    _MSTS = "MinimumSessionTokenSize";
    _P = "Policy";
    _PA = "PolicyArns";
    _PAr = "ProviderArn";
    _PC = "ProvidedContexts";
    _PCLT = "ProvidedContextsListType";
    _PCr = "ProvidedContext";
    _PDT = "PolicyDescriptorType";
    _PI = "ProviderId";
    _PPS = "PackedPolicySize";
    _PPTLE = "PackedPolicyTooLargeException";
    _Pr2 = "Provider";
    _RA2 = "RoleArn";
    _RDE = "RegionDisabledException";
    _RSN = "RoleSessionName";
    _SAK = "SecretAccessKey";
    _SFWIT = "SubjectFromWebIdentityToken";
    _SI2 = "SourceIdentity";
    _SN = "SerialNumber";
    _ST = "SessionToken";
    _STS = "SessionTokenSize";
    _STU = "SessionTokenUtilization";
    _T2 = "Tags";
    _TC = "TokenCode";
    _TTK = "TransitiveTagKeys";
    _Ta = "Tag";
    _V2 = "Value";
    _WIT = "WebIdentityToken";
    _a = "arn";
    _aKST = "accessKeySecretType";
    _aQE2 = "awsQueryError";
    _c4 = "client";
    _cTT = "clientTokenType";
    _e4 = "error";
    _hE4 = "httpError";
    _m3 = "message";
    _pDLT = "policyDescriptorListType";
    _s4 = "smithy.ts.sdk.synthetic.com.amazonaws.sts";
    _tLT = "tagListType";
    n04 = "com.amazonaws.sts";
    _s_registry4 = new TypeRegistry(_s4);
    STSServiceException$ = [-3, _s4, "STSServiceException", 0, [], []];
    _s_registry4.registerError(STSServiceException$, STSServiceException);
    n0_registry4 = new TypeRegistry(n04);
    ExpiredTokenException$2 = [
      -3,
      n04,
      _ETE2,
      { [_aQE2]: [`ExpiredTokenException`, 400], [_e4]: _c4, [_hE4]: 400 },
      [_m3],
      [0]
    ];
    n0_registry4.registerError(ExpiredTokenException$2, ExpiredTokenException2);
    IDPCommunicationErrorException$ = [
      -3,
      n04,
      _IDPCEE,
      { [_aQE2]: [`IDPCommunicationError`, 400], [_e4]: _c4, [_hE4]: 400 },
      [_m3],
      [0]
    ];
    n0_registry4.registerError(IDPCommunicationErrorException$, IDPCommunicationErrorException);
    IDPRejectedClaimException$ = [
      -3,
      n04,
      _IDPRCE,
      { [_aQE2]: [`IDPRejectedClaim`, 403], [_e4]: _c4, [_hE4]: 403 },
      [_m3],
      [0]
    ];
    n0_registry4.registerError(IDPRejectedClaimException$, IDPRejectedClaimException);
    InvalidIdentityTokenException$ = [
      -3,
      n04,
      _IITE,
      { [_aQE2]: [`InvalidIdentityToken`, 400], [_e4]: _c4, [_hE4]: 400 },
      [_m3],
      [0]
    ];
    n0_registry4.registerError(InvalidIdentityTokenException$, InvalidIdentityTokenException);
    MalformedPolicyDocumentException$ = [
      -3,
      n04,
      _MPDE,
      { [_aQE2]: [`MalformedPolicyDocument`, 400], [_e4]: _c4, [_hE4]: 400 },
      [_m3],
      [0]
    ];
    n0_registry4.registerError(MalformedPolicyDocumentException$, MalformedPolicyDocumentException);
    PackedPolicyTooLargeException$ = [
      -3,
      n04,
      _PPTLE,
      { [_aQE2]: [`PackedPolicyTooLarge`, 400], [_e4]: _c4, [_hE4]: 400 },
      [_m3],
      [0]
    ];
    n0_registry4.registerError(PackedPolicyTooLargeException$, PackedPolicyTooLargeException);
    RegionDisabledException$ = [
      -3,
      n04,
      _RDE,
      { [_aQE2]: [`RegionDisabledException`, 403], [_e4]: _c4, [_hE4]: 403 },
      [_m3],
      [0]
    ];
    n0_registry4.registerError(RegionDisabledException$, RegionDisabledException);
    errorTypeRegistries4 = [
      _s_registry4,
      n0_registry4
    ];
    accessKeySecretType = [0, n04, _aKST, 8, 0];
    clientTokenType = [0, n04, _cTT, 8, 0];
    AssumedRoleUser$ = [
      3,
      n04,
      _ARU,
      0,
      [_ARI, _A2],
      [0, 0],
      2
    ];
    AssumeRoleRequest$ = [
      3,
      n04,
      _ARR,
      0,
      [_RA2, _RSN, _PA, _P, _DS, _T2, _TTK, _EI, _SN, _TC, _SI2, _PC, _MSTS],
      [0, 0, () => policyDescriptorListType, 0, 1, () => tagListType, 64 | 0, 0, 0, 0, 0, () => ProvidedContextsListType, 1],
      2
    ];
    AssumeRoleResponse$ = [
      3,
      n04,
      _ARRs,
      0,
      [_C2, _ARU, _PPS, _SI2, _STU, _STS],
      [[() => Credentials$, 0], () => AssumedRoleUser$, 1, 0, 1, 1]
    ];
    AssumeRoleWithWebIdentityRequest$ = [
      3,
      n04,
      _ARWWIR,
      0,
      [_RA2, _RSN, _WIT, _PI, _PA, _P, _DS, _MSTS],
      [0, 0, [() => clientTokenType, 0], 0, () => policyDescriptorListType, 0, 1, 1],
      3
    ];
    AssumeRoleWithWebIdentityResponse$ = [
      3,
      n04,
      _ARWWIRs,
      0,
      [_C2, _SFWIT, _ARU, _PPS, _Pr2, _Au, _SI2, _STU, _STS],
      [[() => Credentials$, 0], 0, () => AssumedRoleUser$, 1, 0, 0, 0, 1, 1]
    ];
    Credentials$ = [
      3,
      n04,
      _C2,
      0,
      [_AKI, _SAK, _ST, _E],
      [0, [() => accessKeySecretType, 0], 0, 4],
      4
    ];
    PolicyDescriptorType$ = [
      3,
      n04,
      _PDT,
      0,
      [_a],
      [0]
    ];
    ProvidedContext$ = [
      3,
      n04,
      _PCr,
      0,
      [_PAr, _CA],
      [0, 0]
    ];
    Tag$ = [
      3,
      n04,
      _Ta,
      0,
      [_K2, _V2],
      [0, 0],
      2
    ];
    policyDescriptorListType = [
      1,
      n04,
      _pDLT,
      0,
      () => PolicyDescriptorType$
    ];
    ProvidedContextsListType = [
      1,
      n04,
      _PCLT,
      0,
      () => ProvidedContext$
    ];
    tagKeyListType = 64 | 0;
    tagListType = [
      1,
      n04,
      _tLT,
      0,
      () => Tag$
    ];
    AssumeRole$ = [
      9,
      n04,
      _AR,
      0,
      () => AssumeRoleRequest$,
      () => AssumeRoleResponse$
    ];
    AssumeRoleWithWebIdentity$ = [
      9,
      n04,
      _ARWWI,
      0,
      () => AssumeRoleWithWebIdentityRequest$,
      () => AssumeRoleWithWebIdentityResponse$
    ];
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/runtimeConfig.shared.js
var getRuntimeConfig5;
var init_runtimeConfig_shared3 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/runtimeConfig.shared.js"() {
    init_httpAuthSchemes2();
    init_protocols2();
    init_dist_es11();
    init_dist_es2();
    init_checksum3();
    init_client2();
    init_protocols();
    init_serde();
    init_httpAuthSchemeProvider3();
    init_endpointResolver3();
    init_schemas_03();
    getRuntimeConfig5 = /* @__PURE__ */ __name((config) => {
      return {
        apiVersion: "2011-06-15",
        base64Decoder: config?.base64Decoder ?? fromBase64,
        base64Encoder: config?.base64Encoder ?? toBase64,
        disableHostPrefix: config?.disableHostPrefix ?? false,
        endpointProvider: config?.endpointProvider ?? defaultEndpointResolver3,
        extensions: config?.extensions ?? [],
        httpAuthSchemeProvider: config?.httpAuthSchemeProvider ?? defaultSTSHttpAuthSchemeProvider,
        httpAuthSchemes: config?.httpAuthSchemes ?? [
          {
            schemeId: "aws.auth#sigv4",
            identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("aws.auth#sigv4"), "identityProvider"),
            signer: new AwsSdkSigV4Signer()
          },
          {
            schemeId: "aws.auth#sigv4a",
            identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("aws.auth#sigv4a"), "identityProvider"),
            signer: new AwsSdkSigV4ASigner()
          },
          {
            schemeId: "smithy.api#noAuth",
            identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("smithy.api#noAuth") || (async () => ({})), "identityProvider"),
            signer: new NoAuthSigner()
          }
        ],
        logger: config?.logger ?? new NoOpLogger(),
        protocol: config?.protocol ?? AwsQueryProtocol,
        protocolSettings: config?.protocolSettings ?? {
          defaultNamespace: "com.amazonaws.sts",
          errorTypeRegistries: errorTypeRegistries4,
          xmlNamespace: "https://sts.amazonaws.com/doc/2011-06-15/",
          version: "2011-06-15",
          serviceTarget: "AWSSecurityTokenServiceV20110615"
        },
        serviceId: config?.serviceId ?? "STS",
        sha256: config?.sha256 ?? Sha256Node,
        signerConstructor: config?.signerConstructor ?? SignatureV4MultiRegion,
        urlParser: config?.urlParser ?? parseUrl,
        utf8Decoder: config?.utf8Decoder ?? fromUtf8,
        utf8Encoder: config?.utf8Encoder ?? toUtf8
      };
    }, "getRuntimeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/runtimeConfig.js
var getRuntimeConfig6;
var init_runtimeConfig3 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/runtimeConfig.js"() {
    init_package();
    init_client3();
    init_httpAuthSchemes2();
    init_dist_es2();
    init_client2();
    init_config2();
    init_retry2();
    init_serde();
    init_dist_es6();
    init_runtimeConfig_shared3();
    getRuntimeConfig6 = /* @__PURE__ */ __name((config) => {
      emitWarningIfUnsupportedVersion(process.version);
      const defaultsMode = resolveDefaultsModeConfig(config);
      const defaultConfigProvider = /* @__PURE__ */ __name(() => defaultsMode().then(loadConfigsForDefaultMode), "defaultConfigProvider");
      const clientSharedValues = getRuntimeConfig5(config);
      emitWarningIfUnsupportedVersion2(process.version);
      const loaderConfig = {
        profile: config?.profile,
        logger: clientSharedValues.logger
      };
      return {
        ...clientSharedValues,
        ...config,
        runtime: "node",
        defaultsMode,
        authSchemePreference: config?.authSchemePreference ?? loadConfig(NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, loaderConfig),
        bodyLengthChecker: config?.bodyLengthChecker ?? calculateBodyLength,
        defaultUserAgentProvider: config?.defaultUserAgentProvider ?? createDefaultUserAgentProvider({ serviceId: clientSharedValues.serviceId, clientVersion: package_default2.version }),
        httpAuthSchemes: config?.httpAuthSchemes ?? [
          {
            schemeId: "aws.auth#sigv4",
            identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("aws.auth#sigv4") || (async (idProps) => await config.credentialDefaultProvider(idProps?.__config || {})()), "identityProvider"),
            signer: new AwsSdkSigV4Signer()
          },
          {
            schemeId: "aws.auth#sigv4a",
            identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("aws.auth#sigv4a"), "identityProvider"),
            signer: new AwsSdkSigV4ASigner()
          },
          {
            schemeId: "smithy.api#noAuth",
            identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("smithy.api#noAuth") || (async () => ({})), "identityProvider"),
            signer: new NoAuthSigner()
          }
        ],
        maxAttempts: config?.maxAttempts ?? loadConfig(NODE_MAX_ATTEMPT_CONFIG_OPTIONS, config),
        region: config?.region ?? loadConfig(NODE_REGION_CONFIG_OPTIONS, { ...NODE_REGION_CONFIG_FILE_OPTIONS, ...loaderConfig }),
        requestHandler: NodeHttpHandler.create(config?.requestHandler ?? defaultConfigProvider),
        retryMode: config?.retryMode ?? loadConfig({
          ...NODE_RETRY_MODE_CONFIG_OPTIONS,
          default: /* @__PURE__ */ __name(async () => (await defaultConfigProvider()).retryMode || DEFAULT_RETRY_MODE, "default")
        }, config),
        sigv4aSigningRegionSet: config?.sigv4aSigningRegionSet ?? loadConfig(NODE_SIGV4A_CONFIG_OPTIONS, loaderConfig),
        streamCollector: config?.streamCollector ?? streamCollector2,
        useDualstackEndpoint: config?.useDualstackEndpoint ?? loadConfig(NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
        useFipsEndpoint: config?.useFipsEndpoint ?? loadConfig(NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
        userAgentAppId: config?.userAgentAppId ?? loadConfig(NODE_APP_ID_CONFIG_OPTIONS, loaderConfig)
      };
    }, "getRuntimeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/auth/httpAuthExtensionConfiguration.js
var getHttpAuthExtensionConfiguration3, resolveHttpAuthRuntimeConfig3;
var init_httpAuthExtensionConfiguration3 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/auth/httpAuthExtensionConfiguration.js"() {
    getHttpAuthExtensionConfiguration3 = /* @__PURE__ */ __name((runtimeConfig) => {
      const _httpAuthSchemes = runtimeConfig.httpAuthSchemes;
      let _httpAuthSchemeProvider = runtimeConfig.httpAuthSchemeProvider;
      let _credentials = runtimeConfig.credentials;
      return {
        setHttpAuthScheme(httpAuthScheme) {
          const index = _httpAuthSchemes.findIndex((scheme) => scheme.schemeId === httpAuthScheme.schemeId);
          if (index === -1) {
            _httpAuthSchemes.push(httpAuthScheme);
          } else {
            _httpAuthSchemes.splice(index, 1, httpAuthScheme);
          }
        },
        httpAuthSchemes() {
          return _httpAuthSchemes;
        },
        setHttpAuthSchemeProvider(httpAuthSchemeProvider) {
          _httpAuthSchemeProvider = httpAuthSchemeProvider;
        },
        httpAuthSchemeProvider() {
          return _httpAuthSchemeProvider;
        },
        setCredentials(credentials) {
          _credentials = credentials;
        },
        credentials() {
          return _credentials;
        }
      };
    }, "getHttpAuthExtensionConfiguration");
    resolveHttpAuthRuntimeConfig3 = /* @__PURE__ */ __name((config) => {
      return {
        httpAuthSchemes: config.httpAuthSchemes(),
        httpAuthSchemeProvider: config.httpAuthSchemeProvider(),
        credentials: config.credentials()
      };
    }, "resolveHttpAuthRuntimeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/runtimeExtensions.js
var resolveRuntimeExtensions3;
var init_runtimeExtensions3 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/runtimeExtensions.js"() {
    init_client3();
    init_client2();
    init_protocols();
    init_httpAuthExtensionConfiguration3();
    resolveRuntimeExtensions3 = /* @__PURE__ */ __name((runtimeConfig, extensions) => {
      const extensionConfiguration = Object.assign(getAwsRegionExtensionConfiguration(runtimeConfig), getDefaultExtensionConfiguration(runtimeConfig), getHttpHandlerExtensionConfiguration(runtimeConfig), getHttpAuthExtensionConfiguration3(runtimeConfig));
      extensions.forEach((extension) => extension.configure(extensionConfiguration));
      return Object.assign(runtimeConfig, resolveAwsRegionExtensionConfiguration(extensionConfiguration), resolveDefaultRuntimeConfig2(extensionConfiguration), resolveHttpHandlerRuntimeConfig(extensionConfiguration), resolveHttpAuthRuntimeConfig3(extensionConfiguration));
    }, "resolveRuntimeExtensions");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/STSClient.js
var STSClient;
var init_STSClient = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/STSClient.js"() {
    init_client3();
    init_dist_es2();
    init_client2();
    init_config2();
    init_endpoints();
    init_protocols();
    init_retry2();
    init_schema();
    init_httpAuthSchemeProvider3();
    init_EndpointParameters3();
    init_runtimeConfig3();
    init_runtimeExtensions3();
    STSClient = class extends Client {
      static {
        __name(this, "STSClient");
      }
      config;
      constructor(...[configuration]) {
        const _config_0 = getRuntimeConfig6(configuration || {});
        super(_config_0);
        this.initConfig = _config_0;
        const _config_1 = resolveClientEndpointParameters4(_config_0);
        const _config_2 = resolveUserAgentConfig(_config_1);
        const _config_3 = resolveRetryConfig(_config_2);
        const _config_4 = resolveRegionConfig(_config_3);
        const _config_5 = resolveHostHeaderConfig(_config_4);
        const _config_6 = resolveEndpointConfig(_config_5);
        const _config_7 = resolveHttpAuthSchemeConfig4(_config_6);
        const _config_8 = resolveRuntimeExtensions3(_config_7, configuration?.extensions || []);
        this.config = _config_8;
        this.middlewareStack.use(getSchemaSerdePlugin(this.config));
        this.middlewareStack.use(getUserAgentPlugin(this.config));
        this.middlewareStack.use(getRetryPlugin(this.config));
        this.middlewareStack.use(getContentLengthPlugin(this.config));
        this.middlewareStack.use(getHostHeaderPlugin(this.config));
        this.middlewareStack.use(getLoggerPlugin(this.config));
        this.middlewareStack.use(getRecursionDetectionPlugin(this.config));
        this.middlewareStack.use(getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
          httpAuthSchemeParametersProvider: defaultSTSHttpAuthSchemeParametersProvider,
          identityProviderConfigProvider: /* @__PURE__ */ __name(async (config) => new DefaultIdentityProviderConfig({
            "aws.auth#sigv4": config.credentials,
            "aws.auth#sigv4a": config.credentials
          }), "identityProviderConfigProvider")
        }));
        this.middlewareStack.use(getHttpSigningPlugin(this.config));
      }
      destroy() {
        super.destroy();
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/commandBuilder.js
var command4, _ep04, _mw04;
var init_commandBuilder3 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/commandBuilder.js"() {
    init_client2();
    init_endpoints();
    init_EndpointParameters3();
    command4 = makeBuilder(commonParams4, "AWSSecurityTokenServiceV20110615", "STSClient", getEndpointPlugin);
    _ep04 = {};
    _mw04 = /* @__PURE__ */ __name((Command2, cs, config, o4) => [], "_mw0");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/commands/AssumeRoleCommand.js
var AssumeRoleCommand;
var init_AssumeRoleCommand = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/commands/AssumeRoleCommand.js"() {
    init_commandBuilder3();
    init_schemas_03();
    AssumeRoleCommand = class extends command4(_ep04, _mw04, "AssumeRole", AssumeRole$) {
      static {
        __name(this, "AssumeRoleCommand");
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/commands/AssumeRoleWithWebIdentityCommand.js
var AssumeRoleWithWebIdentityCommand;
var init_AssumeRoleWithWebIdentityCommand = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/commands/AssumeRoleWithWebIdentityCommand.js"() {
    init_commandBuilder3();
    init_schemas_03();
    AssumeRoleWithWebIdentityCommand = class extends command4(_ep04, _mw04, "AssumeRoleWithWebIdentity", AssumeRoleWithWebIdentity$) {
      static {
        __name(this, "AssumeRoleWithWebIdentityCommand");
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/STS.js
var commands3, STS;
var init_STS = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/STS.js"() {
    init_client2();
    init_AssumeRoleCommand();
    init_AssumeRoleWithWebIdentityCommand();
    init_STSClient();
    commands3 = {
      AssumeRoleCommand,
      AssumeRoleWithWebIdentityCommand
    };
    STS = class extends STSClient {
      static {
        __name(this, "STS");
      }
    };
    createAggregatedClient(commands3, STS);
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/commands/index.js
var init_commands3 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/commands/index.js"() {
    init_AssumeRoleCommand();
    init_AssumeRoleWithWebIdentityCommand();
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/models/models_0.js
var init_models_03 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/models/models_0.js"() {
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/defaultStsRoleAssumers.js
var getAccountIdFromAssumedRoleUser, resolveRegion, getDefaultRoleAssumer, getDefaultRoleAssumerWithWebIdentity, isH2;
var init_defaultStsRoleAssumers = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/defaultStsRoleAssumers.js"() {
    init_client3();
    init_AssumeRoleCommand();
    init_AssumeRoleWithWebIdentityCommand();
    getAccountIdFromAssumedRoleUser = /* @__PURE__ */ __name((assumedRoleUser) => {
      if (typeof assumedRoleUser?.Arn === "string") {
        const arnComponents = assumedRoleUser.Arn.split(":");
        if (arnComponents.length > 4 && arnComponents[4] !== "") {
          return arnComponents[4];
        }
      }
      return void 0;
    }, "getAccountIdFromAssumedRoleUser");
    resolveRegion = /* @__PURE__ */ __name(async (_region, _parentRegion, credentialProviderLogger, loaderConfig = {}) => {
      const region = typeof _region === "function" ? await _region() : _region;
      const parentRegion = typeof _parentRegion === "function" ? await _parentRegion() : _parentRegion;
      let stsDefaultRegion = "";
      const resolvedRegion = region ?? parentRegion ?? (stsDefaultRegion = await stsRegionDefaultResolver(loaderConfig)());
      credentialProviderLogger?.debug?.("@aws-sdk/client-sts::resolveRegion", "accepting first of:", `${region} (credential provider clientConfig)`, `${parentRegion} (contextual client)`, `${stsDefaultRegion} (STS default: AWS_REGION, profile region, or us-east-1)`);
      return resolvedRegion;
    }, "resolveRegion");
    getDefaultRoleAssumer = /* @__PURE__ */ __name((stsOptions, STSClient2) => {
      let stsClient;
      let closureSourceCreds;
      return async (sourceCreds, params) => {
        closureSourceCreds = sourceCreds;
        if (!stsClient) {
          const { logger: logger2 = stsOptions?.parentClientConfig?.logger, profile = stsOptions?.parentClientConfig?.profile, region, requestHandler = stsOptions?.parentClientConfig?.requestHandler, credentialProviderLogger, userAgentAppId = stsOptions?.parentClientConfig?.userAgentAppId } = stsOptions;
          const resolvedRegion = await resolveRegion(region, stsOptions?.parentClientConfig?.region, credentialProviderLogger, {
            logger: logger2,
            profile
          });
          const isCompatibleRequestHandler = !isH2(requestHandler);
          stsClient = new STSClient2({
            ...stsOptions,
            userAgentAppId,
            profile,
            credentialDefaultProvider: /* @__PURE__ */ __name(() => async () => closureSourceCreds, "credentialDefaultProvider"),
            region: resolvedRegion,
            requestHandler: isCompatibleRequestHandler ? requestHandler : void 0,
            logger: logger2
          });
        }
        const { Credentials, AssumedRoleUser } = await stsClient.send(new AssumeRoleCommand(params));
        if (!Credentials || !Credentials.AccessKeyId || !Credentials.SecretAccessKey) {
          throw new Error(`Invalid response from STS.assumeRole call with role ${params.RoleArn}`);
        }
        const accountId = getAccountIdFromAssumedRoleUser(AssumedRoleUser);
        const credentials = {
          accessKeyId: Credentials.AccessKeyId,
          secretAccessKey: Credentials.SecretAccessKey,
          sessionToken: Credentials.SessionToken,
          expiration: Credentials.Expiration,
          ...Credentials.CredentialScope && { credentialScope: Credentials.CredentialScope },
          ...accountId && { accountId }
        };
        setCredentialFeature(credentials, "CREDENTIALS_STS_ASSUME_ROLE", "i");
        return credentials;
      };
    }, "getDefaultRoleAssumer");
    getDefaultRoleAssumerWithWebIdentity = /* @__PURE__ */ __name((stsOptions, STSClient2) => {
      let stsClient;
      return async (params) => {
        if (!stsClient) {
          const { logger: logger2 = stsOptions?.parentClientConfig?.logger, profile = stsOptions?.parentClientConfig?.profile, region, requestHandler = stsOptions?.parentClientConfig?.requestHandler, credentialProviderLogger, userAgentAppId = stsOptions?.parentClientConfig?.userAgentAppId } = stsOptions;
          const resolvedRegion = await resolveRegion(region, stsOptions?.parentClientConfig?.region, credentialProviderLogger, {
            logger: logger2,
            profile
          });
          const isCompatibleRequestHandler = !isH2(requestHandler);
          stsClient = new STSClient2({
            ...stsOptions,
            userAgentAppId,
            profile,
            region: resolvedRegion,
            requestHandler: isCompatibleRequestHandler ? requestHandler : void 0,
            logger: logger2
          });
        }
        const { Credentials, AssumedRoleUser } = await stsClient.send(new AssumeRoleWithWebIdentityCommand(params));
        if (!Credentials || !Credentials.AccessKeyId || !Credentials.SecretAccessKey) {
          throw new Error(`Invalid response from STS.assumeRoleWithWebIdentity call with role ${params.RoleArn}`);
        }
        const accountId = getAccountIdFromAssumedRoleUser(AssumedRoleUser);
        const credentials = {
          accessKeyId: Credentials.AccessKeyId,
          secretAccessKey: Credentials.SecretAccessKey,
          sessionToken: Credentials.SessionToken,
          expiration: Credentials.Expiration,
          ...Credentials.CredentialScope && { credentialScope: Credentials.CredentialScope },
          ...accountId && { accountId }
        };
        if (accountId) {
          setCredentialFeature(credentials, "RESOLVED_ACCOUNT_ID", "T");
        }
        setCredentialFeature(credentials, "CREDENTIALS_STS_ASSUME_ROLE_WEB_ID", "k");
        return credentials;
      };
    }, "getDefaultRoleAssumerWithWebIdentity");
    isH2 = /* @__PURE__ */ __name((requestHandler) => {
      return requestHandler?.metadata?.handlerProtocol === "h2";
    }, "isH2");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/defaultRoleAssumers.js
var getCustomizableStsClientCtor, getDefaultRoleAssumer2, getDefaultRoleAssumerWithWebIdentity2, decorateDefaultCredentialProvider;
var init_defaultRoleAssumers = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/defaultRoleAssumers.js"() {
    init_defaultStsRoleAssumers();
    init_STSClient();
    getCustomizableStsClientCtor = /* @__PURE__ */ __name((baseCtor, customizations) => {
      if (!customizations)
        return baseCtor;
      else
        return class CustomizableSTSClient extends baseCtor {
          static {
            __name(this, "CustomizableSTSClient");
          }
          constructor(config) {
            super(config);
            for (const customization of customizations) {
              this.middlewareStack.use(customization);
            }
          }
        };
    }, "getCustomizableStsClientCtor");
    getDefaultRoleAssumer2 = /* @__PURE__ */ __name((stsOptions = {}, stsPlugins) => getDefaultRoleAssumer(stsOptions, getCustomizableStsClientCtor(STSClient, stsPlugins)), "getDefaultRoleAssumer");
    getDefaultRoleAssumerWithWebIdentity2 = /* @__PURE__ */ __name((stsOptions = {}, stsPlugins) => getDefaultRoleAssumerWithWebIdentity(stsOptions, getCustomizableStsClientCtor(STSClient, stsPlugins)), "getDefaultRoleAssumerWithWebIdentity");
    decorateDefaultCredentialProvider = /* @__PURE__ */ __name((provider) => (input) => provider({
      roleAssumer: getDefaultRoleAssumer2(input),
      roleAssumerWithWebIdentity: getDefaultRoleAssumerWithWebIdentity2(input),
      ...input
    }), "decorateDefaultCredentialProvider");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/index.js
var sts_exports = {};
__export(sts_exports, {
  $Command: () => Command,
  AssumeRole$: () => AssumeRole$,
  AssumeRoleCommand: () => AssumeRoleCommand,
  AssumeRoleRequest$: () => AssumeRoleRequest$,
  AssumeRoleResponse$: () => AssumeRoleResponse$,
  AssumeRoleWithWebIdentity$: () => AssumeRoleWithWebIdentity$,
  AssumeRoleWithWebIdentityCommand: () => AssumeRoleWithWebIdentityCommand,
  AssumeRoleWithWebIdentityRequest$: () => AssumeRoleWithWebIdentityRequest$,
  AssumeRoleWithWebIdentityResponse$: () => AssumeRoleWithWebIdentityResponse$,
  AssumedRoleUser$: () => AssumedRoleUser$,
  Credentials$: () => Credentials$,
  ExpiredTokenException: () => ExpiredTokenException2,
  ExpiredTokenException$: () => ExpiredTokenException$2,
  IDPCommunicationErrorException: () => IDPCommunicationErrorException,
  IDPCommunicationErrorException$: () => IDPCommunicationErrorException$,
  IDPRejectedClaimException: () => IDPRejectedClaimException,
  IDPRejectedClaimException$: () => IDPRejectedClaimException$,
  InvalidIdentityTokenException: () => InvalidIdentityTokenException,
  InvalidIdentityTokenException$: () => InvalidIdentityTokenException$,
  MalformedPolicyDocumentException: () => MalformedPolicyDocumentException,
  MalformedPolicyDocumentException$: () => MalformedPolicyDocumentException$,
  PackedPolicyTooLargeException: () => PackedPolicyTooLargeException,
  PackedPolicyTooLargeException$: () => PackedPolicyTooLargeException$,
  PolicyDescriptorType$: () => PolicyDescriptorType$,
  ProvidedContext$: () => ProvidedContext$,
  RegionDisabledException: () => RegionDisabledException,
  RegionDisabledException$: () => RegionDisabledException$,
  STS: () => STS,
  STSClient: () => STSClient,
  STSServiceException: () => STSServiceException,
  STSServiceException$: () => STSServiceException$,
  Tag$: () => Tag$,
  __Client: () => Client,
  decorateDefaultCredentialProvider: () => decorateDefaultCredentialProvider,
  errorTypeRegistries: () => errorTypeRegistries4,
  getDefaultRoleAssumer: () => getDefaultRoleAssumer2,
  getDefaultRoleAssumerWithWebIdentity: () => getDefaultRoleAssumerWithWebIdentity2
});
var init_sts = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/index.js"() {
    init_STSClient();
    init_STS();
    init_commands3();
    init_client2();
    init_schemas_03();
    init_errors3();
    init_models_03();
    init_defaultRoleAssumers();
    init_STSServiceException();
  }
});

// node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveAssumeRoleCredentials.js
var isAssumeRoleProfile, isAssumeRoleWithSourceProfile, isCredentialSourceProfile, resolveAssumeRoleCredentials, isCredentialSourceWithoutRoleArn;
var init_resolveAssumeRoleCredentials = __esm({
  "node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveAssumeRoleCredentials.js"() {
    init_client3();
    init_config2();
    init_resolveCredentialSource();
    isAssumeRoleProfile = /* @__PURE__ */ __name((arg, { profile = "default", logger: logger2 } = {}) => {
      return Boolean(arg) && typeof arg === "object" && typeof arg.role_arn === "string" && ["undefined", "string"].indexOf(typeof arg.role_session_name) > -1 && ["undefined", "string"].indexOf(typeof arg.external_id) > -1 && ["undefined", "string"].indexOf(typeof arg.mfa_serial) > -1 && (isAssumeRoleWithSourceProfile(arg, { profile, logger: logger2 }) || isCredentialSourceProfile(arg, { profile, logger: logger2 }));
    }, "isAssumeRoleProfile");
    isAssumeRoleWithSourceProfile = /* @__PURE__ */ __name((arg, { profile, logger: logger2 }) => {
      const withSourceProfile = typeof arg.source_profile === "string" && typeof arg.credential_source === "undefined";
      if (withSourceProfile) {
        logger2?.debug?.(`    ${profile} isAssumeRoleWithSourceProfile source_profile=${arg.source_profile}`);
      }
      return withSourceProfile;
    }, "isAssumeRoleWithSourceProfile");
    isCredentialSourceProfile = /* @__PURE__ */ __name((arg, { profile, logger: logger2 }) => {
      const withProviderProfile = typeof arg.credential_source === "string" && typeof arg.source_profile === "undefined";
      if (withProviderProfile) {
        logger2?.debug?.(`    ${profile} isCredentialSourceProfile credential_source=${arg.credential_source}`);
      }
      return withProviderProfile;
    }, "isCredentialSourceProfile");
    resolveAssumeRoleCredentials = /* @__PURE__ */ __name(async (profileName, profiles, options, callerClientConfig, visitedProfiles = {}, resolveProfileData2) => {
      options.logger?.debug("@aws-sdk/credential-provider-ini - resolveAssumeRoleCredentials (STS)");
      const profileData = profiles[profileName];
      const { source_profile, region } = profileData;
      if (!options.roleAssumer) {
        const { getDefaultRoleAssumer: getDefaultRoleAssumer3 } = await Promise.resolve().then(() => (init_sts(), sts_exports));
        options.roleAssumer = getDefaultRoleAssumer3({
          ...options.clientConfig,
          credentialProviderLogger: options.logger,
          parentClientConfig: {
            ...callerClientConfig,
            ...options?.parentClientConfig,
            region: region ?? options?.parentClientConfig?.region ?? callerClientConfig?.region
          }
        }, options.clientPlugins);
      }
      if (source_profile && source_profile in visitedProfiles) {
        throw new CredentialsProviderError(`Detected a cycle attempting to resolve credentials for profile ${getProfileName(options)}. Profiles visited: ` + Object.keys(visitedProfiles).join(", "), { logger: options.logger });
      }
      options.logger?.debug(`@aws-sdk/credential-provider-ini - finding credential resolver using ${source_profile ? `source_profile=[${source_profile}]` : `profile=[${profileName}]`}`);
      const sourceCredsProvider = source_profile ? resolveProfileData2(source_profile, profiles, options, callerClientConfig, {
        ...visitedProfiles,
        [source_profile]: true
      }, isCredentialSourceWithoutRoleArn(profiles[source_profile] ?? {})) : (await resolveCredentialSource(profileData.credential_source, profileName, options.logger)(options))();
      if (isCredentialSourceWithoutRoleArn(profileData)) {
        return sourceCredsProvider.then((creds) => setCredentialFeature(creds, "CREDENTIALS_PROFILE_SOURCE_PROFILE", "o"));
      } else {
        const params = {
          RoleArn: profileData.role_arn,
          RoleSessionName: profileData.role_session_name || `aws-sdk-js-${Date.now()}`,
          ExternalId: profileData.external_id,
          DurationSeconds: parseInt(profileData.duration_seconds || "3600", 10)
        };
        const { mfa_serial } = profileData;
        if (mfa_serial) {
          if (!options.mfaCodeProvider) {
            throw new CredentialsProviderError(`Profile ${profileName} requires multi-factor authentication, but no MFA code callback was provided.`, { logger: options.logger, tryNextLink: false });
          }
          params.SerialNumber = mfa_serial;
          params.TokenCode = await options.mfaCodeProvider(mfa_serial);
        }
        const sourceCreds = await sourceCredsProvider;
        return options.roleAssumer(sourceCreds, params).then((creds) => setCredentialFeature(creds, "CREDENTIALS_PROFILE_SOURCE_PROFILE", "o"));
      }
    }, "resolveAssumeRoleCredentials");
    isCredentialSourceWithoutRoleArn = /* @__PURE__ */ __name((section) => {
      return !section.role_arn && !!section.credential_source;
    }, "isCredentialSourceWithoutRoleArn");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/auth/httpAuthSchemeProvider.js
function createAwsAuthSigv4HttpAuthOption5(authParameters) {
  return {
    schemeId: "aws.auth#sigv4",
    signingProperties: {
      name: "signin",
      region: authParameters.region
    },
    propertiesExtractor: /* @__PURE__ */ __name((config, context) => ({
      signingProperties: {
        config,
        context
      }
    }), "propertiesExtractor")
  };
}
function createSmithyApiNoAuthHttpAuthOption4(authParameters) {
  return {
    schemeId: "smithy.api#noAuth"
  };
}
var defaultSigninHttpAuthSchemeParametersProvider, defaultSigninHttpAuthSchemeProvider, resolveHttpAuthSchemeConfig5;
var init_httpAuthSchemeProvider4 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/auth/httpAuthSchemeProvider.js"() {
    init_httpAuthSchemes2();
    init_client2();
    defaultSigninHttpAuthSchemeParametersProvider = /* @__PURE__ */ __name(async (config, context, input) => {
      return {
        operation: getSmithyContext(context).operation,
        region: await normalizeProvider(config.region)() || (() => {
          throw new Error("expected `region` to be configured for `aws.auth#sigv4`");
        })()
      };
    }, "defaultSigninHttpAuthSchemeParametersProvider");
    __name(createAwsAuthSigv4HttpAuthOption5, "createAwsAuthSigv4HttpAuthOption");
    __name(createSmithyApiNoAuthHttpAuthOption4, "createSmithyApiNoAuthHttpAuthOption");
    defaultSigninHttpAuthSchemeProvider = /* @__PURE__ */ __name((authParameters) => {
      const options = [];
      switch (authParameters.operation) {
        case "CreateOAuth2Token":
          {
            options.push(createSmithyApiNoAuthHttpAuthOption4(authParameters));
            break;
          }
          ;
        default: {
          options.push(createAwsAuthSigv4HttpAuthOption5(authParameters));
        }
      }
      return options;
    }, "defaultSigninHttpAuthSchemeProvider");
    resolveHttpAuthSchemeConfig5 = /* @__PURE__ */ __name((config) => {
      const config_0 = resolveAwsSdkSigV4Config(config);
      return Object.assign(config_0, {
        authSchemePreference: normalizeProvider(config.authSchemePreference ?? [])
      });
    }, "resolveHttpAuthSchemeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/endpoint/EndpointParameters.js
var resolveClientEndpointParameters5, commonParams5;
var init_EndpointParameters4 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/endpoint/EndpointParameters.js"() {
    resolveClientEndpointParameters5 = /* @__PURE__ */ __name((options) => {
      return Object.assign(options, {
        useDualstackEndpoint: options.useDualstackEndpoint ?? false,
        useFipsEndpoint: options.useFipsEndpoint ?? false,
        defaultSigningName: "signin"
      });
    }, "resolveClientEndpointParameters");
    commonParams5 = {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/endpoint/bdd.js
var s, a4, b4, c4, d4, e4, f4, g4, h4, i4, j4, k4, l2, m2, n2, o2, p2, q2, _data4, root4, r4, nodes4, bdd4;
var init_bdd4 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/endpoint/bdd.js"() {
    init_endpoints();
    s = "ref";
    a4 = -1;
    b4 = false;
    c4 = true;
    d4 = "isSet";
    e4 = "booleanEquals";
    f4 = "coalesce";
    g4 = "PartitionResult";
    h4 = "stringEquals";
    i4 = "getAttr";
    j4 = "https://signin.{Region}.{PartitionResult#dualStackDnsSuffix}";
    k4 = { [s]: "Endpoint" };
    l2 = { "fn": i4, "argv": [{ [s]: g4 }, "name"] };
    m2 = { [s]: "Region" };
    n2 = { [s]: g4 };
    o2 = { "authSchemes": [{ "name": "sigv4", "signingName": "signin", "signingRegion": "{Region}" }] };
    p2 = {};
    q2 = [m2];
    _data4 = {
      conditions: [
        [d4, q2],
        [e4, [{ fn: f4, argv: [{ [s]: "IsControlPlane" }, b4] }, c4]],
        [d4, [k4]],
        ["aws.partition", q2, g4],
        [e4, [{ [s]: "UseFIPS" }, c4]],
        [h4, [l2, "aws"]],
        [e4, [{ fn: f4, argv: [{ [s]: "IsOAuthEndpoint" }, b4] }, c4]],
        [e4, [{ [s]: "UseDualStack" }, c4]],
        [h4, [l2, "aws-cn"]],
        [h4, [m2, "us-gov-west-1"]],
        [h4, [l2, "aws-us-gov"]],
        [e4, [{ fn: i4, argv: [n2, "supportsFIPS"] }, c4]],
        [h4, [l2, "aws-iso"]],
        [h4, [l2, "aws-iso-b"]],
        [h4, [l2, "aws-iso-f"]],
        [h4, [l2, "aws-iso-e"]],
        [h4, [l2, "aws-eusc"]],
        [e4, [{ fn: i4, argv: [n2, "supportsDualStack"] }, c4]]
      ],
      results: [
        [a4],
        ["https://signin.{Region}.api.aws", o2],
        ["https://signin.{Region}.api.amazonwebservices.com.cn", o2],
        [j4, o2],
        [a4, "FIPS endpoints are not supported for OAuth operations. Disable FIPS or use a non-OAuth operation."],
        ["https://{Region}.oauth.signin.aws", o2],
        ["https://{Region}.signin.aws.amazon.com", p2],
        ["https://{Region}.signin.amazonaws.cn", p2],
        ["https://{Region}.signin.amazonaws-us-gov.com", p2],
        ["https://{Region}.signin.c2shome.ic.gov", p2],
        ["https://{Region}.signin.sc2shome.sgov.gov", p2],
        ["https://{Region}.signin.csphome.hci.ic.gov", p2],
        ["https://{Region}.signin.csphome.adc-e.uk", p2],
        ["https://{Region}.signin.amazonaws-eusc.eu", p2],
        ["https://signin-fips.amazonaws-us-gov.com", p2],
        ["https://{Region}.signin-fips.amazonaws-us-gov.com", p2],
        ["https://{Region}.signin.{PartitionResult#dnsSuffix}", p2],
        [a4, "Invalid Configuration: FIPS and custom endpoint are not supported"],
        [a4, "Invalid Configuration: Dualstack and custom endpoint are not supported"],
        [k4, p2],
        ["https://signin-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", p2],
        [a4, "FIPS and DualStack are enabled, but this partition does not support one or both"],
        ["https://signin-fips.{Region}.{PartitionResult#dnsSuffix}", p2],
        [a4, "FIPS is enabled but this partition does not support FIPS"],
        [j4, p2],
        [a4, "DualStack is enabled but this partition does not support DualStack"],
        ["https://signin.{Region}.{PartitionResult#dnsSuffix}", p2],
        [a4, "Invalid Configuration: Missing Region"]
      ]
    };
    root4 = 2;
    r4 = 1e8;
    nodes4 = new Int32Array([
      -1,
      1,
      -1,
      0,
      6,
      3,
      2,
      36,
      4,
      4,
      5,
      r4 + 27,
      6,
      r4 + 4,
      r4 + 27,
      1,
      29,
      7,
      2,
      36,
      8,
      3,
      9,
      31,
      4,
      22,
      10,
      5,
      19,
      11,
      7,
      21,
      12,
      8,
      r4 + 7,
      13,
      10,
      r4 + 8,
      14,
      12,
      r4 + 9,
      15,
      13,
      r4 + 10,
      16,
      14,
      r4 + 11,
      17,
      15,
      r4 + 12,
      18,
      16,
      r4 + 13,
      r4 + 16,
      6,
      r4 + 5,
      20,
      7,
      21,
      r4 + 6,
      17,
      r4 + 24,
      r4 + 25,
      6,
      r4 + 4,
      23,
      7,
      27,
      24,
      9,
      r4 + 14,
      25,
      10,
      r4 + 15,
      26,
      11,
      r4 + 22,
      r4 + 23,
      11,
      28,
      r4 + 21,
      17,
      r4 + 20,
      r4 + 21,
      2,
      35,
      30,
      3,
      39,
      31,
      4,
      32,
      r4 + 27,
      6,
      r4 + 4,
      33,
      7,
      r4 + 27,
      34,
      9,
      r4 + 14,
      r4 + 27,
      3,
      39,
      36,
      4,
      38,
      37,
      7,
      r4 + 18,
      r4 + 19,
      6,
      r4 + 4,
      r4 + 17,
      5,
      r4 + 1,
      40,
      8,
      r4 + 2,
      r4 + 3
    ]);
    bdd4 = BinaryDecisionDiagram.from(nodes4, root4, _data4.conditions, _data4.results);
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/endpoint/endpointResolver.js
var cache4, defaultEndpointResolver4;
var init_endpointResolver4 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/endpoint/endpointResolver.js"() {
    init_client3();
    init_endpoints();
    init_bdd4();
    cache4 = new EndpointCache({
      size: 50,
      params: ["Endpoint", "IsControlPlane", "IsOAuthEndpoint", "Region", "UseDualStack", "UseFIPS"]
    });
    defaultEndpointResolver4 = /* @__PURE__ */ __name((endpointParams, context = {}) => {
      return cache4.get(endpointParams, () => decideEndpoint(bdd4, {
        endpointParams,
        logger: context.logger
      }));
    }, "defaultEndpointResolver");
    customEndpointFunctions.aws = awsEndpointFunctions;
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/models/SigninServiceException.js
var SigninServiceException;
var init_SigninServiceException = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/models/SigninServiceException.js"() {
    init_client2();
    SigninServiceException = class _SigninServiceException extends ServiceException {
      static {
        __name(this, "SigninServiceException");
      }
      static shapeId = "smithy.ts.sdk.synthetic.com.amazonaws.signin#SigninServiceException";
      constructor(options) {
        super(options);
        Object.setPrototypeOf(this, _SigninServiceException.prototype);
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/models/errors.js
var AccessDeniedException2, InternalServerException2, TooManyRequestsError, ValidationException;
var init_errors4 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/models/errors.js"() {
    init_SigninServiceException();
    AccessDeniedException2 = class _AccessDeniedException extends SigninServiceException {
      static {
        __name(this, "AccessDeniedException");
      }
      static shapeId = "com.amazonaws.signin#AccessDeniedException";
      name = "AccessDeniedException";
      $fault = "client";
      error;
      constructor(opts) {
        super({
          name: "AccessDeniedException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _AccessDeniedException.prototype);
        this.error = opts.error;
      }
    };
    InternalServerException2 = class _InternalServerException extends SigninServiceException {
      static {
        __name(this, "InternalServerException");
      }
      static shapeId = "com.amazonaws.signin#InternalServerException";
      name = "InternalServerException";
      $fault = "server";
      error;
      constructor(opts) {
        super({
          name: "InternalServerException",
          $fault: "server",
          ...opts
        });
        Object.setPrototypeOf(this, _InternalServerException.prototype);
        this.error = opts.error;
      }
    };
    TooManyRequestsError = class _TooManyRequestsError extends SigninServiceException {
      static {
        __name(this, "TooManyRequestsError");
      }
      static shapeId = "com.amazonaws.signin#TooManyRequestsError";
      name = "TooManyRequestsError";
      $fault = "client";
      error;
      constructor(opts) {
        super({
          name: "TooManyRequestsError",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _TooManyRequestsError.prototype);
        this.error = opts.error;
      }
    };
    ValidationException = class _ValidationException extends SigninServiceException {
      static {
        __name(this, "ValidationException");
      }
      static shapeId = "com.amazonaws.signin#ValidationException";
      name = "ValidationException";
      $fault = "client";
      error;
      constructor(opts) {
        super({
          name: "ValidationException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _ValidationException.prototype);
        this.error = opts.error;
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/schemas/schemas_0.js
var _ADE2, _AT2, _COAT, _COATR, _COATRB, _COATRBr, _COATRr, _COATWIAM, _COATWIAMR, _COATWIAMRr, _ISE3, _OAAT, _RT2, _TMRE2, _VE, _aKI2, _aT3, _at, _c5, _cI2, _cV2, _co2, _e5, _eI2, _ei, _gT2, _gt, _h3, _hE5, _iT2, _jN, _m4, _r3, _rT2, _rU2, _s5, _sAK2, _sT2, _se3, _tI, _tO, _tT2, _tt, n05, _s_registry5, SigninServiceException$, n0_registry5, AccessDeniedException$2, InternalServerException$2, TooManyRequestsError$, ValidationException$, errorTypeRegistries5, OAuthAccessToken, RefreshToken2, AccessToken$, CreateOAuth2TokenRequest$, CreateOAuth2TokenRequestBody$, CreateOAuth2TokenResponse$, CreateOAuth2TokenResponseBody$, CreateOAuth2TokenWithIAMRequest$, CreateOAuth2TokenWithIAMResponse$, CreateOAuth2Token$, CreateOAuth2TokenWithIAM$;
var init_schemas_04 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/schemas/schemas_0.js"() {
    init_schema();
    init_errors4();
    init_SigninServiceException();
    _ADE2 = "AccessDeniedException";
    _AT2 = "AccessToken";
    _COAT = "CreateOAuth2Token";
    _COATR = "CreateOAuth2TokenRequest";
    _COATRB = "CreateOAuth2TokenRequestBody";
    _COATRBr = "CreateOAuth2TokenResponseBody";
    _COATRr = "CreateOAuth2TokenResponse";
    _COATWIAM = "CreateOAuth2TokenWithIAM";
    _COATWIAMR = "CreateOAuth2TokenWithIAMRequest";
    _COATWIAMRr = "CreateOAuth2TokenWithIAMResponse";
    _ISE3 = "InternalServerException";
    _OAAT = "OAuthAccessToken";
    _RT2 = "RefreshToken";
    _TMRE2 = "TooManyRequestsError";
    _VE = "ValidationException";
    _aKI2 = "accessKeyId";
    _aT3 = "accessToken";
    _at = "access_token";
    _c5 = "client";
    _cI2 = "clientId";
    _cV2 = "codeVerifier";
    _co2 = "code";
    _e5 = "error";
    _eI2 = "expiresIn";
    _ei = "expires_in";
    _gT2 = "grantType";
    _gt = "grant_type";
    _h3 = "http";
    _hE5 = "httpError";
    _iT2 = "idToken";
    _jN = "jsonName";
    _m4 = "message";
    _r3 = "resource";
    _rT2 = "refreshToken";
    _rU2 = "redirectUri";
    _s5 = "smithy.ts.sdk.synthetic.com.amazonaws.signin";
    _sAK2 = "secretAccessKey";
    _sT2 = "sessionToken";
    _se3 = "server";
    _tI = "tokenInput";
    _tO = "tokenOutput";
    _tT2 = "tokenType";
    _tt = "token_type";
    n05 = "com.amazonaws.signin";
    _s_registry5 = new TypeRegistry(_s5);
    SigninServiceException$ = [-3, _s5, "SigninServiceException", 0, [], []];
    _s_registry5.registerError(SigninServiceException$, SigninServiceException);
    n0_registry5 = new TypeRegistry(n05);
    AccessDeniedException$2 = [
      -3,
      n05,
      _ADE2,
      { [_e5]: _c5 },
      [_e5, _m4],
      [0, 0],
      2
    ];
    n0_registry5.registerError(AccessDeniedException$2, AccessDeniedException2);
    InternalServerException$2 = [
      -3,
      n05,
      _ISE3,
      { [_e5]: _se3, [_hE5]: 500 },
      [_e5, _m4],
      [0, 0],
      2
    ];
    n0_registry5.registerError(InternalServerException$2, InternalServerException2);
    TooManyRequestsError$ = [
      -3,
      n05,
      _TMRE2,
      { [_e5]: _c5, [_hE5]: 429 },
      [_e5, _m4],
      [0, 0],
      2
    ];
    n0_registry5.registerError(TooManyRequestsError$, TooManyRequestsError);
    ValidationException$ = [
      -3,
      n05,
      _VE,
      { [_e5]: _c5, [_hE5]: 400 },
      [_e5, _m4],
      [0, 0],
      2
    ];
    n0_registry5.registerError(ValidationException$, ValidationException);
    errorTypeRegistries5 = [
      _s_registry5,
      n0_registry5
    ];
    OAuthAccessToken = [0, n05, _OAAT, 8, 0];
    RefreshToken2 = [0, n05, _RT2, 8, 0];
    AccessToken$ = [
      3,
      n05,
      _AT2,
      8,
      [_aKI2, _sAK2, _sT2],
      [[0, { [_jN]: _aKI2 }], [0, { [_jN]: _sAK2 }], [0, { [_jN]: _sT2 }]],
      3
    ];
    CreateOAuth2TokenRequest$ = [
      3,
      n05,
      _COATR,
      0,
      [_tI],
      [[() => CreateOAuth2TokenRequestBody$, 16]],
      1
    ];
    CreateOAuth2TokenRequestBody$ = [
      3,
      n05,
      _COATRB,
      0,
      [_cI2, _gT2, _co2, _rU2, _cV2, _rT2],
      [[0, { [_jN]: _cI2 }], [0, { [_jN]: _gT2 }], 0, [0, { [_jN]: _rU2 }], [0, { [_jN]: _cV2 }], [() => RefreshToken2, { [_jN]: _rT2 }]],
      2
    ];
    CreateOAuth2TokenResponse$ = [
      3,
      n05,
      _COATRr,
      0,
      [_tO],
      [[() => CreateOAuth2TokenResponseBody$, 16]],
      1
    ];
    CreateOAuth2TokenResponseBody$ = [
      3,
      n05,
      _COATRBr,
      0,
      [_aT3, _tT2, _eI2, _rT2, _iT2],
      [[() => AccessToken$, { [_jN]: _aT3 }], [0, { [_jN]: _tT2 }], [1, { [_jN]: _eI2 }], [() => RefreshToken2, { [_jN]: _rT2 }], [0, { [_jN]: _iT2 }]],
      4
    ];
    CreateOAuth2TokenWithIAMRequest$ = [
      3,
      n05,
      _COATWIAMR,
      0,
      [_gT2, _r3],
      [[0, { [_jN]: _gt }], 0],
      2
    ];
    CreateOAuth2TokenWithIAMResponse$ = [
      3,
      n05,
      _COATWIAMRr,
      0,
      [_aT3, _tT2, _eI2],
      [[() => OAuthAccessToken, { [_jN]: _at }], [0, { [_jN]: _tt }], [1, { [_jN]: _ei }]],
      3
    ];
    CreateOAuth2Token$ = [
      9,
      n05,
      _COAT,
      { [_h3]: ["POST", "/v1/token", 200] },
      () => CreateOAuth2TokenRequest$,
      () => CreateOAuth2TokenResponse$
    ];
    CreateOAuth2TokenWithIAM$ = [
      9,
      n05,
      _COATWIAM,
      { [_h3]: ["POST", "/v1/token?x-amz-client-auth-method=iam", 200] },
      () => CreateOAuth2TokenWithIAMRequest$,
      () => CreateOAuth2TokenWithIAMResponse$
    ];
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/runtimeConfig.shared.js
var getRuntimeConfig7;
var init_runtimeConfig_shared4 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/runtimeConfig.shared.js"() {
    init_httpAuthSchemes2();
    init_protocols2();
    init_dist_es2();
    init_checksum3();
    init_client2();
    init_protocols();
    init_serde();
    init_httpAuthSchemeProvider4();
    init_endpointResolver4();
    init_schemas_04();
    getRuntimeConfig7 = /* @__PURE__ */ __name((config) => {
      return {
        apiVersion: "2023-01-01",
        base64Decoder: config?.base64Decoder ?? fromBase64,
        base64Encoder: config?.base64Encoder ?? toBase64,
        disableHostPrefix: config?.disableHostPrefix ?? false,
        endpointProvider: config?.endpointProvider ?? defaultEndpointResolver4,
        extensions: config?.extensions ?? [],
        httpAuthSchemeProvider: config?.httpAuthSchemeProvider ?? defaultSigninHttpAuthSchemeProvider,
        httpAuthSchemes: config?.httpAuthSchemes ?? [
          {
            schemeId: "aws.auth#sigv4",
            identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("aws.auth#sigv4"), "identityProvider"),
            signer: new AwsSdkSigV4Signer()
          },
          {
            schemeId: "smithy.api#noAuth",
            identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("smithy.api#noAuth") || (async () => ({})), "identityProvider"),
            signer: new NoAuthSigner()
          }
        ],
        logger: config?.logger ?? new NoOpLogger(),
        protocol: config?.protocol ?? AwsRestJsonProtocol,
        protocolSettings: config?.protocolSettings ?? {
          defaultNamespace: "com.amazonaws.signin",
          errorTypeRegistries: errorTypeRegistries5,
          version: "2023-01-01",
          serviceTarget: "Signin"
        },
        serviceId: config?.serviceId ?? "Signin",
        sha256: config?.sha256 ?? Sha256Node,
        urlParser: config?.urlParser ?? parseUrl,
        utf8Decoder: config?.utf8Decoder ?? fromUtf8,
        utf8Encoder: config?.utf8Encoder ?? toUtf8
      };
    }, "getRuntimeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/runtimeConfig.js
var getRuntimeConfig8;
var init_runtimeConfig4 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/runtimeConfig.js"() {
    init_package();
    init_client3();
    init_httpAuthSchemes2();
    init_client2();
    init_config2();
    init_retry2();
    init_serde();
    init_dist_es6();
    init_runtimeConfig_shared4();
    getRuntimeConfig8 = /* @__PURE__ */ __name((config) => {
      emitWarningIfUnsupportedVersion(process.version);
      const defaultsMode = resolveDefaultsModeConfig(config);
      const defaultConfigProvider = /* @__PURE__ */ __name(() => defaultsMode().then(loadConfigsForDefaultMode), "defaultConfigProvider");
      const clientSharedValues = getRuntimeConfig7(config);
      emitWarningIfUnsupportedVersion2(process.version);
      const loaderConfig = {
        profile: config?.profile,
        logger: clientSharedValues.logger
      };
      return {
        ...clientSharedValues,
        ...config,
        runtime: "node",
        defaultsMode,
        authSchemePreference: config?.authSchemePreference ?? loadConfig(NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, loaderConfig),
        bodyLengthChecker: config?.bodyLengthChecker ?? calculateBodyLength,
        defaultUserAgentProvider: config?.defaultUserAgentProvider ?? createDefaultUserAgentProvider({ serviceId: clientSharedValues.serviceId, clientVersion: package_default2.version }),
        maxAttempts: config?.maxAttempts ?? loadConfig(NODE_MAX_ATTEMPT_CONFIG_OPTIONS, config),
        region: config?.region ?? loadConfig(NODE_REGION_CONFIG_OPTIONS, { ...NODE_REGION_CONFIG_FILE_OPTIONS, ...loaderConfig }),
        requestHandler: NodeHttpHandler.create(config?.requestHandler ?? defaultConfigProvider),
        retryMode: config?.retryMode ?? loadConfig({
          ...NODE_RETRY_MODE_CONFIG_OPTIONS,
          default: /* @__PURE__ */ __name(async () => (await defaultConfigProvider()).retryMode || DEFAULT_RETRY_MODE, "default")
        }, config),
        streamCollector: config?.streamCollector ?? streamCollector2,
        useDualstackEndpoint: config?.useDualstackEndpoint ?? loadConfig(NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
        useFipsEndpoint: config?.useFipsEndpoint ?? loadConfig(NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
        userAgentAppId: config?.userAgentAppId ?? loadConfig(NODE_APP_ID_CONFIG_OPTIONS, loaderConfig)
      };
    }, "getRuntimeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/auth/httpAuthExtensionConfiguration.js
var getHttpAuthExtensionConfiguration4, resolveHttpAuthRuntimeConfig4;
var init_httpAuthExtensionConfiguration4 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/auth/httpAuthExtensionConfiguration.js"() {
    getHttpAuthExtensionConfiguration4 = /* @__PURE__ */ __name((runtimeConfig) => {
      const _httpAuthSchemes = runtimeConfig.httpAuthSchemes;
      let _httpAuthSchemeProvider = runtimeConfig.httpAuthSchemeProvider;
      let _credentials = runtimeConfig.credentials;
      return {
        setHttpAuthScheme(httpAuthScheme) {
          const index = _httpAuthSchemes.findIndex((scheme) => scheme.schemeId === httpAuthScheme.schemeId);
          if (index === -1) {
            _httpAuthSchemes.push(httpAuthScheme);
          } else {
            _httpAuthSchemes.splice(index, 1, httpAuthScheme);
          }
        },
        httpAuthSchemes() {
          return _httpAuthSchemes;
        },
        setHttpAuthSchemeProvider(httpAuthSchemeProvider) {
          _httpAuthSchemeProvider = httpAuthSchemeProvider;
        },
        httpAuthSchemeProvider() {
          return _httpAuthSchemeProvider;
        },
        setCredentials(credentials) {
          _credentials = credentials;
        },
        credentials() {
          return _credentials;
        }
      };
    }, "getHttpAuthExtensionConfiguration");
    resolveHttpAuthRuntimeConfig4 = /* @__PURE__ */ __name((config) => {
      return {
        httpAuthSchemes: config.httpAuthSchemes(),
        httpAuthSchemeProvider: config.httpAuthSchemeProvider(),
        credentials: config.credentials()
      };
    }, "resolveHttpAuthRuntimeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/runtimeExtensions.js
var resolveRuntimeExtensions4;
var init_runtimeExtensions4 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/runtimeExtensions.js"() {
    init_client3();
    init_client2();
    init_protocols();
    init_httpAuthExtensionConfiguration4();
    resolveRuntimeExtensions4 = /* @__PURE__ */ __name((runtimeConfig, extensions) => {
      const extensionConfiguration = Object.assign(getAwsRegionExtensionConfiguration(runtimeConfig), getDefaultExtensionConfiguration(runtimeConfig), getHttpHandlerExtensionConfiguration(runtimeConfig), getHttpAuthExtensionConfiguration4(runtimeConfig));
      extensions.forEach((extension) => extension.configure(extensionConfiguration));
      return Object.assign(runtimeConfig, resolveAwsRegionExtensionConfiguration(extensionConfiguration), resolveDefaultRuntimeConfig2(extensionConfiguration), resolveHttpHandlerRuntimeConfig(extensionConfiguration), resolveHttpAuthRuntimeConfig4(extensionConfiguration));
    }, "resolveRuntimeExtensions");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/SigninClient.js
var SigninClient;
var init_SigninClient = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/SigninClient.js"() {
    init_client3();
    init_dist_es2();
    init_client2();
    init_config2();
    init_endpoints();
    init_protocols();
    init_retry2();
    init_schema();
    init_httpAuthSchemeProvider4();
    init_EndpointParameters4();
    init_runtimeConfig4();
    init_runtimeExtensions4();
    SigninClient = class extends Client {
      static {
        __name(this, "SigninClient");
      }
      config;
      constructor(...[configuration]) {
        const _config_0 = getRuntimeConfig8(configuration || {});
        super(_config_0);
        this.initConfig = _config_0;
        const _config_1 = resolveClientEndpointParameters5(_config_0);
        const _config_2 = resolveUserAgentConfig(_config_1);
        const _config_3 = resolveRetryConfig(_config_2);
        const _config_4 = resolveRegionConfig(_config_3);
        const _config_5 = resolveHostHeaderConfig(_config_4);
        const _config_6 = resolveEndpointConfig(_config_5);
        const _config_7 = resolveHttpAuthSchemeConfig5(_config_6);
        const _config_8 = resolveRuntimeExtensions4(_config_7, configuration?.extensions || []);
        this.config = _config_8;
        this.middlewareStack.use(getSchemaSerdePlugin(this.config));
        this.middlewareStack.use(getUserAgentPlugin(this.config));
        this.middlewareStack.use(getRetryPlugin(this.config));
        this.middlewareStack.use(getContentLengthPlugin(this.config));
        this.middlewareStack.use(getHostHeaderPlugin(this.config));
        this.middlewareStack.use(getLoggerPlugin(this.config));
        this.middlewareStack.use(getRecursionDetectionPlugin(this.config));
        this.middlewareStack.use(getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
          httpAuthSchemeParametersProvider: defaultSigninHttpAuthSchemeParametersProvider,
          identityProviderConfigProvider: /* @__PURE__ */ __name(async (config) => new DefaultIdentityProviderConfig({
            "aws.auth#sigv4": config.credentials
          }), "identityProviderConfigProvider")
        }));
        this.middlewareStack.use(getHttpSigningPlugin(this.config));
      }
      destroy() {
        super.destroy();
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/commandBuilder.js
var command5, _ep05, _ep1, _mw05;
var init_commandBuilder4 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/commandBuilder.js"() {
    init_client2();
    init_endpoints();
    init_EndpointParameters4();
    command5 = makeBuilder(commonParams5, "Signin", "SigninClient", getEndpointPlugin);
    _ep05 = {
      IsControlPlane: { type: "staticContextParams", value: false }
    };
    _ep1 = {
      IsOAuthEndpoint: { type: "staticContextParams", value: true }
    };
    _mw05 = /* @__PURE__ */ __name((Command2, cs, config, o4) => [], "_mw0");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/commands/CreateOAuth2TokenCommand.js
var CreateOAuth2TokenCommand;
var init_CreateOAuth2TokenCommand = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/commands/CreateOAuth2TokenCommand.js"() {
    init_commandBuilder4();
    init_schemas_04();
    CreateOAuth2TokenCommand = class extends command5(_ep05, _mw05, "CreateOAuth2Token", CreateOAuth2Token$) {
      static {
        __name(this, "CreateOAuth2TokenCommand");
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/commands/CreateOAuth2TokenWithIAMCommand.js
var CreateOAuth2TokenWithIAMCommand;
var init_CreateOAuth2TokenWithIAMCommand = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/commands/CreateOAuth2TokenWithIAMCommand.js"() {
    init_commandBuilder4();
    init_schemas_04();
    CreateOAuth2TokenWithIAMCommand = class extends command5(_ep1, _mw05, "CreateOAuth2TokenWithIAM", CreateOAuth2TokenWithIAM$) {
      static {
        __name(this, "CreateOAuth2TokenWithIAMCommand");
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/Signin.js
var commands4, Signin;
var init_Signin = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/Signin.js"() {
    init_client2();
    init_CreateOAuth2TokenCommand();
    init_CreateOAuth2TokenWithIAMCommand();
    init_SigninClient();
    commands4 = {
      CreateOAuth2TokenCommand,
      CreateOAuth2TokenWithIAMCommand
    };
    Signin = class extends SigninClient {
      static {
        __name(this, "Signin");
      }
    };
    createAggregatedClient(commands4, Signin);
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/commands/index.js
var init_commands4 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/commands/index.js"() {
    init_CreateOAuth2TokenCommand();
    init_CreateOAuth2TokenWithIAMCommand();
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/models/enums.js
var OAuth2ErrorCode;
var init_enums2 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/models/enums.js"() {
    OAuth2ErrorCode = {
      AUTHCODE_EXPIRED: "AUTHCODE_EXPIRED",
      CONFLICT: "CONFLICT",
      INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
      INVALID_REQUEST: "INVALID_REQUEST",
      RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
      SERVER_ERROR: "server_error",
      SERVICE_QUOTA_EXCEEDED: "SERVICE_QUOTA_EXCEEDED",
      TOKEN_EXPIRED: "TOKEN_EXPIRED",
      USER_CREDENTIALS_CHANGED: "USER_CREDENTIALS_CHANGED"
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/models/models_0.js
var init_models_04 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/models/models_0.js"() {
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/index.js
var signin_exports = {};
__export(signin_exports, {
  $Command: () => Command,
  AccessDeniedException: () => AccessDeniedException2,
  AccessDeniedException$: () => AccessDeniedException$2,
  AccessToken$: () => AccessToken$,
  CreateOAuth2Token$: () => CreateOAuth2Token$,
  CreateOAuth2TokenCommand: () => CreateOAuth2TokenCommand,
  CreateOAuth2TokenRequest$: () => CreateOAuth2TokenRequest$,
  CreateOAuth2TokenRequestBody$: () => CreateOAuth2TokenRequestBody$,
  CreateOAuth2TokenResponse$: () => CreateOAuth2TokenResponse$,
  CreateOAuth2TokenResponseBody$: () => CreateOAuth2TokenResponseBody$,
  CreateOAuth2TokenWithIAM$: () => CreateOAuth2TokenWithIAM$,
  CreateOAuth2TokenWithIAMCommand: () => CreateOAuth2TokenWithIAMCommand,
  CreateOAuth2TokenWithIAMRequest$: () => CreateOAuth2TokenWithIAMRequest$,
  CreateOAuth2TokenWithIAMResponse$: () => CreateOAuth2TokenWithIAMResponse$,
  InternalServerException: () => InternalServerException2,
  InternalServerException$: () => InternalServerException$2,
  OAuth2ErrorCode: () => OAuth2ErrorCode,
  Signin: () => Signin,
  SigninClient: () => SigninClient,
  SigninServiceException: () => SigninServiceException,
  SigninServiceException$: () => SigninServiceException$,
  TooManyRequestsError: () => TooManyRequestsError,
  TooManyRequestsError$: () => TooManyRequestsError$,
  ValidationException: () => ValidationException,
  ValidationException$: () => ValidationException$,
  __Client: () => Client,
  errorTypeRegistries: () => errorTypeRegistries5
});
var init_signin = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/index.js"() {
    init_SigninClient();
    init_Signin();
    init_commands4();
    init_client2();
    init_schemas_04();
    init_enums2();
    init_errors4();
    init_models_04();
    init_SigninServiceException();
  }
});

// node_modules/@aws-sdk/credential-provider-login/dist-es/LoginCredentialsFetcher.js
import { createHash as createHash3, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { promises as fs2 } from "node:fs";
import { homedir as homedir2 } from "node:os";
import { dirname, join as join5 } from "node:path";
var LoginCredentialsFetcher;
var init_LoginCredentialsFetcher = __esm({
  "node_modules/@aws-sdk/credential-provider-login/dist-es/LoginCredentialsFetcher.js"() {
    init_config2();
    init_protocols();
    LoginCredentialsFetcher = class _LoginCredentialsFetcher {
      static {
        __name(this, "LoginCredentialsFetcher");
      }
      profileData;
      init;
      callerClientConfig;
      static REFRESH_THRESHOLD = 5 * 60 * 1e3;
      constructor(profileData, init, callerClientConfig) {
        this.profileData = profileData;
        this.init = init;
        this.callerClientConfig = callerClientConfig;
      }
      async loadCredentials() {
        const token = await this.loadToken();
        if (!token) {
          throw new CredentialsProviderError(`Failed to load a token for session ${this.loginSession}, please re-authenticate using aws login`, { tryNextLink: false, logger: this.logger });
        }
        const accessToken = token.accessToken;
        const now = Date.now();
        const expiryTime = new Date(accessToken.expiresAt).getTime();
        const timeUntilExpiry = expiryTime - now;
        if (timeUntilExpiry <= _LoginCredentialsFetcher.REFRESH_THRESHOLD) {
          return this.refresh(token);
        }
        return this.toCredentials(token.accessToken);
      }
      get logger() {
        return this.init?.logger;
      }
      get loginSession() {
        return this.profileData.login_session;
      }
      toCredentials(token) {
        return {
          accessKeyId: token.accessKeyId,
          secretAccessKey: token.secretAccessKey,
          sessionToken: token.sessionToken,
          accountId: token.accountId,
          expiration: new Date(token.expiresAt)
        };
      }
      async refresh(token) {
        const diskToken = await this.loadToken().catch(() => token);
        const now = Date.now();
        const diskExpiry = new Date(diskToken.accessToken.expiresAt).getTime();
        const tokenExpiry = new Date(token.accessToken.expiresAt).getTime();
        const freshToken = diskExpiry <= now && tokenExpiry > now ? token : diskToken;
        const freshExpiry = new Date(freshToken.accessToken.expiresAt).getTime();
        if (freshExpiry - Date.now() > _LoginCredentialsFetcher.REFRESH_THRESHOLD) {
          return this.toCredentials(freshToken.accessToken);
        }
        const { SigninClient: SigninClient2, CreateOAuth2TokenCommand: CreateOAuth2TokenCommand2 } = await Promise.resolve().then(() => (init_signin(), signin_exports));
        const { logger: logger2, userAgentAppId } = this.callerClientConfig ?? {};
        const isH22 = /* @__PURE__ */ __name((requestHandler2) => {
          return requestHandler2?.metadata?.handlerProtocol === "h2";
        }, "isH2");
        const requestHandler = isH22(this.callerClientConfig?.requestHandler) ? void 0 : this.callerClientConfig?.requestHandler;
        const region = this.profileData.region ?? await this.callerClientConfig?.region?.() ?? process.env.AWS_REGION;
        const client2 = new SigninClient2({
          credentials: {
            accessKeyId: "",
            secretAccessKey: ""
          },
          region,
          requestHandler,
          logger: logger2,
          userAgentAppId,
          ...this.init?.clientConfig
        });
        this.createDPoPInterceptor(client2.middlewareStack);
        const commandInput = {
          tokenInput: {
            clientId: freshToken.clientId,
            refreshToken: freshToken.refreshToken,
            grantType: "refresh_token"
          }
        };
        try {
          const response = await client2.send(new CreateOAuth2TokenCommand2(commandInput));
          const { accessKeyId, secretAccessKey, sessionToken } = response.tokenOutput?.accessToken ?? {};
          const { refreshToken, expiresIn } = response.tokenOutput ?? {};
          if (!accessKeyId || !secretAccessKey || !sessionToken || !refreshToken) {
            throw new CredentialsProviderError("Token refresh response missing required fields", {
              logger: this.logger,
              tryNextLink: false
            });
          }
          const expiresInMs = (expiresIn ?? 900) * 1e3;
          const expiration = new Date(Date.now() + expiresInMs);
          const updatedToken = {
            ...freshToken,
            accessToken: {
              ...freshToken.accessToken,
              accessKeyId,
              secretAccessKey,
              sessionToken,
              expiresAt: expiration.toISOString()
            },
            refreshToken
          };
          await this.saveToken(updatedToken);
          return this.toCredentials(updatedToken.accessToken);
        } catch (error) {
          if (error.name === "AccessDeniedException") {
            const errorType = error.error;
            let message;
            switch (errorType) {
              case "TOKEN_EXPIRED":
                message = "Your session has expired. Please reauthenticate.";
                break;
              case "USER_CREDENTIALS_CHANGED":
                message = "Unable to refresh credentials because of a change in your password. Please reauthenticate with your new password.";
                break;
              case "INSUFFICIENT_PERMISSIONS":
                message = "Unable to refresh credentials due to insufficient permissions. You may be missing permission for the 'CreateOAuth2Token' action.";
                break;
              default:
                message = `Failed to refresh token: ${String(error)}. Please re-authenticate using \`aws login\``;
            }
            throw new CredentialsProviderError(message, {
              logger: this.logger,
              tryNextLink: false
            });
          }
          const tokenExpiry2 = new Date(freshToken.accessToken.expiresAt).getTime();
          if (tokenExpiry2 > Date.now()) {
            this.logger?.warn?.(`Failed to refresh token: ${String(error)}. Using existing token until expiry.`);
            return this.toCredentials(freshToken.accessToken);
          }
          throw new CredentialsProviderError(`Failed to refresh token: ${String(error)}. Please re-authenticate using aws login`, { logger: this.logger });
        }
      }
      async loadToken() {
        const tokenFilePath = this.getTokenFilePath();
        try {
          const tokenData = await fs2.readFile(tokenFilePath, "utf8");
          const token = JSON.parse(tokenData);
          const missingFields = ["accessToken", "clientId", "refreshToken", "dpopKey"].filter((k6) => !token[k6]);
          if (!token.accessToken?.accountId) {
            missingFields.push("accountId");
          }
          if (missingFields.length > 0) {
            throw new CredentialsProviderError(`Token validation failed, missing fields: ${missingFields.join(", ")}`, {
              logger: this.logger,
              tryNextLink: false
            });
          }
          return token;
        } catch (error) {
          throw new CredentialsProviderError(`Failed to load token from ${tokenFilePath}: ${String(error)}`, {
            logger: this.logger,
            tryNextLink: false
          });
        }
      }
      async saveToken(token) {
        const tokenFilePath = this.getTokenFilePath();
        const directory = dirname(tokenFilePath);
        try {
          await fs2.mkdir(directory, { recursive: true });
        } catch (error) {
        }
        await fs2.writeFile(tokenFilePath, JSON.stringify(token, null, 2), "utf8");
      }
      getTokenFilePath() {
        const directory = process.env.AWS_LOGIN_CACHE_DIRECTORY ?? join5(homedir2(), ".aws", "login", "cache");
        const loginSessionBytes = Buffer.from(this.loginSession, "utf8");
        const loginSessionSha256 = createHash3("sha256").update(loginSessionBytes).digest("hex");
        return join5(directory, `${loginSessionSha256}.json`);
      }
      derToRawSignature(derSignature) {
        let offset = 2;
        if (derSignature[offset] !== 2) {
          throw new Error("Invalid DER signature");
        }
        offset++;
        const rLength = derSignature[offset++];
        let r6 = derSignature.subarray(offset, offset + rLength);
        offset += rLength;
        if (derSignature[offset] !== 2) {
          throw new Error("Invalid DER signature");
        }
        offset++;
        const sLength = derSignature[offset++];
        let s3 = derSignature.subarray(offset, offset + sLength);
        r6 = r6[0] === 0 ? r6.subarray(1) : r6;
        s3 = s3[0] === 0 ? s3.subarray(1) : s3;
        const rPadded = Buffer.concat([Buffer.alloc(32 - r6.length), r6]);
        const sPadded = Buffer.concat([Buffer.alloc(32 - s3.length), s3]);
        return Buffer.concat([rPadded, sPadded]);
      }
      createDPoPInterceptor(middlewareStack) {
        middlewareStack.add((next) => async (args) => {
          if (HttpRequest.isInstance(args.request)) {
            const request = args.request;
            const actualEndpoint = `${request.protocol}//${request.hostname}${request.port ? `:${request.port}` : ""}${request.path}`;
            const dpop = await this.generateDpop(request.method, actualEndpoint);
            request.headers = {
              ...request.headers,
              DPoP: dpop
            };
          }
          return next(args);
        }, {
          step: "finalizeRequest",
          name: "dpopInterceptor",
          override: true
        });
      }
      async generateDpop(method = "POST", endpoint) {
        const token = await this.loadToken();
        try {
          const privateKey = createPrivateKey({
            key: token.dpopKey,
            format: "pem",
            type: "sec1"
          });
          const publicKey = createPublicKey(privateKey);
          const publicDer = publicKey.export({ format: "der", type: "spki" });
          let pointStart = -1;
          for (let i6 = 0; i6 < publicDer.length; i6++) {
            if (publicDer[i6] === 4) {
              pointStart = i6;
              break;
            }
          }
          const x2 = publicDer.slice(pointStart + 1, pointStart + 33);
          const y2 = publicDer.slice(pointStart + 33, pointStart + 65);
          const header = {
            alg: "ES256",
            typ: "dpop+jwt",
            jwk: {
              kty: "EC",
              crv: "P-256",
              x: x2.toString("base64url"),
              y: y2.toString("base64url")
            }
          };
          const payload = {
            jti: crypto.randomUUID(),
            htm: method,
            htu: endpoint,
            iat: Math.floor(Date.now() / 1e3)
          };
          const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
          const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
          const message = `${headerB64}.${payloadB64}`;
          const asn1Signature = sign("sha256", Buffer.from(message), privateKey);
          const rawSignature = this.derToRawSignature(asn1Signature);
          const signatureB64 = rawSignature.toString("base64url");
          return `${message}.${signatureB64}`;
        } catch (error) {
          throw new CredentialsProviderError(`Failed to generate Dpop proof: ${error instanceof Error ? error.message : String(error)}`, { logger: this.logger, tryNextLink: false });
        }
      }
    };
  }
});

// node_modules/@aws-sdk/credential-provider-login/dist-es/fromLoginCredentials.js
var fromLoginCredentials;
var init_fromLoginCredentials = __esm({
  "node_modules/@aws-sdk/credential-provider-login/dist-es/fromLoginCredentials.js"() {
    init_client3();
    init_config2();
    init_LoginCredentialsFetcher();
    fromLoginCredentials = /* @__PURE__ */ __name((init) => async ({ callerClientConfig } = {}) => {
      init?.logger?.debug?.("@aws-sdk/credential-providers - fromLoginCredentials");
      const profiles = await parseKnownFiles(init || {});
      const profileName = getProfileName({
        profile: init?.profile ?? callerClientConfig?.profile
      });
      const profile = profiles[profileName];
      if (!profile?.login_session) {
        throw new CredentialsProviderError(`Profile ${profileName} does not contain login_session.`, {
          tryNextLink: true,
          logger: init?.logger
        });
      }
      const fetcher = new LoginCredentialsFetcher(profile, init, callerClientConfig);
      const credentials = await fetcher.loadCredentials();
      return setCredentialFeature(credentials, "CREDENTIALS_LOGIN", "AD");
    }, "fromLoginCredentials");
  }
});

// node_modules/@aws-sdk/credential-provider-login/dist-es/index.js
var dist_es_exports5 = {};
__export(dist_es_exports5, {
  fromLoginCredentials: () => fromLoginCredentials
});
var init_dist_es12 = __esm({
  "node_modules/@aws-sdk/credential-provider-login/dist-es/index.js"() {
    init_fromLoginCredentials();
  }
});

// node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveLoginCredentials.js
var isLoginProfile, resolveLoginCredentials;
var init_resolveLoginCredentials = __esm({
  "node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveLoginCredentials.js"() {
    init_client3();
    isLoginProfile = /* @__PURE__ */ __name((data) => {
      return Boolean(data && data.login_session);
    }, "isLoginProfile");
    resolveLoginCredentials = /* @__PURE__ */ __name(async (profileName, options, callerClientConfig) => {
      const { fromLoginCredentials: fromLoginCredentials2 } = await Promise.resolve().then(() => (init_dist_es12(), dist_es_exports5));
      const credentials = await fromLoginCredentials2({
        ...options,
        profile: profileName
      })({ callerClientConfig });
      return setCredentialFeature(credentials, "CREDENTIALS_PROFILE_LOGIN", "AC");
    }, "resolveLoginCredentials");
  }
});

// node_modules/@aws-sdk/credential-provider-process/dist-es/getValidatedProcessCredentials.js
var getValidatedProcessCredentials;
var init_getValidatedProcessCredentials = __esm({
  "node_modules/@aws-sdk/credential-provider-process/dist-es/getValidatedProcessCredentials.js"() {
    init_client3();
    getValidatedProcessCredentials = /* @__PURE__ */ __name((profileName, data, profiles) => {
      if (data.Version !== 1) {
        throw Error(`Profile ${profileName} credential_process did not return Version 1.`);
      }
      if (data.AccessKeyId === void 0 || data.SecretAccessKey === void 0) {
        throw Error(`Profile ${profileName} credential_process returned invalid credentials.`);
      }
      if (data.Expiration) {
        const currentTime = /* @__PURE__ */ new Date();
        const expireTime = new Date(data.Expiration);
        if (expireTime < currentTime) {
          throw Error(`Profile ${profileName} credential_process returned expired credentials.`);
        }
      }
      let accountId = data.AccountId;
      if (!accountId && profiles?.[profileName]?.aws_account_id) {
        accountId = profiles[profileName].aws_account_id;
      }
      const credentials = {
        accessKeyId: data.AccessKeyId,
        secretAccessKey: data.SecretAccessKey,
        ...data.SessionToken && { sessionToken: data.SessionToken },
        ...data.Expiration && { expiration: new Date(data.Expiration) },
        ...data.CredentialScope && { credentialScope: data.CredentialScope },
        ...accountId && { accountId }
      };
      setCredentialFeature(credentials, "CREDENTIALS_PROCESS", "w");
      return credentials;
    }, "getValidatedProcessCredentials");
  }
});

// node_modules/@aws-sdk/credential-provider-process/dist-es/resolveProcessCredentials.js
import { exec } from "node:child_process";
import { promisify } from "node:util";
var resolveProcessCredentials;
var init_resolveProcessCredentials = __esm({
  "node_modules/@aws-sdk/credential-provider-process/dist-es/resolveProcessCredentials.js"() {
    init_config2();
    init_getValidatedProcessCredentials();
    resolveProcessCredentials = /* @__PURE__ */ __name(async (profileName, profiles, logger2) => {
      const profile = profiles[profileName];
      if (profiles[profileName]) {
        const credentialProcess = profile["credential_process"];
        if (credentialProcess !== void 0) {
          const execPromise = promisify(externalDataInterceptor?.getTokenRecord?.().exec ?? exec);
          try {
            const { stdout } = await execPromise(credentialProcess);
            let data;
            try {
              data = JSON.parse(stdout.trim());
            } catch {
              throw Error(`Profile ${profileName} credential_process returned invalid JSON.`);
            }
            return getValidatedProcessCredentials(profileName, data, profiles);
          } catch (error) {
            throw new CredentialsProviderError(error.message, { logger: logger2 });
          }
        } else {
          throw new CredentialsProviderError(`Profile ${profileName} did not contain credential_process.`, { logger: logger2 });
        }
      } else {
        throw new CredentialsProviderError(`Profile ${profileName} could not be found in shared credentials file.`, {
          logger: logger2
        });
      }
    }, "resolveProcessCredentials");
  }
});

// node_modules/@aws-sdk/credential-provider-process/dist-es/fromProcess.js
var fromProcess;
var init_fromProcess = __esm({
  "node_modules/@aws-sdk/credential-provider-process/dist-es/fromProcess.js"() {
    init_config2();
    init_resolveProcessCredentials();
    fromProcess = /* @__PURE__ */ __name((init = {}) => async ({ callerClientConfig } = {}) => {
      init.logger?.debug("@aws-sdk/credential-provider-process - fromProcess");
      const profiles = await parseKnownFiles(init);
      return resolveProcessCredentials(getProfileName({
        profile: init.profile ?? callerClientConfig?.profile
      }), profiles, init.logger);
    }, "fromProcess");
  }
});

// node_modules/@aws-sdk/credential-provider-process/dist-es/index.js
var dist_es_exports6 = {};
__export(dist_es_exports6, {
  fromProcess: () => fromProcess
});
var init_dist_es13 = __esm({
  "node_modules/@aws-sdk/credential-provider-process/dist-es/index.js"() {
    init_fromProcess();
  }
});

// node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveProcessCredentials.js
var isProcessProfile, resolveProcessCredentials2;
var init_resolveProcessCredentials2 = __esm({
  "node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveProcessCredentials.js"() {
    init_client3();
    isProcessProfile = /* @__PURE__ */ __name((arg) => Boolean(arg) && typeof arg === "object" && typeof arg.credential_process === "string", "isProcessProfile");
    resolveProcessCredentials2 = /* @__PURE__ */ __name(async (options, profile) => {
      const { fromProcess: fromProcess2 } = await Promise.resolve().then(() => (init_dist_es13(), dist_es_exports6));
      const credentials = await fromProcess2({
        ...options,
        profile
      })();
      return setCredentialFeature(credentials, "CREDENTIALS_PROFILE_PROCESS", "v");
    }, "resolveProcessCredentials");
  }
});

// node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveSsoCredentials.js
var resolveSsoCredentials, isSsoProfile2;
var init_resolveSsoCredentials = __esm({
  "node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveSsoCredentials.js"() {
    init_client3();
    resolveSsoCredentials = /* @__PURE__ */ __name(async (profile, profileData, options = {}, callerClientConfig) => {
      const { fromSSO: fromSSO2 } = await Promise.resolve().then(() => (init_dist_es10(), dist_es_exports4));
      return fromSSO2({
        profile,
        logger: options.logger,
        parentClientConfig: options.parentClientConfig,
        clientConfig: options.clientConfig
      })({
        callerClientConfig
      }).then((creds) => {
        if (profileData.sso_session) {
          return setCredentialFeature(creds, "CREDENTIALS_PROFILE_SSO", "r");
        } else {
          return setCredentialFeature(creds, "CREDENTIALS_PROFILE_SSO_LEGACY", "t");
        }
      });
    }, "resolveSsoCredentials");
    isSsoProfile2 = /* @__PURE__ */ __name((arg) => arg && (typeof arg.sso_start_url === "string" || typeof arg.sso_account_id === "string" || typeof arg.sso_session === "string" || typeof arg.sso_region === "string" || typeof arg.sso_role_name === "string"), "isSsoProfile");
  }
});

// node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveStaticCredentials.js
var isStaticCredsProfile, resolveStaticCredentials;
var init_resolveStaticCredentials = __esm({
  "node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveStaticCredentials.js"() {
    init_client3();
    isStaticCredsProfile = /* @__PURE__ */ __name((arg) => Boolean(arg) && typeof arg === "object" && typeof arg.aws_access_key_id === "string" && typeof arg.aws_secret_access_key === "string" && ["undefined", "string"].indexOf(typeof arg.aws_session_token) > -1 && ["undefined", "string"].indexOf(typeof arg.aws_account_id) > -1, "isStaticCredsProfile");
    resolveStaticCredentials = /* @__PURE__ */ __name(async (profile, options) => {
      options?.logger?.debug("@aws-sdk/credential-provider-ini - resolveStaticCredentials");
      const credentials = {
        accessKeyId: profile.aws_access_key_id,
        secretAccessKey: profile.aws_secret_access_key,
        sessionToken: profile.aws_session_token,
        ...profile.aws_credential_scope && { credentialScope: profile.aws_credential_scope },
        ...profile.aws_account_id && { accountId: profile.aws_account_id }
      };
      return setCredentialFeature(credentials, "CREDENTIALS_PROFILE", "n");
    }, "resolveStaticCredentials");
  }
});

// node_modules/@aws-sdk/credential-provider-web-identity/dist-es/fromWebToken.js
var fromWebToken;
var init_fromWebToken = __esm({
  "node_modules/@aws-sdk/credential-provider-web-identity/dist-es/fromWebToken.js"() {
    fromWebToken = /* @__PURE__ */ __name((init) => async (awsIdentityProperties) => {
      init.logger?.debug("@aws-sdk/credential-provider-web-identity - fromWebToken");
      const { roleArn, roleSessionName, webIdentityToken, providerId, policyArns, policy, durationSeconds } = init;
      let { roleAssumerWithWebIdentity } = init;
      if (!roleAssumerWithWebIdentity) {
        const { getDefaultRoleAssumerWithWebIdentity: getDefaultRoleAssumerWithWebIdentity3 } = await Promise.resolve().then(() => (init_sts(), sts_exports));
        roleAssumerWithWebIdentity = getDefaultRoleAssumerWithWebIdentity3({
          ...init.clientConfig,
          credentialProviderLogger: init.logger,
          parentClientConfig: {
            ...awsIdentityProperties?.callerClientConfig,
            ...init.parentClientConfig
          }
        }, init.clientPlugins);
      }
      return roleAssumerWithWebIdentity({
        RoleArn: roleArn,
        RoleSessionName: roleSessionName ?? `aws-sdk-js-session-${Date.now()}`,
        WebIdentityToken: webIdentityToken,
        ProviderId: providerId,
        PolicyArns: policyArns,
        Policy: policy,
        DurationSeconds: durationSeconds
      });
    }, "fromWebToken");
  }
});

// node_modules/@aws-sdk/credential-provider-web-identity/dist-es/fromTokenFile.js
import { readFileSync } from "node:fs";
var ENV_TOKEN_FILE, ENV_ROLE_ARN, ENV_ROLE_SESSION_NAME, fromTokenFile;
var init_fromTokenFile = __esm({
  "node_modules/@aws-sdk/credential-provider-web-identity/dist-es/fromTokenFile.js"() {
    init_client3();
    init_config2();
    init_fromWebToken();
    ENV_TOKEN_FILE = "AWS_WEB_IDENTITY_TOKEN_FILE";
    ENV_ROLE_ARN = "AWS_ROLE_ARN";
    ENV_ROLE_SESSION_NAME = "AWS_ROLE_SESSION_NAME";
    fromTokenFile = /* @__PURE__ */ __name((init = {}) => async (awsIdentityProperties) => {
      init.logger?.debug("@aws-sdk/credential-provider-web-identity - fromTokenFile");
      const webIdentityTokenFile = init?.webIdentityTokenFile ?? process.env[ENV_TOKEN_FILE];
      const roleArn = init?.roleArn ?? process.env[ENV_ROLE_ARN];
      const roleSessionName = init?.roleSessionName ?? process.env[ENV_ROLE_SESSION_NAME];
      if (!webIdentityTokenFile || !roleArn) {
        throw new CredentialsProviderError("Web identity configuration not specified", {
          logger: init.logger
        });
      }
      const credentials = await fromWebToken({
        ...init,
        webIdentityToken: externalDataInterceptor?.getTokenRecord?.()[webIdentityTokenFile] ?? readFileSync(webIdentityTokenFile, { encoding: "ascii" }),
        roleArn,
        roleSessionName
      })(awsIdentityProperties);
      if (webIdentityTokenFile === process.env[ENV_TOKEN_FILE]) {
        setCredentialFeature(credentials, "CREDENTIALS_ENV_VARS_STS_WEB_ID_TOKEN", "h");
      }
      return credentials;
    }, "fromTokenFile");
  }
});

// node_modules/@aws-sdk/credential-provider-web-identity/dist-es/index.js
var dist_es_exports7 = {};
__export(dist_es_exports7, {
  fromTokenFile: () => fromTokenFile,
  fromWebToken: () => fromWebToken
});
var init_dist_es14 = __esm({
  "node_modules/@aws-sdk/credential-provider-web-identity/dist-es/index.js"() {
    init_fromTokenFile();
    init_fromWebToken();
  }
});

// node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveWebIdentityCredentials.js
var isWebIdentityProfile, resolveWebIdentityCredentials;
var init_resolveWebIdentityCredentials = __esm({
  "node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveWebIdentityCredentials.js"() {
    init_client3();
    isWebIdentityProfile = /* @__PURE__ */ __name((arg) => Boolean(arg) && typeof arg === "object" && typeof arg.web_identity_token_file === "string" && typeof arg.role_arn === "string" && ["undefined", "string"].indexOf(typeof arg.role_session_name) > -1, "isWebIdentityProfile");
    resolveWebIdentityCredentials = /* @__PURE__ */ __name(async (profile, options, callerClientConfig) => {
      const { fromTokenFile: fromTokenFile2 } = await Promise.resolve().then(() => (init_dist_es14(), dist_es_exports7));
      const credentials = await fromTokenFile2({
        webIdentityTokenFile: profile.web_identity_token_file,
        roleArn: profile.role_arn,
        roleSessionName: profile.role_session_name,
        roleAssumerWithWebIdentity: options.roleAssumerWithWebIdentity,
        logger: options.logger,
        parentClientConfig: options.parentClientConfig
      })({
        callerClientConfig
      });
      return setCredentialFeature(credentials, "CREDENTIALS_PROFILE_STS_WEB_ID_TOKEN", "q");
    }, "resolveWebIdentityCredentials");
  }
});

// node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveProfileData.js
var resolveProfileData;
var init_resolveProfileData = __esm({
  "node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveProfileData.js"() {
    init_config2();
    init_resolveAssumeRoleCredentials();
    init_resolveLoginCredentials();
    init_resolveProcessCredentials2();
    init_resolveSsoCredentials();
    init_resolveStaticCredentials();
    init_resolveWebIdentityCredentials();
    resolveProfileData = /* @__PURE__ */ __name(async (profileName, profiles, options, callerClientConfig, visitedProfiles = {}, isAssumeRoleRecursiveCall = false) => {
      const data = profiles[profileName];
      if (Object.keys(visitedProfiles).length > 0 && isStaticCredsProfile(data)) {
        return resolveStaticCredentials(data, options);
      }
      if (isAssumeRoleRecursiveCall || isAssumeRoleProfile(data, { profile: profileName, logger: options.logger })) {
        return resolveAssumeRoleCredentials(profileName, profiles, options, callerClientConfig, visitedProfiles, resolveProfileData);
      }
      if (isStaticCredsProfile(data)) {
        return resolveStaticCredentials(data, options);
      }
      if (isWebIdentityProfile(data)) {
        return resolveWebIdentityCredentials(data, options, callerClientConfig);
      }
      if (isProcessProfile(data)) {
        return resolveProcessCredentials2(options, profileName);
      }
      if (isSsoProfile2(data)) {
        return await resolveSsoCredentials(profileName, data, options, callerClientConfig);
      }
      if (isLoginProfile(data)) {
        return resolveLoginCredentials(profileName, options, callerClientConfig);
      }
      throw new CredentialsProviderError(`Could not resolve credentials using profile: [${profileName}] in configuration/credentials file(s).`, { logger: options.logger });
    }, "resolveProfileData");
  }
});

// node_modules/@aws-sdk/credential-provider-ini/dist-es/fromIni.js
var fromIni;
var init_fromIni = __esm({
  "node_modules/@aws-sdk/credential-provider-ini/dist-es/fromIni.js"() {
    init_config2();
    init_resolveProfileData();
    fromIni = /* @__PURE__ */ __name((init = {}) => async ({ callerClientConfig } = {}) => {
      init.logger?.debug("@aws-sdk/credential-provider-ini - fromIni");
      const profiles = await parseKnownFiles(init);
      return resolveProfileData(getProfileName({
        profile: init.profile ?? callerClientConfig?.profile
      }), profiles, init, callerClientConfig);
    }, "fromIni");
  }
});

// node_modules/@aws-sdk/credential-provider-ini/dist-es/index.js
var dist_es_exports8 = {};
__export(dist_es_exports8, {
  fromIni: () => fromIni
});
var init_dist_es15 = __esm({
  "node_modules/@aws-sdk/credential-provider-ini/dist-es/index.js"() {
    init_fromIni();
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/account-id-endpoint/AccountIdEndpointModeConfigResolver.js
init_client2();

// node_modules/@aws-sdk/core/dist-es/submodules/account-id-endpoint/AccountIdEndpointModeConstants.js
var DEFAULT_ACCOUNT_ID_ENDPOINT_MODE = "preferred";
var ACCOUNT_ID_ENDPOINT_MODE_VALUES = ["disabled", "preferred", "required"];
function validateAccountIdEndpointMode(value) {
  return ACCOUNT_ID_ENDPOINT_MODE_VALUES.includes(value);
}
__name(validateAccountIdEndpointMode, "validateAccountIdEndpointMode");

// node_modules/@aws-sdk/core/dist-es/submodules/account-id-endpoint/AccountIdEndpointModeConfigResolver.js
var resolveAccountIdEndpointModeConfig = /* @__PURE__ */ __name((input) => {
  const { accountIdEndpointMode } = input;
  const accountIdEndpointModeProvider = normalizeProvider(accountIdEndpointMode ?? DEFAULT_ACCOUNT_ID_ENDPOINT_MODE);
  return Object.assign(input, {
    accountIdEndpointMode: /* @__PURE__ */ __name(async () => {
      const accIdMode = await accountIdEndpointModeProvider();
      if (!validateAccountIdEndpointMode(accIdMode)) {
        throw new Error(`Invalid value for accountIdEndpointMode: ${accIdMode}. Valid values are: "required", "preferred", "disabled".`);
      }
      return accIdMode;
    }, "accountIdEndpointMode")
  });
}, "resolveAccountIdEndpointModeConfig");

// node_modules/@aws-sdk/core/dist-es/submodules/account-id-endpoint/NodeAccountIdEndpointModeConfigOptions.js
var err = "Invalid AccountIdEndpointMode value";
var _throw = /* @__PURE__ */ __name((message) => {
  throw new Error(message);
}, "_throw");
var ENV_ACCOUNT_ID_ENDPOINT_MODE = "AWS_ACCOUNT_ID_ENDPOINT_MODE";
var CONFIG_ACCOUNT_ID_ENDPOINT_MODE = "account_id_endpoint_mode";
var NODE_ACCOUNT_ID_ENDPOINT_MODE_CONFIG_OPTIONS = {
  environmentVariableSelector: /* @__PURE__ */ __name((env2) => {
    const value = env2[ENV_ACCOUNT_ID_ENDPOINT_MODE];
    if (value && !validateAccountIdEndpointMode(value)) {
      _throw(err);
    }
    return value;
  }, "environmentVariableSelector"),
  configFileSelector: /* @__PURE__ */ __name((profile) => {
    const value = profile[CONFIG_ACCOUNT_ID_ENDPOINT_MODE];
    if (value && !validateAccountIdEndpointMode(value)) {
      _throw(err);
    }
    return value;
  }, "configFileSelector"),
  default: DEFAULT_ACCOUNT_ID_ENDPOINT_MODE
};

// node_modules/@aws-sdk/client-dynamodb/dist-es/DynamoDBClient.js
init_client3();

// node_modules/@aws-sdk/middleware-endpoint-discovery/dist-es/configurations.js
var ENV_ENDPOINT_DISCOVERY = ["AWS_ENABLE_ENDPOINT_DISCOVERY", "AWS_ENDPOINT_DISCOVERY_ENABLED"];
var CONFIG_ENDPOINT_DISCOVERY = "endpoint_discovery_enabled";
var isFalsy = /* @__PURE__ */ __name((value) => ["false", "0"].indexOf(value) >= 0, "isFalsy");
var NODE_ENDPOINT_DISCOVERY_CONFIG_OPTIONS = {
  environmentVariableSelector: /* @__PURE__ */ __name((env2) => {
    for (let i6 = 0; i6 < ENV_ENDPOINT_DISCOVERY.length; i6++) {
      const envKey = ENV_ENDPOINT_DISCOVERY[i6];
      if (envKey in env2) {
        const value = env2[envKey];
        if (value === "") {
          throw Error(`Environment variable ${envKey} can't be empty of undefined, got "${value}"`);
        }
        return !isFalsy(value);
      }
    }
  }, "environmentVariableSelector"),
  configFileSelector: /* @__PURE__ */ __name((profile) => {
    if (CONFIG_ENDPOINT_DISCOVERY in profile) {
      const value = profile[CONFIG_ENDPOINT_DISCOVERY];
      if (value === void 0) {
        throw Error(`Shared config entry ${CONFIG_ENDPOINT_DISCOVERY} can't be undefined, got "${value}"`);
      }
      return !isFalsy(value);
    }
  }, "configFileSelector"),
  default: void 0
};

// node_modules/@aws-sdk/endpoint-cache/dist-es/EndpointCache.js
var import_lru_cache = __toESM(require_lru_cache());
var EndpointCache2 = class {
  static {
    __name(this, "EndpointCache");
  }
  cache;
  constructor(capacity) {
    this.cache = new import_lru_cache.default(capacity);
  }
  getEndpoint(key) {
    const endpointsWithExpiry = this.get(key);
    if (!endpointsWithExpiry || endpointsWithExpiry.length === 0) {
      return void 0;
    }
    const endpoints = endpointsWithExpiry.map((endpoint) => endpoint.Address);
    return endpoints[Math.floor(Math.random() * endpoints.length)];
  }
  get(key) {
    if (!this.has(key)) {
      return;
    }
    const value = this.cache.get(key);
    if (!value) {
      return;
    }
    const now = Date.now();
    const endpointsWithExpiry = value.filter((endpoint) => now < endpoint.Expires);
    if (endpointsWithExpiry.length === 0) {
      this.delete(key);
      return void 0;
    }
    return endpointsWithExpiry;
  }
  set(key, endpoints) {
    const now = Date.now();
    this.cache.set(key, endpoints.map(({ Address, CachePeriodInMinutes }) => ({
      Address,
      Expires: now + CachePeriodInMinutes * 60 * 1e3
    })));
  }
  delete(key) {
    this.cache.set(key, []);
  }
  has(key) {
    if (!this.cache.has(key)) {
      return false;
    }
    const endpoints = this.cache.peek(key);
    if (!endpoints) {
      return false;
    }
    return endpoints.length > 0;
  }
  clear() {
    this.cache.clear();
  }
};

// node_modules/@aws-sdk/middleware-endpoint-discovery/dist-es/resolveEndpointDiscoveryConfig.js
var resolveEndpointDiscoveryConfig = /* @__PURE__ */ __name((input, { endpointDiscoveryCommandCtor }) => {
  const { endpointCacheSize, endpointDiscoveryEnabled, endpointDiscoveryEnabledProvider } = input;
  return Object.assign(input, {
    endpointDiscoveryCommandCtor,
    endpointCache: new EndpointCache2(endpointCacheSize ?? 1e3),
    endpointDiscoveryEnabled: endpointDiscoveryEnabled !== void 0 ? () => Promise.resolve(endpointDiscoveryEnabled) : endpointDiscoveryEnabledProvider,
    isClientEndpointDiscoveryEnabled: endpointDiscoveryEnabled !== void 0
  });
}, "resolveEndpointDiscoveryConfig");

// node_modules/@aws-sdk/client-dynamodb/dist-es/DynamoDBClient.js
init_dist_es2();
init_client2();
init_config2();
init_endpoints();
init_protocols();
init_retry2();
init_schema();

// node_modules/@aws-sdk/client-dynamodb/dist-es/auth/httpAuthSchemeProvider.js
init_httpAuthSchemes2();
init_client2();
var defaultDynamoDBHttpAuthSchemeParametersProvider = /* @__PURE__ */ __name(async (config, context, input) => {
  return {
    operation: getSmithyContext(context).operation,
    region: await normalizeProvider(config.region)() || (() => {
      throw new Error("expected `region` to be configured for `aws.auth#sigv4`");
    })()
  };
}, "defaultDynamoDBHttpAuthSchemeParametersProvider");
function createAwsAuthSigv4HttpAuthOption(authParameters) {
  return {
    schemeId: "aws.auth#sigv4",
    signingProperties: {
      name: "dynamodb",
      region: authParameters.region
    },
    propertiesExtractor: /* @__PURE__ */ __name((config, context) => ({
      signingProperties: {
        config,
        context
      }
    }), "propertiesExtractor")
  };
}
__name(createAwsAuthSigv4HttpAuthOption, "createAwsAuthSigv4HttpAuthOption");
var defaultDynamoDBHttpAuthSchemeProvider = /* @__PURE__ */ __name((authParameters) => {
  const options = [];
  switch (authParameters.operation) {
    default: {
      options.push(createAwsAuthSigv4HttpAuthOption(authParameters));
    }
  }
  return options;
}, "defaultDynamoDBHttpAuthSchemeProvider");
var resolveHttpAuthSchemeConfig = /* @__PURE__ */ __name((config) => {
  const config_0 = resolveAwsSdkSigV4Config(config);
  return Object.assign(config_0, {
    authSchemePreference: normalizeProvider(config.authSchemePreference ?? [])
  });
}, "resolveHttpAuthSchemeConfig");

// node_modules/@aws-sdk/client-dynamodb/dist-es/commandBuilder.js
init_client2();
init_endpoints();

// node_modules/@aws-sdk/client-dynamodb/dist-es/endpoint/EndpointParameters.js
var resolveClientEndpointParameters = /* @__PURE__ */ __name((options) => {
  return Object.assign(options, {
    useDualstackEndpoint: options.useDualstackEndpoint ?? false,
    useFipsEndpoint: options.useFipsEndpoint ?? false,
    defaultSigningName: "dynamodb"
  });
}, "resolveClientEndpointParameters");
var commonParams = {
  UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
  AccountId: { type: "builtInParams", name: "accountId" },
  Endpoint: { type: "builtInParams", name: "endpoint" },
  Region: { type: "builtInParams", name: "region" },
  UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" },
  AccountIdEndpointMode: { type: "builtInParams", name: "accountIdEndpointMode" }
};

// node_modules/@aws-sdk/client-dynamodb/dist-es/commandBuilder.js
var command = makeBuilder(commonParams, "DynamoDB_20120810", "DynamoDBClient", getEndpointPlugin);
var _ep0 = {};
var _ep2 = {
  ResourceArn: { type: "contextParams", name: "TableName" }
};
var _mw0 = /* @__PURE__ */ __name((Command2, cs, config, o4) => [], "_mw0");

// node_modules/@aws-sdk/client-dynamodb/dist-es/schemas/schemas_0.js
init_schema();

// node_modules/@aws-sdk/client-dynamodb/dist-es/models/DynamoDBServiceException.js
init_client2();
var DynamoDBServiceException = class _DynamoDBServiceException extends ServiceException {
  static {
    __name(this, "DynamoDBServiceException");
  }
  static shapeId = "smithy.ts.sdk.synthetic.com.amazonaws.dynamodb#DynamoDBServiceException";
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, _DynamoDBServiceException.prototype);
  }
};

// node_modules/@aws-sdk/client-dynamodb/dist-es/models/errors.js
var BackupInUseException = class _BackupInUseException extends DynamoDBServiceException {
  static {
    __name(this, "BackupInUseException");
  }
  static shapeId = "com.amazonaws.dynamodb#BackupInUseException";
  name = "BackupInUseException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "BackupInUseException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _BackupInUseException.prototype);
  }
};
var BackupNotFoundException = class _BackupNotFoundException extends DynamoDBServiceException {
  static {
    __name(this, "BackupNotFoundException");
  }
  static shapeId = "com.amazonaws.dynamodb#BackupNotFoundException";
  name = "BackupNotFoundException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "BackupNotFoundException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _BackupNotFoundException.prototype);
  }
};
var InternalServerError = class _InternalServerError extends DynamoDBServiceException {
  static {
    __name(this, "InternalServerError");
  }
  static shapeId = "com.amazonaws.dynamodb#InternalServerError";
  name = "InternalServerError";
  $fault = "server";
  constructor(opts) {
    super({
      name: "InternalServerError",
      $fault: "server",
      ...opts
    });
    Object.setPrototypeOf(this, _InternalServerError.prototype);
  }
};
var RequestLimitExceeded = class _RequestLimitExceeded extends DynamoDBServiceException {
  static {
    __name(this, "RequestLimitExceeded");
  }
  static shapeId = "com.amazonaws.dynamodb#RequestLimitExceeded";
  name = "RequestLimitExceeded";
  $fault = "client";
  ThrottlingReasons;
  constructor(opts) {
    super({
      name: "RequestLimitExceeded",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _RequestLimitExceeded.prototype);
    this.ThrottlingReasons = opts.ThrottlingReasons;
  }
};
var ThrottlingException = class _ThrottlingException extends DynamoDBServiceException {
  static {
    __name(this, "ThrottlingException");
  }
  static shapeId = "com.amazonaws.dynamodb#ThrottlingException";
  name = "ThrottlingException";
  $fault = "client";
  throttlingReasons;
  constructor(opts) {
    super({
      name: "ThrottlingException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _ThrottlingException.prototype);
    this.throttlingReasons = opts.throttlingReasons;
  }
};
var InvalidEndpointException = class _InvalidEndpointException extends DynamoDBServiceException {
  static {
    __name(this, "InvalidEndpointException");
  }
  static shapeId = "com.amazonaws.dynamodb#InvalidEndpointException";
  name = "InvalidEndpointException";
  $fault = "client";
  Message;
  constructor(opts) {
    super({
      name: "InvalidEndpointException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _InvalidEndpointException.prototype);
    this.Message = opts.Message;
  }
};
var ProvisionedThroughputExceededException = class _ProvisionedThroughputExceededException extends DynamoDBServiceException {
  static {
    __name(this, "ProvisionedThroughputExceededException");
  }
  static shapeId = "com.amazonaws.dynamodb#ProvisionedThroughputExceededException";
  name = "ProvisionedThroughputExceededException";
  $fault = "client";
  ThrottlingReasons;
  constructor(opts) {
    super({
      name: "ProvisionedThroughputExceededException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _ProvisionedThroughputExceededException.prototype);
    this.ThrottlingReasons = opts.ThrottlingReasons;
  }
};
var ResourceNotFoundException = class _ResourceNotFoundException extends DynamoDBServiceException {
  static {
    __name(this, "ResourceNotFoundException");
  }
  static shapeId = "com.amazonaws.dynamodb#ResourceNotFoundException";
  name = "ResourceNotFoundException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "ResourceNotFoundException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _ResourceNotFoundException.prototype);
  }
};
var ItemCollectionSizeLimitExceededException = class _ItemCollectionSizeLimitExceededException extends DynamoDBServiceException {
  static {
    __name(this, "ItemCollectionSizeLimitExceededException");
  }
  static shapeId = "com.amazonaws.dynamodb#ItemCollectionSizeLimitExceededException";
  name = "ItemCollectionSizeLimitExceededException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "ItemCollectionSizeLimitExceededException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _ItemCollectionSizeLimitExceededException.prototype);
  }
};
var ReplicatedWriteConflictException = class _ReplicatedWriteConflictException extends DynamoDBServiceException {
  static {
    __name(this, "ReplicatedWriteConflictException");
  }
  static shapeId = "com.amazonaws.dynamodb#ReplicatedWriteConflictException";
  name = "ReplicatedWriteConflictException";
  $fault = "client";
  $retryable = {};
  constructor(opts) {
    super({
      name: "ReplicatedWriteConflictException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _ReplicatedWriteConflictException.prototype);
  }
};
var ContinuousBackupsUnavailableException = class _ContinuousBackupsUnavailableException extends DynamoDBServiceException {
  static {
    __name(this, "ContinuousBackupsUnavailableException");
  }
  static shapeId = "com.amazonaws.dynamodb#ContinuousBackupsUnavailableException";
  name = "ContinuousBackupsUnavailableException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "ContinuousBackupsUnavailableException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _ContinuousBackupsUnavailableException.prototype);
  }
};
var LimitExceededException = class _LimitExceededException extends DynamoDBServiceException {
  static {
    __name(this, "LimitExceededException");
  }
  static shapeId = "com.amazonaws.dynamodb#LimitExceededException";
  name = "LimitExceededException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "LimitExceededException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _LimitExceededException.prototype);
  }
};
var TableInUseException = class _TableInUseException extends DynamoDBServiceException {
  static {
    __name(this, "TableInUseException");
  }
  static shapeId = "com.amazonaws.dynamodb#TableInUseException";
  name = "TableInUseException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "TableInUseException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _TableInUseException.prototype);
  }
};
var TableNotFoundException = class _TableNotFoundException extends DynamoDBServiceException {
  static {
    __name(this, "TableNotFoundException");
  }
  static shapeId = "com.amazonaws.dynamodb#TableNotFoundException";
  name = "TableNotFoundException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "TableNotFoundException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _TableNotFoundException.prototype);
  }
};
var GlobalTableAlreadyExistsException = class _GlobalTableAlreadyExistsException extends DynamoDBServiceException {
  static {
    __name(this, "GlobalTableAlreadyExistsException");
  }
  static shapeId = "com.amazonaws.dynamodb#GlobalTableAlreadyExistsException";
  name = "GlobalTableAlreadyExistsException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "GlobalTableAlreadyExistsException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _GlobalTableAlreadyExistsException.prototype);
  }
};
var ResourceInUseException = class _ResourceInUseException extends DynamoDBServiceException {
  static {
    __name(this, "ResourceInUseException");
  }
  static shapeId = "com.amazonaws.dynamodb#ResourceInUseException";
  name = "ResourceInUseException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "ResourceInUseException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _ResourceInUseException.prototype);
  }
};
var TransactionConflictException = class _TransactionConflictException extends DynamoDBServiceException {
  static {
    __name(this, "TransactionConflictException");
  }
  static shapeId = "com.amazonaws.dynamodb#TransactionConflictException";
  name = "TransactionConflictException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "TransactionConflictException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _TransactionConflictException.prototype);
  }
};
var PolicyNotFoundException = class _PolicyNotFoundException extends DynamoDBServiceException {
  static {
    __name(this, "PolicyNotFoundException");
  }
  static shapeId = "com.amazonaws.dynamodb#PolicyNotFoundException";
  name = "PolicyNotFoundException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "PolicyNotFoundException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _PolicyNotFoundException.prototype);
  }
};
var ExportNotFoundException = class _ExportNotFoundException extends DynamoDBServiceException {
  static {
    __name(this, "ExportNotFoundException");
  }
  static shapeId = "com.amazonaws.dynamodb#ExportNotFoundException";
  name = "ExportNotFoundException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "ExportNotFoundException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _ExportNotFoundException.prototype);
  }
};
var GlobalTableNotFoundException = class _GlobalTableNotFoundException extends DynamoDBServiceException {
  static {
    __name(this, "GlobalTableNotFoundException");
  }
  static shapeId = "com.amazonaws.dynamodb#GlobalTableNotFoundException";
  name = "GlobalTableNotFoundException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "GlobalTableNotFoundException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _GlobalTableNotFoundException.prototype);
  }
};
var ImportNotFoundException = class _ImportNotFoundException extends DynamoDBServiceException {
  static {
    __name(this, "ImportNotFoundException");
  }
  static shapeId = "com.amazonaws.dynamodb#ImportNotFoundException";
  name = "ImportNotFoundException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "ImportNotFoundException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _ImportNotFoundException.prototype);
  }
};
var DuplicateItemException = class _DuplicateItemException extends DynamoDBServiceException {
  static {
    __name(this, "DuplicateItemException");
  }
  static shapeId = "com.amazonaws.dynamodb#DuplicateItemException";
  name = "DuplicateItemException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "DuplicateItemException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _DuplicateItemException.prototype);
  }
};
var IdempotentParameterMismatchException = class _IdempotentParameterMismatchException extends DynamoDBServiceException {
  static {
    __name(this, "IdempotentParameterMismatchException");
  }
  static shapeId = "com.amazonaws.dynamodb#IdempotentParameterMismatchException";
  name = "IdempotentParameterMismatchException";
  $fault = "client";
  Message;
  constructor(opts) {
    super({
      name: "IdempotentParameterMismatchException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _IdempotentParameterMismatchException.prototype);
    this.Message = opts.Message;
  }
};
var TransactionInProgressException = class _TransactionInProgressException extends DynamoDBServiceException {
  static {
    __name(this, "TransactionInProgressException");
  }
  static shapeId = "com.amazonaws.dynamodb#TransactionInProgressException";
  name = "TransactionInProgressException";
  $fault = "client";
  Message;
  constructor(opts) {
    super({
      name: "TransactionInProgressException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _TransactionInProgressException.prototype);
    this.Message = opts.Message;
  }
};
var ExportConflictException = class _ExportConflictException extends DynamoDBServiceException {
  static {
    __name(this, "ExportConflictException");
  }
  static shapeId = "com.amazonaws.dynamodb#ExportConflictException";
  name = "ExportConflictException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "ExportConflictException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _ExportConflictException.prototype);
  }
};
var InvalidExportTimeException = class _InvalidExportTimeException extends DynamoDBServiceException {
  static {
    __name(this, "InvalidExportTimeException");
  }
  static shapeId = "com.amazonaws.dynamodb#InvalidExportTimeException";
  name = "InvalidExportTimeException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "InvalidExportTimeException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _InvalidExportTimeException.prototype);
  }
};
var PointInTimeRecoveryUnavailableException = class _PointInTimeRecoveryUnavailableException extends DynamoDBServiceException {
  static {
    __name(this, "PointInTimeRecoveryUnavailableException");
  }
  static shapeId = "com.amazonaws.dynamodb#PointInTimeRecoveryUnavailableException";
  name = "PointInTimeRecoveryUnavailableException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "PointInTimeRecoveryUnavailableException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _PointInTimeRecoveryUnavailableException.prototype);
  }
};
var ImportConflictException = class _ImportConflictException extends DynamoDBServiceException {
  static {
    __name(this, "ImportConflictException");
  }
  static shapeId = "com.amazonaws.dynamodb#ImportConflictException";
  name = "ImportConflictException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "ImportConflictException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _ImportConflictException.prototype);
  }
};
var TableAlreadyExistsException = class _TableAlreadyExistsException extends DynamoDBServiceException {
  static {
    __name(this, "TableAlreadyExistsException");
  }
  static shapeId = "com.amazonaws.dynamodb#TableAlreadyExistsException";
  name = "TableAlreadyExistsException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "TableAlreadyExistsException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _TableAlreadyExistsException.prototype);
  }
};
var InvalidRestoreTimeException = class _InvalidRestoreTimeException extends DynamoDBServiceException {
  static {
    __name(this, "InvalidRestoreTimeException");
  }
  static shapeId = "com.amazonaws.dynamodb#InvalidRestoreTimeException";
  name = "InvalidRestoreTimeException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "InvalidRestoreTimeException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _InvalidRestoreTimeException.prototype);
  }
};
var ReplicaAlreadyExistsException = class _ReplicaAlreadyExistsException extends DynamoDBServiceException {
  static {
    __name(this, "ReplicaAlreadyExistsException");
  }
  static shapeId = "com.amazonaws.dynamodb#ReplicaAlreadyExistsException";
  name = "ReplicaAlreadyExistsException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "ReplicaAlreadyExistsException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _ReplicaAlreadyExistsException.prototype);
  }
};
var ReplicaNotFoundException = class _ReplicaNotFoundException extends DynamoDBServiceException {
  static {
    __name(this, "ReplicaNotFoundException");
  }
  static shapeId = "com.amazonaws.dynamodb#ReplicaNotFoundException";
  name = "ReplicaNotFoundException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "ReplicaNotFoundException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _ReplicaNotFoundException.prototype);
  }
};
var IndexNotFoundException = class _IndexNotFoundException extends DynamoDBServiceException {
  static {
    __name(this, "IndexNotFoundException");
  }
  static shapeId = "com.amazonaws.dynamodb#IndexNotFoundException";
  name = "IndexNotFoundException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "IndexNotFoundException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _IndexNotFoundException.prototype);
  }
};
var ConditionalCheckFailedException = class _ConditionalCheckFailedException extends DynamoDBServiceException {
  static {
    __name(this, "ConditionalCheckFailedException");
  }
  static shapeId = "com.amazonaws.dynamodb#ConditionalCheckFailedException";
  name = "ConditionalCheckFailedException";
  $fault = "client";
  Item;
  constructor(opts) {
    super({
      name: "ConditionalCheckFailedException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _ConditionalCheckFailedException.prototype);
    this.Item = opts.Item;
  }
};
var TransactionCanceledException = class _TransactionCanceledException extends DynamoDBServiceException {
  static {
    __name(this, "TransactionCanceledException");
  }
  static shapeId = "com.amazonaws.dynamodb#TransactionCanceledException";
  name = "TransactionCanceledException";
  $fault = "client";
  Message;
  CancellationReasons;
  constructor(opts) {
    super({
      name: "TransactionCanceledException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _TransactionCanceledException.prototype);
    this.Message = opts.Message;
    this.CancellationReasons = opts.CancellationReasons;
  }
};

// node_modules/@aws-sdk/client-dynamodb/dist-es/schemas/schemas_0.js
var _A = "Action";
var _AM = "AttributeMap";
var _ATG = "AttributesToGet";
var _AU = "AttributeUpdates";
var _AV = "AttributeValue";
var _AVL = "AttributeValueList";
var _AVU = "AttributeValueUpdate";
var _Ad = "Address";
var _BIUE = "BackupInUseException";
var _BNFE = "BackupNotFoundException";
var _BOOL = "BOOL";
var _BS_ = "BS";
var _B_ = "B";
var _C = "Code";
var _CBUE = "ContinuousBackupsUnavailableException";
var _CC = "ConsumedCapacity";
var _CCFE = "ConditionalCheckFailedException";
var _CCo = "ConditionCheck";
var _CE = "ConditionExpression";
var _CIM = "ContributorInsightsMode";
var _CIRL = "ContributorInsightsRuleList";
var _CISo = "ContributorInsightsStatus";
var _CO = "ComparisonOperator";
var _COo = "ConditionalOperator";
var _COs = "CsvOptions";
var _CPIM = "CachePeriodInMinutes";
var _CR = "CancellationReasons";
var _CRL = "CancellationReasonList";
var _CRSRA = "ConfirmRemoveSelfResourceAccess";
var _CRa = "CancellationReason";
var _CRo = "ConsistentRead";
var _CU = "CapacityUnits";
var _Ca = "Capacity";
var _Co = "Condition";
var _DCIO = "DescribeContributorInsightsOutput";
var _DE = "DescribeEndpoints";
var _DER = "DescribeEndpointsRequest";
var _DERe = "DescribeEndpointsResponse";
var _DIE = "DuplicateItemException";
var _DII = "DeleteItemInput";
var _De = "Delimiter";
var _Del = "Delete";
var _EAM = "ExpectedAttributeMap";
var _EAN = "ExpressionAttributeNames";
var _EAV = "ExpressionAttributeValues";
var _EAVM = "ExpressionAttributeValueMap";
var _EAVx = "ExpectedAttributeValue";
var _ECE = "ExportConflictException";
var _EDx = "ExceptionDescription";
var _EN = "ExceptionName";
var _ENFE = "ExportNotFoundException";
var _ERI = "ExpectedRevisionId";
var _ESK = "ExclusiveStartKey";
var _En = "Endpoints";
var _End = "Endpoint";
var _Ex = "Expected";
var _Exi = "Exists";
var _FCM = "FilterConditionMap";
var _FE = "FailureException";
var _FEi = "FilterExpression";
var _FS = "FilterSpecification";
var _G = "Get";
var _GI = "GetItem";
var _GII = "GetItemInput";
var _GIO = "GetItemOutput";
var _GSI = "GlobalSecondaryIndexes";
var _GTAEE = "GlobalTableAlreadyExistsException";
var _GTNFE = "GlobalTableNotFoundException";
var _HL = "HeaderList";
var _I = "Item";
var _ICE = "ImportConflictException";
var _ICK = "ItemCollectionKey";
var _ICKAM = "ItemCollectionKeyAttributeMap";
var _ICM = "ItemCollectionMetrics";
var _ICSLEE = "ItemCollectionSizeLimitExceededException";
var _IEE = "InvalidEndpointException";
var _IETE = "InvalidExportTimeException";
var _IN = "IndexName";
var _INFE = "ImportNotFoundException";
var _INFEn = "IndexNotFoundException";
var _IPME = "IdempotentParameterMismatchException";
var _IRTE = "InvalidRestoreTimeException";
var _ISE = "InternalServerError";
var _K = "Key";
var _KAA = "KeysAndAttributes";
var _KC = "KeyConditions";
var _KCE = "KeyConditionExpression";
var _KL = "KeyList";
var _Ke = "Keys";
var _L = "Limit";
var _LAV = "ListAttributeValue";
var _LEE = "LimitExceededException";
var _LETN = "LastEvaluatedTableName";
var _LSI = "LocalSecondaryIndexes";
var _LTO = "ListTablesOutput";
var _LUDT = "LastUpdateDateTime";
var _L_ = "L";
var _M = "Message";
var _MAV = "MapAttributeValue";
var _M_ = "M";
var _N = "N";
var _NKA = "NonKeyAttributes";
var _NS = "NS";
var _NULL = "NULL";
var _PE = "ProjectionExpression";
var _PII = "PutItemInput";
var _PIIAM = "PutItemInputAttributeMap";
var _PITRUE = "PointInTimeRecoveryUnavailableException";
var _PNFE = "PolicyNotFoundException";
var _PRPI = "PutResourcePolicyInput";
var _PTEE = "ProvisionedThroughputExceededException";
var _PTr = "ProjectionType";
var _Po = "Policy";
var _Pr = "Projection";
var _Pu = "Put";
var _QF = "QueryFilter";
var _QI = "QueryInput";
var _RA = "ResourceArn";
var _RAEE = "ReplicaAlreadyExistsException";
var _RCC = "ReturnConsumedCapacity";
var _RCU = "ReadCapacityUnits";
var _RICM = "ReturnItemCollectionMetrics";
var _RIUE = "ResourceInUseException";
var _RLE = "RequestLimitExceeded";
var _RNFE = "ReplicaNotFoundException";
var _RNFEe = "ResourceNotFoundException";
var _RV = "ReturnValues";
var _RVOCCF = "ReturnValuesOnConditionCheckFailure";
var _RWCE = "ReplicatedWriteConflictException";
var _SCE = "SearchConditionExpression";
var _SERGB = "SizeEstimateRangeGB";
var _SF = "ScanFilter";
var _SI = "ScanInput";
var _SICM = "SecondaryIndexesCapacityMap";
var _SIF = "ScanIndexForward";
var _SS_ = "SS";
var _SV = "SearchVector";
var _SVI = "SearchVectorsInput";
var _SVL = "SearchVectorList";
var _S_ = "S";
var _Se = "Select";
var _Seg = "Segment";
var _T = "Table";
var _TAEE = "TableAlreadyExistsException";
var _TCE = "TransactionCanceledException";
var _TCEr = "TransactionConflictException";
var _TE = "ThrottlingException";
var _TIPE = "TransactionInProgressException";
var _TIUE = "TableInUseException";
var _TK = "TopK";
var _TKa = "TagKeys";
var _TN = "TableName";
var _TNFE = "TableNotFoundException";
var _TNa = "TableNames";
var _TR = "ThrottlingReasons";
var _TRL = "ThrottlingReasonList";
var _TRh = "ThrottlingReason";
var _TSo = "TotalSegments";
var _U = "Update";
var _UE = "UpdateExpression";
var _UII = "UpdateItemInput";
var _URI = "UntagResourceInput";
var _V = "Value";
var _VC = "VectorCapacity";
var _VI = "VectorIndexes";
var _VICM = "VectorIndexesCapacityMap";
var _VSRB = "VectorSearchRequestBytes";
var _VWRB = "VectorWriteRequestBytes";
var _WCU = "WriteCapacityUnits";
var _aQE = "awsQueryError";
var _c = "client";
var _e = "error";
var _hE = "httpError";
var _hH = "httpHeader";
var _m = "message";
var _r = "reason";
var _re = "resource";
var _s = "smithy.ts.sdk.synthetic.com.amazonaws.dynamodb";
var _se = "server";
var _tR = "throttlingReasons";
var _xacrsra = "x-amz-confirm-remove-self-resource-access";
var n0 = "com.amazonaws.dynamodb";
var _s_registry = new TypeRegistry(_s);
var DynamoDBServiceException$ = [-3, _s, "DynamoDBServiceException", 0, [], []];
_s_registry.registerError(DynamoDBServiceException$, DynamoDBServiceException);
var n0_registry = new TypeRegistry(n0);
var BackupInUseException$ = [
  -3,
  n0,
  _BIUE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(BackupInUseException$, BackupInUseException);
var BackupNotFoundException$ = [
  -3,
  n0,
  _BNFE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(BackupNotFoundException$, BackupNotFoundException);
var ConditionalCheckFailedException$ = [
  -3,
  n0,
  _CCFE,
  { [_e]: _c },
  [_m, _I],
  [0, () => AttributeMap]
];
n0_registry.registerError(ConditionalCheckFailedException$, ConditionalCheckFailedException);
var ContinuousBackupsUnavailableException$ = [
  -3,
  n0,
  _CBUE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(ContinuousBackupsUnavailableException$, ContinuousBackupsUnavailableException);
var DuplicateItemException$ = [
  -3,
  n0,
  _DIE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(DuplicateItemException$, DuplicateItemException);
var ExportConflictException$ = [
  -3,
  n0,
  _ECE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(ExportConflictException$, ExportConflictException);
var ExportNotFoundException$ = [
  -3,
  n0,
  _ENFE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(ExportNotFoundException$, ExportNotFoundException);
var GlobalTableAlreadyExistsException$ = [
  -3,
  n0,
  _GTAEE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(GlobalTableAlreadyExistsException$, GlobalTableAlreadyExistsException);
var GlobalTableNotFoundException$ = [
  -3,
  n0,
  _GTNFE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(GlobalTableNotFoundException$, GlobalTableNotFoundException);
var IdempotentParameterMismatchException$ = [
  -3,
  n0,
  _IPME,
  { [_e]: _c },
  [_M],
  [0]
];
n0_registry.registerError(IdempotentParameterMismatchException$, IdempotentParameterMismatchException);
var ImportConflictException$ = [
  -3,
  n0,
  _ICE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(ImportConflictException$, ImportConflictException);
var ImportNotFoundException$ = [
  -3,
  n0,
  _INFE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(ImportNotFoundException$, ImportNotFoundException);
var IndexNotFoundException$ = [
  -3,
  n0,
  _INFEn,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(IndexNotFoundException$, IndexNotFoundException);
var InternalServerError$ = [
  -3,
  n0,
  _ISE,
  { [_e]: _se },
  [_m],
  [0]
];
n0_registry.registerError(InternalServerError$, InternalServerError);
var InvalidEndpointException$ = [
  -3,
  n0,
  _IEE,
  { [_e]: _c, [_hE]: 421 },
  [_M],
  [0]
];
n0_registry.registerError(InvalidEndpointException$, InvalidEndpointException);
var InvalidExportTimeException$ = [
  -3,
  n0,
  _IETE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(InvalidExportTimeException$, InvalidExportTimeException);
var InvalidRestoreTimeException$ = [
  -3,
  n0,
  _IRTE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(InvalidRestoreTimeException$, InvalidRestoreTimeException);
var ItemCollectionSizeLimitExceededException$ = [
  -3,
  n0,
  _ICSLEE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(ItemCollectionSizeLimitExceededException$, ItemCollectionSizeLimitExceededException);
var LimitExceededException$ = [
  -3,
  n0,
  _LEE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(LimitExceededException$, LimitExceededException);
var PointInTimeRecoveryUnavailableException$ = [
  -3,
  n0,
  _PITRUE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(PointInTimeRecoveryUnavailableException$, PointInTimeRecoveryUnavailableException);
var PolicyNotFoundException$ = [
  -3,
  n0,
  _PNFE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(PolicyNotFoundException$, PolicyNotFoundException);
var ProvisionedThroughputExceededException$ = [
  -3,
  n0,
  _PTEE,
  { [_e]: _c },
  [_m, _TR],
  [0, () => ThrottlingReasonList]
];
n0_registry.registerError(ProvisionedThroughputExceededException$, ProvisionedThroughputExceededException);
var ReplicaAlreadyExistsException$ = [
  -3,
  n0,
  _RAEE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(ReplicaAlreadyExistsException$, ReplicaAlreadyExistsException);
var ReplicaNotFoundException$ = [
  -3,
  n0,
  _RNFE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(ReplicaNotFoundException$, ReplicaNotFoundException);
var ReplicatedWriteConflictException$ = [
  -3,
  n0,
  _RWCE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(ReplicatedWriteConflictException$, ReplicatedWriteConflictException);
var RequestLimitExceeded$ = [
  -3,
  n0,
  _RLE,
  { [_e]: _c },
  [_m, _TR],
  [0, () => ThrottlingReasonList]
];
n0_registry.registerError(RequestLimitExceeded$, RequestLimitExceeded);
var ResourceInUseException$ = [
  -3,
  n0,
  _RIUE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(ResourceInUseException$, ResourceInUseException);
var ResourceNotFoundException$ = [
  -3,
  n0,
  _RNFEe,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(ResourceNotFoundException$, ResourceNotFoundException);
var TableAlreadyExistsException$ = [
  -3,
  n0,
  _TAEE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(TableAlreadyExistsException$, TableAlreadyExistsException);
var TableInUseException$ = [
  -3,
  n0,
  _TIUE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(TableInUseException$, TableInUseException);
var TableNotFoundException$ = [
  -3,
  n0,
  _TNFE,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(TableNotFoundException$, TableNotFoundException);
var ThrottlingException$ = [
  -3,
  n0,
  _TE,
  { [_aQE]: [`Throttling`, 400], [_e]: _c, [_hE]: 400 },
  [_m, _tR],
  [0, () => ThrottlingReasonList]
];
n0_registry.registerError(ThrottlingException$, ThrottlingException);
var TransactionCanceledException$ = [
  -3,
  n0,
  _TCE,
  { [_e]: _c },
  [_M, _CR],
  [0, () => CancellationReasonList]
];
n0_registry.registerError(TransactionCanceledException$, TransactionCanceledException);
var TransactionConflictException$ = [
  -3,
  n0,
  _TCEr,
  { [_e]: _c },
  [_m],
  [0]
];
n0_registry.registerError(TransactionConflictException$, TransactionConflictException);
var TransactionInProgressException$ = [
  -3,
  n0,
  _TIPE,
  { [_e]: _c },
  [_M],
  [0]
];
n0_registry.registerError(TransactionInProgressException$, TransactionInProgressException);
var errorTypeRegistries = [
  _s_registry,
  n0_registry
];
var AttributeValueUpdate$ = [
  3,
  n0,
  _AVU,
  0,
  [_V, _A],
  [() => AttributeValue$, 0]
];
var CancellationReason$ = [
  3,
  n0,
  _CRa,
  0,
  [_I, _C, _M],
  [() => AttributeMap, 0, 0]
];
var Capacity$ = [
  3,
  n0,
  _Ca,
  0,
  [_RCU, _WCU, _CU],
  [1, 1, 1]
];
var Condition$ = [
  3,
  n0,
  _Co,
  0,
  [_CO, _AVL],
  [0, () => AttributeValueList],
  1
];
var ConditionCheck$ = [
  3,
  n0,
  _CCo,
  0,
  [_K, _TN, _CE, _EAN, _EAV, _RVOCCF],
  [() => Key, 0, 0, 128 | 0, () => ExpressionAttributeValueMap, 0],
  3
];
var ConsumedCapacity$ = [
  3,
  n0,
  _CC,
  0,
  [_TN, _CU, _RCU, _WCU, _T, _LSI, _GSI, _VI],
  [0, 1, 1, 1, () => Capacity$, () => SecondaryIndexesCapacityMap, () => SecondaryIndexesCapacityMap, () => VectorIndexesCapacityMap]
];
var CsvOptions$ = [
  3,
  n0,
  _COs,
  0,
  [_De, _HL],
  [0, 64 | 0]
];
var Delete$ = [
  3,
  n0,
  _Del,
  0,
  [_K, _TN, _CE, _EAN, _EAV, _RVOCCF],
  [() => Key, 0, 0, 128 | 0, () => ExpressionAttributeValueMap, 0],
  2
];
var DeleteItemInput$ = [
  3,
  n0,
  _DII,
  0,
  [_TN, _K, _Ex, _COo, _RV, _RCC, _RICM, _CE, _EAN, _EAV, _RVOCCF],
  [0, () => Key, () => ExpectedAttributeMap, 0, 0, 0, 0, 0, 128 | 0, () => ExpressionAttributeValueMap, 0],
  2
];
var DescribeContributorInsightsOutput$ = [
  3,
  n0,
  _DCIO,
  0,
  [_TN, _IN, _CIRL, _CISo, _LUDT, _FE, _CIM],
  [0, 0, 64 | 0, 0, 4, () => FailureException$, 0]
];
var DescribeEndpointsRequest$ = [
  3,
  n0,
  _DER,
  0,
  [],
  []
];
var DescribeEndpointsResponse$ = [
  3,
  n0,
  _DERe,
  0,
  [_En],
  [() => Endpoints],
  1
];
var Endpoint$ = [
  3,
  n0,
  _End,
  0,
  [_Ad, _CPIM],
  [0, 1],
  2
];
var ExpectedAttributeValue$ = [
  3,
  n0,
  _EAVx,
  0,
  [_V, _Exi, _CO, _AVL],
  [() => AttributeValue$, 2, 0, () => AttributeValueList]
];
var FailureException$ = [
  3,
  n0,
  _FE,
  0,
  [_EN, _EDx],
  [0, 0]
];
var FilterSpecification$ = [
  3,
  n0,
  _FS,
  0,
  [_FEi, _PE, _KCE, _EAN, _EAV],
  [0, 0, 0, 128 | 0, () => ExpressionAttributeValueMap]
];
var Get$ = [
  3,
  n0,
  _G,
  0,
  [_K, _TN, _PE, _EAN],
  [() => Key, 0, 0, 128 | 0],
  2
];
var GetItemInput$ = [
  3,
  n0,
  _GII,
  0,
  [_TN, _K, _ATG, _CRo, _RCC, _PE, _EAN],
  [0, () => Key, 64 | 0, 2, 0, 0, 128 | 0],
  2
];
var GetItemOutput$ = [
  3,
  n0,
  _GIO,
  0,
  [_I, _CC],
  [() => AttributeMap, () => ConsumedCapacity$]
];
var ItemCollectionMetrics$ = [
  3,
  n0,
  _ICM,
  0,
  [_ICK, _SERGB],
  [() => ItemCollectionKeyAttributeMap, 64 | 1]
];
var KeysAndAttributes$ = [
  3,
  n0,
  _KAA,
  0,
  [_Ke, _ATG, _CRo, _PE, _EAN],
  [() => KeyList, 64 | 0, 2, 0, 128 | 0],
  1
];
var ListTablesOutput$ = [
  3,
  n0,
  _LTO,
  0,
  [_TNa, _LETN],
  [64 | 0, 0]
];
var Projection$ = [
  3,
  n0,
  _Pr,
  0,
  [_PTr, _NKA],
  [0, 64 | 0]
];
var Put$ = [
  3,
  n0,
  _Pu,
  0,
  [_I, _TN, _CE, _EAN, _EAV, _RVOCCF],
  [() => PutItemInputAttributeMap, 0, 0, 128 | 0, () => ExpressionAttributeValueMap, 0],
  2
];
var PutItemInput$ = [
  3,
  n0,
  _PII,
  0,
  [_TN, _I, _Ex, _RV, _RCC, _RICM, _COo, _CE, _EAN, _EAV, _RVOCCF],
  [0, () => PutItemInputAttributeMap, () => ExpectedAttributeMap, 0, 0, 0, 0, 0, 128 | 0, () => ExpressionAttributeValueMap, 0],
  2
];
var PutResourcePolicyInput$ = [
  3,
  n0,
  _PRPI,
  0,
  [_RA, _Po, _ERI, _CRSRA],
  [0, 0, 0, [2, { [_hH]: _xacrsra }]],
  2
];
var QueryInput$ = [
  3,
  n0,
  _QI,
  0,
  [_TN, _IN, _Se, _ATG, _L, _CRo, _KC, _QF, _COo, _SIF, _ESK, _RCC, _PE, _FEi, _KCE, _EAN, _EAV],
  [0, 0, 0, 64 | 0, 1, 2, () => KeyConditions, () => FilterConditionMap, 0, 2, () => Key, 0, 0, 0, 0, 128 | 0, () => ExpressionAttributeValueMap],
  1
];
var ScanInput$ = [
  3,
  n0,
  _SI,
  0,
  [_TN, _IN, _ATG, _L, _Se, _SF, _COo, _ESK, _RCC, _TSo, _Seg, _PE, _FEi, _EAN, _EAV, _CRo],
  [0, 0, 64 | 0, 1, 0, () => FilterConditionMap, 0, () => Key, 0, 1, 1, 0, 0, 128 | 0, () => ExpressionAttributeValueMap, 2],
  1
];
var SearchVectorsInput$ = [
  3,
  n0,
  _SVI,
  0,
  [_TN, _IN, _SV, _TK, _RCC, _EAN, _EAV, _PE, _SCE],
  [0, 0, () => SearchVectorList, 1, 0, 128 | 0, () => ExpressionAttributeValueMap, 0, 0],
  4
];
var ThrottlingReason$ = [
  3,
  n0,
  _TRh,
  0,
  [_r, _re],
  [0, 0]
];
var UntagResourceInput$ = [
  3,
  n0,
  _URI,
  0,
  [_RA, _TKa],
  [0, 64 | 0],
  2
];
var Update$ = [
  3,
  n0,
  _U,
  0,
  [_K, _UE, _TN, _CE, _EAN, _EAV, _RVOCCF],
  [() => Key, 0, 0, 0, 128 | 0, () => ExpressionAttributeValueMap, 0],
  3
];
var UpdateItemInput$ = [
  3,
  n0,
  _UII,
  0,
  [_TN, _K, _AU, _Ex, _COo, _RV, _RCC, _RICM, _UE, _CE, _EAN, _EAV, _RVOCCF],
  [0, () => Key, () => AttributeUpdates, () => ExpectedAttributeMap, 0, 0, 0, 0, 0, 0, 128 | 0, () => ExpressionAttributeValueMap, 0],
  2
];
var VectorCapacity$ = [
  3,
  n0,
  _VC,
  0,
  [_VSRB, _VWRB],
  [1, 1]
];
var AttributeNameList = 64 | 0;
var AttributeValueList = [
  1,
  n0,
  _AVL,
  0,
  () => AttributeValue$
];
var BinarySetAttributeValue = 64 | 21;
var CancellationReasonList = [
  1,
  n0,
  _CRL,
  0,
  () => CancellationReason$
];
var ContributorInsightsRuleList = 64 | 0;
var CsvHeaderList = 64 | 0;
var Endpoints = [
  1,
  n0,
  _En,
  0,
  () => Endpoint$
];
var ItemCollectionSizeEstimateRange = 64 | 1;
var KeyList = [
  1,
  n0,
  _KL,
  0,
  () => Key
];
var ListAttributeValue = [
  1,
  n0,
  _LAV,
  0,
  () => AttributeValue$
];
var NonKeyAttributeNameList = 64 | 0;
var NumberSetAttributeValue = 64 | 0;
var SearchVectorList = [
  1,
  n0,
  _SVL,
  0,
  () => AttributeValue$
];
var StringSetAttributeValue = 64 | 0;
var TableNameList = 64 | 0;
var TagKeyList = 64 | 0;
var ThrottlingReasonList = [
  1,
  n0,
  _TRL,
  0,
  () => ThrottlingReason$
];
var AttributeMap = [
  2,
  n0,
  _AM,
  0,
  0,
  () => AttributeValue$
];
var AttributeUpdates = [
  2,
  n0,
  _AU,
  0,
  0,
  () => AttributeValueUpdate$
];
var ExpectedAttributeMap = [
  2,
  n0,
  _EAM,
  0,
  0,
  () => ExpectedAttributeValue$
];
var ExpressionAttributeNameMap = 128 | 0;
var ExpressionAttributeValueMap = [
  2,
  n0,
  _EAVM,
  0,
  0,
  () => AttributeValue$
];
var FilterConditionMap = [
  2,
  n0,
  _FCM,
  0,
  0,
  () => Condition$
];
var ItemCollectionKeyAttributeMap = [
  2,
  n0,
  _ICKAM,
  0,
  0,
  () => AttributeValue$
];
var Key = [
  2,
  n0,
  _K,
  0,
  0,
  () => AttributeValue$
];
var KeyConditions = [
  2,
  n0,
  _KC,
  0,
  0,
  () => Condition$
];
var MapAttributeValue = [
  2,
  n0,
  _MAV,
  0,
  0,
  () => AttributeValue$
];
var PutItemInputAttributeMap = [
  2,
  n0,
  _PIIAM,
  0,
  0,
  () => AttributeValue$
];
var SecondaryIndexesCapacityMap = [
  2,
  n0,
  _SICM,
  0,
  0,
  () => Capacity$
];
var VectorIndexesCapacityMap = [
  2,
  n0,
  _VICM,
  0,
  0,
  () => VectorCapacity$
];
var AttributeValue$ = [
  4,
  n0,
  _AV,
  0,
  [_S_, _N, _B_, _SS_, _NS, _BS_, _M_, _L_, _NULL, _BOOL],
  [0, 0, 21, 64 | 0, 64 | 0, 64 | 21, () => MapAttributeValue, () => ListAttributeValue, 2, 2]
];
var DescribeEndpoints$ = [
  9,
  n0,
  _DE,
  0,
  () => DescribeEndpointsRequest$,
  () => DescribeEndpointsResponse$
];
var GetItem$ = [
  9,
  n0,
  _GI,
  0,
  () => GetItemInput$,
  () => GetItemOutput$
];

// node_modules/@aws-sdk/client-dynamodb/dist-es/commands/DescribeEndpointsCommand.js
var DescribeEndpointsCommand = class extends command(_ep0, _mw0, "DescribeEndpoints", DescribeEndpoints$) {
  static {
    __name(this, "DescribeEndpointsCommand");
  }
};

// node_modules/@aws-sdk/client-dynamodb/package.json
var package_default = {
  name: "@aws-sdk/client-dynamodb",
  version: "3.1158.0",
  description: "AWS SDK for JavaScript Dynamodb Client for Node.js, Browser and React Native",
  homepage: "https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-dynamodb",
  license: "Apache-2.0",
  author: {
    name: "AWS SDK for JavaScript Team",
    url: "https://aws.amazon.com/sdk-for-javascript/"
  },
  repository: {
    type: "git",
    url: "https://github.com/aws/aws-sdk-js-v3.git",
    directory: "clients/client-dynamodb"
  },
  files: [
    "dist-*/**"
  ],
  sideEffects: false,
  main: "./dist-cjs/index.js",
  module: "./dist-es/index.js",
  browser: {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.browser"
  },
  types: "./dist-types/index.d.ts",
  typesVersions: {
    "<4.5": {
      "dist-types/*": [
        "dist-types/ts3.4/*"
      ]
    }
  },
  "react-native": {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.native"
  },
  scripts: {
    build: "concurrently 'yarn:build:types' 'yarn:build:es' && yarn build:cjs",
    "build:cjs": "node ../../scripts/compilation/inline",
    "build:es": "premove dist-es && tsc -p tsconfig.es.json",
    "build:include:deps": 'yarn g:turbo run build -F="$npm_package_name"',
    "build:types": "premove dist-types && tsc -p tsconfig.types.json",
    "build:types:downlevel": "downlevel-dts dist-types dist-types/ts3.4",
    clean: "premove dist-cjs dist-es dist-types",
    "extract:docs": "api-extractor run --local",
    "generate:client": "node ../../scripts/generate-clients/single-service",
    test: "yarn g:vitest run --passWithNoTests",
    "test:watch": "yarn g:vitest watch --passWithNoTests",
    "test:integration": "yarn g:vitest run --passWithNoTests -c vitest.config.integ.mts",
    "test:integration:watch": "yarn g:vitest watch --passWithNoTests -c vitest.config.integ.mts",
    "test:e2e": "yarn g:vitest run -c vitest.config.e2e.mts",
    "test:e2e:watch": "yarn g:vitest watch -c vitest.config.e2e.mts",
    "test:index": "tsc -p tsconfig.test.json && node ./test/index-objects.spec.mjs"
  },
  dependencies: {
    "@aws-sdk/core": "^3.978.6",
    "@aws-sdk/credential-provider-node": "^3.972.89",
    "@aws-sdk/dynamodb-codec": "^3.973.51",
    "@aws-sdk/middleware-endpoint-discovery": "^3.972.35",
    "@aws-sdk/types": "^3.975.0",
    "@smithy/core": "^3.37.0",
    "@smithy/fetch-http-handler": "^5.8.0",
    "@smithy/node-http-handler": "^4.13.0",
    "@smithy/types": "^4.19.0",
    tslib: "^2.6.2"
  },
  devDependencies: {
    "@smithy/snapshot-testing": "^2.4.0",
    "@tsconfig/node20": "20.1.8",
    "@types/node": "^20.14.8",
    concurrently: "7.0.0",
    "downlevel-dts": "0.10.1",
    premove: "4.0.0",
    typescript: "~7.0.2",
    vitest: "^4.0.17"
  },
  engines: {
    node: ">=20.0.0"
  }
};

// node_modules/@aws-sdk/client-dynamodb/dist-es/runtimeConfig.js
init_client3();
init_httpAuthSchemes2();

// node_modules/@aws-sdk/credential-provider-node/dist-es/defaultProvider.js
init_dist_es4();
init_config2();

// node_modules/@aws-sdk/credential-provider-node/dist-es/remoteProvider.js
init_config2();
var ENV_IMDS_DISABLED2 = "AWS_EC2_METADATA_DISABLED";
var remoteProvider = /* @__PURE__ */ __name(async (init) => {
  const { ENV_CMDS_FULL_URI: ENV_CMDS_FULL_URI2, ENV_CMDS_RELATIVE_URI: ENV_CMDS_RELATIVE_URI2, fromContainerMetadata: fromContainerMetadata2, fromInstanceMetadata: fromInstanceMetadata2 } = await Promise.resolve().then(() => (init_dist_es5(), dist_es_exports2));
  if (process.env[ENV_CMDS_RELATIVE_URI2] || process.env[ENV_CMDS_FULL_URI2]) {
    init.logger?.debug("@aws-sdk/credential-provider-node - remoteProvider::fromHttp/fromContainerMetadata");
    const { fromHttp: fromHttp2 } = await Promise.resolve().then(() => (init_dist_es7(), dist_es_exports3));
    return chain(fromHttp2(init), fromContainerMetadata2(init));
  }
  if (process.env[ENV_IMDS_DISABLED2] && process.env[ENV_IMDS_DISABLED2] !== "false") {
    return async () => {
      throw new CredentialsProviderError("EC2 Instance Metadata Service access disabled", { logger: init.logger });
    };
  }
  init.logger?.debug("@aws-sdk/credential-provider-node - remoteProvider::fromInstanceMetadata");
  return fromInstanceMetadata2(init);
}, "remoteProvider");

// node_modules/@aws-sdk/credential-provider-node/dist-es/runtime/memoize-chain.js
function memoizeChain(providers, treatAsExpired) {
  const chain2 = internalCreateChain(providers);
  let activeLock;
  let passiveLock;
  let credentials;
  let forceRefreshLock;
  const provider = /* @__PURE__ */ __name(async (options) => {
    if (options?.forceRefresh) {
      if (!forceRefreshLock) {
        forceRefreshLock = chain2(options).then((c6) => {
          credentials = c6;
        }).finally(() => {
          forceRefreshLock = void 0;
        });
      }
      await forceRefreshLock;
      return credentials;
    }
    if (credentials?.expiration) {
      if (credentials?.expiration?.getTime() < Date.now()) {
        credentials = void 0;
      }
    }
    if (activeLock) {
      await activeLock;
    } else if (!credentials || treatAsExpired?.(credentials)) {
      if (credentials) {
        if (!passiveLock) {
          passiveLock = chain2(options).then((c6) => {
            credentials = c6;
          }).catch(() => {
          }).finally(() => {
            passiveLock = void 0;
          });
        }
      } else {
        activeLock = chain2(options).then((c6) => {
          credentials = c6;
        }).finally(() => {
          activeLock = void 0;
        });
        return provider(options);
      }
    }
    return credentials;
  }, "provider");
  return provider;
}
__name(memoizeChain, "memoizeChain");
var internalCreateChain = /* @__PURE__ */ __name((providers) => async (awsIdentityProperties) => {
  let lastProviderError;
  for (const provider of providers) {
    try {
      return await provider(awsIdentityProperties);
    } catch (err2) {
      lastProviderError = err2;
      if (err2?.tryNextLink) {
        continue;
      }
      throw err2;
    }
  }
  throw lastProviderError;
}, "internalCreateChain");

// node_modules/@aws-sdk/credential-provider-node/dist-es/defaultProvider.js
var multipleCredentialSourceWarningEmitted = false;
var defaultProvider = /* @__PURE__ */ __name((init = {}) => memoizeChain([
  async () => {
    const profile = init.profile ?? process.env[ENV_PROFILE];
    if (profile) {
      const envStaticCredentialsAreSet = process.env[ENV_KEY] && process.env[ENV_SECRET];
      if (envStaticCredentialsAreSet) {
        if (!multipleCredentialSourceWarningEmitted) {
          const warnFn = init.logger?.warn && init.logger?.constructor?.name !== "NoOpLogger" ? init.logger.warn.bind(init.logger) : console.warn;
          warnFn(`@aws-sdk/credential-provider-node - defaultProvider::fromEnv WARNING:
    Multiple credential sources detected: 
    Both AWS_PROFILE and the pair AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY static credentials are set.
    This SDK will proceed with the AWS_PROFILE value.
    
    However, a future version may change this behavior to prefer the ENV static credentials.
    Please ensure that your environment only sets either the AWS_PROFILE or the
    AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY pair.
`);
          multipleCredentialSourceWarningEmitted = true;
        }
      }
      throw new CredentialsProviderError("AWS_PROFILE is set, skipping fromEnv provider.", {
        logger: init.logger,
        tryNextLink: true
      });
    }
    init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromEnv");
    return fromEnv2(init)();
  },
  async (awsIdentityProperties) => {
    init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromSSO");
    const { ssoStartUrl, ssoAccountId, ssoRegion, ssoRoleName, ssoSession } = init;
    if (!ssoStartUrl && !ssoAccountId && !ssoRegion && !ssoRoleName && !ssoSession) {
      throw new CredentialsProviderError("Skipping SSO provider in default chain (inputs do not include SSO fields).", { logger: init.logger });
    }
    const { fromSSO: fromSSO2 } = await Promise.resolve().then(() => (init_dist_es10(), dist_es_exports4));
    return fromSSO2(init)(awsIdentityProperties);
  },
  async (awsIdentityProperties) => {
    init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromIni");
    const { fromIni: fromIni2 } = await Promise.resolve().then(() => (init_dist_es15(), dist_es_exports8));
    return fromIni2(init)(awsIdentityProperties);
  },
  async (awsIdentityProperties) => {
    init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromProcess");
    const { fromProcess: fromProcess2 } = await Promise.resolve().then(() => (init_dist_es13(), dist_es_exports6));
    return fromProcess2(init)(awsIdentityProperties);
  },
  async (awsIdentityProperties) => {
    init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromTokenFile");
    const { fromTokenFile: fromTokenFile2 } = await Promise.resolve().then(() => (init_dist_es14(), dist_es_exports7));
    return fromTokenFile2(init)(awsIdentityProperties);
  },
  async () => {
    init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::remoteProvider");
    return (await remoteProvider(init))();
  },
  async () => {
    throw new CredentialsProviderError("Could not load credentials from any providers", {
      tryNextLink: false,
      logger: init.logger
    });
  }
], credentialsTreatedAsExpired), "defaultProvider");
var credentialsTreatedAsExpired = /* @__PURE__ */ __name((credentials) => credentials?.expiration !== void 0 && credentials.expiration.getTime() - Date.now() < 3e5, "credentialsTreatedAsExpired");

// node_modules/@aws-sdk/client-dynamodb/dist-es/runtimeConfig.js
init_client2();
init_config2();
init_retry2();
init_serde();
init_dist_es6();

// node_modules/@aws-sdk/client-dynamodb/dist-es/runtimeConfig.shared.js
init_httpAuthSchemes2();
init_protocols2();

// node_modules/@aws-sdk/dynamodb-codec/dist-es/codec-v2/DynamoDBJsonCodec2.js
init_protocols2();
init_schema();
init_serde();
var ATTRIBUTE_VALUE = "com.amazonaws.dynamodb#AttributeValue";
var DynamoDBJsonShapeSerializer2 = class extends JsonShapeSerializer2 {
  static {
    __name(this, "DynamoDBJsonShapeSerializer2");
  }
  writeValue(schema, value, container) {
    if (value != null && typeof value === "object") {
      const ns = NormalizedSchema.of(schema);
      if (ns.isStructSchema() && ns.getName(true) === ATTRIBUTE_VALUE) {
        this.writeAttributeValue(value);
        return;
      }
    }
    super.writeValue(schema, value, container);
  }
  writeAttributeValue(av) {
    const base64Encode = this.serdeContext?.base64Encoder ?? toBase64;
    this.writeAscii("{");
    let first = true;
    for (const key in av) {
      const val = av[key];
      if (val == null)
        continue;
      if (!first) {
        this.writeAscii(",");
      }
      first = false;
      this.writeAsciiQuoted(key);
      this.writeAscii(":");
      switch (key) {
        case "B":
          if (val instanceof Uint8Array) {
            this.writeBase64(val);
          } else {
            this.writeJsonString(val);
          }
          break;
        case "BS":
          this.writeAscii("[");
          {
            const arr = val;
            for (let i6 = 0; i6 < arr.length; i6++) {
              if (i6 > 0)
                this.writeAscii(",");
              const item = arr[i6];
              if (item instanceof Uint8Array) {
                this.writeBase64(item);
              } else {
                this.writeJsonString(base64Encode(item));
              }
            }
          }
          this.writeAscii("]");
          break;
        case "L":
          this.writeAscii("[");
          {
            const arr = val;
            for (let i6 = 0; i6 < arr.length; i6++) {
              if (i6 > 0)
                this.writeAscii(",");
              if (arr[i6] != null) {
                this.writeAttributeValue(arr[i6]);
              } else {
                this.writeAscii("null");
              }
            }
          }
          this.writeAscii("]");
          break;
        case "M":
          this.writeAscii("{");
          {
            const map = val;
            let mapFirst = true;
            for (const k6 in map) {
              if (map[k6] == null)
                continue;
              if (!mapFirst)
                this.writeAscii(",");
              mapFirst = false;
              this.writeJsonString(k6);
              this.writeAscii(":");
              this.writeAttributeValue(map[k6]);
            }
          }
          this.writeAscii("}");
          break;
        case "SS":
        case "NS":
          this.writeAscii("[");
          {
            const arr = val;
            for (let i6 = 0; i6 < arr.length; i6++) {
              if (i6 > 0)
                this.writeAscii(",");
              this.writeJsonString(arr[i6]);
            }
          }
          this.writeAscii("]");
          break;
        case "S":
        case "N":
          this.writeJsonString(val);
          break;
        case "BOOL":
          this.writeAscii(val ? "true" : "false");
          break;
        case "NULL":
          this.writeAscii(val ? "true" : "false");
          break;
        default:
          this.writeAscii(JSON.stringify(val));
          break;
      }
    }
    this.writeAscii("}");
  }
};
var DynamoDBJsonShapeDeserializer2 = class extends JsonShapeDeserializer2 {
  static {
    __name(this, "DynamoDBJsonShapeDeserializer2");
  }
  _read(schema, value) {
    const ns = NormalizedSchema.of(schema);
    if (ns.isStructSchema() && ns.getName(true) === ATTRIBUTE_VALUE) {
      if (value && typeof value === "object") {
        return this.readAttributeValue(value);
      }
    }
    return super._read(ns, value);
  }
  readAttributeValue(av) {
    const base64Decode = this.serdeContext?.base64Decoder ?? fromBase64;
    const out = av;
    if (typeof av.B === "string") {
      out.B = base64Decode(av.B);
    }
    if (Array.isArray(av.BS)) {
      out.BS = av.BS.map(base64Decode);
    }
    if (Array.isArray(av.L)) {
      out.L = av.L.map((v2) => this.readAttributeValue(v2));
    }
    if (av.M && typeof av.M === "object") {
      const m4 = av.M;
      for (const k6 in m4) {
        m4[k6] = this.readAttributeValue(m4[k6]);
      }
    }
    return out;
  }
};
var DynamoDBJsonCodec2 = class extends JsonCodec2 {
  static {
    __name(this, "DynamoDBJsonCodec2");
  }
  constructor() {
    super({
      timestampFormat: {
        useTrait: true,
        default: 7
      },
      jsonName: false
    });
  }
  createSerializer() {
    const serializer = new DynamoDBJsonShapeSerializer2(this.settings);
    serializer.setSerdeContext(this.serdeContext);
    return serializer;
  }
  createDeserializer() {
    const deserializer = new DynamoDBJsonShapeDeserializer2(this.settings);
    deserializer.setSerdeContext(this.serdeContext);
    return deserializer;
  }
};

// node_modules/@aws-sdk/client-dynamodb/dist-es/runtimeConfig.shared.js
init_checksum3();
init_client2();
init_protocols();
init_serde();

// node_modules/@aws-sdk/client-dynamodb/dist-es/endpoint/endpointResolver.js
init_client3();
init_endpoints();

// node_modules/@aws-sdk/client-dynamodb/dist-es/endpoint/bdd.js
init_endpoints();
var L = "ref";
var M = "argv";
var a5 = -1;
var b5 = true;
var c5 = false;
var d5 = "isSet";
var e5 = "booleanEquals";
var f5 = "PartitionResult";
var g5 = "stringEquals";
var h5 = "getAttr";
var i5 = "parsedEndpoint";
var j5 = "aws.parseArn";
var k5 = /* @__PURE__ */ __name((n4) => "ParsedArn_ssa_" + n4, "k");
var l3 = "service";
var m3 = "dynamodb";
var n3 = "isValidHostLabel";
var o3 = "accountId";
var p3 = "FirstArn";
var q3 = /* @__PURE__ */ __name((n4) => "https://{ParsedArn_ssa_" + n4 + "#accountId}.search-ddb.{Region}.{PartitionResult#dualStackDnsSuffix}", "q");
var s2 = /* @__PURE__ */ __name((n4) => "https://{ParsedArn_ssa_" + n4 + "#accountId}.ddb.{Region}.{PartitionResult#dualStackDnsSuffix}", "s");
var t = /* @__PURE__ */ __name((n4) => "https://{ParsedArn_ssa_" + n4 + "#accountId}.search-ddb.{Region}.{PartitionResult#dnsSuffix}", "t");
var u = /* @__PURE__ */ __name((n4) => "https://{ParsedArn_ssa_" + n4 + "#accountId}.ddb.{Region}.{PartitionResult#dnsSuffix}", "u");
var v = { [L]: "Region" };
var w = { [L]: f5 };
var x = { "fn": h5, [M]: [{ [L]: i5 }, "authority"] };
var y = { [L]: "AccountIdEndpointMode" };
var z = { "fn": h5, [M]: [w, "name"] };
var A = { [L]: "ParsedArn_ssa_2" };
var B = { "fn": h5, [M]: [A, "region"] };
var C = { [L]: "ResourceArnList" };
var D = { "fn": h5, [M]: [{ [L]: "ParsedArn_ssa_1" }, "region"] };
var E = { [L]: "ParsedArn_ssa_1" };
var F = { [L]: "AccountId" };
var G = {};
var H = { "metricValues": ["O"] };
var I = [v];
var J = [{ [L]: "Endpoint" }];
var K2 = [{ [L]: "ResourceArn" }];
var _data5 = {
  conditions: [
    [d5, I],
    [d5, J],
    [e5, [{ [L]: "UseFIPS" }, b5]],
    [e5, [{ [L]: "UseDualStack" }, b5]],
    ["aws.partition", I, f5],
    [g5, [v, "local"]],
    [e5, [{ fn: h5, [M]: [w, "supportsFIPS"] }, b5]],
    ["parseURL", J, i5],
    [g5, ["dynamodb.{Region}.{PartitionResult#dualStackDnsSuffix}", x]],
    [e5, [{ fn: h5, [M]: [w, "supportsDualStack"] }, b5]],
    [g5, ["search-dynamodb.{Region}.{PartitionResult#dualStackDnsSuffix}", x]],
    [d5, [y]],
    [g5, [v, "us-gov-east-1"]],
    [g5, [v, "cn-north-1"]],
    [g5, [v, "cn-northwest-1"]],
    [g5, [v, "us-gov-west-1"]],
    [g5, [z, "aws"]],
    [g5, [y, "disabled"]],
    [d5, K2],
    [j5, K2, k5(2)],
    [g5, [{ fn: h5, [M]: [A, l3] }, m3]],
    [g5, [B, v]],
    [n3, [{ fn: h5, [M]: [A, o3] }, c5]],
    [n3, [B, c5]],
    [d5, [C]],
    [h5, [C, "[0]"], p3],
    [j5, [{ [L]: p3 }], k5(1)],
    [g5, [D, v]],
    [g5, [{ fn: h5, [M]: [E, l3] }, m3]],
    [n3, [{ fn: h5, [M]: [E, o3] }, c5]],
    [n3, [D, c5]],
    [d5, [F]],
    [g5, [y, "required"]],
    [n3, [F, c5]],
    [g5, [z, "aws-us-gov"]],
    [e5, [{ fn: "coalesce", [M]: [{ [L]: "IsSearchOperation" }, c5] }, b5]]
  ],
  results: [
    [a5],
    [a5, "Invalid Configuration: FIPS and custom endpoint are not supported"],
    [a5, "Invalid Configuration: Dualstack and custom endpoint are not supported"],
    [a5, "Endpoint override is not supported for dual-stack endpoints. Please enable dual-stack functionality by enabling the configuration. For more details, see: https://docs.aws.amazon.com/sdkref/latest/guide/feature-endpoints.html"],
    ["{Endpoint}", G],
    [a5, "Invalid Configuration: FIPS and local endpoint are not supported"],
    [a5, "Invalid Configuration: Dualstack and local endpoint are not supported"],
    ["http://localhost:8000", { authSchemes: [{ signingRegion: "us-east-1", name: "sigv4", signingName: m3 }] }],
    [a5, "Invalid Configuration: AccountIdEndpointMode is required and FIPS is enabled, but FIPS account endpoints are not supported"],
    ["https://search-dynamodb-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", G],
    ["https://dynamodb-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", G],
    [a5, "FIPS and DualStack are enabled, but this partition does not support one or both"],
    ["https://search-dynamodb.{Region}.{PartitionResult#dnsSuffix}", G],
    ["https://dynamodb.{Region}.{PartitionResult#dnsSuffix}", G],
    ["https://search-dynamodb-fips.{Region}.{PartitionResult#dnsSuffix}", G],
    ["https://dynamodb-fips.{Region}.{PartitionResult#dnsSuffix}", G],
    [a5, "FIPS is enabled but this partition does not support FIPS"],
    [a5, "Invalid Configuration: AccountIdEndpointMode is required but account endpoints are not supported in this region"],
    ["https://search-dynamodb.{Region}.{PartitionResult#dualStackDnsSuffix}", G],
    ["https://dynamodb.{Region}.{PartitionResult#dualStackDnsSuffix}", G],
    [q3(2), H],
    [s2(2), H],
    [q3(1), H],
    [s2(1), H],
    ["https://{AccountId}.search-ddb.{Region}.{PartitionResult#dualStackDnsSuffix}", H],
    ["https://{AccountId}.ddb.{Region}.{PartitionResult#dualStackDnsSuffix}", H],
    [a5, "Credentials-sourced account ID parameter is invalid"],
    [a5, "AccountIdEndpointMode is required but no AccountID was provided or able to be loaded"],
    [a5, "DualStack is enabled but this partition does not support DualStack"],
    [t(2), H],
    [u(2), H],
    [t(1), H],
    [u(1), H],
    ["https://{AccountId}.search-ddb.{Region}.{PartitionResult#dnsSuffix}", H],
    ["https://{AccountId}.ddb.{Region}.{PartitionResult#dnsSuffix}", H],
    [a5, "Invalid Configuration: Missing Region"]
  ]
};
var root5 = 2;
var r5 = 1e8;
var nodes5 = new Int32Array([
  -1,
  1,
  -1,
  0,
  6,
  3,
  1,
  4,
  r5 + 35,
  2,
  r5 + 1,
  5,
  3,
  r5 + 2,
  r5 + 4,
  1,
  85,
  7,
  2,
  69,
  8,
  3,
  38,
  9,
  4,
  10,
  r5 + 35,
  5,
  r5 + 7,
  11,
  11,
  12,
  77,
  12,
  18,
  13,
  13,
  18,
  14,
  14,
  18,
  15,
  15,
  18,
  16,
  16,
  18,
  17,
  32,
  r5 + 17,
  77,
  17,
  37,
  19,
  18,
  20,
  25,
  19,
  21,
  25,
  20,
  22,
  25,
  21,
  23,
  25,
  22,
  24,
  25,
  23,
  36,
  25,
  24,
  26,
  32,
  25,
  27,
  32,
  26,
  28,
  32,
  27,
  29,
  32,
  28,
  30,
  32,
  29,
  31,
  32,
  30,
  35,
  32,
  31,
  33,
  37,
  33,
  34,
  r5 + 26,
  35,
  r5 + 33,
  r5 + 34,
  35,
  r5 + 31,
  r5 + 32,
  35,
  r5 + 29,
  r5 + 30,
  32,
  r5 + 27,
  77,
  4,
  39,
  r5 + 35,
  5,
  r5 + 6,
  40,
  9,
  41,
  r5 + 28,
  11,
  42,
  68,
  12,
  48,
  43,
  13,
  48,
  44,
  14,
  48,
  45,
  15,
  48,
  46,
  16,
  48,
  47,
  32,
  r5 + 17,
  68,
  17,
  67,
  49,
  18,
  50,
  55,
  19,
  51,
  55,
  20,
  52,
  55,
  21,
  53,
  55,
  22,
  54,
  55,
  23,
  66,
  55,
  24,
  56,
  62,
  25,
  57,
  62,
  26,
  58,
  62,
  27,
  59,
  62,
  28,
  60,
  62,
  29,
  61,
  62,
  30,
  65,
  62,
  31,
  63,
  67,
  33,
  64,
  r5 + 26,
  35,
  r5 + 24,
  r5 + 25,
  35,
  r5 + 22,
  r5 + 23,
  35,
  r5 + 20,
  r5 + 21,
  32,
  r5 + 27,
  68,
  35,
  r5 + 18,
  r5 + 19,
  3,
  78,
  70,
  4,
  71,
  r5 + 35,
  5,
  r5 + 5,
  72,
  6,
  73,
  r5 + 16,
  11,
  74,
  75,
  32,
  r5 + 8,
  75,
  34,
  77,
  76,
  35,
  r5 + 14,
  r5 + 15,
  35,
  r5 + 12,
  r5 + 13,
  4,
  79,
  r5 + 35,
  5,
  r5 + 5,
  80,
  6,
  81,
  r5 + 11,
  9,
  82,
  r5 + 11,
  11,
  83,
  84,
  32,
  r5 + 8,
  84,
  35,
  r5 + 9,
  r5 + 10,
  2,
  r5 + 1,
  86,
  3,
  r5 + 2,
  87,
  4,
  88,
  r5 + 4,
  7,
  89,
  r5 + 4,
  8,
  r5 + 3,
  90,
  10,
  r5 + 3,
  r5 + 4
]);
var bdd5 = BinaryDecisionDiagram.from(nodes5, root5, _data5.conditions, _data5.results);

// node_modules/@aws-sdk/client-dynamodb/dist-es/endpoint/endpointResolver.js
var cache5 = new EndpointCache({
  size: 50,
  params: [
    "AccountId",
    "AccountIdEndpointMode",
    "Endpoint",
    "IsSearchOperation",
    "Region",
    "ResourceArn",
    "ResourceArnList",
    "UseDualStack",
    "UseFIPS"
  ]
});
var defaultEndpointResolver5 = /* @__PURE__ */ __name((endpointParams, context = {}) => {
  return cache5.get(endpointParams, () => decideEndpoint(bdd5, {
    endpointParams,
    logger: context.logger
  }));
}, "defaultEndpointResolver");
customEndpointFunctions.aws = awsEndpointFunctions;

// node_modules/@aws-sdk/client-dynamodb/dist-es/runtimeConfig.shared.js
var getRuntimeConfig9 = /* @__PURE__ */ __name((config) => {
  return {
    apiVersion: "2012-08-10",
    base64Decoder: config?.base64Decoder ?? fromBase64,
    base64Encoder: config?.base64Encoder ?? toBase64,
    disableHostPrefix: config?.disableHostPrefix ?? false,
    endpointProvider: config?.endpointProvider ?? defaultEndpointResolver5,
    extensions: config?.extensions ?? [],
    httpAuthSchemeProvider: config?.httpAuthSchemeProvider ?? defaultDynamoDBHttpAuthSchemeProvider,
    httpAuthSchemes: config?.httpAuthSchemes ?? [
      {
        schemeId: "aws.auth#sigv4",
        identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("aws.auth#sigv4"), "identityProvider"),
        signer: new AwsSdkSigV4Signer()
      }
    ],
    logger: config?.logger ?? new NoOpLogger(),
    protocol: config?.protocol ?? AwsJson1_0Protocol,
    protocolSettings: config?.protocolSettings ?? {
      defaultNamespace: "com.amazonaws.dynamodb",
      errorTypeRegistries,
      xmlNamespace: "http://dynamodb.amazonaws.com/doc/2012-08-10/",
      version: "2012-08-10",
      serviceTarget: "DynamoDB_20120810",
      jsonCodec: new DynamoDBJsonCodec2()
    },
    serviceId: config?.serviceId ?? "DynamoDB",
    sha256: config?.sha256 ?? Sha256Node,
    urlParser: config?.urlParser ?? parseUrl,
    utf8Decoder: config?.utf8Decoder ?? fromUtf8,
    utf8Encoder: config?.utf8Encoder ?? toUtf8
  };
}, "getRuntimeConfig");

// node_modules/@aws-sdk/client-dynamodb/dist-es/runtimeConfig.js
var getRuntimeConfig10 = /* @__PURE__ */ __name((config) => {
  emitWarningIfUnsupportedVersion(process.version);
  const defaultsMode = resolveDefaultsModeConfig(config);
  const defaultConfigProvider = /* @__PURE__ */ __name(() => defaultsMode().then(loadConfigsForDefaultMode), "defaultConfigProvider");
  const clientSharedValues = getRuntimeConfig9(config);
  emitWarningIfUnsupportedVersion2(process.version);
  const loaderConfig = {
    profile: config?.profile,
    logger: clientSharedValues.logger
  };
  return {
    ...clientSharedValues,
    ...config,
    runtime: "node",
    defaultsMode,
    accountIdEndpointMode: config?.accountIdEndpointMode ?? loadConfig(NODE_ACCOUNT_ID_ENDPOINT_MODE_CONFIG_OPTIONS, loaderConfig),
    authSchemePreference: config?.authSchemePreference ?? loadConfig(NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, loaderConfig),
    bodyLengthChecker: config?.bodyLengthChecker ?? calculateBodyLength,
    credentialDefaultProvider: config?.credentialDefaultProvider ?? defaultProvider,
    defaultUserAgentProvider: config?.defaultUserAgentProvider ?? createDefaultUserAgentProvider({ serviceId: clientSharedValues.serviceId, clientVersion: package_default.version }),
    endpointDiscoveryEnabledProvider: config?.endpointDiscoveryEnabledProvider ?? loadConfig(NODE_ENDPOINT_DISCOVERY_CONFIG_OPTIONS, loaderConfig),
    maxAttempts: config?.maxAttempts ?? loadConfig(Retry.v2026 ? { ...NODE_MAX_ATTEMPT_CONFIG_OPTIONS, default: 4 } : NODE_MAX_ATTEMPT_CONFIG_OPTIONS, config),
    region: config?.region ?? loadConfig(NODE_REGION_CONFIG_OPTIONS, { ...NODE_REGION_CONFIG_FILE_OPTIONS, ...loaderConfig }),
    requestHandler: NodeHttpHandler.create(config?.requestHandler ?? defaultConfigProvider),
    retryMode: config?.retryMode ?? loadConfig({
      ...NODE_RETRY_MODE_CONFIG_OPTIONS,
      default: /* @__PURE__ */ __name(async () => (await defaultConfigProvider()).retryMode || DEFAULT_RETRY_MODE, "default")
    }, config),
    streamCollector: config?.streamCollector ?? streamCollector2,
    useDualstackEndpoint: config?.useDualstackEndpoint ?? loadConfig(NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
    useFipsEndpoint: config?.useFipsEndpoint ?? loadConfig(NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
    userAgentAppId: config?.userAgentAppId ?? loadConfig(NODE_APP_ID_CONFIG_OPTIONS, loaderConfig)
  };
}, "getRuntimeConfig");

// node_modules/@aws-sdk/client-dynamodb/dist-es/runtimeExtensions.js
init_client3();
init_client2();
init_protocols();

// node_modules/@aws-sdk/client-dynamodb/dist-es/auth/httpAuthExtensionConfiguration.js
var getHttpAuthExtensionConfiguration5 = /* @__PURE__ */ __name((runtimeConfig) => {
  const _httpAuthSchemes = runtimeConfig.httpAuthSchemes;
  let _httpAuthSchemeProvider = runtimeConfig.httpAuthSchemeProvider;
  let _credentials = runtimeConfig.credentials;
  return {
    setHttpAuthScheme(httpAuthScheme) {
      const index = _httpAuthSchemes.findIndex((scheme) => scheme.schemeId === httpAuthScheme.schemeId);
      if (index === -1) {
        _httpAuthSchemes.push(httpAuthScheme);
      } else {
        _httpAuthSchemes.splice(index, 1, httpAuthScheme);
      }
    },
    httpAuthSchemes() {
      return _httpAuthSchemes;
    },
    setHttpAuthSchemeProvider(httpAuthSchemeProvider) {
      _httpAuthSchemeProvider = httpAuthSchemeProvider;
    },
    httpAuthSchemeProvider() {
      return _httpAuthSchemeProvider;
    },
    setCredentials(credentials) {
      _credentials = credentials;
    },
    credentials() {
      return _credentials;
    }
  };
}, "getHttpAuthExtensionConfiguration");
var resolveHttpAuthRuntimeConfig5 = /* @__PURE__ */ __name((config) => {
  return {
    httpAuthSchemes: config.httpAuthSchemes(),
    httpAuthSchemeProvider: config.httpAuthSchemeProvider(),
    credentials: config.credentials()
  };
}, "resolveHttpAuthRuntimeConfig");

// node_modules/@aws-sdk/client-dynamodb/dist-es/runtimeExtensions.js
var resolveRuntimeExtensions5 = /* @__PURE__ */ __name((runtimeConfig, extensions) => {
  const extensionConfiguration = Object.assign(getAwsRegionExtensionConfiguration(runtimeConfig), getDefaultExtensionConfiguration(runtimeConfig), getHttpHandlerExtensionConfiguration(runtimeConfig), getHttpAuthExtensionConfiguration5(runtimeConfig));
  extensions.forEach((extension) => extension.configure(extensionConfiguration));
  return Object.assign(runtimeConfig, resolveAwsRegionExtensionConfiguration(extensionConfiguration), resolveDefaultRuntimeConfig2(extensionConfiguration), resolveHttpHandlerRuntimeConfig(extensionConfiguration), resolveHttpAuthRuntimeConfig5(extensionConfiguration));
}, "resolveRuntimeExtensions");

// node_modules/@aws-sdk/client-dynamodb/dist-es/DynamoDBClient.js
var DynamoDBClient = class extends Client {
  static {
    __name(this, "DynamoDBClient");
  }
  config;
  constructor(...[configuration]) {
    const _config_0 = getRuntimeConfig10(configuration || {});
    super(_config_0);
    this.initConfig = _config_0;
    const _config_1 = resolveClientEndpointParameters(_config_0);
    const _config_2 = resolveAccountIdEndpointModeConfig(_config_1);
    const _config_3 = resolveUserAgentConfig(_config_2);
    const _config_4 = resolveRetryConfig(_config_3, { defaultBaseDelay: Retry.v2026 ? 25 : void 0, defaultMaxAttempts: Retry.v2026 ? 4 : void 0 });
    const _config_5 = resolveRegionConfig(_config_4);
    const _config_6 = resolveHostHeaderConfig(_config_5);
    const _config_7 = resolveEndpointConfig(_config_6);
    const _config_8 = resolveHttpAuthSchemeConfig(_config_7);
    const _config_9 = resolveEndpointDiscoveryConfig(_config_8, { endpointDiscoveryCommandCtor: DescribeEndpointsCommand });
    const _config_10 = resolveRuntimeExtensions5(_config_9, configuration?.extensions || []);
    this.config = _config_10;
    this.middlewareStack.use(getSchemaSerdePlugin(this.config));
    this.middlewareStack.use(getUserAgentPlugin(this.config));
    this.middlewareStack.use(getRetryPlugin(this.config));
    this.middlewareStack.use(getContentLengthPlugin(this.config));
    this.middlewareStack.use(getHostHeaderPlugin(this.config));
    this.middlewareStack.use(getLoggerPlugin(this.config));
    this.middlewareStack.use(getRecursionDetectionPlugin(this.config));
    this.middlewareStack.use(getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
      httpAuthSchemeParametersProvider: defaultDynamoDBHttpAuthSchemeParametersProvider,
      identityProviderConfigProvider: /* @__PURE__ */ __name(async (config) => new DefaultIdentityProviderConfig({
        "aws.auth#sigv4": config.credentials
      }), "identityProviderConfigProvider")
    }));
    this.middlewareStack.use(getHttpSigningPlugin(this.config));
  }
  destroy() {
    super.destroy();
  }
};

// node_modules/@aws-sdk/client-dynamodb/dist-es/commands/GetItemCommand.js
var GetItemCommand = class extends command(_ep2, _mw0, "GetItem", GetItem$) {
  static {
    __name(this, "GetItemCommand");
  }
};

// xray.mjs
import { randomBytes } from "node:crypto";
import { createSocket } from "node:dgram";
var HEADER = '{"format":"json","version":1}\n';
var [HOST, PORT] = (process.env.AWS_XRAY_DAEMON_ADDRESS ?? "127.0.0.1:2000").split(":");
var socket;
function invocation() {
  const header = process.env._X_AMZN_TRACE_ID ?? "";
  const root6 = /Root=([^;]+)/.exec(header)?.[1];
  const parent = /Parent=([^;]+)/.exec(header)?.[1];
  return root6 && parent && /Sampled=1/.test(header) ? { root: root6, parent } : null;
}
__name(invocation, "invocation");
var newId = /* @__PURE__ */ __name(() => randomBytes(8).toString("hex"), "newId");
function send(document) {
  return new Promise((resolve) => {
    try {
      socket ??= createSocket("udp4").unref();
      socket.send(HEADER + JSON.stringify(document), Number(PORT), HOST, () => resolve());
    } catch {
      resolve();
    }
  });
}
__name(send, "send");
function flags(status) {
  if (status === 429) return { error: true, throttle: true };
  if (status >= 500) return { fault: true };
  if (status >= 400) return { error: true };
  return {};
}
__name(flags, "flags");
function traceCalls(client2, resource) {
  const sendCommand = client2.send.bind(client2);
  client2.send = async (command6, ...rest) => {
    const trace = invocation();
    const startTime = Date.now() / 1e3;
    let status = 200;
    let failure;
    try {
      const output = await sendCommand(command6, ...rest);
      status = output?.$metadata?.httpStatusCode ?? 200;
      return output;
    } catch (error) {
      failure = error;
      status = error?.$metadata?.httpStatusCode ?? 500;
      throw error;
    } finally {
      if (trace) {
        await send({
          type: "subsegment",
          id: newId(),
          trace_id: trace.root,
          parent_id: trace.parent,
          name: resource(),
          namespace: "remote",
          start_time: startTime,
          end_time: Date.now() / 1e3,
          http: { response: { status } },
          annotations: { operation: command6.constructor.name.replace(/Command$/, "") },
          ...flags(status),
          ...failure ? {
            cause: {
              exceptions: [{ id: newId(), type: failure.name, message: String(failure.message ?? "").slice(0, 256) }]
            }
          } : {}
        });
      }
    }
  };
  return client2;
}
__name(traceCalls, "traceCalls");

// orders-tool/index.mjs
var client = traceCalls(new DynamoDBClient({}), () => TABLE);
var TABLE = process.env.AWS_DYNAMODB_TABLE_NAME_0;
var TOOL_NAME_DELIMITER = "___";
function toolName(context) {
  const custom = context?.clientContext?.custom ?? context?.clientContext?.Custom ?? {};
  const fullName = String(custom.bedrockAgentCoreToolName ?? "");
  const at = fullName.indexOf(TOOL_NAME_DELIMITER);
  return at === -1 ? fullName : fullName.slice(at + TOOL_NAME_DELIMITER.length);
}
__name(toolName, "toolName");
var handler = /* @__PURE__ */ __name(async (event, context) => {
  const tool = toolName(context);
  if (tool && tool !== "get_order_status") {
    return { error: `Unknown tool: ${tool}` };
  }
  const orderId = String(event?.order_id ?? "").trim();
  if (!orderId) {
    return { error: "An order id is required." };
  }
  try {
    const { Item } = await client.send(
      new GetItemCommand({ TableName: TABLE, Key: { order_id: { S: orderId } } })
    );
    if (!Item) {
      return { found: false, order_id: orderId, message: `Order ${orderId} was not found.` };
    }
    const order = Object.fromEntries(
      Object.entries(Item).map(([name, value]) => [name, value.S ?? value.N ?? ""])
    );
    return { found: true, order };
  } catch (error) {
    console.error("Reading the order failed:", error);
    return { error: `The order could not be read (${error.name}).` };
  }
}, "handler");
export {
  handler
};
