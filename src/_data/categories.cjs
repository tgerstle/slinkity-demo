const { settings } = require('./settings.cjs');
const { graphqlQuery, combineWPQueries, wpPagingQuery } = require('../../lib/data/gql/client/getGQLClient.cjs');
const { getWordpressCollectionsQuery } = require('../../lib/data/gql/queries/pages/collections/wordpressCollections.cjs');
const { chunkArray } = require('../../lib/utilities/_chunkArray.cjs');

async function makeCollectionsPageArr(settings, helpers) {
  const gqlConfig = settings.gqlConfig;
  const magentoCategoryUpdateQuery = `query magento_category_update($ids: [String!], $page: Int!, $pageSize: Int!) {
          categories(filters: {ids: {in: $ids}}, currentPage: $page, pageSize: $pageSize) {
            items {
              id
              url_key
              updated_at
              products{
                total_count
              }
            }
          }
        }
      `;
  const siteId = settings.siteId;
  const pageKey = 'Categories';
  const queryMagCatsPages = getWordpressCollectionsQuery(siteId);
  // const queryMagCatsPages = `query ${siteId}CategoryUrls($offset: Int!, $size: Int!){
  //       ${siteId}Categories(where: {offsetPagination: {offset: $offset, size: $size}}) {
  //           nodes {
  //           modified
  //           title
  //           ${siteId}Category {
  //               categoryUrlKey
  //               magentoCategoryId
  //               doNotDisplayOnSite
  //               seoUrl
  //               categoryFilterViews {
  //               canonicalUrl
  //               categoryFilter
  //               seoUrl
  //               }
  //           }
  //           }
  //       }
  //   }
  //   `;


  let queryData = await helpers.wpPagingQuery(
    siteId + 'Categories',
    queryMagCatsPages,
    null,
    gqlConfig
  );
  //all the wordpress category data
  queryData = helpers.combineWPQueries(siteId + pageKey, queryData);
  //get all of the category ids
  let allCatIds = [];
  for (let i = 0; i < queryData[siteId + 'Categories'].nodes.length; i++) {
    //get a list of magento category ids, we will use these to get the timestamp of when they were last updated
    let catId =
      queryData[siteId + 'Categories'].nodes[i][siteId + 'Category']
        .magentoCategoryId;
    allCatIds.push(catId);
  }

  //chunk the category ids into separate arrays
  //the parallel query magento for their update time information
  let pageSize = 20;
  let catIdArrs = helpers.chunkArray(allCatIds, pageSize);
  let magUpdateQueries = [];
  for (let i = 0; i < catIdArrs.length; i++) {
    let vars = {
      ids: catIdArrs[i],
      page: 1,
      pageSize: pageSize,
    };
    let updateTimeQuery = helpers.graphqlQuery(
      magentoCategoryUpdateQuery,
      vars,
      'magento',
      gqlConfig
    );
    magUpdateQueries.push(updateTimeQuery);
  }
  //resolve the queries
  catIdArrs = await Promise.all(magUpdateQueries);
  console.log(__filename, 'catIdArrs', catIdArrs);
  //all the magento data
  let finalCatIdArr;
  //then combine the queries
  for (let i = 0; i < catIdArrs.length; i++) {
    if (typeof finalCatIdArr == 'undefined') {
      finalCatIdArr = catIdArrs[i];
    } else if (
      typeof finalCatIdArr.categories != 'undefined' &&
      typeof finalCatIdArr.categories.items != 'undefined' &&
      typeof catIdArrs[i].categories != 'undefined' &&
      typeof catIdArrs[i].categories.items != 'undefined'
    ) {
      finalCatIdArr.categories.items = finalCatIdArr.categories.items.concat(
        catIdArrs[i].categories.items,
      );
    }
  }

  //store all the update times by category id => update time
  let updateTimes = {};
  let magentoCategoryData = {};
  if (
    typeof finalCatIdArr != 'undefined' &&
    typeof finalCatIdArr.categories != 'undefined' &&
    typeof finalCatIdArr.categories.items != 'undefined'
  ) {
    for (let i = 0; i < finalCatIdArr.categories.items.length; i++) {
      let item = finalCatIdArr.categories.items[i];
      updateTimes[item.id] = item.updated_at;
      magentoCategoryData[item.id] = finalCatIdArr.categories.items[i]
    }
  }

  for (const prop in magentoCategoryData) {
    let collectionQueryData
    let item = magentoCategoryData[prop];
    if (item.products.total_count) {
      let pageCount = Math.ceil(item.products.total_count / pageSize);
      const magentoCollectionsQuery = `query xxxxxmagento_category_products($id: String!, $page: Int!,$pageSize: Int!) {
        products(filter: {category_id: {eq: $id}}, currentPage: $page, pageSize: $pageSize, sort: {position: ASC}) {
          total_count
          aggregations {
            attribute_code
            label
            count
            options {
              count
              label
              value
            }
          }
          items {
            sku
          }
        }
      }
      `;

      let collectionPages = [];
      let page = 0;
      while (page < pageCount) {
        page++;
        let vars = {
          id: item.id.toString(),
          page: page,
          pageSize: pageSize,
        }
        collectionPages.push(helpers.graphqlQuery(magentoCollectionsQuery, vars, 'magento', gqlConfig))
      }
      let resolvedPromises;
      try {
        resolvedPromises = await Promise.allSettled(collectionPages);
      } catch (err) {
        console.log(err, 'error trying to get category information for collections');
      }
      if (resolvedPromises != undefined && resolvedPromises.length > 0) {
        for (let i = 0; i < resolvedPromises.length; i++) {
          if (resolvedPromises[i].status != 'fulfilled') {
            let vars = {
              id: item.id,
              currentPage: i + 1,
              pageSize: pageSize
            }
            resolvedPromises[i] = await helpers.graphqlQuery(magentoCollectionsQuery, vars, 'magento', gqlConfig);
            if (resolvedPromises[i].status != 'fulfilled') {
              console.log(__filename, 'Error Missing Collection Products Page!!', item, vars);
            }
          }
          if (collectionQueryData == undefined) {
            collectionQueryData = resolvedPromises[i];
          } else {
            if (
              typeof resolvedPromises[i] != 'undefined' &&
              typeof resolvedPromises[i].products != 'undefined' &&
              typeof resolvedPromises[i].products.items != 'undefined' &&
              typeof collectionQueryData != 'undefined' &&
              typeof collectionQueryData.products != 'undefined' &&
              typeof collectionQueryData.products.items != 'undefined'
            ) {
              // all of the product data is combined here
              collectionQueryData.products.items = collectionQueryData.products.items.concat(resolvedPromises[i].products.items);
            }
          }
        }
      }
      magentoCategoryData[prop].collection = collectionQueryData;

    } else {
      console.log(__filename, 'no Products in category', item);
    }
  }


  let pageArr = [];
  let usedCats = [];
  for (let i = 0; i < queryData[siteId + 'Categories'].nodes.length; i++) {
    if (
      typeof queryData[siteId + 'Categories'].nodes[i][siteId + 'Category']
        .doNotDisplayOnSite != 'undefined' &&
      queryData[siteId + 'Categories'].nodes[i][siteId + 'Category']
        .doNotDisplayOnSite
    ) {
      console.log(
        'Skipping rendering category page, flagged to not display in wordpress: ',
        queryData[siteId + 'Categories'].nodes[i][siteId + 'Category']
          .categoryUrlKey,
      );
      continue;
    }

    //get a list of magento category ids, we will use these to get the timestamp of when they were last updated
    let catId =
      queryData[siteId + 'Categories'].nodes[i][siteId + 'Category']
        .magentoCategoryId;
    let slug =
      queryData[siteId + 'Categories'].nodes[i][siteId + 'Category']
        .categoryUrlKey;
    let duplicate = false;
    if (usedCats.indexOf(slug) != -1) {
      duplicate = true;
    } else {
      usedCats.push(slug);
    }

    let modified = new Date(queryData[siteId + 'Categories'].nodes[i].modified);

    let catIdInt = parseInt(catId, 10);
    //check if we have the updated time in the key/value object store
    if (typeof updateTimes[catIdInt] != 'undefined') {
      let magModified = new Date(updateTimes[catIdInt]);
      if (modified.getTime() < magModified.getTime()) {
        modified = magModified;
      }
    }

    let wpData = queryData[siteId + 'Categories'].nodes[i];
    let magData = {};
    if (typeof magentoCategoryData[catIdInt] != 'undefined') {
      magData = magentoCategoryData[catIdInt];
    }
    modified = modified.toISOString();
    if (!duplicate) {
      pageArr.push({ slug: slug, magentoId: catId, modified: modified, magData, wpData });
      //add alternate top level url on category page
      //especially helpful for sale categories where the parent category seems to change
      //mid sale, causing the main url to re-render
      if (
        typeof queryData[siteId + 'Categories'].nodes[i][siteId + 'Category']
          .seoUrl != 'undefined' &&
        queryData[siteId + 'Categories'].nodes[i][siteId + 'Category'].seoUrl &&
        queryData[siteId + 'Categories'].nodes[i][siteId + 'Category'].seoUrl !=
        slug &&
        queryData[siteId + 'Categories'].nodes[i][siteId + 'Category'].seoUrl
          .length > 0
      ) {
        pageArr.push({
          slug: slug,
          seoUrl:
            queryData[siteId + 'Categories'].nodes[i][siteId + 'Category']
              .seoUrl,
          magentoId: catId,
          modified: modified,
          magData,
          wpData
        });
      }
      let magCatFilter = queryData[siteId + 'Categories'].nodes[i];
      if (
        magCatFilter[siteId + 'Category'].categoryFilterViews != undefined &&
        magCatFilter[siteId + 'Category'].categoryFilterViews.length > 0
      ) {
        for (
          let k = 0;
          k < magCatFilter[siteId + 'Category'].categoryFilterViews.length;
          k++
        ) {
          let view = magCatFilter[siteId + 'Category'].categoryFilterViews[k];
          if (
            view.categoryFilter != undefined &&
            view.categoryFilter.length > 0
          ) {
            if (view.seoUrl != undefined && view.seoUrl.length > 0) {
              pageArr.push({
                slug: slug,
                seoUrl: view.seoUrl,
                query: view.categoryFilter,
                magentoId: catId,
                modified: modified,
                magData,
                wpData
              });
            } else {
              pageArr.push({
                slug: slug,
                query: view.categoryFilter,
                magentoId: catId,
                modified: modified,
                magData,
                wpData
              });
            }
          }
        }
      }
    } else {
      console.log(
        'FCSAVE: Duplicate category: ' +
        JSON.stringify({ slug: slug, magentoId: catId, modified: modified }),
      );
    }
  }
  if (pageArr.length > 0) {
    pageArr.forEach((request, index, arr) => {
      const prefix = ``;
      let permalink = `${prefix}${request.slug}/`;
      if (request.slug == '/') {
        permalink = `${prefix}`;
      }
      if (request.seoUrl != undefined && request.seoUrl.length > 0) {
        permalink = `${prefix}${request.seoUrl}/`;
      } else if (request.query != undefined) {
        permalink = `${prefix}${request.slug}/${request.query}`;
      }
      permalink = permalink.replace('//', '/');
      //remove double slashes on the end
      while (permalink.endsWith('/')) {
        permalink = permalink.slice(0, -1);
      }
      // if (!permalink.endsWith('/')) {
      //   permalink = permalink + '/';
      // }
      // pageArr[index].permalink = permalink;
      pageArr[index].slug = permalink;
    });
  }

  return pageArr;
};



const gqlConfig = {
  siteId: settings.siteId,
  magentoUrl: settings.magentoUrl,
  wordpressUrl: settings.wordpressUrl,
  duration: settings.duration,
  htauthUsername: settings.htauthUsername,
  htauthPassword: settings.htauthPassword,
  route: 'categories',
  type: 'all',
}

settings.gqlConfig = gqlConfig;



const helpers = {
  graphqlQuery,
  combineWPQueries,
  wpPagingQuery,
  chunkArray
}

module.exports = async function () {
  let pageArr = await makeCollectionsPageArr(settings, helpers);
  console.log('collections pageArr.length', pageArr.length);
  // console.log('collections pageArr', pageArr);
  return pageArr;
}

