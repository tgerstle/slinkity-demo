const historyPushState = async function (state, title, url) {
  //return new Promise((resolve) => {
  if (typeof history != 'undefined') {
    history.pushState(state, null, url);
  }
  //resolve('resolved');
  // });
};
const historyReplaceState = async function (state, title, url) {
  //return new Promise((resolve) => {
  if (typeof history != 'undefined') {
    history.replaceState(state, null, url);
  }
  //resolve('resolved');
  // });
};

/*
set redirect to true to redirect the page
set pathOnly to true to sniff the domain from the current url
goto(url, { redirect: true, pathOnly: true})
*/
const gotoUpdate = async function (url, options) {
  let state = null;
  if (typeof options != 'undefined' && options.redirect === true) {
    if (options.pathOnly != undefined && options.pathOnly === true) {
      let fullUrl = location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '') + url;
      window.location.href = fullUrl;
    } else {
      window.location.href = url;
    }
  } else {
    if (typeof options != 'undefined' && typeof options.state != 'undefined') {
      state = options.state;
    }
    let hps;
    if (typeof options != 'undefined' && typeof options.replaceState != 'undefined' && options.replaceState) {
      hps = historyReplaceState(state, null, url);
    } else {
      hps = historyPushState(state, null, url);
    }
    return hps;
  }
};

const goto = async function goto(url, options) {
  let timeout = 0;
  if (typeof options != 'undefined' && options.timeout != undefined && !isNaN(options.timeout)) {
    timeout = options.timeout;
  }
  if (timeout > 0) {
    setTimeout(() => {
      let hps = gotoUpdate(url, options);
      return hps;
    }, timeout);
  } else {
    let hps = gotoUpdate(url, options);
    return hps;
  }
};

module.exports = { goto, historyPushState };
