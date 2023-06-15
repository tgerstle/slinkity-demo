module.exports = {
    settings: {
        siteId: 'dn',
        wordpressUrl: process.env.WORDPRESS_GRAPHQL_URL,
        magentoUrl: process.env.MAGENTO_GRAPHQL_URL,
        htauthUsername: process.env.HTAUTH_USERNAME,
        htauthPassword: process.env.HTAUTH_PASSWORD,
        rootCategories: {
            dn: '2',
            tf: '597',
        },
        pageSize: 30, //standard query pageSize
        duration: '1h', //cache duration
    }
}
