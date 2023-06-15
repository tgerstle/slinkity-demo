
//make .env file vars available as global variables
require("dotenv").config();
const slinkity = require('slinkity')
const svelte = require('@slinkity/svelte')


module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(slinkity.plugin, slinkity.defineConfig({
    renderers: [svelte()],
  }))

  /**
   * Why copy the /public directory?
   * 
   * Slinkity uses Vite (https://vitejs.dev) under the hood for processing styles and JS resources
   * This tool encourages a /public directory for your static assets like social images
   * To ensure this directory is discoverable by Vite, we copy it to our 11ty build output like so:
   */
  eleventyConfig.addPassthroughCopy('public');


  eleventyConfig.addFilter('json', function (value, spaces = 4) {
    return JSON.stringify(value, null, spaces);
  })

  return {
    dir: {
      /**
       * Why set an input directory?
       * 
       * By default, 11ty will treat the base of your project as the input.
       * This can have some nasty consequences, like accidentally copying your README.md as a route!
       * You can manually ignore certain files from the build output. But to keep things simple,
       * We recommend setting an input directory like so:
       */
      input: 'src',
    },
  }
}