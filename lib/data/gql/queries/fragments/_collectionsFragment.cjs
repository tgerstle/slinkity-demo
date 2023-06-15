const price_tiers = `
price_tiers{
  discount{
    amount_off
    percent_off
  }
  final_price{
    value
  }
  quantity
}
`;

const collectionsFragment = `
...on ConfigurableProduct{
  configurable_options{
    attribute_code
    attribute_id
    label
    position
    values{
      label
      value_index
    }
  }
  variants{
    attributes{
      code
      label
      value_index
    }
    product {
      id
      sku
      lead_time
      stone_uom
      stock_status
      salable_qty
      ${price_tiers}
      price_range {
        minimum_price {
          final_price{
            value
          }
          regular_price{
            value
          }
        }
      }
    }
  }
}
name
stock_status
salable_qty
fc_product_type
filter_style
filter_metal
filter_shape
filter_color
filter_stone_type
filter_ring_size
filter_other
stone_type
metal_type
cut_type
color
shape
gemstone
id
sku
url_key
lead_time
categories{
  id
  url_key
  position
  name
}
${price_tiers}
price_range {
  maximum_price{
    regular_price{
      value
    }
    final_price{
      value
    }
  }
  minimum_price {
    final_price {
      value
    }
    regular_price {
      value
    }
  }
}
media_gallery {
  image_url
  image_path
  label
  tags
  position
}
__typename
`;

module.exports = { collectionsFragment };
