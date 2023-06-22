
const getWordpressCollectionsQuery = function (siteId) {
  const siteIdCaps = siteId.charAt(0).toUpperCase() + siteId.slice(1)

  const mockProduct = `
      mockProduct {
        name
        link
        price
        salePrice
        saleSpecificPrice{
          salePrice
          ${siteId}SaleList
        }
        leadTime
        position
        images {
          altText
          customTags
          image {
            altText
            sourceUrl(size: LARGE)
          }
          tags
        }
        filters {
          filter
          option
        }
      }
      `;

  const displayGroup = `
      canonicalUrl
      metaRobotsIndex
      metaDescription
      metaKeywords
      metaTitle
      mobileHeroImages {
        mobileHeroImageCustomBreakpoint
        mobileHeroImage {
          altText
          sourceUrl
        }
      }
      pageTitle
      pageSubtitle
      copyHead
      copy
      customPageCss
      images {
        image {
          altText
          sourceUrl(size: LARGE)
        }
        screenWidth
        customBreakpoint
      }
      headlineButtons {
        buttonText
        filterString
        url
        hideButtonText
        images {
          screenWidth
          customBreakpoint
          image {
            altText
            sourceUrl(size: LARGE)
          }
        }
        hoverImages {
          screenWidth
          customBreakpoint
          image {
            altText
            sourceUrl(size: LARGE)
          }
        }
        textColor
        textColorActive
        smallButtonTextColorActive
        smallButtonTextColor
        smallButtonText
        smallButtonBackgroundColorActive
        smallButtonBackgroundColorHover
        smallButtonBackgroundColor
        customizedButton
        backgroundColorActive
        backgroundColor
      }
      inlineAds {
        images {
          screenWidth
          customBreakpoint
          image {
            altText
            sourceUrl(size: LARGE)
          }
        }
        link {
          target
          title
          url
        }
      }
      collectionButtonsAlignment
      collectionButtons {
        link {
          target
          title
          url
        }
        style
        text
      }`;

  const viewsGroup = `
      categoryFilterViews {
        categoryFilter
        ${displayGroup}
      }`;

  const viewsGroupOuter = `
    categoryFilterViews {
        categoryFilter
        ${displayGroup}
        canonicalUrl
        categoryFilter
        seoUrl
    }`

  /*
  getActiveSale(store: "${siteId}") {
      sale_name
    }
  */
  const querywp = `query ${siteId}CategoryByUrlKey($offset: Int!, $size: Int!) {
        ${siteId}Categories(where: {offsetPagination: {offset: $offset, size: $size}}) {
          nodes {
            id
            title
            modified
            parent {
              node {
                ... on ${siteIdCaps}Category {
                  title
                  ${siteId}Category {
                    magentoCategoryId
                    categoryUrlKey
                    pageTitle
                  }
                  parent {
                    node {
                      ... on ${siteIdCaps}Category {
                        title
                        ${siteId}Category {
                          magentoCategoryId
                          categoryUrlKey
                          pageTitle
                        }
                        parent {
                          node {
                            ... on ${siteIdCaps}Category {
                              title
                              ${siteId}Category {
                                magentoCategoryId
                                categoryUrlKey
                                pageTitle
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            ${siteId}Category {
              ajaxUpdate
              magentoCategoryId
              magentoCategoryName
              categoryUrlKey
              doNotDisplayOnSite
              seoUrl
              ${mockProduct}
              ${displayGroup}
              ${viewsGroupOuter}
              saleViews {
                ${siteId}SaleList
                ${displayGroup}
                ${viewsGroup}
              }
              filterImages {
                filter
                option
                filterImage {
                  altText
                  sourceUrl(size: LARGE)
                }
              }
              filterableCategories {
                hide
                filterCategory {
                  ... on ${siteIdCaps}Category {
                    ${siteId}Category {
                      magentoCategoryId
                    }
                  }
                }
              }
              filtersToHide
              relatedProductsConfig {
                nameCheck
                mmRegex
                matchingAttributeCodes
                caratRegex
                attributeCode
                additionalRemove {
                  word
                }
              }
              pdpHeroMobileImages {
                customBreakpoint
                screenWidth
                image {
                  altText
                  sourceUrl(size: LARGE)
                }
              }
              pdpHeroDeskImages {
                customBreakpoint
                screenWidth
                image {
                  altText
                  sourceUrl(size: LARGE)
                }
              }
            }
          }
        }
      }
      `;

  return querywp
}

module.exports = {
  getWordpressCollectionsQuery
}
