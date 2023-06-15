// ---
// pagination:
//     data: categories
//     size: 1
//     alias: category
// permalink: "collections/{{ category.slug }}.json"
// ---
// <pre>{{ category | json(4) }}</pre>
module.exports = {
    data: {
        layout: 'blank.njk',
        pagination: {
            data: mycategories,
            size: 1,
            alias: category
        },
        mycategories: {
            eleventyImport: {
                collections: ["post"]
            }
        },
        permalink: `collections/${category.slug}.json`
    },
    render: (data) => {
        return JSON.stringify(data.category);
    }
}
//https://www.11ty.dev/docs/data-configuration/#advanced
//https://www.11ty.dev/docs/collections/#declare-your-collections-for-incremental-builds
//https://www.11ty.dev/docs/collections/
//collections-json.11ty.cjs