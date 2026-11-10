(() => {
  // node_modules/bootstrap/js/dist/dom/data.js
  var elementMap = /* @__PURE__ */ new Map();
  var data_default = {
    set(element, key, instance) {
      if (!elementMap.has(element)) elementMap.set(element, /* @__PURE__ */ new Map());
      const instanceMap = elementMap.get(element);
      if (!instanceMap.has(key) && instanceMap.size !== 0) {
        console.error(`Bootstrap doesn't allow more than one instance per element. Bound instance: ${[...instanceMap.keys()][0]}.`);
        return;
      }
      instanceMap.set(key, instance);
    },
    get(element, key) {
      if (element && elementMap.has(element)) return elementMap.get(element).get(key) || null;
      return null;
    },
    getAny(element) {
      if (element && elementMap.has(element)) return elementMap.get(element).values().next().value || null;
      return null;
    },
    remove(element, key) {
      if (!elementMap.has(element)) return;
      const instanceMap = elementMap.get(element);
      instanceMap.delete(key);
      if (instanceMap.size === 0) elementMap.delete(element);
    }
  };

  // node_modules/bootstrap/js/dist/dom/event-handler.js
  var namespaceRegex = /[^.]*(?=\..*)\.|.*/;
  var stripNameRegex = /\..*/;
  var stripUidRegex = /::\d+$/;
  var eventRegistry = {};
  var uidEvent = 1;
  var customEvents = {
    mouseenter: "mouseover",
    mouseleave: "mouseout"
  };
  var nativeEvents = /* @__PURE__ */ new Set([
    "click",
    "dblclick",
    "mouseup",
    "mousedown",
    "contextmenu",
    "mousewheel",
    "DOMMouseScroll",
    "mouseover",
    "mouseout",
    "mousemove",
    "selectstart",
    "selectend",
    "keydown",
    "keypress",
    "keyup",
    "input",
    "paste",
    "orientationchange",
    "touchstart",
    "touchmove",
    "touchend",
    "touchcancel",
    "pointerdown",
    "pointermove",
    "pointerup",
    "pointerleave",
    "pointercancel",
    "gesturestart",
    "gesturechange",
    "gestureend",
    "focus",
    "blur",
    "change",
    "reset",
    "select",
    "submit",
    "focusin",
    "focusout",
    "load",
    "unload",
    "beforeunload",
    "resize",
    "move",
    "DOMContentLoaded",
    "readystatechange",
    "error",
    "abort",
    "scroll",
    "scrollend"
  ]);
  function makeEventUid(element, uid) {
    return uid && `${uid}::${uidEvent++}` || element.uidEvent || uidEvent++;
  }
  function getElementEvents(element) {
    const uid = makeEventUid(element);
    element.uidEvent = uid;
    eventRegistry[uid] = eventRegistry[uid] || {};
    return eventRegistry[uid];
  }
  function isMouseEventWithinTarget(event) {
    const { delegateTarget, relatedTarget } = event;
    return Boolean(relatedTarget && delegateTarget.contains(relatedTarget));
  }
  function bootstrapHandler(element, fn, handlerTypeEvent) {
    const isCustomMouseEvent = handlerTypeEvent in customEvents;
    return function handler(event) {
      const bootstrapEvent = hydrateObj(event, { delegateTarget: element });
      if (isCustomMouseEvent && isMouseEventWithinTarget(bootstrapEvent)) return;
      if (handler.oneOff) EventHandler.off(element, handlerTypeEvent, fn);
      return fn.apply(element, [bootstrapEvent]);
    };
  }
  function bootstrapDelegationHandler(element, selector, fn, handlerTypeEvent) {
    const isCustomMouseEvent = handlerTypeEvent in customEvents;
    return function handler(event) {
      const domElements = element.querySelectorAll(selector);
      for (let { target } = event; target && target !== this; target = target.parentNode) for (const domElement of domElements) {
        if (domElement !== target) continue;
        const bootstrapEvent = hydrateObj(event, { delegateTarget: target });
        if (isCustomMouseEvent && isMouseEventWithinTarget(bootstrapEvent)) return;
        if (handler.oneOff) EventHandler.off(element, handlerTypeEvent, selector, fn);
        return fn.apply(target, [bootstrapEvent]);
      }
    };
  }
  function findHandler(events, callable, handlerTypeEvent, delegationSelector = null) {
    return Object.values(events).find((event) => event.callable === callable && event.handlerTypeEvent === handlerTypeEvent && event.delegationSelector === delegationSelector);
  }
  function normalizeParameters(originalTypeEvent, handler, delegationFunction) {
    const isDelegated = typeof handler === "string";
    const callable = isDelegated ? delegationFunction : handler || delegationFunction;
    const baseTypeEvent = originalTypeEvent.replace(stripNameRegex, "");
    let typeEvent = customEvents[baseTypeEvent] || baseTypeEvent;
    if (!nativeEvents.has(typeEvent)) typeEvent = originalTypeEvent;
    const handlerTypeEvent = baseTypeEvent in customEvents ? baseTypeEvent : typeEvent;
    return {
      isDelegated,
      callable,
      typeEvent,
      handlerTypeEvent
    };
  }
  function addHandler(element, originalTypeEvent, handler, delegationFunction, oneOff) {
    if (typeof originalTypeEvent !== "string" || !element) return;
    const { isDelegated, callable, typeEvent, handlerTypeEvent } = normalizeParameters(originalTypeEvent, handler, delegationFunction);
    const events = getElementEvents(element);
    const handlers = events[typeEvent] || (events[typeEvent] = {});
    const previousFunction = findHandler(handlers, callable, handlerTypeEvent, isDelegated ? handler : null);
    if (previousFunction) {
      previousFunction.oneOff = previousFunction.oneOff && oneOff;
      return;
    }
    const uid = makeEventUid(callable, originalTypeEvent.replace(namespaceRegex, ""));
    const fn = isDelegated ? bootstrapDelegationHandler(element, handler, callable, handlerTypeEvent) : bootstrapHandler(element, callable, handlerTypeEvent);
    fn.delegationSelector = isDelegated ? handler : null;
    fn.callable = callable;
    fn.handlerTypeEvent = handlerTypeEvent;
    fn.oneOff = oneOff;
    fn.uidEvent = uid;
    handlers[uid] = fn;
    element.addEventListener(typeEvent, fn, isDelegated);
  }
  function removeHandler(element, events, typeEvent, handler) {
    element.removeEventListener(typeEvent, handler, Boolean(handler.delegationSelector));
    delete events[typeEvent][handler.uidEvent];
  }
  function removeNamespacedHandlers(element, events, typeEvent, namespace) {
    const storeElementEvent = events[typeEvent] || {};
    for (const [handlerKey, event] of Object.entries(storeElementEvent)) if (handlerKey.includes(namespace)) removeHandler(element, events, typeEvent, event);
  }
  function trigger(element, event, args) {
    if (typeof event !== "string" || !element) return null;
    const evt = hydrateObj(new Event(event, {
      bubbles: true,
      cancelable: true
    }), args);
    element.dispatchEvent(evt);
    return evt;
  }
  var EventHandler = {
    on(element, event, handler, delegationFunction) {
      addHandler(element, event, handler, delegationFunction, false);
    },
    one(element, event, handler, delegationFunction) {
      addHandler(element, event, handler, delegationFunction, true);
    },
    off(element, originalTypeEvent, handler, delegationFunction) {
      if (typeof originalTypeEvent !== "string" || !element) return;
      const { isDelegated, callable, typeEvent, handlerTypeEvent } = normalizeParameters(originalTypeEvent, handler, delegationFunction);
      const inNamespace = typeEvent !== originalTypeEvent && handlerTypeEvent !== originalTypeEvent;
      const events = getElementEvents(element);
      const storeElementEvent = events[typeEvent] || {};
      const isNamespace = originalTypeEvent.startsWith(".");
      if (typeof callable !== "undefined") {
        if (!Object.keys(storeElementEvent).length) return;
        const fn = findHandler(storeElementEvent, callable, handlerTypeEvent, isDelegated ? handler : null);
        if (fn) removeHandler(element, events, typeEvent, fn);
        return;
      }
      if (isNamespace) for (const elementEvent of Object.keys(events)) removeNamespacedHandlers(element, events, elementEvent, originalTypeEvent.slice(1));
      for (const [keyHandlers, event] of Object.entries(storeElementEvent)) {
        const handlerKey = keyHandlers.replace(stripUidRegex, "");
        if (event.handlerTypeEvent === handlerTypeEvent && (!inNamespace || originalTypeEvent.includes(handlerKey))) removeHandler(element, events, typeEvent, event);
      }
    },
    trigger
  };
  function hydrateObj(obj, meta = {}) {
    for (const [key, value] of Object.entries(meta)) try {
      obj[key] = value;
    } catch {
      Object.defineProperty(obj, key, {
        configurable: true,
        get() {
          return value;
        }
      });
    }
    return obj;
  }

  // node_modules/bootstrap/js/dist/dom/manipulator.js
  function normalizeData(value) {
    if (value === "true") return true;
    if (value === "false") return false;
    if (value === Number(value).toString()) return Number(value);
    if (value === "" || value === "null") return null;
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(decodeURIComponent(value));
    } catch {
      return value;
    }
  }
  function normalizeDataKey(key) {
    return key.replace(/[A-Z]/g, (chr) => `-${chr.toLowerCase()}`);
  }
  var Manipulator = {
    setDataAttribute(element, key, value) {
      element.setAttribute(`data-bs-${normalizeDataKey(key)}`, value);
    },
    removeDataAttribute(element, key) {
      element.removeAttribute(`data-bs-${normalizeDataKey(key)}`);
    },
    getDataAttributes(element) {
      if (!element) return {};
      const attributes = {};
      const bsKeys = Object.keys(element.dataset).filter((key) => key.startsWith("bs") && !key.startsWith("bsConfig"));
      for (const key of bsKeys) {
        let pureKey = key.replace(/^bs/, "");
        pureKey = pureKey.charAt(0).toLowerCase() + pureKey.slice(1);
        attributes[pureKey] = normalizeData(element.dataset[key]);
      }
      return attributes;
    },
    getDataAttribute(element, key) {
      return normalizeData(element.getAttribute(`data-bs-${normalizeDataKey(key)}`));
    }
  };

  // node_modules/bootstrap/js/dist/util/index.js
  var MAX_UID = 1e6;
  var MILLISECONDS_MULTIPLIER = 1e3;
  var TRANSITION_END = "transitionend";
  var parseSelector = (selector) => {
    if (selector && window.CSS && window.CSS.escape) selector = selector.replace(/#([^\s"#']+)/g, (match, id) => `#${CSS.escape(id)}`);
    return selector;
  };
  var toType = (object) => {
    if (object === null || object === void 0) return `${object}`;
    return Object.prototype.toString.call(object).match(/\s([a-z]+)/i)[1].toLowerCase();
  };
  var getUID = (prefix) => {
    do
      prefix += Math.floor(Math.random() * MAX_UID);
    while (document.getElementById(prefix));
    return prefix;
  };
  var getTransitionDurationFromElement = (element) => {
    if (!element) return 0;
    let { transitionDuration, transitionDelay } = window.getComputedStyle(element);
    if (!Number.parseFloat(transitionDuration) && !Number.parseFloat(transitionDelay)) return 0;
    transitionDuration = transitionDuration.split(",")[0];
    transitionDelay = transitionDelay.split(",")[0];
    return (Number.parseFloat(transitionDuration) + Number.parseFloat(transitionDelay)) * MILLISECONDS_MULTIPLIER;
  };
  var triggerTransitionEnd = (element) => {
    element.dispatchEvent(new Event(TRANSITION_END));
  };
  var isElement = (object) => {
    if (!object || typeof object !== "object") return false;
    return typeof object.nodeType !== "undefined";
  };
  var getElement = (object) => {
    if (isElement(object)) return object;
    if (typeof object === "string" && object.length > 0) return document.querySelector(parseSelector(object));
    return null;
  };
  var isVisible = (element) => {
    if (!isElement(element) || element.getClientRects().length === 0) return false;
    const elementIsVisible = getComputedStyle(element).getPropertyValue("visibility") === "visible";
    const closedDetails = element.closest("details:not([open])");
    if (!closedDetails) return elementIsVisible;
    if (closedDetails !== element) {
      const summary = element.closest("summary");
      if (summary && summary.parentNode !== closedDetails) return false;
      if (summary === null) return false;
    }
    return elementIsVisible;
  };
  var isDisabled = (element) => {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return true;
    if (element.classList.contains("disabled")) return true;
    const disableableElement = element;
    if (typeof disableableElement.disabled !== "undefined") return disableableElement.disabled;
    return element.hasAttribute("disabled") && element.getAttribute("disabled") !== "false";
  };
  var setAriaAttribute = (element, name, value) => {
    element.setAttribute(name, String(value));
  };
  var findShadowRoot = (element) => {
    if (!document.documentElement.attachShadow) return null;
    if (typeof element.getRootNode === "function") {
      const root = element.getRootNode();
      return root instanceof ShadowRoot ? root : null;
    }
    if (element instanceof ShadowRoot) return element;
    if (!element.parentNode) return null;
    return findShadowRoot(element.parentNode);
  };
  var noop = () => {
  };
  var isRTL = () => document.documentElement.dir === "rtl";
  var execute = (possibleCallback, args = [], defaultValue = possibleCallback) => {
    return typeof possibleCallback === "function" ? possibleCallback.call(...args) : defaultValue;
  };
  var executeAfterTransition = (callback, transitionElement, waitForTransition = true) => {
    if (!waitForTransition) {
      execute(callback);
      return;
    }
    const emulatedDuration = getTransitionDurationFromElement(transitionElement) + 5;
    let called = false;
    const handler = ({ target }) => {
      if (target !== transitionElement) return;
      called = true;
      transitionElement.removeEventListener(TRANSITION_END, handler);
      execute(callback);
    };
    transitionElement.addEventListener(TRANSITION_END, handler);
    setTimeout(() => {
      if (!called) triggerTransitionEnd(transitionElement);
    }, emulatedDuration);
  };
  var getNextActiveElement = (list, activeElement, shouldGetNext, isCycleAllowed) => {
    const listLength = list.length;
    let index = list.indexOf(activeElement);
    if (index === -1) return !shouldGetNext && isCycleAllowed ? list[listLength - 1] : list[0];
    index += shouldGetNext ? 1 : -1;
    if (isCycleAllowed) index = (index + listLength) % listLength;
    return list[Math.max(0, Math.min(index, listLength - 1))];
  };

  // node_modules/bootstrap/js/dist/util/config.js
  var Config = class {
    static get Default() {
      return {};
    }
    static get DefaultType() {
      return {};
    }
    static get NAME() {
      throw new Error('You have to implement the static method "NAME", for each component!');
    }
    _getConfig(config) {
      config = this._mergeConfigObj(config);
      config = this._configAfterMerge(config);
      this._typeCheckConfig(config);
      return config;
    }
    _configAfterMerge(config) {
      return config;
    }
    _mergeConfigObj(config, element) {
      const jsonConfig = isElement(element) ? Manipulator.getDataAttribute(element, "config") : {};
      return {
        ...this.constructor.Default,
        ...typeof jsonConfig === "object" ? jsonConfig : {},
        ...isElement(element) ? Manipulator.getDataAttributes(element) : {},
        ...typeof config === "object" ? config : {}
      };
    }
    _typeCheckConfig(config, configTypes = this.constructor.DefaultType) {
      for (const [property, expectedTypes] of Object.entries(configTypes)) {
        const value = config[property];
        const valueType = isElement(value) ? "element" : toType(value);
        if (!new RegExp(expectedTypes).test(valueType)) throw new TypeError(`${this.constructor.NAME.toUpperCase()}: Option "${property}" provided type "${valueType}" but expected type "${expectedTypes}".`);
      }
    }
  };

  // node_modules/bootstrap/js/dist/base-component.js
  var VERSION = "6.0.0-alpha.1";
  var BaseComponent = class extends Config {
    constructor(element, config) {
      super();
      element = getElement(element);
      if (!element) return;
      this._element = element;
      this._config = this._getConfig(config);
      const existingInstance = data_default.get(this._element, this.constructor.DATA_KEY);
      if (existingInstance) existingInstance.dispose();
      data_default.set(this._element, this.constructor.DATA_KEY, this);
    }
    dispose() {
      data_default.remove(this._element, this.constructor.DATA_KEY);
      EventHandler.off(this._element, this.constructor.EVENT_KEY);
      for (const propertyName of Object.getOwnPropertyNames(this)) this[propertyName] = null;
    }
    _queueCallback(callback, element, isAnimated = true) {
      return new Promise((resolve) => {
        executeAfterTransition(() => {
          if (this._element) callback();
          resolve();
        }, element, isAnimated);
      });
    }
    _getConfig(config) {
      config = this._mergeConfigObj(config, this._element);
      config = this._configAfterMerge(config);
      this._typeCheckConfig(config);
      return config;
    }
    static getInstance(element) {
      return data_default.get(getElement(element), this.DATA_KEY);
    }
    static getOrCreateInstance(element, config = {}) {
      return this.getInstance(element) || new this(element, typeof config === "object" ? config : null);
    }
    static get VERSION() {
      return VERSION;
    }
    static get DATA_KEY() {
      return `bs.${this.NAME}`;
    }
    static get EVENT_KEY() {
      return `.${this.DATA_KEY}`;
    }
    static eventName(name) {
      return `${name}${this.EVENT_KEY}`;
    }
  };

  // node_modules/bootstrap/js/dist/dom/selector-engine.js
  var getSelector = (element) => {
    let selector = element.getAttribute("data-bs-target");
    if (!selector || selector === "#") {
      let hrefAttribute = element.getAttribute("href");
      if (!hrefAttribute || !hrefAttribute.includes("#") && !hrefAttribute.startsWith(".")) return null;
      if (hrefAttribute.includes("#") && !hrefAttribute.startsWith("#")) hrefAttribute = `#${hrefAttribute.split("#")[1]}`;
      selector = hrefAttribute && hrefAttribute !== "#" ? hrefAttribute.trim() : null;
    }
    return selector ? selector.split(",").map((sel) => parseSelector(sel)).join(",") : null;
  };
  var SelectorEngine = {
    find(selector, element = document.documentElement) {
      return [...Element.prototype.querySelectorAll.call(element, selector)];
    },
    findOne(selector, element = document.documentElement) {
      return Element.prototype.querySelector.call(element, selector);
    },
    parents(element, selector) {
      const parents = [];
      let ancestor = element.parentNode.closest(selector);
      while (ancestor) {
        parents.push(ancestor);
        ancestor = ancestor.parentNode.closest(selector);
      }
      return parents;
    },
    closest(element, selector) {
      return Element.prototype.closest.call(element, selector);
    },
    prev(element, selector) {
      let previous = element.previousElementSibling;
      while (previous) {
        if (previous.matches(selector)) return [previous];
        previous = previous.previousElementSibling;
      }
      return [];
    },
    next(element, selector) {
      let next = element.nextElementSibling;
      while (next) {
        if (next.matches(selector)) return [next];
        next = next.nextElementSibling;
      }
      return [];
    },
    getSelectorFromElement(element) {
      const selector = getSelector(element);
      if (selector) return SelectorEngine.findOne(selector) ? selector : null;
      return null;
    },
    getElementFromSelector(element) {
      const selector = getSelector(element);
      return selector ? SelectorEngine.findOne(selector) : null;
    },
    getMultipleElementsFromSelector(element) {
      const selector = getSelector(element);
      return selector ? SelectorEngine.find(selector) : [];
    }
  };

  // node_modules/bootstrap/js/dist/util/component-functions.js
  var enableDismissTrigger = (component, method = "hide") => {
    const clickEvent = `click.dismiss${component.EVENT_KEY}`;
    const name = component.NAME;
    EventHandler.on(document, clickEvent, `[data-bs-dismiss="${name}"]`, function(event) {
      if (["A", "AREA"].includes(this.tagName)) event.preventDefault();
      if (isDisabled(this)) return;
      const target = SelectorEngine.getElementFromSelector(this) || this.closest(`.${name}, [class*=":${name}"]`);
      component.getOrCreateInstance(target)[method]();
    });
  };

  // node_modules/bootstrap/js/dist/alert.js
  var NAME = "alert";
  var EVENT_KEY = `.bs.alert`;
  var EVENT_CLOSE = `close${EVENT_KEY}`;
  var EVENT_CLOSED = `closed${EVENT_KEY}`;
  var CLASS_NAME_HIDING = "hiding";
  var CLASS_NAME_SHOW = "show";
  var Alert = class extends BaseComponent {
    static get NAME() {
      return NAME;
    }
    async close() {
      if (EventHandler.trigger(this._element, EVENT_CLOSE).defaultPrevented) return;
      this._element.classList.remove(CLASS_NAME_SHOW);
      this._element.classList.add(CLASS_NAME_HIDING);
      const isAnimated = getTransitionDurationFromElement(this._element) > 0;
      await this._queueCallback(() => this._destroyElement(), this._element, isAnimated);
    }
    _destroyElement() {
      this._element.remove();
      EventHandler.trigger(this._element, EVENT_CLOSED);
      this.dispose();
    }
  };
  enableDismissTrigger(Alert, "close");

  // node_modules/bootstrap/js/dist/button.js
  var NAME2 = "button";
  var EVENT_KEY2 = `.bs.button`;
  var DATA_API_KEY = ".data-api";
  var CLASS_NAME_ACTIVE = "active";
  var SELECTOR_DATA_TOGGLE = '[data-bs-toggle="button"]';
  var EVENT_CLICK_DATA_API = `click${EVENT_KEY2}${DATA_API_KEY}`;
  var EVENT_DOM_CONTENT_LOADED = `DOMContentLoaded${EVENT_KEY2}${DATA_API_KEY}`;
  var Button = class extends BaseComponent {
    static get NAME() {
      return NAME2;
    }
    toggle() {
      setAriaAttribute(this._element, "aria-pressed", this._element.classList.toggle(CLASS_NAME_ACTIVE));
    }
  };
  EventHandler.on(document, EVENT_CLICK_DATA_API, SELECTOR_DATA_TOGGLE, (event) => {
    event.preventDefault();
    const button = event.target.closest(SELECTOR_DATA_TOGGLE);
    Button.getOrCreateInstance(button).toggle();
  });
  EventHandler.on(document, EVENT_DOM_CONTENT_LOADED, () => {
    for (const element of SelectorEngine.find(SELECTOR_DATA_TOGGLE)) if (!element.hasAttribute("aria-pressed")) setAriaAttribute(element, "aria-pressed", element.classList.contains(CLASS_NAME_ACTIVE));
  });

  // node_modules/bootstrap/js/dist/carousel.js
  var NAME3 = "carousel";
  var EVENT_KEY3 = `.bs.carousel`;
  var DATA_API_KEY2 = ".data-api";
  var ARROW_LEFT_KEY = "ArrowLeft";
  var ARROW_RIGHT_KEY = "ArrowRight";
  var DIRECTION_LEFT = "left";
  var DIRECTION_RIGHT = "right";
  var EVENT_SLIDE = `slide${EVENT_KEY3}`;
  var EVENT_SLID = `slid${EVENT_KEY3}`;
  var EVENT_KEYDOWN = `keydown${EVENT_KEY3}`;
  var EVENT_MOUSEENTER = `mouseenter${EVENT_KEY3}`;
  var EVENT_MOUSELEAVE = `mouseleave${EVENT_KEY3}`;
  var EVENT_POINTERDOWN = `pointerdown${EVENT_KEY3}`;
  var EVENT_LOAD_DATA_API = `load${EVENT_KEY3}${DATA_API_KEY2}`;
  var EVENT_CLICK_DATA_API2 = `click${EVENT_KEY3}${DATA_API_KEY2}`;
  var CLASS_NAME_CAROUSEL = "carousel";
  var CLASS_NAME_ACTIVE2 = "active";
  var CLASS_NAME_FADE = "carousel-fade";
  var CLASS_NAME_CENTER = "carousel-center";
  var CLASS_NAME_AUTO = "carousel-auto";
  var CLASS_NAME_CLONE = "carousel-item-clone";
  var CLASS_NAME_PAUSED = "paused";
  var CLASS_NAME_PLAYING = "carousel-playing";
  var PROPERTY_INTERVAL = "--bs-carousel-interval";
  var SCROLL_DURATION = 300;
  var ACTIVE_RATIO_TOLERANCE = 0.05;
  var SELECTOR_ACTIVE = ".active";
  var SELECTOR_ITEM = `.carousel-item:not(.${CLASS_NAME_CLONE})`;
  var SELECTOR_ACTIVE_ITEM = SELECTOR_ACTIVE + SELECTOR_ITEM;
  var SELECTOR_INNER = ".carousel-inner";
  var SELECTOR_INDICATORS = ".carousel-indicators";
  var SELECTOR_PLAY_PAUSE = ".carousel-control-play-pause";
  var SELECTOR_DATA_SLIDE = "[data-bs-slide], [data-bs-slide-to]";
  var SELECTOR_DATA_SLIDE_PREV = '[data-bs-slide="prev"]';
  var SELECTOR_DATA_SLIDE_NEXT = '[data-bs-slide="next"]';
  var SELECTOR_DATA_AUTOPLAY = '[data-bs-autoplay="true"]';
  var KEY_TO_DIRECTION = {
    [ARROW_LEFT_KEY]: DIRECTION_RIGHT,
    [ARROW_RIGHT_KEY]: DIRECTION_LEFT
  };
  var ENDS_STOP = "stop";
  var ENDS_WRAP = "wrap";
  var ENDS_LOOP = "loop";
  var Default = {
    autoplay: false,
    ends: ENDS_LOOP,
    interval: 5e3,
    keyboard: true,
    pause: "hover"
  };
  var DefaultType = {
    autoplay: "boolean",
    ends: "string",
    interval: "number",
    keyboard: "boolean",
    pause: "(string|boolean)"
  };
  var easeInOutCubic = (progress) => progress < 0.5 ? 4 * progress * progress * progress : 1 - (-2 * progress + 2) ** 3 / 2;
  var Carousel = class extends BaseComponent {
    constructor(element, config) {
      super(element, config);
      this._viewport = SelectorEngine.findOne(SELECTOR_INNER, this._element) || this._element;
      this._indicatorsElement = SelectorEngine.findOne(SELECTOR_INDICATORS, this._element);
      this._playPauseElement = SelectorEngine.findOne(SELECTOR_PLAY_PAUSE, this._element);
      this._prevControls = SelectorEngine.find(SELECTOR_DATA_SLIDE_PREV, this._element);
      this._nextControls = SelectorEngine.find(SELECTOR_DATA_SLIDE_NEXT, this._element);
      this._interval = null;
      this._observer = null;
      this._scrollFrame = null;
      this._looping = false;
      this._visibility = /* @__PURE__ */ new Map();
      this._playing = this._config.autoplay;
      this._activeIndex = this._initialActiveIndex();
      this._addEventListeners();
      this._observeItems();
      this._refreshActiveState();
      if (this._playing) this.cycle();
      this._updatePlayPauseControl();
    }
    static get Default() {
      return Default;
    }
    static get DefaultType() {
      return DefaultType;
    }
    static get NAME() {
      return NAME3;
    }
    next() {
      this.to(this._navIndex() + 1);
    }
    nextWhenVisible() {
      if (document.visibilityState === "visible" && isVisible(this._element)) this.next();
    }
    prev() {
      this.to(this._navIndex() - 1);
    }
    pause() {
      this._clearInterval();
      this._element.classList.remove(CLASS_NAME_PLAYING);
    }
    cycle() {
      this._clearInterval();
      this._scheduleAutoplay();
      this._element.classList.add(CLASS_NAME_PLAYING);
    }
    to(index) {
      if (this._looping) return;
      const items = this._getItems();
      const rawIndex = Number.parseInt(index, 10);
      if (this._config.ends === ENDS_LOOP && !this._prefersReducedMotion() && this._canLoop()) {
        if (rawIndex > items.length - 1) {
          this._loopTransition(true);
          return;
        }
        if (rawIndex < 0) {
          this._loopTransition(false);
          return;
        }
      }
      const targetIndex = this._normalizeIndex(rawIndex, items.length);
      const currentIndex = this._navIndex();
      if (targetIndex === null || targetIndex === currentIndex) return;
      if (EventHandler.trigger(this._element, EVENT_SLIDE, {
        relatedTarget: items[targetIndex],
        direction: this._direction(currentIndex, targetIndex),
        from: currentIndex,
        to: targetIndex
      }).defaultPrevented) return;
      if (this._isFade()) {
        this._fadeTo(targetIndex);
        return;
      }
      this._scrollToIndex(targetIndex);
    }
    dispose() {
      this._clearInterval();
      if (this._observer) this._observer.disconnect();
      if (this._scrollFrame !== null) cancelAnimationFrame(this._scrollFrame);
      for (const clone of SelectorEngine.find(`.${CLASS_NAME_CLONE}`, this._viewport)) clone.remove();
      this._viewport.style.scrollSnapType = "";
      EventHandler.off(this._viewport, EVENT_KEY3);
      super.dispose();
    }
    _configAfterMerge(config) {
      if (![
        ENDS_STOP,
        ENDS_WRAP,
        ENDS_LOOP
      ].includes(config.ends)) config.ends = Default.ends;
      return config;
    }
    _initialActiveIndex() {
      const active = SelectorEngine.findOne(SELECTOR_ACTIVE_ITEM, this._element);
      const index = active ? this._getItems().indexOf(active) : 0;
      return Math.max(index, 0);
    }
    _addEventListeners() {
      if (this._config.keyboard) EventHandler.on(this._element, EVENT_KEYDOWN, (event) => this._keydown(event));
      if (this._config.pause === "hover") {
        EventHandler.on(this._element, EVENT_MOUSEENTER, () => this.pause());
        EventHandler.on(this._element, EVENT_MOUSELEAVE, () => this._maybeEnableCycle());
      }
      EventHandler.on(this._viewport, EVENT_POINTERDOWN, () => this._pauseFromInteraction());
    }
    _keydown(event) {
      if (/input|textarea/i.test(event.target.tagName)) return;
      const direction = KEY_TO_DIRECTION[event.key];
      if (direction) {
        event.preventDefault();
        this._pauseFromInteraction();
        if (direction === DIRECTION_RIGHT) this.prev();
        else this.next();
      }
    }
    _observeItems() {
      if (this._isFade() || typeof IntersectionObserver === "undefined") return;
      this._observer = new IntersectionObserver((entries) => this._handleIntersection(entries), {
        root: this._viewport,
        threshold: [
          0,
          0.25,
          0.5,
          0.75,
          1
        ]
      });
      for (const item of this._getItems()) this._observer.observe(item);
    }
    _handleIntersection(entries) {
      if (this._looping) return;
      for (const entry of entries) this._visibility.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
      const ratios = this._getItems().map((item) => this._visibility.get(item) ?? 0);
      const maxRatio = Math.max(...ratios);
      let bestIndex = this._activeIndex;
      if (maxRatio > 0) bestIndex = ratios.findIndex((ratio) => ratio >= maxRatio - ACTIVE_RATIO_TOLERANCE);
      this._setActive(bestIndex);
      this._updateEndControls();
    }
    _navIndex() {
      if (this._isFade() || this._viewport.scrollWidth - this._viewport.clientWidth <= 0) return this._activeIndex;
      let index = this._activeIndex;
      let smallestDelta = Number.POSITIVE_INFINITY;
      for (const [itemIndex, item] of this._getItems().entries()) {
        const delta = Math.abs(this._scrollDelta(item));
        if (delta < smallestDelta) {
          smallestDelta = delta;
          index = itemIndex;
        }
      }
      return index;
    }
    _scrollToIndex(index) {
      const item = this._getItems()[index];
      if (!item) return;
      const left = this._scrollDelta(item);
      if (Math.abs(left) < 1) return;
      const targetLeft = this._viewport.scrollLeft + left;
      this._viewport.style.scrollSnapType = "none";
      this._animateScroll(targetLeft, () => {
        this._viewport.style.scrollSnapType = "";
        if (!this._observer) this._setActive(index);
        this._updateEndControls();
      });
    }
    _animateScroll(targetLeft, onComplete) {
      if (this._scrollFrame !== null) {
        cancelAnimationFrame(this._scrollFrame);
        this._scrollFrame = null;
      }
      const startLeft = this._viewport.scrollLeft;
      const distance = targetLeft - startLeft;
      if (this._prefersReducedMotion() || typeof requestAnimationFrame === "undefined") {
        this._viewport.scrollTo({
          left: targetLeft,
          behavior: "instant"
        });
        onComplete();
        return;
      }
      let startTime = null;
      const step = (now) => {
        if (startTime === null) startTime = now;
        const progress = Math.min((now - startTime) / SCROLL_DURATION, 1);
        this._viewport.scrollTo({
          left: startLeft + distance * easeInOutCubic(progress),
          behavior: "instant"
        });
        if (progress < 1) {
          this._scrollFrame = requestAnimationFrame(step);
          return;
        }
        this._viewport.scrollTo({
          left: targetLeft,
          behavior: "instant"
        });
        this._scrollFrame = null;
        onComplete();
      };
      this._scrollFrame = requestAnimationFrame(step);
    }
    _scrollDelta(element) {
      const viewportRect = this._viewport.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      if (this._element.classList.contains(CLASS_NAME_CENTER)) return rect.left + rect.width / 2 - (viewportRect.left + viewportRect.width / 2);
      const padStart = Number.parseFloat(getComputedStyle(this._viewport).scrollPaddingInlineStart) || 0;
      return isRTL() ? rect.right - (viewportRect.right - padStart) : rect.left - (viewportRect.left + padStart);
    }
    _loopTransition(isNext) {
      const items = this._getItems();
      const last = items.length - 1;
      const fromIndex = this._activeIndex;
      const toIndex = isNext ? 0 : last;
      const direction = this._loopDirection(isNext);
      if (EventHandler.trigger(this._element, EVENT_SLIDE, {
        relatedTarget: items[toIndex],
        direction,
        from: fromIndex,
        to: toIndex
      }).defaultPrevented) return;
      this._looping = true;
      const clone = (isNext ? items[0] : items[last]).cloneNode(true);
      clone.classList.add(CLASS_NAME_CLONE);
      clone.classList.remove(CLASS_NAME_ACTIVE2);
      clone.removeAttribute("id");
      for (const node of SelectorEngine.find("[id]", clone)) node.removeAttribute("id");
      clone.setAttribute("aria-hidden", "true");
      clone.inert = true;
      this._viewport.style.scrollSnapType = "none";
      if (isNext) this._viewport.append(clone);
      else {
        this._viewport.prepend(clone);
        this._jumpScroll(this._scrollDelta(items[fromIndex]));
      }
      this._animateScroll(this._viewport.scrollLeft + this._scrollDelta(clone), () => {
        clone.remove();
        this._jumpScroll(this._scrollDelta(items[toIndex]));
        this._activeIndex = toIndex;
        this._refreshActiveState();
        EventHandler.trigger(this._element, EVENT_SLID, {
          relatedTarget: items[toIndex],
          direction,
          from: fromIndex,
          to: toIndex
        });
        this._viewport.style.scrollSnapType = "";
        this._looping = false;
      });
    }
    _loopDirection(isNext) {
      if (isRTL()) return isNext ? DIRECTION_RIGHT : DIRECTION_LEFT;
      return isNext ? DIRECTION_LEFT : DIRECTION_RIGHT;
    }
    _jumpScroll(delta) {
      this._viewport.style.scrollSnapType = "none";
      this._viewport.scrollBy({
        left: delta,
        top: 0,
        behavior: "instant"
      });
    }
    _fadeTo(index) {
      this._setActive(index);
    }
    _setActive(index) {
      const items = this._getItems();
      if (index === this._activeIndex || !items[index]) return;
      const from = this._activeIndex;
      this._activeIndex = index;
      this._refreshActiveState();
      EventHandler.trigger(this._element, EVENT_SLID, {
        relatedTarget: items[index],
        direction: this._direction(from, index),
        from,
        to: index
      });
    }
    _refreshActiveState() {
      const items = this._getItems();
      for (const [index, item] of items.entries()) item.classList.toggle(CLASS_NAME_ACTIVE2, index === this._activeIndex);
      this._setActiveIndicatorElement(this._activeIndex);
      this._updateEndControls();
    }
    _updateEndControls() {
      if (this._config.ends !== ENDS_STOP) return;
      const viewport = this._viewport;
      const maxScroll = viewport.scrollWidth - viewport.clientWidth;
      let atStart;
      let atEnd;
      if (maxScroll > 0) {
        const progress = Math.abs(viewport.scrollLeft);
        atStart = progress <= 1;
        atEnd = progress >= maxScroll - 1;
      } else {
        const last = this._getItems().length - 1;
        atStart = this._activeIndex <= 0;
        atEnd = this._activeIndex >= last;
      }
      this._setControlsDisabled(this._prevControls, atStart);
      this._setControlsDisabled(this._nextControls, atEnd);
    }
    _setControlsDisabled(controls, disabled) {
      for (const control of controls) {
        if (disabled && control === document.activeElement) ((controls === this._prevControls ? this._nextControls : this._prevControls)[0] ?? this._viewport).focus({ preventScroll: true });
        control.disabled = disabled;
      }
    }
    _setActiveIndicatorElement(index) {
      if (!this._indicatorsElement) return;
      const active = SelectorEngine.findOne(SELECTOR_ACTIVE, this._indicatorsElement);
      if (active) {
        active.classList.remove(CLASS_NAME_ACTIVE2);
        active.removeAttribute("aria-current");
      }
      const newActive = SelectorEngine.findOne(`[data-bs-slide-to="${index}"]`, this._indicatorsElement);
      if (newActive) {
        newActive.classList.add(CLASS_NAME_ACTIVE2);
        newActive.setAttribute("aria-current", "true");
      }
    }
    _normalizeIndex(index, length) {
      if (Number.isNaN(index) || length === 0) return null;
      if (index < 0) return this._wrapsAround() ? length - 1 : null;
      if (index > length - 1) return this._wrapsAround() ? 0 : null;
      return index;
    }
    _wrapsAround() {
      return this._config.ends === ENDS_WRAP || this._config.ends === ENDS_LOOP;
    }
    _canLoop() {
      if (this._isFade() || this._getItems().length < 2) return false;
      const styles = getComputedStyle(this._element);
      const num = (name) => Number.parseFloat(styles.getPropertyValue(name)) || 0;
      return (num("--bs-carousel-items") || 1) === 1 && num("--bs-carousel-items-peek") === 0 && !this._element.classList.contains(CLASS_NAME_CENTER) && !this._element.classList.contains(CLASS_NAME_AUTO);
    }
    _direction(from, to) {
      const isNext = to > from;
      if (isRTL()) return isNext ? DIRECTION_RIGHT : DIRECTION_LEFT;
      return isNext ? DIRECTION_LEFT : DIRECTION_RIGHT;
    }
    _scheduleAutoplay(index = this._activeIndex) {
      const interval = this._itemInterval(index);
      this._element.style.setProperty(PROPERTY_INTERVAL, `${interval}ms`);
      this._interval = setTimeout(() => {
        const upcoming = this._upcomingIndex();
        this.nextWhenVisible();
        if (upcoming === null) {
          this.pause();
          return;
        }
        this._scheduleAutoplay(upcoming);
      }, interval);
    }
    _upcomingIndex() {
      return this._normalizeIndex(this._navIndex() + 1, this._getItems().length);
    }
    _itemInterval(index = this._activeIndex) {
      const item = this._getItems()[index];
      const interval = item ? Number.parseInt(item.getAttribute("data-bs-interval"), 10) : NaN;
      return Number.isNaN(interval) ? this._config.interval : interval;
    }
    _maybeEnableCycle() {
      if (!this._playing) return;
      this.cycle();
    }
    _pauseFromInteraction() {
      this._playing = false;
      this.pause();
      this._updatePlayPauseControl();
    }
    _togglePlayPause() {
      if (this._playing) {
        this._pauseFromInteraction();
        return;
      }
      this._playing = true;
      this.cycle();
      this._updatePlayPauseControl();
    }
    _updatePlayPauseControl() {
      if (!this._playPauseElement) return;
      this._playPauseElement.classList.toggle(CLASS_NAME_PAUSED, !this._playing);
      const label = this._playPauseElement.getAttribute(this._playing ? "data-bs-pause-label" : "data-bs-play-label");
      if (label) this._playPauseElement.setAttribute("aria-label", label);
    }
    _isFade() {
      return this._element.classList.contains(CLASS_NAME_FADE);
    }
    _prefersReducedMotion() {
      return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    _getItems() {
      return SelectorEngine.find(SELECTOR_ITEM, this._element);
    }
    _clearInterval() {
      if (this._interval) {
        clearTimeout(this._interval);
        this._interval = null;
      }
    }
  };
  EventHandler.on(document, EVENT_CLICK_DATA_API2, SELECTOR_DATA_SLIDE, function(event) {
    const target = SelectorEngine.getElementFromSelector(this);
    if (!target || !target.classList.contains(CLASS_NAME_CAROUSEL)) return;
    event.preventDefault();
    const carousel = Carousel.getOrCreateInstance(target);
    carousel._pauseFromInteraction();
    const slideIndex = this.getAttribute("data-bs-slide-to");
    if (slideIndex) {
      carousel.to(slideIndex);
      return;
    }
    if (Manipulator.getDataAttribute(this, "slide") === "next") {
      carousel.next();
      return;
    }
    carousel.prev();
  });
  EventHandler.on(document, EVENT_CLICK_DATA_API2, SELECTOR_PLAY_PAUSE, function(event) {
    const target = SelectorEngine.getElementFromSelector(this);
    if (!target || !target.classList.contains(CLASS_NAME_CAROUSEL)) return;
    event.preventDefault();
    Carousel.getOrCreateInstance(target)._togglePlayPause();
  });
  EventHandler.on(window, EVENT_LOAD_DATA_API, () => {
    const carousels = SelectorEngine.find(SELECTOR_DATA_AUTOPLAY);
    for (const carousel of carousels) Carousel.getOrCreateInstance(carousel);
  });

  // node_modules/bootstrap/js/dist/collapse.js
  var NAME4 = "collapse";
  var EVENT_KEY4 = `.bs.collapse`;
  var DATA_API_KEY3 = ".data-api";
  var EVENT_SHOW = `show${EVENT_KEY4}`;
  var EVENT_SHOWN = `shown${EVENT_KEY4}`;
  var EVENT_HIDE = `hide${EVENT_KEY4}`;
  var EVENT_HIDDEN = `hidden${EVENT_KEY4}`;
  var EVENT_CLICK_DATA_API3 = `click${EVENT_KEY4}${DATA_API_KEY3}`;
  var CLASS_NAME_SHOW2 = "show";
  var CLASS_NAME_COLLAPSE = "collapse";
  var CLASS_NAME_DEEPER_CHILDREN = `:scope .${CLASS_NAME_COLLAPSE} .${CLASS_NAME_COLLAPSE}`;
  var SELECTOR_ACTIVES = ".collapse.show";
  var SELECTOR_DATA_TOGGLE2 = '[data-bs-toggle="collapse"]';
  var Default2 = { parent: null };
  var DefaultType2 = { parent: "(null|element)" };
  var Collapse = class Collapse2 extends BaseComponent {
    constructor(element, config) {
      super(element, config);
      this._isTransitioning = false;
      this._triggerArray = [];
      const toggleList = SelectorEngine.find(SELECTOR_DATA_TOGGLE2);
      for (const elem of toggleList) {
        const selector = SelectorEngine.getSelectorFromElement(elem);
        const filterElement = SelectorEngine.find(selector).filter((foundElement) => foundElement === this._element);
        if (selector !== null && filterElement.length) this._triggerArray.push(elem);
      }
      this._initializeChildren();
      if (!this._config.parent) this._setAriaExpanded(this._triggerArray, this._isShown());
    }
    static get Default() {
      return Default2;
    }
    static get DefaultType() {
      return DefaultType2;
    }
    static get NAME() {
      return NAME4;
    }
    toggle() {
      return this._isShown() ? this.hide() : this.show();
    }
    async show() {
      if (this._isTransitioning || this._isShown()) return;
      let activeChildren = [];
      if (this._config.parent) activeChildren = this._getFirstLevelChildren(SELECTOR_ACTIVES).filter((element) => element !== this._element && !this._sharesTrigger(element)).map((element) => Collapse2.getOrCreateInstance(element));
      if (activeChildren.length && activeChildren[0]._isTransitioning) return;
      if (EventHandler.trigger(this._element, EVENT_SHOW).defaultPrevented) return;
      for (const activeInstance of activeChildren) activeInstance.hide();
      this._element.classList.add(CLASS_NAME_SHOW2);
      this._setAriaExpanded(this._triggerArray, true);
      this._isTransitioning = true;
      const complete = () => {
        this._isTransitioning = false;
        EventHandler.trigger(this._element, EVENT_SHOWN);
      };
      await this._queueCallback(complete, this._element, this._isAnimated());
    }
    async hide() {
      if (this._isTransitioning || !this._isShown()) return;
      if (EventHandler.trigger(this._element, EVENT_HIDE).defaultPrevented) return;
      this._element.classList.remove(CLASS_NAME_SHOW2);
      for (const trigger2 of this._triggerArray) {
        const element = SelectorEngine.getElementFromSelector(trigger2);
        if (element && !this._isShown(element)) this._setAriaExpanded([trigger2], false);
      }
      this._isTransitioning = true;
      const complete = () => {
        this._isTransitioning = false;
        EventHandler.trigger(this._element, EVENT_HIDDEN);
      };
      await this._queueCallback(complete, this._element, this._isAnimated());
    }
    _isShown(element = this._element) {
      return element.classList.contains(CLASS_NAME_SHOW2);
    }
    _isAnimated() {
      return getTransitionDurationFromElement(this._element) > 0;
    }
    _sharesTrigger(element) {
      return this._triggerArray.some((trigger2) => SelectorEngine.getMultipleElementsFromSelector(trigger2).includes(element));
    }
    _configAfterMerge(config) {
      config.parent = getElement(config.parent);
      return config;
    }
    _initializeChildren() {
      if (!this._config.parent) return;
      const children = this._getFirstLevelChildren(SELECTOR_DATA_TOGGLE2);
      for (const element of children) {
        const selected = SelectorEngine.getElementFromSelector(element);
        if (selected) this._setAriaExpanded([element], this._isShown(selected));
      }
    }
    _getFirstLevelChildren(selector) {
      const children = SelectorEngine.find(CLASS_NAME_DEEPER_CHILDREN, this._config.parent);
      return SelectorEngine.find(selector, this._config.parent).filter((element) => !children.includes(element));
    }
    _setAriaExpanded(triggerArray, isOpen) {
      if (!triggerArray.length) return;
      for (const element of triggerArray) setAriaAttribute(element, "aria-expanded", isOpen);
    }
  };
  EventHandler.on(document, EVENT_CLICK_DATA_API3, SELECTOR_DATA_TOGGLE2, function(event) {
    if (event.target.tagName === "A" || event.delegateTarget && event.delegateTarget.tagName === "A") event.preventDefault();
    for (const element of SelectorEngine.getMultipleElementsFromSelector(this)) Collapse.getOrCreateInstance(element).toggle();
  });

  // node_modules/@floating-ui/utils/dist/floating-ui.utils.mjs
  var min = Math.min;
  var max = Math.max;
  var round = Math.round;
  var floor = Math.floor;
  var createCoords = (v) => ({
    x: v,
    y: v
  });
  var oppositeSideMap = {
    left: "right",
    right: "left",
    bottom: "top",
    top: "bottom"
  };
  function clamp(start, value, end) {
    return max(start, min(value, end));
  }
  function evaluate(value, param) {
    return typeof value === "function" ? value(param) : value;
  }
  function getSide(placement) {
    return placement.split("-")[0];
  }
  function getAlignment(placement) {
    return placement.split("-")[1];
  }
  function getOppositeAxis(axis) {
    return axis === "x" ? "y" : "x";
  }
  function getAxisLength(axis) {
    return axis === "y" ? "height" : "width";
  }
  function getSideAxis(placement) {
    const firstChar = placement[0];
    return firstChar === "t" || firstChar === "b" ? "y" : "x";
  }
  function getAlignmentAxis(placement) {
    return getOppositeAxis(getSideAxis(placement));
  }
  function getAlignmentSides(placement, rects, rtl) {
    if (rtl === void 0) {
      rtl = false;
    }
    const alignment = getAlignment(placement);
    const alignmentAxis = getAlignmentAxis(placement);
    const length = getAxisLength(alignmentAxis);
    let mainAlignmentSide = alignmentAxis === "x" ? alignment === (rtl ? "end" : "start") ? "right" : "left" : alignment === "start" ? "bottom" : "top";
    if (rects.reference[length] > rects.floating[length]) {
      mainAlignmentSide = getOppositePlacement(mainAlignmentSide);
    }
    return [mainAlignmentSide, getOppositePlacement(mainAlignmentSide)];
  }
  function getExpandedPlacements(placement) {
    const oppositePlacement = getOppositePlacement(placement);
    return [getOppositeAlignmentPlacement(placement), oppositePlacement, getOppositeAlignmentPlacement(oppositePlacement)];
  }
  function getOppositeAlignmentPlacement(placement) {
    return placement.includes("start") ? placement.replace("start", "end") : placement.replace("end", "start");
  }
  var lrPlacement = ["left", "right"];
  var rlPlacement = ["right", "left"];
  var tbPlacement = ["top", "bottom"];
  var btPlacement = ["bottom", "top"];
  function getSideList(side, isStart, rtl) {
    switch (side) {
      case "top":
      case "bottom":
        if (rtl) return isStart ? rlPlacement : lrPlacement;
        return isStart ? lrPlacement : rlPlacement;
      case "left":
      case "right":
        return isStart ? tbPlacement : btPlacement;
      default:
        return [];
    }
  }
  function getOppositeAxisPlacements(placement, flipAlignment, direction, rtl) {
    const alignment = getAlignment(placement);
    let list = getSideList(getSide(placement), direction === "start", rtl);
    if (alignment) {
      list = list.map((side) => side + "-" + alignment);
      if (flipAlignment) {
        list = list.concat(list.map(getOppositeAlignmentPlacement));
      }
    }
    return list;
  }
  function getOppositePlacement(placement) {
    const side = getSide(placement);
    return oppositeSideMap[side] + placement.slice(side.length);
  }
  function expandPaddingObject(padding) {
    var _padding$top, _padding$right, _padding$bottom, _padding$left;
    return {
      top: (_padding$top = padding.top) != null ? _padding$top : 0,
      right: (_padding$right = padding.right) != null ? _padding$right : 0,
      bottom: (_padding$bottom = padding.bottom) != null ? _padding$bottom : 0,
      left: (_padding$left = padding.left) != null ? _padding$left : 0
    };
  }
  function getPaddingObject(padding) {
    return typeof padding !== "number" ? expandPaddingObject(padding) : {
      top: padding,
      right: padding,
      bottom: padding,
      left: padding
    };
  }
  function rectToClientRect(rect) {
    const {
      x,
      y,
      width,
      height
    } = rect;
    return {
      width,
      height,
      top: y,
      left: x,
      right: x + width,
      bottom: y + height,
      x,
      y
    };
  }

  // node_modules/@floating-ui/core/dist/floating-ui.core.mjs
  function computeCoordsFromPlacement(_ref, placement, rtl) {
    let {
      reference,
      floating
    } = _ref;
    const sideAxis = getSideAxis(placement);
    const alignmentAxis = getAlignmentAxis(placement);
    const alignLength = getAxisLength(alignmentAxis);
    const side = getSide(placement);
    const isVertical = sideAxis === "y";
    const commonX = reference.x + reference.width / 2 - floating.width / 2;
    const commonY = reference.y + reference.height / 2 - floating.height / 2;
    const commonAlign = reference[alignLength] / 2 - floating[alignLength] / 2;
    let coords;
    switch (side) {
      case "top":
        coords = {
          x: commonX,
          y: reference.y - floating.height
        };
        break;
      case "bottom":
        coords = {
          x: commonX,
          y: reference.y + reference.height
        };
        break;
      case "right":
        coords = {
          x: reference.x + reference.width,
          y: commonY
        };
        break;
      case "left":
        coords = {
          x: reference.x - floating.width,
          y: commonY
        };
        break;
      default:
        coords = {
          x: reference.x,
          y: reference.y
        };
    }
    const alignment = getAlignment(placement);
    if (alignment) {
      coords[alignmentAxis] += commonAlign * (alignment === "end" ? 1 : -1) * (rtl && isVertical ? -1 : 1);
    }
    return coords;
  }
  async function detectOverflow(state, options) {
    var _await$platform$isEle;
    if (options === void 0) {
      options = {};
    }
    const {
      x,
      y,
      platform: platform2,
      rects,
      elements,
      strategy
    } = state;
    const {
      boundary = "clippingAncestors",
      rootBoundary = "viewport",
      elementContext = "floating",
      altBoundary = false,
      padding = 0
    } = evaluate(options, state);
    const paddingObject = getPaddingObject(padding);
    const altContext = elementContext === "floating" ? "reference" : "floating";
    const element = elements[altBoundary ? altContext : elementContext];
    const clippingClientRect = rectToClientRect(await platform2.getClippingRect({
      element: ((_await$platform$isEle = await (platform2.isElement == null ? void 0 : platform2.isElement(element))) != null ? _await$platform$isEle : true) ? element : element.contextElement || await (platform2.getDocumentElement == null ? void 0 : platform2.getDocumentElement(elements.floating)),
      boundary,
      rootBoundary,
      strategy
    }));
    const rect = elementContext === "floating" ? {
      x,
      y,
      width: rects.floating.width,
      height: rects.floating.height
    } : rects.reference;
    const offsetParent = await (platform2.getOffsetParent == null ? void 0 : platform2.getOffsetParent(elements.floating));
    const offsetScale = await (platform2.isElement == null ? void 0 : platform2.isElement(offsetParent)) && await (platform2.getScale == null ? void 0 : platform2.getScale(offsetParent)) || {
      x: 1,
      y: 1
    };
    const elementClientRect = rectToClientRect(platform2.convertOffsetParentRelativeRectToViewportRelativeRect ? await platform2.convertOffsetParentRelativeRectToViewportRelativeRect({
      elements,
      rect,
      offsetParent,
      strategy
    }) : rect);
    return {
      top: (clippingClientRect.top - elementClientRect.top + paddingObject.top) / offsetScale.y,
      bottom: (elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom) / offsetScale.y,
      left: (clippingClientRect.left - elementClientRect.left + paddingObject.left) / offsetScale.x,
      right: (elementClientRect.right - clippingClientRect.right + paddingObject.right) / offsetScale.x
    };
  }
  var MAX_RESET_COUNT = 50;
  var computePosition = async (reference, floating, config) => {
    const {
      placement = "bottom",
      strategy = "absolute",
      middleware = [],
      platform: platform2
    } = config;
    const platformWithDetectOverflow = platform2.detectOverflow ? platform2 : {
      ...platform2,
      detectOverflow
    };
    const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(floating));
    let rects = await platform2.getElementRects({
      reference,
      floating,
      strategy
    });
    let {
      x,
      y
    } = computeCoordsFromPlacement(rects, placement, rtl);
    let statefulPlacement = placement;
    let resetCount = 0;
    const middlewareData = {};
    for (let i = 0; i < middleware.length; i++) {
      const currentMiddleware = middleware[i];
      if (!currentMiddleware) {
        continue;
      }
      const {
        name,
        fn
      } = currentMiddleware;
      const {
        x: nextX,
        y: nextY,
        data,
        reset
      } = await fn({
        x,
        y,
        initialPlacement: placement,
        placement: statefulPlacement,
        strategy,
        middlewareData,
        rects,
        platform: platformWithDetectOverflow,
        elements: {
          reference,
          floating
        }
      });
      x = nextX != null ? nextX : x;
      y = nextY != null ? nextY : y;
      middlewareData[name] = {
        ...middlewareData[name],
        ...data
      };
      if (reset && resetCount < MAX_RESET_COUNT) {
        resetCount++;
        if (typeof reset === "object") {
          if (reset.placement) {
            statefulPlacement = reset.placement;
          }
          if (reset.rects) {
            rects = reset.rects === true ? await platform2.getElementRects({
              reference,
              floating,
              strategy
            }) : reset.rects;
          }
          ({
            x,
            y
          } = computeCoordsFromPlacement(rects, statefulPlacement, rtl));
        }
        i = -1;
      }
    }
    return {
      x,
      y,
      placement: statefulPlacement,
      strategy,
      middlewareData
    };
  };
  var arrow = (options) => ({
    name: "arrow",
    options,
    async fn(state) {
      const {
        x,
        y,
        placement,
        rects,
        platform: platform2,
        elements,
        middlewareData
      } = state;
      const {
        element,
        padding = 0
      } = evaluate(options, state) || {};
      if (element == null) {
        return {};
      }
      const paddingObject = getPaddingObject(padding);
      const coords = {
        x,
        y
      };
      const axis = getAlignmentAxis(placement);
      const length = getAxisLength(axis);
      const arrowDimensions = await platform2.getDimensions(element);
      const isYAxis = axis === "y";
      const minProp = isYAxis ? "top" : "left";
      const maxProp = isYAxis ? "bottom" : "right";
      const clientProp = isYAxis ? "clientHeight" : "clientWidth";
      const endDiff = rects.reference[length] + rects.reference[axis] - coords[axis] - rects.floating[length];
      const startDiff = coords[axis] - rects.reference[axis];
      const arrowOffsetParent = await (platform2.getOffsetParent == null ? void 0 : platform2.getOffsetParent(element));
      let clientSize = arrowOffsetParent ? arrowOffsetParent[clientProp] : 0;
      if (!clientSize || !await (platform2.isElement == null ? void 0 : platform2.isElement(arrowOffsetParent))) {
        clientSize = elements.floating[clientProp] || rects.floating[length];
      }
      const centerToReference = endDiff / 2 - startDiff / 2;
      const largestPossiblePadding = clientSize / 2 - arrowDimensions[length] / 2 - 1;
      const minPadding = min(paddingObject[minProp], largestPossiblePadding);
      const maxPadding = min(paddingObject[maxProp], largestPossiblePadding);
      const max2 = clientSize - arrowDimensions[length] - maxPadding;
      const center = clientSize / 2 - arrowDimensions[length] / 2 + centerToReference;
      const offset3 = clamp(minPadding, center, max2);
      const shouldAddOffset = !middlewareData.arrow && getAlignment(placement) != null && center !== offset3 && rects.reference[length] / 2 - (center < minPadding ? minPadding : maxPadding) - arrowDimensions[length] / 2 < 0;
      const alignmentOffset = shouldAddOffset ? center < minPadding ? center - minPadding : center - max2 : 0;
      return {
        [axis]: coords[axis] + alignmentOffset,
        data: {
          [axis]: offset3,
          centerOffset: center - offset3 - alignmentOffset,
          ...shouldAddOffset && {
            alignmentOffset
          }
        },
        reset: shouldAddOffset
      };
    }
  });
  var flip = function(options) {
    if (options === void 0) {
      options = {};
    }
    return {
      name: "flip",
      options,
      async fn(state) {
        var _middlewareData$arrow, _middlewareData$flip;
        const {
          placement,
          middlewareData,
          rects,
          initialPlacement,
          platform: platform2,
          elements
        } = state;
        const {
          mainAxis: checkMainAxis = true,
          crossAxis: checkCrossAxis = true,
          fallbackPlacements: specifiedFallbackPlacements,
          fallbackStrategy = "bestFit",
          fallbackAxisSideDirection = "none",
          flipAlignment = true,
          ...detectOverflowOptions
        } = evaluate(options, state);
        if ((_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
          return {};
        }
        const side = getSide(placement);
        const initialSideAxis = getSideAxis(initialPlacement);
        const isBasePlacement = getSide(initialPlacement) === initialPlacement;
        const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating));
        const fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipAlignment ? [getOppositePlacement(initialPlacement)] : getExpandedPlacements(initialPlacement));
        const hasFallbackAxisSideDirection = fallbackAxisSideDirection !== "none";
        if (!specifiedFallbackPlacements && hasFallbackAxisSideDirection) {
          fallbackPlacements.push(...getOppositeAxisPlacements(initialPlacement, flipAlignment, fallbackAxisSideDirection, rtl));
        }
        const placements2 = [initialPlacement, ...fallbackPlacements];
        const overflow = await platform2.detectOverflow(state, detectOverflowOptions);
        const overflows = [];
        let overflowsData = ((_middlewareData$flip = middlewareData.flip) == null ? void 0 : _middlewareData$flip.overflows) || [];
        if (checkMainAxis) {
          overflows.push(overflow[side]);
        }
        if (checkCrossAxis) {
          const sides2 = getAlignmentSides(placement, rects, rtl);
          overflows.push(overflow[sides2[0]], overflow[sides2[1]]);
        }
        overflowsData = [...overflowsData, {
          placement,
          overflows
        }];
        if (!overflows.every((side2) => side2 <= 0)) {
          var _middlewareData$flip2, _overflowsData$filter;
          const nextIndex = (((_middlewareData$flip2 = middlewareData.flip) == null ? void 0 : _middlewareData$flip2.index) || 0) + 1;
          const nextPlacement = placements2[nextIndex];
          if (nextPlacement) {
            const ignoreCrossAxisOverflow = checkCrossAxis === "alignment" ? initialSideAxis !== getSideAxis(nextPlacement) : false;
            if (!ignoreCrossAxisOverflow || // We leave the current main axis only if every placement on that axis
            // overflows the main axis.
            overflowsData.every((d) => getSideAxis(d.placement) === initialSideAxis ? d.overflows[0] > 0 : true)) {
              return {
                data: {
                  index: nextIndex,
                  overflows: overflowsData
                },
                reset: {
                  placement: nextPlacement
                }
              };
            }
          }
          let resetPlacement = (_overflowsData$filter = overflowsData.filter((d) => d.overflows[0] <= 0).sort((a, b) => a.overflows[1] - b.overflows[1])[0]) == null ? void 0 : _overflowsData$filter.placement;
          if (!resetPlacement) {
            switch (fallbackStrategy) {
              case "bestFit": {
                var _overflowsData$filter2;
                const placement2 = (_overflowsData$filter2 = overflowsData.filter((d) => {
                  if (hasFallbackAxisSideDirection) {
                    const currentSideAxis = getSideAxis(d.placement);
                    return currentSideAxis === initialSideAxis || // Create a bias to the `y` side axis due to horizontal
                    // reading directions favoring greater width.
                    currentSideAxis === "y";
                  }
                  return true;
                }).map((d) => [d.placement, d.overflows.filter((overflow2) => overflow2 > 0).reduce((acc, overflow2) => acc + overflow2, 0)]).sort((a, b) => a[1] - b[1])[0]) == null ? void 0 : _overflowsData$filter2[0];
                if (placement2) {
                  resetPlacement = placement2;
                }
                break;
              }
              case "initialPlacement":
                resetPlacement = initialPlacement;
                break;
            }
          }
          if (placement !== resetPlacement) {
            return {
              reset: {
                placement: resetPlacement
              }
            };
          }
        }
        return {};
      }
    };
  };
  var originSides = /* @__PURE__ */ new Set(["left", "top"]);
  async function convertValueToCoords(state, options) {
    const {
      placement,
      platform: platform2,
      elements
    } = state;
    const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating));
    const side = getSide(placement);
    const alignment = getAlignment(placement);
    const isVertical = getSideAxis(placement) === "y";
    const mainAxisMulti = originSides.has(side) ? -1 : 1;
    const crossAxisMulti = rtl && isVertical ? -1 : 1;
    const rawValue = evaluate(options, state);
    let {
      mainAxis,
      crossAxis,
      alignmentAxis
    } = typeof rawValue === "number" ? {
      mainAxis: rawValue,
      crossAxis: 0,
      alignmentAxis: null
    } : {
      mainAxis: rawValue.mainAxis || 0,
      crossAxis: rawValue.crossAxis || 0,
      alignmentAxis: rawValue.alignmentAxis
    };
    if (alignment && typeof alignmentAxis === "number") {
      crossAxis = alignment === "end" ? alignmentAxis * -1 : alignmentAxis;
    }
    return isVertical ? {
      x: crossAxis * crossAxisMulti,
      y: mainAxis * mainAxisMulti
    } : {
      x: mainAxis * mainAxisMulti,
      y: crossAxis * crossAxisMulti
    };
  }
  var offset = function(options) {
    if (options === void 0) {
      options = 0;
    }
    return {
      name: "offset",
      options,
      async fn(state) {
        var _middlewareData$offse, _middlewareData$arrow;
        const {
          x,
          y,
          placement,
          middlewareData
        } = state;
        const diffCoords = await convertValueToCoords(state, options);
        if (placement === ((_middlewareData$offse = middlewareData.offset) == null ? void 0 : _middlewareData$offse.placement) && (_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
          return {};
        }
        return {
          x: x + diffCoords.x,
          y: y + diffCoords.y,
          data: {
            ...diffCoords,
            placement
          }
        };
      }
    };
  };
  var shift = function(options) {
    if (options === void 0) {
      options = {};
    }
    return {
      name: "shift",
      options,
      async fn(state) {
        const {
          x,
          y,
          placement,
          platform: platform2
        } = state;
        const {
          mainAxis: checkMainAxis = true,
          crossAxis: checkCrossAxis = false,
          limiter = {
            fn: (_ref) => {
              let {
                x: x2,
                y: y2
              } = _ref;
              return {
                x: x2,
                y: y2
              };
            }
          },
          ...detectOverflowOptions
        } = evaluate(options, state);
        const coords = {
          x,
          y
        };
        const overflow = await platform2.detectOverflow(state, detectOverflowOptions);
        const crossAxis = getSideAxis(placement);
        const mainAxis = getOppositeAxis(crossAxis);
        let mainAxisCoord = coords[mainAxis];
        let crossAxisCoord = coords[crossAxis];
        const clampCoord = (axis, coord) => clamp(coord + overflow[axis === "y" ? "top" : "left"], coord, coord - overflow[axis === "y" ? "bottom" : "right"]);
        if (checkMainAxis) {
          mainAxisCoord = clampCoord(mainAxis, mainAxisCoord);
        }
        if (checkCrossAxis) {
          crossAxisCoord = clampCoord(crossAxis, crossAxisCoord);
        }
        const limitedCoords = limiter.fn({
          ...state,
          [mainAxis]: mainAxisCoord,
          [crossAxis]: crossAxisCoord
        });
        return {
          ...limitedCoords,
          data: {
            x: limitedCoords.x - x,
            y: limitedCoords.y - y,
            enabled: {
              [mainAxis]: checkMainAxis,
              [crossAxis]: checkCrossAxis
            }
          }
        };
      }
    };
  };

  // node_modules/@floating-ui/utils/dist/floating-ui.utils.dom.mjs
  function hasWindow() {
    return typeof window !== "undefined";
  }
  function getNodeName(node) {
    if (isNode(node)) {
      return (node.nodeName || "").toLowerCase();
    }
    return "#document";
  }
  function getWindow(node) {
    var _node$ownerDocument;
    return (node == null || (_node$ownerDocument = node.ownerDocument) == null ? void 0 : _node$ownerDocument.defaultView) || window;
  }
  function getDocumentElement(node) {
    var _ref;
    return (_ref = (isNode(node) ? node.ownerDocument : node.document) || window.document) == null ? void 0 : _ref.documentElement;
  }
  function isNode(value) {
    if (!hasWindow()) {
      return false;
    }
    return value instanceof Node || value instanceof getWindow(value).Node;
  }
  function isElement2(value) {
    if (!hasWindow()) {
      return false;
    }
    return value instanceof Element || value instanceof getWindow(value).Element;
  }
  function isHTMLElement(value) {
    if (!hasWindow()) {
      return false;
    }
    return value instanceof HTMLElement || value instanceof getWindow(value).HTMLElement;
  }
  function isShadowRoot(value) {
    if (!hasWindow() || typeof ShadowRoot === "undefined") {
      return false;
    }
    return value instanceof ShadowRoot || value instanceof getWindow(value).ShadowRoot;
  }
  function isOverflowElement(element) {
    const {
      overflow,
      overflowX,
      overflowY,
      display
    } = getComputedStyle2(element);
    return /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX) && display !== "inline" && display !== "contents";
  }
  function isTableElement(element) {
    return /^(table|td|th)$/.test(getNodeName(element));
  }
  function isTopLayer(element) {
    try {
      if (element.matches(":popover-open")) {
        return true;
      }
    } catch (_e) {
    }
    try {
      return element.matches(":modal");
    } catch (_e) {
      return false;
    }
  }
  var willChangeRe = /transform|translate|scale|rotate|perspective|filter/;
  var containRe = /paint|layout|strict|content/;
  var isNotNone = (value) => !!value && value !== "none";
  var isWebKitValue;
  function isContainingBlock(elementOrCss) {
    const css = isElement2(elementOrCss) ? getComputedStyle2(elementOrCss) : elementOrCss;
    return isNotNone(css.transform) || isNotNone(css.translate) || isNotNone(css.scale) || isNotNone(css.rotate) || isNotNone(css.perspective) || !isWebKit() && (isNotNone(css.backdropFilter) || isNotNone(css.filter)) || willChangeRe.test(css.willChange || "") || containRe.test(css.contain || "");
  }
  function getContainingBlock(element) {
    let currentNode = getParentNode(element);
    while (isHTMLElement(currentNode) && !isLastTraversableNode(currentNode)) {
      if (isContainingBlock(currentNode)) {
        return currentNode;
      } else if (isTopLayer(currentNode)) {
        return null;
      }
      currentNode = getParentNode(currentNode);
    }
    return null;
  }
  function isWebKit() {
    if (isWebKitValue == null) {
      isWebKitValue = typeof CSS !== "undefined" && CSS.supports && CSS.supports("-webkit-backdrop-filter", "none");
    }
    return isWebKitValue;
  }
  function isLastTraversableNode(node) {
    return /^(html|body|#document)$/.test(getNodeName(node));
  }
  function getComputedStyle2(element) {
    return getWindow(element).getComputedStyle(element);
  }
  function getNodeScroll(element) {
    if (isElement2(element)) {
      return {
        scrollLeft: element.scrollLeft,
        scrollTop: element.scrollTop
      };
    }
    return {
      scrollLeft: element.scrollX,
      scrollTop: element.scrollY
    };
  }
  function getParentNode(node) {
    if (getNodeName(node) === "html") {
      return node;
    }
    const result = (
      // Step into the shadow DOM of the parent of a slotted node.
      node.assignedSlot || // DOM Element detected.
      node.parentNode || // ShadowRoot detected.
      isShadowRoot(node) && node.host || // Fallback.
      getDocumentElement(node)
    );
    return isShadowRoot(result) ? result.host : result;
  }
  function getNearestOverflowAncestor(node) {
    const parentNode = getParentNode(node);
    if (isLastTraversableNode(parentNode)) {
      return (node.ownerDocument || node).body;
    }
    if (isHTMLElement(parentNode) && isOverflowElement(parentNode)) {
      return parentNode;
    }
    return getNearestOverflowAncestor(parentNode);
  }
  function getOverflowAncestors(node, list, traverseIframes) {
    var _node$ownerDocument2;
    if (list === void 0) {
      list = [];
    }
    if (traverseIframes === void 0) {
      traverseIframes = true;
    }
    const scrollableAncestor = getNearestOverflowAncestor(node);
    const isBody = scrollableAncestor === ((_node$ownerDocument2 = node.ownerDocument) == null ? void 0 : _node$ownerDocument2.body);
    const win = getWindow(scrollableAncestor);
    if (isBody) {
      const frameElement = getFrameElement(win);
      return list.concat(win, win.visualViewport || [], isOverflowElement(scrollableAncestor) ? scrollableAncestor : [], frameElement && traverseIframes ? getOverflowAncestors(frameElement) : []);
    } else {
      return list.concat(scrollableAncestor, getOverflowAncestors(scrollableAncestor, [], traverseIframes));
    }
  }
  function getFrameElement(win) {
    return win.parent && Object.getPrototypeOf(win.parent) ? win.frameElement : null;
  }

  // node_modules/@floating-ui/dom/dist/floating-ui.dom.mjs
  function getCssDimensions(element) {
    const css = getComputedStyle2(element);
    let width = parseFloat(css.width) || 0;
    let height = parseFloat(css.height) || 0;
    const hasOffset = isHTMLElement(element);
    const offsetWidth = hasOffset ? element.offsetWidth : width;
    const offsetHeight = hasOffset ? element.offsetHeight : height;
    const shouldFallback = round(width) !== offsetWidth || round(height) !== offsetHeight;
    if (shouldFallback) {
      width = offsetWidth;
      height = offsetHeight;
    }
    return {
      width,
      height,
      $: shouldFallback
    };
  }
  function unwrapElement(element) {
    return !isElement2(element) ? element.contextElement : element;
  }
  function getScale(element) {
    const domElement = unwrapElement(element);
    if (!isHTMLElement(domElement)) {
      return createCoords(1);
    }
    const rect = domElement.getBoundingClientRect();
    const {
      width,
      height,
      $
    } = getCssDimensions(domElement);
    let x = ($ ? round(rect.width) : rect.width) / width;
    let y = ($ ? round(rect.height) : rect.height) / height;
    if (!x || !Number.isFinite(x)) {
      x = 1;
    }
    if (!y || !Number.isFinite(y)) {
      y = 1;
    }
    return {
      x,
      y
    };
  }
  var noOffsets = /* @__PURE__ */ createCoords(0);
  function getVisualOffsets(element) {
    const win = getWindow(element);
    if (!isWebKit() || !win.visualViewport) {
      return noOffsets;
    }
    return {
      x: win.visualViewport.offsetLeft,
      y: win.visualViewport.offsetTop
    };
  }
  function shouldAddVisualOffsets(element, isFixed, floatingOffsetParent) {
    if (isFixed === void 0) {
      isFixed = false;
    }
    return !!floatingOffsetParent && isFixed && floatingOffsetParent === getWindow(element);
  }
  function getBoundingClientRect(element, includeScale, isFixedStrategy, offsetParent) {
    if (includeScale === void 0) {
      includeScale = false;
    }
    if (isFixedStrategy === void 0) {
      isFixedStrategy = false;
    }
    const clientRect = element.getBoundingClientRect();
    const domElement = unwrapElement(element);
    let scale = createCoords(1);
    if (includeScale) {
      if (offsetParent) {
        if (isElement2(offsetParent)) {
          scale = getScale(offsetParent);
        }
      } else {
        scale = getScale(element);
      }
    }
    const visualOffsets = shouldAddVisualOffsets(domElement, isFixedStrategy, offsetParent) ? getVisualOffsets(domElement) : createCoords(0);
    let x = (clientRect.left + visualOffsets.x) / scale.x;
    let y = (clientRect.top + visualOffsets.y) / scale.y;
    let width = clientRect.width / scale.x;
    let height = clientRect.height / scale.y;
    if (domElement && offsetParent) {
      const win = getWindow(domElement);
      const offsetWin = isElement2(offsetParent) ? getWindow(offsetParent) : offsetParent;
      let currentWin = win;
      let currentIFrame = getFrameElement(currentWin);
      while (currentIFrame && offsetWin !== currentWin) {
        const iframeScale = getScale(currentIFrame);
        const iframeRect = currentIFrame.getBoundingClientRect();
        const css = getComputedStyle2(currentIFrame);
        const left = iframeRect.left + (currentIFrame.clientLeft + parseFloat(css.paddingLeft)) * iframeScale.x;
        const top = iframeRect.top + (currentIFrame.clientTop + parseFloat(css.paddingTop)) * iframeScale.y;
        x *= iframeScale.x;
        y *= iframeScale.y;
        width *= iframeScale.x;
        height *= iframeScale.y;
        x += left;
        y += top;
        currentWin = getWindow(currentIFrame);
        currentIFrame = getFrameElement(currentWin);
      }
    }
    return rectToClientRect({
      width,
      height,
      x,
      y
    });
  }
  function getWindowScrollBarX(element, rect) {
    const leftScroll = getNodeScroll(element).scrollLeft;
    if (!rect) {
      return getBoundingClientRect(getDocumentElement(element)).left + leftScroll;
    }
    return rect.left + leftScroll;
  }
  function getHTMLOffset(documentElement, scroll) {
    const htmlRect = documentElement.getBoundingClientRect();
    const x = htmlRect.left + scroll.scrollLeft - getWindowScrollBarX(documentElement, htmlRect);
    const y = htmlRect.top + scroll.scrollTop;
    return {
      x,
      y
    };
  }
  function convertOffsetParentRelativeRectToViewportRelativeRect(_ref) {
    let {
      elements,
      rect,
      offsetParent,
      strategy
    } = _ref;
    const isFixed = strategy === "fixed";
    const documentElement = getDocumentElement(offsetParent);
    const topLayer = elements ? isTopLayer(elements.floating) : false;
    if (offsetParent === documentElement || topLayer && isFixed) {
      return rect;
    }
    let scroll = {
      scrollLeft: 0,
      scrollTop: 0
    };
    let scale = createCoords(1);
    const offsets = createCoords(0);
    const isOffsetParentAnElement = isHTMLElement(offsetParent);
    if (isOffsetParentAnElement || !isFixed) {
      if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) {
        scroll = getNodeScroll(offsetParent);
      }
      if (isOffsetParentAnElement) {
        const offsetRect = getBoundingClientRect(offsetParent);
        scale = getScale(offsetParent);
        offsets.x = offsetRect.x + offsetParent.clientLeft;
        offsets.y = offsetRect.y + offsetParent.clientTop;
      }
    }
    const htmlOffset = documentElement && !isOffsetParentAnElement && !isFixed ? getHTMLOffset(documentElement, scroll) : createCoords(0);
    return {
      width: rect.width * scale.x,
      height: rect.height * scale.y,
      x: rect.x * scale.x - scroll.scrollLeft * scale.x + offsets.x + htmlOffset.x,
      y: rect.y * scale.y - scroll.scrollTop * scale.y + offsets.y + htmlOffset.y
    };
  }
  function getClientRects(element) {
    return element.getClientRects ? Array.from(element.getClientRects()) : [];
  }
  function getDocumentRect(html) {
    const scroll = getNodeScroll(html);
    const body = html.ownerDocument.body;
    const width = max(html.scrollWidth, html.clientWidth, body.scrollWidth, body.clientWidth);
    const height = max(html.scrollHeight, html.clientHeight, body.scrollHeight, body.clientHeight);
    let x = -scroll.scrollLeft + getWindowScrollBarX(html);
    const y = -scroll.scrollTop;
    if (getComputedStyle2(body).direction === "rtl") {
      x += max(html.clientWidth, body.clientWidth) - width;
    }
    return {
      width,
      height,
      x,
      y
    };
  }
  var SCROLLBAR_MAX = 25;
  function getViewportRect(element, strategy, rootBoundary) {
    if (rootBoundary === void 0) {
      rootBoundary = "viewport";
    }
    const isLayoutViewport = rootBoundary === "layoutViewport";
    const win = getWindow(element);
    const html = getDocumentElement(element);
    const visualViewport = win.visualViewport;
    let width = html.clientWidth;
    let height = html.clientHeight;
    let x = 0;
    let y = 0;
    if (visualViewport) {
      const layoutRelativeClientCoords = !isWebKit() || strategy === "fixed";
      if (isLayoutViewport) {
        if (!layoutRelativeClientCoords) {
          x = -visualViewport.offsetLeft;
          y = -visualViewport.offsetTop;
        }
      } else {
        width = visualViewport.width;
        height = visualViewport.height;
        if (layoutRelativeClientCoords) {
          x = visualViewport.offsetLeft;
          y = visualViewport.offsetTop;
        }
      }
    }
    const windowScrollbarX = getWindowScrollBarX(html);
    if (windowScrollbarX <= 0) {
      const doc = html.ownerDocument;
      const body = doc.body;
      const bodyStyles = getComputedStyle(body);
      const bodyMarginInline = doc.compatMode === "CSS1Compat" ? parseFloat(bodyStyles.marginLeft) + parseFloat(bodyStyles.marginRight) || 0 : 0;
      const reservedWidth = Math.abs(html.clientWidth - body.clientWidth - bodyMarginInline);
      const gutter = getComputedStyle(html).scrollbarGutter === "stable both-edges" ? reservedWidth / 2 : reservedWidth;
      if (gutter <= SCROLLBAR_MAX) {
        width -= gutter;
      }
    }
    return {
      width,
      height,
      x,
      y
    };
  }
  function getInnerBoundingClientRect(element, strategy) {
    const clientRect = getBoundingClientRect(element, true, strategy === "fixed");
    const top = clientRect.top + element.clientTop;
    const left = clientRect.left + element.clientLeft;
    const scale = getScale(element);
    const width = element.clientWidth * scale.x;
    const height = element.clientHeight * scale.y;
    const x = left * scale.x;
    const y = top * scale.y;
    return {
      width,
      height,
      x,
      y
    };
  }
  function getClientRectFromClippingAncestor(element, clippingAncestor, strategy) {
    let rect;
    if (clippingAncestor === "viewport" || clippingAncestor === "layoutViewport") {
      rect = getViewportRect(element, strategy, clippingAncestor);
    } else if (clippingAncestor === "document") {
      rect = getDocumentRect(getDocumentElement(element));
    } else if (isElement2(clippingAncestor)) {
      rect = getInnerBoundingClientRect(clippingAncestor, strategy);
    } else {
      const visualOffsets = getVisualOffsets(element);
      rect = {
        x: clippingAncestor.x - visualOffsets.x,
        y: clippingAncestor.y - visualOffsets.y,
        width: clippingAncestor.width,
        height: clippingAncestor.height
      };
    }
    return rectToClientRect(rect);
  }
  function getClippingElementAncestors(element, cache) {
    const cachedResult = cache.get(element);
    if (cachedResult) {
      return cachedResult;
    }
    let result = getOverflowAncestors(element, [], false).filter((el) => isElement2(el) && getNodeName(el) !== "body");
    let lastKeptComputedStyle = null;
    const elementIsFixed = getComputedStyle2(element).position === "fixed";
    let currentNode = elementIsFixed ? getParentNode(element) : element;
    while (isElement2(currentNode) && !isLastTraversableNode(currentNode)) {
      const computedStyle = getComputedStyle2(currentNode);
      const currentNodeIsContaining = isContainingBlock(currentNode);
      const lastPosition = lastKeptComputedStyle ? lastKeptComputedStyle.position : elementIsFixed ? "fixed" : "";
      const shouldDropCurrentNode = !currentNodeIsContaining && (lastPosition === "fixed" || lastPosition === "absolute" && computedStyle.position === "static");
      if (shouldDropCurrentNode) {
        result = result.filter((ancestor) => ancestor !== currentNode);
      } else {
        lastKeptComputedStyle = computedStyle;
      }
      currentNode = getParentNode(currentNode);
    }
    cache.set(element, result);
    return result;
  }
  function getClippingRect(_ref) {
    let {
      element,
      boundary,
      rootBoundary,
      strategy
    } = _ref;
    const elementClippingAncestors = boundary === "clippingAncestors" ? isTopLayer(element) ? [] : getClippingElementAncestors(element, this._c) : [].concat(boundary);
    const clippingAncestors = [...elementClippingAncestors, rootBoundary];
    const firstRect = getClientRectFromClippingAncestor(element, clippingAncestors[0], strategy);
    let top = firstRect.top;
    let right = firstRect.right;
    let bottom = firstRect.bottom;
    let left = firstRect.left;
    for (let i = 1; i < clippingAncestors.length; i++) {
      const rect = getClientRectFromClippingAncestor(element, clippingAncestors[i], strategy);
      top = max(rect.top, top);
      right = min(rect.right, right);
      bottom = min(rect.bottom, bottom);
      left = max(rect.left, left);
    }
    return {
      width: right - left,
      height: bottom - top,
      x: left,
      y: top
    };
  }
  function getDimensions(element) {
    const {
      width,
      height
    } = getCssDimensions(element);
    return {
      width,
      height
    };
  }
  function getRectRelativeToOffsetParent(element, offsetParent, strategy) {
    const isOffsetParentAnElement = isHTMLElement(offsetParent);
    const documentElement = getDocumentElement(offsetParent);
    const isFixed = strategy === "fixed";
    const rect = getBoundingClientRect(element, true, isFixed, offsetParent);
    let scroll = {
      scrollLeft: 0,
      scrollTop: 0
    };
    const offsets = createCoords(0);
    if (isOffsetParentAnElement || !isFixed) {
      if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) {
        scroll = getNodeScroll(offsetParent);
      }
      if (isOffsetParentAnElement) {
        const offsetRect = getBoundingClientRect(offsetParent, true, isFixed, offsetParent);
        offsets.x = offsetRect.x + offsetParent.clientLeft;
        offsets.y = offsetRect.y + offsetParent.clientTop;
      }
    }
    if (!isOffsetParentAnElement && documentElement) {
      offsets.x = getWindowScrollBarX(documentElement);
    }
    const htmlOffset = documentElement && !isOffsetParentAnElement && !isFixed ? getHTMLOffset(documentElement, scroll) : createCoords(0);
    const x = rect.left + scroll.scrollLeft - offsets.x - htmlOffset.x;
    const y = rect.top + scroll.scrollTop - offsets.y - htmlOffset.y;
    return {
      x,
      y,
      width: rect.width,
      height: rect.height
    };
  }
  function isStaticPositioned(element) {
    return getComputedStyle2(element).position === "static";
  }
  function getTrueOffsetParent(element, polyfill) {
    if (!isHTMLElement(element) || getComputedStyle2(element).position === "fixed") {
      return null;
    }
    if (polyfill) {
      return polyfill(element);
    }
    let rawOffsetParent = element.offsetParent;
    if (getDocumentElement(element) === rawOffsetParent) {
      rawOffsetParent = rawOffsetParent.ownerDocument.body;
    }
    return rawOffsetParent;
  }
  function getOffsetParent(element, polyfill) {
    const win = getWindow(element);
    if (isTopLayer(element)) {
      return win;
    }
    if (!isHTMLElement(element)) {
      let svgOffsetParent = getParentNode(element);
      while (svgOffsetParent && !isLastTraversableNode(svgOffsetParent)) {
        if (isElement2(svgOffsetParent) && !isStaticPositioned(svgOffsetParent)) {
          return svgOffsetParent;
        }
        svgOffsetParent = getParentNode(svgOffsetParent);
      }
      return win;
    }
    let offsetParent = getTrueOffsetParent(element, polyfill);
    while (offsetParent && isTableElement(offsetParent) && isStaticPositioned(offsetParent)) {
      offsetParent = getTrueOffsetParent(offsetParent, polyfill);
    }
    if (offsetParent && isLastTraversableNode(offsetParent) && isStaticPositioned(offsetParent) && !isContainingBlock(offsetParent)) {
      return win;
    }
    return offsetParent || getContainingBlock(element) || win;
  }
  var getElementRects = async function(data) {
    const getOffsetParentFn = this.getOffsetParent || getOffsetParent;
    const getDimensionsFn = this.getDimensions;
    const floatingDimensions = await getDimensionsFn(data.floating);
    return {
      reference: getRectRelativeToOffsetParent(data.reference, await getOffsetParentFn(data.floating), data.strategy),
      floating: {
        x: 0,
        y: 0,
        width: floatingDimensions.width,
        height: floatingDimensions.height
      }
    };
  };
  function isRTL2(element) {
    return getComputedStyle2(element).direction === "rtl";
  }
  var platform = {
    convertOffsetParentRelativeRectToViewportRelativeRect,
    getDocumentElement,
    getClippingRect,
    getOffsetParent,
    getElementRects,
    getClientRects,
    getDimensions,
    getScale,
    isElement: isElement2,
    isRTL: isRTL2
  };
  function rectsAreEqual(a, b) {
    return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
  }
  function observeMove(element, onMove, ancestorResize) {
    let io = null;
    let timeoutId;
    const root = getDocumentElement(element);
    function cleanup() {
      var _io;
      clearTimeout(timeoutId);
      (_io = io) == null || _io.disconnect();
      io = null;
    }
    function refresh(skip, threshold) {
      if (skip === void 0) {
        skip = false;
      }
      if (threshold === void 0) {
        threshold = 1;
      }
      cleanup();
      const elementRectForRootMargin = element.getBoundingClientRect();
      const {
        left,
        top,
        width,
        height
      } = elementRectForRootMargin;
      if (!skip) {
        onMove();
      }
      if (!width || !height) {
        return;
      }
      const insetTop = floor(top);
      const insetRight = floor(root.clientWidth - (left + width));
      const insetBottom = floor(root.clientHeight - (top + height));
      const insetLeft = floor(left);
      const rootMargin = -insetTop + "px " + -insetRight + "px " + -insetBottom + "px " + -insetLeft + "px";
      const options = {
        rootMargin,
        threshold: max(0, min(1, threshold)) || 1
      };
      let isFirstUpdate = true;
      function handleObserve(entries) {
        const ratio = entries[0].intersectionRatio;
        if (!rectsAreEqual(elementRectForRootMargin, element.getBoundingClientRect())) {
          return refresh();
        }
        if (ratio !== threshold) {
          if (!isFirstUpdate) {
            return refresh();
          }
          if (!ratio) {
            timeoutId = setTimeout(() => {
              refresh(false, 1e-7);
            }, 1e3);
          } else {
            refresh(false, ratio);
          }
        }
        isFirstUpdate = false;
      }
      try {
        io = new IntersectionObserver(handleObserve, {
          ...options,
          // Handle <iframe>s
          root: root.ownerDocument
        });
      } catch (_e) {
        io = new IntersectionObserver(handleObserve, options);
      }
      io.observe(element);
    }
    const win = getWindow(element);
    const handleResize = () => refresh(ancestorResize);
    win.addEventListener("resize", handleResize);
    refresh(true);
    return () => {
      win.removeEventListener("resize", handleResize);
      cleanup();
    };
  }
  function autoUpdate(reference, floating, update, options) {
    if (options === void 0) {
      options = {};
    }
    const {
      ancestorScroll = true,
      ancestorResize = true,
      elementResize = typeof ResizeObserver === "function",
      layoutShift = typeof IntersectionObserver === "function",
      animationFrame = false
    } = options;
    const referenceEl = unwrapElement(reference);
    const ancestors = ancestorScroll || ancestorResize ? [...referenceEl ? getOverflowAncestors(referenceEl) : [], ...floating ? getOverflowAncestors(floating) : []] : [];
    ancestors.forEach((ancestor) => {
      ancestorScroll && ancestor.addEventListener("scroll", update);
      ancestorResize && ancestor.addEventListener("resize", update);
    });
    const cleanupIo = referenceEl && layoutShift ? observeMove(referenceEl, update, ancestorResize) : null;
    let reobserveFrame = -1;
    let resizeObserver = null;
    if (elementResize) {
      resizeObserver = new ResizeObserver((_ref) => {
        let [firstEntry] = _ref;
        if (firstEntry && firstEntry.target === referenceEl && resizeObserver && floating) {
          resizeObserver.unobserve(floating);
          cancelAnimationFrame(reobserveFrame);
          reobserveFrame = requestAnimationFrame(() => {
            var _resizeObserver;
            (_resizeObserver = resizeObserver) == null || _resizeObserver.observe(floating);
          });
        }
        update();
      });
      if (referenceEl && !animationFrame) {
        resizeObserver.observe(referenceEl);
      }
      if (floating) {
        resizeObserver.observe(floating);
      }
    }
    let frameId;
    let prevRefRect = animationFrame ? getBoundingClientRect(reference) : null;
    if (animationFrame) {
      frameLoop();
    }
    function frameLoop() {
      const nextRefRect = getBoundingClientRect(reference);
      if (prevRefRect && !rectsAreEqual(prevRefRect, nextRefRect)) {
        update();
      }
      prevRefRect = nextRefRect;
      frameId = requestAnimationFrame(frameLoop);
    }
    update();
    return () => {
      var _resizeObserver2;
      ancestors.forEach((ancestor) => {
        ancestorScroll && ancestor.removeEventListener("scroll", update);
        ancestorResize && ancestor.removeEventListener("resize", update);
      });
      cleanupIo == null || cleanupIo();
      (_resizeObserver2 = resizeObserver) == null || _resizeObserver2.disconnect();
      resizeObserver = null;
      if (animationFrame) {
        cancelAnimationFrame(frameId);
      }
    };
  }
  var offset2 = offset;
  var shift2 = shift;
  var flip2 = flip;
  var arrow2 = arrow;
  var computePosition2 = (reference, floating, options) => {
    const cache = /* @__PURE__ */ new Map();
    const mergedOptions = options != null ? options : {};
    const platformWithCache = {
      ...platform,
      ...mergedOptions.platform,
      _c: cache
    };
    return computePosition(reference, floating, {
      ...mergedOptions,
      platform: platformWithCache
    });
  };

  // node_modules/bootstrap/js/dist/util/floating-ui.js
  var BREAKPOINTS = {
    sm: 576,
    md: 768,
    lg: 1024,
    xl: 1280,
    "2xl": 1536
  };
  var parseResponsivePlacement = (placementString, defaultPlacement = "bottom") => {
    if (!placementString || !placementString.includes(":")) return null;
    const parts = placementString.split(/\s+/);
    const placements2 = { xs: defaultPlacement };
    for (const part of parts) if (part.includes(":")) {
      const [breakpoint, placement] = part.split(":");
      if (BREAKPOINTS[breakpoint] !== void 0) placements2[breakpoint] = placement;
    } else placements2.xs = part;
    return placements2;
  };
  var getResponsivePlacement = (responsivePlacements, defaultPlacement = "bottom") => {
    if (!responsivePlacements) return defaultPlacement;
    const viewportWidth = window.innerWidth;
    let activePlacement = responsivePlacements.xs || defaultPlacement;
    for (const breakpoint of [
      "sm",
      "md",
      "lg",
      "xl",
      "2xl"
    ]) if (viewportWidth >= BREAKPOINTS[breakpoint] && responsivePlacements[breakpoint]) activePlacement = responsivePlacements[breakpoint];
    return activePlacement;
  };
  var createBreakpointListeners = (callback) => {
    const listeners = [];
    for (const breakpoint of Object.keys(BREAKPOINTS)) {
      const minWidth = BREAKPOINTS[breakpoint];
      const mql = window.matchMedia(`(min-width: ${minWidth}px)`);
      mql.addEventListener("change", callback);
      listeners.push({
        mql,
        handler: callback
      });
    }
    return listeners;
  };
  var disposeBreakpointListeners = (listeners) => {
    for (const { mql, handler } of listeners) mql.removeEventListener("change", handler);
  };
  var toFloatingOffset = (value) => {
    return Array.isArray(value) ? {
      mainAxis: value[1] || 0,
      crossAxis: value[0] || 0
    } : value;
  };

  // node_modules/bootstrap/js/dist/menu.js
  var NAME5 = "menu";
  var EVENT_KEY5 = `.bs.menu`;
  var DATA_API_KEY4 = ".data-api";
  var ESCAPE_KEY = "Escape";
  var TAB_KEY = "Tab";
  var ARROW_UP_KEY = "ArrowUp";
  var ARROW_DOWN_KEY = "ArrowDown";
  var ARROW_LEFT_KEY2 = "ArrowLeft";
  var ARROW_RIGHT_KEY2 = "ArrowRight";
  var HOME_KEY = "Home";
  var END_KEY = "End";
  var ENTER_KEY = "Enter";
  var SPACE_KEY = " ";
  var RIGHT_MOUSE_BUTTON = 2;
  var SUBMENU_CLOSE_DELAY = 100;
  var EVENT_HIDE2 = `hide${EVENT_KEY5}`;
  var EVENT_HIDDEN2 = `hidden${EVENT_KEY5}`;
  var EVENT_SHOW2 = `show${EVENT_KEY5}`;
  var EVENT_SHOWN2 = `shown${EVENT_KEY5}`;
  var EVENT_CLICK_DATA_API4 = `click${EVENT_KEY5}${DATA_API_KEY4}`;
  var EVENT_KEYDOWN_DATA_API = `keydown${EVENT_KEY5}${DATA_API_KEY4}`;
  var EVENT_KEYUP_DATA_API = `keyup${EVENT_KEY5}${DATA_API_KEY4}`;
  var CLASS_NAME_SHOW3 = "show";
  var SELECTOR_DATA_TOGGLE3 = '[data-bs-toggle="menu"]:not(.disabled):not(:disabled)';
  var SELECTOR_MENU = ".menu";
  var SELECTOR_SUBMENU = ".submenu";
  var SELECTOR_SUBMENU_TOGGLE = ".submenu > .menu-item";
  var SELECTOR_NAVBAR_NAV = ".navbar-nav";
  var SELECTOR_VISIBLE_ITEMS = ".menu-item:not(.disabled):not(:disabled)";
  var DEFAULT_PLACEMENT = "bottom-start";
  var SUBMENU_PLACEMENT = "end-start";
  var resolveLogicalPlacement = (placement) => {
    if (isRTL()) return placement.replace(/^start(?=-|$)/, "right").replace(/^end(?=-|$)/, "left");
    return placement.replace(/^start(?=-|$)/, "left").replace(/^end(?=-|$)/, "right");
  };
  var triangleSign = (p1, p2, p3) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  var Default3 = {
    autoClose: true,
    boundary: "clippingParents",
    container: false,
    display: "dynamic",
    offset: [0, 2],
    floatingConfig: null,
    menu: null,
    placement: DEFAULT_PLACEMENT,
    reference: "toggle",
    strategy: "absolute",
    submenuTrigger: "both",
    submenuDelay: SUBMENU_CLOSE_DELAY
  };
  var DefaultType3 = {
    autoClose: "(boolean|string)",
    boundary: "(string|element)",
    container: "(string|element|boolean)",
    display: "string",
    offset: "(array|string|function)",
    floatingConfig: "(null|object|function)",
    menu: "(null|element)",
    placement: "string",
    reference: "(string|element|object)",
    strategy: "string",
    submenuTrigger: "string",
    submenuDelay: "number"
  };
  var Menu = class Menu2 extends BaseComponent {
    static _openInstances = /* @__PURE__ */ new Set();
    constructor(element, config) {
      if (typeof computePosition2 === "undefined") throw new TypeError("Bootstrap's menus require Floating UI (https://floating-ui.com)");
      super(element, config);
      this._floatingCleanup = null;
      this._mediaQueryListeners = [];
      this._responsivePlacements = null;
      this._parent = this._element.parentNode;
      this._openSubmenus = /* @__PURE__ */ new Map();
      this._submenuCloseTimeouts = /* @__PURE__ */ new Map();
      this._hoverIntentData = null;
      this._menu = this._config.menu || this._findMenu();
      if (!this._config.menu && this._menu) this._parent = this._findWrapper(this._menu);
      this._isSubmenu = this._parent.classList?.contains("submenu");
      this._menuOriginalParent = this._menu?.parentNode;
      this._parseResponsivePlacements();
      this._setupSubmenuListeners();
      this._initSubmenuTriggers();
    }
    static get Default() {
      return Default3;
    }
    static get DefaultType() {
      return DefaultType3;
    }
    static get NAME() {
      return NAME5;
    }
    toggle() {
      return this._isShown() ? this.hide() : this.show();
    }
    async show() {
      if (isDisabled(this._element) || this._isShown()) return;
      const relatedTarget = { relatedTarget: this._element };
      if (EventHandler.trigger(this._element, EVENT_SHOW2, relatedTarget).defaultPrevented) return;
      this._moveMenuToContainer();
      this._createFloating();
      if ("ontouchstart" in document.documentElement && !this._parent.closest(SELECTOR_NAVBAR_NAV)) for (const element of document.body.children) EventHandler.on(element, "mouseover", noop);
      this._element.focus({ focusVisible: false });
      this._element.setAttribute("aria-expanded", "true");
      this._menu.classList.add(CLASS_NAME_SHOW3);
      this._element.classList.add(CLASS_NAME_SHOW3);
      if (this._parent) this._parent.classList.add(CLASS_NAME_SHOW3);
      Menu2._openInstances.add(this);
      await this._queueCallback(() => {
        if (this._isShown()) EventHandler.trigger(this._element, EVENT_SHOWN2, relatedTarget);
      }, this._menu, this._isAnimated());
    }
    async hide() {
      if (isDisabled(this._element) || !this._isShown()) return;
      const relatedTarget = { relatedTarget: this._element };
      await this._completeHide(relatedTarget);
    }
    dispose() {
      this._disposeFloating();
      this._restoreMenuToOriginalParent();
      this._disposeMediaQueryListeners();
      this._closeAllSubmenus();
      this._clearAllSubmenuTimeouts();
      Menu2._openInstances.delete(this);
      super.dispose();
    }
    update() {
      if (this._floatingCleanup) this._updateFloatingPosition();
    }
    _findMenu() {
      const wrapper = SelectorEngine.closest(this._element, `:has(${SELECTOR_MENU})`);
      return SelectorEngine.next(this._element, SELECTOR_MENU)[0] || SelectorEngine.prev(this._element, SELECTOR_MENU)[0] || SelectorEngine.findOne(SELECTOR_MENU, wrapper || this._parent);
    }
    _findWrapper(menu) {
      let wrapper = this._element.parentNode;
      while (wrapper instanceof Element && !wrapper.contains(menu)) wrapper = wrapper.parentNode;
      return wrapper instanceof Element ? wrapper : this._element.parentNode;
    }
    async _completeHide(relatedTarget) {
      if (EventHandler.trigger(this._element, EVENT_HIDE2, relatedTarget).defaultPrevented) return;
      this._closeAllSubmenus();
      if ("ontouchstart" in document.documentElement) for (const element of document.body.children) EventHandler.off(element, "mouseover", noop);
      this._menu.classList.remove(CLASS_NAME_SHOW3);
      this._element.classList.remove(CLASS_NAME_SHOW3);
      if (this._parent) this._parent.classList.remove(CLASS_NAME_SHOW3);
      this._element.setAttribute("aria-expanded", "false");
      Menu2._openInstances.delete(this);
      await this._queueCallback(() => {
        if (this._isShown()) return;
        this._disposeFloating();
        this._restoreMenuToOriginalParent();
        Manipulator.removeDataAttribute(this._menu, "placement");
        Manipulator.removeDataAttribute(this._menu, "display");
        EventHandler.trigger(this._element, EVENT_HIDDEN2, relatedTarget);
      }, this._menu, this._isAnimated());
    }
    _getConfig(config) {
      config = super._getConfig(config);
      if (typeof config.reference === "object" && !isElement(config.reference) && typeof config.reference.getBoundingClientRect !== "function") throw new TypeError(`${NAME5.toUpperCase()}: Option "reference" provided type "object" without a required "getBoundingClientRect" method.`);
      return config;
    }
    _createFloating() {
      if (this._config.display === "static") {
        Manipulator.setDataAttribute(this._menu, "display", "static");
        return;
      }
      let referenceElement = this._element;
      if (this._config.reference === "parent") referenceElement = this._parent;
      else if (isElement(this._config.reference)) referenceElement = getElement(this._config.reference);
      else if (typeof this._config.reference === "object") referenceElement = this._config.reference;
      this._updateFloatingPosition(referenceElement);
      this._floatingCleanup = autoUpdate(referenceElement, this._menu, () => this._updateFloatingPosition(referenceElement));
    }
    async _updateFloatingPosition(referenceElement = null) {
      if (!this._menu) return;
      if (!referenceElement) if (this._config.reference === "parent") referenceElement = this._parent;
      else if (isElement(this._config.reference)) referenceElement = getElement(this._config.reference);
      else if (typeof this._config.reference === "object") referenceElement = this._config.reference;
      else referenceElement = this._element;
      const placement = this._getPlacement();
      const middleware = this._getFloatingMiddleware();
      const floatingConfig = this._getFloatingConfig(placement, middleware);
      await this._applyFloatingPosition(referenceElement, this._menu, floatingConfig.placement, floatingConfig.middleware, floatingConfig.strategy);
    }
    _isShown() {
      return this._menu.classList.contains(CLASS_NAME_SHOW3);
    }
    _isAnimated() {
      return getTransitionDurationFromElement(this._menu) > 0;
    }
    _getPlacement() {
      const placement = this._responsivePlacements ? getResponsivePlacement(this._responsivePlacements, DEFAULT_PLACEMENT) : this._config.placement;
      return resolveLogicalPlacement(placement);
    }
    _parseResponsivePlacements() {
      this._responsivePlacements = parseResponsivePlacement(this._config.placement, DEFAULT_PLACEMENT);
      if (this._responsivePlacements) this._setupMediaQueryListeners();
    }
    _setupMediaQueryListeners() {
      this._disposeMediaQueryListeners();
      this._mediaQueryListeners = createBreakpointListeners(() => {
        if (this._isShown()) this._updateFloatingPosition();
      });
    }
    _disposeMediaQueryListeners() {
      disposeBreakpointListeners(this._mediaQueryListeners);
      this._mediaQueryListeners = [];
    }
    _getOffset() {
      const { offset: offsetConfig } = this._config;
      if (typeof offsetConfig === "string") return offsetConfig.split(",").map((value) => Number.parseInt(value, 10));
      if (typeof offsetConfig === "function") return ({ placement, rects }) => {
        return toFloatingOffset(offsetConfig({
          placement,
          reference: rects.reference,
          floating: rects.floating
        }, this._element));
      };
      return offsetConfig;
    }
    _getFloatingMiddleware() {
      const offsetValue = this._getOffset();
      return [
        offset2(typeof offsetValue === "function" ? offsetValue : toFloatingOffset(offsetValue)),
        flip2({
          fallbackPlacements: this._getFallbackPlacements(),
          fallbackStrategy: "initialPlacement"
        }),
        shift2({ boundary: this._config.boundary === "clippingParents" ? "clippingAncestors" : this._config.boundary })
      ];
    }
    _getFallbackPlacements() {
      return {
        bottom: [
          "top",
          "bottom-start",
          "bottom-end",
          "top-start",
          "top-end"
        ],
        "bottom-start": [
          "top-start",
          "bottom-end",
          "top-end"
        ],
        "bottom-end": [
          "top-end",
          "bottom-start",
          "top-start"
        ],
        top: [
          "bottom",
          "top-start",
          "top-end",
          "bottom-start",
          "bottom-end"
        ],
        "top-start": [
          "bottom-start",
          "top-end",
          "bottom-end"
        ],
        "top-end": [
          "bottom-end",
          "top-start",
          "bottom-start"
        ],
        right: [
          "left",
          "right-start",
          "right-end",
          "left-start",
          "left-end"
        ],
        "right-start": [
          "left-start",
          "right-end",
          "left-end",
          "top-start",
          "bottom-start"
        ],
        "right-end": [
          "left-end",
          "right-start",
          "left-start",
          "top-end",
          "bottom-end"
        ],
        left: [
          "right",
          "left-start",
          "left-end",
          "right-start",
          "right-end"
        ],
        "left-start": [
          "right-start",
          "left-end",
          "right-end",
          "top-start",
          "bottom-start"
        ],
        "left-end": [
          "right-end",
          "left-start",
          "right-start",
          "top-end",
          "bottom-end"
        ]
      }[this._getPlacement()] || [
        "top",
        "bottom",
        "right",
        "left"
      ];
    }
    _getFloatingConfig(placement, middleware) {
      const defaultConfig = {
        placement,
        middleware,
        strategy: this._config.strategy
      };
      return {
        ...defaultConfig,
        ...execute(this._config.floatingConfig, [void 0, defaultConfig])
      };
    }
    _disposeFloating() {
      if (this._floatingCleanup) {
        this._floatingCleanup();
        this._floatingCleanup = null;
      }
    }
    _getContainer() {
      const { container } = this._config;
      if (container === false) return null;
      return container === true ? document.body : getElement(container);
    }
    _moveMenuToContainer() {
      const container = this._getContainer();
      if (!container || !this._menu) return;
      if (this._menu.parentNode !== container) container.append(this._menu);
    }
    _restoreMenuToOriginalParent() {
      if (!this._menuOriginalParent || !this._menu) return;
      if (this._menu.parentNode !== this._menuOriginalParent) this._menuOriginalParent.append(this._menu);
    }
    async _applyFloatingPosition(reference, floating, placement, middleware, strategy = "absolute") {
      if (!floating.isConnected) return null;
      const { x, y, placement: finalPlacement } = await computePosition2(reference, floating, {
        placement,
        middleware,
        strategy
      });
      if (!floating.isConnected) return null;
      Object.assign(floating.style, {
        position: strategy,
        left: `${x}px`,
        top: `${y}px`,
        margin: "0"
      });
      Manipulator.setDataAttribute(floating, "placement", finalPlacement);
      return finalPlacement;
    }
    _setupSubmenuListeners() {
      if (this._config.submenuTrigger === "hover" || this._config.submenuTrigger === "both") {
        EventHandler.on(this._menu, "mouseenter", SELECTOR_SUBMENU_TOGGLE, (event) => {
          this._onSubmenuTriggerEnter(event);
        });
        EventHandler.on(this._menu, "mouseleave", SELECTOR_SUBMENU, (event) => {
          this._onSubmenuLeave(event);
        });
        EventHandler.on(this._menu, "mousemove", (event) => {
          this._trackMousePosition(event);
        });
      }
      if (this._config.submenuTrigger === "click" || this._config.submenuTrigger === "both") EventHandler.on(this._menu, "click", SELECTOR_SUBMENU_TOGGLE, (event) => {
        this._onSubmenuTriggerClick(event);
      });
    }
    _onSubmenuTriggerEnter(event) {
      const trigger2 = event.target.closest(SELECTOR_SUBMENU_TOGGLE);
      if (!trigger2) return;
      const submenuWrapper = trigger2.closest(SELECTOR_SUBMENU);
      const submenu = SelectorEngine.findOne(SELECTOR_MENU, submenuWrapper);
      if (!submenu) return;
      this._cancelSubmenuCloseTimeout(submenu);
      this._closeSiblingSubmenus(submenuWrapper);
      this._openSubmenu(trigger2, submenu, submenuWrapper);
    }
    _onSubmenuLeave(event) {
      const submenuWrapper = event.target.closest(SELECTOR_SUBMENU);
      const submenu = SelectorEngine.findOne(SELECTOR_MENU, submenuWrapper);
      if (!submenu || !this._openSubmenus.has(submenu)) return;
      if (this._isMovingTowardSubmenu(event, submenu)) return;
      this._scheduleSubmenuClose(submenu, submenuWrapper);
    }
    _onSubmenuTriggerClick(event) {
      const trigger2 = event.target.closest(SELECTOR_SUBMENU_TOGGLE);
      if (!trigger2) return;
      event.preventDefault();
      event.stopPropagation();
      const submenuWrapper = trigger2.closest(SELECTOR_SUBMENU);
      const submenu = SelectorEngine.findOne(SELECTOR_MENU, submenuWrapper);
      if (!submenu) return;
      if (this._openSubmenus.has(submenu)) this._closeSubmenu(submenu, submenuWrapper);
      else {
        this._closeSiblingSubmenus(submenuWrapper);
        this._openSubmenu(trigger2, submenu, submenuWrapper);
      }
    }
    _initSubmenuTriggers() {
      if (!this._menu) return;
      for (const trigger2 of SelectorEngine.find(SELECTOR_SUBMENU_TOGGLE, this._menu)) {
        if (!SelectorEngine.findOne(SELECTOR_MENU, trigger2.parentElement)) continue;
        trigger2.setAttribute("aria-haspopup", "true");
        if (!trigger2.hasAttribute("aria-expanded")) trigger2.setAttribute("aria-expanded", "false");
      }
    }
    _openSubmenu(trigger2, submenu, submenuWrapper) {
      if (this._openSubmenus.has(submenu)) return;
      trigger2.setAttribute("aria-expanded", "true");
      trigger2.setAttribute("aria-haspopup", "true");
      submenu.style.opacity = "0";
      submenu.classList.add(CLASS_NAME_SHOW3);
      submenuWrapper.classList.add(CLASS_NAME_SHOW3);
      const cleanup = this._createSubmenuFloating(trigger2, submenu, submenuWrapper);
      this._openSubmenus.set(submenu, cleanup);
      EventHandler.on(submenu, "mouseenter", () => {
        this._cancelSubmenuCloseTimeout(submenu);
      });
    }
    _closeSubmenu(submenu, submenuWrapper) {
      if (!this._openSubmenus.has(submenu)) return;
      const nestedSubmenus = SelectorEngine.find(`${SELECTOR_SUBMENU} ${SELECTOR_MENU}.${CLASS_NAME_SHOW3}`, submenu);
      for (const nested of nestedSubmenus) {
        const nestedWrapper = nested.closest(SELECTOR_SUBMENU);
        this._closeSubmenu(nested, nestedWrapper);
      }
      const trigger2 = SelectorEngine.findOne(SELECTOR_SUBMENU_TOGGLE, submenuWrapper);
      const cleanup = this._openSubmenus.get(submenu);
      if (cleanup) cleanup();
      this._openSubmenus.delete(submenu);
      EventHandler.off(submenu, "mouseenter");
      if (trigger2) trigger2.setAttribute("aria-expanded", "false");
      submenu.classList.remove(CLASS_NAME_SHOW3);
      submenuWrapper.classList.remove(CLASS_NAME_SHOW3);
      submenu.style.opacity = "";
    }
    _closeAllSubmenus() {
      for (const [submenu] of this._openSubmenus) {
        const submenuWrapper = submenu.closest(SELECTOR_SUBMENU);
        this._closeSubmenu(submenu, submenuWrapper);
      }
    }
    _closeSiblingSubmenus(currentSubmenuWrapper) {
      const parent = currentSubmenuWrapper.parentNode;
      const siblingSubmenus = SelectorEngine.find(`${SELECTOR_SUBMENU} > ${SELECTOR_MENU}.${CLASS_NAME_SHOW3}`, parent);
      for (const siblingMenu of siblingSubmenus) {
        const siblingWrapper = siblingMenu.closest(SELECTOR_SUBMENU);
        if (siblingWrapper !== currentSubmenuWrapper) this._closeSubmenu(siblingMenu, siblingWrapper);
      }
    }
    _createSubmenuFloating(trigger2, submenu, submenuWrapper) {
      const referenceElement = submenuWrapper;
      const placement = resolveLogicalPlacement(SUBMENU_PLACEMENT);
      const middleware = [
        offset2({
          mainAxis: 0,
          crossAxis: -4
        }),
        flip2({ fallbackPlacements: [
          resolveLogicalPlacement("start-start"),
          resolveLogicalPlacement("end-end"),
          resolveLogicalPlacement("start-end")
        ] }),
        shift2({ padding: 8 })
      ];
      const updatePosition = () => this._applyFloatingPosition(referenceElement, submenu, placement, middleware).then((finalPlacement) => {
        submenu.style.opacity = "";
        return finalPlacement;
      });
      updatePosition();
      return autoUpdate(referenceElement, submenu, updatePosition);
    }
    _scheduleSubmenuClose(submenu, submenuWrapper) {
      this._cancelSubmenuCloseTimeout(submenu);
      const timeoutId = setTimeout(() => {
        this._closeSubmenu(submenu, submenuWrapper);
        this._submenuCloseTimeouts.delete(submenu);
      }, this._config.submenuDelay);
      this._submenuCloseTimeouts.set(submenu, timeoutId);
    }
    _cancelSubmenuCloseTimeout(submenu) {
      const timeoutId = this._submenuCloseTimeouts.get(submenu);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this._submenuCloseTimeouts.delete(submenu);
      }
    }
    _clearAllSubmenuTimeouts() {
      for (const timeoutId of this._submenuCloseTimeouts.values()) clearTimeout(timeoutId);
      this._submenuCloseTimeouts.clear();
    }
    _trackMousePosition(event) {
      this._hoverIntentData = {
        x: event.clientX,
        y: event.clientY,
        timestamp: Date.now()
      };
    }
    _isMovingTowardSubmenu(event, submenu) {
      if (!this._hoverIntentData) return false;
      const submenuRect = submenu.getBoundingClientRect();
      const currentPos = {
        x: event.clientX,
        y: event.clientY
      };
      const lastPos = {
        x: this._hoverIntentData.x,
        y: this._hoverIntentData.y
      };
      const targetX = isRTL() ? submenuRect.right : submenuRect.left;
      const topCorner = {
        x: targetX,
        y: submenuRect.top
      };
      const bottomCorner = {
        x: targetX,
        y: submenuRect.bottom
      };
      return this._pointInTriangle(currentPos, lastPos, topCorner, bottomCorner);
    }
    _pointInTriangle(point, v1, v2, v3) {
      const d1 = triangleSign(point, v1, v2);
      const d2 = triangleSign(point, v2, v3);
      const d3 = triangleSign(point, v3, v1);
      return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
    }
    _getItemsInMenu(menu) {
      return SelectorEngine.find(`:scope > ${SELECTOR_VISIBLE_ITEMS}, :scope > ${SELECTOR_SUBMENU} > ${SELECTOR_VISIBLE_ITEMS}`, menu).filter((element) => isVisible(element));
    }
    _selectMenuItem({ key, target }) {
      const currentMenu = target.closest(SELECTOR_MENU) || this._menu;
      const items = this._getItemsInMenu(currentMenu);
      if (!items.length) return;
      const nextItem = getNextActiveElement(items, target, key === ARROW_DOWN_KEY, !items.includes(target));
      nextItem.focus();
      this._closeUnrelatedSubmenus(currentMenu, nextItem);
    }
    _closeUnrelatedSubmenus(currentMenu, focusedElement) {
      for (const [submenu] of this._openSubmenus) {
        const submenuWrapper = submenu.closest(SELECTOR_SUBMENU);
        if (!submenuWrapper || submenuWrapper.parentElement !== currentMenu || submenuWrapper.contains(focusedElement)) continue;
        this._closeSubmenu(submenu, submenuWrapper);
      }
    }
    _handleSubmenuKeydown(event) {
      const { key, target } = event;
      const isRtl = isRTL();
      const enterKey = isRtl ? ARROW_LEFT_KEY2 : ARROW_RIGHT_KEY2;
      const exitKey = isRtl ? ARROW_RIGHT_KEY2 : ARROW_LEFT_KEY2;
      const submenuWrapper = target.closest(SELECTOR_SUBMENU);
      const isSubmenuToggle = target.matches(SELECTOR_SUBMENU_TOGGLE);
      if ((key === ENTER_KEY || key === SPACE_KEY || key === enterKey) && submenuWrapper && isSubmenuToggle) {
        event.preventDefault();
        event.stopPropagation();
        const submenu = SelectorEngine.findOne(SELECTOR_MENU, submenuWrapper);
        if (submenu) {
          this._closeSiblingSubmenus(submenuWrapper);
          this._openSubmenu(target, submenu, submenuWrapper);
          requestAnimationFrame(() => {
            const firstItem = SelectorEngine.findOne(SELECTOR_VISIBLE_ITEMS, submenu);
            if (firstItem) firstItem.focus();
          });
        }
        return true;
      }
      if (key === exitKey) {
        const currentMenu = target.closest(SELECTOR_MENU);
        const parentSubmenuWrapper = currentMenu?.closest(SELECTOR_SUBMENU);
        if (parentSubmenuWrapper) {
          event.preventDefault();
          event.stopPropagation();
          const parentTrigger = SelectorEngine.findOne(SELECTOR_SUBMENU_TOGGLE, parentSubmenuWrapper);
          this._closeSubmenu(currentMenu, parentSubmenuWrapper);
          if (parentTrigger) parentTrigger.focus();
          return true;
        }
      }
      if (key === HOME_KEY || key === END_KEY) {
        event.preventDefault();
        event.stopPropagation();
        const currentMenu = target.closest(SELECTOR_MENU);
        const items = this._getItemsInMenu(currentMenu);
        if (items.length) {
          const targetItem = key === HOME_KEY ? items[0] : items.at(-1);
          targetItem.focus();
          this._closeUnrelatedSubmenus(currentMenu, targetItem);
        }
        return true;
      }
      return false;
    }
    static clearMenus(event) {
      if (event.button === RIGHT_MOUSE_BUTTON || event.type === "keyup" && event.key !== TAB_KEY) return;
      for (const instance of Menu2._openInstances) {
        if (instance._config.autoClose === false) continue;
        const composedPath = event.composedPath();
        const isMenuTarget = composedPath.includes(instance._menu);
        if (composedPath.includes(instance._element) || instance._config.autoClose === "inside" && !isMenuTarget || instance._config.autoClose === "outside" && isMenuTarget) continue;
        const formAncestor = event.target.closest?.("form");
        const isInsideMenuForm = Boolean(formAncestor) && instance._menu.contains(formAncestor);
        if (instance._menu.contains(event.target) && (event.type === "keyup" && event.key === TAB_KEY || /input|select|option|textarea|form/i.test(event.target.tagName) || isInsideMenuForm)) continue;
        const relatedTarget = { relatedTarget: instance._element };
        if (event.type === "click") relatedTarget.clickEvent = event;
        instance._completeHide(relatedTarget);
      }
    }
    static _getToggleFromKeydownContext(element, event) {
      if (element.matches(SELECTOR_DATA_TOGGLE3)) return element;
      for (const instance of Menu2._openInstances) if (instance._element === event.target || instance._menu?.contains(event.target)) return instance._element;
      return SelectorEngine.prev(element, SELECTOR_DATA_TOGGLE3)[0] || SelectorEngine.next(element, SELECTOR_DATA_TOGGLE3)[0] || SelectorEngine.findOne(SELECTOR_DATA_TOGGLE3, event.delegateTarget.parentNode);
    }
    static dataApiKeydownHandler(event) {
      const isInput = /input|textarea/i.test(event.target.tagName) || event.target.isContentEditable;
      const isEscapeEvent = event.key === ESCAPE_KEY;
      const isUpOrDownEvent = [ARROW_UP_KEY, ARROW_DOWN_KEY].includes(event.key);
      const isLeftOrRightEvent = [ARROW_LEFT_KEY2, ARROW_RIGHT_KEY2].includes(event.key);
      const isHomeOrEndEvent = [HOME_KEY, END_KEY].includes(event.key);
      const isEnterOrSpaceEvent = [ENTER_KEY, SPACE_KEY].includes(event.key);
      const isSubmenuTrigger = event.target.matches(SELECTOR_SUBMENU_TOGGLE);
      if (!isUpOrDownEvent && !isEscapeEvent && !isLeftOrRightEvent && !isHomeOrEndEvent && !(isEnterOrSpaceEvent && isSubmenuTrigger)) return;
      if (isInput && !isEscapeEvent) return;
      const getToggleButton = Menu2._getToggleFromKeydownContext(this, event);
      if (!getToggleButton) return;
      const instance = Menu2.getOrCreateInstance(getToggleButton);
      if ((isLeftOrRightEvent || isHomeOrEndEvent || isEnterOrSpaceEvent && isSubmenuTrigger) && instance._handleSubmenuKeydown(event)) return;
      if (isUpOrDownEvent) {
        event.preventDefault();
        event.stopPropagation();
        instance.show();
        instance._selectMenuItem(event);
        return;
      }
      if (isEscapeEvent && instance._isShown()) {
        event.preventDefault();
        event.stopPropagation();
        const currentMenu = event.target.closest(SELECTOR_MENU);
        const parentSubmenuWrapper = currentMenu?.closest(SELECTOR_SUBMENU);
        if (parentSubmenuWrapper && instance._openSubmenus.size > 0) {
          const parentTrigger = SelectorEngine.findOne(SELECTOR_SUBMENU_TOGGLE, parentSubmenuWrapper);
          instance._closeSubmenu(currentMenu, parentSubmenuWrapper);
          if (parentTrigger) parentTrigger.focus();
          return;
        }
        instance.hide();
        getToggleButton.focus();
      }
    }
  };
  EventHandler.on(document, EVENT_KEYDOWN_DATA_API, SELECTOR_DATA_TOGGLE3, Menu.dataApiKeydownHandler);
  EventHandler.on(document, EVENT_KEYDOWN_DATA_API, SELECTOR_MENU, Menu.dataApiKeydownHandler);
  EventHandler.on(document, EVENT_CLICK_DATA_API4, Menu.clearMenus);
  EventHandler.on(document, EVENT_KEYUP_DATA_API, Menu.clearMenus);
  EventHandler.on(document, EVENT_CLICK_DATA_API4, SELECTOR_DATA_TOGGLE3, function(event) {
    event.preventDefault();
    Menu.getOrCreateInstance(this).toggle();
  });

  // node_modules/bootstrap/js/dist/util/sanitizer.js
  var ARIA_ATTRIBUTE_PATTERN = /^aria-[\w-]*$/i;
  var DefaultAllowlist = {
    "*": [
      "class",
      "dir",
      "id",
      "lang",
      "role",
      ARIA_ATTRIBUTE_PATTERN
    ],
    a: [
      "target",
      "href",
      "title",
      "rel"
    ],
    area: [],
    b: [],
    br: [],
    col: [],
    code: [],
    dd: [],
    div: [],
    dl: [],
    dt: [],
    em: [],
    hr: [],
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
    i: [],
    img: [
      "src",
      "srcset",
      "alt",
      "title",
      "width",
      "height"
    ],
    li: [],
    ol: [],
    p: [],
    pre: [],
    s: [],
    small: [],
    span: [],
    sub: [],
    sup: [],
    strong: [],
    u: [],
    ul: []
  };
  var DefaultIconAllowlist = {
    "*": [
      "class",
      "role",
      ARIA_ATTRIBUTE_PATTERN
    ],
    svg: [
      "xmlns",
      "width",
      "height",
      "viewbox",
      "fill",
      "stroke",
      "stroke-width",
      "stroke-linecap",
      "stroke-linejoin",
      "focusable"
    ],
    path: [
      "d",
      "fill",
      "stroke",
      "stroke-width",
      "fill-rule",
      "clip-rule"
    ],
    line: [
      "x1",
      "y1",
      "x2",
      "y2",
      "stroke",
      "stroke-width",
      "stroke-linecap"
    ],
    circle: [
      "cx",
      "cy",
      "r",
      "fill",
      "stroke",
      "stroke-width"
    ],
    rect: [
      "x",
      "y",
      "width",
      "height",
      "rx",
      "ry",
      "fill",
      "stroke",
      "stroke-width"
    ],
    polyline: [
      "points",
      "fill",
      "stroke",
      "stroke-width"
    ],
    polygon: [
      "points",
      "fill",
      "stroke",
      "stroke-width"
    ],
    g: [
      "fill",
      "stroke",
      "stroke-width",
      "transform"
    ],
    span: [],
    i: []
  };
  var uriAttributes = /* @__PURE__ */ new Set([
    "background",
    "cite",
    "href",
    "itemtype",
    "longdesc",
    "poster",
    "src",
    "xlink:href"
  ]);
  var SAFE_URL_PATTERN = /^(?!(?:javascript|data|vbscript):)(?:[a-z0-9+.-]+:|[^&:/?#]*(?:[/?#]|$))/i;
  var DATA_URL_PATTERN = /^data:(?:image\/(?:bmp|gif|jpeg|jpg|png|tiff|webp)|video\/(?:mpeg|mp4|ogg|webm)|audio\/(?:mp3|oga|ogg|opus));base64,[\d+/a-z=]+$/i;
  var allowedAttribute = (attribute, allowedAttributeList) => {
    const attributeName = attribute.nodeName.toLowerCase();
    if (allowedAttributeList.includes(attributeName)) {
      if (uriAttributes.has(attributeName)) return Boolean(SAFE_URL_PATTERN.test(attribute.nodeValue) || DATA_URL_PATTERN.test(attribute.nodeValue));
      return true;
    }
    return allowedAttributeList.filter((attributeRegex) => attributeRegex instanceof RegExp).some((regex) => regex.test(attributeName));
  };
  function sanitizeHtml(unsafeHtml, allowList, sanitizeFunction) {
    if (!unsafeHtml.length) return unsafeHtml;
    if (sanitizeFunction && typeof sanitizeFunction === "function") return sanitizeFunction(unsafeHtml);
    const createdDocument = new window.DOMParser().parseFromString(unsafeHtml, "text/html");
    const elements = [...createdDocument.body.querySelectorAll("*")];
    for (const element of elements) {
      const elementName = element.nodeName.toLowerCase();
      if (!Object.keys(allowList).includes(elementName)) {
        element.remove();
        continue;
      }
      const attributeList = [...element.attributes];
      const allowedAttributes = [...allowList["*"] || [], ...allowList[elementName] || []];
      for (const attribute of attributeList) if (!allowedAttribute(attribute, allowedAttributes)) element.removeAttribute(attribute.nodeName);
    }
    return createdDocument.body.innerHTML;
  }

  // node_modules/bootstrap/js/dist/nav-overflow.js
  var NAME6 = "navoverflow";
  var EVENT_KEY6 = `.bs.navoverflow`;
  var EVENT_UPDATE = `update${EVENT_KEY6}`;
  var EVENT_OVERFLOW = `overflow${EVENT_KEY6}`;
  var EVENT_RESIZE = `resize${EVENT_KEY6}`;
  var CLASS_NAME_OVERFLOW = "nav-overflow";
  var CLASS_NAME_OVERFLOW_MENU = "nav-overflow-menu";
  var CLASS_NAME_HIDDEN = "d-none";
  var CLASS_NAME_KEEP = "nav-overflow-keep";
  var CLASS_NAME_INITIALIZED = "nav-overflow-initialized";
  var CLASS_NAME_SUBMENU = "submenu";
  var CLASS_NAME_SHOW4 = "show";
  var SELECTOR_NAV = ".nav";
  var SELECTOR_NAV_ITEM = ".nav-item";
  var SELECTOR_NAV_LINK = ".nav-link";
  var SELECTOR_OVERFLOW_TOGGLE = ".nav-overflow-toggle";
  var SELECTOR_OVERFLOW_MENU = ".nav-overflow-menu";
  var SELECTOR_CUSTOM_ICON = "[data-bs-overflow-icon]";
  var SELECTOR_MENU2 = ".menu";
  var SELECTOR_MENU_TOGGLE = '[data-bs-toggle="menu"]';
  var DEFAULT_TEXT = "More";
  var Default4 = {
    collapseBelow: 0,
    iconPlacement: "start",
    menuPlacement: "bottom-end",
    menuStrategy: "absolute",
    moreText: DEFAULT_TEXT,
    moreIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3"/></svg>',
    threshold: 0
  };
  var DefaultType4 = {
    collapseBelow: "(number|string)",
    iconPlacement: "string",
    menuPlacement: "string",
    menuStrategy: "string",
    moreText: "(string|boolean)",
    moreIcon: "string",
    threshold: "number"
  };
  var NavOverflow = class extends BaseComponent {
    constructor(element, config) {
      super(element, config);
      const nav = SelectorEngine.findOne(SELECTOR_NAV, this._element);
      if (!nav) throw new TypeError(`${this._element.outerHTML} has no child ${SELECTOR_NAV} to collapse`);
      this._nav = nav;
      this._items = [];
      this._overflowItems = [];
      this._overflowMenu = null;
      this._overflowToggle = null;
      this._resizeObserver = null;
      this._resizeHandler = null;
      this._collapseBelow = 0;
      this._itemMenus = /* @__PURE__ */ new Map();
      this._relocatedMenus = /* @__PURE__ */ new Map();
      this._init();
    }
    static get Default() {
      return Default4;
    }
    static get DefaultType() {
      return DefaultType4;
    }
    static get NAME() {
      return NAME6;
    }
    update() {
      this._calculateOverflow();
      EventHandler.trigger(this._element, EVENT_UPDATE);
    }
    dispose() {
      if (this._resizeObserver) this._resizeObserver.disconnect();
      if (this._resizeHandler) EventHandler.off(window, EVENT_RESIZE, this._resizeHandler);
      this._restoreItems();
      if (this._overflowToggle && this._overflowToggle.parentElement) this._overflowToggle.parentElement.remove();
      super.dispose();
    }
    _init() {
      this._element.classList.add(CLASS_NAME_OVERFLOW);
      this._items = SelectorEngine.find(SELECTOR_NAV_ITEM, this._nav).filter((item) => !item.querySelector(SELECTOR_OVERFLOW_TOGGLE));
      for (const [index, item] of this._items.entries()) {
        item.dataset.bsNavOrder = index;
        const link = SelectorEngine.findOne(SELECTOR_NAV_LINK, item);
        if (link?.matches(SELECTOR_MENU_TOGGLE)) this._findItemMenu(item, link);
      }
      this._collapseBelow = this._resolveCollapseBelow();
      this._createOverflowMenu();
      this._setupResizeObserver();
      this._calculateOverflow();
      this._element.classList.add(CLASS_NAME_INITIALIZED);
    }
    _createOverflowMenu() {
      this._overflowToggle = SelectorEngine.findOne(SELECTOR_OVERFLOW_TOGGLE, this._element);
      if (this._overflowToggle) {
        this._overflowMenu = SelectorEngine.findOne(SELECTOR_OVERFLOW_MENU, this._element);
        return;
      }
      const { moreText } = this._config;
      const label = typeof moreText === "string" ? moreText : "";
      const overflowItem = document.createElement("li");
      overflowItem.className = "nav-item nav-overflow-item";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "nav-link nav-overflow-toggle";
      button.setAttribute("data-bs-toggle", "menu");
      button.setAttribute("data-bs-placement", this._config.menuPlacement);
      button.setAttribute("data-bs-strategy", this._config.menuStrategy);
      button.setAttribute("aria-expanded", "false");
      if (label === "") button.setAttribute("aria-label", DEFAULT_TEXT);
      const iconSpan = document.createElement("span");
      iconSpan.className = "nav-overflow-icon";
      iconSpan.innerHTML = sanitizeHtml(this._resolveIcon(), DefaultIconAllowlist);
      if (label === "") button.append(iconSpan);
      else {
        const textSpan = document.createElement("span");
        textSpan.className = "nav-overflow-text";
        textSpan.textContent = label;
        if (this._config.iconPlacement === "end") button.append(textSpan, iconSpan);
        else button.append(iconSpan, textSpan);
      }
      const menu = document.createElement("div");
      menu.className = `${CLASS_NAME_OVERFLOW_MENU} menu`;
      overflowItem.append(button, menu);
      this._nav.append(overflowItem);
      this._overflowToggle = button;
      this._overflowMenu = menu;
    }
    _resolveIcon() {
      const customIconElement = SelectorEngine.findOne(SELECTOR_CUSTOM_ICON, this._element);
      if (!customIconElement) return this._config.moreIcon;
      const iconClone = customIconElement.cloneNode(true);
      iconClone.removeAttribute("data-bs-overflow-icon");
      const iconHtml = iconClone.outerHTML;
      customIconElement.remove();
      return iconHtml;
    }
    _resolveCollapseBelow() {
      const value = this._config.collapseBelow;
      if (typeof value === "number") return value;
      if (typeof value === "string" && value !== "") {
        const cssValue = getComputedStyle(document.documentElement).getPropertyValue(`--bs-breakpoint-${value}`);
        return Number.parseFloat(cssValue) || 0;
      }
      return 0;
    }
    _setupResizeObserver() {
      if (typeof ResizeObserver === "undefined") {
        this._resizeHandler = () => this._calculateOverflow();
        EventHandler.on(window, EVENT_RESIZE, this._resizeHandler);
        return;
      }
      this._resizeObserver = new ResizeObserver(() => {
        this._calculateOverflow();
      });
      this._resizeObserver.observe(this._element);
    }
    _availableWidth() {
      const { paddingInlineStart, paddingInlineEnd } = getComputedStyle(this._element);
      const padding = (Number.parseFloat(paddingInlineStart) || 0) + (Number.parseFloat(paddingInlineEnd) || 0);
      return this._element.clientWidth - padding;
    }
    _navGap() {
      return Number.parseFloat(getComputedStyle(this._nav).columnGap) || 0;
    }
    _calculateOverflow() {
      this._restoreItems();
      const availableWidth = this._availableWidth();
      const overflowItem = this._overflowToggle?.closest(SELECTOR_NAV_ITEM) ?? null;
      const candidates = this._items.filter((item) => !item.classList.contains(CLASS_NAME_KEEP));
      if (this._collapseBelow > 0 && availableWidth < this._collapseBelow) {
        this._applyOverflow(candidates, overflowItem);
        return;
      }
      const gap = this._navGap();
      const keepWidth = this._items.filter((item) => item.classList.contains(CLASS_NAME_KEEP)).reduce((sum, item) => sum + item.offsetWidth + gap, 0);
      const overflowWidth = overflowItem ? overflowItem.offsetWidth + gap : 0;
      const limit = availableWidth - keepWidth - overflowWidth;
      let usedWidth = 0;
      let itemsToOverflow = [];
      for (const item of candidates) {
        usedWidth += item.offsetWidth + gap;
        if (usedWidth > limit + 1) itemsToOverflow.push(item);
      }
      if (this._items.length - itemsToOverflow.length < this._config.threshold && this._items.length > this._config.threshold) itemsToOverflow = this._items.slice(this._config.threshold).filter((item) => !item.classList.contains(CLASS_NAME_KEEP));
      this._applyOverflow(itemsToOverflow, overflowItem);
    }
    _applyOverflow(items, overflowItem) {
      this._moveToOverflow(items);
      overflowItem?.classList.toggle(CLASS_NAME_HIDDEN, items.length === 0);
      if (items.length > 0) EventHandler.trigger(this._element, EVENT_OVERFLOW, {
        overflowCount: items.length,
        visibleCount: this._items.length - items.length
      });
    }
    _moveToOverflow(items) {
      if (!this._overflowMenu) return;
      this._overflowMenu.replaceChildren();
      this._overflowItems = [];
      for (const item of items) {
        const link = SelectorEngine.findOne(SELECTOR_NAV_LINK, item);
        if (!link) continue;
        const menu = this._findItemMenu(item, link);
        if (menu && link.matches(SELECTOR_MENU_TOGGLE)) this._overflowMenu.append(this._relocateAsSubmenu(item, link, menu));
        else this._overflowMenu.append(this._cloneAsMenuItem(link));
        item.classList.add(CLASS_NAME_HIDDEN);
        item.dataset.bsNavOverflow = "true";
        this._overflowItems.push(item);
      }
    }
    _relocateAsSubmenu(item, link, menu) {
      this._resetMenu(link, menu);
      item.classList.remove(CLASS_NAME_SHOW4);
      this._relocatedMenus.set(item, {
        menu,
        parent: menu.parentNode,
        nextSibling: menu.nextSibling
      });
      const submenu = document.createElement("div");
      submenu.className = CLASS_NAME_SUBMENU;
      submenu.append(this._cloneAsMenuItem(link, true), menu);
      return submenu;
    }
    _cloneAsMenuItem(link, submenu = false) {
      const clonedLink = link.cloneNode(true);
      clonedLink.className = "menu-item";
      clonedLink.removeAttribute("id");
      if (link.classList.contains("active")) clonedLink.classList.add("active");
      if (link.classList.contains("disabled") || link.hasAttribute("disabled")) clonedLink.classList.add("disabled");
      if (submenu) {
        for (const name of clonedLink.getAttributeNames()) if (name.startsWith("data-bs-") && name !== "data-bs-theme") clonedLink.removeAttribute(name);
        clonedLink.removeAttribute("href");
        clonedLink.setAttribute("aria-haspopup", "true");
        clonedLink.setAttribute("aria-expanded", "false");
        if (clonedLink.tagName === "A") {
          clonedLink.setAttribute("role", "button");
          if (!clonedLink.hasAttribute("tabindex")) clonedLink.setAttribute("tabindex", "0");
        }
      }
      return clonedLink;
    }
    _findItemMenu(item, link) {
      const sibling = SelectorEngine.next(link, SELECTOR_MENU2)[0];
      if (sibling && !sibling.classList.contains(CLASS_NAME_OVERFLOW_MENU)) {
        this._itemMenus.set(item, sibling);
        return sibling;
      }
      const nested = SelectorEngine.findOne(SELECTOR_MENU2, item);
      if (nested && !nested.classList.contains(CLASS_NAME_OVERFLOW_MENU)) {
        this._itemMenus.set(item, nested);
        return nested;
      }
      const cached = this._itemMenus.get(item);
      if (cached?.isConnected) return cached;
      this._itemMenus.delete(item);
      return null;
    }
    _resetMenu(toggle, menu) {
      Menu.getInstance(toggle)?.dispose();
      toggle.classList.remove(CLASS_NAME_SHOW4);
      toggle.setAttribute("aria-expanded", "false");
      toggle.parentElement?.classList.remove(CLASS_NAME_SHOW4);
      menu.classList.remove(CLASS_NAME_SHOW4);
    }
    _restoreRelocatedMenus() {
      for (const { menu, parent, nextSibling } of this._relocatedMenus.values()) if (nextSibling) nextSibling.before(menu);
      else parent.append(menu);
      this._relocatedMenus.clear();
    }
    _restoreItems() {
      if (this._overflowToggle && this._overflowMenu) {
        this._resetMenu(this._overflowToggle, this._overflowMenu);
        this._overflowToggle.closest(SELECTOR_NAV_ITEM)?.classList.remove(CLASS_NAME_SHOW4);
      }
      this._restoreRelocatedMenus();
      for (const item of this._items) {
        item.classList.remove(CLASS_NAME_HIDDEN);
        delete item.dataset.bsNavOverflow;
      }
      this._overflowToggle?.closest(SELECTOR_NAV_ITEM)?.classList.remove(CLASS_NAME_HIDDEN);
      this._overflowMenu?.replaceChildren();
      this._overflowItems = [];
    }
  };
  EventHandler.on(document, "DOMContentLoaded", () => {
    for (const element of SelectorEngine.find('[data-bs-toggle="nav-overflow"]')) NavOverflow.getOrCreateInstance(element);
  });

  // node_modules/bootstrap/js/dist/dialog-base.js
  var CLASS_NAME_OPEN = "dialog-open";
  var DialogBase = class extends BaseComponent {
    constructor(element, config) {
      super(element, config);
      this._isTransitioning = false;
      this._openedAsModal = false;
      this._addDialogListeners();
    }
    static get NAME() {
      return "dialogbase";
    }
    toggle(relatedTarget) {
      return this._element.open ? this.hide() : this.show(relatedTarget);
    }
    async show(relatedTarget) {
      if (!this._canShow(relatedTarget)) return;
      await this._show(relatedTarget);
    }
    async hide() {
      if (!this._canHide()) return;
      await this._hide();
    }
    _canShow(relatedTarget) {
      if (this._element.open || this._isTransitioning) return false;
      return !EventHandler.trigger(this._element, this.constructor.eventName("show"), { relatedTarget }).defaultPrevented;
    }
    async _show(relatedTarget) {
      this._isTransitioning = true;
      this._onBeforeShow();
      const { modal, preventBodyScroll } = this._getShowOptions();
      this._showElement({
        modal,
        preventBodyScroll
      });
      await this._queueCallback(() => {
        this._isTransitioning = false;
        EventHandler.trigger(this._element, this.constructor.eventName("shown"), { relatedTarget });
      }, this._element, this._isAnimated());
    }
    _canHide() {
      if (!this._element.open || this._isTransitioning) return false;
      return !EventHandler.trigger(this._element, this.constructor.eventName("hide")).defaultPrevented;
    }
    async _hide() {
      this._isTransitioning = true;
      this._hideElement();
      await this._queueCallback(() => {
        if (this._element.open) this._closeAndCleanup();
        this._element.classList.remove("hiding");
        this._onAfterHide();
        this._isTransitioning = false;
        EventHandler.trigger(this._element, this.constructor.eventName("hidden"));
      }, this._element, this._isAnimated());
    }
    dispose() {
      if (this._element.open) this._closeAndCleanup();
      EventHandler.off(this._element, "cancel", this._cancelHandler);
      super.dispose();
    }
    _getShowOptions() {
      return {
        modal: true,
        preventBodyScroll: true
      };
    }
    _onBeforeShow() {
    }
    _onAfterHide() {
    }
    _isAnimated() {
      return !this._element.classList.contains(this._getInstantClassName());
    }
    _getInstantClassName() {
      return "dialog-instant";
    }
    _getStaticClassName() {
      return "dialog-static";
    }
    _onCancel() {
    }
    _showElement({ modal = true, preventBodyScroll = true } = {}) {
      this._openedAsModal = modal;
      if (modal) this._element.showModal();
      else this._element.show();
      if (preventBodyScroll) document.documentElement.classList.add(CLASS_NAME_OPEN);
    }
    _hideElement() {
      this._hideChildComponents();
      this._element.classList.add("hiding");
      if (!this._shouldDeferClose()) this._closeAndCleanup();
    }
    _closeAndCleanup() {
      this._element.close();
      this._openedAsModal = false;
      if (!document.querySelector("dialog[open]:modal")) document.documentElement.classList.remove(CLASS_NAME_OPEN);
    }
    _shouldDeferClose() {
      return false;
    }
    _triggerBackdropTransition() {
      if (EventHandler.trigger(this._element, this.constructor.eventName("hidePrevented")).defaultPrevented) return;
      const staticClass = this._getStaticClassName();
      this._element.classList.add(staticClass);
      this._queueCallback(() => {
        this._element.classList.remove(staticClass);
      }, this._element);
    }
    _hideChildComponents() {
      for (const el of SelectorEngine.find('[data-bs-toggle="tooltip"], [data-bs-toggle="popover"]', this._element)) {
        const instance = data_default.getAny(el);
        if (instance && typeof instance.hide === "function") instance.hide();
      }
      for (const el of SelectorEngine.find(".toast.show", this._element)) {
        const instance = data_default.getAny(el);
        if (instance && typeof instance.hide === "function") instance.hide();
      }
    }
    _addDialogListeners() {
      const eventKey = this.constructor.EVENT_KEY;
      this._cancelHandler = (event) => {
        event.preventDefault();
        if (!this._config.keyboard) {
          this._triggerBackdropTransition();
          return;
        }
        this._onCancel();
        this.hide();
      };
      EventHandler.on(this._element, "cancel", this._cancelHandler);
      EventHandler.on(this._element, `keydown${eventKey}`, (event) => {
        if (event.key !== "Escape" || this._openedAsModal) return;
        event.preventDefault();
        if (!this._config.keyboard) return;
        this._onCancel();
        this.hide();
      });
      EventHandler.on(this._element, `click${eventKey}`, (event) => {
        if (event.target !== this._element || !this._openedAsModal) return;
        if (this._config.backdrop === false) return;
        if (this._config.backdrop === "static") {
          this._triggerBackdropTransition();
          return;
        }
        this.hide();
      });
    }
  };

  // node_modules/bootstrap/js/dist/util/swipe.js
  var NAME7 = "swipe";
  var EVENT_KEY7 = ".bs.swipe";
  var EVENT_TOUCHSTART = `touchstart${EVENT_KEY7}`;
  var EVENT_TOUCHMOVE = `touchmove${EVENT_KEY7}`;
  var EVENT_TOUCHEND = `touchend${EVENT_KEY7}`;
  var EVENT_POINTERDOWN2 = `pointerdown${EVENT_KEY7}`;
  var EVENT_POINTERUP = `pointerup${EVENT_KEY7}`;
  var POINTER_TYPE_TOUCH = "touch";
  var POINTER_TYPE_PEN = "pen";
  var CLASS_NAME_POINTER_EVENT = "pointer-event";
  var SWIPE_THRESHOLD = 40;
  var Default5 = {
    endCallback: null,
    leftCallback: null,
    rightCallback: null,
    upCallback: null,
    downCallback: null
  };
  var DefaultType5 = {
    endCallback: "(function|null)",
    leftCallback: "(function|null)",
    rightCallback: "(function|null)",
    upCallback: "(function|null)",
    downCallback: "(function|null)"
  };
  var Swipe = class Swipe2 extends Config {
    constructor(element, config) {
      super();
      this._element = element;
      if (!element || !Swipe2.isSupported()) return;
      this._config = this._getConfig(config);
      this._deltaX = 0;
      this._deltaY = 0;
      this._supportPointerEvents = Boolean(window.PointerEvent);
      this._initEvents();
    }
    static get Default() {
      return Default5;
    }
    static get DefaultType() {
      return DefaultType5;
    }
    static get NAME() {
      return NAME7;
    }
    dispose() {
      EventHandler.off(this._element, EVENT_KEY7);
    }
    _start(event) {
      if (!this._supportPointerEvents) {
        this._deltaX = event.touches[0].clientX;
        this._deltaY = event.touches[0].clientY;
        return;
      }
      if (this._eventIsPointerPenTouch(event)) {
        this._deltaX = event.clientX;
        this._deltaY = event.clientY;
      }
    }
    _end(event) {
      if (this._eventIsPointerPenTouch(event)) {
        this._deltaX = event.clientX - this._deltaX;
        this._deltaY = event.clientY - this._deltaY;
      }
      this._handleSwipe();
      execute(this._config.endCallback);
    }
    _move(event) {
      if (event.touches && event.touches.length > 1) {
        this._deltaX = 0;
        this._deltaY = 0;
        return;
      }
      this._deltaX = event.touches[0].clientX - this._deltaX;
      this._deltaY = event.touches[0].clientY - this._deltaY;
    }
    _handleSwipe() {
      const absDeltaX = Math.abs(this._deltaX);
      const absDeltaY = Math.abs(this._deltaY);
      if (absDeltaY > absDeltaX && absDeltaY > SWIPE_THRESHOLD) {
        const direction = this._deltaY > 0 ? "down" : "up";
        this._deltaX = 0;
        this._deltaY = 0;
        execute(direction === "down" ? this._config.downCallback : this._config.upCallback);
        return;
      }
      if (absDeltaX > SWIPE_THRESHOLD) {
        const direction = absDeltaX / this._deltaX;
        this._deltaX = 0;
        this._deltaY = 0;
        if (!direction) return;
        execute(direction > 0 ? this._config.rightCallback : this._config.leftCallback);
        return;
      }
      this._deltaX = 0;
      this._deltaY = 0;
    }
    _initEvents() {
      if (this._supportPointerEvents) {
        EventHandler.on(this._element, EVENT_POINTERDOWN2, (event) => this._start(event));
        EventHandler.on(this._element, EVENT_POINTERUP, (event) => this._end(event));
        this._element.classList.add(CLASS_NAME_POINTER_EVENT);
      } else {
        EventHandler.on(this._element, EVENT_TOUCHSTART, (event) => this._start(event));
        EventHandler.on(this._element, EVENT_TOUCHMOVE, (event) => this._move(event));
        EventHandler.on(this._element, EVENT_TOUCHEND, (event) => this._end(event));
      }
    }
    _eventIsPointerPenTouch(event) {
      return this._supportPointerEvents && (event.pointerType === POINTER_TYPE_PEN || event.pointerType === POINTER_TYPE_TOUCH);
    }
    static isSupported() {
      return "ontouchstart" in document.documentElement || navigator.maxTouchPoints > 0;
    }
  };

  // node_modules/bootstrap/js/dist/drawer.js
  var NAME8 = "drawer";
  var EVENT_KEY8 = `.bs.drawer`;
  var DATA_API_KEY5 = ".data-api";
  var EVENT_LOAD_DATA_API2 = `load${EVENT_KEY8}${DATA_API_KEY5}`;
  var EVENT_HIDDEN3 = `hidden${EVENT_KEY8}`;
  var EVENT_RESIZE2 = `resize${EVENT_KEY8}`;
  var EVENT_CLICK_DATA_API5 = `click${EVENT_KEY8}${DATA_API_KEY5}`;
  var SELECTOR_DATA_TOGGLE4 = '[data-bs-toggle="drawer"]';
  var SELECTOR_OPEN = 'dialog.drawer[open], dialog[open][class*="\\:drawer"]';
  var Default6 = {
    backdrop: true,
    keyboard: true,
    scroll: false
  };
  var DefaultType6 = {
    backdrop: "(boolean|string)",
    keyboard: "boolean",
    scroll: "boolean"
  };
  var Drawer = class extends DialogBase {
    constructor(element, config) {
      super(element, config);
      this._swipeHelper = null;
      this._resizeObserver = null;
      this._resizeFrame = null;
      this._initResizeObserver();
    }
    static get Default() {
      return Default6;
    }
    static get DefaultType() {
      return DefaultType6;
    }
    static get NAME() {
      return NAME8;
    }
    dispose() {
      if (this._swipeHelper) this._swipeHelper.dispose();
      if (this._resizeObserver) this._resizeObserver.disconnect();
      if (this._resizeFrame !== null) cancelAnimationFrame(this._resizeFrame);
      super.dispose();
    }
    _getShowOptions() {
      return {
        modal: Boolean(this._config.backdrop) || !this._config.scroll,
        preventBodyScroll: !this._config.scroll
      };
    }
    _onBeforeShow() {
      this._initSwipe();
    }
    _getInstantClassName() {
      return "drawer-instant";
    }
    _getStaticClassName() {
      return "drawer-static";
    }
    _initResizeObserver() {
      const navbar = this._element.closest(".navbar");
      if (!navbar || typeof ResizeObserver === "undefined") return;
      this._resizeObserver = new ResizeObserver(() => {
        if (this._resizeFrame !== null) cancelAnimationFrame(this._resizeFrame);
        this._resizeFrame = requestAnimationFrame(() => {
          this._resizeFrame = null;
          if (this._element.open && getComputedStyle(this._element).position !== "fixed") this.hide();
        });
      });
      this._resizeObserver.observe(navbar);
    }
    _initSwipe() {
      if (this._swipeHelper || !Swipe.isSupported()) return;
      const swipeConfig = {};
      const element = this._element;
      if (element.classList.contains("drawer-bottom")) swipeConfig.downCallback = () => this.hide();
      else if (element.classList.contains("drawer-top")) swipeConfig.upCallback = () => this.hide();
      else if (element.classList.contains("drawer-end")) if (isRTL()) swipeConfig.leftCallback = () => this.hide();
      else swipeConfig.rightCallback = () => this.hide();
      else if (isRTL()) swipeConfig.rightCallback = () => this.hide();
      else swipeConfig.leftCallback = () => this.hide();
      this._swipeHelper = new Swipe(element, swipeConfig);
    }
  };
  EventHandler.on(document, EVENT_CLICK_DATA_API5, SELECTOR_DATA_TOGGLE4, function(event) {
    const target = SelectorEngine.getElementFromSelector(this);
    if (["A", "AREA"].includes(this.tagName)) event.preventDefault();
    if (isDisabled(this)) return;
    EventHandler.one(target, EVENT_HIDDEN3, () => {
      if (isVisible(this)) this.focus({ preventScroll: true });
    });
    const alreadyOpen = SelectorEngine.findOne("dialog.drawer[open]");
    if (alreadyOpen && alreadyOpen !== target) Drawer.getInstance(alreadyOpen).hide();
    Drawer.getOrCreateInstance(target).toggle(this);
  });
  EventHandler.on(window, EVENT_LOAD_DATA_API2, () => {
    for (const selector of SelectorEngine.find("dialog.drawer[open]")) Drawer.getOrCreateInstance(selector).show();
  });
  EventHandler.on(window, EVENT_RESIZE2, () => {
    for (const element of SelectorEngine.find(SELECTOR_OPEN)) if (getComputedStyle(element).position !== "fixed") Drawer.getOrCreateInstance(element).hide();
  });
  enableDismissTrigger(Drawer);

  // node_modules/bootstrap/js/dist/dialog.js
  var NAME9 = "dialog";
  var EVENT_KEY9 = `.bs.dialog`;
  var DATA_API_KEY6 = ".data-api";
  var EVENT_SHOW3 = `show${EVENT_KEY9}`;
  var EVENT_HIDDEN4 = `hidden${EVENT_KEY9}`;
  var EVENT_CANCEL = `cancel${EVENT_KEY9}`;
  var EVENT_CLICK_DATA_API6 = `click${EVENT_KEY9}${DATA_API_KEY6}`;
  var CLASS_NAME_NONMODAL = "dialog-nonmodal";
  var CLASS_NAME_INSTANT = "dialog-instant";
  var CLASS_NAME_SWAP_IN = "dialog-swap-in";
  var SELECTOR_DATA_TOGGLE5 = '[data-bs-toggle="dialog"]';
  var Default7 = {
    backdrop: true,
    keyboard: true,
    modal: true
  };
  var DefaultType7 = {
    backdrop: "(boolean|string)",
    keyboard: "boolean",
    modal: "boolean"
  };
  var Dialog = class Dialog2 extends DialogBase {
    constructor(element, config) {
      super(element, config);
    }
    static get Default() {
      return Default7;
    }
    static get DefaultType() {
      return DefaultType7;
    }
    static get NAME() {
      return NAME9;
    }
    static {
      EventHandler.on(document, EVENT_CLICK_DATA_API6, SELECTOR_DATA_TOGGLE5, function(event) {
        Dialog2._handleDataApiClick(this, event);
      });
    }
    static _handleDataApiClick(trigger2, event) {
      const target = SelectorEngine.getElementFromSelector(trigger2);
      if (!target) return;
      if (["A", "AREA"].includes(trigger2.tagName)) event.preventDefault();
      const config = Manipulator.getDataAttributes(trigger2);
      const currentDialog = trigger2.closest("dialog[open]");
      if (!(currentDialog && currentDialog !== target)) {
        EventHandler.one(target, EVENT_SHOW3, (showEvent) => {
          if (!showEvent.defaultPrevented) Dialog2._registerFocusRestoration(target, trigger2);
        });
        Dialog2.getOrCreateInstance(target, config).toggle(trigger2);
        return;
      }
      if (currentDialog.classList.contains(CLASS_NAME_SWAP_IN)) return;
      const newDialog = Dialog2.getOrCreateInstance(target, config);
      const currentInstance = Dialog2.getOrCreateInstance(currentDialog);
      if (!newDialog._canShow(trigger2) || !currentInstance._canHide()) return;
      Dialog2._registerFocusRestoration(target, trigger2);
      target.classList.add(CLASS_NAME_SWAP_IN);
      EventHandler.one(target, `shown${EVENT_KEY9}`, () => {
        target.classList.remove(CLASS_NAME_SWAP_IN);
      });
      newDialog._show(trigger2);
      currentDialog.classList.add(CLASS_NAME_INSTANT);
      EventHandler.one(currentDialog, EVENT_HIDDEN4, () => {
        currentDialog.classList.remove(CLASS_NAME_INSTANT);
      });
      currentInstance._hide();
    }
    static _registerFocusRestoration(target, trigger2) {
      EventHandler.one(target, EVENT_HIDDEN4, () => {
        if (isVisible(trigger2)) trigger2.focus({ preventScroll: true });
      });
    }
    handleUpdate() {
    }
    _getShowOptions() {
      return {
        modal: this._config.modal,
        preventBodyScroll: this._config.modal
      };
    }
    _onBeforeShow() {
      if (!this._config.modal) this._element.classList.add(CLASS_NAME_NONMODAL);
    }
    _onAfterHide() {
      this._element.classList.remove(CLASS_NAME_NONMODAL);
    }
    _shouldDeferClose() {
      return this._isAnimated();
    }
    _onCancel() {
      EventHandler.trigger(this._element, EVENT_CANCEL);
    }
  };
  enableDismissTrigger(Dialog);

  // node_modules/bootstrap/js/dist/util/template-factory.js
  var NAME10 = "TemplateFactory";
  var Default8 = {
    allowList: DefaultAllowlist,
    content: {},
    extraClass: "",
    html: false,
    sanitize: true,
    sanitizeFn: null,
    template: "<div></div>"
  };
  var DefaultType8 = {
    allowList: "object",
    content: "object",
    extraClass: "(string|function)",
    html: "boolean",
    sanitize: "boolean",
    sanitizeFn: "(null|function)",
    template: "string"
  };
  var DefaultContentType = {
    entry: "(string|element|function|null)",
    selector: "(string|element)"
  };
  var TemplateFactory = class extends Config {
    constructor(config) {
      super();
      this._config = this._getConfig(config);
    }
    static get Default() {
      return Default8;
    }
    static get DefaultType() {
      return DefaultType8;
    }
    static get NAME() {
      return NAME10;
    }
    getContent() {
      return Object.values(this._config.content).map((config) => this._resolvePossibleFunction(config)).filter(Boolean);
    }
    hasContent() {
      return this.getContent().length > 0;
    }
    changeContent(content) {
      this._checkContent(content);
      this._config.content = {
        ...this._config.content,
        ...content
      };
      return this;
    }
    toHtml() {
      const templateWrapper = document.createElement("div");
      templateWrapper.innerHTML = this._maybeSanitize(this._config.template);
      for (const [selector, text] of Object.entries(this._config.content)) this._setContent(templateWrapper, text, selector);
      const template = templateWrapper.children[0];
      const extraClass = this._resolvePossibleFunction(this._config.extraClass);
      if (extraClass) template.classList.add(...extraClass.split(" "));
      return template;
    }
    _typeCheckConfig(config) {
      super._typeCheckConfig(config);
      this._checkContent(config.content);
    }
    _checkContent(arg) {
      for (const [selector, content] of Object.entries(arg)) super._typeCheckConfig({
        selector,
        entry: content
      }, DefaultContentType);
    }
    _setContent(template, content, selector) {
      const templateElement = SelectorEngine.findOne(selector, template);
      if (!templateElement) return;
      content = this._resolvePossibleFunction(content);
      if (!content) {
        templateElement.remove();
        return;
      }
      if (isElement(content)) {
        this._putElementInTemplate(getElement(content), templateElement);
        return;
      }
      if (this._config.html) {
        templateElement.innerHTML = this._maybeSanitize(content);
        return;
      }
      templateElement.textContent = content;
    }
    _maybeSanitize(arg) {
      return this._config.sanitize ? sanitizeHtml(arg, this._config.allowList, this._config.sanitizeFn) : arg;
    }
    _resolvePossibleFunction(arg) {
      return execute(arg, [void 0, this]);
    }
    _putElementInTemplate(element, templateElement) {
      if (this._config.html) {
        templateElement.innerHTML = "";
        templateElement.append(element);
        return;
      }
      templateElement.textContent = element.textContent;
    }
  };

  // node_modules/bootstrap/js/dist/tooltip.js
  var NAME11 = "tooltip";
  var DISALLOWED_ATTRIBUTES = /* @__PURE__ */ new Set([
    "sanitize",
    "allowList",
    "sanitizeFn"
  ]);
  var ESCAPE_KEY2 = "Escape";
  var CLASS_NAME_MODAL = "modal";
  var CLASS_NAME_SHOW5 = "show";
  var SELECTOR_TOOLTIP_INNER = ".tooltip-inner";
  var SELECTOR_MODAL = `.${CLASS_NAME_MODAL}`;
  var SELECTOR_DATA_TOGGLE6 = '[data-bs-toggle="tooltip"]';
  var EVENT_MODAL_HIDE = "hide.bs.modal";
  var TRIGGER_HOVER = "hover";
  var TRIGGER_FOCUS = "focus";
  var TRIGGER_CLICK = "click";
  var TRIGGER_MANUAL = "manual";
  var EVENT_HIDE3 = "hide";
  var EVENT_HIDDEN5 = "hidden";
  var EVENT_SHOW4 = "show";
  var EVENT_SHOWN3 = "shown";
  var EVENT_INSERTED = "inserted";
  var EVENT_CLICK = "click";
  var EVENT_FOCUSIN = "focusin";
  var EVENT_FOCUSOUT = "focusout";
  var EVENT_MOUSEENTER2 = "mouseenter";
  var EVENT_MOUSELEAVE2 = "mouseleave";
  var EVENT_POINTERDOWN3 = "pointerdown";
  var EVENT_POINTERUP2 = "pointerup";
  var EVENT_KEYDOWN2 = "keydown";
  var AttachmentMap = {
    AUTO: "auto",
    TOP: "top",
    RIGHT: isRTL() ? "left" : "right",
    BOTTOM: "bottom",
    LEFT: isRTL() ? "right" : "left"
  };
  var Default9 = {
    allowList: DefaultAllowlist,
    animation: true,
    boundary: "clippingParents",
    container: false,
    customClass: "",
    delay: 0,
    fallbackPlacements: [
      "top",
      "right",
      "bottom",
      "left"
    ],
    html: false,
    offset: [0, 6],
    placement: "top",
    floatingConfig: null,
    sanitize: true,
    sanitizeFn: null,
    selector: false,
    template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
    title: "",
    trigger: "hover focus"
  };
  var DefaultType9 = {
    allowList: "object",
    animation: "boolean",
    boundary: "(string|element)",
    container: "(string|element|boolean)",
    customClass: "(string|function)",
    delay: "(number|object)",
    fallbackPlacements: "array",
    html: "boolean",
    offset: "(array|string|function)",
    placement: "(string|function)",
    floatingConfig: "(null|object|function)",
    sanitize: "boolean",
    sanitizeFn: "(null|function)",
    selector: "(string|boolean)",
    template: "string",
    title: "(string|element|function)",
    trigger: "string"
  };
  var Tooltip = class extends BaseComponent {
    constructor(element, config) {
      if (typeof computePosition2 === "undefined") throw new TypeError("Bootstrap's tooltips require Floating UI (https://floating-ui.com)");
      super(element, config);
      this._isEnabled = true;
      this._timeout = 0;
      this._resolveTimeout = null;
      this._isHovered = null;
      this._activeTrigger = {};
      this._floatingCleanup = null;
      this._keydownHandler = null;
      this._tipEventOut = null;
      this._outsidePointerHandler = null;
      this._tipPointerUpHandler = null;
      this._tipPointerDown = false;
      this._templateFactory = null;
      this._newContent = null;
      this._mediaQueryListeners = [];
      this._responsivePlacements = null;
      this.tip = null;
      this._parseResponsivePlacements();
      this._setListeners();
      if (!this._config.selector) this._fixTitle();
    }
    static get Default() {
      return Default9;
    }
    static get DefaultType() {
      return DefaultType9;
    }
    static get NAME() {
      return NAME11;
    }
    enable() {
      this._isEnabled = true;
    }
    disable() {
      this._isEnabled = false;
    }
    toggleEnabled() {
      this._isEnabled = !this._isEnabled;
    }
    toggle() {
      if (!this._isEnabled) return Promise.resolve();
      return this._isShown() ? this._leave() : this._enter();
    }
    dispose() {
      this._clearTimeout();
      this._removeEscapeListener();
      this._removeFocusOutsideListener();
      EventHandler.off(this._element.closest(SELECTOR_MODAL), EVENT_MODAL_HIDE, this._hideModalHandler);
      if (this._element.getAttribute("data-bs-original-title")) this._element.setAttribute("title", this._element.getAttribute("data-bs-original-title"));
      this._disposeFloating();
      this._disposeMediaQueryListeners();
      super.dispose();
    }
    async show() {
      if (this._element.style.display === "none") throw new Error("Please use show on visible elements");
      if (!(this._isWithContent() && this._isEnabled)) return;
      const showEvent = EventHandler.trigger(this._element, this.constructor.eventName(EVENT_SHOW4));
      const isInTheDom = (findShadowRoot(this._element) || this._element.ownerDocument.documentElement).contains(this._element);
      if (showEvent.defaultPrevented || !isInTheDom) {
        this._isHovered = false;
        return;
      }
      this._disposeFloating();
      const tip = this._getTipElement();
      this._element.setAttribute("aria-describedby", tip.getAttribute("id"));
      let { container } = this._config;
      const closestDialog = this._element.closest("dialog[open]");
      if (closestDialog && container === document.body) container = closestDialog;
      if (!this._element.ownerDocument.documentElement.contains(this.tip)) {
        container.append(tip);
        EventHandler.trigger(this._element, this.constructor.eventName(EVENT_INSERTED));
        this._setTipListeners(tip);
      }
      await this._createFloating(tip);
      tip.classList.add(CLASS_NAME_SHOW5);
      this._setEscapeListener();
      this._setFocusOutsideListener();
      if ("ontouchstart" in document.documentElement) for (const element of document.body.children) EventHandler.on(element, "mouseover", noop);
      const complete = () => {
        EventHandler.trigger(this._element, this.constructor.eventName(EVENT_SHOWN3));
        if (this._isHovered === false) this._leave();
        this._isHovered = false;
      };
      await this._queueCallback(complete, this.tip, this._isAnimated());
    }
    async hide() {
      if (!this._isShown()) return;
      if (EventHandler.trigger(this._element, this.constructor.eventName(EVENT_HIDE3)).defaultPrevented) return;
      this._removeEscapeListener();
      this._removeFocusOutsideListener();
      this._getTipElement().classList.remove(CLASS_NAME_SHOW5);
      if ("ontouchstart" in document.documentElement) for (const element of document.body.children) EventHandler.off(element, "mouseover", noop);
      this._activeTrigger[TRIGGER_CLICK] = false;
      this._activeTrigger[TRIGGER_FOCUS] = false;
      this._activeTrigger[TRIGGER_HOVER] = false;
      this._isHovered = null;
      const complete = () => {
        if (this._isWithActiveTrigger()) return;
        if (!this._isHovered) this._disposeFloating();
        this._element.removeAttribute("aria-describedby");
        EventHandler.trigger(this._element, this.constructor.eventName(EVENT_HIDDEN5));
      };
      await this._queueCallback(complete, this.tip, this._isAnimated());
    }
    update() {
      if (this._floatingCleanup && this.tip) this._updateFloatingPosition();
    }
    _isWithContent() {
      return Boolean(this._getTitle()) || this._hasNewContent();
    }
    _hasNewContent() {
      return Boolean(this._newContent) && Object.values(this._newContent).some(Boolean);
    }
    _getTipElement() {
      if (!this.tip) this.tip = this._createTipElement(this._newContent || this._getContentForTemplate());
      return this.tip;
    }
    _createTipElement(content) {
      const tip = this._getTemplateFactory(content).toHtml();
      tip.classList.remove(CLASS_NAME_SHOW5);
      tip.classList.add(`bs-${this.constructor.NAME}-auto`);
      const tipId = getUID(this.constructor.NAME).toString();
      tip.setAttribute("id", tipId);
      if (!this._config.animation) tip.classList.add(this._getInstantClassName());
      this._setFocusTipListeners(tip);
      return tip;
    }
    setContent(content) {
      this._newContent = content;
      if (this._isShown()) {
        this._disposeFloating();
        this.show();
      }
    }
    _getTemplateFactory(content) {
      if (this._templateFactory) this._templateFactory.changeContent(content);
      else this._templateFactory = new TemplateFactory({
        ...this._config,
        content,
        extraClass: this._resolvePossibleFunction(this._config.customClass)
      });
      return this._templateFactory;
    }
    _getContentForTemplate() {
      return { [SELECTOR_TOOLTIP_INNER]: this._getTitle() };
    }
    _getTitle() {
      return this._resolvePossibleFunction(this._config.title) || this._element.getAttribute("data-bs-original-title");
    }
    _initializeOnDelegatedTarget(event) {
      return this.constructor.getOrCreateInstance(event.delegateTarget, this._getDelegateConfig());
    }
    _getInstantClassName() {
      return `${this.constructor.NAME}-instant`;
    }
    _isAnimated() {
      return getTransitionDurationFromElement(this.tip) > 0;
    }
    _isShown() {
      return this.tip && this.tip.classList.contains(CLASS_NAME_SHOW5);
    }
    _getPlacement(tip) {
      if (this._responsivePlacements) {
        const placement2 = getResponsivePlacement(this._responsivePlacements, "top");
        return AttachmentMap[placement2.toUpperCase()] || placement2;
      }
      const placement = execute(this._config.placement, [
        this,
        tip,
        this._element
      ]);
      return AttachmentMap[placement.toUpperCase()] || placement;
    }
    _parseResponsivePlacements() {
      if (typeof this._config.placement !== "string") {
        this._responsivePlacements = null;
        return;
      }
      this._responsivePlacements = parseResponsivePlacement(this._config.placement, "top");
      if (this._responsivePlacements) this._setupMediaQueryListeners();
    }
    _setupMediaQueryListeners() {
      this._disposeMediaQueryListeners();
      this._mediaQueryListeners = createBreakpointListeners(() => {
        if (this._isShown()) this._updateFloatingPosition();
      });
    }
    _disposeMediaQueryListeners() {
      disposeBreakpointListeners(this._mediaQueryListeners);
      this._mediaQueryListeners = [];
    }
    async _createFloating(tip) {
      const placement = this._getPlacement(tip);
      const arrowElement = tip.querySelector(`.${this.constructor.NAME}-arrow`);
      await this._updateFloatingPosition(tip, placement, arrowElement);
      this._floatingCleanup = autoUpdate(this._element, tip, () => this._updateFloatingPosition(tip, null, arrowElement));
    }
    async _updateFloatingPosition(tip = this.tip, placement = null, arrowElement = null) {
      if (!tip) return;
      if (!placement) placement = this._getPlacement(tip);
      if (!arrowElement) arrowElement = tip.querySelector(`.${this.constructor.NAME}-arrow`);
      const middleware = this._getFloatingMiddleware(arrowElement);
      const floatingConfig = this._getFloatingConfig(placement, middleware);
      const { x, y, placement: finalPlacement, middlewareData } = await computePosition2(this._element, tip, floatingConfig);
      Object.assign(tip.style, {
        position: "absolute",
        left: `${x}px`,
        top: `${y}px`
      });
      if (arrowElement) arrowElement.style.position = "absolute";
      Manipulator.setDataAttribute(tip, "placement", finalPlacement);
      if (arrowElement && middlewareData.arrow) {
        const { x: arrowX, y: arrowY } = middlewareData.arrow;
        const isVertical = finalPlacement.startsWith("top") || finalPlacement.startsWith("bottom");
        Object.assign(arrowElement.style, {
          left: isVertical && arrowX !== void 0 ? `${arrowX}px` : "",
          top: !isVertical && arrowY !== void 0 ? `${arrowY}px` : "",
          right: "",
          bottom: ""
        });
      }
    }
    _getOffset() {
      const { offset: offset3 } = this._config;
      if (typeof offset3 === "string") return offset3.split(",").map((value) => Number.parseInt(value, 10));
      if (typeof offset3 === "function") return ({ placement, rects }) => {
        return toFloatingOffset(offset3({
          placement,
          reference: rects.reference,
          floating: rects.floating
        }, this._element));
      };
      return offset3;
    }
    _resolvePossibleFunction(arg) {
      return execute(arg, [this._element, this._element]);
    }
    _getFloatingMiddleware(arrowElement) {
      const offsetValue = this._getOffset();
      const middleware = [
        offset2(typeof offsetValue === "function" ? offsetValue : toFloatingOffset(offsetValue)),
        flip2({ fallbackPlacements: this._config.fallbackPlacements }),
        shift2({ boundary: this._config.boundary === "clippingParents" ? "clippingAncestors" : this._config.boundary })
      ];
      if (arrowElement) middleware.push(arrow2({ element: arrowElement }));
      return middleware;
    }
    _getFloatingConfig(placement, middleware) {
      const defaultConfig = {
        placement,
        middleware
      };
      return {
        ...defaultConfig,
        ...execute(this._config.floatingConfig, [void 0, defaultConfig])
      };
    }
    _setListeners() {
      const triggers = this._config.trigger.split(" ");
      for (const trigger2 of triggers) if (trigger2 === "click") EventHandler.on(this._element, this.constructor.eventName(EVENT_CLICK), this._config.selector, (event) => {
        const context = this._initializeOnDelegatedTarget(event);
        context._activeTrigger[TRIGGER_CLICK] = !(context._isShown() && context._activeTrigger[TRIGGER_CLICK]);
        context.toggle();
      });
      else if (trigger2 !== TRIGGER_MANUAL) {
        const [eventIn, eventOut] = this._getTriggerEvents(trigger2);
        EventHandler.on(this._element, eventIn, this._config.selector, (event) => {
          const context = this._initializeOnDelegatedTarget(event);
          context._activeTrigger[event.type === "focusin" ? TRIGGER_FOCUS : TRIGGER_HOVER] = true;
          context._enter();
        });
        EventHandler.on(this._element, eventOut, this._config.selector, (event) => {
          const context = this._initializeOnDelegatedTarget(event);
          if (event.type === "focusout") context._activeTrigger[TRIGGER_FOCUS] = context._isInside(event.relatedTarget) || context._tipPointerDown;
          else context._activeTrigger[TRIGGER_HOVER] = context._isInside(event.relatedTarget);
          context._leave();
        });
      }
      this._hideModalHandler = () => {
        if (this._element) this.hide();
      };
      EventHandler.on(this._element.closest(SELECTOR_MODAL), EVENT_MODAL_HIDE, this._hideModalHandler);
    }
    _setTipListeners(tip) {
      const trigger2 = this._getTrigger();
      if (trigger2 === TRIGGER_MANUAL || trigger2.includes(TRIGGER_CLICK)) return;
      this._tipEventOut = (event) => {
        this._activeTrigger[event.type === "focusout" ? TRIGGER_FOCUS : TRIGGER_HOVER] = this._isInside(event.relatedTarget);
        this._leave();
      };
      for (const name of trigger2.split(" ")) if (name === TRIGGER_HOVER || name === TRIGGER_FOCUS) {
        const [, eventOut] = this._getTriggerEvents(name);
        EventHandler.on(tip, eventOut, this._tipEventOut);
      }
    }
    _removeTipListeners(tip) {
      if (!this._tipEventOut) return;
      const trigger2 = this._getTrigger();
      for (const name of trigger2.split(" ")) if (name === TRIGGER_HOVER || name === TRIGGER_FOCUS) {
        const [, eventOut] = this._getTriggerEvents(name);
        EventHandler.off(tip, eventOut, this._tipEventOut);
      }
      this._tipEventOut = null;
    }
    _isInside(target) {
      return target instanceof Node && (this._element.contains(target) || Boolean(this.tip?.contains(target)));
    }
    _getTrigger() {
      return this._config._trigger;
    }
    _getTriggerEvents(trigger2) {
      return {
        [TRIGGER_HOVER]: [this.constructor.eventName(EVENT_MOUSEENTER2), this.constructor.eventName(EVENT_MOUSELEAVE2)],
        [TRIGGER_FOCUS]: [this.constructor.eventName(EVENT_FOCUSIN), this.constructor.eventName(EVENT_FOCUSOUT)]
      }[trigger2];
    }
    _hasFocusTrigger() {
      return this._getTrigger().split(" ").includes(TRIGGER_FOCUS);
    }
    _setFocusTipListeners(tip) {
      if (!this._hasFocusTrigger()) return;
      EventHandler.on(tip, this.constructor.eventName(EVENT_POINTERDOWN3), () => {
        this._tipPointerDown = true;
        this._activeTrigger[TRIGGER_FOCUS] = true;
      });
      EventHandler.on(tip, this.constructor.eventName(EVENT_FOCUSIN), () => {
        this._activeTrigger[TRIGGER_FOCUS] = true;
      });
      EventHandler.on(tip, this.constructor.eventName(EVENT_FOCUSOUT), (event) => {
        this._activeTrigger[TRIGGER_FOCUS] = this._isInside(event.relatedTarget) || this._tipPointerDown;
        this._leave();
      });
    }
    _setFocusOutsideListener() {
      if (this._outsidePointerHandler || !this._hasFocusTrigger()) return;
      this._tipPointerUpHandler = () => {
        this._tipPointerDown = false;
      };
      this._outsidePointerHandler = (event) => {
        if (!this._isShown() || this._isInside(event.target)) return;
        this._activeTrigger[TRIGGER_FOCUS] = false;
        this.hide();
      };
      const doc = this._element.ownerDocument;
      doc.addEventListener(EVENT_POINTERUP2, this._tipPointerUpHandler, true);
      doc.addEventListener(EVENT_POINTERDOWN3, this._outsidePointerHandler, true);
    }
    _removeFocusOutsideListener() {
      const doc = this._element?.ownerDocument;
      if (this._tipPointerUpHandler && doc) doc.removeEventListener(EVENT_POINTERUP2, this._tipPointerUpHandler, true);
      if (this._outsidePointerHandler && doc) doc.removeEventListener(EVENT_POINTERDOWN3, this._outsidePointerHandler, true);
      this._tipPointerUpHandler = null;
      this._outsidePointerHandler = null;
      this._tipPointerDown = false;
    }
    _setEscapeListener() {
      if (this._keydownHandler) return;
      this._keydownHandler = (event) => {
        if (event.key !== ESCAPE_KEY2 || !this._isShown() || !this.tip.isConnected) return;
        event.preventDefault();
        event.stopPropagation();
        this.hide();
      };
      this._element.ownerDocument.addEventListener(EVENT_KEYDOWN2, this._keydownHandler, true);
    }
    _removeEscapeListener() {
      if (!this._keydownHandler) return;
      this._element.ownerDocument.removeEventListener(EVENT_KEYDOWN2, this._keydownHandler, true);
      this._keydownHandler = null;
    }
    _fixTitle() {
      const title = this._element.getAttribute("title");
      if (!title) return;
      if (!this._element.getAttribute("aria-label") && !this._element.textContent.trim()) this._element.setAttribute("aria-label", title);
      this._element.setAttribute("data-bs-original-title", title);
      this._element.removeAttribute("title");
    }
    _enter() {
      if (this._isShown() || this._isHovered) {
        this._isHovered = true;
        return Promise.resolve();
      }
      this._isHovered = true;
      return this._setTimeout(() => this._isHovered ? this.show() : void 0, this._config.delay.show);
    }
    _leave() {
      if (this._isWithActiveTrigger()) return Promise.resolve();
      this._isHovered = false;
      return this._setTimeout(() => this._isHovered ? void 0 : this.hide(), this._config.delay.hide);
    }
    _setTimeout(handler, timeout) {
      this._clearTimeout();
      return new Promise((resolve) => {
        this._resolveTimeout = resolve;
        this._timeout = setTimeout(() => {
          this._resolveTimeout = null;
          resolve(handler());
        }, timeout);
      });
    }
    _clearTimeout() {
      clearTimeout(this._timeout);
      if (this._resolveTimeout) {
        this._resolveTimeout();
        this._resolveTimeout = null;
      }
    }
    _isWithActiveTrigger() {
      return Object.values(this._activeTrigger).includes(true);
    }
    _getConfig(config) {
      const dataAttributes = Manipulator.getDataAttributes(this._element);
      for (const dataAttribute of Object.keys(dataAttributes)) if (DISALLOWED_ATTRIBUTES.has(dataAttribute)) delete dataAttributes[dataAttribute];
      config = {
        ...dataAttributes,
        ...typeof config === "object" && config ? config : {}
      };
      config = this._mergeConfigObj(config);
      config = this._configAfterMerge(config);
      this._typeCheckConfig(config);
      return config;
    }
    _configAfterMerge(config) {
      config.container = config.container === false ? document.body : getElement(config.container);
      config._trigger = config._trigger || config.trigger;
      if (typeof config.delay === "number") config.delay = {
        show: config.delay,
        hide: config.delay
      };
      if (typeof config.title === "number" || typeof config.title === "boolean") config.title = config.title.toString();
      if (typeof config.content === "number" || typeof config.content === "boolean") config.content = config.content.toString();
      return config;
    }
    _getDelegateConfig() {
      const config = {};
      for (const [key, value] of Object.entries(this._config)) if (this.constructor.Default[key] !== value) config[key] = value;
      config.selector = false;
      config.trigger = "manual";
      return config;
    }
    _disposeFloating() {
      if (this._floatingCleanup) {
        this._floatingCleanup();
        this._floatingCleanup = null;
      }
      if (this.tip) {
        this._removeTipListeners(this.tip);
        EventHandler.off(this.tip, this.constructor.EVENT_KEY);
        this.tip.remove();
        this.tip = null;
      }
    }
  };
  var initTooltip = (event) => {
    const target = event.target.closest(SELECTOR_DATA_TOGGLE6);
    if (!target) return;
    Tooltip.getOrCreateInstance(target);
  };
  EventHandler.on(document, EVENT_FOCUSIN, SELECTOR_DATA_TOGGLE6, initTooltip);
  EventHandler.on(document, EVENT_MOUSEENTER2, SELECTOR_DATA_TOGGLE6, initTooltip);

  // node_modules/bootstrap/js/dist/popover.js
  var NAME12 = "popover";
  var SELECTOR_TITLE = ".popover-header";
  var SELECTOR_CONTENT = ".popover-body";
  var SELECTOR_DATA_TOGGLE7 = '[data-bs-toggle="popover"]';
  var EVENT_CLICK2 = "click";
  var EVENT_FOCUSIN2 = "focusin";
  var EVENT_MOUSEENTER3 = "mouseenter";
  var Default10 = {
    ...Tooltip.Default,
    content: "",
    offset: [0, 8],
    placement: "right",
    template: '<div class="popover" role="tooltip"><div class="popover-arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>',
    trigger: "click"
  };
  var DefaultType10 = {
    ...Tooltip.DefaultType,
    content: "(null|string|element|function)"
  };
  var Popover = class extends Tooltip {
    constructor(element, config) {
      super(element, config);
    }
    static get Default() {
      return Default10;
    }
    static get DefaultType() {
      return DefaultType10;
    }
    static get NAME() {
      return NAME12;
    }
    _isWithContent() {
      return Boolean(this._getTitle() || this._getContent()) || this._hasNewContent();
    }
    _getContentForTemplate() {
      return {
        [SELECTOR_TITLE]: this._getTitle(),
        [SELECTOR_CONTENT]: this._getContent()
      };
    }
    _getContent() {
      return this._resolvePossibleFunction(this._config.content);
    }
  };
  var initPopover = (event) => {
    const target = event.target.closest(SELECTOR_DATA_TOGGLE7);
    if (!target) return;
    if (event.type === "click") event.preventDefault();
    Popover.getOrCreateInstance(target);
  };
  EventHandler.on(document, EVENT_CLICK2, SELECTOR_DATA_TOGGLE7, initPopover);
  EventHandler.on(document, EVENT_FOCUSIN2, SELECTOR_DATA_TOGGLE7, initPopover);
  EventHandler.on(document, EVENT_MOUSEENTER3, SELECTOR_DATA_TOGGLE7, initPopover);

  // node_modules/bootstrap/js/dist/scrollspy.js
  var NAME13 = "scrollspy";
  var EVENT_KEY10 = `.bs.scrollspy`;
  var DATA_API_KEY7 = ".data-api";
  var EVENT_ACTIVATE = `activate${EVENT_KEY10}`;
  var EVENT_CLICK3 = `click${EVENT_KEY10}`;
  var EVENT_SCROLL = `scroll${EVENT_KEY10}`;
  var EVENT_SCROLLEND = `scrollend${EVENT_KEY10}`;
  var EVENT_RESIZE3 = `resize${EVENT_KEY10}`;
  var EVENT_LOAD_DATA_API3 = `load${EVENT_KEY10}${DATA_API_KEY7}`;
  var CLASS_NAME_MENU_ITEM = "menu-item";
  var CLASS_NAME_ACTIVE3 = "active";
  var SELECTOR_DATA_SPY = '[data-bs-spy="scroll"]';
  var SELECTOR_TARGET_LINKS = "[href]";
  var SELECTOR_NAV_LIST_GROUP = ".nav, .list-group";
  var SELECTOR_NAV_LINKS = ".nav-link";
  var SELECTOR_LINK_ITEMS = `${SELECTOR_NAV_LINKS}, .nav-item > ${SELECTOR_NAV_LINKS}, .list-group-item`;
  var SELECTOR_MENU_TOGGLE2 = '[data-bs-toggle="menu"]';
  var SCROLL_IDLE_TIMEOUT = 100;
  var RESIZE_DEBOUNCE = 100;
  var Default11 = {
    rootMargin: null,
    smoothScroll: false,
    target: null,
    threshold: [0],
    topMargin: "12%"
  };
  var DefaultType11 = {
    rootMargin: "(string|null)",
    smoothScroll: "boolean",
    target: "element",
    threshold: "array",
    topMargin: "string"
  };
  var ScrollSpy = class extends BaseComponent {
    constructor(element, config) {
      super(element, config);
      this._sections = [];
      this._linkBySection = /* @__PURE__ */ new Map();
      this._sectionByLink = /* @__PURE__ */ new Map();
      this._intersecting = /* @__PURE__ */ new Set();
      this._activeTarget = null;
      this._lastActive = null;
      this._atBottom = false;
      this._rootElement = getComputedStyle(this._element).overflowY === "visible" ? null : this._element;
      this._observer = null;
      this._sentinel = null;
      this._sentinelObserver = null;
      this._pendingNavigation = null;
      this._settleTimeout = null;
      this._settleHandler = null;
      this._scrollIdleHandler = null;
      this._resizeHandler = null;
      this._resizeTimeout = null;
      this.refresh();
    }
    static get Default() {
      return Default11;
    }
    static get DefaultType() {
      return DefaultType11;
    }
    static get NAME() {
      return NAME13;
    }
    refresh() {
      this._initializeTargetsAndObservables();
      this._maybeEnableSmoothScroll();
      this._observer?.disconnect();
      this._intersecting.clear();
      this._observer = this._getNewObserver();
      for (const section of this._sections) this._observer.observe(section);
      this._setUpSentinel();
      this._maybeAddResizeListener();
    }
    dispose() {
      this._observer?.disconnect();
      this._teardownSentinel();
      this._disarmSettle();
      this._removeResizeListener();
      EventHandler.off(this._config.target, EVENT_CLICK3);
      super.dispose();
    }
    _configAfterMerge(config) {
      config.target = getElement(config.target) || document.body;
      if (typeof config.threshold === "string") config.threshold = config.threshold.split(",").map((value) => Number.parseFloat(value));
      return config;
    }
    _getNewObserver() {
      const options = {
        root: this._rootElement,
        threshold: this._config.threshold,
        rootMargin: this._config.rootMargin ?? this._getDerivedRootMargin()
      };
      return new IntersectionObserver((entries) => this._onIntersect(entries), options);
    }
    _onIntersect(entries) {
      for (const entry of entries) if (entry.isIntersecting) this._intersecting.add(entry.target);
      else this._intersecting.delete(entry.target);
      this._computeActive();
    }
    _computeActive() {
      if (!this._element?.isConnected || this._sections.length === 0) return;
      let active = null;
      if (this._atBottom) active = this._sections.at(-1);
      else {
        for (const section of this._sections) if (this._intersecting.has(section)) active = section;
        active ||= this._lastActive ?? this._sections.at(0);
      }
      if (!active) return;
      this._lastActive = active;
      const link = this._linkBySection.get(active);
      if (link) this._process(link);
    }
    _parseTopMargin() {
      const value = String(this._config.topMargin);
      return {
        value: Number.parseFloat(value) || 0,
        unit: value.endsWith("%") ? "%" : "px"
      };
    }
    _getDerivedRootMargin() {
      const { value, unit } = this._parseTopMargin();
      let percent = value;
      if (unit === "px") {
        const rootHeight = this._rootElement ? this._rootElement.clientHeight : document.documentElement.clientHeight || window.innerHeight;
        percent = rootHeight ? value / rootHeight * 100 : 12;
      }
      return `0px 0px -${Math.min(Math.max(100 - percent, 0), 100)}% 0px`;
    }
    _usesPixelMargin() {
      return !this._config.rootMargin && this._parseTopMargin().unit === "px";
    }
    _setUpSentinel() {
      this._teardownSentinel();
      if (this._sections.length === 0) return;
      const sentinel = document.createElement("div");
      sentinel.setAttribute("aria-hidden", "true");
      sentinel.style.cssText = "position:relative;width:0;height:0;margin:0;padding:0;border:0;visibility:hidden;";
      this._element.append(sentinel);
      this._sentinel = sentinel;
      this._sentinelObserver = new IntersectionObserver((entries) => this._onSentinel(entries), {
        root: this._rootElement,
        threshold: [0]
      });
      this._sentinelObserver.observe(sentinel);
    }
    _onSentinel(entries) {
      const entry = entries.at(-1);
      this._atBottom = Boolean(entry?.isIntersecting) && this._isOverflowing();
      this._computeActive();
    }
    _isOverflowing() {
      const scroller = this._rootElement || document.scrollingElement || document.documentElement;
      return scroller.scrollHeight > scroller.clientHeight;
    }
    _teardownSentinel() {
      this._sentinelObserver?.disconnect();
      this._sentinelObserver = null;
      this._sentinel?.remove();
      this._sentinel = null;
      this._atBottom = false;
    }
    _maybeAddResizeListener() {
      this._removeResizeListener();
      if (!this._usesPixelMargin()) return;
      this._resizeHandler = () => {
        clearTimeout(this._resizeTimeout);
        this._resizeTimeout = setTimeout(() => this._rebuildObserver(), RESIZE_DEBOUNCE);
      };
      EventHandler.on(window, EVENT_RESIZE3, this._resizeHandler);
    }
    _removeResizeListener() {
      clearTimeout(this._resizeTimeout);
      this._resizeTimeout = null;
      if (this._resizeHandler) {
        EventHandler.off(window, EVENT_RESIZE3, this._resizeHandler);
        this._resizeHandler = null;
      }
    }
    _rebuildObserver() {
      if (!this._observer) return;
      this._observer.disconnect();
      this._intersecting.clear();
      this._observer = this._getNewObserver();
      for (const section of this._sections) this._observer.observe(section);
    }
    _maybeEnableSmoothScroll() {
      if (!this._config.smoothScroll) return;
      EventHandler.off(this._config.target, EVENT_CLICK3);
      EventHandler.on(this._config.target, EVENT_CLICK3, SELECTOR_TARGET_LINKS, (event) => {
        const link = event.target.closest(SELECTOR_TARGET_LINKS);
        const section = link && this._sectionByLink.get(link);
        if (!section || !this._element) return;
        event.preventDefault();
        const root = this._rootElement || window;
        const height = section.offsetTop - this._element.offsetTop;
        const currentTop = this._rootElement ? this._rootElement.scrollTop : window.scrollY ?? window.pageYOffset;
        if (matchMedia("(prefers-reduced-motion: reduce)").matches || Math.abs(currentTop - height) <= 2) {
          if (root.scrollTo) root.scrollTo({
            top: height,
            behavior: "auto"
          });
          else root.scrollTop = height;
          this._settleNavigation(link.hash, section);
          return;
        }
        this._pendingNavigation = {
          hash: link.hash,
          section
        };
        this._armSettle();
        if (root.scrollTo) root.scrollTo({
          top: height,
          behavior: "smooth"
        });
        else root.scrollTop = height;
      });
    }
    _armSettle() {
      this._disarmSettle();
      const target = this._getSettleTarget();
      this._settleHandler = () => this._onSettle();
      this._scrollIdleHandler = () => {
        clearTimeout(this._settleTimeout);
        this._settleTimeout = setTimeout(() => this._onSettle(), SCROLL_IDLE_TIMEOUT);
      };
      EventHandler.on(target, EVENT_SCROLLEND, this._settleHandler);
      EventHandler.on(target, EVENT_SCROLL, this._scrollIdleHandler);
    }
    _disarmSettle() {
      clearTimeout(this._settleTimeout);
      this._settleTimeout = null;
      const target = this._getSettleTarget();
      if (this._settleHandler) {
        EventHandler.off(target, EVENT_SCROLLEND, this._settleHandler);
        this._settleHandler = null;
      }
      if (this._scrollIdleHandler) {
        EventHandler.off(target, EVENT_SCROLL, this._scrollIdleHandler);
        this._scrollIdleHandler = null;
      }
    }
    _getSettleTarget() {
      return this._rootElement || document;
    }
    _onSettle() {
      this._disarmSettle();
      if (!this._pendingNavigation) return;
      const { hash, section } = this._pendingNavigation;
      this._settleNavigation(hash, section);
    }
    _settleNavigation(hash, section) {
      this._pendingNavigation = null;
      if (window.history?.replaceState) window.history.replaceState(null, "", hash);
      if (!section.hasAttribute("tabindex")) section.setAttribute("tabindex", "-1");
      section.focus({ preventScroll: true });
    }
    _initializeTargetsAndObservables() {
      this._sections = [];
      this._linkBySection = /* @__PURE__ */ new Map();
      this._sectionByLink = /* @__PURE__ */ new Map();
      const targetLinks = SelectorEngine.find(SELECTOR_TARGET_LINKS, this._config.target);
      const seen = /* @__PURE__ */ new Set();
      for (const anchor of targetLinks) {
        if (!anchor.hash || isDisabled(anchor)) continue;
        const id = decodeFragment(anchor.hash.slice(1));
        if (!id) continue;
        const section = document.getElementById(id);
        if (!section || !this._element.contains(section) || !isVisible(section)) continue;
        this._sectionByLink.set(anchor, section);
        this._linkBySection.set(section, anchor);
        if (!seen.has(section)) {
          seen.add(section);
          this._sections.push(section);
        }
      }
      this._sections.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    }
    _process(target) {
      if (this._activeTarget === target) return;
      this._clearActiveClass(this._config.target);
      this._activeTarget = target;
      target.classList.add(CLASS_NAME_ACTIVE3);
      this._activateParents(target);
      EventHandler.trigger(this._element, EVENT_ACTIVATE, { relatedTarget: target });
    }
    _activateParents(target) {
      if (target.classList.contains(CLASS_NAME_MENU_ITEM)) {
        const menuToggle = target.closest(".menu")?.previousElementSibling;
        if (menuToggle?.matches(SELECTOR_MENU_TOGGLE2)) menuToggle.classList.add(CLASS_NAME_ACTIVE3);
        return;
      }
      for (const listGroup of SelectorEngine.parents(target, SELECTOR_NAV_LIST_GROUP)) for (const item of SelectorEngine.prev(listGroup, SELECTOR_LINK_ITEMS)) item.classList.add(CLASS_NAME_ACTIVE3);
    }
    _clearActiveClass(parent) {
      parent.classList.remove(CLASS_NAME_ACTIVE3);
      const activeNodes = SelectorEngine.find(`${SELECTOR_TARGET_LINKS}.${CLASS_NAME_ACTIVE3}`, parent);
      for (const node of activeNodes) node.classList.remove(CLASS_NAME_ACTIVE3);
    }
  };
  function decodeFragment(hash) {
    try {
      return decodeURIComponent(hash);
    } catch {
      return hash;
    }
  }
  EventHandler.on(window, EVENT_LOAD_DATA_API3, () => {
    for (const spy of SelectorEngine.find(SELECTOR_DATA_SPY)) ScrollSpy.getOrCreateInstance(spy);
  });

  // node_modules/bootstrap/js/dist/tab.js
  var NAME14 = "tab";
  var EVENT_KEY11 = `.bs.tab`;
  var EVENT_HIDE4 = `hide${EVENT_KEY11}`;
  var EVENT_HIDDEN6 = `hidden${EVENT_KEY11}`;
  var EVENT_SHOW5 = `show${EVENT_KEY11}`;
  var EVENT_SHOWN4 = `shown${EVENT_KEY11}`;
  var EVENT_CLICK_DATA_API7 = `click${EVENT_KEY11}`;
  var EVENT_KEYDOWN3 = `keydown${EVENT_KEY11}`;
  var EVENT_LOAD_DATA_API4 = `load${EVENT_KEY11}`;
  var ARROW_LEFT_KEY3 = "ArrowLeft";
  var ARROW_RIGHT_KEY3 = "ArrowRight";
  var ARROW_UP_KEY2 = "ArrowUp";
  var ARROW_DOWN_KEY2 = "ArrowDown";
  var HOME_KEY2 = "Home";
  var END_KEY2 = "End";
  var CLASS_NAME_ACTIVE4 = "active";
  var CLASS_NAME_SHOW6 = "show";
  var SELECTOR_MENU_TOGGLE3 = '[data-bs-toggle="menu"]';
  var SELECTOR_MENU3 = ".menu";
  var NOT_SELECTOR_MENU_TOGGLE = `:not(${SELECTOR_MENU_TOGGLE3})`;
  var SELECTOR_TAB_PANEL = '.list-group, .nav, [role="tablist"]';
  var SELECTOR_OUTER = ".nav-item, .list-group-item";
  var SELECTOR_INNER2 = `.nav-link${NOT_SELECTOR_MENU_TOGGLE}, .list-group-item${NOT_SELECTOR_MENU_TOGGLE}, [role="tab"]${NOT_SELECTOR_MENU_TOGGLE}`;
  var SELECTOR_DATA_TOGGLE8 = '[data-bs-toggle="tab"]';
  var SELECTOR_INNER_ELEM = `${SELECTOR_INNER2}, ${SELECTOR_DATA_TOGGLE8}`;
  var SELECTOR_DATA_TOGGLE_ACTIVE = `.${CLASS_NAME_ACTIVE4}[data-bs-toggle="tab"]`;
  var activationIds = /* @__PURE__ */ new WeakMap();
  var Tab = class Tab2 extends BaseComponent {
    constructor(element) {
      super(element);
      this._parent = this._element.closest(SELECTOR_TAB_PANEL);
      if (!this._parent) throw new TypeError(`${this._element.outerHTML} has no valid parent ${SELECTOR_TAB_PANEL}`);
      this._setInitialAttributes(this._parent, this._getChildren());
      EventHandler.on(this._element, EVENT_KEYDOWN3, (event) => this._keydown(event));
    }
    static get NAME() {
      return NAME14;
    }
    async show() {
      const innerElem = this._element;
      if (this._elemIsActive(innerElem)) return;
      const active = this._getActiveElem();
      const hideEvent = active ? EventHandler.trigger(active, EVENT_HIDE4, { relatedTarget: innerElem }) : null;
      if (EventHandler.trigger(innerElem, EVENT_SHOW5, { relatedTarget: active }).defaultPrevented || hideEvent && hideEvent.defaultPrevented) return;
      const activationId = (activationIds.get(this._parent) || 0) + 1;
      activationIds.set(this._parent, activationId);
      this._deactivate(active, innerElem);
      await this._activate(innerElem, active, activationId);
    }
    async _activate(element, relatedElem, activationId) {
      if (!element) return;
      element.classList.add(CLASS_NAME_ACTIVE4);
      if (element.getAttribute("role") !== "tab") {
        element.classList.add(CLASS_NAME_SHOW6);
        return;
      }
      const pane = SelectorEngine.getElementFromSelector(element);
      this._activate(pane);
      const complete = () => {
        if (activationId !== activationIds.get(this._parent) || !this._elemIsActive(element)) return;
        element.removeAttribute("tabindex");
        setAriaAttribute(element, "aria-selected", true);
        this._toggleMenu(element, true);
        EventHandler.trigger(element, EVENT_SHOWN4, { relatedTarget: relatedElem });
      };
      await this._queueCallback(complete, pane ?? element, getTransitionDurationFromElement(pane) > 0);
    }
    async _deactivate(element, relatedElem) {
      if (!element) return;
      element.classList.remove(CLASS_NAME_ACTIVE4);
      element.blur();
      if (element.getAttribute("role") !== "tab") {
        element.classList.remove(CLASS_NAME_SHOW6);
        return;
      }
      this._deactivate(SelectorEngine.getElementFromSelector(element));
      const complete = () => {
        setAriaAttribute(element, "aria-selected", false);
        element.setAttribute("tabindex", "-1");
        this._toggleMenu(element, false);
        EventHandler.trigger(element, EVENT_HIDDEN6, { relatedTarget: relatedElem });
      };
      await this._queueCallback(complete, element, false);
    }
    _keydown(event) {
      if (![
        ARROW_LEFT_KEY3,
        ARROW_RIGHT_KEY3,
        ARROW_UP_KEY2,
        ARROW_DOWN_KEY2,
        HOME_KEY2,
        END_KEY2
      ].includes(event.key)) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      event.stopPropagation();
      event.preventDefault();
      const children = this._getChildren().filter((element) => !isDisabled(element));
      let nextActiveElement;
      if ([HOME_KEY2, END_KEY2].includes(event.key)) nextActiveElement = event.key === HOME_KEY2 ? children[0] : children.at(-1);
      else {
        const isNext = [ARROW_RIGHT_KEY3, ARROW_DOWN_KEY2].includes(event.key);
        nextActiveElement = getNextActiveElement(children, event.target, isNext, true);
      }
      if (nextActiveElement) {
        nextActiveElement.focus({ preventScroll: true });
        Tab2.getOrCreateInstance(nextActiveElement).show();
      }
    }
    _getChildren() {
      return SelectorEngine.find(SELECTOR_INNER_ELEM, this._parent);
    }
    _getActiveElem() {
      return this._getChildren().find((child) => this._elemIsActive(child)) || null;
    }
    _setInitialAttributes(parent, children) {
      this._setAttributeIfNotExists(parent, "role", "tablist");
      for (const child of children) this._setInitialAttributesOnChild(child);
    }
    _setInitialAttributesOnChild(child) {
      child = this._getInnerElement(child);
      const isActive = this._elemIsActive(child);
      const outerElem = this._getOuterElement(child);
      setAriaAttribute(child, "aria-selected", isActive);
      if (outerElem !== child) this._setAttributeIfNotExists(outerElem, "role", "presentation");
      if (!isActive) child.setAttribute("tabindex", "-1");
      this._setAttributeIfNotExists(child, "role", "tab");
      this._setInitialAttributesOnTargetPanel(child);
    }
    _setInitialAttributesOnTargetPanel(child) {
      const target = SelectorEngine.getElementFromSelector(child);
      if (!target) return;
      this._setAttributeIfNotExists(target, "role", "tabpanel");
      if (child.id) this._setAttributeIfNotExists(target, "aria-labelledby", `${child.id}`);
    }
    _toggleMenu(element, open) {
      const outerElem = this._getOuterElement(element);
      const menuToggle = SelectorEngine.findOne(SELECTOR_MENU_TOGGLE3, outerElem);
      if (!menuToggle) return;
      const menu = SelectorEngine.findOne(SELECTOR_MENU3, outerElem);
      menuToggle.classList.toggle(CLASS_NAME_ACTIVE4, open);
      if (menu) menu.classList.toggle(CLASS_NAME_SHOW6, open);
      setAriaAttribute(menuToggle, "aria-expanded", open);
    }
    _setAttributeIfNotExists(element, attribute, value) {
      if (!element.hasAttribute(attribute)) element.setAttribute(attribute, value);
    }
    _elemIsActive(elem) {
      return elem.classList.contains(CLASS_NAME_ACTIVE4);
    }
    _getInnerElement(elem) {
      return elem.matches(SELECTOR_INNER_ELEM) ? elem : SelectorEngine.findOne(SELECTOR_INNER_ELEM, elem);
    }
    _getOuterElement(elem) {
      return elem.closest(SELECTOR_OUTER) || elem;
    }
  };
  EventHandler.on(document, EVENT_CLICK_DATA_API7, SELECTOR_DATA_TOGGLE8, function(event) {
    if (["A", "AREA"].includes(this.tagName)) event.preventDefault();
    if (isDisabled(this)) return;
    Tab.getOrCreateInstance(this).show();
  });
  EventHandler.on(window, EVENT_LOAD_DATA_API4, () => {
    for (const element of SelectorEngine.find(SELECTOR_DATA_TOGGLE_ACTIVE)) Tab.getOrCreateInstance(element);
  });

  // node_modules/bootstrap/js/dist/toast.js
  var NAME15 = "toast";
  var EVENT_KEY12 = `.bs.toast`;
  var EVENT_MOUSEOVER = `mouseover${EVENT_KEY12}`;
  var EVENT_MOUSEOUT = `mouseout${EVENT_KEY12}`;
  var EVENT_FOCUSIN3 = `focusin${EVENT_KEY12}`;
  var EVENT_FOCUSOUT2 = `focusout${EVENT_KEY12}`;
  var EVENT_HIDE5 = `hide${EVENT_KEY12}`;
  var EVENT_HIDDEN7 = `hidden${EVENT_KEY12}`;
  var EVENT_SHOW6 = `show${EVENT_KEY12}`;
  var EVENT_SHOWN5 = `shown${EVENT_KEY12}`;
  var CLASS_NAME_INSTANT2 = "toast-instant";
  var CLASS_NAME_SHOW7 = "show";
  var DefaultType12 = {
    autohide: "boolean",
    delay: "number"
  };
  var Default12 = {
    autohide: true,
    delay: 5e3
  };
  var Toast = class extends BaseComponent {
    constructor(element, config) {
      super(element, config);
      this._timeout = null;
      this._hasMouseInteraction = false;
      this._hasKeyboardInteraction = false;
      this._setListeners();
    }
    static get Default() {
      return Default12;
    }
    static get DefaultType() {
      return DefaultType12;
    }
    static get NAME() {
      return NAME15;
    }
    async show() {
      if (EventHandler.trigger(this._element, EVENT_SHOW6).defaultPrevented) return;
      this._clearTimeout();
      const complete = () => {
        EventHandler.trigger(this._element, EVENT_SHOWN5);
        this._maybeScheduleHide();
      };
      this._element.classList.add(CLASS_NAME_SHOW7);
      await this._queueCallback(complete, this._element, this._isAnimated());
    }
    async hide() {
      if (!this.isShown()) return;
      if (EventHandler.trigger(this._element, EVENT_HIDE5).defaultPrevented) return;
      const complete = () => {
        EventHandler.trigger(this._element, EVENT_HIDDEN7);
      };
      this._element.classList.remove(CLASS_NAME_SHOW7);
      await this._queueCallback(complete, this._element, this._isAnimated());
    }
    dispose() {
      this._clearTimeout();
      if (this.isShown()) this._element.classList.remove(CLASS_NAME_SHOW7);
      super.dispose();
    }
    isShown() {
      return this._element.classList.contains(CLASS_NAME_SHOW7);
    }
    _isAnimated() {
      return !this._element.classList.contains(CLASS_NAME_INSTANT2);
    }
    _maybeScheduleHide() {
      if (!this._config.autohide) return;
      if (this._hasMouseInteraction || this._hasKeyboardInteraction) return;
      this._timeout = setTimeout(() => {
        this.hide();
      }, this._config.delay);
    }
    _onInteraction(event, isInteracting) {
      switch (event.type) {
        case "mouseover":
        case "mouseout":
          this._hasMouseInteraction = isInteracting;
          break;
        case "focusin":
        case "focusout":
          this._hasKeyboardInteraction = isInteracting;
          break;
        default:
          break;
      }
      if (isInteracting) {
        this._clearTimeout();
        return;
      }
      const nextElement = event.relatedTarget;
      if (this._element === nextElement || this._element.contains(nextElement)) return;
      this._maybeScheduleHide();
    }
    _setListeners() {
      EventHandler.on(this._element, EVENT_MOUSEOVER, (event) => this._onInteraction(event, true));
      EventHandler.on(this._element, EVENT_MOUSEOUT, (event) => this._onInteraction(event, false));
      EventHandler.on(this._element, EVENT_FOCUSIN3, (event) => this._onInteraction(event, true));
      EventHandler.on(this._element, EVENT_FOCUSOUT2, (event) => this._onInteraction(event, false));
    }
    _clearTimeout() {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
  };
  enableDismissTrigger(Toast);
})();
/*! Bundled license information:

bootstrap/js/dist/dom/data.js:
  (*!
  * Bootstrap data.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/dom/event-handler.js:
  (*!
  * Bootstrap event-handler.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/dom/manipulator.js:
  (*!
  * Bootstrap manipulator.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/util/index.js:
  (*!
  * Bootstrap index.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/util/config.js:
  (*!
  * Bootstrap config.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/base-component.js:
  (*!
  * Bootstrap base-component.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/dom/selector-engine.js:
  (*!
  * Bootstrap selector-engine.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/util/component-functions.js:
  (*!
  * Bootstrap component-functions.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/alert.js:
  (*!
  * Bootstrap alert.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/button.js:
  (*!
  * Bootstrap button.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/carousel.js:
  (*!
  * Bootstrap carousel.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/collapse.js:
  (*!
  * Bootstrap collapse.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/util/floating-ui.js:
  (*!
  * Bootstrap floating-ui.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/menu.js:
  (*!
  * Bootstrap menu.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/util/sanitizer.js:
  (*!
  * Bootstrap sanitizer.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/nav-overflow.js:
  (*!
  * Bootstrap nav-overflow.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/dialog-base.js:
  (*!
  * Bootstrap dialog-base.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/util/swipe.js:
  (*!
  * Bootstrap swipe.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/drawer.js:
  (*!
  * Bootstrap drawer.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/dialog.js:
  (*!
  * Bootstrap dialog.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/util/template-factory.js:
  (*!
  * Bootstrap template-factory.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/tooltip.js:
  (*!
  * Bootstrap tooltip.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/popover.js:
  (*!
  * Bootstrap popover.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/scrollspy.js:
  (*!
  * Bootstrap scrollspy.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/tab.js:
  (*!
  * Bootstrap tab.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)

bootstrap/js/dist/toast.js:
  (*!
  * Bootstrap toast.js v6.0.0-alpha.1 (https://getbootstrap.com/)
  * Copyright 2011-2026 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  *)
*/
//# sourceMappingURL=main.script.js.map
