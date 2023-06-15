const customAttributeMetadataQuery = `
{
    customAttributeMetadata(
        attributes: [
        {
            attribute_code: "band_width"
            entity_type: "catalog_product"
        }
        ]
    ) {
        items {
        attribute_code
        attribute_options {
        value
        label
        }
        }
    }
}`;

module.exports = {
    customAttributeMetadataQuery
}