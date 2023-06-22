const { convertTime, makeDateTagMap, productsSortFunc, isHTML, escapeHTML } = require('../component/_collectionPage.js');
const { altAttCodes, tagTranslations, tagPrefixes, getImages } = require('../component/_imgTagOptions.js');
const { standardizeValue } = require('../../utilities/_standardizeValue.js');
const { stripString } = require('../../utilities/_stripString.js');
const { decodeEntities } = require('../../utilities/_decodeEntities.js');


///////////////////////////////////////////////////////////////////

/////////////
//Data Processing Functions
////
function processWpFilters({ availablebyFilters = [], discountFilters = [] } = {}) {
    let injectedFilters = [];
    let today = convertTime();
    [...availablebyFilters, ...discountFilters].forEach((fil) => {
        let processedFil = {
            attribute_code: fil.attribute_code,
            label: fil.label,
            options: [],
            priority: fil.priority,
        }
        fil.options.forEach((opt) => {
            let baseAc = fil.attribute_code
            let ac = baseAc;

            if (typeof fil.alt_attribute_code != 'undefined') {
                ac = fil.alt_attribute_code;
                if (ac == 'lead_time') {
                    ac = 'filter_ship_fc';
                }
            }

            opt.parentEndDate = convertTime(opt.parentEndDate);
            if (opt.parentEndDate != 0 && opt.parentEndDate <= today) {
                //This filter has expired;
                return;
            }

            opt.valueArr.forEach((v) => {
                //v.value //array
                //v.date //'2022/12/30 00:00:00 CST'
                v.date = convertTime(v.date);
                let processedOpt = {
                    label: `${opt.label}`,
                    date: v.date,
                    parentEndDate: opt.parentEndDate,
                    test: (product) => {
                        let vals = v.value.map((val) => {
                            let tag = `${ac}--${val}`
                            return tag;
                        });
                        if (product.tags.some((tag) => {
                            const test = vals.indexOf(tag) != -1
                            return test
                        })) {
                            return true;
                        }
                        return false;
                    }
                }
                processedFil.options.push(processedOpt)
            })
        });
        injectedFilters.push(processedFil);
    });
    return injectedFilters;
}


function injectFilters({ filters = {}, products = [], filtersCount = {}, siteId = 'dn', injectedFilters = [] } = {}) {
    //auto generated options read array values off of a product
    //then add a filter option if it doesn't exist then delete the
    //values off the product
    //for example filter_ship_fc reads an array of labels off of the product
    //product['filter_ship_fc'] = ['7 Day', '12 Day']

    //TODO take injected shipping and discount filters in
    //process the discount percentage (shipping already done)
    //create the custom filters
    //then make a way to check the time and update the filter options

    let customFilters = [];
    customFilters = customFilters.concat([
        {
            attribute_code: 'filter_ship_fc',
            label: 'Shipping Status',
            autoGenerateOptions: true,
            options: [],
        },
    ]);

    if (siteId == 'tf') {
        customFilters.push({
            attribute_code: 'filter_pricerange_fc',
            label: 'Price Range',
            autoGenerateOptions: true,
            options: [],
        });
    }
    customFilters = customFilters.concat(injectedFilters);

    let filtersDates = {}
    let newFilters = {}
    let newFiltersCount = {}

    if (siteId == 'dn') {
        customFilters.push(
            {
                attribute_code: 'filter_price_fc',
                label: 'Price',
                options: [
                    {
                        label: 'Under $100',
                        test: (product) => {
                            if (product.priceRange.minimum_price.final_price.value < 100) {
                                return true;
                            }
                            return false;
                        }
                    },
                    {
                        label: '$100 - $250',
                        test: (product) => {
                            if (
                                product.priceRange.minimum_price.final_price.value >= 100 &&
                                product.priceRange.minimum_price.final_price.value <= 250
                            ) {
                                return true;
                            }
                            return false;
                        }
                    },
                    {
                        label: '$250 - $500',
                        test: (product) => {
                            if (
                                product.priceRange.minimum_price.final_price.value >= 250 &&
                                product.priceRange.minimum_price.final_price.value <= 500
                            ) {
                                return true;
                            }
                            return false;
                        }
                    },
                    {
                        label: '$500 - $750',
                        test: (product) => {
                            if (
                                product.priceRange.minimum_price.final_price.value >= 500 &&
                                product.priceRange.minimum_price.final_price.value <= 750
                            ) {
                                return true;
                            }
                            return false;
                        }
                    },
                    {
                        label: '$750 - $1000',
                        test: (product) => {
                            if (
                                product.priceRange.minimum_price.final_price.value >= 750 &&
                                product.priceRange.minimum_price.final_price.value <= 1000
                            ) {
                                return true;
                            }
                            return false;
                        }
                    },
                    {
                        label: '$1000 - $1500',
                        test: (product) => {
                            if (
                                product.priceRange.minimum_price.final_price.value >= 1000 &&
                                product.priceRange.minimum_price.final_price.value <= 1500
                            ) {
                                return true;
                            }
                            return false;
                        }
                    },
                    {
                        label: '$1500 - $2000',
                        test: (product) => {
                            if (
                                product.priceRange.minimum_price.final_price.value >= 1500 &&
                                product.priceRange.minimum_price.final_price.value <= 2000
                            ) {
                                return true;
                            }
                            return false;
                        }
                    },
                    {
                        label: 'Over $2000',
                        test: (product) => {
                            if (
                                product.priceRange.minimum_price.final_price.value >= 2000
                            ) {
                                return true;
                            }
                            return false;
                        }
                    }
                ]
            }
        )
    }

    //add a base zero count for each attribute code and option
    //to the filters count
    customFilters.forEach((cust) => {
        newFiltersCount[cust.attribute_code] = 0;
        cust.options.forEach((opt) => {
            let shortTag = `${standardizeValue(opt.label)}`;
            let fullTag = `${cust.attribute_code}--${shortTag}`;
            let fullTagDate;
            if (typeof opt.date != 'undefined') {
                fullTagDate = fullTag + opt.date;
                if (typeof filtersDates[fullTag] == 'undefined') {
                    filtersDates[fullTag] = {
                        parentEndDate: opt.parentEndDate,
                        values: []
                    }
                }
                filtersDates[fullTag].values.push({
                    option: fullTagDate,
                    date: opt.date
                })
            }
            //the date tags have the same labels, but unique tags with the date on them
            //the products are tagged with the unique tags then the options
            //are combined into the same label
            //then on the collections page, the date is checked and the unique
            //tag is used to filter when the regular label tag is fed in
            //like filter_available_by--valentines_day turns into
            //filter_available_by--valentines_day12312335241314
            opt.tag = fullTagDate ?? fullTag;
            newFiltersCount[opt.tag] = 0;
        })
    })

    //date tags map general filters to the specific tag that the
    //date resolves to
    const { dateTagMap } = makeDateTagMap(filtersDates);

    //populate the counts and tags on the products for the injected filters
    products.forEach((product) => {
        customFilters.forEach((cust) => {
            // let parentFilterCounted = false;
            // if (typeof newFiltersCount[cust.attribute_code] == 'undefined') {
            //     newFiltersCount[cust.attribute_code] = 0;
            // }
            //auto generated looks for matching tags on a product
            //and adds an option if one doesn't exist, used on filter_ship_fc
            if (
                typeof cust.autoGenerateOptions != 'undefined' &&
                cust.autoGenerateOptions &&
                typeof product[cust.attribute_code] != 'undefined' &&
                Array.isArray(product[cust.attribute_code])
            ) {
                let values = product[cust.attribute_code];
                values.forEach((val) => {
                    let matched = false;
                    const tag = `${cust.attribute_code}--${standardizeValue(val)}`;
                    cust.options.forEach((opt) => {
                        if (opt.label == val) {
                            matched = true;
                        }
                        if (matched) {
                            return;
                        }
                    });
                    if (!matched) {
                        const opt = {
                            label: val,
                            tag: tag,
                            // test: (product) => {
                            //   const test = product[cust.attribute_code].indexOf(val) != -1;
                            //   return test;
                            // }
                        }
                        cust.options.push(opt);
                    }
                    product.tags.push(tag);
                    // let curr = tag;
                    // if (typeof dateTagMap[curr] != 'undefined') {
                    //     curr = dateTagMap[curr];
                    // }
                    // if (typeof newFiltersCount[curr] == 'undefined') {
                    //     newFiltersCount[curr] = 0;
                    // }
                    // newFiltersCount[curr]++;
                    // if (!parentFilterCounted) {
                    //     newFiltersCount[cust.attribute_code]++;
                    //     parentFilterCounted = true;
                    // }
                });

                if (typeof product[cust.attribute_code] != 'undefined') {
                    delete product[cust.attribute_code];
                }
            } else {
                cust.options.forEach((opt) => {
                    const test = opt.test(product);
                    if (test) {
                        product.tags.push(opt.tag);
                        // let curr = opt.tag;
                        // if (typeof dateTagMap[opt.tag] != 'undefined') {
                        //     curr = dateTagMap[opt.tag];
                        // }
                        // if (typeof newFiltersCount[curr] == 'undefined') {
                        //     newFiltersCount[curr] = 0;
                        // }
                        // newFiltersCount[curr]++;
                        // if (!parentFilterCounted) {
                        //     newFiltersCount[cust.attribute_code]++;
                        //     parentFilterCounted = true;
                        // }
                    }
                });
            }
        });
        let parentFiltersCounted = [];
        product.tags.forEach((c) => {
            let curr = c;
            if (typeof dateTagMap[c] != 'undefined') {
                curr = dateTagMap[c];
            }
            if (typeof newFiltersCount[curr] == 'undefined') {
                newFiltersCount[curr] = 1;
            } else {
                newFiltersCount[curr]++;
            }
            //get the count on the parent filters too
            let prefix = curr.split('--')[0];
            if (parentFiltersCounted.indexOf(prefix) == -1) {
                parentFiltersCounted.push(prefix);
                if (typeof newFiltersCount[prefix] == 'undefined') {
                    newFiltersCount[prefix] = 1;
                } else {
                    newFiltersCount[prefix]++;
                }
            }
        });
        if (typeof product.filter_pricerange_fc != 'undefined') {
            delete product.filter_pricerange_fc;
        }
    });

    customFilters.forEach((cust) => {
        newFilters[cust.attribute_code] = {
            label: cust.label,
            options: {},
            type: cust.type ?? 'multiple',
            active: [],
            priority: cust.priority ?? null
        }
        cust.options.forEach((opt) => {
            let shortTag = `${standardizeValue(opt.label)}`;
            newFilters[cust.attribute_code].options[shortTag] = opt.label
            delete opt.test;
        })
    })

    //add the newFilters to the filters
    for (const fil in newFilters) {
        filters[fil] = newFilters[fil];
    }
    //add the newFiltersCount to the filtersCount
    //so that there are counts on pageload
    for (const fil in newFiltersCount) {
        filtersCount[fil] = newFiltersCount[fil];
    }
    /**
     * Filters like
     {
       "filter_metal": {
          "label": "Metal Type",
          "options": {
              "14k_white_gold": "14k White Gold",
              "14k_yellow_gold": "14k Yellow Gold",
              "14k_rose_gold": "14k Rose Gold",
              "10k_white_gold": "10k White Gold",
              "10k_yellow_gold": "10k Yellow Gold",
              "platinum": "Platinum"
          },
          "type": "single",
          "active": []
      },
     }
     */
    const collectionPriceRange = {
        min: 0,
        max: 10000,
        currentMin: 0,
        currentMax: 10000,
    }
    Object.keys(filters).forEach((fil) => {
        let curr = filters[fil];
        if (curr.label == 'Price Range') {
            let keys = Object.keys(curr.options);
            if (keys.length > 0) {
                collectionPriceRange.min = parseInt(keys[0]);
                collectionPriceRange.max = parseInt(keys[keys.length - 1]);
                collectionPriceRange.currentMin = collectionPriceRange.min;
                collectionPriceRange.currentMax = collectionPriceRange.max;
            }
        }
    });

    return { filters, products, filtersCount, filtersDates, collectionPriceRange }
}

function createFiltersFromAggregations(aggregations, { filterableCategories = [], filterableCategoriesHidden = [], ignoreFilters = [] } = {}) {

    let filtersVisuallyHidden = {
        'filter_ship_fc': {
            options: {}
        },
        'filter_pricerange_fc': {
            options: {}
        }
    };

    const filters = {};
    const filtersCount = {};
    const optionValueMap = {};
    const filterDefs = { 'filter_metal': { 'type': 'single' }, 'filter_stone_type': { 'type': 'single' } };
    ignoreFilters = ignoreFilters.concat([
        'ags_000',
        'as_grown',
        'band_width',
        'carat_weight_bucket',
        'carat_weight_configurable',
        'carbon_neutral',
        'certified_stone',
        'certified_sustainable',
        'color',
        'cut_type',
        'fc_product_type',
        'filter_price',
        'gemstone',
        'grown_in_usa',
        'hearts_and_arrows',
        'made_in_usa',
        'manufacturer',
        'metal_type',
        'next_day_ship',
        'on_sale',
        'online_bucket',
        'price',
        'ring_size',
        'stone_type',
        'visible_in_admin_ordering'
    ]);

    //skip category_id filter if none are flagged to show
    if (filterableCategories.length == 0) {
        ignoreFilters.push('category_id');
    }

    aggregations.forEach((ag) => {
        //the magento 2.4.5 upgrade switches category_id to category_uid
        if (ag.attribute_code == 'category_uid') {
            ag.attribute_code = 'category_id';
        }
        const ac = ag.attribute_code
        if (ignoreFilters.indexOf(ac) != -1) {
            return;
        }
        const type = filterDefs[ac]?.type ?? 'multiple'
        filters[ac] = {
            label: ag.label,
            options: {},
            type: type,
            active: []
        }

        //note ag.count is the number of options not the product count
        //bc magento 2 sucks
        filtersCount[ac] = 0;

        ag.options.forEach((opt, indx, arr) => {
            let skip = false;
            if (ac == 'category_id') {
                if (filterableCategories.indexOf(opt.value.toString()) == -1) {
                    skip = true;
                    delete arr[indx];
                } else if (filterableCategoriesHidden.indexOf(opt.value.toString()) != -1) {
                    if (typeof filtersVisuallyHidden['category_id'] == 'undefined') {
                        filtersVisuallyHidden['category_id'] = {
                            options: {}
                        }
                    }
                    const labelStandardized = standardizeValue(opt.label);
                    filtersVisuallyHidden['category_id'].options[labelStandardized] = opt.label;
                }
            }
            if (!skip) {
                const labelStandardized = standardizeValue(opt.label);
                filters[ac].options[labelStandardized] = opt.label;
                optionValueMap[opt.value] = {
                    label: opt.label,
                    labelStandardized
                };
                const filterKey = `${ac}--${labelStandardized}`
                // filtersCount[filterKey] = opt.count;
                //we do initial counting in the injected filters
                //then anytime filterProducts is run
                filtersCount[filterKey] = 0;
            }
        });
        //filter out empty
        ag.options = ag.options.filter((n) => n);
    });

    return { filters, optionValueMap, filtersCount, filtersVisuallyHidden }
    // let filters = {
    //   metal: {
    //     label: 'Metal',
    //     options: {
    //       'silver': 'Silver',
    //       'white-gold': 'White Gold',
    //       'rose-gold': 'Rose Gold',
    //     },
    //     type: 'single',
    //     active: []
    //   },
    //   style: {
    //     label: 'Styling',
    //     options: {
    //       'funky': 'Funky',
    //       'fresh': 'Fresh'
    //     },
    //     type: 'multiple',
    //     active: []
    //   },
    //   price: {
    //     label: 'Price',
    //     options: {
    //       '0-100': '0 - 100',
    //       '101-200': '101 - 200',
    //       '200': '200+'
    //     },
    //     type: 'multiple',
    //     active: []
    //   },
    //   category: {
    //     label: 'Category',
    //     options: {
    //       'category-a': 'category a',
    //       'category-b': 'category b',
    //       'category-c': 'category c'
    //     },
    //     type: 'single',
    //     active: []
    //   }
    // }
}

function createProductsFromMagProducts(magentoProducts = [], filters = null, optionValueMap = {}) {
    let products = [];

    magentoProducts.forEach((p, i, arr) => {

        let tags = []
        let images = []
        if (
            typeof p.media_gallery != 'undefined' &&
            p.media_gallery != null &&
            p.media_gallery.length
        ) {
            //remove matching
            // p.media_gallery = p.media_gallery.filter((img) => {
            //   if (typeof img.label != 'undefined' && img.label) {
            //     let test = img.label.indexOf('matching-type') != -1;
            //     return !test;
            //   }
            //   return true;
            // })
            p.media_gallery.sort((a, b) => a.position - b.position)
            p.media_gallery.forEach((img, indx, arr) => {
                // img.url = img.image_url + img.image_path;

                let label = img.label ?? '';
                label = label.replace(/metal--/g, 'filter-metal--');

                let tags = []
                if (
                    typeof img.tags != 'undefined' &&
                    img.tags != null
                ) {
                    if (Array.isArray(img.tags)) {
                        tags = tags.concat(img.tags)
                    } else {
                        label += `,${tags}`
                    }
                }
                let labelTags = label.split(',').map((t) => t.trim());

                tags = tags.concat(labelTags);
                tags.forEach((t, indx, arr) => {
                    if (t.indexOf('--') != -1) {
                        const option = t.slice(t.indexOf('--') + 2);
                        const prefix = standardizeValue(t.slice(0, t.indexOf('--')));
                        if (typeof tagPrefixes[prefix] != 'undefined') {
                            tags[indx] = `${standardizeValue(prefix)}--${standardizeValue(option)}`;
                        }
                    } else {
                        t = standardizeValue(t);
                        if (typeof tagTranslations[t] != 'undefined') {
                            tags[indx] = tagTranslations[t];
                        } else {
                            tags[indx] = t;
                        }
                    }
                    img.url = (img.image_url + img.image_path);
                })
                //only unique
                tags = tags.filter((value, index, self) => {
                    return self.indexOf(value) === index;
                });
                //remove empty
                tags = tags.filter(n => n)
                arr[indx].tags = tags;
                arr[indx].originalIndex = indx;
            });

            images = p.media_gallery;
        }

        if (typeof filters != 'undefined' && filters) {
            for (const filter in filters) {
                let productFilterValues = [];
                if (filter == 'category_id') {
                    if (
                        typeof p.categories != 'undefined' &&
                        p.categories != null &&
                        p.categories.length > 0
                    ) {
                        p.categories.forEach((c) => {
                            const cString = c.id.toString();
                            //only keepable categories have a value in the value map
                            if (typeof optionValueMap[cString] != 'undefined') {
                                productFilterValues.push(cString);
                            }
                        })
                    }

                } else if (typeof p[filter] != 'undefined' && p[filter] != null) {
                    if (Array.isArray(p[filter])) {
                        //could be like [ '3643, Nexus Diamond Alternative', '3644, Moissanite' ]
                        p[filter].forEach((opt) => {
                            let split = opt.split(',').map(v => v.trim())
                            if (split.length > 1) {
                                productFilterValues.push(split[1]);
                            } else {
                                if (split[0].length > 0) {
                                    productFilterValues.push(split[0]);
                                }
                            }
                        });
                    } else {
                        //could be like 3576
                        productFilterValues.push(p[filter])
                    }
                };
                productFilterValues.forEach((v) => {
                    if (typeof optionValueMap[v] != 'undefined') {
                        const filterKey = `${filter}--${optionValueMap[v].labelStandardized}`;
                        tags.push(filterKey);
                    } else if (typeof v != 'undefined' && v.length > 0) {
                        //if it's not a value and just a string
                        const filterKey = `${filter}--${standardizeValue(v)}`;
                        tags.push(filterKey);
                    }
                })
            }
        }


        let showRangePrice = false;
        let showRangePriceText = '';
        if (typeof p.configurable_options == 'undefined') {
            p.configurable_options = [];
        }
        p.configurable_options.forEach((options, indx, arr) => {
            options.__typename = 'configurable_option_fc';

            if (options.attribute_code == 'carat_weight_configurable') {
                showRangePrice = true;
                showRangePriceText = 'More Carat Weights Available';
            }

            let hasAlt = false;
            arr[indx].altAttCode = '';
            if (typeof altAttCodes[options.attribute_code] != 'undefined') {
                hasAlt = true;
                arr[indx].altAttCode = altAttCodes[options.attribute_code]
            }
            options.values.forEach((opt, indx2, arr2) => {
                arr2[indx2].valTag = standardizeValue(opt.label);
                arr2[indx2].tags = [`${options.attribute_code}--${standardizeValue(opt.label)}`]
                if (hasAlt) {
                    arr2[indx2].tags.push(`${options.altAttCode}--${standardizeValue(opt.label)}`)
                }
            })

            //add custom sort orders here
            //options on the top go from top down
            //options on the bottom go from the bottom up
            const sortArrs = {
                'metal_type': {
                    top: ['18k_white_gold', '14k_white_gold', '18k_yellow_gold', '14k_yellow_gold', '14k_rose_gold', '10k_white_gold', '10k_yellow_gold'].reverse(),
                    bottom: ['platinum'].reverse()
                },
                'stone_type': {
                    top: ['lab_grown_diamond', 'moissanite', 'nexus_diamond_alternative'].reverse(),
                    bottom: [].reverse()
                }
            }
            if (typeof sortArrs[options.attribute_code] != 'undefined') {
                options.values.sort((a, b) => {
                    let scores = {
                        a: 0,
                        b: 0,
                    };
                    let labels = {
                        a: standardizeValue(a.label),
                        b: standardizeValue(b.label)
                    };
                    ['a', 'b'].forEach((x) => {
                        const label = labels[x];
                        if (sortArrs[options.attribute_code].top.indexOf(label) != -1) {
                            scores[x] += sortArrs[options.attribute_code].top.indexOf(label)
                        }
                        if (sortArrs[options.attribute_code].bottom.indexOf(label) != -1) {
                            scores[x] -= sortArrs[options.attribute_code].bottom.indexOf(label)
                        }
                    });
                    return scores.b - scores.a
                });
            } else if (options.attribute_code === 'carat_weight_configurable') {
                //deal with full text fractions like 1 1/2
                options.values.sort(function (a, b) {
                    let aVal = 0;
                    let aLabel = a.label.replace(' tcw', '').split(' ');
                    for (let i = 0; i < aLabel.length; i++) {
                        if (aLabel[i].indexOf('/') != -1) {
                            aLabel[i] = aLabel[i].split('/');
                            aVal += parseFloat(aLabel[i][0] / aLabel[i][1]);
                        } else {
                            aVal += parseInt(aLabel[i]);
                        }
                    }
                    let bVal = 0;
                    let bLabel = b.label.replace(' tcw', '').split(' ');
                    for (let i = 0; i < bLabel.length; i++) {
                        if (bLabel[i].indexOf('/') != -1) {
                            bLabel[i] = bLabel[i].split('/');
                            bVal += parseFloat(bLabel[i][0] / bLabel[i][1]);
                        } else {
                            bVal += parseInt(bLabel[i]);
                        }
                    }
                    return aVal - bVal;
                });
            } else if (options.attribute_code === 'gemstone') {
                const fractionMap = {
                    '¼': '0.25',
                    '½': '0.5',
                    '¾': '0.75',
                    '⅐': '0.1429',
                    '⅑': '0.1111',
                    '⅒': '0.1',
                    '⅓': '0.333',
                    '⅔': '0.666',
                    '⅕': '0.2',
                    '⅖': '0.4',
                    '⅗': '0.6',
                    '⅘': '0.8',
                    '⅙': '0.167',
                    '⅚': '0.833',
                    '⅛': '0.125',
                    '⅜': '0.375',
                    '⅝': '0.625',
                    '⅞': '0.875',
                };
                options.values.sort(function (a, b) {
                    let aLabel = a.label;
                    let bLabel = b.label;
                    [aLabel, bLabel].forEach((val, indx) => {
                        for (const fract in fractionMap) {
                            const re = new RegExp(fract, 'i');
                            val = val.replace(re, fractionMap[fract]);
                        }
                        val = val.split(' ');
                        val = val.reduce((accumulator, currentValue) => {
                            if (!isNaN(currentValue)) {
                                return accumulator + +currentValue;
                            }
                            return accumulator;
                        }, 0);
                        val = parseInt(val * 1000);
                        if (indx == 0) {
                            aLabel = val;
                        } else {
                            bLabel = val;
                        }
                    });
                    return aLabel - bLabel;
                    // return a.sort_order - b.sort_order;
                    // return aLabel.localeCompare(bLabel, undefined, {
                    //   numeric: true,
                    //   sensitivity: 'base',
                    // });
                });
            } else {
                options.values.sort((a, b) => { return productsSortFunc(a, b, 'label') })
            }
        });

        //sort the configurable option sets by their position from magento
        p.configurable_options.sort(function (a, b) {
            return a.position - b.position;
        });

        //tag products with pricerange tags
        let filter_pricerange_fc = [];
        let minPrice = p.price_range.minimum_price.final_price.value;
        minPrice = Math.floor(minPrice / 100) * 100
        let maxPrice = p.price_range.minimum_price.regular_price.value;
        if (typeof p.price_range.maximum_price != 'undefined') {
            maxPrice = p.price_range.maximum_price.final_price.value;
        }
        maxPrice = Math.ceil(maxPrice / 100) * 100
        filter_pricerange_fc.push(`${minPrice}`);
        minPrice += 100;
        filter_pricerange_fc.push(`${minPrice}`);
        filter_pricerange_fc.push(`${maxPrice}`);
        maxPrice -= 100;
        filter_pricerange_fc.push(`${maxPrice}`);
        // while (minPrice <= maxPrice) {
        //   minPrice += 100;
        //   filter_pricerange_fc.push(`${minPrice}`);
        // }

        let possibleQuantities = [];

        let variants = [];
        let shipGroups = p.lead_time //['8 day']
        if (typeof p.variants != 'undefined' && p.variants) {
            for (let i = 0; i < p.variants.length; i++) {
                let v = p.variants[i];
                let indx = i;
                let tags = [];
                if (typeof v.attributes != 'undefined') {
                    v.attributes.forEach((att) => {
                        // att.code
                        // att.label
                        // att.value_index
                        tags.push(`${att.code}--${standardizeValue(att.label)}`)
                        if (typeof altAttCodes != 'undefined' && typeof altAttCodes[att.code] != 'undefined') {
                            tags.push(`${altAttCodes[att.code]}--${standardizeValue(att.label)}`)
                        }
                    })
                }

                shipGroups = shipGroups.concat(v.product.lead_time);
                delete v.product.price_range.maximum_price;
                let stone_uom = '';
                if (typeof v.product.stone_uom != 'undefined' && v.product.stone_uom && v.product.stone_uom[0]) {
                    stone_uom = v.product.stone_uom[0];
                }


                // const defaultPriceTier = {
                //     discount: {
                //         amount_off: 0,
                //         percent_off: 0,
                //     }
                // }
                if (typeof v.product.price_tiers != 'undefined' && v.product.price_tiers.length > 0) {
                    v.quantity = 1;
                    // v.priceTier = {
                    //     discount: {
                    //         amount_off: 0,
                    //         percent_off: 0
                    //     }
                    // }
                    v.product.price_tiers.forEach((pt) => {
                        if (typeof pt.quantity != 'undefined') {
                            let newV = JSON.parse(JSON.stringify(v));
                            //this multiplies the price each times the quantity
                            // newV.product.price_range.minimum_price.regular_price.value = (pt.final_price.value + pt.discount.amount_off) * pt.quantity;
                            // newV.product.price_range.minimum_price.final_price.value = pt.final_price.value * pt.quantity;
                            newV.product.price_range.minimum_price.regular_price.value = pt.final_price.value + pt.discount.amount_off;
                            newV.product.price_range.minimum_price.final_price.value = pt.final_price.value;
                            // newV.priceTier = {
                            //     discount: {
                            //         amount_off: pt.discount.amount_off,
                            //         percent_off: pt.discount.percent_off,
                            //     }
                            // }
                            newV.quantity = pt.quantity;
                            delete newV.product.price_tiers;
                            //add this variant to the list so that the 
                            //normal filter mechanism works with these
                            p.variants.push(newV);

                            if (possibleQuantities.indexOf(pt.quantity) == -1) {
                                possibleQuantities.push(pt.quantity);
                            }
                        }
                    });
                }
                if (typeof v.quantity != 'undefined' && v.quantity) {
                    tags.push(`quantity--${v.quantity}`);
                }

                variants[indx] = {
                    originalIndex: indx,
                    tags,
                    stone_uom,
                    id: v.product.id,
                    sku: v.product.sku,
                    // priceTier: v?.priceTier ?? defaultPriceTier,
                    //value index exists on the attributes like v.attributes[0].value_index
                    // value_index: v.value_index,
                    priceRange: v.product.price_range,
                    salable_qty: v.product.salable_qty,
                    stock_status: v.product.stock_status,
                    lead_time: v.product.lead_time
                }
            }
        }

        //get possible quantites from top level price tiers
        //and from variant price tiers and then turn them into
        //configurable options
        if (possibleQuantities.length > 0) {
            if (possibleQuantities.indexOf(1) == -1) {
                possibleQuantities.push(1)
            }
            possibleQuantities.sort();

            let optionQuantity = {
                attribute_code: 'quantity',
                label: 'Quantity',
                __typename: 'configurable_option_fc',
                values: possibleQuantities.map((q) => {
                    return {
                        valTag: `${q}`,
                        tags: [`quantity--${q}`],
                        label: `${q}`
                    }
                })
            };
            p.configurable_options.push(optionQuantity);
        }

        //unique and non empty
        //ship group tags will be added when the filters are injected
        //since these filters are dynamically created based on what exists
        shipGroups = shipGroups.filter((value, index, self) => {
            return self.indexOf(value) === index;
        }).filter(n => n);

        //discount filters are predefined using wordpress data,
        //so we tag the products here before injecting the fitlters
        let discount = p.price_range.minimum_price.regular_price.value - p.price_range.minimum_price.final_price.value
        discount = discount / p.price_range.minimum_price.regular_price.value
        discount = discount * 100;
        discount = Math.ceil(discount);
        discount = discount.toString();
        tags.push(`calculated_discount__final_price--${Math.ceil(p.price_range.minimum_price.final_price.value)}`)
        tags.push(`calculated_discount__reg_price--${Math.ceil(p.price_range.minimum_price.regular_price.value)}`)
        tags.push(`calculated_discount_fc--${discount}`);

        let inStock = true;
        if (p.stock_status != 'IN_STOCK' || !(p.salable_qty > 0)) {
            inStock = false;
        }

        let options = [];
        if (typeof p.options != 'undefined' && p.options && p.options.length) {
            options = p.options;
            options.forEach((opt, indx, arr) => {
                opt.attribute_code = standardizeValue(opt.title);
                //standardize label and title between configurable options
                //and options
                opt.label = opt.title;
                opt.values = [];
                opt.__typename = 'option_fc';
                if (
                    typeof opt.value != 'undefined' &&
                    opt.value &&
                    opt.value.length > 0
                ) {
                    opt.value.forEach((ov) => {
                        ov.valTag = `${standardizeValue(ov.title)}`;
                        ov.tags = [`${opt.attribute_code}--${ov.valTag}`];
                        ov.label = ov.title;
                    });
                    opt.values = [...opt.value];
                }

                delete opt.value;
            })
        }


        products[i] = {
            name: p.name,
            urlKey: p.url_key,
            sku: p.sku,
            id: p.id,
            tags: tags,
            __typename: p.__typename,
            selectedVariant: null,
            defaultPriceRange: p.price_range,
            showRangePrice,
            showRangePriceText,
            priceRange: p.price_range,
            priceTiers: p.product?.price_tiers ?? [],
            price: p.price_range.minimum_price.final_price.value,
            position: i,
            images: images,
            filter_ship_fc: shipGroups,
            filter_pricerange_fc,
            defaultImages: getImages(images, []),
            variants,
            salable_qty: p.salable_qty,
            stock_status: p.stock_status,
            inStock,
            configurableOptions: p.configurable_options,
            productTags: [],
            options
        }
    })
    return { products }
}


/**
 * Process the wordpress data into more usuable format
 * In particular process all the wordpressViews
 * which change as the filter changes on the collections page
 * @param {*} wpdata 
 * @param {*} config 
  {
    siteId: 'dn',
    activeSaleName: 'Default Active Sale'
  }
 * @returns 
 */
function processWpData(wpdata, config) {
    const siteId = config.siteId;
    const activeSale = config.activeSale;
    let processed = {
        categoryUrlKey: '',
        categoryTitle: '',
        categoryParents: [],
        filterableCategories: [],
        filterableCategoriesHidden: [],
        filtersToHide: [],
        filterImages: {},
        mockProducts: [],
        magento_category_id: null,
        magento_category_name: null,
        scenes: [],
        ajaxUpdate: false,
    }

    if (
        typeof wpdata == 'undefined' ||
        wpdata == null ||
        typeof wpdata[siteId + 'Categories'] == 'undefined' ||
        wpdata[siteId + 'Categories'] == null ||
        typeof wpdata[siteId + 'Categories'].nodes == 'undefined' ||
        wpdata[siteId + 'Categories'].nodes == null ||
        typeof wpdata[siteId + 'Categories'].nodes[0] == 'undefined' ||
        wpdata[siteId + 'Categories'].nodes[0] == null ||
        typeof wpdata[siteId + 'Categories'].nodes[0][siteId + 'Category'] == 'undefined' ||
        wpdata[siteId + 'Categories'].nodes[0][siteId + 'Category'] == null
    ) {
        console.log('missing wordpress category data')
        return processed;
    }
    processed.categoryUrlKey = wpdata[siteId + 'Categories'].nodes[0][siteId + 'Category']['categoryUrlKey'];
    processed.magento_category_id = wpdata[siteId + 'Categories'].nodes[0][siteId + 'Category']['magentoCategoryId'];
    processed.magento_category_name = wpdata[siteId + 'Categories'].nodes[0][siteId + 'Category']['magentoCategoryName'];
    processed.ajaxUpdate = wpdata[siteId + 'Categories'].nodes[0][siteId + 'Category']['ajaxUpdate'];

    //get the active sale name
    //then check if there is a sale view with fields
    //then try to add any non empty fields
    // activeSale = wpdata.getActiveSale.sale_name;
    let catData = wpdata[siteId + 'Categories'].nodes[0][siteId + 'Category'];
    if (catData.saleViews != undefined) {
        catData.saleViews.forEach((saleView) => {
            if (saleView[siteId + 'SaleList'] === activeSale) {
                for (let prop in catData) {
                    if (prop != 'categoryFilterViews' && typeof saleView[prop] != 'undefined') {
                        if (saleView[prop] != undefined) {
                            if (typeof saleView[prop] === 'string' && saleView[prop].length == 0) {
                                continue;
                            }
                            catData[prop] = saleView[prop];
                        }
                    }
                }
                if (catData.categoryFilterViews == undefined && saleView.categoryFilterViews != undefined) {
                    catData.categoryFilterViews = saleView.categoryFilterViews;
                } else if (catData.categoryFilterViews != undefined && saleView.categoryFilterViews != undefined) {
                    catData.categoryFilterViews.forEach((catFilView) => {
                        saleView.categoryFilterViews.forEach((saleFilView) => {
                            if (saleFilView.categoryFilter == catFilView.categoryFilter) {
                                for (let prop in saleFilView) {
                                    if (saleFilView[prop] != undefined) {
                                        catFilView[prop] = saleFilView[prop];
                                    }
                                }
                            }
                        });
                    });
                }
            }
        });
        //make sure the data doesn't retain references to the sale views
        wpdata = JSON.parse(JSON.stringify(wpdata));
        //then delete unused sale views
        wpdata[siteId + 'Categories'].nodes[0][siteId + 'Category'].saleViews = [];
    }

    //////////////////////////
    //process wordpress views -- this is the wordpress page data that changes when the page is filtered
    ////////////
    let defaultView = JSON.parse(JSON.stringify(wpdata[siteId + 'Categories']['nodes'][0][siteId + 'Category']));
    defaultView.title = wpdata[siteId + 'Categories']['nodes'][0].title;

    const defaultArrs = ['images', 'inlineAds', 'collectionButtons', 'headlineButtons'];
    defaultArrs.forEach((v) => {
        if (!defaultView[v]) {
            defaultView[v] = [];
        }
    });
    if (!defaultView.customPageCss) {
        defaultView.customPageCss = '';
    }
    if (defaultView.pageTitle === null) {
        defaultView.pageTitle = '<h1>' + defaultView.title + '</h1>';
    }
    defaultView.headlineButtons.forEach((btn, indx, arr) => {
        arr[indx] = addHeadlineButtonConfig(btn);
    })
    for (const prop in defaultView) {
        if (isHTML(defaultView[prop])) {
            defaultView[prop] = escapeHTML(defaultView[prop])
        }
    }

    //get additional views then remove them from the default view data
    let additionalViews = defaultView.categoryFilterViews
        ? JSON.parse(JSON.stringify(defaultView.categoryFilterViews))
        : [];
    delete defaultView.categoryFilterViews;
    delete defaultView.saleViews;
    delete defaultView.filterableCategories;
    delete defaultView.filtersToHide;
    if (defaultView.mobileHeroImages) {
        defaultView.mobileHeroImages.sort((a, b) => {
            if (a.mobileHeroImageCustomBreakpoint < b.mobileHeroImageCustomBreakpoint) {
                return 1;
            } else {
                return -1;
            }
        });
    }

    processed.scenes.push({ tags: [], data: defaultView, originalIndex: 0 })

    additionalViews.forEach((view, indx) => {
        let params = makeParamStringToTagArray(view.categoryFilter);
        if (view.headlineButtons) {
            view.headlineButtons.forEach((hb, indx, arr) => {
                arr[indx] = addHeadlineButtonConfig(hb)
            });
        }

        //html escape properties that need it,
        //otherwise the elder bundler barfs
        //also delete what we're not using
        for (const wpProperty in view) {

            if (isHTML(view[wpProperty])) {
                view[wpProperty] = escapeHTML(view[wpProperty])
            }

            // let copyHead be null, special case for wordpress data
            if (wpProperty == 'copyHead') {
                if (view[wpProperty] === null) {
                    view[wpProperty] = '';
                }
                continue;
            } else if (
                view[wpProperty] === null ||
                (typeof view[wpProperty] == 'string' && view[wpProperty].length == 0) ||
                (Array.isArray(view[wpProperty]) && view[wpProperty].length == 0)
            ) {
                delete view[wpProperty];
                // if (defaultView[wpProperty] != null) {
                //   view[wpProperty] = defaultView[wpProperty];
                // }
            }
        }

        if (view.mobileHeroImages) {
            view.mobileHeroImages.sort((a, b) => {
                if (a.mobileHeroImageCustomBreakpoint < b.mobileHeroImageCustomBreakpoint) {
                    return 1;
                } else {
                    return -1;
                }
            });
        }

        processed.scenes.push({
            tags: params,
            data: view,
            originalIndex: indx + 1
        });
    })
    /////////////////////////////////
    //////////////////////////////////

    if (catData.filterableCategories != undefined) {
        for (let i = 0; i < catData.filterableCategories.length; i++) {
            if (
                catData.filterableCategories[i] != undefined &&
                catData.filterableCategories[i].filterCategory != undefined &&
                catData.filterableCategories[i].filterCategory[siteId + 'Category'] != undefined &&
                catData.filterableCategories[i].filterCategory[siteId + 'Category'].magentoCategoryId != undefined
            ) {
                processed.filterableCategories.push(
                    catData.filterableCategories[i].filterCategory[siteId + 'Category'].magentoCategoryId.toString(),
                );

                if (catData.filterableCategories[i].hide) {
                    processed.filterableCategoriesHidden.push(
                        catData.filterableCategories[i].filterCategory[siteId + 'Category'].magentoCategoryId.toString(),
                    );
                }
            }
        }
    }
    if (catData.filtersToHide != undefined) {
        processed.filtersToHide = catData.filtersToHide;
    }
    if (catData.filterImages != undefined) {
        for (let i = 0; i < catData.filterImages.length; i++) {
            if (
                catData.filterImages[i] != undefined &&
                catData.filterImages[i].filter != undefined &&
                catData.filterImages[i].option != undefined &&
                catData.filterImages[i].filterImage != undefined &&
                catData.filterImages[i].filterImage.sourceUrl != undefined
            ) {
                processed.filterImages[`${catData.filterImages[i].filter}--${standardizeValue(catData.filterImages[i].option)}`] =
                    catData.filterImages[i].filterImage;
            }
        }
    }
    if (catData.mockProduct != undefined) {
        processed.mockProducts = catData.mockProduct;
    }

    //get the category title
    if (wpdata[siteId + 'Categories'].nodes[0][siteId + 'Category'].pageTitle != undefined) {
        processed.categoryTitle = wpdata[siteId + 'Categories'].nodes[0][siteId + 'Category'].pageTitle;
    } else {
        processed.categoryTitle = wpdata[siteId + 'Categories'].nodes[0].title;
    }

    if (wpdata[siteId + 'Categories'].nodes[0].parent != undefined) {
        let node = wpdata[siteId + 'Categories'].nodes[0];
        processed.categoryParents = checkForParents(node, siteId);
    }

    //html must be escaped to be stringified into the svelte templates
    //if this is not done, elder throws an error
    for (const prop in processed) {
        if (isHTML(processed[prop])) {
            processed[prop] = escapeHTML(processed[prop])
        }
    }
    return processed;
}

/**
 * 
 * @param {str} paramstring key-v=val-x&key-2=val-y
 * @returns {arr} ['key_v--val_x','key_2--val_y']
 */
function makeParamStringToTagArray(paramstring) {
    let params = paramstring.split('&').flatMap((param) => {
        let strs = []
        const parts = param.trim().split('=');
        let str = '';
        if (parts.length > 0) {
            str += standardizeValue(parts[0])
        }
        if (parts.length > 1) {
            str += '--';
            parts[1] = parts[1].split(',');
            parts[1].forEach((p) => {
                strs.push(str + standardizeValue(p));
            })
        }
        return strs;
    });

    return params
}

/**
 * Transform the headline button filter into parameter tags
 * @param {*} headlineButton 
 * @returns {*} headlineButton
 */
function addHeadlineButtonConfig(headlineButton) {
    if (typeof headlineButton.filterString == 'undefined' || !headlineButton.filterString) {
        headlineButton.filterString = '';
    }
    headlineButton.filterString = headlineButton.filterString.trim();
    let btnTags = [];
    let btnParams = headlineButton.filterString.split('&');
    btnParams.forEach((param) => {
        let parts = param.split('=');
        if (parts.length == 2) {
            let filter = standardizeValue(parts[0]);
            let options = parts[1].toLowerCase().split(',');
            options.forEach((opt) => {
                opt = standardizeValue(opt);
                btnTags.push([filter, opt]);
            })
        }
    });
    headlineButton.btnTags = btnTags;
    headlineButton = makeImageString(headlineButton, headlineButton.buttonText);
    return headlineButton;
}


function makeImageString(imageGroup, backupAltText = 'filter button') {
    let imgStr = '';
    let imgAlt = '';
    let hoverImgStr = '';
    let hoverImgAlt = '';
    // let orders = [];
    if (imageGroup.images != undefined && typeof imageGroup.imgStr == 'undefined') {
        //sort the images with the largest images last
        imageGroup.images = imageGroup.images.sort((a, b) => {
            if (a.customBreakpoint != undefined) {
                a.screenWidth = a.customBreakpoint;
            }
            if (b.customBreakpoint != undefined) {
                b.screenWidth = b.customBreakpoint;
            }
            if (a.screenWidth == undefined && b.screenWidth == undefined) {
                return 0;
            }
            if (a.screenWidth == undefined) {
                return 1;
            }
            if (b.screenWidth == undefined) {
                return -1;
            }
            if (a.screenWidth < b.screenWidth) {
                return 1;
            }
            return -1;
        });
        imgStr += '<picture>';
        for (let j = 0; j < imageGroup.images.length; j++) {
            let currImg = imageGroup.images[j];
            if (currImg.image.altText.length == 0) {
                currImg.image.altText = backupAltText;
            }
            imgStr += '<source srcset="' + currImg.image.sourceUrl.replace('/f_auto', '/c_scale,w_250/f_auto').replace('/q_auto', '/c_scale,w_250/q_auto') + '" ';
            //imgStr += currImg.image.sourceUrl + ' ';
            if (currImg.customBreakpoint != undefined) {
                imgStr += 'media="(max-width: ' + currImg.customBreakpoint + 'px)">';
            } else if (currImg.screenWidth != undefined) {
                imgStr += 'media="(max-width: ' + currImg.screenWidth + 'px)">';
                // imgStr += '[(max-width:' + currImg.screenWidth + 'px)]';
            } else {
                imgStr += '>';
            }
            if (j != imageGroup.images.length - 1) {
                //imgStr += ' | ';
            } else {
                imgStr +=
                    '<img src="' + currImg.image.sourceUrl.replace('/f_auto', '/c_scale,w_250/f_auto').replace('/q_auto', '/c_scale,w_250/q_auto') + '" class="img" loading="auto" alt="' + currImg.image.altText + '">';
                imgAlt = currImg.image.altText;
            }
            // if (currAd.order != undefined) {
            //   orders.push(currAd.order);
            // }
        }
        imgStr += '</picture>';
        imageGroup.imgAlt = imgAlt;
        imageGroup.imgStr = imgStr;
    }

    if (imageGroup.hoverImages != undefined && typeof imageGroup.hoverImgStr == 'undefined') {
        //sort the images with the largest images last
        imageGroup.hoverImages = imageGroup.hoverImages.sort((a, b) => {
            if (a.customBreakpoint != undefined) {
                a.screenWidth = a.customBreakpoint;
            }
            if (b.customBreakpoint != undefined) {
                b.screenWidth = b.customBreakpoint;
            }
            if (a.screenWidth == undefined && b.screenWidth == undefined) {
                return 0;
            }
            if (a.screenWidth == undefined) {
                return 1;
            }
            if (b.screenWidth == undefined) {
                return -1;
            }
            if (a.screenWidth < b.screenWidth) {
                return 1;
            }
            return -1;
        });
        hoverImgStr += '<picture>';
        for (let j = 0; j < imageGroup.hoverImages.length; j++) {
            let currImg = imageGroup.hoverImages[j];
            if (currImg.image.altText.length == 0) {
                currImg.image.altText = backupAltText;
            }
            hoverImgStr += '<source srcset="' + currImg.image.sourceUrl.replace('/f_auto', '/c_scale,w_250/f_auto').replace('/q_auto', '/c_scale,w_250/q_auto') + '" ';
            //imgStr += currImg.image.sourceUrl + ' ';
            if (currImg.customBreakpoint != undefined) {
                hoverImgStr +=
                    'media="(max-width: ' + currImg.customBreakpoint + 'px)">';
            } else if (currImg.screenWidth != undefined) {
                hoverImgStr += 'media="(max-width: ' + currImg.screenWidth + 'px)">';
                // imgStr += '[(max-width:' + currImg.screenWidth + 'px)]';
            } else {
                hoverImgStr += '>';
            }
            if (j != imageGroup.images.length - 1) {
                //imgStr += ' | ';
            } else {
                hoverImgStr +=
                    '<img loading="lazy" src="' +
                    currImg.image.sourceUrl.replace('/f_auto', '/c_scale,w_250/f_auto').replace('/q_auto', '/c_scale,w_250/q_auto') +
                    '" class="img" alt="' +
                    currImg.image.altText +
                    '">';
                hoverImgAlt = currImg.image.altText;
            }
            // if (currAd.order != undefined) {
            //   orders.push(currAd.order);
            // }
        }
        hoverImgStr += '</picture>';
        imageGroup.hoverImgAlt = hoverImgAlt;
        imageGroup.hoverImgStr = hoverImgStr;
    }
    return imageGroup;
}

function checkForParents(node, siteId) {
    let parents = [];
    let parentInfo = {
        urlKey: '',
        title: '',
        parentCatId: '',
    };
    if (node == undefined || node.parent == undefined) {
        return parents;
    }
    let p = node.parent;

    if (p.node != undefined) {
        if (p.node[siteId + 'Category'] != undefined && p.node[siteId + 'Category'].categoryUrlKey != undefined) {
            parentInfo.title =
                p.node[siteId + 'Category'].pageTitle != undefined ? p.node[siteId + 'Category'].pageTitle : p.node.title;
            parentInfo.urlKey = p.node[siteId + 'Category'].categoryUrlKey;
            parentInfo.parentCatId = p.node[siteId + 'Category'].magentoCategoryId;
            parents.push(parentInfo);
        }
    }
    if (node.parent.node != undefined) {
        let otherParents = checkForParents(node.parent.node, siteId);
        parents = otherParents.concat(parents);
    }

    return parents;
};

function sortFilterKeys(filters) {

    let topFilters = ['filter_other', 'available_by_fc', 'filter_stone_type', 'category_id', 'filter_style', 'filter_metal', 'filter_shape', 'filter_ring_size', 'filter_color'];
    let bottomFilters = ['quick_ship_fc', 'category-id', 'filter_price', 'filter_price_fc'];

    //inject filters from wordpress based on priority
    for (const fil in filters) {
        if (typeof filters[fil].priority != 'undefined' && filters[fil].priority) {
            if (filters[fil].priority > 0) {
                topFilters.splice(filters[fil].priority, 0, fil);
            }
            if (filters[fil].priority < 0) {
                bottomFilters.splice(filters[fil].priority * -1, 0, fil);
            }
        }
    }
    topFilters = topFilters.reverse();
    bottomFilters = bottomFilters.reverse();

    //alphabetic sort
    let sortedFilterKeys = [...Object.keys(filters)].sort(function (a, b) {
        if (a > b) {
            return 1;
        }
        if (a < b) {
            return -1;
        }
        return 0;
    });

    sortedFilterKeys.sort((a, b) => {
        let scores = {
            a: 0,
            b: 0,
        };
        let attributeCodes = {
            a: a,
            b: b
        };
        ['a', 'b'].forEach((x) => {
            const label = attributeCodes[x];
            if (topFilters.indexOf(label) != -1) {
                scores[x] += topFilters.indexOf(label)
            }
            if (bottomFilters.indexOf(label) != -1) {
                scores[x] -= bottomFilters.indexOf(label)
            }
        });
        return scores.b - scores.a
    });

    return sortedFilterKeys;
}

/**
 * Add order array of options to each filter
 * @param {*} filters 
 * @param {*} siteId 
 * @returns {*} filters
 */
function addOptionOrder(filters, siteId = "dn") {
    for (const fil in filters) {
        let order = [...Object.keys(filters[fil].options)];
        //from top down and bottom up
        const sortArrs = {
            filter_style: {
                top: [
                    'accented',
                    'solitaire',
                    'classic',
                    'eternity',
                    'semi__full_eternity_bands',
                    'nesting__stacking',
                    'plain_metal',
                    'anniversary',
                    'glam',
                    'halo',
                    'three_stone',
                    'vintage',
                    'petite',
                    'enhancers',
                    'stand_alone_bands',
                    'matching_bands',
                    'mens_bands',
                    'classic_mens_wedding_bands',
                    'matte_mens_wedding_bands',
                    'modern_mens_wedding_bands',
                ],
                bottom: [],
            },
            filter_metal: {
                top: ['18k_white_gold', '14k_white_gold', '18k_yellow_gold', '14k_yellow_gold', '14k_rose_gold'],
                bottom: ['platinum', '10k_yellow_gold', '10k_white_gold'],
            },
            filter_shape: {
                top: ['round', 'princess', 'oval', 'emerald', 'pear', 'cushion', 'marquise', 'asscher'],
                bottom: ['fancy_shapes', 'heart', 'radiant'],
            },
            filter_color: {
                top: ['white', 'sapphire', 'emerald', 'canary', 'rose'],
                bottom: ['all_colored_stones'],
            },
            filter_price_fc: {
                top: [],
                bottom: [],
            }
        }

        //reverse the order so it goes from first to last visually up above
        for (const ac in sortArrs) {
            if (typeof sortArrs[ac].top != 'undefined') {
                sortArrs[ac].top = sortArrs[ac].top.reverse();
            }
            if (typeof sortArrs[ac].bottom != 'undefined') {
                sortArrs[ac].bottom = sortArrs[ac].bottom.reverse();
            }
        }

        if (typeof sortArrs[fil] != 'undefined') {
            order.sort((a, b) => {
                let scores = {
                    a: 0,
                    b: 0,
                };
                let labels = {
                    a: a,
                    b: b
                };
                ['a', 'b'].forEach((x) => {
                    const label = labels[x];
                    if (sortArrs[fil].top.indexOf(label) != -1) {
                        scores[x] += sortArrs[fil].top.indexOf(label)
                    }
                    if (sortArrs[fil].bottom.indexOf(label) != -1) {
                        scores[x] -= sortArrs[fil].bottom.indexOf(label)
                    }
                });
                return scores.b - scores.a
            });
        } else {
            order.sort((a, b) => { return productsSortFunc(a, b) })
        }
        filters[fil].order = order;
    }
    return filters
}

function makeProductCategorySchemas(fcGlobal) {
    let productCategorySchemas = [];
    if (fcGlobal['visibleProducts'].length > 0) {
        fcGlobal['visibleProducts'].forEach((pIndx) => {
            p = fcGlobal['products'][pIndx];
            if (p.__typename == "MockProduct") { return; }
            //build the image string
            let image = '';
            if (
                typeof p.defaultImages[0] != 'undefined' &&
                p.defaultImages[0] &&
                typeof p.defaultImages[0].image_url != 'undefined' &&
                p.defaultImages[0].image_url != null &&
                typeof p.defaultImages[0].image_path != 'undefined' &&
                p.defaultImages[0].image_path != null
            ) {
                image = (p.defaultImages[0].image_url + p.defaultImages[0].image_path).replace(
                    'upload/',
                    'upload/f_auto,q_auto,w_300,c_scale/',
                );
            }
            productCategorySchemas.push({
                price: p.defaultPriceRange.minimum_price.final_price.value,
                image: [image],
                name: p.name
            });
        });
    }
    return productCategorySchemas;
}

function makeBreadCrumbSchemaList(fcGlobal, settings) {
    let breadCrumbSchemaList = [];
    if (fcGlobal['categoryTitle'] != undefined && fcGlobal['categoryTitle'].length > 0) {
        breadCrumbSchemaList.push({
            name: 'Home',
            url: `${settings.protocol}${settings.host}/`,
        });
        if (fcGlobal['categoryParents'] != undefined && fcGlobal['categoryParents'].length > 0) {
            fcGlobal['categoryParents'].forEach((cp) => {
                breadCrumbSchemaList.push({
                    name: stripString(decodeEntities(cp.title)),
                    url: `${settings.protocol}${settings.host}/collections/${cp.urlKey}'/`,
                });
            })
        }
        breadCrumbSchemaList.push({
            name: stripString(decodeEntities(fcGlobal['categoryTitle'])),
            url: fcGlobal['defaultCanonicalUrl'],
        });
    }
    return breadCrumbSchemaList;
}

function shouldAjaxUpdate(fcGlobal) {
    let ajaxUpdate = false;
    if (fcGlobal['products'].length > 0) {
        fcGlobal['products'].forEach((p) => {
            //check if this should be clearance
            const url_key = p.urlKey;
            if (!ajaxUpdate && url_key && (url_key.startsWith('clearance-') || url_key.startsWith('promo-'))) {
                ajaxUpdate = true;
            }
        });
    };
    return ajaxUpdate;
}


function generateSEO(fcGlobal) {
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

    let browse_refine_type = [];
    let browse_refine_value = [];
    for (let i = 0; i < activeFilters.length; i++) {
        browse_refine_type.push(activeFilters[i].attribute_code);
        //legacy --- would have to modify code to do this this is the number value like 2338
        //browse_refine_value.push(activeFilters[i].value)
        //this is the label value like Solitaire
        browse_refine_value.push(activeFilters[i].label);
    }

    let title = fcGlobal.seoTitle;

    let plp_product_ids = [];
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
    let product_position = [];
    if (plp_product_ids.length) {
        product_position = plp_product_ids.map((_, ind) => ind + 1);
    }
    let seo = {
        keywords: fcGlobal.scenes[fcGlobal.scene].data.metaKeywords,
        description: fcGlobal.scenes[fcGlobal.scene].data.metaDescription,
        title: title,
        canonical: fcGlobal.scenes[fcGlobal.scene].data.canonicalUrl,
        // metaindex isn't used on collection pages, but keeping it updated anyway
        metaindex: fcGlobal.scenes[fcGlobal.scene].data.metaRobotsIndex === 'noindex' ? 'noindex' : 'index',
        follow: 'FOLLOW',
        utag: {
            category_id: fcGlobal.categoryId.toString(),
            category_name: fcGlobal.magentoCategoryName,
            page_name: title,
            page_type: 'category',
            site_section: 'catalog',
            plp_product_ids: plp_product_ids,
            product_position: product_position,
            browse_refine_type: browse_refine_type ?? [],
            browse_refine_value: browse_refine_value ?? [],
        },
        noview: true,
    };
    return seo;
}

module.exports = {
    processWpFilters,
    injectFilters,
    createFiltersFromAggregations,
    createProductsFromMagProducts,
    processWpData,
    makeParamStringToTagArray,
    addHeadlineButtonConfig,
    checkForParents,
    sortFilterKeys,
    addOptionOrder,
    makeProductCategorySchemas,
    makeBreadCrumbSchemaList,
    shouldAjaxUpdate,
    generateSEO
}