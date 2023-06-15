const { collectionsFragmentFull } = require('../../fragments/_collectionsFragmentLong.cjs');
const productListQuery = (siteId, type) => {
  let query = false;
  let snippet = '';
  if (siteId === 'tf') {
    /*
    tf_clearance_stones: 906,
    don't include the stones if this is for tf
    snippet = `, online:{eq:"3447"}`; // diamonds fc_product_type: { eq: "3569"}
    Diamond = 3569 // Stone = 3571
    3566, Bracelet // 3567, Chain // 3568, Earring
    3569, Diamond // 3570, Gift Card // 3571, Stone // 3572, Matched Set
    3573, Matching Band // 3574, Necklace // 3575, Pendant // 3576, Ring // 
    3577, Ring Setting // 3578, Watch // 3579, Other
    */
    let types = `["3566","3567","3568","3570","3572","3573","3574","3575","3576","3577","3578","3579"]`;
    snippet = `, fc_product_type: {in: ${types} }`;
  }
  // filter out any $0 items on all sites
  const priceFilter = `,price: {from: "1", to: "1000000"}`;

  if (type == 'page') {
    query = `query magento_product_page($id: String!, $page: Int!, $pageSize: Int!) {
            products(filter: {category_id: {eq: $id}${snippet}${priceFilter}}, currentPage: $page, pageSize: $pageSize, sort: {position: DESC}) {
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
              page_info{
                current_page
                total_pages
              }
            }
        }`;

  }

  if (type == 'full') {
    query = `query magento_category_products_urls($id: String!, $page: Int!, $pageSize: Int!) {
            products(filter: {category_id: {eq: $id}${snippet}${priceFilter}}, currentPage: $page, pageSize: $pageSize, sort: {position: DESC}) {
              total_count
              page_info{
                current_page
                total_pages
              }
              items {
                ${collectionsFragmentFull}
                updated_at
                __typename
                linkproduct_products {
                  id
                  name
                  sku
                  __typename
                }
              }
            }
        }`;
    // name
    // url_key
    // sku
    // id
  }
  return query;
}

module.exports = {
  productListQuery
}
/**
 query magento_category_products_urls($id: String!, $page: Int!, $pageSize: Int!) {
            products(filter: {category_id: {eq: $id}price: {from: "1", to: "1000000"}}, currentPage: $page, pageSize: $pageSize, sort: {position: DESC}) {
              total_count
              page_info{
                current_page
                total_pages
              }
              items {
                name
                url_key
                sku
                id
                updated_at
                __typename
                linkproduct_products {
                  id
                  name
                  sku
                  __typename
                }
              }
            }
        }

        {
            "id":"145",
            "page": 1,
            "pageSize": 30
        }
 */