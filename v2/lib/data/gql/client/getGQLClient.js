const EleventyFetch = require("@11ty/eleventy-fetch");
const { settings: systemSettings } = require('../../../../src/_data/settings.js');
/**
 * 
 * @param {*} s string 
 * @returns unique hash string for tagging the cached queries with a #hash
 */
const hashCode = function (s) {
    let h;
    for (let i = 0; i < s.length; i++)
        h = Math.imul(31, h) + s.charCodeAt(i) | 0;

    return h;
}

/**
 * 
 * @param {dn|tf|fa} siteId 
 * @returns header value for Store which is required by magento for any store
 * except the default
 */
const getStore = (siteId) => {
    let store = 'default';
    switch (siteId) {
        case 'dn':
            store = 'default';
            break;
        case 'tf':
            store = 'www_1215diamonds_com';
            break;
        case 'fa':
            store = 'www_foreverartisans_com';
            break;
    }
    return store;
}


/**
 * @param {*} settings 
 * @returns client with client.query method
 */
//may want to cache manually
//https://www.11ty.dev/docs/plugins/fetch/#manually-store-your-own-data-in-the-cache
const getClient = (settings = {
    source: 'magento',
}) => {
    let client;
    let baseUrl = ''
    settings = {
        ...systemSettings,
        requestType: 'POST',
        source: 'magento',
        ...settings
    }
    settings.store = getStore(settings.siteId);
   
    if (!!settings.source && !!settings[settings.source + 'Url']) {
        baseUrl = settings[settings.source + 'Url'];
    }
    
    let headers = {}
    if (!!settings.htauthPassword && !!settings.htauthUsername) {
        headers['Authorization'] = 'Basic ' + Buffer.from(settings.htauthUsername + ":" + settings.htauthPassword).toString('base64');
    }
    if (settings.source == 'magento' && !!settings.store) {
        headers['Store'] = settings.store;
    }

    if (settings.requestType == 'GET') {
        client = {
            browser: false,
            source: settings.source,
            query: async (query, vars) => {
                let params = {
                    query: query,
                    variables: JSON.stringify(vars),
                };
                let q = Object.keys(params)
                    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
                    .join('&');

                let url = baseUrl + '?' + q;
                let res = await EleventyFetch(url, {
                    duration: settings.duration,
                    type: "json",
                    verbose: false,
                    fetchOptions: {
                        headers,
                    }
                });
                return res;
            }
        }
    } else {
        client = {
            browser: false,
            source: settings.source,
            query: async (query, vars) => {
                let params = {
                    query: query,
                    variables: JSON.stringify(vars),
                };
                let q = Object.keys(params)
                    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
                    .join('&');

                let hash = hashCode(q)
                let url = baseUrl + '#' + hash;
                headers['Content-Type'] = 'application/json';
                console.log('magento query ' + hash);
                let res = await EleventyFetch(url, {
                    duration: settings.duration,
                    type: "json",
                    verbose: false,
                    fetchOptions: {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            query: query,
                            variables: vars ?? {},
                        }),
                    }
                });
                if (res?.errors?.length) {
                    console.log('query', query, 'vars', vars, 'res', res);
                }
                return res;
            }
        }
    }
    if (typeof client == 'undefined' || !client) {
        console.log('gql client NOT defined !! in getGQLClient.cjs');
    }
    return client
    
    //     //clientside
    //     client = {
    //         browser: true,
    //         source: settings.source,
    //         query: async (query, vars) => {
    //             let params = {
    //                 query: query,
    //                 variables: JSON.stringify(vars),
    //             };
    //             let q = Object.keys(params)
    //                 .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    //                 .join('&');
    //             let url = baseUrl //+ '?' + q;
    //             headers['Accept'] = 'application/json';
    //             let res = await fetch(url, {
    //                 method: 'POST',
    //                 headers,
    //                 body: JSON.stringify({
    //                     query: query,
    //                     variables: vars ?? {},
    //                 }),
    //             });
    //             res = await res.json();
    //             return res;
    //         }
    //     }
    
}

/** 
* @param {*} query 
* @param {*} vars 
* @param {*} source 
* @param {*} config 
* @returns 
*/
const graphqlQuery = async function (query, vars = {}, source = 'magento', config = { keepDataLevel: false }) {

    const settings = {
        source,
        ...config
    }

    let client = getClient(settings);
    let result = {};
    let q = query;
    try {
        result = await client.query(q, vars);
    } catch (err) {
        console.log(
            'GRAPHQL QUERY ERROR in _graphql_query.js',
            '\n',
            'query string: \n' + query,
            '\n',
            'query vars: \n' + JSON.stringify(vars, null, 4),
            '\n',
            'query error:',
            '\n',
            JSON.stringify(err, null, 4),
            err,
        );
        result = {}
    }

    let content_string = JSON.stringify(result?.data ?? '');

    //this fixes quotes ' coming out of the db incorrectly
    content_string = content_string.replace(/â€™/g, "'");

    try {
        content_string = JSON.parse(content_string);
    } catch (err) {
        console.log('error trying to JSON parse content string from ajax request', err);
    }

    if (typeof content_string.data != 'undefined') {
        content_string = content_string.data;
    }

    //legacy ajaxProductLoader kept the data level on the object
    if (typeof config != 'undefined' && config && typeof config.keepDataLevel != 'undefined' && config.keepDataLevel) {
        result = {
            data: content_string
        };
    } else {
        result = content_string;
    }
    return result;
};

const wpPagingQuery = async function (pageType, pagedQuery, firstQuery, config = {}) {
    let perPage = 20;
    if (firstQuery == null) {
        firstQuery = `query ${pageType}Total {
        ${pageType}(first:1) {
          pageInfo {
            total
          }
        }
      }`;
    }

    console.log('config', config);
    let pageData = await graphqlQuery(firstQuery, {}, 'wordpress', config);
    let total = 0;

    if (
        pageData != undefined &&
        pageData[pageType] != undefined &&
        pageData[pageType].pageInfo != undefined &&
        pageData[pageType].pageInfo.total != undefined
    ) {
        total = pageData[pageType].pageInfo.total;
    }

    let promiseArr = [];
    let totalPages = Math.ceil(total / perPage);
    let vars = {
        offset: 0,
        size: perPage,
    };
    for (let i = 0; i < totalPages; i++) {
        let offset = i * perPage;
        vars.offset = offset;
        let partialQuery = graphqlQuery(pagedQuery, vars, 'wordpress', config);
        promiseArr.push(partialQuery);
    }

    let results = await Promise.allSettled(promiseArr);
    let final = []
    for (let i = 0; i < results.length; i++) {
        if (results[i].status != 'fulfilled') {
            let vars = {
                offset: indx,
                size: perPage,
            };
            let newRes = await graphqlQuery(pagedQuery, vars, 'wordpress', config);
            if (newRes.status != 'fulfilled') {
                final.push(newRes.value)
            } else {
                console.log('Error, missing categories!', vars);
            }
        } else {
            final.push(results[i].value)
        }
    };
    return final;
};

const combineWPQueries = function (pageType, resolvedQueryResults) {
    console.log('resolvedQueryResults', resolvedQueryResults);
    let final;
    let pt = pageType;
    // console.log('pageType', pageType);
    // console.log('resolvedQueryResults', resolvedQueryResults);
    for (let i = 0; i < resolvedQueryResults.length; i++) {
        let curr = resolvedQueryResults[i];
        // console.log('curr', curr);
        // make sure curr is not null, undefined, etc..
        // make curr pt nodes are not null undefined, not empty array as well

        if (
            typeof curr !== 'undefined' &&
            curr !== null &&
            typeof curr[pt] !== 'undefined' &&
            curr[pt] !== null &&
            typeof curr[pt].nodes !== 'undefined' &&
            curr[pt].nodes !== null &&
            curr[pt].nodes.length > 0
        ) {
            if (final == null) {
                final = curr;
            } else {
                final[pt].nodes = final[pt].nodes.concat(curr[pt].nodes);
            }
        } else {
            // something went wrong, log it
            console.log('combineWPQueries failed for some reason');
            console.log('curr', JSON.stringify(curr, null, 4));
            console.log('final', JSON.stringify(final, null, 4));
        }
    }
    return final;
};


module.exports = {
    getClient,
    graphqlQuery,
    getStore,
    wpPagingQuery,
    combineWPQueries
}