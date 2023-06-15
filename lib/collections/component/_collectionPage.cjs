const { tick } = require("svelte");
const { standardizeValue } = require('../../../lib/utilities/_standardizeValue.cjs');
const { chunkArray } = require('../../../lib/utilities/_chunkArray.cjs');
const { escapeHTML } = require('../../../lib/utilities/_escapeHTML.cjs');
const { isHTML } = require('../../../lib/utilities/_isHTML.cjs');

const convertTime = function (date) {
    let today = new Date();
    if (typeof date != 'undefined') {
        today = new Date(date);
    }
    today = today.getTime();
    return today;
}

// const updatePageStyles = async (styles, selector_id = 'collections_styles') => {
//     const promise = new Promise(window.requestAnimationFrame);
//     return promise.then(() => {
//         const tag = document.querySelector(`[data-id="${selector_id}"]`);
//         if (tag) tag.remove();
//         if (!styles) {
//             return true;
//         }
//         // apply updated style tag
//         const head = document.head || document.getElementsByTagName('head')[0];
//         head.insertAdjacentHTML('beforeend', `<style data-id="${selector_id}">${styles}</style>`);
//     });
// };

//This makes a map of the current tag for filters with dates
//that maps to the label tag with the date string
//all the products are tagged with each version of the date
//string for the filters with dates, this maps the filter tag
//to the specific version with the dates
//like available_by_fc--valentines_day
//available_by_fc--valentines_day123123412341234
//This has the ability to remove empty date filters but is not used at this time
const makeDateTagMap = function (filtersDates, filters, deleteEmpty = false) {
    let dateTagMap = {}
    let today = convertTime();
    for (const tag in filtersDates) {
        if (
            filtersDates[tag].parentEndDate != 0 &&
            filtersDates[tag].parentEndDate <= today
        ) {
            if (typeof filters != 'undefined' && deleteEmpty) {
                let parts = tag.split('--');
                let attribute_code = parts[0];
                delete filters[attribute_code];
            }
            continue;
        }
        let mappedTag = ''
        filtersDates[tag].values.forEach((val) => {
            if (val.date <= today) {
                mappedTag = val.option
            }
        });
        if (mappedTag.length > 0) {
            dateTagMap[mappedTag] = tag;
        } else {
            //if nothing matches, just get rid of the filter
            let parts = tag.split('--');
            let attribute_code = parts[0]
            let option = parts[1];
            if (
                typeof filters != 'undefined' &&
                typeof filters[attribute_code] != 'undefined' &&
                deleteEmpty
            ) {
                if (typeof filters[attribute_code].options[option] != 'undefined') {
                    delete filters[attribute_code].options[option]
                }
                if (Object.keys(filters[attribute_code].options).length == 0) {
                    delete filters[attribute_code];
                }
            }
        }
    }
    return { dateTagMap, filters }
}

/**
 * Sort anything with local compare, provide a key if it's an object
 * @param {*} a 
 * @param {*} b 
 * @param {*} sortType 
 * @returns 
 */
const productsSortFunc = (a, b, sortType = null) => {
    let aVal, bVal;
    if (sortType == null) {
        aVal = typeof a == 'string' ? a : a.toString();
        bVal = typeof b == 'string' ? b : b.toString();
    } else {
        aVal = typeof a[sortType] == 'string' ? a[sortType] : a[sortType].toString();
        bVal = typeof b[sortType] == 'string' ? b[sortType] : b[sortType].toString();
    }
    return aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
};

/////////page logic
//take a request or array of requests -- scroll, filter update, page update, sort, page count
//parse the request by type and ...args
//combine all requests
//update filters and paging
//update the dom -- either styles and/or product sort
//update the paging 
//this function takes in the update variable function from the page or route file itself
//to update separate parts of the global variable
async function filterProductsFunc(fil, opt, globalFCVar) {
    let updates = fil
    if (!Array.isArray(fil)) {
        updates = [[fil, opt]]
    }
    let updatesRegistered = []
    let filters = globalFCVar('filters');
    let page = 0;
    let activeFilterGroups = [];
    let activeFilterGroupsImages = [];

    let sort = null;

    updates.forEach((update) => {
        const [filter, option] = update;
        switch (filter) {
            case 'expand':
                updatesRegistered.push('expand');
                let filtersExpanded = globalFCVar('filtersExpanded');
                if (option == 'clear') {
                    filtersExpanded = [];
                } else {
                    let resolvedOpt = option;
                    //clear everything except for the current
                    //used on tf on desk
                    if (option.indexOf('clear&') != -1) {
                        resolvedOpt = resolvedOpt.replace('clear&', '');
                        if (filtersExpanded.indexOf(resolvedOpt) != -1) {
                            filtersExpanded = [];
                        } else {
                            filtersExpanded = [resolvedOpt];
                        }
                    } else {
                        let indx = filtersExpanded.indexOf(resolvedOpt)
                        if (indx != -1) {
                            filtersExpanded.splice(indx, 1);
                        } else {
                            filtersExpanded.push(resolvedOpt);
                        }
                    }
                }
                globalFCVar('filtersExpanded', filtersExpanded);
                break;
            case 'page':
                updatesRegistered.push('page')
                page = parseInt(option);
                break;
            case 'clear':
                updatesRegistered.push('filters');
                for (const fil in filters) {
                    filters[fil].active = [];
                }
                globalFCVar('allActiveFilters', []);
                globalFCVar('allActiveFiltersVisual', [])
                break;
            case 'limit':
                updatesRegistered.push('limit')
                let paging = globalFCVar('paging');
                if (!isNaN(option)) {
                    paging.perPage = parseInt(option);
                    globalFCVar('paging', paging);
                }
            case 'sort':
                if (filter == 'sort') {
                    updatesRegistered.push('sort');
                    sort = option;
                }
            //note no break after sort so that activeFilterGroups are generated
            default:
                activeFilterGroups = [];
                let tempAllActiveFilters = [];
                let tempAllActiveFiltersVisual = [];
                updatesRegistered.push('filters');
                if (typeof filters[filter] != 'undefined') {
                    if (option == 'clear') {
                        filters[filter].active = [];
                    } else if (filter == 'filter_pricerange_fc') {
                        updatesRegistered.push('filter_pricerange_fc');
                        let collectionPriceRange = globalFCVar('collectionPriceRange');
                        let priceTags = [];
                        let parts = option.split('__');
                        let min = collectionPriceRange.min;
                        let max = collectionPriceRange.max;
                        if (parts.length == 2) {
                            parts = parts.map((p) => {
                                return parseInt(p)
                            })
                            min = parseInt(parts[0]);
                            max = parseInt(parts[1]);
                            if (!isNaN(min)) {
                                min = Math.floor(min * 100) / 100;
                            } else {
                                min = collectionPriceRange.min;
                            }
                            if (!isNaN(max)) {
                                max = Math.ceil(max * 100) / 100;
                            } else {
                                max = collectionPriceRange.max;
                            }
                            if (min == collectionPriceRange.min && max == collectionPriceRange.max) {
                                //let the filter be empty
                            } else {
                                priceTags.push(`${min}`);
                                while (min + 100 < max) {
                                    min += 100;
                                    priceTags.push(`${min}`);
                                }
                            }
                        }
                        if (priceTags.length > 0) {
                            const val = parseInt(priceTags[0])
                            collectionPriceRange.currentMin = parseInt(priceTags[0]);
                        }
                        if (priceTags.length > 1) {
                            collectionPriceRange.currentMax = parseInt(priceTags[priceTags.length - 1]);
                        }
                        globalFCVar('collectionPriceRange', collectionPriceRange);
                        filters[filter].active = priceTags;
                    } else if (typeof filters[filter].options[option] != 'undefined') {
                        const indx = filters[filter].active.indexOf(option)
                        if (indx != -1) {
                            filters[filter].active.splice(indx, 1);
                        } else {
                            if (filters[filter].type == 'single') {
                                filters[filter].active = [option];
                            } else {
                                filters[filter].active.push(option);
                                filters[filter].active = filters[filter].active;
                            }
                        }
                    }
                }
                let visualFilters = globalFCVar('visualFilters');
                for (const fil in filters) {
                    if (filters[fil].active.length) {
                        activeFilterGroups.push(filters[fil].active.map((option) => `${fil}--${option}`))
                        tempAllActiveFilters = tempAllActiveFilters.concat(filters[fil].active.map((option) => `${fil}--${option}`));
                        if (visualFilters.indexOf(fil) != -1) {
                            tempAllActiveFiltersVisual = tempAllActiveFiltersVisual.concat(filters[fil].active.map((option) => `${fil}--${option}`));
                        }
                    }
                    filters[fil].active = filters[fil].active;
                }
                globalFCVar('allActiveFilters', tempAllActiveFilters);
                globalFCVar('allActiveFiltersVisual', tempAllActiveFiltersVisual);
                break;
        }
    })

    if (updatesRegistered.indexOf('sort') != -1) {
        sortProducts(sort);
    }

    if (
        updatesRegistered.indexOf('sort') != -1 ||
        updatesRegistered.indexOf('page') != -1
    ) {
        let allActiveFilters = globalFCVar('allActiveFilters');
        const hiddenChangeVal = 'px--' + Date.now();
        //this paging change is hidden
        //to trigger the product components to re-render
        //when this filter runs, it only has one
        //the extra px-- filters that build up from paging
        //are deleted in updateProduct in _product.js
        allActiveFilters.push(hiddenChangeVal);
        globalFCVar('allActiveFilters', allActiveFilters);
    }

    if (
        updatesRegistered.indexOf('filters') != -1 ||
        updatesRegistered.indexOf('sort') != -1 ||
        updatesRegistered.indexOf('limit') != -1
    ) {
        let filteredProducts = [];
        let filtersCountTmp = {};
        let dateTagMap = {};

        let filtersDates = globalFCVar('filtersDates');
        const dateTagResult = makeDateTagMap(filtersDates);
        ({ dateTagMap } = dateTagResult);
        let products = globalFCVar('products');
        [...products].forEach((p, indx, arr) => {
            let parentFiltersCounted = [];
            let match = true;
            activeFilterGroups.forEach((ag) => {
                if (!match) {
                    return;
                }
                if (!p.tags.some(function (c) {
                    let curr = c;
                    if (typeof dateTagMap[c] != 'undefined') {
                        curr = dateTagMap[c];
                    }
                    let test = ag.indexOf(curr) != -1;
                    return test
                })) {
                    match = false;
                }
            })
            if (match) {
                filteredProducts.push(indx);
                p.tags.forEach((c) => {
                    let curr = c;
                    if (typeof dateTagMap[c] != 'undefined') {
                        curr = dateTagMap[c];
                    }
                    if (typeof filtersCountTmp[curr] == 'undefined') {
                        filtersCountTmp[curr] = 1;
                    } else {
                        filtersCountTmp[curr]++;
                    }
                    //get the count on the parent filters too
                    let prefix = curr.split('--')[0];
                    if (parentFiltersCounted.indexOf(prefix) == -1) {
                        parentFiltersCounted.push(prefix);
                        if (typeof filtersCountTmp[prefix] == 'undefined') {
                            filtersCountTmp[prefix] = 1;
                        } else {
                            filtersCountTmp[prefix]++;
                        }
                    }
                })

            }
        });

        globalFCVar('visibleProducts', filteredProducts);
        globalFCVar('filtersCount', filtersCountTmp);
        // let selectorGroupImg = '';
        // activeFilterGroupsImages.forEach( (group) => {
        //     if (group.length > 0){
        //         selectorGroupImg += `:is(.${group.join(',.')})`
        //     }
        // })
        // styles += `.prod-img:not(${selectorGroupImg})`;
        // styles += `{opacity:0;pointer-events:none;} `;
        // styles = styles + styles.replaceAll(':is',':-webkit-any');
        // console.log('styles', styles)
        // await updatePageStyles(styles);
        globalFCVar('filters', filters);
    }
    if (
        updatesRegistered.indexOf('filters') != -1 ||
        updatesRegistered.indexOf('limit') != -1 ||
        updatesRegistered.indexOf('page') != -1 ||
        updatesRegistered.indexOf('sort') != -1
    ) {
        let visibleProducts = globalFCVar('visibleProducts');
        let paging = globalFCVar('paging');
        let productPages = chunkArray(visibleProducts, paging.perPage);
        globalFCVar('productPages', productPages);
        updatePaging();
        let scroll = false;
        if (updatesRegistered.indexOf('page') != -1) {
            scroll = true;
        }
        goToPage(page, scroll);
        updateParamstring();
    }



    if (updatesRegistered.indexOf('filters') != -1) {
        updateScene();
    }

    togglePriceRangeSliders(fil, opt);




    //////////////////////////////
    ////functions
    //////////////////////////

    /**
     * Save the old paramstring and create a new one from the filters
     */
    function updateParamstring() {
        const paging = globalFCVar('paging');
        const paramstring__prev = globalFCVar('paramstring');
        globalFCVar('paramstring__prev', paramstring__prev);
        let paramstring = '';
        let allActiveFilters = globalFCVar('allActiveFilters');
        let activeFils = {};
        let rangeFils = {};
        let rangeFilters = ['filter_pricerange_fc']
        allActiveFilters.forEach((fil) => {
            let parts = fil.split('--');
            if (parts.length == 2) {
                if (rangeFilters.indexOf(parts[0]) != -1) {
                    if (typeof rangeFils[parts[0]] == 'undefined') {
                        rangeFils[parts[0]] = [];
                    }
                    rangeFils[parts[0]].push(parts[1])
                } else {
                    if (typeof activeFils[parts[0]] == 'undefined') {
                        activeFils[parts[0]] = [];
                    }
                    activeFils[parts[0]].push(parts[1])
                }
            }
        });
        for (const fil in rangeFils) {
            if (paramstring.length > 0) {
                paramstring += '&';
            }
            rangeFils[fil].sort((aVal, bVal) => {
                return aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
            });
            let val = ''
            if (rangeFils[fil].length) {
                val = rangeFils[fil][0];
                if (rangeFils[fil].length > 1) {
                    val += `__${rangeFils[fil][rangeFils[fil].length - 1]}`;
                }
            }
            paramstring += `${standardizeValue(fil)}=${val}`;
        }
        for (const fil in activeFils) {
            if (fil == 'px') {
                continue;
            }
            if (paramstring.length > 0) {
                paramstring += '&';
            }
            paramstring += `${standardizeValue(fil)}=${activeFils[fil].map((o) => standardizeValue(o)).join(',')}`;
        }
        paramstring = paramstring.replace(/\_/g, '-');
        if (paging.currentPage != 0) {
            if (paramstring.length > 0) {
                paramstring += '&';
            }
            paramstring += `page=${paging.currentPage + 1}`;
        }
        if ([24, 26].indexOf(paging.perPage) == -1) {
            if (paramstring.length > 0) {
                paramstring += '&';
            }
            paramstring += `limit=${paging.perPage}`;
        }
        if (paging.sort != 'position') {
            if (paramstring.length > 0) {
                paramstring += '&';
            }
            paramstring += `sort=${paging.sort}`;
        }

        globalFCVar('paramstring', paramstring);
        return paramstring;
    }

    function goToPage(page, scroll = false) {
        let paging = globalFCVar('paging')
        const test = paging.currentPage != page && page <= paging.totalPages - 1;
        if (test) {
            paging.currentPage = page;
            paging.visiblePages = [page];
            globalFCVar('paging', paging);
        }
        if (typeof document != 'undefined') {
            tick().then(() => {
                //scroll the pager
                const pagebtn = `.page-li--${page}-js`;
                const pagebtnEl = document.querySelector(pagebtn);

                if (pagebtnEl) {

                    const pagerWrap = pagebtnEl.closest('.mousedrag');
                    if (pagerWrap) {
                        // pagerWrap.scrollLeft = pagebtnEl.offsetLeft + (pagerWrap.offsetWidth / 2) + (pagebtnEl.offsetWidth / 2);
                        pagerWrap.scrollLeft = pagebtnEl.offsetLeft - pagerWrap.offsetLeft - (pagerWrap.offsetWidth / 2) + (pagebtnEl.offsetWidth / 2);
                    }
                    // pagebtnEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                }
                if (scroll && test) {
                    // const selector = `.products--${page}-js`;
                    if (typeof document != 'undefined') {
                        // const el = document.querySelector(selector);
                        const wrap = document.querySelector('.products-wrap-js');
                        // if (el && wrap) {
                        if (wrap) {
                            // wrap.scrollTop = el.offsetTop - wrap.offsetTop;
                            document.documentElement.scrollTop = wrap.offsetTop;
                        }
                    }

                }
            });
        }
    }

    function sortProducts(sort) {
        let paging = globalFCVar('paging');
        if (paging.sortOptions.indexOf(sort) != -1) {
            let products = globalFCVar('products');
            switch (sort) {
                case 'price':
                    products = [...products].sort((a, b) => { return productsSortFunc(a, b, 'price') });
                    break;
                case 'position':
                    products = [...products].sort((a, b) => { return productsSortFunc(a, b, 'position') });
                    break;
                case 'name':
                    products = [...products].sort((a, b) => { return productsSortFunc(a, b, 'name') });
                    break;
            }
            globalFCVar('products', products);
            paging.sort = sort;
            globalFCVar('paging', paging);
        }
    }


    function updatePaging() {
        let paging = globalFCVar('paging');
        let visibleProducts = globalFCVar('visibleProducts');
        paging.count = visibleProducts.length;
        paging.totalPages = visibleProducts.length ? Math.ceil(visibleProducts.length / paging.perPage) : 1;
        paging.pages = Array(paging.totalPages);
        paging = globalFCVar('paging', paging);
        return paging;
    }

    function getScene(scenes, allActiveFilters) {
        let scene = scenes[0]
        if (allActiveFilters.length > 0 && scenes.length > 1) {
            let tmpScenes = [...scenes]
            tmpScenes.sort((a, b) => {
                let matches = {
                    a: 0,
                    b: 0
                }
                if (!Array.isArray(a.tags)) {
                    a.tags = [];
                }
                if (!Array.isArray(b.tags)) {
                    b.tags = [];
                }
                [a.tags, b.tags].forEach((viewTags, indx) => {
                    let x = 'a';
                    if (indx == 1) {
                        x = 'b';
                    }
                    allActiveFilters.forEach((tag) => {
                        if (viewTags.indexOf(tag) != -1) {
                            matches[x] += 2;
                        }
                    });
                    viewTags.forEach((tag) => {
                        if (allActiveFilters.indexOf(tag) == -1) {
                            matches[x] -= 3;
                        }
                    })
                })
                if (a.position > b.position) {
                    matches.a++
                }
                if (b.position > a.position) {
                    matches.b++
                }
                return matches.b - matches.a;
            })
            scene = tmpScenes[0];
            //backfill empty scene parts from the default scene which is the first one
            for (const part in scenes[0].data) {
                if (typeof scene.data[part] == 'undefined' || scene.data[part] == null) {
                    scene.data[part] = scenes[0].data[part];
                }
            }
        }
        return scene.originalIndex
    }

    function updateScene() {
        const allActiveFilters = globalFCVar('allActiveFilters');
        const scenes = globalFCVar('scenes');
        const scene = getScene(scenes, allActiveFilters);
        globalFCVar('scene', scene);
    }
}

//split the url string into parsed parameters for the filter
const processUrlParams = function (params) {
    let finalParams = [];
    params = decodeURIComponent(params);
    params.split('&').map((p) => {
        let param = p.toLowerCase().split('=');
        if (param.length == 2) {
            let fil = param[0].replace(/\-/g, '_');
            let options = param[1].split(',');

            options.forEach((opt) => {
                opt = opt.replace(/\-/g, '_');
                if (fil == 'page') {
                    opt = parseInt(opt);
                    opt = opt - 1;
                    if (opt < 1) {
                        return;
                    }
                    opt = opt.toString();
                }
                finalParams.push([fil, opt]);
            })
        }
    })
    return finalParams;
}


const togglePriceRangeSliders = function (fil, opt = null) {
    if (typeof window == undefined) {
        return;
    }
    if (!Array.isArray(fil)) {
        fil = [[fil, opt]];
    }
    fil.forEach((fArr) => {
        let fill = fArr[0];
        let optt = fArr[1];
        //if it's a global clear, reset the price slider
        if (fill == 'clear') {
            fill = 'filter_pricerange_fc';
            optt = 'clear'
        }
        if (fill == 'filter_pricerange_fc' && typeof document != 'undefined') {
            const input = document.querySelector('.multi-range-slider input:first-of-type')
            const input2 = document.querySelector('.multi-range-slider input:last-of-type')
            if (input && input2) {
                const rangeMin = input.getAttribute('min');
                const rangeMax = input2.getAttribute('max');
                const currentVal = parseInt(input.value);
                const currentVal2 = parseInt(input2.value);
                let inputVal = parseInt(rangeMin);
                let input2Val = parseInt(rangeMax);
                if (optt != 'clear' && optt) {
                    const optParts = optt.split('__');
                    if (optParts && optParts.length == 2) {
                        inputVal = parseInt(optParts[0]);
                        input2Val = parseInt(optParts[1]);
                    }
                }
                if (inputVal != currentVal) {
                    input.value = inputVal;
                    input.setAttribute('toggleonly', true);
                    input.dispatchEvent(new Event('input', { bubbles: false }));

                }
                if (input2Val != currentVal2) {
                    input2.setAttribute('toggleonly', true);
                    input2.value = input2Val;
                    input2.dispatchEvent(new Event('input', { bubbles: false }));
                }
            }
        }
    });
}

const sendTealiumEvent = (eventType, fcGlobal) => {
    let siteName = '';
    if (fcGlobal.siteId === 'tf') {
        siteName = '1215diamonds';
    } else if (fcGlobal.siteId === 'dn') {
        siteName = 'diamondnexus';
    }
    let browse_refine_type = [];
    let browse_refine_value = [];
    let plp_product_ids = [];
    let product_position = [];

    if (fcGlobal.productPages.length > 0) {
        let visiblePages = fcGlobal.paging.visiblePages.map((p) => {
            return fcGlobal.productPages[p];
        });
        visiblePages.forEach((productPage) => {
            productPage.forEach((productIndex) => {
                const prod = fcGlobal.products[productIndex];
                if (prod.__typename != 'MockProduct') {
                    plp_product_ids.push(prod.id.toString());
                }
            })

        });
    }
    // if there are products with ids
    // map a new array of positions based on their place in plp_product_ids array
    // this assumes the position in plp_product_ids correlates with position on screen
    // ie. plp_product_ids = ["135063", "262622"] / product_position = [1, 2]
    if (plp_product_ids.length) {
        product_position = plp_product_ids.map((_, ind) => ind + 1);
    }
    let activeFilters = [];
    Object.keys(fcGlobal['filters']).forEach((filter) => {
        Object.entries(fcGlobal['filters'][filter].options).forEach((opt) => {
            let option = opt[0];
            let label = opt[1];
            if (fcGlobal['filters'][filter].active.indexOf(option) != -1) {
                activeFilters.push({
                    attribute_code: filter,
                    label,
                })
            }
        });
    })

    for (let i = 0; i < activeFilters.length; i++) {
        browse_refine_type.push(activeFilters[i].attribute_code);
        //legacy --- would have to modify code to do this this is the number value like 2338
        //browse_refine_value.push(activeFilters[i].value)
        //this is the label value like Solitaire
        browse_refine_value.push(activeFilters[i].label);
    }

    const data = {
        tealium_event: 'category',
        site_section: 'catalog',
        browse_refine_type: browse_refine_type,
        browse_refine_value: browse_refine_value,
        category_id: fcGlobal.categoryId ? fcGlobal.categoryId : '',
        plp_product_ids: plp_product_ids,
        product_position: product_position,
        category_name: fcGlobal.magentoCategoryName ? fcGlobal.magentoCategoryName : '',
        page_name: fcGlobal.seoTitle ? fcGlobal.seoTitle : '',
        site_name: [siteName, fcGlobal.subdomain ? fcGlobal.subdomain : ''],
    }

    //note this is defined in the hooks file and loaded globally on the page
    FcSendTag(
        {
            data,
            callback: '',
        },
        eventType,
    );
};

const loadMorePrev = function (globalFCVar) {
    let paging = globalFCVar('paging');
    let newPageIndx = paging.visiblePages[0] - 1;
    if (newPageIndx > -1) {
        paging.visiblePages = [newPageIndx, ...paging.visiblePages];
        paging.currentPage = newPageIndx;
        globalFCVar('paging', paging);
        //this would jump the scroll to it's previous position
        //but instead we'll comment this out and just show the added products
        // if (typeof window != 'undefined') {
        //     tick().then(() => {
        //         let newEl = document.querySelector(`.products--${newPageIndx}`);
        //         let scroller = document.querySelector(`.products-wrap`);
        //         if (newEl && scroller) {
        //             scroller.scrollTop = scroller.scrollTop + newEl.offsetHeight;
        //         }
        //     });
        // }
    }
    newPageIndx = paging.visiblePages[0] - 1;
    if (newPageIndx < 0) {
        globalFCVar('loadMorePrev', false);
    }
}

const loadMoreNext = function (globalFCVar) {
    let paging = globalFCVar('paging');
    if (
        paging.totalPages &&
        paging.totalPages > 1 &&
        paging.totalPages - 1 > paging.visiblePages[paging.visiblePages.length - 1]
    ) {
        const newPageIndx = paging.visiblePages[paging.visiblePages.length - 1] + 1;
        paging.visiblePages = [...paging.visiblePages, newPageIndx];
        paging.currentPage = newPageIndx;
        globalFCVar('paging', paging);
    }
    globalFCVar('loadMoreNext', false);
}

module.exports = {
    filterProductsFunc,
    convertTime,
    escapeHTML,
    isHTML,
    loadMoreNext,
    loadMorePrev,
    makeDateTagMap,
    productsSortFunc,
    processUrlParams,
    sendTealiumEvent,
    togglePriceRangeSliders,
    // updatePageStyles,
};
