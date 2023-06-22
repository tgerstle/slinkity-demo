module.exports = {
    settings: {    
        siteId: process.env.SITE_ID,
        duration: process.env.DURATION,
        magentoUrl: process.env.MAGENTO_GRAPHQL_URL,
        wordpressUrl: process.env.WORDPRESS_GRAPHQL_URL,
        htauthUsername: process.env.HTAUTH_USERNAME,
        htauthPassword: process.env.HTAUTH_PASSWORD,
        siteId: process.env.SITE_ID,    
        rootCategories: {
            dn: '2',
            tf: '597',
        },
        pageSize: 30, //standard query pageSize
        duration: '1h', //cache duration
    }
}
