const { collectionsFragment } = require("./_collectionsFragment.cjs");
const opts = `
options {
    option_id
    title
    sort_order
    required
    ... on CustomizableDropDownOption {
      value {
        option_type_id
        title
        price
        price_type
        sku
        sort_order
      }
    }
    ... on CustomizableMultipleOption {
      value {
        option_type_id
        title
        price
        price_type
        sku
        sort_order
      }
    }
  }
`;

const collectionsFragmentLong = `
${collectionsFragment}
... on ConfigurableProduct {
    ${opts}
}
... on SimpleProduct {
    ${opts}
}
`;

const related = `
band_width
related_products{
  sku
  url_key
  name
  shape
  filter_shape
  band_width
}
`;
const collectionsFragmentFull = `
  ${collectionsFragmentLong}
  meta_title
  meta_description
  meta_keyword
  description{
    html
  }
  short_description{
    html
  }
  ${related}
`;

const collectionsFragmentStone = `
${collectionsFragmentFull}
cert_url_key
video_url
carat_weight
cut_grade
clarity
lab_report
cvd_hpht
table_percent
symmetry_grade
fluor
depth_percent
length_width_ratio
polish_grade
made_in_usa
grown_in_usa
hearts_and_arrows
carbon_neutral
as_grown
certified_sustainable
on_sale
`
const aggregationsFragment = `
aggregations {
  attribute_code
  label
  options {
    label
    value
  }
}
`

const stonesSingleQuery = `query stones_single_query($sku: String!, $page: Int!, $pageSize: Int!){
  StonesQueryFlat(
    filter: {
      sku: {
        eq: $sku
      }
    }
    currentPage: $page
    pageSize: $pageSize
    sort: {price: ASC}
  ) {
    total_count
    ${aggregationsFragment}
    page_info {
      total_pages
    }
    items {
      id
      sku
      name
      carat_weight
      cut_grade
      clarity
      shape
      color
      video_url
      lab_report
      cvd_hpht
      table_percent
      symmetry_grade
      fluor
      depth_percent
      length_width_ratio
      polish_grade
      made_in_usa
      grown_in_usa
      hearts_and_arrows
      carbon_neutral
      as_grown
      certified_sustainable
      on_sale
      cert_url_key
      stock_status
      lead_time
      salable_qty
      price_range {
        minimum_price {
          regular_price {
            value
          }
          final_price {
            value
          }
        }
      }
      media_gallery {
        url
      }
    }
  }
}`;

module.exports = {
  aggregationsFragment,
  collectionsFragmentLong,
  collectionsFragmentFull,
  stonesSingleQuery
};
