const { settings } = require('./settings.cjs');
const { graphqlQuery } = require('../../lib/data/gql/client/getGQLClient.cjs');
const { productListQuery } = require('../../lib/data/gql/queries/pages/products/productListQueries.cjs');
const { customAttributeMetadataQuery } = require('../../lib/data/gql/queries/pages/products/customAttributeMetadataQuery.cjs');
const { stripString } = require('../../lib/utilities/_stripString.cjs');
const { standardizeValue } = require('../../lib/utilities/_standardizeValue.cjs');
const { createFiltersFromAggregations, createProductsFromMagProducts } = require('../../lib/collections/route/collectionsProcessing.cjs');

async function getProductList(helpers, settings) {
    console.log('in getProductList');
    //the typename map is used to save an extra type query on the related products
    let typenamemap = {};
    let aggregations = {}
    let items = [];
    let ymalData = {};
    const pageSize = settings.pageSize;
    const siteId = settings.siteId;
    const rootCategories = settings.rootCategories;
    const pageQuery = productListQuery(siteId, 'page');
    const fullQuery = productListQuery(siteId, 'full');
    const catId = rootCategories[siteId];
    const gqlConfig = {
        ...settings,
        route: 'products',
        type: 'all',
    }
    const queryYMAL = `query ymal($sku: String!) {
        ${siteId}_ymal(sku: $sku)
    }`;
    const varsYMAL = {
        sku: 'all'
    }

    const pageVars = {
        id: catId,
        page: 1,
        pageSize: pageSize,
    };
    let pageData = await helpers.graphqlQuery(pageQuery, pageVars, 'magento', gqlConfig);

    if (
        !!pageData &&
        !!pageData.products &&
        !!pageData.products.aggregations
    ) {
        aggregations = pageData.products.aggregations;
    }

    if (
        !!pageData &&
        !!pageData.products &&
        !!pageData.products.page_info &&
        !!pageData.products.page_info.total_pages
    ) {
        let promiseArr = [];
        let page = 0;
        while (page < pageData.products.page_info.total_pages) {
            page++;
            let fullVars = {
                id: catId,
                page: page,
                pageSize: pageSize,
            };
            promiseArr.push(
                helpers.graphqlQuery(fullQuery, fullVars, 'magento', gqlConfig),
            );
        }

        //customAttributeMetadata aka attributeMetaArr -- this is the labels for band width attribute
        promiseArr.unshift(
            helpers.graphqlQuery(customAttributeMetadataQuery, {}, 'magento', gqlConfig),
        );

        // //get the ymal products from wordpress
        // //on the ajax pages like stones and builder preview, 
        // //the graphqlQuery function has a stub for wordpress queries
        // //that will just return null

        promiseArr.unshift(
            helpers.graphqlQuery(queryYMAL, varsYMAL, 'wordpress', gqlConfig),
        );

        //resolve all the queries in parallel
        let [ymalDataResult, attributeMetaArr, ...urlDatas] = await Promise.allSettled(promiseArr);

        if (
            !!ymalDataResult.value &&
            !!ymalDataResult.value[siteId + '_ymal'] &&
            ymalDataResult.value[siteId + '_ymal'].length > 0
        ) {
            try {
                ymalData = JSON.parse(ymalDataResult.value[siteId + '_ymal'])
            } catch (e) {
                console.log(e, 'could not parse ymal data from wordpress');
            }
        }

        if (
            attributeMetaArr.status == 'fulfilled' &&
            typeof attributeMetaArr.value != 'undefined' &&
            typeof attributeMetaArr.value.customAttributeMetadata != 'undefined' &&
            typeof attributeMetaArr.value.customAttributeMetadata.items != 'undefined'
        ) {
            customAttributeMetadata = attributeMetaArr.value.customAttributeMetadata.items
        }

        for (let i = 0; i < urlDatas.length; i++) {
            let urlData = urlDatas[i];
            if (
                urlData.status == 'fulfilled' &&
                urlData.value.products != undefined &&
                urlData.value.products.items != undefined &&
                urlData.value.products.items.length > 0
            ) {
                items = items.concat(urlData.value.products.items);
            }
        }
    }








    //clean and combine data
    const uniqueItems = [];
    const duplicates = [];
    const map = new Map();

    items.forEach((item) => {
        //add ymal data
        if (!!ymalData && !!ymalData[item.sku]) {
            item.ymal = ymalData[item.sku].split(',');
        }
        if (!map.has(item.url_key)) {
            map.set(item.url_key, true); // set any value to Map
            uniqueItems.push(item);
        } else {
            duplicates.push(item);
        }
    });

    const map2 = new Map();
    const uniqueDupes = [];
    const duplicateDupes = [];
    duplicates.forEach((item) => {
        if (!map2.has(item.url_key)) {
            map2.set(item.url_key, true); // set any value to Map
            uniqueDupes.push(item);
        } else {
            duplicateDupes.push(item);
        }
    });

    uniqueDupes.forEach((dupe) => {
        let uniqueKey = dupe.url_key;
        let count = 1;
        duplicateDupes.forEach((dDupe) => {
            let dupeKey = dDupe.url_key;
            if (dupeKey === uniqueKey) {
                count++;
            }
        });
        dupe.count = count;
    });



    //console.log('duplicates', duplicates);
    console.log('SAVE: product duplicates.length', duplicates.length);
    console.log('SAVE: products uniqueItems.length', uniqueItems.length);
    console.log('SAVE: product unique duplicates.length', uniqueDupes.length);
    console.log('SAVE: products duplicateDupes.length', duplicateDupes.length);

    // if (settings.siteId === 'tf') {
    //     let missingProducts = [
    //         {
    //             found: false,
    //             sku: 'LRENSL0078CRB',
    //             updated_at: '',
    //             id: '104734',
    //             url_key: 'isle-round-cut-engagement-ring',
    //             __typename: 'ConfigurableProduct',
    //             linkproduct_products: [],
    //         },
    //         {
    //             found: false,
    //             sku: 'LRWBXX0043C',
    //             updated_at: '',
    //             id: '133148',
    //             url_key: 'petite-pave-wedding-band',
    //             __typename: 'ConfigurableProduct',
    //             linkproduct_products: [],
    //         },
    //         {
    //             found: false,
    //             sku: 'LBXXTN0008C',
    //             updated_at: '',
    //             id: '406553',
    //             url_key: 'tennis-bracelet-10-00-tcw-lab-grown-diamonds',
    //             __typename: 'ConfigurableProduct',
    //             linkproduct_products: [],
    //         },
    //         {
    //             found: false,
    //             sku: 'LBXXTN0006C',
    //             updated_at: '',
    //             id: '374460',
    //             url_key: 'tennis-bracelet-7-00-tcw-lab-grown-diamonds',
    //             __typename: 'ConfigurableProduct',
    //             linkproduct_products: [],
    //         },
    //     ];

    //     //the isle round cut engagement ring is not being returned by the graphql resolver
    //     //this makes sure it appears
    //     for (let i = 0; i < items.length; i++) {
    //         for (let j = 0; j < missingProducts.length; j++) {
    //             if (
    //                 items[i].url_key == missingProducts[j].url_key ||
    //                 items[i].id == missingProducts[j].id ||
    //                 items[i].sku == missingProducts[j].sku
    //             ) {
    //                 missingProducts[j].found = true;
    //             }
    //         }
    //     }
    //     for (let i = 0; i < missingProducts.length; i++) {
    //         if (!missingProducts[i].found) {
    //             items.push(missingProducts[i]);
    //             console.log(missingProducts[i].url_key + ' not found. Hardcoding');
    //         } else {
    //             console.log(missingProducts[i].url_key + ' found. Hooray!');
    //         }
    //     }
    // }

    //combine data into pages
    let pageArr = [];
    let duplicateList = [];
    let distinctArr = [];
    let distinctSkuArr = [];
    for (let i = 0; i < items.length; i++) {
        if (distinctArr.indexOf(items[i].sku) == -1 && distinctSkuArr.indexOf(items[i].url_key) == -1) {
            distinctArr.push(items[i].sku);
            distinctSkuArr.push(items[i].url_key);
            let modified = items[i].updated_at;
            if (modified.length == 0) {
                modified = new Date();
            } else {
                modified = new Date(modified);
            }
            modified = modified.toISOString();
            typenamemap[items[i].sku] = items[i]['__typename'];
            pageArr.push({
                slug: items[i].url_key,
                id: items[i].id,
                sku: items[i].sku,
                typename: items[i]['__typename'],
                linkproduct_products: items[i].linkproduct_products,
                modified: modified,
                magData: items[i],
            });
        } else {
            duplicateList.push(items[i]);
        }
    }
    console.log('duplicateList', duplicateList);
    console.log('total products ', pageArr.length);

    for (let i = 0; i < pageArr.length; i++) {
        let currProd = pageArr[i];
        if (typeof currProd.magData.description == 'undefined' || !currProd.magData.description) {
            currProd.magData.description = { 'html': '' };
        }
        currProd.magData.description.html = currProd.magData.description.html.replace(/â€™/g, "'");

        if (typeof currProd.magData.short_description == 'undefined' || !currProd.magData.short_description) {
            currProd.magData.short_description = { 'html': '' };
        } else {
            currProd.magData.short_description.html = stripString(currProd.magData.short_description.html);
        }
        currProd.magData.short_description.html = currProd.magData.short_description.html.replace(/â€™/g, "'");

        if (currProd.magData.categories) {
            currProd.magData.categories.sort((a, b) => {
                if (a.position > b.position) {
                    return 1;
                }
                if (a.position < b.position) {
                    return -1;
                }
                return 0;
            });
        }

    }
    return { pageArr, typenamemap, aggregations }
}


function processProducts(pageArr, aggregations) {

    let prepProds = pageArr.map((p) => {
        return p.magData;
    })
    const { filters, optionValueMap, filtersCount, filtersVisuallyHidden } = createFiltersFromAggregations(aggregations);
    let { products } = createProductsFromMagProducts(prepProds, filters, optionValueMap);
    products.forEach((p) => {
        if (!!p.variants) {
            p.variants.forEach((v) => {
                if (typeof v.lead_time != 'undefined' && v.lead_time.length > 0) {
                    v.lead_time.forEach((lt) => {
                        const tag = `lead_time--${standardizeValue(lt)}`;
                        v.tags.push(tag);
                    })
                }
            });
        }
    })
    pageArr = pageArr.map((p) => {
        let currProd = products.filter((prod) => {
            return prod.sku == p.sku
        });
        if (currProd && currProd.length) {
            p.product = currProd[0];
        }
        if (p.linkproduct_products && p.linkproduct_products.length) {
            p.linkproduct_products.forEach((lp, indx) => {
                let currProd = products.filter((prod) => {
                    return prod.sku == lp.sku
                });
                if (currProd && currProd.length) {
                    p.linkproduct_products[indx] = {
                        ...lp,
                        ...currProd[0]
                    };
                }
            })
        }
        if (p.ymal && p.ymal.length) {
            p.ymal.forEach((lp) => {
                let currProd = products.filter((prod) => {
                    return prod.sku == lp
                });
                if (currProd && currProd.length) {
                    p.ymal[indx] = {
                        ...currProd[0]
                    };
                }
            });
            p.ymal = p.ymal.filter((ym) => {
                return typeof ym != 'string';
            })
        }
        return p;
    })
    return pageArr;
}


module.exports = async function () {
    const helpers = {
        graphqlQuery
    }
    let { pageArr, typenamemap, aggregations } = await getProductList(helpers, settings);
    pageArr = processProducts(pageArr, aggregations);
    console.log('products pageArr.length', pageArr.length);
    // console.log('products pageArr', pageArr);

    // console.log(__filename, 'products pageArr', JSON.stringify(pageArr, null, 4))
    return pageArr;
}
