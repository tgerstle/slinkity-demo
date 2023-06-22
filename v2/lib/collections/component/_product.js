const { altAttCodes, getImages } = require('./_imgTagOptions.js');

const makeLink = function (product, allActiveFilters) {
    let productType = product.__typename;
    let link = '';
    if (allActiveFilters.length > 0) {
        let filterStr = allActiveFilters.join('&');
        if (typeof product.prelinked == 'undefined') {
            product.prelinked = {}
        }
        if (typeof product.prelinked[filterStr] != 'undefined') {
            link = product.prelinked[filterStr]
        } else {
            let paramsCount = 0;
            allActiveFilters.forEach((tag) => {
                if (tag.indexOf('px--') == -1) {
                    if (productType == "MockProduct") {
                        if (paramsCount > 0) {
                            link += '&';
                        }
                        if (tag.indexOf('metal_type') == -1) {
                            link += tag.replace('--', '=').replace(/_/g, '-');
                            paramsCount++;
                        }
                    } else {
                        if (
                            tag.indexOf('available') != -1 ||
                            (tag.indexOf('filter') == -1 && tag.indexOf('fc') == -1)
                        ) {
                            if (paramsCount > 0) {
                                link += '&';
                            }
                            link += tag.replace('--', '=').replace(/_/g, '-');
                            paramsCount++;
                        }
                        if (tag.indexOf('filter_metal') != -1 && link.indexOf('metal-type') == -1) {
                            if (paramsCount > 0) {
                                link += '&';
                            }
                            link += tag.replace('filter_metal', 'metal_type').replace('--', '=').replace(/_/g, '-');
                            paramsCount++;
                        }
                        if (tag.indexOf('filter_stone_type') != -1 && link.indexOf('stone-type') == -1) {
                            if (paramsCount > 0) {
                                link += '&';
                            }
                            link += tag.replace('filter_stone_type', 'stone-type').replace('--', '=').replace(/_/g, '-');
                            paramsCount++;
                        }
                    }
                }

            });
            product.prelinked[filterStr] = link;
        }
    }
    return link;
}

const getPrice = function (product, allActiveFilters) {
    let variants = product.variants ?? null;
    let defaultPriceRange = product.defaultPriceRange
    if (
        allActiveFilters.length == 0 ||
        typeof variants == 'undefined' ||
        !variants ||
        variants.length == 0
    ) {
        return {
            priceRange: defaultPriceRange,
            variantIndex: null
        }
    }
    let filterStr = allActiveFilters.join('&');
    if (typeof product.prefiltered == 'undefined') {
        product.prefiltered = {}
    }
    if (typeof product.prefiltered[filterStr] == 'undefined') {
        let copyV = [...variants].sort((a, b) => {
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
                })
            });
            if (a.priceRange.minimum_price.final_price.value < b.priceRange.minimum_price.final_price.value) {
                matches.a += 1;
            }
            if (b.priceRange.minimum_price.final_price.value < a.priceRange.minimum_price.final_price.value) {
                matches.b += 1;
            }
            return matches.b - matches.a;
        });
        product.prefiltered[filterStr] = {
            priceRange: copyV[0].priceRange,
            variantIndex: copyV[0].originalIndex
        }
    }

    return {
        priceRange: product.prefiltered[filterStr].priceRange,
        variantIndex: product.prefiltered[filterStr].variantIndex
    };
}

const makeModifier = function (product, allActiveFilters) {
    let tempModifier = '';
    let filterStr = allActiveFilters.join('&');
    if (typeof product.premodifier == 'undefined') {
        product.premodified = {}
    }
    if (typeof product.premodified[filterStr] != 'undefined') {
        tempModifier = product.premodified[filterStr]
    } else {
        [...product.configurableOptions, ...product.options].forEach((option) => {
            option.values.forEach((val) => {
                if (val.tags.some((tag) => { return allActiveFilters.indexOf(tag) != -1 })) {
                    let label = `${val.label}`;
                    if (option.attribute_code == 'gemstone' && product.selectedVariant != null) {
                        let vIndx = product.selectedVariant;
                        label += ` ${product.variants[vIndx].stone_uom}`;
                    }
                    tempModifier += `<span class="pmodifier mod mod--${option.attribute_code} mod--${val.valTag}  mod--${option.attribute_code}--${val.valTag}">, </span><span class="pmodifier mod mod--${option.attribute_code} mod--${val.valTag}  mod--${option.attribute_code}--${val.valTag}">${label}</span>`;
                }
            })
        });
        product.premodified[filterStr] = tempModifier;
    }

    return tempModifier;
}


const isComingSoon = function (product) {
    let comingSoon = false;
    if (
        typeof product != 'undefined' &&
        typeof product.productTags != 'undefined' &&
        product.productTags &&
        product.productTags.length > 0
    ) {
        if (product.productTags.some((tag) => {
            return tag.tagName.indexOf('dn_coming_soon') != -1 ||
                tag.tagName.indexOf('tf_coming_soon') != -1;
        })) {
            comingSoon = true;
        }
    }
    return comingSoon;
}


const modifyActiveFiltersFromConfiguration = function (product, allActiveFilters = []) {
    if (typeof product.configurableOptions != 'undefined' && product.configurableOptions.length > 0) {
        product.configurableOptions.forEach((option) => {
            let prefixes = [];
            prefixes.push(`${option.attribute_code}--`);
            if (typeof altAttCodes != 'undefined' && typeof altAttCodes[option.attribute_code] != 'undefined') {
                prefixes.push(`${altAttCodes[option.attribute_code]}--`);
            }
            if (
                !allActiveFilters.some((tag) => {
                    let match = false;
                    prefixes.forEach((prefix) => {
                        if (tag.indexOf(prefix) != -1) {
                            match = true;
                        }
                    })
                    return match;
                })
            ) {
                let match = false;
                if (typeof product.defaultSelections != 'undefined' && typeof product.defaultSelections[option.attribute_code] != 'undefined') {
                    product.defaultSelections[option.attribute_code].forEach((val) => {
                        if (!match) {
                            const tag = `${option.attribute_code}--${val}`;
                            option.values.forEach((val) => {
                                if (!match) {
                                    if (val.tags.indexOf(tag) != -1) {
                                        match = true;
                                        allActiveFilters = allActiveFilters.concat(val.tags);
                                    }
                                }
                            });
                        }
                    });
                }
                // if (!match) {
                //     allActiveFilters = allActiveFilters.concat(option.values[0].tags);
                // }
            }
        });
    }
    return allActiveFilters;
}

const updateProduct = function (product, allActiveFilters = [], isPdp = false) {
    //this px value is added to trigger changes in products on paging
    //but can build up a lot of data with paging, so remove here
    let px = allActiveFilters.filter((f) => {
        return f.indexOf('px--') != -1;
    });
    if (px.length > 1) {
        allActiveFilters = allActiveFilters.filter((f) => {
            return f.indexOf('px--') == -1;
        });
    }
    //modify active filters based on configuration
    allActiveFilters = modifyActiveFiltersFromConfiguration(product, allActiveFilters);
    let { priceRange, variantIndex } = getPrice(product, allActiveFilters);
    product.priceRange = priceRange;
    product.selectedVariant = variantIndex;
    //modify the text
    product.nameModifier = makeModifier(product, allActiveFilters);
    //modify the link
    product.linkParams = makeLink(product, allActiveFilters);
    if (product.linkParams.length > 0) {
        product.linkParams = `?${product.linkParams}`;
    }
    product.productLink = `/products/${product.urlKey}/${product.linkParams}`;
    if (product.__typename == "MockProduct") {
        product.productLink = `${product.urlKey}/${product.linkParams}`;
    }
    product.visibleImages = getImages(product.images, allActiveFilters, product.defaultImages, isPdp);

    return { product, allActiveFilters };
}

module.exports = {
    getPrice,
    isComingSoon,
    makeLink,
    makeModifier,
    modifyActiveFiltersFromConfiguration,
    updateProduct
}